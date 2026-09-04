// HALLEUS_DEEP_NARRATIVE_SLICE2_FAILURESET_RECONCILIATION_R3_20260902
// HALLEUS_DEEP_NARRATIVE_SLICE2_CANONICAL_PLACEMENT_SYNTHESIS_R2_20260902
import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
} from "@/types/astro";
import { buildPlacementBehavioralInterpretation } from "@/lib/astrology/report-behavioral-interpretation";
import {
  getReportBehavioralAudienceMode,
  selectPlacementMajorAspectModifier,
} from "@/lib/astrology/report-behavioral-context";
import {
  type ChartRulershipProfile,
  type ClassicalPlanetId,
} from "@/lib/astrology/chart-rulership";
import type { ChartPatternProfile } from "@/lib/astrology/chart-patterns";
import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";

export const PERSONAL_PLANET_CHAPTERS_VERSION =
  "personal-planet-chapters-v1" as const;

export type PersonalPlanetChapterId =
  | "sun"
  | "moon"
  | "rising-ruler"
  | "mercury"
  | "venus"
  | "mars";

export type PersonalPlanetChapterSectionId =
  | "position"
  | "core-meaning"
  | "sign-expression"
  | "house-expression"
  | "planet-condition"
  | "major-aspects"
  | "whole-chart-connection"
  | "daily-life"
  | "healthy-capacity"
  | "under-pressure"
  | "integration"
  | "evidence";

export type PersonalPlanetChapterSection = {
  id: PersonalPlanetChapterSectionId;
  label: string;
  body: string;
  evidence: string[];
};

export type PersonalPlanetChapter = {
  id: PersonalPlanetChapterId;
  title: string;
  navigationId:
    | "inner-world"
    | "mind-language"
    | "relationships"
    | "drive-direction"
    | null;
  available: boolean;
  summary: string;
  sections: PersonalPlanetChapterSection[];
};

export type PersonalPlanetChaptersProfile = {
  version: typeof PERSONAL_PLANET_CHAPTERS_VERSION;
  hasReliableBirthTime: boolean;
  chapters: PersonalPlanetChapter[];
  absorbedNarrativeCount: number;
};

export type PersonalPlanetInheritedNarratives = Partial<
  Record<PersonalPlanetChapterId, string[]>
>;

export type BuildPersonalPlanetChaptersOptions = {
  hasReliableBirthTime: boolean;
  rulership: ChartRulershipProfile;
  chartPatterns: ChartPatternProfile;
  inheritedNarratives?: PersonalPlanetInheritedNarratives;
};

type PersonalPlanetId = "sun" | "moon" | "mercury" | "venus" | "mars";

const PLANET_LABELS: Record<PersonalPlanetId, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
};

