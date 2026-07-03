import { readFileSync } from "node:fs";

const reportCard = readFileSync("components/ReportCard.tsx", "utf8");
const reportDetail = readFileSync("components/ReportDetail.tsx", "utf8");
const reportV3Experience = readFileSync("components/ReportV3Experience.tsx", "utf8");
const bridgePanel = readFileSync("components/ChartReportBridgePanel.tsx", "utf8");
const globalsCss = readFileSync("app/globals.css", "utf8");
const reportsPage = readFileSync("app/reports/page.tsx", "utf8");
const packageJson = readFileSync("package.json", "utf8");

const requiredReportMarkers = [
  "report-product-card",
  "report-product-hero",
  "report-product-card-actions",
  "report-core-card",
  "report-calculation-section",
  "report-aspect-card",
  "سه ستون اصلی",
  "جزئیات محاسبه",
  "روابط مهم بین سیاره‌ها",
  "گزارش محاسبه‌شده هالیوس",
  "رایزینگ محاسبه‌شده",
  "اورب",
  "این کارت خلاصه شخصی چارت توست",
  "گزارش‌های من",
  "یادداشت کوتاه",
];

const requiredDetailMarkers = [
  "report-final-reading-anchor",
  "report-bottom-summary-panel",
  "report-bottom-summary-grid",
  "report-note-card-mini",
  "ذخیره در پنل",
];

const requiredFinalReadingMarkers = [
  "report-final-reading-card",
  "report-reading-section-list",
  "report-reading-section-card",
  "خوانش نهایی گزارش",
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

for (const marker of requiredDetailMarkers) {
  if (!reportDetail.includes(marker)) {
    throw new Error(`ReportDetail is missing product reading marker: ${marker}`);
  }
}

for (const marker of requiredFinalReadingMarkers) {
  if (!reportV3Experience.includes(marker)) {
    throw new Error(`ReportV3Experience is missing final-reading marker: ${marker}`);
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
  "رایزینگ تقریبی",
  "لایه‌های تفسیر",
  "جزئیات خوانش فارسی",
  " · orb ",
  "aspectها",
  "کپی متن اشتراک‌گذاری",
  "handleCopyShareText",
  "پشتوانه خوانش نهایی",
  "خلاصه داده‌ها",
];

const forbiddenDetailMarkers = [
  "ChartEngineReportBadge",
  "Chart Engine Path",
  "Manual server persistence check",
  "Beta database save",
  "Beta database copy",
  "Loaded beta database",
  "Saving beta",
  "ذخیره آزمایشی",
  "بررسی ذخیره سرور",
  "handleBetaDatabaseSave",
  "isBetaDatabaseSaving",
  "گزارش چارت تولد تو آماده است",
  "گرفتن نسخه متنی",
  "گرفتن فایل پشتیبان",
  "نگهداری گزارش",
  "سفارش نسخه کامل‌تر",
  "سفارش گزارش کامل‌تر",
  "دیدن پلن‌ها",
  "report-reading-next-step-card",
  "report-detail-toolbar",
  "گزارش ذخیره‌شده",
];

const forbiddenFinalReadingMarkers = [
  "downloadText",
  "copyText",
  "دانلود متن گزارش",
  "کپی متن گزارش",
  "نمایش همه",
  "report-preview-list",
  "activeSectionId",
  "(index + 1)",
];

const requiredBridgeMarkers = [
  "پشتوانه محاسباتی",
  "report-bridge-summary-card",
  "جایگاه‌های برجسته",
  "جنبه‌های برجسته",
  "formatBridgePointLabel",
  "formatBridgeAspectLabel",
  "اورب",
  "در حال تکمیل",
];

const forbiddenBridgeMarkers = [
  "Real chart bridge",
  "، orb",
  "placement یا aspect",
  "getReportRealChartBridgeTitle",
  "getReportRealChartBridgeDescription",
];

for (const marker of forbiddenReportMarkers) {
  if (reportCard.includes(marker)) {
    throw new Error(`ReportCard still has debug-like marker: ${marker}`);
  }
}

for (const marker of forbiddenDetailMarkers) {
  if (reportDetail.includes(marker)) {
    throw new Error(`ReportDetail still has debug/internal marker: ${marker}`);
  }
}

for (const marker of forbiddenFinalReadingMarkers) {
  if (reportV3Experience.includes(marker)) {
    throw new Error(`ReportV3Experience still has button/list marker: ${marker}`);
  }
}

for (const marker of requiredBridgeMarkers) {
  if (!bridgePanel.includes(marker)) {
    throw new Error(`ChartReportBridgePanel is missing product marker: ${marker}`);
  }
}

for (const marker of forbiddenBridgeMarkers) {
  if (bridgePanel.includes(marker)) {
    throw new Error(`ChartReportBridgePanel still has debug-like marker: ${marker}`);
  }
}

const reportCardRenderIndex = reportDetail.indexOf("<ReportCard report={report} />");
const finalReadingRenderIndex = reportDetail.indexOf("<ReportV3Experience report={report} />");
const supportingBridgeRenderIndex = reportDetail.indexOf("<ChartReportBridgePanel report={report} />");

if (
  reportCardRenderIndex === -1 ||
  finalReadingRenderIndex === -1 ||
  supportingBridgeRenderIndex === -1
) {
  throw new Error("ReportDetail should render the chart summary, final reading, and supporting details.");
}

if (reportCardRenderIndex > finalReadingRenderIndex) {
  throw new Error("ReportDetail should show the product chart summary before the final reading.");
}

if (finalReadingRenderIndex > supportingBridgeRenderIndex) {
  throw new Error("ReportDetail should keep supporting chart details after the final reading.");
}

if (reportsPage.includes("نسخه MVP")) {
  throw new Error("Reports page metadata still mentions MVP.");
}

if (!packageJson.includes('"check:report-detail-product-ui"')) {
  throw new Error("package.json is missing check:report-detail-product-ui.");
}

console.log("report detail product UI check passed");
