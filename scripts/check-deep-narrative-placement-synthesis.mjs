// HALLEUS_DEEP_NARRATIVE_SLICE2_FAILURESET_RECONCILIATION_R3_20260902
// HALLEUS_DEEP_NARRATIVE_SLICE2_PLACEMENT_SYNTHESIS_GUARD_R2_20260902
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
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    }).outputText;
    module._compile(output, filename);
  };
}

const matrix = require(path.join(repoRoot, "lib/astrology/placement-narrative-semantic-matrix.ts"));
const behavioral = require(path.join(repoRoot, "lib/astrology/report-behavioral-interpretation.ts"));

const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function read(relativePath) { return fs.readFileSync(path.join(repoRoot, relativePath), "utf8"); }

const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const HOUSES = Array.from({ length: 12 }, (_, index) => index + 1);
const PLANET_LABELS = { sun: "\u062e\u0648\u0631\u0634\u06cc\u062f", moon: "\u0645\u0627\u0647", mercury: "\u0639\u0637\u0627\u0631\u062f", venus: "\u0632\u0647\u0631\u0647", mars: "\u0645\u0631\u06cc\u062e", jupiter: "\u0645\u0634\u062a\u0631\u06cc", saturn: "\u0632\u062d\u0644", uranus: "\u0627\u0648\u0631\u0627\u0646\u0648\u0633", neptune: "\u0646\u067e\u062a\u0648\u0646", pluto: "\u067e\u0644\u0648\u062a\u0648" };
const SIGN_LABELS = { aries: "\u062d\u0645\u0644", taurus: "\u062b\u0648\u0631", gemini: "\u062c\u0648\u0632\u0627", cancer: "\u0633\u0631\u0637\u0627\u0646", leo: "\u0627\u0633\u062f", virgo: "\u0633\u0646\u0628\u0644\u0647", libra: "\u0645\u06cc\u0632\u0627\u0646", scorpio: "\u0639\u0642\u0631\u0628", sagittarius: "\u0642\u0648\u0633", capricorn: "\u062c\u062f\u06cc", aquarius: "\u062f\u0644\u0648", pisces: "\u062d\u0648\u062a" };

const counts = matrix.getCanonicalPlacementMatrixCounts();
assert(counts.planetSign === 120, `planet-sign matrix expected 120, got ${counts.planetSign}`);
assert(counts.planetHouse === 120, `planet-house matrix expected 120, got ${counts.planetHouse}`);
assert(counts.signHouse === 144, `sign-house matrix expected 144, got ${counts.signHouse}`);
assert(counts.ascendantSigns === 12, `ascendant semantic records expected 12, got ${counts.ascendantSigns}`);
assert(counts.nodeSignAxes === 12, `node sign-axis records expected 12, got ${counts.nodeSignAxes}`);
assert(counts.nodeHouseAxes === 12, `node house-axis records expected 12, got ${counts.nodeHouseAxes}`);
assert(new Set(matrix.PLANET_SIGN_INTERACTIONS.map((item) => item.key)).size === 120, "planet-sign semantic keys are not unique");
assert(new Set(matrix.PLANET_HOUSE_INTERACTIONS.map((item) => item.key)).size === 120, "planet-house semantic keys are not unique");
assert(new Set(matrix.SIGN_HOUSE_INTERACTIONS.map((item) => item.key)).size === 144, "sign-house semantic keys are not unique");

