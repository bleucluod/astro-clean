import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function indexOfRequired(text, pattern, message) {
  const index = text.indexOf(pattern);
  assert(index >= 0, message);
  return index;
}

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const reportV3Experience = read("components/ReportV3Experience.tsx");
const reportV3 = read("lib/report-output/report-v3.ts");
const facts = read("components/ReportDetailFactsPanel.tsx");
const placements = read("components/ReportPlanetPlacementSections.tsx");
const aspects = read("components/ReportAspectRelationshipSections.tsx");
const specialPoints = read("components/ReportSpecialPointsNarrativeSection.tsx");
const personalTransit = read("components/PersonalTransitReportSection.tsx");
const reconciliation = read("scripts/check-report-live-feature-reconciliation.mjs");
const packageJson = read("package.json");

const docs = [
  read("docs/HALLEUS_PROJECT_CONTEXT.md"),
  read("docs/HALLEUS_IDEA_GARDEN.md"),
  read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md"),
  read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md"),
].join("\n");

assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(!routePage.includes("ReportCard"), "Live report route must not render ReportCard.");
assert(reportDetail.includes("ReportV3Experience"), "ReportDetail must keep the live narrative experience.");
assert(reportV3Experience.includes("enhanceReportOutputV3"), "ReportV3Experience must keep report-v3 enhancement.");
assert(reportV3.includes("REPORT_TRUST_SAFETY_NOTE"), "report-v3 must own the visible trust/safety note.");

const primaryAnchors = [
  ['id="final-reading"', "summary"],
  ['id="core-pillars"', "Sun/Moon/Rising"],
  ['id="chart-ruler"', "chart ruler"],
  ['id="important-houses"', "important houses"],
  ['id="aspect-relationships"', "relationships"],
  ['id="special-points"', "lunar nodes"],
  ['id="energy-balance"', "energy balance"],
  ['id="weekly-practices"', "weekly practices"],
  ['id="planet-placements"', "placements"],
  ['id="chart-data"', "chart data"],
  ['id="personal-transit"', "stored sky"],
  ['id="technical-details"', "calculation details"],
];

const primaryPositions = primaryAnchors.map(([marker, label]) => ({
  label,
  index: indexOfRequired(reportDetail, marker, `ReportDetail must expose ${label} anchor.`),
}));
for (let index = 1; index < primaryPositions.length; index += 1) {
  assert(
    primaryPositions[index - 1].index < primaryPositions[index].index,
    `${primaryPositions[index - 1].label} must come before ${primaryPositions[index].label}.`,
  );
}

for (const chip of [
  '["final-reading", "خلاصه"]',
  '["core-pillars", "خورشید، ماه و رایزینگ"]',
  '["chart-ruler", "سیاره‌ی راهبر"]',
  '["important-houses", "خانه‌های مهم"]',
  '["aspect-relationships", "رابطه‌های مهم"]',
  '["special-points", "دست‌های ماه"]',
  '["energy-balance", "ترکیب انرژی‌ها"]',
  '["weekly-practices", "سه کار این هفته"]',
  '["planet-placements", "سیاره‌ها در زندگی روزمره"]',
  '["chart-data", "داده‌های چارت"]',
  '["personal-transit", "آسمان ثبت‌شده"]',
  '["technical-details", "جزئیات محاسبه"]',
]) {
  assert(reportDetail.includes(chip), `ReportDetail missing live report chip: ${chip}`);
}

assert(reportDetail.includes("v0.1.265b-report-detail-live-path-reality"), "Missing live path marker.");
assert(reportDetail.includes("v0.1.266-live-report-structure-facts"), "Missing live facts marker.");
assert(reportDetail.includes("v0.1.267-live-report-placements-aspects"), "Missing live placements/aspects marker.");
assert(reportDetail.includes("v0.1.268-live-report-lilith-nodes"), "Missing live Lilith/nodes marker.");
assert(reportDetail.includes("v0.1.288-report-special-points-transit-final-qa"), "Missing v0.1.288 personal transit trust marker.");

