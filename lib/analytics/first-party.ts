/** Only public, non-personal paths may enter the first-party counters. */
export const analyticsSources = [
  "direct", "google", "bing", "search", "instagram", "telegram", "social", "external",
] as const;
export type AnalyticsSource = (typeof analyticsSources)[number];
export type AnalyticsArea = "home" | "wiki" | "shop" | "chart" | "sky" | "compare" | "other";
export type AnalyticsEventKind =
  | "page" | "resume" | "heartbeat" | "engagement" | "scroll" | "leave"
  | "product_click" | "internal_click" | "chart_start" | "chart_complete"
  | "compare_start" | "compare_complete" | "checkout_start";
export type AnalyticsActionKind = Exclude<AnalyticsEventKind, "page" | "resume" | "heartbeat" | "engagement" | "scroll" | "leave">;
export const HALLEUS_ANALYTICS_ACTION = "halleus:analytics-action";
export const HALLEUS_ANALYTICS_CHOICE_CHANGED = "halleus:analytics-choice-changed";

// Route-level aggregate analytics: automatically accept public page slugs, without
// maintaining product/article lists. Never send account, report, admin, API,
// internal or preview routes to the analytics API.
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const privateRoots = new Set([
  "admin", "admini", "api", "dev", "dashboard",
  "account", "accounts", "auth", "login", "logout", "register", "signup",
  "sign-in", "sign-up", "profile", "profiles", "reports", "report",
  "settings", "security", "private", "internal", "user", "users",
  "session", "sessions", "verify", "reset-password", "forgot-password",
  "password", "billing", "payments", "checkout", "orders", "webhooks",
  "tokens", "token", "invite", "invitations", "notifications", "debug",
  "preview",
]);
const hiddenSlug = /(?:^|-)(?:preview|draft|generator)$/;

export function normalizeAnalyticsPath(path: unknown): string | null {
  if (typeof path !== "string" || path.length > 160 || !path.startsWith("/") ||
      path.includes("?") || path.includes("#") || path.includes("%") ||
      path.includes("//")) return null;
  if (path === "/") return path;
  const parts = path.slice(1).split("/");
  if (parts.some((part) => !safeSlug.test(part) || hiddenSlug.test(part))) return null;
  if (privateRoots.has(parts[0]) ||
      [...privateRoots].some((name) => parts[0].startsWith(name + "-"))) return null;

  if (parts[0] === "wiki") {
    // Published articles and categories may be added without a code change.
    if (parts.length === 2) return path;
    if (parts.length === 3 && parts[1] === "category") return path;
    return parts.length === 1 ? path : null;
  }
  if (parts[0] === "shop") {
    // New canonical products, including all 12 /shop/<month>-sign pages,
    // are tracked individually. Nested noncanonical previews are excluded.
    return parts.length <= 2 ? path : null;
  }
  if (parts[0] === "sky") {
    if (parts.length === 1) return path;
    // Preserve the existing anonymized grouping for dated sky pages.
    return parts.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]) ? "/sky" : null;
  }
  // Never count dynamic private comparison or chart IDs.
  if (parts[0] === "compare" || parts[0] === "chart") {
    return parts.length === 1 ? path : null;
  }
  // New standalone public routes are automatically included, while unknown
  // nested routes fail closed (their slugs could be personal identifiers).
  return parts.length === 1 ? path : null;
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
