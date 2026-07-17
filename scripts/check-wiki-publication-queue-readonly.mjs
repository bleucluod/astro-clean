import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

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

const helper = read("lib/wiki/wiki-publication-queue.ts");
const panel = read("components/admin/WikiAdminPanel.tsx");
const consoleClient = read("components/admin/AdminConsole.tsx");
const styles = read("components/admin/admin-console.module.css");
const packageJson = JSON.parse(read("package.json"));
const registry = JSON.parse(read("config/halleus-check-impact.json"));

for (const marker of [
  'buildWikiPublicationQueue',
  'summarizeWikiPublicationQueue',
  'getWikiPublicationQueueDate',
  'activeSection === "queue"',
  'صف انتشار',
  'نمای خواندنی jobهای زمان‌بندی‌شده',
  'publicationQueueSummary',
  'publicationQueueTable',
  'تازه‌سازی صف',
  'aria-label="انتخاب همهٔ صف"',
  'حذف انتخاب‌شده‌ها',
]) {
  requireText("Wiki publication queue UI", panel, marker);
}
requireText("Wiki nested navigation", consoleClient, '{ id: "queue", label: "صف انتشار", capability: "wiki.read" }');
requireText("Wiki queue styles", styles, ".publicationQueueSummary");
requireText("Wiki queue styles", styles, '.queueStatus[data-status="failed"]');

const queueSectionStart = panel.indexOf('{activeSection === "queue" ? (');
const queueSectionEnd = panel.indexOf('activeSection === "articles" && detail', queueSectionStart);
if (queueSectionStart < 0 || queueSectionEnd < 0) {
  failures.push("unable to isolate the read-only queue section");
} else {
  const queueSection = panel.slice(queueSectionStart, queueSectionEnd);
  for (const forbidden of [
    'previewBulkSchedule(',
    'applyBulkSchedule(',
    '/api/admin/wiki/publication-schedule',
    'reschedule',
    'retryPublishJob',
    'cancelPublishJob',
    '/api/admin/wiki/settings',
  ]) {
    forbidText("queue scheduling boundary", queueSection, forbidden);
  }
  requireText(
    "queue shared soft-delete",
    queueSection,
    'onClick={() => void deleteSelectedArticles()}',
  );
}

if (
  packageJson.scripts?.["check:wiki-publication-queue-readonly"] !==
  "node scripts/check-wiki-publication-queue-readonly.mjs"
) {
  failures.push("package.json is missing check:wiki-publication-queue-readonly");
}

for (const areaId of ["wiki", "wiki-guard-tooling"]) {
  const area = registry.areas?.find((entry) => entry.id === areaId);
  if (!area?.guards?.includes("check:wiki-publication-queue-readonly")) {
    failures.push(`${areaId} does not require check:wiki-publication-queue-readonly`);
  }
}

const transpiled = ts.transpileModule(helper, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled, "utf8").toString("base64")}`;
const queueModule = await import(moduleUrl);

function article(overrides) {
  return {
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
  };
}

const queue = queueModule.buildWikiPublicationQueue([
  article({ stableId: "plain-draft" }),
  article({ stableId: "deleted-job", deletedAt: "2026-07-17T00:00:00.000Z", publishJobStatus: "failed" }),
  article({ stableId: "later", status: "scheduled", pendingPublishAt: "2026-07-20T08:00:00.000Z", publishJobStatus: "queued", publicationPriority: 1 }),
  article({ stableId: "tie-low", status: "scheduled", pendingPublishAt: "2026-07-19T08:00:00.000Z", publishJobStatus: "queued", publicationPriority: 2 }),
  article({ stableId: "tie-high", status: "scheduled", pendingPublishAt: "2026-07-19T08:00:00.000Z", publishJobStatus: "running", publicationPriority: 9 }),
  article({ stableId: "failed-no-date", publishJobStatus: "failed", publishJobError: "boom" }),
  article({ stableId: "retry", scheduledFor: "2026-07-18T08:00:00.000Z", publishJobStatus: "retry" }),
]);

const actualOrder = queue.map((entry) => entry.stableId).join(",");
const expectedOrder = "retry,tie-high,tie-low,later,failed-no-date";
if (actualOrder !== expectedOrder) {
  failures.push(`queue order mismatch: expected ${expectedOrder}, received ${actualOrder}`);
}

const summary = queueModule.summarizeWikiPublicationQueue(queue, true);
const expectedSummary = {
  total: 5,
  queued: 2,
  running: 1,
  retrying: 1,
  failed: 1,
  nextPublishAt: "2026-07-18T08:00:00.000Z",
  publishingPaused: true,
};
for (const [key, value] of Object.entries(expectedSummary)) {
  if (summary[key] !== value) {
    failures.push(`summary.${key}: expected ${value}, received ${summary[key]}`);
  }
}

if (failures.length) {
  console.error("Wiki publication queue read-only check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki publication queue read-only check passed.");
console.log("- deleted and unscheduled draft rows are excluded");
console.log("- queued, running, retry, and failed jobs remain visible");
console.log("- queue order is deterministic by time, priority, and stable ID");
console.log("- queue summary reports the next slot, paused state, and job counts");
console.log("- queue scheduling stays read-only; shared soft-delete is the only mutation exposed");
