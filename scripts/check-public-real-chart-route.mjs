import { readFileSync } from "node:fs";

const requiredFiles = [
  "app/chart/page.tsx",
  "components/RealChartWorkbenchClient.tsx",
  "components/RealChartWheel.tsx",
  "components/RealChartAspectPanel.tsx",
  "scripts/check-public-real-chart-route.mjs",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const chartPageSource = readFileSync("app/chart/page.tsx", "utf8");
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
  "ChartPage",
  "RealChartWorkbenchClient",
  "چارت تولد واقعی‌تر",
  "engine واقعی‌تر Halleus",
  "چرخ چارت و aspectها",
  "نسخه engine lab",
  "/engine/real-chart",
  "گزارش‌ها",
  "/reports",
  "PublicChartFeature",
]) {
  if (!chartPageSource.includes(marker)) {
    failures.push(`Public chart route missing marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:public-real-chart-route"] !==
  "node scripts/check-public-real-chart-route.mjs"
) {
  failures.push("Missing package script: check:public-real-chart-route");
}

if (!checkProject.includes("pnpm run check:public-real-chart-route")) {
  failures.push("check:project does not run check:public-real-chart-route");
}

if (failures.length > 0) {
  console.error("Public real chart route check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public real chart route check passed for 5 files.");
