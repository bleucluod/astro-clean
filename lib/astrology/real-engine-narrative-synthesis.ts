import type {
  RealEngineReportAspect,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportHouseNumber,
  RealEngineReportLunarNodes,
  RealEngineReportPlacement,
  RealEngineChartSignature,
  RealEngineChartElement,
  RealEngineChartModality,
  ZodiacKey,
} from "@/types/astro";
import { buildRealEngineChartSignature } from "@/lib/astrology/real-engine-chart-signature";
import {
  rankRealEngineAspects,
  selectPrimaryDynamicAnchor,
  type RealEngineAspectSelectionContext,
} from "@/lib/astrology/real-engine-aspect-selection";
import type { RealEngineHouseEmphasis } from "@/lib/astrology/real-engine-house-emphasis";

export type RealEngineNarrativeMode =
  | "tension-led"
  | "strength-led"
  | "cluster-led"
  | "axis-led";

export type RealEngineNarrativeClusterKind = "sign" | "house";

export type RealEngineNarrativeCluster = {
  id: string;
  kind: RealEngineNarrativeClusterKind;
  signId?: ZodiacKey;
  houseNumber?: RealEngineReportHouseNumber;
  placementIds: string[];
  personalPlanetIds: string[];
  score: number;
};

export type RealEngineNodeBoundaryConfidence =
  | "very-near"
  | "near"
  | "stable";

export type RealEngineNodeAxisSynthesis = {
  model: "mean" | "local-true-osculating";
  confidence: RealEngineNodeBoundaryConfidence;
  boundaryDistance: number;
  northHouse: RealEngineReportHouseNumber | null;
  southHouse: RealEngineReportHouseNumber | null;
  northSignId: ZodiacKey;
  southSignId: ZodiacKey;
  primaryDimension: "house-axis" | "house-and-sign";
};

export type RealEngineChartBalanceProfile = RealEngineChartSignature;

export type RealEngineNarrativeDriver =
  | { kind: "aspect"; aspect: RealEngineReportAspect }
  | { kind: "cluster"; cluster: RealEngineNarrativeCluster }
  | { kind: "axis"; axis: RealEngineNodeAxisSynthesis }
  | {
      kind: "strength";
      element: RealEngineChartElement | null;
      modality: RealEngineChartModality | null;
    };

export type RealEngineNarrativeSynthesisProfile = {
  mode: RealEngineNarrativeMode;
  primaryDriver: RealEngineNarrativeDriver;
  primaryAspect?: RealEngineReportAspect;
  primaryCluster?: RealEngineNarrativeCluster;
  nodeAxis?: RealEngineNodeAxisSynthesis;
  balance: RealEngineChartBalanceProfile;
  clusters: RealEngineNarrativeCluster[];
  relationshipLimit: 3 | 4 | 5;
  mainHouseNumbers: RealEngineReportHouseNumber[];
};

export type BuildRealEngineNarrativeSynthesisProfileInput = {
  aspects: RealEngineReportAspect[];
  placements: RealEngineReportPlacement[];
  chartRulerId: string;
  activeHouseNumbers: number[];
  retrogradePlanetIds?: string[];
  lunarNodes?: RealEngineReportLunarNodes;
  houseEmphasis?: RealEngineHouseEmphasis[];
  chartSignature?: RealEngineChartSignature;
};

export type RealEnginePracticeDomain =
  | "emotional-relational"
  | "daily-body-work"
  | "identity-decision-creative";

export type RealEnginePracticeCandidate = {
  domain: RealEnginePracticeDomain;
  text: string | undefined;
  priority: number;
};

const PERSONAL_PLANET_IDS = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
]);
const SOCIAL_OUTER_PLANET_IDS = new Set([
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
]);
const SIGN_ELEMENT: Record<ZodiacKey, RealEngineChartElement> = {
  aries: "fire",
  leo: "fire",
  sagittarius: "fire",
  taurus: "earth",
  virgo: "earth",
  capricorn: "earth",
  gemini: "air",
  libra: "air",
  aquarius: "air",
  cancer: "water",
  scorpio: "water",
  pisces: "water",
};

