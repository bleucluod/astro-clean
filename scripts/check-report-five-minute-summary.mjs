import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, marker, label) {
  assert(content.includes(marker), `${label} is missing marker: ${marker}`);
}

function assertNotIncludes(content, marker, label) {
  assert(!content.includes(marker), `${label} contains forbidden marker: ${marker}`);
}

const reportDetail = read("components/ReportDetail.tsx");
const reader = read("components/report/ReportProductReader.tsx");
const summary = read("components/report/FiveMinuteReportSummary.tsx");
const visibleLanguage = read("lib/report-output/visible-report-language.ts");
const css = read("components/report/human-first-report.module.css");
const packageJson = JSON.parse(read("package.json"));
const experience = read("components/ReportV3Experience.tsx");
const humanReading = read("lib/report-output/human-first-report-reading.ts");

for (const marker of [
  'data-report-product-flow="continuous"',
  "data-report-journey-navigator",
  'id="report-summary"',
  'id="report-full"',
  'id="report-sky"',
  'id="report-chart"',
  "FiveMinuteReportSummary",
  "ReportV3Experience",
  "HumanTransitReading",
  "ReportBirthChartWheel",
  "ReportTechnicalAppendix",
]) {
  assertIncludes(reader, marker, "ReportProductReader continuous flow");
}
for (const forbidden of [
  "ReportStoryMode",
  "ModeButton",
  "desktopModeSwitch",
  'data-report-product-mode={mode}',
  'useState<ReportProductMode>("summary")',
]) {
  assertNotIncludes(reader, forbidden, "ReportProductReader continuous flow");
}

for (const marker of [
  'data-editorial-summary="astrology-first-beginner"',
  "CORE_EXPLAINERS",
  "contract.corePlacements",
  "contract.hasReliableBirthTime",
  "contract.chartSignature",
  "contract.primaryPatterns.slice(0, 3)",
  "contract.evidenceReferences",
  "خورشید؛ هویت و جهت",
  "ماه؛ احساس و امنیت",
  "طالع؛ ورود و تصویر اولیه",
  "چرا این نتیجه نجومی است؟",
  'onOpenFullReport("overview")',
]) {
  assertIncludes(summary, marker, "FiveMinuteReportSummary");
}
for (const forbidden of [
  "contract.primaryStrength",
  "contract.primaryChallenge",
  "contract.weeklyActions[0]",
  "calculate",
  "sweph",
  "astronomy-engine",
  "navigator.geolocation",
  "currentResidence",
]) {
  assertNotIncludes(summary, forbidden, "FiveMinuteReportSummary");
}

for (const marker of [
  "sanitizeVisibleReportText",
  "sanitizeVisibleReportValue",
  "ENGLISH_INTERNAL_TERMS",
  "EXACT_VISIBLE_REPLACEMENTS",
]) {
  assertIncludes(visibleLanguage, marker, "visible report language guard");
}
assertIncludes(reportDetail, 'from "@/lib/report-output/visible-report-language"', "ReportDetail");
assertIncludes(reportDetail, "sanitizeVisibleReportValue(initialReport)", "ReportDetail");
assertIncludes(reportDetail, "sanitizeVisibleReportText(message)", "ReportDetail");
assertNotIncludes(reportDetail, "REPORT_DETAIL_PRODUCT_VERSION", "ReportDetail");
assertNotIncludes(reportDetail, "function sanitizeReportVisibleCopy", "ReportDetail");

const editorialMarker = "/* HALLEUS_REPORT_EDITORIAL_FLOW_BATCH1_20260808 */";
assertIncludes(css, editorialMarker, "report CSS");
const editorialCss = css.slice(css.indexOf(editorialMarker));
for (const marker of [
  ".journeyNavigator",
  ".reportFlow",
  ".flowSection",
  ".summaryCoreGrid",
  ".summaryPatternGrid",
  "[data-screenshot-ready]",
  "@media (max-width: 760px)",
  "@media (max-width: 390px)",
]) {
  assertIncludes(editorialCss, marker, "editorial report CSS");
}
for (const forbiddenBlue of ["#1e40af", "#d9eafd", "30 64 175", "30, 64, 175"]) {
  assertNotIncludes(editorialCss.toLowerCase(), forbiddenBlue, "editorial report CSS");
}

for (const storyPath of [
  "components/report/ReportStoryMode.tsx",
  "components/report/report-story-mode.module.css",
  "lib/report-output/report-story-mode.ts",
]) {
  assert(!fs.existsSync(storyPath), `Story Mode file must be removed: ${storyPath}`);
}

assertIncludes(experience, "readingContract", "preserved ReportV3Experience");
assertIncludes(humanReading, "HUMAN_FIRST_REPORT_NAVIGATION", "preserved human-first reading");
assert(
  packageJson.scripts?.["check:report-five-minute-summary"] ===
    "node scripts/check-report-five-minute-summary.mjs",
  "package.json is missing check:report-five-minute-summary.",
);

console.log("Birth report editorial-flow Batch 1 summary guard passed.");
console.log("- astrology headings remain explicit while beginner copy explains them");
console.log("- the reader is one continuous report with a compact journey navigator");
console.log("- Story Mode is removed rather than hidden");
console.log("- screenshot-ready dark report surfaces are guarded without blue UI accents");
