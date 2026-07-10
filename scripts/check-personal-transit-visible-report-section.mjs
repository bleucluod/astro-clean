import { readFileSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8").replace(/\r\n/g, "\n"); }
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function includesAll(label, text, markers) { for (const marker of markers) assert(text.includes(marker), `${label} missing marker: ${marker}`); }
function excludesAll(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), `${label} must not include marker: ${marker}`); }

const reportCard = read("components/ReportCard.tsx");
const section = read("components/PersonalTransitReportSection.tsx");
const contract = read("src/lib/chart/natal-to-transit-contract.ts");
const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const packageJson = JSON.parse(read("package.json"));

includesAll("ReportCard personal transit wiring", reportCard, [
  "PersonalTransitReportSection",
  "getPersonalTransitReportData(report)",
  "engineData?.personalTransitReportData",
  "<PersonalTransitReportSection data={personalTransitReportData} />",
]);
includesAll("PersonalTransitReportSection", section, [
  "v0.1.255-personal-transit-visible-report-section",
  "v0.1.288-report-special-points-transit-final-qa",
  "آسمان زمان ساخت گزارش نسبت به چارت تولد تو",
  "ترنزیت ثبت‌شده برای چارت تولد",
  "زمان محاسبه",
  "formatTransitLocalDate",
  "formatTransitMoment",
  "بدون پیش‌فرض پنهان تهران",
  "missing-current-residence",
  "دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها",
]);
excludesAll("PersonalTransitReportSection stale live copy", section, [
  "آسمان امروز نسبت به چارت تولد تو",
  "ترنزیت امروز برای چارت تولد",
  "امروز کدام بخش‌های چارت تولد تو روشن‌تر می‌شود؟",
  "placementها",
  "aspectها",
  "special points",
  "deferred",
  "Halleus",
]);
excludesAll("PersonalTransitReportSection forbidden runtime access", section, [
  "fetch(", "axios", "swisseph", "sweph", "process.env", "window.location", "localStorage", "paid-private", "payment",
]);
includesAll("contract visible report section status", contract, [
  'personalTransitStage: "user-visible"',
  "userVisibleDone: true",
  "dataBridgeDone: true",
  "visibleReportSectionAfterDataBridge: true",
  "visibleReportSectionApproved: true",
]);
includesAll("visible bridge remains data source", bridge, [
  "engineData.personalTransitReportData",
  "userVisible: true",
  "visibleReportSectionApproval: true",
  "transitLocalDate",
  "sampleLocalTime",
  "No silent Tehran default is allowed for personal reports.",
]);
assert(packageJson.scripts?.["check:personal-transit-visible-report-section"] === "node scripts/check-personal-transit-visible-report-section.mjs", "package.json must expose visible section guard.");
assert(packageJson.scripts?.["check:reports"]?.includes("pnpm run check:personal-transit-visible-report-section"), "check:reports must include visible section guard.");

if (failures.length > 0) {
  console.error("Personal transit visible report section guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Personal transit visible report section guard passed.");
