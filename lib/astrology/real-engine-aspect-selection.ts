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
const SOCIAL_OUTER_PLANET_IDS = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto"]);
const ANGULAR_HOUSE_NUMBERS = new Set([1, 4, 7, 10]);

export type RealEngineAspectSelectionContext = {
  chartRulerId: string;
  activeHouseNumbers: number[];
  placements: Array<Pick<RealEngineReportPlacement, "id" | "house">>;
  retrogradePlanetIds?: string[];
};

export type RealEngineNarrativeAspectSelectionOptions = {
  limit?: number;
  primaryAspect?: RealEngineReportAspect;
  forceDynamicAnchor?: boolean;
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

export function selectPrimaryDynamicAnchor(
  aspects: RealEngineReportAspect[],
  context: RealEngineAspectSelectionContext,
): RealEngineReportAspect | undefined {
  return mergeRealEngineAspectInventory(aspects)
    .filter((aspect) => isDynamicAspect(aspect))
    .sort((first, second) =>
      scorePrimaryDynamicAnchor(second, context) -
        scorePrimaryDynamicAnchor(first, context) ||
      first.orb - second.orb ||
      getCanonicalAspectKey(first).localeCompare(
        getCanonicalAspectKey(second),
      ),
    )[0];
}

export function selectNarrativeAspectHighlights(
  aspects: RealEngineReportAspect[],
  context: RealEngineAspectSelectionContext,
  limitOrOptions: number | RealEngineNarrativeAspectSelectionOptions =
    REPORT_ASPECT_HIGHLIGHT_LIMIT,
): RealEngineReportAspect[] {
  const options: RealEngineNarrativeAspectSelectionOptions =
    typeof limitOrOptions === "number"
      ? { limit: limitOrOptions }
      : limitOrOptions;
  const safeLimit = Math.max(
    0,
    Math.trunc(options.limit ?? REPORT_ASPECT_HIGHLIGHT_LIMIT),
  );

  if (safeLimit === 0) {
    return [];
  }

  const ranked = rankRealEngineAspects(aspects, context);
  const selected: RealEngineReportAspect[] = [];
  const selectedKeys = new Set<string>();
  const participantCounts = new Map<string, number>();
  const selectedKinds = new Set<RealEngineReportAspectKind>();

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
    selectedKinds.add(aspect.aspectId);

    for (const participant of getAspectParticipants(aspect)) {
      participantCounts.set(participant, (participantCounts.get(participant) ?? 0) + 1);
    }
  };

  const pickCandidate = (
    predicates: Array<(aspect: RealEngineReportAspect) => boolean>,
    diversityAware = false,
  ): RealEngineReportAspect | undefined => {
    for (const predicate of predicates) {
      const candidates = ranked.filter(
        (aspect) =>
          !selectedKeys.has(getCanonicalAspectKey(aspect)) &&
          predicate(aspect),
      );

      if (candidates.length === 0) {
        continue;
      }

      return candidates.sort((first, second) => {
        const firstScore = diversityAware
          ? getDiversityAdjustedScore(
              first,
              context,
              participantCounts,
              selectedKinds,
              selected,
            )
          : scoreRealEngineAspect(first, context);
        const secondScore = diversityAware
          ? getDiversityAdjustedScore(
              second,
              context,
              participantCounts,
              selectedKinds,
              selected,
            )
          : scoreRealEngineAspect(second, context);

        return (
          secondScore - firstScore ||
          first.orb - second.orb ||
          getCanonicalAspectKey(first).localeCompare(getCanonicalAspectKey(second))
        );
      })[0];
    }

    return undefined;
  };

  const isRelevant = (aspect: RealEngineReportAspect) =>
    aspectHasParticipant(aspect, context.chartRulerId) ||
    hasCoreParticipant(aspect) ||
    hasPersonalParticipant(aspect) ||
    getActiveHouseHitCount(aspect, context) > 0 ||
    hasRetrogradePersonalParticipant(aspect, context);

  addAspect(
    pickCandidate([
      (aspect) => aspectHasParticipant(aspect, context.chartRulerId),
    ]),
  );
  addAspect(
    pickCandidate(
      [(aspect) => hasCoreParticipant(aspect)],
      true,
    ),
  );
  addAspect(
    pickCandidate(
      [
        (aspect) =>
          isDynamicAspect(aspect) &&
          !hasCoreParticipant(aspect) &&
          isRelevant(aspect),
        (aspect) => isDynamicAspect(aspect) && isRelevant(aspect),
      ],
      true,
    ),
  );
  addAspect(
    pickCandidate(
      [
        (aspect) =>
          aspect.aspectId === "conjunction" &&
          hasPersonalParticipant(aspect) &&
          !hasCoreParticipant(aspect) &&
          isRelevant(aspect),
        (aspect) =>
          aspect.aspectId === "conjunction" &&
          hasPersonalParticipant(aspect) &&
          isRelevant(aspect),
      ],
      true,
    ),
  );
  addAspect(
    pickCandidate(
      [
        (aspect) =>
          isHarmoniousAspect(aspect) &&
          hasPersonalParticipant(aspect) &&
          !hasCoreParticipant(aspect) &&
          isRelevant(aspect),
        (aspect) => isHarmoniousAspect(aspect) && isRelevant(aspect),
      ],
      true,
    ),
  );

  while (selected.length < safeLimit) {
    const candidate = pickCandidate([() => true], true);

    if (!candidate) {
      break;
    }

    addAspect(candidate);
  }

  const primaryAnchor =
    options.primaryAspect ??
    (options.forceDynamicAnchor === false
      ? undefined
      : selectPrimaryDynamicAnchor(ranked, context));

  if (primaryAnchor) {
    const anchorKey = getCanonicalAspectKey(primaryAnchor);
    const currentIndex = selected.findIndex(
      (aspect) => getCanonicalAspectKey(aspect) === anchorKey,
    );

    if (currentIndex >= 0) {
      selected.splice(currentIndex, 1);
    } else if (selected.length >= safeLimit) {
      selected.pop();
    }

    selected.unshift(primaryAnchor);
  }

  return selected.slice(0, safeLimit);
}

