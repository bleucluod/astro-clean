import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";
import type { ChartProminenceProfile } from "@/lib/astrology/chart-prominence";
import type {
  ChartPattern,
  ChartPatternProfile,
} from "@/lib/astrology/chart-patterns";
import type { ChartRulershipProfile } from "@/lib/astrology/chart-rulership";
import type { ValidatedSupplementaryPointsProfile } from "@/lib/astrology/validated-supplementary-points";

export const WHOLE_CHART_SYNTHESIS_VERSION = "whole-chart-synthesis-v1" as const;

export type WholeChartFixedChapterId =
  | "jupiter"
  | "saturn"
  | "sun-moon-rising"
  | "chart-ruler-story"
  | "element-modality-balance"
  | "lunar-node-axis"
  | "whole-chart-summary";

export type WholeChartDynamicChapterKind =
  | "stellium"
  | "major-pattern"
  | "angular-planet"
  | "active-house"
  | "outer-planet"
  | "chiron"
  | "part-of-fortune"
  | "exact-aspect"
  | "dispositor-chain";

export type WholeChartLifeAreaId =
  | "identity-self-expression"
  | "emotional-security"
  | "mind-communication"
  | "love-intimacy"
  | "will-anger"
  | "home-family"
  | "creativity"
  | "work-social-role"
  | "friendship-community"
  | "growth-personal-path";

export type WholeChartSynthesisChapter = {
  id: string;
  kind: WholeChartFixedChapterId | WholeChartDynamicChapterKind;
  title: string;
  available: boolean;
  summary: string;
  paragraphs: string[];
  evidence: string[];
  selectedByProminence: boolean;
};

export type WholeChartLifeArea = {
  id: WholeChartLifeAreaId;
  title: string;
  available: boolean;
  summary: string;
  factors: string[];
  evidence: string[];
};

export type WholeChartSynthesisProfile = {
  version: typeof WHOLE_CHART_SYNTHESIS_VERSION;
  hasReliableBirthTime: boolean;
  fixedChapters: WholeChartSynthesisChapter[];
  dynamicChapters: WholeChartSynthesisChapter[];
  lifeAreas: WholeChartLifeArea[];
};

export type BuildWholeChartSynthesisOptions = {
  prominence: ChartProminenceProfile;
  chartPatterns: ChartPatternProfile;
  rulership: ChartRulershipProfile;
  supplementaryPoints: ValidatedSupplementaryPointsProfile;
};

type MajorPlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

type ElementId = "fire" | "earth" | "air" | "water";
type ModalityId = "cardinal" | "fixed" | "mutable";

type NodePoint = {
  signId?: ZodiacKey;
  degreeInSign?: number;
  house?: number | null;
};

type NodeAxis = {
  status?: string;
  northNode?: NodePoint | null;
  southNode?: NodePoint | null;
};

