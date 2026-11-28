// Two historical Wiki URLs remain redirects, not distinct R3 articles.
// Share this list between Next.js routing, the sitemap, and SEO reporting.
export const WIKI_CANONICAL_REDIRECTS = [
  { sourceSlug: "pluto-in-twelve-houses", destinationSlug: "pluto-in-houses" },
  { sourceSlug: "bts-members-birth-chart", destinationSlug: "bts-members-birth-dates-zodiac" },
] as const;

const redirectSources = new Set<string>(WIKI_CANONICAL_REDIRECTS.map((item) => item.sourceSlug));

export function isHistoricalWikiRedirectSource(slug: string): boolean {
  return redirectSources.has(slug);
}

// Keep the published CMS article as the editorial source for the product page.
export const VEDIC_GUIDE_SLUG = "free-vedic-birth-chart";
export const VEDIC_PRODUCT_PATH = "/vedic";
export const VEDIC_GUIDE_PATH = `/wiki/${VEDIC_GUIDE_SLUG}`;

export function wikiArticleHref(slug: string): string {
  return slug === VEDIC_GUIDE_SLUG ? VEDIC_PRODUCT_PATH : `/wiki/${slug}`;
}

export function canonicalWikiPublicHref(href: string): string {
  return href === VEDIC_GUIDE_PATH || href === `https://halleus.ir${VEDIC_GUIDE_PATH}`
    ? VEDIC_PRODUCT_PATH : href;
}
