import fs from "node:fs";

const requiredFiles = [
  "types/report-output-v3.ts",
  "lib/report-output/report-v3.ts",
  "lib/report-output/report-v3-export.ts",
  "components/ReportV3Experience.tsx",
  "components/ReportDetail.tsx",
  "docs/REPORT_EXPERIENCE_V3.md",
];

const requiredContent = [
  ["types/report-output-v3.ts", "ReportOutputV3"],
  ["lib/report-output/report-v3.ts", "enhanceReportOutputV3"],
  ["lib/report-output/report-v3-export.ts", "createReportV3PlainText"],
  ["components/ReportV3Experience.tsx", "Report Output V3"],
  ["components/ReportDetail.tsx", "ReportV3Experience"],
  ["docs/REPORT_EXPERIENCE_V3.md", "visible product-value step"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing report experience V3 file: ${file}`);
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

console.log(`Report experience V3 check passed for ${requiredFiles.length} files.`);
