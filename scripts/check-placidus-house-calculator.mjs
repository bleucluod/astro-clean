import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const failures = [];
const calculatorPath = "src/lib/chart/placidus-house-calculator.ts";
const calculatorSource = readFileSync(calculatorPath, "utf8");
const fixture = JSON.parse(
  readFileSync("src/lib/chart/placidus-house-calculator.fixtures.json", "utf8"),
);
const realEngineSource = readFileSync("src/lib/chart/real-chart-engine.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

let calculator = null;
const compileDirectory = mkdtempSync(
  join(tmpdir(), "halleus-placidus-calculator-check-"),
);

try {
  const compilerArguments = [
    "--target",
    "ES2022",
    "--module",
    "ES2022",
    "--moduleResolution",
    "Bundler",
    "--strict",
    "--rootDir",
    "src/lib/chart",
    "--outDir",
    compileDirectory,
    calculatorPath,
  ];
  const packageManagerScript = process.env.npm_execpath;
  const compileResult = packageManagerScript
    ? spawnSync(
        process.execPath,
        [packageManagerScript, "exec", "tsc", ...compilerArguments],
        { encoding: "utf8" },
      )
    : spawnSync("tsc", compilerArguments, { encoding: "utf8" });

  if (compileResult.status !== 0) {
    failures.push(
      "Could not compile calculator implementation: " +
        [compileResult.stdout, compileResult.stderr]
          .filter(Boolean)
          .join(" ")
          .trim(),
    );
  } else {
    const compiledPath = join(
      compileDirectory,
      "placidus-house-calculator.js",
    );

    const compiledSource = readFileSync(compiledPath, "utf8");

    calculator = await import(
      "data:text/javascript;base64," +
        Buffer.from(compiledSource, "utf8").toString("base64")
    );
  }
} catch (error) {
  failures.push("Could not execute calculator implementation: " + error.message);
} finally {
  rmSync(compileDirectory, { recursive: true, force: true });
}

function normalizeLongitude(value) {
  return ((value % 360) + 360) % 360;
}

function angularDistance(left, right) {
  const distance = Math.abs(normalizeLongitude(left) - normalizeLongitude(right));
  return Math.min(distance, 360 - distance);
}

function expectClose(label, actual, expected, tolerance) {
  if (!Number.isFinite(actual) || angularDistance(actual, expected) > tolerance) {
    failures.push(
      `${label}: expected ${expected}, received ${actual}, tolerance ${tolerance}`,
    );
  }
}

for (const marker of [
  'PLACIDUS_HOUSE_CALCULATOR_VERSION = "0.1.284b"',
  '"local-placidus-semi-arc-root-solver"',
  '"unavailable-no-silent-fallback"',
  "calculatePlacidusHouseCuspsFromUtc",
  "calculateGreenwichMeanSiderealTimeDegrees",
  "calculateMeanObliquityDegrees",
  'reason: "polar-circle"',
]) {
  if (!calculatorSource.includes(marker)) {
    failures.push("Calculator source missing marker: " + marker);
  }
}

for (const blockedMarker of [
  "swisseph",
  "swe_houses",
  "porphyry",
  "whole-sign",
  "astronomy-engine",
]) {
  if (calculatorSource.toLowerCase().includes(blockedMarker)) {
    failures.push("Calculator source contains blocked runtime marker: " + blockedMarker);
  }
}

if (fixture.version !== "0.1.284b") {
  failures.push("Unexpected calculator fixture version.");
}

if (!Array.isArray(fixture.references) || fixture.references.length < 4) {
  failures.push("At least four calculator reference fixtures are required.");
}

if (!Array.isArray(fixture.polarCases) || fixture.polarCases.length < 2) {
  failures.push("At least two explicit polar failure fixtures are required.");
}

if (calculator) {
  const tolerance = fixture.toleranceDegrees ?? 0.000001;

  for (const reference of fixture.references ?? []) {
    const result = calculator.calculatePlacidusHouseCuspsFromUtc({
      utcDate: new Date(reference.utcIso),
      latitudeDegrees: reference.latitudeDegrees,
      longitudeDegrees: reference.longitudeDegrees,
    });

    if (result.status !== "calculated") {
      failures.push(
        reference.id + ": calculator returned " + result.status,
      );
      continue;
    }

    expectClose(
      reference.id + " local sidereal time",
      result.localSiderealTimeDegrees,
      reference.expectedLocalSiderealTimeDegrees,
      1e-8,
    );
    expectClose(
      reference.id + " obliquity",
      result.obliquityDegrees,
      reference.expectedObliquityDegrees,
      1e-10,
    );
    expectClose(
      reference.id + " Ascendant",
      result.ascendantLongitude,
      reference.expectedAscendantLongitude,
      tolerance,
    );
    expectClose(
      reference.id + " Midheaven",
      result.midheavenLongitude,
      reference.expectedMidheavenLongitude,
      tolerance,
    );

    if (!Array.isArray(result.cuspLongitudes) || result.cuspLongitudes.length !== 12) {
      failures.push(reference.id + ": expected 12 calculated cusps.");
      continue;
    }

    result.cuspLongitudes.forEach((cuspLongitude, index) => {
      expectClose(
        `${reference.id} house ${index + 1}`,
        cuspLongitude,
        reference.expectedCuspLongitudes[index],
        tolerance,
      );
    });

    if (result.maxResidualDegrees > 1e-8) {
      failures.push(
        reference.id + ": residual too large: " + result.maxResidualDegrees,
      );
    }

    for (let index = 0; index < 6; index += 1) {
      expectClose(
        `${reference.id} opposing cusp ${index + 1}`,
        result.cuspLongitudes[index + 6],
        result.cuspLongitudes[index] + 180,
        1e-8,
      );
    }
  }

  const stressLatitudes = [-65, -45, -10, 0, 10, 45, 65];
  const stressSiderealTimes = [0, 37, 91, 180, 271, 359.75];

  for (const latitudeDegrees of stressLatitudes) {
    for (const localSiderealTimeDegrees of stressSiderealTimes) {
      const result = calculator.calculatePlacidusHouseCusps({
        localSiderealTimeDegrees,
        latitudeDegrees,
        obliquityDegrees: 23.439291,
      });
      const stressLabel =
        `stress lat ${latitudeDegrees} lst ${localSiderealTimeDegrees}`;

      if (result.status !== "calculated") {
        failures.push(stressLabel + ": unexpectedly unavailable.");
        continue;
      }

      if (
        result.cuspLongitudes.length !== 12 ||
        result.maxResidualDegrees > 1e-8
      ) {
        failures.push(stressLabel + ": invalid cusp cycle or residual.");
      }

      for (let index = 0; index < 6; index += 1) {
        expectClose(
          `${stressLabel} opposing cusp ${index + 1}`,
          result.cuspLongitudes[index + 6],
          result.cuspLongitudes[index] + 180,
          1e-8,
        );
      }
    }
  }

  for (const polarCase of fixture.polarCases ?? []) {
    const result = calculator.calculatePlacidusHouseCuspsFromUtc({
      utcDate: new Date(polarCase.utcIso),
      latitudeDegrees: polarCase.latitudeDegrees,
      longitudeDegrees: polarCase.longitudeDegrees,
    });

    if (
      result.status !== polarCase.expectedStatus ||
      result.reason !== polarCase.expectedReason ||
      result.cuspLongitudes !== null
    ) {
      failures.push(
        polarCase.id +
          ": expected explicit unavailable polar result without fallback.",
      );
    }
  }

  const boundaryObliquityDegrees =
    fixture.references?.[0]?.expectedObliquityDegrees ?? 23.439291;
  const boundaryResult = calculator.calculatePlacidusHouseCusps({
    localSiderealTimeDegrees: 0,
    latitudeDegrees: 90 - boundaryObliquityDegrees,
    obliquityDegrees: boundaryObliquityDegrees,
  });

  if (
    boundaryResult.status !== "unavailable" ||
    boundaryResult.reason !== "polar-circle" ||
    boundaryResult.cuspLongitudes !== null
  ) {
    failures.push(
      "The exact polar limit must return unavailable without fallback.",
    );
  }

  for (const invalidCase of [
    {
      label: "invalid latitude",
      expectedError: RangeError,
      run: () =>
        calculator.calculatePlacidusHouseCusps({
          localSiderealTimeDegrees: 0,
          latitudeDegrees: 91,
          obliquityDegrees: 23.4,
        }),
    },
    {
      label: "invalid longitude",
      expectedError: RangeError,
      run: () =>
        calculator.calculatePlacidusHouseCuspsFromUtc({
          utcDate: new Date("2024-01-01T00:00:00.000Z"),
          latitudeDegrees: 35,
          longitudeDegrees: 181,
        }),
    },
    {
      label: "invalid UTC date",
      expectedError: TypeError,
      run: () =>
        calculator.calculatePlacidusHouseCuspsFromUtc({
          utcDate: new Date(Number.NaN),
          latitudeDegrees: 35,
          longitudeDegrees: 51,
        }),
    },
  ]) {
    try {
      invalidCase.run();
      failures.push(invalidCase.label + " must throw.");
    } catch (error) {
      if (!(error instanceof invalidCase.expectedError)) {
        failures.push(invalidCase.label + " threw the wrong error type.");
      }
    }
  }
}

for (const marker of [
  "calculatePlacidusHouseCuspsFromUtc",
  'system: "placidus"',
  'cuspSource: "local-placidus-calculator"',
  "unavailableReason: houseCalculation.reason",
]) {
  if (!realEngineSource.includes(marker)) {
    failures.push("v0.1.284c runtime migration missing marker: " + marker);
  }
}

if (realEngineSource.includes('system: "whole-sign"')) {
  failures.push("Fresh runtime charts must not silently fall back to Whole Sign after v0.1.284c.");
}

if (
  packageJson.scripts?.["check:placidus-house-calculator"] !==
  "node scripts/check-placidus-house-calculator.mjs"
) {
  failures.push("Missing package script: check:placidus-house-calculator");
}

for (const aggregate of ["check:project", "check:engine"]) {
  if (
    !(packageJson.scripts?.[aggregate] ?? "").includes(
      "pnpm run check:placidus-house-calculator",
    )
  ) {
    failures.push(aggregate + " does not run check:placidus-house-calculator");
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
      "Swiss Ephemeris dependency is not approved: " + dependencyName,
    );
  }
}

for (const [path, marker] of [
  ["docs/HALLEUS_IDEA_GARDEN.md", "v0.1.284b local Placidus calculator candidate"],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", "v0.1.284b Placidus calculator reality"],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", "v0.1.284b calculator completion contract"],
  ["docs/HALLEUS_PROJECT_CONTEXT.md", "v0.1.284b local Placidus calculator scope"],
]) {
  const content = readFileSync(path, "utf8");

  if (!content.includes(marker)) {
    failures.push(path + " missing decision marker: " + marker);
  }
}

if (failures.length > 0) {
  console.error("Placidus house calculator check failed:");

  for (const failure of failures) {
    console.error("- " + failure);
  }

  process.exit(1);
}

console.log("Placidus house calculator check passed.");
console.log("- four external numeric reference cases match");
console.log("- 42 deterministic non-polar stress cases converge");
console.log("- northern, southern, equatorial, and near-polar cases are covered");
console.log("- polar-circle inputs return unavailable with no silent fallback");
console.log("- active runtime requests local Placidus with explicit unavailable handling");
