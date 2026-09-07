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
      esModuleInterop: true,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveTypeScript(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(process.cwd(), request.slice(2)),
      parent,
      isMain,
      options,
    );
  }

  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    if (
      typeof request === "string" &&
      !path.extname(request) &&
      parent?.filename
    ) {
      const tsCandidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(tsCandidate)) return tsCandidate;
    }
    throw error;
  }
};

const {
  REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS,
  REAL_SYNASTRY_CONTRACT_VERSION,
} = require("../types/synastry-engine.ts");
const {
  buildRealSynastry,
  createSynastryNatalSnapshot,
} = require("../lib/astrology/synastry/real-synastry-engine.ts");

const astroTypes = fs.readFileSync("types/astro.ts", "utf8");
const snapshotMatch = astroTypes.match(
  /export type RealEngineReportSnapshot = \{([\s\S]*?)\n\};/,
);
assert.ok(snapshotMatch, "RealEngineReportSnapshot block must be readable.");

const realEngineFields = [
  ...snapshotMatch[1].matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*)(?:\?)?:/gm),
]
  .map((match) => match[1])
  .sort();

assert.deepEqual(
  [...REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS].sort(),
  realEngineFields,
  "Synastry coverage fields must stay exhaustive with RealEngineReportSnapshot.",
);

assert.equal(REAL_SYNASTRY_CONTRACT_VERSION, "real-synastry-v2");

const zodiac = [
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
];

const normalize = (value) => ((value % 360) + 360) % 360;
const signFor = (longitude) => zodiac[Math.floor(normalize(longitude) / 30)];
const degreeInSign = (longitude) => normalize(longitude) % 30;

function placement(id, longitude, motionStatus = "direct") {
  return {
    id,
    label: id,
    longitude: normalize(longitude),
    signId: signFor(longitude),
    degreeInSign: degreeInSign(longitude),
    house: Math.floor(normalize(longitude) / 30) + 1,
    method: "fixture-astronomy-engine",
    motion: {
      status: motionStatus,
      arcDegreesPerDay: motionStatus === "retrograde" ? -0.4 : 0.8,
      sampleWindowHours: 24,
      method: "astronomy-engine-geocentric-ecliptic-daily-motion",
    },
  };
}

function angle(id, longitude) {
  return {
    id,
    label: id.toUpperCase(),
    longitude: normalize(longitude),
    signId: signFor(longitude),
    degreeInSign: degreeInSign(longitude),
    method: "fixture-angle",
    source: "calculated",
    reliability: "production-grade",
    house: id === "asc" ? 1 : id === "dsc" ? 7 : id === "mc" ? 10 : 4,
    limitation: null,
  };
}

function houses(offset = 0) {
  return Array.from({ length: 12 }, (_, index) => {
    const longitude = normalize(offset + index * 30);
    return {
      number: index + 1,
      signId: signFor(longitude),
      cuspLongitude: longitude,
      degreeInSign: degreeInSign(longitude),
      system: "placidus",
      method: "placidus-calculated",
      reliability: "production-grade",
      planetIds: [],
      angleIds: [],
      limitation: null,
    };
  });
}

function specialPoint(id, labelFa, longitude, category = "core-special-point") {
  return {
    status: "calculated",
    id,
    labelFa,
    labelEn: id,
    category,
    visibility: category === "advanced-body" ? "advanced-wheel" : "default-wheel",
    longitude: normalize(longitude),
    signId: signFor(longitude),
    degreeInSign: degreeInSign(longitude),
    house: Math.floor(normalize(longitude) / 30) + 1,
    method: "fixture-special-point",
    source: "fixture",
    reliability: "calculated",
    validationStatus: "local-regression-fixture-passed",
    provenance: {
      provider: "fixture",
      reference: "fixture-reference",
      validation: "fixture-validation",
    },
    motion: {
      status: "direct",
      arcDegreesPerDay: 0.1,
      sampleWindowHours: 24,
      method: "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference",
    },
  };
}

