import { cache } from "react";
import { unstable_cache } from "next/cache";
import postgres from "postgres";

import { getHalleusRuntimeEnv } from "@/lib/config/env";
import {
  wikiArticles as fallbackWikiArticles,
  wikiCategories as fallbackWikiCategories,
} from "@/lib/wiki/wiki-content";
import {
  buildPublicWikiClusterArticles,
  buildPublicWikiRelatedArticles,
  buildPublicWikiCategoryViews,
  normalizePublicWikiUpdatedAt,
} from "@/lib/wiki/wiki-public-discovery";
import type {
  DatedWikiArticle,
  PublicWikiRelationshipArticle,
} from "@/lib/wiki/wiki-public-discovery";
import type {
  WikiArticle,
  WikiArticleCallToAction,
  WikiArticleImage,
  WikiArticleLink,
  WikiArticleSection,
  WikiArticleSource,
  WikiCategory,
} from "@/lib/wiki/wiki-content";
import {
  allowStaleWikiArticleServing,
  allowStaleWikiIndexServing,
  canServeStaleWikiArticle,
  canServeStaleWikiIndex,
  WIKI_PUBLIC_FOOTER_CACHE_TAG,
  WIKI_PUBLIC_INDEX_CACHE_TAG,
  wikiPublicArticleCacheTag,
} from "@/lib/wiki/wiki-cache";

type WikiStorageSource = "database" | "code-fallback";

type StoredWikiArticle = WikiArticle & {
  stableId: string;
  relatedArticleIds: readonly string[];
  updatedAt: string;
};

export type PublicWikiArticle = StoredWikiArticle;

export type PublicWikiIndexArticle = DatedWikiArticle;

export type PublicWikiIndex = {
  articles: PublicWikiIndexArticle[];
  categories: WikiCategory[];
  source: WikiStorageSource;
};

export type PublicWikiRelatedArticle = Pick<
  PublicWikiRelationshipArticle,
  "stableId" | "slug" | "shortTitle" | "summary"
>;

export type PublicWikiFooterArticle = {
  slug: string;
  title: string;
  updatedAt: string;
};

export type PublicWikiArticleResolution =
  | {
      kind: "article";
      article: PublicWikiArticle;
      categories: WikiCategory[];
      clusterArticles: PublicWikiRelatedArticle[];
      relatedArticles: PublicWikiRelatedArticle[];
      source: WikiStorageSource;
      internalLinkTargets: Record<string, { slug: string; label: string }>;
    }
  | {
      kind: "redirect";
      targetSlug: string;
      source: WikiStorageSource;
    }
  | {
      kind: "missing";
      source: WikiStorageSource;
    };

let wikiSql: ReturnType<typeof postgres> | null = null;
let fallbackWarningPrinted = false;
let staleIndexWarningPrinted = false;
const staleArticleWarnings = new Set<string>();
let wikiIndexReadInFlight: Promise<PublicWikiIndex> | null = null;
const wikiArticleReadsInFlight = new Map<
  string,
  Promise<PublicWikiArticleResolution>
>();
let lastKnownGoodWikiIndex: PublicWikiIndex | null = null;
const lastKnownGoodWikiArticles = new Map<
  string,
  PublicWikiArticleResolution
>();
const lastKnownGoodWikiArticleBodies = new Map<string, PublicWikiArticle | null>();
const wikiArticleBodyReadsInFlight = new Map<string, Promise<PublicWikiArticle | null>>();
let wikiDatabaseCircuitOpenUntil = 0;

function getWikiDatabase() {
  if (wikiSql) return wikiSql;

  const databaseUrl = getHalleusRuntimeEnv().databaseUrl;
  if (!databaseUrl) return null;

  wikiSql = postgres(databaseUrl, {
    max: 2,
    idle_timeout: 10,
    connect_timeout: 5,
    prepare: false,
  });
  return wikiSql;
}

function storageErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return "unknown";
  const code = Reflect.get(error, "code");
  return typeof code === "string" && code ? code : "unclassified";
}

const WIKI_DATABASE_RECOVERABLE_ERROR_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "57P01",
  "57P02",
  "57P03",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECT_TIMEOUT",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "XX000",
]);

