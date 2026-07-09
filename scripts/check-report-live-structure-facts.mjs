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
const factsPanel = read("components/ReportDetailFactsPanel.tsx");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

assert(routePage.includes("ReportDetail"), "Live route must render ReportDetail.");
assert(reportDetail.includes('from "@/components/ReportDetailFactsPanel"'), "ReportDetail must import ReportDetailFactsPanel on the live path.");
assert(reportDetail.includes("REPORT_DETAIL_LIVE_STRUCTURE_FACTS_VERSION"), "ReportDetail missing live structure/facts version constant.");
assert(reportDetail.includes("v0.1.266-live-report-structure-facts"), "ReportDetail missing v0.1.266 live facts marker.");
assert(reportDetail.includes('["quick-facts", "اطلاعات سریع"]'), "ReportDetail quick chips must include quick facts.");
assert(reportDetail.includes('id="quick-facts"'), "ReportDetail must expose a quick facts anchor.");
assert(reportDetail.includes('data-report-live-structure-facts={REPORT_DETAIL_LIVE_STRUCTURE_FACTS_VERSION}'), "Quick facts section must carry the v0.1.266 marker.");
assert(reportDetail.includes("<ReportDetailFactsPanel report={report} />"), "ReportDetail must render ReportDetailFactsPanel in the live report page.");
assert(
  reportDetail.indexOf("<ReportV3Experience report={report} />") <
    reportDetail.indexOf("<ReportDetailFactsPanel report={report} />"),
  "Quick facts must appear after the final reading, not above it.",
);
assert(
  reportDetail.indexOf("<ReportDetailFactsPanel report={report} />") <
    reportDetail.indexOf('id="core-pillars"'),
  "Quick facts must appear before the core pillars block.",
);
assert(factsPanel.includes('data-report-detail-fact="moon-sign"'), "Facts panel must expose moon sign data.");
assert(factsPanel.includes('data-report-detail-fact="retrograde-motion"'), "Facts panel must expose retrograde status.");
assert(factsPanel.includes('data-report-detail-fact="house-cusps"'), "Facts panel must expose house cusp data.");
assert(projectContext.includes("v0.1.266"), "Project context must record v0.1.266 live structure/facts.");
assert(projectContext.includes("ReportDetailFactsPanel is now live"), "Project context must say the facts panel is now live.");
assert(ideaGarden.includes("live report structure + facts"), "Idea Garden must record the live structure/facts reconciliation step.");

console.log("Report live structure/facts guard passed.");
