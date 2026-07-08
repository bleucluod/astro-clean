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

function angularDeltaDegrees(first, second) {
  const delta = Math.abs(normalizeLongitude(second - first));
  return Math.min(delta, 360 - delta);
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

function calculateProbeFromState(state) {
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
    apogeeLongitude,
    perigeeLongitude,
    eccentricity,
    angularMomentumLength,
  };
}

function calculateProbe(isoDate) {
  const utcDate = new Date(isoDate);
  const eqjState = Astronomy.GeoMoonState(utcDate);
  const eclipticOfDateState = Astronomy.RotateState(Astronomy.Rotation_EQJ_ECT(utcDate), eqjState);
  return calculateProbeFromState(eclipticOfDateState);
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:lilith-validation-harness"] === "node scripts/check-lilith-validation-harness.mjs",
  "package.json missing check:lilith-validation-harness script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-validation-harness"),
    `${scriptName} does not include check:lilith-validation-harness`,
  );
}

for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const harnessPath = "src/lib/chart/lilith-validation-harness.ts";
assert(exists(harnessPath), "Lilith validation harness file is missing");
const harness = read(harnessPath);
assertIncludes("Lilith validation harness", harness, [
  'LILITH_VALIDATION_HARNESS_VERSION = "v0.1.239"',
  'LILITH_VALIDATION_HARNESS_STATUS = "validation-harness-not-approved-for-output"',
  'LILITH_VALIDATION_HARNESS_SCOPE = "self-built-osculating-lilith-validation-only"',
  "LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT = false",
  "LILITH_VALIDATION_FIXTURE_DATES",
  "LILITH_VALIDATION_DAILY_SWEEP_DAYS = 32",
  "LILITH_VALIDATION_MAX_DAILY_LONGITUDE_DELTA_DEGREES = 80",
  "buildLilithValidationFixtureRows",
  "buildLilithValidationDailySweepRows",
  "validateLilithOsculatingProbeHarness",
  "lilithValidationAngularDeltaDegrees",
  "External/offline reference fixtures are still required before adapter or engine output approval.",
]);
assertNotIncludes("Lilith validation harness", harness, [
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "sweph",
  "SE_MEAN_APOG",
  "SE_OSCU_APOG",
  "buildCalculatedLilith",
  'lilith.status === "calculated"',
  "production-lilith",
]);

const probe = read("src/lib/chart/lilith-osculating-probe.ts");
assertIncludes("Lilith osculating probe remains probe-only", probe, [
  'LILITH_OSCULATING_PROBE_STATUS = "probe-only-not-approved-for-output"',
  "LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT = false",
  "assertLilithOsculatingProbeResultIsSafe",
]);

const decision = read("src/lib/chart/lilith-self-built-osculating-decision.ts");
assertIncludes("Lilith self-built decision remains gated", decision, [
  'LILITH_SELF_BUILT_OSCULATING_MODEL_ID = "true-osculating-black-moon-lilith"',
  'LILITH_SELF_BUILT_OSCULATING_API_POLICY = "no-external-api"',
  'LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY = "no-new-lilith-runtime-dependency"',
  "compare probe output against offline reference fixtures before engine output",
]);

const sourceFeasibility = read("src/lib/chart/lilith-source-feasibility-probe.ts");
assertIncludes("Lilith source feasibility remains not approved", sourceFeasibility, [
  'LILITH_SOURCE_FEASIBILITY_STATUS = "no-approved-production-source"',
  'LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT = false',
  "The preferred next path is self-built True/Osculating Black Moon Lilith from Moon state vectors, not a new runtime dependency.",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine still defers Lilith", engine, [
  "Black Moon Lilith is still deferred",
  "Mean/True Lilith definition",
]);
assertNotIncludes("real chart engine must not consume Lilith validation", engine, [
  "calculateLilithOsculatingProbe",
  "validateLilithOsculatingProbeHarness",
  "buildLilithValidationFixtureRows",
  "buildCalculatedLilith",
  'lilith.status === "calculated"',
  "production-lilith",
]);

for (const relativePath of [
  "components/ReportCard.tsx",
  "components/RealChartWheel.tsx",
  "lib/astrology/real-engine-report-writer.ts",
  "lib/report-generation/report-generation-service.ts",
]) {
  if (!exists(relativePath)) continue;
  const text = read(relativePath);
  assertNotIncludes(`${relativePath} Lilith validation production claims`, text, [
    "calculateLilithOsculatingProbe",
    "validateLilithOsculatingProbeHarness",
    "buildCalculatedLilith",
    'lilith.status === "calculated"',
    "production-lilith",
    "local-lilith-production",
  ]);
}

