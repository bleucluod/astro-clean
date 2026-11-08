import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const backend = "lib/admin/admin-overview-trends.ts";
const route = "app/api/admin/overview/trends/route.ts";
const ui = "components/admin/AdminOverviewDashboard.tsx";
const consolePath = "components/admin/AdminConsole.tsx";
const css = read("components/admin/admin-overview-dashboard.module.css");
const day = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran",
  }).formatToParts(new Date());
  const get = (x) => parts.find((part) => part.type === x)?.value;
  return [get("year"), get("month"), get("day")].join("-");
};
function load(file, mocks) {
  const src = read(file);
  const transpiled = ts.transpileModule(src, {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const errors = (transpiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, file + " TS syntax errors: " + errors.map((x) => x.messageText).join(", "));
  const exports = {};
  const init = vm.runInNewContext("(function(require, exports) {" + transpiled.outputText + "\n})", {
    Date, Promise, Map, Number, String, Array, Object, Intl, RegExp,
  });
  init((name) => {
    if (!(name in mocks)) throw new Error("Unexpected import " + file + ": " + name);
    return mocks[name];
  }, exports);
  return exports;
}
function syntax(file) {
  const source = read(file);
  const result = ts.transpileModule(source, {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
  });
  assert.equal((result.diagnostics ?? []).filter((x) => x.category === ts.DiagnosticCategory.Error).length, 0, file + " syntax");
}
syntax(backend); syntax(route); syntax(ui); syntax(consolePath);

const requests = [];
const date = day();
const sql = async (parts) => {
  const text = parts.join("?").replace(/\s+/g, " ").toLowerCase();
  requests.push(text);
  if (text.includes("from public.halleus_users")) return [{ date, users: 4 }];
  if (text.includes("from public.halleus_reports")) return [{
    date, reports: 10, natal: 8, comparison: 2, guest_reports: 3,
    account_reports: 7, public_reports: 6, private_reports: 4,
  }];
  if (text.includes("with activity as (")) return [{
    date, orders: 5, declared: 3, verified: 2, shipped: 1,
    booked_toman: 4500000, verified_toman: 2200000,
  }];
  if (text.includes("transfer_declared") && text.includes("from halleus_private.shop_orders")) return [{
    transfer_declared: 2, ready_for_artwork: 1, preparing: 1,
    cancel_requested: 0, waiting_dispatch: 2, confirmed_toman: 2200000,
  }];
  if (text.includes("with actions as (") && text.includes("public.wiki_articles")) return [{ date, published: 2, drafts: 1, scheduled: 1, failed: 1 }];
  if (text.includes("failed_jobs") && text.includes("public.wiki_articles")) return [{
    draft: 6, scheduled: 3, published: 45, failed_jobs: 1,
  }];
  if (text.includes("with actions as (") && text.includes("telegram_content_queue")) return [{
    date, published: 3, prepared: 4, failed: 1,
  }];
  if (text.includes("future_scheduled") && text.includes("telegram_content_queue")) return [{
    future_scheduled: 12, published: 81, failed: 2, uncertain: 1,
  }];
  throw new Error("Unexpected aggregate SQL: " + text.slice(0, 170));
};
const service = load(backend, {
  "@/lib/telegram/telegram-queue": { TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS: 24 * 60 * 60 * 1000 },
  "@/lib/admin/admin-database": {
    getAdminDatabase: () => sql,
    asRecord: (value) => value && typeof value === "object" ? value : {},
    asNumber: (value) => Number(value) || 0,
  },
});
const owner = { role: "owner", capabilities: ["dashboard.read", "shop_orders.read", "wiki.read", "telegram.read"] };
const result = await service.getAdminOverviewTrends(30, owner);
assert.equal(result.days, 30);
assert.equal(result.groups.includes("shop"), true);
assert.equal(result.groups.includes("wiki"), true);
assert.equal(result.groups.includes("telegram"), true);
assert.equal(result.snapshot.shop.confirmedToman, 2200000);
assert.equal(result.snapshot.shop.transferDeclared, 2);
assert.equal(result.snapshot.wiki.failedJobs, 1);
assert.equal(result.snapshot.telegram.futureScheduled, 12);
assert.equal(result.daily.find((x) => x.date === date).values.reports, 10);
assert.equal(result.daily.find((x) => x.date === date).values.verified_toman, 2200000);
assert.equal(result.daily.find((x) => x.date === date).values.wiki_published, 2);
assert.equal(result.daily.find((x) => x.date === date).values.wiki_scheduled, 1);
assert.equal(result.daily.find((x) => x.date === date).values.wiki_failed, 1);
assert.equal(result.daily.find((x) => x.date === date).values.telegram_failed, 1);
assert.equal(requests.length, 8);
assert.equal(result.markers.some((m) => m.label.includes("P01")), date >= "2026-11-08" && result.from <= "2026-11-08");
requests.length = 0;
const viewer = await service.getAdminOverviewTrends(7, { role: "analyst", capabilities: ["dashboard.read"] });
assert.equal(viewer.snapshot.shop, null);
assert.equal(viewer.snapshot.wiki, null);
assert.equal(viewer.snapshot.telegram, null);
assert.equal(viewer.groups.includes("shop"), false);
assert.equal(requests.length, 2, "non-owner only queries existing dashboard-friendly aggregate sources");
const noPersonalColumns = read(backend);
assert.doesNotMatch(noPersonalColumns, /\brecipient_mobile\b|\bpostal_code\b|select\s+\*/i);
assert.match(noPersonalColumns, /status not in \('canceled', 'cancel_requested'\)/);
assert.match(noPersonalColumns, /payment_verified_at/);
assert.match(read(route), /requireAdminCapability\(request, "dashboard\.read"\)/);
assert.match(read(route), /noStoreJsonResponse/);
assert.match(read(ui), /payload\.markers\.map/);
assert.match(read(ui), /changeLabel\(current\.current, current\.previous\)/);
assert.match(read(ui), /onMouseMove=\{onChartMouse\}/);
assert.match(read(ui), /"day", "week", "month"/);
assert.match(read(ui), /persianMonthKey\.format/);
assert.match(read(ui), /weekday \+ 1/);
assert.match(read(ui), /tab: "users" as const/);
assert.match(read(ui), /verified_toman/);
assert.match(read(ui), /دو شاخص/);
assert.match(read(consolePath), /<AdminOverviewDashboard/);
const referenced = [...read(ui).matchAll(/styles\.([a-zA-Z][\w]*)/g)].map((x) => x[1]);
for (const klass of new Set(referenced)) {
  assert.ok(new RegExp("\\." + klass + "(?:[^a-zA-Z0-9_-]|$)").test(css), "Missing CSS class: " + klass);
}
console.log("ADMIN_OVERVIEW_DASHBOARD=PASS time-series, roles, data minimization, chart controls, attention, CSS");
