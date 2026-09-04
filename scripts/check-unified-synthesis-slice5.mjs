// HALLEUS_R39_NARRATIVE_RECOMPOSITION_EVIDENCE_HYGIENE_R3_20260902
// HALLEUS_R39_DIRECT_CERTAINTY_GUARD_RECONCILIATION_R3_20260902
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const plannerPath = path.join(root, "lib/astrology/adaptive-report-planner.ts");
const relevancePath = path.join(root, "lib/astrology/advanced-relevance-engine.ts");
const synthesisPath = path.join(root, "lib/astrology/unified-story-synthesis.ts");

for (const file of [plannerPath, relevancePath, synthesisPath]) {
  if (!fs.existsSync(file)) throw new Error(`Missing Slice 5 source: ${file}`);
}

const planner = fs.readFileSync(plannerPath, "utf8");
const relevance = fs.readFileSync(relevancePath, "utf8");
const synthesis = fs.readFileSync(synthesisPath, "utf8");

for (const marker of [
  "HALLEUS_UNIFIED_SYNTHESIS_SLICE5_20260901",
  "buildUnifiedStorySynthesis({",
  "chooseTopStories(unifiedSynthesis.storyCandidates)",
  "unifiedSynthesis: unifiedSynthesis.diagnostics",
  'for (const id of ["mercury", "mars", "venus"])',
  "consumedTopAspectIds",
]) {
  if (!planner.includes(marker)) throw new Error(`Slice 5 planner marker missing: ${marker}`);
}

