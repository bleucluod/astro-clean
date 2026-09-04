import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

const engineFile = "lib/astrology/advanced-relevance-engine.ts";
const plannerFile = "lib/astrology/adaptive-report-planner.ts";
const source = read(engineFile);
const planner = read(plannerFile);

for (const marker of [
  "advanced-relevance-v1-20260901",
  "advanced-point-aware-orbs-v1-20260901",
  "chiron-tight-major-aspects",
  "fortune-vertex-tight-axis",
  "main-asteroids-moderate",
  "slow-catalyst-boundary-tight",
  "minor-asteroid-lab-only",
  "traditionalLotModernAspectDoctrineApplied: false",
  "asteroidLabAutoPromotion: false",
]) {
  assert(source.includes(marker), `Slice 4 relevance engine missing marker: ${marker}`);
}

for (const marker of [
  'from "@/lib/astrology/advanced-relevance-engine"',
  "advancedRelevance: AdvancedRelevancePlan;",
  "const storyCandidates: AdaptiveNarrativeAnchor[] = [",
  "buildAdvancedRelevancePlan({",
  "const relevanceAwareCandidates = storyCandidates.map",
  "advancedRelevance,",
  "advanced relevance evidence lost source provenance",
]) {
  assert(planner.includes(marker), `Adaptive planner missing Slice 4 integration marker: ${marker}`);
}

assert(
  planner.includes("const topStories = chooseTopStories(relevanceAwareCandidates)") ||
    (
      planner.includes("buildUnifiedStorySynthesis({") &&
      planner.includes("stories: relevanceAwareCandidates") &&
      planner.includes("chooseTopStories(unifiedSynthesis.storyCandidates)")
    ),
  "Adaptive planner lost Slice 4 relevance-aware top-story selection.",
);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "halleus-slice4-relevance-"));
const displayFile = "lib/astrology/report-aspect-display.ts";
const displaySource = read(displayFile);
const displayCompiled = path.join(tmpDir, "report-aspect-display.cjs");
const displayOutput = ts.transpileModule(displaySource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
  fileName: displayFile,
});
const displayDiagnostics = displayOutput.diagnostics ?? [];
assert(
  displayDiagnostics.length === 0,
  `Report aspect display transpile diagnostics: ${displayDiagnostics.map((item) => item.messageText).join(" | ")}`,
);
assert(
  !displayOutput.outputText.includes('require("@/'),
  "Report aspect display guard dependency still contains an unresolved runtime alias.",
);
fs.writeFileSync(displayCompiled, displayOutput.outputText, "utf8");

const compiled = path.join(tmpDir, "advanced-relevance-engine.cjs");
const runtimeSource = source.replace(
  'from "@/lib/astrology/report-aspect-display"',
  'from "./report-aspect-display.cjs"',
);
assert(
  runtimeSource !== source,
  "Slice 4 guard could not rewrite the report-aspect-display runtime alias.",
);
const output = ts.transpileModule(runtimeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
  fileName: engineFile,
});
const diagnostics = output.diagnostics ?? [];
assert(
  diagnostics.length === 0,
  `Slice 4 relevance engine transpile diagnostics: ${diagnostics.map((item) => item.messageText).join(" | ")}`,
);
assert(
  !output.outputText.includes('require("@/'),
  "Slice 4 relevance engine guard bundle still contains an unresolved runtime alias.",
);
fs.writeFileSync(compiled, output.outputText, "utf8");
const engine = require(compiled);

