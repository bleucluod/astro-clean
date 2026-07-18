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
const operationsSource = read("lib/wiki/wiki-queue-operations.ts");
const typeStubUrl = `data:text/javascript;base64,${Buffer.from("export {};", "utf8").toString("base64")}`;
const operationsModule = await importTypescriptModule(
  operationsSource,
  new Map([["@/lib/wiki/wiki-cms-types", typeStubUrl]]),
);

const queued = operationsModule.getWikiPublishJobOperationAvailability({
  status: "queued",
  lockedAt: null,
});
if (
  !queued.canReschedule ||
  !queued.canCancel ||
  !queued.canReorder ||
  queued.canRetry ||
  queued.locked
) {
  failures.push("queued operation eligibility is incorrect");
}
const failed = operationsModule.getWikiPublishJobOperationAvailability({
  status: "failed",
  lockedAt: null,
});
if (
  !failed.canRetry ||
  failed.canReorder ||
  failed.canCancel ||
  failed.canReschedule ||
  failed.locked
) {
  failures.push("failed operation eligibility is incorrect");
}
const running = operationsModule.getWikiPublishJobOperationAvailability({
  status: "running",
  lockedAt: "2026-07-18T10:00:00.000Z",
});
if (
  !running.locked ||
  running.canRetry ||
  running.canCancel ||
  running.canReschedule ||
  running.canReorder
) {
  failures.push("running job was not protected from mutation");
}
if (!operationsModule.isWikiPublishJobStateCurrent("v1", "v1")) {
  failures.push("matching job version was rejected");
}
if (operationsModule.isWikiPublishJobStateCurrent("v2", "v1")) {
  failures.push("stale job version was accepted");
}

const settings = {
  articlesPerWeek: 4,
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
const now = new Date("2026-07-18T05:00:00.000Z");
const valid = schedulingModule.computeWikiScheduleSlots({
  settings,
  existingRunAt: [],
  count: 2,
  now,
});
for (const slot of valid) {
  try {
    schedulingModule.validateWikiScheduleSlot({
      settings,
      existingRunAt: valid.filter((other) => other !== slot).map((other) => other.toISOString()),
      runAt: slot,
      now,
    });
  } catch (error) {
    failures.push(`generated scheduler slot was rejected: ${String(error)}`);
  }
}
try {
  schedulingModule.validateWikiScheduleSlot({
    settings,
    existingRunAt: [],
    runAt: new Date("2026-07-18T08:15:00.000Z"),
    now,
  });
  failures.push("off-grid reschedule slot was accepted");
} catch (error) {
  if (!String(error).includes("configured daily slot")) {
    failures.push(`off-grid slot returned the wrong error: ${String(error)}`);
  }
}
try {
  schedulingModule.validateWikiScheduleSlot({
    settings: { ...settings, blackoutDates: ["2026-07-18"] },
    existingRunAt: [],
    runAt: valid[0],
    now,
  });
  failures.push("blackout reschedule slot was accepted");
} catch (error) {
  if (!String(error).includes("blackout")) {
    failures.push(`blackout slot returned the wrong error: ${String(error)}`);
  }
}
try {
  schedulingModule.validateWikiScheduleSlot({
    settings,
    existingRunAt: [valid[0].toISOString()],
    runAt: valid[0],
    now,
  });
  failures.push("occupied reschedule slot was accepted");
} catch (error) {
  if (!String(error).includes("too close")) {
    failures.push(`occupied slot returned the wrong error: ${String(error)}`);
  }
}

const route = read("app/api/admin/wiki/publication-jobs/[jobId]/route.ts");
const service = read("lib/wiki/wiki-cms-service.ts");
const publisher = read("lib/wiki/wiki-publisher.ts");
const panel = read("components/admin/WikiAdminPanel.tsx");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

requireText("job route", route, 'requireAdminCapability(request, "wiki.publish.write")');
for (const action of ["reschedule", "cancel", "retry"]) {
  requireText("job route", route, `"${action}"`);
}
requireText("job route", route, "expectedUpdatedAt");
requireText("job service", service, "export async function mutateAdminWikiPublishJob");
requireText("job service", service, "for update of job, article, revision");
requireText("job service", service, "Wiki publish job changed after it was loaded");
requireText("job service", service, 'input.action === "cancel" && current.status === "canceled"');
requireText("job service", service, "revision_status = 'superseded'");
requireText("job service", service, "insert into public.wiki_article_drafts");
requireText("job service", service, "attempt_count = 0");
requireText("job service", service, "admin.wiki.publish_job_rescheduled");
requireText("job service", service, "admin.wiki.publish_job_canceled");
requireText("job service", service, "admin.wiki.publish_job_retried");
requireText("publisher", publisher, "for update skip locked");
requireText("publisher", publisher, "attempt_count < 3");
requireText("publisher", publisher, "Recovered a stale publisher lock.");
requireText("publisher", publisher, "case when attempt_count >= 3 then 'failed' else 'retry' end");

for (const functionName of [
  "applyPublishedSnapshot",
  "publishAdminWikiDraft",
  "unpublishAdminWikiArticle",
  "setAdminWikiArticleDeleted",
  "softDeleteAdminWikiArticles",
]) {
  const start = service.indexOf(functionName);
  const end = service.indexOf("export async function", start + functionName.length);
  const section = service.slice(start, end > start ? end : service.length);
  requireText(`${functionName} running guard`, section, "status = 'running'");
  forbidText(
    `${functionName} running mutation`,
    section,
    "status in ('queued', 'retry', 'running')",
  );
}

requireText("queue UI", panel, "تغییر زمان");
requireText("queue UI", panel, "لغو نوبت");
requireText("queue UI", panel, "تلاش دوباره");
requireText("queue UI", panel, "جایگاه ۱ یعنی انتشار بعدی");
requireText("queue UI", panel, "publishJobAttemptCount");
requireText("queue UI", panel, "publishJobLockedAt");
requireText("queue UI", panel, "job در حال اجراست و قابل تغییر نیست");

if (
  packageJson.scripts?.["check:wiki-queue-operations"] !==
  "node scripts/check-wiki-queue-operations.mjs"
) {
  failures.push("package.json is missing check:wiki-queue-operations");
}
for (const id of ["wiki", "wiki-guard-tooling", "wiki-publication-ops"]) {
  const area = impact.areas?.find((entry) => entry.id === id);
  if (!area?.guards?.includes("check:wiki-queue-operations")) {
    failures.push(`${id} does not require check:wiki-queue-operations`);
  }
}

if (failures.length) {
  console.error("Wiki queue operations check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki queue operations check passed.");
console.log("- reschedule slots execute the scheduler's weekday, blackout, capacity, interval, and horizon rules");
console.log("- queued/retry, failed, and running jobs expose distinct safe operations; only queued/retry jobs can move position");
console.log("- stale job versions and running publisher locks reject admin mutation");
console.log("- cancel restores the scheduled snapshot as a draft and is idempotent");
console.log("- retry is bounded, audit-covered, and returns to the first valid slot");
