import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
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
  "دست‌های ماه با مدل نوسانی/واقعی محلی",
  "lunarNodes.nodeType === \"local-true-osculating\"",
  "(lunarNodes.nodeType === \"mean\" || lunarNodes.nodeType === \"local-true-osculating\")",
]);
assertNotIncludes("ReportCard lunar node copy", reportCard, [
  "<h4>دست‌های ماه با مدل میانگین</h4>",
  "دست‌های ماه در این نسخه با مدل میانگین محاسبه می‌شوند؛ مدل نوسانی/واقعی فعلاً وارد خوانش نشده است.",
  "lunarNodes.nodeType === \"mean\",",
]);

const reportService = read("lib/report-generation/report-generation-service.ts");
assertIncludes("report generation service node copy", reportService, [
  "دست‌های ماه در این نسخه با مدل نوسانی/واقعی محلی محاسبه می‌شوند؛ منبع خارجی یا Swiss runtime استفاده نشده است.",
]);
assertNotIncludes("report generation service node copy", reportService, [
  "دست‌های ماه در این نسخه با مدل میانگین محاسبه می‌شوند؛ مدل نوسانی/واقعی فعلاً وارد خوانش نشده است.",
]);

const writer = read("lib/astrology/real-engine-report-writer.ts");
assertIncludes("real engine report writer node copy", writer, [
  "دست‌های ماه با مدل نوسانی/واقعی محلی",
  "دست‌های ماه در این گزارش با مدل نوسانی/واقعی محلی خوانده می‌شوند.",
  "با مدل نوسانی/واقعی محلی محاسبه شده است.",
  "(lunarNodes.nodeType === \"mean\" || lunarNodes.nodeType === \"local-true-osculating\")",
]);
assertNotIncludes("real engine report writer node copy", writer, [
  "دست‌های ماه با مدل میانگین از دست جنوبی",
  "دست‌های ماه جداگانه با مدل Mean Node آمده‌اند",
  "دست‌های ماه در این گزارش با مدل میانگین خوانده می‌شوند.",
  "چون Mean Node نزدیک مرز",
  "با مدل True/Osculating Node ممکن است",
  "دست‌های ماه با مدل میانگین در داده محاسبه‌شده ثبت شده‌اند.",
  "lunarNodes.nodeType === \"mean\" &&",
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