export function scoreRealEngineAspect(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
): number {
  const participants = getAspectParticipants(aspect);
  const placementHouseById = getPlacementHouseById(context);
  const activeHouseNumbers = new Set(context.activeHouseNumbers);
  const retrogradePlanetIds = new Set(context.retrogradePlanetIds ?? []);
  const allowedOrb = ASPECT_ORB_LIMITS[aspect.aspectId] ?? 8;
  const closenessRatio = Math.max(0, 1 - aspect.orb / allowedOrb);
  const coreCount = participants.filter((id) => CORE_PLANET_IDS.has(id)).length;
  const personalCount = participants.filter((id) => PERSONAL_PLANET_IDS.has(id)).length;
  const activeHouseHits = participants.filter((id) => {
    const house = placementHouseById.get(id);
    return typeof house === "number" && activeHouseNumbers.has(house);
  }).length;
  const angularHouseHits = participants.filter((id) => {
    const house = placementHouseById.get(id);
    return typeof house === "number" && ANGULAR_HOUSE_NUMBERS.has(house);
  }).length;
  const retrogradePersonalHits = participants.filter(
    (id) => PERSONAL_PLANET_IDS.has(id) && retrogradePlanetIds.has(id),
  ).length;
  const socialOuterOnly = participants.every((id) => SOCIAL_OUTER_PLANET_IDS.has(id));
  const unsupportedOuterHarmony =
    socialOuterOnly &&
    isHarmoniousAspect(aspect) &&
    activeHouseHits === 0 &&
    !participants.includes(context.chartRulerId);

  return [
    closenessRatio * 52,
    aspect.orb <= VERY_TIGHT_ASPECT_ORB ? 18 : aspect.orb <= 2.5 ? 8 : 0,
    coreCount * 34,
    participants.includes(context.chartRulerId) ? 42 : 0,
    personalCount * 18,
    isDynamicAspect(aspect) ? 24 : 0,
    aspect.aspectId === "conjunction" ? 8 : 0,
    activeHouseHits * 14,
    angularHouseHits * 8,
    retrogradePersonalHits * 24,
    isDynamicAspect(aspect) && connectsOppositeHouseAxis(aspect, context) ? 18 : 0,
    unsupportedOuterHarmony ? -42 : 0,
  ].reduce((total, value) => total + value, 0);
}

