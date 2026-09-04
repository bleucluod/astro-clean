import * as Astronomy from "astronomy-engine";

import { calculatePartOfFortuneLongitude } from "@/lib/astrology/validated-supplementary-points";
import type {
  RealEngineReportCalculatedSpecialPoint,
  RealEngineReportSpecialPoint,
  RealEngineReportSpecialPointId,
} from "@/types/astro";
import {
  evaluateAdvancedBodyProviderAvailability,
  type AdvancedBodyProviderBlockReason,
} from "./advanced-body-provider-contract";
import {
  calculateR9ValidatedMainAsteroids,
} from "./jpl-main-asteroid-calculation";
import {
  calculateR19ValidatedSecondaryBodies,
} from "./jpl-secondary-body-calculation";
import {
  normalizeChartPlacement,
  type NormalizedChart,
} from "./normalized-chart";
import { getZodiacPosition } from "./zodiac";

export const UNIFIED_SPECIAL_POINTS_VERSION =
  "slice2-unified-special-points-r1-20260830" as const;

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R1_20260830

export const UNIFIED_SPECIAL_POINT_IDS = [
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
] as const satisfies readonly RealEngineReportSpecialPointId[];

const DAY_HOUSES = new Set([7, 8, 9, 10, 11, 12]);

const SPECIAL_POINT_META: Record<
  RealEngineReportSpecialPointId,
  {
    labelFa: string;
    labelEn: string;
    category: "core-special-point" | "advanced-body";
    visibility: "default-wheel" | "advanced-wheel";
  }
> = {
  chiron: {
    labelFa: "کایران",
    labelEn: "Chiron",
    category: "core-special-point",
    visibility: "default-wheel",
  },
  "part-of-fortune": {
    labelFa: "فورچون",
    labelEn: "Lot of Fortune",
    category: "core-special-point",
    visibility: "default-wheel",
  },
  vertex: {
    labelFa: "ورتکس",
    labelEn: "Vertex",
    category: "core-special-point",
    visibility: "default-wheel",
  },
  ceres: {
    labelFa: "سرس",
    labelEn: "Ceres",
    category: "advanced-body",
    visibility: "advanced-wheel",
  },
  pallas: {
    labelFa: "پالاس",
    labelEn: "Pallas",
    category: "advanced-body",
    visibility: "advanced-wheel",
  },
  juno: {
    labelFa: "جونو",
    labelEn: "Juno",
    category: "advanced-body",
    visibility: "advanced-wheel",
  },
  vesta: {
    labelFa: "وستا",
    labelEn: "Vesta",
    category: "advanced-body",
    visibility: "advanced-wheel",
  },
  eris: {
    labelFa: "اریس",
    labelEn: "Eris",
    category: "advanced-body",
    visibility: "advanced-wheel",
  },
  pholus: {
    labelFa: "فولوس",
    labelEn: "Pholus",
    category: "advanced-body",
    visibility: "advanced-wheel",
  },
  nessus: {
    labelFa: "نسوس",
    labelEn: "Nessus",
    category: "advanced-body",
    visibility: "advanced-wheel",
  },
};

export type BuildUnifiedSpecialPointsInput = {
  utcDate: Date;
  latitude: number;
  longitude: number;
  ascendantLongitude: number;
  normalizedChart: NormalizedChart;
};

export type VertexCalculationResult =
  | {
      status: "calculated";
      longitude: number;
      method: "local-prime-vertical-ecliptic-intersection";
      validationReference: "swiss-ephemeris-2.10.03-independent-fixtures";
      validationToleranceDegrees: 0.02;
    }
  | {
      status: "unavailable";
      reason:
        | "invalid-input"
        | "unstable-equatorial-geometry"
        | "unstable-polar-geometry"
        | "non-finite-result";
    };

