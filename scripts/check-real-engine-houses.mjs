import { readFileSync } from "node:fs";

const failures = [];

const engineSource = readFileSync("src/lib/chart/real-chart-engine.ts", "utf8");
const serviceSource = readFileSync("lib/report-generation/report-generation-service.ts", "utf8");
const typesSource = readFileSync("types/astro.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const checkEngine = packageJson.scripts?.["check:engine"] ?? "";

for (const marker of [
  'import type { ChartHouse } from "./houses";',
  "REAL_CHART_WORKBENCH_VERSION",
  "houses: ChartHouse[]",
  "houses: normalizedChart.houses",
]) {
  if (!engineSource.includes(marker)) {
    failures.push("real-chart-engine.ts missing marker: " + marker);
  }
}

for (const marker of [
  "REPORT_GENERATION_SERVICE_VERSION",
  "houses: toRealEngineReportHouses(realChart, chartReportEnrichment)",
  "function toRealEngineReportHouses",
  "function getHouseNumberForLongitude",
  "getAngleIdsForHouse",
  'house.system === "whole-sign"',
  'return "whole-sign-from-ascendant";',
  'return "placidus-calculated";',
  "house: getHouseNumberForLongitude(angle.longitude, realChart)",
]) {
  if (!serviceSource.includes(marker)) {
    failures.push("report-generation-service.ts missing marker: " + marker);
  }
}

for (const marker of [
  "RealEngineReportHouse",
  "angleIds: RealEngineReportAngleId[]",
  "houses?: RealEngineReportHouse[]",
]) {
  if (!typesSource.includes(marker)) {
    failures.push("types/astro.ts missing marker: " + marker);
  }
}

if (packageJson.scripts?.["check:real-engine-houses"] !== "node scripts/check-real-engine-houses.mjs") {
  failures.push("Missing package script: check:real-engine-houses");
}

if (!checkProject.includes("pnpm run check:real-engine-houses")) {
  failures.push("check:project does not run check:real-engine-houses");
}

if (!checkEngine.includes("pnpm run check:real-engine-houses")) {
  failures.push("check:engine does not run check:real-engine-houses");
}

if (failures.length > 0) {
  console.error("Real engine houses check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Real engine houses check passed.");
