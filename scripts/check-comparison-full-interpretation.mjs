// HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const astro = read("types/astro.ts");
const synastry = read("types/synastry-engine.ts");
const engine = read("lib/astrology/synastry/real-synastry-engine.ts");
const interpretation = read("lib/comparison/comparison-full-interpretation.ts");
const service = read("lib/comparison/comparison-product-service.ts");
const productTypes = read("types/comparison-product.ts");
const reportUi = read("components/comparison/ComparisonReport.tsx");
const css = read("components/comparison/comparison.module.css");

function block(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const end = source.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

const snapshotBlock = block(astro, "export type RealEngineReportSnapshot = {", "\n};");
const snapshotFields = [...snapshotBlock.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9_]*)\??:/gm)].map((match) => match[1]);
const coverageBlock = block(synastry, "export const REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS = [", "] as const");
const coverageFields = [...coverageBlock.matchAll(/"([A-Za-z][A-Za-z0-9_]*)"/g)].map((match) => match[1]);

assert(snapshotFields.length > 0, "Could not parse RealEngineReportSnapshot fields");
assert(coverageFields.length > 0, "Could not parse REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS");
assert(snapshotFields.length === coverageFields.length, `Coverage count mismatch: snapshot=${snapshotFields.length}, coverage=${coverageFields.length}`);
assert(snapshotFields.every((field) => coverageFields.includes(field)), "A RealEngineReportSnapshot field is missing from synastry coverage");
assert(coverageFields.every((field) => snapshotFields.includes(field)), "Synastry coverage contains a field outside RealEngineReportSnapshot");

for (const marker of [
  'engineSnapshot?: RealEngineReportSnapshot;',
  'engineCoverage?: SynastryEngineCoverageManifest;',
  'points?: SynastryNatalPoint[];',
  '| "fixed-star";',
  '"deferred-no-approved-orb-policy"',
]) {
  assert(synastry.includes(marker), `Synastry v2 marker missing: ${marker}`);
}
for (const marker of [
  'engineSnapshot: source,',
  'const points = normalizeFullEnginePoints(source, exactTime, placements, angles);',
  'kind: "fixed-star"',
  'contactPolicy: "not-contact-eligible"',
  'source.specialistAstrology?.fixedStars.stars',
  'source.specialistAstrology?.traditionalLots.lots',
]) {
  assert(engine.includes(marker), `Slice 1 bridge marker missing: ${marker}`);
}

for (const marker of [
  'comparison-full-interpretation-v1',
  'buildFullComparisonInterpretation',
  'engineSnapshot?.lunarNodes',
  'engineSnapshot?.lilith',
  'engineSnapshot?.specialPoints',
  'specialistAstrology?.fixedStars',
  'conjunctionCandidates',
  'specialistAstrology?.traditionalLots',
  'engineSnapshot?.retrogrades',
  'engineSnapshot?.chartSignature',
  'engineSnapshot?.aspects',
  'report.houseOverlays.map',
  'report.contacts.map',
  'context === "work"',
  'house === 8 && context === "work"',
  'محرمانگی',
  'deferred-no-approved-orb-policy',
]) {
  assert(interpretation.includes(marker), `Full interpretation source marker missing: ${marker}`);
}

for (const marker of [
  'ComparisonFullInterpretation',
  'fullInterpretation?: ComparisonFullInterpretation;',
  'ComparisonContactInterpretation',
  'ComparisonOverlayInterpretation',
  'ComparisonInterpretationCoverageEntry',
]) {
  assert(productTypes.includes(marker), `Comparison product type marker missing: ${marker}`);
}
for (const marker of [
  'buildFullComparisonInterpretation',
  'fullInterpretation,',
  'overviewParagraphsFa = fullInterpretation.openingParagraphsFa',
  'fallbackOverviewParagraphsFa',
]) {
  assert(service.includes(marker), `Comparison service integration marker missing: ${marker}`);
}
for (const marker of [
  'data-full-interpretation="deeper-layers"',
  'data-full-interpretation="all-contacts"',
  'data-full-interpretation="all-overlays"',
  'data-full-interpretation="natal-context"',
  'data-full-interpretation="calculation-quality"',
  'data-full-interpretation="technical-audit"',
  'JSON.stringify(report.chartA.engineSnapshot ?? null, null, 2)',
  'JSON.stringify(report.chartB.engineSnapshot ?? null, null, 2)',
]) {
  assert(reportUi.includes(marker), `Comparison UI marker missing: ${marker}`);
}
assert(css.includes("HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5"), "Slice 2 CSS marker missing");
assert(css.includes("@media (max-width: 390px)"), "390px full-interpretation CSS guard missing");
assert(!block(css, "/* HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5 */", "/* END HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5 */").match(/min-width:\s*[4-9]\d\dpx/), "Full interpretation CSS introduces a fixed min-width above mobile width");

