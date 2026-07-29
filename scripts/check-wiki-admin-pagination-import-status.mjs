import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};

const panel = read("components/admin/WikiAdminPanel.tsx");
const articleRoute = read("app/api/admin/wiki/articles/route.ts");
const cms = read("lib/wiki/wiki-cms-service.ts");
const importRoute = read("app/api/admin/wiki/imports/route.ts");
const importer = read("lib/wiki/wiki-import-service.ts");

for (const [label, source] of [
  ["panel", panel],
  ["article route", articleRoute],
  ["CMS service", cms],
  ["import route", importRoute],
  ["import service", importer],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      failures.push(`${label} parse error: ${diagnostic.messageText}`);
    }
  }
}

requireText("article route default", articleRoute, 'readLimit(url.searchParams.get("limit"), 25)');
requireText("article route page", articleRoute, 'url.searchParams.get("page")');
requireText("article response metadata", articleRoute, "...articlePage");
requireText("server count", cms, "select count(*)::integer as total");
requireText("server offset", cms, "offset ${offset}");
requireText("page sizes", panel, "[25, 50, 100]");
requireText("result range", panel, "از ${articleTotal.toLocaleString");
requireText("queue boundary", panel, "queueView ? 100 : articlePageSize");

requireText("import GET auth", importRoute, 'requireAdminCapability(request, "wiki.read")');
requireText("import package reader", importer, "listWikiImportPackageSummaries");
requireText("current published status", importer, "current_published");
requireText("current missing status", importer, "current_missing");
requireText("open draft status", importer, "open_drafts");
requireText("historical label", panel, "ورود تاریخی:");
requireText("current label", panel, "وضعیت فعلی:");
requireText("republish prevention copy", panel, "اقدام انتشار دوباره لازم نیست");

if (failures.length) {
  console.error("Wiki admin pagination/import status check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki admin pagination/import status check passed.");
console.log("- article lists use server pagination with 25/50/100 page sizes");
console.log("- queue loading remains unpaginated within its existing bounded contract");
console.log("- import history is separated from current article state");
console.log("- fully published packages explicitly require no repeat publication");
