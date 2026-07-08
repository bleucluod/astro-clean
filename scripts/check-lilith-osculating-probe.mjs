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
  packageJson.scripts?.["check:lilith-osculating-probe"] === "node scripts/check-lilith-osculating-probe.mjs",
  "package.json missing check:lilith-osculating-probe script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-osculating-probe"),
    `${scriptName} does not include check:lilith-osculating-probe`,
  );
}

for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const probePath = "src/lib/chart/lilith-osculating-probe.ts";
assert(exists(probePath), "Lilith osculating probe file is missing");
const probe = read(probePath);
assertIncludes("Lilith osculating probe", probe, [
  'LILITH_OSCULATING_PROBE_VERSION = "v0.1.238"',
  'LILITH_OSCULATING_PROBE_STATUS = "probe-only-not-approved-for-output"',
  'LILITH_OSCULATING_PROBE_SCOPE = "self-built-local-osculating-black-moon-lilith-probe-only"',
  'LILITH_OSCULATING_PROBE_SOURCE = "astronomy-engine-geomoonstate-local-state-vector"',
  'LILITH_OSCULATING_PROBE_METHOD =',
  '"self-built-osculating-lunar-apogee-from-moon-position-velocity"',
  "LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT = false",
  "LILITH_OSCULATING_PROBE_EARTH_MOON_GM_KM3_S2 = 403503.241918",
  "LILITH_OSCULATING_PROBE_MU_AU3_DAY2",
  "calculateLilithOsculatingProbeFromState",
  "calculateLilithOsculatingProbe(utcDate: Date)",
  "GeoMoonState",
  "Rotation_EQJ_ECT",
  "RotateState",
  "velocityCrossAngularMomentum",
  "eccentricityVector",
  "perigeeLongitude",
  "apogeeLongitude",
  "perigeeLongitude + 180",
  "assertLilithOsculatingProbeResultIsSafe",
]);
assertNotIncludes("Lilith osculating probe", probe, [
  "SearchLunarApsis(",
  "NextLunarApsis(",
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "sweph",
  "SE_MEAN_APOG",
  "SE_OSCU_APOG",
  "buildCalculatedLilith",
  'lilith.status === "calculated"',
]);

const decision = read("src/lib/chart/lilith-self-built-osculating-decision.ts");
assertIncludes("Lilith self-built decision probe requirement", decision, [
  "write a probe-only self-built osculating Lilith calculator",
  "compare probe output against offline reference fixtures before engine output",
  "keep ReportCard, report writer, chart wheel, and public reports deferred until output is approved",
]);

const sourceFeasibility = read("src/lib/chart/lilith-source-feasibility-probe.ts");
assertIncludes("Lilith source feasibility still deferred", sourceFeasibility, [
  'LILITH_SOURCE_FEASIBILITY_STATUS = "no-approved-production-source"',
  'LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT = false',
  "The preferred next path is self-built True/Osculating Black Moon Lilith from Moon state vectors, not a new runtime dependency.",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine consumes guarded Lilith adapter only", engine, [
  "calculateRealChartLilith",
  "calculateLocalOsculatingBlackMoonLilith",
  "Local True/Osculating Black Moon Lilith",
  "approvedForReportOutput: false",
  "report/UI output remains disabled",
]);
assertNotIncludes("real chart engine must not consume raw Lilith probe or expose reports", engine, [
  "calculateLilithOsculatingProbe(",
  "calculateLilithOsculatingProbeFromState(",
  "LILITH_OSCULATING_PROBE_STATUS",
  "buildCalculatedLilith",
  "production-lilith",
  "approvedForReportOutput: true",
]);

const service = exists("lib/report-generation/report-generation-service.ts")
  ? read("lib/report-generation/report-generation-service.ts")
  : "";
if (service.length > 0) {
  assertIncludes("report generation service bridges only guarded engine Lilith data", service, [
    "lilith: buildCalculatedLilith(realChart)",
    'lilithStatus: realChart.lilith?.status === "calculated" ? "calculated" : "not-calculated"',
  ]);
  assertNotIncludes("report generation service must not consume Lilith probe directly", service, [
    "calculateLilithOsculatingProbe",
    "validateLilithOsculatingProbeHarness",
    "approvedForReportOutput: true",
    "production-lilith",
  ]);
}

