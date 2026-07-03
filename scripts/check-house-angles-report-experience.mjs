import { readFileSync } from "node:fs";

const reportCard = readFileSync("components/ReportCard.tsx", "utf8");
const writer = readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const sampleQa = readFileSync("scripts/check-report-sample-qa.mjs", "utf8");
const packageJson = readFileSync("package.json", "utf8");

const requiredMarkers = [
  ["components/ReportCard.tsx", reportCard, "report-house-angle-section"],
  ["components/ReportCard.tsx", reportCard, "report-house-grid"],
  ["components/ReportCard.tsx", reportCard, "محورهای اصلی چارت"],
  ["components/ReportCard.tsx", reportCard, "راهنمای ۱۲ خانه Whole Sign"],
  ["components/ReportCard.tsx", reportCard, "MC/IC اینجا محور مستقل چارت‌اند"],
  ["lib/astrology/real-engine-report-writer.ts", writer, "buildHouseAnglesText"],
  ["lib/astrology/real-engine-report-writer.ts", writer, "real-engine-houses-angles"],
  ["lib/astrology/real-engine-report-writer.ts", writer, "محور ASC/DSC"],
  ["lib/astrology/real-engine-report-writer.ts", writer, "محور MC/IC"],
  ["scripts/check-report-sample-qa.mjs", sampleQa, "missing house/angles interpretation section"],
  ["scripts/check-report-sample-qa.mjs", sampleQa, "۱۲ خانه Whole Sign"],
  ["package.json", packageJson, "check:house-angles-report-experience"],
];

let failed = false;

for (const [file, text, marker] of requiredMarkers) {
  if (!text.includes(marker)) {
    console.error(`Missing house/angles report marker in ${file}: ${marker}`);
    failed = true;
  }
}

if (reportCard.includes("Placidus") && !reportCard.includes("formatHouseSystemLabel")) {
  console.error("ReportCard appears to mention Placidus without house-system labeling guard.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("House/angles report experience check passed.");
