import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/chart/real-chart-engine.ts",
  "app/api/engine/real-chart/route.ts",
  "components/RealChartWorkbenchClient.tsx",
  "app/engine/real-chart/page.tsx",
  "scripts/check-real-chart-workbench.mjs",
];

const requiredExports = [
  "REAL_CHART_WORKBENCH_VERSION",
  "buildRealChartWorkbenchResult",
  "normalizeRealChartBirthInput",
  "calculateRealChartPlacements",
  "calculateBodyGeocentricLongitude",
  "makeAstronomyTime",
  "getAstronomyBody",
  "zonedDateTimeToUtc",
  "calculateAscendantLongitude",
  "calculateApproximateAscendantLongitude",
  "calculateMeanObliquityDegrees",
  "getZodiacSignForLongitude",
  "normalizeLongitude",
  "formatChartDegree",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const engineSource = readFileSync(requiredFiles[0], "utf8");
const apiSource = readFileSync(requiredFiles[1], "utf8");
const clientSource = readFileSync(requiredFiles[2], "utf8");
const pageSource = readFileSync(requiredFiles[3], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

for (const exportName of requiredExports) {
  if (
    !engineSource.includes(`export function ${exportName}`) &&
    !engineSource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing real chart workbench export: ${exportName}`);
  }
}

for (const marker of [
  'from "astronomy-engine"',
  "GeoVector",
  "Ecliptic",
  "zonedDateTimeToUtc",
  "calculateAscendantLongitude",
  "calculateMeanObliquityDegrees",
  "SiderealTime",
  "astronomy-engine-local-sidereal-time",
  "ascendantMethod",
  "Houses use the whole-sign system anchored to the calculated Ascendant sign.",
  'system: "whole-sign"',
  "astronomy-engine-prototype",
  "outer-planet",
  "Earth-centered",
]) {
  if (!engineSource.includes(marker)) {
    failures.push(`Real chart engine source missing marker: ${marker}`);
  }
}

if (engineSource.includes("EclipticLongitude")) {
  failures.push("Real chart engine must not use the heliocentric longitude helper for natal chart placements.");
}

for (const marker of [
  'runtime = "nodejs"',
  "generateReportContract",
  "buildLegacyRealChartPayload",
  "chartReportEnrichment",
  "reportGeneration",
  "NextResponse.json",
]) {
  if (!apiSource.includes(marker)) {
    failures.push(`Real chart API route missing marker: ${marker}`);
  }
}

for (const marker of [
  '"use client"',
  "/api/engine/real-chart",
  "محاسبه چارت واقعی‌تر",
  "ChartReportBridgePanel",
  "متن گزارش بر اساس همین چارت",
  "شفافیت محاسبه",
]) {
  if (!clientSource.includes(marker)) {
    failures.push(`Real chart workbench client missing marker: ${marker}`);
  }
}

for (const marker of [
  "RealChartWheel",
  "PlanetPlacementCard",
  "چارت محاسبه شد",
  "جایگاه‌های اصلی",
]) {
  if (!clientSource.includes(marker)) {
    failures.push(`Real chart workbench client missing product UI marker: ${marker}`);
  }
}

if (clientSource.includes("../src/lib/chart/real-chart-engine")) {
  failures.push("Client component must not import the server real chart engine.");
}

for (const marker of [
  "RealChartWorkbenchPage",
  "RealChartWorkbenchClient",
  "چارت واقعی‌تر و قابل دیدن",
]) {
  if (!pageSource.includes(marker)) {
    failures.push(`Real chart page missing marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:real-chart-workbench"] !==
  "node scripts/check-real-chart-workbench.mjs"
) {
  failures.push("Missing package script: check:real-chart-workbench");
}

if (!checkProject.includes("pnpm run check:real-chart-workbench")) {
  failures.push("check:project does not run check:real-chart-workbench");
}

const astronomy = await import("astronomy-engine");
const hasGeoVector = typeof astronomy.GeoVector === "function";
const hasEcliptic = typeof astronomy.Ecliptic === "function";
const hasBodySun = Boolean(astronomy.Body?.Sun);
const hasSiderealTime = typeof astronomy.SiderealTime === "function";

if (!hasGeoVector || !hasEcliptic || !hasBodySun || !hasSiderealTime) {
  failures.push("astronomy-engine GeoVector, Ecliptic, Body.Sun, or SiderealTime is not available.");
} else {
  const time = new astronomy.AstroTime(new Date(Date.UTC(1994, 1, 20, 18, 10, 0)));
  const vector = astronomy.GeoVector(astronomy.Body.Sun, time, true);
  const ecliptic = astronomy.Ecliptic(vector);
  const sunLongitude = Number(ecliptic.elon);
  const siderealHours = Number(astronomy.SiderealTime(time));

  if (!Number.isFinite(sunLongitude)) {
    failures.push("astronomy-engine did not return a finite Earth-centered Sun longitude.");
  }

  if (!Number.isFinite(siderealHours)) {
    failures.push("astronomy-engine did not return a finite sidereal time.");
  }
}

if (failures.length > 0) {
  console.error("Real chart workbench check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real chart workbench check passed for 5 files.");
