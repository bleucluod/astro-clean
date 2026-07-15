import { readFileSync } from "node:fs";

const failures = [];

const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const jalaliSource = readFileSync("lib/date/jalali.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const checkProject = packageJson.scripts?.["check:project"] ?? "";

const requiredChartMarkers = [
  'import { parseJalaliDateInput } from "@/lib/date/jalali";',
  "JALALI_YEAR_OPTIONS",
  "JALALI_MONTH_OPTIONS",
  "JALALI_DAY_OPTIONS",
  "birthDateParts",
  "gregorianBirthDateParts",
  "GREGORIAN_YEAR_OPTIONS",
  "GREGORIAN_MONTH_OPTIONS",
  "getSelectedGregorianDateInput(",
  "getSelectedJalaliDateInput(birthDateParts)",
  "parseJalaliDateInput(selectedJalaliBirthDate)",
  "normalizedBirthDate = parsedBirthDate.gregorianIso",
  "normalizedBirthDate = selectedGregorianBirthDate",
  "birthDate: normalizedBirthDate",
  'dateMode === "jalali"',
  'updateDateMode("gregorian")',
  'aria-label="سال تولد شمسی"',
  'aria-label="ماه تولد شمسی"',
  'aria-label="روز تولد شمسی"',
  'aria-label="انتخاب تاریخ تولد میلادی"',
  'aria-label="سال تولد میلادی"',
  'aria-label="ماه تولد میلادی"',
  'aria-label="روز تولد میلادی"',
  "<select",
];

for (const marker of requiredChartMarkers) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm missing birth-date behavior marker: ${marker}`);
  }
}

for (const marker of [
  "normalizePersianDigits",
  "parseJalaliDateInput",
  "jalaliToDayNumber",
  "dayNumberToGregorian",
  "normalizedJalali",
  "gregorianIso",
]) {
  if (!jalaliSource.includes(marker)) {
    failures.push(`Jalali helper missing marker: ${marker}`);
  }
}

for (const marker of [
  'birthCountry: "ایران"',
  "birthCountry: initialForm.birthCountry",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm must keep internal Iran birthCountry marker: ${marker}`);
  }
}

const jalaliNormalizationPattern =
  /if\s*\(\s*dateMode\s*===\s*"jalali"\s*\)[\s\S]*?parseJalaliDateInput\(selectedJalaliBirthDate\)[\s\S]*?normalizedBirthDate\s*=\s*parsedBirthDate\.gregorianIso/;

if (!jalaliNormalizationPattern.test(chartFormSource)) {
  failures.push(
    "ChartForm must convert the selected Jalali date to normalizedBirthDate.",
  );
}

const gregorianNormalizationPattern =
  /else\s*\{[\s\S]*?selectedGregorianBirthDate[\s\S]*?normalizedBirthDate\s*=\s*selectedGregorianBirthDate/;

if (!gregorianNormalizationPattern.test(chartFormSource)) {
  failures.push(
    "ChartForm must preserve the explicit Gregorian-date mode.",
  );
}

const normalizedFormPattern =
  /const\s+normalizedForm\s*:\s*BirthInput\s*=\s*\{[\s\S]*?birthDate\s*:\s*normalizedBirthDate/;

if (!normalizedFormPattern.test(chartFormSource)) {
  failures.push(
    "ChartForm must pass normalizedBirthDate into normalizedForm.birthDate.",
  );
}

const gregorianInputPattern =
  /dateMode\s*===\s*"jalali"\s*\?\s*\([\s\S]*?:\s*\([\s\S]*?aria-label="انتخاب تاریخ تولد میلادی"[\s\S]*?aria-label="سال تولد میلادی"[\s\S]*?aria-label="ماه تولد میلادی"[\s\S]*?aria-label="روز تولد میلادی"/;

if (!gregorianInputPattern.test(chartFormSource)) {
  failures.push(
    "ChartForm must render three select controls in the Gregorian branch.",
  );
}

const birthControlSelectCount = chartFormSource.match(/<select/g)?.length ?? 0;

if (birthControlSelectCount < 8) {
  failures.push(
    `ChartForm expected Jalali, Gregorian, and 24-hour select controls; found ${birthControlSelectCount}.`,
  );
}

for (const forbiddenMarker of [
  "max={todayIsoDate}",
  "const todayIsoDate",
  "birthDateInput",
  'type="date"',
  'placeholder="۱۳۷۸/۰۵/۲۱"',
  'inputMode="numeric"',
  "<span>کشور</span>",
  'autoComplete="country-name"',
  'value={form.birthCountry}',
  'updateField("birthCountry"',
]) {
  if (chartFormSource.includes(forbiddenMarker)) {
    failures.push(
      `ChartForm still has removed free-text date/country UI marker: ${forbiddenMarker}`,
    );
  }
}

if (
  packageJson.scripts?.["check:jalali-birth-date-input"] !==
  "node scripts/check-jalali-birth-date-input.mjs"
) {
  failures.push("Missing package script: check:jalali-birth-date-input");
}

if (!checkProject.includes("pnpm run check:jalali-birth-date-input")) {
  failures.push("check:project does not run check:jalali-birth-date-input");
}

if (failures.length > 0) {
  console.error("Jalali birth date behavior check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Jalali birth date behavior check passed.");
