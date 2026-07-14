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

const DAILY_PLANET_IDS = new Set(["mercury", "venus", "mars"]);

export type RealEngineSynthesisPlanInput = {
  aspects: RealEngineReportAspect[];
  placements: RealEngineReportPlacement[];
  chartRulerId: string;
  activeHouseNumbers: number[];
  retrogradePlanetIds?: string[];
  houseEmphasis?: RealEngineHouseEmphasis[];
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
  primaryChallenge?: RealEngineReportAspect;
  primarySupport?: RealEngineReportAspect;
  dailyBridge?: RealEngineReportAspect;
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
  const primaryChallenge =
    selectPrimaryDynamicAnchor(ranked, context) ??
    ranked.find((aspect) => aspect.aspectId === "conjunction");

  const primarySupport = ranked.find(
    (aspect) =>
      aspect.id !== primaryChallenge?.id &&
      (aspect.aspectId === "trine" || aspect.aspectId === "sextile"),
  );

  const selectedIds = new Set(
    [primaryChallenge?.id, primarySupport?.id].filter(
      (id): id is string => typeof id === "string",
    ),
  );

  const dailyBridge = ranked.find((aspect) => {
    if (selectedIds.has(aspect.id)) {
      return false;
    }

    return getParticipants(aspect).some((id) => DAILY_PLANET_IDS.has(id));
  });

  const selectedAspects = [primaryChallenge, primarySupport, dailyBridge].filter(
    (aspect): aspect is RealEngineReportAspect => Boolean(aspect),
  );
  const primaryHouseNumber = selectPrimaryHouseNumber({
    primaryChallenge,
    selectedAspects,
    placementHouseById,
    activeHouseNumbers,
    houseEmphasis,
  });
  const plan: RealEngineSynthesisPlan = {
    primaryChallenge,
    primarySupport,
    dailyBridge,
    primaryHouseNumber,
    evidenceAspectIds: [],
    houseEmphasis,
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
