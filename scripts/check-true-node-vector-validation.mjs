import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  absDelta,
  buildFixtureRows,
  buildNodeEventRows,
  calculateMeanNorthLunarNodeLongitude,
  fixtures,
  getMissingApis,
  nodeSearchStarts,
  normalizeLongitude,
} from "./probe-true-node-vector-feasibility.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertFinite(label, value) {
  assert(Number.isFinite(value), `${label} is not finite: ${value}`);
}

function assertIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(text.includes(marker), `${label} is missing marker: ${marker}`);
  }
}

function assertNotIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(!text.includes(marker), `${label} must not include marker: ${marker}`);
  }
}

const missingApis = getMissingApis();
if (missingApis.length > 0) {
  fail(`Astronomy Engine is missing required vector probe APIs: ${missingApis.join(", ")}`);
}

assert(fixtures.length >= 5, "true-node vector probe should keep at least five date fixtures");
assert(nodeSearchStarts.length >= 3, "true-node vector validation should keep at least three node-event sanity starts");

for (const iso of fixtures) {
  assertFinite(`mean node fixture ${iso}`, calculateMeanNorthLunarNodeLongitude(new Date(iso)));
}

for (const row of buildFixtureRows()) {
  assertFinite(`${row.iso} meanNorth`, row.meanNorth);
  assertFinite(`${row.iso} ECT ascending`, row.ectOfDate.ascendingLongitude);
  assertFinite(`${row.iso} ECT descending`, row.ectOfDate.descendingLongitude);
  assertFinite(`${row.iso} ECT inclination`, row.ectOfDate.inclination);
  assertFinite(`${row.iso} moon longitude`, row.moonEctLongitude);
  assertFinite(`${row.iso} moon latitude`, row.moonEctLatitude);

  assert(
    absDelta(row.ectOfDate.descendingLongitude, normalizeLongitude(row.ectOfDate.ascendingLongitude + 180)) < 1e-9,
    `${row.iso} candidate South Node is not exact opposition from candidate North Node`,
  );
  assert(
    row.ectOfDate.inclination > 4.5 && row.ectOfDate.inclination < 5.7,
    `${row.iso} candidate lunar inclination is outside a conservative Moon-orbit sanity range: ${row.ectOfDate.inclination}`,
  );
  assert(
    Math.abs(row.ectDeltaVsMean) < 5,
    `${row.iso} candidate True/Osculating delta versus Mean Node is too large for a feasibility harness: ${row.ectDeltaVsMean}`,
  );
  assert(
    Math.abs(row.eclVsEctDelta) < 1,
    `${row.iso} J2000-vs-of-date candidate node frame delta is unexpectedly large: ${row.eclVsEctDelta}`,
  );
}

for (const row of buildNodeEventRows()) {
  assert(row.eventKind === "ascending" || row.eventKind === "descending", `${row.searchStartIso} node event kind is not recognized`);
  assert(
    Math.abs(row.moonEctLatitude) < 0.0001,
    `${row.searchStartIso} SearchMoonNode event is not near zero Moon ecliptic latitude: ${row.moonEctLatitude}`,
  );
  assert(
    row.eventDelta < 0.001,
    `${row.searchStartIso} vector candidate does not align with Moon longitude at node-event context: ${row.eventDelta}`,
  );
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:true-node-vector-validation"] === "node scripts/check-true-node-vector-validation.mjs",
  "package.json missing check:true-node-vector-validation script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:true-node-vector-validation"),
    `${scriptName} does not include check:true-node-vector-validation`,
  );
}

const probe = read("scripts/probe-true-node-vector-feasibility.mjs");
assertIncludes("probe script", probe, [
  "GeoMoonState",
  "Rotation_EQJ_ECT",
  "calculateCandidateFromState",
  "buildNodeEventRows",
  "candidate osculating node, not an approved product value",
  "independent True/Osculating Node reference fixtures",
]);
assertNotIncludes("probe script", probe, [
  'nodeType: "true"',
  "SearchMoonNode(new Date(iso)).time.date",
]);

const realChartEngine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine", realChartEngine, [
  "calculateMeanLunarNodes",
  "calculateMeanNorthLunarNodeLongitude",
  'nodeType: "mean"',
  "mean-lunar-node-j2000-meeus-formula",
]);
assertNotIncludes("real chart engine", realChartEngine, [
  "SearchMoonNode",
  "calculateTrueLunarNodes",
  'nodeType: "true"',
  "true-lunar-node",
  "osculating-lunar-node",
]);

const astroTypes = read("types/astro.ts");
assertIncludes("astro types", astroTypes, [
  'nodeType: "mean"',
  "mean-lunar-node-j2000-meeus-formula",
]);
assertNotIncludes("astro types", astroTypes, [
  'nodeType: "true"',
  "true-lunar-node",
  "osculating-lunar-node",
]);

assertIncludes("engine reality audit", read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md"), [
  "## v0.1.228 true node vector validation harness",
  "candidate osculating node only",
  "independent True/Osculating Node reference fixtures",
  "does not promote nodeType beyond mean",
]);
assertIncludes("engine unification plan", read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md"), [
  "## v0.1.228 true node vector validation path",
  "check:true-node-vector-validation",
  "Do not integrate True/Osculating Node into real chart output until independent fixtures pass",
]);
assertIncludes("project context", read("docs/HALLEUS_PROJECT_CONTEXT.md"), [
  "## v0.1.228 true node vector validation harness",
  "v0.1.227 initial ESM/CommonJS probe failure",
  "inspect live import style before writing .mjs scripts",
]);
assertIncludes("idea garden", read("docs/HALLEUS_IDEA_GARDEN.md"), [
  "## v0.1.228 product decision: True Node vector candidate stays gated",
  "candidate osculating node remains a validation harness",
  "Mean Node remains the product output",
]);

if (failures.length > 0) {
  console.error("True Node vector validation check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("True Node vector validation check passed.");
