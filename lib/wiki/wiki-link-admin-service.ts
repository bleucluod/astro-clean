import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";

import {
  asBoolean,
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import { saveAdminWikiDraft } from "@/lib/wiki/wiki-cms-service";
import { readWikiArticleSnapshot } from "@/lib/wiki/wiki-cms-validation";
import { parseWikiMarkdown } from "@/lib/wiki/wiki-markdown";
import {
  applyWikiLinkParagraphChange,
  buildNaturalWikiLinkSuggestions,
  DEFAULT_WIKI_LINK_SCAN_RULES,
  rollbackWikiLinkParagraphChange,
  scanWikiInternalLinks,
} from "@/lib/wiki/wiki-link-admin-engine";
import type {
  WikiLinkAdminState,
  WikiLinkAdminSuggestion,
  WikiLinkArticleInput,
  WikiLinkArticleSummary,
  WikiLinkEdge,
  WikiLinkFinding,
  WikiLinkScanKpis,
  WikiLinkScanRules,
} from "@/lib/wiki/wiki-link-admin-types";

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeRules(raw: unknown): WikiLinkScanRules {
  const input = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const defaults = DEFAULT_WIKI_LINK_SCAN_RULES;
  const integer = (
    key: keyof Pick<
      WikiLinkScanRules,
      | "outgoingMin"
      | "outgoingMax"
      | "incomingMin"
      | "incomingTarget"
      | "incomingMax"
      | "categoryLinkMax"
      | "coreMax"
      | "anchorMinChars"
      | "anchorMaxChars"
    >,
    minimum: number,
    maximum: number,
  ) => {
    const value = Number(input[key] ?? defaults[key]);
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new AdminAccessError(400, `Invalid Wiki link rule: ${key}`);
    }
    return value;
  };
  const strings = (key: "coreRoutes" | "oneWordCoreAllowlist" | "excludedStableIds") => {
    const value = input[key] ?? defaults[key];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      throw new AdminAccessError(400, `Invalid Wiki link rule list: ${key}`);
    }
    return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  };

  const rules: WikiLinkScanRules = {
    outgoingMin: integer("outgoingMin", 0, 20),
    outgoingMax: integer("outgoingMax", 0, 20),
    incomingMin: integer("incomingMin", 0, 50),
    incomingTarget: integer("incomingTarget", 0, 50),
    incomingMax: integer("incomingMax", 0, 100),
    breadcrumbRequired: input.breadcrumbRequired !== false,
    categoryLinkMax: integer("categoryLinkMax", 0, 10),
    coreMax: integer("coreMax", 1, 5),
    coreRoutes: strings("coreRoutes"),
    anchorMinChars: integer("anchorMinChars", 1, 80),
    anchorMaxChars: integer("anchorMaxChars", 2, 300),
    oneWordCoreAllowlist: strings("oneWordCoreAllowlist"),
    excludedStableIds: strings("excludedStableIds"),
    prohibitSelf: input.prohibitSelf !== false,
    prohibitDuplicate: input.prohibitDuplicate !== false,
    prohibitUnpublishedTargets: input.prohibitUnpublishedTargets !== false,
  };
  if (rules.outgoingMax > 0 && rules.outgoingMin > rules.outgoingMax) {
    throw new AdminAccessError(400, "Outgoing Wiki link minimum exceeds maximum.");
  }
  if (
    rules.incomingMin > rules.incomingTarget ||
    (rules.incomingMax > 0 && rules.incomingTarget > rules.incomingMax)
  ) {
    throw new AdminAccessError(400, "Incoming Wiki link thresholds are out of order.");
  }
  if (rules.anchorMinChars > rules.anchorMaxChars) {
    throw new AdminAccessError(400, "Wiki link anchor bounds are out of order.");
  }
  const allowedCoreRoutes = new Set(["/", "/chart", "/compare", "/sky", "/wiki"]);
  if (
    rules.coreRoutes.length !== 5 ||
    rules.coreRoutes.some((route) => !allowedCoreRoutes.has(route))
  ) {
    throw new AdminAccessError(400, "Wiki core routes must remain the five approved public routes.");
  }
  return rules;
}

async function loadRules() {
  const sql = getAdminDatabase();
  const rows = await sql`
    select version, config
    from halleus_private.wiki_link_rule_versions
    where is_active = true
    order by version desc
    limit 1
  `;
  if (!rows[0]) {
    throw new Error("Active Wiki link rules are missing. Apply migration 0019.");
  }
  return {
    version: asNumber(rows[0].version),
    rules: normalizeRules(rows[0].config),
  };
}