function isRecoverableWikiDatabaseError(error: unknown) {
  return WIKI_DATABASE_RECOVERABLE_ERROR_CODES.has(storageErrorCode(error));
}

async function resetWikiDatabaseClient(
  sql: ReturnType<typeof postgres>,
  error: unknown,
) {
  if (!isRecoverableWikiDatabaseError(error)) return;
  if (wikiSql === sql) wikiSql = null;

  try {
    await sql.end({ timeout: 0 });
  } catch {
    // Already unusable; the next attempt creates a fresh pool.
  }

  console.warn(
    JSON.stringify({
      marker: "HALLEUS_WIKI_DATABASE_CLIENT_RESET",
      errorCode: storageErrorCode(error),
    }),
  );
}

function warnAboutFallback(
  reason: "database-not-configured" | "database-read-failed",
  error?: unknown,
) {
  if (fallbackWarningPrinted) return;
  fallbackWarningPrinted = true;
  console.warn(
    JSON.stringify({
      marker: "HALLEUS_WIKI_STORAGE_FALLBACK",
      reason,
      errorCode: error ? storageErrorCode(error) : null,
    }),
  );
}

function asString(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text || undefined;
}

function asArray<T>(value: unknown, field: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Wiki storage field ${field} must be an array.`);
  }
  return value as T[];
}

function normalizeCategory(row: Record<string, unknown>): WikiCategory {
  return {
    id: asString(row.id),
    label: asString(row.label),
    description: asString(row.description),
  };
}

function normalizeIndexArticle(
  row: Record<string, unknown>,
): PublicWikiIndexArticle {
  return {
    slug: asString(row.slug),
    categoryId: asString(row.category_id),
    title: asString(row.title),
    shortTitle: asString(row.short_title),
    summary: asString(row.summary),
    readingMinutes: Number(row.reading_minutes),
    updatedAt: normalizePublicWikiUpdatedAt(asString(row.updated_at)),
  };
}

function normalizeArticle(
  row: Record<string, unknown>,
  image?: WikiArticleImage,
): StoredWikiArticle {
  const callToAction = row.call_to_action;

  return {
    stableId: asString(row.stable_id),
    slug: asString(row.slug),
    title: asString(row.title),
    shortTitle: asString(row.short_title),
    categoryId: asString(row.category_id),
    seoTitle: asNullableString(row.seo_title),
    metaDescription: asNullableString(row.meta_description),
    summary: asString(row.summary),
    intro: asString(row.intro),
    readingMinutes: Number(row.reading_minutes),
    keyPoints: asArray<string>(row.key_points, "key_points"),
    sections: asArray<WikiArticleSection>(row.sections, "sections"),
    contextLinks:
      row.context_links === null
        ? undefined
        : asArray<WikiArticleLink>(row.context_links, "context_links"),
    sources:
      row.sources === null
        ? undefined
        : asArray<string | WikiArticleSource>(row.sources, "sources"),
    callToAction:
      callToAction && typeof callToAction === "object" && !Array.isArray(callToAction)
        ? (callToAction as WikiArticleCallToAction)
        : undefined,
    relatedSlugs: asArray<string>(row.related_slugs, "related_slugs"),
    relatedArticleIds: asArray<string>(
      row.related_article_ids,
      "related_article_ids",
    ),
    updatedAt: normalizePublicWikiUpdatedAt(asString(row.updated_at)),
    image,
  };
}

function wikiImagePublicUrl(storagePath: string) {
  const base = getHalleusRuntimeEnv().supabaseUrl?.replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/wiki-media/${storagePath.replace(/^\/+/, "")}`;
}

