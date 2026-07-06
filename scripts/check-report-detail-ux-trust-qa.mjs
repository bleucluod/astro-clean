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
  "یادداشت‌های شخصی در لینک عمومی نمایش داده نمی‌شوند",
  "نسخه همین مرورگر باز شد؛ لینک عمومی سرور برای این گزارش پیدا نشد.",
  "public / noindex",
  "محلی / مرورگر",
  "فقط خواندنی",
  "این گزارش ممکن است پاک شده باشد",
].forEach((token) => assertIncludes(reportDetail, token, "ReportDetail UX/trust copy"));

assertIncludes(
  packageJson.scripts?.["check:report-detail-ux-trust-qa"] ?? "",
  "scripts/check-report-detail-ux-trust-qa.mjs",
  "package script",
);

console.log("Report detail UX trust QA check passed.");
