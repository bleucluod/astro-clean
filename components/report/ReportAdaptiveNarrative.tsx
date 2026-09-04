// HALLEUS_REPORT_MANUAL_MOBILE_REVIEW_REFINEMENT_R3_20260904
// HALLEUS_REPORT_APP_LIKE_MOBILE_R1_20260903
// HALLEUS_REPORT_EDITORIAL_COHESION_SLICE_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_FRESH_VISUAL_FAILURESET_REPAIR_R6_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_FINAL_VISUAL_LANGUAGE_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_FAILURESET_REPAIR_R7_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_FAILURESET_RECONCILIATION_R2_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_WHOLE_REPORT_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE2_FAILURESET_RECONCILIATION_R3_20260902
// HALLEUS_DEEP_NARRATIVE_SLICE1_R5_FAILURESET_RECONCILIATION_20260902
// HALLEUS_DEEP_NARRATIVE_SLICE1_EXACT_ANGLE_FACT_CONTRACT_R4_20260902
// HALLEUS_R39_NARRATIVE_RECOMPOSITION_EVIDENCE_HYGIENE_R3_20260902
// HALLEUS_R39_OPENING_SINGLE_OWNER_COMPAT_R3_20260902
// HALLEUS_R39_NARRATIVE_RECOMPOSITION_EVIDENCE_HYGIENE_R1_20260902
"use client";

import type { ReactNode } from "react";

import { useMemo } from "react";
import {
  assertAdaptiveAnchorIntegrity,
  buildAdaptiveReportPlan,
  normalizeAdaptiveActionKey,
  type AdaptiveNarrativeAnchor,
  type AdaptiveNarrativeEvidence,
  type AdaptivePlacementStory,
} from "@/lib/astrology/adaptive-report-planner";
import { ProductLockedOffer } from "@/components/monetization/ProductAccessCards";
import {
  DEFAULT_REPORT_ACCESS_POLICY,
  getPlanetChapterAccess,
  isReportSectionFull,
  isReportSectionTeaser,
  type ReportAccessPolicy,
} from "@/lib/monetization/access-policy";
import type { AstrologyReport } from "@/types/astro";
import {
  formatReportNarrativeAspectGeometry,
} from "@/lib/astrology/report-aspect-display";

import { ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";
import {
  joinReportNarrativeSentences,
  realizeReportSurfaceText,
} from "@/lib/astrology/report-surface-language-planner";
import styles from "./human-first-report.module.css";

export type BirthReportAccessMode = "free" | "premium";

const PLANET_SYMBOLS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  asc: "ASC",
};

function splitAstrologyHeadline(value: string) {
  const separator = " — ";
  const at = value.indexOf(separator);
  if (at < 0) return { astrology: value, human: value };
  return {
    astrology: value.slice(0, at),
    human: value.slice(at + separator.length),
  };
}


function reportSurfaceKey(report: AstrologyReport): string {
  return report.id || [
    report.input.name ?? "report",
    report.input.birthDate ?? "date",
    report.input.birthTime ?? "time",
  ].join(":");
}

function surfaceNarrativeText(
  reportKey: string,
  semanticKey: string,
  purpose: "thesis" | "scene" | "strength" | "friction" | "development",
  text: string,
  sequenceIndex = 0,
): string {
  return realizeReportSurfaceText(text, {
    reportKey,
    semanticKey,
    purpose,
    sequenceIndex,
    presentation: "direct",
  }).text;
}

function surfacePlacementStory(
  story: AdaptivePlacementStory,
  reportKey: string,
  sequenceIndex: number,
): AdaptivePlacementStory {
  const semanticKey = [
    "placement",
    story.planetId,
    story.signId,
    story.houseNumber ?? "unknown-house",
    story.retrograde ? "retrograde" : "direct",
  ].join(":");
  return {
    ...story,
    interpretation: {
      ...story.interpretation,
      plainMeaning: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${semanticKey}:thesis`, "thesis", story.interpretation.plainMeaning, sequenceIndex)),
      dailyLifeExample: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${semanticKey}:scene`, "scene", story.interpretation.dailyLifeExample, sequenceIndex)),
      healthyExpression: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${semanticKey}:strength`, "strength", story.interpretation.healthyExpression, sequenceIndex)),
      possibleFriction: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${semanticKey}:friction`, "friction", story.interpretation.possibleFriction, sequenceIndex)),
    },
  };
}

