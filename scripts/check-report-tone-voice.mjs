import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(process.cwd(), request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const tonePath = "lib/report-quality/tone-profile.ts";
const writerPath = "lib/astrology/real-engine-report-writer.ts";
const toneSource = fs.readFileSync(tonePath, "utf8");
const writerSource = fs.readFileSync(writerPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

for (const marker of [
  "preferredPatterns",
  "avoidedPatterns",
  "applyHalleusReportVoice",
  "فارسی روان، صمیمی و محترمانه",
  "توضیح یکپارچه چارت",
  "دعوت به مشاهده",
]) {
  assert.ok(toneSource.includes(marker), `Tone profile is missing: ${marker}`);
}

assert.ok(
  writerSource.includes(
    'import { applyHalleusReportVoice } from "@/lib/report-quality/tone-profile";',
  ),
  "The live report writer does not import the shared voice policy.",
);
assert.ok(
  writerSource.includes("return applyHalleusReportVoice(text)"),
  "The live report sanitizer does not apply the shared voice policy.",
);

const {
  applyHalleusReportVoice,
  HALLEUS_REPORT_TONE_PROFILE,
} = require("../lib/report-quality/tone-profile.ts");
const {
  buildActiveHousesText,
  buildChartBalanceText,
  buildChartRulerText,
  buildCoreSynthesisThread,
  buildRealEngineInterpretationSections,
} = require("../lib/astrology/real-engine-report-writer.ts");

const fixtures = [
  ["تو همیشه از تغییر فرار می‌کنی.", "گاهی از تغییر فرار می‌کنی."],
  ["تو هرگز احساساتت را نمی‌گویی.", "گاهی احساساتت را نمی‌گویی."],
  ["سرنوشت تو تنهایی است.", "این چارت درباره تنهایی است."],
  [
    "چارت ثابت می‌کند که این یعنی حتماً موفق می‌شوی.",
    "چارت به‌صورت نمادین نشان می‌دهد که این می‌تواند به این معنا باشد که موفق می‌شوی.",
  ],
  ["تمرکز روی self-reflection مفید است.", "تمرکز روی خودنگری مفید است."],
];

for (const [input, expected] of fixtures) {
  assert.equal(applyHalleusReportVoice(input), expected);
}

for (const phrase of HALLEUS_REPORT_TONE_PROFILE.avoidedPatterns) {
  assert.ok(
    !applyHalleusReportVoice(`نمونه: ${phrase}.`).includes(phrase),
    `Avoided phrase survives voice normalization: ${phrase}`,
  );
}

function placement(id, signId, house) {
  return {
    id,
    label: id,
    signId,
    house,
    longitude: 0,
    degreeInSign: 0,
    method: "fixture",
  };
}

function firstSentence(text) {
  return (text.match(/[^.!؟]+[.!؟]?/u)?.[0] ?? "").trim();
}

function assertExperienceFirst(text, label) {
  const first = firstSentence(text);
  assert.match(first, /ممکن است|شاید/, `${label} does not open with lived experience.`);
  assert.doesNotMatch(
    first,
    /چارت|رایزینگ|سیاره|خورشید|ماه|عطارد|زهره|مریخ|مشتری|زحل|اورانوس|نپتون|پلوتو|خانه\s*[۰-۹0-9]/u,
    `${label} opens with astrology terminology instead of human experience.`,
  );
  assert.doesNotMatch(
    text,
    /تو همیشه|تو هرگز|سرنوشت تو|محکوم هستی|چارت ثابت می‌کند|این یعنی حتماً|اختلال|بیماری روانی/u,
    `${label} contains deterministic or diagnostic language.`,
  );
}

const sun = placement("sun", "leo", 5);
const moon = placement("moon", "cancer", 11);
const mars = placement("mars", "virgo", 6);
const snapshot = {
  placements: [sun, moon, mars],
  aspectHighlights: [],
  retrogrades: { status: "calculated", planetIds: [] },
  ascendantLongitude: 8,
};
const chartSpine = {
  risingSign: "aries",
  ascendantDegreeInSign: 8,
  chartRulerId: "mars",
  chartRulerPlacement: mars,
  chartRulerAspects: [],
  activeHouses: [
    {
      house: {
        number: 6,
        signId: "virgo",
        startLongitude: 0,
        endLongitude: 30,
        system: "placidus",
        reliability: "calculated",
        planetIds: ["mars"],
        angleIds: [],
      },
      score: 45,
      placementIds: ["mars"],
      angleIds: [],
      reasons: [{ id: "chart-ruler-house", planetIds: ["mars"] }],
    },
  ],
  signClusters: [],
  houseClusters: [],
  centralAspects: [],
};
const balance = {
  version: "chart-signature-v1",
  method: "equal-weight-major-planets",
  elementCounts: { fire: 5, earth: 2, air: 2, water: 1 },
  modalityCounts: { cardinal: 5, fixed: 3, mutable: 2 },
  expressionCounts: { active: 7, receptive: 3 },
  dominantElement: "fire",
  dominantModality: "cardinal",
  dominantExpression: "active",
  lowElements: ["water"],
  lowModalities: [],
  lowExpressions: [],
  zeroElements: ["water"],
  zeroModalities: [],
  evidence: [],
  excludedPlacementIds: [],
};

const coreText = buildCoreSynthesisThread(sun, moon, "aries", snapshot);
assertExperienceFirst(coreText, "Sun-Moon-rising section");
assert.match(coreText, /خلاقیت، عشق و بیان شخصی/);
assert.match(coreText, /جمع، دوستی و آینده‌سازی/);
assert.match(coreText, /خورشید اسد خانه ۵/);
assert.match(coreText, /ماه سرطان خانه ۱۱/);
assert.match(coreText, /رایزینگ حمل/);
assert.match(coreText, /در یک تصمیم واقعی/);

const chartRulerText = buildChartRulerText(chartSpine, snapshot);
assertExperienceFirst(chartRulerText, "Chart-ruler section");
assert.match(chartRulerText, /کار روزمره، بدن و عادت‌ها/);
assert.match(chartRulerText, /مریخ در سنبله/);
assert.match(chartRulerText, /سیارهٔ راهبر چارت/);
assert.match(chartRulerText, /برای دیدن این الگو در زندگی واقعی/);

const activeHouseText = buildActiveHousesText(chartSpine);
assertExperienceFirst(activeHouseText, "Active-houses section");
assert.match(activeHouseText, /کار روزمره، بدن و عادت‌ها/);
assert.match(activeHouseText, /خانه ۶/);
assert.match(activeHouseText, /حاکم چارت/);
assert.match(activeHouseText, /این تأکید از خود چارت می‌آید/);

const balanceText = buildChartBalanceText(snapshot, balance);
assertExperienceFirst(balanceText, "Chart-balance section");
assert.match(balanceText, /عنصر غالب آتش/);
assert.match(balanceText, /کیفیت غالب کاردینال/);
assert.match(balanceText, /ریتم بیان فعال/);
assert.match(balanceText, /کم‌حضور بودن آب به معنی بی‌احساسی نیست/);
assert.match(balanceText, /برای دیدن این ترکیب در زندگی واقعی/);

const personalOpening = "ممکن است آغاز گزارش واقعاً دربارهٔ تجربهٔ خودت باشد.";
const sections = buildRealEngineInterpretationSections({
  personalOpening,
  summary: "خلاصهٔ فنی بعدی.",
  coreSynthesisText: coreText,
  chartRulerText,
  activeHouseText,
  balanceText,
  firstSynthesisText: "سنتز بعدی.",
  integrationText: "یکپارچگی بعدی.",
});
const sectionById = new Map(sections.map((section) => [section.id, section]));

assert.ok(
  sectionById.get("real-engine-first-synthesis")?.body.startsWith(personalOpening),
  "The personal opening is still preceded by a generic reading instruction.",
);
for (const [sectionId, expectedStart] of [
  ["real-engine-core-pattern", firstSentence(coreText)],
  ["real-engine-chart-ruler", firstSentence(chartRulerText)],
  ["real-engine-active-houses", firstSentence(activeHouseText)],
  ["real-engine-balance", firstSentence(balanceText)],
]) {
  assert.ok(
    sectionById.get(sectionId)?.body.startsWith(expectedStart),
    `${sectionId} is still preceded by report-first boilerplate.`,
  );
}

for (const marker of [
  "buildCoreSynthesisThread(\n    sun,\n    moon,\n    risingSign,\n    realEngineWithAspects,",
  "opening: input.chartRulerText,",
  "opening: activeHouseBody,",
  "opening: input.balanceText,",
  'id: "real-engine-daily-life"',
  'id: "real-engine-node-axis"',
]) {
  assert.ok(writerSource.includes(marker), `Live experience-first integration is missing: ${marker}`);
}

assert.equal(
  packageJson.scripts?.["check:report-tone-voice"],
  "node scripts/check-report-tone-voice.mjs",
  "Package script is not registered.",
);

console.log("Experience-first core report tone guard passed.");
console.log("- selected core sections begin with lived experience, not astrology labels");
console.log("- each section names its calculated chart evidence after the human reading");
console.log("- summary ordering preserves the personal opening as the first visible paragraph");
