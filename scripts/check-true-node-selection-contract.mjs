import fs, { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { absDelta, buildFixtureRows, normalizeLongitude } from "./probe-true-node-vector-feasibility.mjs";

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
  LOCAL_TRUE_NODE_CANDIDATE_METHOD,
  LOCAL_TRUE_NODE_CANDIDATE_SOURCE,
  calculateLocalTrueNodeCandidate,
} = require("../src/lib/chart/local-true-node-candidate.ts");

const {
  TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE,
  TRUE_NODE_SELECTION_CONTRACT_VERSION,
  TRUE_NODE_SELECTION_DEFAULT_MODE,
  TRUE_NODE_SELECTION_LOCAL_CANDIDATE_MODE,
  assertTrueNodeSelectionContractIsSafe,
  getDisabledLocalTrueNodeSelectionContract,
  getFutureApprovedTrueNodeSelectionContract,
  getMeanNodeProductionSelectionContract,
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

const runtimeDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.optionalDependencies ?? {}),
};
for (const forbidden of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(runtimeDeps, forbidden),
    `unapproved runtime dependency present for True Node selection contract: ${forbidden}`,
  );
}

assert(TRUE_NODE_SELECTION_CONTRACT_VERSION === "v0.1.231", "selection contract version must match v0.1.231");
assert(TRUE_NODE_SELECTION_DEFAULT_MODE === "mean-lunar-node-production", "default selection mode changed");
assert(TRUE_NODE_SELECTION_LOCAL_CANDIDATE_MODE === "local-true-node-disabled-candidate", "local candidate mode changed");
assert(TRUE_NODE_SELECTION_APPROVED_FUTURE_MODE === "approved-true-node-future", "future approved mode changed");

const meanContract = getMeanNodeProductionSelectionContract();
assert(meanContract.mode === "mean-lunar-node-production", "mean contract mode is wrong");
assert(meanContract.productionOutput === "mean-lunar-node", "mean contract must keep Mean Lunar Node output");
assert(meanContract.allowsNatalTrueNodeOutput === false, "mean contract must not claim True Node output");
assert(meanContract.candidateSource === null, "mean contract should not carry candidate source");
assertTrueNodeSelectionContractIsSafe(meanContract);

for (const row of buildFixtureRows()) {
  const candidate = calculateLocalTrueNodeCandidate(row.date, "ecliptic-of-date");
  const localContract = getDisabledLocalTrueNodeSelectionContract(candidate);

  assert(localContract.mode === "local-true-node-disabled-candidate", `${row.iso} local contract mode is wrong`);
  assert(localContract.productionOutput === "blocked-local-candidate", `${row.iso} local contract was promoted to production`);
  assert(localContract.allowsNatalTrueNodeOutput === false, `${row.iso} local contract allows natal output`);
  assert(localContract.candidateSource === LOCAL_TRUE_NODE_CANDIDATE_SOURCE, `${row.iso} local source mismatch`);
  assert(localContract.candidateMethod === LOCAL_TRUE_NODE_CANDIDATE_METHOD, `${row.iso} local method mismatch`);
  assert(
    absDelta(candidate.southLongitude, normalizeLongitude(candidate.northLongitude + 180)) < 1e-9,
    `${row.iso} local candidate South Node is not exact opposition`,
  );
  assertTrueNodeSelectionContractIsSafe(localContract);

  const selected = getTrueNodeSelectionContract("local-true-node-disabled-candidate", candidate);
  assert(selected.mode === localContract.mode, `${row.iso} selected local contract did not use local candidate mode`);
}

const futureContract = getFutureApprovedTrueNodeSelectionContract();
assert(futureContract.mode === "approved-true-node-future", "future contract mode is wrong");
assert(futureContract.productionOutput === "blocked-future-approval", "future contract must stay blocked");
assert(futureContract.allowsNatalTrueNodeOutput === false, "future contract must not enable natal output yet");
assertTrueNodeSelectionContractIsSafe(futureContract);

const selectionContract = read("src/lib/chart/true-node-selection-contract.ts");
assertIncludes("selection contract", selectionContract, [
  "TRUE_NODE_SELECTION_DEFAULT_MODE",
  "mean-lunar-node-production",
  "local-true-node-disabled-candidate",
  "approved-true-node-future",
  "allowsNatalTrueNodeOutput: false",
  "assertTrueNodeSelectionContractIsSafe",
]);
assertNotIncludes("selection contract", selectionContract, [
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "pyswisseph",
  "SE_TRUE_NODE",
  "SE_MEAN_NODE",
  'nodeType: "true"',
]);

const localAdapter = read("src/lib/chart/local-true-node-candidate.ts");
assertIncludes("local adapter", localAdapter, [
  "disabled-internal-candidate",
  "not-approved-for-natal-output",
  "calculateLocalTrueNodeCandidatePair",
]);

const realChartEngine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine", realChartEngine, [
  "calculateMeanLunarNodes",
  "calculateMeanNorthLunarNodeLongitude",
  'nodeType: "mean"',
  "mean-lunar-node-j2000-meeus-formula",
]);
assertNotIncludes("real chart engine", realChartEngine, [
  "true-node-selection-contract",
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
  console.error("True Node selection contract check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("True Node selection contract check passed.");