const outputKeys = new Set();
const outputBundles = new Set();
for (const planetId of PLANETS) {
  for (const signId of SIGNS) {
    for (const houseNumber of HOUSES) {
      const unit = matrix.buildCanonicalPlacementNarrative({ planetId, signId, houseNumber, audienceMode: "adult" });
      assert(Boolean(unit), `${planetId}:${signId}:${houseNumber} returned no canonical unit`);
      if (!unit) continue;
      assert(unit.semanticKey === `placement:${planetId}:${signId}:${houseNumber}`, `${planetId}:${signId}:${houseNumber} semantic key drifted`);
      assert(unit.thesis.includes(PLANET_LABELS[planetId]), `${unit.semanticKey} hides the planet label`);
      assert(unit.thesis.includes(SIGN_LABELS[signId]), `${unit.semanticKey} hides the sign label`);
      assert(unit.thesis.includes(houseNumber.toLocaleString("fa-IR")), `${unit.semanticKey} hides the house number`);
      assert(unit.facts.planetId === planetId && unit.facts.signId === signId && unit.facts.houseNumber === houseNumber, `${unit.semanticKey} facts drifted`);
      assert(unit.facts.sourceRefs.length === 3, `${unit.semanticKey} source refs are incomplete`);
      const visible = [unit.thesis, unit.mechanism, unit.contextExpression, unit.everydayScene, unit.constructiveExpression, unit.frictionExpression, unit.actionCue].join(" ");
      assert(!visible.includes("\u0645\u0648\u0636\u0648\u0639 \u0627\u06cc\u0646 \u062c\u0627\u06cc\u06af\u0627\u0647"), `${unit.semanticKey} fell back to the legacy placement scaffold`);
      assert(!visible.includes("\u0627\u06cc\u0646 \u0645\u0648\u0636\u0648\u0639") || !visible.includes("\u062c\u0644\u0648 \u0645\u06cc\u200c\u0631\u0648\u062f"), `${unit.semanticKey} uses the legacy A+B scaffold`);
      assert(!visible.includes("\u0628\u062e\u0634 \u062b\u0628\u062a\u200c\u0634\u062f\u0647 \u0632\u0646\u062f\u06af\u06cc"), `${unit.semanticKey} contains a generic house placeholder`);
      outputKeys.add(unit.semanticKey);
      outputBundles.add([unit.thesis, unit.mechanism, unit.everydayScene, unit.constructiveExpression, unit.frictionExpression].join("|"));

      const wired = behavioral.buildPlacementBehavioralInterpretation({ planetId, signId, houseNumber, audienceMode: "adult" });
      assert(wired.semanticKey === unit.semanticKey, `${unit.semanticKey} is not the behavioral source of truth`);
      assert(wired.plainMeaning === unit.thesis, `${unit.semanticKey} thesis changed in behavioral projection`);
      assert(wired.mechanism === unit.mechanism, `${unit.semanticKey} mechanism changed in behavioral projection`);
      assert(wired.contextExpression === unit.contextExpression, `${unit.semanticKey} house context changed in behavioral projection`);
    }
  }
}
assert(outputKeys.size === 1440, `placement semantic keys expected 1440, got ${outputKeys.size}`);
assert(outputBundles.size === 1440, `materially different placement triples collapsed to ${outputBundles.size} full outputs`);

for (const planetId of PLANETS) {
  const direct = matrix.buildCanonicalPlacementNarrative({ planetId, signId: "libra", houseNumber: 1, retrograde: false });
  const retrograde = matrix.buildCanonicalPlacementNarrative({ planetId, signId: "libra", houseNumber: 1, retrograde: true });
  if (planetId === "sun" || planetId === "moon") {
    assert(retrograde?.facts.retrograde === false, `${planetId} must never receive retrograde semantics`);
    assert(retrograde?.thesis === direct?.thesis, `${planetId} changed under an impossible retrograde flag`);
  } else {
    assert(retrograde?.facts.retrograde === true, `${planetId} retrograde state was not integrated`);
    assert(retrograde?.thesis !== direct?.thesis, `${planetId} retrograde did not recompose the thesis`);
    assert(retrograde?.mechanism !== direct?.mechanism, `${planetId} retrograde did not recompose the mechanism`);
    assert(retrograde?.thesis.startsWith("\u0628\u0627 \u067e\u0633\u200c\u0631\u0648\u06cc"), `${planetId} retrograde was appended instead of recomposed`);
  }
}

