// HALLEUS_DEEP_NARRATIVE_SLICE4_PERSONAL_TRANSIT_SYNTHESIS_R1_20260902
import type { BehavioralAudienceMode } from "@/lib/astrology/report-behavioral-interpretation";
import type {
  NatalToTransitAspectId,
  NatalToTransitBodyId,
} from "@/src/lib/chart/natal-to-transit-contract";
import type { ZodiacKey } from "@/types/astro";
import { ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";
import {
  buildReportAspectGeometryFacts,
  formatReportNarrativeAngle,
  formatReportReferenceAngle,
  formatReportTechnicalAngle,
} from "@/lib/astrology/report-aspect-display";
import {
  buildPersonalTransitNarrativeSemanticUnit,
  type PersonalTransitNarrativeSemanticUnit,
} from "@/src/lib/report-output/personal-transit-narrative-semantic-matrix";

export const PERSONAL_TRANSIT_RELEVANCE_VERSION =
  "v0.1.321-personal-transit-relevance" as const;

const PERSONAL_BODIES = new Set<NatalToTransitBodyId>([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
]);

const OUTER_BODIES = new Set<NatalToTransitBodyId>([
  "uranus",
  "neptune",
  "pluto",
]);

export type PersonalTransitAspectLike = {
  id: string;
  aspect: NatalToTransitAspectId;
  transitBody: NatalToTransitBodyId;
  natalBody: NatalToTransitBodyId;
  orb: number;
  orbLimit: number;
  exactAngle?: number;
  separation?: number;
};

export type PersonalTransitSelectionContext = {
  audienceMode?: BehavioralAudienceMode;
  chartRulerId?: string | null;
  angularNatalBodyIds?: string[];
  activeNatalBodyIds?: string[];
  natalHouseByBody?: Partial<Record<NatalToTransitBodyId, number | null>>;
  maxVisible?: number;
};

export type PersonalTransitNatalNarrativeContext = {
  houseNumber?: number | null;
  signId?: string | null;
  retrograde?: boolean;
};

export type PersonalTransitBehavioralInterpretation = {
  theme: string;
  attention: string;
  scenario: string;
  helpful: string;
  friction: string;
  action: string;
  technicalDetail: string;
};

export function selectPersonalTransitHighlights<
  TAspect extends PersonalTransitAspectLike,
>(
  aspects: readonly TAspect[],
  context: PersonalTransitSelectionContext = {},
): TAspect[] {
  const maxVisible = clampVisibleCount(context.maxVisible ?? 5);
  const chartRulerId = context.chartRulerId ?? null;
  const angularBodies = new Set(context.angularNatalBodyIds ?? []);
  const activeBodies = new Set(context.activeNatalBodyIds ?? []);
  const candidates = dedupeAspects(aspects).map((aspect, index) => ({
    aspect,
    index,
    baseScore: scoreTransitAspect(aspect, {
      chartRulerId,
      angularBodies,
      activeBodies,
    }),
  }));
  const selected: TAspect[] = [];
  const natalCounts = new Map<string, number>();
  const transitCounts = new Map<string, number>();
  let outerOnlyCount = 0;

  while (selected.length < maxVisible && candidates.length > 0) {
    let bestIndex = -1;
    let bestAdjustedScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const aspect = candidate.aspect;
      const outerOnly = isOuterOnly(aspect);

      if (outerOnly && outerOnlyCount >= 1 && hasNonOuterCandidate(candidates, index)) {
        continue;
      }

      if (
        (natalCounts.get(aspect.natalBody) ?? 0) >= 2 &&
        hasNatalDiversityCandidate(candidates, index, natalCounts)
      ) {
        continue;
      }

      const repeatedNatalPenalty = (natalCounts.get(aspect.natalBody) ?? 0) * 42;
      const repeatedTransitPenalty = (transitCounts.get(aspect.transitBody) ?? 0) * 12;
      const adjustedScore =
        candidate.baseScore - repeatedNatalPenalty - repeatedTransitPenalty;

      if (
        adjustedScore > bestAdjustedScore ||
        (adjustedScore === bestAdjustedScore &&
          compareTransitAspects(candidate, candidates[bestIndex]) < 0)
      ) {
        bestIndex = index;
        bestAdjustedScore = adjustedScore;
      }
    }

    if (bestIndex < 0) {
      break;
    }

    const [chosen] = candidates.splice(bestIndex, 1);
    selected.push(chosen.aspect);
    natalCounts.set(
      chosen.aspect.natalBody,
      (natalCounts.get(chosen.aspect.natalBody) ?? 0) + 1,
    );
    transitCounts.set(
      chosen.aspect.transitBody,
      (transitCounts.get(chosen.aspect.transitBody) ?? 0) + 1,
    );

    if (isOuterOnly(chosen.aspect)) {
      outerOnlyCount += 1;
    }
  }

  return selected;
}

