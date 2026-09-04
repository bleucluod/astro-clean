// HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE4_FAILURESET_R2_20260903
// HALLEUS_REPORT_EDITORIAL_COHESION_GUARD_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_FINAL_VISUAL_LANGUAGE_RECONCILIATION_R4_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_FINAL_VISUAL_LANGUAGE_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_FAILURESET_REPAIR_R7_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_GUARD_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_WHOLE_REPORT_GUARD_R1_20260903
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(repoRoot, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        strict: true,
      },
      reportDiagnostics: true,
      fileName: filename,
    });
    const errors = (result.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    if (errors.length > 0) {
      throw new Error(
        `${path.relative(repoRoot, filename)} transpile errors: ${errors
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
          .join(" | ")}`,
      );
    }
    module._compile(result.outputText, filename);
  };
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
}

const surface = require(path.join(repoRoot, "lib/astrology/report-surface-language-planner.ts"));
const {
  REPORT_NARRATIVE_FACET_OWNERSHIP,
  REPORT_SURFACE_PATTERNS,
  analyzeReportNarrativeRepetition,
  getReportSurfacePatternCount,
  joinReportNarrativeSentences,
  planReportSurfaceSequence,
  realizeReportSurfaceText,
  normalizeReportNarrativeForSurface,
} = surface;
const placementMatrix = require(path.join(repoRoot, "lib/astrology/placement-narrative-semantic-matrix.ts"));
const { buildCanonicalHouseNarrative, buildCanonicalPlacementNarrative } = placementMatrix;

assert(getReportSurfacePatternCount() >= 40 && getReportSurfacePatternCount() <= 60, "surface planner must expose 40-60 approved patterns");
assert(getReportSurfacePatternCount() === 50, "Slice 5 surface planner target must stay at 50 approved patterns");
for (const purpose of ["thesis", "scene", "strength", "friction", "development"]) {
  const rows = REPORT_SURFACE_PATTERNS.filter((pattern) => pattern.purpose === purpose);
  assert(rows.length === 10, `${purpose} must have exactly ten approved surface patterns`);
  const familyCounts = new Map();
  for (const row of rows) familyCounts.set(row.family, (familyCounts.get(row.family) ?? 0) + 1);
  assert(familyCounts.size === 5, `${purpose} must span five rhetorical families`);
  assert([...familyCounts.values()].every((count) => count === 2), `${purpose} families must each keep two approved variants`);
}

const expectedOwnership = {
  opening: "whole-chart-thesis",
  "top-stories": "multi-factor-synthesis",
  placements: "planet-sign-house-placement",
  houses: "field-of-life-synthesis",
  aspects: "relationship-geometry",
  nodes: "developmental-axis",
  transits: "stored-current-activation",
  technical: "raw-facts-and-evidence",
};
assert(JSON.stringify(REPORT_NARRATIVE_FACET_OWNERSHIP) === JSON.stringify(expectedOwnership), "facet ownership map drifted");

const stableA = realizeReportSurfaceText("نمونهٔ معنی", { reportKey: "arad", semanticKey: "sun:aquarius:5", purpose: "thesis", sequenceIndex: 0 });
const stableB = realizeReportSurfaceText("نمونهٔ معنی", { reportKey: "arad", semanticKey: "sun:aquarius:5", purpose: "thesis", sequenceIndex: 0 });
assert(JSON.stringify(stableA) === JSON.stringify(stableB), "surface selection must be deterministic for the same report/semantic key");
assert(!/Math\.random|Date\.now|crypto\./u.test(read("lib/astrology/report-surface-language-planner.ts")), "surface planner must not use random/time-based wording selection");

const qaProfiles = [
  "arad",
  "distributed-no-stellium",
  "water-earth-dominant",
  "meaningful-retrogrades",
  "no-tight-major-aspect",
  "advanced-strong-promotion",
  "advanced-support-only",
  "caregiver-mode",
  "transit-ready",
  "missing-current-residence",
];
assert(qaProfiles.length === 10 && new Set(qaProfiles).size === 10, "Slice 5 QA profile set must contain ten distinct contexts");

