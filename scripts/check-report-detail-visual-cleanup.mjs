import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoMojibake(text, label) {
  for (const marker of [String.fromCharCode(0x00d8), String.fromCharCode(0x00d9), String.fromCharCode(0x00db), String.fromCharCode(0x00da), String.fromCharCode(0x00e2)]) {
    assert(!text.includes(marker), `${label} contains mojibake marker ${marker.charCodeAt(0)}`);
  }
}

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const globalsCss = read("app/globals.css");
const packageJson = JSON.parse(read("package.json"));

assertNoMojibake(reportDetail, "ReportDetail");
assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(!routePage.includes("ReportCard"), "Live report route must not render ReportCard.");

for (const marker of [
  "report-detail-hero-simple",
  "report-detail-birth-card",
  "report-detail-section-chips",
  "report-detail-pillars-card",
  "ReportV3Experience",
]) {
  assert(reportDetail.includes(marker), `ReportDetail missing live visual marker: ${marker}`);
}

assert(!reportDetail.includes("data-report-app-shell-redesign"), "ReportDetail must not contain the failed app-shell attempt marker.");
assert(!reportDetail.includes("report-app-topbar"), "ReportDetail must not contain the failed app-shell topbar marker.");
assert(!reportDetail.includes(String.fromCharCode(92) + "u"), "ReportDetail must not contain literal unicode escape markers.");

for (const marker of [
  "Report detail CSS-only visual cleanup v0.1.273",
  ".report-detail-section-chips",
  "display: none !important",
  ".report-detail-pillars-card",
  "position: static !important",
  ".report-detail-birth-card .report-detail-key-value-list > .report-detail-key-value:nth-child(4)",
]) {
  assert(globalsCss.includes(marker), `globals.css missing CSS-only visual cleanup marker: ${marker}`);
}

assert(
  packageJson.scripts?.["check:report-detail-visual-cleanup"] === "node scripts/check-report-detail-visual-cleanup.mjs",
  "package.json missing check:report-detail-visual-cleanup.",
);

console.log("Report detail CSS-only visual cleanup guard passed.");
