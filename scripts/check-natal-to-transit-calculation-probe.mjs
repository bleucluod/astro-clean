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

const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");
const contract = read("src/lib/chart/natal-to-transit-contract.ts");
const skyPulseRoute = read("app/api/sky-pulse/today/route.ts");
const packageJson = JSON.parse(read("package.json"));
const docs = [
  ["docs/HALLEUS_PROJECT_CONTEXT.md", read("docs/HALLEUS_PROJECT_CONTEXT.md")],
  ["docs/HALLEUS_IDEA_GARDEN.md", read("docs/HALLEUS_IDEA_GARDEN.md")],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md")],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md")],
];

includesAll("natal-to-transit calculation probe", probe, [
  "NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION",
  "v0.1.253-natal-to-transit-calculation-probe",
  "NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS",
  "calculation-probe-not-report-runtime",
  "NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS",
  "missing-current-residence",
  "NATAL_TO_TRANSIT_CALCULATION_PROBE_METHOD",
  "astronomy-engine-geocentric-current-residence-local-day-to-real-natal-chart",
  "personal-report-daily-natal-to-transit-probe",
  "NatalToTransitCurrentResidenceInput",
  'countryCode: "IR"',
  "calculateNatalToTransitProbe",
  "getNatalToTransitProbeFixture",
  "calculateNatalToTransitAspects",
  "buildRealChartWorkbenchResult",
  "zonedDateTimeToUtc",
  "calculateBodyGeocentricLongitude",
  "calculateBodyApparentMotion",
  "getAstronomyBody",
  "getSkyOnlyTransitSeparation",
  "getSkyOnlyTransitOrbLimit",
  "currentResidence",
  "currentResidencePlaceName",
  "currentResidenceTimezone",
  "currentResidenceLatitude",
  "currentResidenceLongitude",
  "birthPlaceName",
  "birthTimezone",
  "birthLatitude",
  "birthLongitude",
  "noSilentTehranDefaultForPersonalTransit: true",
  "missingCurrentResidencePolicy",
  "Current residence is required for personal transit",
  "homepage public Sky Pulse can remain Tehran-only",
  "birthInput",
  "Shiraz",
  "Tehran",
  "Phase-one personal transit is limited to current residences in Iran.",
  "runtimeApproval: false",
  "reportDataBridgeApproval: false",
  "visibleReportSectionApproval: false",
  'stage: "calculation-probe"',
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
  "conjunction: 0",
  "sextile: 60",
  "square: 90",
  "trine: 120",
  "opposition: 180",
  "transitBody",
  "natalBody",
  "orbLimit",
  "aspects.sort",
]);

excludesAll("natal-to-transit calculation probe", probe, [
  "fetch(",
  "axios",
  "swisseph",
  "sweph",
  "Swiss",
  "process.env",
  "calculateSkyPulseHomepageTransit",
  "buildPersonalTransitReportSection",
  "reportDataBridgeApproval: true",
  "visibleReportSectionApproval: true",
  "runtimeApproval: true",
  "countryCode?:",
]);

includesAll("contract must be synced to v0.1.253", contract, [
  'personalTransitStage: "calculation-probe"',
  "currentResidenceCorrectionDone: true",
  "calculationProbeDone: true",
  'transitLocationSource: "user-current-residence"',
  '"birth-place-for-natal-current-residence-for-transit"',
  "noSilentTehranDefaultForPersonalTransit: true",
  'completedMilestone: "v0.1.253-natal-to-transit-calculation-probe"',
  'nextMilestone: "v0.1.254-personal-transit-report-data-bridge"',
]);

excludesAll("Sky Pulse route must remain unchanged by personal transit", skyPulseRoute, [
  "natal-to-transit-calculation-probe",
  "calculateNatalToTransitProbe",
  "currentResidence",
  "birth-place-for-natal-current-residence-for-transit",
]);

assert(
  packageJson.scripts?.["check:natal-to-transit-calculation-probe"] ===
    "node scripts/check-natal-to-transit-calculation-probe.mjs",
  "package.json must expose check:natal-to-transit-calculation-probe.",
);
assert(
  packageJson.scripts?.["check:engine"]?.includes("pnpm run check:natal-to-transit-calculation-probe"),
  "check:engine must include the natal-to-transit calculation probe guard.",
);

for (const [file, text] of docs) {
  includesAll(file, text, [
    "v0.1.253 Natal-to-transit calculation probe",
    "birth place",
    "current residence",
    "no silent Tehran default",
    "calculation probe",
    "no report data bridge",
    "no visible report section",
    "v0.1.254",
  ]);
}

if (failures.length > 0) {
  console.error("Natal-to-transit calculation probe guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Natal-to-transit calculation probe guard passed.");