export function scorePersonalTransitRelevance(
  aspect: PersonalTransitAspectLike,
  context: PersonalTransitSelectionContext = {},
): number {
  return scoreTransitAspect(aspect, {
    chartRulerId: context.chartRulerId ?? null,
    angularBodies: new Set(context.angularNatalBodyIds ?? []),
    activeBodies: new Set(context.activeNatalBodyIds ?? []),
  });
}
function normalizeTransitNarrativeContext(
  value: number | null | PersonalTransitNatalNarrativeContext | undefined,
): PersonalTransitNatalNarrativeContext {
  if (typeof value === "number") return { houseNumber: value };
  return value ?? {};
}

function isZodiacKey(value: string | null | undefined): value is ZodiacKey {
  return Boolean(value && Object.prototype.hasOwnProperty.call(ZODIAC_LABELS, value));
}

function formatNatalContext(
  unit: PersonalTransitNarrativeSemanticUnit,
  context: PersonalTransitNatalNarrativeContext,
): string {
  const parts: string[] = [];
  if (isZodiacKey(context.signId)) parts.push(`در ${ZODIAC_LABELS[context.signId].faName}`);
  if (typeof context.houseNumber === "number" && context.houseNumber >= 1 && context.houseNumber <= 12) {
    parts.push(`خانهٔ ${context.houseNumber.toLocaleString("fa-IR", { useGrouping: false })}`);
  }
  if (unit.natalRetrograde) parts.push("پس‌رو");
  return parts.length > 0 ? `؛ ${unit.natalLabel} تولدی که ${parts.join(" و ")} ثبت شده` : "";
}

function buildTransitFactLead(
  aspect: PersonalTransitAspectLike,
  unit: PersonalTransitNarrativeSemanticUnit,
  context: PersonalTransitNatalNarrativeContext,
): string {
  const geometry = buildReportAspectGeometryFacts({
    aspectId: aspect.aspect,
    referenceAngle: aspect.exactAngle,
    separation: aspect.separation,
    distanceFromExact: aspect.orb,
  });
  const contextText = formatNatalContext(unit, context);
  const actual = geometry.actualSeparation === null ? null : formatReportNarrativeAngle(geometry.actualSeparation);
  const fact = actual
    ? `${unit.transitLabel} ترنزیتی با زاویهٔ واقعی ${actual} به ${unit.natalLabel} تولدت رسیده${contextText}`
    : `در این snapshot، تماس ${unit.transitLabel} ترنزیتی با ${unit.natalLabel} تولدت ثبت شده${contextText}`;
  switch (unit.surfaceFamily) {
    case 1:
      return `${fact}. ${unit.thesis}`;
    case 2:
      return `${unit.thesis} ${fact}.`;
    case 3:
      return `${fact}؛ اینجا مسئله فقط حضور دو سیاره نیست: ${unit.thesis}`;
    case 4:
      return `${fact}. از نظر روایی، ${unit.thesis}`;
    default:
      return `${fact}؛ ${unit.thesis}`;
  }
}

function buildTransitScenario(
  unit: PersonalTransitNarrativeSemanticUnit,
  houseNumber: number | null | undefined,
): string {
  const houseScenario =
    typeof houseNumber === "number" ? NATAL_HOUSE_SCENARIO_FA[houseNumber] : undefined;
  const scene = houseScenario ? `${unit.scenario}، به‌ویژه در ${houseScenario}` : unit.scenario;
  const sentences = [
    `این تماس می‌تواند در ${scene} پررنگ‌تر شود.`,
    `در بازهٔ ثبت‌شده، ${scene} یکی از میدان‌هایی است که این تماس می‌تواند در آن بیشتر به چشم بیاید.`,
    `${scene} می‌تواند یکی از صحنه‌های روزمرهٔ این تماس باشد.`,
    `اثر این تماس ممکن است زودتر در ${scene} دیده شود.`,
    `برای فهمیدن این تماس در زندگی روزمره، ${scene} نشانهٔ عملی‌تری از یک پیش‌بینی کلی است.`,
  ];
  return `${sentences[unit.surfaceFamily]} ${unit.aspectMechanism}`;
}