function loadProductionBuilder() {
  const runtimeCoverage = JSON.stringify(coverageFields);
  let source = interpretation;
  source = source.replace(
    /import\s*\{\s*REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS,?\s*\}\s*from\s*"@\/types\/synastry-engine";?/m,
    `const REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS = ${runtimeCoverage};`,
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
    Intl,
    Math,
    Set,
    Map,
    Date,
  };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(transpiled, sandbox, { filename: "comparison-full-interpretation.runtime.cjs" });
  return sandbox.module.exports.buildFullComparisonInterpretation;
}

function point(id, label, longitude, signId = "aries", degreeInSign = longitude % 30) {
  return {
    id, label, kind: "planet", longitude, signId, degreeInSign,
    sourceMethod: "fixture", natalHouse: 1, sourceReliability: "calculated",
    motion: null, contactPolicy: "major-aspects-v1", houseOverlayPolicy: "derived-house-overlay-v1",
    requiresExactBirthTime: false, analysisEligible: true, analysisLimitation: null,
  };
}

function aspect(id, firstPlanetId, firstPlanetLabel, secondPlanetId, secondPlanetLabel, aspectId, aspectLabel, orb) {
  return { id, firstPlanetId, firstPlanetLabel, secondPlanetId, secondPlanetLabel, aspectId, aspectLabel, glyph: "", angle: 0, separation: 0, orb, meaning: "زمینهٔ natal", narrative: "یک الگوی natal واقعی که نحوهٔ پاسخ فرد به تماس بیرونی را تعدیل می‌کند." };
}

function signature(dominantElement, dominantModality, dominantExpression) {
  return {
    version: "chart-signature-v1", method: "equal-weight-major-planets",
    elementCounts: { fire: 4, earth: 2, air: 2, water: 2 },
    modalityCounts: { cardinal: 4, fixed: 3, mutable: 3 },
    expressionCounts: { active: 6, receptive: 4 },
    dominantElement, dominantModality, dominantExpression,
    lowElements: ["water"], lowModalities: ["mutable"], lowExpressions: [],
    zeroElements: [], zeroModalities: [], zeroExpressions: [],
    evidence: [{ placementId: "sun", signId: "aries", element: "fire", modality: "cardinal", expression: "active", weight: 1 }],
    excludedPlacementIds: [],
  };
}

