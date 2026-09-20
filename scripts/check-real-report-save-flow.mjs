import { readFileSync } from "node:fs";

const failures = [];
const typesSource = readFileSync("types/astro.ts", "utf8");
const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const reportDetailPageSource = readFileSync("app/reports/[reportId]/page.tsx", "utf8");
const reportDetailSource = readFileSync("components/ReportDetail.tsx", "utf8");
const saveClientSource = readFileSync("lib/storage/account-report-save-client.ts", "utf8");
const reportCardSource = readFileSync("components/ReportCard.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "RealEngineReportPlacement",
  "RealEngineReportSnapshot",
  'version: "real-engine-preview-v1"',
  "realEngine?: RealEngineReportSnapshot",
]) {
  if (!typesSource.includes(marker)) failures.push(`types/astro.ts missing ${marker}`);
}

for (const marker of [
  "attachRealEngineSnapshotToReport",
  "realEngineResult",
  "realEngine:",
  "/api/engine/real-chart",
  "requestRealEngineReportData",
  "saveGeneratedReportWithAccountFallback",
  "buildReportSaveFallbackMessage",
  "const nextPath = `/reports/${saveResult.accountRecord.id}?source=account`;",
  "enrichReportWithRealEngineCopy",
]) {
  if (!chartFormSource.includes(marker)) failures.push(`ChartForm missing ${marker}`);
}

for (const marker of [
  "HALLEUS_SERVER_CANONICAL_REPORT_SAVE_R1_20260919",
  'fetch("/api/reports/owner"',
  "createSafeAccountReportSaveMessage",
]) {
  if (!saveClientSource.includes(marker)) failures.push(`save client missing ${marker}`);
}

for (const marker of [
  'export const dynamic = "force-dynamic"',
  'return "account";',
]) {
  if (!reportDetailPageSource.includes(marker)) failures.push(`detail page missing ${marker}`);
}

for (const marker of [
  "initialReport?: AstrologyReport | null",
  "useState<AstrologyReport | null>(() =>",
  'if (reportSource === "public" && initialReport)',
  "reportId={report.id}",
]) {
  if (!reportDetailSource.includes(marker)) failures.push(`ReportDetail missing ${marker}`);
}

if (reportDetailSource.includes("window.setTimeout")) {
  failures.push("ReportDetail still defers report loading through a timer.");
}

for (const marker of [
  "report.realEngine",
  "report-calculation-section",
  "report.realEngine?.aspects",
  "report-aspect-card",
  "PLANET_LABELS_FA",
]) {
  if (!reportCardSource.includes(marker)) failures.push(`ReportCard missing ${marker}`);
}

if (
  packageJson.scripts?.["check:real-report-save-flow"] !==
  "node scripts/check-real-report-save-flow.mjs"
) {
  failures.push("Missing package script: check:real-report-save-flow");
}

if (!checkProject.includes("pnpm run check:real-report-save-flow")) {
  failures.push("check:project does not run check:real-report-save-flow");
}

if (failures.length) {
  console.error("Real report save flow check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Real report save flow check passed for server-canonical product UI.");
