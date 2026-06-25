import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/report-output/report-real-chart-bridge.ts",
  "components/ChartReportBridgePanel.tsx",
  "components/ReportDetail.tsx",
  "scripts/check-report-real-chart-bridge.mjs",
];

const bridgeExports = [
  "REPORT_REAL_CHART_BRIDGE_VERSION",
  "buildReportRealChartBridge",
  "hasReportRealChartBridgeData",
  "getReportRealChartBridgeTitle",
  "getReportRealChartBridgeDescription",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const bridgeSource = readFileSync(requiredFiles[0], "utf8");
const componentSource = readFileSync(requiredFiles[1], "utf8");
const detailSource = readFileSync(requiredFiles[2], "utf8");
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

for (const exportName of bridgeExports) {
  if (
    !bridgeSource.includes(`export function ${exportName}`) &&
    !bridgeSource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing bridge export: ${exportName}`);
  }
}

for (const marker of ["ready", "partial", "pending", "chartReportEnrichment", "normalizedChart"]) {
  if (!bridgeSource.includes(marker)) {
    failures.push(`Bridge source missing marker: ${marker}`);
  }
}

for (const marker of [
  "ChartReportBridgePanel",
  "buildReportRealChartBridge",
  "Real chart bridge",
  "گزارش‌های قدیمی",
]) {
  if (!componentSource.includes(marker)) {
    failures.push(`Bridge panel missing marker: ${marker}`);
  }
}

if (!detailSource.includes("ChartReportBridgePanel")) {
  failures.push("ReportDetail is not wired to ChartReportBridgePanel.");
}

if (
  packageJson.scripts?.["check:report-real-chart-bridge"] !==
  "node scripts/check-report-real-chart-bridge.mjs"
) {
  failures.push("Missing package script: check:report-real-chart-bridge");
}

if (!checkReports.includes("pnpm run check:report-real-chart-bridge")) {
  failures.push("check:reports does not run check:report-real-chart-bridge");
}

if (!checkProject.includes("pnpm run check:report-real-chart-bridge")) {
  failures.push("check:project does not run check:report-real-chart-bridge");
}

if (failures.length > 0) {
  console.error("Report real chart bridge check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Report real chart bridge check passed for 4 files.");
