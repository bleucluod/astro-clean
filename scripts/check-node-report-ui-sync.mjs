import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(text.includes(marker), `${label} is missing marker: ${marker}`);
  }
}

function assertNotIncludes(label, text, markers) {
  for (const marker of markers) {
    assert(!text.includes(marker), `${label} must not include stale marker: ${marker}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["check:node-report-ui-sync"] === "node scripts/check-node-report-ui-sync.mjs",
  "package.json missing check:node-report-ui-sync script",
);
for (const scriptName of ["check:reports", "check:project"]) {
  const value = packageJson.scripts?.[scriptName] ?? "";
  assert(value.includes("pnpm run check:node-report-ui-sync"), `${scriptName} does not run check:node-report-ui-sync`);
}

const reportCard = read("components/ReportCard.tsx");
assertIncludes("ReportCard lunar node copy", reportCard, [
  "getLunarNodeSectionTitle",
  "دست‌های ماه با مدل نوسانی/واقعی محلی",
  "دست‌های ماه با مدل میانگین",
  "lunarNodes.nodeType === \"local-true-osculating\"",
  "lunarNodes.nodeType === \"mean\"",
  "(lunarNodes.nodeType === \"mean\" || lunarNodes.nodeType === \"local-true-osculating\")",
]);
assertNotIncludes("ReportCard lunar node copy", reportCard, [
  "روح به سمت آن کشیده می‌شود",
  "سرنوشت قطعی",
]);

const writer = read("lib/astrology/real-engine-report-writer.ts");
assertIncludes("real engine report writer node copy", writer, [
  "getLunarNodeModelLabel",
  "مدل میانگین",
  "مدل نوسانی/واقعی محلی",
  "دست جنوبی",
  "دست شمالی",
  "این محور حکم قطعی درباره گذشته یا آینده نیست",
  "(lunarNodes.nodeType === \"mean\" || lunarNodes.nodeType === \"local-true-osculating\")",
]);
assertNotIncludes("real engine report writer node copy", writer, [
  'lunarNodes.northNode.signId === "libra"',
  'lunarNodes.northNode.signId === "leo"',
  "روح به سمت آن کشیده می‌شود",
  "سرنوشت قطعی",
]);

const specialPoints = read("components/ReportSpecialPointsNarrativeSection.tsx");
assertIncludes("special-points model-aware node copy", specialPoints, [
  "formatNodeSource",
  'nodeType === "local-true-osculating"',
  'nodeType === "mean"',
  "دست‌های ماه با مدل نوسانی/واقعی محلی",
  "دست‌های ماه با مدل میانگین",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("engine local node output remains active", engine, [
  "calculateLocalTrueLunarNodes",
  "nodeType: \"local-true-osculating\"",
  "LOCAL_TRUE_NODE_CANDIDATE_METHOD",
]);

if (failures.length > 0) {
  console.error("Node report/UI sync check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Node report/UI sync check passed.");