async function readReadyWikiImage(
  sql: ReturnType<typeof postgres>,
  articleId: string,
) {
  const relation = await sql`select to_regclass('halleus_private.wiki_article_images')::text as relation`;
  if (!relation[0]?.relation) return undefined;

  const rows = await sql`
    select image.alt_fa, image.caption, image.focal_x, image.focal_y,
           variant.width, variant.height, variant.storage_path,
           variant.mime_type, variant.byte_size
    from halleus_private.wiki_article_images as image
    join public.wiki_assets as asset
      on asset.id = image.asset_id and asset.deleted_at is null
    join halleus_private.wiki_asset_variants as variant
      on variant.asset_id = image.asset_id
    where image.article_id = ${articleId}::uuid
      and image.state = 'READY'
      and image.alt_state = 'reviewed'
      and variant.mime_type = 'image/webp'
    order by variant.width asc
  `;

  const primary = rows.find(
    (row) => Number(row.width) === 1200 && Number(row.height) === 675,
  );
  if (!primary) return undefined;

  const srcSet = rows
    .filter((row) => [480, 768, 1200].includes(Number(row.width)))
    .map(
      (row) =>
        `${wikiImagePublicUrl(asString(row.storage_path))} ${Number(row.width)}w`,
    )
    .join(", ");

  return {
    url: wikiImagePublicUrl(asString(primary.storage_path)),
    srcSet,
    width: 1200,
    height: 675,
    mimeType: "image/webp",
    alt: asString(primary.alt_fa),
    caption: primary.caption ? asString(primary.caption) : null,
    focalX: Number(primary.focal_x ?? 0.5),
    focalY: Number(primary.focal_y ?? 0.5),
  } satisfies WikiArticleImage;
}

function fallbackStoredArticles(): StoredWikiArticle[] {
  return fallbackWikiArticles.map((article) => ({
    ...article,
    stableId: article.slug,
    relatedArticleIds: article.relatedSlugs,
    updatedAt: "2026-07-16T00:00:00.000Z",
  }));
}

function fallbackIndex(
  reason: "database-not-configured" | "database-read-failed",
  error?: unknown,
): PublicWikiIndex {
  warnAboutFallback(reason, error);
  return {
    articles: fallbackStoredArticles().map((article) => ({
      slug: article.slug,
      categoryId: article.categoryId,
      title: article.title,
      shortTitle: article.shortTitle,
      summary: article.summary,
      readingMinutes: article.readingMinutes,
      updatedAt: article.updatedAt,
    })),
    categories: [...fallbackWikiCategories],
    source: "code-fallback",
  };
}

function inlineArticleIds(article: WikiArticle) {
  const texts = [
    article.intro,
    ...article.keyPoints,
    ...article.sections.flatMap((section) => [
      ...section.paragraphs,
      ...(section.bullets ?? []),
    ]),
  ];
  const ids: string[] = [];
  const seen = new Set<string>();
  const pattern = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)\]\]/g;

  for (const text of texts) {
    for (const match of text.matchAll(pattern)) {
      const stableId = match[1];
      if (!seen.has(stableId)) {
        seen.add(stableId);
        ids.push(stableId);
      }
    }
  }
  return ids;
}

function lightArticle(article: PublicWikiRelationshipArticle): PublicWikiRelatedArticle {
  return {
    stableId: article.stableId,
    slug: article.slug,
    shortTitle: article.shortTitle,
    summary: article.summary,
  };
}

function fallbackResolution(slug: string): PublicWikiArticleResolution {
  const articles = fallbackStoredArticles();
  const article = articles.find((item) => item.slug === slug);
  if (!article) {
    return { kind: "missing", source: "code-fallback" };
  }

  const category = fallbackWikiCategories.find(
    (item) => item.id === article.categoryId,
  );
  const relationshipArticles = articles as PublicWikiRelationshipArticle[];
  const targetIds = inlineArticleIds(article).filter(
    (stableId) => stableId !== article.stableId,
  );
  const internalLinkTargets = Object.fromEntries(
    targetIds.flatMap((stableId) => {
      const target = articles.find((item) => item.stableId === stableId);
      return target
        ? [[stableId, { slug: target.slug, label: target.shortTitle }]]
        : [];
    }),
  );

  return {
    kind: "article",
    article,
    categories: category ? [category] : [],
    clusterArticles: buildPublicWikiClusterArticles(
      article,
      relationshipArticles,
    ).map((item) => lightArticle(item as PublicWikiRelationshipArticle)),
    relatedArticles: buildPublicWikiRelatedArticles(
      article,
      relationshipArticles,
    ).map(lightArticle),
    internalLinkTargets,
    source: "code-fallback",
  };
}

