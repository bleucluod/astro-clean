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

const finalReadingIndex = indexOfRequired(reportDetail, 'id="final-reading"', "ReportDetail must expose final-reading anchor.");
const factsIndex = indexOfRequired(reportDetail, 'id="quick-facts"', "ReportDetail must expose quick-facts anchor.");
const pillarsIndex = indexOfRequired(reportDetail, 'id="core-pillars"', "ReportDetail must expose core-pillars anchor.");
const placementsIndex = indexOfRequired(reportDetail, 'id="planet-placements"', "ReportDetail must expose planet-placements anchor.");
const aspectsIndex = indexOfRequired(reportDetail, 'id="aspect-relationships"', "ReportDetail must expose aspect-relationships anchor.");
const specialPointsIndex = indexOfRequired(reportDetail, 'id="special-points"', "ReportDetail must expose special-points anchor.");
const personalTransitIndex = indexOfRequired(reportDetail, 'id="personal-transit"', "ReportDetail must expose personal-transit anchor.");

assert(finalReadingIndex < factsIndex, "Final reading must stay before quick facts.");
assert(factsIndex < pillarsIndex, "Quick facts must stay before core pillars.");
assert(pillarsIndex < placementsIndex, "Core pillars must stay before placements.");
assert(placementsIndex < aspectsIndex, "Placements must stay before aspects.");
assert(aspectsIndex < specialPointsIndex, "Aspects must stay before Lilith/nodes.");
assert(specialPointsIndex < personalTransitIndex, "Lilith/nodes must stay before personal transit.");

for (const chip of [
  '["final-reading", "روایت اصلی"]',
  '["quick-facts", "اطلاعات سریع"]',
  '["planet-placements", "جایگاه‌ها"]',
  '["aspect-relationships", "روابط"]',
  '["special-points", "لیلیت و دست‌های ماه"]',
  '["personal-transit", "آسمان زمان گزارش"]',
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
