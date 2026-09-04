import type {
  AstrologyReport,
  RealEngineReportAngles,
  RealEngineReportAspect,
  RealEngineReportHouse,
  RealEngineReportLilith,
  RealEngineReportPlacement,
} from "@/types/astro";

export const REPORT_BIRTH_CHART_WHEEL_DATA_VERSION =
  "v0.1.452-report-birth-chart-wheel-dark-lilith" as const;
// HALLEUS_REPORT_CHARTWHEEL_DARK_LILITH_20260830

export const REPORT_BIRTH_CHART_WHEEL_RETROGRADE_MARKER = -1 as const;
export const REPORT_BIRTH_CHART_WHEEL_MIN_ASPECT_LINES = 8 as const;
export const REPORT_BIRTH_CHART_WHEEL_MAX_ASPECT_LINES = 12 as const;
export const REPORT_BIRTH_CHART_WHEEL_EXTRA_ASPECT_LINES = 4 as const;

export const REPORT_BIRTH_CHART_WHEEL_CORE_PLANET_IDS = [
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

export const REPORT_BIRTH_CHART_WHEEL_OPTIONAL_POINT_IDS = [
  "lilith",
] as const;

export const REPORT_BIRTH_CHART_WHEEL_PLANET_IDS = [
  ...REPORT_BIRTH_CHART_WHEEL_CORE_PLANET_IDS,
  ...REPORT_BIRTH_CHART_WHEEL_OPTIONAL_POINT_IDS,
] as const;

export type ReportBirthChartWheelCorePlanetId =
  (typeof REPORT_BIRTH_CHART_WHEEL_CORE_PLANET_IDS)[number];

export type ReportBirthChartWheelPlanetId =
  (typeof REPORT_BIRTH_CHART_WHEEL_PLANET_IDS)[number];

export const REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES: Record<
  ReportBirthChartWheelCorePlanetId,
  | "Sun"
  | "Moon"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Uranus"
  | "Neptune"
  | "Pluto"
> = {
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

export type ReportBirthChartWheelAstroChartPlanetName =
  (typeof REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES)[ReportBirthChartWheelCorePlanetId];

export type ReportBirthChartWheelAstroChartPlanets = Record<
  ReportBirthChartWheelAstroChartPlanetName,
  [number] | [number, typeof REPORT_BIRTH_CHART_WHEEL_RETROGRADE_MARKER]
>;

export type ReportBirthChartWheelCorePlacement = Omit<
  RealEngineReportPlacement,
  "id"
> & {
  id: ReportBirthChartWheelCorePlanetId;
};

export type ReportBirthChartWheelPlacement = Omit<
  RealEngineReportPlacement,
  "id"
> & {
  id: ReportBirthChartWheelPlanetId;
};

export type ReportBirthChartWheelData = {
  planets: ReportBirthChartWheelAstroChartPlanets;
  placements: ReportBirthChartWheelPlacement[];
  cusps: number[];
  ascendantLongitude: number;
  houses: RealEngineReportHouse[];
  angles?: RealEngineReportAngles;
  aspects: RealEngineReportAspect[];
  retrogradePlanetIds: ReportBirthChartWheelCorePlanetId[];
  houseSystem?: string;
  houseAvailability?: "ready" | "unavailable";
  houseUnavailableReason?: "polar-circle" | "non-convergence" | null;
};

export type ReportBirthChartWheelResult =
  | {
      status: "ready" | "partial";
      data: ReportBirthChartWheelData;
    }
  | {
      status: "unavailable";
      reason: "missing-engine-data" | "incomplete-planet-data";
    };

const WHEEL_CORE_PLANET_ID_SET = new Set<string>(
  REPORT_BIRTH_CHART_WHEEL_CORE_PLANET_IDS,
);

export function buildReportBirthChartWheelData(
  report: AstrologyReport,
): ReportBirthChartWheelResult {
  const snapshot = report.realEngine;

  if (!snapshot) {
    return { status: "unavailable", reason: "missing-engine-data" };
  }

  const corePlacements = REPORT_BIRTH_CHART_WHEEL_CORE_PLANET_IDS
    .map((planetId) => findWheelPlacement(snapshot.placements, planetId))
    .filter(
      (
        placement,
      ): placement is ReportBirthChartWheelCorePlacement => placement !== null,
    );

  if (corePlacements.length !== REPORT_BIRTH_CHART_WHEEL_CORE_PLANET_IDS.length) {
    return { status: "unavailable", reason: "incomplete-planet-data" };
  }

  const lilithPlacement = buildWheelLilithPlacement(snapshot.lilith);
  const placements: ReportBirthChartWheelPlacement[] = lilithPlacement
    ? [...corePlacements, lilithPlacement]
    : corePlacements;

  const houses = getCompleteWheelHouses(
    snapshot.houses,
    snapshot.houseContext?.availability,
  );
  const aspects = selectStoredWheelAspects(
    snapshot.aspectHighlights,
    snapshot.aspects,
  );
  const retrogradePlanetIds =
    snapshot.retrogrades?.status === "calculated"
      ? snapshot.retrogrades.planetIds.filter(
          (planetId): planetId is ReportBirthChartWheelCorePlanetId =>
            WHEEL_CORE_PLANET_ID_SET.has(planetId),
        )
      : [];

  const data: ReportBirthChartWheelData = {
    planets: Object.fromEntries(
      corePlacements.map((placement) => {
        const longitude = placement.longitude;
        const rendererValue = retrogradePlanetIds.includes(placement.id)
          ? [longitude, REPORT_BIRTH_CHART_WHEEL_RETROGRADE_MARKER]
          : [longitude];

        return [
          REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES[placement.id],
          rendererValue,
        ];
      }),
    ) as ReportBirthChartWheelAstroChartPlanets,
    placements,
    cusps: houses.map((house) => house.cuspLongitude),
    ascendantLongitude: snapshot.ascendantLongitude,
    houses,
    angles: snapshot.angles,
    aspects,
    retrogradePlanetIds,
    houseSystem: snapshot.houseSystem,
    houseAvailability: snapshot.houseContext?.availability,
    houseUnavailableReason: snapshot.houseContext?.unavailableReason,
  };

  return {
    status: houses.length === 12 ? "ready" : "partial",
    data,
  };
}

export function selectStoredWheelAspects(
  highlights: RealEngineReportAspect[] | undefined,
  inventory: RealEngineReportAspect[] | undefined,
): RealEngineReportAspect[] {
  const selectedHighlights = uniqueWheelAspects(
    (highlights ?? []).filter(isDrawableStoredWheelAspect),
  );
  const selectedKeys = new Set(selectedHighlights.map(getWheelAspectKey));
  const additionalAspects = uniqueWheelAspects(
    (inventory ?? []).filter(isDrawableStoredWheelAspect),
  )
    .filter((aspect) => !selectedKeys.has(getWheelAspectKey(aspect)))
    .sort(
      (first, second) =>
        first.orb - second.orb ||
        getWheelAspectKey(first).localeCompare(getWheelAspectKey(second)),
    );
  const adaptiveLimit = Math.min(
    REPORT_BIRTH_CHART_WHEEL_MAX_ASPECT_LINES,
    Math.max(
      REPORT_BIRTH_CHART_WHEEL_MIN_ASPECT_LINES,
      selectedHighlights.length + REPORT_BIRTH_CHART_WHEEL_EXTRA_ASPECT_LINES,
    ),
  );

  return [...selectedHighlights, ...additionalAspects].slice(0, adaptiveLimit);
}

function isDrawableStoredWheelAspect(
  aspect: RealEngineReportAspect,
): boolean {
  return (
    WHEEL_CORE_PLANET_ID_SET.has(aspect.firstPlanetId) &&
    WHEEL_CORE_PLANET_ID_SET.has(aspect.secondPlanetId) &&
    Number.isFinite(aspect.angle) &&
    Number.isFinite(aspect.orb)
  );
}

function uniqueWheelAspects(
  aspects: RealEngineReportAspect[],
): RealEngineReportAspect[] {
  const seen = new Set<string>();

  return aspects.filter((aspect) => {
    const key = getWheelAspectKey(aspect);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getWheelAspectKey(aspect: RealEngineReportAspect): string {
  const participants = [aspect.firstPlanetId, aspect.secondPlanetId].sort();
  return `${participants[0]}:${aspect.aspectId}:${participants[1]}`;
}

function findWheelPlacement(
  placements: RealEngineReportPlacement[],
  planetId: ReportBirthChartWheelCorePlanetId,
): ReportBirthChartWheelCorePlacement | null {
  const placement = placements.find(
    (candidate) =>
      candidate.id === planetId && Number.isFinite(candidate.longitude),
  );

  return placement ? { ...placement, id: planetId } : null;
}

function buildWheelLilithPlacement(
  lilith: RealEngineReportLilith | undefined,
): ReportBirthChartWheelPlacement | null {
  if (!lilith || !("approvedForReportOutput" in lilith)) {
    return null;
  }

  if (
    lilith.status !== "calculated" ||
    lilith.approvedForReportOutput !== true ||
    !Number.isFinite(lilith.longitude)
  ) {
    return null;
  }

  return {
    id: "lilith",
    label: lilith.label,
    pointType: "calculated-point",
    longitude: lilith.longitude,
    signId: lilith.signId,
    degreeInSign: lilith.degreeInSign,
    house: lilith.house ?? null,
    method: lilith.method,
  };
}

function getCompleteWheelHouses(
  houses: RealEngineReportHouse[] | undefined,
  availability: "ready" | "unavailable" | undefined,
): RealEngineReportHouse[] {
  if (
    availability === "unavailable" ||
    !Array.isArray(houses) ||
    houses.length !== 12
  ) {
    return [];
  }

  const houseNumbers = new Set(houses.map((house) => house.number));
  const allCuspsAreStored = houses.every(
    (house) =>
      Number.isInteger(house.number) &&
      house.number >= 1 &&
      house.number <= 12 &&
      Number.isFinite(house.cuspLongitude),
  );

  return houseNumbers.size === 12 && allCuspsAreStored ? [...houses] : [];
}