function buildTransitHelpful(unit: PersonalTransitNarrativeSemanticUnit): string {
  const leads = [
    "مسیر سازندهٔ این تماس",
    "ظرفیت قابل استفادهٔ این تماس",
    "اگر این انرژی آگاهانه هدایت شود",
    "وجه پخته‌تر این تماس",
    "بخش مفید این تماس",
  ];
  return `${leads[unit.surfaceFamily]} این است که ${unit.constructiveSynthesis}`;
}

function buildTransitFriction(unit: PersonalTransitNarrativeSemanticUnit): string {
  const leads = [
    "گیر اصلی زمانی شکل می‌گیرد که",
    "زیر فشار، خطر اینجاست که",
    "بخش دشوار تماس می‌تواند این باشد که",
    "اگر واکنش از انتخاب جلو بزند،",
    "سمت سایهٔ این تماس زمانی دیده می‌شود که",
  ];
  return `${leads[unit.surfaceFamily]} ${unit.frictionSynthesis}`;
}

function buildTransitTechnicalDetail(aspect: PersonalTransitAspectLike): string {
  const facts = buildReportAspectGeometryFacts({
    aspectId: aspect.aspect,
    referenceAngle: aspect.exactAngle,
    separation: aspect.separation,
    distanceFromExact: aspect.orb,
  });
  const reference = formatReportReferenceAngle(facts.referenceAngle);
  const distance = formatReportTechnicalAngle(aspect.orb);
  const limit = formatReportTechnicalAngle(aspect.orbLimit);
  if (facts.actualSeparation !== null) {
    return `${facts.symbol} زاویهٔ مرجع ${reference} · زاویهٔ واقعی ${formatReportTechnicalAngle(facts.actualSeparation)} · فاصله از دقیق ${distance} · سقف انتخاب ${limit}؛ این هندسه شدت یا نزدیکی تماس را نشان می‌دهد، نه قطعیت یک رویداد انسانی.`;
  }
  return `${facts.symbol} زاویهٔ مرجع ${reference} · فاصلهٔ ثبت‌شده ${distance} · سقف انتخاب ${limit}؛ زاویهٔ واقعی در snapshot قدیمی ذخیره نشده و از روی این فاصله بازسازی نمی‌شود.`;
}

export function buildPersonalTransitBehavioralInterpretation(
  aspect: PersonalTransitAspectLike,
  audienceMode: BehavioralAudienceMode = "adult",
  natalContextInput: number | null | PersonalTransitNatalNarrativeContext = null,
): PersonalTransitBehavioralInterpretation {
  const context = normalizeTransitNarrativeContext(natalContextInput);
  const unit = buildPersonalTransitNarrativeSemanticUnit({
    transitBody: aspect.transitBody,
    natalBody: aspect.natalBody,
    aspect: aspect.aspect,
    audienceMode,
    natalRetrograde: context.retrograde === true,
  });
  return {
    theme: unit.theme,
    attention: buildTransitFactLead(aspect, unit, context),
    scenario: buildTransitScenario(unit, context.houseNumber),
    helpful: buildTransitHelpful(unit),
    friction: buildTransitFriction(unit),
    action: audienceMode === "caregiver" ? unit.caregiverAction : unit.action,
    technicalDetail: buildTransitTechnicalDetail(aspect),
  };
}



