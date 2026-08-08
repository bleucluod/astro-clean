import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";

export const CHART_RULERSHIP_VERSION = "chart-rulership-v1" as const;

export type ClassicalPlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn";

export type PlanetDignityKind =
  | "rulership"
  | "exaltation"
  | "detriment"
  | "fall"
  | "neutral";

export type PlanetCondition = {
  planetId: ClassicalPlanetId;
  planetLabel: string;
  signId: ZodiacKey;
  signLabel: string;
  house: RealEngineReportHouseNumber | null;
  dignities: PlanetDignityKind[];
  dignityLabel: string;
  expression: string;
  majorAspect: string | null;
  evidence: string[];
};

export type HouseRulership = {
  house: RealEngineReportHouseNumber;
  houseField: string;
  cuspSignId: ZodiacKey;
  cuspSignLabel: string;
  rulerPlanetId: ClassicalPlanetId;
  rulerPlanetLabel: string;
  rulerPlacementSignId: ZodiacKey | null;
  rulerPlacementSignLabel: string | null;
  rulerPlacementHouse: RealEngineReportHouseNumber | null;
  linkedHouseField: string | null;
  summary: string;
  evidence: string[];
};

export type ChartRulerPath = {
  risingSignId: ZodiacKey;
  risingSignLabel: string;
  planetId: ClassicalPlanetId;
  planetLabel: string;
  placementSignId: ZodiacKey | null;
  placementSignLabel: string | null;
  placementHouse: RealEngineReportHouseNumber | null;
  pathSummary: string;
  evidence: string[];
};

export type DispositorTermination =
  | "self-rulership"
  | "cycle"
  | "missing-placement"
  | "max-depth";

export type DispositorStep = {
  planetId: ClassicalPlanetId;
  planetLabel: string;
  signId: ZodiacKey;
  signLabel: string;
  rulerPlanetId: ClassicalPlanetId;
  rulerPlanetLabel: string;
  house: RealEngineReportHouseNumber | null;
};

export type DispositorChain = {
  steps: DispositorStep[];
  termination: DispositorTermination;
  summary: string;
};

export type ChartRulershipProfile = {
  version: typeof CHART_RULERSHIP_VERSION;
  hasReliableBirthTime: boolean;
  chartRuler: ChartRulerPath | null;
  houseRulers: HouseRulership[];
  planetConditions: PlanetCondition[];
  dispositorChain: DispositorChain | null;
  excludedTimeDependentFactors: string[];
};

export type BuildChartRulershipOptions = {
  hasReliableBirthTime: boolean;
};

export const TRADITIONAL_SIGN_RULERS: Record<ZodiacKey, ClassicalPlanetId> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

const PLANET_LABELS: Record<ClassicalPlanetId, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
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
  11: "دوستی‌ها، جمع‌ها و آینده",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const DOMICILES: Record<ClassicalPlanetId, readonly ZodiacKey[]> = {
  sun: ["leo"],
  moon: ["cancer"],
  mercury: ["gemini", "virgo"],
  venus: ["taurus", "libra"],
  mars: ["aries", "scorpio"],
  jupiter: ["sagittarius", "pisces"],
  saturn: ["capricorn", "aquarius"],
};

const EXALTATIONS: Record<ClassicalPlanetId, ZodiacKey> = {
  sun: "aries",
  moon: "taurus",
  mercury: "virgo",
  venus: "pisces",
  mars: "capricorn",
  jupiter: "cancer",
  saturn: "libra",
};

const OPPOSITE_SIGN: Record<ZodiacKey, ZodiacKey> = {
  aries: "libra",
  taurus: "scorpio",
  gemini: "sagittarius",
  cancer: "capricorn",
  leo: "aquarius",
  virgo: "pisces",
  libra: "aries",
  scorpio: "taurus",
  sagittarius: "gemini",
  capricorn: "cancer",
  aquarius: "leo",
  pisces: "virgo",
};

