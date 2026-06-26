import { existsSync, readFileSync } from "node:fs";

const failures = [];
const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const chartPageSource = readFileSync("app/chart/page.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "/api/engine/real-chart",
  "requestRealEnginePreview",
  "handlePreviewRealEngine",
  "RealEngineBridgePreview",
  "پیش‌نمایش real engine",
  "محاسبه واقعی‌تر با همین فرم",
  "IRAN_CITY_OPTIONS",
  "findIranCityByName",
  "getIranCityDisplayName",
  "birthLatitude",
  "birthLongitude",
  "birthTimezone",
  "createMockReport",
  "saveGeneratedReport",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm real engine bridge missing marker: ${marker}`);
  }
}

if (!chartFormSource.includes("type RealChartApiResponse")) {
  failures.push("ChartForm must type the real chart API response.");
}

if (!chartFormSource.includes('status: "ready"')) {
  failures.push("ChartForm must expose a ready state for real engine preview.");
}

if (!chartPageSource.includes("return <ChartForm />")) {
  failures.push("Public chart page should render ChartForm directly.");
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

console.log("Chart form real engine bridge check passed for 2 files.");
