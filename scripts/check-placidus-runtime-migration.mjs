// HALLEUS_R39_STAGE2_PLACIDUS_READER_OWNERSHIP_R4_20260902
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const failures = [];
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const engineSource = readFileSync("src/lib/chart/real-chart-engine.ts", "utf8");
const serviceSource = readFileSync("lib/report-generation/report-generation-service.ts", "utf8");
const typesSource = readFileSync("types/astro.ts", "utf8");
const writerSource = readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const wheelSource = readFileSync("components/RealChartWheel.tsx", "utf8");
const reportCardSource = readFileSync("components/ReportCard.tsx", "utf8");
const reportDetailSource = readFileSync("components/ReportDetail.tsx", "utf8");
const reportProductReaderSource = readFileSync("components/report/ReportProductReader.tsx", "utf8");
const reportTechnicalAppendixSource = readFileSync("components/report/ReportTechnicalAppendix.tsx", "utf8");
const fixture = JSON.parse(
  readFileSync("src/lib/chart/placidus-house-validation.fixtures.json", "utf8"),
);

for (const marker of [
  'REAL_CHART_WORKBENCH_VERSION = "0.1.284c"',
  "calculatePlacidusHouseCuspsFromUtc",
  'system: "placidus"',
  'cuspSource: "local-placidus-calculator"',
  "unavailableReason: houseCalculation.reason",
  "normalizedChart.houseContext.housesReady",
]) {
  if (!engineSource.includes(marker)) {
    failures.push("real-chart-engine.ts missing runtime migration marker: " + marker);
  }
}

if (engineSource.includes('system: "whole-sign"')) {
  failures.push("Fresh runtime charts must not silently fall back to Whole Sign.");
}

for (const marker of [
  'version: "real-engine-preview-v2"',
  "houseContext.housesReady",
  "getHouseNumberFromCusps",
  "return null;",
  "سرخانه‌های محلی پلاسیدوس برای این گزارش فعال‌اند",
]) {
  if (!serviceSource.includes(marker)) {
    failures.push("report-generation-service.ts missing migration marker: " + marker);
  }
}

if (serviceSource.includes("distanceFromCusp < 30")) {
  failures.push("Report house assignment must not assume fixed 30-degree Placidus houses.");
}

for (const marker of [
  '"real-engine-preview-v1" | "real-engine-preview-v2"',
  '"calculated-cusps"',
  "RealEngineReportHouseAvailability",
  "RealEngineReportHouseUnavailableReason",
]) {
  if (!typesSource.includes(marker)) {
    failures.push("types/astro.ts missing legacy/migration marker: " + marker);
  }
}

for (const marker of [
  "isCalculatedPlacidusHouseContext",
  "isUnavailablePlacidusHouseContext",
  "نسخهٔ ذخیره‌شدهٔ قدیمی",
  "روش جایگزین پنهانی",
]) {
  if (!writerSource.includes(marker)) {
    failures.push("report writer missing migration marker: " + marker);
  }
}

for (const [label, source, markers] of [
  ["wheel", wheelSource, ["houseAvailability", "houseUnavailableReason", "هیچ روش جایگزینی پنهانی اعمال نشده است"]],
  ["report card", reportCardSource, ["houseContext?.availability", "خانه‌های پلاسیدوس برای این چارت نمایش داده نمی‌شوند"]],
  ["report detail orchestration", reportDetailSource, ["ReportProductReader"]],
  ["report product reader", reportProductReaderSource, ["ReportTechnicalAppendix"]],
  ["report technical appendix", reportTechnicalAppendixSource, [
    "houseAvailability={chartData?.houseContext?.availability}",
    'houseSystem === "placidus" && houseAvailability === "unavailable"',
  ]],
]) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(label + " missing unavailable-house marker: " + marker);
    }
  }
}

const compileDirectory = mkdtempSync(
  join(tmpdir(), "halleus-placidus-runtime-migration-"),
);

