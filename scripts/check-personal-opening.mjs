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

const { buildPersonalOpening } = require(
  "../lib/astrology/real-engine-report-writer.ts",
);

function signature({
  dominantElement,
  dominantModality,
  dominantExpression,
  lowElements = [],
  zeroElements = [],
}) {
  return {
    version: "chart-signature-v1",
    method: "equal-weight-major-planets",
    elementCounts: { fire: 5, earth: 2, air: 2, water: 1 },
    modalityCounts: { cardinal: 5, fixed: 3, mutable: 2 },
    expressionCounts: { active: 7, receptive: 3 },
    dominantElement,
    dominantModality,
    dominantExpression,
    lowElements,
    lowModalities: [],
    lowExpressions: [],
    zeroElements,
    zeroModalities: [],
    evidence: [],
    excludedPlacementIds: [],
  };
}

function aspect({
  id,
  firstPlanetId,
  firstPlanetLabel,
  secondPlanetId,
  secondPlanetLabel,
  aspectId,
  aspectLabel,
}) {
  return {
    id,
    firstPlanetId,
    firstPlanetLabel,
    secondPlanetId,
    secondPlanetLabel,
    aspectId,
    aspectLabel,
    glyph: "",
    angle: 0,
    separation: 0,
    orb: 1,
    meaning: "fixture",
    narrative: "fixture",
  };
}

