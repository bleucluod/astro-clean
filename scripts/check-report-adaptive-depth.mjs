// HALLEUS_DEEP_NARRATIVE_SLICE5_ADAPTIVE_DEPTH_VISUAL_RECONCILIATION_R7_20260903
// HALLEUS_R39_NARRATIVE_RECOMPOSITION_GUARD_OWNERSHIP_R4_20260902
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
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        strict: true,
      },
      reportDiagnostics: true,
      fileName: filename,
    });
    const diagnostics = (result.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    if (diagnostics.length > 0) {
      throw new Error(
        `${path.relative(repoRoot, filename)} has ${diagnostics.length} transpile error(s): ${diagnostics
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
function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8").replace(/\r\n/g, "\n");
}

const planner = require(path.join(repoRoot, "lib/astrology/adaptive-report-planner.ts"));
const behavioral = require(path.join(repoRoot, "lib/astrology/report-behavioral-interpretation.ts"));
const { buildAdaptiveReportPlan, assertAdaptiveAnchorIntegrity, normalizeAdaptiveActionKey } = planner;
const { buildPlacementBehavioralInterpretation } = behavioral;

function placement(id, signId, house, longitude = 0) {
  return {
    id,
    label: id,
    longitude,
    signId,
    degreeInSign: ((longitude % 30) + 30) % 30,
    house,
    method: "stored-fixture",
  };
}

function aspect(id, firstPlanetId, secondPlanetId, aspectId, orb) {
  const angleByKind = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
  const labelByKind = {
    conjunction: "هم‌نشینی",
    sextile: "فرصت نرم",
    square: "مربع",
    trine: "تثلیث",
    opposition: "مقابله",
  };
  const glyphByKind = { conjunction: "☌", sextile: "⚹", square: "□", trine: "△", opposition: "☍" };
  return {
    id,
    firstPlanetId,
    firstPlanetLabel: firstPlanetId,
    secondPlanetId,
    secondPlanetLabel: secondPlanetId,
    aspectId,
    aspectLabel: labelByKind[aspectId],
    glyph: glyphByKind[aspectId],
    angle: angleByKind[aspectId],
    separation: angleByKind[aspectId] + orb,
    orb,
    meaning: "stored fixture meaning",
    narrative: "stored fixture narrative",
  };
}

function baseReport({
  placements,
  aspects = [],
  risingSign = "sagittarius",
  behavioralAudienceMode = "adult",
  retrogradePlanetIds = [],
  lunarNodes = null,
  birthDate = "1980-01-01",
}) {
  return {
    id: "adaptive-fixture",
    createdAt: "2026-08-08T06:30:00.000Z",
    input: {
      name: "QA",
      birthDate,
      birthTime: "12:00",
      birthCity: "Fixture",
      birthCountry: "IR",
    },
    chart: { risingSign: { key: risingSign } },
    summary: "",
    interpretations: [],
    safetyNote: "",
    realEngine: {
      version: "real-engine-preview-v2",
      generatedAt: "2026-08-08T06:30:00.000Z",
      behavioralAudienceMode,
      cityLabel: "Fixture",
      utcIso: "2026-08-08T06:30:00.000Z",
      ascendantLongitude: 0,
      angles: {
        asc: {
          id: "asc",
          label: "ASC",
          longitude: 0,
          signId: risingSign,
          degreeInSign: 0,
          house: 1,
          method: "fixture",
          source: "fixture",
          reliability: "calculated",
          limitation: null,
        },
      },
      placements,
      aspects,
      retrogrades: {
        status: "calculated",
        method: "stored-fixture",
        planetIds: retrogradePlanetIds,
        limitation: null,
      },
      lunarNodes: lunarNodes ?? { status: "not-calculated", method: null, limitation: null },
      note: "fixture",
    },
  };
}

const olderClusterReport = baseReport({
  risingSign: "sagittarius",
  placements: [
    placement("sun", "capricorn", 2, 296.4),
    placement("mercury", "aquarius", 2, 314.4),
    placement("venus", "capricorn", 2, 293.9),
    placement("mars", "capricorn", 2, 287.7),
    placement("jupiter", "aquarius", 2, 314.1),
    placement("saturn", "aquarius", 2, 301.6),
    placement("moon", "gemini", 7, 73.7),
    placement("uranus", "leo", 9, 149.8),
    placement("neptune", "scorpio", 11, 225),
    placement("pluto", "virgo", 10, 170),
  ],
  aspects: [aspect("mercury-jupiter", "mercury", "jupiter", "conjunction", 0.2)],
});
const olderPlan = buildAdaptiveReportPlan(olderClusterReport);
assertAdaptiveAnchorIntegrity(olderPlan);
assert(olderPlan.topStories[0]?.kind === "cluster", "six-planet H2 concentration must lead as a cluster story");
assert(
  olderPlan.topStories.filter((story) => story.sourceHouseIds.includes(2)).filter((story) => story.kind === "house").length === 0,
  "H2 cluster and H2 prominence must not take separate top-story slots",
);
assert(
  new Set(olderPlan.topStories.map((story) => story.semanticKey)).size === olderPlan.topStories.length,
  "top stories must have unique semantic keys",
);
assert(olderPlan.weeklyActions.length === 3 && new Set(olderPlan.weeklyActions).size === 3, "weekly actions must be three distinct actions");
assert(new Set(olderPlan.weeklyActions.map(normalizeAdaptiveActionKey)).size === olderPlan.weeklyActions.length, "weekly actions must also be semantically distinct after removing domain prefixes");
assert(!olderPlan.importantHouses.some((story) => story.houseNumber === 2), "H2 cluster must own the H2 system story instead of repeating H2 again in important houses");
assert(olderPlan.topStories.filter((story) => story.kind === "cluster" && story.sourceHouseIds.includes(2)).length === 1, "H2 concentration must remain one cluster-led system story instead of repeating a nested sign cluster in the same house");
assert(olderPlan.weeklyActions[0]?.startsWith("احساس و رابطه —"), "weekly action one must own the emotional/relationship domain");
assert(olderPlan.weeklyActions[1]?.startsWith("روزمره و کار —"), "weekly action two must own the daily/work domain");
assert(olderPlan.weeklyActions[2]?.startsWith("هویت و تصمیم —"), "weekly action three must own the identity/decision domain");

const crossSectionAspectReport = baseReport({
  risingSign: "virgo",
  placements: [
    placement("sun", "aries", 1, 10), placement("moon", "taurus", 2, 40),
    placement("mercury", "gemini", 3, 70), placement("venus", "cancer", 4, 100),
    placement("mars", "leo", 5, 130), placement("jupiter", "sagittarius", 9, 250),
    placement("saturn", "pisces", 12, 340), placement("uranus", "aquarius", 11, 315),
    placement("neptune", "capricorn", 10, 285), placement("pluto", "scorpio", 8, 225),
  ],
  aspects: [
    aspect("mercury-jupiter-primary", "mercury", "jupiter", "opposition", 0.2),
    aspect("venus-saturn-secondary", "venus", "saturn", "trine", 2.4),
  ],
});
const crossSectionAspectPlan = buildAdaptiveReportPlan(crossSectionAspectReport);
assertAdaptiveAnchorIntegrity(crossSectionAspectPlan);
assert(crossSectionAspectPlan.topStories.some((story) => story.sourceAspectIds.includes("mercury-jupiter-primary")), "tight Mercury-Jupiter fixture must reach the top-story layer");
assert(!crossSectionAspectPlan.importantAspects.some((story) => story.aspect.id === "mercury-jupiter-primary"), "an aspect already owned by a top story must not repeat in the relationship-card layer");

const copyCompositionReport = baseReport({
  risingSign: "virgo",
  placements: [
    placement("sun", "aquarius", 5, 325), placement("moon", "taurus", 8, 45),
    placement("mercury", "aquarius", 5, 306.6), placement("venus", "aquarius", 5, 313.2),
    placement("mars", "libra", 1, 195), placement("jupiter", "aquarius", 5, 305.4),
    placement("saturn", "aries", 7, 15), placement("uranus", "aquarius", 5, 305.8),
    placement("neptune", "capricorn", 4, 285), placement("pluto", "sagittarius", 3, 250),
  ],
  aspects: [aspect("mercury-uranus-copy-composition", "mercury", "uranus", "conjunction", 0.8)],
});
const copyCompositionPlan = buildAdaptiveReportPlan(copyCompositionReport);
assertAdaptiveAnchorIntegrity(copyCompositionPlan);
const copyCompositionVisibleText = [
  ...copyCompositionPlan.topStories.map((story) => story.dailyLife),
  ...copyCompositionPlan.importantAspects.map((story) => story.dailyLife),
].join(" ");
assert(!/ممکن است\s+ممکن است/u.test(copyCompositionVisibleText), "visible adaptive aspect copy must never repeat ممکن است twice in a row");

const tSquareReport = baseReport({
  risingSign: "virgo",
  placements: [
    placement("sun", "scorpio", 3, 225.5),
    placement("moon", "leo", 12, 143.8),
    placement("mercury", "scorpio", 3, 230),
    placement("venus", "libra", 2, 190),
    placement("mars", "scorpio", 3, 236),
    placement("jupiter", "sagittarius", 4, 250),
    placement("saturn", "aquarius", 6, 323.9),
    placement("uranus", "capricorn", 5, 280),
    placement("neptune", "capricorn", 5, 286),
    placement("pluto", "scorpio", 3, 233.9),
  ],
  aspects: [
    aspect("moon-saturn", "moon", "saturn", "opposition", 0.1),
    aspect("moon-pluto", "moon", "pluto", "square", 0.3),
    aspect("saturn-pluto", "saturn", "pluto", "square", 0.4),
  ],
});
const tSquarePlan = buildAdaptiveReportPlan(tSquareReport);
assertAdaptiveAnchorIntegrity(tSquarePlan);
const tSquare = tSquarePlan.topStories.find((story) => story.kind === "aspect-pattern");
assert(Boolean(tSquare), "T-square must survive ranking as an aspect-pattern anchor");
assert(tSquare?.sourcePlanetIds.includes("pluto"), "T-square must keep Pluto as the focal source planet in this fixture");
assert(
  ["moon-saturn", "moon-pluto", "saturn-pluto"].every((id) => tSquare?.sourceAspectIds.includes(id)),
  "T-square must keep all three exact source aspect IDs",
);
assert(
  tSquare?.evidenceRefs.some((evidence) => ["moon-saturn", "moon-pluto", "saturn-pluto"].every((id) => evidence.sourceIds.includes(id))),
  "T-square evidence must prove the same pattern instead of borrowing a different aspect",
);

const smoothReport = baseReport({
  risingSign: "leo",
  placements: [
    placement("sun", "leo", 10, 140), placement("moon", "sagittarius", 2, 260),
    placement("mercury", "leo", 10, 145), placement("venus", "leo", 10, 149),
    placement("mars", "aries", 6, 20), placement("jupiter", "aries", 6, 25),
    placement("saturn", "sagittarius", 2, 265), placement("uranus", "sagittarius", 2, 268),
    placement("neptune", "capricorn", 3, 280), placement("pluto", "scorpio", 1, 220),
  ],
  aspects: [
    aspect("sun-moon-trine", "sun", "moon", "trine", 0.3),
    aspect("sun-venus-conj", "sun", "venus", "conjunction", 0.5),
    aspect("mars-jupiter-trine", "mars", "jupiter", "trine", 0.6),
    aspect("jupiter-pluto-wide", "jupiter", "pluto", "opposition", 7.8),
  ],
});
const smoothPlan = buildAdaptiveReportPlan(smoothReport);
assertAdaptiveAnchorIntegrity(smoothPlan);
assert(smoothPlan.topStories.some((story) => story.kind === "cluster" && story.sourceHouseIds.includes(10)), "smooth H10 concentration must be owned by the cluster even when Sun prominence ranks slightly higher before dedup");
assert(!smoothPlan.topStories.some((story) => story.kind === "planet" && story.sourcePlanetIds[0] === "sun" && story.sourceHouseIds.includes(10)), "smooth H10 cluster must absorb standalone Sun prominence regardless of candidate score order");
assert(smoothPlan.mode !== "tension-led", "smooth chart must not be forced into tension-led mode by a wide conflict");
assert(smoothPlan.topStories[0]?.sourceAspectIds[0] !== "jupiter-pluto-wide", "wide Jupiter-Pluto opposition must not outrank tight personal support");

const boundaryNodes = {
  status: "calculated",
  method: "mean-lunar-node-j2000-meeus-formula",
  nodeType: "mean",
  southNode: {
    id: "south-node", label: "South Node", longitude: 149.91, signId: "leo", degreeInSign: 29.91, house: 5,
    method: "mean-lunar-node-j2000-meeus-formula", source: "derived-opposition", reliability: "calculated", limitation: null,
  },
  northNode: {
    id: "north-node", label: "North Node", longitude: 329.91, signId: "aquarius", degreeInSign: 29.91, house: 11,
    method: "mean-lunar-node-j2000-meeus-formula", source: "calculated", reliability: "calculated", limitation: null,
  },
  limitation: null,
};
const boundaryPlan = buildAdaptiveReportPlan(baseReport({
  placements: [
    placement("sun", "leo", 5, 140), placement("moon", "cancer", 7, 100), placement("mercury", "virgo", 6, 160),
    placement("venus", "libra", 7, 190), placement("mars", "cancer", 7, 105), placement("jupiter", "gemini", 3, 70),
    placement("saturn", "pisces", 12, 340), placement("uranus", "capricorn", 10, 290), placement("neptune", "capricorn", 10, 295), placement("pluto", "scorpio", 8, 225),
  ],
  aspects: [aspect("moon-mars", "moon", "mars", "conjunction", 0.8)],
  lunarNodes: boundaryNodes,
}));
assert(boundaryPlan.nodeStory?.confidence.includes("مرز برج"), "node-boundary copy must explicitly name the sign boundary");
assert(boundaryPlan.nodeStory?.confidence.includes("محور خانه‌ها"), "node-boundary copy must give the house axis more practical weight");

const childPlan = buildAdaptiveReportPlan(baseReport({
  behavioralAudienceMode: "caregiver",
  birthDate: "2025-06-03",
  placements: [
    placement("sun", "gemini", 12, 72), placement("moon", "virgo", 3, 160), placement("mercury", "gemini", 12, 75),
    placement("venus", "taurus", 11, 45), placement("mars", "leo", 2, 130), placement("jupiter", "gemini", 12, 80),
    placement("saturn", "pisces", 9, 340), placement("uranus", "taurus", 11, 55), placement("neptune", "aries", 10, 2), placement("pluto", "aquarius", 8, 302),
  ],
}));
assert(childPlan.audienceMode === "caregiver", "child fixture must stay in caregiver mode");
const childText = JSON.stringify(childPlan);
for (const forbidden of ["رابطه عاشقانه", "تصمیم حرفه‌ای", "جایگاه اجتماعی"]) {
  assert(!childText.includes(forbidden), `caregiver report must not leak adult-only copy: ${forbidden}`);
}

function behavior(planetId, signId, houseNumber, retrograde = false) {
  return buildPlacementBehavioralInterpretation({ planetId, signId, houseNumber, retrograde, audienceMode: "adult" });
}
const mercuryTaurus = behavior("mercury", "taurus", 2);
assert(!mercuryTaurus.possibleFriction.includes("پریدن میان احتمال"), "Mercury Taurus must not use the generic jumping-between-possibilities shadow");
const mercuryScorpio = behavior("mercury", "scorpio", 4);
assert(/علت|تفسیر|سؤال مستقیم/u.test(mercuryScorpio.possibleFriction + mercuryScorpio.healthyExpression), "Mercury Scorpio must use a hidden-cause/direct-question interpretation");
const marsScorpio = behavior("mars", "scorpio", 8);
assert(/خشم|کنترل|حساب‌شده|نگه/u.test(marsScorpio.possibleFriction + marsScorpio.healthyExpression), "Mars Scorpio must use stored-pressure/deliberate-action semantics");
const marsCapricorn = behavior("mars", "capricorn", 2);
assert(/نتیجه|ساختار|سخت|فشار/u.test(marsCapricorn.possibleFriction + marsCapricorn.healthyExpression), "Mars Capricorn must be structure/performance aware");
const venusAriesRx = behavior("venus", "aries", 9, true);
assert(/بازبینی|دیرتر|ارزش|ترجیح/u.test(venusAriesRx.possibleFriction), "Venus Aries retrograde must visibly re-evaluate value/preference");

const adaptiveSource = read("components/report/ReportAdaptiveNarrative.tsx");
const v3Source = read("components/ReportV3Experience.tsx");
const readerSource = read("components/report/ReportProductReader.tsx");
const cssSource = read("components/report/human-first-report.module.css");
const globalsSource = read("app/globals.css");
const packageJson = JSON.parse(read("package.json"));
const transitRelevanceSource = read("src/lib/report-output/personal-transit-relevance.ts");
const transitBridgeSource = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const reportGenerationSource = read("lib/report-generation/report-generation-service.ts");

for (const marker of [
  "خوانش کلی", "خورشید، ماه، رایزینگ، عطارد، مریخ و زهره", "سیاره راهبر", "مهم‌ترین الگوهای این چارت", "خانه‌های مهم",
  "رابطه‌های مهم", "گره‌های ماه", "ترکیب انرژی‌ها", "سه موقعیت که ممکن است این هفته پررنگ شوند", "سیاره‌ها در زندگی روزمره",
]) {
  assert(adaptiveSource.includes(marker), `adaptive visible architecture missing: ${marker}`);
}
for (const forbidden of ["یک چرخه که می‌شود زودتر دید", "دو روی یک الگو", "فصل نجومی", "سنتز نجومی", "امضای نجومی"]) {
  assert(!adaptiveSource.includes(forbidden), `adaptive primary UI keeps retired article-like copy: ${forbidden}`);
}
assert(
  adaptiveSource.includes("buildRecomposedOpeningStory") &&
    adaptiveSource.includes('data-adaptive-opening-story="recomposed-two-paragraphs"') &&
    adaptiveSource.includes('data-report-opening-story="dynamic-two-paragraph"') &&
    !adaptiveSource.includes("function buildOpeningStory(") &&
    !adaptiveSource.includes("type AdaptiveOpeningStory ="),
  "adaptive opening must keep the R39 dynamic two-paragraph topology contract",
);
assert(v3Source.includes("ReportAdaptiveNarrative") && v3Source.includes("HALLEUS_REPORT_ADAPTIVE_V3_COMPATIBILITY_20260808"), "ReportV3Experience must route canonical real-engine reports into adaptive narrative while keeping legacy compatibility");
assert(readerSource.includes('data-report-adaptive-depth="20260808"'), "ProductReader missing adaptive-depth root marker");
assert((readerSource.match(/<ReportBirthChartWheel/g) ?? []).length === 1, "ProductReader must render exactly one birth-chart wheel");
assert(readerSource.includes('data-adaptive-compatibility-suppressed='), "ProductReader must record which optional legacy surfaces were suppressed");
assert(readerSource.includes("LEGACY_ADAPTIVE_COMPATIBILITY_RENDER = false"), "legacy compatibility surfaces must be explicitly non-rendering");
if (readerSource.includes("ReportReadingNavigation")) {
  assert(readerSource.includes("ADAPTIVE_REPORT_NAVIGATION") && readerSource.includes("navigation={navigation}"), "canonical adaptive reports must use the product-facing adaptive navigation labels when a navigation surface exists");
  for (const label of ["خلاصه", "خورشید، ماه، رایزینگ، عطارد، مریخ و زهره", "مهم‌ترین الگوها", "خانه‌های مهم", "رابطه‌های مهم", "گره‌های ماه", "ترکیب انرژی‌ها", "سه موقعیت که ممکن است این هفته پررنگ شوند", "سیاره‌ها در زندگی روزمره"]) {
    assert(readerSource.includes(`label: "${label}"`), `adaptive report navigation missing: ${label}`);
  }
}
for (const requiredSectionId of ['id="overview"', 'id="inner-world"', 'id="primary-patterns"', 'id="mind-language"', 'id="relationships"', 'id="growth-path"', 'id="strength-challenge"', 'id="drive-direction"', 'id="deeper-layers"']) {
  assert(adaptiveSource.includes(requiredSectionId), `adaptive report navigation target missing: ${requiredSectionId}`);
}
for (const optionalComponent of ["FiveMinuteReportSummary", "ReportWholeChartSynthesis", "ReportChartPatternSection", "ReportRulershipSection", "ReportPersonalPlanetChapters", "ReportSupplementaryPointsSection"]) {
  const renderCount = (readerSource.match(new RegExp(`<${optionalComponent}\\b`, "g")) ?? []).length;
  assert(renderCount <= 1, `optional compatibility surface must not duplicate ${optionalComponent}`);
  if (renderCount === 1) {
    const componentIndex = readerSource.indexOf(`<${optionalComponent}`);
    const guardWindow = readerSource.slice(Math.max(0, componentIndex - 80), componentIndex);
    assert(guardWindow.includes("LEGACY_ADAPTIVE_COMPATIBILITY_RENDER ? ("), `optional compatibility surface must be non-rendering when present: ${optionalComponent}`);
  }
}
assert(cssSource.includes("HALLEUS_REPORT_ADAPTIVE_DEPTH_FINAL_QA_20260808"), "adaptive visual QA CSS marker missing");
assert(cssSource.includes("opacity: 0.12 !important") && cssSource.includes("top: -190px !important"), "Halleus ambient emblem must be visibly present but subtle");
assert(cssSource.includes(".reportChartRail") && cssSource.includes("display: none !important"), "duplicate full-report chart rail must be suppressed");
const adaptiveCssSlice = cssSource.slice(cssSource.indexOf("HALLEUS_REPORT_ADAPTIVE_DEPTH_FINAL_QA_20260808"));
for (const forbiddenBlue of ["#1e40af", "#d9eafd", "30 64 175", "30, 64, 175"]) {
  assert(!adaptiveCssSlice.toLowerCase().includes(forbiddenBlue), `adaptive CSS reintroduces blue text/UI: ${forbiddenBlue}`);
}
assert(globalsSource.includes("HALLEUS_REPORT_ADAPTIVE_DEPTH_DARK_DOCUMENT_20260808"), "dark document tail fix is missing");
assert(
  globalsSource.includes("html:has(.report-product-page)") &&
    globalsSource.includes("body:has(.report-product-page)"),
  "dark document tail must stay conditionally scoped to the report-product page so the existing product CSS scope guard remains valid",
);
assert(
  !globalsSource.includes('html:has([data-report-product-reader="human-first-report-experience"])'),
  "dark document tail must not reintroduce an unscoped document selector outside the approved report-product scope",
);
assert(packageJson.scripts?.["check:report-adaptive-depth"] === "node scripts/check-report-adaptive-depth.mjs", "package.json must expose the focused adaptive-depth guard");
// HALLEUS_DEEP_NARRATIVE_SLICE5_ADAPTIVE_DEPTH_TRANSIT_OWNERSHIP_R2_20260903
assert(
  transitBridgeSource.includes("houseNumber: context.natalHouseByBody?.[aspect.natalBody] ?? null") &&
    transitBridgeSource.includes("signId: natalBody?.signId ?? null") &&
    transitBridgeSource.includes('retrograde: natalBody?.motion?.status === "retrograde"'),
  "stored personal transit synthesis must consume natal house/sign/retrograde context in the report data bridge",
);
assert(!transitRelevanceSource.includes("این جمله احتمال رفتاری است، نه گزارش یک رویداد قطعی"), "per-card transit disclaimer repetition must be removed in favor of the shared bridge disclaimer");
assert(transitBridgeSource.includes("HALLEUS_PERSONAL_TRANSIT_REPORT_HOUSE_CONTEXT_BRIDGE_20260808"), "personal-transit bridge must pass natal-house context to the writer");
assert(reportGenerationSource.includes("HALLEUS_PERSONAL_TRANSIT_SERVICE_HOUSE_CONTEXT_20260808") && reportGenerationSource.includes("natalHouseByBody"), "report generation must derive natal-house context from the stored real-engine snapshot");
for (const forbiddenName of ["Arad", "Haleh", "Ardalan", "آراد", "هاله", "اردلان"]) {
  assert(!read("lib/astrology/adaptive-report-planner.ts").includes(forbiddenName), `planner must not condition on fixture/person name: ${forbiddenName}`);
}

// HALLEUS_REPORT_AMBIENT_BACKGROUND_NEUTRAL_HEADINGS_GUARD_R16_20260808
assert(
  readerSource.includes('data-report-ambient-logo="parallax"') &&
    readerSource.includes("HALLEUS_REPORT_AMBIENT_BACKGROUND_NEUTRAL_HEADINGS_FINAL_QA_R16_20260808") &&
    readerSource.includes("window.scrollY * 0.045"),
  "ambient emblem rotation must keep full-document scroll ownership while running at 50% of the prior R15 speed",
);
assert(
  cssSource.includes("HALLEUS_REPORT_AMBIENT_BACKGROUND_NEUTRAL_HEADINGS_FINAL_QA_R16_20260808") &&
    cssSource.includes("top: 50% !important") &&
    cssSource.includes("left: -910px !important") &&
    cssSource.includes("width: 1820px !important"),
  "ambient emblem must keep the approved oversized left-center crop",
);
assert(
  cssSource.includes("radial-gradient(circle at 90% 8%, rgb(255 255 255 / 4%), transparent 34%), rgb(13 14 14 / 78%) !important") &&
    !cssSource.includes("rgba(10, 14, 22, 0.84)") &&
    cssSource.includes(".adaptiveStoryCard") &&
    cssSource.includes(".transitPattern") &&
    cssSource.includes(".wheelShell"),
  "opaque report surfaces must stay translucent while avoiding the accidental navy tint",
);
assert(
  cssSource.includes(".adaptiveHero h1") &&
    cssSource.includes("font-size: clamp(1.95rem, 4.85vw, 3.9rem) !important") &&
    cssSource.includes(".adaptiveSectionHeader h2") &&
    cssSource.includes("font-size: clamp(1.55rem, 3.35vw, 2.45rem) !important") &&
    cssSource.includes(".adaptiveSectionHeader:not([data-screenshot-ready]) h2"),
  "large adaptive report headings must stay reduced from their oversized R15 state",
);

// HALLEUS_REPORT_SEMANTIC_FINAL_QA_GUARD_R18_20260808
assert(adaptiveSource.includes("HALLEUS_REPORT_SEMANTIC_FINAL_QA_R18_20260808"), "adaptive renderer missing semantic final QA marker");
assert(adaptiveSource.includes("showInlineAction") && adaptiveSource.includes("inlineActionFrequency") && adaptiveSource.includes("weeklyActionKeys"), "adaptive renderer must give each repeated exercise one visible owner");
assert(adaptiveSource.includes('plan.balanceStory.title !== "ترکیب انرژی‌ها"'), "balance section must not render the same ترکیب انرژی‌ها title twice");
assert(adaptiveSource.includes("condensed={topStoryPlanetIds.has(story.planetId)}"), "standalone planet prominence must condense the duplicate placement layer instead of repeating full interpretation");
assert(read("lib/astrology/adaptive-report-planner.ts").includes("consumedTopAspectIds") && read("lib/astrology/adaptive-report-planner.ts").includes("!topClusterHouses.has(story.houseNumber)"), "planner must enforce top-story ownership across relationship and important-house sections");

// HALLEUS_DEEP_NARRATIVE_SLICE3_ASPECT_RELATIONSHIP_GUARD_R3_20260902
const slice3PlannerSource = read("lib/astrology/adaptive-report-planner.ts");
assert(
  slice3PlannerSource.includes("HALLEUS_DEEP_NARRATIVE_SLICE3_NATAL_ASPECT_SYNTHESIS_R1_20260902"),
  "planner missing Slice 3 canonical aspect synthesis marker",
);
assert(
  slice3PlannerSource.includes("buildAspectBehavioralInterpretation({") &&
    slice3PlannerSource.includes("actualSeparation: aspect.separation"),
  "planner must build visible aspect copy from canonical relationship synthesis using stored actual separation",
);
assert(
  !slice3PlannerSource.includes("stripLeadingPossibility(first?.dailyLifeExample"),
  "planner must not retain the legacy R19 A+B aspect composition path",
);

if (failures.length > 0) {
  console.error("Adaptive report depth/evidence guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Adaptive report depth/evidence guard passed.");
console.log("- anchor identity and evidence provenance stay aligned");
console.log("- semantic top-story and cluster/house duplicates are suppressed");
console.log("- cross-section aspect/house repeats are suppressed and repeated exercises have one visible owner");
console.log("- cluster ownership is order-independent when standalone planet prominence scores slightly higher");
console.log("- duplicate balance heading and standalone planet-placement repetition are suppressed");
console.log("- HALLEUS_REPORT_SEMANTIC_FINAL_QA_GUARD_R18_20260808");
console.log("- visible aspect copy cannot produce the doubled ممکن است ممکن است phrase");
console.log("- HALLEUS_DEEP_NARRATIVE_SLICE3_ASPECT_RELATIONSHIP_GUARD_R3_20260902");
console.log("- smooth charts are not forced into a weak conflict narrative");
console.log("- node-boundary confidence and caregiver mode remain explicit");
console.log("- targeted sign/retrograde behaviors are concrete and planet-aware");
console.log("- visible report architecture is adaptive, monochrome, one-wheel, and dark through the document tail");
console.log("- HALLEUS_REPORT_ADAPTIVE_DEPTH_EVIDENCE_INTEGRITY_20260808");

// HALLEUS_R39_ADAPTIVE_OPENING_GUARD_RECONCILIATION_R8_20260901
