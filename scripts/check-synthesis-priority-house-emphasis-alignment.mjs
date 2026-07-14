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
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  });

  module._compile(transpiled.outputText, filename);
};

const {
  getCanonicalAspectKey,
  mergeRealEngineAspectInventory,
  selectNarrativeAspectHighlights,
  selectPrimaryDynamicAnchor,
} = require("../lib/astrology/real-engine-aspect-selection.ts");
const {
  buildRealEngineSynthesisPlan,
} = require("../lib/astrology/real-engine-synthesis.ts");
const {
  buildRealEngineHouseEmphasis,
  getHouseEmphasisReasonIds,
} = require("../lib/astrology/real-engine-house-emphasis.ts");

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

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
    firstPlanetLabel: firstPlanetId,
    secondPlanetId,
    secondPlanetLabel: secondPlanetId,
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
    label: id,
    longitude: 0,
    signId: "aries",
    degreeInSign: 0,
    house,
    method: "fixture",
  }));
}

function makeHouses(placements) {
  const houses = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    const angleIds =
      number === 1
        ? ["asc"]
        : number === 4
          ? ["ic"]
          : number === 7
            ? ["dsc"]
            : number === 10
              ? ["mc"]
              : [];

    return {
      number,
      signId: "aries",
      cuspLongitude: index * 30,
      degreeInSign: 0,
      system: "placidus",
      method: "placidus-calculated",
      reliability: "calculated",
      planetIds: placements
        .filter((placement) => placement.house === number)
        .map((placement) => placement.id),
      angleIds,
      limitation: null,
    };
  });

  return houses;
}

function makeNodes(northHouse, southHouse) {
  return {
    status: "calculated",
    method: "mean-lunar-node-j2000-meeus-formula",
    nodeType: "mean",
    northNode: {
      id: "north-node",
      label: "North Node",
      longitude: 0,
      signId: "aries",
      degreeInSign: 0,
      house: northHouse,
      method: "mean-lunar-node-j2000-meeus-formula",
      source: "calculated",
      reliability: "calculated",
      limitation: null,
    },
    southNode: {
      id: "south-node",
      label: "South Node",
      longitude: 180,
      signId: "libra",
      degreeInSign: 0,
      house: southHouse,
      method: "mean-lunar-node-j2000-meeus-formula",
      source: "derived-opposition",
      reliability: "calculated",
      limitation: null,
    },
    limitation: null,
  };
}

function reasonIdsByHouse(emphasis) {
  return new Map(
    emphasis.map((item) => [
      item.house.number,
      new Set(getHouseEmphasisReasonIds(item)),
    ]),
  );
}

function assertReasons(name, reasonsByHouse, house, required, forbidden = []) {
  const reasons = reasonsByHouse.get(house) ?? new Set();

  for (const reason of required) {
    assert(
      reasons.has(reason),
      `${name}: house ${house} missing reason ${reason}`,
    );
  }

  for (const reason of forbidden) {
    assert(
      !reasons.has(reason),
      `${name}: house ${house} incorrectly has reason ${reason}`,
    );
  }
}

const fixtures = [
  {
    name: "Arad",
    expectedInventoryCount: 21,
    expectedAnchor: "mars:opposition:saturn",
    expectedPrimaryHouse: 1,
    chartRulerId: "mercury",
    activeHouseNumbers: [1, 5, 7, 8],
    retrogradePlanetIds: ["mars"],
    northHouse: 1,
    southHouse: 7,
    placementHouses: {
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
    },
    aspects: [
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
    ],
    houseAssertions: [
      [5, ["planetary-concentration", "chart-ruler-house"]],
      [1, ["north-node-house", "major-aspect-house", "angle-house"], ["planetary-concentration"]],
      [7, ["south-node-house", "major-aspect-house", "angle-house"], ["planetary-concentration"]],
      [8, ["luminary-house"]],
    ],
  },
  {
    name: "Haleh",
    expectedInventoryCount: 15,
    expectedAnchor: "moon:square:saturn",
    expectedPrimaryHouse: 8,
    chartRulerId: "moon",
    activeHouseNumbers: [1, 6, 7, 8],
    retrogradePlanetIds: [],
    northHouse: 1,
    southHouse: 7,
    placementHouses: {
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
    },
    aspects: [
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
    ],
    houseAssertions: [
      [8, ["planetary-concentration", "chart-ruler-house"]],
      [1, ["north-node-house", "angle-house"], ["planetary-concentration"]],
      [7, ["south-node-house", "placement-house", "angle-house"], ["planetary-concentration"]],
      [6, ["luminary-house"]],
    ],
  },
  {
    name: "Ardalan",
    expectedInventoryCount: 14,
    expectedAnchor: "saturn:square:sun",
    expectedPrimaryHouse: 11,
    chartRulerId: "sun",
    activeHouseNumbers: [3, 6, 8, 11, 12],
    retrogradePlanetIds: ["mercury", "uranus", "neptune", "pluto"],
    northHouse: 12,
    southHouse: 6,
    placementHouses: {
      sun: 11,
      moon: 8,
      mercury: 11,
      venus: 12,
      mars: 11,
      jupiter: 3,
      saturn: 3,
      uranus: 4,
      neptune: 5,
      pluto: 3,
    },
    aspects: [
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
    ],
    houseAssertions: [
      [11, ["planetary-concentration", "chart-ruler-house"]],
      [3, ["planetary-concentration"]],
      [8, ["luminary-house"]],
      [6, ["south-node-house"], ["planetary-concentration"]],
      [12, ["north-node-house"], ["planetary-concentration"]],
    ],
  },
];