function surfaceTopStory(
  story: AdaptiveNarrativeAnchor,
  reportKey: string,
  sequenceIndex: number,
): AdaptiveNarrativeAnchor {
  return {
    ...story,
    summary: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${story.semanticKey}:thesis`, "thesis", story.summary, sequenceIndex)),
    dailyLife: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${story.semanticKey}:scene`, "scene", story.dailyLife, sequenceIndex)),
    healthyExpression: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${story.semanticKey}:strength`, "strength", story.healthyExpression, sequenceIndex)),
    friction: naturalizeNarrativeText(surfaceNarrativeText(reportKey, `${story.semanticKey}:friction`, "friction", story.friction, sequenceIndex)),
  };
}

type Props = {
  report: AstrologyReport;
  accessMode?: BirthReportAccessMode;
  accessPolicy?: ReportAccessPolicy;
  fullReportCredits?: number;
  onUnlockFullReport?: () => Promise<{ ok: boolean; error?: string }>;
  renderOverview?: boolean;
};

// HALLEUS_R39_OPENING_EVIDENCE_HYGIENE_R1_20260902
export function isUserFacingEvidenceReason(reason: string) {
  const value = reason.trim();
  if (!value) return false;
  if (
    /مالک روایی|تم مشترک|داستان موجود.*ادغام|سطح قطعیت روایت/u.test(value)
  ) {
    return false;
  }
  if (
    /(?:advanced|evidence|score|standalone|merge|support|suppress|innovation|community|freedom)/iu.test(
      value,
    )
  ) {
    return false;
  }
  if (/[A-Za-z]{3,}/u.test(value)) return false;
  return true;
}

function compactEvidenceText(value: string, maxClauses: number): string {
  return value
    .split("؛")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, maxClauses)
    .join("؛ ");
}

function InlineEvidence({
  evidence,
  reasons = [],
  compact = false,
  maxItems,
}: {
  evidence: AdaptiveNarrativeEvidence[];
  reasons?: string[];
  compact?: boolean;
  maxItems?: number;
}) {
  const filteredReasons = reasons.filter(isUserFacingEvidenceReason);
  const filteredEvidence = evidence.filter(
    (item) => item.label.trim().length > 0 || item.detail.trim().length > 0,
  );
  const itemLimit = maxItems ?? (compact ? 1 : 3);
  const fragments = [
    ...filteredReasons.map((reason) => compactEvidenceText(reason, 1)),
    ...filteredEvidence.map((item) =>
      compactEvidenceText(
        [item.label.trim(), item.detail.trim()].filter(Boolean).join("؛ "),
        1,
      ),
    ),
  ].filter(Boolean).slice(0, itemLimit);
  if (fragments.length === 0) return null;
  return (
    <details className={styles.adaptiveEvidence} data-adaptive-evidence>
      <summary>مبنای این برداشت</summary>
      <p data-report-inline-evidence>{joinReportNarrativeSentences(fragments)}</p>
    </details>
  );
}

const WEEKLY_FORECAST_LEADS = [
  "اگر همین موقعیت این هفته دوباره جلویت قرار گرفت،",
  "ممکن است در چند روز آینده نمونه‌ای از همین الگو را در یک تصمیم کوچک ببینی؛ اگر شد،",
  "اگر این هفته یک گفت‌وگو یا انتخاب این نقطه را فعال کرد،",
  "ممکن است همین هفته یک موقعیت معمولی این کشمکش را واضح‌تر کند؛ وقتی پیش آمد،",
  "اگر در روزهای پیش رو فشار یا فرصتی شبیه این صحنه ظاهر شد،",
  "این هفته ممکن است لحظه‌ای برسد که همین الگو از حالت نظری بیرون بیاید؛ آن‌وقت،",
  "اگر طی این هفته دیدی واکنش آشنای قبلی دارد برمی‌گردد،",
  "ممکن است یک پیام، قرار یا تصمیم در همین هفته این موضوع را زنده کند؛ اگر چنین شد،",
  "اگر این هفته موقعیتی پیش آمد که بین دو نیاز گیر کردی،",
  "در چند روز آینده ممکن است فرصت کوتاهی برای امتحان‌کردن شکل تازهٔ این رفتار باز شود؛ اگر رسید،",
  "اگر این هفته یک انتخاب کوچک بیش از حد مهم به نظر رسید،",
  "ممکن است همین هفته جایی لازم شود به‌جای واکنش فوری، شکل تازه‌ای از پاسخ را امتحان کنی؛ آن موقع،",
] as const;

function conditionalForecast(action: string, sequenceIndex: number): string {
  const value = toSecondPersonPlacementAction(action)
    .trim()
    .replace(/[.؟!]+$/u, "");
  if (!value) return "";
  return `${WEEKLY_FORECAST_LEADS[sequenceIndex % WEEKLY_FORECAST_LEADS.length]} ${value}.`;
}

function weeklyDomainForecast(action: string, sequenceIndex: number): string {
  const [rawDomain, ...rest] = action.split("—");
  const domain = rest.length > 0 ? rawDomain.trim() : "";
  const instruction = toSecondPersonPlacementAction(
    rest.length > 0 ? rest.join("—") : action,
  )
    .trim()
    .replace(/[.؟!]+$/u, "");
  const leads: Record<string, string> = {
    "احساس و رابطه": "ممکن است این هفته یک گفت‌وگو یا موقعیت عاطفی دوباره موضوع اعتماد و مرز را جلو بیاورد؛ اگر پیش آمد،",
    "روزمره و کار": "در کار یا برنامهٔ روزانه ممکن است این هفته یک ایده یا انتخاب تازه ناگهان جدی‌تر شود؛ اگر شد،",
    "هویت و تصمیم": "اگر این هفته یک انتخاب شخصی تو را بین ادامه‌دادن و عوض‌کردن مسیر نگه داشت،",
  };
  const fallback = WEEKLY_FORECAST_LEADS[(sequenceIndex + 5) % WEEKLY_FORECAST_LEADS.length];
  return `${leads[domain] ?? fallback} ${instruction}.`;
}

function mergeNarrative(...parts: Array<string | null | undefined | false>): string {
  return joinReportNarrativeSentences(parts);
}

const EDITORIAL_MAJOR_PLANET_IDS = new Set([
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

function naturalizeNarrativeText(value: string): string {
  return value
    .replace(
      /کارکرد ([^؛.!؟]+?) را در میدان ([^؛.!؟]+?) با ریتم [^؛.!؟]+ پیش می‌برد؛ نیاز سیاره و زمینه خانه در یک مسئله واحد جمع می‌شوند/gu,
      "$1 را به $2 پیوند می‌دهد",
    )
    .replace(/\s+و این حرکت بیشتر با ریتم [^.!؟]+ دیده می‌شود/gu, "")
    .replace(/\s+و این حرکت بیشتر با ریتم [^.!؟]+ خودش را نشان می‌دهد/gu, "")
    .replace(/\s+در چنین صحنه‌ای\s*/gu, " ")
    .replace(/\s{2,}/gu, " ")
    .replace(/\s+([،؛.!؟])/gu, "$1")
    .trim();
}

function splitNarrativeSentences(value: string): string[] {
  return naturalizeNarrativeText(value)
    .split(/(?<=[.!؟!])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function compactNarrativeUnit(value: string, sentenceLimit = 1): string {
  const sentences = splitNarrativeSentences(value);
  if (sentences.length <= sentenceLimit) return naturalizeNarrativeText(value);
  return sentences.slice(0, sentenceLimit).join(" ");
}

function compactNarrativeParts(
  parts: Array<string | null | undefined | false>,
  perPartSentenceLimit = 1,
): string {
  return joinReportNarrativeSentences(
    parts
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .map((part) => compactNarrativeUnit(part, perPartSentenceLimit)),
  );
}

function compactPlacementAction(value: string): string {
  const direct = toSecondPersonPlacementAction(value).trim();
  if (!direct) return "";
  return direct.split("؛")[0]?.trim() ?? direct;
}

function normalizeHouseReason(value: string): string {
  return value
    .replace(/^۱ سیاره اصلی در این خانه قرار دارند/u, "۱ سیاره اصلی در این خانه قرار دارد")
    .replace(/^1 سیاره اصلی در این خانه قرار دارند/u, "۱ سیاره اصلی در این خانه قرار دارد");
}

function editorialTopStoryScore(
  story: AdaptiveNarrativeAnchor,
  chartRulerId: string,
): number {
  const sourceIds = story.sourcePlanetIds.map((id) => id.toLowerCase());
  const majorCount = sourceIds.filter((id) => EDITORIAL_MAJOR_PLANET_IDS.has(id)).length;
  const allMajor = sourceIds.length > 0 && majorCount === sourceIds.length;
  const supplementaryOnly = sourceIds.length > 0 && majorCount === 0;
  let score = story.score;

  if (story.kind === "cluster") score += 28;
  if (story.sourceAspectIds.length > 0) score += 18;
  if (allMajor) score += 36;
  else score += majorCount * 12;
  if (sourceIds.includes(chartRulerId)) score += 18;
  if (sourceIds.includes("sun") || sourceIds.includes("moon")) score += 14;
  if (supplementaryOnly) score -= 42;

  return score;
}

function orderTopStoriesForReading(
  stories: AdaptiveNarrativeAnchor[],
  chartRulerId: string,
): AdaptiveNarrativeAnchor[] {
  return stories
    .map((story, index) => ({ story, index, score: editorialTopStoryScore(story, chartRulerId) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ story }) => story);
}

function toSecondPersonPlacementAction(value: string): string {
  const standalone = (token: string) =>
    new RegExp(`(?<![\\p{L}\\p{M}\\u200c])${token}(?![\\p{L}\\p{M}\\u200c])`, "gu");

  return value
    .replace(/نام ببرد/gu, "نام ببر")
    .replace(/انجام دهد/gu, "انجام بده")
    .replace(standalone("بگوید"), "بگو")
    .replace(standalone("بدهد"), "بده")
    .replace(standalone("بسازد"), "بساز")
    .replace(standalone("بنویسد"), "بنویس")
    .replace(standalone("بسنجد"), "بسنج")
    .replace(standalone("ببرد"), "ببر")
    .replace(standalone("کند"), "کن");
}

function completePlacementRole(
  value: string | null | undefined,
  role: "strength" | "friction" | "action",
): string {
  const text = value?.trim() ?? "";
  if (!text) return "";
  if (role === "action") return toSecondPersonPlacementAction(text);
  const tokenCount = text.split(/\s+/u).filter(Boolean).length;
  if (tokenCount > 8 || /[.؟!]$/u.test(text)) return text;
  if (role === "strength") return `بخش سازندهٔ این جایگاه بیشتر در ${text} دیده می‌شود`;
  return `در سوی دشوارتر، ${text} می‌تواند پررنگ شود`;
}

const HOUSE_HEADLINE_VARIANTS = [
  "به یکی از میدان‌های پررنگ این چارت تبدیل می‌شود",
  "به حوزه‌ای برجسته تبدیل می‌شود",
  "یکی از صحنه‌های فعال این چارت است",
] as const;

const HOUSE_SCENE_VARIANTS = [
  "در چنین صحنه‌ای بیش از یک نیاز می‌تواند سهم داشته باشد و تصمیم نهایی روی چند بخش تجربه اثر بگذارد",
  "این موقعیت معمولاً فقط یک انگیزه ندارد؛ چند خواسته با هم وارد انتخاب می‌شوند",
  "یک تصمیم ظاهراً ساده در این حوزه ممکن است هم‌زمان چند لایه از تجربه را تکان بدهد",
] as const;

const HOUSE_RHYTHM_VARIANTS = [
  ["ریتم غالب", "ریتم این حوزه"],
  ["ریتم غالب", "الگوی حرکت این خانه"],
  ["ریتم غالب", "در این میدان، ریتم"],
] as const;

const HOUSE_MATURITY_VARIANTS = [
  ["و نتیجه وقتی پخته‌تر می‌شود که", "و نتیجهٔ بهتر زمانی شکل می‌گیرد که"],
  ["و نتیجه وقتی پخته‌تر می‌شود که", "و این الگو زمانی قابل اتکاتر می‌شود که"],
  ["و نتیجه وقتی پخته‌تر می‌شود که", "و شکل پخته‌تر آن جایی دیده می‌شود که"],
] as const;

const ASPECT_FRICTION_VARIANTS = [
  "ممکن است بدون فاصلهٔ کافی پررنگ شود",
  "می‌تواند پیش از فرصت تنظیم خودش را نشان بدهد",
  "ممکن است زودتر از بازبینی کامل وارد واکنش شود",
  "می‌تواند قبل از اینکه فرصت سنجش داشته باشی جلو بیفتد",
  "ممکن است دامنهٔ بیشتری از چیزی که لازم است پیدا کند",
  "می‌تواند پیش از یک بازنگری آگاهانه پررنگ شود",
] as const;

function diversifyHouseSurfaceText(
  value: string,
  index: number,
  role: "headline" | "synthesis" | "scene",
): string {
  let text = value;
  if (role === "headline") {
    text = text.replace(
      "به یک میدان فعال تبدیل می‌شود",
      HOUSE_HEADLINE_VARIANTS[index % HOUSE_HEADLINE_VARIANTS.length],
    );
  }
  if (role === "synthesis") {
    for (const [source, replacement] of [
      HOUSE_RHYTHM_VARIANTS[index % HOUSE_RHYTHM_VARIANTS.length],
      HOUSE_MATURITY_VARIANTS[index % HOUSE_MATURITY_VARIANTS.length],
    ]) {
      text = text.replace(source, replacement);
    }
  }
  if (role === "scene") {
    text = text.replace(
      "معمولاً یک انگیزه تنها نیست؛ انتخاب اینجا می‌تواند هم‌زمان روی چند بخش تجربه اثر بگذارد",
      HOUSE_SCENE_VARIANTS[index % HOUSE_SCENE_VARIANTS.length],
    );
  }
  return text;
}

function diversifyAspectSurfaceText(value: string, index: number): string {
  return value.replace(
    "می‌تواند پیش از بازبینی کامل پررنگ شود",
    ASPECT_FRICTION_VARIANTS[index % ASPECT_FRICTION_VARIANTS.length],
  );
}

const ASPECT_PAIR_EDITORIAL_TITLES: Record<string, string> = {
  "jupiter:mercury": "جزئیات و تصویر بزرگ",
  "jupiter:mars": "جسارت با اندازهٔ قدم",
  "jupiter:venus": "اشتیاقی که باید اندازه‌اش روشن بماند",
  "mercury:saturn": "ایده‌ای که شکل قابل اجرا می‌گیرد",
  "pluto:uranus": "تغییری که باید هدف داشته باشد",
  "uranus:venus": "نزدیکی بدون خفه‌کردن آزادی",
};

function resolveAspectHumanTitle(
  story: AdaptiveOverviewPlan["importantAspects"][number],
  sequenceIndex: number,
): string {
  const human = splitAstrologyHeadline(story.title).human;
  const pairKey = [story.aspect.firstPlanetId, story.aspect.secondPlanetId]
    .map((id) => id.toLowerCase())
    .sort()
    .join(":");
  const pairTitle = ASPECT_PAIR_EDITORIAL_TITLES[pairKey];
  if (pairTitle) return pairTitle;
  if (human !== "دو نیرویی که همدیگر را تقویت می‌کنند") return human;
  const titlesByAspect: Record<string, readonly string[]> = {
    conjunction: [
      "دو نیرو که در یک نقطه جمع می‌شوند",
      "تمرکزی که می‌تواند خیلی زود پررنگ شود",
      "وقتی دو کارکرد در یک مسیر فشرده می‌شوند",
      "پیوندی که دو نیاز را هم‌زمان جلو می‌آورد",
      "جایی که دو کارکرد فاصلهٔ کمی از هم دارند",
      "تمرکزی که باید جهت روشن پیدا کند",
    ],
    sextile: [
      "فرصتی که با استفادهٔ آگاهانه فعال می‌شود",
      "دو ظرفیتی که راه همکاری دارند",
      "هماهنگی‌ای که به حرکت داوطلبانه نیاز دارد",
      "امکانی که با تمرین به نتیجه می‌رسد",
      "مسیر همکاری‌ای که باید عمداً به کار گرفته شود",
      "فرصتی نرم که با اقدام واقعی جان می‌گیرد",
    ],
    trine: [
      "جریانی که اگر به کار گرفته شود رشد می‌کند",
      "توانی که طبیعی‌تر از بقیه در دسترس است",
      "هماهنگی‌ای که می‌تواند به مهارت تبدیل شود",
      "مسیر روانی که به ساختار نیاز دارد",
      "استعدادی که با تکرار قابل اتکاتر می‌شود",
      "هماهنگی‌ای که باید به خروجی واقعی وصل شود",
    ],
    square: ["اصطکاکی که به تنظیم روش نیاز دارد"],
    opposition: ["دو قطبی که تعادل و مذاکره می‌خواهد"],
  };
  const options = titlesByAspect[story.aspect.aspectId] ?? [human];
  return options[sequenceIndex % options.length] ?? human;
}

function StoryCard({ story, index, showAction, compactEvidence }: { story: AdaptiveNarrativeAnchor; index: number; showAction: boolean; compactEvidence: boolean }) {
  const forecast = story.action && showAction ? conditionalForecast(story.action, index) : "";
  return (
    <article
      className={styles.adaptiveStoryCard}
      data-adaptive-anchor-id={story.anchorId}
      data-adaptive-anchor-kind={story.kind}
    >
      <span className={styles.adaptiveIndex}>{(index + 1).toLocaleString("fa-IR")}</span>
      <div className={styles.adaptiveStoryBody}>
        <h3>{story.title}</h3>
        {story.technicalLine ? (
          <p className={styles.adaptiveTechnicalLine} data-report-astrology-technical-line>
            {story.technicalLine}
          </p>
        ) : null}
        <p className={styles.adaptiveLead}>{compactNarrativeParts([story.summary, story.dailyLife], 1)}</p>
        <p>{compactNarrativeParts([story.healthyExpression, story.friction, forecast], 1)}</p>
        <InlineEvidence compact={compactEvidence} evidence={story.evidenceRefs} maxItems={compactEvidence ? 1 : 3} reasons={story.rankingReasons} />
      </div>
    </article>
  );
}

function PlacementCard({
  story,
  condensed = false,
  showAction = true,
}: {
  story: AdaptivePlacementStory;
  condensed?: boolean;
  showAction?: boolean;
}) {
  const { interpretation } = story;
  const firstParagraph = compactNarrativeParts(
    [interpretation.plainMeaning, interpretation.dailyLifeExample],
    1,
  );
  const secondParagraph = compactNarrativeParts(
    [
      !condensed && story.importance !== "compact"
        ? completePlacementRole(interpretation.healthyExpression, "strength")
        : "",
      !condensed && story.importance !== "compact"
        ? completePlacementRole(interpretation.possibleFriction, "friction")
        : "",
      interpretation.smallExperiment && showAction
        ? compactPlacementAction(interpretation.smallExperiment)
        : "",
    ],
    1,
  );
  return (
    <article className={styles.adaptivePlacementCard} data-adaptive-placement={story.planetId}>
      <header>
        <div>
          <h3>
            {`${PLANET_SYMBOLS[story.planetId] ?? ""} ${story.planetLabel}`.trim()} در {story.signLabel}
          </h3>
          <p>
            {story.houseNumber ? `خانه ${story.houseNumber.toLocaleString("fa-IR")}` : "بدون خانهٔ قابل اتکا"}
            {story.retrograde ? " · پس‌رو" : ""}
            {interpretation.focus ? ` · ${interpretation.focus}` : ""}
          </p>
        </div>
      </header>
      {firstParagraph ? <p className={styles.adaptiveLead}>{firstParagraph}</p> : null}
      {secondParagraph ? <p>{secondParagraph}</p> : null}
    </article>
  );
}
// HALLEUS_REPORT_CHARTWHEEL_HERO_ROADMAP_POLISH_20260830

type AdaptiveOverviewPlan = ReturnType<typeof buildAdaptiveReportPlan>;

type AdaptiveRoadmapItem = {
  targetId: string;
  label: string;
  detail: string;
  visible?: boolean;
};

function buildAdaptiveRoadmap(plan: AdaptiveOverviewPlan): AdaptiveRoadmapItem[] {
  return [
    {
      targetId: "report-chart-wheel",
      label: "نقشهٔ چارت",
      detail: "چرخ چارت، جایگاه‌ها و محورهای اصلی",
    },
    {
      targetId: "inner-world",
      label: "خورشید، ماه و رایزینگ",
      detail: "پایه‌های شخصی و سیاره‌های نزدیک",
      visible: plan.bigThree.length > 0,
    },
    {
      targetId: "deeper-layers",
      label: "لایه‌های تکمیلی",
      detail: "بقیهٔ سیاره‌ها در زندگی روزمره",
      visible: plan.placementStories.length > 0,
    },
    {
      targetId: "primary-patterns",
      label: "الگوهای اصلی",
      detail: "داستان‌هایی که بیشترین وزن را در چارت دارند",
      visible: plan.topStories.length > 0,
    },
    {
      targetId: "mind-language",
      label: "خانه‌های مهم",
      detail: "حوزه‌هایی که تمرکز چارت روی آن‌ها بیشتر است",
      visible: plan.importantHouses.length > 0,
    },
    {
      targetId: "relationships",
      label: "رابطه‌های مهم",
      detail: "جنبه‌ها و تماس‌های زاویه‌ای برجسته",
      visible: plan.importantAspects.length > 0,
    },
    {
      targetId: "growth-path",
      label: "گره‌های ماه و رشد",
      detail: "الگوی آشنا و جهتی که ارزش تمرین دارد",
      visible: Boolean(plan.nodeStory),
    },
    {
      targetId: "strength-challenge",
      label: "ترکیب انرژی‌ها",
      detail: "تعادل عنصرها و کیفیت‌های غالب",
    },
    {
      targetId: "drive-direction",
      label: "از خواندن به عمل",
      detail: "کارهای کوچک و قابل امتحان برای این هفته",
      visible: plan.weeklyActions.length > 0,
    },
    {
      targetId: "report-sky",
      label: "آسمان و تو",
      detail: "ترنزیت ذخیره‌شده کنار چارت تولد",
    },
    {
      targetId: "report-chart",
      label: "جزئیات نجومی",
      detail: "داده‌ها، خانه‌ها، جنبه‌ها و روش محاسبه",
    },
  ].filter((item) => item.visible !== false);
}
type RecomposedOpeningStory = {
  title: string;
  paragraphs: [string, string];
};

const OPENING_MAJOR_BODY_IDS = new Set([
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

const OPENING_HOUSE_THEMES: Record<number, string> = {
  1: "بدن، حضور، شروع‌کردن و اعلام خواسته",
  2: "ارزش، پول، مالکیت و احساس اتکا به خود",
  3: "یادگیری، حرف‌زدن، پیام و رفت‌وآمد روزمره",
  4: "خانه، ریشه، خانواده و امنیت خصوصی",
  5: "خلاقیت، عشق، لذت، دیده‌شدن و ساختن چیزی با امضای شخصی",
  6: "کار روزمره، عادت، نظم، مهارت و رسیدگی به بدن",
  7: "رابطهٔ نزدیک، شراکت، مذاکره و مرز دوطرفه",
  8: "اعتماد، صمیمیت، آسیب‌پذیری و منابع مشترک",
  9: "افق فکری، معنا، سفر، تحصیل و دیدن تصویر بزرگ‌تر",
  10: "مسیر عمومی، کار، مسئولیت و چیزی که می‌خواهی با نام تو دیده شود",
  11: "دوستی، گروه، آینده، شبکه و سهم تو در جمع",
  12: "خلوت، استراحت، پشت‌صحنه، رهاکردن و چیزهایی که هنوز نام روشنی ندارند",
};

const OPENING_HOUSE_EXAMPLES: Record<number, string> = {
  1: "وقتی باید بدون معطل‌شدن شروع کنی یا خواسته‌ات را زودتر نشان بدهی",
  2: "وقتی باید بین ارزش واقعی، امنیت مالی و چیزی که فقط آشناست فرق بگذاری",
  3: "وقتی یک پیام مهم می‌فرستی، چیزی تازه یاد می‌گیری یا باید ایده‌ای را روشن توضیح بدهی",
  4: "وقتی بیرون شلوغ است و باید بفهمی در خانه یا خلوت خودت واقعاً چه چیزی امنیت می‌دهد",
  5: "وقتی از چند موضوع نامرتبط ایدهٔ یک پروژه، محصول یا راه‌حل غیرمعمول درمی‌آوری و باید آن را تمام و قابل دیدن کنی",
  6: "وقتی کارهای کوچک زیاد می‌شوند و باید از میان آن‌ها یک ریتم قابل ادامه بسازی",
  7: "وقتی در رابطه یا همکاری باید سهم، خواسته یا مرز هر دو طرف روشن شود",
  8: "وقتی پای اعتماد، پول مشترک، آسیب‌پذیری یا گفتن چیزی که پنهان مانده وسط است",
  9: "وقتی یک تجربه، درس یا سفر باید به تصویر بزرگ‌تری از زندگی وصل شود",
  10: "وقتی کاری که ساخته‌ای قرار است دیده شود و باید مسئولیت نتیجه‌اش را هم بپذیری",
  11: "وقتی بین جایگاه خودت در یک جمع و مسیری که برای آینده مهم است تصمیم می‌گیری",
  12: "وقتی قبل از قدم بعدی به خلوت، خواب یا فاصله از سروصدا نیاز داری",
};

function openingSignLabel(signId: string | null | undefined) {
  if (!signId) return "";
  return (
    ZODIAC_LABELS[signId as keyof typeof ZODIAC_LABELS]?.faName ??
    signId
  );
}

function openingAspect(
  report: AstrologyReport,
  firstId: string,
  secondId: string,
) {
  const aspects =
    report.realEngine?.aspects ?? report.realEngine?.aspectHighlights ?? [];
  return aspects.find((aspect) => {
    const pair = new Set([
      aspect.firstPlanetId.toLowerCase(),
      aspect.secondPlanetId.toLowerCase(),
    ]);
    return pair.has(firstId) && pair.has(secondId);
  });
}

export function buildRecomposedOpeningStory(
  report: AstrologyReport,
  plan: AdaptiveOverviewPlan,
): RecomposedOpeningStory {
  const name = report.input.name?.trim() || "این چارت";
  const placements = (report.realEngine?.placements ?? []).filter((item) =>
    OPENING_MAJOR_BODY_IDS.has(item.id.toLowerCase()),
  );

  const houseCounts = new Map<number, number>();
  const signCounts = new Map<string, number>();
  for (const placement of placements) {
    if (typeof placement.house === "number") {
      houseCounts.set(
        placement.house,
        (houseCounts.get(placement.house) ?? 0) + 1,
      );
    }
    if (placement.signId) {
      signCounts.set(
        placement.signId,
        (signCounts.get(placement.signId) ?? 0) + 1,
      );
    }
  }

  const dominantHouseEntry = [...houseCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0] - b[0],
  )[0];
  const dominantSignEntry = [...signCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0];

  const dominantHouse =
    dominantHouseEntry && dominantHouseEntry[1] >= 4
      ? dominantHouseEntry[0]
      : null;
  const dominantSign =
    dominantSignEntry && dominantSignEntry[1] >= 4
      ? dominantSignEntry[0]
      : null;

  const mercuryUranus = openingAspect(report, "mercury", "uranus");
  const marsSaturn = openingAspect(report, "mars", "saturn");
  const moon = placements.find((item) => item.id.toLowerCase() === "moon");
  const mars = placements.find((item) => item.id.toLowerCase() === "mars");
  const saturn = placements.find((item) => item.id.toLowerCase() === "saturn");
  const retrogradeIds = new Set(
    report.realEngine?.retrogrades?.status === "calculated"
      ? report.realEngine.retrogrades.planetIds.map((id) => id.toLowerCase())
      : [],
  );

  let firstParagraph: string;
  if (dominantHouse) {
    const houseFa = dominantHouse.toLocaleString("fa-IR");
    const houseTheme = OPENING_HOUSE_THEMES[dominantHouse];
    const houseExample = OPENING_HOUSE_EXAMPLES[dominantHouse];
    const signLabel = openingSignLabel(dominantSign);

    firstParagraph =
      "آسمان تولد " +
      name +
      " یک مرکز ثقل روشن دارد: " +
      (dominantSign
        ? "بخش بزرگی از چارت در خانه " +
          houseFa +
          " و " +
          signLabel +
          " جمع شده؛ جایی که " +
          houseTheme +
          " به هم می‌رسند."
        : "خانه " +
          houseFa +
          " این چارت آن‌قدر شلوغ است که " +
          houseTheme +
          " به یک محور مشترک تبدیل می‌شوند.");

    if (mercuryUranus && mercuryUranus.orb <= 2) {
      firstParagraph +=
        " عطارد و اورانوس هم خیلی نزدیک‌اند؛ ذهن سریع‌تر از مسیر آشنا رابطه‌های تازه را می‌بیند و ایده را به راهی متفاوت می‌رساند.";
    }

    firstParagraph +=
      " در زندگی روزمره، " +
      houseExample +
      ".";

    firstParagraph +=
      dominantSign === "aquarius" ||
      (mercuryUranus && mercuryUranus.orb <= 2)
        ? " روی دیگر همین نیرو، تازگی گاهی از ماندن جلو می‌زند؛ شروع‌کردن آسان‌تر از تمام‌کردن می‌شود."
        : " روی دیگر همین تمرکز، هم‌زمان‌شدن چند خواسته است؛ انتخاب اولویت اهمیت بیشتری پیدا می‌کند.";
  } else {
    const lead = plan.topStories[0];
    const second = plan.topStories[1];
    const leadHouse = lead?.sourceHouseIds[0] ?? null;
    const secondHouse = second?.sourceHouseIds[0] ?? null;

    firstParagraph =
      "چارت " +
      name +
      " به‌جای یک مرکز واحد، چند نیروی نزدیک به هم دارد. " +
      (lead?.title ?? "یک الگوی اصلی") +
      " اول دیده می‌شود" +
      (leadHouse
        ? "؛ بیشتر در " +
          (OPENING_HOUSE_THEMES[leadHouse] ?? "زندگی روزمره")
        : "") +
      ". " +
      (leadHouse
        ? OPENING_HOUSE_EXAMPLES[leadHouse]
        : "در یک تصمیم واقعی، مهم است ببینی کدام نیرو زودتر از بقیه جلو می‌آید") +
      ".";

    if (second) {
      firstParagraph +=
        " " +
        second.title +
        " لایهٔ دوم این تصویر است" +
        (secondHouse
          ? "، به‌ویژه وقتی " +
            (OPENING_HOUSE_EXAMPLES[secondHouse] ??
              "چند نیاز هم‌زمان فعال می‌شوند")
          : "") +
        ".";
    }
  }

  let secondParagraph: string;
  if (moon) {
    const moonSign = openingSignLabel(moon.signId);
    const moonHouse = typeof moon.house === "number" ? moon.house : null;
    const moonTheme =
      moonHouse && OPENING_HOUSE_THEMES[moonHouse]
        ? OPENING_HOUSE_THEMES[moonHouse]
        : "امنیت عاطفی";
    const moonExample =
      moonHouse && OPENING_HOUSE_EXAMPLES[moonHouse]
        ? OPENING_HOUSE_EXAMPLES[moonHouse]
        : "وقتی باید نیاز واقعی خودت را پیش از واکنش نام ببری";

    secondParagraph =
      moon.signId === "taurus" && moonHouse === 8
        ? "اما " +
          name +
          " فقط از آزادی و تازگی ساخته نشده. ماه در " +
          moonSign +
          " و خانه ۸ امنیتی می‌خواهد که در رفتار ثابت و قابل لمس ساخته شود."
        : "لایهٔ دیگر چارت " +
          name +
          " به ماه در " +
          moonSign +
          (moonHouse
            ? " و خانه " + moonHouse.toLocaleString("fa-IR")
            : "") +
          " برمی‌گردد؛ جایی که " +
          moonTheme +
          " باید در تجربهٔ واقعی حس شود.";

    if (
      marsSaturn &&
      ["square", "opposition"].includes(marsSaturn.aspectId) &&
      marsSaturn.orb <= 2.5 &&
      mars &&
      saturn
    ) {
      const marsSign = openingSignLabel(mars.signId);
      const saturnSign = openingSignLabel(saturn.signId);
      const retro = retrogradeIds.has("mars") ? " پس‌رو" : "";
      secondParagraph +=
        " هم‌زمان مریخ" +
        retro +
        " در " +
        marsSign +
        " و تماس نزدیکش با زحل در " +
        saturnSign +
        " نشان می‌دهند که خواستن و عمل‌کردن همیشه بی‌اصطکاک نیست؛ گاهی واکنش طرف مقابل آن‌قدر سنجیده می‌شود که خواستهٔ خودت دیرتر به زبان می‌آید.";
    }

    secondParagraph +=
      " در زندگی روزمره، " +
      moonExample +
      ". وقتی نیاز و مرز زودتر روشن شوند، همین ترکیب می‌تواند به قوتی تبدیل شود که هم پیوند را نگه می‌دارد و هم خودت را از معادله حذف نمی‌کند.";
  } else {
    const second = plan.topStories[1] ?? plan.topStories[0];
    secondParagraph =
      "در کنار آن محور اول، " +
      (second?.title ?? "یک محور دوم") +
      " یادآوری می‌کند که این چارت با یک نیرو توضیح داده نمی‌شود. در یک تصمیم واقعی، ببین کدام نیرو اول فعال می‌شود و کجا لازم است نیاز یا مرز دوم را هم زودتر وارد ماجرا کنی.";
  }

  return {
    title: report.input.name?.trim()
      ? "آسمانِ لحظه‌ای که " + report.input.name.trim() + " به دنیا آمد"
      : "آسمانِ لحظهٔ تولد",
    paragraphs: [firstParagraph.trim(), secondParagraph.trim()],
  };
}

// HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE2_OPENING_STORIES_R1_20260903
function AdaptiveOverviewCard({
  report,
  plan,
  previewStories,
  onNavigate,

  afterOpening,
}: {
  report: AstrologyReport;
  plan: AdaptiveOverviewPlan;
  previewStories: AdaptiveNarrativeAnchor[];
  onNavigate?: (targetId: string) => void;

  afterOpening?: ReactNode;
}) {
  const roadmap = buildAdaptiveRoadmap(plan);
  const opening = buildRecomposedOpeningStory(report, plan);
  const surfacedOpening = opening.paragraphs.map((text, index) => ({
    text: surfaceNarrativeText(
      `${reportSurfaceKey(report)}:opening`,
      `${plan.version}:opening:${index}`,
      index === 0 ? "thesis" : "development",
      text,
      index,
    ),
  }));

  return (
    <section
      className={styles.adaptiveHero}
      id="overview"
      data-adaptive-report-section="overview"
      data-report-hero-position="before-chart-wheel"
      data-report-editorial-opening="slice2-20260903"
      data-screenshot-ready
    >
      <h1>{opening.title}</h1>
      <div data-adaptive-opening-story="recomposed-two-paragraphs"
        data-report-opening-story="dynamic-two-paragraph">
        {surfacedOpening.map((paragraph, index) => (
          <p key={`opening-${index}`}>{paragraph.text}</p>
        ))}
      </div>

      <div
        className={styles.adaptiveMetaRow}
        data-report-opening-meta="editorial-inline"
      >
        <span>{plan.readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه</span>
        <span aria-hidden="true">·</span>
        <span>{plan.topStories.length.toLocaleString("fa-IR")} داستان اصلی</span>
      </div>

      {afterOpening}
      {previewStories.length > 0 ? (
        <section
          className={styles.adaptivePrimaryStories}
          data-report-primary-stories="editorial-three"
          aria-labelledby="report-primary-stories-title"
        >
          <header className={styles.adaptivePrimaryStoriesHeader}>
            <h2 id="report-primary-stories-title">داستان‌های اصلی تو</h2>
          </header>
          <div
            className={styles.adaptiveStoryList}
            data-adaptive-story-preview="three-headlines"
          >
            {previewStories.map((story, index) => (
              <article
                className={styles.adaptiveStoryCard}
                data-adaptive-preview-anchor={story.anchorId}
                key={`preview-${story.anchorId}`}
              >
                <span className={styles.adaptiveIndex} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.adaptiveStoryBody}>
                  <h3>{story.title}</h3>
                  <p className={styles.adaptivePreviewStoryTeaser}>
                    {compactNarrativeUnit(story.summary, 1)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div
        className={styles.adaptiveRoadmap}
        data-report-roadmap="clickable"
        data-report-roadmap-order="before-preview"
      >
        <div className={styles.adaptiveRoadmapIntro}>
          <span>نقشهٔ راه گزارش</span>
          <p>اگر خواستی مستقیم سراغ یک بخش بروی، از اینجا انتخابش کن.</p>
        </div>
        <nav
          className={styles.adaptiveRoadmapGrid}
          aria-label="نقشهٔ راه گزارش چارت تولد"
        >
          {roadmap.map((item, index) => (
            <a
              className={styles.adaptiveRoadmapLink}
              data-report-roadmap-link={item.targetId}
              href={`#${item.targetId}`}
              key={item.targetId}
              onClick={(event) => {
                if (!onNavigate) return;
                event.preventDefault();
                onNavigate(item.targetId);
              }}
            >
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            </a>
          ))}
        </nav>
      </div>

    </section>
  );
}


