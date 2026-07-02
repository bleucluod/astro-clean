import fs from "node:fs";

const requiredFiles = [
  "types/report-output-v3.ts",
  "lib/report-output/report-v3.ts",
  "lib/report-output/report-v3-export.ts",
  "components/ReportV3Experience.tsx",
  "components/ReportDetail.tsx",
  "components/ReportCard.tsx",
  "docs/REPORT_EXPERIENCE_V3.md",
];

const requiredContent = [
  ["types/report-output-v3.ts", "ReportOutputV3"],
  ["lib/report-output/report-v3.ts", "enhanceReportOutputV3"],
  ["lib/report-output/report-v3-export.ts", "createReportV3PlainText"],
  ["components/ReportV3Experience.tsx", "خوانش نهایی گزارش"],
  ["components/ReportDetail.tsx", "ReportV3Experience"],
  ["components/ReportDetail.tsx", "هالیوس نسخه ذخیره‌شده گزارش"],
  ["components/ReportCard.tsx", "گزارش محاسبه‌شده هالیوس"],
  ["lib/report-output/report-v3.ts", "گزارش هالیوس"],
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

const brandCopyFiles = [
  "components/ReportCard.tsx",
  "components/ReportDetail.tsx",
  "lib/report-output/report-v3.ts",
];

for (const file of brandCopyFiles) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");

  if (text.includes("گزارش Halleus") || text.includes("Halleus نسخه")) {
    console.error(`Persian-facing brand copy still uses English Halleus in ${file}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Report experience V3 check passed for ${requiredFiles.length} files.`);