const astronomyDtsPath = "node_modules/astronomy-engine/astronomy.d.ts";
if (exists(astronomyDtsPath)) {
  const dts = read(astronomyDtsPath);
  for (const marker of ["GeoMoonState", "RotateState", "Rotation_EQJ_ECT"]) {
    assert(dts.includes(marker), `astronomy-engine declarations missing required Lilith probe API: ${marker}`);
  }
}

const fixtureDates = [
  "1990-01-01T00:00:00.000Z",
  "1995-06-15T12:00:00.000Z",
  "2000-01-01T00:00:00.000Z",
  "2005-03-20T18:30:00.000Z",
  "2010-07-11T09:15:00.000Z",
  "2016-02-29T06:00:00.000Z",
  "2020-12-21T10:00:00.000Z",
  "2026-07-08T00:00:00.000Z",
];
const rows = [];

if (typeof Astronomy.GeoMoonState !== "function") fail("Astronomy Engine GeoMoonState runtime API is missing");
if (typeof Astronomy.RotateState !== "function") fail("Astronomy Engine RotateState runtime API is missing");
if (typeof Astronomy.Rotation_EQJ_ECT !== "function") fail("Astronomy Engine Rotation_EQJ_ECT runtime API is missing");

if (failures.length === 0) {
  for (const isoDate of fixtureDates) {
    const row = calculateProbe(isoDate);
    rows.push({ isoDate, ...row });

    assert(Number.isFinite(row.apogeeLongitude), `non-finite apogee longitude for ${isoDate}`);
    assert(row.apogeeLongitude >= 0 && row.apogeeLongitude < 360, `apogee longitude not normalized for ${isoDate}`);
    assert(Number.isFinite(row.perigeeLongitude), `non-finite perigee longitude for ${isoDate}`);
    assert(row.perigeeLongitude >= 0 && row.perigeeLongitude < 360, `perigee longitude not normalized for ${isoDate}`);
    const expectedApogee = normalizeLongitude(row.perigeeLongitude + 180);
    const oppositionDelta = Math.abs(expectedApogee - row.apogeeLongitude);
    assert(Math.min(oppositionDelta, 360 - oppositionDelta) <= 1e-9, `apogee/perigee opposition failed for ${isoDate}`);
    assert(Number.isFinite(row.eccentricity), `non-finite eccentricity for ${isoDate}`);
    assert(row.eccentricity > 0 && row.eccentricity < 0.2, `eccentricity sanity failed for ${isoDate}: ${row.eccentricity}`);
    assert(row.angularMomentumLength > 0, `angular momentum sanity failed for ${isoDate}`);
  }

  const roundedLongitudes = new Set(rows.map((row) => row.apogeeLongitude.toFixed(3)));
  assert(roundedLongitudes.size >= 6, "Lilith osculating probe fixtures are unexpectedly repetitive");
  const longitudeRange = Math.max(...rows.map((row) => row.apogeeLongitude)) - Math.min(...rows.map((row) => row.apogeeLongitude));
  assert(longitudeRange > 30, "Lilith osculating probe fixture longitude range is unexpectedly small");
}

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith osculating probe doc ${index + 1}`, doc, [
    "v0.1.238 self-built osculating Lilith probe",
    "A probe-only local calculator now derives a candidate True/Osculating Black Moon Lilith apogee longitude from Moon position and velocity state vectors",
    "The probe uses the existing astronomy-engine GeoMoonState plus ecliptic-of-date rotation and a two-body osculating eccentricity-vector method",
    "The value remains internal and not approved for realChart output, report generation, chart wheel display, transit, or public SEO claims",
    "No external API, Swiss runtime dependency, or new Lilith runtime dependency is used",
    "Offline reference fixtures are still required before any production output approval",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith osculating probe check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith osculating probe check passed for " + rows.length + " fixtures.");