async function readDatabaseIndex(
  sql: ReturnType<typeof postgres>,
): Promise<PublicWikiIndex> {
  const [categoryRows, articleRows] = await Promise.all([
    sql`
      select id, label, description
      from public.wiki_categories
      order by sort_order asc, id asc
    `,
    sql`
      select slug, category_id, title, short_title, summary,
             reading_minutes, updated_at::text as updated_at
      from public.wiki_articles
      where status = 'published'
        and is_indexable = true
        and published_at is not null
        and published_at <= now()
        and scheduled_for is null
        and deleted_at is null
      order by sort_order asc, slug asc
    `,
  ]);

  const categories = categoryRows.map((row) => normalizeCategory(row));
  const categoryIds = new Set(categories.map((category) => category.id));
  const articles = articleRows.map((row) => normalizeIndexArticle(row));

  for (const article of articles) {
    if (!categoryIds.has(article.categoryId)) {
      throw new Error(`Wiki article ${article.slug} references an unreadable category.`);
    }
  }

  return { articles, categories, source: "database" };
}

async function readDatabaseArticleBySlug(
  sql: ReturnType<typeof postgres>,
  slug: string,
) {
  const rows = await sql`
    select
      id::text as article_id,
      stable_id,
      slug,
      category_id,
      title,
      short_title,
      seo_title,
      meta_description,
      summary,
      intro,
      reading_minutes,
      key_points,
      sections,
      context_links,
      sources,
      call_to_action,
      related_slugs,
      related_article_ids,
      updated_at::text as updated_at
    from public.wiki_articles
    where slug = ${slug}
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
    limit 1
  `;
  if (!rows[0]) return null;

  const image = await readReadyWikiImage(sql, asString(rows[0].article_id));
  return normalizeArticle(rows[0], image);
}

async function readCategoryById(
  sql: ReturnType<typeof postgres>,
  categoryId: string,
) {
  const rows = await sql`
    select id, label, description
    from public.wiki_categories
    where id = ${categoryId}
    limit 1
  `;
  return rows[0] ? normalizeCategory(rows[0]) : null;
}

function normalizeLightArticle(row: Record<string, unknown>): PublicWikiRelatedArticle {
  return {
    stableId: asString(row.stable_id),
    slug: asString(row.slug),
    shortTitle: asString(row.short_title),
    summary: asString(row.summary),
  };
}

async function readManualRelatedArticles(
  sql: ReturnType<typeof postgres>,
  article: StoredWikiArticle,
) {
  if (article.relatedArticleIds.length) {
    const requested = article.relatedArticleIds
      .filter((stableId) => stableId !== article.stableId);
    if (!requested.length) return [];
    const rows = await sql`
      select stable_id, slug, short_title, summary
      from public.wiki_articles
      where stable_id = any(${requested}::text[])
        and status = 'published'
        and is_indexable = true
        and published_at is not null
        and published_at <= now()
        and scheduled_for is null
        and deleted_at is null
    `;
    const byId = new Map(
      rows.map((row) => [asString(row.stable_id), normalizeLightArticle(row)]),
    );
    const seen = new Set<string>();
    const related: PublicWikiRelatedArticle[] = [];
    for (const stableId of requested) {
      if (related.length >= 6) break;
      if (seen.has(stableId)) continue;
      seen.add(stableId);
      const candidate = byId.get(stableId);
      if (candidate) related.push(candidate);
    }
    return related;
  }

  const requested = article.relatedSlugs
    .filter((relatedSlug) => relatedSlug !== article.slug);
  if (!requested.length) return [];
  const rows = await sql`
    select stable_id, slug, short_title, summary
    from public.wiki_articles
    where slug = any(${requested}::text[])
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
  `;
  const bySlug = new Map(
    rows.map((row) => [asString(row.slug), normalizeLightArticle(row)]),
  );
  const seen = new Set<string>();
  const related: PublicWikiRelatedArticle[] = [];
  for (const relatedSlug of requested) {
    if (related.length >= 6) break;
    const candidate = bySlug.get(relatedSlug);
    if (!candidate || seen.has(candidate.stableId)) continue;
    seen.add(candidate.stableId);
    related.push(candidate);
  }
  return related;
}

