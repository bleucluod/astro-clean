export const HALLEUS_CONFIG = {
  brandName: "Halleus",
  legacyBrandName: "Astro Clean",
  domain: "halleus.ir",
  canonicalUrl: "https://halleus.ir",
  supportEmail: "support@halleus.ir",
  defaultLocale: "fa-IR",
  defaultTimezone: "Asia/Tehran",
  productStage: "public-preview",
  storageDriver: "local",
} as const;

export type HalleusConfig = typeof HALLEUS_CONFIG;

export function createCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${HALLEUS_CONFIG.canonicalUrl}${normalizedPath}`;
}
