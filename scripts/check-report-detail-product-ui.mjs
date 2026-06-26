import { readFileSync } from "node:fs";

const reportCard = readFileSync("components/ReportCard.tsx", "utf8");
const globalsCss = readFileSync("app/globals.css", "utf8");
const reportsPage = readFileSync("app/reports/page.tsx", "utf8");
const packageJson = readFileSync("package.json", "utf8");

const requiredReportMarkers = [
  "report-product-card",
  "report-product-hero",
  "report-core-card",
  "report-calculation-section",
  "report-aspect-card",
  "سه ستون اصلی",
  "جزئیات محاسبه",
  "روابط مهم بین سیاره‌ها",
  "لایه‌های تفسیر",
  "گزارش محاسبه‌شده Halleus",
];

const requiredCssMarkers = [
  "Report detail product UI v0.1.64",
  ".report-product-card",
  ".report-product-hero",
  ".report-core-grid",
  ".report-calculation-section",
  ".report-aspect-card",
  ".report-product-insight-list",
];

for (const marker of requiredReportMarkers) {
  if (!reportCard.includes(marker)) {
    throw new Error(`ReportCard is missing product UI marker: ${marker}`);
  }
}

for (const marker of requiredCssMarkers) {
  if (!globalsCss.includes(marker)) {
    throw new Error(`globals.css is missing product UI marker: ${marker}`);
  }
}

const forbiddenReportMarkers = [
  "real engine snapshot",
  "ASC approx",
  "شهر engine",
  "UTC</strong>",
];

for (const marker of forbiddenReportMarkers) {
  if (reportCard.includes(marker)) {
    throw new Error(`ReportCard still has debug-like marker: ${marker}`);
  }
}

if (reportsPage.includes("نسخه MVP")) {
  throw new Error("Reports page metadata still mentions MVP.");
}

if (!packageJson.includes('"check:report-detail-product-ui"')) {
  throw new Error("package.json is missing check:report-detail-product-ui.");
}

console.log("report detail product UI check passed");