if (!planner.includes('| "advanced-pattern";')) {
  throw new Error("Slice 5 advanced standalone story kind is missing.");
}
if (planner.includes('for (const id of ["mercury", "mars", "venus", "chiron"')) {
  throw new Error("Core placement section was expanded with advanced points.");
}
if (!relevance.includes('detail: `${formatReportAspectDisplay(aspect.aspectId)} · اورب')) {
  throw new Error("Advanced special-point evidence is not using the shared aspect display authority.");
}
if (!relevance.includes('detail: `☌ ۰° · اورب')) {
  throw new Error("Fixed-star evidence is not using conjunction symbol/degree display.");
}
if (/detail:\s*`(?:conjunction|sextile|square|trine|opposition)\b/u.test(relevance)) {
  throw new Error("Deprecated English aspect terminology leaked into advanced evidence detail.");
}

for (const prohibited of ["طلاق می‌گیری", "حتماً خیانت", "مورد سوءاستفاده قرار گرفته‌ای", "حتماً رخ می‌دهد", "در ۳۱ سالگی"]) {
  if (synthesis.includes(prohibited)) {
    throw new Error(`Unsafe deterministic prediction language in Slice 5 synthesis: ${prohibited}`);
  }
}

const transpiled = ts.transpileModule(synthesis, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
  fileName: synthesisPath,
});
const errors = (transpiled.diagnostics ?? []).filter(
  (item) => item.category === ts.DiagnosticCategory.Error,
);
if (errors.length > 0) {
  throw new Error(
    `Slice 5 synthesis transpile failed: ${errors
      .map((item) => ts.flattenDiagnosticMessageText(item.messageText, " "))
      .join(" | ")}`,
  );
}
const loadedModule = { exports: {} };
new Function("exports", "module", transpiled.outputText)(loadedModule.exports, loadedModule);
const { buildUnifiedStorySynthesis } = loadedModule.exports;
if (typeof buildUnifiedStorySynthesis !== "function") {
  throw new Error("Slice 5 synthesis function did not load from transpiled module.");
}

function story(key, title, score, planets, houses = [7]) {
  return {
    anchorId: key,
    kind: "aspect",
    semanticKey: key,
    title,
    summary: "ممکن است این موضوع در بعضی تصمیم‌هایت دیده شود.",
    dailyLife: "وقتی چند نیاز هم‌زمان فعال می‌شوند، انتخاب روشن‌تر مهم می‌شود.",
    healthyExpression: "دو نیاز را هم‌زمان ببین.",
    friction: "یک سمت ماجرا می‌تواند همه فضا را بگیرد.",
    action: "دو نیاز فعال را جدا نام ببر.",
    score,
    sourcePlanetIds: planets,
    sourceAspectIds: [`${key}-aspect`],
    sourceHouseIds: houses,
    sourcePatternId: null,
    sourceNodeIds: [],
    rankingReasons: [],
    evidenceRefs: [
      {
        id: `${key}-evidence`,
        kind: "aspect",
        sourceIds: [...planets, `${key}-aspect`],
        label: title,
        detail: "☍ ۱۸۰° · اورب ۱°",
      },
    ],
    absorbedSemanticKeys: [],
  };
}

function evidence({
  id,
  objectId,
  targetId,
  score,
  decision,
  storyKey,
  tags,
  shared,
}) {
  return {
    id,
    evidenceKind: "special-point-aspect",
    objectIds: [objectId],
    sourceIds: [objectId, targetId],
    label: `${objectId} · ${targetId}`,
    detail: "☌ ۰° · اورب ۰٫۵°",
    score,
    decision,
    matchedStorySemanticKey: storyKey,
    themeTags: tags,
    sharedThemeTags: shared,
    orbDegrees: 0.5,
    aspectId: "conjunction",
    reasons: ["fixture"],
  };
}

function relevancePlan(decisions) {
  return {
    version: "advanced-relevance-v1-20260901",
    policyVersion: "advanced-point-aware-orbs-v1-20260901",
    birthTimeReliable: true,
    decisions,
    storyAdjustments: [],
    counts: {
      merge: decisions.filter((item) => item.decision === "merge").length,
      support: decisions.filter((item) => item.decision === "support").length,
      standalone: decisions.filter((item) => item.decision === "standalone").length,
      suppress: decisions.filter((item) => item.decision === "suppress").length,
    },
    asteroidLabAutoPromotion: false,
    traditionalLotModernAspectDoctrineApplied: false,
    fixedStarPolicy: "conjunction-only-tight-filter",
    notes: [],
  };
}

const strong = buildUnifiedStorySynthesis({
  stories: [
    story("freedom", "زهره و اورانوس — آزادی و نزدیکی", 120, ["venus", "uranus"]),
    story("commitment", "زحل و زهره — مرز در رابطه", 112, ["saturn", "venus"]),
  ],
  relevance: relevancePlan([
    evidence({
      id: "juno-venus",
      objectId: "juno",
      targetId: "venus",
      score: 88,
      decision: "merge",
      storyKey: "freedom",
      tags: ["commitment", "relationship", "freedom"],
      shared: ["commitment", "relationship"],
    }),
    evidence({
      id: "juno-saturn",
      objectId: "juno",
      targetId: "saturn",
      score: 84,
      decision: "merge",
      storyKey: "commitment",
      tags: ["commitment", "relationship", "freedom"],
      shared: ["commitment", "relationship"],
    }),
  ]),
});

if (strong.diagnostics.mergedExistingStoryCount !== 1) {
  throw new Error("Slice 5 failed to merge two old stories connected by the same strong advanced factor/theme.");
}
if (strong.storyCandidates.length !== 1) {
  throw new Error("Merged Slice 5 fixture still has duplicate primary story candidates.");
}
const strongStory = strong.storyCandidates[0];
if (strongStory.title !== "جونو، زهره، اورانوس — تعهد و آزادی") {
  throw new Error(`Strong advanced title composition failed: ${strongStory.title}`);
}
// HALLEUS_R39_STRONG_TONE_RECONCILIATION_R7_20260901
if (!(strongStory.summary.includes("جونو") && strongStory.summary.includes("تعهد") && strongStory.summary.includes("مستقیم"))) {
  throw new Error(`Strong evidence did not receive direct certainty language: ${strongStory.summary}`);
}
if (/^(?:ممکن است|شاید|گاهی|احتمال دارد)/u.test(strongStory.summary)) {
  throw new Error("Strong evidence retained hedged opening language.");
}
if (!strongStory.dailyLife.includes("در رابطه‌ها این موضوع در دوره‌های مختلف دوباره پررنگ می‌شود")) {
  throw new Error("Strong recurring-theme evidence did not receive bounded predictive synthesis.");
}
if (strongStory.title.split(" — ")[0].split("،").length > 3) {
  throw new Error("Strong title exceeded three astrological factors.");
}

const mediumTitle = "زهره و اورانوس — آزادی و نزدیکی";
const medium = buildUnifiedStorySynthesis({
  stories: [story("medium", mediumTitle, 120, ["venus", "uranus"])],
  relevance: relevancePlan([
    evidence({
      id: "juno-medium",
      objectId: "juno",
      targetId: "venus",
      score: 60,
      decision: "support",
      storyKey: "medium",
      tags: ["commitment", "relationship", "freedom"],
      shared: ["relationship"],
    }),
  ]),
});
if (medium.storyCandidates[0].title !== mediumTitle) {
  throw new Error("Medium support incorrectly changed an existing story title.");
}
if (medium.storyCandidates[0].dailyLife.includes("در دوره‌های مختلف دوباره")) {
  throw new Error("Medium support incorrectly received strong predictive language.");
}

const standalone = buildUnifiedStorySynthesis({
  stories: [],
  relevance: relevancePlan([
    evidence({
      id: "chiron-moon",
      objectId: "chiron",
      targetId: "moon",
      score: 90,
      decision: "standalone",
      storyKey: null,
      tags: ["security", "self-worth", "sensitivity"],
      shared: [],
    }),
    evidence({
      id: "weak-juno",
      objectId: "juno",
      targetId: "venus",
      score: 48,
      decision: "suppress",
      storyKey: null,
      tags: ["relationship"],
      shared: [],
    }),
  ]),
});
if (standalone.diagnostics.standaloneAdvancedStoryCount !== 1) {
  throw new Error("Strong standalone advanced evidence was not promoted exactly once.");
}
if (standalone.storyCandidates.some((item) => item.anchorId.includes("weak-juno"))) {
  throw new Error("Weak advanced evidence was promoted into primary narrative.");
}
if (standalone.diagnostics.corePlacementExpansion !== false) {
  throw new Error("Slice 5 diagnostics indicate core placement expansion.");
}
if (standalone.diagnostics.weakAdvancedPromotion !== false) {
  throw new Error("Slice 5 diagnostics indicate weak advanced promotion.");
}

console.log("Slice 5 unified synthesis guard passed.");
console.log("- strong advanced evidence can retitle an existing story with max three astrology factors");
console.log("- the same strong advanced factor can reveal and merge two overlapping old stories");
console.log("- medium evidence stays supporting evidence without forced title/prediction changes");
console.log("- strong distinct advanced evidence can stand alone; weak evidence remains suppressed");
console.log("- predictive language stays recurring-theme/modest and core placement chapters do not expand");


{
  // HALLEUS_R39_ADVANCED_BODY_NARRATIVE_SEMANTICS_GUARD_R3_20260902
  // HALLEUS_R39_ADVANCED_BODY_NARRATIVE_SEMANTICS_GUARD_R5_20260902
  const r39AdvancedBodyNarrativeMarkers = [
    "HALLEUS_R39_ADVANCED_BODY_NARRATIVE_SEMANTICS_R3_20260902",
    "HALLEUS_R39_ADVANCED_BODY_NARRATIVE_SEMANTICS_R5_20260902",
    "applyAdvancedBodyNarrativeSemanticsToStory",
    "storyCandidates: storyCandidates.map(",
    'id: "ceres"',
    'id: "pallas"',
    'id: "juno"',
    'id: "vesta"',
    'id: "chiron"',
    'id: "eris"',
    'id: "pholus"',
    'id: "nessus"',
  ];

  for (const marker of r39AdvancedBodyNarrativeMarkers) {
    if (!synthesis.includes(marker)) {
      throw new Error(
        "R39 advanced-body narrative semantics marker missing: " + marker,
      );
    }
  }
}

{
  // HALLEUS_R39_RECOMPOSITION_UNIFIED_GUARD_R1_20260902
  const requiredNarrativeRecompositionMarkers = [
    "HALLEUS_R39_TRUE_SYNTHESIS_RECOMPOSITION_R1_20260902",
    'story.kind !== "cluster"',
    "composeAdvancedBodyNarrative",
    "applyAdvancedBodyNarrativeSemanticsToStory",
  ];

  for (const marker of requiredNarrativeRecompositionMarkers) {
    if (!synthesis.includes(marker)) {
      throw new Error(
        "Narrative recomposition synthesis marker missing: " + marker,
      );
    }
  }
}
