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

async function importTypescriptModule(source, replacements = new Map()) {
  let transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  for (const [specifier, replacement] of replacements) {
    transpiled = transpiled.replaceAll(`from "${specifier}"`, `from "${replacement}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(transpiled, "utf8").toString("base64")}`;
  return import(url);
}

const typeStubUrl = `data:text/javascript;base64,${Buffer.from("export {};", "utf8").toString("base64")}`;
const positionSource = read("lib/wiki/wiki-queue-priority.ts");
const positionModule = await importTypescriptModule(
  positionSource,
  new Map([["@/lib/wiki/wiki-cms-types", typeStubUrl]]),
);
const queueSource = read("lib/wiki/wiki-publication-queue.ts");
const queueModule = await importTypescriptModule(
  queueSource,
  new Map([["@/lib/wiki/wiki-cms-types", typeStubUrl]]),
);
const schedulingSource = read("lib/wiki/wiki-scheduling.ts");
const schedulingTranspiled = ts.transpileModule(schedulingSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replaceAll(`from "@/lib/wiki/wiki-cms-types"`, `from "${typeStubUrl}"`);
const schedulingUrl = `data:text/javascript;base64,${Buffer.from(schedulingTranspiled, "utf8").toString("base64")}`;
const reflowSource = read("lib/wiki/wiki-queue-reflow.ts");
let reflowTranspiled = ts.transpileModule(reflowSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
reflowTranspiled = reflowTranspiled
  .replaceAll(`from "@/lib/wiki/wiki-cms-types"`, `from "${typeStubUrl}"`)
  .replaceAll(`from "@/lib/wiki/wiki-queue-priority"`, `from "${typeStubUrl}"`)
  .replaceAll(`from "@/lib/wiki/wiki-scheduling"`, `from "${schedulingUrl}"`);
const reflowUrl = `data:text/javascript;base64,${Buffer.from(reflowTranspiled, "utf8").toString("base64")}`;
const reflowModule = await import(reflowUrl);
const importMergeSource = read("lib/wiki/wiki-import-merge.ts");
const importMergeModule = await importTypescriptModule(
  importMergeSource,
  new Map([
    ["@/lib/wiki/wiki-cms-types", typeStubUrl],
    ["@/lib/wiki/wiki-queue-priority", typeStubUrl],
    ["@/lib/wiki/wiki-queue-reflow", reflowUrl],
  ]),
);
const importServiceSource = read("lib/wiki/wiki-import-service.ts");
const cmsServiceSource = read("lib/wiki/wiki-cms-service.ts");
if (!importServiceSource.includes('return sql.begin((tx) => applyImport(tx));') ||
    !importServiceSource.includes('if (input.mode === "merge_queue") throw error;') ||
    !cmsServiceSource.includes('database?: TransactionSql;')) {
  failures.push("merge import is not enclosed by one database transaction");
}

const candidates = [
  {
    jobId: "job-pillar",
    articleId: "article-pillar",
    revisionNumber: 1,
    stableId: "pillar",
    title: "Pillar",
    articleRole: "pillar",
    contentCluster: "cluster",
    publicationPriority: 70,
    dependencyStableIds: [],
    currentRunAt: "2026-07-19T06:30:00.000Z",
    status: "queued",
    updatedAt: "2026-07-18T01:00:00.000Z",
  },
  {
    jobId: "job-independent",
    articleId: "article-independent",
    revisionNumber: 1,
    stableId: "independent",
    title: "Independent",
    articleRole: "support",
    contentCluster: "cluster",
    publicationPriority: 150,
    dependencyStableIds: [],
    currentRunAt: "2026-07-20T06:30:00.000Z",
    status: "retry",
    updatedAt: "2026-07-18T01:00:01.000Z",
  },
  {
    jobId: "job-dependent",
    articleId: "article-dependent",
    revisionNumber: 1,
    stableId: "dependent",
    title: "Dependent",
    articleRole: "support",
    contentCluster: "cluster",
    publicationPriority: 5,
    dependencyStableIds: ["pillar"],
    currentRunAt: "2026-07-21T06:30:00.000Z",
    status: "queued",
    updatedAt: "2026-07-18T01:00:02.000Z",
  },
];

const reflowCandidates = Array.from({ length: 120 }, (_, index) => ({
  jobId: `job-${index}`,
  articleId: `article-${index}`,
  revisionNumber: 1,
  stableId: `article-${index}`,
  title: `Article ${index}`,
  articleRole: index % 10 === 0 ? "pillar" : "support",
  contentCluster: `cluster-${index % 5}`,
  publicationPriority: 120 - index,
  dependencyStableIds: index > 0 && index % 10 === 1 ? [`article-${index - 1}`] : [],
  currentRunAt: new Date(Date.UTC(2026, 7, 5 + index, 5, 30)).toISOString(),
  status: index % 7 === 0 ? "retry" : "queued",
  updatedAt: new Date(Date.UTC(2026, 7, 4, 1, index % 60)).toISOString(),
}));
const reflowSettings = {
  articlesPerWeek: 28,
  maxArticlesPerDay: 4,
  allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
  publishTime: "09:00",
  timezone: "Asia/Tehran",
  minimumIntervalHours: 3,
  blackoutDates: ["2026-08-10"],
  pillarBeforeSupport: true,
  maxHorizonDays: 120,
  publishingPaused: false,
};
const reflowInput = {
  candidates: reflowCandidates,
  lockedJobs: [{ jobId: "locked", stableId: "locked", runAt: "2026-08-05T05:30:00.000Z", status: "running" }],
  publishedStableIds: [],
  settings: reflowSettings,
  previousDailyCapacity: 2,
  policy: "preserve",
  previewedAt: "2026-08-04T00:00:00.000Z",
};
const reflowPlan = reflowModule.planWikiQueueReflow(reflowInput);
if (reflowPlan.items.length !== 120 || reflowPlan.totalFutureJobs !== 121) {
  failures.push("queue-wide reflow did not support more than 100 jobs");
}
const perTehranDay = new Map();
for (const item of reflowPlan.items) {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.nextRunAt));
  perTehranDay.set(key, (perTehranDay.get(key) ?? 0) + 1);
}
if ([...perTehranDay.values()].some((count) => count > 4) || perTehranDay.get("2026-08-10")) {
  failures.push("queue-wide reflow violated daily capacity or blackout dates");
}
if (reflowPlan.lockedJobs[0]?.runAt !== "2026-08-05T05:30:00.000Z") {
  failures.push("queue-wide reflow moved a running job");
}
const changedReflow = reflowModule.planWikiQueueReflow({
  ...reflowInput,
  candidates: reflowCandidates.map((candidate, index) => index === 0 ? { ...candidate, updatedAt: "2026-08-04T09:00:00.000Z" } : candidate),
});
if (changedReflow.planToken === reflowPlan.planToken) failures.push("reflow token ignored a queue version change");
const undoPlan = reflowModule.planWikiQueueReflowUndo({
  sourcePlanToken: reflowPlan.planToken,
  snapshotItems: reflowCandidates.slice(0, 3).map((candidate) => ({ jobId: candidate.jobId, articleId: candidate.articleId, stableId: candidate.stableId, runAt: candidate.currentRunAt })),
  candidates: reflowCandidates.slice(0, 2),
  occupiedRunAt: [],
  previewedAt: "2026-08-04T00:00:00.000Z",
});
if (undoPlan.restorableCount !== 2 || undoPlan.skippedCount !== 1) {
  failures.push("undo did not skip a job that is no longer mutable");
}
const mergeSnapshot = (index) => ({
  stableId: `fresh-${index}`, slug: `fresh-${index}`, title: `Fresh ${index}`,
  shortTitle: `Fresh ${index}`, seoTitle: null, metaDescription: "description",
  categoryId: "foundations", tags: [], summary: "summary", intro: "intro",
  readingMinutes: 5, publicationPriority: 200 - index,
  contentCluster: `cluster-${index % 2}`, articleRole: index === 0 ? "pillar" : "support",
  relatedArticleIds: index === 1 ? ["fresh-0"] : [], indexable: true,
  bodyMarkdown: "content", keyPoints: [], sections: [], contextLinks: [], sources: [],
  callToAction: null, contentVersion: 1,
});
const mergePlan = importMergeModule.planWikiImportMerge({
  packageHash: "a".repeat(64),
  existingCandidates: reflowCandidates.slice(0, 5),
  newCandidates: [0, 1].map((index) => ({
    snapshot: mergeSnapshot(index),
    snapshotFingerprint: importMergeModule.fingerprintWikiImportSnapshot(mergeSnapshot(index)),
  })),
  lockedJobs: [], publishedStableIds: [], settings: reflowSettings,
  previousDailyCapacity: 2, policy: "preserve", quarantinedArticleCount: 3,
  previewedAt: "2026-08-04T00:00:00.000Z",
});
if (mergePlan.validArticleCount !== 2 || mergePlan.quarantinedArticleCount !== 3 ||
    mergePlan.queue.items.filter((item) => item.jobId.startsWith("new:")).length !== 2) {
  failures.push("merge preview did not combine valid articles and quarantine diagnostics");
}
const changedPackagePlan = importMergeModule.planWikiImportMerge({
  packageHash: "b".repeat(64),
  existingCandidates: reflowCandidates.slice(0, 5),
  newCandidates: [0, 1].map((index) => ({ snapshot: mergeSnapshot(index), snapshotFingerprint: importMergeModule.fingerprintWikiImportSnapshot(mergeSnapshot(index)) })),
  lockedJobs: [], publishedStableIds: [], settings: reflowSettings,
  previousDailyCapacity: 2, policy: "preserve", quarantinedArticleCount: 3,
  previewedAt: "2026-08-04T00:00:00.000Z",
});
if (mergePlan.planToken === changedPackagePlan.planToken) failures.push("merge token ignored the package hash");
const frozenInput = JSON.stringify(candidates);
const baseInput = {
  candidates,
  publishedStableIds: [],
  pillarBeforeSupport: false,
  targetJobId: "job-independent",
  targetPosition: 1,
  expectedUpdatedAt: "2026-07-18T01:00:01.000Z",
  previewedAt: "2026-07-18T02:00:00.000Z",
};
const first = positionModule.planWikiQueuePositionMove(baseInput);
const second = positionModule.planWikiQueuePositionMove(baseInput);
if (JSON.stringify(first) !== JSON.stringify(second)) {
  failures.push("identical queue position input was not deterministic");
}
if (JSON.stringify(candidates) !== frozenInput) {
  failures.push("queue position planning mutated its input");
}
if (
  first.items.map((item) => item.stableId).join(",") !==
  "independent,pillar,dependent"
) {
  failures.push("direct move did not produce the requested valid queue order");
}
if (first.appliedPosition !== 1 || first.constrained) {
  failures.push("valid direct move reported the wrong applied position");
}
if (first.items.some((item) => "nextPublicationPriority" in item)) {
  failures.push("queue position planning still rewrites semantic publication priorities");
}
const originalSlots = candidates.map((candidate) => candidate.currentRunAt).sort().join(",");
const plannedSlots = first.items.map((item) => item.nextRunAt).sort().join(",");
if (plannedSlots !== originalSlots) {
  failures.push("position move did not preserve the existing publication slots");
}

const constrained = positionModule.planWikiQueuePositionMove({
  ...baseInput,
  targetJobId: "job-dependent",
  targetPosition: 1,
  expectedUpdatedAt: "2026-07-18T01:00:02.000Z",
});
if (
  constrained.appliedPosition !== 2 ||
  !constrained.constrained ||
  constrained.items.map((item) => item.stableId).join(",") !==
    "pillar,dependent,independent"
) {
  failures.push("dependency constraint did not move the article to the nearest valid position");
}

const changedVersion = positionModule.planWikiQueuePositionMove({
  ...baseInput,
  candidates: candidates.map((candidate) =>
    candidate.jobId === "job-independent"
      ? { ...candidate, updatedAt: "2026-07-18T01:01:00.000Z" }
      : candidate,
  ),
  expectedUpdatedAt: "2026-07-18T01:01:00.000Z",
});
if (changedVersion.planToken === first.planToken) {
  failures.push("job version change did not invalidate the position token");
}
try {
  positionModule.planWikiQueuePositionMove({
    ...baseInput,
    candidates: candidates.map((candidate, index) =>
      index === 0 ? { ...candidate, status: "running" } : candidate,
    ),
  });
  failures.push("running job was accepted into the position queue");
} catch (error) {
  if (!String(error).includes("queued or retry")) {
    failures.push(`running job returned the wrong error: ${String(error)}`);
  }
}
try {
  positionModule.planWikiQueuePositionMove({
    ...baseInput,
    candidates: candidates.slice(0, 2).map((candidate, index) => ({
      ...candidate,
      dependencyStableIds: [index === 0 ? "independent" : "pillar"],
    })),
    targetJobId: "job-pillar",
    targetPosition: 1,
    expectedUpdatedAt: "2026-07-18T01:00:00.000Z",
  });
  failures.push("position dependency cycle was accepted");
} catch (error) {
  if (!String(error).includes("dependency graph contains a cycle")) {
    failures.push(`position cycle returned the wrong error: ${String(error)}`);
  }
}

function article(overrides) {
  return {
    id: overrides.stableId,
    stableId: overrides.stableId,
    slug: overrides.stableId,
    title: overrides.stableId,
    categoryId: "foundations",
    status: "scheduled",
    indexable: false,
    contentVersion: 1,
    articleRole: "support",
    contentCluster: "cluster",
    publicationPriority: 0,
    publishedAt: null,
    scheduledFor: null,
    deletedAt: null,
    hasDraft: false,
    pendingPublishAt: null,
    publishJobStatus: "queued",
    publishJobError: null,
    updatedAt: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}
const queue = queueModule.buildWikiPublicationQueue([
  article({
    stableId: "running",
    pendingPublishAt: "2026-07-18T06:30:00.000Z",
    publishJobStatus: "running",
  }),
  article({
    stableId: "second",
    pendingPublishAt: "2026-07-20T06:30:00.000Z",
    publishJobStatus: "retry",
  }),
  article({
    stableId: "first",
    pendingPublishAt: "2026-07-19T06:30:00.000Z",
    publishJobStatus: "queued",
  }),
  article({
    stableId: "failed",
    pendingPublishAt: "2026-07-17T06:30:00.000Z",
    publishJobStatus: "failed",
  }),
]);
const positions = queueModule.getWikiPublicationQueuePositions(queue);
if (positions.get("first") !== 1 || positions.get("second") !== 2) {
  failures.push("queue positions do not follow the real publication schedule");
}
if (positions.has("running") || positions.has("failed")) {
  failures.push("running or failed jobs received a movable queue position");
}
const summary = queueModule.summarizeWikiPublicationQueue(queue, false);
if (summary.nextPublishAt !== "2026-07-19T06:30:00.000Z") {
  failures.push("next publication time did not ignore running and failed jobs");
}

const jobRoute = read("app/api/admin/wiki/publication-jobs/[jobId]/route.ts");
const positionRoute = read("app/api/admin/wiki/publication-priority/route.ts");
const service = read("lib/wiki/wiki-cms-service.ts");
forbidText(
  "queue position service",
  service,
  "set publication_priority = ${item.nextPublicationPriority}",
);
const operations = read("lib/wiki/wiki-queue-operations.ts");
const panel = read("components/admin/WikiAdminPanel.tsx");
const styles = read("components/admin/admin-console.module.css");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

forbidText("job route", jobRoute, '"priority"');
forbidText("job route", jobRoute, "publicationPriority");
requireText("position route", positionRoute, 'action === "preview_move"');
requireText("position route", positionRoute, 'action === "apply_move"');
requireText("position route", positionRoute, "targetPosition");
requireText("position route", positionRoute, 'requireAdminCapability(request, "wiki.publish.write")');
requireText("position service", service, "export async function previewAdminWikiQueuePositionMove");
requireText("position service", service, "export async function applyAdminWikiQueuePositionMove");
requireText("position service", service, "for update of job, article, revision");
requireText("position service", service, "Wiki queue changed after preview");
requireText("position service", service, "admin.wiki.publish_queue_position_changed");
// HALLEUS_WIKI_PRIORITY_REBALANCE_SCOPED_GUARD_R56
const positionMoveServiceStart = service.indexOf(
  "export async function previewAdminWikiQueuePositionMove",
);
const positionMoveServiceEnd = service.indexOf(
  "export async function previewAdminWikiQueueBulkReorder",
  positionMoveServiceStart,
);
if (
  positionMoveServiceStart < 0 ||
  positionMoveServiceEnd <= positionMoveServiceStart
) {
  failures.push("position move service scope could not be isolated");
} else {
  forbidText(
    "position move service",
    service.slice(positionMoveServiceStart, positionMoveServiceEnd),
    "{publicationPriority}",
  );
}
requireText(
  "priority rebalance service",
  service,
  "export async function applyAdminWikiPriorityRebalance",
);
requireText(
  "priority rebalance service",
  service,
  "'{publicationPriority}'",
);
requireText("position service", service, "scheduled_for = case");
requireText("position operations", operations, "canReorder");
requireText("position UI", panel, "جایگاه ۱ یعنی انتشار بعدی");
requireText("position UI", panel, "اول صف");
requireText("position UI", panel, "یک جایگاه بالاتر");
requireText("position UI", panel, "یک جایگاه پایین‌تر");
requireText("position UI", panel, "اعمال تغییر جایگاه");
requireText("position UI", panel, "queuePositionDrafts");
forbidText("position UI", panel, "بیشترین اولویت");
forbidText("position UI", panel, "queuePriorityDrafts");
requireText("position styles", styles, ".queuePositionEditor");
requireText("position styles", styles, ".queuePositionPreview");

if (
  packageJson.scripts?.["check:wiki-queue-priority"] !==
  "node scripts/check-wiki-queue-priority.mjs"
) {
  failures.push("package.json is missing check:wiki-queue-priority");
}
for (const id of ["wiki", "wiki-guard-tooling", "wiki-publication-ops"]) {
  const area = impact.areas?.find((entry) => entry.id === id);
  if (!area?.guards?.includes("check:wiki-queue-priority")) {
    failures.push(`${id} does not require check:wiki-queue-priority`);
  }
}

// HALLEUS_WIKI_PRIORITY_REBALANCE_CHECK_R55
const rebalanceCandidates = Array.from({ length: 73 }, (_, index) => ({
  jobId: `rebalance-job-${index}`,
  articleId: `rebalance-article-${index}`,
  revisionNumber: 1,
  stableId: `rebalance-${index}`,
  title: `Rebalance ${index}`,
  articleRole: index % 12 === 0 ? "pillar" : "support",
  contentCluster: `cluster-${index % 5}`,
  publicationPriority: Math.max(1, 70 - Math.floor(index / 2)),
  dependencyStableIds: [],
  currentRunAt: new Date(Date.UTC(2026, 7, 20, index, 0)).toISOString(),
  status: index % 9 === 0 ? "retry" : "queued",
  updatedAt: new Date(Date.UTC(2026, 7, 19, 1, index)).toISOString(),
}));
const rebalanceInput = {
  candidates: rebalanceCandidates,
  previewedAt: "2026-08-19T00:00:00.000Z",
};
const rebalancePlan = positionModule.planWikiPriorityRebalance(rebalanceInput);
if (
  rebalancePlan.itemCount !== 73 ||
  rebalancePlan.nextMinPriority !== 150 ||
  rebalancePlan.nextMaxPriority !== 280 ||
  rebalancePlan.orderChanged !== false
) {
  failures.push("priority rebalance did not spread a 73-job queue across 150..280");
}
// HALLEUS_WIKI_PRIORITY_HEADROOM_CHECK_R57
if (rebalancePlan.nextMaxPriority >= 281) {
  failures.push("priority rebalance consumed the reserved 281..300 future headroom");
}
if (rebalancePlan.items.some((item) => item.nextPriority < 150 || item.nextPriority > 280)) {
  failures.push("normal-size priority rebalance escaped the 150..280 target band");
}
const reservedUrgentPriority = 290;
if (reservedUrgentPriority <= rebalancePlan.nextMaxPriority) {
  failures.push("future urgent priority does not remain above the rebalanced queue");
}

const priorityRank = rebalanceCandidates.slice().sort((left, right) =>
  right.publicationPriority - left.publicationPriority ||
  Date.parse(left.currentRunAt) - Date.parse(right.currentRunAt) ||
  left.stableId.localeCompare(right.stableId, "en")
).map((candidate) => candidate.stableId).join(",");
if (rebalancePlan.items.map((item) => item.stableId).join(",") !== priorityRank) {
  failures.push("priority rebalance changed semantic priority order");
}
if (new Set(rebalancePlan.items.map((item) => item.nextPriority)).size !== 73) {
  failures.push("priority rebalance did not create unique priority values");
}
if (rebalancePlan.items.some((item, index, items) =>
  index > 0 && items[index - 1].nextPriority <= item.nextPriority
)) {
  failures.push("priority rebalance output is not strictly descending");
}
if (rebalancePlan.items.some((item) => "nextRunAt" in item || "currentRunAt" in item)) {
  failures.push("priority rebalance unexpectedly carries queue time mutations");
}
const rebalanceVersionChange = positionModule.planWikiPriorityRebalance({
  ...rebalanceInput,
  candidates: rebalanceCandidates.map((candidate, index) =>
    index === 0
      ? { ...candidate, updatedAt: "2026-08-19T12:00:00.000Z" }
      : candidate
  ),
});
if (rebalanceVersionChange.planToken === rebalancePlan.planToken) {
  failures.push("priority rebalance token ignored a job version change");
}

if (failures.length > 0) {
  console.error("Wiki queue position check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki queue position check passed.");
console.log("- position 1 is the next queued or retry publication slot");
console.log("- direct, top, up, and down moves preserve existing slots");
console.log("- dependencies and pillar policy constrain moves to a valid position");
console.log("- preview tokens include job versions and reject stale queue state");
console.log("- running and failed jobs never receive a movable queue position");
console.log("- priority rebalance preserves semantic rank while reopening numeric space");
console.log("- priority rebalance reserves 281..300 for future higher-priority articles");
