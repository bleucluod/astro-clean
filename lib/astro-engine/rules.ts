import type {
  AstroElement,
  AstroModality,
  EngineChartInput,
  EngineChartPoint,
  EngineInsight,
  EngineResult,
  InsightCategory,
  ZodiacSymbolProfile,
} from "./types";
import {
  chartPointLabels,
  elementLabels,
  modalityLabels,
  zodiacKnowledge,
} from "./zodiac-knowledge";

const pointCategories: Record<EngineChartPoint, InsightCategory> = {
  sun: "identity",
  moon: "emotion",
  rising: "social-mask",
};

const pointWeights: Record<EngineChartPoint, number> = {
  sun: 90,
  moon: 85,
  rising: 75,
};

const elementThemes: Record<AstroElement, string> = {
  fire: "Ø§Ù†Ø±Ú˜ÛŒ Ø¢ØªØ´ÛŒ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¯Ø± Ø²Ø¨Ø§Ù† Ù†Ù…Ø§Ø¯ÛŒÙ† Ø¨Ù‡ Ø­Ø±Ú©ØªØŒ Ø´Ø±ÙˆØ¹ØŒ Ø´Ù‡Ø§Ù…Øª Ùˆ Ø¨ÛŒØ§Ù† Ù…Ø³ØªÙ‚ÛŒÙ… Ø§Ø´Ø§Ø±Ù‡ Ú©Ù†Ø¯.",
  earth: "Ø§Ù†Ø±Ú˜ÛŒ Ø®Ø§Ú©ÛŒ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¯Ø± Ø²Ø¨Ø§Ù† Ù†Ù…Ø§Ø¯ÛŒÙ† Ø¨Ù‡ Ø«Ø¨Ø§ØªØŒ Ø¨Ø¯Ù†ØŒ Ø¹Ù…Ù„â€ŒÚ¯Ø±Ø§ÛŒÛŒ Ùˆ Ù†ÛŒØ§Ø² Ø¨Ù‡ Ø§Ù…Ù†ÛŒØª Ø§Ø´Ø§Ø±Ù‡ Ú©Ù†Ø¯.",
  air: "Ø§Ù†Ø±Ú˜ÛŒ Ù‡ÙˆØ§ÛŒÛŒ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¯Ø± Ø²Ø¨Ø§Ù† Ù†Ù…Ø§Ø¯ÛŒÙ† Ø¨Ù‡ ÙÚ©Ø±ØŒ Ø§Ø±ØªØ¨Ø§Ø·ØŒ Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ùˆ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ÛŒÛŒ Ø°Ù‡Ù†ÛŒ Ø§Ø´Ø§Ø±Ù‡ Ú©Ù†Ø¯.",
  water: "Ø§Ù†Ø±Ú˜ÛŒ Ø¢Ø¨ÛŒ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¯Ø± Ø²Ø¨Ø§Ù† Ù†Ù…Ø§Ø¯ÛŒÙ† Ø¨Ù‡ Ø§Ø­Ø³Ø§Ø³ØŒ Ø­Ø§ÙØ¸Ù‡ØŒ Ù‡Ù…Ø¯Ù„ÛŒ Ùˆ Ù¾Ø±Ø¯Ø§Ø²Ø´ Ø¯Ø±ÙˆÙ†ÛŒ Ø§Ø´Ø§Ø±Ù‡ Ú©Ù†Ø¯.",
};

const modalityThemes: Record<AstroModality, string> = {
  cardinal: "Ú©ÛŒÙÛŒØª Ø¢ØºØ§Ø²Ú¯Ø± Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨Ù‡ Ù…ÛŒÙ„ Ø¨Ù‡ Ø´Ø±ÙˆØ¹ Ú©Ø±Ø¯Ù†ØŒ Ø¬Ù‡Øª Ø¯Ø§Ø¯Ù† Ùˆ Ø­Ø±Ú©Øª Ø¯Ø§Ø¯Ù† ÙØ¶Ø§ Ø§Ø´Ø§Ø±Ù‡ Ú©Ù†Ø¯.",
  fixed: "Ú©ÛŒÙÛŒØª Ø«Ø§Ø¨Øª Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨Ù‡ Ù¾Ø§ÛŒØ¯Ø§Ø±ÛŒØŒ ØªÙ…Ø±Ú©Ø²ØŒ Ù…Ù‚Ø§ÙˆÙ…Øª Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± ØªØºÛŒÛŒØ± Ùˆ Ø­ÙØ¸ Ø§Ù†Ø±Ú˜ÛŒ Ø§Ø´Ø§Ø±Ù‡ Ú©Ù†Ø¯.",
  mutable: "Ú©ÛŒÙÛŒØª Ù…Ù†Ø¹Ø·Ù Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨Ù‡ Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒØŒ ØªØºÛŒÛŒØ± Ø²Ø§ÙˆÛŒÙ‡ Ø¯ÛŒØ¯ Ùˆ Ø­Ø±Ú©Øª Ù…ÛŒØ§Ù† Ú†Ù†Ø¯ Ø­Ø§Ù„Øª Ø§Ø´Ø§Ø±Ù‡ Ú©Ù†Ø¯.",
};

