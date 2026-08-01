import type {
  RealEngineReportAspect,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
} from "@/types/astro";
import {
  rankRealEngineAspects,
  selectPrimaryDynamicAnchor,
  type RealEngineAspectSelectionContext,
} from "@/lib/astrology/real-engine-aspect-selection";
import type { RealEngineHouseEmphasis } from "@/lib/astrology/real-engine-house-emphasis";
import {
  buildRealEngineNarrativeSynthesisProfile,
  type RealEngineNarrativeSynthesisProfile,
} from "@/lib/astrology/real-engine-narrative-synthesis";
import type { RealEngineReportLunarNodes } from "@/types/astro";

const DAILY_PLANET_IDS = new Set(["mercury", "venus", "mars"]);
const THEME_PLANET_IDS = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
]);

export type RealEngineSynthesisPlanInput = {
  aspects: RealEngineReportAspect[];
  placements: RealEngineReportPlacement[];
  chartRulerId: string;
  activeHouseNumbers: number[];
  retrogradePlanetIds?: string[];
  houseEmphasis?: RealEngineHouseEmphasis[];
  lunarNodes?: RealEngineReportLunarNodes;
  narrativeProfile?: RealEngineNarrativeSynthesisProfile;
};

export type RealEngineSynthesisRoleId =
  | "challenge"
  | "support"
  | "daily-bridge";

export type RealEngineSynthesisRole = {
  id: RealEngineSynthesisRoleId;
  aspect: RealEngineReportAspect;
};

export type RealEngineSynthesisPlan = {
  narrativeProfile: RealEngineNarrativeSynthesisProfile;
  primaryRelationship?: RealEngineReportAspect;
  primaryChallenge?: RealEngineReportAspect;
  primarySupport?: RealEngineReportAspect;
  dailyBridge?: RealEngineReportAspect;
  narrativeRelationships: RealEngineReportAspect[];
  primaryHouseNumber: number | null;
  evidenceAspectIds: string[];
  houseEmphasis: RealEngineHouseEmphasis[];
};

export function buildRealEngineSynthesisPlan({
  aspects,
  placements,
  chartRulerId,
  activeHouseNumbers,
  retrogradePlanetIds = [],
  houseEmphasis = [],
  lunarNodes,
  narrativeProfile,
}: RealEngineSynthesisPlanInput): RealEngineSynthesisPlan {
  const placementHouseById = new Map(
    placements.map((placement) => [placement.id, placement.house ?? null]),
  );
  const context: RealEngineAspectSelectionContext = {
    chartRulerId,
    activeHouseNumbers,
    placements: placements.map((placement) => ({
      id: placement.id,
      house: placement.house ?? null,
    })),
    retrogradePlanetIds,
  };
  const ranked = rankRealEngineAspects(aspects, context);
  const resolvedProfile =
    narrativeProfile ??
    buildRealEngineNarrativeSynthesisProfile({
      aspects,
      placements,
      chartRulerId,
      activeHouseNumbers,
      retrogradePlanetIds,
      lunarNodes,
      houseEmphasis,
    });
  const primaryChallenge = narrativeProfile
    ? resolvedProfile.mode === "tension-led"
      ? resolvedProfile.primaryAspect ??
        selectPrimaryDynamicAnchor(ranked, context)
      : undefined
    : selectPrimaryDynamicAnchor(ranked, context) ??
      ranked.find((aspect) => aspect.aspectId === "conjunction");
  const primaryRelationship = primaryChallenge ?? ranked[0];
  const primarySupport = ranked.find(
    (aspect) =>
      aspect.id !== primaryRelationship?.id &&
      (aspect.aspectId === "trine" || aspect.aspectId === "sextile"),
  );

  const selectedIds = new Set(
    [primaryRelationship?.id, primarySupport?.id].filter(
      (id): id is string => typeof id === "string",
    ),
  );
  const selectedNarrativeParticipantIds = new Set(
    [primaryRelationship, primarySupport]
      .filter(
        (aspect): aspect is RealEngineReportAspect => Boolean(aspect),
      )
      .flatMap(getParticipants),
  );
  const dailyBridgeCandidates = ranked.filter((aspect) => {
    if (selectedIds.has(aspect.id)) {
      return false;
    }

    return getParticipants(aspect).some((id) => DAILY_PLANET_IDS.has(id));
  });
  const dailyBridge =
    dailyBridgeCandidates.find((aspect) =>
      getParticipants(aspect).some(
        (id) =>
          THEME_PLANET_IDS.has(id) &&
          !selectedNarrativeParticipantIds.has(id),
      ),
    ) ?? dailyBridgeCandidates[0];

  const selectedAspects = [
    primaryRelationship,
    primarySupport,
    dailyBridge,
  ].filter(
    (aspect): aspect is RealEngineReportAspect => Boolean(aspect),
  );
  const boundedHouseEmphasis = houseEmphasis.slice(0, 4);
  const primaryHouseNumber = selectPrimaryHouseNumber({
    primaryChallenge: primaryRelationship,
    selectedAspects,
    placementHouseById,
    activeHouseNumbers,
    houseEmphasis: boundedHouseEmphasis,
  });
  const plan: RealEngineSynthesisPlan = {
    narrativeProfile: resolvedProfile,
    primaryRelationship,
    primaryChallenge,
    primarySupport,
    dailyBridge,
    narrativeRelationships: aspects.slice(0, 5),
    primaryHouseNumber,
    evidenceAspectIds: [],
    houseEmphasis: boundedHouseEmphasis,
  };

  return {
    ...plan,
    evidenceAspectIds: getRealEngineSynthesisRoles(plan).map(
      (role) => role.aspect.id,
    ),
  };
}

