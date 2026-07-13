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

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

const {
  getCanonicalAspectKey,
  mergeRealEngineAspectInventory,
  scoreRealEngineAspect,
  selectNarrativeAspectHighlights,
} = require("../lib/astrology/real-engine-aspect-selection.ts");
const { buildRealEngineSynthesisPlan } = require("../lib/astrology/real-engine-synthesis.ts");

const planetLabels = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

const aspectAngles = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

function makeAspect(firstPlanetId, aspectId, secondPlanetId, orb) {
  const angle = aspectAngles[aspectId];
  const key = [firstPlanetId, secondPlanetId].sort().join("-");

  return {
    id: `${key}-${aspectId}`,
    firstPlanetId,
    firstPlanetLabel: planetLabels[firstPlanetId] ?? firstPlanetId,
    secondPlanetId,
    secondPlanetLabel: planetLabels[secondPlanetId] ?? secondPlanetId,
    aspectId,
    aspectLabel: aspectId,
    glyph: aspectId,
    angle,
    separation: angle + orb,
    orb,
    meaning: "fixture",
    narrative: "fixture",
  };
}

function makePlacements(houses) {
  return Object.entries(houses).map(([id, house]) => ({
    id,
    label: planetLabels[id] ?? id,
    longitude: 0,
    signId: "aries",
    degreeInSign: 0,
    house,
    method: "fixture",
  }));
}

function keySet(aspects) {
  return new Set(aspects.map(getCanonicalAspectKey));
}

function hasParticipant(aspect, planetId) {
  return aspect.firstPlanetId === planetId || aspect.secondPlanetId === planetId;
}

function isHarmonious(aspect) {
  return aspect.aspectId === "sextile" || aspect.aspectId === "trine";
}

function isSocialOuterOnly(aspect) {
  const ids = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto"]);
  return ids.has(aspect.firstPlanetId) && ids.has(aspect.secondPlanetId);
}

function assertSelectionFixture({
  name,
  aspects,
  context,
  requiredKeys,
  expectedInventoryCount,
  requiredParticipant,
}) {
  const inventory = mergeRealEngineAspectInventory(aspects);
  const inventoryBefore = [...keySet(inventory)].sort();
  const firstSelection = selectNarrativeAspectHighlights(inventory, context);
  const secondSelection = selectNarrativeAspectHighlights(inventory, context);
  const firstKeys = firstSelection.map(getCanonicalAspectKey);
  const secondKeys = secondSelection.map(getCanonicalAspectKey);

  assert(
    inventory.length === expectedInventoryCount,
    `${name}: expected ${expectedInventoryCount} inventory aspects, received ${inventory.length}`,
  );
  assert(firstSelection.length === 6, `${name}: expected six highlights`);
  assert(
    new Set(firstKeys).size === firstKeys.length,
    `${name}: narrative highlights contain duplicates`,
  );
  assert(
    JSON.stringify(firstKeys) === JSON.stringify(secondKeys),
    `${name}: selection is not deterministic`,
  );
  assert(
    JSON.stringify([...keySet(inventory)].sort()) === JSON.stringify(inventoryBefore),
    `${name}: full inventory changed during selection`,
  );

  for (const requiredKey of requiredKeys) {
    assert(firstKeys.includes(requiredKey), `${name}: missing required highlight ${requiredKey}`);
  }

  if (requiredParticipant) {
    assert(
      firstSelection.some((aspect) => hasParticipant(aspect, requiredParticipant)),
      `${name}: chart-ruler coverage is missing for ${requiredParticipant}`,
    );
  }

  const outerHarmonyCount = firstSelection.filter(
    (aspect) => isHarmonious(aspect) && isSocialOuterOnly(aspect),
  ).length;

  assert(
    outerHarmonyCount <= 1,
    `${name}: outer-only harmonious aspects consumed multiple narrative slots`,
  );

  const synthesis = buildRealEngineSynthesisPlan({
    aspects: firstSelection,
    placements: context.placements,
    chartRulerId: context.chartRulerId,
    activeHouseNumbers: context.activeHouseNumbers,
  });
  const selectedIds = new Set(firstSelection.map((aspect) => aspect.id));

  assert(
    synthesis.evidenceAspectIds.every((id) => selectedIds.has(id)),
    `${name}: synthesis escaped the selected narrative inventory`,
  );
}

