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
  fire: "انرژی آتشی می‌تواند در زبان نمادین به حرکت، شروع، شهامت و بیان مستقیم اشاره کند.",
  earth: "انرژی خاکی می‌تواند در زبان نمادین به ثبات، بدن، عمل‌گرایی و نیاز به امنیت اشاره کند.",
  air: "انرژی هوایی می‌تواند در زبان نمادین به فکر، ارتباط، مشاهده و جابه‌جایی ذهنی اشاره کند.",
  water: "انرژی آبی می‌تواند در زبان نمادین به احساس، حافظه، همدلی و پردازش درونی اشاره کند.",
};

const modalityThemes: Record<AstroModality, string> = {
  cardinal: "کیفیت آغازگر می‌تواند به میل به شروع کردن، جهت دادن و حرکت دادن فضا اشاره کند.",
  fixed: "کیفیت ثابت می‌تواند به پایداری، تمرکز، مقاومت در برابر تغییر و حفظ انرژی اشاره کند.",
  mutable: "کیفیت منعطف می‌تواند به سازگاری، تغییر زاویه دید و حرکت میان چند حالت اشاره کند.",
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
    title: `${pointLabel} در ${sign.faName}`,
    summary: `${pointLabel} در ${sign.faName} به شکل نمادین می‌تواند این الگو را پررنگ کند: ${sign.symbolicSummary} این برداشت قطعی یا علمی نیست و بیشتر برای خودشناسی تفسیری استفاده می‌شود.`,
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
    title: `تأکید عنصر ${elementLabels[dominantElement]}`,
    summary: `${elementThemes[dominantElement]} این فقط یک جمع‌بندی نمادین از چند نقطه اصلی چارت است، نه نتیجه‌گیری قطعی درباره شخصیت.`,
    keywords: [elementLabels[dominantElement], "تعادل", "الگوی غالب"],
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
    title: `کیفیت ${modalityLabels[dominantModality]}`,
    summary: `${modalityThemes[dominantModality]} این متن برای نگاه تفسیری و نمادین است و نباید به عنوان پیش‌بینی یا حکم قطعی خوانده شود.`,
    keywords: [modalityLabels[dominantModality], "ریتم", "الگوی رفتاری"],
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
      "این خروجی یک برداشت نمادین و تفسیری از چارت است و نباید به عنوان حقیقت علمی، پیش‌بینی قطعی یا توصیه پزشکی، حقوقی و مالی استفاده شود.",
  };
}
