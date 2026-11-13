import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
function check(name, fn) {
  try { fn(); console.log("PASS " + name); }
  catch (error) {
    failures.push({ name, error: error instanceof Error ? error.message : String(error) });
    console.error("FAIL " + name);
  }
}
const changed = [
  "lib/analytics/first-party.ts",
  "lib/admin/halleus-analytics-range.ts",
  "lib/admin/halleus-analytics-dashboard.ts",
  "app/api/analytics/event/route.ts",
  "app/api/admin/analytics/route.ts",
  "components/HalleusAnalyticsTracker.tsx",
  "components/AnalyticsConsent.tsx",
  "components/ChartForm.tsx",
  "components/comparison/ComparisonComposer.tsx",
  "components/shop/ShopCheckoutFlow.tsx",
  "components/admin/HalleusAnalyticsPanel.tsx",
  "components/admin/AdminConsole.tsx",
  "app/privacy/page.tsx",
];

check("syntax/all_affected", () => {
  for (const path of changed) {
    const result = ts.transpileModule(read(path), {
      fileName: path, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    });
    const errors = (result.diagnostics ?? [])
      .filter(item => item.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, "Syntax: " + path);
  }
});
function executePure(path) {
  const result = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(result, { exports, URL, URLSearchParams, Date, Intl }, { timeout: 1000 });
  return exports;
}
check("privacy/public_path_boundary", () => {
  const lib = executePure("lib/analytics/first-party.ts");
  for (const path of ["/", "/chart", "/compare", "/shop", "/wiki",
    "/wiki/example-article", "/shop/birth-sky-map"]) {
    assert.ok(lib.normalizeAnalyticsPath(path), path);
  }
  assert.equal(lib.normalizeAnalyticsPath("/sky/2026-11-13"), "/sky");
  for (const path of [
    "/admini", "/profile", "/reports/private-id", "/compare/private-id",
    "/api/admin/analytics", "/shop/payment/123", "/wiki/example?token=secret",
    "//unsafe.example", "/wiki/x%2Fprivate", "/wiki/prompt-builder-preview",
  ]) assert.equal(lib.normalizeAnalyticsPath(path), null, path);
  assert.equal(lib.classifyAnalyticsSource("https://www.google.com/search?q=private", "halleus.ir"), "google");
  assert.equal(lib.classifyAnalyticsSource("https://halleus.ir/wiki", "halleus.ir"), "direct");
});
check("ranges/tehran_calendar_and_custom_bounds", () => {
  const range = executePure("lib/admin/halleus-analytics-range.ts");
  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = type => todayParts.find(x => x.type === type).value;
  const today = [part("year"), part("month"), part("day")].join("-");
  const current = range.parseAnalyticsWindow(new URLSearchParams("days=7"));
  assert.equal(current.days, 7);
  assert.equal(current.through, today);
  const single = range.parseAnalyticsWindow(new URLSearchParams({from: today, through: today}));
  assert.equal(single.days, 1);
  assert.equal(single.selectedDay, today);
  assert.equal(range.parseAnalyticsWindow(new URLSearchParams("days=91")), null);
  assert.equal(range.parseAnalyticsWindow(new URLSearchParams("days=7&days=30")), null);
  assert.equal(range.parseAnalyticsWindow(new URLSearchParams("days=7&page=/shop")), null);
  assert.equal(range.parseAnalyticsWindow(new URLSearchParams("from=2026-02-30&through=2026-03-01")), null);
  assert.equal(range.parseAnalyticsWindow(new URLSearchParams("from=2026-01-01&through=2026-05-01")), null);
  assert.equal(range.parseAnalyticsWindow(new URLSearchParams("from=2026-12-01&through=2026-12-02")), null);
});
check("migration/additive_private_tables", () => {
  const base = read("database/migrations/0040_first_party_analytics.sql");
  const migration = read("database/migrations/0041_analytics_engagement_and_hourly.sql");
  for (const table of ["analytics_live_sessions", "analytics_daily"]) {
    assert.ok(base.includes("create table if not exists halleus_private." + table));
    assert.ok(migration.includes("alter table halleus_private." + table));
  }
  for (const table of ["analytics_minute_presence", "analytics_page_progress", "analytics_hourly"]) {
    assert.match(migration, new RegExp("create table if not exists halleus_private\\." + table));
    assert.match(migration, new RegExp("alter table halleus_private\\." + table + " enable row level security"));
    assert.match(migration, new RegExp("revoke all on halleus_private\\." + table));
  }
  for (const item of ["active_seconds", "entrances", "scroll_50", "scroll_90",
    "chart_completions", "compare_completions", "new_visits", "returning_visits",
    "campaign_visits", "last_engagement_at"]) assert.ok(migration.includes(item), item);
  assert.doesNotMatch(migration, /\b(drop|truncate|delete from|update public\.)\b/i);
  assert.doesNotMatch(migration, /\b(ip_address|email|user_id|birth_date)\b/i);
  assert.ok(/^\s*begin;/im.test(migration) && /\bcommit;\s*$/.test(migration));
});
check("ingress/rate_origin_active_time_dedup", () => {
  const route = read("app/api/analytics/event/route.ts");
  for (const text of [
    'request.headers.get("origin")', '"sec-fetch-site"', "withinRateLimit(",
    'typeof body.seconds !== "number"', "last_engagement_at",
    "for update", "analytics_seen_daily", "analytics_page_progress",
    "analytics_minute_presence", "analytics_hourly", "on conflict",
    "kind === \"resume\"", "new_visits", "returning_visits", "campaign_visits",
  ]) assert.ok(route.includes(text), text);
  assert.match(route, /Math\.min\(20, Number\(body\.seconds\), since\)/);
  assert.doesNotMatch(route, /\b(ip_address|recipient_mobile|birth_date|user_agent)\b/i);
});
check("tracker/consent_visibility_and_idle", () => {
  const tracker = read("components/HalleusAnalyticsTracker.tsx");
  const consent = read("components/AnalyticsConsent.tsx");
  for (const text of [
    "crypto.randomUUID()", "IDLE_MS", "performance.now()", "document.visibilityState",
    'emit("engagement", path', 'emit("scroll", path', 'emit(started ? "resume" : "page", path)',
    "document.removeEventListener", "window.removeEventListener",
    "HALLEUS_ANALYTICS_ACTION", 'credentials: "omit"', "revokeSession()",
    "window.localStorage.removeItem(KNOWN)", "visitor: session.visitor", "paid: session.paid",
  ]) assert.ok(tracker.includes(text), text);
  assert.ok(consent.includes('<HalleusAnalyticsTracker granted={choice === "granted"}'));
  assert.ok(consent.includes('setChoice(readStoredChoice() ?? "granted");'));
});
check("actions/reports_comparison_shop_verified", () => {
  const chart = read("components/ChartForm.tsx");
  const compare = read("components/comparison/ComparisonComposer.tsx");
  const shop = read("components/shop/ShopCheckoutFlow.tsx");
  assert.match(chart, /detail: "chart_start"/);
  assert.match(chart, /detail: "chart_complete"/);
  assert.match(chart, /if \(!saveResult\.accountRecord\)/);
  assert.match(compare, /detail: "compare_start"/);
  assert.match(compare, /detail: "compare_complete"/);
  assert.match(compare, /savePrivateComparison\(result\.record\)/);
  assert.match(shop, /detail: "checkout_start"/);
  assert.match(shop, /setQuote\(verified\)/);
});
check("admin/authorization_and_owner_only_finance", () => {
  const route = read("app/api/admin/analytics/route.ts");
  const service = read("lib/admin/halleus-analytics-dashboard.ts");
  assert.match(route, /requireAdminCapability\(request, "dashboard.read"\)/);
  assert.match(route, /normalizeAnalyticsPath\(requestedPage\)/);
  assert.match(route, /parseAnalyticsWindow\(rangeParams\)/);
  assert.match(route, /noStoreJsonResponse/);
  assert.match(service, /actor\.role === "owner" && actor\.capabilities\.includes\("shop_orders.read"\)/);
  assert.match(service, /wiki_shop_showcase_daily_metrics/);
  assert.match(service, /analytics_hourly/);
  assert.match(service, /analytics_minute_presence/);
  assert.match(service, /product_item\.item->>'productId'/);
});
check("ui/seven_sections_and_page_time", () => {
  const panel = read("components/admin/HalleusAnalyticsPanel.tsx");
  const nav = read("components/admin/AdminConsole.tsx");
  for (const key of ["overview", "live", "traffic", "content", "time", "sales", "tools"]) {
    assert.ok(nav.includes('id: "' + key + '", label:'), key);
    assert.ok(panel.includes('activeSection === "' + key + '"'), key);
  }
  for (const label of ["زمان حضور در تمام صفحات این روز", "مجموع زمان حضور فعال",
    "میانگین هر بازدید صفحه", "بازدید از مرورگرهای بازگشتی", "ورود از کمپین‌های تبلیغاتی",
    "روند عملکرد هالیوس", "بازهٔ دلخواه", "آنلاین همین حالا", "بررسی صفحه"]) {
    assert.ok(panel.includes(label), label);
  }
  assert.ok(panel.includes("data.dayPages"));
  assert.ok(panel.includes("data.titles"));
  assert.match(panel, /setInterval\(\(\) => void read\(\), 20_000\)/);
  assert.doesNotMatch(panel, /\b(MVP|GA4|SQL|postgres|migration)\b/);
});
check("ui/css_modules_and_mobile", () => {
  const panel = read("components/admin/HalleusAnalyticsPanel.tsx");
  const css = read("components/admin/halleus-analytics.module.css");
  const classes = [...new Set([...panel.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map(match => match[1]))];
  for (const name of classes) assert.ok(
    css.includes("." + name), "Missing CSS class: " + name
  );
  assert.ok(css.includes("@media (max-width: 780px)"));
  assert.ok(css.includes("@media (max-width: 540px)"));
  assert.ok(!css.includes(":root {}"));
});
check("privacy/transparency", () => {
  const privacy = read("app/privacy/page.tsx");
  assert.match(privacy, /شناسهٔ اتفاقی و موقت/);
  assert.match(privacy, /۳۰ روز/);
  assert.match(privacy, /عمق|پایین‌رفتن در صفحه/);
  assert.match(privacy, /فعال/);
});

if (failures.length) {
  console.error("ANALYTICS_DISCOVERY_FAILURES=" + failures.length);
  for (const failure of failures) console.error(failure.name + ": " + failure.error);
  process.exitCode = 1;
} else {
  console.log("HALLEUS_ADVANCED_ANALYTICS_GUARD_PASS");
}
