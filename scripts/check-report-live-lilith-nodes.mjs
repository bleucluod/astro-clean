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
const specialPoints = read("components/ReportSpecialPointsNarrativeSection.tsx");
const reconciliation = read("scripts/check-report-live-feature-reconciliation.mjs");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(reportDetail.includes('from "@/components/ReportSpecialPointsNarrativeSection"'), "ReportDetail must import ReportSpecialPointsNarrativeSection.");
assert(reportDetail.includes("<ReportSpecialPointsNarrativeSection report={report} />"), "ReportDetail must render ReportSpecialPointsNarrativeSection.");
assert(reportDetail.includes("special-points"), "ReportDetail must expose the special-points anchor/chip.");
assert(reportDetail.includes("v0.1.268-live-report-lilith-nodes"), "ReportDetail missing v0.1.268 live Lilith/nodes marker.");
assert(specialPoints.includes("export function ReportSpecialPointsNarrativeSection"), "Special points narrative section must exist.");
assert(specialPoints.includes("buildLunarNodeCards"), "Special points section must build lunar-node cards.");
assert(specialPoints.includes("buildLilithCard"), "Special points section must build Lilith card.");
assert(specialPoints.includes("local-true-osculating-black-moon-lilith"), "Special points section must preserve local Lilith source marker.");
assert(!reconciliation.includes('["ReportSpecialPointsNarrativeSection", specialPointsSection]'), "Reconciliation guard must not count special points as non-live.");
assert(reconciliation.includes("<ReportSpecialPointsNarrativeSection report={report} />"), "Reconciliation guard must assert live special points rendering.");
assert(writer.includes("buildLunarNodeText"), "Writer must keep live lunar-node narrative text.");
assert(writer.includes("local-true-osculating"), "Writer must preserve local True/Osculating node language.");
assert(projectContext.includes("v0.1.268"), "Project context must record v0.1.268.");
assert(projectContext.includes("Lilith deep narrative is now live in ReportDetail"), "Project context must say Lilith deep narrative is live in ReportDetail.");
assert(projectContext.includes("Personal transit is now live in ReportDetail"), "Project context must record v0.1.269 personal transit live status.");
assert(ideaGarden.includes("live report feature reconciliation"), "Idea Garden must keep the live report reconciliation roadmap visible.");

console.log("Report live Lilith/nodes guard passed.");
