import {
  buildPlacementBehavioralInterpretation,
  type BehavioralAudienceMode,
  type PlacementBehavioralInterpretation,
} from "@/lib/astrology/report-behavioral-interpretation";
import {
  rankRealEngineAspects,
  type RealEngineAspectSelectionContext,
} from "@/lib/astrology/real-engine-aspect-selection";
import { buildRealEngineChartSignature } from "@/lib/astrology/real-engine-chart-signature";
import { resolveBehavioralAudienceMode } from "@/lib/astrology/report-behavioral-context";
import {
  ZODIAC_LABELS,
  ZODIAC_SIGN_ORDER,
} from "@/lib/astrology/zodiac-labels";
import type {
  AstrologyReport,
  RealEngineChartElement,
  RealEngineChartModality,
  RealEngineReportAspect,
  RealEngineReportAspectKind,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";

export const ADAPTIVE_REPORT_PLANNER_VERSION =
  "adaptive-depth-evidence-integrity-20260808" as const;

export type AdaptiveNarrativeMode =
  | "cluster-led"
  | "tension-led"
  | "strength-led"
  | "axis-led"
  | "ruler-led";

export type AdaptiveNarrativeAnchorKind =
  | "planet"
  | "aspect"
  | "cluster"
  | "aspect-pattern"
  | "house"
  | "axis"
  | "ruler-story"
  | "lunar-node-axis"
  | "element-modality";

export type AdaptiveNarrativeEvidence = {
  id: string;
  kind: "placement" | "aspect" | "house" | "ruler" | "node" | "balance" | "pattern";
  sourceIds: string[];
  label: string;
  detail: string;
};

export type AdaptiveNarrativeAnchor = {
  anchorId: string;
  kind: AdaptiveNarrativeAnchorKind;
  semanticKey: string;
  title: string;
  summary: string;
  dailyLife: string;
  healthyExpression: string;
  friction: string;
  action: string;
  score: number;
  sourcePlanetIds: string[];
  sourceAspectIds: string[];
  sourceHouseIds: number[];
  sourcePatternId: string | null;
  sourceNodeIds: string[];
  rankingReasons: string[];
  evidenceRefs: AdaptiveNarrativeEvidence[];
  absorbedSemanticKeys: string[];
};

export type AdaptivePlacementStory = {
  planetId: string;
  planetLabel: string;
  signId: ZodiacKey;
  signLabel: string;
  houseNumber: RealEngineReportHouseNumber | null;
  retrograde: boolean;
  importance: "core" | "secondary" | "compact";
  interpretation: PlacementBehavioralInterpretation;
};

export type AdaptiveHouseStory = {
  houseNumber: RealEngineReportHouseNumber;
  label: string;
  score: number;
  planetIds: string[];
  reason: string;
  astrologyLabel: string;
  headline: string;
  synthesis: string;
  pressure: string;
  livedExample: string;
  evidence: AdaptiveNarrativeEvidence[];
};

export type AdaptiveAspectStory = {
  aspect: RealEngineReportAspect;
  title: string;
  dailyLife: string;
  healthy: string;
  friction: string;
  action: string;
  evidence: AdaptiveNarrativeEvidence[];
};

export type AdaptiveNodeStory = {
  title: string;
  familiarBehavior: string;
  usefulSkill: string;
  overuse: string;
  freshBehavior: string;
  experiment: string;
  confidence: string;
  evidence: AdaptiveNarrativeEvidence[];
};

export type AdaptiveBalanceStory = {
  title: string;
  body: string;
  action: string;
  evidence: AdaptiveNarrativeEvidence[];
};

export type AdaptiveReportPlan = {
  version: typeof ADAPTIVE_REPORT_PLANNER_VERSION;
  mode: AdaptiveNarrativeMode;
  audienceMode: BehavioralAudienceMode;
  chartRulerId: string;
  chartRulerLabel: string;
  topStories: AdaptiveNarrativeAnchor[];
  bigThree: AdaptivePlacementStory[];
  importantHouses: AdaptiveHouseStory[];
  importantAspects: AdaptiveAspectStory[];
  nodeStory: AdaptiveNodeStory | null;
  balanceStory: AdaptiveBalanceStory;
  weeklyActions: string[];
  placementStories: AdaptivePlacementStory[];
  readingMinutes: number;
};

const MAJOR_PLANET_IDS = [
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
] as const;

const PERSONAL_PLANET_IDS = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const OUTER_PLANET_IDS = new Set(["uranus", "neptune", "pluto"]);
const DYNAMIC_ASPECTS = new Set<RealEngineReportAspectKind>(["square", "opposition"]);

const PLANET_LABELS: Record<string, string> = {
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

const SIGN_LABELS = Object.fromEntries(
  ZODIAC_SIGN_ORDER.map((signId) => [signId, ZODIAC_LABELS[signId].faName]),
) as Record<ZodiacKey, string>;

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
};

const ASPECT_DISPLAY: Record<
  RealEngineReportAspectKind,
  { label: string; symbol: string; angle: number }
> = {
  conjunction: { label: "مقارنه", symbol: "☌", angle: 0 },
  sextile: { label: "تسدیس", symbol: "⚹", angle: 60 },
  square: { label: "مربع", symbol: "□", angle: 90 },
  trine: { label: "تثلیث", symbol: "△", angle: 120 },
  opposition: { label: "مقابله", symbol: "☍", angle: 180 },
};

const HOUSE_LABELS: Record<number, string> = {
  1: "بدن، حضور و شروع",
  2: "ارزش، امنیت و منابع",
  3: "فکر، کلام و یادگیری",
  4: "خانه، ریشه و امنیت خصوصی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "روزمره، کار و مراقبت از بدن",
  7: "رابطه نزدیک و شراکت",
  8: "اعتماد، صمیمیت و منابع مشترک",
  9: "باور، آموزش، سفر و جهان‌بینی",
  10: "نقش اجتماعی، کار و دیده‌شدن",
  11: "دوستی، جمع و آینده",
  12: "خلوت، پردازش خصوصی و بازیابی",
};

const HOUSE_EVENT_EXAMPLES: Record<number, string> = {
  1: "وقتی باید در یک جمع تازه خودت را معرفی کنی یا بدون معطل‌کردن شروع کنی",
  2: "وقتی درباره خرج، قیمت‌گذاری، وسایل شخصی یا چیزی که واقعاً ارزش نگه‌داشتن دارد تصمیم می‌گیری",
  3: "وقتی باید یک پیام مهم بفرستی، سؤال مستقیمی بپرسی یا چیزی را برای دیگری توضیح بدهی",
  4: "وقتی در خانه مسئولیتی تقسیم می‌شود یا باید درباره مرز، آرامش و فضای خصوصی تصمیم بگیری",
  5: "وقتی ایده‌ای را از ذهن بیرون می‌آوری و باید آن را تمام، نشان یا با کسی شریک کنی",
  6: "وقتی برنامه روزانه به‌هم می‌ریزد و باید بین کار لازم، استراحت و مراقبت از بدن انتخاب کنی",
  7: "وقتی در رابطه یا همکاری لازم است خواسته، مخالفت یا سهم هر دو طرف روشن شود",
  8: "وقتی پای اعتماد، پول مشترک، آسیب‌پذیری یا گفتن چیزی که پنهان نگه داشته‌ای وسط است",
  9: "وقتی یک باور قدیمی با تجربه تازه، آموزش، سفر یا دیدگاه متفاوتی روبه‌رو می‌شود",
  10: "وقتی کاری باید تحویل شود، مسئولیت دیده‌شده‌ای می‌گیری یا درباره جهت شغلی تصمیم می‌گیری",
  11: "وقتی در جمع باید بین تعلق داشتن و نگه‌داشتن نظر مستقل خودت تعادل پیدا کنی",
  12: "وقتی قبل از جواب‌دادن به دیگران به خلوت، نوشتن یا زمان بی‌صدا برای مرتب‌کردن ذهن نیاز داری",
};

const TRADITIONAL_RULERS: Record<ZodiacKey, string> = {
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

const ELEMENT_LABELS: Record<RealEngineChartElement, string> = {
  fire: "آتش",
  earth: "زمین",
  air: "هوا",
  water: "آب",
};

const MODALITY_LABELS: Record<RealEngineChartModality, string> = {
  cardinal: "آغازگر",
  fixed: "پایدار",
  mutable: "انعطاف‌پذیر",
};

const ELEMENT_BEHAVIOR: Record<RealEngineChartElement, string> = {
  fire: "انرژی معمولاً با شروع، تجربه مستقیم و دیدن امکان حرکت بالا می‌رود",
  earth: "تصمیم وقتی قابل اتکاتر می‌شود که نتیجه، زمان و شکل عملی آن روشن باشد",
  air: "فهمیدن موضوع از راه حرف‌زدن، مقایسه و دیدن الگوها سرعت می‌گیرد",
  water: "معنای موقعیت وقتی روشن‌تر می‌شود که اثر عاطفی و حس امنیت هم جدی گرفته شود",
};

const ZERO_ELEMENT_BEHAVIOR: Record<RealEngineChartElement, string> = {
  fire: "شروع ممکن است بیشتر به دلیل، مسئولیت یا ضرورت نیاز داشته باشد تا موج هیجان؛ وقتی دلیل روشن شد، حرکت قابل ساختن است",
  earth: "ایده و واکنش ممکن است جلوتر از معیار عملی حرکت کنند؛ زمان پایان، قدم بعدی و یک نتیجه قابل لمس کمک می‌کند",
  air: "ممکن است قبل از فاصله‌گرفتن و نام‌گذاری موضوع، تجربه را مستقیم‌تر حس کنی؛ سؤال روشن و گفت‌وگو کمک می‌کند انتخاب‌ها دیده شوند",
  water: "ممکن است اول سراغ حل مسئله، فکر یا عمل بروی و احساس دیرتر نام بگیرد؛ یک مکث برای تشخیص اثر عاطفی تصمیم مفید است",
};

const MODALITY_BEHAVIOR: Record<RealEngineChartModality, string> = {
  cardinal: "وقتی موضوع روشن شود، میل به شروع و جلو بردن آن سریع‌تر از صبر برای کامل‌شدن همه جزئیات می‌آید",
  fixed: "بعد از تصمیم، ماندن و ادامه‌دادن آسان‌تر است؛ تغییر وقتی بهتر پذیرفته می‌شود که دلیل و امنیت کافی داشته باشد",
  mutable: "تطبیق با اطلاعات تازه طبیعی‌تر است؛ چالش می‌تواند تعیین نقطه پایان و نگه‌داشتن یک انتخاب تا نتیجه باشد",
};

function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function clampHouse(value: number | null | undefined): RealEngineReportHouseNumber | null {
  return Number.isInteger(value) && value! >= 1 && value! <= 12
    ? (value as RealEngineReportHouseNumber)
    : null;
}

function normalizePlanetId(value: string): string {
  return value.trim().toLowerCase();
}

function getPlacement(placements: RealEngineReportPlacement[], id: string) {
  return placements.find((placement) => normalizePlanetId(placement.id) === normalizePlanetId(id));
}

function getAudienceMode(report: AstrologyReport): BehavioralAudienceMode {
  const explicit = report.realEngine?.behavioralAudienceMode;
  if (explicit === "caregiver" || explicit === "youth" || explicit === "adult") return explicit;
  return resolveBehavioralAudienceMode(
    report.input.birthDate,
    report.realEngine?.generatedAt ?? report.createdAt,
  );
}

function getChartRulerId(report: AstrologyReport): string {
  const asc = report.realEngine?.angles?.asc;
  const sign = asc?.signId ?? report.chart.risingSign.key;
  return TRADITIONAL_RULERS[sign] ?? "sun";
}

function aspectEvidence(aspect: RealEngineReportAspect): AdaptiveNarrativeEvidence {
  return {
    id: `aspect:${aspect.id}`,
    kind: "aspect",
    sourceIds: [aspect.id, aspect.firstPlanetId, aspect.secondPlanetId],
    label: `${PLANET_LABELS[aspect.firstPlanetId] ?? aspect.firstPlanetLabel} ${ASPECT_DISPLAY[aspect.aspectId].label} ${PLANET_LABELS[aspect.secondPlanetId] ?? aspect.secondPlanetLabel}`,
    detail: `اورب ${aspect.orb.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}°`,
  };
}

function placementEvidence(placement: RealEngineReportPlacement): AdaptiveNarrativeEvidence {
  const house = clampHouse(placement.house);
  return {
    id: `placement:${placement.id}`,
    kind: "placement",
    sourceIds: [placement.id],
    label: PLANET_LABELS[placement.id] ?? placement.label,
    detail: `${SIGN_LABELS[placement.signId]} ${placement.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}°${house ? ` · خانه ${house.toLocaleString("fa-IR")}` : ""}`,
  };
}

function buildHouseEvidence(
  house: RealEngineReportHouseNumber,
  placements: RealEngineReportPlacement[],
): AdaptiveNarrativeEvidence {
  const ids = placements.filter((placement) => clampHouse(placement.house) === house).map((placement) => placement.id);
  return {
    id: `house:${house}`,
    kind: "house",
    sourceIds: ids,
    label: `خانه ${house.toLocaleString("fa-IR")}`,
    detail: `${ids.length.toLocaleString("fa-IR")} سیاره اصلی · ${HOUSE_LABELS[house]}`,
  };
}

function pairKey(first: string, second: string) {
  return [normalizePlanetId(first), normalizePlanetId(second)].sort().join(":");
}

function buildPatternAnchors(
  aspects: RealEngineReportAspect[],
  placements: RealEngineReportPlacement[],
): AdaptiveNarrativeAnchor[] {
  const byPair = new Map<string, RealEngineReportAspect>();
  for (const aspect of aspects) byPair.set(pairKey(aspect.firstPlanetId, aspect.secondPlanetId), aspect);
  const ids = uniq(aspects.flatMap((aspect) => [normalizePlanetId(aspect.firstPlanetId), normalizePlanetId(aspect.secondPlanetId)]));
  const anchors: AdaptiveNarrativeAnchor[] = [];
  const seen = new Set<string>();

  for (let a = 0; a < ids.length; a += 1) {
    for (let b = a + 1; b < ids.length; b += 1) {
      for (let c = b + 1; c < ids.length; c += 1) {
        const triple = [ids[a], ids[b], ids[c]];
        const edges = [
          byPair.get(pairKey(triple[0], triple[1])),
          byPair.get(pairKey(triple[0], triple[2])),
          byPair.get(pairKey(triple[1], triple[2])),
        ].filter((item): item is RealEngineReportAspect => Boolean(item));
        if (edges.length !== 3) continue;

        const opposition = edges.find((edge) => edge.aspectId === "opposition");
        const squares = edges.filter((edge) => edge.aspectId === "square");
        if (opposition && squares.length === 2) {
          const oppositionPlanets = new Set([opposition.firstPlanetId, opposition.secondPlanetId].map(normalizePlanetId));
          const focal = triple.find((id) => !oppositionPlanets.has(id));
          if (!focal) continue;
          const key = `pattern:t-square:${triple.slice().sort().join(":")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const focalPlacement = getPlacement(placements, focal);
          const focalBehavior = focalPlacement
            ? buildPlacementBehavioralInterpretation({
                planetId: focalPlacement.id,
                signId: focalPlacement.signId,
                houseNumber: focalPlacement.house,
              })
            : null;
          anchors.push({
            anchorId: key,
            kind: "aspect-pattern",
            semanticKey: key,
            title: `فشار چندجهته روی ${PLANET_LABELS[focal] ?? focal}`,
            summary: `دو قطب روبه‌رو با دو زاویه چالشی به ${PLANET_LABELS[focal] ?? focal} وصل شده‌اند؛ این سه تماس یک داستان واحدند، نه سه کارت جدا.`,
            dailyLife: focalBehavior?.dailyLifeExample ?? "ممکن است چند خواسته هم‌زمان فعال شوند و واکنش اولیه را سریع‌تر از روشن‌شدن اولویت واقعی جلو بیندازند.",
            healthyExpression: focalBehavior?.healthyExpression ?? "دیدن هر سه بخش ماجرا پیش از تصمیم و تبدیل فشار به یک انتخاب مشخص.",
            friction: focalBehavior?.possibleFriction ?? "قفل‌شدن روی یک واکنش و نادیده‌گرفتن بخشی از مسئله که از سمت دیگری فشار می‌آورد.",
            action: focalBehavior?.smallExperiment ?? "پیش از واکنش، سه طرف مسئله را جدا بنویس و فقط یک قدم برگشت‌پذیر انتخاب کن.",
            score: 190 - edges.reduce((sum, edge) => sum + edge.orb, 0),
            sourcePlanetIds: triple,
            sourceAspectIds: edges.map((edge) => edge.id),
            sourceHouseIds: uniq(triple.map((id) => clampHouse(getPlacement(placements, id)?.house)).filter((value): value is RealEngineReportHouseNumber => value !== null)),
            sourcePatternId: key,
            sourceNodeIds: [],
            rankingReasons: ["سه تماس اصلی یک T-square کامل می‌سازند", `نقطه مرکزی ${PLANET_LABELS[focal] ?? focal} در هر دو مربع حضور دارد`],
            evidenceRefs: [{ id: key, kind: "pattern", sourceIds: [...edges.map((edge) => edge.id), ...triple], label: "T-square", detail: edges.map((edge) => `${PLANET_LABELS[edge.firstPlanetId] ?? edge.firstPlanetLabel} ${ASPECT_DISPLAY[edge.aspectId].label} ${PLANET_LABELS[edge.secondPlanetId] ?? edge.secondPlanetLabel} · ${edge.orb.toFixed(1)}°`).join(" · ") }],
            absorbedSemanticKeys: edges.map((edge) => `aspect:${edge.id}`),
          });
          continue;
        }

        if (edges.every((edge) => edge.aspectId === "trine")) {
          const key = `pattern:grand-trine:${triple.slice().sort().join(":")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          anchors.push({
            anchorId: key,
            kind: "aspect-pattern",
            semanticKey: key,
            title: "سه توان که طبیعی‌تر با هم کار می‌کنند",
            summary: "سه تثلیث یک حلقه هماهنگ ساخته‌اند؛ این الگو بیشتر منبع همراه است تا مسئله‌ای که مجبور باشی حلش کنی.",
            dailyLife: "در موقعیت‌هایی که این سه بخش هم‌زمان لازم‌اند، ممکن است بدون فشار زیاد بتوانی از یکی به دیگری پل بزنی.",
            healthyExpression: "استفاده عمدی از این هماهنگی برای تمام‌کردن یک کار، نه فقط تکیه بر چیزی که همیشه آسان به نظر می‌رسد.",
            friction: "عادی فرض‌کردن توان و استفاده‌نکردن از آن تا زمانی که شرایط بیرونی مجبور کند.",
            action: "یک موقعیت این هفته را انتخاب کن که هر سه توان را هم‌زمان به یک نتیجه قابل مشاهده وصل کند.",
            score: 165 - edges.reduce((sum, edge) => sum + edge.orb, 0),
            sourcePlanetIds: triple,
            sourceAspectIds: edges.map((edge) => edge.id),
            sourceHouseIds: uniq(triple.map((id) => clampHouse(getPlacement(placements, id)?.house)).filter((value): value is RealEngineReportHouseNumber => value !== null)),
            sourcePatternId: key,
            sourceNodeIds: [],
            rankingReasons: ["سه تثلیث کامل میان سه سیاره ثبت شده‌اند"],
            evidenceRefs: [{ id: key, kind: "pattern", sourceIds: [...edges.map((edge) => edge.id), ...triple], label: "Grand Trine", detail: edges.map((edge) => `${PLANET_LABELS[edge.firstPlanetId] ?? edge.firstPlanetLabel} △ ${PLANET_LABELS[edge.secondPlanetId] ?? edge.secondPlanetLabel} · ${edge.orb.toFixed(1)}°`).join(" · ") }],
            absorbedSemanticKeys: edges.map((edge) => `aspect:${edge.id}`),
          });
        }
      }
    }
  }

  return anchors.sort((a, b) => b.score - a.score || a.semanticKey.localeCompare(b.semanticKey));
}

function buildClusterAnchors(
  placements: RealEngineReportPlacement[],
  chartRulerId: string,
  audienceMode: BehavioralAudienceMode,
): AdaptiveNarrativeAnchor[] {
  const anchors: AdaptiveNarrativeAnchor[] = [];
  const byHouse = new Map<RealEngineReportHouseNumber, RealEngineReportPlacement[]>();
  const bySign = new Map<ZodiacKey, RealEngineReportPlacement[]>();
  const approved = placements.filter((placement) => MAJOR_PLANET_IDS.includes(normalizePlanetId(placement.id) as (typeof MAJOR_PLANET_IDS)[number]));

  for (const placement of approved) {
    const house = clampHouse(placement.house);
    if (house) byHouse.set(house, [...(byHouse.get(house) ?? []), placement]);
    bySign.set(placement.signId, [...(bySign.get(placement.signId) ?? []), placement]);
  }

  for (const [house, members] of byHouse) {
    if (members.length < 3) continue;
    const key = `cluster:house:${house}`;
    const main = members.find((member) => PERSONAL_PLANET_IDS.has(member.id)) ?? members[0];
    const behavior = buildPlacementBehavioralInterpretation({
      planetId: main.id,
      signId: main.signId,
      houseNumber: house,
      audienceMode,
    });
    const labels = members.map((member) => PLANET_LABELS[member.id] ?? member.label);
    anchors.push({
      anchorId: key,
      kind: "cluster",
      semanticKey: key,
      title: `تمرکز خانه ${house.toLocaleString("fa-IR")}: ${HOUSE_LABELS[house]}`,
      summary: `${members.length.toLocaleString("fa-IR")} سیاره اصلی در یک حوزه جمع شده‌اند؛ برای همین بهتر است این بخش به‌عنوان یک سیستم خوانده شود، نه ${members.length.toLocaleString("fa-IR")} تفسیر جدا.`,
      dailyLife: `${HOUSE_EVENT_EXAMPLES[house]}، چند لایه از هویت، فکر، ارزش یا عمل می‌توانند هم‌زمان درگیر شوند.`,
      healthyExpression: `توان اصلی این تمرکز، هماهنگ‌کردن ${labels.slice(0, 3).join("، ")} در یک تصمیم واقعی است؛ ${behavior.healthyExpression}.`,
      friction: `اگر همه این نیروها یک‌جا فشار بیاورند، ممکن است ارزش یک نتیجه یا رابطه بیش از حد به همین حوزه گره بخورد؛ ${behavior.possibleFriction}.`,
      action: behavior.smallExperiment,
      score: 155 + members.length * 7 + (members.some((member) => member.id === chartRulerId) ? 15 : 0),
      sourcePlanetIds: members.map((member) => member.id),
      sourceAspectIds: [],
      sourceHouseIds: [house],
      sourcePatternId: key,
      sourceNodeIds: [],
      rankingReasons: [`${members.length} سیاره اصلی در خانه ${house} قرار دارند`, ...(members.some((member) => member.id === chartRulerId) ? ["سیاره راهبر نیز عضو همین تمرکز است"] : [])],
      evidenceRefs: [buildHouseEvidence(house, members), ...members.slice(0, 5).map(placementEvidence)],
      absorbedSemanticKeys: [`house:${house}:prominence`, `house:${house}`],
    });
  }

  for (const [sign, members] of bySign) {
    if (members.length < 3) continue;
    const sameHouseCluster = members.every((member) => clampHouse(member.house) !== null && clampHouse(member.house) === clampHouse(members[0].house));
    if (sameHouseCluster && byHouse.get(clampHouse(members[0].house)!)?.length === members.length) continue;
    const key = `cluster:sign:${sign}`;
    const behavior = buildPlacementBehavioralInterpretation({
      planetId: members.find((member) => PERSONAL_PLANET_IDS.has(member.id))?.id ?? members[0].id,
      signId: sign,
      houseNumber: members.find((member) => clampHouse(member.house))?.house,
      audienceMode,
    });
    anchors.push({
      anchorId: key,
      kind: "cluster",
      semanticKey: key,
      title: `چند سیاره با روش مشترک ${SIGN_LABELS[sign]}`,
      summary: `${members.length.toLocaleString("fa-IR")} سیاره در ${SIGN_LABELS[sign]} قرار دارند؛ بنابراین روش این برج در چند کارکرد متفاوت تکرار می‌شود.`,
      dailyLife: behavior.dailyLifeExample,
      healthyExpression: behavior.healthyExpression,
      friction: behavior.possibleFriction,
      action: behavior.smallExperiment,
      score: 135 + members.length * 6,
      sourcePlanetIds: members.map((member) => member.id),
      sourceAspectIds: [],
      sourceHouseIds: uniq(members.map((member) => clampHouse(member.house)).filter((value): value is RealEngineReportHouseNumber => value !== null)),
      sourcePatternId: key,
      sourceNodeIds: [],
      rankingReasons: [`${members.length} سیاره اصلی در ${SIGN_LABELS[sign]} قرار دارند`],
      evidenceRefs: members.slice(0, 5).map(placementEvidence),
      absorbedSemanticKeys: [],
    });
  }

  return anchors.sort((a, b) => b.score - a.score || a.semanticKey.localeCompare(b.semanticKey));
}

function scorePlanet(
  placement: RealEngineReportPlacement,
  aspects: RealEngineReportAspect[],
  chartRulerId: string,
  retrogrades: Set<string>,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (placement.id === "sun" || placement.id === "moon") {
    score += 30;
    reasons.push("یکی از دو نور اصلی چارت است");
  }
  if (placement.id === chartRulerId) {
    score += 48;
    reasons.push("سیاره راهبر چارت است");
  }
  const house = clampHouse(placement.house);
  if (house && [1, 4, 7, 10].includes(house)) {
    score += 18;
    reasons.push(`در خانه زاویه‌ای ${house} قرار دارد`);
  }
  const ownAspects = aspects.filter((aspect) => [aspect.firstPlanetId, aspect.secondPlanetId].map(normalizePlanetId).includes(placement.id));
  const tight = ownAspects.filter((aspect) => aspect.orb <= 1.5);
  if (tight.length) {
    score += 18 + tight.length * 6;
    reasons.push(`${tight.length} تماس اصلی با اورب حداکثر ۱٫۵ درجه دارد`);
  }
  if (retrogrades.has(placement.id) && PERSONAL_PLANET_IDS.has(placement.id)) {
    score += 14;
    reasons.push("سیاره شخصی پس‌رو است و زمان‌بندی بیان آن نیاز به بازبینی درونی بیشتری دارد");
  }
  return { score, reasons };
}

function buildPlanetAnchors(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
  chartRulerId: string,
  audienceMode: BehavioralAudienceMode,
  retrogrades: Set<string>,
): AdaptiveNarrativeAnchor[] {
  return placements
    .filter((placement) => MAJOR_PLANET_IDS.includes(placement.id as (typeof MAJOR_PLANET_IDS)[number]))
    .map((placement) => {
      const ranked = scorePlanet(placement, aspects, chartRulerId, retrogrades);
      const behavior = buildPlacementBehavioralInterpretation({
        planetId: placement.id,
        signId: placement.signId,
        houseNumber: placement.house,
        retrograde: retrogrades.has(placement.id),
        audienceMode,
      });
      return {
        anchorId: `planet:${placement.id}:prominence`,
        kind: "planet" as const,
        semanticKey: `planet:${placement.id}:prominence`,
        title: `${formatPlacementAstrologyLabel(placement)} — موضوعی که چند بار در این چارت به مرکز داستان برمی‌گردد`,
        summary: behavior.plainMeaning,
        dailyLife: behavior.dailyLifeExample,
        healthyExpression: behavior.healthyExpression,
        friction: behavior.possibleFriction,
        action: behavior.smallExperiment,
        score: 70 + ranked.score,
        sourcePlanetIds: [placement.id],
        sourceAspectIds: aspects
          .filter((aspect) => aspect.orb <= 1.5 && [aspect.firstPlanetId, aspect.secondPlanetId].map(normalizePlanetId).includes(placement.id))
          .slice(0, 2)
          .map((aspect) => aspect.id),
        sourceHouseIds: clampHouse(placement.house) ? [clampHouse(placement.house)!] : [],
        sourcePatternId: null,
        sourceNodeIds: [],
        rankingReasons: ranked.reasons,
        evidenceRefs: [placementEvidence(placement), ...aspects.filter((aspect) => aspect.orb <= 1.5 && [aspect.firstPlanetId, aspect.secondPlanetId].map(normalizePlanetId).includes(placement.id)).slice(0, 2).map(aspectEvidence)],
        absorbedSemanticKeys: [],
      };
    })
    .filter((anchor) => anchor.rankingReasons.length > 0)
    .sort((a, b) => b.score - a.score || a.semanticKey.localeCompare(b.semanticKey));
}

function formatPlacementAstrologyLabel(
  placement: RealEngineReportPlacement,
  includeHouse = true,
) {
  const planetId = normalizePlanetId(placement.id);
  const symbol = PLANET_SYMBOLS[planetId] ?? "";
  const planet = PLANET_LABELS[planetId] ?? placement.label;
  const sign = SIGN_LABELS[placement.signId];
  const house = clampHouse(placement.house);
  return `${symbol ? `${symbol} ` : ""}${planet} در ${sign}${includeHouse && house ? ` · خانه ${house.toLocaleString("fa-IR")}` : ""}`;
}

function aspectHumanMeaning(aspect: RealEngineReportAspect) {
  const a = normalizePlanetId(aspect.firstPlanetId);
  const b = normalizePlanetId(aspect.secondPlanetId);
  const pair = new Set([a, b]);

  if (pair.has("moon") && pair.has("mars")) return "احساس و واکنش سریع باید یاد بگیرند با یک ریتم جلو بروند";
  if (pair.has("moon") && pair.has("saturn")) return "نیاز به حمایت با مسئولیت و کنترل روبه‌رو می‌شود";
  if (pair.has("sun") && pair.has("pluto")) return "دیده‌شدن، قدرت و تغییر عمیق هم‌زمان فعال می‌شوند";
  if (pair.has("sun") && pair.has("neptune")) return "جهت شخصی وقتی ابهام بالا می‌رود به مرز روشن‌تری نیاز دارد";
  if (pair.has("mars") && pair.has("saturn")) return "حرکت وقتی سخت‌تر می‌شود که مسئولیت، زمان یا محدودیت وارد ماجراست";
  if (pair.has("moon") && pair.has("venus")) return "امنیت عاطفی و شیوه دریافت محبت همیشه از یک مسیر نمی‌آیند";
  if (pair.has("mercury") && pair.has("jupiter")) return "جزئیات و تصویر بزرگ وقتی کنار هم قرار می‌گیرند، فکر را به تصمیم نزدیک‌تر می‌کنند";
  if (pair.has("mars") && pair.has("jupiter")) return "انگیزه وقتی جهت بزرگ‌تری پیدا می‌کند، سریع‌تر به اقدام تبدیل می‌شود";
  if (pair.has("jupiter") && pair.has("pluto")) return "باور و میل به تغییر می‌توانند شدت یکدیگر را بیشتر کنند";

  const first = PLANET_LABELS[a] ?? aspect.firstPlanetLabel;
  const second = PLANET_LABELS[b] ?? aspect.secondPlanetLabel;
  return DYNAMIC_ASPECTS.has(aspect.aspectId)
    ? `${first} و ${second} در این چارت همیشه پاسخ یکسانی نمی‌خواهند`
    : `${first} و ${second} یک توان مشترک می‌سازند که وقتی آگاهانه استفاده شود بیشتر دیده می‌شود`;
}

function aspectBehaviorTitle(
  aspect: RealEngineReportAspect,
  placements: RealEngineReportPlacement[],
) {
  const firstPlacement = getPlacement(placements, aspect.firstPlanetId);
  const secondPlacement = getPlacement(placements, aspect.secondPlanetId);
  const first = firstPlacement
    ? formatPlacementAstrologyLabel(firstPlacement, false)
    : `${PLANET_SYMBOLS[normalizePlanetId(aspect.firstPlanetId)] ?? ""} ${PLANET_LABELS[normalizePlanetId(aspect.firstPlanetId)] ?? aspect.firstPlanetLabel}`.trim();
  const second = secondPlacement
    ? formatPlacementAstrologyLabel(secondPlacement, false)
    : `${PLANET_SYMBOLS[normalizePlanetId(aspect.secondPlanetId)] ?? ""} ${PLANET_LABELS[normalizePlanetId(aspect.secondPlanetId)] ?? aspect.secondPlanetLabel}`.trim();
  const display = ASPECT_DISPLAY[aspect.aspectId];

  return `${first} ${display.symbol} ${display.angle.toLocaleString("fa-IR")}° با ${second} — ${aspectHumanMeaning(aspect)}`;
}

function behaviorForPlanetInAspect(
  planetId: string,
  placements: RealEngineReportPlacement[],
  otherPlanetId: string,
  aspectId: string,
  audienceMode: BehavioralAudienceMode,
  retrogrades: Set<string>,
) {
  const placement = getPlacement(placements, planetId);
  if (!placement) return null;
  return buildPlacementBehavioralInterpretation({
    planetId: placement.id,
    signId: placement.signId,
    houseNumber: placement.house,
    retrograde: retrogrades.has(placement.id),
    audienceMode,
    majorAspect: { otherPlanetId, aspectId, primary: true },
  });
}

// HALLEUS_REPORT_COPY_COMPOSITION_FINAL_QA_R19_20260808
function stripLeadingPossibility(value: string) {
  return value.replace(/^ممکن است\s+/u, "").trim();
}

function buildAspectAnchors(
  aspects: RealEngineReportAspect[],
  placements: RealEngineReportPlacement[],
  chartRulerId: string,
  audienceMode: BehavioralAudienceMode,
  retrogrades: Set<string>,
): AdaptiveNarrativeAnchor[] {
  const occupiedHouseCounts = new Map<number, number>();
  for (const placement of placements) {
    const house = clampHouse(placement.house);
    if (house) occupiedHouseCounts.set(house, (occupiedHouseCounts.get(house) ?? 0) + 1);
  }
  const activeHouseNumbers = [...occupiedHouseCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([house]) => house);
  const context: RealEngineAspectSelectionContext = {
    chartRulerId,
    activeHouseNumbers,
    placements: placements.map((placement) => ({ id: placement.id, house: placement.house ?? null })),
    retrogradePlanetIds: [...retrogrades],
  };
  const ranked = rankRealEngineAspects(aspects, context);
  return ranked.map((aspect, index) => {
    const first = behaviorForPlanetInAspect(aspect.firstPlanetId, placements, aspect.secondPlanetId, aspect.aspectId, audienceMode, retrogrades);
    const second = behaviorForPlanetInAspect(aspect.secondPlanetId, placements, aspect.firstPlanetId, aspect.aspectId, audienceMode, retrogrades);
    const dynamic = DYNAMIC_ASPECTS.has(aspect.aspectId);
    const core = [aspect.firstPlanetId, aspect.secondPlanetId].some((id) => id === "sun" || id === "moon");
    const ruler = [aspect.firstPlanetId, aspect.secondPlanetId].includes(chartRulerId);
    const personal = [aspect.firstPlanetId, aspect.secondPlanetId].some((id) => PERSONAL_PLANET_IDS.has(id));
    const outerOnly = OUTER_PLANET_IDS.has(aspect.firstPlanetId) && OUTER_PLANET_IDS.has(aspect.secondPlanetId);
    const score = 125 - aspect.orb * 9 + (core ? 18 : 0) + (ruler ? 15 : 0) + (personal ? 12 : 0) + (aspect.orb <= 1.5 ? 18 : 0) - (outerOnly ? 45 : 0) + (dynamic ? 4 : 0) - index * 0.01;
    const firstHouse = clampHouse(getPlacement(placements, aspect.firstPlanetId)?.house);
    const secondHouse = clampHouse(getPlacement(placements, aspect.secondPlanetId)?.house);
    const contextLine = firstHouse && secondHouse && firstHouse !== secondHouse
      ? `${HOUSE_EVENT_EXAMPLES[firstHouse]} یا ${HOUSE_EVENT_EXAMPLES[secondHouse]}`
      : firstHouse
        ? HOUSE_EVENT_EXAMPLES[firstHouse]
        : secondHouse
          ? HOUSE_EVENT_EXAMPLES[secondHouse]
          : "وقتی هر دو موضوع در یک تصمیم واقعی هم‌زمان فعال می‌شوند";
    return {
      anchorId: `aspect:${aspect.id}`,
      kind: "aspect" as const,
      semanticKey: `aspect:${aspect.id}`,
      title: aspectBehaviorTitle(aspect, placements),
      summary: dynamic
        ? "این تماس دو واکنش واقعی را هم‌زمان فعال می‌کند؛ مسئله حذف یکی نیست، بلکه روشن‌کردن زمان و اولویت هر کدام است."
        : "این تماس یک همکاری طبیعی‌تر میان دو بخش چارت می‌سازد؛ وقتی آن را به نتیجه‌ای واقعی وصل می‌کنی، توانش واضح‌تر دیده می‌شود.",
      dailyLife: `${contextLine}، ${stripLeadingPossibility(first?.dailyLifeExample ?? "یک واکنش")} و هم‌زمان ${stripLeadingPossibility(second?.dailyLifeExample ?? "نیاز دیگری")}.`,
      healthyExpression: first?.healthyExpression && second?.healthyExpression ? `${first.healthyExpression}؛ و در همان زمان ${second.healthyExpression}.` : first?.healthyExpression ?? second?.healthyExpression ?? aspect.meaning,
      friction: dynamic ? `${first?.possibleFriction ?? "فشار بالا می‌رود"}؛ در کنار ${second?.possibleFriction ?? "واکنش دوم هم سخت‌تر می‌شود"}.` : `اگر این توان عادی فرض شود، ${first?.possibleFriction ?? second?.possibleFriction ?? "استفاده آگاهانه از آن عقب می‌افتد"}.`,
      action: first?.smallExperiment ?? second?.smallExperiment ?? "یک رفتار کوچک و قابل مشاهده را برای این هفته انتخاب کن.",
      score,
      sourcePlanetIds: [aspect.firstPlanetId, aspect.secondPlanetId],
      sourceAspectIds: [aspect.id],
      sourceHouseIds: uniq([firstHouse, secondHouse].filter((value): value is RealEngineReportHouseNumber => value !== null)),
      sourcePatternId: null,
      sourceNodeIds: [],
      rankingReasons: [
        `اورب ${aspect.orb.toFixed(1)} درجه`,
        ...(core ? ["خورشید یا ماه در این تماس حضور دارد"] : []),
        ...(ruler ? ["سیاره راهبر در این تماس حضور دارد"] : []),
        ...(aspect.orb <= 1.5 ? ["تماس در محدوده بسیار نزدیک قرار دارد"] : []),
      ],
      evidenceRefs: [aspectEvidence(aspect)],
      absorbedSemanticKeys: [],
    };
  });
}

function selectDiverseAspectAnchors(
  anchors: AdaptiveNarrativeAnchor[],
  limit = 7,
) {
  const selected: AdaptiveNarrativeAnchor[] = [];
  const planetCounts = new Map<string, number>();

  for (const anchor of anchors) {
    if (selected.length >= limit) break;
    const planets = anchor.sourcePlanetIds.map(normalizePlanetId);
    const wouldRepeat = planets.some((planetId) => (planetCounts.get(planetId) ?? 0) >= 2);
    const hasMoreDiverseOption =
      wouldRepeat &&
      anchors.some(
        (candidate) =>
          candidate !== anchor &&
          !selected.includes(candidate) &&
          candidate.sourcePlanetIds.every(
            (planetId) => (planetCounts.get(normalizePlanetId(planetId)) ?? 0) < 2,
          ),
      );

    if (hasMoreDiverseOption) continue;

    selected.push(anchor);
    for (const planetId of planets) {
      planetCounts.set(planetId, (planetCounts.get(planetId) ?? 0) + 1);
    }
  }

  return selected;
}

function buildRulerAnchor(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
  chartRulerId: string,
  audienceMode: BehavioralAudienceMode,
  retrogrades: Set<string>,
): AdaptiveNarrativeAnchor | null {
  const placement = getPlacement(placements, chartRulerId);
  if (!placement) return null;
  const behavior = buildPlacementBehavioralInterpretation({
    planetId: placement.id,
    signId: placement.signId,
    houseNumber: placement.house,
    retrograde: retrogrades.has(placement.id),
    audienceMode,
  });
  const house = clampHouse(placement.house);
  const tight = aspects.filter((aspect) => aspect.orb <= 2 && [aspect.firstPlanetId, aspect.secondPlanetId].includes(chartRulerId));
  return {
    anchorId: `ruler:${chartRulerId}`,
    kind: "ruler-story",
    semanticKey: `ruler:${chartRulerId}`,
    title: `سیاره راهبر: ${PLANET_LABELS[chartRulerId] ?? chartRulerId}`,
    summary: `طالع این چارت با ${PLANET_LABELS[chartRulerId] ?? chartRulerId} هدایت می‌شود؛ در زبان فنی این همان حاکم سنتی طالع است. مهم‌تر از اسم اصطلاح، این است که سبک شروع و تصمیم‌گیری به جایگاه واقعی این سیاره وصل می‌شود.`,
    dailyLife: behavior.dailyLifeExample,
    healthyExpression: behavior.healthyExpression,
    friction: behavior.possibleFriction,
    action: behavior.smallExperiment,
    score: 112 + (house && [1, 4, 7, 10].includes(house) ? 15 : 0) + tight.length * 6,
    sourcePlanetIds: [chartRulerId],
    sourceAspectIds: tight.slice(0, 2).map((aspect) => aspect.id),
    sourceHouseIds: house ? [house] : [],
    sourcePatternId: null,
    sourceNodeIds: [],
    rankingReasons: ["این سیاره حاکم سنتی طالع است", ...(house ? [`در خانه ${house} قرار دارد`] : []), ...(tight.length ? [`${tight.length} تماس نزدیک اصلی دارد`] : [])],
    evidenceRefs: [placementEvidence(placement), ...tight.slice(0, 2).map(aspectEvidence)],
    absorbedSemanticKeys: [],
  };
}

function buildNodeStory(
  nodes: RealEngineReportCalculatedLunarNodes | null,
): AdaptiveNodeStory | null {
  if (!nodes) return null;
  const south = nodes.southNode;
  const north = nodes.northNode;
  const southHouse = clampHouse(south.house);
  const northHouse = clampHouse(north.house);
  const boundaryDistance = Math.min(south.degreeInSign, 30 - south.degreeInSign, north.degreeInSign, 30 - north.degreeInSign);
  const nearBoundary = boundaryDistance <= 0.5;
  const familiar = southHouse
    ? nodeSouthHouseBehavior(southHouse)
    : `در فشار، مسیر آشناتر این است که به روش آشناتر ${SIGN_LABELS[south.signId]} برگردی و همان راه را بیشتر از حد لازم تکرار کنی.`;
  const fresh = northHouse
    ? nodeNorthHouseBehavior(northHouse)
    : `انتخاب تازه‌تر، استفاده آگاهانه‌تر از کیفیت ${SIGN_LABELS[north.signId]} بدون حذف توان قبلی است.`;
  return {
    title: "گره‌های ماه: الگوی آشنا، مسیر تازه",
    familiarBehavior: familiar,
    usefulSkill: `بخش آشنای این محور مهارتی واقعی دارد: ${nodeSignSkill(south.signId)}. قرار نیست آن را کنار بگذاری.`,
    overuse: `${nodeSignOveruse(south.signId)}${southHouse ? `؛ مخصوصاً وقتی موضوع به ${HOUSE_LABELS[southHouse]} مربوط است` : ""}.`,
    freshBehavior: `${fresh} کیفیت ${SIGN_LABELS[north.signId]} اینجا یعنی ${nodeSignFresh(north.signId)}.`,
    experiment: nodeExperiment(southHouse, northHouse),
    confidence: nearBoundary
      ? `این نقطه فقط ${boundaryDistance.toFixed(2)}° با مرز برج فاصله دارد؛ جزئیات برج را با اطمینان پایین‌تر بخوان، اما محور خانه‌ها ${southHouse && northHouse ? `${southHouse}→${northHouse}` : "ثبت‌شده"} برای اقدام عملی وزن بیشتری دارد.`
      : `فاصله از مرز برج ${boundaryDistance.toFixed(2)}° است؛ برج و ${southHouse && northHouse ? "محور خانه‌ها" : "جهت محور"} می‌توانند کنار هم خوانده شوند.`,
    evidence: [
      { id: "node:south", kind: "node", sourceIds: [south.id], label: "☋ گره جنوبی", detail: `${SIGN_LABELS[south.signId]} ${south.degreeInSign.toFixed(1)}°${southHouse ? ` · خانه ${southHouse}` : ""}` },
      { id: "node:north", kind: "node", sourceIds: [north.id], label: "☊ گره شمالی", detail: `${SIGN_LABELS[north.signId]} ${north.degreeInSign.toFixed(1)}°${northHouse ? ` · خانه ${northHouse}` : ""}` },
    ],
  };
}

function nodeSouthHouseBehavior(house: RealEngineReportHouseNumber) {
  const map: Record<number, string> = {
    1: "در فشار، مسیر آشناتر این است که همه‌چیز را خودت به دوش بگیری، کنترل را نگه داری و کمک‌خواستن را دیرتر به زبان بیاوری",
    2: "در فشار، مسیر آشناتر این است که روی چیزی که خودت در اختیار داری، امنیت مالی یا کنترل منابع شخصی بیش از حد تکیه کنی",
    3: "در فشار، مسیر آشناتر این است که با توضیح، جمع‌کردن اطلاعات یا تکرار فکر سعی کنی ابهام را کاملاً کنترل کنی",
    4: "در فشار، مسیر آشناتر این است که به فضای آشنا، نقش خانوادگی یا الگوی قدیمی امنیت برگردی حتی وقتی دیگر کافی نیست",
    5: "در فشار، مسیر آشناتر این است که نیاز به دیده‌شدن، تأیید خلاقیت یا کنترل نتیجه شخصی بیش از حد مهم شود",
    6: "در فشار، مسیر آشناتر این است که مفیدبودن، وظیفه و حل‌کردن کارها را جای احساس و استراحت بگذاری",
    7: "در فشار، مسیر آشناتر این است که پاسخ طرف مقابل، رضایت او یا حفظ رابطه را زودتر از خواسته خودت بسنجی",
    8: "در فشار، مسیر آشناتر این است که درگیر کنترل اعتماد، آسیب‌پذیری یا منابع مشترک شوی و خروج از وضعیت آشنا سخت‌تر شود",
    9: "در فشار، مسیر آشناتر این است که به یک توضیح، باور یا پاسخ ذهنی قطعی پناه ببری تا ابهام کمتر شود",
    10: "در فشار، مسیر آشناتر این است که ارزش خودت را با مسئولیت، نتیجه و تصویری که از عملکردت دیده می‌شود یکی کنی",
    11: "در فشار، مسیر آشناتر این است که پشت نقش جمعی، ایده عمومی یا تعلق به گروه پنهان شوی و خواست شخصی دیرتر شنیده شود",
    12: "در فشار، مسیر آشناتر این است که مسئله را در خلوت بیش از حد تحلیل یا به‌تنهایی حل کنی و کمک‌خواستن عقب بیفتد",
  };
  return map[house];
}

function nodeNorthHouseBehavior(house: RealEngineReportHouseNumber) {
  const map: Record<number, string> = {
    1: "رفتار تازه‌تر این است که خواست و حضور شخصی را مستقیم‌تر نشان بدهی و مسئولیت انتخاب خودت را بپذیری.",
    2: "رفتار تازه‌تر این است که معیار ارزش، امنیت و مالکیت شخصی را روشن‌تر و قابل سنجش‌تر بسازی.",
    3: "رفتار تازه‌تر این است که سؤال مستقیم بپرسی، چیزی را ساده بگویی و تجربه روزمره را جای پاسخ خیلی بزرگ بنشانی.",
    4: "رفتار تازه‌تر این است که نیاز به خانه، ریشه، آرامش و مراقبت خصوصی را به اندازه موفقیت بیرونی جدی بگیری.",
    5: "رفتار تازه‌تر این است که چیزی را با نام و انتخاب خودت خلق کنی و اجازه بدهی میل شخصی دیده شود.",
    6: "رفتار تازه‌تر این است که الهام یا نیت را به یک کار روزمره، زمان مشخص و نتیجه «به اندازه کافی خوب» وصل کنی.",
    7: "رفتار تازه‌تر این است که مراقبت متقابل، درخواست کمک و وابستگی سالم را کنار استقلال نگه داری.",
    8: "رفتار تازه‌تر این است که در اعتماد مشترک حضور شخصی، خواسته صریح و سهم واقعی خودت را نشان بدهی.",
    9: "رفتار تازه‌تر این است که از اطلاعات پراکنده یک موضع شخصی بسازی و اجازه بدهی تجربه، باور تو را تغییر دهد.",
    10: "رفتار تازه‌تر این است که مسئولیت بیرونی را بپذیری و چیزی را تا نتیجه قابل مشاهده جلو ببری.",
    11: "رفتار تازه‌تر این است که خواست فردی را به همکاری، دوستی و آینده مشترک وصل کنی بدون اینکه در جمع محو شوی.",
    12: "رفتار تازه‌تر این است که استراحت، دریافت احساس و فضای بی‌وظیفه را بدون نیاز به اثبات مفیدبودن تحمل کنی.",
  };
  return map[house];
}

function nodeSignSkill(sign: ZodiacKey) {
  const map: Record<ZodiacKey, string> = {
    aries: "شروع و تصمیم مستقل",
    taurus: "ثبات و نگه‌داشتن چیزی که ارزش دارد",
    gemini: "پرسش، مشاهده و دیدن چند زاویه",
    cancer: "مراقبت و تشخیص نیاز عاطفی",
    leo: "حضور شخصی و جرئت نشان‌دادن خواسته",
    virgo: "تحلیل، اصلاح و دیدن جزئیات",
    libra: "دیدن دو طرف و مذاکره",
    scorpio: "تحمل عمق و دیدن چیزی که پنهان مانده",
    sagittarius: "دیدن تصویر بزرگ و معنا",
    capricorn: "مسئولیت و ساختن ساختار",
    aquarius: "فاصله ذهنی و دیدن الگو",
    pisces: "حساسیت و دریافت ظرافت",
  };
  return map[sign];
}

function nodeSignOveruse(sign: ZodiacKey) {
  const map: Record<ZodiacKey, string> = {
    aries: "استقلال می‌تواند به واکنش فوری و نشنیدن بازخورد تبدیل شود",
    taurus: "ثبات می‌تواند به ماندن فقط چون چیزی آشناست تبدیل شود",
    gemini: "دیدن چند زاویه می‌تواند تصمیم را در فکرهای بیشتر معلق نگه دارد",
    cancer: "مراقبت می‌تواند نیاز خودت را پشت نیاز دیگری پنهان کند",
    leo: "حضور شخصی می‌تواند نیاز به تأیید را بیش از حد مهم کند",
    virgo: "اصلاح می‌تواند به حل پنهانی و دیر رهاکردن کنترل تبدیل شود",
    libra: "مذاکره می‌تواند خواست خودت را تا بعد از رضایت دیگری عقب بیندازد",
    scorpio: "عمق می‌تواند به کنترل، آزمون پنهانی یا همه‌یا‌هیچ دیدن تبدیل شود",
    sagittarius: "تصویر بزرگ می‌تواند جزئیات عملی را نادیده بگیرد",
    capricorn: "مسئولیت می‌تواند به خودبسندگی سخت و دیر کمک خواستن تبدیل شود",
    aquarius: "فاصله ذهنی می‌تواند آسیب‌پذیری و خواسته صریح را عقب بیندازد",
    pisces: "حساسیت می‌تواند مرز میان دریافت و واقعیت بررسی‌شده را کمرنگ کند",
  };
  return map[sign];
}

function nodeSignFresh(sign: ZodiacKey) {
  const map: Record<ZodiacKey, string> = {
    aries: "انتخاب را زودتر به عمل کوچک تبدیل‌کردن",
    taurus: "ساختن ثبات ملموس بدون قفل‌شدن روی شکل قدیمی",
    gemini: "پرسیدن و آزمایش‌کردن به‌جای فرض‌کردن پاسخ",
    cancer: "پذیرفتن مراقبت و گفتن نیاز عاطفی",
    leo: "گرم‌تر و شخصی‌تر نشان‌دادن خواسته و سهم خودت",
    virgo: "تبدیل نیت به جزئیات قابل انجام",
    libra: "ساختن توافقی که هر دو طرف در آن دیده شوند",
    scorpio: "اعتماد تدریجی و گفتن چیزی که واقعاً در خطر است",
    sagittarius: "انتخاب معنا و موضع شخصی پس از دیدن داده‌ها",
    capricorn: "ساختن مسئولیت، زمان‌بندی و نتیجه قابل اتکا",
    aquarius: "دیدن الگو و ایجاد فاصله کافی برای انتخاب تازه",
    pisces: "انعطاف، پذیرش و اجازه‌دادن به چیزی که لازم نیست کامل کنترل شود",
  };
  return map[sign];
}

function nodeExperiment(southHouse: RealEngineReportHouseNumber | null, northHouse: RealEngineReportHouseNumber | null) {
  if (southHouse === 1 && northHouse === 7) return "این هفته یک بار قبل از اینکه همه‌چیز را خودت حل کنی، یک درخواست کمک مشخص و قابل جواب مطرح کن.";
  if (southHouse === 2 && northHouse === 8) return "در یک موضوع مشترک، به‌جای فقط نگه‌داشتن کنترل شخصی، سهم، خواسته و نگرانی خودت را مستقیم بگو.";
  if (southHouse === 6 && northHouse === 12) return "یک بازه کوتاه بدون وظیفه در برنامه بگذار و اجازه بده فقط استراحت یا دریافت احساس اتفاق بیفتد.";
  if (southHouse === 12 && northHouse === 6) return "یکی از فکرها یا نیت‌های خصوصی را به یک کار ده‌دقیقه‌ای با زمان پایان مشخص تبدیل کن.";
  return northHouse ? `یک رفتار کوچک مربوط به ${HOUSE_LABELS[northHouse]} انتخاب کن و هفت روز آن را تکرار کن؛ بدون اینکه توان آشنای قبلی را حذف کنی.` : "یک پاسخ کوچک و تازه انتخاب کن و هفت روز اثر واقعی آن را یادداشت کن.";
}

function buildBalanceStory(report: AstrologyReport): AdaptiveBalanceStory {
  const placements = report.realEngine?.placements ?? [];
  const signature = report.realEngine?.chartSignature ?? buildRealEngineChartSignature(placements);
  const dominantElement = signature.dominantElement;
  const dominantModality = signature.dominantModality;
  const zeroElement = signature.zeroElements[0];
  const parts = [
    dominantElement ? `${ELEMENT_LABELS[dominantElement]} بیشتر تکرار شده: ${ELEMENT_BEHAVIOR[dominantElement]}.` : null,
    dominantModality ? `${MODALITY_LABELS[dominantModality]} بیشتر تکرار شده: ${MODALITY_BEHAVIOR[dominantModality]}.` : null,
    zeroElement ? `${ELEMENT_LABELS[zeroElement]} در شمارش سیاره‌های اصلی صفر است. این نقص نیست؛ در عمل یعنی ${ZERO_ELEMENT_BEHAVIOR[zeroElement]}.` : null,
  ].filter((item): item is string => Boolean(item));
  const action = zeroElement === "earth"
    ? "برای یک تصمیم مهم، زمان پایان، قدم بعدی و نتیجه قابل لمس را قبل از شروع بنویس."
    : zeroElement === "fire"
      ? "برای شروع یک کار، به‌جای منتظرشدن برای هیجان، دلیل عملی و اولین حرکت پنج‌دقیقه‌ای را مشخص کن."
      : dominantModality === "fixed"
        ? "وقتی تغییری لازم است، دلیل تغییر و بخشی را که می‌تواند ثابت بماند کنار هم بنویس."
        : dominantModality === "mutable"
          ? "قبل از افزودن گزینه تازه، معیار پایان همین انتخاب را مشخص کن."
          : "یک رفتار قابل مشاهده انتخاب کن که ریتم غالب چارت را به نتیجه‌ای کوچک وصل کند.";
  return {
    title: "ترکیب انرژی‌ها",
    body: parts.join(" "),
    action,
    evidence: [{ id: "balance:signature", kind: "balance", sourceIds: signature.evidence.map((item) => item.placementId), label: "شمارش سیاره‌های اصلی", detail: `عنصر غالب: ${dominantElement ? ELEMENT_LABELS[dominantElement] : "بدون غالب قطعی"} · کیفیت غالب: ${dominantModality ? MODALITY_LABELS[dominantModality] : "بدون غالب قطعی"}` }],
  };
}

function buildHouseStories(
  placements: RealEngineReportPlacement[],
  chartRulerId: string,
  audienceMode: BehavioralAudienceMode,
  retrogrades: Set<string>,
): AdaptiveHouseStory[] {
  const counts = new Map<RealEngineReportHouseNumber, RealEngineReportPlacement[]>();
  for (const placement of placements) {
    const house = clampHouse(placement.house);
    if (house) counts.set(house, [...(counts.get(house) ?? []), placement]);
  }
  return [...counts.entries()]
    .map(([house, members]) => {
      let score = members.length * 20;
      if (members.some((member) => member.id === "sun" || member.id === "moon")) score += 18;
      if (members.some((member) => member.id === chartRulerId)) score += 20;
      if ([1, 4, 7, 10].includes(house)) score += 8;
      const reasonParts = [
        `${members.length.toLocaleString("fa-IR")} سیاره اصلی در این خانه قرار دارند`,
        members.some((member) => member.id === chartRulerId) ? "سیاره راهبر نیز اینجاست" : null,
        members.some((member) => member.id === "sun" || member.id === "moon") ? "خورشید یا ماه به این حوزه وزن داده" : null,
      ].filter((item): item is string => Boolean(item));
      const orderedMembers = [...members].sort((first, second) => {
        const weight = (placement: RealEngineReportPlacement) =>
          (placement.id === "sun" || placement.id === "moon" ? 40 : 0) +
          (placement.id === chartRulerId ? 35 : 0) +
          (PERSONAL_PLANET_IDS.has(placement.id) ? 20 : 0);
        return weight(second) - weight(first);
      });
      const primary = orderedMembers[0];
      const secondary = orderedMembers[1] ?? null;
      const primaryBehavior = buildPlacementBehavioralInterpretation({
        planetId: primary.id,
        signId: primary.signId,
        houseNumber: house,
        retrograde: retrogrades.has(primary.id),
        audienceMode,
      });
      const secondaryBehavior = secondary
        ? buildPlacementBehavioralInterpretation({
            planetId: secondary.id,
            signId: secondary.signId,
            houseNumber: house,
            retrograde: retrogrades.has(secondary.id),
            audienceMode,
          })
        : null;
      const astrologyLabel = orderedMembers
        .slice(0, 3)
        .map((placement) => formatPlacementAstrologyLabel(placement))
        .join(" · ");

      return {
        houseNumber: house,
        label: HOUSE_LABELS[house],
        score,
        planetIds: members.map((member) => member.id),
        reason: reasonParts.join("؛ "),
        astrologyLabel,
        headline: stripLeadingPossibility(primaryBehavior.plainMeaning),
        synthesis: [
          `حضور ${formatPlacementAstrologyLabel(primary)} باعث می‌شود ${HOUSE_LABELS[house]} در این چارت مستقیماً به ${primaryBehavior.focus} وصل شود.`,
          secondaryBehavior && secondary
            ? `هم‌زمان ${formatPlacementAstrologyLabel(secondary)} یک لایه دیگر اضافه می‌کند: ${stripLeadingPossibility(secondaryBehavior.plainMeaning)}`
            : null,
        ]
          .filter((item): item is string => Boolean(item))
          .join(" "),
        pressure: [
          primaryBehavior.possibleFriction,
          secondaryBehavior?.possibleFriction,
        ]
          .filter((item): item is string => Boolean(item))
          .join("؛ "),
        livedExample: HOUSE_EVENT_EXAMPLES[house],
        evidence: [buildHouseEvidence(house, members), ...orderedMembers.slice(0, 3).map(placementEvidence)],
      };
    })
    // HALLEUS_FREE_ALL_ALL_OCCUPIED_HOUSES_20260815
    .sort((a, b) => b.score - a.score || a.houseNumber - b.houseNumber);
}

function absorbSemanticDuplicates(candidates: AdaptiveNarrativeAnchor[]) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score || a.semanticKey.localeCompare(b.semanticKey));
  const accepted: AdaptiveNarrativeAnchor[] = [];
  const absorbed = new Set<string>();
  for (const candidate of sorted) {
    if (absorbed.has(candidate.semanticKey)) continue;
    if (candidate.kind === "planet") {
      const owning = accepted.find((story) =>
        (
          story.kind === "cluster" &&
          story.sourcePlanetIds.includes(candidate.sourcePlanetIds[0]) &&
          story.sourceHouseIds.some((house) => candidate.sourceHouseIds.includes(house))
        ) || (
          (story.kind === "aspect" || story.kind === "aspect-pattern") &&
          story.sourcePlanetIds.includes(candidate.sourcePlanetIds[0]) &&
          candidate.rankingReasons.length <= 2
        ),
      );
      if (owning) {
        owning.rankingReasons = uniq([...owning.rankingReasons, ...candidate.rankingReasons]);
        owning.evidenceRefs = dedupeEvidence([...owning.evidenceRefs, ...candidate.evidenceRefs]);
        owning.absorbedSemanticKeys.push(candidate.semanticKey);
        continue;
      }
    }
    if (candidate.kind === "cluster") {
      const owningCluster = accepted.find((story) =>
        story.kind === "cluster" &&
        candidate.sourcePlanetIds.length > 0 &&
        candidate.sourcePlanetIds.every((planetId) => story.sourcePlanetIds.includes(planetId)) &&
        candidate.sourceHouseIds.some((house) => story.sourceHouseIds.includes(house)),
      );
      if (owningCluster) {
        owningCluster.rankingReasons = uniq([...owningCluster.rankingReasons, ...candidate.rankingReasons]);
        owningCluster.evidenceRefs = dedupeEvidence([...owningCluster.evidenceRefs, ...candidate.evidenceRefs]);
        owningCluster.absorbedSemanticKeys = uniq([...owningCluster.absorbedSemanticKeys, candidate.semanticKey, ...candidate.absorbedSemanticKeys]);
        continue;
      }

      const ownedPlanetIndexes = accepted
        .map((story, index) => ({ story, index }))
        .filter(({ story }) =>
          story.kind === "planet" &&
          story.sourcePlanetIds.length === 1 &&
          candidate.sourcePlanetIds.includes(story.sourcePlanetIds[0]) &&
          candidate.sourceHouseIds.some((house) => story.sourceHouseIds.includes(house)),
        )
        .map(({ index }) => index);
      if (ownedPlanetIndexes.length > 0) {
        const ownedPlanets = ownedPlanetIndexes.map((index) => accepted[index]);
        candidate.rankingReasons = uniq([...candidate.rankingReasons, ...ownedPlanets.flatMap((story) => story.rankingReasons)]);
        candidate.evidenceRefs = dedupeEvidence([...candidate.evidenceRefs, ...ownedPlanets.flatMap((story) => story.evidenceRefs)]);
        candidate.absorbedSemanticKeys = uniq([
          ...candidate.absorbedSemanticKeys,
          ...ownedPlanets.flatMap((story) => [story.semanticKey, ...story.absorbedSemanticKeys]),
        ]);
        for (const index of [...ownedPlanetIndexes].sort((a, b) => b - a)) accepted.splice(index, 1);
      }
    }
    const duplicate = accepted.find((story) =>
      story.semanticKey === candidate.semanticKey ||
      story.absorbedSemanticKeys.includes(candidate.semanticKey) ||
      candidate.absorbedSemanticKeys.includes(story.semanticKey),
    );
    if (duplicate) {
      duplicate.rankingReasons = uniq([...duplicate.rankingReasons, ...candidate.rankingReasons]);
      duplicate.evidenceRefs = dedupeEvidence([...duplicate.evidenceRefs, ...candidate.evidenceRefs]);
      duplicate.absorbedSemanticKeys = uniq([...duplicate.absorbedSemanticKeys, candidate.semanticKey, ...candidate.absorbedSemanticKeys]);
      continue;
    }
    accepted.push({ ...candidate, evidenceRefs: dedupeEvidence(candidate.evidenceRefs), absorbedSemanticKeys: uniq(candidate.absorbedSemanticKeys) });
    for (const key of candidate.absorbedSemanticKeys) absorbed.add(key);
  }
  return accepted;
}

function dedupeEvidence(items: AdaptiveNarrativeEvidence[]) {
  const map = new Map<string, AdaptiveNarrativeEvidence>();
  for (const item of items) if (!map.has(item.id)) map.set(item.id, item);
  return [...map.values()];
}

function buildHouseAnchors(
  placements: RealEngineReportPlacement[],
  chartRulerId: string,
): AdaptiveNarrativeAnchor[] {
  const groups = new Map<RealEngineReportHouseNumber, RealEngineReportPlacement[]>();
  for (const placement of placements) {
    const house = clampHouse(placement.house);
    if (!house) continue;
    groups.set(house, [...(groups.get(house) ?? []), placement]);
  }
  return [...groups.entries()]
    .filter(([, members]) => members.length >= 2 || members.some((member) => member.id === chartRulerId))
    .map(([house, members]) => ({
      anchorId: `house:${house}:prominence`,
      kind: "house" as const,
      semanticKey: `house:${house}:prominence`,
      title: `خانه مهم: ${HOUSE_LABELS[house]}`,
      summary: `${members.length.toLocaleString("fa-IR")} سیاره اصلی در خانه ${house.toLocaleString("fa-IR")} قرار دارند${members.some((member) => member.id === chartRulerId) ? " و سیاره راهبر هم در همین حوزه است" : ""}.`,
      dailyLife: HOUSE_EVENT_EXAMPLES[house],
      healthyExpression: "وقتی این حوزه خوب کار می‌کند، چند نیاز متفاوت را به یک تصمیم قابل مشاهده وصل می‌کنی و لازم نیست هر سیاره را جدا از زمینه زندگی بخوانی.",
      friction: "اگر این حوزه بیش از حد بار بگیرد، ممکن است ارزش یک تصمیم به نتیجه همین بخش از زندگی گره بخورد و گزینه‌های دیگر دیرتر دیده شوند.",
      action: `یک موقعیت واقعی مربوط به ${HOUSE_LABELS[house]} را انتخاب کن و فقط یک قدم روشن و قابل پایان برایش تعریف کن.`,
      score: 105 + members.length * 8 + (members.some((member) => member.id === chartRulerId) ? 14 : 0),
      sourcePlanetIds: members.map((member) => member.id),
      sourceAspectIds: [],
      sourceHouseIds: [house],
      sourcePatternId: null,
      sourceNodeIds: [],
      rankingReasons: [
        `${members.length} سیاره اصلی در خانه ${house} قرار دارند`,
        ...(members.some((member) => member.id === chartRulerId) ? ["سیاره راهبر در این خانه قرار دارد"] : []),
      ],
      evidenceRefs: [buildHouseEvidence(house, members), ...members.slice(0, 4).map(placementEvidence)],
      absorbedSemanticKeys: [],
    }))
    .sort((a, b) => b.score - a.score || a.semanticKey.localeCompare(b.semanticKey));
}

function buildNodeAnchor(
  nodes: RealEngineReportCalculatedLunarNodes | null,
  nodeStory: AdaptiveNodeStory | null,
): AdaptiveNarrativeAnchor | null {
  if (!nodes || !nodeStory) return null;
  const southHouse = clampHouse(nodes.southNode.house);
  const northHouse = clampHouse(nodes.northNode.house);
  const boundaryDistance = Math.min(
    nodes.southNode.degreeInSign,
    30 - nodes.southNode.degreeInSign,
    nodes.northNode.degreeInSign,
    30 - nodes.northNode.degreeInSign,
  );
  const angularAxis = [southHouse, northHouse].some((house) => house !== null && [1, 4, 7, 10].includes(house));
  if (boundaryDistance > 0.5 && !angularAxis) return null;
  const key = `axis:nodes:${nodes.southNode.id}:${nodes.northNode.id}`;
  return {
    anchorId: key,
    kind: "lunar-node-axis",
    semanticKey: key,
    title: "گره‌های ماه: الگویی که آشناست و مسیری که تو را جلوتر می‌برد",
    summary: nodeStory.familiarBehavior,
    dailyLife: nodeStory.overuse,
    healthyExpression: nodeStory.usefulSkill,
    friction: nodeStory.freshBehavior,
    action: nodeStory.experiment,
    score: 135 + (boundaryDistance <= 0.5 ? 20 : 0) + (angularAxis ? 12 : 0),
    sourcePlanetIds: [],
    sourceAspectIds: [],
    sourceHouseIds: [southHouse, northHouse].filter((house): house is RealEngineReportHouseNumber => house !== null),
    sourcePatternId: null,
    sourceNodeIds: [nodes.southNode.id, nodes.northNode.id],
    rankingReasons: [
      ...(boundaryDistance <= 0.5 ? [`فاصله از مرز برج فقط ${boundaryDistance.toFixed(2)} درجه است و محور خانه‌ها برای اقدام وزن بیشتری دارد`] : []),
      ...(angularAxis ? ["محور گره‌های ماه با یکی از خانه‌های زاویه‌ای تماس دارد"] : []),
    ],
    evidenceRefs: nodeStory.evidence,
    absorbedSemanticKeys: [],
  };
}

function chooseTopStories(candidates: AdaptiveNarrativeAnchor[]) {
  const accepted = absorbSemanticDuplicates(candidates);
  const picked: AdaptiveNarrativeAnchor[] = [];
  for (const candidate of accepted) {
    if (picked.length >= 3) break;
    const exactOverlap = picked.some((story) =>
      story.kind === candidate.kind &&
      story.sourcePlanetIds.length > 0 &&
      candidate.sourcePlanetIds.length > 0 &&
      story.sourcePlanetIds.every((id) => candidate.sourcePlanetIds.includes(id)) &&
      candidate.sourcePlanetIds.every((id) => story.sourcePlanetIds.includes(id)),
    );
    if (exactOverlap) continue;
    picked.push(candidate);
  }
  return picked;
}

function storyMode(stories: AdaptiveNarrativeAnchor[]): AdaptiveNarrativeMode {
  const lead = stories[0];
  if (!lead) return "strength-led";
  if (lead.kind === "cluster") return "cluster-led";
  if (lead.kind === "lunar-node-axis" || lead.kind === "axis") return "axis-led";
  if (lead.kind === "ruler-story") return "ruler-led";
  if (lead.kind === "aspect-pattern") {
    return lead.semanticKey.startsWith("pattern:t-square:")
      ? "tension-led"
      : "strength-led";
  }
  if (lead.kind === "aspect") return lead.summary.includes("مدیریت دو واکنش") ? "tension-led" : "strength-led";
  return "strength-led";
}

function buildPlacementStory(
  placement: RealEngineReportPlacement,
  audienceMode: BehavioralAudienceMode,
  retrogrades: Set<string>,
  importance: AdaptivePlacementStory["importance"],
): AdaptivePlacementStory {
  return {
    planetId: placement.id,
    planetLabel: PLANET_LABELS[placement.id] ?? placement.label,
    signId: placement.signId,
    signLabel: SIGN_LABELS[placement.signId],
    houseNumber: clampHouse(placement.house),
    retrograde: retrogrades.has(placement.id),
    importance,
    interpretation: buildPlacementBehavioralInterpretation({
      planetId: placement.id,
      signId: placement.signId,
      houseNumber: placement.house,
      retrograde: retrogrades.has(placement.id),
      audienceMode,
    }),
  };
}

// HALLEUS_REPORT_SEMANTIC_FINAL_QA_R18_20260808
export function normalizeAdaptiveActionKey(value: string) {
  return value
    .replace(/^[^—]+—\s*/u, "")
    .replace(/\s+/gu, " ")
    .replace(/[.،؛!?؟]+$/u, "")
    .trim();
}

function buildWeeklyActions(
  placements: RealEngineReportPlacement[],
  audienceMode: BehavioralAudienceMode,
  retrogrades: Set<string>,
  topStories: AdaptiveNarrativeAnchor[],
  balance: AdaptiveBalanceStory,
  node: AdaptiveNodeStory | null,
) {
  const moon = getPlacement(placements, "moon");
  const mercury = getPlacement(placements, "mercury");
  const sun = getPlacement(placements, "sun");
  const relational = moon
    ? buildPlacementBehavioralInterpretation({ planetId: moon.id, signId: moon.signId, houseNumber: moon.house, retrograde: retrogrades.has("moon"), audienceMode }).smallExperiment
    : topStories[0]?.action;
  const daily = mercury
    ? buildPlacementBehavioralInterpretation({ planetId: mercury.id, signId: mercury.signId, houseNumber: mercury.house, retrograde: retrogrades.has("mercury"), audienceMode }).smallExperiment
    : balance.action;
  const identity = sun
    ? buildPlacementBehavioralInterpretation({ planetId: sun.id, signId: sun.signId, houseNumber: sun.house, retrograde: retrogrades.has("sun"), audienceMode }).smallExperiment
    : node?.experiment ?? topStories[1]?.action;
  const primary = [
    relational ? `احساس و رابطه — ${relational}` : null,
    daily ? `روزمره و کار — ${daily}` : null,
    identity ? `هویت و تصمیم — ${identity}` : null,
  ].filter((item): item is string => Boolean(item));
  const fallback = [node?.experiment, balance.action, ...topStories.map((story) => story.action)]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 8)
    .map((item) => `تمرین تکمیلی — ${item}`);
  return uniq([...primary, ...fallback]).slice(0, 3);
}

