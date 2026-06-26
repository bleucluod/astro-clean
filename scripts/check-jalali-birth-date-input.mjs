import { readFileSync } from "node:fs";

const failures = [];
const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const jalaliSource = readFileSync("lib/date/jalali.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  'import { parseJalaliDateInput } from "@/lib/date/jalali";',
  "birthDateInput",
  "setBirthDateMessage",
  "parseJalaliDateInput(birthDateInput)",
  "birthDate: parsedBirthDate.gregorianIso",
  'placeholder="۱۳۷۸/۰۵/۲۱"',
  'inputMode="numeric"',
  "تاریخ تولد را به شمسی وارد کن",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm missing Jalali input marker: ${marker}`);
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

for (const forbiddenMarker of [
  'type="date"',
  "max={todayIsoDate}",
  "const todayIsoDate",
]) {
  if (chartFormSource.includes(forbiddenMarker)) {
    failures.push(`ChartForm still has Gregorian browser date marker: ${forbiddenMarker}`);
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
  console.error("Jalali birth date input check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Jalali birth date input check passed.");
