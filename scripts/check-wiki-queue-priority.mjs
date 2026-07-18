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
forbidText("position service", service, "{publicationPriority}");
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
