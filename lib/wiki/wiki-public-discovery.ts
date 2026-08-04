import type { WikiArticle, WikiCategory } from "@/lib/wiki/wiki-content";
import {
  getWikiCategoryContent,
  MIN_PUBLIC_WIKI_CATEGORY_ARTICLES,
  type WikiCategoryContent,
} from "@/lib/wiki/wiki-category-content";

export type DatedWikiArticle = WikiArticle & {
  updatedAt: string;
};

export type PublicWikiRelationshipArticle = DatedWikiArticle & {
  stableId: string;
  relatedArticleIds: readonly string[];
};

export type PublicWikiCategoryView = {
  category: WikiCategory;
  content: WikiCategoryContent;
  articles: DatedWikiArticle[];
  pillarArticles: DatedWikiArticle[];
  updatedAt: string;
};

const PUBLIC_CATEGORY_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const PUBLIC_RELATED_ARTICLE_LIMIT = 8;
const PUBLIC_MANUAL_RELATED_ARTICLE_LIMIT = 6;
const PUBLIC_BACKLINK_ARTICLE_LIMIT = 4;
const HOUSE_CLUSTER_HUB_SLUG = "astrology-houses";
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
const POSTGRES_TIMESTAMP_PATTERN =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?([+-]\d{2})(?::?(\d{2}))?$/;

export function normalizePublicWikiUpdatedAt(value: string) {
  const trimmed = value.trim();
  const postgresTimestamp = trimmed.match(POSTGRES_TIMESTAMP_PATTERN);
  const candidate = postgresTimestamp
    ? (() => {
        const [, date, time, fraction = "", offsetHour, offsetMinute = "00"] =
          postgresTimestamp;
        const milliseconds = `${fraction}000`.slice(0, 3);
        return `${date}T${time}.${milliseconds}${offsetHour}:${offsetMinute}`;
      })()
    : trimmed;
  const normalized = new Date(candidate);

  if (!Number.isFinite(normalized.getTime())) {
    throw new Error(`Invalid public Wiki updatedAt timestamp: ${value}`);
  }

  return normalized.toISOString();
}

function updatedAtTimestamp(article: DatedWikiArticle) {
  const timestamp = Date.parse(article.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareText(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sortPublicWikiArticlesNewestFirst(
  articles: readonly DatedWikiArticle[],
) {
  return [...articles].sort((left, right) => {
    const dateDifference = updatedAtTimestamp(right) - updatedAtTimestamp(left);
    return dateDifference || compareText(left.slug, right.slug);
  });
}

export function selectPublicWikiArticlesByPreferredSlugs(
  articles: readonly DatedWikiArticle[],
  preferredSlugs: readonly string[],
) {
  const articlesBySlug = new Map(
    articles.map((article) => [article.slug, article]),
  );
  const selectedSlugs = new Set<string>();

  return preferredSlugs.flatMap((slug) => {
    if (selectedSlugs.has(slug)) {
      return [];
    }
    selectedSlugs.add(slug);
    const article = articlesBySlug.get(slug);
    return article ? [article] : [];
  });
}

export function buildPublicWikiRelatedArticles(
  article: PublicWikiRelationshipArticle,
  articles: readonly PublicWikiRelationshipArticle[],
) {
  const articlesBySlug = new Map(articles.map((item) => [item.slug, item]));
  const articlesByStableId = new Map(articles.map((item) => [item.stableId, item]));
  const outgoingArticles = article.relatedArticleIds.length
    ? article.relatedArticleIds.map((stableId) => articlesByStableId.get(stableId))
    : article.relatedSlugs.map((relatedSlug) => articlesBySlug.get(relatedSlug));
  const seenStableIds = new Set([article.stableId]);
  const manualRelatedArticles: PublicWikiRelationshipArticle[] = [];
  const backlinkArticles: PublicWikiRelationshipArticle[] = [];
  const appendUniqueArticle = (
    target: PublicWikiRelationshipArticle[],
    candidate: PublicWikiRelationshipArticle | undefined,
    limit: number,
  ) => {
    if (
      target.length < limit &&
      candidate &&
      !seenStableIds.has(candidate.stableId)
    ) {
      target.push(candidate);
      seenStableIds.add(candidate.stableId);
    }
  };

  for (const outgoingArticle of outgoingArticles) {
    appendUniqueArticle(
      manualRelatedArticles,
      outgoingArticle,
      PUBLIC_MANUAL_RELATED_ARTICLE_LIMIT,
    );
  }

  const remainingCapacity =
    PUBLIC_RELATED_ARTICLE_LIMIT - manualRelatedArticles.length;
  const backlinkLimit = Math.min(
    PUBLIC_BACKLINK_ARTICLE_LIMIT,
    remainingCapacity,
  );

  for (const candidate of articles) {
    const referencesArticle =
      candidate.relatedArticleIds.includes(article.stableId) ||
      candidate.relatedSlugs.includes(article.slug);
    if (referencesArticle) {
      appendUniqueArticle(backlinkArticles, candidate, backlinkLimit);
    }
  }

  return [...manualRelatedArticles, ...backlinkArticles].slice(
    0,
    PUBLIC_RELATED_ARTICLE_LIMIT,
  );
}

export function buildPublicWikiClusterArticles(
  article: DatedWikiArticle,
  articles: readonly DatedWikiArticle[],
) {
  if (article.slug !== HOUSE_CLUSTER_HUB_SLUG) {
    return [];
  }

  const articlesBySlug = new Map(articles.map((item) => [item.slug, item]));
  return HOUSE_CLUSTER_ARTICLE_SLUGS.flatMap((slug) => {
    const clusterArticle = articlesBySlug.get(slug);
    return clusterArticle ? [clusterArticle] : [];
  });
}

export function buildPublicWikiCategoryViews(
  articles: readonly DatedWikiArticle[],
  categories: readonly WikiCategory[],
) {
  return categories.flatMap<PublicWikiCategoryView>((category) => {
    if (!PUBLIC_CATEGORY_ID_PATTERN.test(category.id)) {
      return [];
    }

    const categoryArticles = sortPublicWikiArticlesNewestFirst(
      articles.filter((article) => article.categoryId === category.id),
    );
    const content = getWikiCategoryContent(category.id);

    if (
      !content ||
      categoryArticles.length < MIN_PUBLIC_WIKI_CATEGORY_ARTICLES
    ) {
      return [];
    }

    const articlesBySlug = new Map(
      categoryArticles.map((article) => [article.slug, article]),
    );
    const pillarArticles = content.pillarSlugs.flatMap((slug) => {
      const pillar = articlesBySlug.get(slug);
      return pillar ? [pillar] : [];
    });

    if (pillarArticles.length !== content.pillarSlugs.length) {
      return [];
    }

    return [
      {
        category,
        content,
        articles: categoryArticles,
        pillarArticles,
        updatedAt: categoryArticles[0].updatedAt,
      },
    ];
  });
}

export function findPublicWikiCategoryView(
  categoryId: string,
  articles: readonly DatedWikiArticle[],
  categories: readonly WikiCategory[],
) {
  return (
    buildPublicWikiCategoryViews(articles, categories).find(
      (view) => view.category.id === categoryId,
    ) ?? null
  );
}
