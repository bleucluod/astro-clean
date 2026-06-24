import fs from "node:fs";

const requiredFiles = [
  "types/report-quality.ts",
  "lib/report-quality/report-section-schema.ts",
  "lib/report-quality/tone-profile.ts",
  "lib/report-quality/safety-rules.ts",
  "lib/report-quality/quality-checker.ts",
  "lib/report-quality/report-blueprint.ts",
  "app/quality/page.tsx",
  "docs/REPORT_QUALITY_FOUNDATION.md",
  "docs/INTERPRETATION_STYLE_GUIDE.md",
];

const requiredContent = [
  ["types/report-quality.ts", "export type ReportQualityResult"],
  ["lib/report-quality/report-section-schema.ts", "REPORT_SECTION_BLUEPRINTS"],
  ["lib/report-quality/tone-profile.ts", "HALLEUS_REPORT_TONE_PROFILE"],
  ["lib/report-quality/safety-rules.ts", "checkReportSafetyText"],
  ["lib/report-quality/quality-checker.ts", "checkReportQuality"],
  ["app/quality/page.tsx", "کیفیت گزارش‌های Halleus"],
  ["docs/REPORT_QUALITY_FOUNDATION.md", "report quality"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing report quality file: ${file}`);
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

console.log(`Report quality foundation check passed for ${requiredFiles.length} files.`);
