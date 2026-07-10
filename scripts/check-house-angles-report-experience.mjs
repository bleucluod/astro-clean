import { readFileSync } from "node:fs";

const reportCard = readFileSync("components/ReportCard.tsx", "utf8");
const writer = readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const sampleQa = readFileSync("scripts/check-report-sample-qa.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const failures = [];

for (const marker of [
  "RealChartWheel",
  "محورهای اصلی",
  "۱۲ خانه",
  "formatHouseSystemLabel",
  "خانه‌های پلاسیدوس برای این چارت نمایش داده نمی‌شوند",
]) {
  if (!reportCard.includes(marker)) {
    failures.push("ReportCard missing house/angles marker: " + marker);
  }
}

for (const marker of [
  "buildHouseAnglesText",
  "buildAnglesNarrative",
  "buildHouseNarrative",
  "خانه‌های این گزارش با روش پلاسیدوس و سرخانه‌های نامساوی محاسبه شده‌اند",
  "نسخهٔ ذخیره‌شدهٔ قدیمی",
  "روش جایگزین پنهانی",
]) {
  if (!writer.includes(marker)) {
    failures.push("Report writer missing house/angles marker: " + marker);
  }
}

for (const marker of [
  'houseSystem: "whole-sign"',
  'system: "whole-sign"',
  "جدول کامل ۱۲ خانه",
]) {
  if (!sampleQa.includes(marker)) {
    failures.push("Legacy Whole Sign sample QA missing marker: " + marker);
  }
}

if (
  packageJson.scripts?.["check:house-angles-report-experience"] !==
  "node scripts/check-house-angles-report-experience.mjs"
) {
  failures.push("Missing package script: check:house-angles-report-experience");
}

if (failures.length > 0) {
  console.error("House/angles report experience check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("House/angles report experience check passed.");
console.log("- fresh Placidus and legacy Whole Sign house narratives remain distinct");
console.log("- unavailable Placidus charts keep explicit no-fallback UI copy");
