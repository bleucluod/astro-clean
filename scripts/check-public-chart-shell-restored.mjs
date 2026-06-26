import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const failures = [];
const chartPath = "app/chart/page.tsx";
const currentChart = readFileSync(chartPath, "utf8");
const previousChart = execFileSync(
  "git",
  ["show", "v0.1.56-real-chart-aspect-panel:app/chart/page.tsx"],
  { encoding: "utf8" },
);

if (currentChart !== previousChart) {
  failures.push("app/chart/page.tsx does not match the pre-057 public chart shell.");
}

if (currentChart.includes("RealChartWorkbenchClient")) {
  failures.push("app/chart/page.tsx still imports the full real chart workbench.");
}

if (currentChart.includes("engine واقعی‌تر Halleus")) {
  failures.push("app/chart/page.tsx still contains the 057 replacement hero copy.");
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

if (packageJson.scripts?.["check:public-real-chart-route"]) {
  failures.push("package.json still contains removed script: check:public-real-chart-route");
}

if (checkProject.includes("check:public-real-chart-route")) {
  failures.push("check:project still references removed public real chart route check.");
}

if (
  packageJson.scripts?.["check:public-chart-shell-restored"] !==
  "node scripts/check-public-chart-shell-restored.mjs"
) {
  failures.push("Missing package script: check:public-chart-shell-restored");
}

if (!checkProject.includes("pnpm run check:public-chart-shell-restored")) {
  failures.push("check:project does not run check:public-chart-shell-restored");
}

if (failures.length > 0) {
  console.error("Public chart shell restore check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public chart shell restore check passed.");