export function buildRealEngineNarrativeSynthesisProfile({
  aspects,
  placements,
  chartRulerId,
  activeHouseNumbers,
  retrogradePlanetIds = [],
  lunarNodes,
  houseEmphasis = [],
  chartSignature,
}: BuildRealEngineNarrativeSynthesisProfileInput): RealEngineNarrativeSynthesisProfile {
  const context: RealEngineAspectSelectionContext = {
    chartRulerId,
    activeHouseNumbers,
    placements: placements.map((placement) => ({
      id: placement.id,
      house: placement.house ?? null,
    })),
    retrogradePlanetIds,
  };
  const rankedAspects = rankRealEngineAspects(aspects, context);
  const dynamicAnchor = selectPrimaryDynamicAnchor(rankedAspects, context);
  const clusters = buildRealEngineNarrativeClusters(
    placements,
    aspects,
    chartRulerId,
    activeHouseNumbers,
  );
  const primaryCluster = clusters[0];
  const nodeAxis = buildRealEngineNodeAxisSynthesis(lunarNodes);
  const balance = chartSignature ?? buildRealEngineChartBalanceProfile(placements);
  const hasStrongPersonalTension = Boolean(
    dynamicAnchor &&
      !isSocialOuterOnly(dynamicAnchor) &&
      (hasCoreOrRulerParticipant(dynamicAnchor, chartRulerId) ||
        hasRetrogradePersonalParticipant(dynamicAnchor, retrogradePlanetIds) ||
        connectsOppositeHouseAxis(dynamicAnchor, placements)),
  );

  const mode: RealEngineNarrativeMode =
    nodeAxis?.confidence === "very-near" &&
    nodeAxis.northHouse !== null &&
    nodeAxis.southHouse !== null
      ? "axis-led"
      : hasStrongPersonalTension
        ? "tension-led"
        : primaryCluster && primaryCluster.placementIds.length >= 3
          ? "cluster-led"
          : balance.dominantElement || balance.dominantModality
            ? "strength-led"
            : dynamicAnchor
              ? "tension-led"
              : "strength-led";

  const primaryAspect =
    mode === "tension-led"
      ? dynamicAnchor
      : rankedAspects.find((aspect) => !isSocialOuterOnly(aspect));

  const primaryDriver: RealEngineNarrativeDriver =
    mode === "axis-led" && nodeAxis
      ? { kind: "axis", axis: nodeAxis }
      : mode === "cluster-led" && primaryCluster
        ? { kind: "cluster", cluster: primaryCluster }
        : mode === "tension-led" && primaryAspect
          ? { kind: "aspect", aspect: primaryAspect }
          : {
              kind: "strength",
              element: balance.dominantElement,
              modality: balance.dominantModality,
            };

  return {
    mode,
    primaryDriver,
    primaryAspect,
    primaryCluster,
    nodeAxis,
    balance,
    clusters,
    relationshipLimit:
      mode === "tension-led" ? 5 : mode === "cluster-led" ? 4 : 3,
    mainHouseNumbers: houseEmphasis
      .slice(0, 4)
      .map((item) => item.house.number),
  };
}

export function buildRealEngineNarrativeClusters(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
  chartRulerId: string,
  activeHouseNumbers: number[],
): RealEngineNarrativeCluster[] {
  const clusters: RealEngineNarrativeCluster[] = buildConjunctionClusters(
    placements,
    aspects,
    chartRulerId,
    activeHouseNumbers,
  );
  const activeHouses = new Set(activeHouseNumbers);

  for (const signId of Object.keys(SIGN_ELEMENT) as ZodiacKey[]) {
    const signPlacements = placements.filter(
      (placement) => placement.signId === signId,
    );
    if (signPlacements.length >= 3) {
      clusters.push(
        makeCluster({
          id: `sign:${signId}`,
          kind: "sign",
          signId,
          placements: signPlacements,
          chartRulerId,
          active: false,
        }),
      );
    }
  }

  for (let house = 1; house <= 12; house += 1) {
    if (!isHouseNumber(house)) {
      continue;
    }
    const housePlacements = placements.filter(
      (placement) => placement.house === house,
    );
    if (housePlacements.length >= 3) {
      clusters.push(
        makeCluster({
          id: `house:${house}`,
          kind: "house",
          houseNumber: house,
          placements: housePlacements,
          chartRulerId,
          active: activeHouses.has(house),
        }),
      );
    }
  }

  return clusters.sort(
    (first, second) =>
      second.score - first.score ||
      second.placementIds.length - first.placementIds.length ||
      first.id.localeCompare(second.id),
  );
}