const HOUSE_FIELDS: Record<RealEngineReportHouseNumber, string> = {
  1: "بدن، حضور و شروع‌ها",
  2: "ارزش، امنیت و منابع",
  3: "فکر، یادگیری و ارتباط",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و مراقبت",
  7: "رابطه و شراکت",
  8: "اعتماد، صمیمیت و دگرگونی",
  9: "معنا، سفر و جهان‌بینی",
  10: "مسیر اجتماعی و اثر بیرونی",
  11: "دوستی، جمع و آینده",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const SECTION_LABELS: Record<PersonalPlanetChapterSectionId, string> = {
  position: "جایگاه واقعی",
  "core-meaning": "معنای اصلی",
  "sign-expression": "اثر برج",
  "house-expression": "اثر خانه",
  "planet-condition": "وضعیت سیاره در برج",
  "major-aspects": "مهم‌ترین جنبه‌ها",
  "whole-chart-connection": "ارتباط با کل چارت",
  "daily-life": "در زندگی روزمره",
  "healthy-capacity": "ظرفیت سالم",
  "under-pressure": "زیر فشار",
  integration: "راه یکپارچه‌کردن",
  evidence: "جزئیات نجومی و شواهد",
};

const CHAPTER_ORDER: readonly PersonalPlanetChapterId[] = [
  "sun",
  "moon",
  "rising-ruler",
  "mercury",
  "venus",
  "mars",
];

export function buildPersonalPlanetChapters(
  report: AstrologyReport,
  options: BuildPersonalPlanetChaptersOptions,
): PersonalPlanetChaptersProfile {
  const inheritedNarratives = options.inheritedNarratives ?? {};
  const chapters: PersonalPlanetChapter[] = [
    buildPlanetChapter(report, "sun", options, inheritedNarratives.sun ?? []),
    buildPlanetChapter(report, "moon", options, inheritedNarratives.moon ?? []),
    buildRisingRulerChapter(
      report,
      options,
      inheritedNarratives["rising-ruler"] ?? [],
    ),
    buildPlanetChapter(
      report,
      "mercury",
      options,
      inheritedNarratives.mercury ?? [],
    ),
    buildPlanetChapter(
      report,
      "venus",
      options,
      inheritedNarratives.venus ?? [],
    ),
    buildPlanetChapter(
      report,
      "mars",
      options,
      inheritedNarratives.mars ?? [],
    ),
  ];

  return {
    version: PERSONAL_PLANET_CHAPTERS_VERSION,
    hasReliableBirthTime: options.hasReliableBirthTime,
    chapters: CHAPTER_ORDER.map(
      (id) => chapters.find((chapter) => chapter.id === id)!,
    ),
    absorbedNarrativeCount: Object.values(inheritedNarratives).reduce(
      (total, items) => total + (items?.length ?? 0),
      0,
    ),
  };
}

function buildPlanetChapter(
  report: AstrologyReport,
  planetId: PersonalPlanetId,
  options: BuildPersonalPlanetChaptersOptions,
  inheritedNarratives: string[],
): PersonalPlanetChapter {
  const placement = report.realEngine?.placements.find(
    (item) => item.id === planetId,
  );
  const label = PLANET_LABELS[planetId];
  const navigationId =
    planetId === "moon"
      ? "inner-world"
      : planetId === "mercury"
        ? "mind-language"
        : planetId === "venus"
          ? "relationships"
          : planetId === "mars"
            ? "drive-direction"
            : null;

  if (!placement) {
    return unavailableChapter(
      planetId,
      label,
      navigationId,
      `جایگاه معتبر ${label} در این گزارش ثبت نشده است؛ این فصل بدون حدس‌زدن متوقف می‌شود.`,
    );
  }

  const audienceMode = getReportBehavioralAudienceMode(report);
  const houseNumber = options.hasReliableBirthTime
    ? normalizeHouse(placement.house)
    : null;
  const majorAspect = selectPlacementMajorAspectModifier(
    planetId,
    report.realEngine?.aspectHighlights ?? report.realEngine?.aspects,
  );
  const reading = buildPlacementBehavioralInterpretation({
    planetId,
    signId: placement.signId,
    houseNumber,
    retrograde:
      report.realEngine?.retrogrades?.status === "calculated" &&
      report.realEngine.retrogrades.planetIds.includes(planetId),
    audienceMode,
    majorAspect,
  });
  const condition = options.rulership.planetConditions.find(
    (item) => item.planetId === planetId,
  );
  const aspects = selectPlanetAspects(report, planetId);
  const patternLinks = options.chartPatterns.patterns.filter((pattern) =>
    pattern.participantIds.includes(planetId),
  );
  const inherited = uniqueNarratives(inheritedNarratives).slice(0, 8);
  const position = formatPlacement(
    placement,
    options.hasReliableBirthTime,
  );
  const evidence = buildPlanetEvidence(
    label,
    placement,
    options.hasReliableBirthTime,
    condition?.dignityLabel,
    aspects,
    patternLinks.map((pattern) => pattern.title),
  );

  const sections: PersonalPlanetChapterSection[] = [
    section("position", `${label} در ${position}.`, evidence.slice(0, 2)),
    section("core-meaning", cleanSentence(reading.plainMeaning)),
    section(
      "sign-expression",
      cleanSentence(reading.mechanism ?? reading.plainMeaning),
    ),
    section(
      "house-expression",
      houseNumber ? cleanSentence(reading.contextExpression ?? reading.plainMeaning) : "بدون ساعت تولد معتبر، اثر خانه وارد این فصل نمی‌شود.",
    ),
    section(
      "planet-condition",
      condition
        ? `${condition.dignityLabel}. ${condition.expression}`
        : "برای این سیاره وضعیت کلاسیک ویژه‌ای در داده فعلی ثبت نشده است.",
      condition?.evidence ?? [],
    ),
    section(
      "major-aspects",
      aspects.length > 0
        ? aspects.map(formatAspect).join(" ")
        : `در فهرست جنبه‌های اصلی این گزارش، تماس پررنگی برای ${label} انتخاب نشده است.`,
      aspects.map(aspectEvidence),
    ),
    section(
      "whole-chart-connection",
      buildWholeChartConnection(
        planetId,
        label,
        options,
        patternLinks.map((pattern) => pattern.title),
        aspects,
      ),
    ),
    section(
      "daily-life",
      mergeNarrativeGroup(
        cleanSentence(reading.dailyLifeExample),
        narrativeBucket(inherited, 0),
      ),
    ),
    section(
      "healthy-capacity",
      mergeNarrativeGroup(
        cleanSentence(reading.healthyExpression),
        narrativeBucket(inherited, 1),
      ),
    ),
    section(
      "under-pressure",
      mergeNarrativeGroup(
        cleanSentence(reading.possibleFriction),
        narrativeBucket(inherited, 2),
      ),
    ),
    section(
      "integration",
      mergeNarrativeGroup(
        `یک تمرین کوچک: ${cleanSentence(reading.smallExperiment)}`,
        narrativeBucket(inherited, 3),
      ),
    ),
    section(
      "evidence",
      evidence.join("؛ "),
      evidence,
    ),
  ];

  return {
    id: planetId,
    title: `${label}؛ ${chapterTitleSuffix(planetId)}`,
    navigationId,
    available: true,
    summary: cleanSentence(reading.plainMeaning),
    sections,
  };
}

function buildRisingRulerChapter(
  report: AstrologyReport,
  options: BuildPersonalPlanetChaptersOptions,
  inheritedNarratives: string[],
): PersonalPlanetChapter {
  if (!options.hasReliableBirthTime) {
    return unavailableChapter(
      "rising-ruler",
      "طالع و حاکم چارت",
      null,
      "ساعت تولد معتبر در دسترس نیست؛ بنابراین طالع، حاکم طالع و مسیر خانه‌ای آن حدس زده نمی‌شود.",
    );
  }

  if (!options.rulership.chartRuler) {
    return unavailableChapter(
      "rising-ruler",
      "طالع و حاکم چارت",
      null,
      "این گزارش دادهٔ محاسبه‌شدهٔ کافی برای حاکم چارت ندارد؛ با وجود ثبت ساعت تولد، مسیر حاکم چارت از نسخهٔ قدیمی بازسازی نمی‌شود.",
    );
  }

  const chartRuler = options.rulership.chartRuler;
  const placement = report.realEngine?.placements.find(
    (item) => item.id === chartRuler.planetId,
  );
  const asc = report.realEngine?.angles?.asc;
  if (!asc || !placement) {
    return unavailableChapter(
      "rising-ruler",
      "طالع و حاکم چارت",
      null,
      "داده طالع یا جایگاه حاکم چارت کامل نیست؛ این فصل بدون بازسازی مصنوعی متوقف می‌شود.",
    );
  }

  const rulerId = chartRuler.planetId as ClassicalPlanetId;
  const audienceMode = getReportBehavioralAudienceMode(report);
  const houseNumber = normalizeHouse(placement.house);
  const reading = buildPlacementBehavioralInterpretation({
    planetId: rulerId,
    signId: placement.signId,
    houseNumber,
    audienceMode,
    majorAspect: selectPlacementMajorAspectModifier(
      rulerId,
      report.realEngine?.aspectHighlights ?? report.realEngine?.aspects,
    ),
  });
  const condition = options.rulership.planetConditions.find(
    (item) => item.planetId === rulerId,
  );
  const aspects = selectPlanetAspects(report, rulerId);
  const patternLinks = options.chartPatterns.patterns.filter((pattern) =>
    pattern.participantIds.includes(rulerId),
  );
  const inherited = uniqueNarratives(inheritedNarratives).slice(0, 8);
  const evidence = [
    `طالع ${formatZodiacLabel(asc.signId)}، درجه ${formatDegree(asc.degreeInSign)}`,
    ...chartRuler.evidence,
    ...(condition?.evidence ?? []),
    ...aspects.map(aspectEvidence),
  ];

  return {
    id: "rising-ruler",
    title: "طالع و حاکم چارت؛ ورود و مسیر راهبر",
    navigationId: null,
    available: true,
    summary: chartRuler.pathSummary,
    sections: [
      section(
        "position",
        `طالع در ${formatZodiacLabel(asc.signId)}، درجه ${formatDegree(asc.degreeInSign)} است؛ حاکم سنتی آن ${chartRuler.planetLabel} است.`,
        evidence.slice(0, 2),
      ),
      section(
        "core-meaning",
        "طالع شیوه ورود، حضور اولیه و آغازها را نشان می‌دهد؛ حاکم چارت مسیر اصلی بیرونی‌شدن این کیفیت را دنبال می‌کند.",
      ),
      section(
        "sign-expression",
        `برج ${formatZodiacLabel(asc.signId)} کیفیت ورود را می‌سازد و ${chartRuler.planetLabel} در ${formatZodiacLabel(placement.signId)} نشان می‌دهد این جهت با چه ریتمی ادامه پیدا می‌کند.`,
      ),
      section(
        "house-expression",
        houseNumber
          ? `حاکم چارت در خانه ${formatFa(houseNumber)} قرار دارد؛ بنابراین میدان ${HOUSE_FIELDS[houseNumber]} یکی از مسیرهای اصلی عمل‌کردن این امضاست.`
          : "خانه حاکم چارت در داده ذخیره‌شده کامل نیست و حدس زده نمی‌شود.",
      ),
      section(
        "planet-condition",
        condition
          ? `${condition.dignityLabel}. ${condition.expression}`
          : "وضعیت کلاسیک ویژه‌ای برای حاکم چارت در داده فعلی ثبت نشده است.",
        condition?.evidence ?? [],
      ),
      section(
        "major-aspects",
        aspects.length > 0
          ? aspects.map(formatAspect).join(" ")
          : `برای ${chartRuler.planetLabel} جنبه اصلی نزدیکی در فهرست فعلی انتخاب نشده است.`,
        aspects.map(aspectEvidence),
      ),
      section(
        "whole-chart-connection",
        [
          chartRuler.pathSummary,
          patternLinks.length > 0
            ? `این سیاره در ${patternLinks.map((item) => item.title).join(" و ")} هم حضور دارد.`
            : null,
          options.rulership.dispositorChain?.summary ?? null,
        ]
          .filter(Boolean)
          .join(" "),
      ),
      section(
        "daily-life",
        mergeNarrativeGroup(
        cleanSentence(reading.dailyLifeExample),
        narrativeBucket(inherited, 0),
      ),
      ),
      section(
        "healthy-capacity",
        mergeNarrativeGroup(
        cleanSentence(reading.healthyExpression),
        narrativeBucket(inherited, 1),
      ),
      ),
      section(
        "under-pressure",
        mergeNarrativeGroup(
        cleanSentence(reading.possibleFriction),
        narrativeBucket(inherited, 2),
      ),
      ),
      section(
        "integration",
        mergeNarrativeGroup(
          `یک تمرین کوچک: ${cleanSentence(reading.smallExperiment)}`,
          narrativeBucket(inherited, 3),
        ),
      ),
      section("evidence", evidence.join("؛ "), evidence),
    ],
  };
}

function buildWholeChartConnection(
  planetId: PersonalPlanetId,
  label: string,
  options: BuildPersonalPlanetChaptersOptions,
  patternTitles: string[],
  aspects: RealEngineReportAspect[],
): string {
  const parts: string[] = [];
  if (options.rulership.chartRuler?.planetId === planetId) {
    parts.push(`${label} حاکم چارت است و در مسیر کلی انتخاب‌ها وزن بیشتری دارد.`);
  }
  if (patternTitles.length > 0) {
    parts.push(`${label} در ${patternTitles.slice(0, 2).join(" و ")} مشارکت دارد.`);
  }
  if (aspects.length > 0) {
    parts.push(
      `نزدیک‌ترین تماس ذخیره‌شده‌اش با ${otherPlanetLabel(aspects[0], planetId)} است.`,
    );
  }
  return parts.length > 0
    ? parts.join(" ")
    : `${label} در ساختارهای برجسته فعلی نقش غالبی نگرفته است؛ بنابراین این فصل زمینه‌ای خوانده می‌شود، نه محور همهٔ چارت.`;
}

function selectPlanetAspects(
  report: AstrologyReport,
  planetId: string,
): RealEngineReportAspect[] {
  const stored = [
    ...(report.realEngine?.aspectHighlights ?? []),
    ...(report.realEngine?.aspects ?? []),
  ];
  const seen = new Set<string>();
  return stored
    .filter(
      (aspect) =>
        aspect.firstPlanetId === planetId ||
        aspect.secondPlanetId === planetId,
    )
    .filter((aspect) => {
      if (seen.has(aspect.id)) return false;
      seen.add(aspect.id);
      return true;
    })
    .sort((first, second) => first.orb - second.orb || first.id.localeCompare(second.id))
    .slice(0, 3);
}

function buildPlanetEvidence(
  label: string,
  placement: RealEngineReportPlacement,
  hasReliableBirthTime: boolean,
  dignityLabel: string | undefined,
  aspects: RealEngineReportAspect[],
  patterns: string[],
): string[] {
  const evidence = [
    `${label}: ${formatZodiacLabel(placement.signId)}، درجه ${formatDegree(placement.degreeInSign)}`,
    hasReliableBirthTime && normalizeHouse(placement.house)
      ? `خانه ${formatFa(normalizeHouse(placement.house)!)}`
      : "خانه وارد خوانش نشده",
    dignityLabel,
    ...aspects.map(aspectEvidence),
    ...patterns.slice(0, 2),
  ].filter((item): item is string => Boolean(item));

  return [...new Set(evidence)];
}

function formatPlacement(
  placement: RealEngineReportPlacement,
  hasReliableBirthTime: boolean,
): string {
  const house = hasReliableBirthTime ? normalizeHouse(placement.house) : null;
  return `${formatZodiacLabel(placement.signId)}، درجه ${formatDegree(placement.degreeInSign)}${
    house ? `، خانه ${formatFa(house)}` : ""
  }`;
}

function formatAspect(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel} با اورب ${formatDegree(aspect.orb)}.`;
}

function aspectEvidence(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel} · اورب ${formatDegree(aspect.orb)}`;
}