const aradHouses = {
  sun: 5,
  moon: 8,
  mercury: 5,
  venus: 5,
  mars: 1,
  jupiter: 5,
  saturn: 7,
  uranus: 5,
  neptune: 4,
  pluto: 3,
};
const aradAspects = [
  makeAspect("mars", "opposition", "saturn", 0.68),
  makeAspect("mercury", "conjunction", "uranus", 0.79),
  makeAspect("saturn", "sextile", "uranus", 0.92),
  makeAspect("mercury", "trine", "mars", 1.03),
  makeAspect("mercury", "conjunction", "jupiter", 1.2),
  makeAspect("jupiter", "sextile", "pluto", 0.25),
  makeAspect("uranus", "sextile", "pluto", 0.41),
  makeAspect("jupiter", "conjunction", "uranus", 1.99),
  makeAspect("moon", "square", "venus", 3.79),
  makeAspect("sun", "square", "moon", 4.1),
  makeAspect("sun", "conjunction", "venus", 4.8),
  makeAspect("sun", "conjunction", "jupiter", 5.1),
  makeAspect("sun", "conjunction", "uranus", 5.9),
  makeAspect("mercury", "conjunction", "venus", 6.59),
  makeAspect("venus", "trine", "mars", 2.3),
  makeAspect("venus", "sextile", "pluto", 2.7),
  makeAspect("mars", "trine", "jupiter", 1.8),
  makeAspect("mars", "trine", "uranus", 2.2),
  makeAspect("moon", "trine", "neptune", 2.9),
  makeAspect("saturn", "trine", "pluto", 3.2),
  makeAspect("jupiter", "sextile", "saturn", 4),
];
const aradContext = {
  chartRulerId: "mercury",
  activeHouseNumbers: [1, 5, 7, 8],
  placements: makePlacements(aradHouses),
  retrogradePlanetIds: ["mars"],
};

assertSelectionFixture({
  name: "Arad",
  aspects: aradAspects,
  context: aradContext,
  expectedInventoryCount: 21,
  requiredParticipant: "mercury",
  requiredKeys: ["mars:opposition:saturn"],
});

const aradMarsSaturn = aradAspects.find(
  (aspect) => getCanonicalAspectKey(aspect) === "mars:opposition:saturn",
);
const aradWithoutRetrograde = {
  ...aradContext,
  retrogradePlanetIds: [],
};

assert(
  scoreRealEngineAspect(aradMarsSaturn, aradContext) >
    scoreRealEngineAspect(aradMarsSaturn, aradWithoutRetrograde),
  "Arad: retrograde Mars does not affect relevance scoring",
);

const halehHouses = {
  sun: 6,
  moon: 8,
  mercury: 5,
  venus: 4,
  mars: 8,
  jupiter: 10,
  saturn: 11,
  uranus: 8,
  neptune: 7,
  pluto: 5,
};
const halehAspects = [
  makeAspect("moon", "square", "saturn", 0.15),
  makeAspect("mercury", "sextile", "neptune", 0.38),
  makeAspect("moon", "sextile", "pluto", 0.53),
  makeAspect("mars", "conjunction", "uranus", 1.3167),
  makeAspect("moon", "conjunction", "mars", 1.3167),
  makeAspect("mars", "square", "saturn", 1.4667),
  makeAspect("mars", "sextile", "pluto", 1.85),
  makeAspect("moon", "conjunction", "uranus", 2.6333),
  makeAspect("saturn", "square", "uranus", 2.7833),
  makeAspect("uranus", "sextile", "pluto", 3.1667),
  makeAspect("venus", "opposition", "saturn", 3.2833),
  makeAspect("moon", "square", "venus", 3.4333),
  makeAspect("venus", "square", "mars", 4.75),
  makeAspect("sun", "trine", "jupiter", 4.9667),
  makeAspect("venus", "square", "neptune", 5.2833),
];
const halehContext = {
  chartRulerId: "moon",
  activeHouseNumbers: [5, 6, 8],
  placements: makePlacements(halehHouses),
  retrogradePlanetIds: [],
};

