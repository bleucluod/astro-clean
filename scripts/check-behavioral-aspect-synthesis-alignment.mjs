import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const failures = [];
const modulePath = "lib/astrology/report-behavioral-interpretation.ts";
const writerPath = "lib/astrology/real-engine-report-writer.ts";
const componentPath = "components/ReportAspectRelationshipSections.tsx";
const selectionPath = "lib/astrology/real-engine-aspect-selection.ts";
const synthesisPath = "lib/astrology/real-engine-synthesis.ts";
const reportTypesPath = "types/report-generation.ts";
const packagePath = "package.json";

const moduleSource = readFileSync(modulePath, "utf8");
const writerSource = readFileSync(writerPath, "utf8");
const componentSource = readFileSync(componentPath, "utf8");
const selectionSource = readFileSync(selectionPath, "utf8");
const synthesisSource = readFileSync(synthesisPath, "utf8");
const reportTypesSource = readFileSync(reportTypesPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

const compileDirectory = mkdtempSync(
  join(tmpdir(), "halleus-behavioral-aspect-"),
);

try {
  const transpiled = ts.transpileModule(moduleSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
    },
    fileName: modulePath,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );

  if (errors.length > 0) {
    failures.push(
      "Shared behavioral module did not transpile: " +
        errors
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(
              diagnostic.messageText,
              " ",
            ),
          )
          .join(" | "),
    );
  } else {
    const compiledPath = join(
      compileDirectory,
      "report-behavioral-interpretation.mjs",
    );
    writeFileSync(compiledPath, transpiled.outputText, "utf8");
    const behavioral = await import(
      pathToFileURL(compiledPath).href + `?v=${Date.now()}`
    );
    const build = behavioral.buildAspectBehavioralInterpretation;

    if (typeof build !== "function") {
      failures.push("Shared aspect behavioral builder is not exported.");
    } else {
      const samples = {
        aradMarsSaturn: build({
          firstPlanetId: "mars",
          secondPlanetId: "saturn",
          firstSignId: "libra",
          secondSignId: "aries",
          firstHouseNumber: 1,
          secondHouseNumber: 7,
          aspectId: "opposition",
          orb: 0.7,
          retrogradePlanetIds: ["mars"],
          activeHouseNumbers: [1, 5, 7],
          synthesisRole: "challenge",
        }),
        marsSaturnDifferentAxis: build({
          firstPlanetId: "mars",
          secondPlanetId: "saturn",
          firstSignId: "libra",
          secondSignId: "aries",
          firstHouseNumber: 6,
          secondHouseNumber: 12,
          aspectId: "opposition",
          orb: 0.7,
        }),
        aradJupiterUranus: build({
          firstPlanetId: "jupiter",
          secondPlanetId: "uranus",
          firstSignId: "aquarius",
          secondSignId: "aquarius",
          firstHouseNumber: 5,
          secondHouseNumber: 5,
          aspectId: "conjunction",
          orb: 1.1,
          activeHouseNumbers: [5],
          synthesisRole: "support",
        }),
        halehMoonSaturn: build({
          firstPlanetId: "moon",
          secondPlanetId: "saturn",
          firstSignId: "aquarius",
          secondSignId: "taurus",
          firstHouseNumber: 8,
          secondHouseNumber: 11,
          aspectId: "square",
          orb: 1.2,
          chartRulerId: "moon",
          activeHouseNumbers: [8, 11],
          synthesisRole: "challenge",
        }),
        halehMoonMars: build({
          firstPlanetId: "moon",
          secondPlanetId: "mars",
          firstSignId: "aquarius",
          secondSignId: "aquarius",
          firstHouseNumber: 8,
          secondHouseNumber: 8,
          aspectId: "conjunction",
          orb: 0.5,
        }),
        halehMarsUranus: build({
          firstPlanetId: "mars",
          secondPlanetId: "uranus",
          firstSignId: "aquarius",
          secondSignId: "aquarius",
          firstHouseNumber: 8,
          secondHouseNumber: 8,
          aspectId: "conjunction",
          orb: 2,
        }),
        ardalanSunSaturn: build({
          firstPlanetId: "sun",
          secondPlanetId: "saturn",
          firstSignId: "cancer",
          secondSignId: "libra",
          firstHouseNumber: 11,
          secondHouseNumber: 3,
          aspectId: "square",
          orb: 2.2,
          chartRulerId: "sun",
          activeHouseNumbers: [3, 11],
          synthesisRole: "challenge",
        }),
        genericSquare: build({
          firstPlanetId: "mercury",
          secondPlanetId: "neptune",
          firstSignId: "aquarius",
          secondSignId: "sagittarius",
          firstHouseNumber: 5,
          secondHouseNumber: 3,
          aspectId: "square",
          orb: 3.1,
        }),
        genericTrine: build({
          firstPlanetId: "venus",
          secondPlanetId: "pluto",
          firstSignId: "scorpio",
          secondSignId: "virgo",
          firstHouseNumber: 4,
          secondHouseNumber: 2,
          aspectId: "trine",
          orb: 2.8,
        }),
      };

      const allText = (sample) => Object.values(sample).join(" ");
      const requireConcepts = (label, sample, concepts) => {
        const text = allText(sample);
        for (const alternatives of concepts) {
          if (!alternatives.some((concept) => text.includes(concept))) {
            failures.push(
              `${label} is missing behavioral concept: ${alternatives.join(" / ")}`,
            );
          }
        }
      };

      requireConcepts("Arad Mars-Saturn", samples.aradMarsSaturn, [
        ["واکنش دیگری", "ردشدن"],
        ["شروع کنی و عقب بکشی", "توقف‌وحرکت"],
        ["دلخوری"],
        ["چه می‌خواهم"],
      ]);
      requireConcepts("Arad Jupiter-Uranus", samples.aradJupiterUranus, [
        ["ایده", "امکان تازه"],
        ["موج اول هیجان"],
        ["نسخه کوچک"],
      ]);
      requireConcepts("Haleh Moon-Saturn", samples.halehMoonSaturn, [
        ["باربودن", "بی‌نیاز"],
        ["حمایت"],
        ["چه احساسی دارم"],
      ]);
      requireConcepts("Haleh Moon-Mars", samples.halehMoonMars, [
        ["سرعت واکنش"],
        ["چه اتفاقی افتاد"],
      ]);
      requireConcepts("Haleh Mars-Uranus", samples.halehMarsUranus, [
        ["محدودشدن", "آزادی"],
        ["تصمیم غیرقابل‌برگشت"],
      ]);
      requireConcepts("Ardalan Sun-Saturn", samples.ardalanSunSaturn, [
        ["قضاوت", "اشتباه"],
        ["نظر شخصی"],
        ["دو جمله"],
      ]);

      if (
        JSON.stringify(samples.aradMarsSaturn) ===
        JSON.stringify(samples.marsSaturnDifferentAxis)
      ) {
        failures.push(
          "Mars-Saturn interpretation must change when house axis changes.",
        );
      }

      if (
        samples.halehMoonSaturn.plainMeaning ===
        samples.ardalanSunSaturn.plainMeaning
      ) {
        failures.push(
          "Different square pairs must not share one relabelled meaning.",
        );
      }

      if (
        samples.aradJupiterUranus.dailyLifeExample ===
        samples.halehMoonMars.dailyLifeExample
      ) {
        failures.push(
          "Different conjunction pairs must not share one relabelled example.",
        );
      }

      if (
        samples.genericSquare.healthyExpression ===
        samples.genericTrine.healthyExpression
      ) {
        failures.push(
          "Square and trine outputs must preserve distinct relationship form.",
        );
      }

      const actionPattern =
        /(بنویس|بگو|جواب بده|انتخاب کن|اجرا کن|مکث کن|تعیین کن|امتحان کن|نام ببر)/u;
      for (const [label, sample] of Object.entries(samples)) {
        for (const field of [
          "narrativeSummary",
          "plainMeaning",
          "dailyLifeExample",
          "healthyExpression",
          "possibleFriction",
          "smallExperiment",
          "confidenceNote",
        ]) {
          if (
            typeof sample[field] !== "string" ||
            sample[field].trim().length < 28
          ) {
            failures.push(`${label}.${field} is missing or too generic.`);
          }
        }
        if (!actionPattern.test(sample.smallExperiment)) {
          failures.push(
            `${label} experiment lacks an observable action verb.`,
          );
        }
      }

      const fixtureSignatures = new Set([
        samples.aradMarsSaturn,
        samples.halehMoonSaturn,
        samples.ardalanSunSaturn,
      ].map((sample) =>
        [
          sample.plainMeaning,
          sample.dailyLifeExample,
          sample.possibleFriction,
          sample.smallExperiment,
        ].join("|"),
      ));
      if (fixtureSignatures.size !== 3) {
        failures.push(
          "Arad, Haleh, and Ardalan aspect readings are template-relabelled.",
        );
      }
    }
  }
} finally {
  rmSync(compileDirectory, { recursive: true, force: true });
}

