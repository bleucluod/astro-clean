import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/chart/zodiac.ts",
  "src/lib/chart/zodiac-qa.fixtures.ts",
  "scripts/check-zodiac-qa-fixtures.mjs",
];

const requiredZodiacExports = [
  "ZODIAC_SIGN_IDS",
  "ZODIAC_SIGN_SIZE_DEGREES",
  "FULL_CIRCLE_DEGREES",
  "TROPICAL_ZODIAC_SIGNS",
  "normalizeEclipticLongitude",
  "getZodiacSignIndexFromLongitude",
  "getTropicalZodiacSignFromLongitude",
  "getDegreeWithinZodiacSign",
  "getZodiacPosition",
  "formatZodiacPosition",
  "isZodiacBoundaryLongitude",
];

const requiredFixtureIds = [
  "aries-start",
  "taurus-start",
  "gemini-start",
  "cancer-start",
  "leo-start",
  "virgo-start",
  "libra-start",
  "scorpio-start",
  "sagittarius-start",
  "capricorn-start",
  "aquarius-start",
  "pisces-start",
  "wrap-360-to-aries",
  "negative-one-degree-to-pisces",
  "large-longitude-normalization",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const zodiacSource = readFileSync(requiredFiles[0], "utf8");
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

for (const exportName of requiredZodiacExports) {
  if (
    !zodiacSource.includes(`export function ${exportName}`) &&
    !zodiacSource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing zodiac export: ${exportName}`);
  }
}

for (const fixtureId of requiredFixtureIds) {
  if (!fixtureSource.includes(fixtureId)) {
    failures.push(`Missing zodiac QA fixture: ${fixtureId}`);
  }
}

if (!zodiacSource.includes("ZODIAC_SIGN_SIZE_DEGREES = 30")) {
  failures.push("Zodiac sign size must be locked to 30 degrees.");
}

if (!zodiacSource.includes("FULL_CIRCLE_DEGREES = 360")) {
  failures.push("Full circle must be locked to 360 degrees.");
}

if (!fixtureSource.includes("runZodiacQaFixtures")) {
  failures.push("Missing runZodiacQaFixtures helper.");
}

if (
  packageJson.scripts?.["check:zodiac-qa-fixtures"] !==
  "node scripts/check-zodiac-qa-fixtures.mjs"
) {
  failures.push("Missing package script: check:zodiac-qa-fixtures");
}

if (!checkProject.includes("pnpm run check:zodiac-qa-fixtures")) {
  failures.push("check:project does not run check:zodiac-qa-fixtures");
}

if (failures.length > 0) {
  console.error("Zodiac QA fixtures check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Zodiac QA fixtures check passed for 3 files.");