try {
  const compilerArguments = [
    "--target", "ES2022",
    "--module", "CommonJS",
    "--moduleResolution", "Node",
    "--strict",
    "--esModuleInterop",
    "--rootDir", "src/lib",
    "--outDir", compileDirectory,
    "src/lib/chart/normalized-chart.ts",
    "src/lib/report-output/chart-enrichment.ts",
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
      "Could not compile normalized migration path: " +
        [compileResult.stdout, compileResult.stderr].filter(Boolean).join(" ").trim(),
    );
  } else {
    const require = createRequire(import.meta.url);
    const normalized = require(join(compileDirectory, "chart", "normalized-chart.js"));
    const enrichmentModule = require(
      join(compileDirectory, "report-output", "chart-enrichment.js"),
    );
    const reference = fixture.references?.[0];

    if (!reference) {
      failures.push("Missing Placidus reference fixture for runtime migration.");
    } else {
      const placements = (reference.placements ?? []).map((placement) => ({
        id: placement.id,
        label: placement.id,
        longitude: placement.longitude,
      }));
      const readyChart = normalized.buildNormalizedChart({
        source: "fixture",
        time: {
          date: "1999-12-12",
          time: "19:05",
          timezone: "Asia/Tehran",
          placeName: "Hamadan",
        },
        house: {
          system: "placidus",
          ascendantLongitude: reference.ascendantLongitude,
          ascendantMethod: "astronomy-engine-local-sidereal-time",
          cuspLongitudes: reference.cuspLongitudes,
          cuspSource: "local-placidus-calculator",
          calculationMethod: "local-placidus-semi-arc-root-solver",
        },
        placements,
      });

      if (
        readyChart.houseContext.appliedSystem !== "placidus" ||
        readyChart.houseContext.confidence !== "calculated-cusps" ||
        readyChart.houseContext.availability !== "ready" ||
        readyChart.houses.length !== 12
      ) {
        failures.push("Ready Placidus chart did not preserve calculated unequal cusps.");
      }

      for (const expected of reference.placements ?? []) {
        const actual = readyChart.placements.find((item) => item.id === expected.id);
        if (actual?.house?.house !== expected.expectedHouse) {
          failures.push(
            `${expected.id}: expected Placidus house ${expected.expectedHouse}, received ${actual?.house?.house}`,
          );
        }
      }

      const unavailableChart = normalized.buildNormalizedChart({
        source: "fixture",
        time: {
          date: "2024-01-01",
          time: "00:00",
          timezone: "UTC",
          placeName: "Polar fixture",
        },
        house: {
          system: "placidus",
          ascendantLongitude: reference.ascendantLongitude,
          ascendantMethod: "astronomy-engine-local-sidereal-time",
          unavailableReason: "polar-circle",
          calculationMethod: "local-placidus-semi-arc-root-solver",
        },
        placements,
      });
      const unavailableEnrichment = enrichmentModule.buildChartReportEnrichment(
        unavailableChart,
      );

      if (
        unavailableChart.houseContext.availability !== "unavailable" ||
        unavailableChart.houseContext.housesReady !== false ||
        unavailableChart.houseContext.appliedSystem !== "placeholder" ||
        unavailableChart.houseContext.unavailableReason !== "polar-circle"
      ) {
        failures.push("Polar Placidus chart did not stay explicitly unavailable.");
      }

      if (
        unavailableEnrichment.houseContext.housesReady !== false ||
        unavailableEnrichment.placements.some((placement) => placement.house !== null)
      ) {
        failures.push("Unavailable Placidus enrichment leaked placeholder house numbers.");
      }
    }
  }
} catch (error) {
  failures.push("Could not execute Placidus runtime migration check: " + error.message);
} finally {
  rmSync(compileDirectory, { recursive: true, force: true });
}

if (
  packageJson.scripts?.["check:placidus-runtime-migration"] !==
  "node scripts/check-placidus-runtime-migration.mjs"
) {
  failures.push("Missing package script: check:placidus-runtime-migration");
}

for (const aggregate of ["check:project", "check:engine", "check:reports"]) {
  if (!(packageJson.scripts?.[aggregate] ?? "").includes("pnpm run check:placidus-runtime-migration")) {
    failures.push(aggregate + " does not run check:placidus-runtime-migration");
  }
}

for (const [path, marker] of [
  ["docs/HALLEUS_IDEA_GARDEN.md", "v0.1.284c Placidus runtime migration"],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", "v0.1.284c Placidus runtime reality"],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", "v0.1.284c runtime/report/UI migration contract"],
  ["docs/HALLEUS_PROJECT_CONTEXT.md", "v0.1.284c Placidus runtime migration scope"],
]) {
  if (!readFileSync(path, "utf8").includes(marker)) {
    failures.push(path + " missing migration marker: " + marker);
  }
}

if (failures.length > 0) {
  console.error("Placidus runtime migration check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Placidus runtime migration check passed.");
console.log("- fresh reports use calculated Placidus cusps and snapshot v2");
console.log("- legacy snapshot v1 and Whole Sign remain readable as stored");
console.log("- polar/unavailable charts expose no placeholder house assignments");
console.log("- report writer and UI show explicit no-fallback states");