const DIGNITY_LABELS: Record<PlanetDignityKind, string> = {
  rulership: "در حاکمیت",
  exaltation: "در اوج کلاسیک",
  detriment: "در برج مقابل حاکمیت",
  fall: "در برج مقابل اوج",
  neutral: "بدون وضعیت کلاسیک ویژه",
};

const DIGNITY_EXPRESSION: Record<PlanetDignityKind, string> = {
  rulership:
    "این سیاره در برجی قرار دارد که در چارچوب کلاسیک خودش آن را اداره می‌کند؛ بنابراین بیانش با منطق اصلی خود سیاره هماهنگ‌تر و مستقیم‌تر است.",
  exaltation:
    "در چارچوب کلاسیک، این برج ظرفیت این سیاره را با دامنه و وضوح بیشتری برجسته می‌کند؛ این به معنی بهتر بودن نیست، فقط کیفیت بیان را توصیف می‌کند.",
  detriment:
    "این برج در سوی مقابل حاکمیت کلاسیک سیاره قرار دارد؛ بنابراین بیان آن بیشتر از مسیر مذاکره با کیفیت‌هایی شکل می‌گیرد که به تنظیم آگاهانه‌تری نیاز دارند.",
  fall:
    "این برج در سوی مقابل اوج کلاسیک سیاره قرار دارد؛ بنابراین بیان آن بیشتر به تنظیم زمینه، ریتم و شیوهٔ استفاده نیاز دارد و هیچ رتبه‌بندی ارزشی از آن ساخته نمی‌شود.",
  neutral:
    "در این چارچوب کلاسیک وضعیت ویژه‌ای ثبت نمی‌شود؛ معنای این سیاره از خود برج، خانه و جنبه‌های واقعی آن خوانده می‌شود.",
};

const CLASSICAL_PLANET_IDS: readonly ClassicalPlanetId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
];

export function getTraditionalSignRuler(signId: ZodiacKey): ClassicalPlanetId {
  return TRADITIONAL_SIGN_RULERS[signId];
}

export function getPlanetDignities(
  planetId: ClassicalPlanetId,
  signId: ZodiacKey,
): PlanetDignityKind[] {
  const dignities: PlanetDignityKind[] = [];
  if (DOMICILES[planetId].includes(signId)) dignities.push("rulership");
  if (EXALTATIONS[planetId] === signId) dignities.push("exaltation");
  if (DOMICILES[planetId].some((home) => OPPOSITE_SIGN[home] === signId)) {
    dignities.push("detriment");
  }
  if (OPPOSITE_SIGN[EXALTATIONS[planetId]] === signId) dignities.push("fall");
  return dignities.length > 0 ? dignities : ["neutral"];
}

export function getPlanetDignity(
  planetId: ClassicalPlanetId,
  signId: ZodiacKey,
): PlanetDignityKind {
  return getPlanetDignities(planetId, signId)[0];
}

export function buildChartRulershipProfile(
  report: AstrologyReport,
  options: BuildChartRulershipOptions,
): ChartRulershipProfile {
  const snapshot = report.realEngine;
  const placements = snapshot?.placements ?? [];
  const aspects = snapshot?.aspects ?? snapshot?.aspectHighlights ?? [];
  const hasReliableBirthTime = options.hasReliableBirthTime;
  const planetConditions = buildPlanetConditions(
    placements,
    aspects,
    hasReliableBirthTime,
  );

  if (!snapshot) {
    return {
      version: CHART_RULERSHIP_VERSION,
      hasReliableBirthTime,
      chartRuler: null,
      houseRulers: [],
      planetConditions,
      dispositorChain: null,
      excludedTimeDependentFactors: hasReliableBirthTime
        ? []
        : ["حاکمان خانه‌ها", "حاکم طالع", "مسیر حاکم چارت"],
    };
  }

  const houses = normalizeHouses(snapshot.houses ?? []);
  const chartRuler = hasReliableBirthTime
    ? buildChartRulerPath(snapshot.angles?.asc?.signId ?? houses[0]?.signId, placements)
    : null;
  const houseRulers =
    hasReliableBirthTime && houses.length === 12
      ? houses.map((house) => buildHouseRulership(house, placements))
      : [];
  const dispositorChain = chartRuler
    ? buildDispositorChain(chartRuler.planetId, placements)
    : null;

  return {
    version: CHART_RULERSHIP_VERSION,
    hasReliableBirthTime,
    chartRuler,
    houseRulers,
    planetConditions,
    dispositorChain,
    excludedTimeDependentFactors: hasReliableBirthTime
      ? []
      : ["حاکمان خانه‌ها", "حاکم طالع", "مسیر حاکم چارت"],
  };
}

