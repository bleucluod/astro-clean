import fs from "node:fs";

const requiredFiles = [
  "lib/chart-engine/fixture-chart-engine.ts",
  "lib/chart-engine/chart-engine-factory.ts",
  "types/chart-engine-report.ts",
  "lib/chart-engine/report-engine-metadata.ts",
  "lib/storage/report-write-service.ts",
  "components/ChartEngineReportBadge.tsx",
  "components/ReportDetail.tsx",
  "docs/CHART_ENGINE_INTEGRATION_PATH.md",
  "docs/CHART_ENGINE_PROVIDER_DECISION.md",
];

const requiredContent = [
  ["lib/chart-engine/fixture-chart-engine.ts", "createFixtureChartEngine"],
  ["lib/chart-engine/chart-engine-factory.ts", "getChartEngineDriver"],
  ["types/chart-engine-report.ts", "ChartEngineReportMetadata"],
  ["lib/chart-engine/report-engine-metadata.ts", "attachChartEngineMetadata"],
  ["lib/storage/report-write-service.ts", "attachChartEngineMetadata"],
  ["components/ChartEngineReportBadge.tsx", "Chart Engine Path"],
  ["components/ReportDetail.tsx", "ChartReportBridgePanel"],
  ["docs/CHART_ENGINE_INTEGRATION_PATH.md", "chart engine path"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing chart engine integration file: ${file}`);
    failed = true;
  }
}

for (const [file, marker] of requiredContent) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");

  if (!text.includes(marker)) {
    console.error(`Missing marker in ${file}: ${marker}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Chart engine integration check passed for ${requiredFiles.length} files.`);
