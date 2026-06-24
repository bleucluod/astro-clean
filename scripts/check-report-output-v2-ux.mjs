import fs from "node:fs";

const requiredFiles = [
  "components/ReportV2Sections.tsx",
  "lib/report-output/report-v2.ts",
  "lib/report-output/report-v2-export.ts",
  "docs/REPORT_OUTPUT_V2_UX_POLISH.md",
];

const requiredContent = [
  ["components/ReportV2Sections.tsx", "enhanceReportOutputV2"],
  ["components/ReportV2Sections.tsx", "گزارش بخش‌بندی‌شده"],
  ["lib/report-output/report-v2-export.ts", "createReportV2PlainText"],
  ["docs/REPORT_OUTPUT_V2_UX_POLISH.md", "visible for both new and existing reports"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing report output V2 UX file: ${file}`);
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

console.log(`Report output V2 UX check passed for ${requiredFiles.length} files.`);
