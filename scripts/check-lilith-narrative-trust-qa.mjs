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

const types = read("types/astro.ts");
const reportCard = read("components/ReportCard.tsx");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const service = read("lib/report-generation/report-generation-service.ts");
const specialPoints = read("components/ReportSpecialPointsNarrativeSection.tsx");

assertIncludes("Lilith type gate", types, [
  'lilithType: "local-true-osculating-black-moon-lilith"',
  "approvedForReportOutput: false",
]);
assertIncludes("ReportCard Lilith trust copy", reportCard, [
  "لیلیت نوسانی/واقعی محلی",
  "نمایش محدود داده؛ روایت تفسیری این گزارش فعال نیست",
  "این نقطه لیلیت میانگین، سیارک ۱۱۸۱ یا دارک‌مون/والدماث نیست.",
]);
assertIncludes("report service Lilith data remains bounded", service, [
  "lilith: buildCalculatedLilith(realChart)",
  "approvedForReportOutput: lilith.approvedForReportOutput",
  "تا وقتی مجوز خروجی فعال نیست وارد روایت تفسیری نمی‌شود",
]);
assertIncludes("report writer Lilith narrative remains gated", writer, [
  "جایگاه لیلیت در بخش فنی ثبت شده است، اما مجوز ورود به روایت تفسیری این گزارش فعال نیست.",
]);
assertIncludes("live special-points boundary remains gated", specialPoints, [
  "lilith.approvedForReportOutput !== true",
  "جایگاه محاسبه‌شده؛ روایت غیرفعال",
  "به‌تنهایی به معنی تأیید تفسیر آن نیست.",
]);

for (const [label, text] of [
  ["ReportCard", reportCard],
  ["writer", writer],
  ["special points", specialPoints],
]) {
  assertNotIncludes(`${label} forbidden Lilith overclaims`, text, [
    "لیلیت سرنوشت قطعی",
    "لیلیت تاریک تو",
    "کشش جنسی پنهان",
    "زخم تاریک",
    "سایه قطعی",
  ]);
}

if (failures.length > 0) {
  console.error("Lilith narrative/trust QA check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lilith narrative/trust QA check passed.");