for (const profile of qaProfiles) {
  const sequence = planReportSurfaceSequence(profile, Array.from({ length: 8 }, (_, index) => ({
    id: `${profile}:${index}`,
    semanticKey: `${profile}:semantic:${index}`,
    purpose: ["thesis", "scene", "strength", "friction", "development"][index % 5],
    text: `متن نمونه برای ${profile} و مالک روایی شماره ${index}`,
  })));
  assert(sequence.every((item) => item.text.length > 0 && item.patternId !== "empty"), `${profile}: every surface block must resolve to an approved pattern`);
  for (let index = 1; index < sequence.length; index += 1) {
    if (sequence[index].purpose === sequence[index - 1].purpose) {
      assert(sequence[index].family !== sequence[index - 1].family, `${profile}: adjacent blocks in the same purpose must not reuse one rhetorical family`);
    }
  }
}

const deliberateDuplicates = analyzeReportNarrativeRepetition([
  { id: "owner-a", text: "این شش واژه برای آزمون تکرار دقیق ساخته شدند و ادامه دارند" },
  { id: "owner-b", text: "این شش واژه برای آزمون تکرار دقیق ساخته شدند اما پایان فرق دارد" },
  { id: "owner-c", text: "این شش واژه برای آزمون تکرار دقیق ساخته شدند و سومین مالک است" },
]);
assert(deliberateDuplicates.repeatedThreeWordStarts.some((finding) => finding.fragment && finding.owners.length === 3), "repetition metrics must report exact repeated starts with owners");
assert(deliberateDuplicates.repeatedSixTokenFragments.some((finding) => finding.fragment && finding.owners.length === 3), "repetition metrics must report 6+ token fragments with owners");
const twoOwnerDuplicate = analyzeReportNarrativeRepetition([
  { id: "one", text: "این عبارت شش کلمه‌ای باید همان بار دوم گزارش شود" },
  { id: "two", text: "این عبارت شش کلمه‌ای باید همان بار دوم عوض شود" },
]);
assert(twoOwnerDuplicate.repeatedThreeWordStarts.length > 0, "strict visual-review metrics must flag a repeated three-word start on the second owner");
assert(twoOwnerDuplicate.repeatedSixTokenFragments.length > 0, "strict visual-review metrics must flag a repeated six-token fragment on the second owner");
assert(twoOwnerDuplicate.repeatedFiveTokenFragments.length > 0, "strict visual-review metrics must flag a repeated five-token fragment on the second owner");
const technicalDuplicates = analyzeReportNarrativeRepetition([
  { id: "tech-a", text: "این هندسه شدت یا نزدیکی تماس را نشان می‌دهد", facet: "technical" },
  { id: "tech-b", text: "این هندسه شدت یا نزدیکی تماس را نشان می‌دهد", facet: "technical" },
]);
assert(technicalDuplicates.repeatedThreeWordStarts.length === 0, "technical allowlist must not fail narrative repetition starts");
assert(technicalDuplicates.repeatedFiveTokenFragments.length === 0, "technical allowlist must not fail narrative five-token fragments");
assert(technicalDuplicates.repeatedSixTokenFragments.length === 0, "technical allowlist must not fail narrative six-token fragments");
const joinedNarrative = joinReportNarrativeSentences([
  "جمله اول بدون نقطه",
  "جمله دوم بدون نقطه",
  "جمله سوم.",
]);
assert(joinedNarrative === "جمله اول بدون نقطه. جمله دوم بدون نقطه. جمله سوم.", "sentence joiner must create explicit prose boundaries without doubled punctuation");
const normalizedDirect = normalizeReportNarrativeForSurface(
  "وقتی فشار بالا می‌رود، استفادهٔ آگاهانه از این روانی می‌تواند یک توان موجود را به خروجی واقعی تبدیل کند",
  { semanticKey: "visual-review:direct", purpose: "friction", sequenceIndex: 1 },
);
assert(!normalizedDirect.includes("وقتی فشار بالا می‌رود") && !normalizedDirect.includes("استفادهٔ آگاهانه از این روانی"), "direct surface normalization must remove retired repeated scaffolds");
const visualReviewRepeatedFragments = [
  "معمولاً بیش از یک انگیزه هم‌زمان فعال است و تصمیم اینجا روی چند بخش تجربه اثر می‌گذارد",
  "زیر فشار، چند نیاز می‌توانند روی همان میدان جمع شوند",
  "در عمل این خانه یک میدان مشترک می‌سازد",
  "باید در یک زندگی واقعی با هم کار کنند",
  "این رابطه به‌دلیل درگیری حاکم چارت وزن بیشتری دارد",
  "وقتی این دو نیرو یک هدف داشته باشند",
  "اگر مرز دو نیاز روشن نباشد",
  "جریان میان دو نیرو روان‌تر است و ظرفیت موجود راحت‌تر در دسترس قرار می‌گیرد",
  "استفادهٔ آگاهانه از این روانی می‌تواند یک توان موجود را به خروجی واقعی تبدیل کند",
  "آسانی ممکن است باعث شود امکان موجود بدیهی فرض شود و کمتر به کار گرفته شود",
  "بدن و احساس پیش از تصمیم شناخته شوند",
  "نیاز واقعی زودتر از واکنش لحظه‌ای شناخته شود",
  "خواستن یا خشم پیش از اقدام یک دور درونی پیدا می‌کند",
  "پیش از نتیجه‌گیری، احساس و نیاز را جداگانه نام ببر",
  "در چنین وضعی حال لحظه‌ای یا دفاع عاطفی به‌جای نیاز اصلی تصمیم بگیرد",
  "پس‌روی مریخ بخشی از این تعامل را پیش از بیان بیرونی به بازبینی درونی برمی‌گرداند",
  "چند نیاز می‌توانند روی همان میدان جمع شوند",
  "به توان متمرکز تبدیل می‌شود",
  "می‌تواند سریع‌تر و شدیدتر شود",
  "در این چارت، حضور سیارهٔ راهبر به این رابطه وزن اضافه می‌کند",
  "چون فشار فوری کم است",
  "ممکن است دیده نشود تا فرصت استفاده‌نشده بماند",
  "وقتی پایدارتر می‌شود که",
  "انتخابی که از ارزش و خواست واقعی خودت می‌آید روشن‌تر شود",
  "پیش از جواب فوری، خواستهٔ واقعی روشن شود",
  "فرق نیاز اصلی با موج کوتاه احساس دیده شود",
];
for (const [index, fragment] of visualReviewRepeatedFragments.entries()) {
  const normalized = normalizeReportNarrativeForSurface(fragment, {
    semanticKey: `visual-review:${index}`,
    purpose: ["thesis", "scene", "strength", "friction", "development"][index % 5],
    sequenceIndex: index,
  });
  assert(!normalized.includes(fragment), `visual-review repeated fragment survived surface normalization: ${fragment}`);
}

