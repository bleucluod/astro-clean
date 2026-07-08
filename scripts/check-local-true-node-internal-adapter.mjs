import fs, { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  absDelta,
  buildFixtureRows,
  buildNodeEventRows,
  fixtures,
  normalizeLongitude,
} from "./probe-true-node-vector-feasibility.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
  ];

  for (const option of candidates) {
    try {
      readFileSync(option);
      return option;
    } catch {}
  }

  return candidate;
}

Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: true,
    },
  });

  module._compile(transpiled.outputText, filename);
};

const root = repoRoot;
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

const {
  LOCAL_TRUE_NODE_CANDIDATE_APPROVAL,
  LOCAL_TRUE_NODE_CANDIDATE_METHOD,
  LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
  LOCAL_TRUE_NODE_CANDIDATE_STATUS,
  calculateLocalTrueNodeCandidate,
  calculateLocalTrueNodeCandidatePair,
  calculateLocalTrueNodeSouthLongitude,
  getMissingLocalTrueNodeCandidateApis,
  normalizeLocalTrueNodeLongitude,
} = require("../src/lib/chart/local-true-node-candidate.ts");

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:local-true-node-internal-adapter"] ===
    "node scripts/check-local-true-node-internal-adapter.mjs",
  "package.json missing check:local-true-node-internal-adapter script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:local-true-node-internal-adapter"),
    `${scriptName} does not include check:local-true-node-internal-adapter`,
  );
}

const runtimeDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.optionalDependencies ?? {}),
};
for (const forbidden of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(runtimeDeps, forbidden),
    `unapproved runtime dependency present for local True Node adapter: ${forbidden}`,
  );
}

assert(
  LOCAL_TRUE_NODE_CANDIDATE_STATUS === "disabled-internal-candidate",
  "local True Node candidate status must remain disabled/internal",
);
assert(
  LOCAL_TRUE_NODE_CANDIDATE_APPROVAL === "not-approved-for-natal-output",
  "local True Node candidate approval must remain not approved for natal output",
);
assert(
  LOCAL_TRUE_NODE_CANDIDATE_SOURCE === "astronomy-engine-geomoonstate",
  "local True Node candidate source must stay astronomy-engine GeoMoonState",
);
assert(
  LOCAL_TRUE_NODE_CANDIDATE_METHOD ===
    "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date",
  "local True Node candidate method changed unexpectedly",
);

const missingApis = getMissingLocalTrueNodeCandidateApis();
if (missingApis.length > 0) {
  fail(`local True Node adapter is missing required Astronomy Engine APIs: ${missingApis.join(", ")}`);
}

assert(
  fixtures.length >= 5,
  "local True Node internal adapter should keep at least five fixture dates through the probe harness",
);

for (const row of buildFixtureRows()) {
  const candidates = calculateLocalTrueNodeCandidatePair(new Date(row.iso));
  const ect = candidates.ectOfDate;
  const ecl = candidates.eclJ2000;

  assert(ect.status === "disabled-internal-candidate", `${row.iso} ECT candidate is not disabled/internal`);
  assert(ect.approval === "not-approved-for-natal-output", `${row.iso} ECT candidate was promoted to natal output`);
  assert(ect.frame === "ecliptic-of-date", `${row.iso} ECT candidate has wrong frame`);
  assert(ecl.frame === "j2000-ecliptic", `${row.iso} ECL candidate has wrong frame`);

  for (const [label, value] of Object.entries({
    "ECT north": ect.northLongitude,
    "ECT south": ect.southLongitude,
    "ECT inclination": ect.inclination,
    "ECL north": ecl.northLongitude,
    "ECL south": ecl.southLongitude,
    "ECL inclination": ecl.inclination,
  })) {
    assertFinite(`${row.iso} ${label}`, value);
  }

  assert(
    absDelta(ect.southLongitude, normalizeLongitude(ect.northLongitude + 180)) < 1e-9,
    `${row.iso} local adapter South Node is not exact opposition from candidate North Node`,
  );
  assert(
    absDelta(ect.southLongitude, calculateLocalTrueNodeSouthLongitude(ect.northLongitude)) < 1e-9,
    `${row.iso} local adapter South Node helper disagrees with candidate output`,
  );
  assert(
    normalizeLocalTrueNodeLongitude(ect.northLongitude) === ect.northLongitude,
    `${row.iso} local adapter North Node is not normalized`,
  );
  assert(
    ect.inclination > 4.5 && ect.inclination < 5.7,
    `${row.iso} local adapter inclination is outside conservative lunar orbit range: ${ect.inclination}`,
  );
  assert(
    Math.abs(row.ectDeltaVsMean) < 5,
    `${row.iso} local candidate delta versus Mean Node is too large for a disabled candidate: ${row.ectDeltaVsMean}`,
  );
  assert(
    absDelta(ect.northLongitude, row.ectOfDate.ascendingLongitude) < 1e-9,
    `${row.iso} local adapter ECT candidate drifted from probe harness`,
  );
  assert(
    absDelta(ecl.northLongitude, row.eclJ2000.ascendingLongitude) < 1e-9,
    `${row.iso} local adapter ECL candidate drifted from probe harness`,
  );
}

for (const row of buildNodeEventRows()) {
  const candidate = calculateLocalTrueNodeCandidate(row.eventDate, "ecliptic-of-date");
  const expectedLongitude = row.eventKind === "descending"
    ? candidate.southLongitude
    : candidate.northLongitude;

  assert(
    row.eventDelta < 0.001,
    `${row.searchStartIso} probe event delta is outside sanity threshold: ${row.eventDelta}`,
  );
  assert(
    absDelta(expectedLongitude, row.expectedLongitude) < 1e-9,
    `${row.searchStartIso} local adapter event candidate drifted from probe event context`,
  );
}

const localAdapter = read("src/lib/chart/local-true-node-candidate.ts");
assertIncludes("local adapter", localAdapter, [
  "GeoMoonState",
  "Rotation_EQJ_ECT",
  "disabled-internal-candidate",
  "not-approved-for-natal-output",
  "calculateLocalTrueNodeCandidatePair",
  "calculateLocalTrueNodeSouthLongitude",
]);
assertNotIncludes("local adapter", localAdapter, [
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "pyswisseph",
  "SE_TRUE_NODE",
  "SE_MEAN_NODE",
  'nodeType: "true"',
  "SearchMoonNode",
]);

const realChartEngine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine", realChartEngine, [
  "calculateMeanLunarNodes",
  "calculateMeanNorthLunarNodeLongitude",
  'nodeType: "mean"',
  "mean-lunar-node-j2000-meeus-formula",
]);
assertNotIncludes("real chart engine", realChartEngine, [
  "local-true-node-candidate",
  "calculateLocalTrueNodeCandidate",
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

if (failures.length > 0) {
  console.error("Local True Node internal adapter check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Local True Node internal adapter check passed.");