function estimateReadingMinutes(plan: Omit<AdaptiveReportPlan, "readingMinutes">) {
  const strings = [
    ...plan.topStories.flatMap((story) => [story.title, story.summary, story.dailyLife, story.healthyExpression, story.friction, story.action, ...story.rankingReasons, ...story.evidenceRefs.flatMap((evidence) => [evidence.label, evidence.detail])]),
    ...plan.bigThree.flatMap((story) => Object.values(story.interpretation).filter((value): value is string => typeof value === "string")),
    ...plan.importantHouses.flatMap((story) => [story.label, story.reason, story.astrologyLabel, story.headline, story.synthesis, story.pressure, story.livedExample]),
    ...plan.importantAspects.flatMap((story) => [story.title, story.dailyLife, story.healthy, story.friction, story.action]),
    ...(plan.nodeStory ? [plan.nodeStory.familiarBehavior, plan.nodeStory.usefulSkill, plan.nodeStory.overuse, plan.nodeStory.freshBehavior, plan.nodeStory.experiment, plan.nodeStory.confidence] : []),
    plan.balanceStory.body,
    plan.balanceStory.action,
    ...plan.weeklyActions,
    ...plan.placementStories.flatMap((story) => Object.values(story.interpretation).filter((value): value is string => typeof value === "string")),
  ];
  const words = strings.join(" ").trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(12, Math.min(18, Math.ceil(words / 155)));
}

