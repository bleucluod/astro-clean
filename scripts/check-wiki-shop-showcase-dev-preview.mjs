import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const panel = fs.readFileSync("components/admin/WikiShopShowcasePanel.tsx", "utf8");
const page = fs.readFileSync("app/dev/wiki-shop-showcases/page.tsx", "utf8");
const workspace = fs.readFileSync("app/dev/wiki-shop-showcases/WikiShopShowcaseDevWorkspace.tsx", "utf8");
const admin = fs.readFileSync("components/admin/WikiAdminPanel.tsx", "utf8");
assert.match(page, /NODE_ENV !== "development"\) notFound\(\)/);
assert.match(page, /robots: \{ index: false, follow: false \}/);
assert.match(workspace, /<WikiShopShowcasePanel token="" canWrite demo/);
assert.match(admin, /WikiShopShowcasePanel token=\{token\} canWrite=\{canPublish\}/);
assert.match(panel, /const \[helpOpen, setHelpOpen\] = useState\(false\)/);
assert.match(panel, /aria-expanded=\{helpOpen\}/);
assert.match(panel, /onClick=\{\(\) => setHelpOpen\(\(open\) => !open\)\}/);
assert.match(panel, /onClick=\{\(\) => setHelpOpen\(false\)\}/);
assert.doesNotMatch(panel, /onMouseLeave|onMouseOut|setTimeout\(.*help/i);
assert.match(panel, /useState<string\[\]>\(\[\]\)/);
assert.match(panel, /selected\.slice\(i \* chunkSize/);
assert.match(panel, /"pending"/);
assert.match(panel, /<WikiArticleBody/);
assert.doesNotMatch(panel, /localStorage/);
for (const path of ["components/admin/WikiShopShowcasePanel.tsx",
  "app/dev/wiki-shop-showcases/WikiShopShowcaseDevWorkspace.tsx"]) {
  const result = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
}
console.log("EW-01 unified preview, persistent click help and list-selection guard PASS");