async function readBacklinkArticles(
  sql: ReturnType<typeof postgres>,
  article: StoredWikiArticle,
  manualRelated: readonly PublicWikiRelatedArticle[],
) {
  const remainingCapacity = 8 - manualRelated.length;
  const backlinkLimit = Math.min(4, remainingCapacity);
  if (backlinkLimit <= 0) return [];

  const excludedStableIds = [
    article.stableId,
    ...manualRelated.map((item) => item.stableId),
  ];
  const rows = await sql`
    select stable_id, slug, short_title, summary
    from public.wiki_articles
    where status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
      and stable_id <> all(${excludedStableIds}::text[])
      and (
        related_article_ids @> ${sql.json([article.stableId])}
        or related_slugs @> ${sql.json([article.slug])}
      )
    order by sort_order asc, slug asc
    limit ${backlinkLimit}
  `;
  return rows.map((row) => normalizeLightArticle(row));
}

const HOUSE_CLUSTER_ARTICLE_SLUGS = [
  "first-house-in-natal-chart",
  "second-house-in-natal-chart",
  "third-house-in-natal-chart",
  "fourth-house-in-natal-chart",
  "fifth-house-in-natal-chart",
  "sixth-house-in-natal-chart",
  "seventh-house-in-natal-chart",
  "eighth-house-in-natal-chart",
  "ninth-house-in-natal-chart",
  "tenth-house-in-natal-chart",
  "eleventh-house-in-natal-chart",
  "twelfth-house-in-natal-chart",
] as const;

async function readClusterArticles(
  sql: ReturnType<typeof postgres>,
  slug: string,
) {
  if (slug !== "astrology-houses") return [];
  const requested = [...HOUSE_CLUSTER_ARTICLE_SLUGS];
  const rows = await sql`
    select stable_id, slug, short_title, summary
    from public.wiki_articles
    where slug = any(${requested}::text[])
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
  `;
  const bySlug = new Map(
    rows.map((row) => [asString(row.slug), normalizeLightArticle(row)]),
  );
  return requested.flatMap((clusterSlug) => {
    const article = bySlug.get(clusterSlug);
    return article ? [article] : [];
  });
}

async function readInlineTargets(
  sql: ReturnType<typeof postgres>,
  article: StoredWikiArticle,
) {
  const ids = inlineArticleIds(article).filter(
    (stableId) => stableId !== article.stableId,
  );
  if (!ids.length) return {};
  const rows = await sql`
    select stable_id, slug, short_title
    from public.wiki_articles
    where stable_id = any(${ids}::text[])
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
  `;
  return Object.fromEntries(
    rows.map((row) => [
      asString(row.stable_id),
      { slug: asString(row.slug), label: asString(row.short_title) },
    ]),
  );
}

async function readRedirectTarget(
  sql: ReturnType<typeof postgres>,
  sourceSlug: string,
) {
  const rows = await sql`
    select target.slug as target_slug
    from public.wiki_redirects as redirect
    join public.wiki_articles as target
      on target.id = redirect.target_article_id
    where redirect.source_slug = ${sourceSlug}
      and redirect.is_active = true
      and redirect.http_status = 308
      and target.status = 'published'
      and target.is_indexable = true
      and target.published_at is not null
      and target.published_at <= now()
      and target.scheduled_for is null
      and target.deleted_at is null
    limit 1
  `;
  return rows[0] ? asString(rows[0].target_slug) : null;
}

