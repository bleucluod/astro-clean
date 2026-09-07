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


export type ComparePublicAnalyticsEvent =
  | "compare_landing_view"
  | "compare_builder_started"
  | "compare_slot_completed"
  | "compare_relationship_selected"
  | "compare_generation_started";

type AggregateAnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

export function trackComparePublicAggregateEvent(
  eventName: ComparePublicAnalyticsEvent,
): void {
  if (typeof window === "undefined") return;
  const pathname = window.location.pathname;
  if (pathname !== "/compare" || !isAnalyticsPublicPath(pathname)) return;

  // No event properties are accepted here by design: relationship context,
  // names, chart/report/comparison ids and birth inputs cannot cross this API.
  (window as AggregateAnalyticsWindow).gtag?.("event", eventName);
}
