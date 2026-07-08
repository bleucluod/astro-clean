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

const { absDelta, buildFixtureRows, normalizeLongitude } = require("./probe-true-node-vector-feasibility.mjs");
const {
  LOCAL_TRUE_NODE_CANDIDATE_METHOD,
  LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
  calculateLocalTrueNodeCandidate,
} = require("../src/lib/chart/local-true-node-candidate.ts");

const {
  TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE,
  TRUE_NODE_SELECTION_CONTRACT_VERSION,
  TRUE_NODE_SELECTION_DEFAULT_MODE,
  TRUE_NODE_SELECTION_MEAN_FALLBACK_MODE,
  assertTrueNodeSelectionContractIsSafe,
  getFutureApprovedTrueNodeSelectionContract,
  getLocalTrueNodeProductionSelectionContract,
  getMeanNodeFallbackSelectionContract,
  getTrueNodeSelectionContract,
} = require("../src/lib/chart/true-node-selection-contract.ts");

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:true-node-selection-contract"] === "node scripts/check-true-node-selection-contract.mjs",
  "package.json missing check:true-node-selection-contract script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:true-node-selection-contract"),
    `${scriptName} does not include check:true-node-selection-contract`,
  );
}

for (const forbidden of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, forbidden),
    `unapproved runtime dependency present for True Node selection contract: ${forbidden}`,
  );
}

assert(TRUE_NODE_SELECTION_CONTRACT_VERSION === "v0.1.232", "selection contract version must match v0.1.232");
assert(TRUE_NODE_SELECTION_DEFAULT_MODE === "local-true-node-production", "default selection mode changed");
assert(TRUE_NODE_SELECTION_MEAN_FALLBACK_MODE === "mean-lunar-node-fallback", "mean fallback mode changed");
assert(TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE === "approved-true-node-future", "future approved mode changed");

for (const row of buildFixtureRows()) {
  const candidate = calculateLocalTrueNodeCandidate(row.date, "ecliptic-of-date");
  const localContract = getLocalTrueNodeProductionSelectionContract(candidate);

  assert(localContract.mode === "local-true-node-production", `${row.iso} local contract mode is wrong`);
  assert(localContract.productionOutput === "local-true-node", `${row.iso} local contract is not production local output`);
  assert(localContract.allowsNatalTrueNodeOutput === true, `${row.iso} local contract does not allow natal output`);
  assert(localContract.candidateSource === LOCAL_TRUE_NODE_CANDIDATE_SOURCE, `${row.iso} local source mismatch`);
  assert(localContract.candidateMethod === LOCAL_TRUE_NODE_CANDIDATE_METHOD, `${row.iso} local method mismatch`);
  assert(
    absDelta(candidate.southLongitude, normalizeLongitude(candidate.northLongitude + 180)) < 1e-9,
    `${row.iso} local candidate South Node is not exact opposition`,
  );
  assertTrueNodeSelectionContractIsSafe(localContract);

  const selected = getTrueNodeSelectionContract("local-true-node-production", candidate);
  assert(selected.mode === localContract.mode, `${row.iso} selected local contract did not use local production mode`);
}

const defaultContract = getTrueNodeSelectionContract();
assert(defaultContract.productionOutput === "local-true-node", "default contract must use local True Node output");
assert(defaultContract.allowsNatalTrueNodeOutput === true, "default contract must allow local True Node output");

const meanFallbackContract = getMeanNodeFallbackSelectionContract();
assert(meanFallbackContract.mode === "mean-lunar-node-fallback", "mean fallback mode is wrong");
assert(meanFallbackContract.productionOutput === "mean-lunar-node-fallback", "mean fallback contract must stay available");
assert(meanFallbackContract.allowsNatalTrueNodeOutput === false, "mean fallback contract must not claim local True Node output");
assertTrueNodeSelectionContractIsSafe(meanFallbackContract);

const futureContract = getFutureApprovedTrueNodeSelectionContract();
assert(futureContract.mode === "approved-true-node-future", "future contract mode is wrong");
assert(futureContract.productionOutput === "blocked-future-approval", "future contract must stay blocked");
assert(futureContract.allowsNatalTrueNodeOutput === false, "future contract must not enable natal output yet");
assertTrueNodeSelectionContractIsSafe(futureContract);

const selectionContract = read("src/lib/chart/true-node-selection-contract.ts");
assertIncludes("selection contract", selectionContract, [
  "TRUE_NODE_SELECTION_DEFAULT_MODE",
  "local-true-node-production",
  "mean-lunar-node-fallback",
  "approved-true-node-future",
  "allowsNatalTrueNodeOutput: true",
  "assertTrueNodeSelectionContractIsSafe",
]);
assertNotIncludes("selection contract", selectionContract, [
  "local-true-node-disabled-candidate",
  "blocked-local-candidate",
  'nodeType: "true"',
  "swisseph",
]);

if (failures.length > 0) {
  console.error("True Node selection contract check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("True Node selection contract check passed.");
