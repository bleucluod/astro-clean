import { revalidatePath, revalidateTag } from "next/cache";

import { asBoolean, asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import {
  blockStaleWikiArticleServing,
  blockStaleWikiIndexServing,
  WIKI_PUBLIC_INDEX_CACHE_TAG,
  wikiPublicArticleCacheTag,
} from "@/lib/wiki/wiki-cache";

export type WikiPublicRevalidationState = {
  articleId: string;
  slug: string;
  categoryId: string;
  title: string;
  shortTitle: string;
  summary: string;
  readingMinutes: number;
  updatedAt: string;
  isPublic: boolean;
  aliases: string[];
};

function isCurrentPublicWikiRow(row: Record<string, unknown>) {
  const publishedAt = row.published_at ? Date.parse(asString(row.published_at)) : NaN;
  return (
    asString(row.status) === "published" &&
    asBoolean(row.is_indexable) &&
    Number.isFinite(publishedAt) &&
    publishedAt <= Date.now() &&
    !row.scheduled_for &&
    !row.deleted_at
  );
}

export async function readWikiPublicRevalidationStates(
  articleIds: readonly string[],
): Promise<Array<WikiPublicRevalidationState | null>> {
  if (!articleIds.length) return [];
  const sql = getAdminDatabase();
  const [rows, aliasRows] = await Promise.all([
    sql`
      select id::text, slug, category_id, title, short_title, summary,
             reading_minutes, updated_at::text as updated_at,
             status, is_indexable, published_at::text as published_at,
             scheduled_for::text as scheduled_for, deleted_at::text as deleted_at
      from public.wiki_articles
      where id = any(${articleIds}::uuid[])
    `,
    sql`
      select target_article_id::text as article_id, source_slug
      from public.wiki_redirects
      where target_article_id = any(${articleIds}::uuid[])
        and is_active = true
        and http_status = 308
      order by target_article_id, source_slug asc
    `,
  ]);

  const aliasesByArticleId = new Map<string, string[]>();
  for (const raw of aliasRows) {
    const row = asRecord(raw);
    const articleId = asString(row.article_id);
    const aliases = aliasesByArticleId.get(articleId) ?? [];
    aliases.push(asString(row.source_slug));
    aliasesByArticleId.set(articleId, aliases);
  }

  const statesByArticleId = new Map<string, WikiPublicRevalidationState>();
  for (const raw of rows) {
    const row = asRecord(raw);
    const articleId = asString(row.id);
    statesByArticleId.set(articleId, {
      articleId,
      slug: asString(row.slug),
      categoryId: asString(row.category_id),
      title: asString(row.title),
      shortTitle: asString(row.short_title),
      summary: asString(row.summary),
      readingMinutes: asNumber(row.reading_minutes),
      updatedAt: asString(row.updated_at),
      isPublic: isCurrentPublicWikiRow(row),
      aliases: (aliasesByArticleId.get(articleId) ?? []).filter(Boolean),
    });
  }

  return articleIds.map((articleId) => statesByArticleId.get(articleId) ?? null);
}

export async function readWikiPublicRevalidationState(
  articleId: string,
): Promise<WikiPublicRevalidationState | null> {
  return (await readWikiPublicRevalidationStates([articleId]))[0] ?? null;
}

export async function readWikiPublicRevalidationStateByStableId(
  stableId: string,
): Promise<WikiPublicRevalidationState | null> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select id::text
    from public.wiki_articles
    where stable_id = ${stableId}
      and deleted_at is null
    limit 1
  `;
  if (!rows[0]) return null;
  return readWikiPublicRevalidationState(asString(asRecord(rows[0]).id));
}

function listingFingerprint(state: WikiPublicRevalidationState | null) {
  if (!state?.isPublic) return null;
  return JSON.stringify({
    slug: state.slug,
    categoryId: state.categoryId,
    title: state.title,
    shortTitle: state.shortTitle,
    summary: state.summary,
    readingMinutes: state.readingMinutes,
    updatedAt: state.updatedAt,
  });
}

function sitemapFingerprint(state: WikiPublicRevalidationState | null) {
  if (!state?.isPublic) return null;
  return JSON.stringify({ slug: state.slug, updatedAt: state.updatedAt });
}

export function revalidateWikiPublicChange(input: {
  before: WikiPublicRevalidationState | null;
  after: WikiPublicRevalidationState | null;
  extraArticleSlugs?: readonly string[];
}) {
  const articleSlugs = new Set<string>();
  const addSlug = (slug: string | null | undefined) => {
    if (slug?.trim()) articleSlugs.add(slug.trim());
  };

  addSlug(input.before?.slug);
  addSlug(input.after?.slug);
  for (const slug of input.before?.aliases ?? []) addSlug(slug);
  for (const slug of input.after?.aliases ?? []) addSlug(slug);
  for (const slug of input.extraArticleSlugs ?? []) addSlug(slug);

  for (const slug of articleSlugs) {
    blockStaleWikiArticleServing(slug);
    revalidateTag(wikiPublicArticleCacheTag(slug), { expire: 0 });
    revalidatePath(`/wiki/${slug}`, "page");
  }

  const listingChanged = listingFingerprint(input.before) !== listingFingerprint(input.after);
  if (listingChanged) {
    blockStaleWikiIndexServing();
    revalidateTag(WIKI_PUBLIC_INDEX_CACHE_TAG, { expire: 0 });
    revalidatePath("/wiki", "page");
    revalidatePath("/", "page");
    revalidatePath("/chart", "page");

    const categoryIds = new Set<string>();
    if (input.before?.isPublic && input.before.categoryId) {
      categoryIds.add(input.before.categoryId);
    }
    if (input.after?.isPublic && input.after.categoryId) {
      categoryIds.add(input.after.categoryId);
    }
    for (const categoryId of categoryIds) {
      revalidatePath(`/wiki/category/${categoryId}`, "page");
    }
  }

  if (sitemapFingerprint(input.before) !== sitemapFingerprint(input.after)) {
    revalidatePath("/sitemap.xml");
  }
}