if (typeof Astronomy.GeoMoonState !== "function") fail("Astronomy Engine GeoMoonState runtime API is missing");
if (typeof Astronomy.RotateState !== "function") fail("Astronomy Engine RotateState runtime API is missing");
if (typeof Astronomy.Rotation_EQJ_ECT !== "function") fail("Astronomy Engine Rotation_EQJ_ECT runtime API is missing");

const fixtureDates = [
  "1988-01-01T00:00:00.000Z",
  "1990-01-01T00:00:00.000Z",
  "1992-02-29T12:00:00.000Z",
  "1995-06-15T12:00:00.000Z",
  "1999-08-11T11:03:00.000Z",
  "2000-01-01T00:00:00.000Z",
  "2001-09-11T12:00:00.000Z",
  "2005-03-20T18:30:00.000Z",
  "2010-07-11T09:15:00.000Z",
  "2012-12-21T11:11:00.000Z",
  "2016-02-29T06:00:00.000Z",
  "2020-12-21T10:00:00.000Z",
  "2024-04-08T18:18:00.000Z",
  "2026-07-08T00:00:00.000Z",
  "2030-01-01T00:00:00.000Z",
  "2035-06-01T00:00:00.000Z",
];

const dailySweepStart = Date.parse("2026-07-01T00:00:00.000Z");
const dailySweepDays = 32;
const rows = [];
const dailyRows = [];

function validateRow(row, label) {
  assert(Number.isFinite(row.apogeeLongitude), `non-finite validation apogee longitude for ${label}`);
  assert(row.apogeeLongitude >= 0 && row.apogeeLongitude < 360, `validation apogee longitude not normalized for ${label}`);
  assert(Number.isFinite(row.perigeeLongitude), `non-finite validation perigee longitude for ${label}`);
  assert(row.perigeeLongitude >= 0 && row.perigeeLongitude < 360, `validation perigee longitude not normalized for ${label}`);
  const oppositionDelta = angularDeltaDegrees(normalizeLongitude(row.perigeeLongitude + 180), row.apogeeLongitude);
  assert(oppositionDelta <= 1e-9, `validation apogee/perigee opposition failed for ${label}`);
  assert(Number.isFinite(row.eccentricity), `non-finite validation eccentricity for ${label}`);
  assert(row.eccentricity > 0.001 && row.eccentricity < 0.2, `validation eccentricity sanity failed for ${label}: ${row.eccentricity}`);
  assert(Number.isFinite(row.angularMomentumLength) && row.angularMomentumLength > 0, `validation angular momentum sanity failed for ${label}`);
}

if (failures.length === 0) {
  for (const isoDate of fixtureDates) {
    const row = calculateProbe(isoDate);
    rows.push({ isoDate, ...row });
    validateRow(row, isoDate);
  }

  for (let index = 0; index < dailySweepDays; index += 1) {
    const isoDate = new Date(dailySweepStart + index * 86400000).toISOString();
    const row = calculateProbe(isoDate);
    dailyRows.push({ isoDate, ...row });
    validateRow(row, isoDate);
  }

  const roundedLongitudes = new Set(rows.map((row) => row.apogeeLongitude.toFixed(3)));
  assert(roundedLongitudes.size >= 12, "Lilith validation fixture longitudes are unexpectedly repetitive");
  let maxDailyDelta = 0;
  for (let index = 1; index < dailyRows.length; index += 1) {
    const delta = angularDeltaDegrees(dailyRows[index - 1].apogeeLongitude, dailyRows[index].apogeeLongitude);
    maxDailyDelta = Math.max(maxDailyDelta, delta);
    assert(delta <= 80, `Lilith validation daily longitude jump is too large near ${dailyRows[index].isoDate}: ${delta}`);
  }
  assert(maxDailyDelta > 0.1, "Lilith validation daily sweep is unexpectedly static");
}

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith validation doc ${index + 1}`, doc, [
    "v0.1.239 Lilith validation harness",
    "The self-built osculating Lilith probe now has a validation-only harness",
    "The harness checks fixture diversity, normalized longitudes, apogee/perigee opposition, eccentricity sanity, angular momentum sanity, and daily continuity",
    "The harness does not approve realChart output, report generation, chart-wheel display, transit, or public SEO claims",
    "External/offline reference fixtures are still required before adapter or engine output approval",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith validation harness check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log(`Lilith validation harness check passed for ${rows.length} fixtures and ${dailyRows.length} daily sweep rows.`);