export function buildAdaptiveReportPlan(report: AstrologyReport): AdaptiveReportPlan {
  const placements = (report.realEngine?.placements ?? []).filter((placement) => MAJOR_PLANET_IDS.includes(normalizePlanetId(placement.id) as (typeof MAJOR_PLANET_IDS)[number]));
  const aspects = report.realEngine?.aspects ?? report.realEngine?.aspectHighlights ?? [];
  const audienceMode = getAudienceMode(report);
  const chartRulerId = getChartRulerId(report);
  const retrogrades = new Set(
    report.realEngine?.retrogrades?.status === "calculated"
      ? report.realEngine.retrogrades.planetIds.map(normalizePlanetId)
      : [],
  );

  const nodes = report.realEngine?.lunarNodes?.status === "calculated"
    ? (report.realEngine.lunarNodes as RealEngineReportCalculatedLunarNodes)
    : null;
  const nodeStory = buildNodeStory(nodes);
  const patterns = buildPatternAnchors(aspects, placements);
  const clusters = buildClusterAnchors(placements, chartRulerId, audienceMode);
  const aspectAnchors = buildAspectAnchors(aspects, placements, chartRulerId, audienceMode, retrogrades);
  const planetAnchors = buildPlanetAnchors(placements, aspects, chartRulerId, audienceMode, retrogrades);
  const houseAnchors = buildHouseAnchors(placements, chartRulerId);
  const rulerAnchor = buildRulerAnchor(placements, aspects, chartRulerId, audienceMode, retrogrades);
  const nodeAnchor = buildNodeAnchor(nodes, nodeStory);
  const topStories = chooseTopStories([
    ...patterns,
    ...clusters,
    ...aspectAnchors,
    ...planetAnchors,
    ...houseAnchors,
    ...(nodeAnchor ? [nodeAnchor] : []),
    ...(rulerAnchor ? [rulerAnchor] : []),
  ]);

  const bigThree = ["sun", "moon"]
    .map((id) => getPlacement(placements, id))
    .filter((placement): placement is RealEngineReportPlacement => Boolean(placement))
    .map((placement) => buildPlacementStory(placement, audienceMode, retrogrades, "core"));

  const ascSign = report.realEngine?.angles?.asc?.signId;
  if (ascSign) {
    const ascPlacement: AdaptivePlacementStory = {
      planetId: "asc",
      planetLabel: "رایزینگ",
      signId: ascSign,
      signLabel: SIGN_LABELS[ascSign],
      houseNumber: 1,
      retrograde: false,
      importance: "core",
      interpretation: {
        plainMeaning: `رایزینگ ${SIGN_LABELS[ascSign]} شیوه ورود، واکنش اولیه و چیزی را نشان می‌دهد که دیگران زودتر از تو می‌بینند.`,
        dailyLifeExample: HOUSE_EVENT_EXAMPLES[1],
        healthyExpression: `کیفیت ${SIGN_LABELS[ascSign]} را برای شروع به کار می‌گیری بدون اینکه آن را تمام شخصیت خودت فرض کنی.`,
        possibleFriction: "تصویر اولیه گاهی با چیزی که بعدتر درونت روشن می‌شود فرق دارد؛ تصمیم مهم لازم نیست فقط از واکنش اول پیروی کند.",
        focus: "شروع، حضور و تصویر اولیه",
        smallExperiment: "در یک شروع تازه، واکنش اولت را ببین و قبل از تصمیم نهایی یک بار هم خواست واقعی خودت را نام ببر.",
        symbolicBody: "",
      },
    };
    bigThree.push(ascPlacement);
  }

  for (const id of ["mercury", "mars", "venus"]) {
    const placement = getPlacement(placements, id);
    if (placement) {
      bigThree.push(
        buildPlacementStory(placement, audienceMode, retrogrades, "core"),
      );
    }
  }

  const importantHouses = buildHouseStories(placements, chartRulerId, audienceMode, retrogrades);
  const consumedTopAspectIds = new Set(topStories.flatMap((story) => story.sourceAspectIds));
  const importantAspects = selectDiverseAspectAnchors(
    aspectAnchors.filter(
      (anchor) => !consumedTopAspectIds.has(anchor.sourceAspectIds[0]),
    ),
    7,
  )
    .map((anchor) => ({
      aspect: aspects.find((aspect) => aspect.id === anchor.sourceAspectIds[0])!,
      title: anchor.title,
      dailyLife: anchor.dailyLife,
      healthy: anchor.healthyExpression,
      friction: anchor.friction,
      action: anchor.action,
      evidence: anchor.evidenceRefs,
    }))
    .filter((story) => Boolean(story.aspect));

  const balanceStory = buildBalanceStory(report);

  const involved = new Set(topStories.flatMap((story) => story.sourcePlanetIds));
  involved.add(chartRulerId);
  const placementStories = placements
    .filter((placement) => !["sun", "moon", "mercury", "mars", "venus"].includes(placement.id))
    .map((placement) => ({
      placement,
      score: (involved.has(placement.id) ? 40 : 0) + (PERSONAL_PLANET_IDS.has(placement.id) ? 25 : 0) + (retrogrades.has(placement.id) ? 15 : 0),
    }))
    .sort((a, b) => b.score - a.score || MAJOR_PLANET_IDS.indexOf(a.placement.id as (typeof MAJOR_PLANET_IDS)[number]) - MAJOR_PLANET_IDS.indexOf(b.placement.id as (typeof MAJOR_PLANET_IDS)[number]))
    // HALLEUS_FREE_ALL_ALL_PLANET_STORIES_20260815
    .map(({ placement }, index) => buildPlacementStory(placement, audienceMode, retrogrades, index < 2 ? "secondary" : "compact"));

  const weeklyActions = buildWeeklyActions(placements, audienceMode, retrogrades, topStories, balanceStory, nodeStory);
  const partial: Omit<AdaptiveReportPlan, "readingMinutes"> = {
    version: ADAPTIVE_REPORT_PLANNER_VERSION,
    mode: storyMode(topStories),
    audienceMode,
    chartRulerId,
    chartRulerLabel: PLANET_LABELS[chartRulerId] ?? chartRulerId,
    topStories,
    bigThree,
    importantHouses,
    importantAspects,
    nodeStory,
    balanceStory,
    weeklyActions,
    placementStories,
  };
  return { ...partial, readingMinutes: estimateReadingMinutes(partial) };
}

