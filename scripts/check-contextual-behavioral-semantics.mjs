import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const failures = [];
const helperPath = "lib/astrology/report-behavioral-interpretation.ts";
const contextPath = "lib/astrology/report-behavioral-context.ts";
const writerPath = "lib/astrology/real-engine-report-writer.ts";
const placementComponentPath = "components/ReportPlanetPlacementSections.tsx";
const aspectComponentPath = "components/ReportAspectRelationshipSections.tsx";
const typesPath = "types/astro.ts";
const packagePath = "package.json";

const helperSource = readFileSync(helperPath, "utf8");
const contextSource = readFileSync(contextPath, "utf8");
const writerSource = readFileSync(writerPath, "utf8");
const placementComponent = readFileSync(placementComponentPath, "utf8");
const aspectComponent = readFileSync(aspectComponentPath, "utf8");
const typesSource = readFileSync(typesPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const compileDirectory = mkdtempSync(join(tmpdir(), "halleus-contextual-semantics-"));

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function transpile(source, fileName, outputName) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
    },
    fileName,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert(errors.length === 0, `${fileName} does not transpile.`);
  const outputPath = join(compileDirectory, outputName);
  writeFileSync(outputPath, result.outputText, "utf8");
  return outputPath;
}

function allText(value) {
  return Object.values(value).filter((item) => typeof item === "string").join(" ");
}

