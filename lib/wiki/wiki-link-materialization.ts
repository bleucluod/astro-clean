import type { Sql, TransactionSql } from "postgres";

import { getAdminDatabase } from "@/lib/admin/admin-database";
import { findWikiInternalArticleIds } from "@/lib/wiki/wiki-markdown";

type WikiLinkMaterializationInput = {
  database?: Sql | TransactionSql;
  sourceArticleId: string;
  bodyMarkdown: string;
  relatedArticleIds: readonly string[];
};

export type WikiLinkMaterializationResult = {
  ok: boolean;
  inlineCount: number;
  relatedCount: number;
  error?: string;
};

async function writePublishedWikiInternalLinks(
  database: Sql | TransactionSql,
  input: WikiLinkMaterializationInput,
) {
  const inlineIds = [...new Set(findWikiInternalArticleIds(input.bodyMarkdown))];
  const relatedIds = [...new Set(input.relatedArticleIds)];

  await database`delete from public.wiki_internal_links where source_article_id = ${input.sourceArticleId}::uuid`;
  for (const targetId of inlineIds) {
    await database`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      )
      values (
        ${input.sourceArticleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`},
        'active', now(), now()
      )
    `;
  }
  for (const targetId of relatedIds) {
    await database`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      )
      values (
        ${input.sourceArticleId}::uuid, ${targetId}, 'related', ${targetId},
        'active', now(), now()
      )
      on conflict do nothing
    `;
  }

  return { inlineCount: inlineIds.length, relatedCount: relatedIds.length };
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
      error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
    };
  }
}