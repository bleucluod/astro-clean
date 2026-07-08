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

const contract = read("src/lib/chart/transit-rules-contract.ts");
includesAll("transit rules contract", contract, [
  'TRANSIT_RULES_CONTRACT_VERSION = "v0.1.246-transit-product-scope-sync"',
  'TRANSIT_RULES_CONTRACT_STATUS = "product-scope-contract-only"',
  "skyPulseRealTransitRuntime: false",
  "natalToTransitRuntime: false",
  "externalTransitApi: false",
  "newTransitRuntimeDependency: false",
  'publicHomepageMode: "public-sky-only-daily-pulse"',
  'personalReportMode: "personal-natal-to-transit-daily-pulse"',
  'launchAccessModel: "free-and-no-login-supported"',
  'requiredNextMilestone: "sky-only-transit-calculation-probe-before-runtime"',
  'requiredFollowingMilestone: "personal-natal-to-transit-probe-after-sky-only-foundation"',
  'launchAudienceRegion: "iran"',
  'homepagePulseTimeZone: "Asia/Tehran"',
  'personalReportTimeZone: "Asia/Tehran"',
  "userSelectableTimeZoneApproved: false",
  "userLocationTimeZoneDeferred: true",
  'dailyBoundary: "tehran-local-calendar-day"',
  "noUserFacingUtcCopy: true",
  "noNonIranLaunchTimezoneClaim: true",
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
  "noLilithTransitInPhaseOne: true",
  "noNodeTransitInPhaseOne: true",
  "noHouseOrAngleTransitInPhaseOne: true",
  'tone: "technical-plus-inspirational"',
  '"آسمان امروز"',
  '"ترنزیت امروز"',
  '"ترنزیت روزانه"',
  '"ترنزیت امروز برای چارت تولد"',
  '"تأثیر آسمان امروز روی چارت تولد"',
  "noHardcodedSkyPulseClaim: true",
  "noTransitCalculationBeforeProbe: true",
  "noPersonalizedNatalTransitRuntimeBeforeProbe: true",
  "noPaidPrivateTransitSplitAtLaunch: true",
  "noDependencyOrApiTransitSource: true",
  "getTransitRulesContract",
]);
excludesAll("transit rules contract", contract, [
  "approvedForProduction: true",
  "skyPulseRealTransitRuntime: true",
  "externalTransitApi: true",
  "newTransitRuntimeDependency: true",
  'defaultPulseTimeZone: "Asia/Tehran"',
  'deferredMode: "natal-to-transit-personalized-pulse"',
]);

const skyPulseRoute = read("app/api/sky-pulse/today/route.ts");
includesAll("Sky Pulse route remains non-transit runtime", skyPulseRoute, [
  "buildTehranMoonPulse",
  "tehran_moon_pulse_failed",
]);
excludesAll("Sky Pulse route must not claim real transit yet", skyPulseRoute, [
  "calculateTransit",
  "natalToTransit",
  "TRANSIT_RULES_CONTRACT_STATUS",
  "public-sky-only-daily-pulse",
  "personal-natal-to-transit-daily-pulse",
]);

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:transit-rules-contract"] === "node scripts/check-transit-rules-contract.mjs",
  "package.json missing check:transit-rules-contract script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:transit-rules-contract"),
    `${scriptName} does not include check:transit-rules-contract`,
  );
}

const forbiddenRuntimeFiles = [
  "src/lib/chart/real-chart-engine.ts",
  "lib/report-generation/report-generation-service.ts",
  "lib/astrology/real-engine-report-writer.ts",
  "components/ReportCard.tsx",
];
for (const file of forbiddenRuntimeFiles) {
  const text = read(file);
  excludesAll(`${file} transit runtime`, text, [
    "calculateTransit",
    "natalToTransit",
    "public-sky-only-daily-pulse",
    "personal-natal-to-transit-daily-pulse",
    "TRANSIT_RULES_CONTRACT_VERSION",
  ]);
}

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => [file, read(file)]);
for (const [file, text] of docs) {
  includesAll(file, text, [
    "v0.1.246 Transit product scope sync",
    "public homepage Sky Pulse and personal report transit are both planned",
    "launch scope is free and no-login supported",
    "Iran launch uses Asia/Tehran only",
    "user-selectable or user-location timezones remain deferred",
    "Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto",
    "technical plus inspirational Persian copy",
    "آسمان امروز",
    "ترنزیت امروز",
    "ترنزیت روزانه",
    "ترنزیت امروز برای چارت تولد",
    "No transit calculation, Sky Pulse runtime replacement, report narrative, dependency, API, or paid/private split is approved yet",
  ]);
}

if (failures.length > 0) {
  console.error("Transit rules contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Transit rules contract check passed.");