assert(reportDetail.includes("<ReportDetailFactsPanel report={report} />"), "Quick facts component must render live.");
assert(reportDetail.includes("<ReportPlanetPlacementSections report={report} />"), "Placements component must render live.");
assert(reportDetail.includes("<ReportAspectRelationshipSections report={report} />"), "Aspects component must render live.");
assert(reportDetail.includes("<ReportSpecialPointsNarrativeSection report={report} />"), "Special points component must render live.");
assert(reportDetail.includes("<PersonalTransitReportSection data={personalTransitReportData} />"), "Personal transit component must render live.");

assert(facts.includes("export function ReportDetailFactsPanel"), "Facts component must exist.");
assert(placements.includes("export function ReportPlanetPlacementSections"), "Placements component must exist.");
assert(aspects.includes("export function ReportAspectRelationshipSections"), "Aspects component must exist.");
assert(specialPoints.includes("export function ReportSpecialPointsNarrativeSection"), "Special points component must exist.");
assert(personalTransit.includes("export function PersonalTransitReportSection"), "Personal transit component must exist.");

const personalTransitReaderIndex = reportDetail.indexOf("getPersonalTransitReportData");
const personalTransitSectionIndex = reportDetail.indexOf("report-detail-live-personal-transit-card");
assert(personalTransitReaderIndex >= 0, "ReportDetail must keep stored personal-transit data reader.");
assert(personalTransitSectionIndex >= 0, "ReportDetail must keep personal-transit card.");
const personalTransitContext = [
  reportDetail.slice(personalTransitReaderIndex, personalTransitReaderIndex + 900),
  reportDetail.slice(personalTransitSectionIndex, personalTransitSectionIndex + 1600),
].join("\n");
assert(personalTransitContext.includes("engineData?.personalTransitReportData"), "Personal transit bridge must read stored engineData only.");
assert(!personalTransitContext.includes("localStorage"), "Personal transit bridge must not read localStorage.");
assert(!personalTransitContext.includes("navigator.geolocation"), "Personal transit bridge must not infer browser geolocation.");
assert(!personalTransitContext.includes("window.location"), "Personal transit bridge must not infer browser location.");
assert(!personalTransitContext.includes("currentResidence: {"), "Personal transit bridge must not construct fake currentResidence data.");
assert(personalTransitContext.includes("تهران را پیش‌فرض نمی‌گیرد"), "Personal transit bridge must keep no-hidden-Tehran missing-state copy.");

assert(!reconciliation.includes('["ReportPlanetPlacementSections", placementSections]'), "Placements must no longer be marked non-live.");
assert(!reconciliation.includes('["ReportAspectRelationshipSections", aspectSections]'), "Aspects must no longer be marked non-live.");
assert(!reconciliation.includes('["ReportSpecialPointsNarrativeSection", specialPointsSection]'), "Special points must no longer be marked non-live.");
assert(!reconciliation.includes('["PersonalTransitReportSection", personalTransitSection]'), "Personal transit must no longer be marked non-live.");
assert(reconciliation.includes('["ReportCard", reportCard]'), "ReportCard should remain a non-live/legacy surface.");
assert(reconciliation.includes('["ReportSynthesisSection", synthesisSection]'), "ReportSynthesisSection should remain non-live because synthesis is from writer/V3.");

assert(!docs.includes("Personal transit is not live yet."), "Docs still contain stale current personal-transit not-live claim.");
assert(!docs.includes("personal transit remains explicitly not live yet."), "Docs still contain stale current personal-transit remains-not-live claim.");
assert(docs.includes("Personal transit is now live in ReportDetail"), "Docs must record personal transit as live.");
assert(docs.includes("v0.1.270"), "Docs must record final live report QA cleanup.");
assert(docs.includes("Workflow failure note for v0.1.270 closure"), "Project context must include the v0.1.270 failure-ledger closure note.");

assert(packageJson.includes('"check:report-live-final-sample-qa"'), "package.json must expose the final live report QA guard.");
assert(packageJson.includes("check-report-live-final-sample-qa.mjs"), "package.json must point to the final live report QA guard.");

console.log("Report live final sample QA guard passed.");
