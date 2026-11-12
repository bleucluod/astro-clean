import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => fs.readFileSync(resolve(root, path), "utf8");
const paths = [
  "lib/wiki/wiki-shop-showcase.ts",
  "lib/wiki/wiki-showcase-anchor.ts",
  "lib/wiki/wiki-showcase-zip.ts",
  "lib/wiki/wiki-shop-showcase-workflow.ts",
  "app/api/admin/wiki/shop-showcases/route.ts",
  "components/admin/WikiShopShowcasePanel.tsx",
  "components/admin/WikiAdminPanel.tsx",
  "components/wiki/WikiShopShowcaseCard.tsx",
  "components/wiki/WikiArticleRender.tsx",
  "app/wiki/[slug]/page.tsx",
  "app/dev/wiki-shop-showcases/WikiShopShowcaseDevWorkspace.tsx",
];
const transpile = (path) => {
  const out = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual((out.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error),
    [], "TS/TSX parsing: " + path);
  return out.outputText;
};
paths.forEach(transpile);
function loadModule(path, deps = {}) {
  const module = { exports: {} };
  const script = "(function(module,exports,require){" + transpile(path) + "\n})";
  const fn = vm.runInNewContext(script, {
    TextEncoder, TextDecoder, Uint8Array, DataView, console, crypto: requireNode('node:crypto'),
  });
  fn(module, module.exports, (key) => {
    if (key in deps) return deps[key];
    if (key.startsWith("node:")) return requireNode(key);
    throw new Error("Unexpected test dependency: " + key);
  });
  return module.exports;
}
const { createRequire } = await import("node:module");
const requireNode = createRequire(import.meta.url);
const anchor = loadModule("lib/wiki/wiki-showcase-anchor.ts");
const sections = Array.from({ length: 4 }, (_, index) => ({
  title: "بخش " + index, paragraphs: ["متن دقیق مرتبط با بخش " + index],
}));
const key = anchor.wikiShowcaseSectionAnchor(sections[1]);
assert.equal(anchor.resolveWikiShowcaseSection(sections, {
  sectionAnchor: key, sectionTitle: sections[1].title }), 1);
const renamed = sections.map((section, index) => index === 1
  ? { ...section, title: "عنوان ویرایش‌شده" } : section);
assert.equal(anchor.resolveWikiShowcaseSection(renamed, {
  sectionAnchor: key, sectionTitle: sections[1].title }), 1,
"Heading edit preserves placement");
const moved = [sections[0], sections[2], sections[1], sections[3]];
assert.equal(anchor.resolveWikiShowcaseSection(moved, {
  sectionAnchor: key, sectionTitle: sections[1].title }), 2,
"Reordering preserves placement");
assert.equal(anchor.resolveWikiShowcaseSection(sections.filter((s) => s !== sections[1]), {
  sectionAnchor: key, sectionTitle: sections[1].title }), null,
"Missing section never relocates by guess");

const zip = loadModule("lib/wiki/wiki-showcase-zip.ts", { "node:zlib": requireNode("node:zlib") });
const longText = "آسمان و ماه؛ ".repeat(600);
const zipBuffer = zip.makeWikiShowcaseZip([
  { name: "README_FA.md", data: "راهنما" },
  { name: "articles/one.json", data: JSON.stringify({ content: longText }) },
]);
const parsed = zip.readWikiShowcaseZip(zipBuffer);
assert.equal(JSON.parse(parsed.get("articles/one.json")).content, longText,
  "Full text preserved; no 2200-character cut");
assert.throws(() => zip.makeWikiShowcaseZip([{ name: "../escape.json", data: "x" }]));
const badCrc = zipBuffer.slice();
const local = new DataView(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength);
const compressedStart = 30 + local.getUint16(26, true) + local.getUint16(28, true);
badCrc[compressedStart + 2] ^= 1;
assert.throws(() => zip.readWikiShowcaseZip(badCrc), "CRC/tampering fails");

