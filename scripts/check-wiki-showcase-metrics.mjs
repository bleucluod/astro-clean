import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requireNode = createRequire(import.meta.url);
const read = (file) => fs.readFileSync(resolve(root, file), "utf8");
function load(file, dependencies = {}) {
  const result = ts.transpileModule(read(file), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  assert.deepEqual(
    (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error),
    [], "Syntax validation: " + file
  );
  const module = { exports: {} };
  vm.runInNewContext("(function(module,exports,require){" + result.outputText + "\n})",
    { Date, Math, Map, Set, JSON, URL, Request, Response, console, crypto: requireNode("node:crypto") }
  )(module, module.exports, (dependency) => {
    if (dependency in dependencies) return dependencies[dependency];
    if (dependency.startsWith("node:")) return requireNode(dependency);
    throw Error("Unexpected dependency: " + dependency + " in " + file);
  });
  return module.exports;
}
const typescriptSources = [
  "components/wiki/WikiShopShowcaseCard.tsx",
  "components/wiki/WikiArticleRender.tsx",
  "components/admin/WikiShopShowcasePanel.tsx",
  "lib/wiki/wiki-shop-showcase.ts",
  "lib/wiki/wiki-showcase-metrics.ts",
  "app/api/wiki/showcase-event/route.ts",
  "app/api/admin/wiki/shop-showcases/route.ts",
  "app/wiki/[slug]/page.tsx",
  "app/privacy/page.tsx",
];
for (const path of typescriptSources) {
  const compiled = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.equal((compiled.diagnostics ?? []).filter((d) =>
    d.category === ts.DiagnosticCategory.Error).length, 0, "Syntax check: " + path);
}
const migration = read("database/migrations/0039_wiki_showcase_daily_metrics.sql");
assert.match(migration, /create table if not exists halleus_private\.wiki_shop_showcase_daily_metrics/);
assert.match(migration, /primary key \(showcase_id, product_id, day\)/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all .* from public, anon, authenticated/);
assert.doesNotMatch(migration, /\btruncate\b|\bdrop table\b|\bdelete from\b|\balter table public\./i);
for (const sensitive of ["ip_address", "user_agent", "visitor_id", "session_id", "user_id", "email", "referer", "cookie"]) {
  assert.doesNotMatch(migration.toLowerCase(), new RegExp("\\b" + sensitive + "\\b"));
}
const card = read("components/wiki/WikiShopShowcaseCard.tsx");
const article = read("components/wiki/WikiArticleRender.tsx");
const publicPage = read("app/wiki/[slug]/page.tsx");
const panel = read("components/admin/WikiShopShowcasePanel.tsx");
const publicSource = read("lib/wiki/wiki-shop-showcase.ts");
const adminRoute = read("app/api/admin/wiki/shop-showcases/route.ts");
const eventRoute = read("app/api/wiki/showcase-event/route.ts");
assert.match(card, /IntersectionObserver/);
assert.match(card, /750/);
assert.match(card, /intersectionRatio < 0\.5/);
assert.match(card, /impressionSent/);
assert.match(card, /analyticsConfig\.consentStorageKey/);
assert.match(card, /setting\.choice === "denied"/);
assert.match(card, /onClick=\{recordClick\}/);
assert.match(card, /track = false/);
assert.match(publicPage, /trackShowcases/);
assert.match(article, /track=\{trackShowcases\}/);
assert.doesNotMatch(panel, /trackShowcases\s*[,=]/);
assert.match(publicSource, /s\.id::text as showcase_id/);
assert.match(publicSource, /id: asString\(row\.showcase_id\)/);
assert.match(eventRoute, /join public\.wiki_articles/);
assert.match(eventRoute, /on conflict \(showcase_id, product_id, day\) do update/);
assert.match(eventRoute, /req|request/);
assert.match(eventRoute, /origin !== expectedOrigin/);
assert.match(eventRoute, /return empty\(429\)/);
assert.match(adminRoute, /requireAdminCapability\(request, "wiki\.read"\)/);
assert.match(adminRoute, /loadWikiShowcaseMetrics/);
assert.match(panel, /performanceRows/);
assert.match(panel, /metricWindow/);
assert.match(panel, /metricDirection/);
assert.match(panel, /formatCtr/);
assert.match(panel, /metricProduct/);

const asString = (value) => value == null ? "" : String(value);
const asNumber = (value) => Number(value) || 0;
const summaryRows = [
  { showcase_id: "s1", product_id: "p01", impressions: "12", clicks: "3" },
  { showcase_id: "s2", product_id: "p02", impressions: "100", clicks: "20" },
];
const makeDatabase = (values) => async (chunks, ...args) => {
  assert.match(chunks.join("?"), /wiki_shop_showcase_daily_metrics/);
  assert.equal(args.length, 2);
  return values;
};
const metrics = load("lib/wiki/wiki-showcase-metrics.ts", {
  "@/lib/admin/admin-database": {
    getAdminDatabase: () => makeDatabase(summaryRows), asNumber, asString,
  },
});
assert.equal(metrics.parseShowcaseMetricsWindow(null), "7");
assert.equal(metrics.parseShowcaseMetricsWindow("30"), "30");
assert.equal(metrics.parseShowcaseMetricsWindow("all"), "all");
assert.throws(() => metrics.parseShowcaseMetricsWindow("90"), /Invalid/);
const dashboard = await metrics.loadWikiShowcaseMetrics("7");
assert.equal(dashboard.ready, true);
assert.equal(dashboard.metrics.length, 2);
assert.equal(dashboard.summary.impressions, 112);
assert.equal(dashboard.summary.clicks, 23);
const missing = load("lib/wiki/wiki-showcase-metrics.ts", {
  "@/lib/admin/admin-database": {
    getAdminDatabase: () => async () => {
      throw Object.assign(new Error("missing migration"), { code: "42P01" });
    }, asNumber, asString,
  },
});
assert.equal((await missing.loadWikiShowcaseMetrics("30")).ready, false);

let written = 0;
const ids = [];
const recorder = load("app/api/wiki/showcase-event/route.ts", {
  "@/lib/config/env": { getHalleusRuntimeEnv: () => ({ siteUrl: "https://halleus.ir" }) },
  "@/lib/admin/admin-database": {
    getAdminDatabase: () => async (strings, ...values) => {
      assert.match(strings.join("?"), /on conflict/);
      written++;
      ids.push(values.find((v) => typeof v === "string" && v.startsWith("00000001-")));
      return [{ showcase_id: "ok" }];
    },
  },
  "@/lib/shop/shop-mvp-activation": {
    isShopMvpActive: () => true, isShopP02OrderEnabled: () => true,
  },
});
const id = "00000001-1111-4111-8111-111111111111";
const invoke = async (body, origin = "https://halleus.ir", site = "same-origin") =>
  recorder.POST(new Request("https://halleus.ir/api/wiki/showcase-event", {
    method: "POST", headers: {
      "Content-Type": "application/json", Origin: origin, "Sec-Fetch-Site": site,
    }, body: JSON.stringify(body),
  }));
assert.equal((await invoke({id,slug:"moon-phases",event:"impression"})).status, 204);
assert.equal((await invoke({id,slug:"moon-phases",event:"click"})).status, 204);
assert.equal(written, 2);
assert.equal((await invoke({id,slug:"moon-phases",event:"click"}, "https://evil.invalid")).status, 403);
assert.equal((await invoke({id,slug:"moon-phases",event:"click"}, "https://halleus.ir", "cross-site")).status, 403);
assert.equal((await invoke({id:"nope",slug:"moon-phases",event:"click"})).status, 400);
assert.equal((await invoke({id,slug:"moon-phases",event:"click", userId:"x"})).status, 400);
assert.equal(written, 2, "Invalid traffic must not write");
console.log("WIKI_SHOWCASE_METRICS_GUARD=PASS identity, privacy, consent, visibility, admin isolation, windows, origin, payload, daily aggregation");
