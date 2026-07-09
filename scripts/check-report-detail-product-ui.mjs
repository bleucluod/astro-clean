import { readFileSync } from "node:fs";

function read(file) {
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const reportV3Experience = read("components/ReportV3Experience.tsx");
const globalsCss = read("app/globals.css");
const packageJson = JSON.parse(read("package.json"));

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

assertIncludes(routePage, "ReportDetail", "Live report route");
assertNotIncludes(routePage, "ReportCard", "Live report route");

for (const marker of [
  "report-detail-hero-simple",
  "report-detail-birth-card",
  "report-detail-hero-copy-simple",
  "report-detail-chart-card",
  "report-detail-section-chips",
  "report-detail-section-chip-scroll",
  "report-detail-app-main-stack",
  "report-detail-primary-reading-card",
  "report-detail-section-card",
  "report-detail-pillars-card",
  "report-detail-live-placements-card",
  "report-detail-live-aspects-card",
  "report-detail-live-special-points-card",
  "report-detail-live-personal-transit-card",
  "report-detail-quick-card-grid",
  "report-detail-technical-sections",
  "report-detail-next-actions",
  "ReportV3Experience",
  "engineData?.personalTransitReportData",
]) {
  assertIncludes(reportDetail, marker, "ReportDetail");
}

for (const marker of [
  "report-final-reading-card",
  "report-reading-section-list",
  "report-reading-section-card",
  "createReadingParagraphs",
]) {
  assertIncludes(reportV3Experience, marker, "ReportV3Experience");
}

for (const marker of [
  "Report detail simple reader redesign v0.1.211c",
  "Report detail app UI polish v0.1.271a",
  "Report detail simple app redesign v0.1.272a",
  ".report-detail-hero-simple",
  ".report-detail-section-chips",
  ".report-detail-section-chip-scroll",
  ".report-detail-app-main-stack",
  ".report-detail-primary-reading-card",
  ".report-detail-section-card",
  ".report-detail-quick-card-grid",
  ".report-detail-technical-sections",
  "overflow-wrap: anywhere",
  "@media (max-width: 720px)",
]) {
  assertIncludes(globalsCss, marker, "globals.css");
}

for (const forbidden of [
  "navigator.geolocation",
  "currentResidence: {",
  "localStorage.getItem",
  "window.location.href =",
]) {
  assertNotIncludes(reportDetail, forbidden, "ReportDetail");
}

if (packageJson.scripts?.["check:report-detail-product-ui"] !== "node scripts/check-report-detail-product-ui.mjs") {
  throw new Error("package.json is missing check:report-detail-product-ui.");
}

console.log("report detail product UI check passed");
