import {
  asBoolean,
  asNullableString,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import { findWikiInternalArticleIds } from "@/lib/wiki/wiki-markdown";
import type {
  WikiIndexabilityArticleStatus,
  WikiIndexabilityObservabilityState,
  WikiIndexabilitySeverity,
} from "@/lib/wiki/wiki-indexability-observability-types";

type ArticleRow = {
  id: string;
  stableId: string;
  slug: string;
  title: string;
  status: string;
  indexable: boolean;
  publishedAt: string | null;
  scheduledFor: string | null;
  bodyMarkdown: string;
};

type LinkStatus = "active" | "pending" | "disabled" | "failed";

const LINK_STATUSES: LinkStatus[] = ["active", "pending", "disabled", "failed"];

function emptyLinkCounts() {
  return { active: 0, pending: 0, disabled: 0, failed: 0 };
}

function addLinkCount(
  store: Map<string, ReturnType<typeof emptyLinkCounts>>,
  key: string,
  status: string,
  count: number,
) {
  if (!LINK_STATUSES.includes(status as LinkStatus)) return;
  const current = store.get(key) ?? emptyLinkCounts();
  current[status as LinkStatus] += count;
  store.set(key, current);
}

function articleFromRow(raw: unknown): ArticleRow {
  const row = asRecord(raw);
  return {
    id: asString(row.id),
    stableId: asString(row.stable_id),
    slug: asString(row.slug),
    title: asString(row.title),
    status: asString(row.status),
    indexable: asBoolean(row.is_indexable),
    publishedAt: asNullableString(row.published_at),
    scheduledFor: asNullableString(row.scheduled_for),
    bodyMarkdown: asString(row.body_markdown),
  };
}

function isPublicReady(article: ArticleRow, now: Date) {
  if (article.status !== "published") return false;
  if (!article.indexable) return false;
  if (!article.publishedAt) return false;
  if (new Date(article.publishedAt) > now) return false;
  if (article.scheduledFor && new Date(article.scheduledFor) > now) return false;
  return true;
}

function severityFromReasons(blockers: string[], warnings: string[]): WikiIndexabilitySeverity {
  if (blockers.length > 0) return "blocked";
  if (warnings.length > 0) return "warning";
  return "ok";
}

export async function getWikiIndexabilityObservabilityState(): Promise<WikiIndexabilityObservabilityState> {
  const sql = getAdminDatabase();
  const now = new Date();
  const [articleRows, linkRows] = await Promise.all([
    sql`
      select
        id::text,
        stable_id,
        slug,
        title,
        status,
        is_indexable,
        published_at::text,
        scheduled_for::text,
        body_markdown
      from public.wiki_articles
      where deleted_at is null
      order by updated_at desc, stable_id
    `,
    sql`
      select
        source_article_id::text,
        target_stable_id,
        activation_status,
        count(*)::int as count
      from public.wiki_internal_links
      group by source_article_id, target_stable_id, activation_status
    `,
  ]);

  const articles = articleRows.map(articleFromRow);
  const publicStableIds = new Set(
    articles.filter((article) => isPublicReady(article, now)).map((article) => article.stableId),
  );
  const articleIdToStableId = new Map(
    articles.map((article) => [article.id, article.stableId]),
  );
  const outgoing = new Map<string, ReturnType<typeof emptyLinkCounts>>();
  const incoming = new Map<string, ReturnType<typeof emptyLinkCounts>>();

  for (const raw of linkRows) {
    const row = asRecord(raw);
    const sourceStableId = articleIdToStableId.get(asString(row.source_article_id));
    const targetStableId = asString(row.target_stable_id);
    const status = asString(row.activation_status);
    const count = Number(row.count ?? 0);
    if (sourceStableId) addLinkCount(outgoing, sourceStableId, status, count);
    addLinkCount(incoming, targetStableId, status, count);
  }

  let activeLinks = 0;
  let pendingLinks = 0;
  let disabledLinks = 0;
  let failedLinks = 0;
  for (const counts of outgoing.values()) {
    activeLinks += counts.active;
    pendingLinks += counts.pending;
    disabledLinks += counts.disabled;
    failedLinks += counts.failed;
  }

  const statuses: WikiIndexabilityArticleStatus[] = articles.map((article) => {
    const ready = isPublicReady(article, now);
    const outgoingCounts = outgoing.get(article.stableId) ?? emptyLinkCounts();
    const incomingCounts = incoming.get(article.stableId) ?? emptyLinkCounts();
    const inlineTargets = [...new Set(findWikiInternalArticleIds(article.bodyMarkdown))];
    const unresolvedInlineTargets = inlineTargets.filter(
      (targetStableId) => !publicStableIds.has(targetStableId),
    );
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (article.status === "published" && !ready) {
      blockers.push("Published row is not technically public-ready.");
    }
    if (ready && unresolvedInlineTargets.length > 0) {
      blockers.push("Body links point to unpublished or missing Wiki targets.");
    }
    if (ready && incomingCounts.active === 0) {
      warnings.push("Public article has no active inbound Wiki links yet.");
    }
    if (ready && outgoingCounts.active === 0) {
      warnings.push("Public article has no active contextual outgoing Wiki links.");
    }
    if (outgoingCounts.failed + incomingCounts.failed > 0) {
      warnings.push("Some materialized links failed activation.");
    }
    if (outgoingCounts.disabled + incomingCounts.disabled > 0) {
      warnings.push("Some links were disabled after a publish or unpublish lifecycle change.");
    }

    const reasons = [...blockers, ...warnings];
    return {
      id: article.id,
      stableId: article.stableId,
      slug: article.slug,
      title: article.title,
      status: article.status,
      indexable: article.indexable,
      publishedAt: article.publishedAt,
      scheduledFor: article.scheduledFor,
      expectedPath: `/wiki/${article.slug}`,
      publicReady: ready,
      sitemapEligible: ready,
      canonicalExpected: `/wiki/${article.slug}`,
      severity: severityFromReasons(blockers, warnings),
      reasons,
      unresolvedInlineTargets,
      outgoing: outgoingCounts,
      incoming: incomingCounts,
    };
  });

  const summary = statuses.reduce(
    (current, article) => {
      current.totalArticles += 1;
      if (article.publicReady) current.publicReady += 1;
      if (article.sitemapEligible) current.sitemapEligible += 1;
      current[article.severity] += 1;
      if (article.publicReady && article.incoming.active === 0) {
        current.publicWithoutInbound += 1;
      }
      current.unresolvedInlineTargets += article.unresolvedInlineTargets.length;
      return current;
    },
    {
      totalArticles: 0,
      publicReady: 0,
      sitemapEligible: 0,
      ok: 0,
      warning: 0,
      blocked: 0,
      publicWithoutInbound: 0,
      unresolvedInlineTargets: 0,
      activeLinks,
      pendingLinks,
      disabledLinks,
      failedLinks,
    },
  );

  return {
    generatedAt: now.toISOString(),
    summary,
    articles: statuses.sort((a, b) => {
      const rank = { blocked: 0, warning: 1, ok: 2 };
      return rank[a.severity] - rank[b.severity] || a.title.localeCompare(b.title, "fa");
    }),
  };
}