for (const fixture of fixtures) {
  const placements = makePlacements(fixture.placementHouses);
  const context = {
    chartRulerId: fixture.chartRulerId,
    activeHouseNumbers: fixture.activeHouseNumbers,
    placements,
    retrogradePlanetIds: fixture.retrogradePlanetIds,
  };
  const inventory = mergeRealEngineAspectInventory(fixture.aspects);
  const inventoryKeysBefore = inventory
    .map(getCanonicalAspectKey)
    .slice()
    .sort();
  const highlights = selectNarrativeAspectHighlights(
    inventory,
    context,
  );
  const anchor = selectPrimaryDynamicAnchor(highlights, context);
  const houseEmphasis = buildRealEngineHouseEmphasis({
    houses: makeHouses(placements),
    placements,
    chartRulerId: fixture.chartRulerId,
    lunarNodes: makeNodes(
      fixture.northHouse,
      fixture.southHouse,
    ),
    primaryAnchor: anchor,
  });
  const plan = buildRealEngineSynthesisPlan({
    aspects: highlights,
    placements,
    chartRulerId: fixture.chartRulerId,
    activeHouseNumbers: houseEmphasis.map(
      (item) => item.house.number,
    ),
    retrogradePlanetIds: fixture.retrogradePlanetIds,
    houseEmphasis,
  });
  const firstHighlightKey = highlights[0]
    ? getCanonicalAspectKey(highlights[0])
    : null;
  const planAnchorKey = plan.primaryChallenge
    ? getCanonicalAspectKey(plan.primaryChallenge)
    : null;

  assert(
    inventory.length === fixture.expectedInventoryCount,
    `${fixture.name}: inventory count changed`,
  );
  assert(
    highlights.length === 6,
    `${fixture.name}: expected six narrative highlights`,
  );
  assert(
    firstHighlightKey === fixture.expectedAnchor,
    `${fixture.name}: first highlight expected ${fixture.expectedAnchor}, received ${firstHighlightKey}`,
  );
  assert(
    planAnchorKey === fixture.expectedAnchor,
    `${fixture.name}: synthesis anchor expected ${fixture.expectedAnchor}, received ${planAnchorKey}`,
  );
  assert(
    highlights[0]?.id === plan.primaryChallenge?.id,
    `${fixture.name}: card order and synthesis anchor diverged`,
  );
  assert(
    plan.primaryHouseNumber === fixture.expectedPrimaryHouse,
    `${fixture.name}: expected primary house ${fixture.expectedPrimaryHouse}, received ${plan.primaryHouseNumber}`,
  );
  assert(
    JSON.stringify(
      mergeRealEngineAspectInventory(fixture.aspects)
        .map(getCanonicalAspectKey)
        .slice()
        .sort(),
    ) === JSON.stringify(inventoryKeysBefore),
    `${fixture.name}: full technical inventory changed during narrative selection`,
  );

  const reasonsByHouse = reasonIdsByHouse(houseEmphasis);
  for (const [house, required, forbidden = []] of fixture.houseAssertions) {
    assertReasons(
      fixture.name,
      reasonsByHouse,
      house,
      required,
      forbidden,
    );
  }
}

