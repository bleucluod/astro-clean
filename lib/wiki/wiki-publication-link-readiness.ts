import type { Sql, TransactionSql } from "postgres";

import { AdminAccessError } from "@/lib/admin/admin-auth";
import { asRecord, asString } from "@/lib/admin/admin-database";
import { findWikiInternalArticleIds } from "@/lib/wiki/wiki-markdown";

export const WIKI_PUBLICATION_LIVE_INBOUND_MINIMUM = 3;
export const WIKI_PUBLICATION_INBOUND_SOURCE_MIN_AGE_DAYS = 10;

function readRuleInteger(config: Record<string, unknown>, key: string, fallback: number) {
  const value = Number(config[key] ?? fallback);
  if (!Number.isInteger(value) || value < 0 || value > 50) {
    throw new AdminAccessError(409, `Active Wiki ${key} rule is invalid.`);
  }
  return value;
}

export async function readWikiPublicationLiveInboundReadiness(input: {
  database: Sql | TransactionSql;
  articleId: string;
  stableId: string;
}) {
  const ruleRows = await input.database`
    select config
    from halleus_private.wiki_link_rule_versions
    where is_active = true
    order by version desc
    limit 2
  `;
  if (ruleRows.length !== 1) {
    throw new AdminAccessError(
      409,
      `Wiki publication requires exactly one active link rule; found ${ruleRows.length}.`,
    );
  }

  const config = asRecord(ruleRows[0].config);
  const incomingMin = readRuleInteger(config, "incomingMin", 0);
  const incomingTarget = readRuleInteger(config, "incomingTarget", WIKI_PUBLICATION_LIVE_INBOUND_MINIMUM);
  const minimum = Math.max(
    WIKI_PUBLICATION_LIVE_INBOUND_MINIMUM,
    incomingMin,
    incomingTarget,
  );

  const sourceRows = await input.database`
    select stable_id, body_markdown
    from public.wiki_articles
    where id <> ${input.articleId}::uuid
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and published_at <= now() - (${WIKI_PUBLICATION_INBOUND_SOURCE_MIN_AGE_DAYS} * interval '1 day')
      and scheduled_for is null
      and deleted_at is null
  `;
  const sourceStableIds = new Set(
    sourceRows
      .filter((item) =>
        findWikiInternalArticleIds(asString(item.body_markdown)).includes(input.stableId)
      )
      .map((item) => asString(item.stable_id))
      .filter(Boolean),
  );

  // HALLEUS_WIKI_INBOUND_SOFT_TARGET_NON_GATING:
  // Three eligible live inbound links are a quality target, not a publication gate.
  const incoming = sourceStableIds.size;
  return {
    incoming,
    minimum,
    ready: incoming >= minimum,
    deficit: Math.max(0, minimum - incoming),
    sourceStableIds: Array.from(sourceStableIds).sort(),
  };
}
