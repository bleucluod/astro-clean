import fs from "node:fs";

const failures = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function requireIncludes(path, markers) {
  const text = read(path);
  for (const marker of markers) {
    if (!text.includes(marker)) {
      failures.push(path + " is missing marker: " + marker);
    }
  }
}

requireIncludes("docs/HALLEUS_ENGINE_REALITY_AUDIT.md", [
  "## v0.1.165 true vs mean node probe",
  "SearchMoonNode",
  "Mean Lunar Node is not fake",
  "True/Osculating Node remains deferred",
  "mean-lunar-node-j2000-meeus-formula",
  "South Node = normalize(North Node + 180)",
]);

requireIncludes("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", [
  "## v0.1.165 true vs mean node implementation path",
  "calculateMeanNorthNodeLongitude(date)",
  "calculationQuality.nodesStatus",
  "Lilith remains deferred",
]);

requireIncludes("docs/HALLEUS_IDEA_GARDEN.md", [
  "## v0.1.165 product decision: Mean Lunar Node first",
  "Mean North Node / Mean South Node",
  "Do not market Halleus as supporting True Node",
]);

const packageJson = JSON.parse(read("package.json"));
if (packageJson.scripts?.["check:true-mean-node-probe"] !== "node scripts/check-true-mean-node-probe.mjs") {
  failures.push("package.json is missing check:true-mean-node-probe script");
}

const runtimeDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.optionalDependencies ?? {}),
};
for (const forbidden of ["swisseph", "sweph", "swiss-ephemeris"]) {
  if (Object.prototype.hasOwnProperty.call(runtimeDeps, forbidden)) {
    failures.push("Forbidden runtime ephemeris dependency added in probe batch: " + forbidden);
  }
}

requireIncludes("lib/report-generation/report-generation-service.ts", [
  "nodesStatus: \"not-calculated\"",
  "lunarNodes: buildDeferredCalculation",
]);

requireIncludes("src/lib/chart/real-chart-engine.ts", [
  "Lunar nodes and Black Moon Lilith are still deferred",
]);

if (failures.length > 0) {
  console.error("True vs Mean Node probe check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("True vs Mean Node probe check passed.");