function otherPlanetLabel(
  aspect: RealEngineReportAspect,
  planetId: string,
): string {
  return aspect.firstPlanetId === planetId
    ? aspect.secondPlanetLabel
    : aspect.firstPlanetLabel;
}

function section(
  id: PersonalPlanetChapterSectionId,
  body: string,
  evidence: string[] = [],
): PersonalPlanetChapterSection {
  return {
    id,
    label: SECTION_LABELS[id],
    body: cleanSentence(body),
    evidence: [...new Set(evidence.filter(Boolean))],
  };
}

function unavailableChapter(
  id: PersonalPlanetChapterId,
  title: string,
  navigationId: PersonalPlanetChapter["navigationId"],
  reason: string,
): PersonalPlanetChapter {
  return {
    id,
    title,
    navigationId,
    available: false,
    summary: reason,
    sections: [
      section("position", reason),
      section("core-meaning", "این فصل فقط تا مرز داده معتبر پیش می‌رود."),
      section("sign-expression", "جزئیات غایب ساخته نمی‌شوند."),
      section("house-expression", "اثر خانه بدون داده معتبر وارد متن نمی‌شود."),
      section("planet-condition", "فقط وضعیت‌های مستقل از داده غایب قابل استفاده‌اند."),
      section("major-aspects", "جنبه‌ای برای داده غایب ساخته نمی‌شود."),
      section("whole-chart-connection", "اتصال ساختگی به کل چارت ساخته نمی‌شود."),
      section("daily-life", "تجربه روزمره از داده غایب استنتاج نمی‌شود."),
      section("healthy-capacity", "ظرفیت فرضی ساخته نمی‌شود."),
      section("under-pressure", "رفتار فرضی ساخته نمی‌شود."),
      section("integration", "تمرین شخصی بدون پشتوانه داده ساخته نمی‌شود."),
      section("evidence", reason, [reason]),
    ],
  };
}

