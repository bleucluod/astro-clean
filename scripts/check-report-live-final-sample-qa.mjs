// HALLEUS_DEEP_NARRATIVE_SLICE5_LIVE_SAMPLE_OWNER_RECONCILIATION_R7_20260903
import fs from "node:fs";

const repairMarker = "HALLEUS_REPORT_LIVE_CONTINUOUS_EDITORIAL_BATCH1_20260808";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function assertIncludes(text, marker, message) {
  assert(text.includes(marker), message + " Missing marker: " + marker);
}

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const reader = read("components/report/ReportProductReader.tsx");
const summary = read("components/report/FiveMinuteReportSummary.tsx");
const reportV3Experience = read("components/ReportV3Experience.tsx");
const reportV3 = read("lib/report-output/report-v3.ts");
const visibleLanguage = read("lib/report-output/visible-report-language.ts");
const packageJson = JSON.parse(read("package.json"));

assertIncludes(routePage, "ReportDetail", "Live report route must render ReportDetail.");
assert(!routePage.includes("ReportCard"), "Live report route must not render ReportCard.");
for (const marker of [
  "ReportProductReader",
  "initialAccessPolicy={initialAccessPolicy}",
  "report={report}",
  "storedAccessTier={storedAccessTier}",
  'from "@/lib/report-output/visible-report-language"',
  "sanitizeVisibleReportValue(initialReport)",
  "sanitizeVisibleReportText(message)",
  "getPublicReportRecord",
  "getAccountReportRecord",
  "mutateAccountReport",
  "deleteAccountReport",
  "createPrivacySafeReportText",
  'reportSource === "public"',
  'reportSource === "account"',
]) {
  assertIncludes(reportDetail, marker, "ReportDetail must preserve the live report shell and privacy controls.");
}
assert(!reportDetail.includes("REPORT_DETAIL_PRODUCT_VERSION"), "Visible product-version marker must stay removed.");
assert(!reportDetail.includes("function sanitizeReportVisibleCopy"), "ReportDetail must not restore its local visible-language sanitizer.");
assert(!reportDetail.includes("ReportV3Experience"), "ReportDetail must not bypass ReportProductReader.");

for (const marker of [
  "buildLiveReportReadingContract",
  'data-report-product-flow="continuous"',
  'id="report-summary"',
  'id="report-full"',
  'id="report-sky"',
  'id="report-chart"',
  "FiveMinuteReportSummary",
  "ReportV3Experience",
  "readingContract={contract}",
  "HumanTransitReading",
  "ReportBirthChartWheel",
  "ReportTechnicalAppendix",
  "contract={contract}",
  "report={report}",
]) {
  assertIncludes(reader, marker, "ReportProductReader must expose the complete continuous live experience.");
}
for (const forbidden of ["ReportStoryMode", "ModeButton", "ReportReadingNavigation", "ReportProductMode"]) {
  assert(!reader.includes(forbidden), "Retired report architecture remains: " + forbidden);
}

const flowLabels = ["خلاصهٔ چارت", "گزارش کامل چارت تولد", "آسمان و تو", "چارت و جزئیات"];
const flowPositions = flowLabels.map((label) => reader.indexOf(label));
assert(flowPositions.every((position) => position >= 0), "One or more continuous-flow labels are missing.");
for (let index = 1; index < flowPositions.length; index += 1) {
  assert(flowPositions[index - 1] < flowPositions[index], "Continuous report section order is not stable.");
}

const transitBridgeStart = reader.indexOf("const transitData = useMemo(");
assert(transitBridgeStart >= 0, "Stored transit bridge is missing.");
const transitBridge = reader.slice(transitBridgeStart, transitBridgeStart + 500);
assertIncludes(transitBridge, "engineData?.personalTransitReportData ?? null", "Stored transit must read the report bridge only.");
for (const forbidden of ["localStorage", "navigator.geolocation", "currentResidence: {", "fetch("]) {
  assert(!transitBridge.includes(forbidden), "Stored transit bridge contains forbidden live inference: " + forbidden);
}

for (const marker of [
  "contract.corePlacements",
  "contract.hasReliableBirthTime",
  "contract.chartSignature",
  "contract.primaryPatterns.slice(0, 3)",
  "contract.evidenceReferences",
  'onOpenFullReport("overview")',
]) {
  assertIncludes(summary, marker, "Five-minute summary must remain data-backed and navigable.");
}
for (const forbidden of ["sweph", "astronomy-engine", "navigator.geolocation", "currentResidence: {"]) {
  assert(!summary.includes(forbidden), "Five-minute summary performs forbidden calculation or inference: " + forbidden);
}

for (const marker of [
  "buildHumanFirstBirthReading",
  "enhanceReportOutputV3",
  "readingContract",
  "reading.primaryPatterns",
  "ReportPersonalPlanetChapters",
  "contract.personalPlanetChapters",
  "ReportWholeChartSynthesis",
  "contract.wholeChartSynthesis",
  'data-report-product-quality="human-first-birth-report"',
]) {
  assertIncludes(reportV3Experience, marker, "Full report must preserve the current human-first astrology ownership.");
}
for (const retiredGenericOwner of [
  "reading.innerWorld",
  "reading.mindLanguage",
  "reading.relationships",
  "reading.driveDirection",
]) {
  assert(
    !reportV3Experience.includes(retiredGenericOwner),
    "Full report restored retired generic chapter ownership: " + retiredGenericOwner,
  );
}
for (const marker of ["sanitizeVisibleReportText", "sanitizeVisibleReportValue", "ENGLISH_INTERNAL_TERMS", "EXACT_VISIBLE_REPLACEMENTS"]) {
  assertIncludes(visibleLanguage, marker, "Central visible-language contract is incomplete.");
}
assertIncludes(reportV3, "REPORT_TRUST_SAFETY_NOTE", "report-v3 must own the visible trust/safety note.");

for (const storyPath of [
  "components/report/ReportStoryMode.tsx",
  "components/report/report-story-mode.module.css",
  "lib/report-output/report-story-mode.ts",
]) {
  assert(!fs.existsSync(storyPath), `Story Mode file must be removed: ${storyPath}`);
}

assert(packageJson.scripts?.["check:report-live-final-sample-qa"] === "node scripts/check-report-live-final-sample-qa.mjs", "package.json must expose the final live report QA guard.");
assert(packageJson.scripts?.["check:report-five-minute-summary"] === "node scripts/check-report-five-minute-summary.mjs", "package.json must expose the focused five-minute-summary guard.");

console.log("Report live final sample QA guard passed for the continuous editorial report product.");
console.log("- route, loading shell, privacy, save, and publication controls remain in ReportDetail");
console.log("- summary, full report, stored sky, and technical data are one scrollable reading flow");
console.log("- Story Mode is removed; screenshot readiness belongs to the report itself");
console.log("- stored sky uses only report-owned transit data and performs no browser inference");
console.log("- " + repairMarker);
