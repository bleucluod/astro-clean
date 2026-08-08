import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
  ];
  return candidates.find((option) => fs.existsSync(option)) ?? candidate;
}

Module._resolveFilename = function resolveHalleusAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(
        path.join(repoRoot, request.slice(2)),
      ),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(
    this,
    request,
    parent,
    isMain,
    options,
  );
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2021,
      strict: true,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const {
  buildReportThemeChapters,
} = require("../lib/astrology/real-engine-report-writer.ts");
const {
  buildRealEngineSynthesisPlan,
} = require("../lib/astrology/real-engine-synthesis.ts");
const {
  buildPlacementBehavioralInterpretation,
} = require("../lib/astrology/report-behavioral-interpretation.ts");
const {
  selectPlacementMajorAspectModifier,
} = require("../lib/astrology/report-behavioral-context.ts");

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

function aspect(id, firstPlanetId, secondPlanetId, aspectId, orb) {
  const angle =
    aspectId === "opposition" ? 180 :
    aspectId === "square" ? 90 :
    aspectId === "trine" ? 120 :
    aspectId === "sextile" ? 60 : 0;
  return {
    id,
    firstPlanetId,
    firstPlanetLabel: firstPlanetId,
    secondPlanetId,
    secondPlanetLabel: secondPlanetId,
    aspectId,
    aspectLabel: aspectId,
    glyph: "*",
    angle,
    separation: angle + orb,
    orb,
    meaning: "fixture",
    narrative: "fixture",
  };
}

const placements = [
  { id: "sun", label: "sun", longitude: 10, signId: "aries", degreeInSign: 10, house: 9, method: "fixture" },
  { id: "moon", label: "moon", longitude: 130, signId: "leo", degreeInSign: 10, house: 1, method: "fixture" },
  { id: "mercury", label: "mercury", longitude: 70, signId: "gemini", degreeInSign: 10, house: 11, method: "fixture" },
  { id: "venus", label: "venus", longitude: 190, signId: "libra", degreeInSign: 10, house: 3, method: "fixture" },
  { id: "mars", label: "mars", longitude: 100, signId: "cancer", degreeInSign: 10, house: 12, method: "fixture" },
];
const aspects = [
  aspect("sun-opposition-venus", "sun", "venus", "opposition", 0.2),
  aspect("moon-sextile-mercury", "moon", "mercury", "sextile", 0.1),
  aspect("venus-square-mars", "venus", "mars", "square", 0.2),
];
const plan = buildRealEngineSynthesisPlan({
  aspects,
  placements,
  chartRulerId: "sun",
  activeHouseNumbers: [9, 1, 3, 12],
});
const chartSpine = {
  risingSign: "leo",
  ascendantDegreeInSign: 10,
  chartRulerId: "sun",
  chartRulerPlacement: placements[0],
  chartRulerAspects: [],
  activeHouses: [{ house: { number: 9 } }],
  signClusters: [],
  houseClusters: [],
  centralAspects: aspects,
};
const chapters = buildReportThemeChapters(
  {
    placements,
    aspectHighlights: aspects,
    retrogrades: { status: "calculated", planetIds: [] },
    behavioralAudienceMode: "adult",
  },
  chartSpine,
  plan,
);

const expected = [
  ["real-engine-theme-signature", "امضای کلی چارت"],
  ["real-engine-theme-mind-language", "ذهن و زبان"],
  ["real-engine-theme-emotional-security", "احساسات و امنیت درونی"],
  ["real-engine-theme-relationship-style", "رابطه و صمیمیت"],
  ["real-engine-theme-will-action", "اراده و حرکت"],
  ["real-engine-theme-direction-path", "جهت و مسیر"],
  ["real-engine-theme-recurring-patterns", "الگوهای تکرارشونده"],
];
assert(chapters.length === expected.length, `expected seven theme chapters, got ${chapters.length}`);
assert(
  chapters.map((chapter) => chapter.id).join("|") ===
    expected.map(([id]) => id).join("|"),
  "theme chapter order is not stable",
);
for (const [id, title] of expected) {
  const chapter = chapters.find((item) => item.id === id);
  assert(chapter?.title === title, `missing or mistitled chapter: ${id}`);
  assert(
    chapter?.body.includes("پشتوانه اصلی:"),
    `chapter lacks primary evidence: ${id}`,
  );
}

