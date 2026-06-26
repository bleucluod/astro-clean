import { readFileSync } from "node:fs";

const failures = [];
const pagePath = "app/chart/page.tsx";
const componentPath = "components/PublicChartRealEngineUpgrade.tsx";
const legacyPath = "app/chart/LegacyChartShell.tsx";
const pageSource = readFileSync(pagePath, "utf8");
const upgradeSource = readFileSync(componentPath, "utf8");
const legacySource = readFileSync(legacyPath, "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "PublicChartRealEngineUpgrade",
  "RealChartWorkbenchClient",
  "محاسبه واقعی‌تر، بدون حذف ظاهر اصلی چارت",
  "انتخاب شهرها",
  "محاسبه واقعی‌تر را داخل همین صفحه باز کن",
  "/engine/real-chart",
]) {
  if (!upgradeSource.includes(marker)) {
    failures.push(`Public chart real engine upgrade component missing marker: ${marker}`);
  }
}

for (const marker of [
  'import LegacyChartShell from "./LegacyChartShell"',
  'import { PublicChartRealEngineUpgrade } from "../../components/PublicChartRealEngineUpgrade"',
  "<LegacyChartShell />",
  "<PublicChartRealEngineUpgrade />",
]) {
  if (!pageSource.includes(marker)) {
    failures.push(`Public chart page missing upgrade wrapper marker: ${marker}`);
  }
}

if (!legacySource.includes("export default")) {
  failures.push("LegacyChartShell must preserve the original default export shell.");
}

if (pageSource.includes("import { RealChartWorkbenchClient")) {
  failures.push("app/chart/page.tsx must not directly import the real chart workbench.");
}

if (
  packageJson.scripts?.["check:public-chart-real-engine-upgrade"] !==
  "node scripts/check-public-chart-real-engine-upgrade.mjs"
) {
  failures.push("Missing package script: check:public-chart-real-engine-upgrade");
}

if (!checkProject.includes("pnpm run check:public-chart-real-engine-upgrade")) {
  failures.push("check:project does not run check:public-chart-real-engine-upgrade");
}

if (failures.length > 0) {
  console.error("Public chart real engine upgrade check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public chart real engine upgrade check passed for 4 files.");
