import { readFileSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8").replace(/\r\n/g, "\n"); }
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function includesAll(label, text, markers) { for (const marker of markers) assert(text.includes(marker), `${label} missing marker: ${marker}`); }
function excludesAll(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), `${label} must not include marker: ${marker}`); }

const section = read("components/PersonalTransitReportSection.tsx");
const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const packageJson = JSON.parse(read("package.json"));

includesAll("PersonalTransitReportSection comparison depth", section, [
  "v0.1.255-personal-transit-visible-report-section",
  "v0.1.261-personal-transit-comparison-depth",
  "v0.1.288-report-special-points-transit-final-qa",
  "مقایسه‌ی چارت تولد و آسمان ثبت‌شده",
  "فشار،",
  "فرصت یا توجه بیشتری",
  "بدون پیش‌فرض پنهان تهران",
  "currentResidenceIsRequired",
  "missing-current-residence",
  "buildPersonalTransitBehavioralInterpretation",
  "selectPersonalTransitHighlights",
  "visibleAspectHighlights",
  "formatAspectTitle",
  "technicalDetail",
  "data.visibleAspectHighlights.slice(0, 5)",
  "selectPersonalTransitHighlights(data.aspectHighlights",
  "data-personal-transit-technical-disclaimer",
  "دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها",
  "نه پیش‌بینی قطعی",
]);
excludesAll("PersonalTransitReportSection stale comparison copy", section, [
  "مقایسه‌ی چارت تولد و چارت امروز",
  "فشار/فرصت/توجه",
  "جریان امروز",
]);
excludesAll("PersonalTransitReportSection forbidden runtime access", section, [
  "fetch(", "axios", "swisseph", "sweph", "process.env", "window.location", "localStorage", "paid-private", "payment",
]);
includesAll("personal transit data bridge remains source", bridge, [
  "engineData.personalTransitReportData",
  "currentResidenceRequired: true",
  "noSilentTehranDefaultForPersonalTransit: true",
  "aspectHighlights",
  "transitLocalDate",
  "sampleLocalTime",
  "missing-current-residence",
]);
assert(packageJson.scripts?.["check:personal-transit-comparison-depth"] === "node scripts/check-personal-transit-comparison-depth.mjs", "package.json must expose check:personal-transit-comparison-depth.");
for (const scriptName of ["check:reports", "check:project"]) {
  assert(packageJson.scripts?.[scriptName]?.includes("pnpm run check:personal-transit-comparison-depth"), `${scriptName} must include personal transit comparison depth guard.`);
}

if (failures.length > 0) {
  console.error("Personal transit comparison depth guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Personal transit comparison depth guard passed.");
