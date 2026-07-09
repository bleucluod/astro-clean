import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function includesAll(label, text, markers) {
  for (const marker of markers) {
    assert(text.includes(marker), `${label} missing marker: ${marker}`);
  }
}

function excludesAll(label, text, markers) {
  for (const marker of markers) {
    assert(!text.includes(marker), `${label} must not include marker: ${marker}`);
  }
}

const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const reportTypes = read("types/report-generation.ts");
const contract = read("src/lib/chart/natal-to-transit-contract.ts");
const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");
const packageJson = JSON.parse(read("package.json"));
const docs = [
  ["docs/HALLEUS_PROJECT_CONTEXT.md", read("docs/HALLEUS_PROJECT_CONTEXT.md")],
  ["docs/HALLEUS_IDEA_GARDEN.md", read("docs/HALLEUS_IDEA_GARDEN.md")],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md")],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md")],
];

includesAll("personal transit report data bridge", bridge, [
  "PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION",
  "v0.1.254-personal-transit-report-data-bridge",
  "PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_STATUS",
  "report-data-bridge-not-visible-ui",
  "PersonalTransitReportDataBridge",
  "buildPersonalTransitReportDataBridge",
  "hasPersonalTransitReportAspectData",
  "engineData.personalTransitReportData",
  'stage: "data-bridge"',
  "userVisible: false",
  "reportDataBridgeApproval: true",
  "visibleReportSectionApproval: false",
  "currentResidenceRequired: true",
  "noSilentTehranDefaultForPersonalTransit: true",
  "NATAL_TO_TRANSIT_COPY_POLICY.publicLabel",
  "NATAL_TO_TRANSIT_COPY_POLICY.seoPhrases",
  "currentResidencePlaceName",
  "currentResidenceTimezone",
  "birthPlaceName",
  "birthTimezone",
  "missing-current-residence",
  "partial-no-aspects",
  "v0.1.255-personal-transit-first-visible-report-section",
  "Natal chart uses the user birth place/time; transit context uses the user current residence.",
  "No silent Tehran default is allowed for personal reports.",
]);

excludesAll("personal transit report data bridge", bridge, [
  "fetch(",
  "axios",
  "swisseph",
  "sweph",
  "Swiss",
  "process.env",
  "buildPersonalTransitReportSection",
  "React",
  "tsx",
  "components/",
  "visibleReportSectionApproval: true",
  "userVisible: true",
]);

includesAll("report generation types", reportTypes, [
  "PersonalTransitReportDataBridge",
  "../src/lib/report-output/personal-transit-report-data-bridge",
  "personalTransitReportData?: PersonalTransitReportDataBridge | null",
]);

includesAll("contract synced to report data bridge", contract, [
  'personalTransitStage: "data-bridge"',
  "calculationProbeDone: true",
  "dataBridgeDone: true",
  "currentResidenceCorrectionDone: true",
  'transitLocationSource: "user-current-residence"',
  "noSilentTehranDefaultForPersonalTransit: true",
  "reportDataBridgeAfterProbe: true",
  'personalTransitReportDataPath: "engineData.personalTransitReportData"',
  "reportDataBridgeApproved: true",
  "visibleReportSectionApproved: false",
  'completedMilestone: "v0.1.254-personal-transit-report-data-bridge"',
  'nextMilestone: "v0.1.255-personal-transit-first-visible-report-section"',
]);

includesAll("probe remains calculation source", probe, [
  "calculateNatalToTransitProbe",
  "currentResidence",
  "reportDataBridgeApproval: false",
  "visibleReportSectionApproval: false",
  "noSilentTehranDefaultForPersonalTransit: true",
]);
excludesAll("probe must not become report UI/runtime", probe, [
  "buildPersonalTransitReportDataBridge",
  "buildPersonalTransitReportSection",
  "visibleReportSectionApproval: true",
  "runtimeApproval: true",
]);

assert(
  packageJson.scripts?.["check:natal-to-transit-report-data-bridge"] ===
    "node scripts/check-natal-to-transit-report-data-bridge.mjs",
  "package.json must expose check:natal-to-transit-report-data-bridge.",
);
assert(
  packageJson.scripts?.["check:reports"]?.includes(
    "pnpm run check:natal-to-transit-report-data-bridge",
  ),
  "check:reports must include the natal-to-transit report data bridge guard.",
);

for (const [file, text] of docs) {
  includesAll(file, text, [
    "v0.1.254 Personal transit report data bridge",
    "personalTransitReportData",
    "engineData.personalTransitReportData",
    "current residence",
    "birth place",
    "no silent Tehran default",
    "report data bridge",
    "no visible report section",
    "v0.1.255",
  ]);
}

if (failures.length > 0) {
  console.error("Natal-to-transit report data bridge guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Natal-to-transit report data bridge guard passed.");