const neptunePlacement = buildCanonicalPlacementNarrative({ planetId: "neptune", signId: "capricorn", houseNumber: 5 });
assert(neptunePlacement && !neptunePlacement.thesis.includes("کند را در میدان"), "matrix-composed placement thesis must not use a subjunctive operation as a noun phrase");
assert(neptunePlacement && !neptunePlacement.everydayScene.includes("بررسی کند"), "matrix-composed everyday scene must convert operation verbs to observed/indicative prose");
const houseFixtures = [
  buildCanonicalHouseNarrative({ houseNumber: 1, members: [{ planetId: "mars", signId: "libra" }] }),
  buildCanonicalHouseNarrative({ houseNumber: 7, members: [{ planetId: "saturn", signId: "aries" }] }),
  buildCanonicalHouseNarrative({ houseNumber: 8, members: [{ planetId: "moon", signId: "taurus" }] }),
].filter(Boolean);
assert(houseFixtures.length === 3, "house narrative fixtures must build");
assert(new Set(houseFixtures.map((item) => item.thesis)).size === 3, "important-house thesis prose must not repeat across visible house owners");
assert(new Set(houseFixtures.map((item) => item.frictionExpression)).size === 3, "important-house pressure prose must not repeat across visible house owners");
assert(houseFixtures.every((item) => !item.thesis.includes("باید در یک زندگی واقعی با هم کار کنند")), "canonical house synthesis must retire the repeated literal integration sentence");

const adaptive = read("components/report/ReportAdaptiveNarrative.tsx");
const reader = read("components/report/ReportProductReader.tsx");
const technical = read("components/report/ReportTechnicalAppendix.tsx");
const unified = read("lib/astrology/unified-story-synthesis.ts");