function engineSnapshot(side, variant = 1) {
  const placements = side === "a"
    ? [point("sun", "خورشید", variant === 1 ? 10 : 22), point("moon", "ماه", 42, "taurus", 12), point("mercury", "عطارد", 68, "gemini", 8), point("venus", "زهره", 95, "cancer", 5), point("mars", "مریخ", 130, "leo", 10)]
    : [point("sun", "خورشید", 190, "libra", 10), point("moon", "ماه", 218, "scorpio", 8), point("mercury", "عطارد", 250, "sagittarius", 10), point("venus", "زهره", 280, "capricorn", 10), point("mars", "مریخ", 310, "aquarius", 10)];
  return {
    version: "real-engine-preview-v2", generatedAt: "2026-09-07T00:00:00.000Z", behavioralAudienceMode: "adult",
    cityLabel: side === "a" ? "تهران" : "شیراز", utcIso: "1999-01-01T00:00:00.000Z", ascendantLongitude: side === "a" ? 15 : 195,
    houseContext: { requestedSystem: "placidus", appliedSystem: "placidus", availability: "ready", unavailableReason: null, confidence: "calculated-cusps", ascendantMethod: "astronomy-engine-local-sidereal-time", ascendantLongitude: 15, firstHouseCuspLongitude: 15, cuspLongitudes: [], calculationMethod: "fixture", limitation: null },
    houseSystem: "placidus", houses: [], angles: {},
    calculationQuality: { status: "complete", houseSystemStatus: "production-grade", anglesStatus: "production-grade", retrogradeStatus: "calculated", nodesStatus: "calculated", lilithStatus: "calculated", limitations: [], warnings: [] },
    retrogrades: { status: "calculated", method: "fixture-motion", planetIds: side === "a" ? ["mercury"] : ["saturn"], limitation: null },
    lunarNodes: { status: "calculated", method: "mean-lunar-node-j2000-meeus-formula", nodeType: "mean", northNode: { id: "north-node", label: "North Node", longitude: 75, signId: "gemini", degreeInSign: 15, house: 3, method: "mean-lunar-node-j2000-meeus-formula", source: "calculated", reliability: "calculated", limitation: null }, southNode: { id: "south-node", label: "South Node", longitude: 255, signId: "sagittarius", degreeInSign: 15, house: 9, method: "mean-lunar-node-j2000-meeus-formula", source: "derived-opposition", reliability: "derived", limitation: null }, limitation: null },
    lilith: { status: "calculated", id: "black-moon-lilith", label: "Local True/Osculating Black Moon Lilith", longitude: 111, signId: "cancer", degreeInSign: 21, house: 4, method: "local-osculating-black-moon-lilith-from-validated-probe", modelId: "true-osculating-black-moon-lilith", lilithType: "local-true-osculating-black-moon-lilith", source: "astronomy-engine-geomoonstate-local-state-vector", reliability: "calculated", approvedForReportOutput: true, validationStatus: "independent-reference-fixtures-passed", validationReference: "swiss-ephemeris-2.10.03-offline-osculating-apogee", validationToleranceDegrees: 0.1, limitation: null },
    specialPoints: [
      { status: "calculated", id: "chiron", labelFa: "کایرون", labelEn: "Chiron", category: "core-special-point", visibility: "default-wheel", longitude: 140, signId: "leo", degreeInSign: 20, house: 5, method: "fixture", source: "fixture", reliability: "calculated", validationStatus: "independent-reference-fixtures-passed", provenance: { provider: "fixture", reference: null, validation: "fixture" } },
      { status: "calculated", id: "vertex", labelFa: "ورتکس", labelEn: "Vertex", category: "core-special-point", visibility: "default-wheel", longitude: 205, signId: "libra", degreeInSign: 25, house: 7, method: "fixture", source: "fixture", reliability: "calculated", validationStatus: "existing-formula-preserved", provenance: { provider: "fixture", reference: null, validation: "fixture" } },
      { status: "calculated", id: "juno", labelFa: "جونو", labelEn: "Juno", category: "advanced-body", visibility: "advanced-wheel", longitude: 300, signId: "aquarius", degreeInSign: 0, house: 11, method: "fixture", source: "fixture", reliability: "calculated", validationStatus: "local-regression-fixture-passed", provenance: { provider: "fixture", reference: null, validation: "fixture" } },
    ],
    specialistAstrology: {
      version: "fixture",
      fixedStars: { catalogueVersion: "fixture-stars-v1", stars: [], conjunctionCandidateOrbDegrees: 1.0, conjunctionCandidates: [{ starId: "regulus", starLabelFa: "قلب‌الاسد", starLabelEn: "Regulus", anchorId: "sun", anchorLabel: "خورشید", anchorClass: "core-angle-or-luminary", orbDegrees: 0.4, narrativeEligibleByContactOnly: false }], narrativePromotion: "deferred-to-slice4-relevance" },
      traditionalLots: { formulaSetVersion: "fixture-lots-v1", lots: [{ id: "fortune", labelFa: "سهم بخت", labelEn: "Fortune", formulaId: "fortune-day", tradition: "traditional", sect: "day", dayNightBehavior: "sect-reversing", longitude: 45, signId: "taurus", degreeInSign: 15, house: 2, houseSystemContext: "placidus-placement-only", wholeSignInterpretationApplied: false, source: "fixture" }, { id: "spirit", labelFa: "سهم روح", labelEn: "Spirit", formulaId: "spirit-day", tradition: "traditional", sect: "day", dayNightBehavior: "sect-reversing", longitude: 145, signId: "leo", degreeInSign: 25, house: 5, houseSystemContext: "placidus-placement-only", wholeSignInterpretationApplied: false, source: "fixture" }], houseInterpretationNote: "fixture" },
      asteroidLab: { catalogueVersion: "fixture", surface: "separate-search", mainReportPromotion: "not-automatic" },
    },
    chartSignature: side === "a" ? signature(variant === 1 ? "fire" : "earth", "cardinal", "active") : signature("water", "fixed", "receptive"),
    placements,
    aspects: side === "a" ? [aspect("a1", "moon", "ماه", "saturn", "زحل", "square", "تربیع", 1.2)] : [aspect("b1", "mercury", "عطارد", "venus", "زهره", "trine", "تثلیث", 1.0)],
    aspectHighlights: [], note: "fixture",
  };
}

