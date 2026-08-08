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

const {
  CHART_PROMINENCE_VERSION,
  buildChartProminenceProfile,
} = require("../lib/astrology/chart-prominence.ts");
const {
  CHART_PATTERN_VERSION,
  buildChartPatternProfile,
  mergeChartPatternsIntoProminence,
} = require("../lib/astrology/chart-patterns.ts");
const {
  CHART_RULERSHIP_VERSION,
  buildChartRulershipProfile,
  getPlanetDignities,
  getTraditionalSignRuler,
} = require("../lib/astrology/chart-rulership.ts");
const {
  VALIDATED_SUPPLEMENTARY_POINTS_VERSION,
  CHIRON_VALIDATION_DECISION,
  buildValidatedSupplementaryPointsProfile,
  calculatePartOfFortuneLongitude,
} = require("../lib/astrology/validated-supplementary-points.ts");
const {
  WHOLE_CHART_SYNTHESIS_VERSION,
  buildWholeChartSynthesis,
} = require("../lib/astrology/whole-chart-synthesis.ts");

const planetLabels = {
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

function placement(id, signId, house, longitude) {
  return {
    id,
    label: planetLabels[id],
    signId,
    house,
    longitude,
    degreeInSign: longitude % 30,
    method: "fixture",
  };
}

function aspect(firstPlanetId, aspectId, secondPlanetId, orb) {
  const aspectLabels = {
    conjunction: "هم‌نشینی",
    sextile: "تسدیس",
    square: "مربع",
    trine: "مثلث",
    opposition: "مقابله",
  };
  const angles = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  };
  return {
    id: `${firstPlanetId}-${aspectId}-${secondPlanetId}`,
    firstPlanetId,
    firstPlanetLabel: planetLabels[firstPlanetId],
    secondPlanetId,
    secondPlanetLabel: planetLabels[secondPlanetId],
    aspectId,
    aspectLabel: aspectLabels[aspectId],
    glyph: "",
    angle: angles[aspectId],
    separation: angles[aspectId] + orb,
    orb,
    meaning: "fixture",
    narrative: "fixture",
  };
}

function angle(id, signId, longitude, house) {
  const labels = { asc: "طالع", dsc: "غروب", mc: "میانه آسمان", ic: "ریشه آسمان" };
  return {
    id,
    label: labels[id],
    signId,
    longitude,
    degreeInSign: longitude % 30,
    method: "fixture",
    source: "calculated",
    reliability: "calculated",
    house,
    limitation: null,
  };
}

function house(number, signId) {
  const cuspLongitude = ((number - 1) * 30 + 7.5) % 360;
  return {
    number,
    signId,
    cuspLongitude,
    degreeInSign: cuspLongitude % 30,
    system: "placidus",
    method: "placidus-calculated",
    reliability: "calculated",
    planetIds: [],
    angleIds: [],
    limitation: null,
  };
}

function report({ id, birthTimeAccuracy = "known", placements, aspects, angles, houses = [], retrogrades = [] }) {
  return {
    id,
    createdAt: "2026-08-06T00:00:00.000Z",
    input: {
      name: id,
      birthDate: "1990-01-01",
      birthTime: "12:00",
      birthTimeAccuracy,
      birthCity: "تهران",
      birthCountry: "ایران",
    },
    chart: {
      sunSign: { key: "aries", faName: "حمل", enName: "Aries", element: "آتش", quality: "کاردینال" },
      moonSign: { key: "taurus", faName: "ثور", enName: "Taurus", element: "زمین", quality: "ثابت" },
      risingSign: { key: angles.asc.signId, faName: "", enName: "", element: "زمین", quality: "کاردینال" },
    },
    realEngine: {
      version: "real-engine-preview-v2",
      generatedAt: "2026-08-06T00:00:00.000Z",
      cityLabel: "تهران",
      utcIso: "1990-01-01T08:30:00.000Z",
      ascendantLongitude: angles.asc.longitude,
      houseSystem: "placidus",
      houses,
      placements,
      aspects,
      angles,
      retrogrades: {
        status: "calculated",
        method: "fixture",
        planetIds: retrogrades,
        limitation: null,
      },
      note: "fixture",
    },
    summary: "fixture",
    interpretations: [],
    safetyNote: "fixture",
  };
}

