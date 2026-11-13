import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const panel = fs.readFileSync("components/admin/WikiShopShowcasePanel.tsx", "utf8");
const page = fs.readFileSync("app/dev/wiki-shop-showcases/page.tsx", "utf8");
const workspace = fs.readFileSync("app/dev/wiki-shop-showcases/WikiShopShowcaseDevWorkspace.tsx", "utf8");
const admin = fs.readFileSync("components/admin/WikiAdminPanel.tsx", "utf8");
const consoleSource = fs.readFileSync("components/admin/AdminConsole.tsx", "utf8");
assert.match(page, /NODE_ENV !== "development"\) notFound\(\)/);
assert.match(page, /robots: \{ index: false, follow: false \}/);
assert.match(workspace, /<WikiShopShowcasePanel token="" canWrite demo/);
assert.match(consoleSource, /const WikiShopShowcasePanel = dynamic/);
assert.match(consoleSource, /id: "showcases",\s*label: "ویترین‌ها"/);
assert.match(consoleSource, /const legacyShowcaseLink = requestedTab === "wiki"/);
assert.match(consoleSource, /router\.replace\("\/admini\?" \+ params\.toString\(\)/);
assert.match(consoleSource, /params\.set\("section", options\?\.section \?\? "overview"\)/);
assert.match(consoleSource, /activeSection=\{showcaseSection\}/);
assert.doesNotMatch(admin, /WikiShopShowcasePanel|activeSection === "showcases"/);
for (const section of ["overview", "manage", "ai", "metrics"]) {
  assert.match(consoleSource, new RegExp('id: "' + section + '", label:'));
  assert.match(panel, new RegExp('activeSection === "' + section + '"'));
}
assert.match(panel, /onSectionChange\("manage"\)/);
assert.match(panel, /onSectionChange\("ai"\)/);
assert.match(panel, /onSectionChange\("metrics"\)/);
assert.match(panel, /const aiCandidates = useMemo/);
assert.match(panel, /const \[aiSearch, setAiSearch\]/);
assert.match(panel, /onClick=\{\(\) => \{ void refreshMetrics\(\);? \}\}|onClick=\{\(\) => void refreshMetrics\(\)\}/);
assert.match(panel, /<section className=\{styles\.aiArticlePicker\}\s/);
assert.match(panel, /<div className=\{styles\.zipArea\}>[\s\S]*?<div className=\{styles\.importArea\}>/);
assert.match(panel, /<div className=\{styles\.articleList\}>/);
assert.match(panel, /className=\{styles\.editorColumn\}/);
assert.match(panel, /<section className=\{styles\.metricsSection\}\s/);
assert.match(panel, /const \[helpOpen, setHelpOpen\] = useState\(false\)/);
assert.match(panel, /aria-expanded=\{helpOpen\}/);
assert.match(panel, /onClick=\{\(\) => setHelpOpen\(\(open\) => !open\)\}/);
assert.match(panel, /onClick=\{\(\) => setHelpOpen\(false\)\}/);
assert.doesNotMatch(panel, /onMouseLeave|onMouseOut|setTimeout\(.*help/i);
assert.match(panel, /useState<string\[\]>\(\[\]\)/);
assert.match(panel, /articleIds: selected, productIds/);
assert.doesNotMatch(panel, /selected\.slice\(i \* chunkSize/);
assert.match(panel, /"pending"/);
assert.match(panel, /<WikiArticleBody/);
assert.doesNotMatch(panel, /localStorage/);
for (const path of ["components/admin/WikiShopShowcasePanel.tsx",
  "components/admin/AdminConsole.tsx",
  "components/admin/WikiAdminPanel.tsx",
  "app/dev/wiki-shop-showcases/WikiShopShowcaseDevWorkspace.tsx"]) {
  const result = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
}

const adminCss = fs.readFileSync("components/admin/wiki-shop-showcase.module.css", "utf8");
const devCss = fs.readFileSync("app/dev/wiki-shop-showcases/dev-preview.css", "utf8");
const card = fs.readFileSync("components/wiki/WikiShopShowcaseCard.tsx", "utf8");
assert.match(panel, /aria-expanded=\{moreFiltersOpen\}/);
assert.match(panel, /hidden=\{!moreFiltersOpen\}/);
assert.match(panel, /PROPOSAL_LIMIT = 8/);
assert.match(panel, /pending\.slice\(currentProposalPage \* PROPOSAL_LIMIT/);
assert.match(panel, /<div className=\{styles\.importArea\}>[\s\S]*?<div className=\{styles\.articleList\}>/);
assert.match(panel, /<section className=\{styles\.quickPreview\}/);
assert.match(panel, /<WikiShopShowcaseCard offer=\{previewOffer\}/);
assert.match(panel, /<details className=\{styles\.fullArticle\}>/);
assert.match(panel, /<WikiArticleBody/);
assert.match(panel, /ref=\{editorPanelRef\}/);
assert.match(panel, /checked=\{checkedProposals\.includes\(p\.id\)\}/);
assert.match(panel, /checked=\{selected\.includes\(a\.articleId\)\}/);
assert.match(adminCss, /\.manager \{ background: #f8fafc;/);
assert.match(adminCss, /\.quickPreview \{ position: sticky; top: 0;/);
assert.match(adminCss, /\.manager \[hidden\] \{ display: none !important; \}/);
assert.match(devCss, /#main-content[\s\S]*background: #f8fafc !important;/);
assert.match(card, /WikiShopShowcaseCard/);
assert.doesNotMatch(panel, /onMouseLeave|onMouseOut/);

assert.match(adminCss, /@media \(max-width: 1200px\) \{[\s\S]*?\.columns \{ grid-template-columns: minmax\(0, 1fr\); \}/);
assert.match(adminCss, /\.listColumn > \.articleList \{ order: 1; \}/);
assert.match(devCss, /nav\[data-mobile-nav="independent-final-v1"\]/);
assert.match(panel, /عدد صفر یعنی بدون حداقل/);

console.log("SHOWCASE_WORKSPACE: primary navigation, four sections, legacy links, AI, editor, preview and metrics PASS");
