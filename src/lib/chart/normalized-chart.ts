import {
  type ChartTimeContext,
  type ChartTimeInput,
  buildChartTimeContext,
} from "./timezone-readiness";
import {
  type ZodiacPosition,
  getZodiacPosition,
  normalizeEclipticLongitude,
} from "./zodiac";
import {
  type ChartHouse,
  type HouseAssignment,
  type HouseSystemId,
  assignHouseToLongitude,
  buildEqualHouseCusps,
  buildPlaceholderHouses,
  buildWholeSignHouses,
  getWholeSignFirstHouseCusp,
} from "./houses";
import {
  type AspectPlacement,
  type CalculatedAspect,
  calculateMajorAspects,
  sortAspectsByOrb,
} from "./aspects";

export const NORMALIZED_CHART_VERSION = "0.1.46" as const;

export type NormalizedChartSource =
  | "astronomy-engine-prototype"
  | "fixture"
  | "manual"
  | "unknown";

export type NormalizedChartPointType =
  | "luminary"
  | "personal-planet"
  | "social-planet"
  | "outer-planet"
  | "angle"
  | "calculated-point"
  | "unknown";

export type NormalizedChartPointInput = AspectPlacement & {
  label?: string;
  pointType?: NormalizedChartPointType;
};

export type NormalizedHouseInput = {
  system?: HouseSystemId | null;
  ascendantLongitude?: number | null;
  firstHouseCuspLongitude?: number | null;
};

export type NormalizedHouseContext = {
  requestedSystem: HouseSystemId;
  appliedSystem: HouseSystemId;
  housesReady: boolean;
  ascendantLongitude: number | null;
  firstHouseCuspLongitude: number;
  limitation: string | null;
};

export type NormalizedChartPlacement = {
  id: string;
  label: string;
  pointType: NormalizedChartPointType;
  longitude: number;
  normalizedLongitude: number;
  zodiac: ZodiacPosition;
  house: HouseAssignment;
};

export type NormalizedChartQuality = {
  placementCount: number;
  aspectCount: number;
  hasTimezone: boolean;
  hasReadyHouses: boolean;
  limitations: string[];
};

export type NormalizedChart = {
  version: typeof NORMALIZED_CHART_VERSION;
  source: NormalizedChartSource;
  time: ChartTimeContext;
  houseContext: NormalizedHouseContext;
  houses: ChartHouse[];
  placements: NormalizedChartPlacement[];
  aspects: CalculatedAspect[];
  quality: NormalizedChartQuality;
};

export type BuildNormalizedChartInput = {
  source?: NormalizedChartSource;
  time: ChartTimeInput;
  fallbackTimezone?: string;
  house?: NormalizedHouseInput;
  placements: NormalizedChartPointInput[];
  aspectOrbScale?: number;
};

export function buildNormalizedChart(
  input: BuildNormalizedChartInput,
): NormalizedChart {
  const time = buildChartTimeContext(input.time, input.fallbackTimezone);
  const houseContext = normalizeHouseContext(input.house);
  const houses = buildHousesForContext(houseContext);
  const placements = normalizeChartPlacements(
    input.placements,
    houseContext.firstHouseCuspLongitude,
    houseContext.appliedSystem,
  );
  const aspects = sortAspectsByOrb(
    calculateMajorAspects(toAspectPlacements(placements), input.aspectOrbScale ?? 1),
  );

  return {
    version: NORMALIZED_CHART_VERSION,
    source: input.source ?? "unknown",
    time,
    houseContext,
    houses,
    placements,
    aspects,
    quality: buildNormalizedChartQuality(time, houseContext, placements, aspects),
  };
}

export function normalizeChartPlacement(
  placement: NormalizedChartPointInput,
  firstHouseCuspLongitude: number,
  houseSystem: HouseSystemId,
): NormalizedChartPlacement {
  const normalizedLongitude = normalizeEclipticLongitude(placement.longitude);

  return {
    id: placement.id,
    label: placement.label ?? placement.id,
    pointType: placement.pointType ?? "unknown",
    longitude: placement.longitude,
    normalizedLongitude,
    zodiac: getZodiacPosition(normalizedLongitude),
    house: assignHouseToLongitude(
      normalizedLongitude,
      firstHouseCuspLongitude,
      houseSystem,
    ),
  };
}

