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
  packageJson.scripts?.["check:lilith-report-data-bridge"] === "node scripts/check-lilith-report-data-bridge.mjs",
  "package.json missing check:lilith-report-data-bridge script",
);
for (const scriptName of ["check:reports", "check:project"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-report-data-bridge"),
    `${scriptName} does not include check:lilith-report-data-bridge`,
  );
}

for (const depName of ["swisseph", "pyswisseph", "sweph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, depName) &&
      !Object.prototype.hasOwnProperty.call(packageJson.optionalDependencies ?? {}, depName),
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const types = read("types/astro.ts");
assertIncludes("types/astro.ts calculated Lilith report data", types, [
  "RealEngineReportCalculatedLilith",
  "RealEngineReportLilith",
  'label: "Local True/Osculating Black Moon Lilith"',
  'modelId: "true-osculating-black-moon-lilith"',
  'lilithType: "local-true-osculating-black-moon-lilith"',
  'source: "astronomy-engine-geomoonstate-local-state-vector"',
  "approvedForReportOutput: false",
  "lilith?: RealEngineReportLilith",
]);

const service = read("lib/report-generation/report-generation-service.ts");
assertIncludes("report generation service Lilith data bridge", service, [
  "RealEngineReportCalculatedLilith",
  "type RealChartCalculatedLilith",
  "lilith: buildCalculatedLilith(realChart)",
  'lilithStatus: realChart.lilith?.status === "calculated" ? "calculated" : "not-calculated"',
  "function buildCalculatedLilith(",
  "function toRealEngineReportLilith(",
  "const lilith = realChart.lilith",
  "approvedForReportOutput: lilith.approvedForReportOutput",
  "getHouseNumberForLongitude(lilith.longitude, realChart)",
  "لیلیت نوسانی/واقعی محلی در داده گزارش ذخیره می‌شود، اما تا مرحله جداگانه UI/narrative وارد خوانش کاربر نمی‌شود.",
]);
assertNotIncludes("report generation service forbidden Lilith shortcuts", service, [
  "calculateMeanLilith",
  "calculateTrueLilith",
  "approvedForReportOutput: true",
  "production-lilith",
  "Lilith is now available",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine remains guarded source", engine, [
  "calculateRealChartLilith",
  "Local True/Osculating Black Moon Lilith",
  "approvedForReportOutput: false",
  "report/UI output remains disabled",
]);

const reportCard = read("components/ReportCard.tsx");
assertIncludes("ReportCard limited Lilith UI sync", reportCard, [
  "buildLilithRow(report)",
  "لیلیت نوسانی/واقعی محلی",
  "نمایش محدود داده؛ روایت تفسیری در مرحله جداگانه فعال می‌شود",
  "این نقطه لیلیت میانگین، سیارک ۱۱۸۱ یا دارک‌مون/والدماث نیست.",
  "محاسبه محلی از بردار مکان و سرعت ماه؛ بدون API، بدون اجرای Swiss و بدون وابستگی تازه",
]);
assertNotIncludes("ReportCard forbidden Lilith overclaims", reportCard, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "production-lilith",
  "calculateRealChartLilith",
  "calculateLocalOsculatingBlackMoonLilith",
]);

const writer = read("lib/astrology/real-engine-report-writer.ts");
assertNotIncludes("report writer must not add Lilith narrative yet", writer, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "production-lilith",
  "calculateRealChartLilith",
]);

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith report data bridge docs ${index + 1}`, doc, [
    "v0.1.242 Lilith report data bridge",
    "RealEngineReportCalculatedLilith",
    "lilith: buildCalculatedLilith(realChart)",
    "lilithStatus is now calculated in report data",
    "ReportCard and report narrative remain deferred",
    "No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.",
  ]);
  assertIncludes(`Lilith report UI sync docs ${index + 1}`, doc, [
    "v0.1.243 Lilith report/UI sync",
    "ReportCard now shows a limited technical Lilith card",
    "The report writer narrative remains gated for a separate milestone",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith report data bridge check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith report data bridge check passed.");