for (const marker of [
  "HALLEUS_R39_OPENING_EVIDENCE_HYGIENE_R1_20260902",
  "buildRecomposedOpeningStory",
  'data-adaptive-opening-story="recomposed-two-paragraphs"',
  'data-report-opening-story="dynamic-two-paragraph"',
  "isUserFacingEvidenceReason",
  "compactEvidenceText",
  "joinReportNarrativeSentences",
  "resolveAspectHumanTitle",
  "completePlacementRole",
  "realizeReportSurfaceText",
  "surfacedTopStories",
  "surfacedPlacementStories",
  "surfacedHouses",
  "surfacedAspects",
  "surfacedNodeStory",
]) assert(adaptive.includes(marker), `adaptive narrative missing Slice 5/R39 marker: ${marker}`);
assert(!adaptive.includes("data-adaptive-semantic-key"), "normal report DOM must not expose semantic keys");
for (const forbidden of ["مالک روایی", "تم مشترک", "innovation", "community", "freedom"]) {
  const visibleAfterFilter = adaptive.slice(adaptive.indexOf("function StoryCard"));
  assert(!visibleAfterFilter.includes(forbidden), `normal adaptive surface contains forbidden engineering vocabulary: ${forbidden}`);
}
assert(adaptive.includes("data-report-inline-evidence") && adaptive.includes("className={styles.adaptiveEvidence}") && adaptive.includes("data-adaptive-evidence") && adaptive.includes("<summary>مبنای این برداشت</summary>"), "evidence must stay concise, visible on demand, and use the collapsed disclosure contract");
assert(!adaptive.includes("const surfacedOpening = planReportSurfaceSequence"), "opening paragraphs must not receive a second rhetorical prefix after complete prose is composed");
assert(adaptive.includes("maxItems={compactEvidence ? 1 : 3}"), "top-story narrative evidence must cap visible reasons at one to three items");
assert(adaptive.includes("resolveAspectHumanTitle(story, index)"), "generic repeated aspect headings must be diversified at the visible owner");
assert(adaptive.includes("diversifyHouseSurfaceText") && adaptive.includes("HOUSE_SCENE_VARIANTS"), "visible house prose must diversify repeated house scaffolds by owner");
assert(adaptive.includes("diversifyAspectSurfaceText") && adaptive.includes("ASPECT_FRICTION_VARIANTS"), "visible aspect prose must diversify repeated friction phrasing by owner");
assert(adaptive.includes("headline: diversifyHouseSurfaceText"), "visible house headline must pass through owner-level diversification");
assert(!adaptive.includes("reasons={[technicalLine]}"), "aspect geometry must not be duplicated again inside narrative evidence");
for (const retired of [
  "<strong>وقتی خوب کار می‌کند</strong>",
  "<strong>وقتی فشار بالا می‌رود</strong>",
  "<strong>حرکت کوچک</strong>",
  "<strong>این هفته امتحان کن</strong>",
  "<strong>در زندگی واقعی",
]) {
  assert(!adaptive.includes(retired), `adaptive narrative still renders retired scaffold heading: ${retired}`);
}
assert(adaptive.includes("conditionalForecast") && adaptive.includes("weeklyDomainForecast"), "weekly actions must become bounded conditional forecasts rather than labeled exercises");
assert(adaptive.includes("سه موقعیت که ممکن است این هفته پررنگ شوند") && !adaptive.includes("سه کار برای این هفته"), "weekly section itself must be framed as bounded conditional forecast, not an exercise list");