const relationship = chapters.find(
  (chapter) => chapter.id === "real-engine-theme-relationship-style",
)?.body ?? "";
for (const dimension of [
  "نزدیک‌شدن:",
  "امنیت:",
  "گفت‌وگو:",
  "مرز:",
  "استقلال:",
  "ریتم صمیمیت:",
  "اصطکاک محتمل:",
  "ترمیم و همکاری:",
]) {
  assert(
    relationship.includes(dimension),
    `relationship chapter is missing dimension: ${dimension}`,
  );
}

const relationshipDimensionEvidence = [
  ["نزدیک‌شدن:", "زهره در میزان خانه ۳"],
  ["امنیت:", "ماه در اسد خانه ۱"],
  ["گفت‌وگو:", "عطارد در جوزا خانه ۱۱"],
  ["مرز:", "مریخ در سرطان خانه ۱۲"],
];
for (const [dimension, evidence] of relationshipDimensionEvidence) {
  const paragraph = relationship
    .split(/\n{2,}/u)
    .find((part) => part.startsWith(dimension));
  assert(
    paragraph?.includes(evidence),
    `relationship dimension is not placement-backed: ${dimension}`,
  );
}

for (const planetId of ["venus", "moon", "mercury", "mars"]) {
  const placement = placements.find((item) => item.id === planetId);
  const reading = buildPlacementBehavioralInterpretation({
    planetId,
    signId: placement.signId,
    houseNumber: placement.house,
    audienceMode: "adult",
    majorAspect: selectPlacementMajorAspectModifier(planetId, aspects),
  });
  for (const field of [
    "dailyLifeExample",
    "healthyExpression",
    "possibleFriction",
    "smallExperiment",
  ]) {
    const copiedText = reading?.[field];
    assert(
      !copiedText || !relationship.includes(copiedText),
      `relationship chapter reuses ${planetId} placement ${field}`,
    );
  }
}

const recurring = chapters.find(
  (chapter) => chapter.id === "real-engine-theme-recurring-patterns",
)?.body ?? "";
assert(
  plan.primaryChallenge?.id === "sun-opposition-venus",
  "fixture no longer selects the expected relationship challenge",
);
assert(
  plan.primarySupport?.id === "moon-sextile-mercury",
  "fixture no longer selects the expected relationship support",
);
assert(
  plan.dailyBridge?.id === "venus-square-mars",
  "fixture no longer selects the expected distinct recurring-pattern aspect",
);
assert(
  relationship.includes("گفت‌وگوی خورشید و زهره") &&
    relationship.includes("همکاری ماه و عطارد"),
  "relationship chapter no longer owns its selected challenge and support",
);
assert(
  recurring.includes("گفت‌وگوی زهره و مریخ") &&
    recurring.includes("پشتوانه اصلی: رابطهٔ متمایز زهره و مریخ."),
  "recurring-pattern chapter does not use the distinct daily bridge",
);
assert(
  !recurring.includes("الگوی منتخب خورشید و زهره") &&
    !recurring.includes("راه خروج از تکرار فقط فشار بیشتر نیست؛ همکاری ماه و عطارد"),
  "recurring-pattern chapter reuses relationship chapter evidence",
);

const singleAspectPlan = buildRealEngineSynthesisPlan({
  aspects: [aspects[0]],
  placements,
  chartRulerId: "sun",
  activeHouseNumbers: [9, 1, 3, 12],
});
const singleAspectChapters = buildReportThemeChapters(
  {
    placements,
    aspectHighlights: [aspects[0]],
    retrogrades: { status: "calculated", planetIds: [] },
    behavioralAudienceMode: "adult",
  },
  {
    ...chartSpine,
    centralAspects: [aspects[0]],
  },
  singleAspectPlan,
);
const singleAspectRecurring =
  singleAspectChapters.find(
    (chapter) => chapter.id === "real-engine-theme-recurring-patterns",
  )?.body ?? "";
const singleAspectEvidence =
  singleAspectRecurring.match(/پشتوانه اصلی:[^\n]+/u)?.[0] ?? "";
