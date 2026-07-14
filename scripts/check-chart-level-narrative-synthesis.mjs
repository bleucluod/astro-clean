import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { createHash } from "node:crypto";

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
  getCanonicalAspectKey,
  mergeRealEngineAspectInventory,
  selectNarrativeAspectHighlights,
} = require("../lib/astrology/real-engine-aspect-selection.ts");
const {
  buildRealEngineNarrativeSynthesisProfile,
  buildRealEngineNodeAxisSynthesis,
  selectThreeDomainNarrativePractices,
} = require("../lib/astrology/real-engine-narrative-synthesis.ts");
const {
  buildRealEngineHouseEmphasis,
  getHouseEmphasisReasonIds,
} = require("../lib/astrology/real-engine-house-emphasis.ts");
const {
  buildRealEngineSynthesisPlan,
} = require("../lib/astrology/real-engine-synthesis.ts");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
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
  return {
    id: `${firstPlanetId}-${aspectId}-${secondPlanetId}`,
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

function makePlacement(id, signId, house) {
  return {
    id,
    label: id,
    longitude: 0,
    signId,
    degreeInSign: 0,
    house,
    method: "fixture",
  };
}

function makeHouses(placements) {
  return Array.from({ length: 12 }, (_, index) => {
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
}

function makeNodes({
  nodeType = "local-true-osculating",
  northHouse,
  southHouse,
  degree = 12,
}) {
  const method =
    nodeType === "mean"
      ? "mean-lunar-node-j2000-meeus-formula"
      : "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date";
  return {
    status: "calculated",
    method,
    nodeType,
    northNode: {
      id: "north-node",
      label: "North Node",
      longitude: degree,
      signId: "aries",
      degreeInSign: degree,
      house: northHouse,
      method,
      source: "calculated",
      reliability: "calculated",
      limitation: null,
    },
    southNode: {
      id: "south-node",
      label: "South Node",
      longitude: 180 + degree,
      signId: "libra",
      degreeInSign: degree,
      house: southHouse,
      method,
      source: "derived-opposition",
      reliability: "calculated",
      limitation: null,
    },
    limitation: null,
  };
}

function buildFixture({
  placements,
  aspects,
  chartRulerId,
  retrogradePlanetIds = [],
  nodes,
}) {
  const houses = makeHouses(placements);
  const draftHouseEmphasis = buildRealEngineHouseEmphasis({
    houses,
    placements,
    chartRulerId,
    lunarNodes: nodes,
  });
  const activeHouseNumbers = draftHouseEmphasis.map(
    (item) => item.house.number,
  );
  const profile = buildRealEngineNarrativeSynthesisProfile({
    aspects,
    placements,
    chartRulerId,
    activeHouseNumbers,
    retrogradePlanetIds,
    lunarNodes: nodes,
    houseEmphasis: draftHouseEmphasis,
  });
  const context = {
    chartRulerId,
    activeHouseNumbers,
    placements,
    retrogradePlanetIds,
  };
  const inventory = mergeRealEngineAspectInventory(aspects);
  const inventoryHash = createHash("sha256")
    .update(inventory.map(getCanonicalAspectKey).sort().join("|"))
    .digest("hex");
  const highlights = selectNarrativeAspectHighlights(
    inventory,
    context,
    {
      limit: profile.relationshipLimit,
      primaryAspect:
        profile.mode === "tension-led"
          ? profile.primaryAspect
          : undefined,
      forceDynamicAnchor: profile.mode === "tension-led",
    },
  );
  const primaryAnchor =
    profile.mode === "tension-led" ? profile.primaryAspect : undefined;
  const houseEmphasis = buildRealEngineHouseEmphasis({
    houses,
    placements,
    chartRulerId,
    lunarNodes: nodes,
    primaryAnchor,
  });
  const plan = buildRealEngineSynthesisPlan({
    aspects: highlights,
    placements,
    chartRulerId,
    activeHouseNumbers: houseEmphasis.map((item) => item.house.number),
    retrogradePlanetIds,
    houseEmphasis,
    lunarNodes: nodes,
    narrativeProfile: profile,
  });

  return {
    inventory,
    inventoryHash,
    highlights,
    houseEmphasis,
    profile,
    plan,
  };
}

const arad = buildFixture({
  chartRulerId: "mercury",
  retrogradePlanetIds: ["mars"],
  nodes: makeNodes({ northHouse: 1, southHouse: 7 }),
  placements: [
    makePlacement("sun", "aquarius", 5),
    makePlacement("moon", "taurus", 8),
    makePlacement("mercury", "aquarius", 5),
    makePlacement("venus", "aquarius", 5),
    makePlacement("mars", "libra", 1),
    makePlacement("jupiter", "aquarius", 5),
    makePlacement("saturn", "aries", 7),
    makePlacement("uranus", "aquarius", 5),
    makePlacement("neptune", "capricorn", 4),
    makePlacement("pluto", "sagittarius", 3),
  ],
  aspects: [
    makeAspect("mars", "opposition", "saturn", 0.68),
    makeAspect("moon", "square", "venus", 3.79),
    makeAspect("mercury", "conjunction", "uranus", 0.79),
    makeAspect("mars", "trine", "mercury", 1.03),
    makeAspect("jupiter", "conjunction", "mercury", 1.2),
    makeAspect("jupiter", "sextile", "pluto", 0.25),
  ],
});
assert(arad.profile.mode === "tension-led", "Arad must remain tension-led");
assert(
  getCanonicalAspectKey(arad.highlights[0]) === "mars:opposition:saturn",
  "Arad Mars-Saturn must remain first",
);

const haleh = buildFixture({
  chartRulerId: "moon",
  nodes: makeNodes({ northHouse: 1, southHouse: 7 }),
  placements: [
    makePlacement("sun", "sagittarius", 6),
    makePlacement("moon", "aquarius", 8),
    makePlacement("mercury", "sagittarius", 5),
    makePlacement("venus", "scorpio", 4),
    makePlacement("mars", "aquarius", 8),
    makePlacement("jupiter", "aries", 10),
    makePlacement("saturn", "taurus", 11),
    makePlacement("uranus", "aquarius", 8),
    makePlacement("neptune", "aquarius", 7),
    makePlacement("pluto", "sagittarius", 5),
  ],
  aspects: [
    makeAspect("moon", "square", "saturn", 0.15),
    makeAspect("moon", "conjunction", "mars", 1.31),
    makeAspect("mars", "conjunction", "uranus", 1.31),
    makeAspect("mars", "square", "saturn", 1.46),
    makeAspect("mercury", "sextile", "neptune", 0.38),
    makeAspect("moon", "square", "venus", 3.43),
  ],
});
assert(haleh.profile.mode === "tension-led", "Haleh must remain tension-led");
assert(
  [...(haleh.profile.primaryCluster?.placementIds ?? [])]
    .sort()
    .join(",") === "mars,moon,uranus",
  "Haleh Moon-Mars-Uranus cluster must be retained",
);

const fire10 = buildFixture({
  chartRulerId: "mars",
  nodes: makeNodes({ northHouse: 5, southHouse: 11 }),
  placements: [
    makePlacement("sun", "leo", 10),
    makePlacement("moon", "leo", 10),
    makePlacement("mercury", "leo", 10),
    makePlacement("venus", "leo", 10),
    makePlacement("mars", "virgo", 10),
    makePlacement("jupiter", "aries", 2),
    makePlacement("saturn", "sagittarius", 2),
    makePlacement("uranus", "sagittarius", 2),
    makePlacement("neptune", "capricorn", 2),
    makePlacement("pluto", "scorpio", 1),
  ],
  aspects: [
    makeAspect("jupiter", "opposition", "pluto", 5.8),
    makeAspect("sun", "conjunction", "moon", 1.2),
    makeAspect("sun", "conjunction", "venus", 2.1),
    makeAspect("mars", "trine", "uranus", 1.1),
    makeAspect("mercury", "conjunction", "venus", 0.8),
  ],
});
assert(
  fire10.profile.mode === "cluster-led" ||
    fire10.profile.mode === "strength-led",
  "QA-10H-Fire must be cluster-led or strength-led",
);
assert(
  getCanonicalAspectKey(fire10.highlights[0]) !== "jupiter:opposition:pluto",
  "QA-10H-Fire must not force a distant outer conflict",
);

const earthRoots = buildFixture({
  chartRulerId: "venus",
  nodes: makeNodes({ northHouse: 10, southHouse: 4 }),
  placements: [
    makePlacement("sun", "capricorn", 4),
    makePlacement("moon", "taurus", 4),
    makePlacement("mercury", "capricorn", 4),
    makePlacement("venus", "pisces", 5),
    makePlacement("mars", "taurus", 4),
    makePlacement("jupiter", "gemini", 8),
    makePlacement("saturn", "capricorn", 4),
    makePlacement("uranus", "capricorn", 3),
    makePlacement("neptune", "capricorn", 3),
    makePlacement("pluto", "scorpio", 2),
  ],
  aspects: [
    makeAspect("moon", "square", "saturn", 0.7),
    makeAspect("sun", "conjunction", "mercury", 1),
    makeAspect("venus", "sextile", "mars", 1.4),
    makeAspect("jupiter", "trine", "pluto", 2),
  ],
});
assert(
  earthRoots.profile.mode === "tension-led",
  "QA-Earth-Roots must keep Moon-Saturn tension",
);
assert(
  earthRoots.profile.clusters.some(
    (cluster) => cluster.kind === "house" && cluster.houseNumber === 4,
  ),
  "QA-Earth-Roots must retain the house-4 cluster",
);

const relationshipEarth = buildFixture({
  chartRulerId: "venus",
  nodes: makeNodes({ northHouse: 1, southHouse: 7 }),
  placements: [
    makePlacement("sun", "taurus", 7),
    makePlacement("moon", "taurus", 7),
    makePlacement("mercury", "taurus", 7),
    makePlacement("venus", "taurus", 7),
    makePlacement("mars", "leo", 10),
    makePlacement("jupiter", "gemini", 8),
    makePlacement("saturn", "taurus", 7),
    makePlacement("uranus", "aquarius", 4),
    makePlacement("neptune", "aquarius", 4),
    makePlacement("pluto", "sagittarius", 2),
  ],
  aspects: [
    makeAspect("sun", "conjunction", "venus", 1),
    makeAspect("moon", "conjunction", "mercury", 1.2),
    makeAspect("mars", "trine", "pluto", 2),
    makeAspect("jupiter", "trine", "neptune", 2.4),
  ],
});
assert(
  relationshipEarth.profile.mode === "cluster-led",
  "QA-Relationship-Earth must be cluster-led",
);
assert(
  relationshipEarth.profile.primaryCluster?.houseNumber === 7,
  "QA-Relationship-Earth must prioritize the Taurus house-7 cluster",
);
assert(
  relationshipEarth.profile.balance.dominantElement === "earth" &&
    relationshipEarth.profile.balance.dominantModality === "fixed",
  "QA-Relationship-Earth must preserve Earth/Fixed dominance",
);

const calm12 = buildFixture({
  chartRulerId: "moon",
  nodes: makeNodes({ northHouse: 6, southHouse: 12 }),
  placements: [
    makePlacement("sun", "gemini", 12),
    makePlacement("moon", "cancer", 12),
    makePlacement("mercury", "gemini", 12),
    makePlacement("venus", "cancer", 12),
    makePlacement("mars", "virgo", 3),
    makePlacement("jupiter", "cancer", 12),
    makePlacement("saturn", "pisces", 9),
    makePlacement("uranus", "taurus", 11),
    makePlacement("neptune", "pisces", 9),
    makePlacement("pluto", "aquarius", 8),
  ],
  aspects: [
    makeAspect("sun", "conjunction", "mercury", 1),
    makeAspect("moon", "conjunction", "venus", 1.4),
    makeAspect("mars", "trine", "uranus", 2),
    makeAspect("saturn", "conjunction", "neptune", 3),
  ],
});
assert(calm12.profile.mode === "cluster-led", "QA-12H must be cluster-led");
assert(
  calm12.profile.primaryCluster?.houseNumber === 12,
  "QA-12H must prioritize the calm house-12 cluster",
);

const nodeBoundary = buildFixture({
  chartRulerId: "moon",
  nodes: makeNodes({ northHouse: 5, southHouse: 11, degree: 0.3 }),
  placements: [
    makePlacement("sun", "leo", 2),
    makePlacement("moon", "libra", 4),
    makePlacement("mercury", "leo", 2),
    makePlacement("venus", "leo", 2),
    makePlacement("mars", "libra", 4),
    makePlacement("jupiter", "sagittarius", 6),
    makePlacement("saturn", "pisces", 9),
    makePlacement("uranus", "aquarius", 8),
    makePlacement("neptune", "capricorn", 7),
    makePlacement("pluto", "scorpio", 5),
  ],
  aspects: [
    makeAspect("venus", "opposition", "uranus", 2.8),
    makeAspect("sun", "sextile", "moon", 1),
    makeAspect("moon", "conjunction", "mars", 2),
    makeAspect("mercury", "trine", "jupiter", 1.7),
  ],
});
assert(nodeBoundary.profile.mode === "axis-led", "Node-boundary fixture must be axis-led");
assert(
  nodeBoundary.profile.nodeAxis?.primaryDimension === "house-axis" &&
    nodeBoundary.profile.nodeAxis?.confidence === "very-near",
  "Very-near Node boundary must make the house axis primary",
);
const meanAxis = buildRealEngineNodeAxisSynthesis(
  makeNodes({ nodeType: "mean", northHouse: 5, southHouse: 11, degree: 0.8 }),
);
assert(
  meanAxis?.model === "mean" && meanAxis.confidence === "near",
  "Mean and local true/osculating Node models must remain distinct",
);

for (const fixture of [
  arad,
  haleh,
  fire10,
  earthRoots,
  relationshipEarth,
  calm12,
  nodeBoundary,
]) {
  assert(
    fixture.highlights.length >= 3 && fixture.highlights.length <= 5,
    "Narrative relationship count must stay between 3 and 5",
  );
  assert(
    fixture.plan.houseEmphasis.length <= 4,
    "Main house count must stay at 4 or fewer",
  );
  const hashAfter = createHash("sha256")
    .update(
      mergeRealEngineAspectInventory(fixture.inventory)
        .map(getCanonicalAspectKey)
        .sort()
        .join("|"),
    )
    .digest("hex");
  assert(
    hashAfter === fixture.inventoryHash,
    "Full technical aspect inventory changed during narrative selection",
  );
}

const nodeOnlyHouse = nodeBoundary.houseEmphasis.find(
  (item) => item.house.number === 11,
);
assert(Boolean(nodeOnlyHouse), "Node-only house 11 must remain visible");
const nodeOnlyReasons = new Set(
  nodeOnlyHouse ? getHouseEmphasisReasonIds(nodeOnlyHouse) : [],
);
assert(
  nodeOnlyReasons.has("south-node-house") &&
    !nodeOnlyReasons.has("planetary-concentration"),
  "Node-only house must not be described as concentration",
);

const practiceSet = selectThreeDomainNarrativePractices([
  { domain: "emotional-relational", text: "احساس را نام ببر", priority: 10 },
  { domain: "daily-body-work", text: "روتین بدن را ثبت کن", priority: 10 },
  { domain: "identity-decision-creative", text: "یک انتخاب خلاق انجام بده", priority: 10 },
  { domain: "identity-decision-creative", text: "احساس را نام ببر", priority: 100 },
]);
assert(practiceSet.length === 3, "Three practice domains must all be represented");
assert(new Set(practiceSet).size === 3, "Final practices must be nonduplicate");

const helperSource = fs.readFileSync(
  "lib/astrology/real-engine-narrative-synthesis.ts",
  "utf8",
);
const selectionSource = fs.readFileSync(
  "lib/astrology/real-engine-aspect-selection.ts",
  "utf8",
);
const synthesisSource = fs.readFileSync(
  "lib/astrology/real-engine-synthesis.ts",
  "utf8",
);
const writerSource = fs.readFileSync(
  "lib/astrology/real-engine-report-writer.ts",
  "utf8",
);
const typesSource = fs.readFileSync("types/astro.ts", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

for (const marker of [
  '"tension-led"',
  '"strength-led"',
  '"cluster-led"',
  '"axis-led"',
  "buildRealEngineNodeAxisSynthesis",
  "buildRealEngineChartBalanceProfile",
  "selectThreeDomainNarrativePractices",
  'boundaryDistance <= 0.5',
  'boundaryDistance <= 1',
]) {
  assert(helperSource.includes(marker), `Narrative helper missing marker: ${marker}`);
}
assert(
  selectionSource.includes("RealEngineNarrativeAspectSelectionOptions") &&
    selectionSource.includes("forceDynamicAnchor"),
  "Aspect selection does not support mode-aware 3-5 relationships",
);
for (const marker of [
  "narrativeProfile",
  "primaryRelationship",
  "narrativeRelationships",
  "houseEmphasis.slice(0, 4)",
]) {
  assert(synthesisSource.includes(marker), `Synthesis plan missing marker: ${marker}`);
}
for (const marker of [
  "buildNarrativeDriverThread",
  "buildAspectClusterSynthesisThread",
  "buildNodeAxisDriverThread",
  "selectThreeDomainNarrativePractices",
  ".slice(0, 4)",
]) {
  assert(writerSource.includes(marker), `Writer missing marker: ${marker}`);
}
for (const forbidden of [
  "QA-10H-Fire",
  "QA-Earth-Roots",
  "QA-Relationship-Earth",
  "QA-12H",
  "QA-Node-Boundary",
  "Arad",
  "Haleh",
]) {
  assert(
    !helperSource.includes(forbidden) && !writerSource.includes(forbidden),
    `Runtime source contains fixture-name logic: ${forbidden}`,
  );
}
for (const forbidden of [
  "narrativeMode",
  "primaryNarrativeDriver",
  "narrativeProfile",
]) {
  assert(
    !typesSource.includes(forbidden),
    `Persisted report schema changed with ${forbidden}`,
  );
}

const scriptName = "check:chart-level-narrative-synthesis";
assert(
  packageJson.scripts?.[scriptName] ===
    "node scripts/check-chart-level-narrative-synthesis.mjs",
  "package.json missing focused Batch 2 guard",
);
for (const aggregate of ["check:project", "check:reports"]) {
  assert(
    (packageJson.scripts?.[aggregate] ?? "").includes(`pnpm run ${scriptName}`),
    `${aggregate} does not include the focused Batch 2 guard`,
  );
}

if (failures.length > 0) {
  console.error("Chart-level narrative synthesis check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Chart-level narrative synthesis check passed.");
console.log("- narrative mode deterministically supports tension, strength, cluster, and Node-axis drivers");
console.log("- Arad/Haleh anchors remain intact while strength/cluster fixtures avoid forced distant conflict");
console.log("- visible relationships stay between 3 and 5 while the full technical inventory hash remains unchanged");
console.log("- main houses stay at 4 or fewer with reasons preserved and node-only houses are not concentration");
console.log("- Node boundary confidence keeps house-axis priority near boundaries without mixing Mean and true/osculating models");
console.log("- dominant/zero balance and three nonduplicate practice domains feed the shared synthesis plan");