function makeSnapshot(offset = 0) {
  const placements = [
    placement("sun", 10 + offset),
    placement("moon", 42 + offset),
    placement("mercury", 75 + offset, "retrograde"),
    placement("venus", 112 + offset),
    placement("mars", 145 + offset),
    placement("jupiter", 182 + offset),
    placement("saturn", 215 + offset),
    placement("uranus", 248 + offset),
    placement("neptune", 281 + offset),
    placement("pluto", 318 + offset),
  ];

  const houseRows = houses(offset);
  const asc = angle("asc", offset);
  const dsc = angle("dsc", offset + 180);
  const mc = angle("mc", offset + 90);
  const ic = angle("ic", offset + 270);

  const lots = [
    ["fortune", "سهم بخت", 15],
    ["spirit", "سهم روح", 45],
    ["eros", "اروس", 75],
    ["necessity", "ضرورت", 105],
    ["courage", "شجاعت", 135],
    ["victory", "پیروزی", 165],
    ["nemesis", "نمسیس", 195],
  ].map(([id, labelFa, base]) => {
    const longitude = normalize(Number(base) + offset);
    return {
      id,
      labelFa,
      labelEn: String(id),
      formulaId: `fixture-${id}`,
      tradition: "fixture",
      sect: "day",
      dayNightBehavior: "sect-reversing",
      longitude,
      signId: signFor(longitude),
      degreeInSign: degreeInSign(longitude),
      house: Math.floor(longitude / 30) + 1,
      houseSystemContext: "placidus-placement-only",
      wholeSignInterpretationApplied: false,
      source: "fixture-lot",
    };
  });

  const northLongitude = normalize(65 + offset);
  const southLongitude = normalize(northLongitude + 180);
  const lilithLongitude = normalize(133 + offset);

  return {
    version: "real-engine-preview-v2",
    generatedAt: "2026-09-07T00:00:00.000Z",
    behavioralAudienceMode: "adult",
    cityLabel: "Fixture City",
    utcIso: "2026-09-07T00:00:00.000Z",
    ascendantLongitude: offset,
    houseContext: {
      requestedSystem: "placidus",
      appliedSystem: "placidus",
      availability: "ready",
      unavailableReason: null,
      confidence: "calculated-cusps",
      ascendantMethod: "astronomy-engine-local-sidereal-time",
      ascendantLongitude: offset,
      firstHouseCuspLongitude: offset,
      cuspLongitudes: houseRows.map((house) => house.cuspLongitude),
      calculationMethod: "fixture-placidus",
      limitation: null,
    },
    houseSystem: "placidus",
    houses: houseRows,
    angles: { asc, dsc, mc, ic },
    calculationQuality: {
      status: "complete",
      houseSystemStatus: "production-grade",
      anglesStatus: "production-grade",
      retrogradeStatus: "calculated",
      nodesStatus: "calculated",
      lilithStatus: "calculated",
      limitations: [],
      warnings: ["fixture-warning-preserved"],
    },
    retrogrades: {
      status: "calculated",
      method: "fixture-motion",
      planetIds: ["mercury"],
      limitation: null,
    },
    lunarNodes: {
      status: "calculated",
      method: "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date",
      nodeType: "local-true-osculating",
      northNode: {
        id: "north-node",
        label: "North Node",
        longitude: northLongitude,
        signId: signFor(northLongitude),
        degreeInSign: degreeInSign(northLongitude),
        house: 3,
        method: "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date",
        source: "calculated",
        reliability: "calculated",
        limitation: null,
      },
      southNode: {
        id: "south-node",
        label: "South Node",
        longitude: southLongitude,
        signId: signFor(southLongitude),
        degreeInSign: degreeInSign(southLongitude),
        house: 9,
        method: "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date",
        source: "derived-opposition",
        reliability: "derived",
        limitation: null,
      },
      limitation: null,
    },
    lilith: {
      status: "calculated",
      id: "black-moon-lilith",
      label: "Local True/Osculating Black Moon Lilith",
      longitude: lilithLongitude,
      signId: signFor(lilithLongitude),
      degreeInSign: degreeInSign(lilithLongitude),
      house: 5,
      method: "local-osculating-black-moon-lilith-from-validated-probe",
      modelId: "true-osculating-black-moon-lilith",
      lilithType: "local-true-osculating-black-moon-lilith",
      source: "astronomy-engine-geomoonstate-local-state-vector",
      reliability: "calculated",
      approvedForReportOutput: true,
      validationStatus: "independent-reference-fixtures-passed",
      validationReference: "swiss-ephemeris-2.10.03-offline-osculating-apogee",
      validationToleranceDegrees: 0.1,
      limitation: null,
    },
    specialPoints: [
      specialPoint("chiron", "کایرون", 22 + offset),
      specialPoint("part-of-fortune", "سهم بخت", 52 + offset),
      specialPoint("vertex", "ورتکس", 82 + offset),
      specialPoint("ceres", "سرس", 122 + offset, "advanced-body"),
      specialPoint("pallas", "پالاس", 152 + offset, "advanced-body"),
      specialPoint("juno", "جونو", 192 + offset, "advanced-body"),
      specialPoint("vesta", "وستا", 222 + offset, "advanced-body"),
      specialPoint("eris", "اریس", 252 + offset, "advanced-body"),
      specialPoint("pholus", "فولوس", 292 + offset, "advanced-body"),
      {
        status: "deferred",
        id: "nessus",
        labelFa: "نسوس",
        labelEn: "Nessus",
        category: "advanced-body",
        visibility: "advanced-wheel",
        method: null,
        source: "fixture",
        reliability: "not-calculated",
        validationStatus: "provider-blocked",
        provenance: { provider: "fixture", reference: null, validation: "blocked" },
        limitation: "fixture deferred point",
      },
    ],
    specialistAstrology: {
      version: "fixture-specialist-v1",
      fixedStars: {
        catalogueVersion: "fixture-stars-v1",
        stars: [
          {
            id: "aldebaran",
            labelFa: "دبران",
            labelEn: "Aldebaran",
            longitude: normalize(69 + offset),
            signId: signFor(69 + offset),
            degreeInSign: degreeInSign(69 + offset),
            house: 3,
            source: "fixture-star",
            catalogueVersion: "fixture-stars-v1",
          },
        ],
        conjunctionCandidateOrbDegrees: 1,
        conjunctionCandidates: [
          {
            starId: "aldebaran",
            starLabelFa: "دبران",
            starLabelEn: "Aldebaran",
            anchorId: "moon",
            anchorLabel: "Moon",
            anchorClass: "core-angle-or-luminary",
            orbDegrees: 0.4,
            narrativeEligibleByContactOnly: false,
          },
        ],
        narrativePromotion: "deferred-to-slice4-relevance",
      },
      traditionalLots: {
        formulaSetVersion: "fixture-lots-v1",
        lots,
        houseInterpretationNote: "fixture",
      },
      asteroidLab: {
        catalogueVersion: "fixture-asteroid-lab-v1",
        surface: "separate-search",
        mainReportPromotion: "not-automatic",
      },
    },
    chartSignature: {
      version: "chart-signature-v1",
      method: "equal-weight-major-planets",
      elementCounts: { fire: 3, earth: 2, air: 3, water: 2 },
      modalityCounts: { cardinal: 4, fixed: 3, mutable: 3 },
      expressionCounts: { active: 6, receptive: 4 },
      dominantElement: null,
      dominantModality: "cardinal",
      dominantExpression: "active",
      lowElements: ["earth", "water"],
      lowModalities: [],
      lowExpressions: ["receptive"],
      zeroElements: [],
      zeroModalities: [],
      evidence: [],
      excludedPlacementIds: [],
    },
    placements,
    aspects: [],
    aspectHighlights: [],
    note: "fixture note preserved",
  };
}

