import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`);
}

const consoleSource = read("components/admin/AdminConsole.tsx");
const panelSource = read("components/admin/WikiAdminPanel.tsx");
const styleSource = read("components/admin/admin-console.module.css");
const routeSource = read("app/api/admin/wiki/articles/bulk-actions/route.ts");
const serviceSource = read("lib/wiki/wiki-cms-service.ts");
const bulkScheduleGuard = read("scripts/check-wiki-bulk-scheduling.mjs");
const queueGuard = read("scripts/check-wiki-publication-queue-readonly.mjs");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

for (const [label, source] of [
  ["AdminConsole", consoleSource],
  ["WikiAdminPanel", panelSource],
  ["bulk action route", routeSource],
  ["Wiki CMS service", serviceSource],
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
      failures.push(`${label} TypeScript parse error: ${diagnostic.messageText}`);
    }
  }
}

requireText("Wiki toolbar", consoleSource, "styles.wikiToolbar");
requireText("Wiki workspace", styleSource, "width: min(100%, 1180px)");
requireText("article tabs", panelSource, 'role="tablist"');
requireText("article tabs", panelSource, "activeStatusTab");
requireText("shared selection", panelSource, "toggleAllVisibleArticles");
requireText("shared selection", panelSource, "selectedVisibleIds");
requireText("bulk delete UI", panelSource, "حذف انتخاب‌شده‌ها");
requireText("queue selection", panelSource, 'aria-label="انتخاب همهٔ صف"');
requireText("bulk schedule preservation", panelSource, "پیش‌نمایش زمان‌بندی");
forbidText("article list", panelSource, "انتخاب برای زمان‌بندی");
forbidText("article filters", panelSource, '<select value={status}');
forbidText("article heading", panelSource, "پیش‌نویس، زمان‌بندی، انتشار و تاریخچهٔ نسخه‌ها");

requireText("bulk action route", routeSource, 'requireAdminCapability(request, "wiki.publish.write")');
requireText("bulk action route", routeSource, 'action !== "delete"');
requireText("bulk action route", routeSource, "revalidateWikiPublicPaths()");
requireText("bulk delete service", serviceSource, "export async function softDeleteAdminWikiArticles");
requireText("bulk delete service", serviceSource, "return sql.begin(async (tx) =>");
requireText("bulk delete service", serviceSource, "for update");
requireText("bulk delete service", serviceSource, "rows.length !== articleIds.length");
requireText("bulk delete service", serviceSource, "status in ('queued', 'retry', 'running')");
requireText("bulk delete service", serviceSource, "admin.wiki.articles_bulk_soft_deleted");
requireText("bulk delete service", serviceSource, "wiki_article_batch");

requireText("4B guard", bulkScheduleGuard, "apply rechecks the plan");
requireText(
  "4A guard",
  queueGuard,
  "queue scheduling stays read-only; shared soft-delete is the only mutation exposed",
);

if (
  packageJson.scripts?.["check:wiki-bulk-actions-ui"] !==
  "node scripts/check-wiki-bulk-actions-ui.mjs"
) {
  failures.push("package.json is missing check:wiki-bulk-actions-ui");
}
for (const id of ["wiki", "wiki-guard-tooling"]) {
  const area = impact.areas?.find((entry) => entry.id === id);
  if (!area?.guards?.includes("check:wiki-bulk-actions-ui")) {
    failures.push(`${id} does not require check:wiki-bulk-actions-ui`);
  }
}

if (failures.length > 0) {
  console.error("Wiki bulk actions UI check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki bulk actions UI check passed.");
console.log("- Wiki heading is centered inside the same bounded card system");
console.log("- search and status tabs replace the old title, subtitle, and status select");
console.log("- article and queue selections share mark-all and soft-delete actions");
console.log("- schedule preview remains restricted to eligible saved drafts");
console.log("- bulk delete is validated, row-locked, transactional, audit-covered, and cancels managed jobs");
