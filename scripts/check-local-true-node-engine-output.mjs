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

const packageJson = JSON.parse(read("package.json"));
const localMethod = "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date";

assert(
  packageJson.scripts?.["check:local-true-node-engine-output"] === "node scripts/check-local-true-node-engine-output.mjs",
  "package.json missing check:local-true-node-engine-output script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:local-true-node-engine-output"),
    `${scriptName} does not include check:local-true-node-engine-output`,
  );
}

for (const forbidden of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, forbidden),
    `unapproved runtime dependency present: ${forbidden}`,
  );
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, forbidden),
    `unapproved optional dependency present: ${forbidden}`,
  );
}

const {
  buildRealChartWorkbenchResult,
  calculateLocalTrueLunarNodes,
  calculateMeanLunarNodes,
  calculateMeanNorthLunarNodeLongitude,
  normalizeLongitude,
} = require("../src/lib/chart/real-chart-engine.ts");

const { calculateLocalTrueNodeCandidate } = require("../src/lib/chart/local-true-node-candidate.ts");
const { getTrueNodeSelectionContract } = require("../src/lib/chart/true-node-selection-contract.ts");
const { generateReportContract } = require("../lib/report-generation/report-generation-service.ts");

const fixtures = [
  new Date(Date.UTC(1992, 7, 12, 7, 30, 0)),
  new Date(Date.UTC(1994, 1, 20, 18, 10, 0)),
  new Date(Date.UTC(2000, 0, 1, 12, 0, 0)),
  new Date(Date.UTC(2026, 6, 8, 0, 0, 0)),
];

for (const fixture of fixtures) {
  const candidate = calculateLocalTrueNodeCandidate(fixture, "ecliptic-of-date");
  const localNodes = calculateLocalTrueLunarNodes(fixture);
  const meanNodes = calculateMeanLunarNodes(fixture);
  const meanNorth = calculateMeanNorthLunarNodeLongitude(fixture);

  assertFinite(`${fixture.toISOString()} candidate north`, candidate.northLongitude);
  assertFinite(`${fixture.toISOString()} local node north`, localNodes.northNode.longitude);
  assertFinite(`${fixture.toISOString()} mean node fallback`, meanNorth);

  assert(localNodes.status === "calculated", `${fixture.toISOString()} local nodes status is not calculated`);
  assert(localNodes.method === localMethod, `${fixture.toISOString()} local nodes method mismatch`);
  assert(localNodes.nodeType === "local-true-osculating", `${fixture.toISOString()} local nodes nodeType mismatch`);
  assert(meanNodes.nodeType === "mean", `${fixture.toISOString()} mean fallback nodeType changed`);
  assert(meanNodes.method === "mean-lunar-node-j2000-meeus-formula", `${fixture.toISOString()} mean fallback method changed`);

  assert(
    Math.abs(shortestDelta(localNodes.northNode.longitude, candidate.northLongitude, normalizeLongitude)) < 1e-9,
    `${fixture.toISOString()} local engine north does not match local candidate`,
  );
  assert(
    Math.abs(shortestDelta(localNodes.southNode.longitude, normalizeLongitude(localNodes.northNode.longitude + 180), normalizeLongitude)) < 1e-9,
    `${fixture.toISOString()} local engine south is not exact opposition`,
  );
}

const workbench = buildRealChartWorkbenchResult({
  birthDate: "1992-08-12",
  birthTime: "11:00",
  timezone: "Asia/Tehran",
  placeName: "Tehran",
  latitude: 35.6892,
  longitude: 51.389,
});

assert(workbench.lunarNodes?.status === "calculated", "workbench lunarNodes is not calculated");
assert(workbench.lunarNodes?.nodeType === "local-true-osculating", "workbench is not using local True/Osculating nodes");
assert(workbench.lunarNodes?.method === localMethod, "workbench local node method mismatch");

const selection = getTrueNodeSelectionContract();
assert(selection.productionOutput === "local-true-node", "selection contract does not point to local True Node production output");
assert(selection.allowsNatalTrueNodeOutput === true, "selection contract does not allow local natal output");

const generated = generateReportContract({
  input: {
    name: "Local True Node QA",
    birthDate: "1992-08-12",
    birthTime: "11:00",
    birthCity: "Tehran",
    birthCountry: "Iran",
    birthTimezone: "Asia/Tehran",
    birthLatitude: 35.6892,
    birthLongitude: 51.389,
  },
});

if (!generated.ok) {
  fail("generateReportContract failed for local True Node fixture: " + generated.message);
} else {
  const snapshot = generated.contract.engineData.realEngineSnapshot;
  assert(snapshot?.lunarNodes?.status === "calculated", "snapshot lunarNodes is not calculated");
  assert(snapshot?.lunarNodes?.nodeType === "local-true-osculating", "snapshot is not using local True/Osculating nodes");
  assert(snapshot?.lunarNodes?.method === localMethod, "snapshot local node method mismatch");
  assert(snapshot?.calculationQuality?.nodesStatus === "calculated", "snapshot nodesStatus is not calculated");
  assert(snapshot?.calculationQuality?.lilithStatus === "not-calculated", "snapshot lilithStatus changed");
  assert(snapshot?.lilith?.status === "not-calculated", "Lilith must remain deferred");
}

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine", engine, [
  "calculateLocalTrueLunarNodes",
  "calculateMeanLunarNodes",
  "calculateLocalTrueNodeCandidate",
  "LOCAL_TRUE_NODE_CANDIDATE_METHOD",
  'nodeType: "local-true-osculating"',
]);
assertNotIncludes("real chart engine", engine, [
  "SearchMoonNode",
  "NextMoonNode",
  "SearchLunarApsis",
  "NextLunarApsis",
  "swisseph",
  "SE_TRUE_NODE",
  'nodeType: "true"',
]);

const astroTypes = read("types/astro.ts");
assertIncludes("astro types", astroTypes, [
  localMethod,
  'nodeType: "mean" | "local-true-osculating"',
]);
assertNotIncludes("astro types", astroTypes, [
  'nodeType: "true"',
  "true-lunar-node",
  "osculating-lunar-node",
]);

if (failures.length > 0) {
  console.error("Local True Node engine output check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Local True Node engine output check passed.");
