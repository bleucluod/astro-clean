import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFixtureRows, buildNodeEventRows, fixtures, nodeSearchStarts } from "./probe-true-node-vector-feasibility.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:complete-local-true-node-hardening"] === "node scripts/check-complete-local-true-node-hardening.mjs",
  "package.json missing check:complete-local-true-node-hardening script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:complete-local-true-node-hardening"),
    `${scriptName} does not include check:complete-local-true-node-hardening`,
  );
}

assert(fixtures.length >= 12, "complete Node hardening requires at least twelve date fixtures");
assert(nodeSearchStarts.length >= 6, "complete Node hardening requires at least six node-event sanity starts");
assert(buildFixtureRows().length >= 12, "complete Node hardening fixture rows did not build");
assert(buildNodeEventRows().length >= 6, "complete Node hardening node-event rows did not build");

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine", engine, [
  "calculateLocalTrueLunarNodes",
  "calculateMeanLunarNodes",
  "LOCAL_TRUE_NODE_CANDIDATE_METHOD",
  'nodeType: "local-true-osculating"',
]);
assertNotIncludes("real chart engine", engine, [
  'nodeType: "true"',
  "swisseph",
  "SE_TRUE_NODE",
]);

const adapter = read("src/lib/chart/local-true-node-candidate.ts");
assertIncludes("local True Node adapter", adapter, [
  'LOCAL_TRUE_NODE_CANDIDATE_STATUS = "production-local-true-node"',
  'LOCAL_TRUE_NODE_CANDIDATE_APPROVAL = "approved-local-engine-output"',
  "GeoMoonState",
  "Rotation_EQJ_ECT",
  "calculateLocalTrueNodeCandidate",
  "calculateLocalTrueNodeSouthLongitude",
]);
assertNotIncludes("local True Node adapter", adapter, [
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "SE_TRUE_NODE",
]);

const reportCard = read("components/ReportCard.tsx");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const service = read("lib/report-generation/report-generation-service.ts");
assertIncludes("ReportCard", reportCard, [
  'lunarNodes.nodeType === "local-true-osculating"',
  "local-true-osculating",
]);
assertIncludes("report writer", writer, [
  'lunarNodes.nodeType === "local-true-osculating"',
  "isCalculatedLunarNodes",
]);
assertIncludes("report generation service", service, [
  "nodeType: nodes.nodeType,",
]);
const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));
for (const [index, doc] of docs.entries()) {
  assertIncludes(`Node completion doc ${index + 1}`, doc, [
    "v0.1.234 complete local True Node hardening",
    "production lunar-node output is local True/Osculating",
    "Mean Lunar Node remains fallback/helper only",
    "Lilith remains deferred",
    "transit remains out of scope",
  ]);
}

if (failures.length > 0) {
  console.error("Complete local True Node hardening check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Complete local True Node hardening check passed.");
