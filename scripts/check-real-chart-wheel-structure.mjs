import { readFileSync } from "node:fs";

const wheel = readFileSync("components/RealChartWheel.tsx", "utf8");
const reportCard = readFileSync("components/ReportCard.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const failures = [];

for (const marker of [
  "report-real-chart-wheel-structure",
  "چارت محاسبه‌شده",
  "چرخ چارت تولد",
  "محورهای اصلی",
  "روش نشانه کامل",
  "buildWheelHouses",
  "buildWheelAngles",
  "buildAspectLines",
  "retrogradePlanetIds",
]) {
  if (!wheel.includes(marker)) {
    failures.push("RealChartWheel.tsx missing marker: " + marker);
  }
}

for (const forbidden of [
  "خانه‌ها فعلاً تقریبی‌اند",
  "house system و ASC باید harden شود",
]) {
  if (wheel.includes(forbidden)) {
    failures.push("RealChartWheel.tsx still contains stale wheel copy: " + forbidden);
  }
}

for (const marker of [
  'import { RealChartWheel } from "./RealChartWheel";',
  "report-chart-wheel-structure",
  "houses={report.realEngine.houses}",
  "angles={report.realEngine.angles}",
  "aspects={shownAspects}",
  "retrogradePlanetIds={Array.from(retrogradePlanetIds)}",
]) {
  if (!reportCard.includes(marker)) {
    failures.push("ReportCard.tsx missing chart wheel marker: " + marker);
  }
}

if (packageJson.scripts?.["check:real-chart-wheel-structure"] !== "node scripts/check-real-chart-wheel-structure.mjs") {
  failures.push("Missing package script: check:real-chart-wheel-structure");
}

for (const scriptName of ["check:project", "check:reports"]) {
  const scriptValue = packageJson.scripts?.[scriptName] ?? "";
  if (!scriptValue.includes("pnpm run check:real-chart-wheel-structure")) {
    failures.push(scriptName + " does not run check:real-chart-wheel-structure");
  }
}

if (failures.length > 0) {
  console.error("Real chart wheel structure check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Real chart wheel structure check passed.");