const saturnReport = report({
  id: "saturn-chart",
  placements: [
    placement("sun", "leo", 10, 122),
    placement("moon", "capricorn", 10, 286),
    placement("mercury", "capricorn", 10, 291),
    placement("venus", "aquarius", 11, 315),
    placement("mars", "libra", 7, 196),
    placement("jupiter", "capricorn", 10, 299),
    placement("saturn", "libra", 10, 181),
    placement("uranus", "sagittarius", 9, 250),
    placement("neptune", "capricorn", 10, 278),
    placement("pluto", "scorpio", 8, 222),
  ],
  aspects: [
    aspect("sun", "square", "saturn", 0.4),
    aspect("moon", "conjunction", "saturn", 0.7),
    aspect("mercury", "square", "saturn", 1.1),
    aspect("venus", "trine", "mars", 4.5),
  ],
  angles: {
    asc: angle("asc", "capricorn", 270, 1),
    dsc: angle("dsc", "cancer", 90, 7),
    mc: angle("mc", "libra", 180, 10),
    ic: angle("ic", "aries", 0, 4),
  },
  retrogrades: ["saturn"],
});

const mercuryReport = report({
  id: "mercury-chart",
  placements: [
    placement("sun", "gemini", 3, 72),
    placement("moon", "virgo", 6, 168),
    placement("mercury", "gemini", 3, 61),
    placement("venus", "gemini", 3, 78),
    placement("mars", "virgo", 3, 174),
    placement("jupiter", "aquarius", 11, 306),
    placement("saturn", "pisces", 12, 350),
    placement("uranus", "aquarius", 11, 320),
    placement("neptune", "capricorn", 10, 287),
    placement("pluto", "scorpio", 8, 225),
  ],
  aspects: [
    aspect("sun", "conjunction", "mercury", 0.3),
    aspect("mercury", "square", "mars", 0.8),
    aspect("mercury", "trine", "jupiter", 1.0),
    aspect("moon", "opposition", "saturn", 5.5),
  ],
  angles: {
    asc: angle("asc", "gemini", 60, 1),
    dsc: angle("dsc", "sagittarius", 240, 7),
    mc: angle("mc", "aquarius", 300, 10),
    ic: angle("ic", "leo", 120, 4),
  },
});

const saturnFirst = buildChartProminenceProfile(saturnReport);
const saturnSecond = buildChartProminenceProfile(saturnReport);
const mercury = buildChartProminenceProfile(mercuryReport);

assert.equal(saturnFirst.version, CHART_PROMINENCE_VERSION);
assert.deepEqual(saturnFirst, saturnSecond, "Prominence output must be deterministic.");
assert.equal(saturnFirst.dominantPlanet?.id, "saturn");
assert.equal(saturnFirst.dominantHouse?.id, "house-10");
assert.ok(saturnFirst.signatures.some((item) => item.id === "planet-saturn"));
assert.equal(mercury.dominantPlanet?.id, "mercury");
assert.notDeepEqual(
  saturnFirst.signatures.map((item) => item.id),
  mercury.signatures.map((item) => item.id),
  "Different chart structures must not collapse to the same signatures.",
);

for (const profile of [saturnFirst, mercury]) {
  assert.ok(profile.signatures.length > 0 && profile.signatures.length <= 3);
  assert.equal(new Set(profile.signatures.map((item) => item.id)).size, profile.signatures.length);
  for (const signature of profile.signatures) {
    assert.ok(signature.evidence.length > 0, `${signature.id} must expose visible evidence.`);
    assert.ok(signature.destination, `${signature.id} must own a report destination.`);
  }
  assert.ok(profile.chartSentence.includes("امضای کلی این چارت"));
}

const unknownTime = buildChartProminenceProfile({
  ...saturnReport,
  id: "unknown-time",
  input: {
    ...saturnReport.input,
    birthTimeAccuracy: "unknown",
  },
});
assert.equal(unknownTime.hasReliableBirthTime, false);
assert.equal(unknownTime.dominantHouse, null);
assert.equal(unknownTime.dominantAxis, null);
assert.equal(unknownTime.chartRuler, null);
assert.equal(unknownTime.hemisphere, null);
assert.equal(unknownTime.quadrant, null);
assert.ok(unknownTime.excludedTimeDependentFactors.includes("خانه مسلط"));
assert.ok(unknownTime.signatures.every((item) => !["house", "axis", "hemisphere", "quadrant"].includes(item.kind)));

const sparseRetrograde = report({
  id: "sparse-retrograde",
  placements: [
    placement("sun", "aries", 1, 10),
    placement("moon", "taurus", 2, 40),
    placement("mercury", "gemini", 3, 70),
    placement("venus", "cancer", 4, 100),
    placement("mars", "leo", 5, 130),
    placement("jupiter", "virgo", 6, 160),
    placement("saturn", "libra", 7, 190),
    placement("uranus", "scorpio", 8, 220),
    placement("neptune", "sagittarius", 9, 250),
    placement("pluto", "capricorn", 10, 280),
  ],
  aspects: [],
  angles: {
    asc: angle("asc", "pisces", 359, 1),
    dsc: angle("dsc", "virgo", 179, 7),
    mc: angle("mc", "sagittarius", 269, 10),
    ic: angle("ic", "gemini", 89, 4),
  },
  retrogrades: ["uranus"],
});
assert.notEqual(
  buildChartProminenceProfile(sparseRetrograde).dominantPlanet?.id,
  "uranus",
  "A planet must not become dominant only because it is retrograde.",
);