export function buildRealEngineNodeAxisSynthesis(
  lunarNodes: RealEngineReportLunarNodes | undefined,
): RealEngineNodeAxisSynthesis | undefined {
  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  const boundaryDistance = Math.min(
    distanceToSignBoundary(lunarNodes.northNode.degreeInSign),
    distanceToSignBoundary(lunarNodes.southNode.degreeInSign),
  );
  const confidence: RealEngineNodeBoundaryConfidence =
    boundaryDistance <= 0.5
      ? "very-near"
      : boundaryDistance <= 1
        ? "near"
        : "stable";

  return {
    model: lunarNodes.nodeType,
    confidence,
    boundaryDistance,
    northHouse: isHouseNumber(lunarNodes.northNode.house)
      ? lunarNodes.northNode.house
      : null,
    southHouse: isHouseNumber(lunarNodes.southNode.house)
      ? lunarNodes.southNode.house
      : null,
    northSignId: lunarNodes.northNode.signId,
    southSignId: lunarNodes.southNode.signId,
    primaryDimension:
      confidence === "very-near" ? "house-axis" : "house-and-sign",
  };
}

export function buildRealEngineChartBalanceProfile(
  placements: RealEngineReportPlacement[],
): RealEngineChartBalanceProfile {
  return buildRealEngineChartSignature(placements);
}

export function selectThreeDomainNarrativePractices(
  candidates: RealEnginePracticeCandidate[],
): string[] {
  const domains: RealEnginePracticeDomain[] = [
    "emotional-relational",
    "daily-body-work",
    "identity-decision-creative",
  ];
  const seen = new Set<string>();
  const selected: string[] = [];

  for (const domain of domains) {
    const candidate = candidates
      .filter(
        (item) =>
          item.domain === domain &&
          typeof item.text === "string" &&
          item.text.trim().length > 0,
      )
      .sort((first, second) => second.priority - first.priority)
      .find((item) => {
        const key = normalizePractice(item.text ?? "");
        return key.length > 0 && !seen.has(key);
      });

    if (!candidate?.text) {
      continue;
    }

    const cleaned = candidate.text.trim();
    seen.add(normalizePractice(cleaned));
    selected.push(cleaned);
  }

  return selected;
}

function buildConjunctionClusters(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
  chartRulerId: string,
  activeHouseNumbers: number[],
): RealEngineNarrativeCluster[] {
  const placementById = new Map(
    placements.map((placement) => [placement.id, placement]),
  );
  const adjacency = new Map<string, Set<string>>();

  for (const aspect of aspects) {
    if (aspect.aspectId !== "conjunction") {
      continue;
    }
    if (
      !placementById.has(aspect.firstPlanetId) ||
      !placementById.has(aspect.secondPlanetId)
    ) {
      continue;
    }
    for (const [first, second] of [
      [aspect.firstPlanetId, aspect.secondPlanetId],
      [aspect.secondPlanetId, aspect.firstPlanetId],
    ] as const) {
      const neighbors = adjacency.get(first) ?? new Set<string>();
      neighbors.add(second);
      adjacency.set(first, neighbors);
    }
  }

  const activeHouses = new Set(activeHouseNumbers);
  const visited = new Set<string>();
  const clusters: RealEngineNarrativeCluster[] = [];

  for (const start of [...adjacency.keys()].sort()) {
    if (visited.has(start)) {
      continue;
    }
    const stack = [start];
    const componentIds: string[] = [];
    visited.add(start);

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }
      componentIds.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    if (componentIds.length < 3) {
      continue;
    }

    const componentPlacements = componentIds
      .map((id) => placementById.get(id))
      .filter(
        (placement): placement is RealEngineReportPlacement =>
          Boolean(placement),
      )
      .sort((first, second) => first.id.localeCompare(second.id));
    const sharedHouse = componentPlacements.every(
      (placement) =>
        placement.house === componentPlacements[0]?.house &&
        isHouseNumber(placement.house),
    )
      ? componentPlacements[0]?.house
      : undefined;
    const sharedSign = componentPlacements.every(
      (placement) => placement.signId === componentPlacements[0]?.signId,
    )
      ? componentPlacements[0]?.signId
      : undefined;

    if (!isHouseNumber(sharedHouse) && !sharedSign) {
      continue;
    }

    const kind: RealEngineNarrativeClusterKind = isHouseNumber(sharedHouse)
      ? "house"
      : "sign";
    clusters.push(
      makeCluster({
        id: `conjunction:${componentPlacements
          .map((placement) => placement.id)
          .join("-")}`,
        kind,
        houseNumber: isHouseNumber(sharedHouse) ? sharedHouse : undefined,
        signId: sharedSign,
        placements: componentPlacements,
        chartRulerId,
        active: isHouseNumber(sharedHouse) && activeHouses.has(sharedHouse),
        bonus: 30,
      }),
    );
  }

  return clusters;
}

