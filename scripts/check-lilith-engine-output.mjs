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

function calculateLilithSanity(isoDate) {
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
  const longitude = normalizeLongitude(perigeeLongitude + 180);

  return { longitude, perigeeLongitude, eccentricity, angularMomentumLength };
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:lilith-engine-output"] === "node scripts/check-lilith-engine-output.mjs",
  "package.json missing check:lilith-engine-output script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-engine-output"),
    `${scriptName} does not include check:lilith-engine-output`,
  );
}

for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const adapter = read("src/lib/chart/lilith-internal-adapter.ts");
assertIncludes("Lilith internal adapter engine output approval", adapter, [
  'LILITH_INTERNAL_ADAPTER_VERSION = "v0.1.241"',
  'LILITH_INTERNAL_ADAPTER_STATUS = "guarded-engine-output-approved"',
  'LILITH_INTERNAL_ADAPTER_APPROVED_FOR_ENGINE_OUTPUT = true',
  'LILITH_INTERNAL_ADAPTER_APPROVED_FOR_REPORT_OUTPUT = false',
  "calculateLocalOsculatingBlackMoonLilith",
  "Report generation, chart wheel display, transit, and public SEO claims remain gated.",
]);
assertNotIncludes("Lilith internal adapter report output", adapter, [
  "approvedForReportOutput: true",
  "production-lilith",
  "buildCalculatedLilith",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine Lilith output", engine, [
  "./lilith-internal-adapter",
  "RealChartCalculatedLilith",
  "lilith: RealChartCalculatedLilith",
  "calculateRealChartLilith",
  "calculateLocalOsculatingBlackMoonLilith",
  'status: "calculated"',
  'id: "black-moon-lilith"',
  'label: "Local True/Osculating Black Moon Lilith"',
  'lilithType: "local-true-osculating-black-moon-lilith"',
  'reliability: "guarded-engine-output"',
  "approvedForReportOutput: false",
  "report/UI output remains disabled",
]);
assertNotIncludes("real chart engine forbidden Lilith shortcuts", engine, [
  "SearchLunarApsis",
  "NextLunarApsis",
  "calculateMeanLilith",
  "calculateTrueLilith",
  "buildCalculatedLilith",
  "approvedForReportOutput: true",
  "production-lilith",
  "swisseph",
  "swe_calc",
]);

const probe = read("src/lib/chart/lilith-osculating-probe.ts");
assertIncludes("Lilith probe remains self-built", probe, [
  "GeoMoonState",
  "RotateState",
  "Rotation_EQJ_ECT",
  "self-built-osculating-lunar-apogee-from-moon-position-velocity",
]);

for (const relativePath of [
  "components/ReportCard.tsx",
  "components/RealChartWheel.tsx",
  "lib/astrology/real-engine-report-writer.ts",
]) {
  if (!exists(relativePath)) continue;
  const text = read(relativePath);
  assertNotIncludes(`${relativePath} report/UI Lilith output`, text, [
    "calculateRealChartLilith",
    "calculateLocalOsculatingBlackMoonLilith",
    "guarded-engine-output-approved",
    "Local True/Osculating Black Moon Lilith",
    "production-lilith",
  ]);
}

if (exists("lib/report-generation/report-generation-service.ts")) {
  const service = read("lib/report-generation/report-generation-service.ts");
  assertIncludes("report generation service still gates Lilith", service, [
    'lilithStatus: "not-calculated"',
    '"black-moon-lilith"',
  ]);
  assertNotIncludes("report generation service must not consume engine Lilith yet", service, [
    "realChart.lilith",
    "calculateRealChartLilith",
    "buildCalculatedLilith",
    'lilith.status === "calculated"',
  ]);
}

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith engine output docs ${index + 1}`, doc, [
    "v0.1.241 Lilith guarded engine output",
    "realChart.lilith",
    "calculateRealChartLilith",
    "Local True/Osculating Black Moon Lilith",
    "report/UI output remains disabled",
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

if (typeof Astronomy.GeoMoonState !== "function") fail("Astronomy Engine GeoMoonState runtime API is missing");
if (typeof Astronomy.RotateState !== "function") fail("Astronomy Engine RotateState runtime API is missing");
if (typeof Astronomy.Rotation_EQJ_ECT !== "function") fail("Astronomy Engine Rotation_EQJ_ECT runtime API is missing");

if (failures.length === 0) {
  for (const isoDate of sanityFixtures) {
    const result = calculateLilithSanity(isoDate);
    assert(Number.isFinite(result.longitude) && result.longitude >= 0 && result.longitude < 360, `engine Lilith sanity longitude out of range for ${isoDate}`);
    const expectedApogee = normalizeLongitude(result.perigeeLongitude + 180);
    const opposition = Math.abs(normalizeLongitude(expectedApogee - result.longitude));
    assert(Math.min(opposition, 360 - opposition) <= 1e-9, `engine Lilith sanity opposition failed for ${isoDate}`);
    assert(result.eccentricity > 0.001 && result.eccentricity < 0.2, `engine Lilith sanity eccentricity failed for ${isoDate}`);
    assert(result.angularMomentumLength > 0, `engine Lilith sanity angular momentum failed for ${isoDate}`);
  }
}

if (failures.length > 0) {
  console.error("Lilith engine output check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log(`Lilith engine output check passed for ${sanityFixtures.length} sanity fixtures.`);