for (const [planetId, signId, houseNumber] of [
  ["mars", "libra", 1],
  ["saturn", "aries", 7],
  ["moon", "taurus", 8],
  ["mercury", "aquarius", 5],
]) {
  const unit = matrix.buildCanonicalPlacementNarrative({ planetId, signId, houseNumber, audienceMode: "adult" });
  assert(unit?.specificity === "targeted", `Arad fixture ${planetId}:${signId}:${houseNumber} is not targeted`);
  assert((unit?.everydayScene.length ?? 0) >= 80, `Arad fixture ${planetId}:${signId}:${houseNumber} lacks a concrete daily scene`);
  assert((unit?.constructiveExpression.length ?? 0) >= 60, `Arad fixture ${planetId}:${signId}:${houseNumber} lacks constructive depth`);
  assert((unit?.frictionExpression.length ?? 0) >= 60, `Arad fixture ${planetId}:${signId}:${houseNumber} lacks friction depth`);
}

const houseUnit = matrix.buildCanonicalHouseNarrative({
  houseNumber: 5,
  members: [
    { planetId: "sun", signId: "aquarius" },
    { planetId: "mercury", signId: "aquarius" },
    { planetId: "venus", signId: "aquarius" },
  ],
  audienceMode: "adult",
});
assert(Boolean(houseUnit), "canonical house synthesis returned null");
if (houseUnit) {
  assert(houseUnit.memberSemanticKeys.length === 3, "house synthesis did not consume canonical placement units");
  assert(!houseUnit.synthesis.includes("\u062d\u0636\u0648\u0631") && !houseUnit.synthesis.includes("\u0647\u0645\u200c\u0632\u0645\u0627\u0646"), "house synthesis kept the old primary-plus-secondary scaffold");
  for (const member of houseUnit.memberSemanticKeys) {
    const parts = member.split(":");
    const unit = matrix.buildCanonicalPlacementNarrative({ planetId: parts[1], signId: parts[2], houseNumber: Number(parts[3]) });
    assert(!houseUnit.synthesis.includes(unit?.thesis ?? "__missing__"), `house synthesis copied full placement prose from ${member}`);
  }
}

for (const signId of SIGNS) {
  const asc = matrix.buildAscendantSignNarrative(signId);
  assert(Boolean(asc), `Ascendant ${signId} returned no semantic record`);
  assert(asc?.plainMeaning.includes(SIGN_LABELS[signId]), `Ascendant ${signId} hides the sign`);
}

const plannerSource = read("lib/astrology/adaptive-report-planner.ts");
const chaptersSource = read("lib/astrology/personal-planet-chapters.ts");
const behavioralSource = read("lib/astrology/report-behavioral-interpretation.ts");
assert(plannerSource.includes("buildCanonicalHouseNarrative") && plannerSource.includes("buildAscendantSignNarrative"), "adaptive planner is not wired to canonical house/Ascendant semantics");
assert(!plannerSource.includes("`\u062d\u0636\u0648\u0631 ${formatPlacementAstrologyLabel(primary)} \u0628\u0627\u0639\u062b \u0645\u06cc\u200c\u0634\u0648\u062f"), "important houses still use primary placement + connector composition");
assert(!plannerSource.includes("`\u0647\u0645\u200c\u0632\u0645\u0627\u0646 ${formatPlacementAstrologyLabel(secondary)}"), "important houses still append a secondary placement interpretation");
assert(chaptersSource.includes("reading.mechanism") && chaptersSource.includes("reading.contextExpression"), "personal-planet chapters are not projecting canonical facets");
assert(!chaptersSource.includes("const signReading = buildPlacementBehavioralInterpretation"), "personal-planet chapters still create a second sign-only interpretation");
assert(!chaptersSource.includes("const PLANET_ROLES"), "personal-planet chapters still maintain a parallel planet-definition dictionary");
assert(behavioralSource.includes("buildCanonicalPlacementNarrative") && behavioralSource.includes("semanticKey?: string"), "behavioral interpretation is not wired to the canonical semantic unit");

