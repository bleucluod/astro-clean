import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const failures = [];
const requireIncludes = (label, text, markers) => {
  for (const marker of markers) {
    if (!text.includes(marker)) {
      failures.push(label + " missing marker: " + marker);
    }
  }
};

const audit = read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md");
const plan = read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md");
const garden = read("docs/HALLEUS_IDEA_GARDEN.md");
const pkg = JSON.parse(read("package.json"));
const lilithContract = read("src/lib/chart/lilith-model-decision-contract.ts");
const lilithSourceFeasibility = read("src/lib/chart/lilith-source-feasibility-probe.ts");

requireIncludes("engine reality audit", audit, [
  "v0.1.163 special points real source audit",
  "SearchMoonNode / NextMoonNode",
  "SearchLunarApsis / NextLunarApsis",
  "must remain deferred/hidden",
  "Do not fake North Node, South Node, or Lilith",
]);

requireIncludes("engine unification plan", plan, [
  "v0.1.163 special points implementation gate",
  "Select a validated source for natal North Node longitude",
  "Mean Lilith or True Lilith",
]);

requireIncludes("idea garden", garden, [
  "v0.1.163 product guard: real special points only",
  "Show Nodes/Lilith only after the engine has real natal point longitudes",
  "Mean Lilith versus True Lilith",
]);

if (pkg.scripts?.["check:special-points-real-source"] !== "node scripts/check-special-points-real-source.mjs") {
  failures.push("package.json missing check:special-points-real-source script");
}

if (pkg.scripts?.["check:lilith-model-decision-contract"] !== "node scripts/check-lilith-model-decision-contract.mjs") {
  failures.push("package.json missing check:lilith-model-decision-contract script");
}

if (pkg.scripts?.["check:lilith-source-feasibility-probe"] !== "node scripts/check-lilith-source-feasibility-probe.mjs") {
  failures.push("package.json missing check:lilith-source-feasibility-probe script");
}

const astronomyDtsPath = "node_modules/astronomy-engine/astronomy.d.ts";
if (exists(astronomyDtsPath)) {
  const dts = read(astronomyDtsPath);
  const eventMarkers = ["SearchMoonNode", "NextMoonNode", "SearchLunarApsis", "NextLunarApsis"];
  for (const marker of eventMarkers) {
    if (!dts.includes(marker)) {
      failures.push("astronomy-engine declarations missing expected event-search marker: " + marker);
    }
  }
}

for (const depName of ["swisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  if (pkg.dependencies?.[depName] || pkg.optionalDependencies?.[depName]) {
    failures.push("unapproved runtime special-points dependency present: " + depName);
  }
}

requireIncludes("Lilith model decision contract", lilithContract, [
  'LILITH_MODEL_DECISION_STATUS = "deferred-source-decision"',
  'LILITH_MODEL_DECISION_SCOPE = "black-moon-lilith-only"',
  '"mean-black-moon-lilith"',
  '"true-osculating-black-moon-lilith"',
  '"dark-moon-lilith-waldemath"',
  "No Lilith production output, UI claim, report claim, or transit use is approved by this contract.",
]);

requireIncludes("Lilith source feasibility probe", lilithSourceFeasibility, [
  'LILITH_SOURCE_FEASIBILITY_STATUS = "no-approved-production-source"',
  'LILITH_SOURCE_FEASIBILITY_RUNTIME = "astronomy-engine@2.1.19"',
  "SearchLunarApsis",
  "NextLunarApsis",
  "event-time helpers, not natal Black Moon Lilith longitude sources",
]);

if (exists("src/lib/chart/real-chart-engine.ts")) {
  const engine = read("src/lib/chart/real-chart-engine.ts");
  for (const marker of ["SearchMoonNode", "NextMoonNode", "SearchLunarApsis", "NextLunarApsis"]) {
    if (engine.includes(marker)) {
      failures.push("real chart engine must not derive natal special-point longitudes from event helper: " + marker);
    }
  }
  requireIncludes("real chart engine Lilith gate", engine, [
    "Black Moon Lilith is still deferred",
    "Mean/True Lilith definition",
  ]);
}

const lilithClaimMarkers = [
  "Lilith is now available",
  "buildCalculatedLilith",
  "calculateMeanLilith",
  "calculateTrueLilith",
  "lilith.status === \"calculated\"",
  "lilith?.status === \"calculated\"",
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "local-lilith-production",
  "production-lilith",
];

for (const relativePath of [
  "components/ReportCard.tsx",
  "components/RealChartWheel.tsx",
  "lib/astrology/real-engine-report-writer.ts",
]) {
  if (!exists(relativePath)) continue;
  const text = read(relativePath);
  for (const marker of lilithClaimMarkers) {
    if (text.includes(marker)) {
      failures.push(relativePath + " appears to claim calculated Lilith without an approved source: " + marker);
    }
  }
}

if (exists("components/ReportCard.tsx")) {
  const reportCard = read("components/ReportCard.tsx");
  requireIncludes("ReportCard deferred Lilith handling", reportCard, [
    "lilithLabel: formatDeferredPointStatus",
    "Black Moon Lilith is not calculated",
  ]);
}

if (failures.length > 0) {
  console.error("Special points real source check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Special points real source check passed.");