const sourceA = makeSnapshot(0);
const sourceB = makeSnapshot(17);

const chartA = createSynastryNatalSnapshot({
  chartId: "fixture-a",
  label: "الف",
  birthTimeStatus: "exact",
  snapshot: sourceA,
});
const chartB = createSynastryNatalSnapshot({
  chartId: "fixture-b",
  label: "ب",
  birthTimeStatus: "exact",
  snapshot: sourceB,
});

assert.strictEqual(chartA.engineSnapshot, sourceA);
assert.equal(chartA.engineParityVersion, "real-engine-synastry-parity-v1");
assert.equal(Object.keys(chartA.engineCoverage).length, realEngineFields.length);

const pointById = new Map(chartA.points.map((point) => [point.id, point]));
assert.equal(pointById.get("north-node")?.kind, "lunar-node");
assert.equal(pointById.get("black-moon-lilith")?.kind, "lilith");
assert.equal(pointById.get("chiron")?.kind, "special-point");
assert.equal(pointById.get("ceres")?.kind, "advanced-body");
assert.equal(pointById.get("lot:fortune")?.kind, "traditional-lot");
assert.equal(pointById.get("fixed-star:aldebaran")?.kind, "fixed-star");
assert.ok(!pointById.has("nessus"));
assert.equal(sourceA.specialPoints.at(-1).id, "nessus");

