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
assert(reportDetail.includes("report-detail-section-chip-scroll"), "ReportDetail must keep chip scroll wrapper.");
assert(
  reportDetail.includes("report-detail-app-main-stack") || reportDetail.includes("report-detail-main-reader-grid"),
  "ReportDetail must keep a live reader layout container.",
);
assert(reportDetail.includes("report-detail-primary-reading-card"), "ReportDetail must keep a primary reading card.");
assert(reportDetail.includes("report-detail-section-card"), "ReportDetail must keep app section cards.");
assert(reportDetail.includes("report-detail-live-personal-transit-card"), "ReportDetail must keep personal transit card.");
assert(reportDetail.includes("engineData?.personalTransitReportData"), "Personal Transit must read stored report data.");
assert(!reportDetail.includes("navigator.geolocation"), "ReportDetail must not use browser geolocation.");
assert(!reportDetail.includes("currentResidence: {"), "ReportDetail must not synthesize current residence.");
assert(!reportDetail.includes("localStorage.getItem"), "ReportDetail must not read localStorage for report/transit data.");

for (const marker of [
  "report-final-reading-card",
  "data-live-report-reading-contract",
  "summarySentences.map",
  "reflectionQuestions",
]) {
  assert(reportV3Experience.includes(marker), `ReportV3Experience missing existing reader marker: ${marker}`);
}

for (const marker of [
  "Report detail app UI polish v0.1.271a",
  "Report detail simple app redesign v0.1.272a",
  ".report-detail-section-chips",
  ".report-detail-section-chip-scroll",
  ".report-detail-app-main-stack",
  ".report-detail-primary-reading-card",
  ".report-detail-section-card",
  ".report-reading-section-card",
  ".report-detail-quick-card-grid",
  "overflow-wrap: anywhere",
  "@media (max-width: 720px)",
]) {
  assert(globalsCss.includes(marker), `globals.css missing app UI/redesign marker: ${marker}`);
}

assert(packageJson.scripts?.["check:report-detail-app-ui-polish"] === "node scripts/check-report-detail-app-ui-polish.mjs", "package.json missing check:report-detail-app-ui-polish.");

console.log("Report detail app UI polish guard passed.");
