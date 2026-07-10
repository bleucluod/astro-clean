import type {
  RealEngineReportAspect,
  RealEngineReportAspectKind,
  RealEngineReportPlacement,
} from "@/types/astro";

export const REPORT_ASPECT_HIGHLIGHT_LIMIT = 6 as const;
export const VERY_TIGHT_ASPECT_ORB = 1.5 as const;

const ASPECT_ORB_LIMITS: Record<RealEngineReportAspectKind, number> = {
  conjunction: 8,
  sextile: 5,
  square: 6,
  trine: 6,
  opposition: 8,
};

const CORE_PLANET_IDS = new Set(["sun", "moon"]);
const PERSONAL_PLANET_IDS = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const OUTER_PLANET_IDS = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto"]);

export type RealEngineAspectSelectionContext = {
  chartRulerId: string;
  activeHouseNumbers: number[];
  placements: Array<Pick<RealEngineReportPlacement, "id" | "house">>;
};

export function mergeRealEngineAspectInventory(
  calculatedAspects: RealEngineReportAspect[],
  storedAspects: RealEngineReportAspect[] = [],
): RealEngineReportAspect[] {
  const inventory = new Map<string, RealEngineReportAspect>();

  for (const aspect of [...storedAspects, ...calculatedAspects]) {
    const key = getCanonicalAspectKey(aspect);
    const current = inventory.get(key);

    if (!current || aspect.orb <= current.orb) {
      inventory.set(key, aspect);
    }
  }

  return sortRealEngineAspectInventory(Array.from(inventory.values()));
}

export function sortRealEngineAspectInventory(
  aspects: RealEngineReportAspect[],
): RealEngineReportAspect[] {
  return [...aspects].sort((first, second) =>
    first.orb - second.orb ||
    getCanonicalAspectKey(first).localeCompare(getCanonicalAspectKey(second)),
  );
}

export function rankRealEngineAspects(
  aspects: RealEngineReportAspect[],
  context: RealEngineAspectSelectionContext,
): RealEngineReportAspect[] {
  return mergeRealEngineAspectInventory(aspects).sort((first, second) => {
    const firstScore = scoreRealEngineAspect(first, context);
    const secondScore = scoreRealEngineAspect(second, context);

    return (
      secondScore - firstScore ||
      first.orb - second.orb ||
      getCanonicalAspectKey(first).localeCompare(getCanonicalAspectKey(second))
    );
  });
}

export function selectNarrativeAspectHighlights(
  aspects: RealEngineReportAspect[],
  context: RealEngineAspectSelectionContext,
  limit = REPORT_ASPECT_HIGHLIGHT_LIMIT,
): RealEngineReportAspect[] {
  const safeLimit = Math.max(0, Math.trunc(limit));

  if (safeLimit === 0) {
    return [];
  }

  const ranked = rankRealEngineAspects(aspects, context);
  const selected: RealEngineReportAspect[] = [];
  const selectedKeys = new Set<string>();
  const participantCounts = new Map<string, number>();

  const addAspect = (aspect: RealEngineReportAspect | undefined) => {
    if (!aspect || selected.length >= safeLimit) {
      return;
    }

    const key = getCanonicalAspectKey(aspect);
    if (selectedKeys.has(key)) {
      return;
    }

    selected.push(aspect);
    selectedKeys.add(key);

    for (const participant of getAspectParticipants(aspect)) {
      participantCounts.set(participant, (participantCounts.get(participant) ?? 0) + 1);
    }
  };

  const veryTight = ranked
    .filter((aspect) => aspect.orb <= VERY_TIGHT_ASPECT_ORB)
    .sort((first, second) =>
      first.orb - second.orb ||
      scoreRealEngineAspect(second, context) - scoreRealEngineAspect(first, context),
    );

  for (const aspect of veryTight) {
    addAspect(aspect);
  }

  const anchors = [
    ranked.find((aspect) => aspectHasParticipant(aspect, context.chartRulerId)),
    ranked.find((aspect) => getAspectParticipants(aspect).some((id) => CORE_PLANET_IDS.has(id))),
    ranked.find((aspect) => isDynamicAspect(aspect)),
    ranked.find((aspect) => isHarmoniousAspect(aspect)),
  ];

  for (const aspect of anchors) {
    addAspect(aspect);
  }

  while (selected.length < safeLimit) {
    const candidate = ranked
      .filter((aspect) => !selectedKeys.has(getCanonicalAspectKey(aspect)))
      .sort((first, second) => {
        const firstScore = getDiversityAdjustedScore(first, context, participantCounts);
        const secondScore = getDiversityAdjustedScore(second, context, participantCounts);

        return (
          secondScore - firstScore ||
          first.orb - second.orb ||
          getCanonicalAspectKey(first).localeCompare(getCanonicalAspectKey(second))
        );
      })[0];

    if (!candidate) {
      break;
    }

    addAspect(candidate);
  }

  return selected;
}

export function scoreRealEngineAspect(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
): number {
  const participants = getAspectParticipants(aspect);
  const placementHouseById = new Map(
    context.placements.map((placement) => [placement.id, placement.house ?? null]),
  );
  const activeHouseNumbers = new Set(context.activeHouseNumbers);
  const allowedOrb = ASPECT_ORB_LIMITS[aspect.aspectId] ?? 8;
  const closenessRatio = Math.max(0, 1 - aspect.orb / allowedOrb);
  const coreCount = participants.filter((id) => CORE_PLANET_IDS.has(id)).length;
  const personalCount = participants.filter((id) => PERSONAL_PLANET_IDS.has(id)).length;
  const activeHouseHits = participants.filter((id) => {
    const house = placementHouseById.get(id);
    return typeof house === "number" && activeHouseNumbers.has(house);
  }).length;
  const outerOnly = participants.every((id) => OUTER_PLANET_IDS.has(id));

  return [
    closenessRatio * 70,
    aspect.orb <= VERY_TIGHT_ASPECT_ORB ? 22 : aspect.orb <= 2.5 ? 10 : 0,
    coreCount * 28,
    participants.includes(context.chartRulerId) ? 34 : 0,
    personalCount * 11,
    isDynamicAspect(aspect) ? 16 : 0,
    aspect.aspectId === "conjunction" ? 8 : 0,
    activeHouseHits * 7,
    outerOnly && !isDynamicAspect(aspect) ? -18 : 0,
  ].reduce((total, value) => total + value, 0);
}

export function getCanonicalAspectKey(aspect: RealEngineReportAspect): string {
  const participants = getAspectParticipants(aspect).sort();
  return `${participants[0]}:${aspect.aspectId}:${participants[1]}`;
}

function getDiversityAdjustedScore(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
  participantCounts: Map<string, number>,
): number {
  const counts = getAspectParticipants(aspect).map((id) => participantCounts.get(id) ?? 0);
  const saturationPenalty = Math.max(...counts) * 13 + (counts.every((count) => count > 0) ? 8 : 0);

  return scoreRealEngineAspect(aspect, context) - saturationPenalty;
}

function getAspectParticipants(aspect: RealEngineReportAspect): string[] {
  return [aspect.firstPlanetId, aspect.secondPlanetId];
}

function aspectHasParticipant(aspect: RealEngineReportAspect, planetId: string): boolean {
  return aspect.firstPlanetId === planetId || aspect.secondPlanetId === planetId;
}

function isDynamicAspect(aspect: RealEngineReportAspect): boolean {
  return aspect.aspectId === "square" || aspect.aspectId === "opposition";
}

function isHarmoniousAspect(aspect: RealEngineReportAspect): boolean {
  return aspect.aspectId === "sextile" || aspect.aspectId === "trine";
}
