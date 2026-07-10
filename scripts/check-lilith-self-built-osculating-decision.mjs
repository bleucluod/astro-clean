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
  packageJson.scripts?.["check:lilith-self-built-osculating-decision"] ===
    "node scripts/check-lilith-self-built-osculating-decision.mjs",
  "package.json missing check:lilith-self-built-osculating-decision script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-self-built-osculating-decision"),
    `${scriptName} does not include check:lilith-self-built-osculating-decision`,
  );
}

for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const decisionPath = "src/lib/chart/lilith-self-built-osculating-decision.ts";
assert(exists(decisionPath), "Lilith self-built osculating decision file is missing");
const decision = read(decisionPath);
assertIncludes("Lilith self-built osculating decision", decision, [
  'LILITH_SELF_BUILT_OSCULATING_DECISION_VERSION = "v0.1.237"',
  'LILITH_SELF_BUILT_OSCULATING_DECISION_STATUS = "preferred-probe-path-approved"',
  'LILITH_SELF_BUILT_OSCULATING_DECISION_SCOPE = "self-built-true-osculating-black-moon-lilith-probe-only"',
  'LILITH_SELF_BUILT_OSCULATING_MODEL_ID = "true-osculating-black-moon-lilith"',
  'LILITH_SELF_BUILT_OSCULATING_API_POLICY = "no-external-api"',
  'LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY = "no-new-lilith-runtime-dependency"',
  "LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED = false",
  "geocentric Moon position state vector",
  "geocentric Moon velocity state vector",
  "derive the osculating lunar orbit from the same instant Moon position and velocity vectors",
  "derive the apogee direction as the exact opposite of the periapsis direction",
  "convert the apogee direction into normalized geocentric ecliptic longitude",
  "SearchLunarApsis-as-natal-longitude",
  "NextLunarApsis-as-natal-longitude",
  "mean-lilith-without-public-permissive-formula",
  "assertLilithSelfBuiltOsculatingDecisionIsSafe",
]);
assertNotIncludes("Lilith self-built osculating decision", decision, [
  "calculateOsculatingLilith",
  "calculateTrueLilith",
  "calculateMeanLilith",
  "buildCalculatedLilith",
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "sweph",
  "SE_MEAN_APOG",
  "SE_OSCU_APOG",
]);

const contract = read("src/lib/chart/lilith-model-decision-contract.ts");
assertIncludes("Lilith model decision contract self-built path", contract, [
  'LILITH_PREFERRED_NEXT_MODEL_ID = "true-osculating-black-moon-lilith"',
  'LILITH_PREFERRED_NEXT_PATH = "self-built-local-osculating-probe-from-moon-state-vector"',
  'LILITH_EXTERNAL_API_POLICY = "forbidden"',
  "The preferred next path is a self-built local True/Osculating Black Moon Lilith probe from Moon state vectors.",
  "Mean Black Moon Lilith remains a later candidate only if a public/permissive formula is selected and validated.",
]);

const feasibility = read("src/lib/chart/lilith-source-feasibility-probe.ts");
assertIncludes("Lilith source feasibility self-built path", feasibility, [
  'LILITH_SOURCE_FEASIBILITY_STATUS = "no-approved-production-source"',
  "select True/Osculating Black Moon Lilith as the first self-built probe model",
  "derive a local osculating lunar apogee longitude from Moon position and velocity state vectors",
  "The preferred next path is self-built True/Osculating Black Moon Lilith from Moon state vectors, not a new runtime dependency.",
  "Mean Black Moon Lilith remains later-only until a public/permissive mean-apogee formula is selected.",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine guarded Lilith output gate", engine, [
  "calculateRealChartLilith",
  "Local True/Osculating Black Moon Lilith",
  "approvedForReportOutput: false",
]);
assertNotIncludes("real chart engine Lilith output", engine, [
  "calculateOsculatingLilith",
  "calculateTrueLilith",
  "calculateMeanLilith",
  "buildCalculatedLilith",
  'lilith.status === "calculated"',
  "production-lilith",
]);

const service = exists("lib/report-generation/report-generation-service.ts")
  ? read("lib/report-generation/report-generation-service.ts")
  : "";
if (service.length > 0) {
  assertIncludes("report generation service guarded Lilith data bridge", service, [
    "lilith: buildCalculatedLilith(realChart)",
    'lilithStatus: realChart.lilith?.status === "calculated" ? "calculated" : "not-calculated"',
    "function buildCalculatedLilith(",
    "approvedForReportOutput: lilith.approvedForReportOutput",
  ]);
  assertNotIncludes("report generation service Lilith report-output approval", service, [
    "approvedForReportOutput: true",
    "production-lilith",
  ]);
}

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
    "Osculating Black Moon Lilith is now available",
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
  assertIncludes(`Lilith self-built decision doc ${index + 1}`, doc, [
    "v0.1.237 self-built osculating Lilith decision",
    "Preferred next model is True/Osculating Black Moon Lilith",
    "No external API and no new Lilith runtime dependency are approved",
    "The next buildable milestone is a probe-only local osculating Lilith calculator from Moon position and velocity state vectors",
    "Mean Black Moon Lilith remains later-only until a public/permissive formula is selected and validated",
    "Black Moon Lilith remains deferred and not-calculated",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith self-built osculating decision check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith self-built osculating decision check passed.");
