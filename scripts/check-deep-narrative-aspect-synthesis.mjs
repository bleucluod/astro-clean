// HALLEUS_DEEP_NARRATIVE_SLICE3_ASPECT_ADVANCED_SYNTHESIS_GUARD_R1_20260902
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  for (const option of [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, path.join(candidate, "index.ts"), path.join(candidate, "index.tsx"), path.join(candidate, "index.js")]) {
    if (fs.existsSync(option)) return option;
  }
  return candidate;
}
Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(this, resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename }).outputText;
    module._compile(output, filename);
  };
}

const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function read(relativePath) { return fs.readFileSync(path.join(repoRoot, relativePath), "utf8"); }
function combined(core) { return [core.thesis, core.mechanism, core.everydayScene, core.constructiveExpression, core.frictionExpression, core.actionCue].join(" | "); }

const natal = require(path.join(repoRoot, "lib/astrology/natal-aspect-narrative-semantic-matrix.ts"));
const advanced = require(path.join(repoRoot, "lib/astrology/advanced-narrative-semantic-matrix.ts"));
const natalCounts = natal.getNatalAspectMatrixCounts();
assert(natalCounts.planetPairs === 45, `expected 45 natal planet pairs, got ${natalCounts.planetPairs}`);
assert(natalCounts.aspectForms === 5, `expected five natal aspect forms, got ${natalCounts.aspectForms}`);
assert(natalCounts.pairAspectCores === 225, `expected 225 natal pair-aspect cores, got ${natalCounts.pairAspectCores}`);

const syntheticSeparations = { conjunction: 0.8, sextile: 59.7, square: 90.3, trine: 119.9, opposition: 179.3 };
const lexicalNames = ["مقارنه", "تسدیس", "مربع", "تثلیث", "مقابله", "اورب"];
const seenKeys = new Set();
for (let firstIndex = 0; firstIndex < natal.NATAL_ASPECT_PLANET_IDS.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < natal.NATAL_ASPECT_PLANET_IDS.length; secondIndex += 1) {
    const first = natal.NATAL_ASPECT_PLANET_IDS[firstIndex];
    const second = natal.NATAL_ASPECT_PLANET_IDS[secondIndex];
    const formTexts = new Set();
    for (const aspectId of natal.NATAL_ASPECT_IDS) {
      const core = natal.getNatalAspectSemanticCore(first, second, aspectId);
      const reverse = natal.getNatalAspectSemanticCore(second, first, aspectId);
      assert(core.semanticKey === reverse.semanticKey, `${first}/${second}/${aspectId}: pair order changed semantic key`);
      assert(core.pairKey === reverse.pairKey, `${first}/${second}/${aspectId}: pair order changed pair key`);
      assert(!seenKeys.has(core.semanticKey), `duplicate semantic key ${core.semanticKey}`);
      seenKeys.add(core.semanticKey);
      for (const field of ["thesis", "mechanism", "everydayScene", "constructiveExpression", "frictionExpression", "actionCue"]) {
        assert(typeof core[field] === "string" && core[field].trim().length >= 12, `${core.semanticKey}: missing ${field}`);
      }
      const full = combined(core);
      assert(!formTexts.has(full), `${core.pairKey}: two aspect forms produced identical full semantics`);
      formTexts.add(full);
      const narrative = natal.buildCanonicalNatalAspectNarrative({
        firstPlanetId: first,
        secondPlanetId: second,
        firstSignLabel: "دلو",
        secondSignLabel: "میزان",
        firstHouseNumber: 5,
        secondHouseNumber: 1,
        aspectId,
        actualSeparation: syntheticSeparations[aspectId],
        canonicalAngle: { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 }[aspectId],
        retrogradePlanetIds: second === "mars" ? ["mars"] : [],
      });
      assert(/[۰-۹]/u.test(narrative.factLead) && narrative.factLead.includes("°"), `${core.semanticKey}: actual separation missing from visible fact lead`);
      for (const forbidden of lexicalNames) assert(!narrative.factLead.includes(forbidden), `${core.semanticKey}: fact lead leaked deprecated aspect label ${forbidden}`);
      assert(narrative.contextualThesis.includes("خانهٔ ۵") && narrative.contextualThesis.includes("خانهٔ ۱"), `${core.semanticKey}: house context missing`);
      assert(narrative.contextualThesis.includes("دلو") && narrative.contextualThesis.includes("میزان"), `${core.semanticKey}: sign context missing`);
    }
  }
}
assert(seenKeys.size === 225, `enumeration produced ${seenKeys.size} unique natal semantic keys`);

const mercuryUranus = natal.getNatalAspectSemanticCore("mercury", "uranus", "conjunction");
assert(mercuryUranus.thesis.includes("مسیر معمول") && mercuryUranus.constructiveExpression.includes("ارتباط"), "Mercury-Uranus targeted synthesis lost novelty/pattern semantics");
const marsSaturn = natal.getNatalAspectSemanticCore("mars", "saturn", "opposition");
assert(marsSaturn.thesis.includes("پیامد") && marsSaturn.mechanism.includes("محور"), "Mars-Saturn targeted synthesis lost action/consequence axis");
const mercurySaturn = natal.getNatalAspectSemanticCore("mercury", "saturn", "trine");
assert(mercurySaturn.constructiveExpression.includes("تمرکز") && mercurySaturn.thesis.includes("ساختار"), "Mercury-Saturn targeted synthesis lost structured thought semantics");
const moonVenus = natal.getNatalAspectSemanticCore("moon", "venus", "square");
assert(moonVenus.thesis.includes("امنیت") && moonVenus.frictionExpression.includes("رضایت"), "Moon-Venus targeted synthesis lost security/relational tension semantics");

