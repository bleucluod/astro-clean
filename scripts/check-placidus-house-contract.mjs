import { readFileSync } from "node:fs";

const failures = [];
const housesSource = readFileSync("src/lib/chart/houses.ts", "utf8");
const normalizedSource = readFileSync("src/lib/chart/normalized-chart.ts", "utf8");
const reportTypesSource = readFileSync("types/astro.ts", "utf8");
const realEngineSource = readFileSync("src/lib/chart/real-chart-engine.ts", "utf8");
const fixture = JSON.parse(
  readFileSync("src/lib/chart/placidus-house-validation.fixtures.json", "utf8"),
);
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function normalizeLongitude(value) {
  return ((value % 360) + 360) % 360;
}

function angularDistance(left, right) {
  const distance = Math.abs(normalizeLongitude(left) - normalizeLongitude(right));
  return Math.min(distance, 360 - distance);
}

function assignHouse(longitude, cuspLongitudes) {
  const normalizedLongitude = normalizeLongitude(longitude);

  for (let index = 0; index < cuspLongitudes.length; index += 1) {
    const start = normalizeLongitude(cuspLongitudes[index]);
    const end = normalizeLongitude(
      cuspLongitudes[(index + 1) % cuspLongitudes.length],
    );
    const span = normalizeLongitude(end - start);
    const distance = normalizeLongitude(normalizedLongitude - start);

    if (distance < span) {
      return index + 1;
    }
  }

  return null;
}

for (const marker of [
  '"placidus"',
  "PLACIDUS_HOUSE_CONTRACT_VERSION",
  "buildPlacidusHouses",
  "getHouseNumberFromCusps",
  "assignHouseToCusps",
]) {
  if (!housesSource.includes(marker)) {
    failures.push("houses.ts missing marker: " + marker);
  }
}

for (const marker of [
  "cuspLongitudes",
  '"calculated-cusps"',
  '"provided-cusps"',
  'appliedSystem: "placidus"',
  'availability: "unavailable"',
  "buildPlacidusHouses",
  "assignHouseToCusps",
  "هیچ روش خانهٔ جایگزینی پنهانی اعمال نشده است",
]) {
  if (!normalizedSource.includes(marker)) {
    failures.push("normalized-chart.ts missing marker: " + marker);
  }
}

for (const marker of [
  "export type RealEngineReportHouseContext",
  '| "calculated-cusps"',
  '| "provided-cusps"',
  'version: "real-engine-preview-v1" | "real-engine-preview-v2"',
]) {
  if (!reportTypesSource.includes(marker)) {
    failures.push("types/astro.ts missing migration marker: " + marker);
  }
}

for (const marker of [
  "calculatePlacidusHouseCuspsFromUtc",
  'system: "placidus"',
  'cuspSource: "local-placidus-calculator"',
]) {
  if (!realEngineSource.includes(marker)) {
    failures.push("Active Placidus runtime missing marker: " + marker);
  }
}

if (realEngineSource.includes('system: "whole-sign"')) {
  failures.push("Fresh runtime charts must not silently use Whole Sign after v0.1.284c.");
}

if (fixture.version !== "0.1.284a") {
  failures.push("Unexpected Placidus fixture version.");
}

if (!Array.isArray(fixture.references) || fixture.references.length < 1) {
  failures.push("At least one external Placidus reference fixture is required.");
}

for (const reference of fixture.references ?? []) {
  const cusps = reference.cuspLongitudes;

  if (!Array.isArray(cusps) || cusps.length !== 12) {
    failures.push(reference.id + ": expected 12 cusp longitudes.");
    continue;
  }

  let totalSpan = 0;

  for (let index = 0; index < cusps.length; index += 1) {
    const span = normalizeLongitude(
      cusps[(index + 1) % cusps.length] - cusps[index],
    );
    totalSpan += span;

    if (span <= 0) {
      failures.push(reference.id + ": invalid cusp order.");
    }
  }

  if (Math.abs(totalSpan - 360) > 0.001) {
    failures.push(reference.id + ": cusps do not complete one zodiac cycle.");
  }

  for (let index = 0; index < 6; index += 1) {
    const expectedOpposition = normalizeLongitude(cusps[index] + 180);
    const actualOpposition = normalizeLongitude(cusps[index + 6]);

    if (angularDistance(expectedOpposition, actualOpposition) > 0.02) {
      failures.push(
        reference.id + ": opposing cusp mismatch at house " + (index + 1),
      );
    }
  }

  if (angularDistance(cusps[0], reference.ascendantLongitude) > 0.02) {
    failures.push(reference.id + ": house 1 cusp does not match Ascendant.");
  }

  if (angularDistance(cusps[9], reference.midheavenLongitude) > 0.02) {
    failures.push(reference.id + ": house 10 cusp does not match Midheaven.");
  }

  for (const placement of reference.placements ?? []) {
    const actualHouse = assignHouse(placement.longitude, cusps);

    if (actualHouse !== placement.expectedHouse) {
      failures.push(
        reference.id +
          ": " +
          placement.id +
          " expected house " +
          placement.expectedHouse +
          " but received " +
          actualHouse,
      );
    }
  }
}

if (
  packageJson.scripts?.["check:placidus-house-contract"] !==
  "node scripts/check-placidus-house-contract.mjs"
) {
  failures.push("Missing package script: check:placidus-house-contract");
}

for (const aggregate of ["check:project", "check:engine"]) {
  if (
    !(packageJson.scripts?.[aggregate] ?? "").includes(
      "pnpm run check:placidus-house-contract",
    )
  ) {
    failures.push(aggregate + " does not run check:placidus-house-contract");
  }
}

for (const dependencyName of [
  "swisseph",
  "sweph",
  "sweph-wasm",
  "swiss-ephemeris",
]) {
  if (
    packageJson.dependencies?.[dependencyName] ||
    packageJson.devDependencies?.[dependencyName]
  ) {
    failures.push(
      "Swiss Ephemeris dependency is not approved in v0.1.284a: " +
        dependencyName,
    );
  }
}

for (const [path, marker] of [
  ["docs/HALLEUS_IDEA_GARDEN.md", "v0.1.284a Placidus migration contract"],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", "v0.1.284a Placidus runtime reality"],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", "v0.1.284a Placidus migration sequence"],
  ["docs/HALLEUS_PROJECT_CONTEXT.md", "v0.1.284a Placidus contract scope"],
]) {
  const content = readFileSync(path, "utf8");

  if (!content.includes(marker)) {
    failures.push(path + " missing decision marker: " + marker);
  }
}

if (failures.length > 0) {
  console.error("Placidus house contract check failed:");

  for (const failure of failures) {
    console.error("- " + failure);
  }

  process.exit(1);
}

console.log("Placidus house contract check passed.");
console.log("- active runtime uses local Placidus while legacy Whole Sign snapshots remain typed");
console.log("- unequal cusp contract is available");
console.log("- Haleh reference assignments match Placidus cusps");
console.log("- no Swiss Ephemeris runtime dependency was added");
