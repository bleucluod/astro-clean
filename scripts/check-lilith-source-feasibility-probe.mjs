import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(text.includes(marker), `${label} missing marker: ${marker}`);
  }
}

function assertNotIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(!text.includes(marker), `${label} must not include marker: ${marker}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:lilith-source-feasibility-probe"] === "node scripts/check-lilith-source-feasibility-probe.mjs",
  "package.json missing check:lilith-source-feasibility-probe script",
);
assert(
  packageJson.scripts?.["check:lilith-self-built-osculating-decision"] ===
    "node scripts/check-lilith-self-built-osculating-decision.mjs",
  "package.json missing check:lilith-self-built-osculating-decision script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-source-feasibility-probe"),
    `${scriptName} does not include check:lilith-source-feasibility-probe`,
  );
}

assert(
  packageJson.dependencies?.["astronomy-engine"] === "2.1.19",
  "Lilith source feasibility probe expects astronomy-engine 2.1.19 as the current runtime source",
);
for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const probePath = "src/lib/chart/lilith-source-feasibility-probe.ts";
assert(exists(probePath), "Lilith source feasibility probe file is missing");
const probe = read(probePath);
assertIncludes("Lilith source feasibility probe", probe, [
  'LILITH_SOURCE_FEASIBILITY_VERSION = "v0.1.236"',
  'LILITH_SOURCE_FEASIBILITY_STATUS = "no-approved-production-source"',
  'LILITH_SOURCE_FEASIBILITY_SCOPE = "local-runtime-source-feasibility-probe-only"',
  'LILITH_SOURCE_FEASIBILITY_RUNTIME = "astronomy-engine@2.1.19"',
  "LILITH_SOURCE_FEASIBILITY_APPROVED_FOR_OUTPUT = false",
  "SearchLunarApsis",
  "NextLunarApsis",
  "event-time helpers, not natal Black Moon Lilith longitude sources",
  "Do not approximate Black Moon Lilith from lunar apsis events",
  "select True/Osculating Black Moon Lilith as the first self-built probe model",
  "derive a local osculating lunar apogee longitude from Moon position and velocity state vectors",
  "The preferred next path is self-built True/Osculating Black Moon Lilith from Moon state vectors, not a new runtime dependency.",
  "assertLilithSourceFeasibilityIsSafe",
]);
assertNotIncludes("Lilith source feasibility probe", probe, [
  "calculateMeanLilith",
  "calculateTrueLilith",
  "buildCalculatedLilith",
  "production-lilith",
  "local-lilith-production",
  "fetch(",
  "http://",
  "https://",
  "swisseph",
]);

const decisionContract = read("src/lib/chart/lilith-model-decision-contract.ts");
assertIncludes("Lilith model decision contract remains deferred", decisionContract, [
  'LILITH_MODEL_DECISION_STATUS = "deferred-source-decision"',
  'LILITH_PRODUCTION_OUTPUT_STATUS = "not-calculated"',
  '"mean-black-moon-lilith"',
  '"true-osculating-black-moon-lilith"',
  '"dark-moon-lilith-waldemath"',
]);

const lock = exists("pnpm-lock.yaml") ? read("pnpm-lock.yaml") : "";
assertIncludes("pnpm lock current astronomy-engine source", lock, [
  "astronomy-engine:",
  "version: 2.1.19",
]);

const astronomyDtsPath = "node_modules/astronomy-engine/astronomy.d.ts";
if (exists(astronomyDtsPath)) {
  const dts = read(astronomyDtsPath);
  assertIncludes("astronomy-engine declarations for research-only apsis helpers", dts, [
    "SearchLunarApsis",
    "NextLunarApsis",
  ]);
  assertNotIncludes("astronomy-engine declarations direct Lilith API", dts, [
    "BlackMoonLilith",
    "MeanLilith",
    "TrueLilith",
    "OsculatingLilith",
  ]);
}

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine Lilith defer gate", engine, [
  "Black Moon Lilith is still deferred",
  "Mean/True Lilith definition",
]);
assertNotIncludes("real chart engine", engine, [
  "calculateMeanLilith",
  "calculateTrueLilith",
  "buildCalculatedLilith",
  'lilith.status === "calculated"',
]);

const service = exists("lib/report-generation/report-generation-service.ts")
  ? read("lib/report-generation/report-generation-service.ts")
  : "";
assertIncludes("report generation service Lilith defer gate", service, [
  '"black-moon-lilith"',
  'lilithStatus: "not-calculated"',
]);
assertNotIncludes("report generation service", service, [
  "buildCalculatedLilith",
  'lilith.status === "calculated"',
]);

for (const relativePath of [
  "components/ReportCard.tsx",
  "components/RealChartWheel.tsx",
  "lib/astrology/real-engine-report-writer.ts",
]) {
  if (!exists(relativePath)) continue;
  const text = read(relativePath);
  assertNotIncludes(`${relativePath} Lilith production claims`, text, [
    "Mean Black Moon Lilith",
    "True Black Moon Lilith",
    "Lilith is now available",
    "production-lilith",
    "local-lilith-production",
  ]);
}

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith source feasibility doc ${index + 1}`, doc, [
    "v0.1.236 Lilith source feasibility probe",
    "Current local runtime source is astronomy-engine@2.1.19",
    "No approved production Black Moon Lilith longitude source exists yet",
    "SearchLunarApsis and NextLunarApsis are event-time helpers, not natal Black Moon Lilith longitude sources",
    "Black Moon Lilith remains deferred and not-calculated",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith source feasibility probe check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith source feasibility probe check passed.");
