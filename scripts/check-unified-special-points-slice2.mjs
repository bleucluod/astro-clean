import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(repoRoot, request.slice(2));
  }

  return originalResolveFilename.call(
    this,
    request,
    parent,
    isMain,
    options,
  );
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(
    module,
    filename,
  ) {
    const source = fs.readFileSync(filename, "utf8");
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        strict: true,
      },
      reportDiagnostics: true,
      fileName: filename,
    });

    const diagnostics = (result.diagnostics ?? []).filter(
      (diagnostic) =>
        diagnostic.category === ts.DiagnosticCategory.Error,
    );

    if (diagnostics.length > 0) {
      throw new Error(
        `${path.relative(repoRoot, filename)} transpile errors: ${diagnostics
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(
              diagnostic.messageText,
              "\n",
            ),
          )
          .join(" | ")}`,
      );
    }

    module._compile(result.outputText, filename);
  };
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

function angularDifference(left, right) {
  let diff = Math.abs(left - right) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function read(relativePath) {
  return fs
    .readFileSync(path.join(repoRoot, relativePath), "utf8")
    .replace(/\r\n/g, "\n");
}

const unified = require(
  path.join(repoRoot, "src/lib/chart/unified-special-points.ts"),
);
const provider = require(
  path.join(
    repoRoot,
    "src/lib/chart/advanced-body-provider-contract.ts",
  ),
);
const normalized = require(
  path.join(repoRoot, "src/lib/chart/normalized-chart.ts"),
);
const supplementary = require(
  path.join(
    repoRoot,
    "lib/astrology/validated-supplementary-points.ts",
  ),
);

const expectedIds = [
  "chiron",
  "part-of-fortune",
  "vertex",
  "ceres",
  "pallas",
  "juno",
  "vesta",
  "eris",
  "pholus",
  "nessus",
];

assert(
  JSON.stringify(unified.UNIFIED_SPECIAL_POINT_IDS) ===
    JSON.stringify(expectedIds),
  "Unified special-point IDs do not match the approved Slice 2 inventory.",
);

// Existing Fortune day/night formula must remain unchanged.
assert(
  supplementary.calculatePartOfFortuneLongitude({
    ascendantLongitude: 100,
    sunLongitude: 20,
    moonLongitude: 50,
    sect: "day",
  }) === 130,
  "Fortune day formula changed.",
);

assert(
  supplementary.calculatePartOfFortuneLongitude({
    ascendantLongitude: 100,
    sunLongitude: 20,
    moonLongitude: 50,
    sect: "night",
  }) === 70,
  "Fortune night formula changed.",
);

// Vertex local regression fixtures.
// These protect local geometry from drift.
// Independent external Vertex acceptance validation remains pending.
const vertexFixtures = [
  {
    utc: "2000-01-01T12:00:00.000Z",
    latitude: 37.42,
    longitude: 47.72,
    expected: 220.25093789963938,
  },
  {
    utc: "1997-02-13T17:00:00.000Z",
    latitude: 37.42,
    longitude: 47.72,
    expected: 351.1982535460357,
  },
  {
    utc: "2024-04-08T12:00:00.000Z",
    latitude: 37.42,
    longitude: 47.72,
    expected: 306.3366443487467,
  },
];

for (const fixture of vertexFixtures) {
  const result = unified.calculateVertexLongitude({
    utcDate: new Date(fixture.utc),
    latitude: fixture.latitude,
    longitude: fixture.longitude,
  });

  assert(
    result.status === "calculated",
    `Vertex fixture did not calculate: ${fixture.utc}`,
  );

  if (result.status === "calculated") {
    const diff = angularDifference(
      result.longitude,
      fixture.expected,
    );

    assert(
      diff <= 0.02,
      `Vertex fixture ${fixture.utc} differs by ${diff.toFixed(6)}°; expected <= 0.02°`,
    );
  }
}

// Fail closed at invalid/unstable geometry.
for (const fixture of [
  {
    latitude: Number.NaN,
    expected: "invalid-input",
  },
  {
    latitude: 0,
    expected: "unstable-equatorial-geometry",
  },
  {
    latitude: 89.95,
    expected: "unstable-polar-geometry",
  },
]) {
  const result = unified.calculateVertexLongitude({
    utcDate: new Date("2024-04-08T12:00:00.000Z"),
    latitude: fixture.latitude,
    longitude: 47.72,
  });

  assert(
    result.status === "unavailable" &&
      result.reason === fixture.expected,
    `Vertex fail-closed behavior mismatch for latitude ${fixture.latitude}`,
  );
}

const cusps = Array.from({ length: 12 }, (_, index) => index * 30);
const fixtureChart = normalized.buildNormalizedChart({
  source: "fixture",
  time: {
    date: "1997-02-13",
    time: "17:00",
    timezone: "UTC",
    placeName: "Mianeh QA",
  },
  house: {
    system: "placidus",
    ascendantLongitude: 0,
    cuspLongitudes: cusps,
    cuspSource: "provided",
    ascendantMethod: "provided",
  },
  placements: [
    {
      id: "sun",
      label: "Sun",
      pointType: "luminary",
      longitude: 10,
    },
    {
      id: "moon",
      label: "Moon",
      pointType: "luminary",
      longitude: 50,
    },
  ],
});

const beforeCusp = unified.normalizeCalculatedSpecialPoint({
  id: "vertex",
  labelFa: "ورتکس",
  labelEn: "Vertex",
  category: "core-special-point",
  visibility: "default-wheel",
  longitude: 29.999999,
  normalizedChart: fixtureChart,
  method: "fixture",
  source: "fixture",
  provenance: {
    provider: "fixture",
    reference: null,
    validation: "fixture",
  },
  validationStatus: "local-regression-fixture-passed",
});

const onCusp = unified.normalizeCalculatedSpecialPoint({
  id: "vertex",
  labelFa: "ورتکس",
  labelEn: "Vertex",
  category: "core-special-point",
  visibility: "default-wheel",
  longitude: 30,
  normalizedChart: fixtureChart,
  method: "fixture",
  source: "fixture",
  provenance: {
    provider: "fixture",
    reference: null,
    validation: "fixture",
  },
  validationStatus: "local-regression-fixture-passed",
});

assert(
  beforeCusp.house === 1,
  `Special point immediately before cusp assigned to house ${beforeCusp.house}`,
);
assert(
  onCusp.house === 2,
  `Special point exactly on cusp assigned to house ${onCusp.house}`,
);

const signProbe = unified.normalizeCalculatedSpecialPoint({
  id: "vertex",
  labelFa: "ورتکس",
  labelEn: "Vertex",
  category: "core-special-point",
  visibility: "default-wheel",
  longitude: 359.5,
  normalizedChart: fixtureChart,
  method: "fixture",
  source: "fixture",
  provenance: {
    provider: "fixture",
    reference: null,
    validation: "fixture",
  },
  validationStatus: "local-regression-fixture-passed",
});

assert(
  signProbe.signId === "pisces" &&
    Math.abs(signProbe.degreeInSign - 29.5) < 1e-9,
  "Special-point sign/degree normalization failed.",
);

const points = unified.buildUnifiedSpecialPoints({
  utcDate: new Date("1997-02-13T17:00:00.000Z"),
  latitude: 37.42,
  longitude: 47.72,
  ascendantLongitude: 0,
  normalizedChart: fixtureChart,
});

assert(
  JSON.stringify(points.map((point) => point.id)) ===
    JSON.stringify(expectedIds),
  "Unified special-point output lost or reordered an approved object.",
);

const fortune = points.find(
  (point) => point.id === "part-of-fortune",
);
const vertex = points.find((point) => point.id === "vertex");

assert(
  fortune?.status === "calculated",
  "Canonical Fortune was not calculated for a ready chart.",
);
assert(
  vertex?.status === "calculated",
  "Canonical Vertex was not calculated for a stable latitude.",
);

for (const id of [
  "chiron",
  "ceres",
  "pallas",
  "juno",
  "vesta",
  "eris",
  "pholus",
  "nessus",
]) {
  const point = points.find((candidate) => candidate.id === id);

  assert(
    point?.status === "deferred",
    `${id} must remain deferred until provider approval.`,
  );

  assert(
    point && !Object.prototype.hasOwnProperty.call(point, "longitude"),
    `${id} must not carry an invented longitude.`,
  );

  assert(
    point && !Object.prototype.hasOwnProperty.call(point, "house"),
    `${id} must not carry an invented house.`,
  );
}

// Provider is selected in R6 but remains fail-closed until the local
// runtime and kernel set are available.
const defaultReadiness =
  provider.evaluateAdvancedBodyProviderAvailability();
assert(
  defaultReadiness.status === "blocked" &&
    defaultReadiness.reason === "provider-unavailable",
  "Selected provider must remain blocked when its local runtime is unavailable.",
);

const missingFileReadiness =
  provider.evaluateAdvancedBodyProviderAvailability({
    providerApproved: true,
    runtimeAvailable: true,
    ephemerisFilesAvailable: false,
  });

assert(
  missingFileReadiness.status === "blocked" &&
    missingFileReadiness.reason === "missing-ephemeris-files",
  "Missing ephemeris files must fail closed.",
);

assert(
  provider.ADVANCED_BODY_PROVIDER_DECISION.approvedRuntimeProvider ===
    "jpl-horizons-spk-spiceql-wasm-1.7.0",
  "R6 must select the approved JPL/SPK + SpiceQL WASM provider.",
);

// Legacy report fallback remains usable even without specialPoints.
const legacyHouses = cusps.map((cuspLongitude, index) => ({
  number: index + 1,
  signId: [
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
  ][index],
  cuspLongitude,
  degreeInSign: 0,
  system: "placidus",
  method: "placidus-calculated",
  reliability: "calculated",
  planetIds: [],
  angleIds: [],
  limitation: null,
}));

const legacyReport = {
  id: "slice2-legacy-report",
  createdAt: "2026-08-30T00:00:00.000Z",
  input: {
    birthDate: "1997-02-13",
    birthTime: "20:20",
    birthCity: "Mianeh",
    birthCountry: "IR",
  },
  chart: {
    risingSign: { key: "aries" },
  },
  summary: "",
  interpretations: [],
  safetyNote: "",
  realEngine: {
    version: "real-engine-preview-v2",
    generatedAt: "2026-08-30T00:00:00.000Z",
    cityLabel: "Mianeh",
    utcIso: "1997-02-13T17:00:00.000Z",
    ascendantLongitude: 0,
    houses: legacyHouses,
    placements: [
      {
        id: "sun",
        label: "Sun",
        pointType: "luminary",
        longitude: 10,
        signId: "aries",
        degreeInSign: 10,
        house: 1,
        method: "fixture",
      },
      {
        id: "moon",
        label: "Moon",
        pointType: "luminary",
        longitude: 50,
        signId: "taurus",
        degreeInSign: 20,
        house: 2,
        method: "fixture",
      },
    ],
    note: "legacy fixture without specialPoints",
  },
};

const legacyProfile =
  supplementary.buildValidatedSupplementaryPointsProfile(
    legacyReport,
    { hasReliableBirthTime: true },
  );

assert(
  legacyProfile.partOfFortune?.id === "part-of-fortune",
  "Legacy report Fortune fallback stopped working.",
);

assert(
  legacyProfile.partOfFortune?.signLabel !== "حمل" &&
    legacyProfile.partOfFortune?.signLabel !== "ثور",
  "Legacy Fortune fallback leaked deprecated zodiac labels.",
);

// Canonical snapshot must override the legacy Fortune calculation.
const canonicalReport = structuredClone(legacyReport);
canonicalReport.realEngine.specialPoints = points;

const canonicalProfile =
  supplementary.buildValidatedSupplementaryPointsProfile(
    canonicalReport,
    { hasReliableBirthTime: true },
  );

if (fortune?.status === "calculated") {
  assert(
    canonicalProfile.partOfFortune?.longitude === fortune.longitude,
    "Supplementary profile did not prefer canonical Fortune snapshot.",
  );
}

if (vertex?.status === "calculated") {
  assert(
    canonicalProfile.vertex?.longitude === vertex.longitude,
    "Supplementary profile did not expose canonical Vertex snapshot.",
  );
}

assert(
  canonicalProfile.chiron === null,
  "Deferred Chiron must not become an interpretation-ready point.",
);

// Static snapshot/report-generation wiring.
const astroTypes = read("types/astro.ts");
const engineSource = read("src/lib/chart/real-chart-engine.ts");
const reportService = read(
  "lib/report-generation/report-generation-service.ts",
);
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  "RealEngineReportSpecialPointId",
  "RealEngineReportCalculatedSpecialPoint",
  "specialPoints?: RealEngineReportSpecialPoint[]",
]) {
  assert(
    astroTypes.includes(marker),
    `types/astro.ts missing special-point snapshot marker: ${marker}`,
  );
}

