// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R19_SECONDARY_BODIES_20260831
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
// HALLEUS_R39_CHIRON_RUNTIME_ENV_RECONCILIATION_R1_20260902
const runtimeEphemerisDirectory =
  process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR?.trim() ?? "";
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(repoRoot, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        strict: true,
      },
      reportDiagnostics: true,
      fileName: filename,
    });
    const diagnostics = (result.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    if (diagnostics.length > 0) {
      throw new Error(
        `${path.relative(repoRoot, filename)} transpile errors: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\\n"))
          .join(" | ")}`,
      );
    }
    module._compile(result.outputText, filename);
  };
}

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const kernelDir = process.env.HALLEUS_R19_KERNEL_DIR;
const probePath = process.env.HALLEUS_R19_PROBE_RESULT;
assert(typeof kernelDir === "string" && fs.existsSync(kernelDir), "R19 kernel directory missing");
assert(typeof probePath === "string" && fs.existsSync(probePath), "R19 probe result missing");
const probe = probePath && fs.existsSync(probePath)
  ? JSON.parse(fs.readFileSync(probePath, "utf8"))
  : null;
assert(probe?.ok === true && probe.maxDifferenceDegrees <= 0.1, "R19 independent cross-validation did not pass");
assert(probe?.vertex?.ok === true && probe.vertex.maxDifferenceDegrees <= 0.02, "Vertex independent validation did not pass");

const calc = require(path.join(repoRoot, "src/lib/chart/jpl-secondary-body-calculation.ts"));
const normalized = require(path.join(repoRoot, "src/lib/chart/normalized-chart.ts"));
const unified = require(path.join(repoRoot, "src/lib/chart/unified-special-points.ts"));
const provider = require(path.join(repoRoot, "src/lib/chart/advanced-body-provider-contract.ts"));

const primaryUtc = new Date("1997-02-13T17:00:00.000Z");
const result = calc.calculateR19ValidatedSecondaryBodies({ utcDate: primaryUtc, kernelDirectory: kernelDir });
assert(result.status === "ready", `R19 calculation blocked: ${JSON.stringify(result)}`);
if (result.status === "ready") {
  assert(result.points.length === 5, "R19 must calculate exactly five secondary bodies");
  for (const point of result.points) {
    const expected = probe.fixtureLongitudes?.[point.id]?.[primaryUtc.toISOString()];
    assert(typeof expected === "number" && angularDifference(point.longitude, expected) <= 0.000001,
      `R19 runtime longitude mismatch for ${point.id}`);
    assert(Number.isFinite(point.motion.arcDegreesPerDay) && point.motion.sampleWindowHours === 12,
      `R19 motion missing for ${point.id}`);
  }
}

const fixtureChart = normalized.buildNormalizedChart({
  source: "slice2-r19-fixture",
  time: { date: "1997-02-13", time: "17:00", timezone: "UTC", placeName: "Mianeh R19 fixture" },
  house: {
    system: "placidus",
    ascendantLongitude: 0,
    cuspLongitudes: Array.from({ length: 12 }, (_, index) => index * 30),
    cuspSource: "provided",
    ascendantMethod: "provided",
  },
  placements: [
    { id: "sun", label: "Sun", pointType: "luminary", longitude: 10 },
    { id: "moon", label: "Moon", pointType: "luminary", longitude: 50 },
  ],
});
const oldDir = process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR;
process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR = kernelDir;
const points = unified.buildUnifiedSpecialPoints({
  utcDate: primaryUtc,
  latitude: 37.42,
  longitude: 47.72,
  ascendantLongitude: 0,
  normalizedChart: fixtureChart,
});
if (oldDir === undefined) delete process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR;
else process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR = oldDir;

for (const id of ["chiron", "juno", "eris", "pholus", "nessus"]) {
  const point = points.find((candidate) => candidate.id === id);
  assert(point?.status === "calculated", `${id} was not promoted by unified special points`);
  if (point?.status === "calculated") {
    assert(point.validationStatus === "independent-reference-fixtures-passed", `${id} validation status incorrect`);
    assert(typeof point.house === "number", `${id} did not reuse canonical house normalization`);
    assert(point.motion?.method === "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference", `${id} motion provenance missing`);
  }
}
const vertex = points.find((candidate) => candidate.id === "vertex");
assert(vertex?.status === "calculated", "Vertex was not calculated");
if (vertex?.status === "calculated") {
  assert(vertex.validationStatus === "independent-reference-fixtures-passed", "Vertex independent validation status missing");
}

const injectedEphemerisDirectory =
  process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR;

assert(
  runtimeEphemerisDirectory.length > 0 &&
    fs.existsSync(runtimeEphemerisDirectory),
  "R19 runtime guard did not receive HALLEUS_ADVANCED_EPHEMERIS_DIR",
);

if (
  runtimeEphemerisDirectory.length > 0 &&
  fs.existsSync(runtimeEphemerisDirectory)
) {
  process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR =
    runtimeEphemerisDirectory;

  const runtimeResult =
    calc.calculateR19ValidatedSecondaryBodies({
      utcDate: primaryUtc,
    });

  assert(
    runtimeResult.status === "ready",
    `R19 environment-backed runtime calculation blocked: ${JSON.stringify(
      runtimeResult,
    )}`,
  );

  if (runtimeResult.status === "ready") {
    const runtimeChiron =
      runtimeResult.points.find(
        (point) => point.id === "chiron",
      );

    assert(
      runtimeChiron?.status === "calculated" &&
        angularDifference(
          runtimeChiron.longitude,
          212.08800880164168,
        ) <= 0.000001,
      "R19 environment-backed Chiron fixture mismatch",
    );
  }
}

if (injectedEphemerisDirectory === undefined) {
  delete process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR;
} else {
  process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR =
    injectedEphemerisDirectory;
}

const missing = calc.calculateR19ValidatedSecondaryBodies({
  utcDate: primaryUtc,
  kernelDirectory: path.join(repoRoot, "__missing_r19_ephemeris__"),
});
assert(missing.status === "blocked" && missing.reason === "missing-ephemeris-files", "R19 missing-kernel behavior must fail closed");
assert(JSON.stringify(provider.ADVANCED_BODY_PROVIDER_DECISION.r19ValidatedSecondaryBodies) ===
  JSON.stringify(["chiron", "juno", "eris", "pholus", "nessus"]), "Provider R19 inventory incorrect");
assert(provider.ADVANCED_BODY_PROVIDER_DECISION.swissEphemerisQaOnly === true, "Swiss must remain QA-only");

function angularDifference(left, right) {
  let difference = Math.abs(left - right) % 360;
  if (difference > 180) difference = 360 - difference;
  return difference;
}
if (failures.length > 0) {
  console.error("JPL secondary bodies R19 guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("JPL secondary bodies R19 guard passed.");
console.log("- Chiron/Juno/Eris/Pholus/Nessus independently reference-validated before promotion");
console.log("- production runtime remains JPL/SPICE; Swiss Ephemeris is QA-only");
console.log("- geocentric apparent J2000 state converted to true ecliptic of date");
console.log("- motion sampled at +/-12 hours and houses reuse canonical Placidus normalization");
console.log("- missing kernels fail closed with no invented longitude");
