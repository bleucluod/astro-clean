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
  "NATAL_TO_TRANSIT_CONTRACT_STATUS",
  "contract-only-no-calculation-runtime",
  "personal-report-daily-natal-to-transit",
  'publicSkyPulseStage: "user-visible-and-hardened"',
  'personalTransitStage: "foundation-contract"',
  "scopeDecisionDone: true",
  "contractDone: true",
  "calculationProbeDone: false",
  "dataBridgeDone: false",
  "userVisibleDone: false",
  "hardenedDone: false",
  'launchAudienceRegion: "iran"',
  'personalReportTimeZone: "Asia/Tehran"',
  'dailyBoundary: "tehran-local-calendar-day"',
  "userSelectableTimeZoneApproved: false",
  "userLocationTimeZoneDeferred: true",
  '"sun"',
  '"moon"',
  '"mercury"',
  '"venus"',
  '"mars"',
  '"jupiter"',
  '"saturn"',
  '"uranus"',
  '"neptune"',
  '"pluto"',
  '"conjunction"',
  '"opposition"',
  '"trine"',
  '"square"',
  '"sextile"',
  '"lunar-nodes"',
  '"black-moon-lilith"',
  '"houses"',
  '"angles"',
  "noLilithTransitInPhaseOne: true",
  "noNodeTransitInPhaseOne: true",
  "noHouseOrAngleTransitInPhaseOne: true",
  "requiresUserEnteredBirthInput: true",
  "requiresRealNatalChart: true",
  "comparesCurrentTransitBodiesToNatalBodies: true",
  "mustUseCalculatedCurrentSkyTransit: true",
  "mustUseCalculatedNatalChartPositions: true",
  "noStaticDailyPersonalClaim: true",
  "noPersonalTransitFromSkyOnlyAspectAlone: true",
  "noReportDataBridgeBeforeProbe: true",
  "noVisibleReportSectionBeforeDataBridge: true",
  'launchAccessModel: "free-and-no-login-supported"',
  "accountRequiredForLaunch: false",
  "paymentRequiredForLaunch: false",
  "paidPrivateTransitSegmentationDeferred: true",
  '"آسمان امروز نسبت به چارت تولد تو"',
  '"ترنزیت امروز برای چارت تولد"',
  '"تأثیر آسمان امروز روی چارت تولد"',
  '"ترنزیت روزانه چارت تولد"',
  'tone: "technical-plus-inspirational"',
  "noScaryCopy: true",
  "noFatalisticCopy: true",
  "noDeterministicPrediction: true",
  "calculationProbeApproved: false",
  "runtimeApproved: false",
  "reportDataBridgeApproved: false",
  "visibleReportSectionApproved: false",
  "homepageRouteChangeApproved: false",
  "externalTransitApiApproved: false",
  "newRuntimeDependencyApproved: false",
  "userLocationOrNonIranTimezoneApproved: false",
  'nextMilestone: "v0.1.253-natal-to-transit-calculation-probe"',
  'followingMilestone: "v0.1.254-personal-transit-report-data-bridge"',
  'visibleMilestone: "v0.1.255-personal-transit-first-visible-report-section"',
  "getNatalToTransitContract",
]);

excludesAll("natal-to-transit contract", contract, [
  "fetch(",
  "axios",
  "swisseph",
  "sweph",
  "Swiss",
  "process.env",
  "calculateNatalToTransit",
  "buildPersonalTransitReportSection",
  "visibleReportSectionApproved: true",
  "runtimeApproved: true",
  "calculationProbeApproved: true",
  "reportDataBridgeApproved: true",
  "externalTransitApiApproved: true",
  "newRuntimeDependencyApproved: true",
]);

includesAll("Sky Pulse route must remain public sky-only", skyPulseRoute, [
  "calculateSkyPulseHomepageTransit",
  "buildSkyPulsePersianInterpretation",
  "buildTehranMoonPulse",
]);
excludesAll("Sky Pulse route must not start personal transit", skyPulseRoute, [
  "natal-to-transit-contract",
  "NATAL_TO_TRANSIT_CONTRACT_VERSION",
  "getNatalToTransitContract",
  "calculateNatalToTransit",
  "personal-report-daily-natal-to-transit",
  "آسمان امروز نسبت به چارت تولد تو",
]);

excludesAll("sky-only probe must not start natal-to-transit calculation", skyOnlyProbe, [
  "NATAL_TO_TRANSIT_CONTRACT_VERSION",
  "getNatalToTransitContract",
  "calculateNatalToTransit",
  "buildPersonalTransitReportSection",
]);

assert(
  packageJson.scripts?.["check:natal-to-transit-contract"] ===
    "node scripts/check-natal-to-transit-contract.mjs",
  "package.json must expose check:natal-to-transit-contract.",
);
assert(
  packageJson.scripts?.["check:engine"]?.includes("pnpm run check:natal-to-transit-contract"),
  "check:engine must include the natal-to-transit contract guard.",
);

for (const [file, text] of docs) {
  includesAll(file, text, [
    "v0.1.252 Natal-to-transit contract",
    "Public/Homepage Sky Pulse is already user-visible and hardened",
    "Personal Transit advanced from scope decision to foundation contract",
    "آسمان امروز نسبت به چارت تولد تو",
    "ترنزیت امروز برای چارت تولد",
    "تأثیر آسمان امروز روی چارت تولد",
    "contract-only",
    "no calculation probe",
    "no report data bridge",
    "no visible report section",
    "free/no-login",
    "Iran/Tehran-only",
    "Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto",
    "conjunction, opposition, trine, square, and sextile",
    "Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred",
    "v0.1.253",
  ]);
}

if (failures.length > 0) {
  console.error("Natal-to-transit contract guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Natal-to-transit contract guard passed.");