async function readDatabaseResolution(
  sql: ReturnType<typeof postgres>,
  slug: string,
): Promise<PublicWikiArticleResolution> {
  const article = await readDatabaseArticleBySlug(sql, slug);
  if (!article) {
    const targetSlug = await readRedirectTarget(sql, slug);
    return targetSlug
      ? { kind: "redirect", targetSlug, source: "database" }
      : { kind: "missing", source: "database" };
  }

  const [category, manualRelated, clusterArticles, internalLinkTargets] =
    await Promise.all([
      readCategoryById(sql, article.categoryId),
      readManualRelatedArticles(sql, article),
      readClusterArticles(sql, article.slug),
      readInlineTargets(sql, article),
    ]);
  const backlinkArticles = await readBacklinkArticles(
    sql,
    article,
    manualRelated,
  );

  return {
    kind: "article",
    article,
    categories: category ? [category] : [],
    clusterArticles,
    relatedArticles: [...manualRelated, ...backlinkArticles].slice(0, 8),
    internalLinkTargets,
    source: "database",
  };
}

const WIKI_DATABASE_READ_MAX_ATTEMPTS = 2;
const WIKI_DATABASE_READ_RETRY_MS = 250;
const WIKI_DATABASE_CIRCUIT_BREAKER_MS = 30_000;

function isProductionWikiRuntime() {
  return process.env.NODE_ENV === "production";
}

async function waitForWikiDatabaseRetry() {
  await new Promise((resolve) => setTimeout(resolve, WIKI_DATABASE_READ_RETRY_MS));
}

function failClosedWikiStorage(
  reason: "database-not-configured" | "database-read-failed",
  error?: unknown,
): never {
  console.error(
    JSON.stringify({
      marker: "HALLEUS_WIKI_STORAGE_REQUIRED",
      reason,
      errorCode: error ? storageErrorCode(error) : null,
    }),
  );
  throw new Error(`HALLEUS_WIKI_STORAGE_REQUIRED:${reason}`);
}

function circuitOpenError() {
  return Object.assign(new Error("HALLEUS_WIKI_DATABASE_CIRCUIT_OPEN"), {
    code: "CIRCUIT_OPEN",
  });
}

async function readWithRetry<T>(
  read: (sql: ReturnType<typeof postgres>) => Promise<T>,
): Promise<T> {
  if (Date.now() < wikiDatabaseCircuitOpenUntil) {
    throw circuitOpenError();
  }

  if (!getWikiDatabase()) {
    throw Object.assign(new Error("HALLEUS_WIKI_DATABASE_NOT_CONFIGURED"), {
      code: "DATABASE_NOT_CONFIGURED",
    });
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= WIKI_DATABASE_READ_MAX_ATTEMPTS; attempt += 1) {
    const sql = getWikiDatabase();
    if (!sql) break;
    try {
      const result = await read(sql);
      wikiDatabaseCircuitOpenUntil = 0;
      fallbackWarningPrinted = false;
      return result;
    } catch (error) {
      lastError = error;
      await resetWikiDatabaseClient(sql, error);
      if (attempt < WIKI_DATABASE_READ_MAX_ATTEMPTS) {
        console.warn(
          JSON.stringify({
            marker: "HALLEUS_WIKI_DATABASE_RETRY",
            attempt,
            maxAttempts: WIKI_DATABASE_READ_MAX_ATTEMPTS,
            errorCode: storageErrorCode(error),
          }),
        );
        await waitForWikiDatabaseRetry();
      }
    }
  }

  wikiDatabaseCircuitOpenUntil = Date.now() + WIKI_DATABASE_CIRCUIT_BREAKER_MS;
  throw lastError ?? new Error("Wiki database read failed.");
}

async function readFreshWikiIndex(): Promise<PublicWikiIndex> {
  try {
    const index = await readWithRetry(readDatabaseIndex);
    lastKnownGoodWikiIndex = index;
    staleIndexWarningPrinted = false;
    allowStaleWikiIndexServing();
    return index;
  } catch (error) {
    const reason = storageErrorCode(error) === "DATABASE_NOT_CONFIGURED"
      ? "database-not-configured"
      : "database-read-failed";

    if (isProductionWikiRuntime()) {
      if (lastKnownGoodWikiIndex && canServeStaleWikiIndex()) {
        if (!staleIndexWarningPrinted) {
          staleIndexWarningPrinted = true;
          console.warn(
            JSON.stringify({
              marker: "HALLEUS_WIKI_STALE_SNAPSHOT_SERVED",
              scope: "index",
              errorCode: storageErrorCode(error),
            }),
          );
        }
        return lastKnownGoodWikiIndex;
      }
      failClosedWikiStorage(reason, error);
    }
    return fallbackIndex(reason, error);
  }
}