for (const marker of [
  "HALLEUS_REPORT_EDITORIAL_COHESION_SLICE_R1_20260903",
  "naturalizeNarrativeText",
  "compactNarrativeParts",
  "compactPlacementAction",
  "normalizeHouseReason",
  "orderTopStoriesForReading",
  "editorialTopStoryScore",
  "ASPECT_PAIR_EDITORIAL_TITLES",
  "data-report-editorial-compact-house",
  "data-report-editorial-compact-aspect",
]) assert(adaptive.includes(marker), `adaptive narrative missing editorial-cohesion marker: ${marker}`);
assert(adaptive.includes("selectedTopStories") && adaptive.includes("orderTopStoriesForReading(\n    selectedTopStories"), "visible top-story membership must stay planner-owned while reading order is editorially reconciled");
assert(adaptive.includes("selectedPreviewStories") && adaptive.includes("orderTopStoriesForReading(\n    selectedPreviewStories"), "overview preview must use the same editorial reading order without changing planner membership");
assert(adaptive.includes('if (supplementaryOnly) score -= 42'), "supplementary-only stories must not outrank equally selected major-planet stories on presentation score alone");
assert(adaptive.includes('replace(/^۱ سیاره اصلی در این خانه قرار دارند/u, "۱ سیاره اصلی در این خانه قرار دارد")'), "important-house reason grammar must repair singular agreement on the visible surface");
assert(adaptive.includes("این‌ها لایه‌های تکمیلی‌اند، نه داستان‌های تازه"), "deeper-placement intro must explain its subordinate narrative role");
assert(adaptive.includes("این بخش الگوهای چندشاهدی را جلو می‌آورد"), "primary-pattern intro must explain why exact standalone aspects remain in their own section");
assert(adaptive.includes('"uranus:venus": "نزدیکی بدون خفه‌کردن آزادی"') && adaptive.includes('"jupiter:venus": "اشتیاقی که باید اندازه‌اش روشن بماند"'), "generic aspect headings must yield to memorable pair-specific editorial titles where a known pair is available");
assert(adaptive.includes("خانه‌ها جواب می‌دهند این داستان‌ها بیشتر کجای زندگی رخ می‌دهند"), "important-house intro must frame houses as scene/location rather than another full narrative restart");
assert(!adaptive.includes("mergeNarrative(house.synthesis, house.livedExample, house.pressure)"), "important houses must no longer concatenate every full upstream paragraph verbatim");
assert(!adaptive.includes("mergeNarrative(story.dailyLife, story.healthy, story.friction)"), "important aspects must no longer concatenate every full upstream paragraph verbatim");
assert(adaptive.includes("کارکرد ([^؛.!؟]+?) را در میدان"), "natural-language cleanup must explicitly reconcile the known generic placement scaffold instead of hiding it with CSS");

for (const marker of [
  "HALLEUS_DEEP_NARRATIVE_SLICE5_WHOLE_REPORT_RECONCILIATION_R1_20260903",
  "HALLEUS_REPORT_EDITORIAL_COHESION_SLICE_R1_20260903",
  "surfaceTransitText",
  "compactTransitNarrativeUnit",
  "naturalizeTransitDirective",
  "TRANSIT_EDITORIAL_REWRITES",
  "cleanTransitNarrativeSurface",
  "joinReportNarrativeSentences",
  'realizeReportSurfaceText',
  'TRANSIT_BODY_LABELS[body.id] ?? body.label',
]) assert(reader.includes(marker), `ReportProductReader missing Slice 5 marker: ${marker}`);
assert(!reader.includes("data-report-surface-pattern"), "surface pattern ids must not be rendered to the user-facing DOM");
assert(reader.includes("data-report-inline-transit") && reader.includes("data-report-inline-evidence"), "transit interpretation/evidence must read as inline prose");
assert(reader.includes("در نتیجه نحوهٔ پاسخ") && reader.includes("replace(/در نتیجه نحوهٔ پاسخ"), "stored-transit prose must remove the repeated response-to-pressure boilerplate before rendering");
assert(reader.includes("stripSharedTransitLead"), "stored-transit prose must remove a repeated semantic lead between its two visible paragraphs");
assert(reader.includes("sharedTransitPrefixLength"), "stored-transit dedupe must find repeated secondary leads anywhere inside the primary paragraph, not only at its first token");
assert(reader.includes("TRANSIT_REPEATED_PHRASE_VARIANTS"), "stored-transit prose must diversify repeated cross-card human-language phrases while keeping semantic ownership");
assert(reader.includes('.replace(/\\s+در حوزهٔ [^؛.!؟]+[؛.]?/gu, ". ")'), "stored-transit domain-clause removal must preserve a sentence boundary rather than concatenate adjacent clauses");
assert(reader.includes("replace(/برای فهمیدن این تماس در زندگی روزمره"), "stored-transit prose must retire the repeated daily-life scaffold");
assert(reader.includes("replace(/\\s+در حوزهٔ"), "stored-transit prose must remove the repeated domain clause after the theme already owns that context");
assert(reader.includes("replace(/در چنین وضعی"), "stored-transit prose must retire the repeated conditional filler");
assert(reader.includes("replace(/؛\\s*\\./"), "stored-transit punctuation cleanup must prevent semicolon-period joins");
assert(reader.includes("دو قطب روبه‌روی"), "stored-transit punctuation cleanup must guard against clause concatenation after domain removal");
assert(reader.includes("const strength = compactTransitNarrativeUnit(") && reader.includes("stripSharedTransitLead("), "visible transit strength prose must be deduplicated and compacted before paragraph composition");
assert(reader.includes('replace(/^[^.؟!؛]*با زاویهٔ واقعی [^.؟!؛]+(?:رسیده|رسیده است)[؛.!؟]\\s*/u, "")'), "visible transit prose must remove the exact-angle sentence already owned by the technical line");
assert(reader.includes('replace(/^از نظر روایی,') === false, "editorial guard sanity: Persian punctuation literal must remain Persian-first");
assert(reader.includes('replace(/^از نظر روایی،\\s*/u, "")'), "stored-transit prose must retire the repeated narrative meta-preface");
assert(reader.includes('replace(/^اینجا مسئله فقط حضور دو سیاره نیست:\\s*/u, "")'), "stored-transit prose must retire the repeated explanatory throat-clearing");
assert(reader.includes('const thesis = compactTransitNarrativeUnit(') && reader.includes('aspect.interpretation.attention'), "transit thesis must be compacted by semantic owner before rendering");
assert(reader.includes('const scene = compactTransitNarrativeUnit(') && reader.includes('aspect.interpretation.scenario'), "transit scene must be compacted by semantic owner before rendering");
assert(reader.includes('const development = compactTransitNarrativeUnit(') && reader.includes('aspect.interpretation.action'), "transit action must remain present after compression");
assert(reader.includes("فقط تماس‌هایی را ببینی که الان بیشترین وزن را دارند"), "transit intro must explain the relevance-filtered, compact reading model");
assert(reader.includes("اول به واکنش بدن فرصت بده و بعد تصمیم بگیر") && reader.includes("احساس لحظه‌ای را از نیاز اصلی جدا ببین"), "stored-transit editorial rewrites must replace passive generator-like directives with direct Persian phrasing");
for (const retired of [
  "نشانه‌هایی که احتمالاً می‌بینی",
  "<strong>وجه سازنده</strong>",
  "از این دوره چه استفاده‌ای بکنی",
  "<summary>مبنای این برداشت</summary>",
]) {
  assert(!reader.includes(retired), `live transit surface still renders retired scaffold heading: ${retired}`);
}

