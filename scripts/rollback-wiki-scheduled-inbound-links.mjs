import { readFileSync } from "node:fs";
import postgres from "postgres";

const ARTICLE_LINK_PATTERN = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const RUN_ID = "wiki-scheduled-inbound-links-20260828";
const CHANGE_NOTE = `Add natural pending inbound links for ${RUN_ID}`;
const ROLLBACK_NOTE = `Rollback scheduled inbound links for ${RUN_ID}`;

function parseArgs() {
  return {
    apply: process.argv.includes("--apply"),
    selfCheck: process.argv.includes("--self-check"),
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

async function syncInlineLinks(tx, sourceArticleId, bodyMarkdown, relatedArticleIds) {
  const inlineIds = [...new Set(articleIdsFromBody(bodyMarkdown))];
  const relatedIds = [...new Set(relatedArticleIds ?? [])];
  const targetIds = [...new Set([...inlineIds, ...relatedIds])];
  const publicRows = targetIds.length
    ? await tx`
        select stable_id
        from public.wiki_articles
        where stable_id = any(${targetIds}::text[])
          and status = 'published'
          and is_indexable = true
          and published_at is not null
          and published_at <= now()
          and scheduled_for is null
          and deleted_at is null
      `
    : [];
  const publicReadyTargets = new Set(publicRows.map((row) => String(row.stable_id)));
  const statusFor = (targetId) => publicReadyTargets.has(targetId) ? "active" : "pending";

  await tx`delete from public.wiki_internal_links where source_article_id = ${sourceArticleId}::uuid`;
  for (const targetId of inlineIds) {
    const activationStatus = statusFor(targetId);
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at, activation_error
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`},
        ${activationStatus}, now(), now(),
        ${activationStatus === "pending" ? "target-not-public-ready" : null}
      )
    `;
  }
  for (const targetId of relatedIds) {
    const activationStatus = statusFor(targetId);
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at, activation_error
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'related', ${targetId},
        ${activationStatus}, now(), now(),
        ${activationStatus === "pending" ? "target-not-public-ready" : null}
      )
      on conflict do nothing
    `;
  }
}

function assertSelfCheck() {
  const markers = [
    "CHANGE_NOTE",
    "ROLLBACK_NOTE",
    "where current_revision.change_note = ${CHANGE_NOTE}",
    "article.content_version = (current_revision.snapshot->>'contentVersion')::integer",
    "Rollback scheduled inbound links",
    "syncInlineLinks(tx, row.article_id",
  ];
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`self-check marker missing: ${marker}`);
  }
  console.log("Wiki scheduled inbound rollback contract OK");
}

async function loadRollbackCandidates(tx) {
  return tx`
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
    for update of article
  `;
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
    const result = await sql.begin(async (tx) => {
      const candidates = await loadRollbackCandidates(tx);
      const restored = [];
      const skipped = [];

      for (const row of candidates) {
        const previousSnapshot = row.previous_snapshot && typeof row.previous_snapshot === "object"
          ? row.previous_snapshot
          : null;
        if (!previousSnapshot || typeof previousSnapshot.bodyMarkdown !== "string") {
          skipped.push({ stableId: row.stable_id, reason: "previous-snapshot-missing" });
          continue;
        }

        const nextVersion = Number(row.content_version ?? 1) + 1;
        const bodyMarkdown = String(previousSnapshot.bodyMarkdown);
        const sections = jsonArray(previousSnapshot.sections);
        const relatedArticleIds = jsonArray(previousSnapshot.relatedArticleIds);
        const rollbackSnapshot = snapshotWithVersion(previousSnapshot, nextVersion);

        restored.push({
          stableId: row.stable_id,
          slug: row.slug,
          fromRevision: Number(row.current_revision_number),
          toRevision: Number(row.previous_revision_number),
          nextVersion,
        });

        if (!options.apply) continue;

        await tx`
          update public.wiki_articles
          set sections = ${tx.json(sections)},
              body_markdown = ${bodyMarkdown},
              related_article_ids = ${tx.json(relatedArticleIds)},
              content_version = ${nextVersion},
              updated_at = now()
          where id = ${row.article_id}::uuid
        `;
        await tx`
          insert into public.wiki_article_revisions (
            article_id, revision_number, snapshot, change_note, created_by,
            revision_status, published_at
          ) values (
            ${row.article_id}::uuid,
            (select coalesce(max(existing.revision_number), 0)::integer + 1
             from public.wiki_article_revisions as existing
             where existing.article_id = ${row.article_id}::uuid),
            ${tx.json(rollbackSnapshot)},
            ${ROLLBACK_NOTE},
            null,
            'published',
            now()
          )
        `;
        await syncInlineLinks(tx, row.article_id, bodyMarkdown, relatedArticleIds);
      }

      if (options.apply) {
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
      }

      return {
        mode: options.apply ? "applied" : "dry-run",
        runId: RUN_ID,
        restoredCount: restored.length,
        skippedCount: skipped.length,
        restored,
        skipped,
      };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
