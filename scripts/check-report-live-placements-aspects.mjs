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
const placements = read("components/ReportPlanetPlacementSections.tsx");
const aspects = read("components/ReportAspectRelationshipSections.tsx");
const reconciliation = read("scripts/check-report-live-feature-reconciliation.mjs");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");

assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(reportDetail.includes('from "@/components/ReportPlanetPlacementSections"'), "ReportDetail must import ReportPlanetPlacementSections.");
assert(reportDetail.includes('from "@/components/ReportAspectRelationshipSections"'), "ReportDetail must import ReportAspectRelationshipSections.");
assert(reportDetail.includes("<ReportPlanetPlacementSections report={report} />"), "ReportDetail must render ReportPlanetPlacementSections.");
assert(reportDetail.includes("<ReportAspectRelationshipSections report={report} />"), "ReportDetail must render ReportAspectRelationshipSections.");
assert(reportDetail.includes("planet-placements"), "ReportDetail must expose the planet placements anchor/chip.");
assert(reportDetail.includes("aspect-relationships"), "ReportDetail must expose the aspect relationships anchor/chip.");
assert(reportDetail.includes("v0.1.267-live-report-placements-aspects"), "ReportDetail missing v0.1.267 live marker.");
assert(placements.includes("export function ReportPlanetPlacementSections"), "Placement section component must exist.");
assert(aspects.includes("export function ReportAspectRelationshipSections"), "Aspect relationship section component must exist.");
assert(!reconciliation.includes('["ReportPlanetPlacementSections", placementSections]'), "Reconciliation guard must not count placement section as non-live.");
assert(!reconciliation.includes('["ReportAspectRelationshipSections", aspectSections]'), "Reconciliation guard must not count aspect section as non-live.");
assert(projectContext.includes("v0.1.267"), "Project context must record v0.1.267.");

console.log("Report live placements/aspects guard passed.");
