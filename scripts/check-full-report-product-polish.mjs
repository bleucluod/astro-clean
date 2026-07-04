import { readFileSync } from "node:fs";

const reportCard = readFileSync("components/ReportCard.tsx", "utf8");
const writer = readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const sampleQa = readFileSync("scripts/check-report-sample-qa.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const failures = [];

const requiredMarkers = [
  ["components/ReportCard.tsx", reportCard, "report-polish-advanced-panel"],
  ["components/ReportCard.tsx", reportCard, "کامل باشد اما شلوغ و گیج‌کننده نشود"],
  ["components/ReportCard.tsx", reportCard, "کیفیت محاسبه"],
  ["lib/astrology/real-engine-report-writer.ts", writer, "به جای تکرار فهرست کامل ۱۲ خانه"],
  ["lib/astrology/real-engine-report-writer.ts", writer, "جدول کامل ۱۲ خانه در کارت گزارش و چارت دایره‌ای آمده است"],
  ["lib/astrology/real-engine-report-writer.ts", writer, "یادداشت‌های روش و دقت بعد از روایت اصلی آمده‌اند"],
  ["scripts/check-report-sample-qa.mjs", sampleQa, "v0.1.162-product-polish"],
  ["scripts/check-report-sample-qa.mjs", sampleQa, "v0.1.168-reading-polish"],
  ["scripts/check-report-sample-qa.mjs", sampleQa, "too many user-facing snapshot mentions"],
];

for (const [file, source, marker] of requiredMarkers) {
  if (!source.includes(marker)) {
    failures.push(`${file} missing full report polish marker: ${marker}`);
  }
}

const forbiddenOpenPanels = [
  'report-accuracy-section" open',
  'report-motion-section" open',
  'report-house-grid" open',
  'report-polish-advanced-panel" open',
];

for (const marker of forbiddenOpenPanels) {
  if (reportCard.includes(marker)) {
    failures.push(`ReportCard leaves advanced polish panel open: ${marker}`);
  }
}

if (writer.includes("نقشه شروع خانه‌ها:")) {
  failures.push("Writer still prints the full house-start list in prose instead of handing it to the table/wheel.");
}

if (packageJson.scripts?.["check:full-report-product-polish"] !== "node scripts/check-full-report-product-polish.mjs") {
  failures.push("Missing package script: check:full-report-product-polish");
}

for (const scriptName of ["check:reports", "check:project"]) {
  const value = packageJson.scripts?.[scriptName] ?? "";
  if (!value.includes("pnpm run check:full-report-product-polish")) {
    failures.push(`${scriptName} does not run check:full-report-product-polish`);
  }
}

if (failures.length > 0) {
  console.error("Full report product polish check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Full report product polish check passed.");