assert(
  engine.evaluateAdvancedAspectCandidate({
    objectId: "ceres",
    aspectId: "conjunction",
    orbDegrees: 2.49,
  }).accepted === true,
  "Ceres 2.49 degree candidate should be inside Slice 4 policy.",
);
assert(
  engine.evaluateAdvancedAspectCandidate({
    objectId: "ceres",
    aspectId: "conjunction",
    orbDegrees: 2.51,
  }).accepted === false,
  "Ceres 2.51 degree candidate should be outside Slice 4 policy.",
);
assert(
  engine.evaluateAdvancedAspectCandidate({
    objectId: "eris",
    aspectId: "opposition",
    orbDegrees: 1.24,
  }).accepted === true,
  "Eris 1.24 degree candidate should be inside Slice 4 policy.",
);
assert(
  engine.evaluateAdvancedAspectCandidate({
    objectId: "eris",
    aspectId: "opposition",
    orbDegrees: 1.26,
  }).accepted === false,
  "Eris 1.26 degree candidate should be outside Slice 4 policy.",
);
const minorPolicy = engine.getAdvancedAspectPolicy("minor-asteroid");
assert(minorPolicy?.maxOrbDegrees === 1.25, "Minor asteroid candidate orb must be 1.25 degrees.");
assert(minorPolicy?.standaloneEligible === false, "Minor asteroid must never auto-standalone.");

const decisionFixtures = [
  [
    "merge",
    engine.classifyAdvancedStoryDecision({
      score: 86,
      sharedThemeCount: 2,
      hasStoryMatch: true,
      standaloneEligible: true,
      evidenceKind: "special-point-aspect",
    }),
  ],
  [
    "support",
    engine.classifyAdvancedStoryDecision({
      score: 61,
      sharedThemeCount: 1,
      hasStoryMatch: true,
      standaloneEligible: true,
      evidenceKind: "special-point-aspect",
    }),
  ],
  [
    "standalone",
    engine.classifyAdvancedStoryDecision({
      score: 90,
      sharedThemeCount: 0,
      hasStoryMatch: false,
      standaloneEligible: true,
      evidenceKind: "special-point-aspect",
    }),
  ],
  [
    "suppress",
    engine.classifyAdvancedStoryDecision({
      score: 45,
      sharedThemeCount: 0,
      hasStoryMatch: false,
      standaloneEligible: true,
      evidenceKind: "special-point-aspect",
    }),
  ],
];
for (const [expected, actual] of decisionFixtures) {
  assert(actual === expected, `Expected ${expected} decision, got ${actual}.`);
}

const sharedStory = {
  semanticKey: "house:2-8-security",
  score: 101,
  sourcePlanetIds: ["venus"],
  sourceHouseIds: [2, 8],
  sourceAspectIds: [],
};

const baseReport = {
  input: {
    birthTimeAccuracy: "known",
  },
  realEngine: {
    placements: [
      {
        id: "sun",
        label: "Sun",
        longitude: 320,
        signId: "aquarius",
        degreeInSign: 20,
        house: 6,
        method: "fixture",
      },
      {
        id: "venus",
        label: "Venus",
        longitude: 40,
        signId: "taurus",
        degreeInSign: 10,
        house: 8,
        method: "fixture",
      },
    ],
    angles: {
      asc: {
        id: "asc",
        label: "ASC",
        longitude: 170,
        signId: "virgo",
        degreeInSign: 20,
        source: "calculated",
        reliability: "calculated",
        method: "fixture",
        house: 1,
        limitation: null,
      },
      mc: {
        id: "mc",
        label: "MC",
        longitude: 80,
        signId: "gemini",
        degreeInSign: 20,
        source: "calculated",
        reliability: "calculated",
        method: "fixture",
        house: 10,
        limitation: null,
      },
    },
    specialPoints: [
      {
        status: "calculated",
        id: "chiron",
        labelFa: "Chiron-FA",
        labelEn: "Chiron",
        category: "advanced-body",
        visibility: "advanced-wheel",
        longitude: 210,
        signId: "scorpio",
        degreeInSign: 0,
        house: 2,
        method: "fixture",
        source: "fixture",
        reliability: "calculated",
        validationStatus: "independent-reference-fixtures-passed",
        provenance: { provider: "fixture", reference: null, validation: "fixture" },
      },
      {
        status: "calculated",
        id: "juno",
        labelFa: "Juno-FA",
        labelEn: "Juno",
        category: "advanced-body",
        visibility: "advanced-wheel",
        longitude: 30,
        signId: "taurus",
        degreeInSign: 0,
        house: 8,
        method: "fixture",
        source: "fixture",
        reliability: "calculated",
        validationStatus: "independent-reference-fixtures-passed",
        provenance: { provider: "fixture", reference: null, validation: "fixture" },
      },
    ],
    specialistAstrology: {
      version: "fixture",
      fixedStars: {
        catalogueVersion: "fixture",
        stars: [],
        conjunctionCandidateOrbDegrees: 1,
        conjunctionCandidates: [],
        narrativePromotion: "deferred-to-slice4-relevance",
      },
      traditionalLots: {
        formulaSetVersion: "fixture",
        lots: [],
        houseInterpretationNote: "fixture",
      },
      asteroidLab: {
        catalogueVersion: "fixture",
        surface: "separate-search",
        mainReportPromotion: "not-automatic",
        selectedAsteroid: {
          id: "1181",
          name: "Lilith",
        },
      },
    },
  },
};

