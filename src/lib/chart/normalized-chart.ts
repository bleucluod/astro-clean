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
  assignHouseToCusps,
  assignHouseToLongitude,
  buildEqualHouseCusps,
  buildPlacidusHouses,
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

export const NORMALIZED_CHART_VERSION = "0.1.284a" as const;

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

export type NormalizedAscendantMethod =
  | "astronomy-engine-local-sidereal-time"
  | "provided"
  | "unknown";

export type NormalizedHouseConfidence =
  | "calculated-ascendant"
  | "provided-ascendant"
  | "provided-cusps"
  | "scaffold"
  | "placeholder";

export type NormalizedHouseInput = {
  system?: HouseSystemId | null;
  ascendantLongitude?: number | null;
  firstHouseCuspLongitude?: number | null;
  cuspLongitudes?: readonly number[] | null;
  ascendantMethod?: NormalizedAscendantMethod | null;
};

export type NormalizedHouseContext = {
  requestedSystem: HouseSystemId;
  appliedSystem: HouseSystemId;
  housesReady: boolean;
  ascendantLongitude: number | null;
  firstHouseCuspLongitude: number;
  cuspLongitudes: number[] | null;
  ascendantMethod: NormalizedAscendantMethod;
  confidence: NormalizedHouseConfidence;
  readinessNote: string;
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
  houseConfidence: NormalizedHouseConfidence;
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
    houses,
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
  houses?: readonly ChartHouse[],
): NormalizedChartPlacement {
  const normalizedLongitude = normalizeEclipticLongitude(placement.longitude);
  const house =
    houseSystem === "placidus"
      ? assignHouseToCusps(normalizedLongitude, houses ?? [], houseSystem)
      : assignHouseToLongitude(
          normalizedLongitude,
          firstHouseCuspLongitude,
          houseSystem,
        );

  return {
    id: placement.id,
    label: placement.label ?? placement.id,
    pointType: placement.pointType ?? "unknown",
    longitude: placement.longitude,
    normalizedLongitude,
    zodiac: getZodiacPosition(normalizedLongitude),
    house,
  };
}

export function normalizeChartPlacements(
  placements: NormalizedChartPointInput[],
  firstHouseCuspLongitude: number,
  houseSystem: HouseSystemId,
  houses?: readonly ChartHouse[],
): NormalizedChartPlacement[] {
  return placements.map((placement) =>
    normalizeChartPlacement(
      placement,
      firstHouseCuspLongitude,
      houseSystem,
      houses,
    ),
  );
}

