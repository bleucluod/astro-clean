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

const schedulingSource = read("lib/wiki/wiki-scheduling.ts");
const schedulingModule = await importTypescriptModule(schedulingSource);
const schedulingUrl = `data:text/javascript;base64,${Buffer.from(
  ts.transpileModule(schedulingSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  "utf8",
).toString("base64")}`;
const helperSource = read("lib/wiki/wiki-bulk-scheduling.ts");
const helperModule = await importTypescriptModule(
  helperSource,
  new Map([["@/lib/wiki/wiki-scheduling", schedulingUrl]]),
);

if (typeof schedulingModule.computeWikiScheduleSlots !== "function") {
  failures.push("scheduler did not export computeWikiScheduleSlots");
}
if (typeof helperModule.planWikiBulkSchedule !== "function") {
  failures.push("bulk scheduler did not export planWikiBulkSchedule");
} else {
  const settings = {
    articlesPerWeek: 5,
    maxArticlesPerDay: 2,
    allowedWeekdays: [6, 0, 1, 2, 3, 4],
    publishTime: "10:00",
    timezone: "Asia/Tehran",
    minimumIntervalHours: 3,
    blackoutDates: [],
    pillarBeforeSupport: true,
    maxHorizonDays: 30,
    publishingPaused: false,
  };
  const previewedAt = "2026-07-17T08:00:00.000Z";
  const candidates = [
    {
      articleId: "00000000-0000-4000-8000-000000000002",
      stableId: "support-two",
      title: "Support",
      slug: "support-two",
      contentVersion: 2,
      publicationPriority: 10,
      contentCluster: "cluster",
      articleRole: "support",
      draftUpdatedAt: "2026-07-17T07:00:00.000Z",
      snapshotFingerprint: "support-fingerprint",
      dependencyStableIds: ["pillar-one"],
    },
    {
      articleId: "00000000-0000-4000-8000-000000000001",
      stableId: "pillar-one",
      title: "Pillar",
      slug: "pillar-one",
      contentVersion: 1,
      publicationPriority: 5,
      contentCluster: "cluster",
      articleRole: "pillar",
      draftUpdatedAt: "2026-07-17T06:00:00.000Z",
      snapshotFingerprint: "pillar-fingerprint",
      dependencyStableIds: ["published-external"],
    },
  ];
  const base = {
    candidates,
    settings,
    existingJobs: [],
    publishedStableIds: ["published-external"],
    previewedAt,
  };
  const first = helperModule.planWikiBulkSchedule(base);
  const second = helperModule.planWikiBulkSchedule(base);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    failures.push("identical bulk schedule input was not deterministic");
  }
  if (first.items.map((item) => item.stableId).join(",") !== "pillar-one,support-two") {
    failures.push("dependency order did not place the pillar before support");
  }
  const priorityBeforeRole = helperModule.planWikiBulkSchedule({
    ...base,
    candidates: [
      { ...candidates[0], dependencyStableIds: ["published-external"], publicationPriority: 500 },
      { ...candidates[1], dependencyStableIds: ["published-external"], publicationPriority: 100 },
    ],
  });
  if (priorityBeforeRole.items.map((item) => item.stableId).join(",") !== "support-two,pillar-one") {
    failures.push("publication priority did not order simultaneously ready articles");
  }
  if (!first.planToken || first.planToken.length !== 64) {
    failures.push("bulk schedule plan token is not a sha256 digest");
  }
  const changedDraft = helperModule.planWikiBulkSchedule({
    ...base,
    candidates: candidates.map((candidate, index) =>
      index === 0 ? { ...candidate, draftUpdatedAt: "2026-07-17T07:01:00.000Z" } : candidate,
    ),
  });
  if (changedDraft.planToken === first.planToken) {
    failures.push("draft change did not invalidate the bulk schedule plan token");
  }
  const changedJobs = helperModule.planWikiBulkSchedule({
    ...base,
    existingJobs: [{
      id: "job-1",
      articleId: "00000000-0000-4000-8000-000000000099",
      stableId: "scheduled-external",
      runAt: first.items[0].publishAt,
      status: "queued",
      updatedAt: "2026-07-17T08:00:00.000Z",
    }],
  });
  if (changedJobs.planToken === first.planToken) {
    failures.push("queue change did not invalidate the bulk schedule plan token");
  }

  const scheduledDependencyAt = "2026-07-20T06:30:00.000Z";
  const scheduledDependencyPlan = helperModule.planWikiBulkSchedule({
    ...base,
    candidates: [
      { ...candidates[0], dependencyStableIds: ["scheduled-external"] },
    ],
    existingJobs: [{
      id: "job-scheduled-external",
      articleId: "00000000-0000-4000-8000-000000000099",
      stableId: "scheduled-external",
      runAt: scheduledDependencyAt,
      status: "queued",
      updatedAt: previewedAt,
    }],
    publishedStableIds: [],
  });
  if (Date.parse(scheduledDependencyPlan.items[0].publishAt) <= Date.parse(scheduledDependencyAt)) {
    failures.push("dependent article was not scheduled after its active scheduled dependency");
  }

  for (const count of [1, 2, 9, 50]) {
    const manyCandidates = Array.from({ length: count }, (_, index) => ({
      ...candidates[0],
      articleId: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
      stableId: `bulk-${index + 1}`,
      slug: `bulk-${index + 1}`,
      title: `Bulk ${index + 1}`,
      dependencyStableIds: index === 0 ? ["scheduled-external"] : [`bulk-${index}`],
    }));
    const plan = helperModule.planWikiBulkSchedule({
      ...base,
      settings: {
        ...settings,
        articlesPerWeek: 100,
        maxArticlesPerDay: 4,
        minimumIntervalHours: 8,
        maxHorizonDays: 90,
      },
      candidates: manyCandidates,
      existingJobs: [{
        id: "job-scheduled-external",
        articleId: "00000000-0000-4000-8000-000000000099",
        stableId: "scheduled-external",
        runAt: scheduledDependencyAt,
        status: "queued",
        updatedAt: previewedAt,
      }],
      publishedStableIds: [],
    });
    if (plan.items.length !== count) failures.push(`bulk planner did not schedule ${count} articles`);
  }

  try {
    helperModule.planWikiBulkSchedule({ ...base, settings: { ...settings, publishingPaused: true } });
    failures.push("paused scheduling was accepted");
  } catch (error) {
    if (error?.code !== "WIKI_AUTO_PUBLISH_PAUSED") {
      failures.push(`paused scheduling returned the wrong error: ${String(error)}`);
    }
  }

  try {
    helperModule.planWikiBulkSchedule({
      ...base,
      candidates: [{ ...candidates[0], dependencyStableIds: ["scheduled-external"] }],
      existingJobs: [{
        id: "job-stale-external",
        articleId: "00000000-0000-4000-8000-000000000099",
        stableId: "scheduled-external",
        runAt: "2026-07-16T06:30:00.000Z",
        status: "queued",
        updatedAt: previewedAt,
      }],
      publishedStableIds: [],
    });
    failures.push("past scheduled dependency was accepted");
  } catch (error) {
    if (error?.code !== "WIKI_SCHEDULING_ARTICLE_INVALID") {
      failures.push(`past scheduled dependency returned the wrong error: ${String(error)}`);
    }
  }
  try {
    helperModule.planWikiBulkSchedule({ ...base, publishedStableIds: [] });
    failures.push("missing published dependency was accepted");
  } catch (error) {
    if (error?.code !== "WIKI_SCHEDULING_ARTICLE_INVALID") {
      failures.push(`missing dependency returned the wrong error: ${String(error)}`);
    }
  }
  try {
    helperModule.planWikiBulkSchedule({
      ...base,
      candidates: candidates.map((candidate) => ({
        ...candidate,
        dependencyStableIds: [candidate.stableId === "pillar-one" ? "support-two" : "pillar-one"],
      })),
      publishedStableIds: [],
    });
    failures.push("dependency cycle was accepted");
  } catch (error) {
    if (!String(error).includes("dependency graph contains a cycle")) {
      failures.push(`dependency cycle returned the wrong error: ${String(error)}`);
    }
  }
}

