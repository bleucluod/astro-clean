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

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.dependencies?.["astronomy-engine"] === "2.1.19",
  "local True Node contract expects astronomy-engine 2.1.19 as the local calculation source",
);
assert(
  packageJson.scripts?.["check:true-node-local-source-contract"] === "node scripts/check-true-node-local-source-contract.mjs",
  "package.json missing check:true-node-local-source-contract script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:true-node-local-source-contract"),
    `${scriptName} does not include check:true-node-local-source-contract`,
  );
}

const packageText = JSON.stringify(packageJson);
assertNotIncludes("package.json", packageText, [
  "swisseph",
  "pyswisseph",
  "SE_TRUE_NODE",
  "SE_MEAN_NODE",
]);

const missingApis = getMissingApis();
if (missingApis.length > 0) {
  fail(`Astronomy Engine is missing required local vector APIs: ${missingApis.join(", ")}`);
}

assert(fixtures.length >= 5, "local True Node contract should keep at least five date fixtures");
assert(nodeSearchStarts.length >= 3, "local True Node contract should keep at least three node-event sanity starts");

for (const iso of fixtures) {
  assertFinite(`mean node fixture ${iso}`, calculateMeanNorthLunarNodeLongitude(new Date(iso)));
}

for (const row of buildFixtureRows()) {
  assertFinite(`${row.iso} meanNorth`, row.meanNorth);
  assertFinite(`${row.iso} local ECT candidate ascending`, row.ectOfDate.ascendingLongitude);
  assertFinite(`${row.iso} local ECT candidate descending`, row.ectOfDate.descendingLongitude);
  assertFinite(`${row.iso} local ECT candidate inclination`, row.ectOfDate.inclination);

  assert(
    absDelta(row.ectOfDate.descendingLongitude, normalizeLongitude(row.ectOfDate.ascendingLongitude + 180)) < 1e-9,
    `${row.iso} local candidate South Node is not exact opposition from candidate North Node`,
  );
  assert(
    row.ectOfDate.inclination > 4.5 && row.ectOfDate.inclination < 5.7,
    `${row.iso} local candidate lunar inclination is outside a conservative Moon-orbit range: ${row.ectOfDate.inclination}`,
  );
  assert(
    Math.abs(row.ectDeltaVsMean) < 5,
    `${row.iso} local candidate delta versus Mean Node is too large for a gated candidate: ${row.ectDeltaVsMean}`,
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
    `${row.searchStartIso} local candidate does not align with Moon longitude at node-event context: ${row.eventDelta}`,
  );
}

const probe = read("scripts/probe-true-node-vector-feasibility.mjs");
assertIncludes("probe script", probe, [
  "GeoMoonState",
  "Rotation_EQJ_ECT",
  "calculateCandidateFromState",
  "candidate osculating node, not an approved product value",
  "Validation gate: pnpm run check:true-node-vector-validation.",
]);
assertNotIncludes("probe script", probe, [
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "pyswisseph",
  "SE_TRUE_NODE",
  "SE_MEAN_NODE",
  'nodeType: "true"',
]);

const realChartEngine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine", realChartEngine, [
  "calculateMeanLunarNodes",
  "calculateMeanNorthLunarNodeLongitude",
  'nodeType: "mean"',
  "mean-lunar-node-j2000-meeus-formula",
]);
assertNotIncludes("real chart engine", realChartEngine, [
  "calculateTrueLunarNodes",
  'nodeType: "true"',
  "true-lunar-node",
  "osculating-lunar-node",
  "swisseph",
  "SE_TRUE_NODE",
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

if (failures.length > 0) {
  console.error("True Node local source contract check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("True Node local source contract check passed.");