function coverage() {
  return Object.fromEntries(coverageFields.map((field) => [field, { field, dataState: "preserved", interpretationState: "pending-slice2", reason: null }]));
}

function snapshot(side, variant = 1) {
  const eng = engineSnapshot(side, variant);
  return {
    contractVersion: "real-synastry-v2", chartId: side === "a" ? `chart-a-${variant}` : "chart-b", label: side === "a" ? "آراد" : "هاله",
    natalSnapshotVersion: eng.version, natalGeneratedAt: eng.generatedAt, birthTimeStatus: "exact", chartRulerId: "mars", chartRulerMethod: "traditional-ruler-from-ascendant",
    engineParityVersion: "real-engine-synastry-parity-v1", engineSnapshot: eng, engineCoverage: coverage(), points: eng.placements,
    placements: eng.placements, angles: [], houses: [], houseSystem: "placidus", limitations: [],
  };
}

function contact(id, a, b, polarity, categories, relevanceScore, aspectId = "trine") {
  return {
    id, canonicalKey: `${a.id}:${b.id}:${aspectId}`, pointA: { ...a, chartSide: "a", chartId: "chart-a-1" }, pointB: { ...b, chartSide: "b", chartId: "chart-b" },
    aspectId, aspectLabel: aspectId === "square" ? "تربیع" : "تثلیث", angle: aspectId === "square" ? 90 : 120, separation: aspectId === "square" ? 91.2 : 119.1, orb: aspectId === "square" ? 1.2 : 0.9, allowedOrb: 5,
    polarity, categories, relevanceScore, evidence: ["fixture"], titleFa: `${a.label} و ${b.label}`, readingFa: "fixture reading", growthFa: "fixture growth",
  };
}

function report(variant = 1, context = "romantic") {
  const a = snapshot("a", variant); const b = snapshot("b", variant);
  const contacts = variant === 1
    ? [contact("c1", a.placements[2], b.placements[2], "supportive", ["communication", "personal-planet"], 91), contact("c2", a.placements[1], b.placements[4], "tension", ["closeness", "personal-planet"], 82, "square"), contact("c3", a.placements[3], b.placements[4], "supportive", ["closeness"], 76)]
    : [contact("c4", a.placements[0], b.placements[0], "tension", ["luminary"], 88, "square"), contact("c5", a.placements[4], b.placements[1], "supportive", ["closeness"], 70)];
  const houseOverlays = [{ id: `o-${variant}-8`, direction: "a-in-b", sourceChartSide: "a", sourceChartId: a.chartId, sourcePointId: "venus", sourcePointLabel: "زهره", targetChartSide: "b", targetChartId: b.chartId, targetHouse: 8, targetHouseSystem: "placidus", relevanceScore: 70, readingFa: "fixture overlay" }];
  return { contractVersion: "real-synastry-v2", generatedAt: "2026-09-07T00:00:00Z", relationshipContext: context, chartA: a, chartB: b, contacts, supportivePatterns: [], tensionPatterns: [], houseOverlays, dynamics: { communicationFa: "", closenessIndependenceFa: "", evidenceContactIds: [] }, synthesis: { writerVersion: "real-synastry-persian-v1", titleFa: "", openingFa: "", wholePairFa: "", supportiveFa: "", tensionFa: "", communicationFa: "", closenessIndependenceFa: "", limitationFa: "" }, biWheel: { version: "synastry-bi-wheel-v1", innerChartSide: "a", outerChartSide: "b", innerPoints: [], outerPoints: [], aspectLines: [] }, quality: { status: "complete", planetToPlanetAvailable: true, angleContactsAvailable: true, houseOverlaysAvailable: true, contactCount: contacts.length, supportivePatternCount: 0, tensionPatternCount: 0, limitations: [] } };
}

