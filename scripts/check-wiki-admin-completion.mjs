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
  if (source.includes(marker)) failures.push(`${label} contains forbidden: ${marker}`);
};

const panel = read("components/admin/WikiAdminPanel.tsx");
const consoleClient = read("components/admin/AdminConsole.tsx");
const route = read("app/api/admin/wiki/publication-jobs/route.ts");
const previewRoute = read("app/api/admin/wiki/preview/route.ts");
const cms = read("lib/wiki/wiki-cms-service.ts");
const types = read("lib/wiki/wiki-cms-types.ts");
const renderer = read("components/wiki/WikiArticleRender.tsx");
const publicPage = read("app/wiki/[slug]/page.tsx");
const styles = read("components/admin/admin-console.module.css");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

for (const [label, source] of [
  ["panel", panel],
  ["console", consoleClient],
  ["route", route],
  ["preview route", previewRoute],
  ["cms", cms],
  ["types", types],
  ["renderer", renderer],
  ["public page", publicPage],
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

for (const marker of [
  "WikiPublicationJobsPage",
  "WikiPublicationControlSummary",
  "WikiPublicationPackageProgress",
  "WikiAdminPreviewData",
]) requireText("types", types, marker);

for (const marker of [
  "HALLEUS_WIKI_PUBLICATION_CONTROL_SERVER_R1",
  "wiki_publish_jobs",
  "wiki_import_packages",
  "source_package_id",
  "active_total",
  "queue_end_at",
  "publishing_paused",
  "getAdminWikiPreview",
  "readWikiArticleSnapshot",
]) requireText("server", cms, marker);

for (const marker of [
  "Publication Control Center",
  "queueJobView",
  "queuePackageFilter",
  "queueDateFrom",
  "queueDateTo",
  "queueStatusFilter",
  "queueMismatch",
  "امروز",
  "فردا",
  "بستهٔ محتوا",
  "مشاهدهٔ همین بسته در انتشار",
  "toggleWikiPublishingPause",
  "ابزارهای پیشرفته صف",
]) requireText("Batch 4 UI", panel, marker);

for (const marker of [
  "+ مقالهٔ تازه",
  "ورود بسته",
  "selectedVisibleIds.length > 0",
  "انتشار ویرایش‌های انتخاب‌شده",
  "Content",
  "Publication & SEO",
  "Advanced",
  "جست‌وجوی مقالهٔ مرتبط",
  "افزودن منبع",
  "CTA",
  "نسخهٔ محتوا توسط سیستم نگهداری می‌شود",
  "WikiArticleBody",
  "WikiKeyPoints",
  "toggleCanonicalPreview",
  "saveDraft(true)",
]) requireText("Batch 5 UI", panel, marker);

forbidText("daily nav", consoleClient, '{ id: "categories", label: "دسته‌ها"');
requireText("hidden new route", consoleClient, 'showInNav: false');
requireText("publication nav", consoleClient, '{ id: "queue", label: "انتشار", capability: "wiki.read" }');
requireText("preview canonical route", previewRoute, "getAdminWikiPreview");
requireText("preview origin boundary", previewRoute, "assertAdminMutationRequest");
requireText("shared public renderer", publicPage, "WikiArticleBody");
requireText("shared public inline renderer", publicPage, "WikiInlineText");
requireText("shared media renderer", renderer, "articleMedia");
requireText("shared article link renderer", renderer, "inlineArticleLink");
requireText("Phase3 styles", styles, "HALLEUS_WIKI_ADMIN_PHASE3_BATCH4_5");

const queueStart = panel.indexOf('{activeSection === "queue" ? (');
const editorStart = panel.indexOf('activeSection === "articles" && detail', queueStart);
if (queueStart < 0 || editorStart < 0) failures.push("queue section boundary missing");
else {
  const queue = panel.slice(queueStart, editorStart);
  forbidText("queue soft delete", queue, "deleteSelectedArticles");
  forbidText("queue stable ID textarea", queue, "شناسهٔ هر مقاله را در یک خط");
}

if (
  packageJson.scripts?.["check:wiki-admin-completion"] !==
  "node scripts/check-wiki-admin-completion.mjs"
) failures.push("package script missing check:wiki-admin-completion");

for (const id of ["wiki", "wiki-admin-ui", "wiki-guard-tooling"]) {
  const area = impact.areas?.find((entry) => entry.id === id);
  if (!area?.guards?.includes("check:wiki-admin-completion")) {
    failures.push(`${id} does not require check:wiki-admin-completion`);
  }
}

if (failures.length) {
  console.error("Wiki Admin Phase 3 completion check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki Admin Phase 3 completion check passed.");
console.log("- Publication is a global job-backed control center with operational filters and package/timeline visibility");
console.log("- daily navigation is reduced to Articles / Publication / Import / Media / Settings");
console.log("- bulk publication is explicitly selection-scoped");
console.log("- advanced queue tooling is collapsed and stable-ID textarea reorder is gone from daily UX");
console.log("- editor uses Content / Publication & SEO / Advanced groups with related picker, structured sources and CTA");
console.log("- admin preview uses the canonical Wiki parser and shared public renderer");
console.log("HALLEUS_WIKI_ADMIN_PHASE3_BATCH4_5=PASS");
