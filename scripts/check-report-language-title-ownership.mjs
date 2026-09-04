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
    if (diagnostics.length) {
      throw new Error(
        `${path.relative(repoRoot, filename)} transpile errors: ${diagnostics
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
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

const zodiac = require(path.join(repoRoot, "lib/astrology/zodiac-labels.ts"));
const aspectDisplay = require(
  path.join(repoRoot, "lib/astrology/report-aspect-display.ts"),
);
const planner = require(
  path.join(repoRoot, "lib/astrology/adaptive-report-planner.ts"),
);

const approvedZodiac = {
  aries: "اریس",
  taurus: "تارس",
  gemini: "جمنای",
  cancer: "کنسر",
  leo: "لئو",
  virgo: "ویرگو",
  libra: "لیبرا",
  scorpio: "اسکورپیو",
  sagittarius: "سجتریس",
  capricorn: "کپریکورن",
  aquarius: "آکواریوس",
  pisces: "پایسیز",
};

for (const [id, expected] of Object.entries(approvedZodiac)) {
  assert(
    zodiac.ZODIAC_LABELS[id]?.faName === expected,
    `zodiac authority mismatch ${id}: ${zodiac.ZODIAC_LABELS[id]?.faName}`,
  );
}

const approvedAspects = {
  conjunction: "☌ ۰°",
  sextile: "⚹ ۶۰°",
  square: "□ ۹۰°",
  trine: "△ ۱۲۰°",
  opposition: "☍ ۱۸۰°",
};

for (const [id, expected] of Object.entries(approvedAspects)) {
  assert(
    aspectDisplay.formatReportAspectDisplay(id) === expected,
    `aspect display mismatch ${id}: ${aspectDisplay.formatReportAspectDisplay(id)}`,
  );
}

const sources = {
  planner: read("lib/astrology/adaptive-report-planner.ts"),
  wheel: read("components/ReportBirthChartWheel.tsx"),
  reader: read("components/report/ReportProductReader.tsx"),
  adaptive: read("components/report/ReportAdaptiveNarrative.tsx"),
  contract: read("lib/report-output/live-report-reading-contract.ts"),
  depthGuard: read("scripts/check-report-adaptive-depth.mjs"),
};

for (const label of ["planner", "wheel", "reader", "adaptive", "contract"]) {
  assert(
    sources[label].includes("report-aspect-display"),
    `${label} must consume the shared report aspect display authority`,
  );
}

assert(!sources.planner.includes("const ASPECT_DISPLAY:"), "parallel planner aspect display map remains");
assert(!sources.reader.includes("TRANSIT_ASPECT_LABELS"), "parallel transit aspect label map remains");
assert(!sources.reader.includes("TRANSIT_ASPECT_SYMBOLS"), "parallel transit aspect symbol map remains");
assert(!sources.adaptive.includes("STANDARD_ASPECT_LABELS"), "parallel adaptive aspect label map remains");
assert(!sources.contract.includes("STANDARD_ASPECT_LABELS"), "parallel technical aspect label map remains");

assert(
  sources.wheel.includes('formatReportAspectDisplay("trine")') &&
    sources.wheel.includes('formatReportAspectDisplay("opposition")') &&
    sources.wheel.includes('formatReportAspectDisplay("conjunction")'),
  "wheel guide must render symbol + exact angle from shared authority",
);

assert(
  sources.adaptive.includes("data-report-astrology-technical-line"),
  "adaptive report must render technical astrology directly below interpretation titles",
);

assert(
  !sources.planner.includes(
    "function aspectHumanMeaning(aspect: RealEngineReportAspect) {function aspectHumanTheme",
  ),
  "aspectHumanTheme must remain a top-level helper",
);

assert(
  sources.planner.includes("consumedTopAspectIds") &&
    sources.planner.includes("!topClusterHouses.has(story.houseNumber)"),
  "narrative ownership must suppress top-owned aspects and cluster houses",
);

assert(
  sources.depthGuard.includes("گره‌های ماه") &&
    !sources.depthGuard.includes("دست‌های ماه"),
  "adaptive-depth guard must stay reconciled to current lunar-node heading",
);

function placement(id, label, signId, house, longitude) {
  return {
    id,
    label,
    longitude,
    signId,
    degreeInSign: ((longitude % 30) + 30) % 30,
    house,
    method: "slice1-runtime-fixture",
  };
}

function aspect(id, first, firstLabel, second, secondLabel, aspectId, orb) {
  const angle = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  }[aspectId];

  return {
    id,
    firstPlanetId: first,
    firstPlanetLabel: firstLabel,
    secondPlanetId: second,
    secondPlanetLabel: secondLabel,
    aspectId,
    aspectLabel: "internal-fixture-label",
    glyph: {
      conjunction: "☌",
      sextile: "⚹",
      square: "□",
      trine: "△",
      opposition: "☍",
    }[aspectId],
    angle,
    separation: angle + orb,
    orb,
    meaning: "stored fixture meaning",
    narrative: "stored fixture narrative",
  };
}

function reportFixture(placements, aspects) {
  return {
    id: "slice1-language-title-ownership-fixture",
    createdAt: "2026-08-30T12:00:00.000Z",
    input: {
      name: "QA",
      birthDate: "1997-02-13",
      birthTime: "20:20",
      birthCity: "Mianeh",
      birthCountry: "IR",
    },
    chart: { risingSign: { key: "virgo" } },
    summary: "",
    interpretations: [],
    safetyNote: "",
    realEngine: {
      version: "real-engine-preview-v2",
      generatedAt: "2026-08-30T12:00:00.000Z",
      behavioralAudienceMode: "adult",
      cityLabel: "Mianeh",
      utcIso: "1997-02-13T16:50:00.000Z",
      ascendantLongitude: 150,
      angles: {
        asc: {
          id: "asc",
          label: "ASC",
          longitude: 150,
          signId: "virgo",
          degreeInSign: 0,
          house: 1,
          method: "slice1-runtime-fixture",
          source: "provided",
          reliability: "calculated",
          limitation: null,
        },
      },
      placements,
      aspects,
      retrogrades: {
        status: "calculated",
        method: "slice1-runtime-fixture",
        planetIds: [],
        limitation: null,
      },
      lunarNodes: {
        status: "not-calculated",
        method: null,
        limitation: null,
      },
      note: "Language/title/ownership fixture only; not ephemeris validation.",
    },
  };
}

const labels = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

const report = reportFixture(
  [
    placement("sun", labels.sun, "aries", 1, 10),
    placement("moon", labels.moon, "taurus", 2, 40),
    placement("mercury", labels.mercury, "gemini", 3, 70),
    placement("venus", labels.venus, "cancer", 4, 100),
    placement("mars", labels.mars, "leo", 5, 130),
    placement("jupiter", labels.jupiter, "sagittarius", 9, 250),
    placement("saturn", labels.saturn, "pisces", 12, 340),
    placement("uranus", labels.uranus, "aquarius", 11, 315),
    placement("neptune", labels.neptune, "capricorn", 10, 285),
    placement("pluto", labels.pluto, "scorpio", 8, 225),
  ],
  [
    aspect(
      "mercury-jupiter-primary",
      "mercury",
      labels.mercury,
      "jupiter",
      labels.jupiter,
      "opposition",
      0.2,
    ),
    aspect(
      "venus-saturn-secondary",
      "venus",
      labels.venus,
      "saturn",
      labels.saturn,
      "trine",
      2.4,
    ),
    aspect(
      "sun-neptune-support",
      "sun",
      labels.sun,
      "neptune",
      labels.neptune,
      "sextile",
      1.0,
    ),
  ],
);

const plan = planner.buildAdaptiveReportPlan(report);
planner.assertAdaptiveAnchorIntegrity(plan);

function assertTitleContract(title, id) {
  const parts = title.split(" — ");
  assert(
    parts.length === 2,
    `${id} must be astrology source — concise human theme: ${title}`,
  );
  if (parts.length !== 2) return;

  const source = parts[0].trim();
  const human = parts[1].trim();

  assert(source.length > 0, `${id} astrology source is empty`);
  assert(human.length > 0, `${id} human theme is empty`);
  assert(
    !/[°☌⚹□△☍]/u.test(title),
    `${id} leaks technical angle into title: ${title}`,
  );

  const factors = source
    .split(/،|\sو\s/u)
    .map((value) => value.trim())
    .filter(Boolean);

  assert(
    factors.length <= 3,
    `${id} lists more than three astrological factors: ${title}`,
  );

  const humanWords = human.split(/\s+/u).filter(Boolean);
  assert(
    humanWords.length <= 8,
    `${id} human theme is too long: ${title}`,
  );
}

for (const story of plan.topStories) {
  assertTitleContract(story.title, `top/${story.anchorId}`);
  assert(
    typeof story.technicalLine === "string" &&
      story.technicalLine.trim().length > 0,
    `top story missing technical line: ${story.anchorId}`,
  );
  assert(
    story.evidenceRefs.length > 0,
    `top story missing evidence: ${story.anchorId}`,
  );
}

for (const story of plan.importantAspects) {
  assertTitleContract(story.title, `aspect/${story.aspect.id}`);
  assert(
    typeof story.technicalLine === "string" &&
      story.technicalLine.trim().length > 0,
    `important aspect missing technical line: ${story.aspect.id}`,
  );
  assert(
    story.evidence.length > 0,
    `important aspect missing evidence: ${story.aspect.id}`,
  );
}

const topAspectIds = new Set(
  plan.topStories.flatMap((story) => story.sourceAspectIds),
);
assert(
  !plan.importantAspects.some((story) => topAspectIds.has(story.aspect.id)),
  "top-owned aspect repeats as full important-aspect story",
);

// HALLEUS_R39_STAGE1_HOUSE_CLUSTER_LANGUAGE_OWNERSHIP_S3_20260901
const topHouseClusterHouses = new Set(
  plan.topStories
    .filter(
      (story) =>
        story.kind === "cluster" &&
        story.semanticKey.startsWith("cluster:house:"),
    )
    .flatMap((story) => story.sourceHouseIds),
);
assert(
  !plan.importantHouses.some((story) =>
    topHouseClusterHouses.has(story.houseNumber),
  ),
  "top cluster house repeats as full important-house story",
);

const visibleRuntimeText = [
  ...plan.topStories.flatMap((story) => [
    story.title,
    story.technicalLine ?? "",
    story.summary,
    ...story.rankingReasons,
    ...story.evidenceRefs.flatMap((evidence) => [
      evidence.label,
      evidence.detail,
    ]),
  ]),
  ...plan.importantAspects.flatMap((story) => [
    story.title,
    story.technicalLine,
    story.dailyLife,
    ...story.evidence.flatMap((evidence) => [
      evidence.label,
      evidence.detail,
    ]),
  ]),
].join(" ");

for (const deprecated of [
  "مقارنه",
  "تسدیس",
  "مربع",
  "تثلیث",
  "مقابله",
  "Grand Trine",
]) {
  assert(
    !visibleRuntimeText.includes(deprecated),
    `runtime-visible report text contains deprecated aspect vocabulary: ${deprecated}`,
  );
}

assert(
  !visibleRuntimeText.includes("یک T-square کامل"),
  "runtime-visible report text retains raw T-square phrase",
);

for (const required of ["☌ ۰°", "⚹ ۶۰°", "□ ۹۰°", "△ ۱۲۰°", "☍ ۱۸۰°"]) {
  assert(
    Object.values(approvedAspects).includes(required),
    `approved aspect authority missing ${required}`,
  );
}

// HALLEUS_DEEP_NARRATIVE_SLICE1_EXACT_ANGLE_GUARD_R4_20260902
{
  const aspectDisplaySource = read(
    "lib/astrology/report-aspect-display.ts",
  );
  const plannerSource = read("lib/astrology/adaptive-report-planner.ts");
  const adaptiveSource = read(
    "components/report/ReportAdaptiveNarrative.tsx",
  );
  const productReaderSource = read(
    "components/report/ReportProductReader.tsx",
  );
  const technicalSource = read(
    "components/report/ReportTechnicalAppendix.tsx",
  );
  const transitBridgeSource = read(
    "src/lib/report-output/personal-transit-report-data-bridge.ts",
  );

  for (const marker of [
    "buildReportAspectGeometryFacts",
    "formatReportNarrativeAngle",
    "formatReportTechnicalAngle",
    "formatReportNarrativeAspectGeometry",
    "actualSeparation",
    "distanceFromExact",
  ]) {
    assert(
      aspectDisplaySource.includes(marker),
      `exact-angle display contract missing marker: ${marker}`,
    );
  }

  assert(
    aspectDisplay.formatReportNarrativeAngle(90.3) === "۹۰٫۳°",
    `narrative angle formatter drifted: ${aspectDisplay.formatReportNarrativeAngle(
      90.3,
    )}`,
  );
  assert(
    aspectDisplay.formatReportTechnicalAngle(90.3) === "۹۰٫۳۰°",
    `technical angle formatter drifted: ${aspectDisplay.formatReportTechnicalAngle(
      90.3,
    )}`,
  );

  const squareGeometry =
    aspectDisplay.formatReportNarrativeAspectGeometry({
      aspectId: "square",
      referenceAngle: 90,
      separation: 90.3,
      distanceFromExact: 0.3,
    });
  assert(
    squareGeometry === "□ ۹۰٫۳°",
    `actual separation must own normal narrative geometry: ${squareGeometry}`,
  );

  const oldSnapshotFallback =
    aspectDisplay.formatReportNarrativeAspectGeometry({
      aspectId: "square",
      referenceAngle: 90,
      separation: undefined,
      distanceFromExact: 0.3,
    });
  assert(
    oldSnapshotFallback ===
      "□ زاویهٔ مرجع ۹۰° · فاصله از دقیق ۰٫۳°",
    `missing separation must not fabricate an actual angle: ${oldSnapshotFallback}`,
  );

  const factsWithoutSeparation =
    aspectDisplay.buildReportAspectGeometryFacts({
      aspectId: "square",
      referenceAngle: 90,
      distanceFromExact: 3,
    });
  assert(
    factsWithoutSeparation.actualSeparation === null,
    "actual separation must stay null when the stored separation is missing",
  );

  for (const marker of [
    "referenceAngle: aspect.angle",
    "separation: aspect.separation",
    "distanceFromExact: aspect.orb",
  ]) {
    assert(
      plannerSource.includes(marker),
      `natal narrative fact projection missing marker: ${marker}`,
    );
  }

  assert(
    adaptiveSource.includes("formatReportNarrativeAspectGeometry"),
    "adaptive aspect fallback must consume the shared actual-angle contract",
  );

  for (const marker of [
    '"exactAngle"',
    '"separation"',
    "referenceAngle: aspect.exactAngle",
    "separation: aspect.separation",
    "distanceFromExact: aspect.orb",
  ]) {
    assert(
      productReaderSource.includes(marker),
      `stored transit geometry display missing marker: ${marker}`,
    );
  }

  for (const marker of [
    "exactAngle?: number;",
    "separation?: number;",
  ]) {
    assert(
      transitBridgeSource.includes(marker),
      `personal transit bridge must preserve stored geometry field: ${marker}`,
    );
  }

  for (const marker of [
    "زاویهٔ مرجع",
    "زاویهٔ واقعی",
    "فاصله از دقیق",
    "formatReportTechnicalAngle(row.exactAngle)",

    "formatReportTechnicalAngle(row.separation)",
    "formatReportTechnicalAngle(row.orb)",
  ]) {
    assert(
      technicalSource.includes(marker),
      `technical angle surface missing marker: ${marker}`,
    );
  }

  assert(
    !productReaderSource.includes("اورب ${aspect.orb"),
    "normal transit label must not expose the old orb scaffold",
  );
}

if (failures.length) {
  console.error("Slice 1 language/title/ownership guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Slice 1 report language/title/ownership guard passed.");
