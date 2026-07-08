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
  'TRANSIT_RULES_CONTRACT_VERSION = "v0.1.245-transit-rules-contract"',
  'TRANSIT_RULES_CONTRACT_STATUS = "rules-contract-only"',
  "skyPulseRealTransitRuntime: false",
  "natalToTransitRuntime: false",
  "externalTransitApi: false",
  "newTransitRuntimeDependency: false",
  'phaseOneMode: "sky-only-daily-transit-contract"',
  'deferredMode: "natal-to-transit-personalized-pulse"',
  'defaultPulseTimeZone: "Asia/Tehran"',
  'dailyBoundary: "target-timezone-local-calendar-day"',
  'canonicalSampleTime: "12:00:00"',
  "userBirthTimezoneRequiredBeforeNatalTransit: true",
  "noUtcOnlyDailyPulse: true",
  '"sun"',
  '"moon"',
  '"mercury"',
  '"venus"',
  '"mars"',
  '"jupiter"',
  '"saturn"',
  '"conjunction"',
  '"opposition"',
  '"trine"',
  '"square"',
  '"sextile"',
  "noLilithTransitInPhaseOne: true",
  "noNodeTransitInPhaseOne: true",
  "noHardcodedSkyPulseClaim: true",
  "noPersonalizedNatalTransitUntilConsentAndBirthDataPath: true",
  "noReportNarrativeClaimBeforeProbeAndGuards: true",
  "getTransitRulesContract",
]);
excludesAll("transit rules contract", contract, [
  "approvedForProduction: true",
  "skyPulseRealTransitRuntime: true",
  "externalTransitApi: true",
  "newTransitRuntimeDependency: true",
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
  "sky-only-daily-transit-contract",
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
    "sky-only-daily-transit-contract",
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
    "v0.1.245 Transit rules contract",
    "sky-only daily transit contract",
    "natal-to-transit remains deferred",
    "Asia/Tehran",
    "conjunction, opposition, trine, square, and sextile",
    "No transit calculation, Sky Pulse runtime replacement, report narrative, dependency, API, or SEO claim is approved yet",
  ]);
}

if (failures.length > 0) {
  console.error("Transit rules contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Transit rules contract check passed.");
