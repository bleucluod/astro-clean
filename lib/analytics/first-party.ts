/** Only public, non-personal paths may enter the first-party counters. */
export const analyticsSources = [
  "direct", "google", "bing", "search", "instagram", "telegram", "social", "external",
] as const;
export type AnalyticsSource = (typeof analyticsSources)[number];
export type AnalyticsArea = "home" | "wiki" | "shop" | "chart" | "sky" | "compare" | "other";
export type AnalyticsEventKind = "page" | "heartbeat" | "product_click" | "chart_start" | "checkout_start" | "leave";

const exact = new Set([
  "/", "/chart", "/compare", "/sky", "/wiki", "/shop",
  "/shop/birth-sky-map", "/shop/milky-way-print", "/shop/moon-phase-print",
  "/shop/cart", "/shop/checkout", "/shop/track", "/shop/payment",
  "/order", "/product", "/pricing", "/privacy",
]);
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeAnalyticsPath(path: unknown): string | null {
  if (typeof path !== "string" || path.length > 160 || !path.startsWith("/") ||
      path.includes("?") || path.includes("#") || path.includes("%") ||
      path.includes("//")) return null;
  if (exact.has(path)) return path;
  if (path.startsWith("/wiki/category/") &&
      safeSlug.test(path.slice("/wiki/category/".length))) return path;
  if (path.startsWith("/wiki/") &&
      safeSlug.test(path.slice("/wiki/".length)) &&
      path !== "/wiki/prompt-builder-preview") return path;
  // Date-specific sky views remain one public route in the dashboard.
  if (/^\/sky\/\d{4}-\d{2}-\d{2}$/.test(path)) return "/sky";
  return null;
}

export function analyticsArea(path: string): AnalyticsArea {
  if (path === "/") return "home";
  if (path.startsWith("/wiki")) return "wiki";
  if (path.startsWith("/shop") || path === "/order" || path === "/product" || path === "/pricing") return "shop";
  if (path === "/chart") return "chart";
  if (path === "/sky") return "sky";
  if (path === "/compare") return "compare";
  return "other";
}

export function isAnalyticsSource(value: unknown): value is AnalyticsSource {
  return typeof value === "string" && analyticsSources.some((item) => item === value);
}

/** Referrer URLs never leave the browser; only a coarse channel is returned. */
export function classifyAnalyticsSource(referrer: string, ownHostname: string): AnalyticsSource {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (!host || host === ownHostname.toLowerCase()) return "direct";
    if (host === "google.com" || host.endsWith(".google.com") || /(^|\.)google\.[a-z.]+$/.test(host)) return "google";
    if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "t.me" || host === "telegram.me" || host === "web.telegram.org") return "telegram";
    if (/(^|\.)(yahoo|duckduckgo|yandex|baidu)\./.test(host)) return "search";
    if (/(^|\.)(facebook|twitter|x|pinterest|linkedin)\.com$/.test(host)) return "social";
    return "external";
  } catch {
    return "direct";
  }
}