export function ReportAdaptiveOverview({
  report,
  accessMode = "free",
  accessPolicy = DEFAULT_REPORT_ACCESS_POLICY,
  onNavigate,

  afterOpening,
}: {
  report: AstrologyReport;
  accessMode?: BirthReportAccessMode;
  accessPolicy?: ReportAccessPolicy;
  onNavigate?: (targetId: string) => void;

  afterOpening?: ReactNode;
}) {
  const plan = useMemo(() => {
    const nextPlan = buildAdaptiveReportPlan(report);
    if (process.env.NODE_ENV !== "production") assertAdaptiveAnchorIntegrity(nextPlan);
    return nextPlan;
  }, [report]);
  const selectedPreviewStories = accessMode === "premium"
    ? plan.topStories
    : plan.topStories.slice(0, accessPolicy.topStoriesFreeCount);
  const previewStories = orderTopStoriesForReading(
    selectedPreviewStories,
    plan.chartRulerId,
  );

  return (
    <AdaptiveOverviewCard
      onNavigate={onNavigate}
      plan={plan}
      previewStories={previewStories}
      report={report}
      afterOpening={afterOpening}
    />
  );
}

export function ReportAdaptiveNarrative({
  report,
  accessMode = "free",
  accessPolicy = DEFAULT_REPORT_ACCESS_POLICY,
  fullReportCredits = 0,
  onUnlockFullReport,
  renderOverview = true,
}: Props) {
  const plan = useMemo(() => {
    const nextPlan = buildAdaptiveReportPlan(report);
    if (process.env.NODE_ENV !== "production") assertAdaptiveAnchorIntegrity(nextPlan);
    return nextPlan;
  }, [report]);

  const isPremium = accessMode === "premium";
  const selectedTopStories = isPremium
    ? plan.topStories
    : plan.topStories.slice(0, accessPolicy.topStoriesFreeCount);
  const visibleTopStories = orderTopStoriesForReading(
    selectedTopStories,
    plan.chartRulerId,
  );
  const visibleHouses = isPremium
    ? plan.importantHouses
    : plan.importantHouses.slice(0, accessPolicy.importantHousesFreeCount);
  const visibleAspects = isPremium
    ? plan.importantAspects
    : plan.importantAspects.slice(0, accessPolicy.importantAspectsFreeCount);
  const visibleWeeklyActions = isPremium
    ? plan.weeklyActions
    : plan.weeklyActions.slice(0, accessPolicy.weeklyActionsFreeCount);
  const nodeFull = isReportSectionFull(accessPolicy.nodeAxis, isPremium);
  const balanceFull = isReportSectionFull(accessPolicy.energyBalance, isPremium);
  const balanceTeaser = isReportSectionTeaser(accessPolicy.energyBalance, isPremium);
  const visiblePlacementStories = isPremium
    ? plan.placementStories
    : plan.placementStories.filter(
        (story) => getPlanetChapterAccess(accessPolicy, story.planetId) !== "premium",
      );
  const surfaceKey = reportSurfaceKey(report);
  const surfacedBigThree = plan.bigThree.map((story, index) =>
    surfacePlacementStory(story, `${surfaceKey}:big-three`, index),
  );
  const surfacedPlacementStories = visiblePlacementStories.map((story, index) =>
    surfacePlacementStory(story, `${surfaceKey}:placements`, index),
  );
  const surfacedTopStories = visibleTopStories.map((story, index) =>
    surfaceTopStory(story, `${surfaceKey}:top-stories`, index),
  );
  const surfacedHouses = visibleHouses.map((house, index) => ({
    ...house,
    headline: diversifyHouseSurfaceText(house.headline, index, "headline"),
    reason: normalizeHouseReason(house.reason),
    synthesis: naturalizeNarrativeText(diversifyHouseSurfaceText(
      surfaceNarrativeText(`${surfaceKey}:houses`, `house:${house.houseNumber}:thesis`, "thesis", house.synthesis, index),
      index,
      "synthesis",
    )),
    livedExample: naturalizeNarrativeText(diversifyHouseSurfaceText(
      surfaceNarrativeText(`${surfaceKey}:houses`, `house:${house.houseNumber}:scene`, "scene", house.livedExample, index),
      index,
      "scene",
    )),
    pressure: naturalizeNarrativeText(surfaceNarrativeText(`${surfaceKey}:houses`, `house:${house.houseNumber}:friction`, "friction", house.pressure, index)),
  }));
  const surfacedAspects = visibleAspects.map((story, index) => ({
    ...story,
    dailyLife: naturalizeNarrativeText(surfaceNarrativeText(`${surfaceKey}:aspects`, `aspect:${story.aspect.id}:scene`, "scene", story.dailyLife, index)),
    healthy: naturalizeNarrativeText(surfaceNarrativeText(`${surfaceKey}:aspects`, `aspect:${story.aspect.id}:strength`, "strength", story.healthy, index)),
    friction: naturalizeNarrativeText(diversifyAspectSurfaceText(
      surfaceNarrativeText(`${surfaceKey}:aspects`, `aspect:${story.aspect.id}:friction`, "friction", story.friction, index),
      index,
    )),
  }));
  const surfacedNodeStory = plan.nodeStory
    ? {
        ...plan.nodeStory,
        familiarBehavior: surfaceNarrativeText(`${surfaceKey}:nodes`, "node:familiar", "thesis", plan.nodeStory.familiarBehavior),
        usefulSkill: surfaceNarrativeText(`${surfaceKey}:nodes`, "node:skill", "strength", plan.nodeStory.usefulSkill),
        overuse: surfaceNarrativeText(`${surfaceKey}:nodes`, "node:overuse", "friction", plan.nodeStory.overuse),
        freshBehavior: surfaceNarrativeText(`${surfaceKey}:nodes`, "node:fresh", "development", plan.nodeStory.freshBehavior),
      }
    : null;
  const lockedPlacementLabels = plan.placementStories
    .filter(
      (story) =>
        !["sun", "moon"].includes(story.planetId) &&
        !isPremium &&
        getPlanetChapterAccess(accessPolicy, story.planetId) === "premium",
    )
    .map((story) => story.planetLabel);
  const lockedItems = [
    plan.topStories.length > visibleTopStories.length
      ? `${(plan.topStories.length - visibleTopStories.length).toLocaleString("fa-IR")} داستان اصلی دیگر`
      : "",
    plan.importantHouses.length > visibleHouses.length
      ? `${(plan.importantHouses.length - visibleHouses.length).toLocaleString("fa-IR")} خانهٔ برجستهٔ دیگر`
      : "",
    plan.importantAspects.length > visibleAspects.length
      ? `${(plan.importantAspects.length - visibleAspects.length).toLocaleString("fa-IR")} جنبهٔ مهم دیگر`
      : "",
    !nodeFull && plan.nodeStory ? "خوانش کامل محور رشد این چارت" : "",
    !balanceFull ? `خوانش کامل «${plan.balanceStory.title}»` : "",
    lockedPlacementLabels.length
      ? `فصل‌های عمیق‌تر: ${lockedPlacementLabels.slice(0, 6).join("، ")}${lockedPlacementLabels.length > 6 ? " و…" : ""}`
      : "",
    !isPremium &&
    (accessPolicy.technical.appendix === "premium" ||
      accessPolicy.technical.provenance === "premium")
      ? "جزئیات فنی و محاسبات کامل"
      : "",
  ].filter(Boolean);

  // HALLEUS_REPORT_SEMANTIC_FINAL_QA_R18_20260808
  const rulerPlacement = plan.placementStories.find((story) => story.planetId === plan.chartRulerId);
  const hasRulerTopStory = plan.topStories.some((story) => story.kind === "ruler-story");
  const topStoryPlanetIds = useMemo(
    () => new Set(plan.topStories.flatMap((story) => story.sourcePlanetIds)),
    [plan],
  );
  const weeklyActionKeys = useMemo(
    () => new Set(plan.weeklyActions.map(normalizeAdaptiveActionKey).filter(Boolean)),
    [plan],
  );
  const inlineActionFrequency = useMemo(() => {
    const values = [
      ...plan.topStories.map((story) => story.action),
      ...plan.importantAspects.map((story) => story.action),
      ...(plan.nodeStory ? [plan.nodeStory.experiment] : []),
      plan.balanceStory.action,
      ...plan.bigThree.map((story) => story.interpretation.smallExperiment),
      ...plan.placementStories.map((story) => story.interpretation.smallExperiment),
    ];
    const frequency = new Map<string, number>();
    for (const value of values) {
      const key = normalizeAdaptiveActionKey(value);
      if (!key) continue;
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
    return frequency;
  }, [plan]);
  const showInlineAction = (value: string) => {
    const key = normalizeAdaptiveActionKey(value);
    return isPremium && Boolean(key) && !weeklyActionKeys.has(key) && (inlineActionFrequency.get(key) ?? 0) === 1;
  };

  return (
    <div
      className={styles.adaptiveNarrative}
      data-adaptive-report-plan={plan.version}
      data-adaptive-report-mode={plan.mode}
      data-adaptive-audience-mode={plan.audienceMode}
    >
      {renderOverview ? (
        <AdaptiveOverviewCard
          plan={plan}
          previewStories={surfacedTopStories}
          report={report}
        />
      ) : null}

      <section className={styles.adaptiveSection} id="inner-world" data-adaptive-report-section="big-three">
        <header className={styles.adaptiveSectionHeader}>
          <p className={styles.eyebrow}>برای شروع</p>
          <h2>
            {plan.bigThree.some((story) => story.planetId === "asc")
              ? "خورشید، ماه، رایزینگ، عطارد، مریخ و زهره"
              : "خورشید، ماه، عطارد، مریخ و زهره"}
          </h2>
          <p>اول از بخش‌هایی شروع می‌کنیم که بیشتر از همه در تجربهٔ روزمره دیده می‌شوند؛ بعد هر کدام را با جایگاه واقعی همین چارت عمیق‌تر می‌خوانیم.</p>
        </header>
        <div className={styles.adaptivePlacementGrid}>
          {surfacedBigThree.map((story) => (
            <PlacementCard
              key={story.planetId}
              story={story}
              condensed={topStoryPlanetIds.has(story.planetId) || (!isPremium && getPlanetChapterAccess(accessPolicy, story.planetId) === "teaser")}
              showAction={isPremium && showInlineAction(story.interpretation.smallExperiment)}
            />
          ))}
        </div>
        <div className={styles.adaptiveRulerStrip} data-adaptive-ruler={plan.chartRulerId}>
          <div>
            <span className={styles.eyebrow}>سیاره راهبر</span>
            <strong>{plan.chartRulerLabel}</strong>
          </div>
          <p>
            {plan.chartRulerLabel} در این چارت نقش راهبر دارد؛ یعنی شیوه‌ای که این سیاره عمل می‌کند، در چند بخش دیگر هم خودش را نشان می‌دهد.
          </p>
          {!hasRulerTopStory && rulerPlacement ? (
            <details>
              <summary>جایگاه راهبر را ببین</summary>
              <p>{rulerPlacement.interpretation.dailyLifeExample}</p>
            </details>
          ) : null}
        </div>
      </section>

      {visiblePlacementStories.length > 0 ? (
        <section className={styles.adaptiveSection} id="deeper-layers" data-adaptive-report-section="placements">
          <header className={styles.adaptiveSectionHeader}>
            <p className={styles.eyebrow}>بعد از جایگاه‌های اصلی</p>
            <h2>سیاره‌ها در زندگی روزمره</h2>
            <p>این‌ها لایه‌های تکمیلی‌اند، نه داستان‌های تازه. اگر سیاره‌ای در الگوی اصلی دوباره دیده شود، اینجا فقط زاویهٔ متفاوتش را کوتاه‌تر می‌خوانی.</p>
          </header>
          <div className={styles.adaptivePlacementGrid}>
            {surfacedPlacementStories.map((story) => (
              <PlacementCard
                key={story.planetId}
                story={story}
                condensed={topStoryPlanetIds.has(story.planetId)}
                showAction={showInlineAction(story.interpretation.smallExperiment)}
              />
            ))}
          </div>
        </section>
      ) : null}
      {visibleTopStories.length > 0 ? (
        <section className={styles.adaptiveSection} id="primary-patterns" data-adaptive-report-section="top-stories">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>بیشترین وزن در همین چارت</p>
            <h2>مهم‌ترین الگوهای این چارت</h2>
            <p>این بخش الگوهای چندشاهدی را جلو می‌آورد؛ تماس‌های دقیق و مستقل پایین‌تر در «رابطه‌های مهم» جدا می‌مانند، حتی اگر از نظر نجومی بسیار مهم باشند.</p>
          </header>
          <div className={styles.adaptiveStoryList}>
            {surfacedTopStories.map((story, index) => (
              <StoryCard compactEvidence={!isPremium} key={story.anchorId} story={story} index={index} showAction={showInlineAction(story.action)} />
            ))}
          </div>
        </section>
      ) : null}

      {visibleHouses.length > 0 ? (
        <section className={styles.adaptiveSection} id="mind-language" data-adaptive-report-section="important-houses">
          <header className={styles.adaptiveSectionHeader}>
            <p className={styles.eyebrow}>کجا بیشتر اتفاق می‌افتد؟</p>
            <h2>خانه‌های مهم</h2>
            <p>خانه‌ها جواب می‌دهند این داستان‌ها بیشتر کجای زندگی رخ می‌دهند؛ برای همین این بخش کوتاه می‌ماند و فقط صحنه، ریتم و فشار اصلی هر خانه را نگه می‌دارد.</p>
          </header>
          <div className={styles.adaptiveHouseGrid}>
            {surfacedHouses.map((house) => (
              <article key={house.houseNumber} className={styles.adaptiveHouseCard} data-adaptive-house={house.houseNumber}>
                <p className={styles.eyebrow}>
                  خانه {house.houseNumber.toLocaleString("fa-IR")} · {house.label}
                </p>
                <p>{house.astrologyLabel}</p>
                <p>{house.reason}</p>
                <h3>{house.headline}</h3>
                <p data-report-editorial-compact-house>{compactNarrativeParts([house.synthesis, house.livedExample, house.pressure], 1)}</p>
                <InlineEvidence compact evidence={house.evidence} maxItems={1} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visibleAspects.length > 0 ? (
        <section className={styles.adaptiveSection} id="relationships" data-adaptive-report-section="important-aspects">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>وقتی دو بخش چارت با هم فعال می‌شوند</p>
            <h2>رابطه‌های مهم</h2>
            <p>اینجا تماس‌هایی می‌آیند که در داستان‌های بالاتر جذب نشده‌اند. زاویه و اورب را می‌بینی، اما متن روی تجربه‌ای می‌ماند که از آن رابطهٔ سیاره‌ای ساخته می‌شود.</p>
          </header>
          <div className={styles.adaptiveAspectList}>
            {surfacedAspects.map((story, index) => {
              const title = splitAstrologyHeadline(story.title);
              const humanTitle = resolveAspectHumanTitle(story, index);

              const technicalLine =
                story.technicalLine ||
                formatReportNarrativeAspectGeometry({
                  aspectId: story.aspect.aspectId,
                  referenceAngle: story.aspect.angle,
                  separation: story.aspect.separation,
                  distanceFromExact: story.aspect.orb,
                });
              return (
                <article key={story.aspect.id} className={styles.adaptiveAspectCard} data-adaptive-aspect-id={story.aspect.id}>
                  <p className={styles.eyebrow}>{title.astrology}</p>
                  <h3>{humanTitle}</h3>
                  <p
                    className={styles.adaptiveTechnicalLine}
                    data-report-astrology-technical-line
                  >
                    {technicalLine}
                  </p>
                  <p data-report-editorial-compact-aspect>{compactNarrativeParts([story.dailyLife, story.healthy, story.friction], 1)}</p>
                  {story.action && showInlineAction(story.action) ? (
                    <p className={styles.adaptiveActionLine}>{conditionalForecast(story.action, index + 4)}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

            {!isPremium && lockedItems.length > 0 ? (
        <ProductLockedOffer
          productCode="full_report"
          title={accessPolicy.upgradeTitle ?? "ادامهٔ همین گزارش کامل"}
          description={
            accessPolicy.upgradeSupportSentence ??
            "نسخه رایگان پاسخ واقعی می‌دهد؛ یک اعتبار گزارش کامل فقط بخش‌هایی را باز می‌کند که با تنظیم فعلی هنوز قفل‌اند."
          }
          items={lockedItems}
          href="/pricing"
          availableCredits={fullReportCredits}
          onUnlock={onUnlockFullReport}
          unlockLabel={accessPolicy.upgradeCtaLabel}
        />
      ) : null}

      {nodeFull && surfacedNodeStory ? (
        <section className={styles.adaptiveSection} id="growth-path" data-adaptive-report-section="lunar-node-axis">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>الگوی آشنا، انتخاب تازه</p>
            <h2>گره‌های ماه</h2>
            <p>گره جنوبی الگوی آشناتری را نشان می‌دهد که سریع‌تر به آن برمی‌گردی؛ گره شمالی مسیری است که زندگی بارها تو را به تمرین‌کردنش هل می‌دهد.</p>
          </header>
          <article className={styles.adaptiveNodeCard}>
            <p><strong>☋ الگوی گره جنوبی</strong> {mergeNarrative(surfacedNodeStory.familiarBehavior, surfacedNodeStory.usefulSkill, surfacedNodeStory.overuse)}</p>
            <p><strong>☊ مسیر گره شمالی</strong> {surfacedNodeStory.freshBehavior}</p>
            {showInlineAction(surfacedNodeStory.experiment) ? <p className={styles.adaptiveActionLine}>{conditionalForecast(surfacedNodeStory.experiment, 10)}</p> : null}
            <p className={styles.adaptiveConfidence}>{surfacedNodeStory.confidence}</p>
            <InlineEvidence evidence={surfacedNodeStory.evidence} maxItems={2} />
          </article>
        </section>
      ) : null}

      {balanceTeaser ? (
        <section className={styles.adaptiveSection} data-access-teaser="energy-balance">
          <p className={styles.eyebrow}>تعادل انرژی</p>
          <h2>{plan.balanceStory.title}</h2>
          <p>الگوی کامل این ترکیب در نسخه کامل همین گزارش باز می‌شود.</p>
        </section>
      ) : null}

      {balanceFull ? (
      <section className={styles.adaptiveSection} id="strength-challenge" data-adaptive-report-section="balance">
        <header className={styles.adaptiveSectionHeader}>
          <p className={styles.eyebrow}>نه فقط شمارش</p>
          <h2>ترکیب انرژی‌ها</h2>
        </header>
        <article className={styles.adaptiveBalanceCard}>
          {plan.balanceStory.title !== "ترکیب انرژی‌ها" ? <h3>{plan.balanceStory.title}</h3> : null}
          <p>{plan.balanceStory.body}</p>
          {plan.balanceStory.action && showInlineAction(plan.balanceStory.action) ? (
            <p className={styles.adaptiveActionLine}>
              {toSecondPersonPlacementAction(plan.balanceStory.action)}
            </p>
          ) : null}
        </article>
      </section>
      ) : null}

      {visibleWeeklyActions.length > 0 ? (
        <section className={styles.adaptiveSection} id="drive-direction" data-adaptive-report-section="weekly-actions">
          <header className={styles.adaptiveSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>چند روز پیش رو</p>
            <h2>{isPremium ? "سه موقعیت که ممکن است این هفته پررنگ شوند" : "یک موقعیت که ممکن است این هفته پررنگ شود"}</h2>
            <p>در چند روز آینده ممکن است همین الگوها در موقعیت‌های ساده و روزمره خودشان را نشان بدهند؛ هر مورد می‌گوید اگر پیش آمد، چه واکنش کوچکی می‌تواند مفیدتر باشد.</p>
          </header>
          <ol className={styles.adaptiveWeeklyActions}>
            {visibleWeeklyActions.map((action, index) => <li key={action}>{weeklyDomainForecast(action, index)}</li>)}
          </ol>
        </section>
      ) : null}

    </div>
  );
}