const patternAngles = {
  asc: angle("asc", "aries", 0, 1),
  dsc: angle("dsc", "libra", 180, 7),
  mc: angle("mc", "capricorn", 270, 10),
  ic: angle("ic", "cancer", 90, 4),
};

const stelliumReport = report({
  id: "stellium-chart",
  placements: [
    placement("sun", "aries", 5, 2),
    placement("moon", "aries", 5, 11),
    placement("mercury", "aries", 5, 20),
    placement("venus", "taurus", 7, 40),
  ],
  aspects: [],
  angles: patternAngles,
});
const stelliumProfile = buildChartPatternProfile(stelliumReport);
assert.equal(stelliumProfile.version, CHART_PATTERN_VERSION);
assert.deepEqual(
  stelliumProfile,
  buildChartPatternProfile(stelliumReport),
  "Chart-pattern output must be deterministic.",
);
assert.ok(stelliumProfile.patterns.some((item) => item.kind === "sign-stellium"));
assert.ok(stelliumProfile.patterns.some((item) => item.kind === "house-stellium"));

const unknownTimeStellium = buildChartPatternProfile({
  ...stelliumReport,
  id: "unknown-time-stellium",
  input: { ...stelliumReport.input, birthTimeAccuracy: "unknown" },
});
assert.ok(unknownTimeStellium.patterns.some((item) => item.kind === "sign-stellium"));
assert.ok(!unknownTimeStellium.patterns.some((item) => item.kind === "house-stellium"));
assert.ok(unknownTimeStellium.excludedTimeDependentPatterns.includes("استلیوم در خانه"));

const tSquareReport = report({
  id: "t-square-chart",
  placements: [
    placement("sun", "aries", 1, 0),
    placement("moon", "libra", 7, 180),
    placement("mars", "cancer", 4, 90),
  ],
  aspects: [
    aspect("sun", "opposition", "moon", 0),
    aspect("mars", "square", "sun", 0),
    aspect("mars", "square", "moon", 0),
  ],
  angles: patternAngles,
});
const tSquareProfile = buildChartPatternProfile(tSquareReport);
assert.ok(tSquareProfile.patterns.some((item) => item.kind === "t-square"));
assert.ok(
  tSquareProfile.patterns.find((item) => item.kind === "t-square")?.aspectIds.length === 3,
  "T-square must retain its three stored aspect references.",
);

const grandTrineReport = report({
  id: "grand-trine-chart",
  placements: [
    placement("sun", "aries", 1, 0),
    placement("moon", "leo", 5, 120),
    placement("venus", "sagittarius", 9, 240),
  ],
  aspects: [
    aspect("sun", "trine", "moon", 0),
    aspect("moon", "trine", "venus", 0),
    aspect("sun", "trine", "venus", 0),
  ],
  angles: patternAngles,
});
assert.ok(
  buildChartPatternProfile(grandTrineReport).patterns.some(
    (item) => item.kind === "grand-trine",
  ),
);

const grandCrossReport = report({
  id: "grand-cross-chart",
  placements: [
    placement("sun", "aries", 1, 0),
    placement("moon", "cancer", 4, 90),
    placement("mars", "libra", 7, 180),
    placement("saturn", "capricorn", 10, 270),
  ],
  aspects: [
    aspect("sun", "square", "moon", 0),
    aspect("sun", "opposition", "mars", 0),
    aspect("sun", "square", "saturn", 0),
    aspect("moon", "square", "mars", 0),
    aspect("moon", "opposition", "saturn", 0),
    aspect("mars", "square", "saturn", 0),
  ],
  angles: patternAngles,
});
const grandCrossProfile = buildChartPatternProfile(grandCrossReport);
assert.ok(grandCrossProfile.patterns.some((item) => item.kind === "grand-cross"));
assert.ok(
  !grandCrossProfile.patterns.some((item) => item.kind === "t-square"),
  "Grand Cross must own its nested T-squares instead of duplicating them.",
);

const noPatternReport = report({
  id: "no-pattern-chart",
  placements: [
    placement("sun", "aries", 1, 3),
    placement("moon", "taurus", 3, 47),
    placement("mercury", "cancer", 6, 103),
    placement("venus", "virgo", 8, 166),
  ],
  aspects: [],
  angles: patternAngles,
});
assert.equal(buildChartPatternProfile(noPatternReport).patterns.length, 0);

