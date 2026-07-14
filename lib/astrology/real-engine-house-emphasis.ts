import type {
  RealEngineReportAngleId,
  RealEngineReportAspect,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportHouse,
  RealEngineReportHouseNumber,
  RealEngineReportLunarNodes,
  RealEngineReportPlacement,
} from "@/types/astro";

export type RealEngineHouseEmphasisReasonId =
  | "planetary-concentration"
  | "chart-ruler-house"
  | "north-node-house"
  | "south-node-house"
  | "luminary-house"
  | "angle-house"
  | "major-aspect-house"
  | "placement-house";

export type RealEngineHouseEmphasisReason = {
  id: RealEngineHouseEmphasisReasonId;
  planetIds?: string[];
  angleIds?: RealEngineReportAngleId[];
  aspectId?: string;
};

export type RealEngineHouseEmphasis = {
  house: RealEngineReportHouse;
  score: number;
  placementIds: string[];
  angleIds: RealEngineReportAngleId[];
  reasons: RealEngineHouseEmphasisReason[];
};

export type BuildRealEngineHouseEmphasisInput = {
  houses: RealEngineReportHouse[] | undefined;
  placements: RealEngineReportPlacement[];
  chartRulerId: string;
  lunarNodes?: RealEngineReportLunarNodes;
  primaryAnchor?: RealEngineReportAspect;
};

const ANGLE_ORDER: RealEngineReportAngleId[] = ["asc", "dsc", "mc", "ic"];

export function buildRealEngineHouseEmphasis({
  houses,
  placements,
  chartRulerId,
  lunarNodes,
  primaryAnchor,
}: BuildRealEngineHouseEmphasisInput): RealEngineHouseEmphasis[] {
  const placementById = new Map(
    placements.map((placement) => [placement.id, placement]),
  );
  const primaryAnchorPlanetIds = new Set(
    primaryAnchor
      ? [primaryAnchor.firstPlanetId, primaryAnchor.secondPlanetId]
      : [],
  );
  const calculatedLunarNodes = isCalculatedLunarNodes(lunarNodes)
    ? lunarNodes
    : undefined;
  const northNodeHouse = isHouseNumber(calculatedLunarNodes?.northNode.house)
    ? calculatedLunarNodes.northNode.house
    : null;
  const southNodeHouse = isHouseNumber(calculatedLunarNodes?.southNode.house)
    ? calculatedLunarNodes.southNode.house
    : null;

  return getCalculatedHouses(houses)
    .map((house): RealEngineHouseEmphasis | null => {
      const placementIds = Array.from(
        new Set([
          ...(Array.isArray(house.planetIds) ? house.planetIds : []),
          ...placements
            .filter((placement) => placement.house === house.number)
            .map((placement) => placement.id),
        ]),
      );
      const angleIds = ANGLE_ORDER.filter((angleId) =>
        (house.angleIds ?? []).includes(angleId),
      );
      const reasons: RealEngineHouseEmphasisReason[] = [];
      let score = 0;

      if (placementIds.length >= 3) {
        score += 50;
        reasons.push({
          id: "planetary-concentration",
          planetIds: placementIds,
        });
      }

      if (placementIds.includes(chartRulerId)) {
        score += 45;
        reasons.push({
          id: "chart-ruler-house",
          planetIds: [chartRulerId],
        });
      }

      const luminaryIds = placementIds.filter(
        (planetId) => planetId === "sun" || planetId === "moon",
      );
      if (luminaryIds.length > 0) {
        score += 35;
        reasons.push({
          id: "luminary-house",
          planetIds: luminaryIds,
        });
      }

      if (northNodeHouse === house.number) {
        score += 34;
        reasons.push({ id: "north-node-house" });
      }

      if (southNodeHouse === house.number) {
        score += 32;
        reasons.push({ id: "south-node-house" });
      }

      const anchorPlanetIds = placementIds.filter((planetId) =>
        primaryAnchorPlanetIds.has(planetId),
      );
      if (primaryAnchor && anchorPlanetIds.length > 0) {
        score += 30;
        reasons.push({
          id: "major-aspect-house",
          planetIds: anchorPlanetIds,
          aspectId: primaryAnchor.id,
        });
      }

      const hasPrimaryReason = reasons.length > 0;
      if (!hasPrimaryReason) {
        return null;
      }

      if (angleIds.length > 0) {
        score += 12;
        reasons.push({
          id: "angle-house",
          angleIds,
        });
      }

      const specificallyExplainedPlanetIds = new Set(
        reasons.flatMap((reason) => reason.planetIds ?? []),
      );
      const remainingPlacementIds = placementIds.filter(
        (planetId) =>
          placementById.has(planetId) &&
          !specificallyExplainedPlanetIds.has(planetId),
      );
      if (remainingPlacementIds.length > 0) {
        reasons.push({
          id: "placement-house",
          planetIds: remainingPlacementIds,
        });
      }

      return {
        house,
        score,
        placementIds,
        angleIds,
        reasons,
      };
    })
    .filter(
      (emphasis): emphasis is RealEngineHouseEmphasis => emphasis !== null,
    )
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.house.number - second.house.number,
    );
}

export function getHouseEmphasisReasonIds(
  emphasis: RealEngineHouseEmphasis,
): RealEngineHouseEmphasisReasonId[] {
  return emphasis.reasons.map((reason) => reason.id);
}

function getCalculatedHouses(
  houses: RealEngineReportHouse[] | undefined,
): RealEngineReportHouse[] {
  if (!Array.isArray(houses)) {
    return [];
  }

  return houses
    .filter(
      (house) =>
        (house.system === "whole-sign" || house.system === "placidus") &&
        house.reliability === "calculated",
    )
    .slice()
    .sort((first, second) => first.number - second.number);
}


function isCalculatedLunarNodes(
  lunarNodes: RealEngineReportLunarNodes | undefined,
): lunarNodes is RealEngineReportCalculatedLunarNodes {
  return Boolean(
    lunarNodes &&
      lunarNodes.status === "calculated" &&
      "northNode" in lunarNodes &&
      "southNode" in lunarNodes,
  );
}

function isHouseNumber(
  value: number | null | undefined,
): value is RealEngineReportHouseNumber {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}