function openingSentences(opening) {
  return (opening.match(/[^.!؟]+[.!؟]?/gu) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .replace(/[\u200c\u200f\u202a-\u202e]/gu, "")
    .replace(/[\s\u00a0]+/gu, " ")
    .replace(/[.،؛:!?؟«»()[\]{}\-–—]/gu, "")
    .trim();
}

function assertExperienceFirstOpening(opening, label) {
  const sentences = openingSentences(opening);

  assert.equal(sentences.length, 5, `${label} must contain exactly five sentences.`);
  assert.match(sentences[0], /شاید|ممکن است/);
  assert.doesNotMatch(
    sentences[0],
    /چارت|رایزینگ|سیاره|خانه|خورشید|ماه|عطارد|زهره|مریخ|مشتری|زحل|اورانوس|نپتون|پلوتو/,
    `${label} starts with astrology instead of lived experience.`,
  );
  assert.match(sentences[3], /این برداشت بیشتر از|این تصویر بیشتر از/);
  assert.match(sentences[4], /دفعهٔ بعد|برای دیدن این الگو در زندگی واقعی/);
  assert.equal(
    new Set(sentences.map(normalize)).size,
    5,
    `${label} repeats an opening sentence.`,
  );
  assert.ok(
    opening.length >= 520 && opening.length <= 1800,
    `${label} is outside the experience-first reading boundary.`,
  );
  assert.doesNotMatch(
    opening,
    /تو همیشه|تو هرگز|سرنوشت تو|محکوم هستی|چارت ثابت می‌کند|این یعنی حتماً|اختلال|بیماری روانی/,
    `${label} contains deterministic or diagnostic language.`,
  );
  assert.doesNotMatch(
    opening,
    /ساعت تولد|تاریخ تولد|شهر تولد|ترانزیت|پیش‌بینی آینده|آیندهٔ قطعی/,
    `${label} introduced data outside verified opening inputs.`,
  );
  assert.doesNotMatch(
    opening,
    /سه الگوی اصلی این چارت|نقطهٔ قوت اصلی|چالش اصلی|جمله‌ای که می‌توانی نگه داری|برای ورود به این گزارش، یک نخ را نگه دار/,
    `${label} retained the structural report-first opening.`,
  );
}

const fireSignature = signature({
  dominantElement: "fire",
  dominantModality: "cardinal",
  dominantExpression: "active",
  lowElements: ["water"],
});
const waterSignature = signature({
  dominantElement: "water",
  dominantModality: "mutable",
  dominantExpression: "receptive",
  lowElements: ["air"],
});

const moonSaturnChallenge = aspect({
  id: "moon-square-saturn",
  firstPlanetId: "moon",
  firstPlanetLabel: "ماه",
  secondPlanetId: "saturn",
  secondPlanetLabel: "زحل",
  aspectId: "square",
  aspectLabel: "تربیع",
});
const venusUranusChallenge = aspect({
  id: "venus-opposition-uranus",
  firstPlanetId: "venus",
  firstPlanetLabel: "زهره",
  secondPlanetId: "uranus",
  secondPlanetLabel: "اورانوس",
  aspectId: "opposition",
  aspectLabel: "مقابله",
});
const sunJupiterSupport = aspect({
  id: "sun-trine-jupiter",
  firstPlanetId: "sun",
  firstPlanetLabel: "خورشید",
  secondPlanetId: "jupiter",
  secondPlanetLabel: "مشتری",
  aspectId: "trine",
  aspectLabel: "تثلیث",
});
const venusJupiterSupport = aspect({
  id: "venus-trine-jupiter",
  firstPlanetId: "venus",
  firstPlanetLabel: "زهره",
  secondPlanetId: "jupiter",
  secondPlanetLabel: "مشتری",
  aspectId: "trine",
  aspectLabel: "تثلیث",
});
const mercuryMarsBridge = aspect({
  id: "mercury-sextile-mars",
  firstPlanetId: "mercury",
  firstPlanetLabel: "عطارد",
  secondPlanetId: "mars",
  secondPlanetLabel: "مریخ",
  aspectId: "sextile",
  aspectLabel: "تسدیس",
});
const moonMarsBridge = aspect({
  id: "moon-sextile-mars",
  firstPlanetId: "moon",
  firstPlanetLabel: "ماه",
  secondPlanetId: "mars",
  secondPlanetLabel: "مریخ",
  aspectId: "sextile",
  aspectLabel: "تسدیس",
});

const crowdOpening = buildPersonalOpening({
  name: "هاله",
  risingSign: "cancer",
  chartRulerId: "moon",
  chartRulerPlacement: {
    id: "moon",
    label: "ماه",
    signId: "pisces",
    longitude: 349,
    degreeInSign: 19,
    house: 11,
    method: "fixture",
  },
  activeHouseNumber: 11,
  chartSignature: waterSignature,
  synthesisPlan: {
    primaryHouseNumber: 11,
    primaryChallenge: moonSaturnChallenge,
    primarySupport: venusJupiterSupport,
    dailyBridge: mercuryMarsBridge,
  },
});
assertExperienceFirstOpening(crowdOpening, "Crowd-belonging opening");
const crowdSentences = openingSentences(crowdOpening);
assert.match(
  crowdSentences[0],
  /^هاله، شاید حتی وقتی میان آدم‌ها هستی، بخشی از تو همچنان منتظر بماند تا واقعاً دیده یا فهمیده شود/,
);
assert.match(crowdOpening, /امنیت عاطفی/);
assert.match(crowdOpening, /مرز و مسئولیت/);
assert.match(crowdOpening, /رابطهٔ تنشی ماه و زحل/);
assert.match(crowdOpening, /خانه ۱۱/);
assert.match(crowdOpening, /جمع، دوستی و آینده‌سازی/);
assert.match(crowdOpening, /رایزینگ سرطان/);
assert.match(crowdOpening, /سیارهٔ راهبر/);

const relationshipOpening = buildPersonalOpening({
  name: "آراد",
  risingSign: "libra",
  chartRulerId: "venus",
  activeHouseNumber: 7,
  chartSignature: signature({
    dominantElement: "air",
    dominantModality: "cardinal",
    dominantExpression: "active",
  }),
  synthesisPlan: {
    primaryHouseNumber: 7,
    primaryChallenge: venusUranusChallenge,
    primarySupport: sunJupiterSupport,
    dailyBridge: moonMarsBridge,
  },
});
assertExperienceFirstOpening(relationshipOpening, "Relationship opening");
assert.match(relationshipOpening, /^آراد، شاید نزدیکی را عمیق بخواهی/);
assert.match(relationshipOpening, /کشش میان دو قطب زهره و اورانوس/);
assert.match(relationshipOpening, /خانه ۷/);
assert.notEqual(
  crowdOpening,
  relationshipOpening,
  "Different chart evidence produced the same experience-first opening.",
);

const strengthOpening = buildPersonalOpening({
  name: "هاله",
  risingSign: "aries",
  chartRulerId: "mars",
  activeHouseNumber: 5,
  chartSignature: fireSignature,
  synthesisPlan: {
    primaryHouseNumber: 5,
    primarySupport: sunJupiterSupport,
    dailyBridge: mercuryMarsBridge,
  },
});
assertExperienceFirstOpening(strengthOpening, "Strength-led opening");
assert.match(strengthOpening, /هم بخواهی دیده شوی/);
assert.match(strengthOpening, /همکاری خورشید و مشتری/);
assert.match(strengthOpening, /عنصر غالب آتش/);
assert.match(strengthOpening, /کیفیت غالب کاردینال/);

const boundedFallback = buildPersonalOpening({
  name: "",
  risingSign: "virgo",
  chartRulerId: "mercury",
});
assertExperienceFirstOpening(boundedFallback, "Bounded fallback opening");
assert.match(boundedFallback, /^شاید در بعضی موقعیت‌ها/);
assert.match(boundedFallback, /رایزینگ سنبله/);
assert.match(boundedFallback, /عطارد به‌عنوان سیارهٔ راهبر/);
assert.doesNotMatch(boundedFallback, /نامشخص|ذخیره نشده|فرض/);

const duplicateAspectOpening = buildPersonalOpening({
  name: "نمونه",
  risingSign: "cancer",
  chartRulerId: "moon",
  activeHouseNumber: 11,
  chartSignature: waterSignature,
  synthesisPlan: {
    primaryHouseNumber: 11,
    primaryChallenge: moonSaturnChallenge,
    primarySupport: moonSaturnChallenge,
    dailyBridge: moonSaturnChallenge,
  },
});
assertExperienceFirstOpening(duplicateAspectOpening, "Duplicate-evidence opening");
const duplicateSentences = openingSentences(duplicateAspectOpening);
assert.match(duplicateSentences[3], /ماه و زحل/);
assert.doesNotMatch(duplicateSentences[2], /ماه.*زحل|زحل.*ماه/);
assert.doesNotMatch(duplicateSentences[4], /امنیت عاطفی.*مرز|مرز.*امنیت عاطفی/);

const writerSource = fs.readFileSync(
  "lib/astrology/real-engine-report-writer.ts",
  "utf8",
);
for (const marker of [
  "const personalOpening = sanitizeUserFacingReportText(buildPersonalOpening({",
  "chartSignature: realEngineWithAspects.chartSignature,",
  "synthesisPlan,",
  "PERSONAL_OPENING_HOUSE_EXPERIENCES",
  "buildPersonalOpeningContrastSentence({",
  "buildPersonalOpeningResourceSentence({",
  "buildPersonalOpeningEvidenceSentence({",
  "buildPersonalOpeningDailySentence({",
  "selectDistinctPersonalOpeningAspects(synthesisPlan)",
  "personalOpening,",
  "opening: input.personalOpening",
  "body: joinSectionBody(input.summary, input.firstSynthesisText)",
  'id: "real-engine-first-synthesis"',
]) {
  assert.ok(
    writerSource.includes(marker),
    `Live writer integration is missing: ${marker}`,
  );
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(
  packageJson.scripts?.["check:personal-opening"],
  "node scripts/check-personal-opening.mjs",
  "Focused package script is not registered.",
);

const registry = JSON.parse(
  fs.readFileSync("config/halleus-check-impact.json", "utf8"),
);
const area = registry.areas.find((candidate) => candidate.id === "personal-opening");
assert.deepEqual(area?.patterns, [
  "lib/astrology/real-engine-report-writer.ts",
  "scripts/check-personal-opening.mjs",
]);
assert.deepEqual(area?.guards, ["check:personal-opening"]);
assert.equal(area?.lint, true);
assert.equal(area?.build, true);

console.log("Experience-first personal opening guard passed.");
console.log("- lived experience appears before astrology terminology");
console.log("- chart evidence is named after the human reading");
console.log("- support, challenge, and daily bridge stay distinct and data-honest");
