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
  "نمایش محدود داده؛ روایت تفسیری این گزارش فعال نیست",
  "این نقطه لیلیت میانگین، سیارک ۱۱۸۱ یا دارک‌مون/والدماث نیست.",
  "محاسبه محلی از بردار مکان و سرعت ماه؛ بدون API، بدون اجرای Swiss و بدون وابستگی تازه",
]);
assertNotIncludes("ReportCard forbidden Lilith overclaim", reportCard, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "production-lilith",
  "لیلیت سرنوشت قطعی",
  "کشش جنسی پنهان",
  "زخم تاریک",
]);

const service = read("lib/report-generation/report-generation-service.ts");
assertIncludes("report data remains the Lilith source", service, [
  "lilith: buildCalculatedLilith(realChart)",
  "approvedForReportOutput: lilith.approvedForReportOutput",
  "جایگاه لیلیت نوسانی/واقعی محلی در داده و بخش فنی گزارش ذخیره می‌شود، اما تا وقتی مجوز خروجی فعال نیست وارد روایت تفسیری نمی‌شود.",
]);

const writer = read("lib/astrology/real-engine-report-writer.ts");
assertIncludes("report writer gated Lilith copy remains", writer, [
  "جایگاه لیلیت در بخش فنی ثبت شده است، اما مجوز ورود به روایت تفسیری این گزارش فعال نیست.",
  "realEngine.lilith.approvedForReportOutput",
]);
assertNotIncludes("report writer forbidden Lilith narrative overclaims", writer, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "لیلیت سرنوشت قطعی",
  "کشش جنسی پنهان",
  "زخم تاریک",
]);

const specialPoints = read("components/ReportSpecialPointsNarrativeSection.tsx");
assertIncludes("live Lilith boundary", specialPoints, [
  "buildLilithNarrativeCard",
  "lilith.approvedForReportOutput !== true",
  "buildLilithBoundaryCard",
  "جایگاه محاسبه‌شده؛ روایت غیرفعال",
  "این نقطه در جمع‌بندی شخصیت، رابطه، مسیر رشد یا تمرین‌های گزارش استفاده نمی‌شود.",
]);

const engine = read("src/lib/chart/real-chart-engine.ts");
assertIncludes("real chart engine remains guarded Lilith source", engine, [
  "calculateRealChartLilith",
  "Local True/Osculating Black Moon Lilith",
  "approvedForReportOutput: false",
]);

if (failures.length > 0) {
  console.error("Lilith report/UI sync check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith report/UI sync check passed.");