const mergePlan = engine.buildAdvancedRelevancePlan({
  report: baseReport,
  storyCandidates: [sharedStory],
  chartRulerId: "mercury",
});
const pairDecision = mergePlan.decisions.find(
  (item) =>
    item.evidenceKind === "special-point-aspect" &&
    item.sourceIds.includes("chiron") &&
    item.sourceIds.includes("juno"),
);
assert(pairDecision, "Chiron/Juno pair evidence was not produced.");
assert(pairDecision.aspectId === "opposition", "Chiron/Juno fixture must be recognized as opposition.");
assert(pairDecision.orbDegrees === 0, "Chiron/Juno fixture should have zero-degree orb.");
assert(pairDecision.decision === "merge", `Chiron/Juno fixture should merge, got ${pairDecision.decision}.`);
for (const tag of ["security", "value", "intimacy", "trust"]) {
  assert(pairDecision.themeTags.includes(tag), `Chiron/Juno theme graph missing ${tag}.`);
}
assert(
  mergePlan.storyAdjustments.some(
    (item) =>
      item.semanticKey === sharedStory.semanticKey &&
      item.absorbedEvidenceIds.includes(pairDecision.id),
  ),
  "Merged advanced evidence was not absorbed into the existing story adjustment.",
);
assert(mergePlan.asteroidLabAutoPromotion === false, "Asteroid Lab must remain outside automatic report promotion.");
assert(
  !mergePlan.decisions.some((item) => item.sourceIds.includes("1181")),
  "Asteroid Lab selection leaked into main-report relevance.",
);