function legacyMarkdown(row: Record<string, unknown>) {
  const lines = [asString(row.intro)];
  const keyPoints = jsonArray<string>(row.key_points);
  if (keyPoints.length) {
    lines.push("## نکات کلیدی", ...keyPoints.map((point) => `- ${point}`));
  }
  for (const raw of jsonArray<Record<string, unknown>>(row.sections)) {
    const section = asRecord(raw);
    lines.push(`## ${asString(section.title)}`);
    lines.push(...jsonArray<string>(section.paragraphs));
    lines.push(...jsonArray<string>(section.bullets).map((bullet) => `- ${bullet}`));
  }
  return lines.filter(Boolean).join("\n\n");
}

function articleFromRow(raw: unknown): WikiLinkArticleInput {
  const row = asRecord(raw);
  const bodyMarkdown = asNullableString(row.body_markdown) ?? legacyMarkdown(row);
  const callToAction = row.call_to_action && typeof row.call_to_action === "object"
    ? asRecord(row.call_to_action)
    : null;
  return {
    id: asString(row.id),
    stableId: asString(row.stable_id),
    slug: asString(row.slug),
    title: asString(row.title),
    shortTitle: asString(row.short_title),
    categoryId: asString(row.category_id),
    status: asString(row.status),
    indexable: asBoolean(row.is_indexable),
    publishedAt: asNullableString(row.published_at),
    deletedAt: asNullableString(row.deleted_at),
    contentVersion: asNumber(row.content_version),
    bodyMarkdown,
    relatedArticleIds: jsonArray<string>(row.related_article_ids),
    contextLinks: jsonArray<{ label: string; href: string }>(row.context_links),
    callToAction: callToAction
      ? {
          label: asString(callToAction.label),
          href: asString(callToAction.href),
        }
      : null,
  };
}

