import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/report-output/real-chart-report-copy.ts",
  "app/engine/report-preview/page.tsx",
  "scripts/check-real-chart-report-preview.mjs",
];

const copyExports = [
  "REAL_CHART_REPORT_COPY_VERSION",
  "buildRealChartReportCopy",
  "buildReadinessCopy",
  "buildPlacementCopy",
  "buildAspectCopy",
  "buildLimitationsCopy",
  "getPointLabel",
  "getSignLabel",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const copySource = readFileSync(requiredFiles[0], "utf8");
const pageSource = readFileSync(requiredFiles[1], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const checkReports = packageJson.scripts?.["check:reports"] ?? "";
const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

for (const exportName of copyExports) {
  if (
    !copySource.includes(`export function ${exportName}`) &&
    !copySource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing real chart report copy export: ${exportName}`);
  }
}

for (const marker of [
  "در زبان نمادین",
  "جایگزین تصمیم پزشکی، حقوقی یا مالی",
  "حمل",
  "حوت",
]) {
  if (!copySource.includes(marker)) {
    failures.push(`Real chart report copy missing marker: ${marker}`);
  }
}

for (const marker of [
  "RealChartReportPreviewPage",
  "ChartReportBridgePanel",
  "buildNormalizedChart",
  "buildChartReportEnrichment",
  "buildRealChartReportCopy",
  "پیش‌نمایش اتصال چارت واقعی به گزارش",
]) {
  if (!pageSource.includes(marker)) {
    failures.push(`Preview page missing marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:real-chart-report-preview"] !==
  "node scripts/check-real-chart-report-preview.mjs"
) {
  failures.push("Missing package script: check:real-chart-report-preview");
}

if (!checkReports.includes("pnpm run check:real-chart-report-preview")) {
  failures.push("check:reports does not run check:real-chart-report-preview");
}

if (!checkProject.includes("pnpm run check:real-chart-report-preview")) {
  failures.push("check:project does not run check:real-chart-report-preview");
}

if (failures.length > 0) {
  console.error("Real chart report preview check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real chart report preview check passed for 3 files.");
