import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/chart/normalized-chart.ts",
  "src/lib/chart/normalized-chart-qa.fixtures.ts",
  "scripts/check-real-chart-normalization.mjs",
];

const requiredExports = [
  "NORMALIZED_CHART_VERSION",
  "buildNormalizedChart",
  "normalizeChartPlacement",
  "normalizeChartPlacements",
  "normalizeHouseContext",
  "buildHousesForContext",
  "buildNormalizedChartQuality",
  "toAspectPlacements",
  "getNormalizedPlacementById",
  "getChartReadinessLabel",
];

const requiredFixtureIds = [
  "ready-whole-sign-chart",
  "approximate-equal-house-chart",
  "placeholder-house-chart",
  "empty-manual-chart",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const source = readFileSync(requiredFiles[0], "utf8");
const fixtureSource = readFileSync(requiredFiles[1], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const checkEngine = packageJson.scripts?.["check:engine"] ?? "";
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
    failures.push(`Missing normalized chart export: ${exportName}`);
  }
}

for (const fixtureId of requiredFixtureIds) {
  if (!fixtureSource.includes(fixtureId)) {
    failures.push(`Missing normalized chart fixture: ${fixtureId}`);
  }
}

for (const requiredImport of [
  "./timezone-readiness",
  "./zodiac",
  "./houses",
  "./aspects",
]) {
  if (!source.includes(requiredImport)) {
    failures.push(`Normalized chart must import ${requiredImport}`);
  }
}

if (!source.includes("ready-for-report-enrichment")) {
  failures.push("Missing ready-for-report-enrichment readiness label.");
}

if (!source.includes("current ascendant scaffold")) {
  failures.push("Missing explicit equal-house/ascendant confidence limitation.");
}

if (!source.includes("chart.quality.limitations.length === 0")) {
  failures.push("Ready chart label must require zero limitations.");
}

if (!fixtureSource.includes("runNormalizedChartQaFixtures")) {
  failures.push("Missing runNormalizedChartQaFixtures helper.");
}

if (
  packageJson.scripts?.["check:real-chart-normalization"] !==
  "node scripts/check-real-chart-normalization.mjs"
) {
  failures.push("Missing package script: check:real-chart-normalization");
}

if (!checkProject.includes("pnpm run check:real-chart-normalization")) {
  failures.push("check:project does not run check:real-chart-normalization");
}

if (!checkEngine.includes("pnpm run check:real-chart-normalization")) {
  failures.push("check:engine does not run check:real-chart-normalization");
}

if (failures.length > 0) {
  console.error("Real chart normalization check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real chart normalization check passed for 3 files.");
