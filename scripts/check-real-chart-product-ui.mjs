import { readFileSync } from "node:fs";

const requiredFiles = [
  "components/RealChartWorkbenchClient.tsx",
  "components/RealChartWheel.tsx",
  "scripts/check-real-chart-product-ui.mjs",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const clientSource = readFileSync(requiredFiles[0], "utf8");
const wheelSource = readFileSync(requiredFiles[1], "utf8");
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
  "RealChartWheel",
  "PlanetPlacementCard",
  "ProductPill",
  "ResultMetric",
  "چارت محاسبه شد",
  "جایگاه‌های اصلی",
  "متن گزارش بر اساس همین چارت",
  "شفافیت محاسبه",
]) {
  if (!clientSource.includes(marker)) {
    failures.push(`Real chart product UI client missing marker: ${marker}`);
  }
}

for (const marker of [
  "RealChartWheelPlacement",
  "WHEEL_SIGNS",
  "PLANET_GLYPHS",
  "چرخ چارت تولد",
  "رایزینگ",
  "Halleus",
  "چارت محاسبه‌شده",
]) {
  if (!wheelSource.includes(marker)) {
    failures.push(`Real chart wheel missing marker: ${marker}`);
  }
}

if (clientSource.includes("../src/lib/chart/real-chart-engine")) {
  failures.push("Client component must not import the server real chart engine.");
}

if (
  packageJson.scripts?.["check:real-chart-product-ui"] !==
  "node scripts/check-real-chart-product-ui.mjs"
) {
  failures.push("Missing package script: check:real-chart-product-ui");
}

if (!checkProject.includes("pnpm run check:real-chart-product-ui")) {
  failures.push("check:project does not run check:real-chart-product-ui");
}

if (failures.length > 0) {
  console.error("Real chart product UI check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real chart product UI check passed for 3 files.");