function scorePrimaryDynamicAnchor(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
): number {
  return (
    scoreRealEngineAspect(aspect, context) +
    (hasRetrogradePersonalParticipant(aspect, context) ? 12 : 0) +
    (connectsOppositeHouseAxis(aspect, context) ? 12 : 0) -
    (isSocialOuterOnly(aspect) ? 48 : 0)
  );
}

export function getCanonicalAspectKey(aspect: RealEngineReportAspect): string {
  const participants = getAspectParticipants(aspect).sort();
  return `${participants[0]}:${aspect.aspectId}:${participants[1]}`;
}

function getDiversityAdjustedScore(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
  participantCounts: Map<string, number>,
  selectedKinds: Set<RealEngineReportAspectKind>,
  selected: RealEngineReportAspect[],
): number {
  const counts = getAspectParticipants(aspect).map((id) => participantCounts.get(id) ?? 0);
  const saturationPenalty = Math.max(...counts) * 25 + (counts.every((count) => count > 0) ? 8 : 0);
  const aspectKindBonus = selectedKinds.has(aspect.aspectId) ? 0 : 12;
  const repeatedOuterHarmonyPenalty =
    isSocialOuterOnly(aspect) &&
    isHarmoniousAspect(aspect) &&
    selected.some(
      (selectedAspect) =>
        isSocialOuterOnly(selectedAspect) &&
        isHarmoniousAspect(selectedAspect),
    )
      ? 24
      : 0;

  return (
    scoreRealEngineAspect(aspect, context) -
    saturationPenalty +
    aspectKindBonus -
    repeatedOuterHarmonyPenalty
  );
}

function getPlacementHouseById(
  context: RealEngineAspectSelectionContext,
): Map<string, number | null> {
  return new Map(
    context.placements.map((placement) => [placement.id, placement.house ?? null]),
  );
}

function getActiveHouseHitCount(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
): number {
  const placementHouseById = getPlacementHouseById(context);
  const activeHouseNumbers = new Set(context.activeHouseNumbers);

  return getAspectParticipants(aspect).filter((id) => {
    const house = placementHouseById.get(id);
    return typeof house === "number" && activeHouseNumbers.has(house);
  }).length;
}

function connectsOppositeHouseAxis(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
): boolean {
  const placementHouseById = getPlacementHouseById(context);
  const [firstId, secondId] = getAspectParticipants(aspect);
  const firstHouse = placementHouseById.get(firstId);
  const secondHouse = placementHouseById.get(secondId);

  return (
    typeof firstHouse === "number" &&
    typeof secondHouse === "number" &&
    Math.abs(firstHouse - secondHouse) === 6
  );
}

function hasRetrogradePersonalParticipant(
  aspect: RealEngineReportAspect,
  context: RealEngineAspectSelectionContext,
): boolean {
  const retrogradePlanetIds = new Set(context.retrogradePlanetIds ?? []);

  return getAspectParticipants(aspect).some(
    (id) => PERSONAL_PLANET_IDS.has(id) && retrogradePlanetIds.has(id),
  );
}

function hasCoreParticipant(aspect: RealEngineReportAspect): boolean {
  return getAspectParticipants(aspect).some((id) => CORE_PLANET_IDS.has(id));
}

function hasPersonalParticipant(aspect: RealEngineReportAspect): boolean {
  return getAspectParticipants(aspect).some((id) => PERSONAL_PLANET_IDS.has(id));
}

function isSocialOuterOnly(aspect: RealEngineReportAspect): boolean {
  return getAspectParticipants(aspect).every((id) => SOCIAL_OUTER_PLANET_IDS.has(id));
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
