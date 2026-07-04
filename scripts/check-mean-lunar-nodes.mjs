import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

const repoRoot = process.cwd();
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

const failures = [];
const read = (filePath) => readFileSync(filePath, "utf8");
const packageJson = JSON.parse(read("package.json"));

function requireIncludes(filePath, markers) {
  const text = read(filePath);
  for (const marker of markers) {
    if (!text.includes(marker)) {
      failures.push(`${filePath} is missing Mean Lunar Nodes marker: ${marker}`);
    }
  }
}

requireIncludes("types/astro.ts", [
  "RealEngineReportLunarNodes",
  "RealEngineReportCalculatedLunarNodes",
  "RealEngineReportLunarNodePoint",
  "mean-lunar-node-j2000-meeus-formula",
]);

requireIncludes("src/lib/chart/real-chart-engine.ts", [
  'REAL_CHART_WORKBENCH_VERSION = "0.1.166"',
  "calculateMeanLunarNodes",
  "calculateMeanNorthLunarNodeLongitude",
  "mean-lunar-node-j2000-meeus-formula",
  "True/Osculating Node remains deferred",
  "lunarNodes,",
]);

requireIncludes("lib/report-generation/report-generation-service.ts", [
  'REPORT_GENERATION_SERVICE_VERSION = "0.1.166"',
  "buildCalculatedLunarNodes",
  'nodesStatus: realChart.lunarNodes?.status === "calculated" ? "calculated" : "not-calculated"',
  "Mean Lunar Node is calculated",
  "Black Moon Lilith is not calculated yet.",
]);

if (packageJson.scripts?.["check:mean-lunar-nodes"] !== "node scripts/check-mean-lunar-nodes.mjs") {
  failures.push("package.json missing check:mean-lunar-nodes script");
}

for (const scriptName of ["check:project", "check:engine"]) {
  const value = packageJson.scripts?.[scriptName] ?? "";
  if (!value.includes("pnpm run check:mean-lunar-nodes")) {
    failures.push(`${scriptName} does not run check:mean-lunar-nodes`);
  }
}

const runtimeDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.optionalDependencies ?? {}),
};
for (const forbidden of ["swisseph", "sweph", "swiss-ephemeris"]) {
  if (Object.prototype.hasOwnProperty.call(runtimeDeps, forbidden)) {
    failures.push("Forbidden runtime ephemeris dependency added for Mean Lunar Nodes: " + forbidden);
  }
}

const {
  buildRealChartWorkbenchResult,
  calculateMeanLunarNodes,
  calculateMeanNorthLunarNodeLongitude,
  normalizeLongitude,
} = require("../src/lib/chart/real-chart-engine.ts");
const { generateReportContract } = require("../lib/report-generation/report-generation-service.ts");

function shortestDelta(first, second) {
  const raw = normalizeLongitude(first) - normalizeLongitude(second);
  if (raw > 180) return raw - 360;
  if (raw < -180) return raw + 360;
  return raw;
}

for (const fixture of [
  new Date(Date.UTC(1992, 7, 12, 7, 30, 0)),
  new Date(Date.UTC(1998, 1, 3, 3, 10, 0)),
  new Date(Date.UTC(2026, 6, 4, 0, 0, 0)),
]) {
  const north = calculateMeanNorthLunarNodeLongitude(fixture);
  const nodes = calculateMeanLunarNodes(fixture);
  if (!Number.isFinite(north) || north < 0 || north >= 360) {
    failures.push(`Mean North Lunar Node longitude out of range for ${fixture.toISOString()}: ${north}`);
  }
  if (nodes.status !== "calculated" || nodes.method !== "mean-lunar-node-j2000-meeus-formula") {
    failures.push(`Mean Lunar Nodes metadata wrong for ${fixture.toISOString()}`);
  }
  const opposition = Math.abs(shortestDelta(nodes.southNode.longitude, nodes.northNode.longitude + 180));
  if (opposition > 0.000001) {
    failures.push(`South Node is not exact opposition for ${fixture.toISOString()}: ${opposition}`);
  }
}

for (const fixture of [
  {
    name: "Tehran Mean Node fixture",
    birthDate: "1992-08-12",
    birthTime: "11:00",
    timezone: "Asia/Tehran",
    placeName: "Tehran",
    latitude: 35.6892,
    longitude: 51.389,
  },
  {
    name: "Baku Mean Node fixture",
    birthDate: "1994-02-20",
    birthTime: "22:10",
    timezone: "Asia/Baku",
    placeName: "Baku",
    latitude: 40.4093,
    longitude: 49.8671,
  },
]) {
  const result = buildRealChartWorkbenchResult(fixture);
  if (result.lunarNodes?.status !== "calculated") {
    failures.push(`${fixture.name}: workbench did not calculate Mean Lunar Nodes`);
  }
  if (!result.lunarNodes?.northNode || !result.lunarNodes?.southNode) {
    failures.push(`${fixture.name}: missing north/south Mean Lunar Node points`);
  }
}

const generated = generateReportContract({
  input: {
    name: "Mean Node QA",
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
  failures.push("generateReportContract failed for Mean Lunar Node fixture: " + generated.message);
} else {
  const snapshot = generated.contract.engineData.realEngineSnapshot;
  if (snapshot?.lunarNodes?.status !== "calculated") {
    failures.push("realEngineSnapshot.lunarNodes is not calculated");
  }
  if (snapshot?.calculationQuality?.nodesStatus !== "calculated") {
    failures.push("calculationQuality.nodesStatus is not calculated");
  }
  if (snapshot?.lilith?.status !== "not-calculated") {
    failures.push("Lilith must remain deferred while Mean Lunar Nodes are introduced");
  }
}

if (failures.length > 0) {
  console.error("Mean Lunar Nodes check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Mean Lunar Nodes check passed.");
