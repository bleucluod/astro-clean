import { existsSync, readFileSync } from "node:fs";

const failures = [];
const chartSource = readFileSync("app/chart/page.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  'import type { Metadata } from "next"',
  'import { ChartForm } from "@/components/ChartForm"',
  "export const metadata",
  "title: \"ساخت چارت تولد | Halleus\"",
  "return <ChartForm />",
]) {
  if (!chartSource.includes(marker)) {
    failures.push(`app/chart/page.tsx missing public chart shell marker: ${marker}`);
  }
}

if (chartSource.includes("RealChartWorkbenchClient")) {
  failures.push("app/chart/page.tsx directly imports the real chart workbench.");
}

if (chartSource.includes("engine واقعی‌تر Halleus")) {
  failures.push("app/chart/page.tsx still contains the 057 replacement hero copy.");
}

for (const removedFile of [
  "app/chart/LegacyChartShell.tsx",
  "components/PublicChartRealEngineUpgrade.tsx",
  "scripts/check-public-chart-real-engine-upgrade.mjs",
  "scripts/check-public-real-chart-route.mjs",
]) {
  if (existsSync(removedFile)) {
    failures.push(`Temporary public chart file should be removed: ${removedFile}`);
  }
}

if (packageJson.scripts?.["check:public-real-chart-route"]) {
  failures.push("package.json still contains removed script: check:public-real-chart-route");
}

if (packageJson.scripts?.["check:public-chart-real-engine-upgrade"]) {
  failures.push("package.json still contains temporary script: check:public-chart-real-engine-upgrade");
}

if (checkProject.includes("check:public-real-chart-route")) {
  failures.push("check:project still references removed public real chart route check.");
}

if (checkProject.includes("check:public-chart-real-engine-upgrade")) {
  failures.push("check:project still references removed public chart upgrade check.");
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
