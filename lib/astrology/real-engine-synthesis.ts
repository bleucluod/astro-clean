import type {
  RealEngineReportAspect,
  RealEngineReportPlacement,
} from "@/types/astro";

const CORE_PLANET_IDS = new Set(["sun", "moon"]);
const DAILY_PLANET_IDS = new Set(["mercury", "venus", "mars"]);

export type RealEngineSynthesisPlanInput = {
  aspects: RealEngineReportAspect[];
  placements: RealEngineReportPlacement[];
  chartRulerId: string;
  activeHouseNumbers: number[];
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
};

export function buildRealEngineSynthesisPlan({
  aspects,
  placements,
  chartRulerId,
  activeHouseNumbers,
}: RealEngineSynthesisPlanInput): RealEngineSynthesisPlan {
  const placementHouseById = new Map(
    placements.map((placement) => [placement.id, placement.house ?? null]),
  );
  const activeHouses = new Set(activeHouseNumbers);
  const ranked = [...aspects].sort((first, second) =>
    getSynthesisRelevance(second, chartRulerId, placementHouseById, activeHouses) -
      getSynthesisRelevance(first, chartRulerId, placementHouseById, activeHouses) ||
    first.orb - second.orb ||
    first.id.localeCompare(second.id),
  );

  const primaryChallenge =
    ranked.find((aspect) => isDynamicAspect(aspect)) ??
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

    const participants = getParticipants(aspect);
    return participants.some((id) => DAILY_PLANET_IDS.has(id));
  });

  const selectedAspects = [primaryChallenge, primarySupport, dailyBridge].filter(
    (aspect): aspect is RealEngineReportAspect => Boolean(aspect),
  );
  const selectedParticipantHouses = selectedAspects.flatMap((aspect) =>
    getParticipants(aspect)
      .map((planetId) => placementHouseById.get(planetId))
      .filter(isHouseNumber),
  );
  const primaryHouseNumber =
    selectedParticipantHouses.find((house) => activeHouses.has(house)) ??
    activeHouseNumbers[0] ??
    selectedParticipantHouses[0] ??
    null;
  const plan: RealEngineSynthesisPlan = {
    primaryChallenge,
    primarySupport,
    dailyBridge,
    primaryHouseNumber,
    evidenceAspectIds: [],
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

function getSynthesisRelevance(
  aspect: RealEngineReportAspect,
  chartRulerId: string,
  placementHouseById: Map<string, number | null>,
  activeHouses: Set<number>,
): number {
  const participants = getParticipants(aspect);
  const coreHits = participants.filter((id) => CORE_PLANET_IDS.has(id)).length;
  const dailyHits = participants.filter((id) => DAILY_PLANET_IDS.has(id)).length;
  const activeHouseHits = participants.filter((id) => {
    const house = placementHouseById.get(id);
    return typeof house === "number" && activeHouses.has(house);
  }).length;

  return [
    isDynamicAspect(aspect) ? 40 : 0,
    aspect.aspectId === "conjunction" ? 18 : 0,
    aspect.aspectId === "trine" || aspect.aspectId === "sextile" ? 12 : 0,
    participants.includes(chartRulerId) ? 34 : 0,
    coreHits * 24,
    dailyHits * 8,
    activeHouseHits * 7,
    Math.max(0, 20 - aspect.orb * 4),
  ].reduce((total, value) => total + value, 0);
}

function getParticipants(aspect: RealEngineReportAspect): string[] {
  return [aspect.firstPlanetId, aspect.secondPlanetId];
}

function isDynamicAspect(aspect: RealEngineReportAspect): boolean {
  return aspect.aspectId === "square" || aspect.aspectId === "opposition";
}

function isHouseNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && value >= 1 && value <= 12;
}