async function loadScanArticles() {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      id::text,
      stable_id,
      slug,
      title,
      short_title,
      category_id,
      status,
      is_indexable,
      published_at::text,
      deleted_at::text,
      content_version,
      body_markdown,
      intro,
      key_points,
      sections,
      related_article_ids,
      context_links,
      call_to_action
    from public.wiki_articles
    order by stable_id
  `;
  return rows.map(articleFromRow);
}

function graphDigest(edges: WikiLinkEdge[]) {
  return sha256(
    edges
      .map((edge) => `${edge.sourceStableId}|${edge.targetStableId ?? ""}|${edge.anchor}`)
      .sort()
      .join("\n"),
  );
}

async function insertDecision(
  tx: TransactionSql,
  input: {
    suggestionId: string;
    decision: string;
    actor: VerifiedAdminActor;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason?: string | null;
  },
) {
  await tx`
    insert into halleus_private.wiki_link_decisions (
      suggestion_id, decision, before_state, after_state, reason, actor_user_id
    ) values (
      ${input.suggestionId}::uuid,
      ${input.decision},
      ${JSON.stringify(input.before)}::jsonb,
      ${JSON.stringify(input.after)}::jsonb,
      ${input.reason ?? null},
      ${input.actor.userId}::uuid
    )
  `;
}

export async function runWikiLinkAdminScan(input: {
  actor: VerifiedAdminActor | null;
  triggerKind: "manual_full" | "manual_article" | "post_publish" | "periodic";
  stableId?: string | null;
}) {
  const sql = getAdminDatabase();
  const { version, rules } = await loadRules();
  const runRows = await sql`
    insert into halleus_private.wiki_link_scan_runs (
      trigger_kind, requested_article_stable_id, status, rules_version, created_by
    ) values (
      ${input.triggerKind},
      ${input.stableId ?? null},
      'running',
      ${version},
      ${input.actor?.userId ?? null}::uuid
    )
    returning id::text, created_at::text
  `;
  const runId = asString(runRows[0].id);

  try {
    const scanArticles = await loadScanArticles();
    const scan = scanWikiInternalLinks(scanArticles, rules);
    const natural = buildNaturalWikiLinkSuggestions(scanArticles, scan, rules);
    const byId = new Map(scanArticles.map((article) => [article.stableId, article]));
    const extraFindings: WikiLinkFinding[] = natural.noNaturalPlacementStableIds.map(
      (stableId) => ({
        code: "NO_NATURAL_PLACEMENT",
        severity: "warning",
        sourceStableId: stableId,
        targetStableId: null,
        details: { reason: "No exact title or short-title occurrence in a real paragraph." },
      }),
    );
    const allFindings = [...scan.findings, ...extraFindings];

    await sql.begin(async (tx) => {
      for (const article of scan.articles) {
        const source = byId.get(article.stableId);
        if (!source) continue;
        const contextual = scan.contextualArticleEdges.filter(
          (edge) => edge.sourceStableId === article.stableId,
        );
        const classified = scan.classifiedLinks.filter(
          (edge) => edge.sourceStableId === article.stableId,
        );
        await tx`
          insert into halleus_private.wiki_link_graph_snapshots (
            scan_run_id, source_article_id, source_stable_id, source_content_version,
            source_body_sha256, contextual_edges, classified_links, article_summary
          ) values (
            ${runId}::uuid,
            ${source.id}::uuid,
            ${article.stableId},
            ${source.contentVersion},
            ${sha256(source.bodyMarkdown)},
            ${tx.json(contextual)},
            ${tx.json(classified)},
            ${tx.json(article)}
          )
        `;
      }

      for (const item of allFindings) {
        await tx`
          insert into halleus_private.wiki_link_findings (
            scan_run_id, source_stable_id, target_stable_id, code, severity, details
          ) values (
            ${runId}::uuid,
            ${item.sourceStableId},
            ${item.targetStableId},
            ${item.code},
            ${item.severity},
            ${JSON.stringify(item.details)}::jsonb
          )
        `;
      }

      for (const suggestion of natural.suggestions) {
        const source = byId.get(suggestion.sourceStableId);
        if (!source) continue;
        await tx`
          insert into halleus_private.wiki_link_suggestions (
            scan_run_id, source_stable_id, target_stable_id, status,
            source_content_version, source_body_sha256,
            current_anchor, proposed_anchor, current_paragraph, proposed_paragraph,
            placement, reason, confidence
          ) values (
            ${runId}::uuid,
            ${suggestion.sourceStableId},
            ${suggestion.targetStableId},
            'suggested',
            ${suggestion.sourceContentVersion},
            ${sha256(source.bodyMarkdown)},
            ${suggestion.currentAnchor},
            ${suggestion.proposedAnchor},
            ${suggestion.currentParagraph},
            ${suggestion.proposedParagraph},
            ${suggestion.placement},
            ${suggestion.reason},
            ${suggestion.confidence}
          )
        `;
      }

      await tx`
        update halleus_private.wiki_link_scan_runs
        set
          status = 'completed',
          graph_sha256 = ${graphDigest(scan.contextualArticleEdges)},
          article_count = ${scan.articles.length},
          edge_count = ${scan.contextualArticleEdges.length},
          finding_count = ${allFindings.length},
          suggestion_count = ${natural.suggestions.length},
          kpis = ${tx.json(scan.kpis)},
          completed_at = now()
        where id = ${runId}::uuid
      `;
    });

    if (input.actor) {
      await recordAdminAuditEvent({
        actor: input.actor,
        action: "admin.wiki.link_scan_completed",
        targetType: "wiki_link_scan",
        targetId: runId,
        afterSummary: {
          triggerKind: input.triggerKind,
          requestedArticle: input.stableId ?? null,
          articles: scan.articles.length,
          edges: scan.contextualArticleEdges.length,
          findings: allFindings.length,
          suggestions: natural.suggestions.length,
        },
        reason: "Wiki internal-link maintenance scan",
        success: true,
      });
    }
    return {
      runId,
      articleCount: scan.articles.length,
      edgeCount: scan.contextualArticleEdges.length,
      findingCount: allFindings.length,
      suggestionCount: natural.suggestions.length,
      graphSha256: graphDigest(scan.contextualArticleEdges),
    };
  } catch (error) {
    await sql`
      update halleus_private.wiki_link_scan_runs
      set status = 'failed',
          error_summary = ${error instanceof Error ? error.message.slice(0, 2000) : "unknown"},
          completed_at = now()
      where id = ${runId}::uuid
    `;
    throw error;
  }
}

function readSuggestion(raw: unknown): WikiLinkAdminSuggestion {
  const row = asRecord(raw);
  return {
    id: asString(row.id),
    status: asString(row.status) as WikiLinkAdminSuggestion["status"],
    sourceStableId: asString(row.source_stable_id),
    targetStableId: asString(row.target_stable_id),
    sourceContentVersion: asNumber(row.source_content_version),
    sourceBodySha256: asString(row.source_body_sha256),
    currentAnchor: asString(row.current_anchor),
    proposedAnchor: asString(row.proposed_anchor),
    currentParagraph: asString(row.current_paragraph),
    proposedParagraph: asString(row.proposed_paragraph),
    placement: asString(row.placement),
    reason: asString(row.reason),
    confidence: Number(row.confidence),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function readFinding(raw: unknown): WikiLinkFinding {
  const row = asRecord(raw);
  return {
    code: asString(row.code) as WikiLinkFinding["code"],
    severity: asString(row.severity) as WikiLinkFinding["severity"],
    sourceStableId: asString(row.source_stable_id),
    targetStableId: asNullableString(row.target_stable_id),
    details: asRecord(row.details),
  };
}

export async function getWikiLinkAdminState(
  stableId?: string | null,
): Promise<WikiLinkAdminState> {
  const sql = getAdminDatabase();
  const { version, rules } = await loadRules();
  const runRows = await sql`
    select id::text, trigger_kind, status, rules_version,
           article_count, edge_count, finding_count, suggestion_count,
           kpis, created_at::text, completed_at::text
    from halleus_private.wiki_link_scan_runs
    where status = 'completed'
    order by completed_at desc, created_at desc
    limit 1
  `;
  if (!runRows[0]) {
    return {
      latestScan: null,
      rules: { ...rules, version },
      kpis: null,
      articles: [],
      findings: [],
      suggestions: [],
      detail: null,
    };
  }

  const run = asRecord(runRows[0]);
  const runId = asString(run.id);
  const [snapshotRows, findingRows, suggestionRows] = await Promise.all([
    sql`
      select source_stable_id, contextual_edges, classified_links, article_summary
      from halleus_private.wiki_link_graph_snapshots
      where scan_run_id = ${runId}::uuid
      order by source_stable_id
    `,
    sql`
      select source_stable_id, target_stable_id, code, severity, details
      from halleus_private.wiki_link_findings
      where scan_run_id = ${runId}::uuid
      order by severity desc, source_stable_id, code
    `,
    sql`
      select id::text, source_stable_id, target_stable_id, status,
             source_content_version, source_body_sha256, current_anchor,
             proposed_anchor, current_paragraph, proposed_paragraph,
             placement, reason, confidence::float8,
             created_at::text, updated_at::text
      from halleus_private.wiki_link_suggestions
      where scan_run_id = ${runId}::uuid
      order by confidence desc, source_stable_id, target_stable_id
    `,
  ]);

  const articles = snapshotRows.map((row) => asRecord(row.article_summary) as WikiLinkArticleSummary);
  const findings = findingRows.map(readFinding);
  const suggestions = suggestionRows.map(readSuggestion);
  let detail: WikiLinkAdminState["detail"] = null;
  if (stableId) {
    const article = articles.find((item) => item.stableId === stableId);
    if (article) {
      const outgoing = snapshotRows
        .filter((row) => asString(row.source_stable_id) === stableId)
        .flatMap((row) => jsonArray<WikiLinkEdge>(row.classified_links));
      const incoming = snapshotRows
        .flatMap((row) => jsonArray<WikiLinkEdge>(row.contextual_edges))
        .filter((edge) => edge.targetStableId === stableId);
      detail = {
        article,
        outgoing,
        incoming,
        suggestions: suggestions.filter((item) => item.sourceStableId === stableId),
        findings: findings.filter((item) => item.sourceStableId === stableId),
      };
    }
  }

  return {
    latestScan: {
      id: runId,
      triggerKind: asString(run.trigger_kind),
      status: asString(run.status),
      rulesVersion: asNumber(run.rules_version),
      articleCount: asNumber(run.article_count),
      edgeCount: asNumber(run.edge_count),
      findingCount: asNumber(run.finding_count),
      suggestionCount: asNumber(run.suggestion_count),
      createdAt: asString(run.created_at),
      completedAt: asNullableString(run.completed_at),
    },
    rules: { ...rules, version },
    kpis: asRecord(run.kpis) as WikiLinkScanKpis,
    articles,
    findings,
    suggestions,
    detail,
  };
}

export async function saveWikiLinkRules(input: {
  actor: VerifiedAdminActor;
  rules: unknown;
  reason: string;
}) {
  const rules = normalizeRules(input.rules);
  const sql = getAdminDatabase();
  const rows = await sql.begin(async (tx) => {
    await tx`
      update halleus_private.wiki_link_rule_versions
      set is_active = false
      where is_active = true
    `;
    return tx`
      insert into halleus_private.wiki_link_rule_versions (
        config, is_active, reason, created_by
      ) values (
        ${tx.json(rules)}, true, ${input.reason}, ${input.actor.userId}::uuid
      )
      returning version
    `;
  });
  await recordAdminAuditEvent({
    actor: input.actor,
    action: "admin.wiki.link_rules_updated",
    targetType: "wiki_link_rules",
    targetId: String(rows[0]?.version ?? ""),
    afterSummary: rules as unknown as Record<string, unknown>,
    reason: input.reason,
    success: true,
  });
  return { version: asNumber(rows[0]?.version), rules };
}

export async function editWikiLinkSuggestion(input: {
  actor: VerifiedAdminActor;
  suggestionId: string;
  proposedAnchor: string;
  proposedParagraph: string;
  reason: string;
}) {
  const anchor = input.proposedAnchor.trim();
  const paragraph = input.proposedParagraph.trim();
  if (!anchor || anchor.length > 120 || !paragraph || paragraph.length > 5000) {
    throw new AdminAccessError(400, "Edited Wiki link suggestion is invalid.");
  }
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select * from halleus_private.wiki_link_suggestions
      where id = ${input.suggestionId}::uuid
      for update
    `;
    if (!rows[0]) throw new AdminAccessError(404, "Wiki link suggestion was not found.");
    const current = asRecord(rows[0]);
    if (!["suggested", "edited"].includes(asString(current.status))) {
      throw new AdminAccessError(409, "This Wiki link suggestion can no longer be edited.");
    }
    const target = asString(current.target_stable_id);
    if (!paragraph.includes(`[[article:${target}|${anchor}]]`)) {
      throw new AdminAccessError(400, "Edited paragraph must contain the selected target and anchor.");
    }
    const before = {
      status: asString(current.status),
      proposedAnchor: asString(current.proposed_anchor),
      proposedParagraph: asString(current.proposed_paragraph),
    };
    await tx`
      update halleus_private.wiki_link_suggestions
      set status = 'edited',
          proposed_anchor = ${anchor},
          proposed_paragraph = ${paragraph},
          edited_by = ${input.actor.userId}::uuid
      where id = ${input.suggestionId}::uuid
    `;
    await insertDecision(tx, {
      suggestionId: input.suggestionId,
      decision: "edited",
      actor: input.actor,
      before,
      after: { status: "edited", proposedAnchor: anchor, proposedParagraph: paragraph },
      reason: input.reason,
    });
    return { status: "edited" as const };
  });
}

