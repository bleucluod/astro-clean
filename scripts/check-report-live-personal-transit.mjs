import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const personalTransit = read("components/PersonalTransitReportSection.tsx");
const reconciliation = read("scripts/check-report-live-feature-reconciliation.mjs");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");

assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(reportDetail.includes('from "@/components/PersonalTransitReportSection"'), "ReportDetail must import PersonalTransitReportSection.");
assert(reportDetail.includes("personalTransitReportData"), "ReportDetail must use personalTransitReportData.");
assert(reportDetail.includes("engineData") && reportDetail.includes("personalTransitReportData"), "ReportDetail must read personal transit from stored engineData.");
assert(reportDetail.includes("<PersonalTransitReportSection data={personalTransitReportData} />"), "ReportDetail must render PersonalTransitReportSection with stored report data.");
assert(reportDetail.includes('id="personal-transit"'), "ReportDetail must expose the personal-transit anchor.");
assert(reportDetail.includes("آسمان زمان گزارش"), "ReportDetail must expose the stored-time personal transit tab label.");
assert(reportDetail.includes("v0.1.288-report-special-points-transit-final-qa"), "ReportDetail missing v0.1.288 personal transit marker.");
assert(reportDetail.includes("تهران را پیش‌فرض نمی‌گیرد"), "ReportDetail must preserve no silent Tehran missing-state copy.");
assert(reportDetail.includes("هنگام بازکردن گزارش قدیمی داده‌ی تازه‌ای جایگزین نمی‌کند"), "ReportDetail must preserve stored-snapshot trust copy.");

const personalTransitReaderIndex = reportDetail.indexOf("getPersonalTransitReportData");
const personalTransitSectionIndex = reportDetail.indexOf("report-detail-live-personal-transit-card");
assert(personalTransitReaderIndex >= 0, "ReportDetail must contain the personal transit data reader.");
assert(personalTransitSectionIndex >= 0, "ReportDetail must contain the live personal transit section.");

const personalTransitContext = [
  reportDetail.slice(personalTransitReaderIndex, personalTransitReaderIndex + 900),
  reportDetail.slice(personalTransitSectionIndex, personalTransitSectionIndex + 1800),
].join("\n");
assert(!personalTransitContext.includes("localStorage"), "Personal transit bridge must not read localStorage.");
assert(!personalTransitContext.includes("navigator.geolocation"), "Personal transit bridge must not infer browser geolocation.");
assert(!personalTransitContext.includes("window.location"), "Personal transit bridge must not infer browser location.");
assert(!personalTransitContext.includes("currentResidence: {"), "Personal transit bridge must not construct fake currentResidence data.");

assert(personalTransit.includes("export function PersonalTransitReportSection"), "PersonalTransitReportSection must exist.");
assert(personalTransit.includes("missing-current-residence"), "PersonalTransitReportSection must preserve missing residence state.");
assert(personalTransit.includes("بدون پیش‌فرض پنهان تهران"), "PersonalTransitReportSection must preserve no silent Tehran copy.");
assert(personalTransit.includes("formatTransitLocalDate"), "PersonalTransitReportSection must format the stored transit date.");
assert(!personalTransit.includes("آسمان امروز نسبت به چارت تولد تو"), "Stored personal transit must not be relabeled as today.");

assert(!reconciliation.includes('["PersonalTransitReportSection", personalTransitSection]'), "Reconciliation guard must not count personal transit as non-live.");
assert(reconciliation.includes("<PersonalTransitReportSection data={personalTransitReportData} />"), "Reconciliation guard must assert live personal transit render.");
assert(projectContext.includes("v0.1.288 report special-points/transit final QA"), "Project context must record v0.1.288 personal transit trust boundary.");

console.log("Report live personal transit guard passed.");
