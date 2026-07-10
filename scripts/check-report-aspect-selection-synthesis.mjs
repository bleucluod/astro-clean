import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, path.join(candidate, "index.ts")];
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

const failures = [];
const selectionSource = fs.readFileSync("lib/astrology/real-engine-aspect-selection.ts", "utf8");
const writerSource = fs.readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const reportDetailSource = fs.readFileSync("components/ReportDetail.tsx", "utf8");
const relationshipSource = fs.readFileSync("components/ReportAspectRelationshipSections.tsx", "utf8");
const typesSource = fs.readFileSync("types/astro.ts", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

for (const marker of [
  "REPORT_ASPECT_HIGHLIGHT_LIMIT = 6",
  "VERY_TIGHT_ASPECT_ORB = 1.5",
  "mergeRealEngineAspectInventory",
  "selectNarrativeAspectHighlights",
  "getDiversityAdjustedScore",
]) {
  if (!selectionSource.includes(marker)) {
    failures.push(`selection module missing marker: ${marker}`);
  }
}

for (const marker of [
  "const allAspects = mergeRealEngineAspectInventory",
  "aspects: allAspects",
  "aspectHighlights,",
  "buildAspectOverviewText(aspectHighlights",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`writer missing inventory/highlight marker: ${marker}`);
  }
}

if (!typesSource.includes("aspectHighlights?: RealEngineReportAspect[]")) {
  failures.push("snapshot type does not preserve separate narrative aspect highlights");
}

for (const marker of [
  "const aspectHighlights = report?.realEngine?.aspectHighlights",
  "{aspects.map((aspect: RealEngineReportAspect)",
  "همه روابط محاسبه‌شده بین سیاره‌ها",
]) {
  if (!reportDetailSource.includes(marker)) {
    failures.push(`ReportDetail missing full inventory marker: ${marker}`);
  }
}

if (reportDetailSource.includes("aspects.slice(0, 10).map")) {
  failures.push("ReportDetail still truncates the technical aspect inventory to ten rows");
}

for (const marker of [
  "report.realEngine?.aspectHighlights",
  "جدول فنی کامل پایین صفحه",
]) {
  if (!relationshipSource.includes(marker)) {
    failures.push(`relationship section missing narrative-highlight marker: ${marker}`);
  }
}

const { calculateRealEngineAspects } = require("../lib/astrology/real-engine-aspects.ts");
const {
  mergeRealEngineAspectInventory,
  selectNarrativeAspectHighlights,
  getCanonicalAspectKey,
} = require("../lib/astrology/real-engine-aspect-selection.ts");

const placements = [
  { id: "sun", label: "خورشید", longitude: 260.1666667, signId: "sagittarius", degreeInSign: 20.1666667, house: 6, method: "fixture" },
  { id: "moon", label: "ماه", longitude: 311.2833333, signId: "aquarius", degreeInSign: 11.2833333, house: 8, method: "fixture" },
  { id: "mercury", label: "عطارد", longitude: 242.1833333, signId: "sagittarius", degreeInSign: 2.1833333, house: 5, method: "fixture" },
  { id: "venus", label: "زهره", longitude: 217.85, signId: "scorpio", degreeInSign: 7.85, house: 4, method: "fixture" },
  { id: "mars", label: "مریخ", longitude: 312.6, signId: "aquarius", degreeInSign: 12.6, house: 8, method: "fixture" },
  { id: "jupiter", label: "مشتری", longitude: 25.1333333, signId: "aries", degreeInSign: 25.1333333, house: 10, method: "fixture" },
  { id: "saturn", label: "زحل", longitude: 41.1333333, signId: "taurus", degreeInSign: 11.1333333, house: 11, method: "fixture" },
  { id: "uranus", label: "اورانوس", longitude: 313.9166667, signId: "aquarius", degreeInSign: 13.9166667, house: 8, method: "fixture" },
  { id: "neptune", label: "نپتون", longitude: 302.5666667, signId: "aquarius", degreeInSign: 2.5666667, house: 7, method: "fixture" },
  { id: "pluto", label: "پلوتو", longitude: 250.75, signId: "sagittarius", degreeInSign: 10.75, house: 5, method: "fixture" },
];

const inventory = mergeRealEngineAspectInventory(calculateRealEngineAspects(placements));
const highlights = selectNarrativeAspectHighlights(inventory, {
  chartRulerId: "moon",
  activeHouseNumbers: [5, 6, 8],
  placements,
});

if (inventory.length !== 15) {
  failures.push(`Haleh fixture expected 15 valid major aspects, received ${inventory.length}`);
}

for (let index = 1; index < inventory.length; index += 1) {
  if (inventory[index - 1].orb > inventory[index].orb) {
    failures.push("full aspect inventory is not sorted by orb");
    break;
  }
}

const inventoryKeys = new Set(inventory.map(getCanonicalAspectKey));
const highlightKeys = new Set(highlights.map(getCanonicalAspectKey));

if (inventoryKeys.size !== inventory.length) {
  failures.push("full aspect inventory contains duplicate canonical relationships");
}

if (highlights.length !== 6 || highlightKeys.size !== highlights.length) {
  failures.push(`expected six unique narrative highlights, received ${highlights.length}`);
}

for (const key of [
  "mercury:sextile:neptune",
  "mars:square:saturn",
  "mars:conjunction:uranus",
  "moon:square:saturn",
]) {
  if (!highlightKeys.has(key)) {
    failures.push(`tight/high-value Haleh relationship omitted from narrative highlights: ${key}`);
  }
}

if (highlights.length >= inventory.length) {
  failures.push("narrative highlights must stay separate from the full technical inventory");
}

if (
  packageJson.scripts?.["check:report-aspect-selection-synthesis"] !==
  "node scripts/check-report-aspect-selection-synthesis.mjs"
) {
  failures.push("missing package script: check:report-aspect-selection-synthesis");
}

for (const aggregate of ["check:project", "check:reports"]) {
  if (!(packageJson.scripts?.[aggregate] ?? "").includes("pnpm run check:report-aspect-selection-synthesis")) {
    failures.push(`${aggregate} does not run check:report-aspect-selection-synthesis`);
  }
}

for (const [file, marker] of [
  ["docs/HALLEUS_IDEA_GARDEN.md", "v0.1.285 aspect inventory and narrative selection"],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", "v0.1.285 aspect-selection reality"],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", "v0.1.285 aspect inventory/selection contract"],
  ["docs/HALLEUS_PROJECT_CONTEXT.md", "v0.1.285 report aspect selection scope"],
]) {
  if (!fs.readFileSync(file, "utf8").includes(marker)) {
    failures.push(`${file} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Report aspect selection/synthesis check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Report aspect selection/synthesis check passed.");
console.log("- full technical aspect inventory stays intact and orb-sorted");
console.log("- six narrative highlights are selected separately");
console.log("- tight Haleh relationships include Mercury-Neptune, Mars-Saturn, and Mars-Uranus");
console.log("- report detail exposes every calculated relationship in the technical table");