export function getRealEngineSynthesisRoles(
  plan: RealEngineSynthesisPlan,
): RealEngineSynthesisRole[] {
  return [
    plan.primaryChallenge
      ? { id: "challenge" as const, aspect: plan.primaryChallenge }
      : undefined,
    plan.primarySupport
      ? { id: "support" as const, aspect: plan.primarySupport }
      : undefined,
    plan.dailyBridge
      ? { id: "daily-bridge" as const, aspect: plan.dailyBridge }
      : undefined,
  ].filter((role): role is RealEngineSynthesisRole => Boolean(role));
}

function selectPrimaryHouseNumber({
  primaryChallenge,
  selectedAspects,
  placementHouseById,
  activeHouseNumbers,
  houseEmphasis,
}: {
  primaryChallenge: RealEngineReportAspect | undefined;
  selectedAspects: RealEngineReportAspect[];
  placementHouseById: Map<string, number | null>;
  activeHouseNumbers: number[];
  houseEmphasis: RealEngineHouseEmphasis[];
}): number | null {
  const emphasisScoreByHouse = new Map(
    houseEmphasis.map((item) => [item.house.number, item.score]),
  );
  const activeOrderByHouse = new Map(
    activeHouseNumbers.map((house, index) => [house, index]),
  );
  const rankHouses = (houses: number[]) =>
    Array.from(new Set(houses))
      .filter(isHouseNumber)
      .sort(
        (first, second) =>
          (emphasisScoreByHouse.get(second) ?? 0) -
            (emphasisScoreByHouse.get(first) ?? 0) ||
          (activeOrderByHouse.get(first) ?? Number.MAX_SAFE_INTEGER) -
            (activeOrderByHouse.get(second) ?? Number.MAX_SAFE_INTEGER) ||
          first - second,
      );

  const primaryChallengeHouses = primaryChallenge
    ? getParticipants(primaryChallenge)
        .map((planetId) => placementHouseById.get(planetId))
        .filter(isHouseNumber)
    : [];
  const challengeHouse = rankHouses(primaryChallengeHouses)[0];

  if (challengeHouse) {
    return challengeHouse;
  }

  const selectedParticipantHouses = selectedAspects.flatMap((aspect) =>
    getParticipants(aspect)
      .map((planetId) => placementHouseById.get(planetId))
      .filter(isHouseNumber),
  );

  return (
    rankHouses(selectedParticipantHouses)[0] ??
    houseEmphasis[0]?.house.number ??
    activeHouseNumbers[0] ??
    null
  );
}

function getParticipants(aspect: RealEngineReportAspect): string[] {
  return [aspect.firstPlanetId, aspect.secondPlanetId];
}

function isHouseNumber(
  value: number | null | undefined,
): value is RealEngineReportHouseNumber {
  return typeof value === "number" && value >= 1 && value <= 12;
}
