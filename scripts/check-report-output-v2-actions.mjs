import fs from "node:fs";

const requiredFiles = [
  "components/ReportV2Sections.tsx",
  "lib/report-output/report-v2-export.ts",
  "docs/REPORT_OUTPUT_V2_ACTIONS.md",
];

const requiredContent = [
  ["components/ReportV2Sections.tsx", "use client"],
  ["components/ReportV2Sections.tsx", "downloadText"],
  ["components/ReportV2Sections.tsx", "copyText"],
  ["components/ReportV2Sections.tsx", "دانلود TXT نسخه V2"],
  ["components/ReportV2Sections.tsx", "کپی متن V2"],
  ["lib/report-output/report-v2-export.ts", "createReportV2PlainText"],
  ["docs/REPORT_OUTPUT_V2_ACTIONS.md", "TXT download action"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing report output V2 actions file: ${file}`);
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

console.log(`Report output V2 actions check passed for ${requiredFiles.length} files.`);
