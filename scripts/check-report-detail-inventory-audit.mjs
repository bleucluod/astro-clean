import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertCheck(label, condition) {
  if (!condition) {
    throw new Error(`Report detail inventory audit failed: ${label}`);
  }
}

const reportCard = read("components/ReportCard.tsx");
const packageJson = JSON.parse(read("package.json"));
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
const realityAudit = read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md");
const unificationPlan = read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md");

const baselineChecks = [
  ["ReportCard keeps synthesis section", reportCard.includes("ReportSynthesisSection")],
  ["ReportCard keeps Personal Transit section", reportCard.includes("PersonalTransitReportSection")],
  ["ReportCard reads real engine placements", reportCard.includes("report.realEngine?.placements")],
  ["ReportCard has planet-in-house rows", reportCard.includes("PlanetHouseRow") && reportCard.includes("buildPlanetHouseRow")],
  ["ReportCard has retrograde source hook", reportCard.includes("retrogradePlanetIds") && reportCard.includes("getRetrogradePlanetIds")],
  ["ReportCard has birth moon phase hook", reportCard.includes("birthMoonPhase") && reportCard.includes("buildBirthMoonPhaseSummary")],
  ["ReportCard has house row/cusp data hook", reportCard.includes("HouseSummaryRow") && reportCard.includes("cuspLabel") && reportCard.includes("buildHouseRows")],
  ["ReportCard has aspects source hook", reportCard.includes("realEngineAspects") && reportCard.includes("shownAspects")],
  ["ReportCard has Lunar Nodes UI/data hook", reportCard.includes("lunarNodeRows") && reportCard.includes("buildLunarNodeRows")],
  ["ReportCard has Lilith UI/data hook", reportCard.includes("lilithRow") && reportCard.includes("buildLilithRow")],
];

for (const [label, condition] of baselineChecks) {
  assertCheck(label, condition);
}

const knownInventory = [
  {
    id: "placement-table-motion-inline",
    status: reportCard.includes("item.motionLabel") ? "done" : "tracked-gap",
    note: "Planet-in-house table has retrograde source data available, but inline motion display is not required by this audit-only batch.",
  },
  {
    id: "moon-sign-standalone-summary",
    status: reportCard.includes("birthMoonPhase") && reportCard.includes("chart.moonSign") ? "partial" : "tracked-gap",
    note: "Moon phase/card support exists; standalone Moon sign label must be handled in a later UI batch.",
  },
  {
    id: "house-cusp-degree-sign-visible",
    status: reportCard.includes("{item.cuspLabel}") ? "done" : "tracked-gap",
    note: "HouseSummaryRow has cuspLabel data, but the 12-house visible card still needs the degree/sign line in a later UI batch.",
  },
  {
    id: "standalone-planet-placement-sections",
    status: reportCard.includes("ReportStandalonePlacement") ? "done" : "tracked-gap",
    note: "Standalone placement sections must come before aspect relationship prose in a later componentized batch.",
  },
  {
    id: "standalone-aspect-relationship-sections",
    status: reportCard.includes("ReportAspectRelationship") ? "done" : "tracked-gap",
    note: "Standalone aspect relationship sections must follow placement sections in a later componentized batch.",
  },
  {
    id: "natal-vs-transit-comparison-depth",
    status: reportCard.includes("personalTransitReportData") ? "partial" : "tracked-gap",
    note: "Personal Transit is visible, but deeper natal-vs-today comparison remains after this audit.",
  },
  {
    id: "lilith-and-nodes-deep-narrative",
    status: reportCard.includes("lilithRow") && reportCard.includes("lunarNodeRows") ? "partial" : "tracked-gap",
    note: "Lilith and Lunar Nodes are wired enough for report visibility, but deeper narrative remains after this audit.",
  },
];

const marker = "v0.1.257a Report detail inventory audit";
for (const [label, content] of [
  ["project context", projectContext],
  ["idea garden", ideaGarden],
  ["engine reality audit", realityAudit],
  ["engine unification plan", unificationPlan],
]) {
  assertCheck(`${label} records ${marker}`, content.includes(marker));
}

assertCheck(
  "package exposes check:report-detail-inventory-audit",
  packageJson.scripts && packageJson.scripts["check:report-detail-inventory-audit"] === "node scripts/check-report-detail-inventory-audit.mjs",
);

assertCheck(
  "check:reports includes report detail inventory audit",
  typeof packageJson.scripts["check:reports"] === "string" && packageJson.scripts["check:reports"].includes("check:report-detail-inventory-audit"),
);

assertCheck(
  "check:project includes report detail inventory audit",
  typeof packageJson.scripts["check:project"] === "string" && packageJson.scripts["check:project"].includes("check:report-detail-inventory-audit"),
);

console.log("Report detail inventory audit passed.");
for (const item of knownInventory) {
  console.log(`- ${item.id}: ${item.status} -- ${item.note}`);
}
