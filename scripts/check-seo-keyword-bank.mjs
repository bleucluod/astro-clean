import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

for (const path of [
  "lib/seo/seo-keyword-bank.ts",
  "app/api/admin/seo/keywords/route.ts",
  "components/admin/SeoKeywordWorkspace.tsx",
  "components/admin/SeoAdminPanel.tsx",
  "components/admin/AdminConsole.tsx",
  "components/shop/ProductDetail.tsx",
]) {
  const compiled = ts.transpileModule(read(path), {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const errors = (compiled.diagnostics ?? [])
    .filter((row) => row.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map((row) => ts.flattenDiagnosticMessageText(row.messageText, "\n")),
    [], "TS/TSX parser errors in " + path);
}
const migration = read("database/migrations/0044_private_seo_keyword_bank.sql");
assert.match(migration, /create table halleus_private\.seo_keyword_targets/);
assert.match(migration, /create table halleus_private\.seo_gsc_queries/);
assert.match(migration, /enable row level security/g);
assert.match(migration, /revoke all .*from public, anon, authenticated/s);
assert.match(migration, /unique index seo_keyword_one_primary_per_page_idx/);
assert.ok(!migration.includes("drop table") && !migration.includes("alter table public.wiki_articles"));
const api = read("app/api/admin/seo/keywords/route.ts");
assert.match(api, /requireAdminCapability\(request, "wiki.read"\)/);
assert.match(api, /requireAdminCapability\(request, "wiki.settings.write"\)/);
assert.match(api, /assertAdminMutationRequest\(request\)/);
const service = read("lib/seo/seo-keyword-bank.ts");
assert.match(service, /listSeoPages\(\)/);
assert.match(service, /where deleted_at is null/);
assert.match(service, /on conflict \(page_key, phrase_key\)/);
assert.match(service, /page_key = .* and period_start = .*::date/);
assert.match(service, /jsonb_to_recordset/);
assert.match(service, /count\(distinct s.article_id\)/);
assert.match(service, /recordAdminAuditEvent/);
const ui = read("components/admin/SeoKeywordWorkspace.tsx");
assert.match(ui, /originalPhrase: editing/);
assert.match(ui, /CSV شامل صفحهٔ دیگری است/);
assert.match(ui, /periodStart, periodEnd, sourceName: file.name, rows/);
assert.match(ui, /!connected \? <p/);
const seoPanel = read("components/admin/SeoAdminPanel.tsx");
assert.match(seoPanel, /"keywords"/);
assert.match(seoPanel, /SeoKeywordWorkspace token=\{token\}/);
assert.match(read("components/admin/AdminConsole.tsx"), /id: "keywords"/);
const product = read("components/shop/ProductDetail.tsx");
assert.match(product, /plainProductCopy\(paragraph\)/);
assert.ok(!product.includes("TextWithLinks"));
assert.ok(product.includes("styles.relatedCard"), "Related products navigation must remain");
assert.ok(product.includes('href="/shop"'), "Shop breadcrumb must remain");
const style = read("components/admin/seo-keywords.module.css");
assert.match(style, /@media \(max-width: 580px\)/);
for (const [name, body] of [
  ["migration", migration], ["service", service], ["api", api],
  ["ui", ui], ["seoPanel", seoPanel], ["product", product], ["style", style],
]) {
  assert.ok(!body.split("\n").some((line) => /[ \t]+$/.test(line)), name + " trailing whitespace");
}
console.log("SEO_KEYWORD_BANK_FOCUSED_GUARD=PASS");