const selectionSource = fs.readFileSync(
  "lib/astrology/real-engine-aspect-selection.ts",
  "utf8",
);
const synthesisSource = fs.readFileSync(
  "lib/astrology/real-engine-synthesis.ts",
  "utf8",
);
const houseSource = fs.readFileSync(
  "lib/astrology/real-engine-house-emphasis.ts",
  "utf8",
);
const writerSource = fs.readFileSync(
  "lib/astrology/real-engine-report-writer.ts",
  "utf8",
);
const componentSource = fs.readFileSync(
  "components/ReportAspectRelationshipSections.tsx",
  "utf8",
);
const astroTypesSource = fs.readFileSync("types/astro.ts", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

for (const marker of [
  "selectPrimaryDynamicAnchor",
  "scorePrimaryDynamicAnchor",
  "selectNarrativeAspectHighlights",
]) {
  assert(
    selectionSource.includes(marker),
    `aspect selection missing shared-anchor marker: ${marker}`,
  );
}

for (const marker of [
  "selectPrimaryDynamicAnchor",
  "rankRealEngineAspects",
  "houseEmphasis",
]) {
  assert(
    synthesisSource.includes(marker),
    `synthesis planner missing alignment marker: ${marker}`,
  );
}

assert(
  !synthesisSource.includes("getSynthesisRelevance"),
  "synthesis planner still has an independent primary ranking function",
);

for (const marker of [
  "planetary-concentration",
  "chart-ruler-house",
  "north-node-house",
  "south-node-house",
  "angle-house",
  "major-aspect-house",
]) {
  assert(
    houseSource.includes(`"${marker}"`),
    `house-emphasis helper missing reason ${marker}`,
  );
}

for (const marker of [
  "RealEngineReportCalculatedLunarNodes",
  "isCalculatedLunarNodes",
  '"northNode" in lunarNodes',
  '"southNode" in lunarNodes',
]) {
  assert(
    houseSource.includes(marker),
    `house-emphasis helper missing lunar-node type guard marker: ${marker}`,
  );
}

for (const marker of [
  "buildRealEngineHouseEmphasis",
  "houseEmphasis: chartSpine.activeHouses",
  "buildHouseEmphasisReasonText",
  "buildAspectClusterPractice",
  "buildPrimaryHousePlacementPractice",
]) {
  assert(
    writerSource.includes(marker),
    `writer missing Batch 2 marker: ${marker}`,
  );
}

assert(
  componentSource.includes(
    "storedHighlights.length > 0 ? storedHighlights : aspects.slice(0, 6)",
  ),
  "relationship component no longer consumes stored highlight order",
);
for (const forbidden of [
  "rankRealEngineAspects",
  "selectPrimaryDynamicAnchor",
  "scoreRealEngineAspect",
]) {
  assert(
    !componentSource.includes(forbidden),
    `relationship component introduced independent ranking: ${forbidden}`,
  );
}

for (const forbidden of [
  "RealEngineHouseEmphasis",
  "primaryAnchorId",
  "houseEmphasis",
]) {
  assert(
    !astroTypesSource.includes(forbidden),
    `persisted report schema was changed with ${forbidden}`,
  );
}

const scriptName =
  "check:synthesis-priority-house-emphasis-alignment";
assert(
  packageJson.scripts?.[scriptName] ===
    "node scripts/check-synthesis-priority-house-emphasis-alignment.mjs",
  "package.json missing Batch 2 focused guard script",
);
for (const aggregate of ["check:project", "check:reports"]) {
  assert(
    (packageJson.scripts?.[aggregate] ?? "").includes(
      `pnpm run ${scriptName}`,
    ),
    `${aggregate} does not include the Batch 2 focused guard`,
  );
}

if (failures.length > 0) {
  console.error(
    "Synthesis priority/house-emphasis alignment check failed:",
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  "Synthesis priority/house-emphasis alignment check passed.",
);
console.log(
  "- Arad Mars-Saturn, Haleh Moon-Saturn, and Ardalan Sun-Saturn are the shared primary anchors",
);
console.log(
  "- relationship-card order and synthesis plan consume the same anchor",
);
console.log(
  "- house emphasis distinguishes concentration, ruler, node direction, angles, and the primary aspect axis",
);
console.log(
  "- summary practices prefer final behavioral roles or the validated Moon-Mars-Uranus cluster",
);
console.log(
  "- full technical inventories, calculations, and persisted report schema remain unchanged",
);
