import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function includesAll(label, text, markers) { for (const marker of markers) assert(text.includes(marker), `${label} missing marker: ${marker}`); }
function excludesAll(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), `${label} must not include marker: ${marker}`); }

const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const reportTypes = read("types/report-generation.ts");
const contract = read("src/lib/chart/natal-to-transit-contract.ts");
const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");
const packageJson = JSON.parse(read("package.json"));

includesAll("personal transit report data bridge", bridge, [
  "PERSONAL_TRANSIT_REPORT_DATA_BRIDGE_VERSION",
  "v0.1.288-personal-transit-trust-boundary",
  "report-data-bridge-visible-report-section",
  "PersonalTransitReportDataBridge",
  "buildPersonalTransitReportDataBridge",
  "engineData.personalTransitReportData",
  'stage: "visible-report-section"',
  "userVisible: true",
  "reportDataBridgeApproval: true",
  "visibleReportSectionApproval: true",
  "currentResidenceRequired: true",
  "noSilentTehranDefaultForPersonalTransit: true",
  "transitLocalDate",
  "sampleLocalTime",
  "currentResidenceUtcIso",
  "probeResult.localDate",
  "probeResult.sampleLocalTime",
  "probeResult.currentResidenceUtcIso",
  "missing-current-residence",
  "partial-no-aspects",
  "post-v0.1.288-personal-transit-refresh",
  "must not be relabeled as today",
  "does not recalculate when an older report is opened",
]);
excludesAll("personal transit report data bridge", bridge, [
  "fetch(",
  "axios",
  "swisseph",
  "sweph",
  "process.env",
  'stage: "data-bridge"',
  "report-data-bridge-not-visible-ui",
]);
includesAll("report generation types", reportTypes, [
  "PersonalTransitReportDataBridge",
  "../src/lib/report-output/personal-transit-report-data-bridge",
  "personalTransitReportData?: PersonalTransitReportDataBridge | null",
]);
includesAll("contract synced after visible report section", contract, [
  'personalTransitStage: "user-visible"',
  "calculationProbeDone: true",
  "dataBridgeDone: true",
  "userVisibleDone: true",
  'transitLocationSource: "user-current-residence"',
  "noSilentTehranDefaultForPersonalTransit: true",
  'personalTransitReportDataPath: "engineData.personalTransitReportData"',
  "visibleReportSectionApproved: true",
]);
includesAll("probe remains calculation source", probe, [
  "calculateNatalToTransitProbe",
  "currentResidence",
  "localDate",
  "sampleLocalTime",
  "currentResidenceUtcIso",
  "noSilentTehranDefaultForPersonalTransit: true",
]);
excludesAll("probe must not become report UI/runtime", probe, [
  "buildPersonalTransitReportDataBridge",
  "buildPersonalTransitReportSection",
  "runtimeApproval: true",
]);
assert(packageJson.scripts?.["check:natal-to-transit-report-data-bridge"] === "node scripts/check-natal-to-transit-report-data-bridge.mjs", "package.json must expose check:natal-to-transit-report-data-bridge.");
assert(packageJson.scripts?.["check:reports"]?.includes("pnpm run check:natal-to-transit-report-data-bridge"), "check:reports must include the natal-to-transit report data bridge guard.");

if (failures.length > 0) {
  console.error("Natal-to-transit report data bridge guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Natal-to-transit report data bridge guard passed.");
