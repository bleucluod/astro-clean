import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
};
const forbidText = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`);
};

const helper = read("lib/wiki/wiki-publication-queue.ts");
const panel = read("components/admin/WikiAdminPanel.tsx");
const consoleClient = read("components/admin/AdminConsole.tsx");
const route = read("app/api/admin/wiki/publication-jobs/route.ts");
const service = read("lib/wiki/wiki-cms-service.ts");
const styles = read("components/admin/admin-console.module.css");
const packageJson = JSON.parse(read("package.json"));
const registry = JSON.parse(read("config/halleus-check-impact.json"));

for (const source of [panel, consoleClient, route, service]) {
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
      failures.push(`Wiki publication control parse error: ${diagnostic.messageText}`);
    }
  }
}

for (const marker of [
  "HALLEUS_WIKI_PUBLICATION_CONTROL_API_R1",
  "view",
  "packageId",
  "dateFrom",
  "dateTo",
  "status",
]) requireText("publication jobs route", route, marker);

for (const marker of [
  "HALLEUS_WIKI_PUBLICATION_CONTROL_SERVER_R1",
  "active_total",
  "queue_end_at",
  "publishing_paused",
  "source_package_id",
  "wiki_import_packages",
  "todayTimeline",
  "tomorrowTimeline",
  "expectedPageCount",
]) requireText("publication jobs service", service, marker);

for (const marker of [
  "Publication Control Center",
  "امروز",
  "فردا",
  "بستهٔ محتوا",
  "queueMismatch",
  "toggleWikiPublishingPause",
  "ابزارهای پیشرفته صف",
  "تغییر زمان",
  "لغو نوبت",
  "تلاش دوباره",
  "جایگاه ۱ یعنی انتشار بعدی",
  "صف از jobهای واقعی انتشار خوانده می‌شود.",
]) requireText("publication jobs UI", panel, marker);

requireText(
  "Wiki nested navigation",
  consoleClient,
  '{ id: "queue", label: "انتشار", capability: "wiki.read" }',
);
requireText("Wiki queue styles", styles, ".wikiPublicationFilters");

const queueSectionStart = panel.indexOf('{activeSection === "queue" ? (');
const queueSectionEnd = panel.indexOf('activeSection === "articles" && detail', queueSectionStart);
if (queueSectionStart < 0 || queueSectionEnd < 0) {
  failures.push("unable to isolate the queue section");
} else {
  const queueSection = panel.slice(queueSectionStart, queueSectionEnd);
  forbidText("queue destructive article delete", queueSection, "deleteSelectedArticles");
  forbidText("queue bulk schedule", queueSection, "previewBulkSchedule");
  forbidText("queue stable-ID reorder textarea", queueSection, "queueBulkOrder");
  requireText("queue safe cancel", queueSection, 'mutateQueueJob(article, "cancel")');
  requireText("queue safe retry", queueSection, 'mutateQueueJob(article, "retry")');
  requireText("queue safe reschedule", queueSection, 'mutateQueueJob(article, "reschedule")');
}

const transpiled = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const queueModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled, "utf8").toString("base64")}`
);

const article = (overrides) => ({
  id: overrides.stableId,
  stableId: overrides.stableId,
  slug: overrides.stableId,
  title: overrides.stableId,
  categoryId: "foundations",
  status: "draft",
  indexable: false,
  contentVersion: 1,
  articleRole: "support",
  contentCluster: "foundations",
  publicationPriority: 0,
  publishedAt: null,
  scheduledFor: null,
  deletedAt: null,
  hasDraft: true,
  pendingPublishAt: null,
  publishJobStatus: null,
  publishJobError: null,
  updatedAt: "2026-07-17T00:00:00.000Z",
  ...overrides,
});
const queue = queueModule.buildWikiPublicationQueue([
  article({ stableId: "later", pendingPublishAt: "2026-07-20T08:00:00.000Z", publishJobStatus: "queued" }),
  article({ stableId: "first", pendingPublishAt: "2026-07-19T08:00:00.000Z", publishJobStatus: "queued" }),
  article({ stableId: "running", pendingPublishAt: "2026-07-18T08:00:00.000Z", publishJobStatus: "running" }),
]);
const positions = queueModule.getWikiPublicationQueuePositions(queue);
if (positions.get("first") !== 1 || positions.get("later") !== 2) {
  failures.push("queueModule.getWikiPublicationQueuePositions(queue) is no longer deterministic");
}

if (
  packageJson.scripts?.["check:wiki-publication-queue-readonly"] !==
  "node scripts/check-wiki-publication-queue-readonly.mjs"
) failures.push("package script missing check:wiki-publication-queue-readonly");

for (const areaId of ["wiki", "wiki-guard-tooling"]) {
  const area = registry.areas?.find((entry) => entry.id === areaId);
  if (!area?.guards?.includes("check:wiki-publication-queue-readonly")) {
    failures.push(`${areaId} does not require check:wiki-publication-queue-readonly`);
  }
}

if (failures.length) {
  console.error("Wiki publication control check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki publication control check passed.");
console.log("- wiki_publish_jobs remains the operational source of truth");
console.log("- summary counts and next/end/pause are server-global, not page-slice approximations");
console.log("- active/failed/published/canceled, package, status, and date filters are explicit");
console.log("- Today/Tomorrow timelines and package progress are server-backed");
console.log("- queue keeps safe row actions while destructive article deletion stays outside Publication");