export function assertAdaptiveAnchorIntegrity(plan: AdaptiveReportPlan) {
  for (const anchor of plan.topStories) {
    if (!anchor.anchorId || !anchor.semanticKey) throw new Error("Adaptive anchor identity is missing.");
    if (anchor.evidenceRefs.length === 0) throw new Error(`Adaptive anchor ${anchor.anchorId} has no evidence.`);
    const evidenceIds = new Set(anchor.evidenceRefs.flatMap((evidence) => evidence.sourceIds));
    for (const aspectId of anchor.sourceAspectIds) {
      if (!evidenceIds.has(aspectId)) throw new Error(`Adaptive anchor ${anchor.anchorId} lost aspect provenance ${aspectId}.`);
    }
    for (const planetId of anchor.sourcePlanetIds) {
      if (!evidenceIds.has(planetId)) {
        throw new Error(`Adaptive anchor ${anchor.anchorId} lost planet provenance ${planetId}.`);
      }
    }
    for (const nodeId of anchor.sourceNodeIds) {
      if (!evidenceIds.has(nodeId)) {
        throw new Error(`Adaptive anchor ${anchor.anchorId} lost node provenance ${nodeId}.`);
      }
    }
  }
  const semanticKeys = plan.topStories.map((story) => story.semanticKey);
  if (new Set(semanticKeys).size !== semanticKeys.length) throw new Error("Adaptive top stories contain semantic duplicates.");
  const clusterHouses = new Set(plan.topStories.filter((story) => story.kind === "cluster").flatMap((story) => story.sourceHouseIds));
  if (plan.topStories.some((story) => story.kind === "house" && story.sourceHouseIds.some((house) => clusterHouses.has(house)))) {
    throw new Error("Adaptive top stories contain a cluster/house duplicate.");
  }
  if (plan.topStories.some((story) => story.kind === "planet" && plan.topStories.some((candidate) => candidate.kind === "cluster" && candidate.sourcePlanetIds.includes(story.sourcePlanetIds[0]) && candidate.sourceHouseIds.some((house) => story.sourceHouseIds.includes(house))))) {
    throw new Error("Adaptive top stories repeat a standalone planet already owned by a cluster.");
  }
  if (plan.importantHouses.some((story) => clusterHouses.has(story.houseNumber))) {
    throw new Error("Adaptive important houses repeat a top cluster house instead of adding a new layer.");
  }
  const consumedTopAspectIds = new Set(plan.topStories.flatMap((story) => story.sourceAspectIds));
  if (plan.importantAspects.some((story) => consumedTopAspectIds.has(story.aspect.id))) {
    throw new Error("Adaptive important aspects repeat a top-story aspect.");
  }
  const weeklyActionKeys = plan.weeklyActions.map(normalizeAdaptiveActionKey).filter(Boolean);
  if (new Set(weeklyActionKeys).size !== weeklyActionKeys.length) {
    throw new Error("Adaptive weekly actions contain semantic duplicates.");
  }
}