function readFreshWikiIndexSingleFlight() {
  if (wikiIndexReadInFlight) return wikiIndexReadInFlight;
  wikiIndexReadInFlight = readFreshWikiIndex().finally(() => {
    wikiIndexReadInFlight = null;
  });
  return wikiIndexReadInFlight;
}

const loadPersistedWikiIndex = unstable_cache(
  readFreshWikiIndexSingleFlight,
  ["halleus-wiki-index-v2"],
  {
    tags: [WIKI_PUBLIC_INDEX_CACHE_TAG],
    revalidate: false,
  },
);

export const getPublicWikiIndex = cache(async (): Promise<PublicWikiIndex> => {
  const index = await loadPersistedWikiIndex();
  if (index.source === "database") lastKnownGoodWikiIndex = index;
  return index;
});

async function readFreshWikiArticleResolution(
  slug: string,
): Promise<PublicWikiArticleResolution> {
  try {
    const resolution = await readWithRetry((sql) =>
      readDatabaseResolution(sql, slug),
    );
    lastKnownGoodWikiArticles.set(slug, resolution);
    staleArticleWarnings.delete(slug);
    allowStaleWikiArticleServing(slug);
    return resolution;
  } catch (error) {
    const reason = storageErrorCode(error) === "DATABASE_NOT_CONFIGURED"
      ? "database-not-configured"
      : "database-read-failed";

    if (isProductionWikiRuntime()) {
      const stale = lastKnownGoodWikiArticles.get(slug);
      if (stale && canServeStaleWikiArticle(slug)) {
        if (!staleArticleWarnings.has(slug)) {
          staleArticleWarnings.add(slug);
          console.warn(
            JSON.stringify({
              marker: "HALLEUS_WIKI_STALE_SNAPSHOT_SERVED",
              scope: "article",
              slug,
              errorCode: storageErrorCode(error),
            }),
          );
        }
        return stale;
      }
      failClosedWikiStorage(reason, error);
    }

    warnAboutFallback(reason, error);
    return fallbackResolution(slug);
  }
}

function readFreshWikiArticleResolutionSingleFlight(slug: string) {
  const existing = wikiArticleReadsInFlight.get(slug);
  if (existing) return existing;
  const read = readFreshWikiArticleResolution(slug).finally(() => {
    wikiArticleReadsInFlight.delete(slug);
  });
  wikiArticleReadsInFlight.set(slug, read);
  return read;
}

const persistedArticleLoaders = new Map<
  string,
  () => Promise<PublicWikiArticleResolution>
>();

function persistedWikiArticleLoader(slug: string) {
  const existing = persistedArticleLoaders.get(slug);
  if (existing) return existing;
  const loader = unstable_cache(
    () => readFreshWikiArticleResolutionSingleFlight(slug),
    ["halleus-wiki-article-v2", slug],
    {
      tags: [wikiPublicArticleCacheTag(slug)],
      revalidate: false,
    },
  );
  persistedArticleLoaders.set(slug, loader);
  return loader;
}

export const getPublicWikiArticleResolution = cache(
  async (slug: string): Promise<PublicWikiArticleResolution> => {
    return persistedWikiArticleLoader(slug)();
  },
);

async function readFreshWikiArticleBody(slug: string): Promise<PublicWikiArticle | null> {
  try {
    const article = await readWithRetry((sql) => readDatabaseArticleBySlug(sql, slug));
    lastKnownGoodWikiArticleBodies.set(slug, article);
    allowStaleWikiArticleServing(slug);
    return article;
  } catch (error) {
    const reason = storageErrorCode(error) === "DATABASE_NOT_CONFIGURED"
      ? "database-not-configured"
      : "database-read-failed";
    if (isProductionWikiRuntime()) {
      if (lastKnownGoodWikiArticleBodies.has(slug) && canServeStaleWikiArticle(slug)) {
        return lastKnownGoodWikiArticleBodies.get(slug) ?? null;
      }
      failClosedWikiStorage(reason, error);
    }
    warnAboutFallback(reason, error);
    return fallbackStoredArticles().find((article) => article.slug === slug) ?? null;
  }
}

