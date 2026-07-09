import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const reportV3Experience = read("components/ReportV3Experience.tsx");
const reportV3 = read("lib/report-output/report-v3.ts");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const reportCard = read("components/ReportCard.tsx");
const synthesisSection = read("components/ReportSynthesisSection.tsx");
const factsPanel = read("components/ReportDetailFactsPanel.tsx");
const placementSections = read("components/ReportPlanetPlacementSections.tsx");
const aspectSections = read("components/ReportAspectRelationshipSections.tsx");
const specialPointsSection = read("components/ReportSpecialPointsNarrativeSection.tsx");
const personalTransitSection = read("components/PersonalTransitReportSection.tsx");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

const nonLiveComponents = [
  ["ReportCard", reportCard],
  ["ReportSynthesisSection", synthesisSection],
  ["PersonalTransitReportSection", personalTransitSection],
];

assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(reportDetail.includes("ReportV3Experience"), "Live report detail must render ReportV3Experience.");
assert(reportDetail.includes("RealChartWheel"), "Live report detail must render RealChartWheel.");
assert(reportV3Experience.includes("enhanceReportOutputV3"), "ReportV3Experience must use report-v3 enhancer.");
assert(reportV3.includes("REPORT_TRUST_SAFETY_NOTE"), "Live report-v3 must own the final trust/safety note.");
assert(writer.includes("real-engine-first-synthesis"), "Live writer must provide the first synthesis section.");
assert(writer.includes("buildLunarNodeText"), "Live writer must provide lunar-node narrative text from the real-engine output.");
assert(writer.includes("local-true-osculating"), "Live writer must preserve local True/Osculating node language.");

for (const [name] of nonLiveComponents) {
  assert(!reportDetail.includes(`<${name}`), `${name} must not be counted as live unless ReportDetail renders it.`);
  assert(!reportDetail.includes(`from "@/components/${name}"`), `${name} must not be imported by ReportDetail until a real live bridge exists.`);
}

assert(reportCard.includes("REPORT_CARD_SAFETY_NOTE"), "ReportCard exists as a non-live/legacy report card surface.");
assert(synthesisSection.includes("export function ReportSynthesisSection"), "ReportSynthesisSection exists but is not the live synthesis source.");
assert(factsPanel.includes("export function ReportDetailFactsPanel"), "ReportDetailFactsPanel must exist for the live quick facts bridge.");
assert(reportDetail.includes("ReportDetailFactsPanel"), "ReportDetailFactsPanel must now be imported by the live ReportDetail path.");
assert(reportDetail.includes("<ReportDetailFactsPanel report={report} />"), "ReportDetailFactsPanel must now render in /reports/[reportId].");
assert(reportDetail.includes("v0.1.266-live-report-structure-facts"), "ReportDetail missing v0.1.266 live structure/facts marker.");
assert(reportDetail.includes("<ReportPlanetPlacementSections report={report} />"), "ReportPlanetPlacementSections must now render in /reports/[reportId].");
assert(reportDetail.includes("<ReportAspectRelationshipSections report={report} />"), "ReportAspectRelationshipSections must now render in /reports/[reportId].");
assert(reportDetail.includes("v0.1.267-live-report-placements-aspects"), "ReportDetail missing v0.1.267 live placements/aspects marker.");
assert(reportDetail.includes("<ReportSpecialPointsNarrativeSection report={report} />"), "ReportSpecialPointsNarrativeSection must now render in /reports/[reportId].");
assert(reportDetail.includes("v0.1.268-live-report-lilith-nodes"), "ReportDetail missing v0.1.268 live Lilith/nodes marker.");
assert(placementSections.includes("export function ReportPlanetPlacementSections"), "ReportPlanetPlacementSections must exist for the live placements bridge.");
assert(aspectSections.includes("export function ReportAspectRelationshipSections"), "ReportAspectRelationshipSections must exist for the live aspects bridge.");
assert(specialPointsSection.includes("export function ReportSpecialPointsNarrativeSection"), "Special points narrative component must exist for the live Lilith/nodes bridge.");
assert(personalTransitSection.includes("export function PersonalTransitReportSection"), "Personal transit component exists but is not live in /reports/[reportId].");

assert(reportDetail.includes('return "داده محاسبه‌شده ناموجود";'), "Missing lunar-node data must not fall back to Mean label.");
assert(reportDetail.includes('return "دست‌های ماه";'), "Missing lunar-node data must use a neutral technical heading.");

assert(projectContext.includes("v0.1.265d"), "Project context must record v0.1.265d live feature reconciliation.");
assert(projectContext.includes("v0.1.266"), "Project context must record v0.1.266 live report structure/facts.");
assert(projectContext.includes("v0.1.267"), "Project context must record v0.1.267 live placements/aspects.");
assert(projectContext.includes("v0.1.268"), "Project context must record v0.1.268 live Lilith/nodes.");
assert(projectContext.includes("ReportCard is not the live /reports/[reportId] surface"), "Project context must warn that ReportCard is not the live report detail path.");
assert(projectContext.includes("Lilith deep narrative is now live in ReportDetail"), "Project context must record Lilith deep narrative as live in ReportDetail.");
assert(projectContext.includes("Personal transit is not live yet"), "Project context must record personal transit as not live yet.");
assert(ideaGarden.includes("live report feature reconciliation"), "Idea Garden must keep the reconciliation roadmap visible.");

console.log("Report live feature reconciliation guard passed.");