function buildPlanetConditions(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
  hasReliableBirthTime: boolean,
): PlanetCondition[] {
  return CLASSICAL_PLANET_IDS.flatMap((planetId) => {
    const placement = placements.find((item) => item.id === planetId);
    if (!placement) return [];
    const dignities = getPlanetDignities(planetId, placement.signId);
    const majorAspect = selectMajorAspect(planetId, aspects);
    const house =
      hasReliableBirthTime && isHouseNumber(placement.house)
        ? placement.house
        : null;

    return [
      {
        planetId,
        planetLabel: PLANET_LABELS[planetId],
        signId: placement.signId,
        signLabel: SIGN_LABELS[placement.signId],
        house,
        dignities,
        dignityLabel: dignities.map((item) => DIGNITY_LABELS[item]).join(" و "),
        expression: dignities
          .map((item) => DIGNITY_EXPRESSION[item])
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(" "),
        majorAspect: majorAspect ? formatAspect(majorAspect) : null,
        evidence: [
          `${PLANET_LABELS[planetId]} در ${SIGN_LABELS[placement.signId]}`,
          house ? `خانه ${formatNumber(house)}؛ ${HOUSE_FIELDS[house]}` : null,
          majorAspect ? `جنبهٔ نزدیک: ${formatAspect(majorAspect)}` : null,
        ].filter((item): item is string => Boolean(item)),
      },
    ];
  });
}

function buildChartRulerPath(
  risingSignId: ZodiacKey | undefined,
  placements: RealEngineReportPlacement[],
): ChartRulerPath | null {
  if (!risingSignId) return null;
  const planetId = getTraditionalSignRuler(risingSignId);
  const placement = placements.find((item) => item.id === planetId);
  const placementHouse = isHouseNumber(placement?.house) ? placement.house : null;
  const placementSignId = placement?.signId ?? null;
  const pathSummary = placement
    ? placementHouse
      ? `طالع ${SIGN_LABELS[risingSignId]} با ${PLANET_LABELS[planetId]} هدایت می‌شود؛ ${PLANET_LABELS[planetId]} در ${SIGN_LABELS[placement.signId]} و خانه ${formatNumber(placementHouse)} قرار دارد و مسیر شروع‌ها را به میدان ${HOUSE_FIELDS[placementHouse]} وصل می‌کند.`
      : `طالع ${SIGN_LABELS[risingSignId]} با ${PLANET_LABELS[planetId]} هدایت می‌شود؛ جایگاه ${PLANET_LABELS[planetId]} در ${SIGN_LABELS[placement.signId]} ثبت شده اما خانهٔ آن برای این خوانش قابل اتکا نیست.`
    : `طالع ${SIGN_LABELS[risingSignId]} با ${PLANET_LABELS[planetId]} هدایت می‌شود، اما جایگاه ذخیره‌شدهٔ این سیاره کامل نیست و مسیر خانه‌ای برای آن ساخته نمی‌شود.`;

  return {
    risingSignId,
    risingSignLabel: SIGN_LABELS[risingSignId],
    planetId,
    planetLabel: PLANET_LABELS[planetId],
    placementSignId,
    placementSignLabel: placementSignId ? SIGN_LABELS[placementSignId] : null,
    placementHouse,
    pathSummary,
    evidence: [
      `طالع ${SIGN_LABELS[risingSignId]}`,
      `${PLANET_LABELS[planetId]} حاکم سنتی ${SIGN_LABELS[risingSignId]}`,
      placement ? `${PLANET_LABELS[planetId]} در ${SIGN_LABELS[placement.signId]}` : null,
      placementHouse ? `خانه ${formatNumber(placementHouse)}` : null,
    ].filter((item): item is string => Boolean(item)),
  };
}

