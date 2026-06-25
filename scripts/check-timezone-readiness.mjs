import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/chart/timezone-readiness.ts",
  "src/lib/chart/timezone-readiness.fixtures.ts",
  "scripts/check-timezone-readiness.mjs",
];

const requiredExports = [
  "DEFAULT_CHART_TIMEZONE",
  "CORE_CHART_TIMEZONES",
  "isValidIanaTimeZone",
  "normalizeChartTimezone",
  "buildLocalDateTime",
  "getTimeZoneOffsetLabel",
  "buildChartTimeContext",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const timezoneSource = readFileSync(requiredFiles[0], "utf8");
const fixtureSource = readFileSync(requiredFiles[1], "utf8");
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
    !timezoneSource.includes(`export function ${exportName}`) &&
    !timezoneSource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing timezone export: ${exportName}`);
  }
}

for (const fixtureId of [
  "explicit-asia-tehran",
  "explicit-asia-baku",
  "missing-timezone-fallback",
  "missing-birth-time",
  "invalid-timezone",
]) {
  if (!fixtureSource.includes(fixtureId)) {
    failures.push(`Missing timezone fixture: ${fixtureId}`);
  }
}

if (
  packageJson.scripts?.["check:timezone-readiness"] !==
  "node scripts/check-timezone-readiness.mjs"
) {
  failures.push("Missing package script: check:timezone-readiness");
}

if (!checkProject.includes("pnpm run check:timezone-readiness")) {
  failures.push("check:project does not run check:timezone-readiness");
}

if (failures.length > 0) {
  console.error("Timezone readiness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Timezone readiness check passed for 3 files.");
