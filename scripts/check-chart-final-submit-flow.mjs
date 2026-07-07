import { existsSync, readFileSync } from "node:fs";

const failures = [];
const chartForm = readFileSync("components/ChartForm.tsx", "utf8");
const chartPage = readFileSync("app/chart/page.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

const requiredChartMarkers = [
  "requestRealEngineReportData",
  "/api/engine/real-chart",
  "attachRealEngineSnapshotToReport",
  "saveGeneratedReportWithAccountFallback(nextReport)",
  "router.push(`/reports/${saveResult.accountRecord?.id ?? saveResult.localRecord.id}`)",
  "disabled={isRealEngineLoading}",
  "IRAN_CITY_OPTIONS",
  "findIranCityByName",
  "getIranCityDisplayName",
  "birthLatitude",
  "birthLongitude",
  "birthTimezone",
  "نام یا نیک‌نیم خود را وارد کنید",
  "time-unknown-inline",
  "birth-city-hint",
  "نزدیک‌ترین شهر",
  "ساخت گزارش",
];

for (const marker of requiredChartMarkers) {
  if (!chartForm.includes(marker)) {
    failures.push(`Chart final submit flow missing marker: ${marker}`);
  }
}

for (const marker of [
  ".chart-reference-page",
  "width: min(1180px, calc(100vw - 48px))",
  ".chart-time-title-row",
  ".time-unknown-inline",
  ".chart-city-label",
  "min-height: 46px",
  "overflow-x: auto",
]) {
  if (!css.includes(marker)) {
    failures.push(`Chart final submit CSS missing marker: ${marker}`);
  }
}

const forbiddenChartMarkers = [
  "requestRealEnginePreview",
  "handlePreviewRealEngine",
  "RealEngineBridgePreview",
  "پیش‌نمایش real engine",
  "real engine snapshot",
  "ASC approx",
  "شهر engine",
  "<ReportCard",
  "setReport",
  "فرم MVP",
  "مسیر امن MVP",
  "مثال: آرمان",
  "ساخت، ذخیره و باز کردن گزارش",
];

for (const marker of forbiddenChartMarkers) {
  if (chartForm.includes(marker)) {
    failures.push(`Chart final submit flow still has preview/debug/stale marker: ${marker}`);
  }
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

if (!chartPage.includes("return <ChartForm />")) {
  failures.push("Public chart page should render ChartForm directly.");
}

if (
  packageJson.scripts?.["check:chart-final-submit-flow"] !==
  "node scripts/check-chart-final-submit-flow.mjs"
) {
  failures.push("Missing package script: check:chart-final-submit-flow");
}

if (!checkProject.includes("pnpm run check:chart-final-submit-flow")) {
  failures.push("check:project does not run check:chart-final-submit-flow");
}

if (failures.length > 0) {
  console.error("Chart final submit flow check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Chart final submit flow check passed.");
