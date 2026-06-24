import fs from "node:fs";

const requiredFiles = [
  "types/report-output.ts",
  "lib/report-output/report-v2.ts",
  "components/ReportV2Sections.tsx",
  "components/ChartForm.tsx",
  "components/ReportDetail.tsx",
  "docs/REPORT_OUTPUT_V2_INTEGRATION.md",
];

const requiredContent = [
  ["types/report-output.ts", "ReportOutputSection"],
  ["lib/report-output/report-v2.ts", "enhanceReportOutputV2"],
  ["components/ReportV2Sections.tsx", "Report Output V2"],
  ["components/ChartForm.tsx", "enhanceReportOutputV2"],
  ["components/ReportDetail.tsx", "ReportV2Sections"],
  ["docs/REPORT_OUTPUT_V2_INTEGRATION.md", "sectioned report output"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing report output V2 file: ${file}`);
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

console.log(`Report output V2 check passed for ${requiredFiles.length} files.`);