function getChartSigns(chart: EngineChartInput): ZodiacSymbolProfile[] {
  return Object.values(chart)
    .filter((signKey): signKey is NonNullable<typeof signKey> => Boolean(signKey))
    .map((signKey) => zodiacKnowledge[signKey]);
}

function makePointInsight(
  point: EngineChartPoint,
  signKey: NonNullable<EngineChartInput[EngineChartPoint]>,
): EngineInsight {
  const sign = zodiacKnowledge[signKey];
  const pointLabel = chartPointLabels[point];

  return {
    id: `engine-v0-${point}-${sign.key}`,
    category: pointCategories[point],
    tone: "reflective",
    title: `${pointLabel} Ø¯Ø± ${sign.faName}`,
    summary: `${pointLabel} Ø¯Ø± ${sign.faName} Ø¨Ù‡ Ø´Ú©Ù„ Ù†Ù…Ø§Ø¯ÛŒÙ† Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø§ÛŒÙ† Ø§Ù„Ú¯Ùˆ Ø±Ø§ Ù¾Ø±Ø±Ù†Ú¯ Ú©Ù†Ø¯: ${sign.symbolicSummary} Ø§ÛŒÙ† Ø¨Ø±Ø¯Ø§Ø´Øª Ù‚Ø·Ø¹ÛŒ ÛŒØ§ Ø¹Ù„Ù…ÛŒ Ù†ÛŒØ³Øª Ùˆ Ø¨ÛŒØ´ØªØ± Ø¨Ø±Ø§ÛŒ Ø®ÙˆØ¯Ø´Ù†Ø§Ø³ÛŒ ØªÙØ³ÛŒØ±ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.`,
    keywords: sign.keywords,
    weight: pointWeights[point],
    source: {
      point,
      sign: sign.key,
      rule: "point-in-sign",
    },
  };
}

function findDominantElement(signs: ZodiacSymbolProfile[]): AstroElement | null {
  const counts: Record<AstroElement, number> = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0,
  };

  for (const sign of signs) {
    counts[sign.element] += 1;
  }

  const [dominantElement] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];

  return (dominantElement as AstroElement | undefined) ?? null;
}

function findDominantModality(signs: ZodiacSymbolProfile[]): AstroModality | null {
  const counts: Record<AstroModality, number> = {
    cardinal: 0,
    fixed: 0,
    mutable: 0,
  };

  for (const sign of signs) {
    counts[sign.modality] += 1;
  }

  const [dominantModality] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];

  return (dominantModality as AstroModality | undefined) ?? null;
}

function makeElementBalanceInsight(chart: EngineChartInput): EngineInsight | null {
  const signs = getChartSigns(chart);

  if (signs.length === 0) {
    return null;
  }

  const dominantElement = findDominantElement(signs);

  if (!dominantElement) {
    return null;
  }

  return {
    id: `engine-v0-balance-element-${dominantElement}`,
    category: "balance",
    tone: "supportive",
    title: `ØªØ£Ú©ÛŒØ¯ Ø¹Ù†ØµØ± ${elementLabels[dominantElement]}`,
    summary: `${elementThemes[dominantElement]} Ø§ÛŒÙ† ÙÙ‚Ø· ÛŒÚ© Ø¬Ù…Ø¹â€ŒØ¨Ù†Ø¯ÛŒ Ù†Ù…Ø§Ø¯ÛŒÙ† Ø§Ø² Ú†Ù†Ø¯ Ù†Ù‚Ø·Ù‡ Ø§ØµÙ„ÛŒ Ú†Ø§Ø±Øª Ø§Ø³ØªØŒ Ù†Ù‡ Ù†ØªÛŒØ¬Ù‡â€ŒÚ¯ÛŒØ±ÛŒ Ù‚Ø·Ø¹ÛŒ Ø¯Ø±Ø¨Ø§Ø±Ù‡ Ø´Ø®ØµÛŒØª.`,
    keywords: [elementLabels[dominantElement], "ØªØ¹Ø§Ø¯Ù„", "Ø§Ù„Ú¯ÙˆÛŒ ØºØ§Ù„Ø¨"],
    weight: 60,
    source: {
      rule: "dominant-element",
    },
  };
}

