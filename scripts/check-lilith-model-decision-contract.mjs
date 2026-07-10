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
  packageJson.scripts?.["check:lilith-model-decision-contract"] === "node scripts/check-lilith-model-decision-contract.mjs",
  "package.json missing check:lilith-model-decision-contract script",
);
assert(
  packageJson.scripts?.["check:lilith-self-built-osculating-decision"] ===
    "node scripts/check-lilith-self-built-osculating-decision.mjs",
  "package.json missing check:lilith-self-built-osculating-decision script",
);
for (const scriptName of ["check:engine", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-model-decision-contract"),
    `${scriptName} does not include check:lilith-model-decision-contract`,
  );
}

for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const contractPath = "src/lib/chart/lilith-model-decision-contract.ts";
assert(exists(contractPath), "Lilith model decision contract file is missing");
const contract = read(contractPath);
assertIncludes("Lilith model decision contract", contract, [
  'LILITH_MODEL_DECISION_CONTRACT_VERSION = "v0.1.235"',
  'LILITH_MODEL_DECISION_STATUS = "deferred-source-decision"',
  'LILITH_MODEL_DECISION_SCOPE = "black-moon-lilith-only"',
  'LILITH_PRODUCTION_OUTPUT_STATUS = "not-calculated"',
  'LILITH_RUNTIME_SOURCE_POLICY = "no-new-runtime-ephemeris-dependency"',
  '"mean-black-moon-lilith"',
  '"true-osculating-black-moon-lilith"',
  '"dark-moon-lilith-waldemath"',
  "Mean Black Moon Lilith and True/Osculating Black Moon Lilith are candidate models only.",
  "No Lilith production output, UI claim, report claim, or transit use is approved by this contract.",
  'LILITH_PREFERRED_NEXT_MODEL_ID = "true-osculating-black-moon-lilith"',
  'LILITH_PREFERRED_NEXT_PATH = "self-built-local-osculating-probe-from-moon-state-vector"',
  'LILITH_EXTERNAL_API_POLICY = "forbidden"',
  "The preferred next path is a self-built local True/Osculating Black Moon Lilith probe from Moon state vectors.",
  "assertLilithModelDecisionContractIsSafe",
]);
assertNotIncludes("Lilith model decision contract", contract, [
  "calculateMeanLilith",
  "calculateTrueLilith",
  "buildCalculatedLilith",
  'productionOutputAllowed: true',
  "fetch(",
  "http://",
  "https://",
  "swisseph",
  "SE_TRUE_NODE",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine guarded Lilith output gate", engine, [
  "calculateRealChartLilith",
  "Local True/Osculating Black Moon Lilith",
  "approvedForReportOutput: false",
]);
assertNotIncludes("real chart engine", engine, [
  "calculateMeanLilith",
  "calculateTrueLilith",
  "buildCalculatedLilith",
  'lilith.status === "calculated"',
]);

const service = read("lib/report-generation/report-generation-service.ts");
assertIncludes("report generation service Lilith data bridge gate", service, [
  "lilith: buildCalculatedLilith(realChart)",
  'lilithStatus: realChart.lilith?.status === "calculated" ? "calculated" : "not-calculated"',
  "approvedForReportOutput: lilith.approvedForReportOutput",
  "جایگاه لیلیت نوسانی/واقعی محلی در داده و بخش فنی گزارش ذخیره می‌شود، اما تا وقتی مجوز خروجی فعال نیست وارد روایت تفسیری نمی‌شود.",
]);
assertNotIncludes("report generation service", service, [
  "approvedForReportOutput: true",
  "production-lilith",
]);

const reportCard = read("components/ReportCard.tsx");
assertIncludes("ReportCard deferred Lilith handling", reportCard, [
  "lilithLabel: formatDeferredPointStatus",
  "Black Moon Lilith is not calculated",
]);
assertNotIncludes("ReportCard Lilith claims", reportCard, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
]);

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith decision doc ${index + 1}`, doc, [
    "v0.1.235 Lilith model decision contract",
    "Black Moon Lilith remains deferred and not-calculated",
    "Mean Black Moon Lilith and True/Osculating Black Moon Lilith are candidate models only",
    "Dark Moon/Waldemath Lilith is out of scope",
    "No Lilith transit or report/UI claim is approved",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith model decision contract check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith model decision contract check passed.");
