import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const read = (path) => fs.readFileSync(path, "utf8");
const sources = [
  "lib/analytics/first-party.ts",
  "app/api/analytics/event/route.ts",
  "lib/admin/halleus-analytics-dashboard.ts",
  "app/api/admin/analytics/route.ts",
  "components/HalleusAnalyticsTracker.tsx",
  "components/AnalyticsConsent.tsx",
  "components/admin/HalleusAnalyticsPanel.tsx",
  "components/admin/AdminConsole.tsx",
  "app/privacy/page.tsx",
];
for (const path of sources) {
  const result = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, "Syntax in " + path);
}

const lib = read("lib/analytics/first-party.ts");
const built = ts.transpileModule(lib, {
  fileName: "lib/analytics/first-party.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(built, { exports, URL }, { timeout: 1000 });
assert.equal(exports.normalizeAnalyticsPath("/"), "/");
assert.equal(exports.normalizeAnalyticsPath("/shop/birth-sky-map"), "/shop/birth-sky-map");
assert.equal(exports.normalizeAnalyticsPath("/wiki/lionel-messi-birth-chart"), "/wiki/lionel-messi-birth-chart");
assert.equal(exports.normalizeAnalyticsPath("/sky/2026-11-13"), "/sky");
for (const path of [
  "/profile", "/reports/123", "/compare/private-id", "/admini",
  "/api/admin/analytics", "/shop/checkout/123", "/wiki/foo?token=secret",
  "//evil.example", "/wiki/x%2Fsecret", "/wiki/prompt-builder-preview",
]) {
  assert.equal(exports.normalizeAnalyticsPath(path), null, "Private path must be rejected: " + path);
}
assert.equal(exports.analyticsArea("/wiki/test"), "wiki");
assert.equal(exports.classifyAnalyticsSource("https://www.google.com/search?q=private", "halleus.ir"), "google");
assert.equal(exports.classifyAnalyticsSource("https://halleus.ir/wiki", "halleus.ir"), "direct");

const migration = read("database/migrations/0040_first_party_analytics.sql");
for (const table of ["analytics_live_sessions", "analytics_daily", "analytics_seen_daily"]) {
  assert.match(migration, new RegExp("create table if not exists halleus_private\\." + table));
  assert.match(migration, new RegExp("alter table halleus_private\\." + table + " enable row level security"));
  assert.match(migration, new RegExp("revoke all on halleus_private\\." + table));
}
assert.doesNotMatch(migration, /\b(drop table|truncate table|alter table public\.)\b/i);
assert.doesNotMatch(migration, /ip_address|user_agent|user_id|email|birth_date/i);

const intake = read("app/api/analytics/event/route.ts");
for (const marker of [
  'request.headers.get("origin")', 'sec-fetch-site', 'getAdminDatabase()',
  'withinRateLimit(', 'normalizeAnalyticsPath(body.path)',
  'analytics_seen_daily', 'analytics_daily', "48 hours", "Asia/Tehran",
  'kind === "leave"', 'on conflict do nothing returning session_id',
]) assert.ok(intake.includes(marker), "Intake contract: " + marker);
assert.doesNotMatch(intake, /\b(ip|referrer|userId|cookie)\s*:/i);

const tracker = read("components/HalleusAnalyticsTracker.tsx");
for (const marker of [
  "crypto.randomUUID()", "document.visibilityState", "30_000",
  'kind, path, sessionId: session.id, source: session.source',
  'normalizeAnalyticsPath(pathname)', 'credentials: "omit"',
  'leave(!granted)', 'target === "/chart"', 'target === "/shop/checkout"',
]) assert.ok(tracker.includes(marker), "Tracker contract: " + marker);
assert.match(read("components/AnalyticsConsent.tsx"), /<HalleusAnalyticsTracker granted=\{choice === "granted"\}/);

const api = read("app/api/admin/analytics/route.ts");
assert.match(api, /requireAdminCapability\(request, "dashboard.read"\)/);
assert.match(api, /noStoreJsonResponse/);
assert.match(api, /\["7", "30", "90"\]/);
const dashboard = read("lib/admin/halleus-analytics-dashboard.ts");
assert.match(dashboard, /actor\.role === "owner" && actor\.capabilities\.includes\("shop_orders.read"\)/);
assert.match(dashboard, /getAdminDatabase\(\)/);
assert.match(dashboard, /wiki_shop_showcase_daily_metrics/);
assert.match(dashboard, /analytics_live_sessions/);
assert.match(dashboard, /analytics_daily/);

const consoleSource = read("components/admin/AdminConsole.tsx");
assert.match(consoleSource, /id: "analytics",\s*label: "آمار و تحلیل"/);
assert.match(consoleSource, /<HalleusAnalyticsPanel token=\{token\} activeSection=\{analyticsSection\}/);
for (const section of ["overview", "traffic", "content", "sales"]) {
  assert.match(consoleSource, new RegExp('id: "' + section + '", label:'));
}
const panel = read("components/admin/HalleusAnalyticsPanel.tsx");
assert.match(panel, /setInterval\(\(\) => void read\(\), 30_000\)/);
assert.match(panel, /آنلاین الان/);
assert.match(panel, /پرداخت تأییدشده/);
assert.doesNotMatch(panel, /\b(MVP|GA4|API|SQL|postgres|migration)\b/);
assert.match(read("app/privacy/page.tsx"), /شناسهٔ اتفاقی و موقت/);
assert.match(read("components/admin/halleus-analytics.module.css"), /@media \(max-width: 750px\)/);

console.log("HALLEUS_FIRST_PARTY_ANALYTICS_GUARD_PASS");
