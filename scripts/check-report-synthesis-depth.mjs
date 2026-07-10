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
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
  ];

  for (const option of candidates) {
    if (fs.existsSync(option)) {
      return option;
    }
  }

  return candidate;
}

Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  });

  module._compile(transpiled.outputText, filename);
};

const {
  buildRealEngineSynthesisPlan,
  getRealEngineSynthesisRoles,
} = require("../lib/astrology/real-engine-synthesis.ts");
const writerSource = fs.readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const plannerSource = fs.readFileSync("lib/astrology/real-engine-synthesis.ts", "utf8");
const sampleQaSource = fs.readFileSync("scripts/check-report-sample-qa.mjs", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

function aspect(id, firstPlanetId, secondPlanetId, aspectId, orb) {
  return {
    id,
    firstPlanetId,
    firstPlanetLabel: firstPlanetId,
    secondPlanetId,
    secondPlanetLabel: secondPlanetId,
    aspectId,
    aspectLabel: aspectId,
    glyph: "*",
    angle: aspectId === "opposition" ? 180 : aspectId === "square" ? 90 : aspectId === "trine" ? 120 : aspectId === "sextile" ? 60 : 0,
    separation: 0,
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
  aspect("mercury-conjunction-jupiter", "mercury", "jupiter", "conjunction", 0.8),
];

const buildPlan = (items) =>
  buildRealEngineSynthesisPlan({
    aspects: items,
    placements,
    chartRulerId: "sun",
    activeHouseNumbers: [9, 1],
  });

const plan = buildPlan(aspects);
const shuffledPlan = buildPlan([aspects[2], aspects[0], aspects[3], aspects[1]]);
const failures = [];

if (plan.primaryChallenge?.id !== "sun-opposition-venus") {
  failures.push(`expected Sun-Venus as primary challenge, got ${plan.primaryChallenge?.id ?? "none"}`);
}

if (plan.primarySupport?.id !== "moon-sextile-mercury") {
  failures.push(`expected Moon-Mercury as primary support, got ${plan.primarySupport?.id ?? "none"}`);
}

if (plan.dailyBridge?.id !== "venus-square-mars") {
  failures.push(`expected Venus-Mars as daily bridge, got ${plan.dailyBridge?.id ?? "none"}`);
}

if (plan.primaryHouseNumber !== 9) {
  failures.push(`expected selected evidence to anchor primary house 9, got ${plan.primaryHouseNumber}`);
}

const roles = getRealEngineSynthesisRoles(plan);
if (roles.map((role) => role.id).join(",") !== "challenge,support,daily-bridge") {
  failures.push(`unexpected synthesis role order: ${roles.map((role) => role.id).join(",")}`);
}

if (roles.map((role) => role.aspect.id).join(",") !== plan.evidenceAspectIds.join(",")) {
  failures.push("role order and evidenceAspectIds diverged");
}

if (new Set(plan.evidenceAspectIds).size !== plan.evidenceAspectIds.length) {
  failures.push("synthesis evidence aspect ids are not unique");
}

for (const key of ["primaryChallenge", "primarySupport", "dailyBridge"]) {
  if (plan[key]?.id !== shuffledPlan[key]?.id) {
    failures.push(`synthesis selection is not deterministic for ${key}`);
  }
}

const conjunctionOnly = buildPlan([
  aspect("mercury-conjunction-jupiter", "mercury", "jupiter", "conjunction", 0.3),
]);
if (conjunctionOnly.primaryChallenge?.id !== "mercury-conjunction-jupiter") {
  failures.push("conjunction fallback is not used when no square/opposition exists");
}

const emptyPlan = buildPlan([]);
if (emptyPlan.primaryChallenge || emptyPlan.primarySupport || emptyPlan.dailyBridge) {
  failures.push("empty aspect input should not invent synthesis evidence");
}

for (const marker of [
  "buildRealEngineSynthesisPlan",
  "buildSynthesisChallengeThread",
  "buildSynthesisSupportThread",
  "buildSynthesisDailyBridgeThread",
  "buildSynthesisAspectBridge",
  "buildSynthesisWeeklyPractice",
  "buildSynthesisPracticeItems",
  "buildSynthesisRoleContinuation",
  "جمع‌بندی همان نخ آغاز گزارش را نگه می‌دارد",
  "کشمکش اصلی",
  "منبع همراه",
  "ترجمهٔ روزمره",
  "تمرین این هفته",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`report writer missing synthesis-depth marker: ${marker}`);
  }
}

for (const marker of [
  "primaryChallenge",
  "primarySupport",
  "dailyBridge",
  "evidenceAspectIds",
  "getRealEngineSynthesisRoles",
  "selectedParticipantHouses",
  "getSynthesisRelevance",
]) {
  if (!plannerSource.includes(marker)) {
    failures.push(`synthesis planner missing marker: ${marker}`);
  }
}

for (const forbidden of [
  "دو نیاز هم‌زمان فعال‌اند و هیچ‌کدام نباید کامل حذف شوند",
  'placement?.signId === "aquarius" && placement.house === 6',
  'chartSpine.chartRulerId === "mercury"',
]) {
  if (writerSource.includes(forbidden)) {
    failures.push(`report writer still contains forbidden generic/special-case branch: ${forbidden}`);
  }
}

for (const marker of [
  "کشمکش اصلی:",
  "منبع همراه:",
  "ترجمهٔ روزمره:",
  "تمرین این هفته:",
  "totalWords > 1450",
]) {
  if (!sampleQaSource.includes(marker)) {
    failures.push(`sample QA missing synthesis-depth acceptance marker: ${marker}`);
  }
}

if (packageJson.scripts?.["check:report-synthesis-depth"] !== "node scripts/check-report-synthesis-depth.mjs") {
  failures.push("package.json missing check:report-synthesis-depth script");
}

for (const aggregate of ["check:project", "check:reports"]) {
  if (!(packageJson.scripts?.[aggregate] ?? "").includes("pnpm run check:report-synthesis-depth")) {
    failures.push(`${aggregate} does not run check:report-synthesis-depth`);
  }
}

if (failures.length > 0) {
  console.error("Report synthesis depth check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Report synthesis depth check passed.");
console.log("- primary challenge, support, and daily bridge are selected deterministically");
console.log("- synthesis uses actual planet roles, signs, and house fields");
console.log("- old generic tension sentence and person-specific branches are blocked");
console.log("- report sample QA keeps the main narrative under 1450 words");