const starReport = structuredClone(baseReport);
starReport.realEngine.specialPoints = [];
starReport.realEngine.specialistAstrology.fixedStars.conjunctionCandidates = [
  {
    starId: "regulus",
    starLabelFa: "Regulus-FA",
    starLabelEn: "Regulus",
    anchorId: "sun",
    anchorLabel: "Sun",
    anchorClass: "core-angle-or-luminary",
    orbDegrees: 0.42,
    narrativeEligibleByContactOnly: false,
  },
];
starReport.realEngine.specialistAstrology.traditionalLots.lots = [
  {
    id: "spirit",
    labelFa: "Spirit-FA",
    labelEn: "Spirit",
    formulaId: "fixture-formula",
    tradition: "fixture-tradition",
    sect: "day",
    dayNightBehavior: "sect-reversing",
    longitude: 40,
    signId: "taurus",
    degreeInSign: 10,
    house: 8,
    houseSystemContext: "placidus-placement-only",
    wholeSignInterpretationApplied: false,
    source: "fixture",
  },
];
const starPlan = engine.buildAdvancedRelevancePlan({
  report: starReport,
  storyCandidates: [
    {
      semanticKey: "sun-identity",
      score: 90,
      sourcePlanetIds: ["sun"],
      sourceHouseIds: [6],
      sourceAspectIds: [],
    },
    sharedStory,
  ],
  chartRulerId: "mercury",
});
const fixedStarDecision = starPlan.decisions.find(
  (item) => item.evidenceKind === "fixed-star-conjunction",
);
assert(fixedStarDecision, "Tight fixed-star conjunction should produce relevance evidence.");
assert(fixedStarDecision.aspectId === "conjunction", "Fixed-star policy must be conjunction-only.");
assert(fixedStarDecision.decision !== "standalone", "Fixed star must not become standalone in Slice 4.");
const lotDecision = starPlan.decisions.find((item) => item.evidenceKind === "traditional-lot");
assert(lotDecision, "Traditional Lot placement evidence should be evaluated.");
assert(lotDecision.aspectId === null, "Traditional Lots must not receive automatic modern aspects.");
assert(["support", "suppress"].includes(lotDecision.decision), "Traditional Lots must default to Support/Suppress in reconciliation.");
assert(lotDecision.score <= 68, "Traditional Lot narrative relevance must stay capped at 68.");
assert(!lotDecision.detail.includes(lotDecision.id.replace("advanced:lot:", "")), "Traditional Lot narrative detail must not expose raw formula identifiers.");
assert(lotDecision.detail.includes("جزئیات فنی"), "Traditional Lot narrative detail should defer formula context to technical data.");
assert(!starPlan.storyAdjustments.some((item) => item.rankingReasons.some((reason) => reason.includes("advanced evidence item"))), "Story adjustments must not expose English advanced-evidence debug copy.");
assert(
  starPlan.traditionalLotModernAspectDoctrineApplied === false,
  "Traditional Lot modern-aspect doctrine flag must stay false.",
);

const noStarReport = structuredClone(starReport);
noStarReport.realEngine.specialistAstrology.fixedStars.conjunctionCandidates = [];
const noStarPlan = engine.buildAdvancedRelevancePlan({
  report: noStarReport,
  storyCandidates: [sharedStory],
  chartRulerId: "mercury",
});
assert(
  noStarPlan.decisions.every((item) => item.evidenceKind !== "fixed-star-conjunction"),
  "No-contact fixed-star fixture should produce no fixed-star evidence.",
);

const uncertainReport = structuredClone(baseReport);
uncertainReport.input.birthTimeAccuracy = "unknown";
uncertainReport.realEngine.specialPoints = [
  {
    ...uncertainReport.realEngine.specialPoints[0],
    longitude: 170,
  },
];
const uncertainPlan = engine.buildAdvancedRelevancePlan({
  report: uncertainReport,
  storyCandidates: [sharedStory],
  chartRulerId: "mercury",
});
assert(uncertainPlan.birthTimeReliable === false, "Unknown birth time must lower reliability context.");
assert(
  !uncertainPlan.decisions.some((item) =>
    item.sourceIds.some((id) => ["asc", "mc", "dsc", "ic"].includes(id)),
  ),
  "Unknown birth time must not create angle-derived advanced evidence.",
);

const validSnapshotSourceIds = new Set([
  ...baseReport.realEngine.placements.map((item) => item.id),
  ...baseReport.realEngine.specialPoints.map((item) => item.id),
  "asc",
  "mc",
  "regulus",
  "lot:spirit",
]);
for (const item of [...mergePlan.decisions, ...starPlan.decisions]) {
  assert(item.sourceIds.length > 0, `Advanced evidence ${item.id} has no source provenance.`);
  for (const sourceId of item.sourceIds) {
    assert(
      validSnapshotSourceIds.has(sourceId),
      `Advanced evidence ${item.id} invented source id ${sourceId}.`,
    );
  }
}

console.log("Slice 4 advanced relevance guard passed.");
console.log("- point-aware orb cutoffs enforce inside/outside boundaries");
console.log("- Chiron/Juno security-value-intimacy-trust evidence merges into one existing story");
console.log("- fixed stars are tight conjunction-only support/merge evidence, never automatic standalone");
console.log("- traditional Lots remain formula-context placement evidence without automatic modern aspect doctrine");
console.log("- Asteroid Lab remains separate and unknown birth time excludes angle-derived advanced evidence");
