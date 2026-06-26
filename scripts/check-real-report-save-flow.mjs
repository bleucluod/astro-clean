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
  "داده real engine هم داخل گزارش ذخیره شد",
  "snapshot جایگاه‌های واقعی‌تر",
  "/api/engine/real-chart",
  "saveGeneratedReport(nextReport)",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm missing real report save marker: ${marker}`);
  }
}

for (const marker of [
  "report.realEngine",
  "real engine snapshot",
  "داده واقعی‌تر ذخیره‌شده",
  "report.realEngine.placements",
  "ASC approx",
  "PLANET_LABELS_FA",
  "SIGN_LABELS_FA",
]) {
  if (!reportCardSource.includes(marker)) {
    failures.push(`ReportCard missing real engine display marker: ${marker}`);
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

console.log("Real report save flow check passed for 3 files.");