function buildHouseRulership(
  house: NonNullable<NonNullable<AstrologyReport["realEngine"]>["houses"]>[number],
  placements: RealEngineReportPlacement[],
): HouseRulership {
  const rulerPlanetId = getTraditionalSignRuler(house.signId);
  const rulerPlacement = placements.find((item) => item.id === rulerPlanetId);
  const rulerPlacementHouse = isHouseNumber(rulerPlacement?.house)
    ? rulerPlacement.house
    : null;
  const rulerPlacementSignId = rulerPlacement?.signId ?? null;
  const linkedHouseField = rulerPlacementHouse
    ? HOUSE_FIELDS[rulerPlacementHouse]
    : null;
  const summary = rulerPlacement
    ? rulerPlacementHouse
      ? `خانه ${formatNumber(house.number)}؛ ${HOUSE_FIELDS[house.number]}، با ${PLANET_LABELS[rulerPlanetId]} اداره می‌شود. چون ${PLANET_LABELS[rulerPlanetId]} در خانه ${formatNumber(rulerPlacementHouse)}؛ ${HOUSE_FIELDS[rulerPlacementHouse]} قرار دارد، این دو میدان زندگی در خوانش این چارت به هم وصل می‌شوند.`
      : `خانه ${formatNumber(house.number)}؛ ${HOUSE_FIELDS[house.number]}، با ${PLANET_LABELS[rulerPlanetId]} اداره می‌شود. جایگاه ${PLANET_LABELS[rulerPlanetId]} در ${SIGN_LABELS[rulerPlacement.signId]} ثبت شده اما خانهٔ آن برای ساختن اتصال دوم استفاده نمی‌شود.`
    : `خانه ${formatNumber(house.number)}؛ ${HOUSE_FIELDS[house.number]}، با ${PLANET_LABELS[rulerPlanetId]} اداره می‌شود، اما جایگاه کامل حاکم این خانه همراه گزارش ثبت نشده است.`;

  return {
    house: house.number,
    houseField: HOUSE_FIELDS[house.number],
    cuspSignId: house.signId,
    cuspSignLabel: SIGN_LABELS[house.signId],
    rulerPlanetId,
    rulerPlanetLabel: PLANET_LABELS[rulerPlanetId],
    rulerPlacementSignId,
    rulerPlacementSignLabel: rulerPlacementSignId
      ? SIGN_LABELS[rulerPlacementSignId]
      : null,
    rulerPlacementHouse,
    linkedHouseField,
    summary,
    evidence: [
      `خانه ${formatNumber(house.number)} از ${SIGN_LABELS[house.signId]} شروع می‌شود`,
      `${PLANET_LABELS[rulerPlanetId]} حاکم سنتی ${SIGN_LABELS[house.signId]}`,
      rulerPlacement
        ? `${PLANET_LABELS[rulerPlanetId]} در ${SIGN_LABELS[rulerPlacement.signId]}`
        : null,
      rulerPlacementHouse ? `خانه ${formatNumber(rulerPlacementHouse)}` : null,
    ].filter((item): item is string => Boolean(item)),
  };
}

