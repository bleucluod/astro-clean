import { readFileSync } from "node:fs";
import postgres from "postgres";

const ARTICLE_LINK_PATTERN = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const RUN_ID = "wiki-scheduled-inbound-links-full-mizfa-plus-r2-20260829";
const CHANGE_NOTE = `Add natural pending inbound links for ${RUN_ID}`;
const ROLLBACK_NOTE = `Rollback scheduled inbound links for ${RUN_ID}`;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const parsedLimit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Number.POSITIVE_INFINITY;
  return {
    apply: args.includes("--apply"),
    selfCheck: args.includes("--self-check"),
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : Number.POSITIVE_INFINITY,
  };
}

function articleIdsFromBody(bodyMarkdown) {
  return [...new Set([...String(bodyMarkdown ?? "").matchAll(ARTICLE_LINK_PATTERN)].map((match) => match[1]))];
}

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function snapshotWithVersion(snapshot, contentVersion) {
  return {
    ...snapshot,
    contentVersion,
  };
}

async function deleteAddedInlineLinks(tx, sourceArticleId, currentBodyMarkdown, previousBodyMarkdown) {
  const currentIds = new Set(articleIdsFromBody(currentBodyMarkdown));
  const previousIds = new Set(articleIdsFromBody(previousBodyMarkdown));
  const addedTargetIds = [...currentIds].filter((targetId) => !previousIds.has(targetId));
  if (!addedTargetIds.length) return;
  await tx`
    delete from public.wiki_internal_links
    where source_article_id = ${sourceArticleId}::uuid
      and target_stable_id = any(${addedTargetIds}::text[])
      and link_kind = 'inline'
  `;
}

function assertSelfCheck() {
  const markers = [
    "CHANGE_NOTE",
    "ROLLBACK_NOTE",
    "--limit",
    "rollbackOne(sql, row",
    "set local lock_timeout",
    "set local statement_timeout",
    "console.error(`[rollback]",
    "where current_revision.change_note = ${CHANGE_NOTE}",
    "article.content_version = (current_revision.snapshot->>'contentVersion')::integer",
    "Rollback scheduled inbound links",
    "deleteAddedInlineLinks(tx, lockedRow.article_id",
  ];
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`self-check marker missing: ${marker}`);
  }
  console.log("Wiki scheduled inbound rollback contract OK");
}

async function loadRollbackCandidates(sql, limit) {
  const rows = await sql`
    select
      article.id::text as article_id,
      article.stable_id,
      article.slug,
      article.content_version,
      current_revision.revision_number as current_revision_number,
      current_revision.snapshot as current_snapshot,
      previous_revision.revision_number as previous_revision_number,
      previous_revision.snapshot as previous_snapshot
    from public.wiki_article_revisions as current_revision
    join public.wiki_articles as article on article.id = current_revision.article_id
    join lateral (
      select previous.revision_number, previous.snapshot
      from public.wiki_article_revisions as previous
      where previous.article_id = current_revision.article_id
        and previous.revision_number < current_revision.revision_number
      order by previous.revision_number desc
      limit 1
    ) as previous_revision on true
    where current_revision.change_note = ${CHANGE_NOTE}
      and current_revision.revision_status = 'published'
      and article.deleted_at is null
      and article.body_markdown = current_revision.snapshot->>'bodyMarkdown'
      and article.content_version = (current_revision.snapshot->>'contentVersion')::integer
    order by article.stable_id
  `;
  return Number.isFinite(limit) ? rows.slice(0, limit) : rows;
}

async function loadRollbackCandidateForUpdate(tx, articleId) {
  const rows = await tx`
    select
      article.id::text as article_id,
      article.stable_id,
      article.slug,
      article.content_version,
      current_revision.revision_number as current_revision_number,
      current_revision.snapshot as current_snapshot,
      previous_revision.revision_number as previous_revision_number,
      previous_revision.snapshot as previous_snapshot
    from public.wiki_article_revisions as current_revision
    join public.wiki_articles as article on article.id = current_revision.article_id
    join lateral (
      select previous.revision_number, previous.snapshot
      from public.wiki_article_revisions as previous
      where previous.article_id = current_revision.article_id
        and previous.revision_number < current_revision.revision_number
      order by previous.revision_number desc
      limit 1
    ) as previous_revision on true
    where current_revision.change_note = ${CHANGE_NOTE}
      and current_revision.revision_status = 'published'
      and article.id = ${articleId}::uuid
      and article.deleted_at is null
      and article.body_markdown = current_revision.snapshot->>'bodyMarkdown'
      and article.content_version = (current_revision.snapshot->>'contentVersion')::integer
    limit 1
    for update of article
  `;
  return rows[0] ?? null;
}