export function calculateVertexLongitude(input: {
  utcDate: Date;
  latitude: number;
  longitude: number;
}): VertexCalculationResult {
  const { utcDate, latitude, longitude } = input;

  if (
    !(utcDate instanceof Date) ||
    !Number.isFinite(utcDate.getTime()) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return {
      status: "unavailable",
      reason: "invalid-input",
    };
  }

  if (Math.abs(latitude) < 0.01) {
    return {
      status: "unavailable",
      reason: "unstable-equatorial-geometry",
    };
  }

  if (Math.abs(latitude) > 89.9) {
    return {
      status: "unavailable",
      reason: "unstable-polar-geometry",
    };
  }

  const astroTime = new Astronomy.AstroTime(utcDate);
  const siderealHours = Number(Astronomy.SiderealTime(astroTime));

  if (!Number.isFinite(siderealHours)) {
    return {
      status: "unavailable",
      reason: "non-finite-result",
    };
  }

  const ramcDegrees = normalizeLongitude(siderealHours * 15 + longitude);
  const theta = degreesToRadians(ramcDegrees);
  const epsilon = degreesToRadians(calculateMeanObliquityDegrees(utcDate));
  const phi = degreesToRadians(latitude);
  const cotangentLatitude = Math.cos(phi) / Math.sin(phi);

  const vertexRadians = Math.atan2(
    -Math.cos(theta),
    Math.sin(theta) * Math.cos(epsilon) -
      cotangentLatitude * Math.sin(epsilon),
  );

  const vertexLongitude = normalizeLongitude(
    radiansToDegrees(vertexRadians),
  );

  if (!Number.isFinite(vertexLongitude)) {
    return {
      status: "unavailable",
      reason: "non-finite-result",
    };
  }

  return {
    status: "calculated",
    longitude: vertexLongitude,
    method: "local-prime-vertical-ecliptic-intersection",
    validationReference: "swiss-ephemeris-2.10.03-independent-fixtures",
    validationToleranceDegrees: 0.02,
  };
}

export function buildUnifiedSpecialPoints(
  input: BuildUnifiedSpecialPointsInput,
): RealEngineReportSpecialPoint[] {
  const points: RealEngineReportSpecialPoint[] = [];

  points.push(buildFortunePoint(input));
  points.push(buildVertexPoint(input));

  const providerReadiness =
    evaluateAdvancedBodyProviderAvailability();
  const r9MainAsteroids =
    calculateR9ValidatedMainAsteroids({
      utcDate: input.utcDate,
    });
  const r19SecondaryBodies =
    calculateR19ValidatedSecondaryBodies({
      utcDate: input.utcDate,
    });
  const r9Points =
    r9MainAsteroids.status === "ready"
      ? new Map(
          r9MainAsteroids.points.map((point) => [point.id, point]),
        )
      : new Map();
  const r19Points =
    r19SecondaryBodies.status === "ready"
      ? new Map(
          r19SecondaryBodies.points.map((point) => [point.id, point]),
        )
      : new Map();

  for (const id of [
    "chiron",
    "ceres",
    "pallas",
    "juno",
    "vesta",
    "eris",
    "pholus",
    "nessus",
  ] as const) {
    const r9Point = r9Points.get(id);
    const r19Point = r19Points.get(id);

    if (r9Point && (id === "ceres" || id === "pallas" || id === "vesta")) {
      const meta = SPECIAL_POINT_META[id];
      points.push(
        normalizeCalculatedSpecialPoint({
          id,
          ...meta,
          longitude: r9Point.longitude,
          normalizedChart: input.normalizedChart,
          method: "jpl-naif-codes300ast-geocentric-apparent-ecliptic-of-date",
          source: "naif-jpl-codes-300ast-20100725",
          provenance: {
            provider: "JPL/NAIF SPICE",
            reference:
              "CODES 300-asteroid numerical integration, cross-checked against separate Horizons On-Line Ephemeris SPKs at 1940, 1997, and 2024 fixtures.",
            validation:
              "Ceres, Pallas, and Vesta remain within the R9 0.1 degree cross-ephemeris acceptance gate.",
          },
          validationStatus: "cross-ephemeris-reference-fixtures-passed",
          motion: r9Point.motion,
        }),
      );
      continue;
    }

    if (
      r19Point &&
      (id === "chiron" ||
        id === "juno" ||
        id === "eris" ||
        id === "pholus" ||
        id === "nessus")
    ) {
      const meta = SPECIAL_POINT_META[id];
      points.push(
        normalizeCalculatedSpecialPoint({
          id,
          ...meta,
          longitude: r19Point.longitude,
          normalizedChart: input.normalizedChart,
          method: "jpl-horizons-spk-geocentric-apparent-ecliptic-of-date",
          source:
            id === "juno"
              ? "naif-jpl-codes-300ast-20100725"
              : "nasa-jpl-horizons-dedicated-spk",
          provenance: {
            provider: "JPL/NAIF SPICE",
            reference:
              "Independent Swiss Ephemeris 2.10.03 QA-only tropical geocentric fixtures at 1940, 1997, and 2024.",
            validation:
              "The JPL/SPICE production longitude remains within the R19 0.1 degree independent-reference acceptance gate. Swiss Ephemeris is not a Halleus production runtime dependency.",
          },
          validationStatus: "independent-reference-fixtures-passed",
          motion: r19Point.motion,
        }),
      );
      continue;
    }

    points.push(
      buildDeferredProviderPoint(
        id,
        r19SecondaryBodies.status === "blocked" &&
          (id === "chiron" ||
            id === "juno" ||
            id === "eris" ||
            id === "pholus" ||
            id === "nessus")
          ? r19SecondaryBodies.reason
          : r9MainAsteroids.status === "blocked"
            ? r9MainAsteroids.reason
            : providerReadiness.status === "blocked"
              ? providerReadiness.reason
              : "invalid-provider-output",
      ),
    );
  }

  return UNIFIED_SPECIAL_POINT_IDS.map((id) => {
    const point = points.find((candidate) => candidate.id === id);
    if (!point) {
      throw new Error(`Unified special-point contract lost point: ${id}`);
    }
    return point;
  });
}

