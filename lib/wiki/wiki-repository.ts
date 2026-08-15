import { cache } from "react";
import postgres from "postgres";

import { getHalleusRuntimeEnv } from "@/lib/config/env";
import {
  wikiArticles as fallbackWikiArticles,
  wikiCategories as fallbackWikiCategories,
} from "@/lib/wiki/wiki-content";
import {
  buildPublicWikiClusterArticles,
  buildPublicWikiCategoryViews,
  buildPublicWikiRelatedArticles,
  normalizePublicWikiUpdatedAt,
} from "@/lib/wiki/wiki-public-discovery";
import type { DatedWikiArticle } from "@/lib/wiki/wiki-public-discovery";
import type {
  WikiArticle,
  WikiArticleCallToAction,
  WikiArticleImage,
  WikiArticleLink,
  WikiArticleSection,
  WikiArticleSource,
  WikiCategory,
} from "@/lib/wiki/wiki-content";

type WikiStorageSource = "database" | "code-fallback";

type WikiRedirect = {
  sourceSlug: string;
  targetSlug: string;
};

export type PublicWikiArticle = DatedWikiArticle;

type StoredWikiArticle = PublicWikiArticle & {
  stableId: string;
  relatedArticleIds: readonly string[];
};

type WikiStorageSnapshot = {
  articles: StoredWikiArticle[];
  categories: WikiCategory[];
  redirects: WikiRedirect[];
  source: WikiStorageSource;
};

export type PublicWikiCatalog = {
  articles: PublicWikiArticle[];
  categories: WikiCategory[];
  source: WikiStorageSource;
};

export type PublicWikiArticleResolution =
  | {
      kind: "article";
      article: WikiArticle;
      categories: WikiCategory[];
      clusterArticles: WikiArticle[];
      relatedArticles: WikiArticle[];
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

function getWikiDatabase() {
  if (wikiSql) {
    return wikiSql;
  }

  const databaseUrl = getHalleusRuntimeEnv().databaseUrl;
  if (!databaseUrl) {
    return null;
  }

  wikiSql = postgres(databaseUrl, {
    max: 2,
    idle_timeout: 10,
    connect_timeout: 10,
    prepare: false,
  });

  return wikiSql;
}

function storageErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "unknown";
  }

  const code = Reflect.get(error, "code");
  return typeof code === "string" && code ? code : "unclassified";
}

function warnAboutFallback(reason: "database-not-configured" | "database-read-failed", error?: unknown) {
  if (fallbackWarningPrinted) {
    return;
  }

  fallbackWarningPrinted = true;
  console.warn(
    JSON.stringify({
      marker: "HALLEUS_WIKI_STORAGE_FALLBACK",
      reason,
      errorCode: error ? storageErrorCode(error) : null,
    }),
  );
}

function fallbackSnapshot(reason: "database-not-configured" | "database-read-failed", error?: unknown): WikiStorageSnapshot {
  warnAboutFallback(reason, error);

  return {
    articles: fallbackWikiArticles.map((article) => ({
      ...article,
      stableId: article.slug,
      relatedArticleIds: article.relatedSlugs,
      updatedAt: "2026-07-16T00:00:00.000Z",
    })),
    categories: [...fallbackWikiCategories],
    redirects: [],
    source: "code-fallback",
  };
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

function normalizeArticle(row: Record<string, unknown>, image?: WikiArticleImage): StoredWikiArticle {
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
    relatedArticleIds: asArray<string>(row.related_article_ids, "related_article_ids"),
    updatedAt: normalizePublicWikiUpdatedAt(asString(row.updated_at)),
    image,
  };
}

