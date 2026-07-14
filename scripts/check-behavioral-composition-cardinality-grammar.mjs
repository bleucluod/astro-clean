import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const failures = [];
const helperPath = "lib/astrology/report-behavioral-interpretation.ts";
const writerPath = "lib/astrology/real-engine-report-writer.ts";
const placementComponentPath = "components/ReportPlanetPlacementSections.tsx";
const aspectComponentPath = "components/ReportAspectRelationshipSections.tsx";
const packagePath = "package.json";
const typesPath = "types/report-generation.ts";

const helperSource = readFileSync(helperPath, "utf8");
const writerSource = readFileSync(writerPath, "utf8");
const placementComponent = readFileSync(placementComponentPath, "utf8");
const aspectComponent = readFileSync(aspectComponentPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const typesBefore = readFileSync(typesPath, "utf8");
const compileDirectory = mkdtempSync(join(tmpdir(), "halleus-composition-cardinality-"));

function words(value) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function punctuationClauses(value) {
  return value.split(/[؛.!؟]+/u).map((part) => part.trim()).filter(Boolean).length;
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertBoundedField(label, value, { min = 3, max = 45, clauses = 2 } = {}) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} is missing.`);
  if (typeof value !== "string") return;
  assert(words(value) >= min, `${label} is too generic.`);
  assert(words(value) <= max, `${label} exceeds ${max} words.`);
  assert(punctuationClauses(value) <= clauses, `${label} concatenates too many semantic clauses.`);
}

function assertNoBrokenGrammar(label, value) {
  for (const pattern of [
    /ممکن است هنگام موضوع/u,
    /ممکن است هنگام تشخیص/u,
    /ممکن است هنگام بفهمی/u,
    /نیاز اول چیست/u,
    /توان طبیعی این رابطه را.*در اعتماد،/u,
    /×/u,
  ]) {
    assert(!pattern.test(value), `${label} contains broken or ontology-heavy grammar: ${pattern}`);
  }
}

try {
  const transpiled = ts.transpileModule(helperSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
    },
    fileName: helperPath,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert(errors.length === 0, "Shared behavioral compositor does not transpile.");

  if (errors.length === 0) {
    const compiledPath = join(compileDirectory, "behavioral.mjs");
    writeFileSync(compiledPath, transpiled.outputText, "utf8");
    const behavioral = await import(pathToFileURL(compiledPath).href + `?v=${Date.now()}`);
    const placement = behavioral.buildPlacementBehavioralInterpretation;
    const aspect = behavioral.buildAspectBehavioralInterpretation;

    assert(typeof placement === "function", "Placement compositor is not exported.");
    assert(typeof aspect === "function", "Aspect compositor is not exported.");

    const placementFallbacks = [
      ["Arad Saturn Aries H7", { planetId: "saturn", signId: "aries", houseNumber: 7 }],
      ["Arad Neptune Capricorn H4", { planetId: "neptune", signId: "capricorn", houseNumber: 4 }],
      ["Arad Pluto Sagittarius H3", { planetId: "pluto", signId: "sagittarius", houseNumber: 3 }],
      ["Haleh Sun Sagittarius H6", { planetId: "sun", signId: "sagittarius", houseNumber: 6 }],
      ["Haleh Jupiter Aries H10 retrograde", { planetId: "jupiter", signId: "aries", houseNumber: 10, retrograde: true }],
      ["Ardalan Mercury Gemini H11 retrograde", { planetId: "mercury", signId: "gemini", houseNumber: 11, retrograde: true }],
      ["Ardalan Neptune Sagittarius H5 retrograde", { planetId: "neptune", signId: "sagittarius", houseNumber: 5, retrograde: true }],
    ];

    for (const [label, input] of placementFallbacks) {
      const sample = placement(input);
      for (const field of ["plainMeaning", "healthyExpression", "possibleFriction", "dailyLifeExample", "smallExperiment", "focus", "symbolicBody"]) {
        assertBoundedField(`${label}.${field}`, sample[field], {
          min: field === "focus" ? 3 : 4,
          max: field === "symbolicBody" ? 28 : field === "smallExperiment" ? 25 : 42,
          clauses: field === "possibleFriction" && input.retrograde ? 2 : 2,
        });
        assertNoBrokenGrammar(`${label}.${field}`, sample[field]);
      }
      assert(!sample.smallExperiment.includes("سپس"), `${label} still concatenates multiple experiments.`);
    }

    const targetedPlacements = [
      { planetId: "moon", signId: "taurus", houseNumber: 8 },
      { planetId: "mars", signId: "libra", houseNumber: 1, retrograde: true },
      { planetId: "moon", signId: "aquarius", houseNumber: 8 },
      { planetId: "venus", signId: "scorpio", houseNumber: 4 },
      { planetId: "mars", signId: "aquarius", houseNumber: 8 },
      { planetId: "sun", signId: "cancer", houseNumber: 11 },
      { planetId: "moon", signId: "pisces", houseNumber: 8 },
    ].map(placement);
    for (const sample of targetedPlacements) {
      assertBoundedField("targeted placement meaning", sample.plainMeaning, { max: 45, clauses: 2 });
      assertBoundedField("targeted placement experiment", sample.smallExperiment, { max: 26, clauses: 2 });
    }

    const aspectFallbacks = [
      ["Arad Mercury-Mars", { firstPlanetId: "mercury", secondPlanetId: "mars", firstSignId: "aquarius", secondSignId: "libra", firstHouseNumber: 5, secondHouseNumber: 1, aspectId: "trine", orb: 1.03, chartRulerId: "mercury", retrogradePlanetIds: ["mars"] }],
      ["Arad Mercury-Uranus same house", { firstPlanetId: "mercury", secondPlanetId: "uranus", firstSignId: "aquarius", secondSignId: "aquarius", firstHouseNumber: 5, secondHouseNumber: 5, aspectId: "conjunction", orb: 0.79, chartRulerId: "mercury" }],
      ["Arad Mercury-Jupiter same house", { firstPlanetId: "mercury", secondPlanetId: "jupiter", firstSignId: "aquarius", secondSignId: "aquarius", firstHouseNumber: 5, secondHouseNumber: 5, aspectId: "conjunction", orb: 1.2, chartRulerId: "mercury" }],
      ["Haleh Mercury-Neptune", { firstPlanetId: "mercury", secondPlanetId: "neptune", firstSignId: "sagittarius", secondSignId: "aquarius", firstHouseNumber: 5, secondHouseNumber: 7, aspectId: "sextile", orb: 0.4 }],
      ["Haleh Moon-Venus", { firstPlanetId: "moon", secondPlanetId: "venus", firstSignId: "aquarius", secondSignId: "scorpio", firstHouseNumber: 8, secondHouseNumber: 4, aspectId: "square", orb: 3.5, chartRulerId: "moon" }],
      ["Ardalan Sun-Mercury same house", { firstPlanetId: "sun", secondPlanetId: "mercury", firstSignId: "cancer", secondSignId: "gemini", firstHouseNumber: 11, secondHouseNumber: 11, aspectId: "conjunction", orb: 3.2, chartRulerId: "sun", retrogradePlanetIds: ["mercury"] }],
      ["Ardalan Venus-Pluto", { firstPlanetId: "venus", secondPlanetId: "pluto", firstSignId: "cancer", secondSignId: "libra", firstHouseNumber: 12, secondHouseNumber: 3, aspectId: "square", orb: 1.5, retrogradePlanetIds: ["pluto"] }],
    ];

    for (const [label, input] of aspectFallbacks) {
      const sample = aspect(input);
      for (const field of ["narrativeSummary", "plainMeaning", "dailyLifeExample", "healthyExpression", "possibleFriction", "smallExperiment", "focus"]) {
        assertBoundedField(`${label}.${field}`, sample[field], {
          min: field === "focus" ? 3 : 4,
          max: field === "plainMeaning" ? 54 : field === "dailyLifeExample" ? 45 : field === "smallExperiment" ? 24 : 42,
          clauses: field === "plainMeaning" || field === "healthyExpression" ? 2 : 2,
        });
        assertNoBrokenGrammar(`${label}.${field}`, sample[field]);
      }
      if (input.firstHouseNumber === input.secondHouseNumber) {
        const houseLabel = input.firstHouseNumber === 5 ? "خلاقیت و بیان شخصی" : input.firstHouseNumber === 8 ? "اعتماد و صمیمیت" : "دوستی و آینده جمعی";
        assert((sample.plainMeaning.match(new RegExp(houseLabel, "gu")) ?? []).length <= 1, `${label} repeats the same house context.`);
      }
    }

    const targetedAspects = [
      { firstPlanetId: "mars", secondPlanetId: "saturn", firstSignId: "libra", secondSignId: "aries", firstHouseNumber: 1, secondHouseNumber: 7, aspectId: "opposition", orb: 0.7 },
      { firstPlanetId: "moon", secondPlanetId: "saturn", firstSignId: "aquarius", secondSignId: "taurus", firstHouseNumber: 8, secondHouseNumber: 11, aspectId: "square", orb: 0.2 },
      { firstPlanetId: "moon", secondPlanetId: "mars", firstSignId: "aquarius", secondSignId: "aquarius", firstHouseNumber: 8, secondHouseNumber: 8, aspectId: "conjunction", orb: 1.3 },
      { firstPlanetId: "mars", secondPlanetId: "uranus", firstSignId: "aquarius", secondSignId: "aquarius", firstHouseNumber: 8, secondHouseNumber: 8, aspectId: "conjunction", orb: 1.3 },
      { firstPlanetId: "sun", secondPlanetId: "saturn", firstSignId: "cancer", secondSignId: "libra", firstHouseNumber: 11, secondHouseNumber: 3, aspectId: "square", orb: 0.8 },
    ].map(aspect);
    for (const sample of targetedAspects) {
      assertBoundedField("targeted aspect meaning", sample.plainMeaning, { max: 55, clauses: 2 });
      assertBoundedField("targeted aspect experiment", sample.smallExperiment, { max: 27, clauses: 4 });
      assertNoBrokenGrammar("targeted aspect", Object.values(sample).join(" "));
      assert(!sample.smallExperiment.includes("کدام نیروی سیاره"), "Targeted aspect experiment exposes internal ontology.");
    }
  }
} finally {
  rmSync(compileDirectory, { recursive: true, force: true });
}

for (const forbidden of [
  "`${planet.role} به شیوه‌ای ${sign.method}",
  "`${planet.healthy}؛ ${sign.healthy}",
  "`${houseExperiment}. سپس ${planet.experiment}",
  "`${first.planet.role} و ${second.planet.role}",
  "ممکن است هنگام ${first.planet.dailyVerb}",
  "notes.join(\"؛ \")",
]) {
  assert(!helperSource.includes(forbidden), `Obsolete concatenation remains: ${forbidden}`);
}