for (const id of ["north-node", "black-moon-lilith", "chiron", "lot:fortune"]) {
  assert.equal(
    pointById.get(id)?.contactPolicy,
    "deferred-no-approved-orb-policy",
  );
}
assert.equal(pointById.get("fixed-star:aldebaran")?.contactPolicy, "not-contact-eligible");

const result = buildRealSynastry({
  chartA,
  chartB,
  relationshipContext: "work",
  generatedAt: "2026-09-07T00:00:00.000Z",
});
assert.equal(result.ok, true);
const report = result.report;

assert.equal(report.quality.engineParityComplete, true);
assert.equal(report.quality.engineCoverageFieldCount, realEngineFields.length);
assert.ok(report.quality.normalizedPointCount > 20);
assert.ok(report.quality.deferredContactPointCount > 0);
assert.ok(report.biWheel.fullInnerPoints.some((point) => point.pointId === "north-node"));
assert.ok(report.biWheel.fullInnerPoints.some((point) => point.pointId === "chiron"));
assert.ok(report.biWheel.fullInnerPoints.some((point) => point.pointId === "lot:fortune"));
assert.ok(report.biWheel.fullInnerPoints.some((point) => point.pointId === "fixed-star:aldebaran"));

for (const contact of report.contacts) {
  assert.ok(
    ["planet", "angle"].includes(contact.pointA.kind) &&
      ["planet", "angle"].includes(contact.pointB.kind),
    "No unapproved advanced-point orb may create a new cross-chart contact.",
  );
}

assert.ok(report.houseOverlays.some((overlay) => overlay.sourcePointId === "north-node"));
assert.ok(report.houseOverlays.some((overlay) => overlay.sourcePointId === "chiron"));
assert.ok(report.houseOverlays.some((overlay) => overlay.sourcePointId === "lot:fortune"));
assert.ok(!report.houseOverlays.some((overlay) => overlay.sourcePointId === "fixed-star:aldebaran"));

const unknown = createSynastryNatalSnapshot({
  chartId: "fixture-unknown",
  label: "نامشخص",
  birthTimeStatus: "unknown",
  snapshot: sourceA,
});
assert.equal(unknown.angles.length, 0);
assert.equal(unknown.houses.length, 0);
assert.strictEqual(unknown.engineSnapshot, sourceA);
assert.equal(unknown.points.find((point) => point.id === "vertex")?.analysisEligible, false);
assert.equal(unknown.points.find((point) => point.id === "part-of-fortune")?.analysisEligible, false);
assert.equal(unknown.points.find((point) => point.id === "lot:fortune")?.analysisEligible, false);
assert.equal(unknown.points.find((point) => point.id === "north-node")?.analysisEligible, true);

console.log("synastry engine parity check passed");
console.log(`- RealEngine coverage fields: ${realEngineFields.length}`);
console.log(`- normalized exact-time points: ${chartA.points.length}`);
console.log(`- house overlays: ${report.houseOverlays.length}`);
console.log(`- existing major-aspect contacts: ${report.contacts.length}`);
console.log("- advanced point orbs remain deferred rather than guessed");
console.log("- legacy report fields remain optional while new v2 creator output is full-fidelity");
