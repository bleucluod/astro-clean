export const analyticsConfig = {
  measurementId: "G-W3WBZCTL7G",
  consentStorageKey: "halleus-analytics-consent-v1",
  consentVersion: 1,
  publicPaths: [
    "/",
    "/chart",
    "/compare",
    "/sky",
    "/product",
    "/pricing",
    "/order",
    "/privacy",
    "/wiki",
  ],
  publicPathPrefixes: ["/wiki/"],
} as const;

export type AnalyticsConsentChoice = "granted" | "denied";

export function isAnalyticsPublicPath(pathname: string): boolean {
  return (
    analyticsConfig.publicPaths.some((path) => path === pathname) ||
    analyticsConfig.publicPathPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}