for (const marker of [
  "buildPlacementBehavioralInterpretation",
  "buildAspectBehavioralInterpretation",
  "HOUSE_FOCUS_LABELS",
  "buildGenericAspectDailyLifeExample",
  "buildGenericAspectExperiment",
]) {
  assert(helperSource.includes(marker), `Shared helper missing marker: ${marker}`);
}

assert(writerSource.includes("buildChartRulerText(chartSpine, realEngineWithAspects)"), "Writer does not pass the real snapshot into chart-ruler composition.");
assert(writerSource.includes("const interpretation = buildPlacementBehavioralInterpretation({"), "Chart-ruler section does not consume the shared placement interpretation.");
assert(!writerSource.includes("buildChartRulerRoleSentence"), "Obsolete chart-ruler concatenation helper remains.");
assert((writerSource.match(/buildSynthesisPracticeItems\(/g) ?? []).length >= 3, "Summary and weekly practice no longer consume behavioral experiments.");

for (const component of [placementComponent, aspectComponent]) {
  assert(component.includes('from "@/lib/astrology/report-behavioral-interpretation"'), "A report component stopped using the shared helper.");
  for (const duplicate of ["const PLANET_COPY", "const SIGN_COPY", "const ASPECT_STORY"]) {
    assert(!component.includes(duplicate), `Component owns duplicate semantic dictionary: ${duplicate}`);
  }
}

const expectedCommand = "node scripts/check-behavioral-composition-cardinality-grammar.mjs";
assert(packageJson.scripts?.["check:behavioral-composition-cardinality-grammar"] === expectedCommand, "Focused package script is missing.");
for (const aggregate of ["check:project", "check:reports"]) {
  assert((packageJson.scripts?.[aggregate] ?? "").includes("pnpm run check:behavioral-composition-cardinality-grammar"), `${aggregate} does not include the focused guard.`);
}

assert(typesBefore === readFileSync(typesPath, "utf8"), "Persisted report-generation types changed during the guard.");

if (failures.length > 0) {
  console.error("Behavioral composition cardinality/grammar check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Behavioral composition cardinality/grammar check passed.");
console.log("- fallback placements select one meaning, strength, friction, example, and experiment");
console.log("- fallback aspects use bounded grammatical copy and deduplicate same-house context");
console.log("- targeted interpretations remain behaviorally intact");
console.log("- chart-ruler and synthesis practices consume the shared human interpretation");
console.log("- calculation, selection, ordering, and persisted schema remain outside Batch 1");