function readFreshWikiArticleBodySingleFlight(slug: string) {
  const existing = wikiArticleBodyReadsInFlight.get(slug);
  if (existing) return existing;
  const read = readFreshWikiArticleBody(slug).finally(() => {
    wikiArticleBodyReadsInFlight.delete(slug);
  });
  wikiArticleBodyReadsInFlight.set(slug, read);
  return read;
}

const persistedArticleBodyLoaders = new Map<
  string,
  () => Promise<PublicWikiArticle | null>
>();

function persistedWikiArticleBodyLoader(slug: string) {
  const existing = persistedArticleBodyLoaders.get(slug);
  if (existing) return existing;
  const loader = unstable_cache(
    () => readFreshWikiArticleBodySingleFlight(slug),
    ["halleus-wiki-article-body-v2", slug],
    {
      tags: [wikiPublicArticleCacheTag(slug)],
      revalidate: false,
    },
  );
  persistedArticleBodyLoaders.set(slug, loader);
  return loader;
}

export const getPublicWikiArticleBySlug = cache(async (slug: string) =>
  persistedWikiArticleBodyLoader(slug)(),
);

async function readDatabaseFooterArticles(
  sql: ReturnType<typeof postgres>,
): Promise<PublicWikiFooterArticle[]> {
  const rows = await sql`
    select slug, title, updated_at::text as updated_at
    from public.wiki_articles
    where status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
    order by updated_at desc, slug asc
    limit 4
  `;
  return rows.map((row) => ({
    slug: asString(row.slug),
    title: asString(row.title),
    updatedAt: normalizePublicWikiUpdatedAt(asString(row.updated_at)),
  }));
}

const loadPersistedFooterArticles = unstable_cache(
  async () => readWithRetry(readDatabaseFooterArticles),
  ["halleus-wiki-footer-v2"],
  {
    tags: [WIKI_PUBLIC_FOOTER_CACHE_TAG],
    revalidate: 300,
  },
);

export const getLatestPublicWikiFooterArticles = cache(async () =>
  loadPersistedFooterArticles(),
);

async function listPublicWikiRedirectSourceSlugs() {
  const sql = getWikiDatabase();
  if (!sql) {
    if (isProductionWikiRuntime()) {
      failClosedWikiStorage("database-not-configured");
    }
    return [];
  }
  try {
    const rows = await sql`
      select redirect.source_slug
      from public.wiki_redirects as redirect
      join public.wiki_articles as target
        on target.id = redirect.target_article_id
      where redirect.is_active = true
        and redirect.http_status = 308
        and target.status = 'published'
        and target.is_indexable = true
        and target.published_at is not null
        and target.published_at <= now()
        and target.scheduled_for is null
        and target.deleted_at is null
      order by redirect.source_slug asc
    `;
    return rows.map((row) => asString(row.source_slug));
  } catch (error) {
    await resetWikiDatabaseClient(sql, error);
    if (isProductionWikiRuntime()) {
      failClosedWikiStorage("database-read-failed", error);
    }
    return [];
  }
}

export async function listPublicWikiRouteSlugs() {
  const [index, redirectSlugs] = await Promise.all([
    getPublicWikiIndex(),
    listPublicWikiRedirectSourceSlugs(),
  ]);
  return [...index.articles.map((article) => article.slug), ...redirectSlugs];
}

export async function listPublicWikiSitemapArticles() {
  const index = await getPublicWikiIndex();
  return index.articles.map((article) => ({
    slug: article.slug,
    updatedAt: article.updatedAt,
  }));
}

export async function listPublicWikiSitemapCategories() {
  const index = await getPublicWikiIndex();
  return buildPublicWikiCategoryViews(index.articles, index.categories).map(
    (view) => ({
      id: view.category.id,
      updatedAt: view.updatedAt,
    }),
  );
}