for (const marker of [
  "ENGINE_BODY_LABELS",
  'chiron: "کایران"',
  'ceres: "سرس"',
  'juno: "جونو"',
  'nessus: "نسوس"',
  '"north-node": "گره شمالی ماه"',
  '"south-node": "گره جنوبی ماه"',
  "formatTechnicalBodyLabel",
  '"طول دایره‌البروجی "',
  '"زاویه مرجع "',
  'زاویه واقعی',
  'فاصله از دقیق',
  '"رایزینگ / ASC"',
  '"سرخانهٔ اول"',
  '"روش محاسبه"',
]) assert(technical.includes(marker), `technical appendix missing Persian-first marker: ${marker}`);
const enginePanel = technical.slice(technical.indexOf("function EngineOutputPanel"), technical.indexOf("function AspectTable"));
for (const stale of ['{"longitude "}', '{"exact "}', '{" · separation "}', '{" · orb "}', '<strong>{"Ascendant"}</strong>', '<strong>{"1st house cusp"}</strong>', '<strong>{"method"}</strong>']) {
  assert(!enginePanel.includes(stale), `engine output still exposes stale English-first field label: ${stale}`);
}

assert(unified.includes("HALLEUS_R39_TRUE_SYNTHESIS_RECOMPOSITION_R1_20260902"), "Slice 5 must preserve R39 true synthesis");
assert(unified.includes("composeAdvancedBodyNarrative"), "Slice 5 must preserve advanced-body synthesis");

if (failures.length > 0) {
  console.error("Deep narrative whole-report reconciliation guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Deep narrative whole-report reconciliation guard passed.");
console.log(`- approved deterministic surface patterns: ${getReportSurfacePatternCount()}`);
console.log("- explicit facet ownership covers opening/top stories/placements/houses/aspects/nodes/transits/technical");
console.log("- 10 Slice 5 QA surface profiles are stable and non-random");
console.log("- repetition diagnostics preserve exact fragments plus owner ids");
console.log("- R39 opening/advanced synthesis remain owners; Slice 5 only changes surface realization");
console.log("- technical appendix is Persian-first while raw ids/methods remain available");
console.log("- visual-review scaffolds are inline, evidence remains visible, and weekly actions are bounded conditional forecasts");
