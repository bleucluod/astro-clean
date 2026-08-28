import type { Sql, TransactionSql } from "postgres";

import { getAdminDatabase } from "@/lib/admin/admin-database";
import { findWikiInternalArticleIds } from "@/lib/wiki/wiki-markdown";

type WikiLinkMaterializationInput = {
  database?: Sql | TransactionSql;
  sourceArticleId: string;
  bodyMarkdown: string;
  relatedArticleIds: readonly string[];
};

type WikiLinkActivationStatus = "active" | "pending";

export type WikiLinkMaterializationResult = {
  ok: boolean;
  inlineCount: number;
  relatedCount: number;
  activeCount: number;
  pendingCount: number;
  error?: string;
};

export type WikiLinkActivationResult = {
  ok: boolean;
  activatedLinks: number;
  sourceSlugs: string[];
  error?: string;
};

async function readPublicReadyTargetIds(
  database: Sql | TransactionSql,
  stableIds: readonly string[],
) {
  const ids = [...new Set(stableIds)].filter(Boolean);
  if (!ids.length) return new Set<string>();
  const rows = await database`
    select stable_id
    from public.wiki_articles
    where stable_id = any(${ids}::text[])
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
  `;
  return new Set(rows.map((row) => String(row.stable_id)));
}

async function writePublishedWikiInternalLinks(
  database: Sql | TransactionSql,
  input: WikiLinkMaterializationInput,
) {
  const inlineIds = [...new Set(findWikiInternalArticleIds(input.bodyMarkdown))];
  const relatedIds = [...new Set(input.relatedArticleIds)];
  const publicReadyTargets = await readPublicReadyTargetIds(database, [
    ...inlineIds,
    ...relatedIds,
  ]);
  let activeCount = 0;
  let pendingCount = 0;

  const statusFor = (targetId: string): WikiLinkActivationStatus => (
    publicReadyTargets.has(targetId) ? "active" : "pending"
  );
  const countStatus = (status: WikiLinkActivationStatus) => {
    if (status === "active") activeCount += 1;
    if (status === "pending") pendingCount += 1;
  };

  await database`delete from public.wiki_internal_links where source_article_id = ${input.sourceArticleId}::uuid`;
  for (const targetId of inlineIds) {
    const activationStatus = statusFor(targetId);
    countStatus(activationStatus);
    await database`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      )
      values (
        ${input.sourceArticleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`},
        ${activationStatus}, now(), now()
      )
    `;
  }
  for (const targetId of relatedIds) {
    const activationStatus = statusFor(targetId);
    countStatus(activationStatus);
    await database`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      )
      values (
        ${input.sourceArticleId}::uuid, ${targetId}, 'related', ${targetId},
        ${activationStatus}, now(), now()
      )
      on conflict do nothing
    `;
  }

  return { inlineCount: inlineIds.length, relatedCount: relatedIds.length, activeCount, pendingCount };
}

export async function syncPublishedWikiInternalLinks(
  input: WikiLinkMaterializationInput,
): Promise<WikiLinkMaterializationResult> {
  const counts = input.database
    ? await writePublishedWikiInternalLinks(input.database, input)
    : await getAdminDatabase().begin((tx) => writePublishedWikiInternalLinks(tx, input));

  return { ok: true, ...counts };
}

export async function syncPublishedWikiInternalLinksBestEffort(
  input: WikiLinkMaterializationInput,
): Promise<WikiLinkMaterializationResult> {
  try {
    return await syncPublishedWikiInternalLinks(input);
  } catch (error) {
    return {
      ok: false,
      inlineCount: 0,
      relatedCount: 0,
      activeCount: 0,
      pendingCount: 0,
      error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
    };
  }
}

async function activatePublishedWikiTargetInboundLinks(
  database: Sql | TransactionSql,
  targetStableId: string,
) {
  const sourceRows = await database`
    update public.wiki_internal_links as link
    set activation_status = 'active',
        activated_at = now(),
        last_verified_at = now(),
        activation_error = null,
        disabled_at = null
    from public.wiki_articles as source
    where link.source_article_id = source.id
      and link.target_stable_id = ${targetStableId}
      and link.activation_status in ('pending', 'disabled')
      and source.status = 'published'
      and source.is_indexable = true
      and source.published_at is not null
      and source.published_at <= now()
      and source.scheduled_for is null
      and source.deleted_at is null
    returning source.slug
  `;
  const sourceSlugs = [
    ...new Set(sourceRows.map((row) => String(row.slug)).filter(Boolean)),
  ];
  return { activatedLinks: sourceRows.length, sourceSlugs };
}

export async function activatePublishedWikiTargetInboundLinksBestEffort(input: {
  database?: Sql | TransactionSql;
  targetStableId: string;
}): Promise<WikiLinkActivationResult> {
  try {
    const result = input.database
      ? await activatePublishedWikiTargetInboundLinks(input.database, input.targetStableId)
      : await getAdminDatabase().begin((tx) =>
          activatePublishedWikiTargetInboundLinks(tx, input.targetStableId)
        );
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      activatedLinks: 0,
      sourceSlugs: [],
      error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
    };
  }
}
