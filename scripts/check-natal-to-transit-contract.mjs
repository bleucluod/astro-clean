import { readFileSync } from "node:fs";
function read(path) { return readFileSync(path, "utf8").replace(/\r\n/g, "\n"); }
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function includesAll(label, text, markers) { for (const marker of markers) assert(text.includes(marker), label + " missing marker: " + marker); }
function excludesAll(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), label + " must not include marker: " + marker); }
const contract = read("src/lib/chart/natal-to-transit-contract.ts");
const skyPulseRoute = read("app/api/sky-pulse/today/route.ts");
const skyOnlyProbe = read("src/lib/chart/sky-only-transit-probe.ts");
const packageJson = JSON.parse(read("package.json"));
const docs = [
  ["docs/HALLEUS_PROJECT_CONTEXT.md", read("docs/HALLEUS_PROJECT_CONTEXT.md")],
  ["docs/HALLEUS_IDEA_GARDEN.md", read("docs/HALLEUS_IDEA_GARDEN.md")],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md")],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md")],
];
includesAll("natal-to-transit contract", contract, [
  "NATAL_TO_TRANSIT_CONTRACT_VERSION",
  "v0.1.252-natal-to-transit-contract",
  "contract-synced-with-visible-report-section",
  "personal-report-daily-natal-to-transit",
  "publicSkyPulseStage: \"user-visible-and-hardened\"",
  "personalTransitStage: \"user-visible\"",
  "contractDone: true",
  "currentResidenceCorrectionDone: true",
  "calculationProbeDone: true",
  "dataBridgeDone: true",
  "userVisibleDone: true",
  "hardenedDone: false",
  "natalChartLocationSource: \"user-birth-place-and-birth-time\"",
  "transitLocationSource: \"user-current-residence\"",
  "birth-place-for-natal-current-residence-for-transit",
  "currentResidenceInputRequired: true",
  "noSilentTehranDefaultForPersonalTransit: true",
  "return-missing-current-residence-state-before-personal-precision",
  "requiresRealNatalChart: true",
  "mustUseCalculatedCurrentSkyTransit: true",
  "mustUseCalculatedNatalChartPositions: true",
  "reportDataBridgeAfterProbe: true",
  "personalTransitReportDataPath: \"engineData.personalTransitReportData\"",
  "visibleReportSectionAfterDataBridge: true",
  "launchAccessModel: \"free-and-no-login-supported\"",
  "accountRequiredForLaunch: false",
  "paymentRequiredForLaunch: false",
  "آسمان امروز نسبت به چارت تولد تو",
  "ترنزیت امروز برای چارت تولد",
  "تأثیر آسمان امروز روی چارت تولد",
  "noScaryCopy: true",
  "noFatalisticCopy: true",
  "noDeterministicPrediction: true",
  "calculationProbeApproved: true",
  "reportDataBridgeApproved: true",
  "visibleReportSectionApproved: true",
  "runtimeApproved: false",
  "homepageRouteChangeApproved: false",
  "externalTransitApiApproved: false",
  "newRuntimeDependencyApproved: false",
  "completedMilestone: \"v0.1.253-natal-to-transit-calculation-probe\"",
  "completedMilestone: \"v0.1.254-personal-transit-report-data-bridge\"",
  "completedMilestone: \"v0.1.255-personal-transit-first-visible-report-section\"",
  "nextMilestone: \"post-v0.1.255-report-depth-and-synthesis\"",
  "getNatalToTransitContract",
]);
excludesAll("natal-to-transit contract", contract, ["fetch(", "axios", "swisseph", "sweph", "process.env", "runtimeApproved: true", "externalTransitApiApproved: true", "newRuntimeDependencyApproved: true", "personalReportTimeZone: \"Asia/Tehran\"", "dailyBoundary: \"tehran-local-calendar-day\""]);
includesAll("Sky Pulse route must remain public sky-only", skyPulseRoute, ["calculateSkyPulseHomepageTransit", "buildSkyPulsePersianInterpretation", "buildTehranMoonPulse"]);
excludesAll("Sky Pulse route must not start personal transit", skyPulseRoute, ["natal-to-transit-contract", "calculateNatalToTransit", "آسمان امروز نسبت به چارت تولد تو"]);
excludesAll("sky-only probe must not start personal transit", skyOnlyProbe, ["NATAL_TO_TRANSIT_CONTRACT_VERSION", "getNatalToTransitContract", "calculateNatalToTransit"]);
assert(packageJson.scripts?.["check:natal-to-transit-contract"] === "node scripts/check-natal-to-transit-contract.mjs", "package.json must expose check:natal-to-transit-contract.");
assert(packageJson.scripts?.["check:engine"]?.includes("pnpm run check:natal-to-transit-contract"), "check:engine must include the natal-to-transit contract guard.");
for (const [file, text] of docs) includesAll(file, text, ["v0.1.255 Personal Transit First Visible Report Section", "current residence", "birth place", "no silent Tehran default", "engineData.personalTransitReportData", "visible report section", "free/no-login"]);
if (failures.length > 0) { console.error("Natal-to-transit contract guard failed:"); for (const failure of failures) console.error("- " + failure); process.exit(1); }
console.log("Natal-to-transit contract guard passed.");