assert(
  /^پشتوانه اصلی: (خوشهٔ|میدان )/u.test(singleAspectEvidence),
  "recurring-pattern fallback must use cluster or house evidence",
);
assert(
  !singleAspectEvidence.includes("رابطهٔ متمایز"),
  "recurring-pattern fallback invents a distinct aspect",
);

const allText = chapters.map((chapter) => chapter.body).join("\n");
assert(!/اورب|درجه/u.test(allText), "main theme chapters expose orb/degree detail");
assert(!/درصد سازگاری|سینستری|شخص دوم/u.test(allText), "single-chart chapter drifts into compatibility/synastry");

const evidenceLines = chapters.map((chapter) =>
  chapter.body.match(/پشتوانه اصلی:[^\n]+/u)?.[0] ?? "",
);
assert(
  evidenceLines.every(Boolean),
  "one or more chapters lack an evidence line",
);
assert(
  new Set(evidenceLines).size === evidenceLines.length,
  "primary evidence lines must remain distinct across chapters",
);

const writerSource = fs.readFileSync(
  "lib/astrology/real-engine-report-writer.ts",
  "utf8",
);
for (const marker of [
  "venusReading?.dailyLifeExample",
  "moonReading?.healthyExpression",
  "mercuryReading?.healthyExpression",
  "marsReading?.healthyExpression",
]) {
  assert(
    !writerSource.includes(marker),
    `relationship chapter still directly reuses placement copy: ${marker}`,
  );
}
// HALLEUS_REPORT_THEME_CHAPTERS_HUMAN_FIRST_SYNC_20260806
const contractSource = fs.readFileSync(
  "lib/report-output/live-report-reading-contract.ts",
  "utf8",
);
const humanReadingSource = fs.readFileSync(
  "lib/report-output/human-first-report-reading.ts",
  "utf8",
);
const componentSource = fs.readFileSync(
  "components/ReportV3Experience.tsx",
  "utf8",
);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const marker of [
  "buildReportThemeChapters",
  "const themeChapters = buildReportThemeChapters(",
  "themeChapters,",
  "...(input.themeChapters ?? [])",
]) {
  assert(writerSource.includes(marker), `writer integration marker missing: ${marker}`);
}
for (const marker of [
  "LiveReportThemeChapter",
  "const CHAPTER_SPECS: ChapterSpec[] = [",
  "const themeChapters = buildThemeChapters(",
  "collectVisibleNatalText({",
  "themeChapters,",
]) {
  assert(contractSource.includes(marker), `reading contract marker missing: ${marker}`);
}
for (const marker of [
  "buildHumanFirstBirthReading",
  "contract.themeChapters.find",
  "buildChapter(",
  "buildDeeperLayers(contract)",
]) {
  assert(humanReadingSource.includes(marker), `human-first reading marker missing: ${marker}`);
}
for (const marker of [
  "buildHumanFirstBirthReading",
  "reading.opening",
  "reading.primaryPatterns",
  "reading.relationships",
  "reading.growthPath",
]) {
  assert(componentSource.includes(marker), `human-first component marker missing: ${marker}`);
}
assert(
  pkg.scripts?.["check:report-theme-chapters"] ===
    "node scripts/check-report-theme-chapters.mjs",
  "package script for theme chapter guard is missing",
);
for (const aggregate of ["check:project", "check:reports"]) {
  assert(
    pkg.scripts?.[aggregate]?.includes("pnpm run check:report-theme-chapters"),
    `${aggregate} does not include theme chapter guard`,
  );
}

if (failures.length > 0) {
  console.error("Report theme chapter check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Report theme chapter check passed.");
console.log("- seven topic chapters are ordered and data-backed");
console.log("- relationship style covers eight single-chart dimensions");
console.log("- relationship dimensions use placement-backed, relationship-specific copy");
console.log("- standalone placement interpretation is not repeated verbatim in relationships");
console.log("- relationship and recurring-pattern chapters use distinct aspect evidence");
console.log("- recurring-pattern fallback stays cluster- or house-backed");
console.log("- primary evidence stays distinct and technical detail stays out");
console.log("- live reading contract and human-first report consume the chapters");