const MAJOR_PLANETS = new Set<MajorPlanetId>([
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
const OUTER_PLANETS = new Set<MajorPlanetId>(["uranus", "neptune", "pluto"]);

const PLANET_LABELS: Record<MajorPlanetId, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

const PLANET_ROLES: Record<"jupiter" | "saturn", string> = {
  jupiter:
    "مشتری به گسترش، معنا، امید و افقی مربوط است که تو را از محدودهٔ فعلی کمی دورتر می‌برد.",
  saturn:
    "زحل به مرز، زمان، مسئولیت و مهارتی مربوط است که با تکرار و تحمل واقعیت ساخته می‌شود.",
};

const SIGN_LABELS: Record<ZodiacKey, string> = {
  aries: "حمل",
  taurus: "ثور",
  gemini: "جوزا",
  cancer: "سرطان",
  leo: "اسد",
  virgo: "سنبله",
  libra: "میزان",
  scorpio: "عقرب",
  sagittarius: "قوس",
  capricorn: "جدی",
  aquarius: "دلو",
  pisces: "حوت",
};

const SIGN_ELEMENT: Record<ZodiacKey, ElementId> = {
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

const SIGN_MODALITY: Record<ZodiacKey, ModalityId> = {
  aries: "cardinal",
  cancer: "cardinal",
  libra: "cardinal",
  capricorn: "cardinal",
  taurus: "fixed",
  leo: "fixed",
  scorpio: "fixed",
  aquarius: "fixed",
  gemini: "mutable",
  virgo: "mutable",
  sagittarius: "mutable",
  pisces: "mutable",
};

const ELEMENT_LABELS: Record<ElementId, string> = {
  fire: "آتش",
  earth: "زمین",
  air: "هوا",
  water: "آب",
};

const MODALITY_LABELS: Record<ModalityId, string> = {
  cardinal: "آغازگر",
  fixed: "پایدار",
  mutable: "انعطاف‌پذیر",
};

const HOUSE_FIELDS: Record<RealEngineReportHouseNumber, string> = {
  1: "هویت، بدن و شروع‌ها",
  2: "ارزش، امنیت و منابع",
  3: "ذهن، یادگیری و ارتباط",
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

const LIFE_AREA_SPECS: ReadonlyArray<{
  id: WholeChartLifeAreaId;
  title: string;
  planetIds: readonly MajorPlanetId[];
  houses: readonly RealEngineReportHouseNumber[];
  includeNodes?: boolean;
}> = [
  { id: "identity-self-expression", title: "هویت و خودابرازی", planetIds: ["sun"], houses: [1, 5] },
  { id: "emotional-security", title: "امنیت عاطفی", planetIds: ["moon"], houses: [2, 4] },
  { id: "mind-communication", title: "ذهن و ارتباط", planetIds: ["mercury"], houses: [3, 9] },
  { id: "love-intimacy", title: "عشق و صمیمیت", planetIds: ["venus", "moon"], houses: [7, 8] },
  { id: "will-anger", title: "اراده و خشم", planetIds: ["mars"], houses: [1, 6] },
  { id: "home-family", title: "خانه و خانواده", planetIds: ["moon", "saturn"], houses: [4] },
  { id: "creativity", title: "خلاقیت", planetIds: ["sun", "venus"], houses: [5] },
  { id: "work-social-role", title: "کار و نقش اجتماعی", planetIds: ["saturn", "jupiter"], houses: [6, 10] },
  { id: "friendship-community", title: "دوستی و جمع", planetIds: ["jupiter", "uranus"], houses: [11] },
  { id: "growth-personal-path", title: "رشد و مسیر شخصی", planetIds: ["jupiter", "saturn"], houses: [9, 10, 12], includeNodes: true },
];

export function buildWholeChartSynthesis(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisProfile {
  const hasReliableBirthTime = options.prominence.hasReliableBirthTime;
  const fixedChapters = buildFixedChapters(report, options);
  const dynamicChapters = buildDynamicChapters(report, options);
  const lifeAreas = LIFE_AREA_SPECS.map((spec) =>
    buildLifeArea(report, options, spec),
  );

  return {
    version: WHOLE_CHART_SYNTHESIS_VERSION,
    hasReliableBirthTime,
    fixedChapters,
    dynamicChapters,
    lifeAreas,
  };
}

function buildFixedChapters(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisChapter[] {
  return [
    buildSocialPlanetChapter(report, options, "jupiter"),
    buildSocialPlanetChapter(report, options, "saturn"),
    buildSunMoonRisingChapter(report, options),
    buildChartRulerChapter(options),
    buildBalanceChapter(report, options),
    buildNodeAxisChapter(report, options),
    buildWholeChartSummary(options),
  ];
}

function buildSocialPlanetChapter(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
  planetId: "jupiter" | "saturn",
): WholeChartSynthesisChapter {
  const placement = findPlacement(report, planetId);
  const label = PLANET_LABELS[planetId];
  if (!placement) {
    return unavailableFixed(planetId, label, `جایگاه معتبر ${label} برای این خوانش ثبت نشده است.`);
  }
  const condition = options.rulership.planetConditions.find(
    (item) => item.planetId === planetId,
  );
  const aspects = selectPlanetAspects(report, planetId);
  const patterns = options.chartPatterns.patterns.filter((pattern) =>
    pattern.participantIds.includes(planetId),
  );
  const house = options.prominence.hasReliableBirthTime
    ? normalizeHouse(placement.house)
    : null;
  const position = `${SIGN_LABELS[placement.signId]}، درجه ${formatDegree(placement.degreeInSign)}${
    house ? `، خانه ${formatFa(house)}` : ""
  }`;
  const paragraphs = [
    `${label} در ${position} قرار دارد. ${PLANET_ROLES[planetId]}`,
    house
      ? `در این چارت، این موضوع بیشتر در میدان ${HOUSE_FIELDS[house]} تجربه می‌شود.`
      : "بدون ساعت تولد معتبر، این بخش از نسبت‌دادن میدان خانه به این سیاره خودداری می‌کند.",
    condition ? `${condition.dignityLabel}. ${condition.expression}` : "وضعیت کلاسیک ویژه‌ای برای این جایگاه ثبت نشده است.",
    aspects[0]
      ? `نزدیک‌ترین تماس اصلی آن ${formatAspect(aspects[0])} است و باید همراه با خود جایگاه خوانده شود.`
      : `در فهرست تماس‌های اصلی، جنبهٔ نزدیکی برای ${label} انتخاب نشده است.`,
    patterns[0]
      ? `${label} در ${patterns[0].title} هم مشارکت دارد؛ بنابراین معنایش فقط به جایگاه منفرد محدود نمی‌شود.`
      : `${label} در الگوی چندسیاره‌ای انتخاب‌شده‌ای نقش مرکزی نگرفته است.`,
  ];

  return chapter({
    id: planetId,
    kind: planetId,
    title: `${label}؛ ${planetId === "jupiter" ? "گسترش و معنا" : "مرز، زمان و ساختن"}`,
    summary: `${label} در ${position}؛ این فصل جایگاه آن را کنار وضعیت کلاسیک، تماس‌های نزدیک و ساختار کل چارت می‌خواند.`,
    paragraphs,
    evidence: unique([
      `${label}: ${position}`,
      condition?.dignityLabel,
      aspects[0] ? aspectEvidence(aspects[0]) : null,
      patterns[0]?.title,
    ]),
    selectedByProminence: isPlanetSelected(options.prominence, planetId),
  });
}

function buildSunMoonRisingChapter(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisChapter {
  const sun = findPlacement(report, "sun");
  const moon = findPlacement(report, "moon");
  if (!sun || !moon) {
    return unavailableFixed(
      "sun-moon-rising",
      "ترکیب خورشید، ماه و طالع",
      "برای ساختن این ترکیب، جایگاه معتبر خورشید و ماه لازم است.",
    );
  }
  const asc = options.prominence.hasReliableBirthTime
    ? report.realEngine?.angles?.asc ?? null
    : null;
  const sunPosition = shortPlacement(sun, options.prominence.hasReliableBirthTime);
  const moonPosition = shortPlacement(moon, options.prominence.hasReliableBirthTime);
  const risingText = asc
    ? `طالع در ${SIGN_LABELS[asc.signId]}، درجه ${formatDegree(asc.degreeInSign)}`
    : "ساعت تولد دقیق ثبت نشده؛ طالع وارد این ترکیب نمی‌شود";
  const paragraphs = [
    `خورشید در ${sunPosition} جهت هویت آگاهانه را نشان می‌دهد، درحالی‌که ماه در ${moonPosition} از امنیت عاطفی و واکنش‌های خودکار می‌گوید.`,
    asc
      ? `${risingText}. این سه جایگاه وقتی کنار هم قرار می‌گیرند، تفاوت میان آنچه می‌خواهی بسازی، آنچه برای آرام‌شدن لازم داری و شیوهٔ ورودت به جهان را روشن‌تر می‌کنند.`
      : `${risingText}. بنابراین سنتز فقط روی خورشید و ماه می‌ایستد و جای خالی طالع را پر نمی‌کند.`,
    options.prominence.luminaryEmphasis
      ? `موتور برجستگی برای خورشید و ماه این نشانه را ثبت کرده است: ${options.prominence.luminaryEmphasis.label}.`
      : "هیچ‌کدام از دو نور به‌تنهایی به‌عنوان مرکز ثقل جداگانه انتخاب نشده‌اند؛ رابطهٔ میانشان مهم‌تر است.",
  ];

  return chapter({
    id: "sun-moon-rising",
    kind: "sun-moon-rising",
    title: "خورشید، ماه و طالع؛ سه ریتمی که باید با هم خوانده شوند",
    summary: asc
      ? `خورشید ${sunPosition}، ماه ${moonPosition} و ${risingText} سه لایهٔ متفاوت از یک نفرند.`
      : `خورشید ${sunPosition} و ماه ${moonPosition} قابل سنتزند؛ طالع به‌دلیل نبود ساعت معتبر کنار گذاشته شده است.`,
    paragraphs,
    evidence: unique([
      `خورشید: ${sunPosition}`,
      `ماه: ${moonPosition}`,
      asc ? risingText : null,
      options.prominence.luminaryEmphasis?.label,
    ]),
    selectedByProminence: Boolean(options.prominence.luminaryEmphasis),
  });
}

function buildChartRulerChapter(
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisChapter {
  const ruler = options.rulership.chartRuler;
  if (!ruler) {
    return unavailableFixed(
      "chart-ruler-story",
      "داستان حاکم چارت",
      options.prominence.hasReliableBirthTime
        ? "دادهٔ محاسبه‌شدهٔ کافی برای ساختن مسیر حاکم چارت در این گزارش وجود ندارد."
        : "ساعت تولد دقیق ثبت نشده؛ بنابراین حاکم طالع و مسیرش در چارت ساخته نمی‌شود.",
    );
  }
  const ruledHouses = options.rulership.houseRulers.filter(
    (item) => item.rulerPlanetId === ruler.planetId,
  );
  const paragraphs = [
    ruledHouses.length > 0
      ? `${ruler.planetLabel} علاوه بر طالع، مسیر ${ruledHouses
          .slice(0, 3)
          .map((item) => `خانه ${formatFa(item.house)}`)
          .join("، ")} را هم به جایگاه خودش وصل می‌کند؛ بنابراین چند میدان زندگی از یک سیاره عبور می‌کنند.`
      : "در دادهٔ فعلی پیوند خانهٔ دیگری برای افزودن به این مسیر ثبت نشده است.",
    options.rulership.dispositorChain
      ? `زنجیرهٔ حاکمیتی نیز این مسیر را ادامه می‌دهد: ${options.rulership.dispositorChain.summary}`
      : "زنجیرهٔ حاکمیتی مستقل و معناداری برای افزودن به این داستان ساخته نشده است.",
  ];
  return chapter({
    id: "chart-ruler-story",
    kind: "chart-ruler-story",
    title: `داستان حاکم چارت؛ ${ruler.planetLabel} مسیر را به کجا می‌برد؟`,
    summary: ruler.pathSummary,
    paragraphs,
    evidence: unique([
      ...ruler.evidence,
      ...ruledHouses.slice(0, 2).flatMap((item) => item.evidence.slice(0, 1)),
    ]),
    selectedByProminence: isPlanetSelected(options.prominence, ruler.planetId),
  });
}

function buildBalanceChapter(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisChapter {
  const placements = majorPlacements(report);
  if (placements.length === 0) {
    return unavailableFixed(
      "element-modality-balance",
      "تعادل عناصر و کیفیت‌ها",
      "جایگاه سیاره‌ای کافی برای ساختن تعادل عناصر و کیفیت‌ها ثبت نشده است.",
    );
  }
  const elementCounts = countBy(placements, (item) => SIGN_ELEMENT[item.signId]);
  const modalityCounts = countBy(placements, (item) => SIGN_MODALITY[item.signId]);
  const topElement = leader(elementCounts);
  const lowElement = trailer(elementCounts, ["fire", "earth", "air", "water"] as ElementId[]);
  const topModality = leader(modalityCounts);
  const paragraphs = [
    topElement
      ? `${ELEMENT_LABELS[topElement[0]]} با ${formatFa(topElement[1])} جایگاه بیشترین حضور را دارد؛ این فقط ریتم پرتکرارتر را نشان می‌دهد، نه ارزش بیشتر را.`
      : "هیچ عنصر واحدی بر بقیه غلبهٔ عددی روشنی ندارد.",
    topModality
      ? `در کیفیت‌ها، ${MODALITY_LABELS[topModality[0]]} با ${formatFa(topModality[1])} جایگاه پررنگ‌تر است و شیوهٔ واکنش به شروع، ادامه یا تغییر را رنگ می‌زند.`
      : "کیفیت‌ها بدون یک رهبر روشن میان چند ریتم تقسیم شده‌اند.",
    lowElement
      ? `${ELEMENT_LABELS[lowElement[0]]} با ${formatFa(lowElement[1])} جایگاه کم‌حضورتر است؛ کم‌حضور بودن به معنی ضعف نیست و فقط نشان می‌دهد این ریتم کمتر تکرار شده است.`
      : "هیچ عنصر کم‌حضور مشخصی از شمارش فعلی بیرون نمی‌آید.",
  ];
  return chapter({
    id: "element-modality-balance",
    kind: "element-modality-balance",
    title: "تعادل عناصر و کیفیت‌ها؛ چارت بیشتر با چه ریتمی حرکت می‌کند؟",
    summary: [
      topElement ? `عنصر پررنگ‌تر: ${ELEMENT_LABELS[topElement[0]]}` : null,
      topModality ? `کیفیت پررنگ‌تر: ${MODALITY_LABELS[topModality[0]]}` : null,
    ].filter(Boolean).join(" · ") || "ترکیب چند ریتم بدون غلبهٔ روشن",
    paragraphs,
    evidence: [
      ...(["fire", "earth", "air", "water"] as ElementId[]).map(
        (id) => `${ELEMENT_LABELS[id]}: ${formatFa(elementCounts.get(id) ?? 0)}`,
      ),
      ...(["cardinal", "fixed", "mutable"] as ModalityId[]).map(
        (id) => `${MODALITY_LABELS[id]}: ${formatFa(modalityCounts.get(id) ?? 0)}`,
      ),
    ],
    selectedByProminence: options.prominence.signatures.some(
      (item) => item.kind === "theme" || item.kind === "distribution",
    ),
  });
}

function buildNodeAxisChapter(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisChapter {
  const nodes = report.realEngine?.lunarNodes as NodeAxis | undefined;
  const north = nodes?.northNode;
  const south = nodes?.southNode;
  if (
    nodes?.status !== "calculated" ||
    !isNodePoint(north) ||
    !isNodePoint(south)
  ) {
    return unavailableFixed(
      "lunar-node-axis",
      "محور گره‌های ماه",
      "محور معتبر گره‌های ماه برای این گزارش ثبت نشده است؛ مسیر رشد اضافه‌ای ساخته نمی‌شود.",
    );
  }
  const northHouse = options.prominence.hasReliableBirthTime
    ? normalizeHouse(north.house)
    : null;
  const southHouse = options.prominence.hasReliableBirthTime
    ? normalizeHouse(south.house)
    : null;
  const northText = `${SIGN_LABELS[north.signId]}${northHouse ? `، خانه ${formatFa(northHouse)}` : ""}`;
  const southText = `${SIGN_LABELS[south.signId]}${southHouse ? `، خانه ${formatFa(southHouse)}` : ""}`;
  return chapter({
    id: "lunar-node-axis",
    kind: "lunar-node-axis",
    title: "محور گره‌های ماه؛ الگوی آشنا و جهت تمرین",
    summary: `از گرهٔ جنوبی در ${southText} به سمت گرهٔ شمالی در ${northText}.`,
    paragraphs: [
      `گرهٔ جنوبی در ${southText} الگویی آشناتر را نشان می‌دهد؛ چیزی که در فشار یا عادت راحت‌تر به آن برمی‌گردی.`,
      `گرهٔ شمالی در ${northText} جهت تمرینی تازه‌تری را پیشنهاد می‌کند. این محور حکم قطعی دربارهٔ سرنوشت نیست و باید کنار بقیهٔ چارت خوانده شود.`,
      options.prominence.hasReliableBirthTime
        ? "خانه‌های این دو نقطه در سنتز حوزه‌های زندگی نیز استفاده می‌شوند، چون ساعت تولد معتبر است."
        : "چون ساعت تولد دقیق نیست، فقط برج‌های محور وارد این سنتز شده‌اند و خانه‌ها کنار گذاشته شده‌اند.",
    ],
    evidence: unique([
      `گرهٔ جنوبی: ${southText}`,
      `گرهٔ شمالی: ${northText}`,
    ]),
    selectedByProminence: options.prominence.signatures.some(
      (item) => item.kind === "theme" && /رشد|گره|مسیر/u.test(item.title + item.summary),
    ),
  });
}

function buildWholeChartSummary(
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisChapter {
  const top = options.prominence.signatures.slice(0, 3);
  const paragraphs = [
    top.length > 0
      ? `سه عامل بالاتر در رتبه‌بندی فعلی عبارت‌اند از ${top.map((item) => item.title).join("، ")}. این‌ها باید به‌عنوان یک ترکیب خوانده شوند، نه سه برچسب جدا.`
      : "هیچ عامل واحدی با فاصلهٔ کافی برای ساختن یک جمع‌بندی برجسته انتخاب نشده است.",
    options.chartPatterns.primaryPattern
      ? `الگوی چندسیاره‌ای پررنگ‌تر نیز ${options.chartPatterns.primaryPattern.title} است و به جمع‌بندی وزن بیشتری می‌دهد.`
      : "الگوی چندسیاره‌ای مستقلی برای افزودن به جمع‌بندی انتخاب نشده است.",
  ];
  return chapter({
    id: "whole-chart-summary",
    kind: "whole-chart-summary",
    title: "جمع‌بندی کل چارت؛ وقتی قطعه‌ها کنار هم قرار می‌گیرند",
    summary: options.prominence.chartSentence,
    paragraphs,
    evidence: unique(top.flatMap((item) => [item.title, ...item.evidence.slice(0, 1)])),
    selectedByProminence: top.length > 0,
  });
}

function buildDynamicChapters(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
): WholeChartSynthesisChapter[] {
  const output: WholeChartSynthesisChapter[] = [];
  const selectedIds = new Set(options.prominence.signatures.map((item) => item.id));
  const claimedPlanets = new Set<string>();

  for (const pattern of options.chartPatterns.patterns) {
    if (!selectedIds.has(pattern.id)) continue;
    if (pattern.kind === "sign-stellium" || pattern.kind === "house-stellium") {
      output.push(dynamicPatternChapter(pattern, "stellium"));
    } else if (pattern.kind === "t-square" || pattern.kind === "grand-trine") {
      output.push(dynamicPatternChapter(pattern, "major-pattern"));
    }
  }

  const selectedPlanetId = selectedPlanetSignature(options.prominence);
  if (selectedPlanetId && options.prominence.dominantPlanet?.id === selectedPlanetId) {
    const angularEvidence = options.prominence.dominantPlanet.evidence.filter(
      (item) => item.id === "angular-house" || item.id.startsWith("angle-"),
    );
    if (angularEvidence.length > 0) {
      const placement = findPlacement(report, selectedPlanetId);
      output.push(chapter({
        id: `dynamic-angular-${selectedPlanetId}`,
        kind: "angular-planet",
        title: `${PLANET_LABELS[selectedPlanetId]} نزدیک زاویه؛ حضور پررنگ‌تر در صحنهٔ زندگی`,
        summary: `${PLANET_LABELS[selectedPlanetId]} فقط به‌دلیل خانه یا برجش انتخاب نشده؛ نزدیکی به یک زاویه در امتیاز برجستگی آن نقش داشته است.`,
        paragraphs: [
          placement
            ? `${PLANET_LABELS[selectedPlanetId]} در ${shortPlacement(placement, options.prominence.hasReliableBirthTime)} قرار دارد.`
            : `${PLANET_LABELS[selectedPlanetId]} در موتور برجستگی به‌عنوان سیارهٔ زاویه‌ای انتخاب شده است.`,
          "سیارهٔ نزدیک زاویه معمولاً در تجربهٔ بیرونی یا نقاط عطف حضور آشکارتری پیدا می‌کند؛ این به معنی خوب یا بد بودن آن نیست.",
        ],
        evidence: angularEvidence.map((item) => item.label),
        selectedByProminence: true,
      }));
      claimedPlanets.add(selectedPlanetId);
    }
  }

  if (selectedPlanetId && OUTER_PLANETS.has(selectedPlanetId) && !claimedPlanets.has(selectedPlanetId)) {
    const placement = findPlacement(report, selectedPlanetId);
    output.push(chapter({
      id: `dynamic-outer-${selectedPlanetId}`,
      kind: "outer-planet",
      title: `${PLANET_LABELS[selectedPlanetId]}؛ وقتی یک سیارهٔ نسلی واقعاً شخصی می‌شود`,
      summary: `${PLANET_LABELS[selectedPlanetId]} در میان سه امضای اصلی چارت انتخاب شده است؛ بنابراین فقط به‌عنوان پس‌زمینهٔ نسلی خوانده نمی‌شود.`,
      paragraphs: [
        placement
          ? `${PLANET_LABELS[selectedPlanetId]} در ${shortPlacement(placement, options.prominence.hasReliableBirthTime)} قرار دارد و چند عامل مستقل امتیاز آن را بالا برده‌اند.`
          : `${PLANET_LABELS[selectedPlanetId]} با چند شاهد مستقل در رتبه‌بندی بالا آمده است.`,
        "شخصی‌شدن در اینجا یعنی دادهٔ همین چارت آن را به مرکز نزدیک کرده است؛ نه اینکه هر فرد هم‌نسل همین تجربه را داشته باشد.",
      ],
      evidence: options.prominence.dominantPlanet?.evidence.map((item) => item.label) ?? [],
      selectedByProminence: true,
    }));
  }

  const selectedHouse = options.prominence.signatures.find((item) => item.kind === "house");
  if (
    selectedHouse &&
    options.prominence.dominantHouse &&
    selectedHouse.id === options.prominence.dominantHouse.id
  ) {
    output.push(chapter({
      id: `dynamic-${options.prominence.dominantHouse.id}`,
      kind: "active-house",
      title: `خانهٔ بسیار فعال؛ ${options.prominence.dominantHouse.label}`,
      summary: selectedHouse.summary,
      paragraphs: [
        `${options.prominence.dominantHouse.label} با چند عامل مستقل در رتبه‌بندی بالا آمده است.`,
        "این فصل به‌جای تکرار تک‌تک سیاره‌های آن خانه، آن‌ها را به‌عنوان یک میدان مشترک زندگی کنار هم می‌گذارد.",
      ],
      evidence: options.prominence.dominantHouse.evidence.map((item) => item.label),
      selectedByProminence: true,
    }));
  }

  const selectedAspect = options.prominence.signatures.find((item) => item.kind === "aspect");
  if (selectedAspect && options.prominence.dominantAspect) {
    output.push(chapter({
      id: `dynamic-aspect-${options.prominence.dominantAspect.id}`,
      kind: "exact-aspect",
      title: `یک تماس محوری؛ ${options.prominence.dominantAspect.label}`,
      summary: selectedAspect.summary,
      paragraphs: [
        "این تماس به‌خاطر اورب نزدیک و نقش سیاره‌های درگیر در میان امضاهای اصلی قرار گرفته است.",
        "در سنتز کل چارت، معنای این جنبه از رابطهٔ دو نیاز یا دو کارکرد ساخته می‌شود و نباید جدا از جایگاه‌های دو سیاره خوانده شود.",
      ],
      evidence: options.prominence.dominantAspect.evidence.map((item) => item.label),
      selectedByProminence: true,
    }));
  }

  const rulerPlanetId = options.rulership.chartRuler?.planetId;
  if (
    rulerPlanetId &&
    selectedIds.has(`planet-${rulerPlanetId}`) &&
    options.rulership.dispositorChain &&
    options.rulership.dispositorChain.steps.length > 1
  ) {
    output.push(chapter({
      id: "dynamic-dispositor-chain",
      kind: "dispositor-chain",
      title: "زنجیرهٔ حاکمیتی مهم؛ جهت از کجا به کجا منتقل می‌شود؟",
      summary: options.rulership.dispositorChain.summary,
      paragraphs: [
        "این زنجیره فقط چون حاکم چارت خودش در میان امضاهای اصلی انتخاب شده وارد فصل پویا شده است.",
        options.rulership.dispositorChain.summary,
      ],
      evidence: options.rulership.dispositorChain.steps.slice(0, 4).map(
        (step) => `${step.planetLabel} در ${step.signLabel} ← ${step.rulerPlanetLabel}`,
      ),
      selectedByProminence: true,
    }));
  }

  const fortune = options.supplementaryPoints.partOfFortune;
  if (fortune && selectedIds.has(`house-${fortune.house}`)) {
    output.push(chapter({
      id: "dynamic-part-of-fortune",
      kind: "part-of-fortune",
      title: "سهم سعادت در یکی از میدان‌های برجستهٔ چارت",
      summary: fortune.summary,
      paragraphs: [
        `سهم سعادت در خانه ${formatFa(fortune.house)} قرار دارد و همان خانه در موتور برجستگی نیز انتخاب شده است؛ فقط به همین دلیل وارد فصل پویا می‌شود.`,
        "این نقطه برای وعدهٔ شانس یا نتیجهٔ قطعی استفاده نمی‌شود؛ نقش آن محدود به دیدن زمینه‌ای است که هماهنگی میان طالع، خورشید و ماه می‌تواند روان‌تر شکل بگیرد.",
      ],
      evidence: fortune.evidence.slice(0, 4),
      selectedByProminence: true,
    }));
  }

  return dedupeChapters(output);
}

function dynamicPatternChapter(
  pattern: ChartPattern,
  kind: "stellium" | "major-pattern",
): WholeChartSynthesisChapter {
  return chapter({
    id: `dynamic-${pattern.id}`,
    kind,
    title: pattern.title,
    summary: pattern.summary,
    paragraphs: [
      kind === "stellium"
        ? "این تمرکز به‌جای چند تفسیر جدا، به‌عنوان یک میدان واحد خوانده می‌شود؛ چند سیاره هم‌زمان یک برج یا خانه را پررنگ کرده‌اند."
        : "این الگو از چند تماس واقعی ساخته شده و فشار یا هماهنگی آن از رابطهٔ کل ساختار می‌آید، نه از یک جنبهٔ منفرد.",
    ],
    evidence: pattern.evidence,
    selectedByProminence: true,
  });
}

function buildLifeArea(
  report: AstrologyReport,
  options: BuildWholeChartSynthesisOptions,
  spec: (typeof LIFE_AREA_SPECS)[number],
): WholeChartLifeArea {
  const factors: string[] = [];
  const evidence: string[] = [];

  for (const planetId of spec.planetIds) {
    const placement = findPlacement(report, planetId);
    if (!placement) continue;
    const label = PLANET_LABELS[planetId];
    const factor = `${label} در ${shortPlacement(placement, options.prominence.hasReliableBirthTime)}`;
    factors.push(factor);
    evidence.push(factor);
  }

  if (options.prominence.hasReliableBirthTime) {
    for (const house of spec.houses) {
      const ruler = options.rulership.houseRulers.find((item) => item.house === house);
      if (ruler) {
        factors.push(`حاکم خانه ${formatFa(house)}: ${ruler.rulerPlanetLabel}`);
        evidence.push(ruler.summary);
      }
    }
    const dominantHouseNumber = options.prominence.dominantHouse
      ? Number(options.prominence.dominantHouse.id.replace("house-", ""))
      : null;
    if (
      dominantHouseNumber &&
      spec.houses.some((house) => house === dominantHouseNumber)
    ) {
      factors.push(`خانه ${formatFa(dominantHouseNumber)} در میان میدان‌های برجستهٔ چارت است`);
      evidence.push(...(options.prominence.dominantHouse?.evidence.map((item) => item.label) ?? []).slice(0, 2));
    }
  }

  const relevantPattern = options.chartPatterns.patterns.find((pattern) =>
    pattern.participantIds.some((id) => spec.planetIds.some((planetId) => planetId === id)),
  );
  if (relevantPattern) {
    factors.push(`الگوی ${relevantPattern.title}`);
    evidence.push(relevantPattern.summary);
  }

  const relevantAspect = selectRelevantAspect(report, spec.planetIds);
  if (relevantAspect) {
    factors.push(formatAspect(relevantAspect));
    evidence.push(aspectEvidence(relevantAspect));
  }

  if (spec.includeNodes) {
    const nodes = report.realEngine?.lunarNodes as NodeAxis | undefined;
    if (nodes?.status === "calculated" && isNodePoint(nodes.northNode) && isNodePoint(nodes.southNode)) {
      factors.push(`محور گره‌ها: ${SIGN_LABELS[nodes.southNode.signId]} ← ${SIGN_LABELS[nodes.northNode.signId]}`);
      evidence.push(`گرهٔ جنوبی ${SIGN_LABELS[nodes.southNode.signId]}؛ گرهٔ شمالی ${SIGN_LABELS[nodes.northNode.signId]}`);
    }
  }

  const uniqueFactors = unique(factors).slice(0, 5);
  const available = uniqueFactors.length >= 2;
  return {
    id: spec.id,
    title: spec.title,
    available,
    summary: available
      ? `${uniqueFactors[0]}؛ هم‌زمان ${uniqueFactors[1]}. این حوزه از رابطهٔ این عوامل ساخته می‌شود، نه از تکرار یک فصل سیاره‌ای.`
      : `برای ساختن سنتز چندعاملیِ ${spec.title} هنوز دو شاهد مستقل کنار هم قرار نگرفته‌اند.`,
    factors: uniqueFactors,
    evidence: unique(evidence).slice(0, 6),
  };
}

function chapter(input: Omit<WholeChartSynthesisChapter, "available">): WholeChartSynthesisChapter {
  return { ...input, available: true };
}

function unavailableFixed(
  id: WholeChartFixedChapterId,
  title: string,
  summary: string,
): WholeChartSynthesisChapter {
  return {
    id,
    kind: id,
    title,
    available: false,
    summary,
    paragraphs: [],
    evidence: [],
    selectedByProminence: false,
  };
}

function majorPlacements(report: AstrologyReport): RealEngineReportPlacement[] {
  return (report.realEngine?.placements ?? []).filter((item) =>
    MAJOR_PLANETS.has(item.id as MajorPlanetId),
  );
}

function findPlacement(
  report: AstrologyReport,
  id: MajorPlanetId,
): RealEngineReportPlacement | undefined {
  return report.realEngine?.placements.find((item) => item.id === id);
}

function selectPlanetAspects(
  report: AstrologyReport,
  planetId: MajorPlanetId,
): RealEngineReportAspect[] {
  return uniqueAspects(report)
    .filter(
      (item) => item.firstPlanetId === planetId || item.secondPlanetId === planetId,
    )
    .sort((first, second) => first.orb - second.orb || first.id.localeCompare(second.id))
    .slice(0, 2);
}

function selectRelevantAspect(
  report: AstrologyReport,
  planetIds: readonly MajorPlanetId[],
): RealEngineReportAspect | null {
  return uniqueAspects(report)
    .filter(
      (item) =>
        planetIds.includes(item.firstPlanetId as MajorPlanetId) ||
        planetIds.includes(item.secondPlanetId as MajorPlanetId),
    )
    .sort((first, second) => first.orb - second.orb || first.id.localeCompare(second.id))[0] ?? null;
}

function uniqueAspects(report: AstrologyReport): RealEngineReportAspect[] {
  const map = new Map<string, RealEngineReportAspect>();
  for (const item of [
    ...(report.realEngine?.aspectHighlights ?? []),
    ...(report.realEngine?.aspects ?? []),
  ]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

function selectedPlanetSignature(
  prominence: ChartProminenceProfile,
): MajorPlanetId | null {
  const signature = prominence.signatures.find(
    (item) => item.kind === "planet" && item.id.startsWith("planet-"),
  );
  const id = signature?.id.replace(/^planet-/u, "") as MajorPlanetId | undefined;
  return id && MAJOR_PLANETS.has(id) ? id : null;
}

function isPlanetSelected(
  prominence: ChartProminenceProfile,
  planetId: string,
): boolean {
  return prominence.signatures.some((item) => item.id === `planet-${planetId}`);
}

function shortPlacement(
  placement: RealEngineReportPlacement,
  hasReliableBirthTime: boolean,
): string {
  const house = hasReliableBirthTime ? normalizeHouse(placement.house) : null;
  return `${SIGN_LABELS[placement.signId]}، درجه ${formatDegree(placement.degreeInSign)}${
    house ? `، خانه ${formatFa(house)}` : ""
  }`;
}

function formatAspect(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel} با اورب ${formatDegree(aspect.orb)}`;
}

function aspectEvidence(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel} · اورب ${formatDegree(aspect.orb)}`;
}

function normalizeHouse(
  value: number | null | undefined,
): RealEngineReportHouseNumber | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12
    ? (value as RealEngineReportHouseNumber)
    : null;
}

function isNodePoint(value: NodePoint | null | undefined): value is NodePoint & {
  signId: ZodiacKey;
  degreeInSign: number;
} {
  return Boolean(
    value &&
      value.signId &&
      typeof value.degreeInSign === "number" &&
      Number.isFinite(value.degreeInSign),
  );
}

function countBy<K extends string>(
  items: RealEngineReportPlacement[],
  getKey: (item: RealEngineReportPlacement) => K,
): Map<K, number> {
  const map = new Map<K, number>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function leader<K extends string>(map: Map<K, number>): [K, number] | null {
  return [...map.entries()].sort(
    (first, second) => second[1] - first[1] || first[0].localeCompare(second[0]),
  )[0] ?? null;
}

function trailer<K extends string>(
  map: Map<K, number>,
  keys: readonly K[],
): [K, number] | null {
  return keys
    .map((key) => [key, map.get(key) ?? 0] as [K, number])
    .sort((first, second) => first[1] - second[1] || first[0].localeCompare(second[0]))[0] ?? null;
}

function dedupeChapters(
  chapters: WholeChartSynthesisChapter[],
): WholeChartSynthesisChapter[] {
  const seen = new Set<string>();
  return chapters.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function unique(items: Array<string | null | undefined>): string[] {
  return [...new Set(items.filter((item): item is string => Boolean(item?.trim())))];
}

function formatDegree(value: number): string {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
    useGrouping: false,
  }).format(value)}°`;
}

function formatFa(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}