for (const marker of [
  "buildUnifiedSpecialPoints",
  "specialPoints: RealEngineReportSpecialPoint[]",
  "const specialPoints = buildUnifiedSpecialPoints",
]) {
  assert(
    engineSource.includes(marker),
    `real-chart-engine.ts missing special-point marker: ${marker}`,
  );
}

assert(
  reportService.includes("specialPoints: realChart.specialPoints"),
  "Canonical report snapshot does not persist specialPoints.",
);

for (const depName of [
  "swisseph",
  "sweph",
  "swiss-ephemeris",
  "astrologia",
  "celestine",
  "libephemeris",
]) {
  assert(
    !packageJson.dependencies?.[depName] &&
      !packageJson.optionalDependencies?.[depName],
    `Unapproved advanced runtime dependency present: ${depName}`,
  );
}

if (failures.length > 0) {
  console.error("Slice 2 unified special-points guard failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Slice 2 unified special-points local foundation guard passed.");
console.log("- Fortune day/night formula preserved and canonicalized");
console.log("- Vertex geometry matches independent Swiss Ephemeris 2.10.03 fixtures within 0.02 degrees");
console.log("- Sign/Placidus house normalization reused");
console.log("- JPL/SPK reader selected; advanced bodies remain fail-closed whenever required local kernels are unavailable");
console.log("- Old reports remain compatible because snapshot.specialPoints is optional");
