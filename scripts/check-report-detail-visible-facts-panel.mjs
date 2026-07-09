import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertCheck(label, condition) {
  if (!condition) {
    throw new Error(`Report detail visible facts panel check failed: ${label}`);
  }
}

const reportCard = read("components/ReportCard.tsx");
const factsPanel = read("components/ReportDetailFactsPanel.tsx");
const packageJson = JSON.parse(read("package.json"));
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
const realityAudit = read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md");
const unificationPlan = read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md");

const marker = "v0.1.258 Report detail visible facts panel";
const importReferenceCount = (reportCard.match(/import \{ ReportDetailFactsPanel \} from "\.\/ReportDetailFactsPanel";/g) ?? []).length;
const renderReferenceCount = (reportCard.match(/<ReportDetailFactsPanel report=\{report\} \/>/g) ?? []).length;

assertCheck(
  "ReportCard imports ReportDetailFactsPanel",
  reportCard.includes('import { ReportDetailFactsPanel } from "./ReportDetailFactsPanel";'),
);
assertCheck(
  "ReportCard renders ReportDetailFactsPanel before Personal Transit",
  reportCard.indexOf("<ReportDetailFactsPanel report={report} />") >= 0 &&
    reportCard.indexOf("<ReportDetailFactsPanel report={report} />") <
      reportCard.indexOf("<PersonalTransitReportSection data={personalTransitReportData} />"),
);
assertCheck(
  "ReportCard has exactly one import and one render reference",
  importReferenceCount === 1 && renderReferenceCount === 1,
);
assertCheck(
  "Facts panel declares version marker",
  factsPanel.includes("v0.1.258-report-detail-visible-facts-panel"),
);
assertCheck(
  "Facts panel shows standalone Moon sign",
  factsPanel.includes("نشان ماه تولد") && factsPanel.includes('data-report-detail-fact="moon-sign"'),
);
assertCheck(
  "Facts panel uses real Moon placement before fallback chart moon sign",
  factsPanel.includes('placement.id === "moon"') && factsPanel.includes("report.chart?.moonSign"),
);
assertCheck(
  "Facts panel shows retrograde motion facts",
  factsPanel.includes("حرکت برگشتی") &&
    factsPanel.includes("report.realEngine?.retrogrades") &&
    factsPanel.includes('data-report-detail-fact="retrograde-motion"'),
);
assertCheck(
  "Facts panel shows house cusp degree/sign facts",
  factsPanel.includes("شروع هر خانه") &&
    factsPanel.includes("report.realEngine?.houses") &&
    factsPanel.includes("degreeInSign") &&
    factsPanel.includes('data-report-detail-fact="house-cusps"'),
);
assertCheck(
  "Facts panel does not introduce health or medical claims",
  !/بیماری|تشخیص|درمان|پزشکی|سلامت/.test(factsPanel),
);
assertCheck(
  "Package exposes check:report-detail-visible-facts-panel",
  packageJson.scripts?.["check:report-detail-visible-facts-panel"] ===
    "node scripts/check-report-detail-visible-facts-panel.mjs",
);
assertCheck(
  "check:reports includes visible facts panel check",
  typeof packageJson.scripts?.["check:reports"] === "string" &&
    packageJson.scripts["check:reports"].includes("check:report-detail-visible-facts-panel"),
);
assertCheck(
  "check:project includes visible facts panel check",
  typeof packageJson.scripts?.["check:project"] === "string" &&
    packageJson.scripts["check:project"].includes("check:report-detail-visible-facts-panel"),
);

for (const [label, content] of [
  ["project context", projectContext],
  ["idea garden", ideaGarden],
  ["engine reality audit", realityAudit],
  ["engine unification plan", unificationPlan],
]) {
  assertCheck(`${label} records ${marker}`, content.includes(marker));
}

console.log("Report detail visible facts panel guard passed.");
