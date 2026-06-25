import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/report-output/chart-enrichment.ts",
  "src/lib/report-output/chart-enrichment.fixtures.ts",
  "scripts/check-chart-report-enrichment.mjs",
];

const requiredExports = [
  "CHART_REPORT_ENRICHMENT_VERSION",
  "buildChartReportEnrichment",
  "getChartReportEnrichmentStatus",
  "toPlacementSummary",
  "toAspectSummary",
  "buildChartReportEnrichmentSections",
  "buildPlacementSummaryKey",
  "buildAspectSummaryKey",
  "hasReportReadyChartEnrichment",
];

const requiredFixtureIds = [
  "ready-chart-enrichment",
  "partial-chart-enrichment",
  "blocked-chart-enrichment",
  "summary-key-builders",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const source = readFileSync(requiredFiles[0], "utf8");
const fixtureSource = readFileSync(requiredFiles[1], "utf8");
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

for (const exportName of requiredExports) {
  if (
    !source.includes(`export function ${exportName}`) &&
    !source.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing chart report enrichment export: ${exportName}`);
  }
}

for (const fixtureId of requiredFixtureIds) {
  if (!fixtureSource.includes(fixtureId)) {
    failures.push(`Missing chart report enrichment fixture: ${fixtureId}`);
  }
}

for (const status of ["ready", "partial", "blocked"]) {
  if (!source.includes(status)) {
    failures.push(`Missing enrichment status: ${status}`);
  }
}

if (!source.includes("../chart/normalized-chart")) {
  failures.push("Chart report enrichment must consume normalized chart data.");
}

if (!fixtureSource.includes("runChartReportEnrichmentQaFixtures")) {
  failures.push("Missing runChartReportEnrichmentQaFixtures helper.");
}

if (
  packageJson.scripts?.["check:chart-report-enrichment"] !==
  "node scripts/check-chart-report-enrichment.mjs"
) {
  failures.push("Missing package script: check:chart-report-enrichment");
}

if (!checkProject.includes("pnpm run check:chart-report-enrichment")) {
  failures.push("check:project does not run check:chart-report-enrichment");
}

if (!checkReports.includes("pnpm run check:chart-report-enrichment")) {
  failures.push("check:reports does not run check:chart-report-enrichment");
}

if (failures.length > 0) {
  console.error("Chart report enrichment check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Chart report enrichment check passed for 3 files.");