export function normalizeHouseContext(
  input?: NormalizedHouseInput,
): NormalizedHouseContext {
  const requestedSystem = input?.system ?? "placeholder";

  if (
    requestedSystem === "placidus" &&
    Array.isArray(input?.cuspLongitudes) &&
    input.cuspLongitudes.length === 12 &&
    input.cuspLongitudes.every((cuspLongitude) => Number.isFinite(cuspLongitude))
  ) {
    const houses = buildPlacidusHouses(input.cuspLongitudes);
    const cuspLongitudes = houses.map((house) => house.cuspLongitude);
    const ascendantLongitudeInput = input.ascendantLongitude;
    const hasAscendantLongitude =
      typeof ascendantLongitudeInput === "number" &&
      Number.isFinite(ascendantLongitudeInput);
    const ascendantLongitude = hasAscendantLongitude
      ? normalizeEclipticLongitude(ascendantLongitudeInput)
      : cuspLongitudes[0];
    const ascendantMethod = normalizeHouseAscendantMethod(
      input.ascendantMethod,
      true,
    );

    return {
      requestedSystem,
      appliedSystem: "placidus",
      housesReady: true,
      ascendantLongitude,
      firstHouseCuspLongitude: cuspLongitudes[0],
      cuspLongitudes,
      ascendantMethod,
      confidence: "provided-cusps",
      readinessNote: buildHouseReadinessNote("placidus", "provided-cusps"),
      limitation:
        "Placidus cusps are supplied reference data; production cusp calculation is not active yet.",
    };
  }

  if (
    requestedSystem === "whole-sign" &&
    typeof input?.ascendantLongitude === "number" &&
    Number.isFinite(input.ascendantLongitude)
  ) {
    const ascendantLongitude = normalizeEclipticLongitude(input.ascendantLongitude);
    const ascendantMethod = normalizeHouseAscendantMethod(input.ascendantMethod, true);
    const confidence = getHouseConfidence(requestedSystem, ascendantMethod);

    return {
      requestedSystem,
      appliedSystem: "whole-sign",
      housesReady: true,
      ascendantLongitude,
      firstHouseCuspLongitude: getWholeSignFirstHouseCusp(ascendantLongitude),
      cuspLongitudes: null,
      ascendantMethod,
      confidence,
      readinessNote: buildHouseReadinessNote("whole-sign", confidence),
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
    const ascendantLongitudeInput = input?.ascendantLongitude;
    const hasAscendantLongitude =
      typeof ascendantLongitudeInput === "number" &&
      Number.isFinite(ascendantLongitudeInput);
    const ascendantMethod = normalizeHouseAscendantMethod(
      input?.ascendantMethod,
      hasAscendantLongitude,
    );
    const confidence = getHouseConfidence(requestedSystem, ascendantMethod);

    return {
      requestedSystem,
      appliedSystem: "equal-house",
      housesReady: true,
      ascendantLongitude: hasAscendantLongitude
        ? normalizeEclipticLongitude(ascendantLongitudeInput)
        : null,
      firstHouseCuspLongitude,
      cuspLongitudes: null,
      ascendantMethod,
      confidence,
      readinessNote: buildHouseReadinessNote("equal-house", confidence),
      limitation: buildEqualHouseLimitation(ascendantMethod),
    };
  }

  return {
    requestedSystem,
    appliedSystem: "placeholder",
    housesReady: false,
    ascendantLongitude: null,
    firstHouseCuspLongitude: 0,
    cuspLongitudes: null,
    ascendantMethod: "unknown",
    confidence: "placeholder",
    readinessNote:
      "Placeholder houses are applied only until birth place and house calculation are production-ready.",
    limitation:
      requestedSystem === "placidus"
        ? "Placidus requires exactly twelve finite, cyclically ordered cusp longitudes."
        : "House context is not production-ready yet. Placeholder houses are applied until birth place and house calculation are finalized.",
  };
}

function normalizeHouseAscendantMethod(
  method: NormalizedAscendantMethod | null | undefined,
  hasAscendantLongitude: boolean,
): NormalizedAscendantMethod {
  if (method === "astronomy-engine-local-sidereal-time") {
    return method;
  }

  return hasAscendantLongitude ? "provided" : "unknown";
}

function getHouseConfidence(
  system: HouseSystemId,
  ascendantMethod: NormalizedAscendantMethod,
): NormalizedHouseConfidence {
  if (system === "placeholder") {
    return "placeholder";
  }

  if (system === "whole-sign") {
    return ascendantMethod === "astronomy-engine-local-sidereal-time"
      ? "calculated-ascendant"
      : "provided-ascendant";
  }

  if (system === "placidus") {
    return "provided-cusps";
  }

  return ascendantMethod === "astronomy-engine-local-sidereal-time"
    ? "calculated-ascendant"
    : "scaffold";
}

function buildEqualHouseLimitation(
  ascendantMethod: NormalizedAscendantMethod,
): string {
  if (ascendantMethod === "astronomy-engine-local-sidereal-time") {
    return "Equal-house houses are derived from the calculated Ascendant longitude; keep house placement partial until dedicated house-system hardening is complete.";
  }

  return "Equal-house houses are calculated from the current ascendant scaffold; treat house placement as approximate until house-system hardening is complete.";
}

function buildHouseReadinessNote(
  system: HouseSystemId,
  confidence: NormalizedHouseConfidence,
): string {
  if (system === "whole-sign" && confidence === "calculated-ascendant") {
    return "Whole-sign houses are anchored to a calculated Ascendant sign.";
  }

  if (system === "whole-sign") {
    return "Whole-sign houses are anchored to a supplied Ascendant sign.";
  }

  if (system === "placidus") {
    return "Placidus houses use supplied validation cusps; the production cusp calculator remains gated.";
  }

  if (system === "equal-house" && confidence === "calculated-ascendant") {
    return "Equal-house houses are anchored to the calculated Ascendant longitude, but remain partial until house-system hardening.";
  }

  if (system === "equal-house") {
    return "Equal-house houses are scaffolded from a supplied first-house cusp and remain partial.";
  }

  return "Placeholder houses are not report-ready.";
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

  if (
    houseContext.appliedSystem === "placidus" &&
    houseContext.cuspLongitudes
  ) {
    return buildPlacidusHouses(houseContext.cuspLongitudes);
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
    houseConfidence: houseContext.confidence,
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
  if (
    chart.quality.hasTimezone &&
    chart.quality.hasReadyHouses &&
    chart.quality.limitations.length === 0
  ) {
    return "ready-for-report-enrichment";
  }

  if (chart.placements.length > 0) {
    return "partial-chart-ready";
  }

  return "not-ready";
}
