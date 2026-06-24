import fs from "node:fs";

const requiredFiles = [
  "components/ReportV2Sections.tsx",
  "lib/report-output/report-v2-metrics.ts",
  "docs/REPORT_OUTPUT_V2_READABILITY.md",
];

const requiredContent = [
  ["components/ReportV2Sections.tsx", "activeSectionId"],
  ["components/ReportV2Sections.tsx", "Reading:"],
  ["components/ReportV2Sections.tsx", "فهرست بخش‌ها"],
  ["lib/report-output/report-v2-metrics.ts", "getReportV2Metrics"],
  ["lib/report-output/report-v2-metrics.ts", "getReportV2SectionSummary"],
  ["docs/REPORT_OUTPUT_V2_READABILITY.md", "visible reading experience"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing report output V2 readability file: ${file}`);
    failed = true;
  }
}

for (const [file, marker] of requiredContent) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");

  if (!text.includes(marker)) {
    console.error(`Missing marker in ${file}: ${marker}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Report output V2 readability check passed for ${requiredFiles.length} files.`);