function makeCluster({
  id,
  kind,
  signId,
  houseNumber,
  placements,
  chartRulerId,
  active,
  bonus = 0,
}: {
  id: string;
  kind: RealEngineNarrativeClusterKind;
  signId?: ZodiacKey;
  houseNumber?: RealEngineReportHouseNumber;
  placements: RealEngineReportPlacement[];
  chartRulerId: string;
  active: boolean;
  bonus?: number;
}): RealEngineNarrativeCluster {
  const placementIds = placements.map((placement) => placement.id);
  const personalPlanetIds = placementIds.filter((id) =>
    PERSONAL_PLANET_IDS.has(id),
  );
  const luminaryCount = placementIds.filter(
    (id) => id === "sun" || id === "moon",
  ).length;

  return {
    id,
    kind,
    signId,
    houseNumber,
    placementIds,
    personalPlanetIds,
    score:
      placements.length * 20 +
      personalPlanetIds.length * 6 +
      luminaryCount * 10 +
      (placementIds.includes(chartRulerId) ? 12 : 0) +
      (active ? 8 : 0) +
      bonus,
  };
}

function hasCoreOrRulerParticipant(
  aspect: RealEngineReportAspect,
  chartRulerId: string,
): boolean {
  return [aspect.firstPlanetId, aspect.secondPlanetId].some(
    (id) => id === "sun" || id === "moon" || id === chartRulerId,
  );
}

function hasRetrogradePersonalParticipant(
  aspect: RealEngineReportAspect,
  retrogradePlanetIds: string[],
): boolean {
  const retrogrades = new Set(retrogradePlanetIds);
  return [aspect.firstPlanetId, aspect.secondPlanetId].some(
    (id) => PERSONAL_PLANET_IDS.has(id) && retrogrades.has(id),
  );
}

function connectsOppositeHouseAxis(
  aspect: RealEngineReportAspect,
  placements: RealEngineReportPlacement[],
): boolean {
  const houseById = new Map(
    placements.map((placement) => [placement.id, placement.house ?? null]),
  );
  const firstHouse = houseById.get(aspect.firstPlanetId);
  const secondHouse = houseById.get(aspect.secondPlanetId);

  return (
    typeof firstHouse === "number" &&
    typeof secondHouse === "number" &&
    Math.abs(firstHouse - secondHouse) === 6
  );
}

function isSocialOuterOnly(aspect: RealEngineReportAspect): boolean {
  return [aspect.firstPlanetId, aspect.secondPlanetId].every((id) =>
    SOCIAL_OUTER_PLANET_IDS.has(id),
  );
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

function distanceToSignBoundary(degreeInSign: number): number {
  const normalized = ((degreeInSign % 30) + 30) % 30;
  return Math.min(normalized, 30 - normalized);
}

function normalizePractice(text: string): string {
  return text
    .replace(/[،؛:.؟!]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
