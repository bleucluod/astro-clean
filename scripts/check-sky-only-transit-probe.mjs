import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
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

const probe = read("src/lib/chart/sky-only-transit-probe.ts");
includesAll("sky-only transit probe", probe, [
  'SKY_ONLY_TRANSIT_PROBE_VERSION = "v0.1.247-sky-only-transit-calculation-probe"',
  'SKY_ONLY_TRANSIT_PROBE_STATUS = "probe-only-not-runtime"',
  'SKY_ONLY_TRANSIT_PROBE_METHOD =',
  '"astronomy-engine-geocentric-ecliptic-tehran-local-noon"',
  "calculateSkyOnlyTransitProbe",
  "buildTehranTransitSampleUtcDate",
  "calculateSkyOnlyTransitAspects",
  "getSkyOnlyTransitOrbLimit",
  "TRANSIT_RULES_TIME_POLICY.homepagePulseTimeZone",
  "TRANSIT_RULES_TIME_POLICY.canonicalSampleTime",
  "TRANSIT_RULES_PLANET_POLICY.phaseOneBodies",
  "TRANSIT_RULES_ASPECT_POLICY.phaseOneAspects",
  "TRANSIT_RULES_ASPECT_POLICY.phaseOneOrbDegrees",
  "TRANSIT_RULES_APPROVAL.skyPulseRealTransitRuntime",
  "TRANSIT_RULES_APPROVAL.reportTransitNarrative",
  "zonedDateTimeToUtc",
  "makeAstronomyTime",
  "getAstronomyBody",
  "calculateBodyGeocentricLongitude",
  "calculateBodyApparentMotion",
  "getZodiacSignForLongitude",
  "getSignedLongitudeDelta",
  "runtimeApproval: TRANSIT_RULES_APPROVAL.skyPulseRealTransitRuntime",
  "routeApproval: false",
  "reportNarrativeApproval: TRANSIT_RULES_APPROVAL.reportTransitNarrative",
  "Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points.",
]);
includesAll("sky-only transit body labels", probe, [
  'sun: "Sun"',
  'moon: "Moon"',
  'mercury: "Mercury"',
  'venus: "Venus"',
  'mars: "Mars"',
  'jupiter: "Jupiter"',
  'saturn: "Saturn"',
  'uranus: "Uranus"',
  'neptune: "Neptune"',
  'pluto: "Pluto"',
]);
includesAll("sky-only transit aspect angles", probe, [
  "conjunction: 0",
  "sextile: 60",
  "square: 90",
  "trine: 120",
  "opposition: 180",
  "orb <= orbLimit",
  "left.orb - right.orb",
]);
excludesAll("sky-only transit probe forbidden runtime/source", probe, [
  "fetch(",
  "axios",
  "swisseph",
  "sweph",
  "Swiss",
  "process.env",
  "calculateRealChartLilith",
  "calculateLocalTrueLunarNodes",
  "buildRealChartWorkbenchResult",
  "natal-to-transit",
]);

const contract = read("src/lib/chart/transit-rules-contract.ts");
includesAll("transit rules contract probe status", contract, [
  'TRANSIT_RULES_CONTRACT_VERSION = "v0.1.247-sky-only-transit-calculation-probe"',
  'TRANSIT_RULES_CONTRACT_STATUS = "sky-only-calculation-probe-approved-runtime-gated"',
  "skyOnlyTransitCalculationProbe: true",
  "skyPulseRealTransitRuntime: false",
  "natalToTransitRuntime: false",
  "reportTransitNarrative: false",
  "externalTransitApi: false",
  "newTransitRuntimeDependency: false",
  'requiredNextMilestone: "homepage-sky-pulse-real-bridge-after-probe-qa"',
  'requiredFollowingMilestone: "personal-natal-to-transit-probe-after-homepage-foundation"',
  "skyOnlyTransitCalculationProbeOnly: true",
  "noTransitRuntimeBeforeProbeBridge: true",
]);
excludesAll("transit rules contract obsolete probe blocker", contract, [
  'TRANSIT_RULES_CONTRACT_VERSION = "v0.1.246-transit-product-scope-sync"',
  "noTransitCalculationBeforeProbe: true",
  'requiredNextMilestone: "sky-only-transit-calculation-probe-before-runtime"',
]);

const skyPulseRoute = read("app/api/sky-pulse/today/route.ts");
includesAll("Sky Pulse route remains placeholder runtime", skyPulseRoute, [
  "buildTehranMoonPulse",
  "tehran_moon_pulse_failed",
]);
excludesAll("Sky Pulse route must not use transit probe yet", skyPulseRoute, [
  "calculateSkyOnlyTransitProbe",
  "sky-only-transit-probe",
  "SKY_ONLY_TRANSIT_PROBE_VERSION",
  "sky-only-calculation-probe-approved-runtime-gated",
]);

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:sky-only-transit-probe"] === "node scripts/check-sky-only-transit-probe.mjs",
  "package.json missing check:sky-only-transit-probe script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:sky-only-transit-probe"),
    `${scriptName} does not include check:sky-only-transit-probe`,
  );
}

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => [file, read(file)]);
for (const [file, text] of docs) {
  includesAll(file, text, [
    "v0.1.247 Sky-only transit calculation probe",
    "probe-only sky transit calculator",
    "Asia/Tehran local noon",
    "Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto",
    "conjunction, opposition, trine, square, and sextile with bounded orbs",
    "not wired to the homepage Sky Pulse route",
    "report narrative",
    "chart wheel",
    "API",
    "dependency",
    "personalized natal-to-transit runtime",
    "Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points",
    "free and no-login supported",
    "آسمان امروز",
    "ترنزیت امروز",
    "ترنزیت روزانه",
    "ترنزیت امروز برای چارت تولد",
    "تأثیر آسمان امروز روی چارت تولد",
  ]);
}

if (failures.length > 0) {
  console.error("Sky-only transit probe check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Sky-only transit probe check passed.");