async function rollbackOne(sql, row, apply) {
  return sql.begin(async (tx) => {
    await tx`set local lock_timeout = '5s'`;
    await tx`set local statement_timeout = '30s'`;

    const lockedRow = apply ? await loadRollbackCandidateForUpdate(tx, row.article_id) : row;
    if (!lockedRow) {
      return { skipped: { stableId: row.stable_id, reason: "changed-after-dry-run" } };
    }

    const previousSnapshot = lockedRow.previous_snapshot && typeof lockedRow.previous_snapshot === "object"
      ? lockedRow.previous_snapshot
      : null;
    if (!previousSnapshot || typeof previousSnapshot.bodyMarkdown !== "string") {
      return { skipped: { stableId: lockedRow.stable_id, reason: "previous-snapshot-missing" } };
    }

    const nextVersion = Number(lockedRow.content_version ?? 1) + 1;
    const bodyMarkdown = String(previousSnapshot.bodyMarkdown);
    const sections = jsonArray(previousSnapshot.sections);
    const relatedArticleIds = jsonArray(previousSnapshot.relatedArticleIds);
    const rollbackSnapshot = snapshotWithVersion(previousSnapshot, nextVersion);
    const restored = {
      stableId: lockedRow.stable_id,
      slug: lockedRow.slug,
      fromRevision: Number(lockedRow.current_revision_number),
      toRevision: Number(lockedRow.previous_revision_number),
      nextVersion,
    };

    if (!apply) return { restored };

    await tx`
      update public.wiki_articles
      set sections = ${tx.json(sections)},
          body_markdown = ${bodyMarkdown},
          related_article_ids = ${tx.json(relatedArticleIds)},
          content_version = ${nextVersion},
          updated_at = now()
      where id = ${lockedRow.article_id}::uuid
    `;
    await tx`
      insert into public.wiki_article_revisions (
        article_id, revision_number, snapshot, change_note, created_by,
        revision_status, published_at
      ) values (
        ${lockedRow.article_id}::uuid,
        (select coalesce(max(existing.revision_number), 0)::integer + 1
         from public.wiki_article_revisions as existing
         where existing.article_id = ${lockedRow.article_id}::uuid),
        ${tx.json(rollbackSnapshot)},
        ${ROLLBACK_NOTE},
        null,
        'published',
        now()
      )
    `;
    await deleteAddedInlineLinks(
      tx,
      lockedRow.article_id,
      String(lockedRow.current_snapshot?.bodyMarkdown ?? ""),
      bodyMarkdown,
    );
    return { restored };
  });
}

async function main() {
  const options = parseArgs();
  if (options.selfCheck) {
    assertSelfCheck();
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const candidates = await loadRollbackCandidates(sql, options.limit);
    const restored = [];
    const skipped = [];

    for (const [index, row] of candidates.entries()) {
      if (options.apply) console.error(`[rollback] ${index + 1}/${candidates.length} ${row.stable_id}`);
      let item;
      try {
        item = await rollbackOne(sql, row, options.apply);
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 300) : "rollback failed";
        item = { skipped: { stableId: row.stable_id, reason: "rollback-error", error: message } };
        console.error(`[rollback] skipped ${row.stable_id}: ${message}`);
      }
      if (item.restored) restored.push(item.restored);
      if (item.skipped) skipped.push(item.skipped);
    }

    if (options.apply) {
      await sql.begin(async (tx) => {
        await tx`set local statement_timeout = '15s'`;
        await tx`
          insert into halleus_private.admin_audit_events (
            actor_user_id, actor_role, action, target_type, target_id,
            before_summary, after_summary, reason, success, request_correlation_id
          ) values (
            null, 'system', 'system.wiki.scheduled_inbound_link_rollback',
            'wiki_graph', ${RUN_ID},
            ${tx.json({ changeNote: CHANGE_NOTE })},
            ${tx.json({ restoredCount: restored.length, skippedCount: skipped.length })},
            'Rollback unsafe scheduled Wiki inbound links from the previous planner run.',
            true,
            ${RUN_ID}
          )
        `;
      });
    }

    const result = {
      mode: options.apply ? "applied" : "dry-run",
      runId: RUN_ID,
      limit: Number.isFinite(options.limit) ? options.limit : null,
      scannedCount: candidates.length,
      restoredCount: restored.length,
      skippedCount: skipped.length,
      restored,
      skipped,
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