function makeModalityBalanceInsight(chart: EngineChartInput): EngineInsight | null {
  const signs = getChartSigns(chart);

  if (signs.length === 0) {
    return null;
  }

  const dominantModality = findDominantModality(signs);

  if (!dominantModality) {
    return null;
  }

  return {
    id: `engine-v0-balance-modality-${dominantModality}`,
    category: "growth",
    tone: "reflective",
    title: `Ú©ÛŒÙÛŒØª ${modalityLabels[dominantModality]}`,
    summary: `${modalityThemes[dominantModality]} Ø§ÛŒÙ† Ù…ØªÙ† Ø¨Ø±Ø§ÛŒ Ù†Ú¯Ø§Ù‡ ØªÙØ³ÛŒØ±ÛŒ Ùˆ Ù†Ù…Ø§Ø¯ÛŒÙ† Ø§Ø³Øª Ùˆ Ù†Ø¨Ø§ÛŒØ¯ Ø¨Ù‡ Ø¹Ù†ÙˆØ§Ù† Ù¾ÛŒØ´â€ŒØ¨ÛŒÙ†ÛŒ ÛŒØ§ Ø­Ú©Ù… Ù‚Ø·Ø¹ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ø´ÙˆØ¯.`,
    keywords: [modalityLabels[dominantModality], "Ø±ÛŒØªÙ…", "Ø§Ù„Ú¯ÙˆÛŒ Ø±ÙØªØ§Ø±ÛŒ"],
    weight: 50,
    source: {
      rule: "dominant-modality",
    },
  };
}

export function generateStructuredInsights(chart: EngineChartInput): EngineInsight[] {
  const pointInsights = (Object.entries(chart) as Array<
    [EngineChartPoint, EngineChartInput[EngineChartPoint]]
  >)
    .filter((entry): entry is [EngineChartPoint, NonNullable<EngineChartInput[EngineChartPoint]>] =>
      Boolean(entry[1]),
    )
    .map(([point, signKey]) => makePointInsight(point, signKey));

  const balanceInsights = [
    makeElementBalanceInsight(chart),
    makeModalityBalanceInsight(chart),
  ].filter((insight): insight is EngineInsight => Boolean(insight));

  return [...pointInsights, ...balanceInsights].sort((a, b) => b.weight - a.weight);
}

export function generateEngineResult(chart: EngineChartInput): EngineResult {
  return {
    version: "engine-v0",
    generatedAt: new Date().toISOString(),
    insights: generateStructuredInsights(chart),
    safetyNote:
      "Ø§ÛŒÙ† Ø®Ø±ÙˆØ¬ÛŒ ÛŒÚ© Ø¨Ø±Ø¯Ø§Ø´Øª Ù†Ù…Ø§Ø¯ÛŒÙ† Ùˆ ØªÙØ³ÛŒØ±ÛŒ Ø§Ø² Ú†Ø§Ø±Øª Ø§Ø³Øª Ùˆ Ù†Ø¨Ø§ÛŒØ¯ Ø¨Ù‡ Ø¹Ù†ÙˆØ§Ù† Ø­Ù‚ÛŒÙ‚Øª Ø¹Ù„Ù…ÛŒØŒ Ù¾ÛŒØ´â€ŒØ¨ÛŒÙ†ÛŒ Ù‚Ø·Ø¹ÛŒ ÛŒØ§ ØªÙˆØµÛŒÙ‡ Ù¾Ø²Ø´Ú©ÛŒØŒ Ø­Ù‚ÙˆÙ‚ÛŒ Ùˆ Ù…Ø§Ù„ÛŒ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´ÙˆØ¯.",
  };
}
