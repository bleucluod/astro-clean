import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportDetailPath = path.join(root, "components", "ReportDetail.tsx");
const packagePath = path.join(root, "package.json");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(text, token, label) {
  if (!text.includes(token)) {
    throw new Error(`${label} is missing: ${token}`);
  }
}

const reportDetail = read(reportDetailPath);
const packageJson = JSON.parse(read(packagePath));

[
  "REPORT_QUICK_READING_MAP",
  "نقشه سریع خواندن",
  "سه چراغ اعتماد",
  "Private / noindex",
  "زبان نمادین، نه حکم قطعی",
  "Save/account بدون اجبار",
  "یک برداشت را برای بعد نگه دار",
  "ReportTrustPanel",
].forEach((token) => assertIncludes(reportDetail, token, "ReportDetail UX/trust copy"));

assertIncludes(
  packageJson.scripts?.["check:report-detail-ux-trust-qa"] ?? "",
  "scripts/check-report-detail-ux-trust-qa.mjs",
  "package script",
);

console.log("Report detail UX trust QA check passed.");
