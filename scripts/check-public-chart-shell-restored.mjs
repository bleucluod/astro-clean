import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const failures = [];
const legacyPath = "app/chart/LegacyChartShell.tsx";
const pagePath = "app/chart/page.tsx";
const legacySource = normalize(readFileSync(legacyPath, "utf8"));
const pageSource = normalize(readFileSync(pagePath, "utf8"));
const baselineChart = normalize(
  execFileSync("git", ["show", "v0.1.58-restore-public-chart-shell:app/chart/page.tsx"], {
    encoding: "utf8",
  }),
);

if (legacySource !== baselineChart) {
  failures.push("LegacyChartShell does not exactly match the restored public chart shell from v0.1.58.");
}

for (const marker of [
  'import LegacyChartShell from "./LegacyChartShell"',
  'import { PublicChartRealEngineUpgrade } from "../../components/PublicChartRealEngineUpgrade"',
  "<LegacyChartShell />",
  "<PublicChartRealEngineUpgrade />",
]) {
  if (!pageSource.includes(marker)) {
    failures.push(`app/chart/page.tsx missing wrapper marker: ${marker}`);
  }
}

if (pageSource.includes("import { RealChartWorkbenchClient")) {
  failures.push("app/chart/page.tsx directly imports the full real chart workbench.");
}

if (pageSource.includes("engine واقعی‌تر Halleus")) {
  failures.push("app/chart/page.tsx contains the 057 replacement hero copy.");
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

function normalize(value) {
  return value.replace(/\r\n/g, "\n").trimEnd() + "\n";
}