function wikiImagePublicUrl(storagePath: string) {
  const base = getHalleusRuntimeEnv().supabaseUrl?.replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/wiki-media/${storagePath.replace(/^\/+/, "")}`;
}

async function readReadyWikiImages(sql: ReturnType<typeof postgres>) {
  const relation = await sql`select to_regclass('halleus_private.wiki_article_images')::text as relation`;
  if (!relation[0]?.relation) return new Map<string, WikiArticleImage>();
  const rows = await sql`
    select article.stable_id, image.alt_fa, image.caption, image.focal_x, image.focal_y,
           variant.width, variant.height, variant.storage_path, variant.mime_type, variant.byte_size
    from halleus_private.wiki_article_images as image
    join public.wiki_articles as article on article.id = image.article_id
    join public.wiki_assets as asset on asset.id = image.asset_id and asset.deleted_at is null
    join halleus_private.wiki_asset_variants as variant on variant.asset_id = image.asset_id
    where image.state = 'READY' and image.alt_state = 'reviewed'
      and article.status = 'published' and article.is_indexable = true
      and article.published_at is not null and article.published_at <= now()
      and article.scheduled_for is null and article.deleted_at is null
      and variant.mime_type = 'image/webp'
    order by article.stable_id, variant.width asc
  `;
  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const raw of rows) {
    const stableId = asString(raw.stable_id);
    grouped.set(stableId, [...(grouped.get(stableId) ?? []), raw]);
  }
  const result = new Map<string, WikiArticleImage>();
  for (const [stableId, variants] of grouped) {
    const primary = variants.find((row) => Number(row.width) === 1200 && Number(row.height) === 675);
    if (!primary) continue;
    const srcSet = variants
      .filter((row) => [480, 768, 1200].includes(Number(row.width)))
      .map((row) => `${wikiImagePublicUrl(asString(row.storage_path))} ${Number(row.width)}w`)
      .join(", ");
    result.set(stableId, {
      url: wikiImagePublicUrl(asString(primary.storage_path)),
      srcSet,
      width: 1200,
      height: 675,
      mimeType: "image/webp",
      alt: asString(primary.alt_fa),
      caption: primary.caption ? asString(primary.caption) : null,
      focalX: Number(primary.focal_x ?? 0.5),
      focalY: Number(primary.focal_y ?? 0.5),
    });
  }
  return result;
}

async function readDatabaseSnapshot(sql: ReturnType<typeof postgres>): Promise<WikiStorageSnapshot> {
  const [categoryRows, articleRows, redirectRows] = await Promise.all([
    sql`
      select id, label, description
      from public.wiki_categories
      order by sort_order asc, id asc
    `,
    sql`
      select
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
      where status = 'published'
        and is_indexable = true
        and published_at is not null
        and published_at <= now()
        and scheduled_for is null
        and deleted_at is null
      order by sort_order asc, slug asc
    `,
    sql`
      select redirect.source_slug, target.slug as target_slug
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
    `,
  ]);

  const readyImages = await readReadyWikiImages(sql);
  const categories = categoryRows.map((row) => normalizeCategory(row));
  const categoryIds = new Set(categories.map((category) => category.id));
  const articles = articleRows.map((row) => normalizeArticle(row, readyImages.get(asString(row.stable_id))));

  for (const article of articles) {
    if (!categoryIds.has(article.categoryId)) {
      throw new Error(`Wiki article ${article.slug} references an unreadable category.`);
    }
  }

  return {
    articles,
    categories,
    redirects: redirectRows.map((row) => ({
      sourceSlug: asString(row.source_slug),
      targetSlug: asString(row.target_slug),
    })),
    source: "database",
  };
}

const WIKI_DATABASE_READ_MAX_ATTEMPTS = 3;
const WIKI_DATABASE_READ_RETRY_MS = 1_500;

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

const loadWikiStorageSnapshot = cache(async (): Promise<WikiStorageSnapshot> => {
  const sql = getWikiDatabase();
  if (!sql) {
    if (isProductionWikiRuntime()) {
      failClosedWikiStorage("database-not-configured");
    }

    return fallbackSnapshot("database-not-configured");
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= WIKI_DATABASE_READ_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await readDatabaseSnapshot(sql);
    } catch (error) {
      lastError = error;

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

  if (isProductionWikiRuntime()) {
    failClosedWikiStorage("database-read-failed", lastError);
  }

  return fallbackSnapshot("database-read-failed", lastError);
});

export async function getPublicWikiCatalog(): Promise<PublicWikiCatalog> {
  const snapshot = await loadWikiStorageSnapshot();

  return {
    articles: snapshot.articles,
    categories: snapshot.categories,
    source: snapshot.source,
  };
}

export async function getPublicWikiArticleResolution(
  slug: string,
): Promise<PublicWikiArticleResolution> {
  const snapshot = await loadWikiStorageSnapshot();
  const article = snapshot.articles.find((item) => item.slug === slug);

  if (article) {
    return {
      kind: "article",
      article,
      categories: snapshot.categories,
      clusterArticles: buildPublicWikiClusterArticles(article, snapshot.articles),
      relatedArticles: buildPublicWikiRelatedArticles(article, snapshot.articles),
      internalLinkTargets: Object.fromEntries(
        snapshot.articles.map((item) => [item.stableId, { slug: item.slug, label: item.shortTitle }]),
      ),
      source: snapshot.source,
    };
  }

  const redirect = snapshot.redirects.find((item) => item.sourceSlug === slug);
  if (redirect) {
    return {
      kind: "redirect",
      targetSlug: redirect.targetSlug,
      source: snapshot.source,
    };
  }

  return {
    kind: "missing",
    source: snapshot.source,
  };
}

export async function listPublicWikiRouteSlugs() {
  const snapshot = await loadWikiStorageSnapshot();

  return [
    ...snapshot.articles.map((article) => article.slug),
    ...snapshot.redirects.map((redirect) => redirect.sourceSlug),
  ];
}

export async function listPublicWikiSitemapArticles() {
  const snapshot = await loadWikiStorageSnapshot();

  return snapshot.articles.map((article) => ({
    slug: article.slug,
    updatedAt: article.updatedAt,
  }));
}

export async function listPublicWikiSitemapCategories() {
  const snapshot = await loadWikiStorageSnapshot();

  return buildPublicWikiCategoryViews(
    snapshot.articles,
    snapshot.categories,
  ).map((view) => ({
    id: view.category.id,
    updatedAt: view.updatedAt,
  }));
}
