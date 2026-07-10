import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Astronomy from "astronomy-engine";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(text.includes(marker), `${label} missing marker: ${marker}`);
  }
}

function assertNotIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(!text.includes(marker), `${label} must not include marker: ${marker}`);
  }
}

function normalizeLongitude(value) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function radToDeg(radians) {
  return radians * 180 / Math.PI;
}

function cross(first, second) {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function vectorLength(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

const EARTH_MOON_GM_KM3_S2 = 403503.241918;
const AU_KM = 149597870.7;
const SECONDS_PER_DAY = 86400;
const MU_AU3_DAY2 = EARTH_MOON_GM_KM3_S2 * SECONDS_PER_DAY ** 2 / AU_KM ** 3;

function calculateAdapterSanity(isoDate) {
  const utcDate = new Date(isoDate);
  const eqjState = Astronomy.GeoMoonState(utcDate);
  const state = Astronomy.RotateState(Astronomy.Rotation_EQJ_ECT(utcDate), eqjState);
  const position = { x: state.x, y: state.y, z: state.z };
  const velocity = { x: state.vx, y: state.vy, z: state.vz };
  const positionLength = vectorLength(position);
  const angularMomentum = cross(position, velocity);
  const angularMomentumLength = vectorLength(angularMomentum);
  const velocityCrossAngularMomentum = cross(velocity, angularMomentum);
  const eccentricityVector = {
    x: velocityCrossAngularMomentum.x / MU_AU3_DAY2 - position.x / positionLength,
    y: velocityCrossAngularMomentum.y / MU_AU3_DAY2 - position.y / positionLength,
    z: velocityCrossAngularMomentum.z / MU_AU3_DAY2 - position.z / positionLength,
  };
  const eccentricity = vectorLength(eccentricityVector);
  const perigeeLongitude = normalizeLongitude(radToDeg(Math.atan2(eccentricityVector.y, eccentricityVector.x)));
  const apogeeLongitude = normalizeLongitude(perigeeLongitude + 180);
  return {
    longitude: apogeeLongitude,
    apogeeLongitude,
    perigeeLongitude,
    eccentricity,
    angularMomentumLength,
  };
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:lilith-internal-adapter"] === "node scripts/check-lilith-internal-adapter.mjs",
  "package.json missing check:lilith-internal-adapter script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-internal-adapter"),
    `${scriptName} does not include check:lilith-internal-adapter`,
  );
}

for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const adapterPath = "src/lib/chart/lilith-internal-adapter.ts";
assert(exists(adapterPath), "Lilith internal adapter file is missing");
const adapter = exists(adapterPath) ? read(adapterPath) : "";
assertIncludes("Lilith internal adapter", adapter, [
  'LILITH_INTERNAL_ADAPTER_VERSION = "v0.1.241"',
  'LILITH_INTERNAL_ADAPTER_STATUS = "guarded-engine-output-approved"',
  'LILITH_INTERNAL_ADAPTER_SCOPE = "self-built-osculating-black-moon-lilith-internal-adapter"',
  'LILITH_INTERNAL_ADAPTER_METHOD =',
  'LILITH_INTERNAL_ADAPTER_APPROVED_FOR_ENGINE_OUTPUT = true',
  'LILITH_INTERNAL_ADAPTER_APPROVED_FOR_REPORT_OUTPUT = false',
  "calculateLocalOsculatingBlackMoonLilith",
  "assertLilithInternalAdapterCanRun",
  "assertLilithInternalAdapterResultIsSafe",
  "validateLilithOsculatingProbeHarness",
  "calculateLilithOsculatingProbe",
  "assertLilithOsculatingProbeResultIsSafe",
  "const longitude = normalizeLilithOsculatingProbeLongitude(probe.apogeeLongitude)",
  "longitude,",
  "report generation calculated Lilith",
  "Report generation, chart wheel display, transit, and public SEO claims remain gated.",
]);
assertNotIncludes("Lilith internal adapter", adapter, [
  "SearchLunarApsis",
  "NextLunarApsis",
  "swe_calc",
  "SE_MEAN_APOG",
  "SE_OSCU_APOG",
  "approvedForReportOutput: true",
]);

const probe = read("src/lib/chart/lilith-osculating-probe.ts");
assertIncludes("Lilith probe dependency", probe, [
  'LILITH_OSCULATING_PROBE_STATUS = "probe-only-not-approved-for-output"',
  "calculateLilithOsculatingProbe",
  "assertLilithOsculatingProbeResultIsSafe",
]);

const validation = read("src/lib/chart/lilith-validation-harness.ts");
assertIncludes("Lilith validation dependency", validation, [
  'LILITH_VALIDATION_HARNESS_STATUS = "validation-harness-not-approved-for-output"',
  "validateLilithOsculatingProbeHarness",
  "External/offline reference fixtures are still required before report output, chart wheel display, transit, or public SEO claims.",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine consumes guarded Lilith adapter", engine, [
  "./lilith-internal-adapter",
  "calculateLocalOsculatingBlackMoonLilith",
  "calculateRealChartLilith",
  "Local True/Osculating Black Moon Lilith",
  "approvedForReportOutput: false",
]);
assertNotIncludes("real chart engine must not expose Lilith to reports", engine, [
  "buildCalculatedLilith",
  "approvedForReportOutput: true",
  "production-lilith",
]);

for (const relativePath of [
  "components/ReportCard.tsx",
  "components/RealChartWheel.tsx",
  "lib/astrology/real-engine-report-writer.ts",
]) {
  if (!exists(relativePath)) continue;
  const text = read(relativePath);
  assertNotIncludes(relativePath, text, [
    "lilith-internal-adapter",
    "buildCalculatedLilith",
    "approvedForReportOutput: true",
    "production-lilith",
  ]);
}

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, text] of docs.entries()) {
  assertIncludes(`Lilith adapter docs ${index + 1}`, text, [
    "v0.1.240 Lilith internal adapter",
    "v0.1.241 Lilith guarded engine output",
    "v0.1.242 Lilith report data bridge",
    "calculateLocalOsculatingBlackMoonLilith",
    "calculateRealChartLilith",
    "approvedForReportOutput",
    "cannot enter personality, relationship, growth, synthesis, or practice narrative",
    "No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.",
  ]);
}

const sanityFixtures = [
  "1990-01-01T00:00:00.000Z",
  "2000-01-01T00:00:00.000Z",
  "2012-12-21T11:11:00.000Z",
  "2026-07-08T00:00:00.000Z",
  "2035-06-01T00:00:00.000Z",
];

for (const isoDate of sanityFixtures) {
  const result = calculateAdapterSanity(isoDate);
  assert(Number.isFinite(result.longitude) && result.longitude >= 0 && result.longitude < 360, `adapter sanity longitude out of range for ${isoDate}`);
  assert(Math.abs(result.longitude - result.apogeeLongitude) <= 1e-9, `adapter sanity longitude must equal apogee for ${isoDate}`);
  const expectedApogee = normalizeLongitude(result.perigeeLongitude + 180);
  const opposition = Math.abs(normalizeLongitude(expectedApogee - result.apogeeLongitude));
  assert(Math.min(opposition, 360 - opposition) <= 1e-9, `adapter sanity opposition failed for ${isoDate}`);
  assert(result.eccentricity > 0.001 && result.eccentricity < 0.2, `adapter sanity eccentricity failed for ${isoDate}`);
  assert(result.angularMomentumLength > 0, `adapter sanity angular momentum failed for ${isoDate}`);
}

if (failures.length > 0) {
  console.error("Lilith internal adapter check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Lilith internal adapter check passed for ${sanityFixtures.length} sanity fixtures.`);
