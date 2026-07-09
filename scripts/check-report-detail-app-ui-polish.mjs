import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const reportV3Experience = read("components/ReportV3Experience.tsx");
const globalsCss = read("app/globals.css");
const packageJson = JSON.parse(read("package.json"));

assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(!routePage.includes("ReportCard"), "Live report route must not render ReportCard.");
assert(reportDetail.includes("ReportV3Experience"), "ReportDetail must keep ReportV3Experience.");
assert(reportDetail.includes('id="final-reading"'), "ReportDetail must keep final-reading anchor.");
assert(reportDetail.includes("report-detail-section-chips"), "ReportDetail must keep section chips.");
assert(reportDetail.includes("report-detail-main-reader-grid"), "ReportDetail must keep reader grid.");
assert(reportDetail.includes("report-detail-live-personal-transit-card"), "ReportDetail must keep personal transit card.");
assert(reportDetail.includes("engineData?.personalTransitReportData"), "Personal Transit must read stored report data.");
assert(!reportDetail.includes("navigator.geolocation"), "ReportDetail must not use browser geolocation.");
assert(!reportDetail.includes("currentResidence: {"), "ReportDetail must not synthesize current residence.");

for (const marker of [
  "report-final-reading-card",
  "report-reading-section-list",
  "report-reading-section-card",
  "createReadingParagraphs",
]) {
  assert(reportV3Experience.includes(marker), `ReportV3Experience missing existing reader marker: ${marker}`);
}

for (const marker of [
  "Report detail app UI polish v0.1.271a",
  ".report-detail-main-reader-grid",
  ".report-detail-section-chips",
  ".report-final-reading-card",
  ".report-reading-section-card",
  ".report-detail-quick-card-grid",
  "overflow-wrap: anywhere",
  "line-height: 2.12",
  "@media (max-width: 720px)",
]) {
  assert(globalsCss.includes(marker), `globals.css missing app UI polish marker: ${marker}`);
}

assert(!reportDetail.includes("localStorage.getItem"), "ReportDetail must not read localStorage for report/transit data.");
assert(packageJson.scripts?.["check:report-detail-app-ui-polish"] === "node scripts/check-report-detail-app-ui-polish.mjs", "package.json missing check:report-detail-app-ui-polish.");

console.log("Report detail app UI polish guard passed.");
