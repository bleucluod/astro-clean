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
  packageJson.scripts?.["check:mean-lunar-nodes"] === "node scripts/check-mean-lunar-nodes.mjs",
  "package.json missing check:mean-lunar-nodes script",
);
for (const scriptName of ["check:project", "check:engine"]) {
  const value = packageJson.scripts?.[scriptName] ?? "";
  assert(value.includes("pnpm run check:mean-lunar-nodes"), `${scriptName} does not run check:mean-lunar-nodes`);
}

for (const forbidden of ["swisseph", "sweph", "swiss-ephemeris"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, forbidden),
    "Forbidden runtime ephemeris dependency added for lunar nodes: " + forbidden,
  );
}

const {
  buildRealChartWorkbenchResult,
  calculateLocalTrueLunarNodes,
  calculateMeanLunarNodes,
  calculateMeanNorthLunarNodeLongitude,
  normalizeLongitude,
} = require("../src/lib/chart/real-chart-engine.ts");
const { generateReportContract } = require("../lib/report-generation/report-generation-service.ts");

for (const fixture of [
  new Date(Date.UTC(1992, 7, 12, 7, 30, 0)),
  new Date(Date.UTC(1998, 1, 3, 3, 10, 0)),
  new Date(Date.UTC(2026, 6, 4, 0, 0, 0)),
]) {
  const meanNorth = calculateMeanNorthLunarNodeLongitude(fixture);
  const meanNodes = calculateMeanLunarNodes(fixture);
  const localNodes = calculateLocalTrueLunarNodes(fixture);

  assertFinite(`Mean North Lunar Node longitude ${fixture.toISOString()}`, meanNorth);
  assert(meanNorth >= 0 && meanNorth < 360, `Mean North Lunar Node longitude out of range for ${fixture.toISOString()}: ${meanNorth}`);
  assert(meanNodes.status === "calculated", `Mean Lunar Nodes status wrong for ${fixture.toISOString()}`);
  assert(meanNodes.method === "mean-lunar-node-j2000-meeus-formula", `Mean Lunar Nodes method wrong for ${fixture.toISOString()}`);
  assert(meanNodes.nodeType === "mean", `Mean Lunar Nodes fallback nodeType is not mean for ${fixture.toISOString()}`);

  assert(localNodes.status === "calculated", `Local True Nodes status wrong for ${fixture.toISOString()}`);
  assert(localNodes.method === localMethod, `Local True Nodes method wrong for ${fixture.toISOString()}`);
  assert(localNodes.nodeType === "local-true-osculating", `Local True Nodes nodeType wrong for ${fixture.toISOString()}`);

  const meanOpposition = Math.abs(shortestDelta(meanNodes.southNode.longitude, meanNodes.northNode.longitude + 180, normalizeLongitude));
  const localOpposition = Math.abs(shortestDelta(localNodes.southNode.longitude, localNodes.northNode.longitude + 180, normalizeLongitude));
  assert(meanOpposition <= 0.000001, `Mean South Node is not exact opposition for ${fixture.toISOString()}: ${meanOpposition}`);
  assert(localOpposition <= 0.000001, `Local True South Node is not exact opposition for ${fixture.toISOString()}: ${localOpposition}`);
}

for (const fixture of [
  {
    name: "Tehran Local True Node fixture",
    birthDate: "1992-08-12",
    birthTime: "11:00",
    timezone: "Asia/Tehran",
    placeName: "Tehran",
    latitude: 35.6892,
    longitude: 51.389,
  },
  {
    name: "Baku Local True Node fixture",
    birthDate: "1994-02-20",
    birthTime: "22:10",
    timezone: "Asia/Baku",
    placeName: "Baku",
    latitude: 40.4093,
    longitude: 49.8671,
  },
]) {
  const result = buildRealChartWorkbenchResult(fixture);
  assert(result.lunarNodes?.status === "calculated", `${fixture.name}: workbench did not calculate lunar nodes`);
  assert(result.lunarNodes?.nodeType === "local-true-osculating", `${fixture.name}: workbench lunar node type is not local-true-osculating`);
  assert(result.lunarNodes?.method === localMethod, `${fixture.name}: workbench lunar node method mismatch`);
  assert(Boolean(result.lunarNodes?.northNode && result.lunarNodes?.southNode), `${fixture.name}: missing north/south lunar node points`);
}

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
  fail("generateReportContract failed for Local True Node fixture: " + generated.message);
} else {
  const snapshot = generated.contract.engineData.realEngineSnapshot;
  assert(snapshot?.lunarNodes?.status === "calculated", "realEngineSnapshot.lunarNodes is not calculated");
  assert(snapshot?.lunarNodes?.nodeType === "local-true-osculating", "realEngineSnapshot.lunarNodes.nodeType is not local-true-osculating");
  assert(snapshot?.lunarNodes?.method === localMethod, "realEngineSnapshot.lunarNodes.method is not local True/Osculating method");
  assert(snapshot?.calculationQuality?.nodesStatus === "calculated", "calculationQuality.nodesStatus is not calculated");
  assert(snapshot?.calculationQuality?.lilithStatus === "not-calculated", "calculationQuality.lilithStatus must remain not-calculated");
  assert(snapshot?.lilith?.status === "not-calculated", "Lilith must remain deferred while lunar nodes are integrated");
}

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine", engine, [
  "calculateLocalTrueLunarNodes",
  "calculateMeanLunarNodes",
  "calculateMeanNorthLunarNodeLongitude",
  "LOCAL_TRUE_NODE_CANDIDATE_METHOD",
]);

const astroTypes = read("types/astro.ts");
assertIncludes("astro types", astroTypes, [
  "RealEngineReportLunarNodes",
  'nodeType: "mean" | "local-true-osculating"',
  localMethod,
]);

if (failures.length > 0) {
  console.error("Lunar Nodes check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lunar Nodes check passed.");
