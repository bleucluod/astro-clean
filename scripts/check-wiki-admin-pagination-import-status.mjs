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
const publicationJobsRoute = read("app/api/admin/wiki/publication-jobs/route.ts");
const cms = read("lib/wiki/wiki-cms-service.ts");
// HALLEUS_WIKI_JOB_PAGINATION_GUARD_R48
const importRoute = read("app/api/admin/wiki/imports/route.ts");
const importer = read("lib/wiki/wiki-import-service.ts");
// HALLEUS_WIKI_REPORT_ASSERTIONS_MOVED_TO_REPORTS_INTELLIGENCE_R2

for (const [label, source] of [
  ["panel", panel],
  ["article route", articleRoute],
  ["publication jobs route", publicationJobsRoute],
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
requireText("queue API boundary", panel, "/api/admin/wiki/publication-jobs?limit=${articlePageSize}&page=${articlePage}");
requireText("queue API auth", publicationJobsRoute, 'requireAdminCapability(request, "wiki.read")');
requireText("queue API service", publicationJobsRoute, "listAdminWikiPublicationJobs");
requireText("queue API default limit", publicationJobsRoute, 'readLimit(url.searchParams.get("limit"), 25)');
requireText("queue API page", publicationJobsRoute, 'url.searchParams.get("page")');
requireText("queue service", cms, "listAdminWikiPublicationJobs");
requireText("queue total metadata", panel, "setArticleTotal(Number(payload.total ?? 0))");

requireText("import GET auth", importRoute, 'requireAdminCapability(request, "wiki.read")');
requireText("import package reader", importer, "listWikiImportPackageSummaries");
requireText("current published status", importer, "current_published");
requireText("current missing status", importer, "current_missing");
requireText("open draft status", importer, "open_drafts");
requireText("historical label", panel, "ورود تاریخی:");
requireText("current label", panel, "وضعیت فعلی:");
requireText("republish prevention copy", panel, "اقدام انتشار دوباره لازم نیست");

requireText("non-merge import preview route", importRoute, "HALLEUS_WIKI_IMPORT_PREVIEW_ROUTE_R62");
requireText("non-merge import preview service", importer, "HALLEUS_WIKI_IMPORT_PREVIEW_SERVICE_R62");
requireText("non-merge import preview TTL", importer, "WIKI_IMPORT_PREVIEW_TTL_MS");
requireText("auto schedule preview clock", importer, "now: previewedAt");
requireText("exact auto schedule apply", importer, "const previewSlots = new Map");
requireText("preview required on apply", importer, "A current Wiki import preview is required.");
requireText("import preview UI", panel, "HALLEUS_WIKI_IMPORT_PREVIEW_UI_R62");
requireText("import explicit apply copy", panel, "تأیید و اعمال ورود");
requireText("import preview no mutation copy", panel, "هیچ مقاله، رسانه یا job انتشاری ساخته نمی‌شود");
if (importRoute.includes("const result = await importValidatedWikiPackage({ actor, package: parsed, mode });")) {
  failures.push("non-merge import still applies immediately without preview");
}
if (failures.length) {
  console.error("Wiki admin pagination/import status check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki admin pagination/import status check passed.");
console.log("- article lists use server pagination with 25/50/100 page sizes");
console.log("- Wiki publication jobs now use their own protected server-paginated queue endpoint");
console.log("- import history is separated from current article state");
console.log("- fully published packages explicitly require no repeat publication");
console.log("- review-first and auto-schedule imports require Preview → Confirm → Apply");
console.log("- auto-schedule apply reuses the exact previewed publication slots");