const mergedProminence = mergeChartPatternsIntoProminence(
  buildChartProminenceProfile(tSquareReport),
  tSquareProfile,
);
assert.ok(mergedProminence.signatures.some((item) => item.kind === "pattern"));
assert.ok(mergedProminence.chartSentence.includes("T-square"));
assert.ok(
  [stelliumProfile, tSquareProfile, buildChartPatternProfile(grandTrineReport), grandCrossProfile]
    .flatMap((profile) => profile.patterns)
    .every((item) => item.kind !== "yod"),
  "Yod must stay outside Batch 3 until an independent definition and fixtures exist.",
);

const traditionalRulerExpectations = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};
for (const [signId, planetId] of Object.entries(traditionalRulerExpectations)) {
  assert.equal(getTraditionalSignRuler(signId), planetId, `traditional ruler drifted for ${signId}`);
}
assert.deepEqual(getPlanetDignities("mercury", "virgo"), ["rulership", "exaltation"]);
assert.deepEqual(getPlanetDignities("sun", "aries"), ["exaltation"]);
assert.deepEqual(getPlanetDignities("sun", "aquarius"), ["detriment"]);
assert.deepEqual(getPlanetDignities("sun", "libra"), ["fall"]);
assert.deepEqual(getPlanetDignities("mars", "aries"), ["rulership"]);

const rulershipHouses = [
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
].map((signId, index) => house(index + 1, signId));
const rulershipAngles = {
  asc: angle("asc", "libra", 187.5, 1),
  dsc: angle("dsc", "aries", 7.5, 7),
  mc: angle("mc", "cancer", 97.5, 10),
  ic: angle("ic", "capricorn", 277.5, 4),
};
const rulershipPlacements = [
  placement("sun", "aries", 7, 12),
  placement("moon", "taurus", 8, 42),
  placement("mercury", "virgo", 12, 168),
  placement("venus", "taurus", 8, 51),
  placement("mars", "cancer", 10, 103),
  placement("jupiter", "sagittarius", 3, 248),
  placement("saturn", "aquarius", 5, 319),
];
const rulershipAspects = [
  aspect("venus", "square", "mars", 1.2),
  aspect("sun", "trine", "jupiter", 2.1),
];
const rulershipReport = report({
  id: "rulership-chart",
  placements: rulershipPlacements,
  aspects: rulershipAspects,
  angles: rulershipAngles,
  houses: rulershipHouses,
});
const rulershipProfile = buildChartRulershipProfile(rulershipReport, {
  hasReliableBirthTime: true,
});
assert.equal(rulershipProfile.version, CHART_RULERSHIP_VERSION);
assert.equal(rulershipProfile.chartRuler?.planetId, "venus");
assert.equal(rulershipProfile.houseRulers.length, 12);
assert.equal(rulershipProfile.planetConditions.length, 7);
assert.ok(rulershipProfile.dispositorChain);
assert.ok(
  rulershipProfile.planetConditions
    .find((condition) => condition.planetId === "mercury")
    ?.dignities.includes("rulership") &&
    rulershipProfile.planetConditions
      .find((condition) => condition.planetId === "mercury")
      ?.dignities.includes("exaltation"),
  "Mercury in Virgo must preserve simultaneous rulership and exaltation",
);
assert.ok(
  rulershipProfile.planetConditions
    .find((condition) => condition.planetId === "venus")
    ?.majorAspect?.includes("مریخ"),
  "planet condition must retain the tightest stored major aspect",
);
assert.equal(
  JSON.stringify(buildChartRulershipProfile(rulershipReport, { hasReliableBirthTime: true })),
  JSON.stringify(rulershipProfile),
  "rulership profile must be deterministic",
);
const unknownRulershipReport = {
  ...rulershipReport,
  input: { ...rulershipReport.input, birthTimeAccuracy: "unknown" },
};
const unknownRulershipProfile = buildChartRulershipProfile(unknownRulershipReport, {
  hasReliableBirthTime: false,
});
assert.equal(unknownRulershipProfile.chartRuler, null);
assert.equal(unknownRulershipProfile.houseRulers.length, 0);
assert.equal(unknownRulershipProfile.dispositorChain, null);
assert.equal(unknownRulershipProfile.planetConditions.length, 7);
assert.ok(unknownRulershipProfile.planetConditions.every((condition) => condition.house === null));
assert.deepEqual(unknownRulershipProfile.excludedTimeDependentFactors, [
  "حاکمان خانه‌ها",
  "حاکم طالع",
  "مسیر حاکم چارت",
]);

assert.equal(
  calculatePartOfFortuneLongitude({
    ascendantLongitude: 170,
    sunLongitude: 317,
    moonLongitude: 4,
    sect: "night",
  }),
  123,
  "Robert Hand night-chart Fortune fixture must resolve to 3 Leo / 123 degrees",
);
assert.equal(
  calculatePartOfFortuneLongitude({
    ascendantLongitude: 10,
    sunLongitude: 100,
    moonLongitude: 250,
    sect: "day",
  }),
  160,
  "day-chart Fortune arithmetic fixture drifted",
);

