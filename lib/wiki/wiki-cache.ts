export const WIKI_PUBLIC_INDEX_CACHE_TAG = "halleus-wiki-index-v2";
export const WIKI_PUBLIC_ARTICLE_CACHE_TAG_PREFIX = "halleus-wiki-article-v2:";
export const WIKI_PUBLIC_FOOTER_CACHE_TAG = "halleus-wiki-footer-v2";

const wikiCacheRuntime = globalThis as typeof globalThis & {
  __halleusStaleWikiIndexServingAllowed?: boolean;
  __halleusStaleWikiArticleServingBlocked?: Set<string>;
};

function blockedArticleSlugs() {
  if (!wikiCacheRuntime.__halleusStaleWikiArticleServingBlocked) {
    wikiCacheRuntime.__halleusStaleWikiArticleServingBlocked = new Set<string>();
  }
  return wikiCacheRuntime.__halleusStaleWikiArticleServingBlocked;
}

export function wikiPublicArticleCacheTag(slug: string) {
  return `${WIKI_PUBLIC_ARTICLE_CACHE_TAG_PREFIX}${slug}`;
}

export function blockStaleWikiIndexServing() {
  wikiCacheRuntime.__halleusStaleWikiIndexServingAllowed = false;
}

export function allowStaleWikiIndexServing() {
  wikiCacheRuntime.__halleusStaleWikiIndexServingAllowed = true;
}

export function canServeStaleWikiIndex() {
  return wikiCacheRuntime.__halleusStaleWikiIndexServingAllowed !== false;
}

export function blockStaleWikiArticleServing(slug: string) {
  blockedArticleSlugs().add(slug);
}

export function allowStaleWikiArticleServing(slug: string) {
  blockedArticleSlugs().delete(slug);
}

export function canServeStaleWikiArticle(slug: string) {
  return !blockedArticleSlugs().has(slug);
}