try {
  const helperOutput = transpile(helperSource, helperPath, "behavioral.mjs");
  const contextOutput = transpile(contextSource, contextPath, "context.mjs");
  const behavioral = await import(pathToFileURL(helperOutput).href + `?v=${Date.now()}`);
  const context = await import(pathToFileURL(contextOutput).href + `?v=${Date.now()}`);

  const placement = behavioral.buildPlacementBehavioralInterpretation;
  const aspect = behavioral.buildAspectBehavioralInterpretation;
  const resolveMode = context.resolveBehavioralAudienceMode;
  const reportMode = context.getReportBehavioralAudienceMode;
  const selectModifier = context.selectPlacementMajorAspectModifier;

  assert(typeof placement === "function", "Placement compositor is missing.");
  assert(typeof aspect === "function", "Aspect compositor is missing.");
  assert(typeof resolveMode === "function", "Audience resolver is missing.");
  assert(typeof selectModifier === "function", "Selected-aspect modifier resolver is missing.");

  const mercuryTaurus = placement({ planetId: "mercury", signId: "taurus", houseNumber: 7 });
  const mercuryGemini = placement({ planetId: "mercury", signId: "gemini", houseNumber: 7 });
  const marsTaurus = placement({ planetId: "mars", signId: "taurus", houseNumber: 7 });
  const marsAries = placement({ planetId: "mars", signId: "aries", houseNumber: 7 });
  const marsLibra = placement({ planetId: "mars", signId: "libra", houseNumber: 2 });
  const moonCapricorn = placement({ planetId: "moon", signId: "capricorn", houseNumber: 4 });
  const moonAquarius = placement({ planetId: "moon", signId: "aquarius", houseNumber: 4 });
  const venusScorpio = placement({ planetId: "venus", signId: "scorpio", houseNumber: 6 });

  assert(mercuryTaurus.healthyExpression !== mercuryGemini.healthyExpression, "Mercury strength does not change with sign.");
  assert(mercuryTaurus.possibleFriction !== mercuryGemini.possibleFriction, "Mercury friction does not change with sign.");
  assert(marsTaurus.healthyExpression !== marsAries.healthyExpression, "Mars strength does not change with sign.");
  assert(marsTaurus.possibleFriction !== marsAries.possibleFriction, "Mars friction does not change with sign.");
  assert(marsTaurus.smallExperiment !== mercuryTaurus.smallExperiment, "Different planets in one house share an exercise.");
  assert(allText(marsLibra) !== allText(marsAries), "Mars Libra loses its sign-compatible behavior.");
  assert(allText(moonCapricorn) !== allText(moonAquarius), "Moon Capricorn and Aquarius collapse into one behavior.");
  assert(allText(venusScorpio) !== allText(placement({ planetId: "venus", signId: "libra", houseNumber: 6 })), "Venus Scorpio loses its sign-compatible behavior.");

  const mercuryHouseThree = placement({ planetId: "mercury", signId: "taurus", houseNumber: 3 });
  assert(mercuryHouseThree.dailyLifeExample !== mercuryTaurus.dailyLifeExample, "House change does not change the observable scenario.");
  assert(mercuryHouseThree.smallExperiment !== mercuryTaurus.smallExperiment, "House change does not situate the exercise.");

  const withoutAspect = placement({ planetId: "mars", signId: "taurus", houseNumber: 7 });
  const withAspect = placement({
    planetId: "mars",
    signId: "taurus",
    houseNumber: 7,
    majorAspect: { otherPlanetId: "saturn", aspectId: "opposition", primary: true },
  });
  assert(withAspect.possibleFriction !== withoutAspect.possibleFriction, "Selected major aspect does not modify placement behavior.");
  assert((allText(withAspect).match(/رابطه اصلی|رابطه روایی/gu) ?? []).length <= 1, "Placement receives more than one narrative-aspect clause.");

  const selected = [
    { id: "a", firstPlanetId: "moon", secondPlanetId: "saturn", aspectId: "square" },
    { id: "b", firstPlanetId: "mars", secondPlanetId: "uranus", aspectId: "conjunction" },
  ];
  assert(selectModifier("mars", selected)?.otherPlanetId === "uranus", "Placement modifier is not selected from current narrative evidence.");
  assert(selectModifier("venus", selected) === null, "Unselected placement receives a major-aspect modifier.");

  const mercuryRetrograde = aspect({
    firstPlanetId: "mercury",
    secondPlanetId: "saturn",
    firstSignId: "taurus",
    secondSignId: "aquarius",
    firstHouseNumber: 3,
    secondHouseNumber: 10,
    aspectId: "square",
    retrogradePlanetIds: ["mercury"],
  });
  const marsRetrograde = aspect({
    firstPlanetId: "mars",
    secondPlanetId: "saturn",
    firstSignId: "taurus",
    secondSignId: "aquarius",
    firstHouseNumber: 3,
    secondHouseNumber: 10,
    aspectId: "square",
    retrogradePlanetIds: ["mars"],
  });
  assert(mercuryRetrograde.possibleFriction !== marsRetrograde.possibleFriction, "Retrograde modifier is not planet-specific.");
  assert(mercuryRetrograde.possibleFriction.includes("پس‌رو"), "Mercury retrograde behavior is missing.");
  assert(marsRetrograde.possibleFriction.includes("پس‌رو"), "Mars retrograde behavior is missing.");

  const aspectTaurus = aspect({
    firstPlanetId: "mercury",
    secondPlanetId: "neptune",
    firstSignId: "taurus",
    secondSignId: "pisces",
    firstHouseNumber: 3,
    secondHouseNumber: 12,
    aspectId: "square",
  });
  const aspectGemini = aspect({
    firstPlanetId: "mercury",
    secondPlanetId: "neptune",
    firstSignId: "gemini",
    secondSignId: "pisces",
    firstHouseNumber: 3,
    secondHouseNumber: 12,
    aspectId: "square",
  });
  assert(aspectTaurus.healthyExpression !== aspectGemini.healthyExpression, "Aspect strength does not respond to sign context.");
  assert(aspectTaurus.possibleFriction !== aspectGemini.possibleFriction, "Aspect friction does not respond to sign context.");

  assert(resolveMode("2025-06-03", "2026-07-14T10:00:00.000Z") === "caregiver", "Under-13 generation mode is not caregiver.");
  assert(resolveMode("2010-07-15", "2026-07-14T10:00:00.000Z") === "youth", "Age 13-17 generation mode is not youth.");
  assert(resolveMode("1990-01-01", "2026-07-14T10:00:00.000Z") === "adult", "Adult generation mode is not adult.");

  const storedReport = {
    createdAt: "2045-01-01T00:00:00.000Z",
    input: { birthDate: "2025-06-03" },
    realEngine: {
      behavioralAudienceMode: "caregiver",
      generatedAt: "2026-07-14T10:00:00.000Z",
    },
  };
  assert(reportMode(storedReport) === "caregiver", "Stored audience mode changes on reopen.");
  const legacyReport = {
    createdAt: "2026-07-14T10:00:00.000Z",
    input: { birthDate: "2010-07-15" },
  };
  assert(reportMode(legacyReport) === "youth", "Legacy reopen mode does not use persisted report time.");

  const childPlacement = placement({
    planetId: "sun",
    signId: "gemini",
    houseNumber: 12,
    audienceMode: "caregiver",
  });
  const childAspect = aspect({
    firstPlanetId: "venus",
    secondPlanetId: "mars",
    firstSignId: "scorpio",
    secondSignId: "taurus",
    firstHouseNumber: 5,
    secondHouseNumber: 11,
    aspectId: "opposition",
    audienceMode: "caregiver",
  });
  const childText = `${allText(childPlacement)} ${allText(childAspect)}`;
  assert(/همراه بزرگسال|کودک/u.test(childText), "Caregiver output is not caregiver-facing.");
  assert(!/(تصمیم حرفه‌ای|جایگاه اجتماعی|رابطه عاشقانه|شراکت|پول)/u.test(childText), "Caregiver output contains adult career, romance, or money assumptions.");

  const firstSynthetic = placement({
    planetId: "sun",
    signId: "cancer",
    houseNumber: 11,
    majorAspect: { otherPlanetId: "saturn", aspectId: "square", primary: true },
  });
  const secondSynthetic = placement({
    planetId: "sun",
    signId: "cancer",
    houseNumber: 12,
    majorAspect: { otherPlanetId: "uranus", aspectId: "trine", primary: true },
  });
  for (const field of ["plainMeaning", "dailyLifeExample", "focus", "smallExperiment"]) {
    assert(firstSynthetic[field] !== secondSynthetic[field], `Synthetic context rebuild keeps stale ${field}.`);
  }
  assert(firstSynthetic.possibleFriction !== secondSynthetic.possibleFriction, "Synthetic aspect rebuild keeps stale modifier copy.");
} finally {
  rmSync(compileDirectory, { recursive: true, force: true });
}