const fortuneHouses = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
].map((signId, index) => house(index + 1, signId));
const fortuneReport = report({
  id: "fortune-chart",
  placements: [
    placement("sun", "capricorn", 10, 280),
    placement("moon", "taurus", 2, 40),
    placement("mercury", "aquarius", 11, 310),
    placement("venus", "pisces", 12, 340),
    placement("mars", "gemini", 3, 70),
    placement("jupiter", "cancer", 4, 100),
    placement("saturn", "libra", 7, 190),
  ],
  aspects: [],
  angles: {
    asc: angle("asc", "aries", 7.5, 1),
    dsc: angle("dsc", "libra", 187.5, 7),
    mc: angle("mc", "capricorn", 277.5, 10),
    ic: angle("ic", "cancer", 97.5, 4),
  },
  houses: fortuneHouses,
});
const fortuneProfile = buildValidatedSupplementaryPointsProfile(fortuneReport, {
  hasReliableBirthTime: true,
});
assert.equal(fortuneProfile.version, VALIDATED_SUPPLEMENTARY_POINTS_VERSION);
assert.equal(fortuneProfile.chiron, null);
assert.equal(
  fortuneProfile.chironValidationDecision,
  CHIRON_VALIDATION_DECISION,
);
assert.equal(fortuneProfile.partOfFortune?.sect, "day");
assert.equal(fortuneProfile.partOfFortune?.formula, "ascendant+moon-sun");
assert.equal(fortuneProfile.partOfFortune?.longitude, 127.5);
assert.equal(fortuneProfile.partOfFortune?.signId, "leo");
assert.equal(fortuneProfile.partOfFortune?.degreeInSign, 7.5);
assert.equal(fortuneProfile.partOfFortune?.house, 5);
assert.equal(
  JSON.stringify(
    buildValidatedSupplementaryPointsProfile(fortuneReport, {
      hasReliableBirthTime: true,
    }),
  ),
  JSON.stringify(fortuneProfile),
  "validated supplementary points must be deterministic",
);

const unknownFortuneProfile = buildValidatedSupplementaryPointsProfile(
  {
    ...fortuneReport,
    input: { ...fortuneReport.input, birthTimeAccuracy: "unknown" },
  },
  { hasReliableBirthTime: false },
);
assert.equal(unknownFortuneProfile.partOfFortune, null);
assert.equal(unknownFortuneProfile.chiron, null);
assert.deepEqual(unknownFortuneProfile.excludedTimeDependentFactors, [
  "part-of-fortune",
]);

const incompleteFortuneReport = {
  ...fortuneReport,
  realEngine: {
    ...fortuneReport.realEngine,
    placements: fortuneReport.realEngine.placements.map((item) =>
      item.id === "sun" ? { ...item, house: null } : item,
    ),
  },
};
assert.equal(
  buildValidatedSupplementaryPointsProfile(incompleteFortuneReport, {
    hasReliableBirthTime: true,
  }).partOfFortune,
  null,
  "Fortune must not guess day/night sect when the Sun house is absent",
);

const tSquareSynthesis = buildWholeChartSynthesis(tSquareReport, {
  prominence: mergedProminence,
  chartPatterns: tSquareProfile,
  rulership: buildChartRulershipProfile(tSquareReport, { hasReliableBirthTime: true }),
  supplementaryPoints: buildValidatedSupplementaryPointsProfile(tSquareReport, {
    hasReliableBirthTime: true,
  }),
});
assert.equal(tSquareSynthesis.version, WHOLE_CHART_SYNTHESIS_VERSION);
assert.deepEqual(
  tSquareSynthesis.fixedChapters.map((chapter) => chapter.id),
  [
    "jupiter",
    "saturn",
    "sun-moon-rising",
    "chart-ruler-story",
    "element-modality-balance",
    "lunar-node-axis",
    "whole-chart-summary",
  ],
);
assert.equal(tSquareSynthesis.lifeAreas.length, 10);
assert.ok(
  tSquareSynthesis.dynamicChapters.some((chapter) => chapter.kind === "major-pattern"),
  "selected T-square must become a dynamic whole-chart chapter",
);
assert.ok(tSquareSynthesis.dynamicChapters.every((chapter) => chapter.selectedByProminence));
assert.ok(!tSquareSynthesis.dynamicChapters.some((chapter) => chapter.kind === "chiron"));

