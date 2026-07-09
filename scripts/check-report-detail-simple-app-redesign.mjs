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

for (const marker of [
  "report-detail-app-main-stack",
  "report-detail-primary-reading-card",
  "report-detail-section-card",
  "report-detail-section-chip-scroll",
  "id=\"final-reading\"",
  "id=\"quick-facts\"",
  "id=\"core-pillars\"",
  "id=\"planet-placements\"",
  "id=\"aspect-relationships\"",
  "id=\"special-points\"",
  "id=\"personal-transit\"",
  "engineData?.personalTransitReportData",
]) {
  assert(reportDetail.includes(marker), `ReportDetail missing simple app marker: ${marker}`);
}

assert(!reportDetail.includes("navigator.geolocation"), "ReportDetail must not use browser geolocation.");
assert(!reportDetail.includes("currentResidence: {"), "ReportDetail must not synthesize current residence.");
assert(!reportDetail.includes("localStorage.getItem"), "ReportDetail must not read localStorage for transit data.");

for (const marker of [
  "report-final-reading-card",
  "report-reading-section-list",
  "report-reading-section-card",
  "createReadingParagraphs",
]) {
  assert(reportV3Experience.includes(marker), `ReportV3Experience missing existing reader marker: ${marker}`);
}

for (const marker of [
  "Report detail simple app redesign v0.1.272a",
  ".report-detail-app-main-stack",
  ".report-detail-section-chip-scroll",
  ".report-detail-primary-reading-card",
  ".report-detail-section-card",
  ".report-reading-section-card",
  "grid-template-columns: 1fr !important",
  "@media (max-width: 720px)",
]) {
  assert(globalsCss.includes(marker), `globals.css missing simple app redesign marker: ${marker}`);
}

assert(
  packageJson.scripts?.["check:report-detail-simple-app-redesign"] === "node scripts/check-report-detail-simple-app-redesign.mjs",
  "package.json missing check:report-detail-simple-app-redesign."
);

console.log("Report detail simple app redesign guard passed.");
