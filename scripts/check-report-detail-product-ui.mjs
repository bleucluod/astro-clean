import { readFileSync } from "node:fs";

const reportDetail = readFileSync("components/ReportDetail.tsx", "utf8");
const globalsCss = readFileSync("app/globals.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

function assertNotIncludes(content, marker, label) {
  if (content.includes(marker)) {
    throw new Error(`${label} contains forbidden marker: ${marker}`);
  }
}

for (const marker of [
  "report-detail-hero-simple",
  "report-detail-birth-card",
  "report-detail-hero-copy-simple",
  "report-detail-chart-card",
  "report-detail-section-chips",
  "report-detail-narrative-card",
  "report-detail-pillars-card",
  "report-detail-quick-card-grid",
  "report-detail-technical-sections",
  "report-detail-next-actions",
  "گزارش چارت تولد",
  "روایت اصلی",
  "سه ستون اصلی و فاز ماه تولد",
  "دسترسی سریع به جدول‌ها و داده‌های فنی",
  "جزئیات فنی و پشتوانه محاسبه",
]) {
  assertIncludes(reportDetail, marker, "ReportDetail");
}

for (const marker of [
  "Report detail simple reader redesign v0.1.211c",
  ".report-detail-hero-simple",
  ".report-detail-main-reader-grid",
  ".report-detail-quick-card-grid",
  ".report-detail-technical-sections",
]) {
  assertIncludes(globalsCss, marker, "globals.css");
}

for (const forbidden of [
  "نبض آسمان امروز",
  "ماه امروز",
  "تنظیم با افق تهران",
  "خوانش روزانه",
  "کارت روزانه",
  "فروش موفق",
  "درصد رضایت",
]) {
  assertNotIncludes(reportDetail, forbidden, "ReportDetail");
}

if (packageJson.scripts?.["check:report-detail-product-ui"] !== "node scripts/check-report-detail-product-ui.mjs") {
  throw new Error("package.json is missing check:report-detail-product-ui.");
}

console.log("report detail product UI check passed");