const unknownSynthesisReport = {
  ...unknownRulershipReport,
  input: { ...unknownRulershipReport.input, birthTimeAccuracy: "unknown" },
};
const unknownSynthesisProminence = buildChartProminenceProfile(unknownSynthesisReport);
const unknownSynthesisPatterns = buildChartPatternProfile(unknownSynthesisReport);
const unknownSynthesis = buildWholeChartSynthesis(unknownSynthesisReport, {
  prominence: unknownSynthesisProminence,
  chartPatterns: unknownSynthesisPatterns,
  rulership: buildChartRulershipProfile(unknownSynthesisReport, { hasReliableBirthTime: false }),
  supplementaryPoints: buildValidatedSupplementaryPointsProfile(unknownSynthesisReport, {
    hasReliableBirthTime: false,
  }),
});
assert.equal(unknownSynthesis.hasReliableBirthTime, false);
assert.equal(
  unknownSynthesis.fixedChapters.find((chapter) => chapter.id === "chart-ruler-story")?.available,
  false,
);
assert.ok(
  !unknownSynthesis.dynamicChapters.some((chapter) =>
    ["active-house", "part-of-fortune", "dispositor-chain"].includes(chapter.kind),
  ),
  "unknown time must suppress every house/Ascendant-dependent dynamic synthesis",
);
assert.equal(unknownSynthesis.lifeAreas.length, 10);

if (!fortuneProfile.partOfFortune) throw new Error("Fortune fixture missing");
const fortuneHouseId = `house-${fortuneProfile.partOfFortune.house}`;
const fortuneSynthesisProminence = {
  ...buildChartProminenceProfile(fortuneReport),
  dominantHouse: {
    id: fortuneHouseId,
    label: `خانه ${fortuneProfile.partOfFortune.house}`,
    score: 10,
    evidence: [{ id: "fortune-house-fixture", label: "fortune-house-fixture" }],
  },
  signatures: [{
    id: fortuneHouseId,
    kind: "house",
    title: `خانه ${fortuneProfile.partOfFortune.house}`,
    summary: "fortune prominence fixture",
    score: 10,
    evidence: ["fortune-house-fixture"],
    destination: "growth-path",
  }],
};
const fortuneSynthesis = buildWholeChartSynthesis(fortuneReport, {
  prominence: fortuneSynthesisProminence,
  chartPatterns: buildChartPatternProfile(fortuneReport),
  rulership: buildChartRulershipProfile(fortuneReport, { hasReliableBirthTime: true }),
  supplementaryPoints: fortuneProfile,
});
assert.ok(
  fortuneSynthesis.dynamicChapters.some((chapter) => chapter.kind === "part-of-fortune"),
  "Part of Fortune may enter dynamic synthesis only when its house is prominence-selected",
);
assert.ok(
  !fortuneSynthesis.dynamicChapters.some((chapter) => chapter.kind === "chiron"),
  "Chiron must remain absent from Batch 7 without Batch 5 validation",
);

const rulershipSource = fs.readFileSync("lib/astrology/chart-rulership.ts", "utf8");
const reportWriter = fs.readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
for (const forbidden of ["سیاره خوب", "سیاره بد", "ضعیف", "نحس"]) {
  assert.ok(!rulershipSource.includes(forbidden), `value-laden planetary condition language found: ${forbidden}`);
}
assert.ok(reportWriter.includes('getTraditionalSignRuler(risingSign)'));
assert.ok(!reportWriter.includes("CHART_RULER_BY_RISING"));

