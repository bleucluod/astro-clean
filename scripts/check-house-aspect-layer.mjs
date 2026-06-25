import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/chart/houses.ts",
  "src/lib/chart/aspects.ts",
  "src/lib/chart/house-aspect-qa.fixtures.ts",
  "scripts/check-house-aspect-layer.mjs",
];

const requiredHouseExports = [
  "HOUSE_NUMBERS",
  "normalizeHouseNumber",
  "getWholeSignFirstHouseCusp",
  "buildWholeSignHouses",
  "buildEqualHouseCusps",
  "buildPlaceholderHouses",
  "getHouseNumberFromLongitude",
  "assignHouseToLongitude",
  "getHouseCuspLongitude",
  "isSupportedHouseSystem",
  "describeHouseSystem",
  "assertHouseCoverage",
];

const requiredAspectExports = [
  "MAJOR_ASPECT_IDS",
  "MAJOR_ASPECT_DEFINITIONS",
  "calculateAngularSeparation",
  "getAspectDefinition",
  "getAspectOrb",
  "findMajorAspect",
  "findMajorAspectBetweenPlacements",
  "calculateMajorAspects",
  "sortAspectsByOrb",
  "formatAspectOrb",
];

const requiredFixtureIds = [
  "house-number-normalization",
  "whole-sign-first-house-cusp",
  "whole-sign-house-coverage",
  "equal-house-assignment",
  "placeholder-house-coverage",
  "angular-separation-wrap",
  "major-aspect-identification",
  "placement-aspect-identification",
  "major-aspect-batch-calculation",
  "aspect-definition-and-formatting",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const houseSource = readFileSync(requiredFiles[0], "utf8");
const aspectSource = readFileSync(requiredFiles[1], "utf8");
const fixtureSource = readFileSync(requiredFiles[2], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";

const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

for (const exportName of requiredHouseExports) {
  if (
    !houseSource.includes(`export function ${exportName}`) &&
    !houseSource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing house export: ${exportName}`);
  }
}

for (const exportName of requiredAspectExports) {
  if (
    !aspectSource.includes(`export function ${exportName}`) &&
    !aspectSource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing aspect export: ${exportName}`);
  }
}

for (const fixtureId of requiredFixtureIds) {
  if (!fixtureSource.includes(fixtureId)) {
    failures.push(`Missing house/aspect QA fixture: ${fixtureId}`);
  }
}

if (!houseSource.includes("whole-sign") || !houseSource.includes("equal-house")) {
  failures.push("House layer must include whole-sign and equal-house foundations.");
}

for (const aspectId of ["conjunction", "sextile", "square", "trine", "opposition"]) {
  if (!aspectSource.includes(aspectId)) {
    failures.push(`Missing major aspect id: ${aspectId}`);
  }
}

if (!fixtureSource.includes("runHouseAspectQaFixtures")) {
  failures.push("Missing runHouseAspectQaFixtures helper.");
}

if (
  packageJson.scripts?.["check:house-aspect-layer"] !==
  "node scripts/check-house-aspect-layer.mjs"
) {
  failures.push("Missing package script: check:house-aspect-layer");
}

if (!checkProject.includes("pnpm run check:house-aspect-layer")) {
  failures.push("check:project does not run check:house-aspect-layer");
}

if (failures.length > 0) {
  console.error("House/aspect layer check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("House/aspect layer check passed for 4 files.");
