import fs, { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
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

function assertFinite(label, value) {
  assert(Number.isFinite(value), `${label} is not finite: ${value}`);
}

function shortestDelta(first, second, normalizeLongitude) {
  const raw = normalizeLongitude(first) - normalizeLongitude(second);
  if (raw > 180) return raw - 360;
  if (raw < -180) return raw + 360;
  return raw;
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
} = require("../src/lib/chart/local-true-node-candidate.ts");

const { buildFixtureRows, buildNodeEventRows, normalizeLongitude } = require("./probe-true-node-vector-feasibility.mjs");

function absDelta(first, second) {
  return Math.abs(shortestDelta(first, second, normalizeLongitude));
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:local-true-node-internal-adapter"] === "node scripts/check-local-true-node-internal-adapter.mjs",
  "package.json missing check:local-true-node-internal-adapter script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:local-true-node-internal-adapter"),
    `${scriptName} does not include check:local-true-node-internal-adapter`,
  );
}

for (const forbidden of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, forbidden),
    `unapproved runtime dependency present for local True Node adapter: ${forbidden}`,
  );
}

assert(LOCAL_TRUE_NODE_CANDIDATE_STATUS === "production-local-true-node", "local True Node candidate status must be production-local-true-node");
assert(LOCAL_TRUE_NODE_CANDIDATE_APPROVAL === "approved-local-engine-output", "local True Node candidate approval must be approved-local-engine-output");
assert(LOCAL_TRUE_NODE_CANDIDATE_SOURCE === "astronomy-engine-geomoonstate", "local True Node candidate source must stay astronomy-engine GeoMoonState");
assert(LOCAL_TRUE_NODE_CANDIDATE_METHOD === "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date", "local True Node candidate method changed unexpectedly");

const missingApis = getMissingLocalTrueNodeCandidateApis();
if (missingApis.length > 0) {
  fail(`local True Node adapter is missing required Astronomy Engine APIs: ${missingApis.join(", ")}`);
}

const fixtureRows = buildFixtureRows();
assert(fixtureRows.length >= 12, "local True Node adapter should keep at least twelve fixture dates through the probe harness");

for (const row of fixtureRows) {
  const candidates = calculateLocalTrueNodeCandidatePair(new Date(row.iso));
  const ect = candidates.ectOfDate;

  assertFinite(`${row.iso} local ECT north`, ect.northLongitude);
  assertFinite(`${row.iso} local ECT south`, ect.southLongitude);
  assertFinite(`${row.iso} local ECT inclination`, ect.inclination);

  assert(ect.status === LOCAL_TRUE_NODE_CANDIDATE_STATUS, `${row.iso} local candidate status mismatch`);
  assert(ect.approval === LOCAL_TRUE_NODE_CANDIDATE_APPROVAL, `${row.iso} local candidate approval mismatch`);
  assert(ect.source === LOCAL_TRUE_NODE_CANDIDATE_SOURCE, `${row.iso} local candidate source mismatch`);
  assert(ect.method === LOCAL_TRUE_NODE_CANDIDATE_METHOD, `${row.iso} local candidate method mismatch`);
  assert(ect.frame === "ecliptic-of-date", `${row.iso} local candidate frame mismatch`);
  assert(
    absDelta(ect.southLongitude, calculateLocalTrueNodeSouthLongitude(ect.northLongitude)) < 1e-9,
    `${row.iso} local candidate South Node is not exact opposition`,
  );
  assert(ect.inclination > 4.5 && ect.inclination < 5.7, `${row.iso} lunar inclination outside safe range: ${ect.inclination}`);
}

const nodeEventRows = buildNodeEventRows();
assert(nodeEventRows.length >= 6, "local True Node adapter should keep at least six node-event sanity starts");

for (const row of nodeEventRows) {
  const candidate = calculateLocalTrueNodeCandidate(row.eventDate, "ecliptic-of-date");
  const expected = row.eventKind === "ascending" ? candidate.northLongitude : candidate.southLongitude;
  assert(
    absDelta(expected, row.moonEctLongitude) < 0.001,
    `${row.searchStartIso} local candidate does not align with node-event longitude`,
  );
}

const localAdapter = read("src/lib/chart/local-true-node-candidate.ts");
assertIncludes("local True Node adapter", localAdapter, [
  "LOCAL_TRUE_NODE_CANDIDATE_REQUIRED_APIS",
  "GeoMoonState",
  "Rotation_EQJ_ECT",
  "RotateState",
  "calculateLocalTrueNodeCandidatePair",
  "calculateLocalTrueNodeSouthLongitude",
  "production-local-true-node",
  "approved-local-engine-output",
]);
assertNotIncludes("local True Node adapter", localAdapter, [
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "pyswisseph",
  "SE_TRUE_NODE",
  "SE_MEAN_NODE",
]);

if (failures.length > 0) {
  console.error("Local True Node internal adapter check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Local True Node internal adapter check passed.");
