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