assertSelectionFixture({
  name: "Haleh",
  aspects: halehAspects,
  context: halehContext,
  expectedInventoryCount: 15,
  requiredParticipant: "moon",
  requiredKeys: [
    "mars:square:saturn",
    "mars:conjunction:moon",
    "mars:conjunction:uranus",
    "mercury:sextile:neptune",
    "moon:square:saturn",
  ],
});

const ardalanHouses = {
  sun: 11,
  moon: 8,
  mercury: 12,
  venus: 10,
  mars: 12,
  jupiter: 2,
  saturn: 3,
  uranus: 4,
  neptune: 8,
  pluto: 3,
};
const ardalanAspects = [
  makeAspect("sun", "square", "saturn", 0.9),
  makeAspect("sun", "trine", "moon", 2.1),
  makeAspect("moon", "trine", "venus", 1.3),
  makeAspect("mercury", "sextile", "mars", 0.7),
  makeAspect("jupiter", "sextile", "pluto", 0.2),
  makeAspect("uranus", "trine", "pluto", 0.4),
  makeAspect("saturn", "conjunction", "pluto", 1.1),
  makeAspect("venus", "square", "uranus", 2.5),
  makeAspect("moon", "opposition", "jupiter", 3.2),
  makeAspect("mercury", "square", "neptune", 1.8),
  makeAspect("mars", "trine", "saturn", 2.8),
  makeAspect("sun", "sextile", "venus", 4),
  makeAspect("moon", "conjunction", "neptune", 5.2),
  makeAspect("jupiter", "trine", "uranus", 0.6),
];
const ardalanContext = {
  chartRulerId: "sun",
  activeHouseNumbers: [3, 8, 11],
  placements: makePlacements(ardalanHouses),
  retrogradePlanetIds: [],
};

assertSelectionFixture({
  name: "Ardalan",
  aspects: ardalanAspects,
  context: ardalanContext,
  expectedInventoryCount: 14,
  requiredParticipant: "sun",
  requiredKeys: ["saturn:square:sun"],
});

const ardalanHighlights = selectNarrativeAspectHighlights(
  ardalanAspects,
  ardalanContext,
);
assert(
  ardalanHighlights.some(
    (aspect) =>
      isHarmonious(aspect) &&
      (hasParticipant(aspect, "sun") || hasParticipant(aspect, "moon")),
  ),
  "Ardalan: no relevant supportive relationship survived selection",
);

const selectionSource = fs.readFileSync(
  "lib/astrology/real-engine-aspect-selection.ts",
  "utf8",
);
const writerSource = fs.readFileSync(
  "lib/astrology/real-engine-report-writer.ts",
  "utf8",
);
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

assert(
  !selectionSource.includes("for (const aspect of veryTight)"),
  "selection still fills capacity from raw very-tight aspects before relevance anchors",
);
assert(
  selectionSource.includes("retrogradePlanetIds"),
  "selection context does not accept retrograde relevance",
);
assert(
  selectionSource.includes("connectsOppositeHouseAxis"),
  "selection does not account for structural house axes",
);
assert(
  writerSource.includes("realEngine.retrogrades?.status === \"calculated\""),
  "writer does not pass calculated retrograde context into selection",
);
assert(
  packageJson.scripts?.["check:narrative-aspect-relevance-selection"] ===
    "node scripts/check-narrative-aspect-relevance-selection.mjs",
  "missing focused package script",
);
for (const aggregate of ["check:project", "check:reports"]) {
  assert(
    (packageJson.scripts?.[aggregate] ?? "").includes(
      "pnpm run check:narrative-aspect-relevance-selection",
    ),
    `${aggregate} does not include the focused relevance guard`,
  );
}

if (failures.length > 0) {
  console.error("Narrative aspect relevance selection check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Narrative aspect relevance selection check passed.");
console.log("- Arad keeps Mars-Saturn and retrograde relevance");
console.log("- Haleh keeps Moon-Saturn, Moon-Mars, Mars-Uranus, and Mercury-Neptune");
console.log("- Ardalan keeps Sun-Saturn, chart-ruler coverage, and relevant support");
console.log("- full inventories remain intact and deterministic");
console.log("- synthesis evidence stays inside selected highlights");
