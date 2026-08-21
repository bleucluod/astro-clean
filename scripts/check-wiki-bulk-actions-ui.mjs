import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};
const forbidText = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`);
};

const consoleSource = read("components/admin/AdminConsole.tsx");
const panelSource = read("components/admin/WikiAdminPanel.tsx");
const styleSource = read("components/admin/admin-console.module.css");
const routeSource = read("app/api/admin/wiki/articles/bulk-actions/route.ts");
const serviceSource = read("lib/wiki/wiki-cms-service.ts");
const bulkScheduleGuard = read("scripts/check-wiki-bulk-scheduling.mjs");
const queueGuard = read("scripts/check-wiki-publication-queue-readonly.mjs");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

for (const source of [consoleSource, panelSource, routeSource, serviceSource]) {
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
      failures.push(`Wiki bulk UI parse error: ${diagnostic.messageText}`);
    }
  }
}

requireText("Wiki workspace", styleSource, "width: min(100%, 1180px)");
requireText("article tabs", panelSource, 'role="tablist"');
requireText("shared selection", panelSource, "toggleAllVisibleArticles");
requireText("shared selection", panelSource, "selectedVisibleIds");
requireText("bulk toolbar conditional", panelSource, "selectedVisibleIds.length > 0");
requireText("bulk delete UI", panelSource, "حذف انتخاب‌شده‌ها");
requireText("explicit selected publish UI", panelSource, "انتشار ویرایش‌های انتخاب‌شده");
requireText("explicit selected publish function", panelSource, "publishSelectedOpenEdits");
forbidText("ambiguous publish-all UI", panelSource, "انتشار همهٔ ویرایش‌های باز");
forbidText("ambiguous publish-all function", panelSource, "publishAllOpenEdits");
requireText("bulk schedule preservation", panelSource, "پیش‌نمایش زمان‌بندی");
requireText("articles new action", panelSource, "+ مقالهٔ تازه");
requireText("articles import action", panelSource, "ورود بسته");

requireText("bulk action route", routeSource, 'requireAdminCapability(request, "wiki.publish.write")');
requireText("bulk action route", routeSource, 'action !== "delete" && action !== "publish"');
requireText("bulk action route", routeSource, "publishAdminWikiDrafts");
requireText("bulk action route", routeSource, "revalidateWikiPublicPaths(");
requireText(
  "bulk delete immediate public invalidation",
  routeSource,
  'revalidateWikiPublicPaths([], { cachePolicy: "expire-now" })',
);
requireText("bulk delete service", serviceSource, "export async function softDeleteAdminWikiArticles");
requireText("bulk publish service", serviceSource, "export async function publishAdminWikiDrafts");
requireText("bulk publish eligibility", serviceSource, 'asString(row.status) !== "published"');
requireText("bulk publish behavior", serviceSource, "await publishAdminWikiDraft");
requireText("4B guard", bulkScheduleGuard, "apply rechecks the plan");
requireText("4A guard position behavior", queueGuard, "queueModule.getWikiPublicationQueuePositions(queue)");

if (
  packageJson.scripts?.["check:wiki-bulk-actions-ui"] !==
  "node scripts/check-wiki-bulk-actions-ui.mjs"
) failures.push("package script missing check:wiki-bulk-actions-ui");

for (const id of ["wiki", "wiki-guard-tooling"]) {
  const area = impact.areas?.find((entry) => entry.id === id);
  if (!area?.guards?.includes("check:wiki-bulk-actions-ui")) {
    failures.push(`${id} does not require check:wiki-bulk-actions-ui`);
  }
}

if (failures.length) {
  console.error("Wiki daily bulk actions UI check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki daily bulk actions UI check passed.");
console.log("- bulk toolbar appears only after an explicit selection");
console.log("- open-draft publication is selection-scoped instead of publish-all");
console.log("- soft delete remains an Articles operation");
console.log("- schedule preview remains selection-scoped and server-validated");