const matrixSource = read("lib/astrology/placement-narrative-semantic-matrix.ts");
const adaptiveSource = read("components/report/ReportAdaptiveNarrative.tsx");
assert(!matrixSource.includes("\\u06"), "matrix source kept literal unicode escape markers instead of UTF-8 Persian");
function adjacentDuplicateToken(text) {
  const tokens = String(text).normalize("NFKC").replace(/[.\u060c\u061b:!?\u061f\u00ab\u00bb()\[\]{}\-\u2013\u2014]/gu, " ").split(/\\s+/u).filter(Boolean);
  for (let index = 1; index < tokens.length; index += 1) if (tokens[index] === tokens[index - 1]) return tokens[index];
  return null;
}
for (const planetId of PLANETS) for (const signId of SIGNS) for (const houseNumber of HOUSES) {
  const unit = matrix.buildCanonicalPlacementNarrative({ planetId, signId, houseNumber, audienceMode: "adult" });
  for (const field of ["thesis","mechanism","contextExpression","everydayScene","constructiveExpression","frictionExpression","actionCue"]) {
    const duplicate = adjacentDuplicateToken(unit?.[field] ?? "");
    assert(!duplicate, `duplicate token ${duplicate} in ${planetId}:${signId}:${houseNumber} ${field}`);
  }
}
const mercuryScorpio = matrix.buildCanonicalPlacementNarrative({ planetId: "mercury", signId: "scorpio", houseNumber: 3, audienceMode: "adult" });
assert([mercuryScorpio?.constructiveExpression, mercuryScorpio?.frictionExpression].join(" ").includes("\u0639\u0644\u062a \u067e\u0646\u0647\u0627\u0646") && [mercuryScorpio?.constructiveExpression, mercuryScorpio?.frictionExpression].join(" ").includes("\u0633\u0624\u0627\u0644 \u0645\u0633\u062a\u0642\u06cc\u0645"), "Mercury Scorpio lost hidden-cause/direct-question semantics");
const marsCapricorn = matrix.buildCanonicalPlacementNarrative({ planetId: "mars", signId: "capricorn", houseNumber: 10, audienceMode: "adult" });
const marsCapricornText = [marsCapricorn?.constructiveExpression, marsCapricorn?.frictionExpression].join(" ");
assert(marsCapricornText.includes("\u0632\u0645\u0627\u0646") && marsCapricornText.includes("\u0645\u0639\u06cc\u0627\u0631 \u067e\u0627\u06cc\u0627\u0646") && marsCapricornText.includes("\u0645\u0633\u0626\u0648\u0644\u06cc\u062a"), "Mars Capricorn lost structure/performance semantics");
assert(plannerSource.includes("reason: reasonParts.join") && plannerSource.includes("headline: houseNarrative.thesis") && adaptiveSource.includes("<p>{house.reason}</p>"), "important-house ownership does not expose chart-specific reason plus canonical thesis");

if (failures.length > 0) {
  console.error("Deep narrative Slice 2 placement synthesis check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("HALLEUS_DEEP_NARRATIVE_SLICE2_PLACEMENT_SYNTHESIS_PASS");
console.log(`PLACEMENT_COMBINATIONS=${outputKeys.size}`);
console.log(`PLANET_SIGN_INTERACTIONS=${counts.planetSign}`);
console.log(`PLANET_HOUSE_INTERACTIONS=${counts.planetHouse}`);
console.log(`SIGN_HOUSE_INTERACTIONS=${counts.signHouse}`);
console.log(`ASCENDANT_SIGN_UNITS=${counts.ascendantSigns}`);
console.log(`NODE_AXIS_UNITS=${counts.nodeSignAxes + counts.nodeHouseAxes}`);