try {
  const build = loadProductionBuilder();
  assert(typeof build === "function", "Could not load production buildFullComparisonInterpretation");
  const contexts = ["romantic", "friendship", "family", "work", "general"];
  const openings = new Map();
  for (const context of contexts) {
    const result = build(report(1, context), { labels: { a: "آراد", b: "هاله" }, chartABirthTimeStatus: "exact", chartBBirthTimeStatus: "exact", fallbackOverviewParagraphsFa: ["fallback", "fallback"] });
    assert(result.openingParagraphsFa.length === 2, `${context}: opening is not exactly two paragraphs`);
    const wordCount = result.openingParagraphsFa.join(" ").trim().split(/\s+/u).filter(Boolean).length;
    assert(wordCount >= 160 && wordCount <= 240, `${context}: opening word count ${wordCount} is outside 160-240`);
    assert(result.openingEvidence.length >= 6 && result.openingEvidence.every((item) => item.evidenceIds.length > 0), `${context}: opening evidence is incomplete`);
    assert(result.contacts.length === report(1, context).contacts.length, `${context}: not every calculated contact is interpreted`);
    assert(result.overlays.length === report(1, context).houseOverlays.length, `${context}: not every eligible overlay is interpreted`);
    assert(result.coverage.length === coverageFields.length, `${context}: interpretation coverage is not exhaustive`);
    openings.set(context, result.openingParagraphsFa.join("\n"));
    if (context === "work") {
      const house8 = result.overlays.find((item) => item.id.includes("-8"));
      assert(Boolean(house8), "work: house 8 overlay missing");
      assert(!/(صمیمیت جنسی|کشش جنسی)/u.test(house8?.contextFa ?? ""), "work: house 8 uses romantic/sexual copy");
      assert(/منابع مشترک|محرمانگی|اختیار|ریسک/u.test(house8?.contextFa ?? ""), "work: house 8 lacks work-specific shared-resource context");
    }
  }
  assert(new Set(openings.values()).size === contexts.length, "Relationship contexts do not produce distinct openings");
  const pair1 = build(report(1, "romantic"), { labels: { a: "آراد", b: "هاله" }, chartABirthTimeStatus: "exact", chartBBirthTimeStatus: "exact" });
  const pair2 = build(report(2, "romantic"), { labels: { a: "آراد", b: "هاله" }, chartABirthTimeStatus: "exact", chartBBirthTimeStatus: "exact" });
  assert(pair1.fingerprint !== pair2.fingerprint, "Materially different pairs produced the same narrative fingerprint");
  assert(pair1.openingParagraphsFa.join(" ") !== pair2.openingParagraphsFa.join(" "), "Materially different pairs produced identical openings");
  const layerIds = new Set(pair1.deepLayers.map((item) => item.id));
  for (const required of ["lunar-nodes", "special-points", "fixed-stars", "traditional-lots", "retrogrades", "chart-signatures", "natal-aspects"]) {
    assert(layerIds.has(required), `Deep interpretation layer missing: ${required}`);
  }
  assert(pair1.deepLayers.find((layer) => layer.id === "fixed-stars")?.items.length === 2, "Fixed-star conjunction candidates from both charts are not all explained");
  assert(pair1.deepLayers.find((layer) => layer.id === "traditional-lots")?.items.length === 4, "Traditional lots from both charts are not all explained");
  assert(!pair1.contacts.some((item) => /north-node|chiron|black-moon-lilith|fixed-star/u.test(item.id)), "Fixture unexpectedly fabricated advanced inter-chart contacts");
} catch (error) {
  failures.push(`Runtime fixture suite crashed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
}

if (failures.length > 0) {
  console.error("HALLEUS compare full interpretation guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5_GUARD=PASS");
console.log(`REAL_ENGINE_COVERAGE_FIELDS=${coverageFields.length}`);
console.log("OPENING_TWO_PARAGRAPHS_160_240=PASS");
console.log("PAIR_UNIQUENESS=PASS");
console.log("RELATIONSHIP_CONTEXTS=5_PASS");
console.log("ALL_CONTACTS_INTERPRETED=PASS");
console.log("ALL_OVERLAYS_INTERPRETED=PASS");
console.log("HOUSE8_WORK_CONTEXT=PASS");
console.log("DEEP_LAYERS=PASS");
console.log("ADVANCED_INTERCHART_ORBS_GUESSED=FALSE");