import { readFileSync } from "node:fs";

const failures = [];
const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const jalaliSource = readFileSync("lib/date/jalali.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  'import { parseJalaliDateInput } from "@/lib/date/jalali";',
  "JALALI_YEAR_OPTIONS",
  "JALALI_MONTH_OPTIONS",
  "JALALI_DAY_OPTIONS",
  "birthDateParts",
  "getSelectedJalaliDateInput(birthDateParts)",
  "parseJalaliDateInput(selectedJalaliBirthDate)",
  "birthDate: parsedBirthDate.gregorianIso",
  "تاریخ تولد شمسی را با انتخاب سال، ماه و روز",
  "aria-label=\"سال تولد شمسی\"",
  "aria-label=\"ماه تولد شمسی\"",
  "aria-label=\"روز تولد شمسی\"",
  "<select",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm missing Jalali date picker marker: ${marker}`);
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

for (const forbiddenMarker of [
  'type="date"',
  "max={todayIsoDate}",
  "const todayIsoDate",
  "birthDateInput",
  'placeholder="۱۳۷۸/۰۵/۲۱"',
  'inputMode="numeric"',
  "<span>کشور</span>",
  'autoComplete="country-name"',
  'value={form.birthCountry}',
  'updateField("birthCountry"',
]) {
  if (chartFormSource.includes(forbiddenMarker)) {
    failures.push(`ChartForm still has removed date/country UI marker: ${forbiddenMarker}`);
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
  console.error("Jalali birth date picker and country cleanup check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Jalali birth date picker and country cleanup check passed.");