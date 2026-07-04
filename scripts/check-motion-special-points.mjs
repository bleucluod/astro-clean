import { readFileSync } from "node:fs";

const engineSource = readFileSync("src/lib/chart/real-chart-engine.ts", "utf8");
const serviceSource = readFileSync("lib/report-generation/report-generation-service.ts", "utf8");
const reportCardSource = readFileSync("components/ReportCard.tsx", "utf8");
const writerSource = readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const sampleQaSource = readFileSync("scripts/check-report-sample-qa.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const failures = [];

for (const marker of [
  'REAL_CHART_WORKBENCH_VERSION = "0.1.166"',
  "RealChartCalculatedMotion",
  "calculateBodyApparentMotion",
  "getSignedLongitudeDelta",
  "retrogradePlanetIds",
  "astronomy-engine-geocentric-ecliptic-daily-motion",
]) {
  if (!engineSource.includes(marker)) {
    failures.push(`real-chart-engine.ts missing motion marker: ${marker}`);
  }
}

for (const marker of [
  'REPORT_GENERATION_SERVICE_VERSION = "0.1.166"',
  "buildCalculatedRetrogradeStatus",
  'retrogradeStatus: "calculated"',
  "buildDeferredCalculation",
  "Mean Lunar Node is calculated",
  "Black Moon Lilith is not calculated yet.",
]) {
  if (!serviceSource.includes(marker)) {
    failures.push(`report-generation-service.ts missing motion marker: ${marker}`);
  }
}

if (serviceSource.includes("buildNotCalculatedRetrogradeStatus")) {
  failures.push("report-generation-service.ts still contains buildNotCalculatedRetrogradeStatus.");
}

for (const marker of [
  "report-motion-section",
  "حرکت برگشتی / Retrograde",
  "getRetrogradePlanetIds",
  "گره‌های ماه",
  "لیلیت",
]) {
  if (!reportCardSource.includes(marker)) {
    failures.push(`ReportCard.tsx missing motion marker: ${marker}`);
  }
}

for (const marker of [
  "buildRetrogradeText",
  "real-engine-motion-special-points",
  "حرکت برگشتی و نقاط ویژه",
  "گره‌های ماه و لیلیت هنوز عمداً",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`real-engine-report-writer.ts missing motion marker: ${marker}`);
  }
}

for (const marker of [
  "v0.1.159-sample-qa-motion-fixture",
  "real-engine-motion-special-points",
  "حرکت برگشتی",
  "گره‌های ماه",
  "لیلیت",
]) {
  if (!sampleQaSource.includes(marker)) {
    failures.push(`check-report-sample-qa.mjs missing motion marker: ${marker}`);
  }
}

if (packageJson.scripts?.["check:motion-special-points"] !== "node scripts/check-motion-special-points.mjs") {
  failures.push("Missing package script: check:motion-special-points");
}

for (const scriptName of ["check:project", "check:engine"]) {
  const value = packageJson.scripts?.[scriptName] ?? "";
  if (!value.includes("pnpm run check:motion-special-points")) {
    failures.push(`${scriptName} does not run check:motion-special-points`);
  }
}

if (failures.length > 0) {
  console.error("Motion/special-points check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Motion/special-points check passed.");