class AdminAccessError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const now = new Date("2026-11-12T12:00:00Z");
const articleRows = Array.from({ length: 300 }, (_, index) => ({
  id: (index + 1).toString(16).padStart(8, "0") +
    "-1111-4111-8111-111111111111",
  stable_id: "article-" + index, slug: "article-" + index, title: "مقاله " + index,
  category_id: "foundations", status: "published", is_indexable: true,
  updated_at: now.toISOString(), published_at: "2026-01-01T00:00:00Z",
  scheduled_for: null, content_version: 2, intro: "مقدمه",
  summary: "خلاصه", sections: index === 0
    ? [{ title: "شروع", paragraphs: [longText] }, ...sections.slice(1)]
    : sections,
}));
const stored = articleRows.slice(0, 30).map((a) => ({
  article_id: a.id, product_id: "p01", article_version: 2, after_section_index: 1,
  section_title: sections[1].title, section_anchor: key,
  title: "ویترین", description: "متن", button_label: "دیدن",
  revision: 1, enabled: true, updated_at: now.toISOString(),
}));
const proposals = articleRows.slice(30, 40).map((a, i) => ({
  id: (i + 501).toString(16).padStart(8, "0") + "-1111-4111-8111-111111111111",
  article_id: a.id, article_version: 2, product_id: "p01",
  after_section_index: 1, section_anchor: key, section_title: sections[1].title,
  title: "ویترین", description: "متن", button_label: "دیدن",
  status: "pending", source_batch_id: "fixture", created_at: now.toISOString(),
}));
let inserted = 0;
const sql = async (chunks, ...values) => {
  const statement = chunks.join("?").replace(/\s+/g, " ").toLowerCase();
  if (statement.includes("from public.wiki_articles")) return articleRows;
  if (statement.includes("from halleus_private.wiki_shop_showcases")) return stored;
  if (statement.includes("from halleus_private.wiki_shop_showcase_proposals")) return proposals;
  if (statement.includes("from halleus_private.wiki_shop_showcase_exports")) return [];
  if (statement.includes("insert into")) { inserted++; return []; }
  throw new Error("Unexpected SQL: " + statement);
};
sql.begin = async (callback) => callback(sql);
const workflow = loadModule("lib/wiki/wiki-shop-showcase-workflow.ts", {
  "node:crypto": requireNode("node:crypto"),
  "@/lib/admin/admin-auth": { AdminAccessError },
  "@/lib/admin/admin-database": {
    getAdminDatabase: () => sql, asRecord: (v) => v && typeof v === "object" ? v : {},
    asString: (v) => v === null || v === undefined ? "" : String(v),
    asNumber: (v) => Number(v) || 0,
  },
  "./wiki-showcase-anchor": anchor, "./wiki-showcase-zip": zip,
  "./wiki-shop-showcase": {
    wikiShopProductCatalog: () => [
      { id: "p01", name: "ماه آن روز", orderable: true, image: "/p01.webp",
        description: "ماه", url: "/shop/moon-phase-print" },
      { id: "p02", name: "آسمان تولد", orderable: false, image: "/p02.webp",
        description: "آسمان", url: "/shop/birth-sky-map" },
    ],
  },
});
const dashboard = await workflow.loadWikiShowcaseDashboard();
assert.equal(dashboard.articles.length, 300);
assert.equal(dashboard.counts.has, 30);
assert.equal(dashboard.counts.missing, 270);
assert.equal(dashboard.counts.active, 30);
assert.equal(dashboard.counts.pending, 10);
assert.equal(dashboard.articles[30].hasShowcase, false,
"Unapproved AI proposal must still be in missing filter");
const actor = { userId: "22222222-2222-4222-8222-222222222222",
  role: "owner", correlationId: "test" };
const selectedIds = [articleRows[0].id, articleRows[31].id];
const batch = await workflow.buildWikiShowcaseSelectedZip(actor, {
  articleIds: selectedIds, productIds: ["p01"],
});
const exported = zip.readWikiShowcaseZip(batch.bytes);
assert.ok(exported.has("articles/" + selectedIds[0] + ".json"));
assert.ok(exported.has("articles/" + selectedIds[1] + ".json"));
assert.ok(!exported.has("articles/" + articleRows[2].id + ".json"),
"No unselected article may leak into the ZIP");
assert.equal(JSON.parse(exported.get("products.json")).length, 1);
assert.ok(JSON.parse(exported.get("articles/" + selectedIds[0] + ".json"))
  .sections[0].paragraphs[0].length > 2200);
assert.ok(inserted >= selectedIds.length, "Export history must persist");
await assert.rejects(workflow.buildWikiShowcaseSelectedZip(actor, {
  articleIds: articleRows.slice(0, 26).map((a) => a.id), productIds: ["p01"],
}), "Batch size limited for predictable downloads");

const route = read("app/api/admin/wiki/shop-showcases/route.ts");
const service = read("lib/wiki/wiki-shop-showcase.ts");
const migration = read("database/migrations/0037_wiki_showcase_review_workflow.sql");
const ui = read("components/admin/WikiShopShowcasePanel.tsx");
const card = read("components/wiki/WikiShopShowcaseCard.tsx");
const css = read("components/wiki/wiki-shop-showcase.module.css");
assert.match(route, /assertAdminUploadRequest\(request\)/);
assert.match(route, /assertAdminMutationRequest\(request\)/);
assert.match(route, /"wiki\.publish\.write"/);
assert.match(route, /readWikiShowcaseZip/);
assert.match(route, /revalidatePath\("\/wiki\/" \+ slug/);
assert.match(service, /resolveWikiShowcaseSection\(sections/);
assert.match(service, /status = 'published'/);
assert.match(service, /where id = \$\{item\.proposalId\}::uuid/);
assert.match(migration, /enable row level security/g);
assert.match(migration, /unique \(source_batch_id, article_id\)/);
assert.doesNotMatch(migration, /drop table|truncate|delete from/i);
assert.match(ui, /"missing", "ویترین ندارد/);
assert.match(ui, /"has", "ویترین دارد/);
assert.match(ui, /selected\.length/);
assert.match(ui, /checkedProposals/);
assert.match(ui, /"publish"/);
assert.match(ui, /"export_zip"/);
assert.match(ui, /<WikiArticleBody/);
assert.match(card, /<Link href=\{offer\.url\} className=\{styles\.card\}/);
assert.match(css, /background: #17191d/);
assert.doesNotMatch(css, /animation:|glint|glow|parallax|linear-gradient/i);
console.log("EW-01: 300-article dashboard, selected ZIP, anchors, import/auth gates and graphite card PASS");
