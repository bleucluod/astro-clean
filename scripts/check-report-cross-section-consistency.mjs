import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`];
  return candidates.find((option) => fs.existsSync(option)) ?? candidate;
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
const {
  buildWholeChartSynthesisThread,
} = require("../lib/astrology/real-engine-report-writer.ts");
const writerSource = fs.readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const sampleQaSource = fs.readFileSync("scripts/check-report-sample-qa.mjs", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const failures = [];

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
    angle: aspectId === "opposition" ? 180 : aspectId === "square" ? 90 : aspectId === "trine" ? 120 : 60,
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

const plan = buildRealEngineSynthesisPlan({
  aspects: [
    aspect("sun-opposition-venus", "sun", "venus", "opposition", 0.2),
    aspect("moon-sextile-mercury", "moon", "mercury", "sextile", 0.1),
    aspect("venus-square-mars", "venus", "mars", "square", 0.2),
  ],
  placements,
  chartRulerId: "sun",
  activeHouseNumbers: [1, 9],
});

const roles = getRealEngineSynthesisRoles(plan);
if (roles.length !== 3) {
  failures.push(`expected 3 synthesis roles, got ${roles.length}`);
}
if (roles.map((role) => role.id).join(",") !== "challenge,support,daily-bridge") {
  failures.push("synthesis roles are not stable and ordered");
}
if (plan.primaryHouseNumber !== 9) {
  failures.push(`primary house should follow first selected challenge evidence, got ${plan.primaryHouseNumber}`);
}

const chartSpine = {
  risingSign: "leo",
  ascendantDegreeInSign: 10,
  chartRulerId: "sun",
  chartRulerPlacement: placements[0],
  chartRulerAspects: [],
  activeHouses: [{ house: { number: 9 } }],
  signClusters: [],
  houseClusters: [],
  centralAspects: [],
};
const wholeChartText = buildWholeChartSynthesisThread(
  {
    placements,
    aspectHighlights: roles.map((role) => role.aspect),
    retrogrades: { status: "calculated", planetIds: [] },
  },
  chartSpine,
  plan,
);

if (!wholeChartText.startsWith("ممکن است")) {
  failures.push("whole-chart synthesis does not begin with lived experience");
}
for (const marker of [
  "معنا، باور و افق‌های دورتر",
  "بدن، حضور و شروع",
  "رایزینگ اسد",
  "خورشید در حمل خانه ۹",
  "گفت‌وگوی خورشید و زهره",
  "همکاری ماه و عطارد",
]) {
  if (!wholeChartText.includes(marker)) {
    failures.push(`whole-chart synthesis missing calculated thread marker: ${marker}`);
  }
}
if (/اورب|درجه/u.test(wholeChartText)) {
  failures.push("whole-chart synthesis exposes technical orb/degree detail");
}

for (const marker of [
  "buildWholeChartSynthesisThread",
  "const wholeChartThread = buildWholeChartSynthesisThread(",
  "wholeChartThread,",
  "buildAspectOverviewText(synthesisPlan, realEngineWithAspects)",
  "getRealEngineSynthesisRoles(synthesisPlan)",
  "buildSynthesisRoleContinuation",
  "buildSynthesisPracticeItems",
  "جمع‌بندی همان نخ آغاز گزارش را نگه می‌دارد",
  "در این فصل همان رابطه‌های سیاره‌ای نخ اصلی به‌عنوان گفت‌وگوی درونی دنبال می‌شوند",
  "ادامهٔ کشمکش اصلی",
  "ادامهٔ منبع همراه",
  "ادامهٔ ترجمهٔ روزمره",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`writer missing cross-section consistency marker: ${marker}`);
  }
}

if ((writerSource.match(/buildSynthesisPracticeItems\(/g) ?? []).length < 3) {
  failures.push("opening and closing do not share one practice builder");
}

for (const forbidden of [
  "const strongest = aspects.slice(0, 5)",
  "زاویه الگو:",
]) {
  const overviewStart = writerSource.indexOf("function buildAspectOverviewText");
  const overviewEnd = writerSource.indexOf("function buildHumanAspectNarrative", overviewStart);
  const overviewSource = writerSource.slice(overviewStart, overviewEnd);
  if (overviewSource.includes(forbidden)) {
    failures.push(`main narrative aspect overview still contains forbidden duplicate detail: ${forbidden}`);
  }
}

for (const marker of [
  "assertCrossSectionConsistency",
  "same weekly practice",
  "daily-life narrative still exposes technical angle detail",
  "totalWords > 1950",
]) {
  if (!sampleQaSource.includes(marker)) {
    failures.push(`sample QA missing Batch 4 consistency marker: ${marker}`);
  }
}

if (packageJson.scripts?.["check:report-cross-section-consistency"] !== "node scripts/check-report-cross-section-consistency.mjs") {
  failures.push("package.json missing check:report-cross-section-consistency script");
}
for (const aggregate of ["check:project", "check:reports"]) {
  if (!(packageJson.scripts?.[aggregate] ?? "").includes("pnpm run check:report-cross-section-consistency")) {
    failures.push(`${aggregate} does not run check:report-cross-section-consistency`);
  }
}

if (failures.length > 0) {
  console.error("Report cross-section consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Report cross-section consistency check passed.");
console.log("- opening, daily-life, and closing use the same ordered synthesis roles");
console.log("- the weekly practice is reused in the final three-practice summary");
console.log("- the primary house follows selected evidence instead of an unrelated chapter");
console.log("- technical angle/orb detail stays out of the main narrative");
