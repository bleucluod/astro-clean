import { existsSync, readFileSync } from "node:fs";

const failures = [];
const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const chartPageSource = readFileSync("app/chart/page.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "/api/engine/real-chart",
  "requestRealEngineReportData",
  "RealEngineRequestState",
  "realEngineRequest.status",
  "HALLEUS_CITY_OPTIONS",
  "findHalleusCityByName",
  "getHalleusCityDisplayName",
  "birthLatitude",
  "birthLongitude",
  "birthTimezone",
  "attachReportGenerationContext(realEngineResult.report!, realEngineResult)",
  "saveGeneratedReportWithAccountFallback(",
  "router.push(nextPath)",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm real engine final bridge missing marker: ${marker}`);
  }
}

for (const removedMarker of [
  "requestRealEnginePreview",
  "handlePreviewRealEngine",
  "RealEngineBridgePreview",
  "پیش‌نمایش real engine",
]) {
  if (chartFormSource.includes(removedMarker)) {
    failures.push(`ChartForm still has preview bridge marker: ${removedMarker}`);
  }
}

if (!chartFormSource.includes("type RealChartApiResponse")) {
  failures.push("ChartForm must type the real chart API response.");
}

if (!chartFormSource.includes('status: "ready"')) {
  failures.push("ChartForm must track a ready state for real engine submit flow.");
}

if (!chartPageSource.includes("<ChartForm />") ||
    !chartPageSource.includes('className={styles.workspace}')) {
  failures.push("Public chart page must render ChartForm inside the workspace.");
}

for (const removedFile of [
  "app/chart/LegacyChartShell.tsx",
  "components/PublicChartRealEngineUpgrade.tsx",
  "scripts/check-public-chart-real-engine-upgrade.mjs",
]) {
  if (existsSync(removedFile)) {
    failures.push(`Temporary merge file should be removed: ${removedFile}`);
  }
}

if (
  packageJson.scripts?.["check:chart-form-real-engine-bridge"] !==
  "node scripts/check-chart-form-real-engine-bridge.mjs"
) {
  failures.push("Missing package script: check:chart-form-real-engine-bridge");
}

if (!checkProject.includes("pnpm run check:chart-form-real-engine-bridge")) {
  failures.push("check:project does not run check:chart-form-real-engine-bridge");
}

if (failures.length > 0) {
  console.error("Chart form real engine bridge check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Chart form real engine bridge check passed for final submit flow.");