const liveContract = fs.readFileSync(
  "lib/report-output/live-report-reading-contract.ts",
  "utf8",
);
const summary = fs.readFileSync(
  "components/report/FiveMinuteReportSummary.tsx",
  "utf8",
);
const chartForm = fs.readFileSync("components/ChartForm.tsx", "utf8");
const route = fs.readFileSync("app/api/engine/real-chart/route.ts", "utf8");
const types = fs.readFileSync("types/astro.ts", "utf8");
const patternSource = fs.readFileSync("lib/astrology/chart-patterns.ts", "utf8");
const rulershipSection = fs.readFileSync("components/report/ReportRulershipSection.tsx", "utf8");
const supplementarySource = fs.readFileSync(
  "lib/astrology/validated-supplementary-points.ts",
  "utf8",
);
const supplementarySection = fs.readFileSync(
  "components/report/ReportSupplementaryPointsSection.tsx",
  "utf8",
);
const productReader = fs.readFileSync("components/report/ReportProductReader.tsx", "utf8");
const wholeSynthesisSource = fs.readFileSync("lib/astrology/whole-chart-synthesis.ts", "utf8");
const wholeSynthesisComponent = fs.readFileSync("components/report/ReportWholeChartSynthesis.tsx", "utf8");
const reportExperience = fs.readFileSync("components/ReportV3Experience.tsx", "utf8");
const technicalAppendix = fs.readFileSync("components/report/ReportTechnicalAppendix.tsx", "utf8");
const patternSection = fs.readFileSync("components/report/ReportChartPatternSection.tsx", "utf8");
const wheel = fs.readFileSync("components/ReportBirthChartWheel.tsx", "utf8");
const reportCss = fs.readFileSync("components/report/human-first-report.module.css", "utf8");
const impact = JSON.parse(fs.readFileSync("config/halleus-check-impact.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

for (const marker of [
  "buildChartProminenceProfile",
  "prominence: ChartProminenceProfile",
  "destination: HumanFirstReadingSectionId",
  "prominence.chartSentence",
  "buildProminenceReadingPath",
]) {
  assert.ok(liveContract.includes(marker), `Live contract missing prominence integration: ${marker}`);
}
assert.ok(summary.includes("onOpenFullReport(pattern.destination)"));
assert.ok(!summary.includes("PATTERN_DESTINATIONS"));
assert.ok(chartForm.includes("birthTimeAccuracy: birthTimeMode"));
assert.ok(route.includes("birthTimeAccuracy: readBirthTimeAccuracy(body.birthTimeAccuracy)"));
assert.ok(types.includes('birthTimeAccuracy?: "known" | "unknown"'));
assert.equal(
  pkg.scripts?.["check:chart-prominence"],
  "node scripts/check-chart-prominence.mjs",
);
assert.ok(pkg.scripts?.["check:reports"]?.includes("pnpm run check:chart-prominence"));
assert.ok(pkg.scripts?.["check:project"]?.includes("pnpm run check:chart-prominence"));

for (const marker of [
  "buildChartPatternProfile",
  "mergeChartPatternsIntoProminence",
  "chartPatterns: ChartPatternProfile",
  "chartPatterns.patterns",
]) {
  assert.ok(liveContract.includes(marker), `Live contract missing chart-pattern integration: ${marker}`);
}
for (const marker of [
  'kind: "pattern"',
  '"grand-cross"',
  '"grand-trine"',
  '"t-square"',
  '"sign-stellium"',
  '"house-stellium"',
  "excludedTimeDependentPatterns",
]) {
  assert.ok(patternSource.includes(marker), `Chart-pattern source missing marker: ${marker}`);
}
assert.ok(!productReader.includes("ReportChartPatternSection"));
assert.ok(!productReader.includes("patterns={contract.chartPatterns.patterns}"));
assert.ok(technicalAppendix.includes('{ id: "patterns", label: "الگوها" }'));
assert.ok(technicalAppendix.includes("function PatternTable"));
assert.ok(patternSection.includes('data-chart-pattern-kind={pattern.kind}'));
assert.ok(wheel.includes("appendPatternPlanetHighlights"));
assert.ok(wheel.includes("data-active-chart-pattern"));
assert.ok(reportCss.includes("Birth report Batch 3 chart-pattern presentation"));
const reportProductArea = impact.areas?.find((area) => area.id === "report-product-quality");
assert.ok(
  reportProductArea?.patterns?.includes("lib/astrology/chart-patterns.ts"),
  "report-product-quality impact area missing Batch 3 engine path",
);
assert.ok(
  reportProductArea?.patterns?.includes("components/report/**"),
  "report-product-quality must retain its report component wildcard",
);
const reportWheelArea = impact.areas?.find((area) => area.id === "report-wheel");
assert.ok(
  reportWheelArea?.patterns?.includes("components/ReportBirthChartWheel.tsx") &&
    reportWheelArea?.guards?.includes("check:report-birth-chart-wheel"),
  "report wheel must keep its dedicated guard instead of being shadowed",
);
assert.ok(
  reportProductArea?.patterns?.includes("lib/astrology/chart-rulership.ts"),
  "report-product-quality impact area missing Batch 4 rulership engine path",
);
for (const marker of [
  "buildChartRulershipProfile",
  "rulership: ChartRulershipProfile",
  "rulership.planetConditions",
]) {
  assert.ok(liveContract.includes(marker), `Live contract missing rulership integration: ${marker}`);
}
assert.ok(!productReader.includes("ReportRulershipSection"));
assert.ok(!productReader.includes("profile={contract.rulership}"));
assert.ok(technicalAppendix.includes('{ id: "rulership", label: "حاکمیت‌ها" }'));
assert.ok(technicalAppendix.includes("function RulershipTable"));
assert.ok(rulershipSection.includes('data-chart-rulership-version={profile.version}'));
assert.ok(rulershipSection.includes('data-rulership-detail="chart-ruler-evidence"'));
assert.ok(rulershipSection.includes('data-rulership-detail="planet-conditions"'));
assert.ok(rulershipSection.includes('data-rulership-detail="house-rulers"'));
assert.ok(
  reportProductArea?.patterns?.includes(
    "lib/astrology/validated-supplementary-points.ts",
  ),
  "report-product-quality impact area missing Batch 5 supplementary-points engine path",
);
for (const marker of [
  "buildValidatedSupplementaryPointsProfile",
  "supplementaryPoints: ValidatedSupplementaryPointsProfile",
  "buildSupplementaryPointsTechnicalWordCount",
]) {
  assert.ok(
    liveContract.includes(marker),
    `Live contract missing supplementary-points integration: ${marker}`,
  );
}
assert.ok(!productReader.includes("ReportSupplementaryPointsSection"));
assert.ok(
  !productReader.includes(
    "profile={contract.supplementaryPoints}",
  ),
);
assert.ok(
  technicalAppendix.includes(
    '{ id: "supplementary", label: "نقاط تکمیلی" }',
  ),
);
assert.ok(technicalAppendix.includes("function SupplementaryPointsTable"));
assert.ok(
  supplementarySection.includes(
    'data-validated-supplementary-points={profile.version}',
  ),
);
assert.ok(
  supplementarySection.includes(
    'data-supplementary-point-detail="part-of-fortune"',
  ),
);
assert.ok(!supplementarySection.includes("Chiron"));
assert.ok(!supplementarySection.includes("کایرون"));
assert.ok(
  supplementarySource.includes(
    'CHIRON_VALIDATION_DECISION =\n  "excluded-pending-independent-ephemeris-validation"',
  ),
);
assert.ok(!supplementarySource.includes("astronomy-engine"));
assert.ok(!supplementarySource.includes("swisseph"));

assert.ok(
  reportProductArea?.patterns?.includes("lib/astrology/whole-chart-synthesis.ts"),
  "report-product-quality impact area missing Batch 7 whole-chart synthesis engine path",
);
for (const marker of [
  "WHOLE_CHART_SYNTHESIS_VERSION",
  "buildWholeChartSynthesis",
  "WholeChartLifeAreaId",
  'kind: "part-of-fortune"',
  'kind: "dispositor-chain"',
]) {
  assert.ok(wholeSynthesisSource.includes(marker), `whole-chart synthesis missing marker: ${marker}`);
}
for (const marker of [
  "wholeChartSynthesis: WholeChartSynthesisProfile",
  "buildWholeChartSynthesis(report",
  "wholeChartSynthesis,",
]) {
  assert.ok(liveContract.includes(marker), `live contract missing Batch 7 marker: ${marker}`);
}
assert.ok(reportExperience.includes("ReportWholeChartSynthesis"));
assert.ok(reportExperience.includes("contract.wholeChartSynthesis"));
assert.ok(wholeSynthesisComponent.includes('data-whole-chart-synthesis={profile.version}'));
assert.ok(wholeSynthesisComponent.includes("data-whole-chart-dynamic-chapters"));
assert.ok(wholeSynthesisComponent.includes("data-whole-chart-life-areas"));
for (const interim of [
  "ReportChartPatternSection",
  "ReportRulershipSection",
  "ReportSupplementaryPointsSection",
]) {
  assert.ok(!productReader.includes(interim), `full report retained interim direct ownership: ${interim}`);
}
assert.ok(technicalAppendix.includes("function PatternTable"));
assert.ok(technicalAppendix.includes("function RulershipTable"));
assert.ok(technicalAppendix.includes("function SupplementaryPointsTable"));

console.log("Chart prominence and pattern intelligence check passed.");
console.log("- deterministic planet, house, axis, aspect, theme, hemisphere, quadrant, distribution, stellium, and aspect-pattern scoring");
console.log("- explicit unknown-time input removes every time-dependent factor");
console.log("- three visible signatures own evidence and report destinations");
console.log("- different chart structures produce different ranked signatures");
console.log("- sign/house stelliums, T-square, Grand Trine, and Grand Cross are fixture-verified");
console.log("- Grand Cross owns nested T-squares and Yod remains intentionally excluded");
console.log("- HALLEUS_CHART_PATTERNS_BATCH3_20260807");
console.log("- traditional house rulers, chart-ruler path, dispositor chain, and classical planetary conditions are fixture-verified");
console.log("- unknown birth time removes house/Ascendant rulership while preserving time-independent planetary conditions");
console.log("- HALLEUS_CHART_RULERSHIP_BATCH4_20260807");
console.log("- Part of Fortune uses the explicit day/night formula and never appears without reliable birth time");
console.log("- Chiron remains excluded until an independent ephemeris calculation is validated");
console.log("- HALLEUS_VALIDATED_SUPPLEMENTARY_POINTS_BATCH5_20260807");
console.log("- seven fixed whole-chart chapters, prominence-gated dynamic chapters, and ten life-area syntheses are fixture-verified");
console.log("- unknown birth time suppresses house/Ascendant-dependent synthesis and Chiron remains excluded without validation");
console.log("- HALLEUS_WHOLE_CHART_SYNTHESIS_BATCH7_20260807");
console.log("- HALLEUS_CHART_INTELLIGENCE_CONTINUOUS_READER_GUARD_20260808");