for (const source of [writerSource, componentSource]) {
  for (const marker of [
    'from "@/lib/astrology/report-behavioral-interpretation"',
    "buildAspectBehavioralInterpretation",
    "isBehavioralAspectInput",
  ]) {
    if (!source.includes(marker)) {
      failures.push(`Shared aspect-core consumer missing marker: ${marker}`);
    }
  }
}

for (const duplicateMarker of [
  "ASPECT_META_BY_KIND",
  "const ASPECT_STORY",
  "getAspectPlainLanguageBridge",
  "getPlanetAspectTone",
]) {
  if (componentSource.includes(duplicateMarker) || writerSource.includes(duplicateMarker)) {
    failures.push(`Duplicate generic aspect semantics remain: ${duplicateMarker}`);
  }
}

for (const marker of [
  'data-halleus-behavioral-aspect-core="v0.1.315"',
  "نمونه روزمره",
  "آزمایش کوچک",
  "confidenceNote",
]) {
  if (!componentSource.includes(marker)) {
    failures.push(`Aspect component missing behavioral field: ${marker}`);
  }
}

for (const marker of [
  "buildWriterAspectInterpretation",
  "buildAspectClusterSynthesisThread",
  "interpretation.narrativeSummary",
  ").smallExperiment",
  '"challenge"',
  '"support"',
  '"daily-bridge"',
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`Writer/synthesis missing shared-core marker: ${marker}`);
  }
}

