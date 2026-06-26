import { readFileSync } from "node:fs";

const failures = [];
const typesSource = readFileSync("types/astro.ts", "utf8");
const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const reportCardSource = readFileSync("components/ReportCard.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "RealEngineReportPlacement",
  "RealEngineReportSnapshot",
  'version: "real-engine-preview-v1"',
  "realEngine?: RealEngineReportSnapshot",
]) {
  if (!typesSource.includes(marker)) {
    failures.push(`types/astro.ts missing real report marker: ${marker}`);
  }
}

for (const marker of [
  "attachRealEngineSnapshotToReport",
  "realEngineResult",
  "realEngine:",
  "/api/engine/real-chart",
  "requestRealEngineReportData",
  "saveGeneratedReport(nextReport)",
  "enrichReportWithRealEngineCopy",
  "router.push(`/reports/${nextReport.id}`)",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm missing real report save marker: ${marker}`);
  }
}

for (const marker of [
  "report.realEngine",
  "report-calculation-section",
  "report.realEngine?.aspects",
  "report-aspect-card",
  "PLANET_LABELS_FA",
  "SIGN_LABELS_FA",
]) {
  if (!reportCardSource.includes(marker)) {
    failures.push(`ReportCard missing product real engine display marker: ${marker}`);
  }
}

if (
  !reportCardSource.includes("report.realEngine.placements") &&
  !reportCardSource.includes("report.realEngine?.placements") &&
  !reportCardSource.includes("shownPlacements")
) {
  failures.push("ReportCard missing real engine placements display marker.");
}

for (const removedMarker of [
  "real engine snapshot",
  "ASC approx",
  "شهر engine",
  "UTC</strong>",
]) {
  if (reportCardSource.includes(removedMarker)) {
    failures.push(`ReportCard still has debug-like marker: ${removedMarker}`);
  }
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

if (failures.length > 0) {
  console.error("Real report save flow check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real report save flow check passed for product report UI.");
