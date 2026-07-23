import type {
  RealEngineChartElement,
  RealEngineChartExpression,
  RealEngineChartModality,
  RealEngineChartSignature,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";

const MAJOR_PLANET_IDS = new Set([
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
]);

const ELEMENTS: RealEngineChartElement[] = ["fire", "earth", "air", "water"];
const MODALITIES: RealEngineChartModality[] = ["cardinal", "fixed", "mutable"];
const EXPRESSIONS: RealEngineChartExpression[] = ["active", "receptive"];

const SIGN_ELEMENT: Record<ZodiacKey, RealEngineChartElement> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

const SIGN_MODALITY: Record<ZodiacKey, RealEngineChartModality> = {
  aries: "cardinal", cancer: "cardinal", libra: "cardinal", capricorn: "cardinal",
  taurus: "fixed", leo: "fixed", scorpio: "fixed", aquarius: "fixed",
  gemini: "mutable", virgo: "mutable", sagittarius: "mutable", pisces: "mutable",
};

const SIGN_EXPRESSION: Record<ZodiacKey, RealEngineChartExpression> = {
  aries: "active", gemini: "active", leo: "active", libra: "active",
  sagittarius: "active", aquarius: "active",
  taurus: "receptive", cancer: "receptive", virgo: "receptive",
  scorpio: "receptive", capricorn: "receptive", pisces: "receptive",
};

export function buildRealEngineChartSignature(
  placements: RealEngineReportPlacement[],
): RealEngineChartSignature {
  const elementCounts = emptyCounts(ELEMENTS);
  const modalityCounts = emptyCounts(MODALITIES);
  const expressionCounts = emptyCounts(EXPRESSIONS);
  const included = placements.filter((placement) => MAJOR_PLANET_IDS.has(placement.id));

  const evidence = included.map((placement) => {
    const element = SIGN_ELEMENT[placement.signId];
    const modality = SIGN_MODALITY[placement.signId];
    const expression = SIGN_EXPRESSION[placement.signId];
    elementCounts[element] += 1;
    modalityCounts[modality] += 1;
    expressionCounts[expression] += 1;
    return {
      placementId: placement.id,
      signId: placement.signId,
      element,
      modality,
      expression,
      weight: 1 as const,
    };
  });

  return {
    version: "chart-signature-v1",
    method: "equal-weight-major-planets",
    elementCounts,
    modalityCounts,
    expressionCounts,
    dominantElement: selectDominantKey(elementCounts, included.length),
    dominantModality: selectDominantKey(modalityCounts, included.length),
    dominantExpression: selectDominantKey(expressionCounts, included.length),
    lowElements: selectLowKeys(elementCounts),
    lowModalities: selectLowKeys(modalityCounts),
    lowExpressions: selectLowKeys(expressionCounts),
    zeroElements: ELEMENTS.filter((key) => elementCounts[key] === 0),
    zeroModalities: MODALITIES.filter((key) => modalityCounts[key] === 0),
    evidence,
    excludedPlacementIds: placements
      .filter((placement) => !MAJOR_PLANET_IDS.has(placement.id))
      .map((placement) => placement.id),
  };
}

function selectDominantKey<T extends string>(
  counts: Record<T, number>,
  total: number,
): T | null {
  const ranked = (Object.entries(counts) as Array<[T, number]>).sort(
    (first, second) => second[1] - first[1] || first[0].localeCompare(second[0]),
  );
  const [first, second] = ranked;
  const minimumShare = Math.ceil(total / 3);
  return first && first[1] >= minimumShare && first[1] - (second?.[1] ?? 0) >= 2
    ? first[0]
    : null;
}

function selectLowKeys<T extends string>(counts: Record<T, number>): T[] {
  const entries = Object.entries(counts) as Array<[T, number]>;
  const values = entries.map(([, count]) => count);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return minimum < maximum
    ? entries.filter(([, count]) => count === minimum).map(([key]) => key)
    : [];
}

function emptyCounts<T extends string>(keys: T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}