export async function decideWikiLinkSuggestion(input: {
  actor: VerifiedAdminActor;
  suggestionId: string;
  decision: "approved" | "rejected";
  reason: string;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select id::text, status
      from halleus_private.wiki_link_suggestions
      where id = ${input.suggestionId}::uuid
      for update
    `;
    if (!rows[0]) throw new AdminAccessError(404, "Wiki link suggestion was not found.");
    const current = asString(rows[0].status);
    if (!["suggested", "edited", "approved"].includes(current)) {
      throw new AdminAccessError(409, "This Wiki link suggestion cannot be decided.");
    }
    await tx`
      update halleus_private.wiki_link_suggestions
      set status = ${input.decision}
      where id = ${input.suggestionId}::uuid
    `;
    await insertDecision(tx, {
      suggestionId: input.suggestionId,
      decision: input.decision,
      actor: input.actor,
      before: { status: current },
      after: { status: input.decision },
      reason: input.reason,
    });
    return { status: input.decision };
  });
}

function snapshotFromArticleRow(raw: unknown) {
  const row = asRecord(raw);
  const bodyMarkdown = asNullableString(row.body_markdown);
  if (!bodyMarkdown) {
    throw new AdminAccessError(409, "Wiki link maintenance requires canonical bodyMarkdown.");
  }
  return readWikiArticleSnapshot({
    stableId: row.stable_id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    seoTitle: row.seo_title,
    metaDescription: row.meta_description ?? row.summary,
    categoryId: row.category_id,
    tags: jsonArray<string>(row.tags),
    summary: row.summary,
    intro: row.intro,
    readingMinutes: row.reading_minutes,
    publicationPriority: row.publication_priority,
    contentCluster: row.content_cluster ?? row.category_id,
    articleRole: row.article_role,
    relatedArticleIds: jsonArray<string>(row.related_article_ids),
    indexable: row.is_indexable,
    bodyMarkdown,
    keyPoints: jsonArray<string>(row.key_points),
    contextLinks: jsonArray(row.context_links),
    sources: jsonArray(row.sources),
    callToAction: row.call_to_action,
    contentVersion: row.content_version,
  });
}

function candidateSnapshotWithBody(
  current: ReturnType<typeof snapshotFromArticleRow>,
  bodyMarkdown: string,
  contentVersion: number,
) {
  const parsed = parseWikiMarkdown(bodyMarkdown);
  return readWikiArticleSnapshot({
    ...current,
    bodyMarkdown,
    intro: parsed.intro || current.intro,
    keyPoints: parsed.keyPoints.length ? parsed.keyPoints : current.keyPoints,
    contentVersion,
  });
}

async function markSuggestionConflict(
  suggestionId: string,
  actor: VerifiedAdminActor,
  message: string,
) {
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    const rows = await tx`
      select status from halleus_private.wiki_link_suggestions
      where id = ${suggestionId}::uuid
      for update
    `;
    if (!rows[0]) return;
    await tx`
      update halleus_private.wiki_link_suggestions
      set status = 'conflict'
      where id = ${suggestionId}::uuid
    `;
    await tx`
      insert into halleus_private.wiki_link_decisions (
        suggestion_id, decision, before_state, after_state, reason, actor_user_id
      ) values (
        ${suggestionId}::uuid, 'conflict',
        ${tx.json({ status: asString(rows[0].status) })},
        ${tx.json({ status: "conflict", message })},
        ${message},
        ${actor.userId}::uuid
      )
    `;
    await tx`
      insert into halleus_private.wiki_link_apply_results (
        suggestion_id, action, status, source_stable_id, details, actor_user_id
      )
      select id, 'apply', 'conflict', source_stable_id,
             ${tx.json({ message })}, ${actor.userId}::uuid
      from halleus_private.wiki_link_suggestions
      where id = ${suggestionId}::uuid
    `;
  });
}

export async function applyWikiLinkSuggestion(input: {
  actor: VerifiedAdminActor;
  suggestionId: string;
  reason: string;
}) {
  const sql = getAdminDatabase();
  try {
    return await sql.begin(async (tx) => {
      const rows = await tx`
        select suggestion.*,
               article.id::text as article_id,
               article.slug,
               article.title,
               article.short_title,
               article.seo_title,
               article.meta_description,
               article.category_id,
               article.tags,
               article.summary,
               article.intro,
               article.reading_minutes,
               article.publication_priority,
               article.content_cluster,
               article.article_role,
               article.related_article_ids,
               article.is_indexable,
               article.body_markdown,
               article.key_points,
               article.sections,
               article.context_links,
               article.sources,
               article.call_to_action,
               article.content_version,
               article.status as article_status,
               article.deleted_at::text
        from halleus_private.wiki_link_suggestions as suggestion
        join public.wiki_articles as article
          on article.stable_id = suggestion.source_stable_id
        where suggestion.id = ${input.suggestionId}::uuid
        for update of suggestion, article
      `;
      if (!rows[0]) throw new AdminAccessError(404, "Wiki link suggestion was not found.");
      const row = asRecord(rows[0]);
      if (asString(row.status) !== "approved") {
        throw new AdminAccessError(409, "Approve the Wiki link suggestion before applying it.");
      }
      if (asString(row.article_status) !== "published" || row.deleted_at) {
        throw new AdminAccessError(409, "Only a live published Wiki article can receive this draft.");
      }
      const openDraft = await tx`
        select 1 from public.wiki_article_drafts
        where article_id = ${asString(row.article_id)}::uuid
        limit 1
      `;
      if (openDraft[0]) {
        throw new AdminAccessError(
          409,
          "Article already has an open draft. Resolve it before applying a link suggestion.",
        );
      }
      const current = snapshotFromArticleRow(row);
      const currentHash = sha256(current.bodyMarkdown);
      if (
        current.contentVersion !== asNumber(row.source_content_version) ||
        currentHash !== asString(row.source_body_sha256)
      ) {
        throw new AdminAccessError(409, "Published article changed after this suggestion was scanned.");
      }
      const nextBody = applyWikiLinkParagraphChange(
        current.bodyMarkdown,
        asString(row.current_paragraph),
        asString(row.proposed_paragraph),
      );
      const candidate = candidateSnapshotWithBody(
        current,
        nextBody,
        current.contentVersion + 1,
      );
      await saveAdminWikiDraft({
        actor: input.actor,
        articleId: asString(row.article_id),
        snapshot: candidate,
        autosave: false,
        reason: input.reason,
        database: tx,
      });
      const afterHash = sha256(candidate.bodyMarkdown);
      await tx`
        update halleus_private.wiki_link_suggestions
        set status = 'applied'
        where id = ${input.suggestionId}::uuid
      `;
      await tx`
        insert into halleus_private.wiki_link_apply_results (
          suggestion_id, action, status, source_stable_id,
          before_content_version, after_content_version,
          before_body_sha256, after_body_sha256, details, actor_user_id
        ) values (
          ${input.suggestionId}::uuid, 'apply', 'applied',
          ${asString(row.source_stable_id)},
          ${current.contentVersion},
          ${candidate.contentVersion},
          ${currentHash},
          ${afterHash},
          ${tx.json({
            currentParagraph: asString(row.current_paragraph),
            proposedParagraph: asString(row.proposed_paragraph),
            draftOnly: true,
          })},
          ${input.actor.userId}::uuid
        )
      `;
      const verification = await tx`
        select snapshot
        from public.wiki_article_drafts
        where article_id = ${asString(row.article_id)}::uuid
        limit 1
      `;
      const verifiedSnapshot = verification[0]
        ? asRecord(verification[0].snapshot)
        : null;
      if (
        !verifiedSnapshot ||
        typeof verifiedSnapshot.bodyMarkdown !== "string" ||
        sha256(verifiedSnapshot.bodyMarkdown) !== afterHash
      ) {
        throw new Error("Wiki link draft verification failed.");
      }
      await tx`
        update halleus_private.wiki_link_suggestions
        set status = 'verified'
        where id = ${input.suggestionId}::uuid
      `;
      await tx`
        update halleus_private.wiki_link_apply_results
        set status = 'verified'
        where suggestion_id = ${input.suggestionId}::uuid
          and action = 'apply'
          and status = 'applied'
      `;
      await insertDecision(tx, {
        suggestionId: input.suggestionId,
        decision: "verified",
        actor: input.actor,
        before: { status: "approved" },
        after: {
          status: "verified",
          draftOnly: true,
          contentVersion: candidate.contentVersion,
        },
        reason: input.reason,
      });
      return {
        status: "verified" as const,
        sourceStableId: asString(row.source_stable_id),
        contentVersion: candidate.contentVersion,
        draftOnly: true,
      };
    });
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 409) {
      await markSuggestionConflict(input.suggestionId, input.actor, error.message);
    }
    throw error;
  }
}

export async function rollbackWikiLinkSuggestion(input: {
  actor: VerifiedAdminActor;
  suggestionId: string;
  reason: string;
}) {
  const sql = getAdminDatabase();
  try {
    return await sql.begin(async (tx) => {
      const suggestionRows = await tx`
        select suggestion.*,
               article.id::text as article_id,
               article.slug,
               article.title,
               article.short_title,
               article.seo_title,
               article.meta_description,
               article.category_id,
               article.tags,
               article.summary,
               article.intro,
               article.reading_minutes,
               article.publication_priority,
               article.content_cluster,
               article.article_role,
               article.related_article_ids,
               article.is_indexable,
               article.body_markdown,
               article.key_points,
               article.sections,
               article.context_links,
               article.sources,
               article.call_to_action,
               article.content_version,
               article.status as article_status,
               article.deleted_at::text
        from halleus_private.wiki_link_suggestions as suggestion
        join public.wiki_articles as article
          on article.stable_id = suggestion.source_stable_id
        where suggestion.id = ${input.suggestionId}::uuid
        for update of suggestion, article
      `;
      if (!suggestionRows[0]) {
        throw new AdminAccessError(404, "Wiki link suggestion was not found.");
      }
      const row = asRecord(suggestionRows[0]);
      if (!["applied", "verified"].includes(asString(row.status))) {
        throw new AdminAccessError(409, "Only an applied Wiki link suggestion can be rolled back.");
      }
      const resultRows = await tx`
        select *
        from halleus_private.wiki_link_apply_results
        where suggestion_id = ${input.suggestionId}::uuid
          and action = 'apply'
          and status in ('applied','verified')
        order by created_at desc
        limit 1
      `;
      if (!resultRows[0]) {
        throw new AdminAccessError(409, "Wiki link apply history is missing.");
      }
      const applied = asRecord(resultRows[0]);
      const articleId = asString(row.article_id);
      const draftRows = await tx`
        select snapshot
        from public.wiki_article_drafts
        where article_id = ${articleId}::uuid
        limit 1
      `;

      let rollbackMode: "draft_removed" | "rollback_draft_created";
      let afterVersion: number | null = null;
      if (draftRows[0]) {
        const draft = asRecord(draftRows[0].snapshot);
        const body = typeof draft.bodyMarkdown === "string" ? draft.bodyMarkdown : "";
        if (sha256(body) !== asString(applied.after_body_sha256)) {
          throw new AdminAccessError(409, "Open draft changed after link maintenance apply.");
        }
        await tx`
          delete from public.wiki_article_drafts
          where article_id = ${articleId}::uuid
        `;
        rollbackMode = "draft_removed";
      } else {
        const current = snapshotFromArticleRow(row);
        if (sha256(current.bodyMarkdown) !== asString(applied.after_body_sha256)) {
          throw new AdminAccessError(409, "Published article diverged after link maintenance apply.");
        }
        const rollbackBody = rollbackWikiLinkParagraphChange(
          current.bodyMarkdown,
          asString(row.proposed_paragraph),
          asString(row.current_paragraph),
        );
        const rollbackSnapshot = candidateSnapshotWithBody(
          current,
          rollbackBody,
          current.contentVersion + 1,
        );
        await saveAdminWikiDraft({
          actor: input.actor,
          articleId,
          snapshot: rollbackSnapshot,
          autosave: false,
          reason: input.reason,
          database: tx,
        });
        rollbackMode = "rollback_draft_created";
        afterVersion = rollbackSnapshot.contentVersion;
      }

      await tx`
        update halleus_private.wiki_link_suggestions
        set status = 'rolled_back'
        where id = ${input.suggestionId}::uuid
      `;
      await tx`
        insert into halleus_private.wiki_link_apply_results (
          suggestion_id, action, status, source_stable_id,
          before_content_version, after_content_version,
          before_body_sha256, after_body_sha256, details, actor_user_id
        ) values (
          ${input.suggestionId}::uuid,
          'rollback',
          'rolled_back',
          ${asString(row.source_stable_id)},
          ${asNumber(row.content_version)},
          ${afterVersion},
          ${asString(applied.after_body_sha256)},
          ${asString(applied.before_body_sha256)},
          ${tx.json({ mode: rollbackMode, autoPublished: false })},
          ${input.actor.userId}::uuid
        )
      `;
      await insertDecision(tx, {
        suggestionId: input.suggestionId,
        decision: "rolled_back",
        actor: input.actor,
        before: { status: asString(row.status) },
        after: { status: "rolled_back", mode: rollbackMode, autoPublished: false },
        reason: input.reason,
      });
      return {
        status: "rolled_back" as const,
        mode: rollbackMode,
        autoPublished: false,
      };
    });
  } catch (error) {
    if (error instanceof AdminAccessError && error.status === 409) {
      await markSuggestionConflict(input.suggestionId, input.actor, error.message);
    }
    throw error;
  }
}

export async function processPendingWikiLinkScanTriggers(limit = 3) {
  const sql = getAdminDatabase();
  const results: Array<{ triggerId: string; ok: boolean; error?: string }> = [];
  for (let index = 0; index < Math.min(Math.max(limit, 1), 5); index += 1) {
    const claimed = await sql.begin(async (tx) => {
      const rows = await tx`
        select id::text, trigger_kind, article_stable_id
        from halleus_private.wiki_link_scan_triggers
        where status = 'pending'
          and not_before <= now()
          and attempt_count < 5
        order by created_at
        for update skip locked
        limit 1
      `;
      if (!rows[0]) return null;
      const triggerId = asString(rows[0].id);
      const updated = await tx`
        update halleus_private.wiki_link_scan_triggers
        set status = 'running',
            attempt_count = attempt_count + 1,
            claimed_at = now()
        where id = ${triggerId}::uuid and status = 'pending'
        returning id::text
      `;
      return updated[0]
        ? {
            id: triggerId,
            triggerKind: asString(rows[0].trigger_kind) as "post_publish" | "periodic",
            stableId: asNullableString(rows[0].article_stable_id),
          }
        : null;
    });
    if (!claimed) break;

    try {
      await runWikiLinkAdminScan({
        actor: null,
        triggerKind: claimed.triggerKind,
        stableId: claimed.stableId,
      });
      await sql`
        update halleus_private.wiki_link_scan_triggers
        set status = 'completed', completed_at = now(), last_error = null
        where id = ${claimed.id}::uuid
      `;
      results.push({ triggerId: claimed.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "unknown";
      await sql`
        update halleus_private.wiki_link_scan_triggers
        set status = case when attempt_count >= 5 then 'failed' else 'pending' end,
            not_before = now() + interval '30 minutes',
            claimed_at = null,
            last_error = ${message},
            completed_at = case when attempt_count >= 5 then now() else null end
        where id = ${claimed.id}::uuid
      `;
      results.push({ triggerId: claimed.id, ok: false, error: message });
    }
  }
  return results;
}
