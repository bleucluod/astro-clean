import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
assert(specialPoints.includes("export function ReportSpecialPointsNarrativeSection"), "Special points narrative section must exist.");
assert(specialPoints.includes("buildLunarNodeCards"), "Special points section must build lunar-node cards.");
assert(specialPoints.includes("buildLilithNarrativeCard"), "Special points section must keep an explicit approved-only Lilith narrative branch.");
assert(specialPoints.includes("lilith.approvedForReportOutput !== true"), "Lilith narrative must be blocked when report approval is false.");
assert(specialPoints.includes("buildLilithBoundaryCard"), "Special points section must show a technical Lilith boundary card.");
assert(specialPoints.includes("local-true-osculating-black-moon-lilith"), "Special points section must preserve local Lilith source marker.");
assert(!reconciliation.includes('["ReportSpecialPointsNarrativeSection", specialPointsSection]'), "Reconciliation guard must not count special points as non-live.");
assert(reconciliation.includes("<ReportSpecialPointsNarrativeSection report={report} />"), "Reconciliation guard must assert live special points rendering.");
assert(writer.includes("buildLunarNodeText"), "Writer must keep live lunar-node narrative text.");
assert(writer.includes("getLunarNodeModelLabel"), "Writer must preserve model-aware lunar-node language.");
assert(projectContext.includes("v0.1.288 report special-points/transit final QA"), "Project context must record v0.1.288 final QA.");
assert(ideaGarden.includes("Report Cleanup Batch 5"), "Idea Garden must record Report Cleanup Batch 5.");

console.log("Report live Lilith/nodes guard passed.");
