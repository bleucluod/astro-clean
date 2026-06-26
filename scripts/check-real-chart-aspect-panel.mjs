import { readFileSync } from "node:fs";

const requiredFiles = [
  "components/RealChartAspectPanel.tsx",
  "components/RealChartWorkbenchClient.tsx",
  "scripts/check-real-chart-aspect-panel.mjs",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const aspectSource = readFileSync(requiredFiles[0], "utf8");
const clientSource = readFileSync(requiredFiles[1], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

for (const marker of [
  "RealChartAspectPanel",
  "calculateMajorAspects",
  "calculateAngularSeparation",
  "MAJOR_ASPECTS",
  "هم‌نشینی",
  "چالش سازنده",
  "جریان هماهنگ",
  "قطبیت آگاه‌کننده",
  "روابط اصلی سیاره‌ها",
  "تعریف aspectها و orb",
]) {
  if (!aspectSource.includes(marker)) {
    failures.push(`Real chart aspect panel missing marker: ${marker}`);
  }
}

for (const marker of [
  'import { RealChartAspectPanel } from "./RealChartAspectPanel"',
  "Aspect-aware",
  "روابط اصلی سیاره‌ها هم محاسبه می‌شود",
  "<RealChartAspectPanel placements={result.realChart.placements} />",
]) {
  if (!clientSource.includes(marker)) {
    failures.push(`Real chart client missing aspect panel marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:real-chart-aspect-panel"] !==
  "node scripts/check-real-chart-aspect-panel.mjs"
) {
  failures.push("Missing package script: check:real-chart-aspect-panel");
}

if (!checkProject.includes("pnpm run check:real-chart-aspect-panel")) {
  failures.push("check:project does not run check:real-chart-aspect-panel");
}

if (failures.length > 0) {
  console.error("Real chart aspect panel check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real chart aspect panel check passed for 3 files.");
