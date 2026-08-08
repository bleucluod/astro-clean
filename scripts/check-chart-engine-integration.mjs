import fs from "node:fs";

const repairMarker =
  "HALLEUS_CHART_ENGINE_INTEGRATION_READER_SYNC_R5_20260806";

const requiredFiles = [
  "lib/chart-engine/fixture-chart-engine.ts",
  "lib/chart-engine/chart-engine-factory.ts",
  "types/chart-engine-report.ts",
  "lib/chart-engine/report-engine-metadata.ts",
  "lib/storage/report-write-service.ts",
  "components/ChartEngineReportBadge.tsx",
  "components/ReportDetail.tsx",
  "components/report/ReportProductReader.tsx",
  "components/report/ReportTechnicalAppendix.tsx",
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
  ["components/ReportDetail.tsx", "ReportProductReader"],
  ["components/ReportDetail.tsx", "<ReportProductReader report={report} />"],
  ["components/report/ReportProductReader.tsx", "ReportTechnicalAppendix"],
  [
    "components/report/ReportProductReader.tsx",
    "<ReportTechnicalAppendix contract={contract} report={report} />",
  ],
  [
    "components/report/ReportTechnicalAppendix.tsx",
    'data-report-technical-appendix="placements-houses-aspects-axes-method"',
  ],
  ["docs/CHART_ENGINE_INTEGRATION_PATH.md", "chart engine path"],
];

let failed = false;

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

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

  if (!read(file).includes(marker)) {
    console.error(`Missing marker in ${file}: ${marker}`);
    failed = true;
  }
}

if (!failed) {
  const reportDetail = read("components/ReportDetail.tsx");

  if (reportDetail.includes("ReportDetailFactsPanel")) {
    console.error(
      "ReportDetail must delegate report facts and technical reading instead of restoring ReportDetailFactsPanel.",
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `Chart engine integration check passed for ${requiredFiles.length} files.`,
);
console.log(
  "- ReportDetail delegates the reading surface through ReportProductReader",
);
console.log(
  "- ReportProductReader owns the complete technical appendix and chart details",
);
console.log(`- ${repairMarker}`);