function narrativeBucket(
  inherited: string[],
  offset: 0 | 1 | 2 | 3,
): string[] {
  return inherited.filter((_, index) => index % 4 === offset);
}

function mergeNarrativeGroup(primary: string, inherited: string[]): string {
  return inherited.reduce(
    (combined, paragraph) => mergeNarrative(combined, paragraph),
    cleanSentence(primary),
  );
}

function mergeNarrative(primary: string, inherited?: string): string {
  const first = cleanSentence(primary);
  const second = inherited ? cleanSentence(inherited) : "";
  if (!second) return first;

  const firstKey = first.replace(/\s+/gu, " ").trim();
  const secondKey = second.replace(/\s+/gu, " ").trim();
  if (
    firstKey === secondKey ||
    firstKey.includes(secondKey) ||
    secondKey.includes(firstKey)
  ) {
    return firstKey.length >= secondKey.length ? first : second;
  }

  return `${first} ${second}`.trim();
}

function uniqueNarratives(items: string[]): string[] {
  const seen = new Set<string>();
  return items
    .map((item) => cleanSentence(item))
    .filter((item) => {
      const key = item.replace(/\s+/gu, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeHouse(
  value: number | null | undefined,
): RealEngineReportHouseNumber | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
    ? (value as RealEngineReportHouseNumber)
    : null;
}

function cleanSentence(value: string): string {
  const cleaned = String(value ?? "")
    .replace(/\s+/gu, " ")
    .replace(/\s+([،؛.!؟])/gu, "$1")
    .trim();
  return !cleaned || /[.!؟]$/u.test(cleaned) ? cleaned : `${cleaned}.`;
}

function formatDegree(value: number): string {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value)}°`;
}

function formatFa(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function chapterTitleSuffix(planetId: PersonalPlanetId): string {
  switch (planetId) {
    case "sun":
      return "هویت و جهت";
    case "moon":
      return "احساس و امنیت";
    case "mercury":
      return "فکر و بیان";
    case "venus":
      return "ارزش، نزدیکی و مرز";
    case "mars":
      return "میل، حرکت و عمل";
  }
}
