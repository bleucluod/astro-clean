import type {
  RealEngineReportAngle,
  RealEngineReportHouse,
  RealEngineReportPlacement,
  RealEngineReportSnapshot,
  ZodiacKey,
} from "../../../types/astro.js";
import type {
  RealSynastryReport,
  SynastryBirthTimeStatus,
  SynastryNatalSnapshot,
} from "../../../types/synastry-engine.js";
import {
  buildRealSynastry,
  createSynastryNatalSnapshot,
} from "./real-synastry-engine.js";

export const REAL_SYNASTRY_FIXTURE_IDS = [
  "haleh-arad",
  "unrelated-pair",
  "sparse-pair",
  "dense-pair",
  "same-chart-pair",
  "swapped-pair",
  "one-unknown-time",
  "both-unknown-time",
  "invalid-input",
] as const;

const PLANET_IDS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

const SIGN_IDS: ZodiacKey[] = [
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

export function runRealSynastryFixtures(): {
  fixtureIds: readonly string[];
  passed: number;
} {
  const haleh = createFixtureSnapshot(
    "haleh",
    "هاله",
    [13, 47, 84, 122, 166, 205, 238, 276, 311, 344],
    "exact",
    18,
  );
  const arad = createFixtureSnapshot(
    "arad",
    "آراد",
    [14, 226, 82, 302, 167, 26, 119, 277, 130, 345],
    "exact",
    198,
  );
  const halehArad = requireReport(
    buildRealSynastry({
      chartA: haleh,
      chartB: arad,
      relationshipContext: "romantic",
      generatedAt: "2026-08-03T00:00:00.000Z",
    }),
  );
  assert(halehArad.contacts.length > 0, "haleh-arad must produce contacts");
  assert(
    halehArad.supportivePatterns.length > 0,
    "haleh-arad must produce supportive patterns",
  );
  assert(
    halehArad.tensionPatterns.length > 0,
    "haleh-arad must produce tension patterns",
  );
  assert(
    halehArad.quality.angleContactsAvailable,
    "exact-time pair must enable angle contacts",
  );
  assert(
    halehArad.quality.houseOverlaysAvailable,
    "exact-time pair must enable house overlays",
  );
  assert(
    halehArad.houseOverlays.some((overlay) => overlay.direction === "a-in-b") &&
      halehArad.houseOverlays.some(
        (overlay) => overlay.direction === "b-in-a",
      ),
    "house overlays must be directional in both directions",
  );

  const unrelatedA = createFixtureSnapshot(
    "unrelated-a",
    "چارت الف",
    [4, 41, 78, 115, 152, 189, 226, 263, 300, 337],
    "exact",
    4,
  );
  const unrelatedB = createFixtureSnapshot(
    "unrelated-b",
    "چارت ب",
    [26, 63, 100, 137, 174, 211, 248, 285, 322, 359],
    "exact",
    206,
  );
  const unrelated = requireReport(
    buildRealSynastry({ chartA: unrelatedA, chartB: unrelatedB }),
  );
  assert(
    unrelated.contacts.every(
      (contact) => contact.pointA.chartId !== contact.pointB.chartId,
    ),
    "all contacts must be inter-chart",
  );

  const sparseA = createFixtureSnapshot(
    "sparse-a",
    "کم‌داده الف",
    [0, 40, 80],
    "unknown",
  );
  const sparseB = createFixtureSnapshot(
    "sparse-b",
    "کم‌داده ب",
    [21, 61, 101],
    "unknown",
  );
  const sparse = requireReport(
    buildRealSynastry({ chartA: sparseA, chartB: sparseB }),
  );
  assert(
    sparse.quality.status === "partial",
    "sparse pair must remain partial",
  );

  const denseA = createFixtureSnapshot(
    "dense-a",
    "پرتماس الف",
    [0, 30, 60, 90, 120, 150, 180, 210, 240, 270],
    "exact",
    0,
  );
  const denseB = createFixtureSnapshot(
    "dense-b",
    "پرتماس ب",
    [1, 31, 61, 91, 121, 151, 181, 211, 241, 271],
    "exact",
    180,
  );
  const dense = requireReport(
    buildRealSynastry({ chartA: denseA, chartB: denseB }),
  );
  assert(
    dense.contacts.length > sparse.contacts.length,
    "dense pair must produce more contacts than sparse pair",
  );

  const sameChartA = cloneSnapshot(denseA, "same-a", "همسان الف");
  const sameChartB = cloneSnapshot(denseA, "same-b", "همسان ب");
  const sameChart = requireReport(
    buildRealSynastry({ chartA: sameChartA, chartB: sameChartB }),
  );
  assert(
    sameChart.contacts.some(
      (contact) =>
        contact.aspectId === "conjunction" && contact.orb === 0,
    ),
    "same-chart pair must preserve exact conjunctions",
  );

  const swapped = requireReport(
    buildRealSynastry({
      chartA: arad,
      chartB: haleh,
      relationshipContext: "romantic",
      generatedAt: "2026-08-03T00:00:00.000Z",
    }),
  );
  assertEqual(
    halehArad.contacts.map((contact) => contact.canonicalKey).sort(),
    swapped.contacts.map((contact) => contact.canonicalKey).sort(),
    "A/B swap must preserve canonical contact inventory",
  );
  assertEqual(
    canonicalPatternInventory(halehArad),
    canonicalPatternInventory(swapped),
    "A/B swap must preserve pattern evidence",
  );
  assert(
    halehArad.synthesis.wholePairFa === swapped.synthesis.wholePairFa,
    "A/B swap must preserve whole-pair synthesis",
  );

  const aradUnknown = createFixtureSnapshot(
    "arad-unknown",
    "آراد",
    [14, 226, 82, 302, 167, 26, 119, 277, 130, 345],
    "unknown",
  );
  const oneUnknown = requireReport(
    buildRealSynastry({ chartA: haleh, chartB: aradUnknown }),
  );
  assert(
    !oneUnknown.quality.angleContactsAvailable &&
      !oneUnknown.quality.houseOverlaysAvailable,
    "one unknown birth time must disable angles and overlays",
  );
  assert(
    oneUnknown.contacts.every(
      (contact) =>
        contact.pointA.kind === "planet" && contact.pointB.kind === "planet",
    ),
    "unknown-time result must retain only planet-to-planet contacts",
  );
  assert(
    oneUnknown.quality.planetToPlanetAvailable,
    "unknown-time result must preserve planet-to-planet analysis",
  );
  const oneUnknownSwapped = requireReport(
    buildRealSynastry({ chartA: aradUnknown, chartB: haleh }),
  );
  assertEqual(
    oneUnknown.quality.limitations,
    oneUnknownSwapped.quality.limitations,
    "A/B swap must preserve limitation inventory",
  );
  assert(
    oneUnknown.synthesis.limitationFa ===
      oneUnknownSwapped.synthesis.limitationFa,
    "A/B swap must preserve limitation synthesis",
  );

  const bothUnknown = requireReport(
    buildRealSynastry({ chartA: sparseA, chartB: sparseB }),
  );
  assert(
    bothUnknown.quality.limitations.some((item) => item.includes("ساعت تولد")),
    "both unknown-time fixture must expose a visible limitation",
  );

  const invalid = buildRealSynastry({
    chartA: {
      ...sparseA,
      chartId: "",
      placements: [],
    },
    chartB: sparseB,
  });
  assert(!invalid.ok, "invalid input must return a failure result");
  if (!invalid.ok) {
    assert(
      invalid.code === "invalid-chart-a",
      "invalid chart A must use invalid-chart-a code",
    );
  }

  const repeat = requireReport(
    buildRealSynastry({
      chartA: haleh,
      chartB: arad,
      relationshipContext: "romantic",
      generatedAt: "2026-08-03T00:00:00.000Z",
    }),
  );
  assertEqual(
    halehArad,
    repeat,
    "fixed input and generatedAt must produce deterministic output",
  );

  const serialized = JSON.stringify(halehArad);
  for (const forbidden of [
    "compatibilityPercentage",
    "compatibilityScore",
  ]) {
    assert(
      !serialized.includes(forbidden),
      `synastry output must not contain ${forbidden}`,
    );
  }
  assert(
    !serialized.includes("natal-to-transit"),
    "synastry must not reuse natal-to-transit contracts",
  );
  assert(
    halehArad.biWheel.innerPoints.length > 0 &&
      halehArad.biWheel.outerPoints.length > 0 &&
      halehArad.biWheel.aspectLines.length === halehArad.contacts.length,
    "bi-wheel contract must mirror the calculated contact inventory",
  );

  return { fixtureIds: REAL_SYNASTRY_FIXTURE_IDS, passed: 9 };
}

function createFixtureSnapshot(
  chartId: string,
  label: string,
  longitudes: number[],
  birthTimeStatus: SynastryBirthTimeStatus,
  ascendantLongitude = 0,
): SynastryNatalSnapshot {
  const placements = longitudes.map((longitude, index) =>
    buildPlacement(PLANET_IDS[index] ?? `point-${index}`, longitude),
  );
  const exact = birthTimeStatus === "exact";
  const snapshot: RealEngineReportSnapshot = {
    version: "real-engine-preview-v2",
    generatedAt: "2026-08-03T00:00:00.000Z",
    cityLabel: "Fixture City",
    utcIso: "2026-08-03T00:00:00.000Z",
    ascendantLongitude,
    houseSystem: exact ? "placidus" : "placeholder",
    houseContext: {
      requestedSystem: exact ? "placidus" : "placeholder",
      appliedSystem: exact ? "placidus" : "placeholder",
      availability: exact ? "ready" : "unavailable",
      unavailableReason: null,
      confidence: exact ? "calculated-cusps" : "placeholder",
      ascendantMethod: exact
        ? "astronomy-engine-local-sidereal-time"
        : "unknown",
      ascendantLongitude: exact ? ascendantLongitude : null,
      firstHouseCuspLongitude: exact ? ascendantLongitude : 0,
      cuspLongitudes: exact
        ? Array.from({ length: 12 }, (_, index) =>
            normalizeLongitude(ascendantLongitude + index * 30),
          )
        : null,
      calculationMethod: exact ? "fixture-placidus" : null,
      limitation: exact ? null : "fixture unknown time",
    },
    houses: exact ? buildHouses(ascendantLongitude, placements) : [],
    angles: exact ? buildAngles(ascendantLongitude) : undefined,
    calculationQuality: {
      status: exact ? "complete" : "partial",
      houseSystemStatus: exact ? "calculated" : "not-calculated",
      anglesStatus: exact ? "calculated" : "not-calculated",
      retrogradeStatus: "calculated",
      nodesStatus: "not-calculated",
      lilithStatus: "not-calculated",
      limitations: exact ? [] : ["fixture unknown birth time"],
      warnings: [],
    },
    placements,
    aspects: [],
    note: "Deterministic synastry fixture.",
  };

  return createSynastryNatalSnapshot({
    chartId,
    label,
    birthTimeStatus,
    snapshot,
  });
}

function buildPlacement(
  id: string,
  longitude: number,
): RealEngineReportPlacement {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  return {
    id,
    label: id,
    longitude: normalized,
    signId: SIGN_IDS[signIndex],
    degreeInSign: normalized % 30,
    house: null,
    method: "fixture-longitude",
  };
}

function buildAngles(
  ascendantLongitude: number,
): Record<"asc" | "dsc" | "mc" | "ic", RealEngineReportAngle> {
  const values = {
    asc: normalizeLongitude(ascendantLongitude),
    dsc: normalizeLongitude(ascendantLongitude + 180),
    mc: normalizeLongitude(ascendantLongitude + 90),
    ic: normalizeLongitude(ascendantLongitude + 270),
  };
  return Object.fromEntries(
    Object.entries(values).map(([id, longitude]) => {
      const normalized = normalizeLongitude(longitude);
      return [
        id,
        {
          id,
          label: id,
          longitude: normalized,
          signId: SIGN_IDS[Math.floor(normalized / 30)],
          degreeInSign: normalized % 30,
          method: "fixture-angle",
          source: id === "asc" || id === "mc" ? "calculated" : "derived-opposition",
          reliability: id === "asc" || id === "mc" ? "calculated" : "derived",
          house: null,
          limitation: null,
        },
      ];
    }),
  ) as Record<"asc" | "dsc" | "mc" | "ic", RealEngineReportAngle>;
}

function buildHouses(
  firstCusp: number,
  placements: RealEngineReportPlacement[],
): RealEngineReportHouse[] {
  return Array.from({ length: 12 }, (_, index) => {
    const number = (index + 1) as RealEngineReportHouse["number"];
    const cuspLongitude = normalizeLongitude(firstCusp + index * 30);
    return {
      number,
      signId: SIGN_IDS[Math.floor(cuspLongitude / 30)],
      cuspLongitude,
      degreeInSign: cuspLongitude % 30,
      system: "placidus",
      method: "placidus-calculated",
      reliability: "calculated",
      planetIds: placements
        .filter(
          (placement) =>
            Math.floor(
              normalizeLongitude(placement.longitude - firstCusp) / 30,
            ) === index,
        )
        .map((placement) => placement.id),
      angleIds: [],
      limitation: null,
    };
  });
}

function cloneSnapshot(
  snapshot: SynastryNatalSnapshot,
  chartId: string,
  label: string,
): SynastryNatalSnapshot {
  return JSON.parse(
    JSON.stringify({ ...snapshot, chartId, label }),
  ) as SynastryNatalSnapshot;
}

function canonicalPatternInventory(report: RealSynastryReport): string[] {
  return [...report.supportivePatterns, ...report.tensionPatterns]
    .flatMap((pattern) => pattern.contactIds)
    .map((id) =>
      report.contacts.find((contact) => contact.id === id)?.canonicalKey ?? id,
    )
    .sort();
}

function requireReport(
  result: ReturnType<typeof buildRealSynastry>,
): RealSynastryReport {
  if (!result.ok) {
    throw new Error(`Expected successful fixture: ${result.issues.join(" | ")}`);
  }
  return result.report;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message);
  }
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}
