import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");

function assert(condition, message) {
  if (!condition) failures.push(message);
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
  packageJson.scripts?.["check:lilith-report-ui-sync"] === "node scripts/check-lilith-report-ui-sync.mjs",
  "package.json missing check:lilith-report-ui-sync script",
);
for (const scriptName of ["check:project", "check:reports"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-report-ui-sync"),
    `${scriptName} does not include check:lilith-report-ui-sync`,
  );
}

for (const depName of ["sweph", "swisseph", "pyswisseph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !packageJson.dependencies?.[depName] && !packageJson.devDependencies?.[depName],
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const reportCard = read("components/ReportCard.tsx");
assertIncludes("ReportCard Lilith UI sync", reportCard, [
  "RealEngineReportCalculatedLilith",
  "const lilithRow = buildLilithRow(report)",
  "function buildLilithRow(report: AstrologyReport): LilithSummaryRow | null",
  "function isCalculatedLilith(",
  "لیلیت نوسانی/واقعی محلی",
  "نمایش محدود داده؛ روایت تفسیری در مرحله جداگانه فعال می‌شود",
  "این نقطه لیلیت میانگین، سیارک ۱۱۸۱ یا دارک‌مون/والدماث نیست.",
  "محاسبه محلی از بردار مکان و سرعت ماه؛ بدون API، بدون اجرای Swiss و بدون وابستگی تازه",
]);
assertNotIncludes("ReportCard forbidden Lilith overclaim", reportCard, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "production-lilith",
  "calculateRealChartLilith",
  "calculateLocalOsculatingBlackMoonLilith",
  "sweph",
  "swisseph",
  "SE_MEAN_APOG",
  "SE_OSCU_APOG",
]);

const service = read("lib/report-generation/report-generation-service.ts");
assertIncludes("report data remains the Lilith source", service, [
  "lilith: buildCalculatedLilith(realChart)",
  'lilithStatus: realChart.lilith?.status === "calculated" ? "calculated" : "not-calculated"',
  "approvedForReportOutput: lilith.approvedForReportOutput",
  "لیلیت نوسانی/واقعی محلی در داده گزارش ذخیره می‌شود، اما تا مرحله جداگانه UI/narrative وارد خوانش کاربر نمی‌شود.",
]);
assertNotIncludes("report generation service must not add Lilith copy shortcuts", service, [
  "Lilith is now available",
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "production-lilith",
]);

const writer = read("lib/astrology/real-engine-report-writer.ts");
assertNotIncludes("report writer Lilith narrative remains gated", writer, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "production-lilith",
  "calculateRealChartLilith",
]);
assertIncludes("report writer gated Lilith copy remains", writer, [
  "لیلیت در داده محاسبه‌شده ثبت شده است و فقط بعد از تعیین مدل خوانش وارد متن می‌شود.",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine remains guarded Lilith source", engine, [
  "calculateRealChartLilith",
  "Local True/Osculating Black Moon Lilith",
  "approvedForReportOutput: false",
]);
assertNotIncludes("real chart engine forbidden Lilith shortcuts", engine, [
  "calculateMeanLilith",
  "calculateTrueLilith",
  "production-lilith",
  "SE_MEAN_APOG",
  "SE_OSCU_APOG",
]);

const dataBridgeGuard = read("scripts/check-lilith-report-data-bridge.mjs");
assertIncludes("Lilith report data bridge guard sync", dataBridgeGuard, [
  "ReportCard limited Lilith UI sync",
  "report writer must not add Lilith narrative yet",
  "v0.1.243 Lilith report/UI sync",
]);

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith report/UI sync docs ${index + 1}`, doc, [
    "v0.1.243 Lilith report/UI sync",
    "ReportCard now shows a limited technical Lilith card",
    "The report writer narrative remains gated for a separate milestone",
    "No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith report/UI sync check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith report/UI sync check passed.");
