import fs from "node:fs";

const repairMarker = "HALLEUS_REPORT_EXPERIENCE_CONTINUOUS_EDITORIAL_BATCH1_20260808";
const requiredFiles = [
  "types/report-output-v3.ts",
  "lib/report-output/report-v3.ts",
  "lib/report-output/report-v3-export.ts",
  "components/ReportV3Experience.tsx",
  "components/ReportDetail.tsx",
  "components/report/ReportProductReader.tsx",
  "components/report/FiveMinuteReportSummary.tsx",
  "lib/report-output/visible-report-language.ts",
  "components/ReportCard.tsx",
  "docs/REPORT_EXPERIENCE_V3.md",
];

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

let failed = false;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error("Missing report experience file: " + file);
    failed = true;
  }
}

if (!failed) {
  const reportDetail = read("components/ReportDetail.tsx");
  const reader = read("components/report/ReportProductReader.tsx");
  const experience = read("components/ReportV3Experience.tsx");
  const summary = read("components/report/FiveMinuteReportSummary.tsx");
  const visibleLanguage = read("lib/report-output/visible-report-language.ts");
  const brandCopy = [read("components/ReportCard.tsx"), reportDetail, read("lib/report-output/report-v3.ts")].join("\n");

  for (const marker of [
    "ReportProductReader",
    'from "@/lib/report-output/visible-report-language"',
    "sanitizeVisibleReportValue(initialReport)",
  ]) {
    if (!reportDetail.includes(marker)) {
      console.error("ReportDetail missing preserved ownership marker: " + marker);
      failed = true;
    }
  }
  if (reportDetail.includes("ReportV3Experience")) {
    console.error("ReportDetail must delegate the reading experience through ReportProductReader.");
    failed = true;
  }

  for (const marker of [
    'data-report-product-flow="continuous"',
    "data-report-journey-navigator",
    'id="report-summary"',
    'id="report-full"',
    'id="report-sky"',
    'id="report-chart"',
    "FiveMinuteReportSummary",
    "ReportV3Experience",
    "readingContract={contract}",
    "HumanTransitReading",
    "ReportBirthChartWheel",
    "ReportTechnicalAppendix",
  ]) {
    if (!reader.includes(marker)) {
      console.error("Continuous report reader missing marker: " + marker);
      failed = true;
    }
  }
  for (const forbidden of ["ReportStoryMode", "ModeButton", "ReportReadingNavigation", "ReportProductMode"]) {
    if (reader.includes(forbidden)) {
      console.error("Retired report UI architecture remains: " + forbidden);
      failed = true;
    }
  }

  for (const marker of [
    'data-editorial-summary="astrology-first-beginner"',
    "contract.corePlacements",
    "contract.chartSignature",
    "contract.primaryPatterns.slice(0, 3)",
    "contract.evidenceReferences",
  ]) {
    if (!summary.includes(marker)) {
      console.error("Editorial summary missing marker: " + marker);
      failed = true;
    }
  }

  for (const marker of ["buildHumanFirstBirthReading", "readingContract", 'data-report-product-quality="human-first-birth-report"']) {
    if (!experience.includes(marker)) {
      console.error("ReportV3Experience missing preserved narrative marker: " + marker);
      failed = true;
    }
  }
  if (experience.includes("data-live-report-reading-contract")) {
    console.error("Obsolete direct live-contract presentation marker remains in ReportV3Experience.");
    failed = true;
  }

  for (const marker of ["sanitizeVisibleReportText", "sanitizeVisibleReportValue", "ENGLISH_INTERNAL_TERMS"]) {
    if (!visibleLanguage.includes(marker)) {
      console.error("Visible-language contract missing marker: " + marker);
      failed = true;
    }
  }
  if (brandCopy.includes("گزارش Halleus") || brandCopy.includes("Halleus نسخه")) {
    console.error("Persian-facing brand copy still uses English Halleus.");
    failed = true;
  }
}

const pkg = JSON.parse(read("package.json"));
if (pkg.scripts?.["check:report-experience-v3"] !== "node scripts/check-report-experience-v3.mjs") {
  console.error("package.json must expose check:report-experience-v3.");
  failed = true;
}

if (failed) process.exit(1);
console.log("Report experience V3 check passed for the continuous editorial architecture.");
console.log("- ReportDetail keeps loading, privacy, save, and publication ownership");
console.log("- ReportProductReader owns one continuous summary/full/sky/technical reading flow");
console.log("- ReportV3Experience keeps the complete human-first natal narrative");
console.log("- " + repairMarker);
