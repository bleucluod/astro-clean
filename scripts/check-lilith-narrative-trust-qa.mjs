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
  packageJson.scripts?.["check:lilith-narrative-trust-qa"] ===
    "node scripts/check-lilith-narrative-trust-qa.mjs",
  "package.json missing check:lilith-narrative-trust-qa script",
);
for (const scriptName of ["check:project", "check:reports"]) {
  assert(
    packageJson.scripts?.[scriptName]?.includes("pnpm run check:lilith-narrative-trust-qa"),
    `${scriptName} does not include check:lilith-narrative-trust-qa`,
  );
}

for (const depName of ["sweph", "swisseph", "pyswisseph", "swiss-ephemeris", "astrologia"]) {
  assert(
    !packageJson.dependencies?.[depName] &&
      !packageJson.devDependencies?.[depName] &&
      !packageJson.optionalDependencies?.[depName],
    `unapproved Lilith runtime dependency present: ${depName}`,
  );
}

const reportCard = read("components/ReportCard.tsx");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const service = read("lib/report-generation/report-generation-service.ts");
const reportUiGuard = read("scripts/check-lilith-report-ui-sync.mjs");
const narrativeQaGuard = read("scripts/check-report-narrative-qa-guards.mjs");

assertIncludes("ReportCard Lilith trust copy", reportCard, [
  "لیلیت نوسانی/واقعی محلی",
  "نمایش محدود داده؛ روایت تفسیری در مرحله جداگانه فعال می‌شود",
  "این نقطه لیلیت میانگین، سیارک ۱۱۸۱ یا دارک‌مون/والدماث نیست.",
  "محاسبه محلی از بردار مکان و سرعت ماه؛ بدون API، بدون اجرای Swiss و بدون وابستگی تازه",
]);
assertNotIncludes("ReportCard forbidden Lilith trust overclaims", reportCard, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "production-lilith",
  "calculateRealChartLilith",
  "calculateLocalOsculatingBlackMoonLilith",
  "SE_MEAN_APOG",
  "SE_OSCU_APOG",
  "sweph",
  "swisseph",
  "لیلیت سرنوشت قطعی",
  "لیلیت تاریک تو",
  "کشش جنسی پنهان",
  "زخم تاریک",
  "سایه قطعی",
]);

assertIncludes("report writer Lilith narrative remains gated", writer, [
  "لیلیت در داده محاسبه‌شده ثبت شده است و فقط بعد از تعیین مدل خوانش وارد متن می‌شود.",
]);
assertNotIncludes("report writer forbidden Lilith narrative overclaims", writer, [
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "Lilith is now available",
  "production-lilith",
  "calculateRealChartLilith",
  "calculateLocalOsculatingBlackMoonLilith",
  "لیلیت سرنوشت قطعی",
  "لیلیت تاریک تو",
  "کشش جنسی پنهان",
  "زخم تاریک",
  "سایه قطعی",
]);

assertIncludes("report service Lilith data remains bounded", service, [
  "lilith: buildCalculatedLilith(realChart)",
  "approvedForReportOutput: lilith.approvedForReportOutput",
  "لیلیت نوسانی/واقعی محلی در داده گزارش ذخیره می‌شود، اما تا مرحله جداگانه UI/narrative وارد خوانش کاربر نمی‌شود.",
]);
assertNotIncludes("report service forbidden Lilith copy overclaims", service, [
  "Lilith is now available",
  "Mean Black Moon Lilith",
  "True Black Moon Lilith",
  "production-lilith",
  "approvedForReportOutput: true",
]);

assertIncludes("existing Lilith report/UI guard remains the copy boundary", reportUiGuard, [
  "ReportCard forbidden Lilith overclaim",
  "report writer Lilith narrative remains gated",
  "The report writer narrative remains gated for a separate milestone",
]);
assertIncludes("general narrative QA guard remains active", narrativeQaGuard, [
  "blockedOutputFragments",
  "Report writer missing narrative QA marker",
  "ReportCard missing aspect display marker",
]);

const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
].map((file) => read(file));

for (const [index, doc] of docs.entries()) {
  assertIncludes(`Lilith narrative/trust QA docs ${index + 1}`, doc, [
    "v0.1.244 Lilith narrative/trust QA",
    "Lilith report UI remains a limited technical data card",
    "The report writer narrative remains gated",
    "Mean Lilith, asteroid 1181 Lilith, Dark Moon/Waldemath Lilith, API claims, Swiss runtime claims, and fatalistic Lilith copy remain forbidden",
    "No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith narrative/trust QA check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith narrative/trust QA check passed.");