const route = read("app/api/admin/wiki/publication-schedule/route.ts");
const service = read("lib/wiki/wiki-cms-service.ts");
const panel = read("components/admin/WikiAdminPanel.tsx");
const clientResponse = read("lib/admin/admin-client-response.ts");
const queueGuard = read("scripts/check-wiki-publication-queue-readonly.mjs");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

requireText("bulk route", route, 'requireAdminCapability(request, "wiki.publish.write")');
requireText("bulk route", route, 'action === "preview"');
requireText("bulk route", route, 'action === "apply"');
requireText("bulk route", route, "bulkScheduleErrorResponse");
requireText("bulk route", route, "WikiBulkScheduleError");
requireText("bulk service", service, "return sql.begin(async (tx) =>");
requireText("bulk service", service, "for update of article, draft");
requireText("bulk service", service, "Wiki bulk schedule changed after preview");
requireText("bulk service", service, "admin.wiki.bulk_schedule_applied");
requireText("bulk panel", panel, "selectedCanBeScheduled");
requireText(
  "bulk panel",
  panel,
  "selectedVisibleIds.length === selectedBulkEligibleIds.length",
);
requireText("bulk panel", panel, "disabled={!selectedCanBeScheduled}");
requireText("bulk panel", panel, "readAdminJsonResponse(response)");
requireText("admin response parser", clientResponse, "response.headers.get(\"content-type\")");
requireText("bulk panel", panel, "پیش‌نمایش زمان‌بندی");
requireText("bulk panel", panel, "اعمال همین برنامه");
forbidText("bulk panel", panel, "انتخاب همهٔ واجد شرایط");
requireText(
  "queue scheduling guard",
  queueGuard,
  'forbidText("queue scheduling boundary", queueSection, forbidden)',
);
requireText(
  "queue scheduling guard",
  queueGuard,
  "'/api/admin/wiki/publication-schedule'",
);

if (
  packageJson.scripts?.["check:wiki-bulk-scheduling"] !==
  "node scripts/check-wiki-bulk-scheduling.mjs"
) {
  failures.push("package.json is missing check:wiki-bulk-scheduling");
}
for (const id of ["wiki", "wiki-guard-tooling"]) {
  const area = impact.areas?.find((entry) => entry.id === id);
  if (!area?.guards?.includes("check:wiki-bulk-scheduling")) {
    failures.push(`${id} does not require check:wiki-bulk-scheduling`);
  }
}

if (failures.length > 0) {
  console.error("Wiki bulk scheduling check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki bulk scheduling check passed.");
console.log("- shared mark-all stays general while schedule preview requires only eligible saved drafts");
console.log("- preview order and slots are deterministic and dependency-aware");
console.log("- draft, settings, or queue changes invalidate the plan token");
console.log("- apply rechecks the plan and writes the whole batch in one transaction");
console.log("- Batch 4 bulk scheduling remains isolated from per-job queue operations");