export function normalizeCalculatedSpecialPoint(input: {
  id: RealEngineReportCalculatedSpecialPoint["id"];
  labelFa: string;
  labelEn: string;
  category: RealEngineReportCalculatedSpecialPoint["category"];
  visibility: RealEngineReportCalculatedSpecialPoint["visibility"];
  longitude: number;
  normalizedChart: NormalizedChart;
  method: string;
  source: string;
  provenance: RealEngineReportCalculatedSpecialPoint["provenance"];
  validationStatus: RealEngineReportCalculatedSpecialPoint["validationStatus"];
  motion?: RealEngineReportCalculatedSpecialPoint["motion"];
  calculationContext?: RealEngineReportCalculatedSpecialPoint["calculationContext"];
}): RealEngineReportCalculatedSpecialPoint {
  const zodiac = getZodiacPosition(input.longitude);
  let house: RealEngineReportCalculatedSpecialPoint["house"] = null;

  if (
    input.normalizedChart.houseContext.housesReady &&
    input.normalizedChart.houses.length === 12
  ) {
    const normalized = normalizeChartPlacement(
      {
        id: input.id,
        label: input.labelEn,
        pointType: "calculated-point",
        longitude: input.longitude,
      },
      input.normalizedChart.houseContext.firstHouseCuspLongitude,
      input.normalizedChart.houseContext.appliedSystem,
      input.normalizedChart.houses,
    );

    house = normalized.house.house;
  }

  return {
    status: "calculated",
    id: input.id,
    labelFa: input.labelFa,
    labelEn: input.labelEn,
    category: input.category,
    visibility: input.visibility,
    longitude: zodiac.normalizedLongitude,
    signId: zodiac.sign.id,
    degreeInSign: zodiac.degreeInSign,
    house,
    method: input.method,
    source: input.source,
    reliability: "calculated",
    validationStatus: input.validationStatus,
    provenance: input.provenance,
    ...(input.motion ? { motion: input.motion } : {}),
    ...(input.calculationContext
      ? { calculationContext: input.calculationContext }
      : {}),
  };
}