const advancedCounts = advanced.getAdvancedNarrativeMatrixCounts();
assert(advancedCounts.bodies === 8, `expected 8 advanced bodies, got ${advancedCounts.bodies}`);
assert(advancedCounts.aspectForms === 5, `expected 5 advanced dynamics, got ${advancedCounts.aspectForms}`);
assert(advancedCounts.semanticRules === 40, `expected 40 advanced semantic rules, got ${advancedCounts.semanticRules}`);
assert(advancedCounts.targetedCombinations === 4, `expected 4 advanced targeted combinations, got ${advancedCounts.targetedCombinations}`);
for (const bodyId of advanced.ADVANCED_NARRATIVE_BODY_IDS) {
  for (const aspectId of advanced.ADVANCED_NARRATIVE_ASPECT_IDS) {
    const rule = advanced.getAdvancedNarrativeSemanticRule(bodyId, aspectId);
    assert(rule && rule.semanticKey === `${bodyId}:${aspectId}`, `${bodyId}/${aspectId}: missing advanced semantic rule`);
    assert(rule?.thesis?.length > 15 && rule?.constructiveExpression?.length > 15 && rule?.frictionExpression?.length > 15, `${bodyId}/${aspectId}: shallow advanced semantic rule`);
  }
}
const triple = advanced.synthesizeTargetedAdvancedCombination(["ceres", "juno", "chiron"]);
assert(triple?.key === "ceres+juno+chiron", "Ceres/Juno/Chiron targeted synthesis missing");
assert(triple?.thesis.includes("مراقبت") && triple?.thesis.includes("تعهد") && triple?.thesis.includes("حساسیت"), "Ceres/Juno/Chiron targeted thesis lost joint semantics");
for (const ids of [["juno","chiron"],["ceres","juno"],["ceres","chiron"]]) assert(Boolean(advanced.synthesizeTargetedAdvancedCombination(ids)), `missing targeted advanced combination ${ids.join("+")}`);
const nessusText = advanced.ADVANCED_NARRATIVE_ASPECT_IDS.map((aspectId) => combined({ ...advanced.getAdvancedNarrativeSemanticRule("nessus", aspectId), everydayScene: "", actionCue: "" })).join(" ");
for (const forbidden of ["سوءاستفاده", "تروما", "خشونت", "قربانی"]) assert(!nessusText.includes(forbidden), `Nessus semantic rules inferred forbidden claim: ${forbidden}`);
for (const required of ["مرز", "قدرت"]) assert(nessusText.includes(required), `Nessus semantic rules lost safety theme: ${required}`);
assert(nessusText.includes("پاسخگویی") || nessusText.includes("مسئولیت"), "Nessus semantic rules lost accountability theme");

const behavioralSource = read("lib/astrology/report-behavioral-interpretation.ts");
const plannerSource = read("lib/astrology/adaptive-report-planner.ts");
const unifiedSource = read("lib/astrology/unified-story-synthesis.ts");
for (const marker of ["HALLEUS_DEEP_NARRATIVE_SLICE3_NATAL_ASPECT_SYNTHESIS_R1_20260902", "buildCanonicalNatalAspectNarrative", "actualSeparation?: number | null", "canonicalAngle?: number | null"]) assert(behavioralSource.includes(marker), `behavioral integration missing ${marker}`);
for (const marker of ["HALLEUS_DEEP_NARRATIVE_SLICE3_NATAL_ASPECT_SYNTHESIS_R1_20260902", "buildAspectBehavioralInterpretation", "actualSeparation: aspect.separation", "canonicalAngle: aspect.angle"]) assert(plannerSource.includes(marker), `planner integration missing ${marker}`);
for (const forbidden of ["stripLeadingPossibility(first?.dailyLifeExample", "and simultaneously", "و هم‌زمان ${stripLeadingPossibility", "و در همان زمان ${second?.healthyExpression}"]) assert(!plannerSource.includes(forbidden), `planner kept A+B aspect composition scaffold: ${forbidden}`);
const rankingFormula = "125 - aspect.orb * 9 + (core ? 18 : 0) + (ruler ? 15 : 0) + (personal ? 12 : 0) + (aspect.orb <= 1.5 ? 18 : 0) - (outerOnly ? 45 : 0) + (dynamic ? 4 : 0) - index * 0.01";
assert(plannerSource.includes(rankingFormula), "aspect ranking formula changed during narrative-only Slice 3");
for (const marker of ["HALLEUS_R39_TRUE_SYNTHESIS_RECOMPOSITION_R1_20260902", "composeAdvancedBodyNarrative", 'story.kind !== "cluster"']) assert(unifiedSource.includes(marker), `existing relevance-gated advanced synthesis contract missing ${marker}`);

if (failures.length) {
  console.error("Deep narrative Slice 3 aspect/advanced synthesis guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Deep narrative Slice 3 aspect/advanced synthesis guard passed.");
console.log("- 225/225 unordered major-planet pair/aspect semantic cores covered with pair-order stability");
console.log("- visible natal aspect synthesis consumes stored actual separation plus sign/house/retrograde context");
console.log("- Mercury-Uranus, Mars-Saturn, Mercury-Saturn, and Moon-Venus targeted quality fixtures pass");
console.log("- 40/40 advanced-body/aspect semantic rules plus four targeted combination syntheses exist");
console.log("- existing advanced relevance/merge/support/suppress ownership remains authoritative");
console.log("- Nessus safety remains boundary/power/accountability based without abuse/trauma/violence inference");