export function normalizeChartPlacements(
  placements: NormalizedChartPointInput[],
  firstHouseCuspLongitude: number,
  houseSystem: HouseSystemId,
): NormalizedChartPlacement[] {
  return placements.map((placement) =>
    normalizeChartPlacement(placement, firstHouseCuspLongitude, houseSystem),
  );
}

export function normalizeHouseContext(
  input?: NormalizedHouseInput,
): NormalizedHouseContext {
  const requestedSystem = input?.system ?? "placeholder";

  if (
    requestedSystem === "whole-sign" &&
    typeof input?.ascendantLongitude === "number" &&
    Number.isFinite(input.ascendantLongitude)
  ) {
    const ascendantLongitude = normalizeEclipticLongitude(input.ascendantLongitude);

    return {
      requestedSystem,
      appliedSystem: "whole-sign",
      housesReady: true,
      ascendantLongitude,
      firstHouseCuspLongitude: getWholeSignFirstHouseCusp(ascendantLongitude),
      limitation: null,
    };
  }

  if (
    requestedSystem === "equal-house" &&
    typeof input?.firstHouseCuspLongitude === "number" &&
    Number.isFinite(input.firstHouseCuspLongitude)
  ) {
    const firstHouseCuspLongitude = normalizeEclipticLongitude(
      input.firstHouseCuspLongitude,
    );

    return {
      requestedSystem,
      appliedSystem: "equal-house",
      housesReady: true,
      ascendantLongitude:
        typeof input.ascendantLongitude === "number" &&
        Number.isFinite(input.ascendantLongitude)
          ? normalizeEclipticLongitude(input.ascendantLongitude)
          : null,
      firstHouseCuspLongitude,
      limitation: null,
    };
  }

  return {
    requestedSystem,
    appliedSystem: "placeholder",
    housesReady: false,
    ascendantLongitude: null,
    firstHouseCuspLongitude: 0,
    limitation:
      "House context is not production-ready yet. Placeholder houses are applied until birth place and house calculation are finalized.",
  };
}

export function buildHousesForContext(
  houseContext: NormalizedHouseContext,
): ChartHouse[] {
  if (houseContext.appliedSystem === "whole-sign") {
    return buildWholeSignHouses(houseContext.ascendantLongitude ?? 0);
  }

  if (houseContext.appliedSystem === "equal-house") {
    return buildEqualHouseCusps(houseContext.firstHouseCuspLongitude);
  }

  return buildPlaceholderHouses();
}

export function buildNormalizedChartQuality(
  time: ChartTimeContext,
  houseContext: NormalizedHouseContext,
  placements: NormalizedChartPlacement[],
  aspects: CalculatedAspect[],
): NormalizedChartQuality {
  const limitations = [
    time.warning,
    houseContext.limitation,
    placements.length === 0 ? "No placements were supplied." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    placementCount: placements.length,
    aspectCount: aspects.length,
    hasTimezone: time.readiness === "ready",
    hasReadyHouses: houseContext.housesReady,
    limitations,
  };
}

export function toAspectPlacements(
  placements: NormalizedChartPlacement[],
): AspectPlacement[] {
  return placements.map((placement) => ({
    id: placement.id,
    label: placement.label,
    longitude: placement.normalizedLongitude,
  }));
}

export function getNormalizedPlacementById(
  chart: NormalizedChart,
  placementId: string,
): NormalizedChartPlacement | null {
  return chart.placements.find((placement) => placement.id === placementId) ?? null;
}

export function getChartReadinessLabel(chart: NormalizedChart): string {
  if (chart.quality.hasTimezone && chart.quality.hasReadyHouses) {
    return "ready-for-report-enrichment";
  }

  if (chart.placements.length > 0) {
    return "partial-chart-ready";
  }

  return "not-ready";
}