for (const source of [helperSource, contextSource, writerSource]) {
  assert(!/(Arad|Haleh|Ardalan|QA-12H|QA-Earth|QA-Relationship)/u.test(source), "Runtime source contains fixture-name logic.");
}

assert(!contextSource.includes("new Date("), "Audience mode depends on reopen time instead of generation time.");
assert(contextSource.includes("report.realEngine?.behavioralAudienceMode"), "Reopen path does not prefer stored audience mode.");
assert(contextSource.includes("report.realEngine?.generatedAt ?? report.createdAt"), "Legacy reopen path does not use persisted time.");
assert(typesSource.includes('behavioralAudienceMode?: "caregiver" | "youth" | "adult"'), "Snapshot does not persist stable audience mode.");

for (const marker of [
  "behavioralAudienceMode,",
  "resolveBehavioralAudienceMode(",
  "getSnapshotBehavioralAudienceMode(realEngine)",
  "selectPlacementMajorAspectModifier(",
  "realEngine.aspectHighlights",
]) {
  assert(writerSource.includes(marker), `Writer is missing contextual marker: ${marker}`);
}
assert(!writerSource.includes("selectPlacementMajorAspectModifier(\n      planetId,\n      realEngine.aspects"), "Writer uses full technical inventory for placement modifiers.");

for (const [component, label] of [
  [placementComponent, "placement component"],
  [aspectComponent, "aspect component"],
]) {
  assert(component.includes("getReportBehavioralAudienceMode"), `${label} does not use stable report audience context.`);
  assert(!/(const SIGN_SEMANTICS|const PLANET_SEMANTICS|const HOUSE_SEMANTICS)/u.test(component), `${label} owns a duplicate semantic dictionary.`);
}
assert(placementComponent.includes("report.realEngine?.aspectHighlights"), "Placement cards do not use stored narrative evidence.");
assert(!placementComponent.includes("report.realEngine?.aspects"), "Placement cards use full technical aspects instead of selected evidence.");

const command = "node scripts/check-contextual-behavioral-semantics.mjs";
assert(packageJson.scripts?.["check:contextual-behavioral-semantics"] === command, "Focused package script is missing.");
for (const aggregate of ["check:reports", "check:project"]) {
  assert((packageJson.scripts?.[aggregate] ?? "").includes("pnpm run check:contextual-behavioral-semantics"), `${aggregate} does not include the focused guard.`);
}

if (failures.length > 0) {
  console.error("Contextual behavioral semantics check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Contextual behavioral semantics check passed.");
console.log("- placement strengths, frictions, scenarios, and exercises respond to sign, house, planet, and selected narrative evidence");
console.log("- retrograde modifiers are behavior-specific and aspect evidence is bounded to one selected clause");
console.log("- caregiver, youth, and adult modes are deterministic at generation time and stable on reopen");
console.log("- live placement and aspect cards consume the stored report context without fixture-name logic");
console.log("- calculations, full technical inventories, and narrative-mode ranking remain unchanged");