for (const forbiddenPractice of [
  "نیاز ${firstPlanet} و نیاز ${secondPlanet}",
  "توان ${firstPlanet} و ${secondPlanet}",
]) {
  if (writerSource.includes(forbiddenPractice)) {
    failures.push(
      `Writer still contains planet-name-only practice: ${forbiddenPractice}`,
    );
  }
}

if (!selectionSource.includes("selectNarrativeAspectHighlights")) {
  failures.push("Narrative aspect selection contract is missing.");
}
if (!synthesisSource.includes("evidenceAspectIds")) {
  failures.push("Synthesis evidence contract is missing.");
}
if (!reportTypesSource.includes("export type ReportGenerationResult")) {
  failures.push("Persisted report-generation contract changed unexpectedly.");
}

const expectedCommand =
  "node scripts/check-behavioral-aspect-synthesis-alignment.mjs";
if (
  packageJson.scripts?.[
    "check:behavioral-aspect-synthesis-alignment"
  ] !== expectedCommand
) {
  failures.push("Missing focused Batch 4 package script.");
}
for (const aggregate of ["check:project", "check:reports"]) {
  if (
    !(packageJson.scripts?.[aggregate] ?? "").includes(
      "pnpm run check:behavioral-aspect-synthesis-alignment",
    )
  ) {
    failures.push(`${aggregate} does not include the Batch 4 guard.`);
  }
}

if (failures.length > 0) {
  console.error(
    "Behavioral aspect/synthesis alignment check failed:",
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Behavioral aspect/synthesis alignment check passed.");
console.log("- both planet roles, signs, houses, aspect form, orb, and relevance shape meaning");
console.log("- Arad Mars-Saturn, Haleh Moon-Saturn, and Ardalan Sun-Saturn are chart-specific");
console.log("- cards, writer, synthesis, cluster reading, and final practices share one semantic core");
console.log("- full aspect inventory and persisted report schema remain outside Batch 4 scope");