function buildDispositorChain(
  startPlanetId: ClassicalPlanetId,
  placements: RealEngineReportPlacement[],
): DispositorChain {
  const steps: DispositorStep[] = [];
  const seen = new Set<ClassicalPlanetId>();
  let current = startPlanetId;
  let cycleTarget: ClassicalPlanetId | null = null;

  for (let depth = 0; depth < 8; depth += 1) {
    const placement = placements.find((item) => item.id === current);
    if (!placement) {
      return {
        steps,
        termination: "missing-placement",
        summary: buildDispositorSummary(steps, "missing-placement", cycleTarget),
      };
    }

    const next = getTraditionalSignRuler(placement.signId);
    steps.push({
      planetId: current,
      planetLabel: PLANET_LABELS[current],
      signId: placement.signId,
      signLabel: SIGN_LABELS[placement.signId],
      rulerPlanetId: next,
      rulerPlanetLabel: PLANET_LABELS[next],
      house: isHouseNumber(placement.house) ? placement.house : null,
    });

    if (next === current) {
      return {
        steps,
        termination: "self-rulership",
        summary: buildDispositorSummary(steps, "self-rulership", null),
      };
    }

    seen.add(current);
    if (seen.has(next)) {
      cycleTarget = next;
      return {
        steps,
        termination: "cycle",
        summary: buildDispositorSummary(steps, "cycle", cycleTarget),
      };
    }

    current = next;
  }

  return {
    steps,
    termination: "max-depth",
    summary: buildDispositorSummary(steps, "max-depth", null),
  };
}

function buildDispositorSummary(
  steps: DispositorStep[],
  termination: DispositorTermination,
  cycleTarget: ClassicalPlanetId | null,
): string {
  if (steps.length === 0) {
    return "جایگاه کافی برای ساختن زنجیرهٔ حاکمیتی ثبت نشده است.";
  }
  const path = [steps[0].planetLabel, ...steps.map((step) => step.rulerPlanetLabel)];
  const compactPath = path.filter((label, index) => index === 0 || label !== path[index - 1]);
  const pathText = compactPath.join(" ← ");

  if (termination === "self-rulership") {
    return `زنجیرهٔ حاکمیتی از ${pathText} می‌گذرد و در سیاره‌ای می‌ایستد که در برج تحت حاکمیت خودش قرار دارد.`;
  }
  if (termination === "cycle" && cycleTarget) {
    return `زنجیرهٔ حاکمیتی از ${pathText} می‌گذرد و سپس به چرخه‌ای برمی‌گردد که ${PLANET_LABELS[cycleTarget]} یکی از نقاط آن است؛ این چرخه فقط پیوند میدان‌ها را نشان می‌دهد و به معنی رتبه‌بندی سیاره‌ها نیست.`;
  }
  if (termination === "missing-placement") {
    return `زنجیرهٔ حاکمیتی تا ${pathText} قابل دنبال‌کردن است؛ بعد از آن جایگاه لازم همراه گزارش ثبت نشده و ادامه‌ای حدس زده نمی‌شود.`;
  }
  return `زنجیرهٔ حاکمیتی تا ${pathText} دنبال شده و برای محدود ماندن خوانش در همین نقطه متوقف شده است.`;
}

function selectMajorAspect(
  planetId: ClassicalPlanetId,
  aspects: RealEngineReportAspect[],
): RealEngineReportAspect | null {
  return (
    aspects
      .filter(
        (aspect) =>
          aspect.firstPlanetId === planetId || aspect.secondPlanetId === planetId,
      )
      .sort((first, second) => first.orb - second.orb || first.id.localeCompare(second.id))[0] ??
    null
  );
}

function formatAspect(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel} با اورب ${formatNumber(aspect.orb)}°`;
}

function normalizeHouses(
  houses: NonNullable<NonNullable<AstrologyReport["realEngine"]>["houses"]>,
) {
  const byNumber = new Map<RealEngineReportHouseNumber, (typeof houses)[number]>();
  for (const house of houses) {
    if (isHouseNumber(house.number)) byNumber.set(house.number, house);
  }
  return [...byNumber.values()].sort((first, second) => first.number - second.number);
}

function isHouseNumber(
  value: number | null | undefined,
): value is RealEngineReportHouseNumber {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);
}