function scoreTransitAspect(
  aspect: PersonalTransitAspectLike,
  context: {
    chartRulerId: string | null;
    angularBodies: Set<string>;
    activeBodies: Set<string>;
  },
): number {
  const orbRatio =
    aspect.orbLimit > 0
      ? Math.max(0, Math.min(1, 1 - aspect.orb / aspect.orbLimit))
      : 0;
  const luminaryScore =
    aspect.natalBody === "sun" || aspect.natalBody === "moon" ? 120 : 0;
  const rulerScore = aspect.natalBody === context.chartRulerId ? 92 : 0;
  const personalNatalScore = PERSONAL_BODIES.has(aspect.natalBody) ? 58 : 0;
  const personalTransitScore = PERSONAL_BODIES.has(aspect.transitBody) ? 18 : 0;
  const angularScore = context.angularBodies.has(aspect.natalBody) ? 34 : 0;
  const activeScore = context.activeBodies.has(aspect.natalBody) ? 24 : 0;
  const dynamicScore = getDynamicScore(aspect.aspect);
  const closenessScore = orbRatio * 50;
  const outerPenalty = isOuterOnly(aspect) ? 135 : 0;

  return (
    luminaryScore +
    rulerScore +
    personalNatalScore +
    personalTransitScore +
    angularScore +
    activeScore +
    dynamicScore +
    closenessScore -
    outerPenalty
  );
}

function getDynamicScore(aspect: NatalToTransitAspectId): number {
  if (aspect === "square" || aspect === "opposition") {
    return 24;
  }

  if (aspect === "conjunction") {
    return 20;
  }

  if (aspect === "trine") {
    return 13;
  }

  return 10;
}

const NATAL_HOUSE_SCENARIO_FA: Partial<Record<number, string>> = {
  1: "شروع، بدن یا موقعیتی که باید جای خودت را روشن کنی",
  2: "خرج، منابع یا تصمیمی درباره امنیت شخصی",
  3: "پیام، گفت‌وگو، یادگیری یا تصمیم روزمره",
  4: "خانه، خانواده یا نیاز به فضای خصوصی",
  5: "خلاقیت، بازی یا چیزی که می‌خواهی نشان بدهی",
  6: "برنامه روزانه، کار تکراری یا مراقبت از بدن",
  7: "رابطه نزدیک، همکاری یا مذاکره مستقیم",
  8: "اعتماد، آسیب‌پذیری یا یک مسئولیت و منبع مشترک",
  9: "یادگیری، سفر، باور یا دیدگاهی که لازم است دوباره سنجیده شود",
  10: "مسئولیت دیده‌شده، تحویل کار یا تصمیم درباره جهت عمومی",
  11: "دوستی، جمع یا برنامه‌ای که با دیگران می‌سازی",
  12: "استراحت، خلوت یا زمانی که قبل از پاسخ به پردازش خصوصی نیاز داری",
};

// HALLEUS_PERSONAL_TRANSIT_NATAL_HOUSE_CONTEXT_20260808

function dedupeAspects<TAspect extends PersonalTransitAspectLike>(
  aspects: readonly TAspect[],
): TAspect[] {
  const seen = new Set<string>();
  const output: TAspect[] = [];

  for (const aspect of aspects) {
    if (seen.has(aspect.id)) {
      continue;
    }

    seen.add(aspect.id);
    output.push(aspect);
  }

  return output;
}

function isOuterOnly(aspect: PersonalTransitAspectLike): boolean {
  return OUTER_BODIES.has(aspect.transitBody) && OUTER_BODIES.has(aspect.natalBody);
}

function hasNonOuterCandidate<TAspect extends PersonalTransitAspectLike>(
  candidates: Array<{ aspect: TAspect }>,
  excludedIndex: number,
): boolean {
  return candidates.some(
    (candidate, index) => index !== excludedIndex && !isOuterOnly(candidate.aspect),
  );
}

function hasNatalDiversityCandidate<
  TAspect extends PersonalTransitAspectLike,
>(
  candidates: Array<{ aspect: TAspect }>,
  excludedIndex: number,
  natalCounts: Map<string, number>,
): boolean {
  return candidates.some(
    (candidate, index) =>
      index !== excludedIndex &&
      (natalCounts.get(candidate.aspect.natalBody) ?? 0) < 2,
  );
}

function compareTransitAspects<
  TAspect extends PersonalTransitAspectLike,
>(
  left: { aspect: TAspect; index: number } | undefined,
  right: { aspect: TAspect; index: number } | undefined,
): number {
  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  if (left.aspect.orb !== right.aspect.orb) {
    return left.aspect.orb - right.aspect.orb;
  }

  return left.index - right.index;
}

function clampVisibleCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 5;
  }

  return Math.max(3, Math.min(5, Math.trunc(value)));
}
