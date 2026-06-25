import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/report-output/chart-form-report-flow.ts",
  "components/ChartFormReportFlowClient.tsx",
  "app/engine/report-flow/page.tsx",
  "scripts/check-chart-form-report-flow.mjs",
];

const flowExports = [
  "CHART_FORM_REPORT_FLOW_VERSION",
  "buildChartFormReportFlow",
  "normalizeChartFormReportFlowInput",
  "buildPrototypePlacements",
  "buildPrototypeLongitude",
  "buildFlowSeed",
  "buildReportFlowTitle",
  "buildReportFlowId",
  "getChartFormReportFlowManualQaSteps",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const flowSource = readFileSync(requiredFiles[0], "utf8");
const clientSource = readFileSync(requiredFiles[1], "utf8");
const pageSource = readFileSync(requiredFiles[2], "utf8");
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

for (const exportName of flowExports) {
  if (
    !flowSource.includes(`export function ${exportName}`) &&
    !flowSource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing chart form report flow export: ${exportName}`);
  }
}

for (const marker of [
  "buildNormalizedChart",
  "buildChartReportEnrichment",
  "buildRealChartReportCopy",
  "prototype-symbolic-flow",
  "/engine/report-flow",
]) {
  if (!flowSource.includes(marker)) {
    failures.push(`Flow source missing marker: ${marker}`);
  }
}

for (const marker of [
  '"use client"',
  "ChartReportBridgePanel",
  "ساخت گزارش نمونه",
  "Manual QA کوتاه",
  "prototype symbolic flow",
]) {
  if (!clientSource.includes(marker)) {
    failures.push(`Client flow component missing marker: ${marker}`);
  }
}

for (const marker of [
  "ChartFormReportFlowPage",
  "ChartFormReportFlowClient",
  "تست مسیر ساخت گزارش از فرم تولد",
]) {
  if (!pageSource.includes(marker)) {
    failures.push(`Flow page missing marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:chart-form-report-flow"] !==
  "node scripts/check-chart-form-report-flow.mjs"
) {
  failures.push("Missing package script: check:chart-form-report-flow");
}

if (!checkReports.includes("pnpm run check:chart-form-report-flow")) {
  failures.push("check:reports does not run check:chart-form-report-flow");
}

if (!checkProject.includes("pnpm run check:chart-form-report-flow")) {
  failures.push("check:project does not run check:chart-form-report-flow");
}

if (failures.length > 0) {
  console.error("Chart form report flow check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Chart form report flow check passed for 4 files.");