function buildFortunePoint(
  input: BuildUnifiedSpecialPointsInput,
): RealEngineReportSpecialPoint {
  const meta = SPECIAL_POINT_META["part-of-fortune"];
  const sun = input.normalizedChart.placements.find(
    (placement) => placement.id === "sun",
  );
  const moon = input.normalizedChart.placements.find(
    (placement) => placement.id === "moon",
  );

  if (
    !sun ||
    !moon ||
    !input.normalizedChart.houseContext.housesReady ||
    input.normalizedChart.houses.length !== 12 ||
    !Number.isFinite(input.ascendantLongitude)
  ) {
    return buildDeferredLocalPoint(
      "part-of-fortune",
      "Fortune requires a valid Ascendant, Sun, Moon, and ready Placidus house context.",
      "geometry-blocked",
    );
  }

  const sect = DAY_HOUSES.has(sun.house.house) ? "day" : "night";
  const formulaId =
    sect === "day"
      ? "ascendant+moon-sun"
      : "ascendant+sun-moon";
  const longitude = calculatePartOfFortuneLongitude({
    ascendantLongitude: input.ascendantLongitude,
    sunLongitude: sun.normalizedLongitude,
    moonLongitude: moon.normalizedLongitude,
    sect,
  });

  return normalizeCalculatedSpecialPoint({
    id: "part-of-fortune",
    ...meta,
    longitude,
    normalizedChart: input.normalizedChart,
    method: "existing-halleus-fortune-sect-formula-v1",
    source: "halleus-existing-fortune-formula",
    provenance: {
      provider: "halleus-local",
      reference:
        "Preserved existing day/night Lot of Fortune formula; sign/house normalized by the canonical chart layer.",
      validation:
        "Existing Halleus Fortune calculation preserved and moved into the unified special-point contract.",
    },
    validationStatus: "existing-formula-preserved",
    calculationContext: {
      sect,
      formulaId,
    },
  });
}

function buildVertexPoint(
  input: BuildUnifiedSpecialPointsInput,
): RealEngineReportSpecialPoint {
  const meta = SPECIAL_POINT_META.vertex;
  const vertex = calculateVertexLongitude({
    utcDate: input.utcDate,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  if (vertex.status !== "calculated") {
    return buildDeferredLocalPoint(
      "vertex",
      `Vertex calculation unavailable: ${vertex.reason}`,
      vertex.reason === "invalid-input"
        ? "input-blocked"
        : "geometry-blocked",
    );
  }

  return normalizeCalculatedSpecialPoint({
    id: "vertex",
    ...meta,
    longitude: vertex.longitude,
    normalizedChart: input.normalizedChart,
    method: vertex.method,
    source: "halleus-local-vertex-geometry",
    provenance: {
      provider: "halleus-local",
      reference:
        "Prime-vertical/ecliptic intersection using Greenwich apparent sidereal time, birth longitude/latitude, and mean obliquity.",
      validation:
        "Independent Swiss Ephemeris 2.10.03 Vertex fixtures match the Halleus UTC/longitude/latitude geometry within the 0.02 degree acceptance gate.",
    },
    validationStatus: "independent-reference-fixtures-passed",
    calculationContext: {
      geometry: "prime-vertical-western-intersection",
    },
  });
}

function buildDeferredProviderPoint(
  id:
    | "chiron"
    | "ceres"
    | "pallas"
    | "juno"
    | "vesta"
    | "eris"
    | "pholus"
    | "nessus",
  reason: AdvancedBodyProviderBlockReason,
): RealEngineReportSpecialPoint {
  const meta = SPECIAL_POINT_META[id];

  return {
    status: "deferred",
    id,
    ...meta,
    method: null,
    source: "advanced-ephemeris-provider-contract",
    reliability: "not-calculated",
    validationStatus: "provider-blocked",
    provenance: {
      provider: "unresolved",
      reference:
        "JPL Horizons may be used for reference validation, but no approved offline production provider is active.",
      validation:
        "No approximate or invented longitude is permitted while the provider gate is blocked.",
    },
    limitation: `Advanced ephemeris provider blocked: ${reason}`,
  };
}

function buildDeferredLocalPoint(
  id: "part-of-fortune" | "vertex",
  limitation: string,
  validationStatus: "geometry-blocked" | "input-blocked",
): RealEngineReportSpecialPoint {
  const meta = SPECIAL_POINT_META[id];

  return {
    status: "deferred",
    id,
    ...meta,
    method: null,
    source: "halleus-local-special-point-contract",
    reliability: "not-calculated",
    validationStatus,
    provenance: {
      provider: "halleus-local",
      reference: null,
      validation: "Fail-closed local calculation boundary.",
    },
    limitation,
  };
}

function calculateMeanObliquityDegrees(utcDate: Date): number {
  const julianDay = utcDate.getTime() / 86400000 + 2440587.5;
  const centuries = (julianDay - 2451545.0) / 36525;
  const arcSeconds =
    84381.448 -
    46.815 * centuries -
    0.00059 * centuries * centuries +
    0.001813 * centuries * centuries * centuries;

  return arcSeconds / 3600;
}

function normalizeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
