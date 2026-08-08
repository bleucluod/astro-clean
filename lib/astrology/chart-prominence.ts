import { buildRealEngineChartSignature } from "@/lib/astrology/real-engine-chart-signature";
import type {
  AstrologyReport,
  RealEngineChartElement,
  RealEngineChartModality,
  RealEngineReportAngles,
  RealEngineReportAspect,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";
import type { HumanFirstReadingSectionId } from "@/types/human-first-reading";

export const CHART_PROMINENCE_VERSION = "chart-prominence-v1" as const;

export type ChartProminenceDistribution =
  | "concentrated"
  | "mixed"
  | "distributed"
  | "unavailable";

export type ChartProminenceEvidence = {
  id: string;
  label: string;
  score: number;
};

export type ChartProminenceRankedItem = {
  id: string;
  label: string;
  score: number;
  evidence: ChartProminenceEvidence[];
};

export type ChartProminenceSignatureKind =
  | "planet"
  | "house"
  | "axis"
  | "aspect"
  | "theme"
  | "luminary"
  | "hemisphere"
  | "quadrant"
  | "distribution"
  | "pattern";

export type ChartProminenceSignature = {
  id: string;
  kind: ChartProminenceSignatureKind;
  title: string;
  summary: string;
  evidence: string[];
  score: number;
  destination: HumanFirstReadingSectionId;
};

export type ChartProminenceProfile = {
  version: typeof CHART_PROMINENCE_VERSION;
  hasReliableBirthTime: boolean;
  dominantPlanet: ChartProminenceRankedItem | null;
  dominantHouse: ChartProminenceRankedItem | null;
  dominantAxis: ChartProminenceRankedItem | null;
  dominantAspect: ChartProminenceRankedItem | null;
  repeatedTheme: ChartProminenceRankedItem | null;
  chartRuler: ChartProminenceRankedItem | null;
  luminaryEmphasis: ChartProminenceRankedItem | null;
  hemisphere: ChartProminenceRankedItem | null;
  quadrant: ChartProminenceRankedItem | null;
  distribution: ChartProminenceDistribution;
  signatures: ChartProminenceSignature[];
  chartSentence: string;
  excludedTimeDependentFactors: string[];
};

type ScoredEntity = ChartProminenceRankedItem;

type AspectScore = {
  aspect: RealEngineReportAspect;
  score: number;
  evidence: string[];
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

const MAJOR_PLANET_SET = new Set<string>(MAJOR_PLANET_IDS);
const PERSONAL_PLANET_SET = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const LUMINARY_SET = new Set(["sun", "moon"]);
const ANGULAR_HOUSE_SET = new Set<number>([1, 4, 7, 10]);
const DYNAMIC_ASPECTS = new Set(["square", "opposition"]);

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

const SIGN_MODALITY: Record<ZodiacKey, RealEngineChartModality> = {
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

const CHART_RULER_BY_RISING: Record<ZodiacKey, string> = {
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

const HOUSE_FIELDS: Record<number, string> = {
  1: "هویت، بدن و شروع‌ها",
  2: "ارزش، امنیت و منابع",
  3: "فکر، کلام و یادگیری",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و عادت‌ها",
  7: "رابطه نزدیک و شراکت",
  8: "اعتماد، صمیمیت و دگرگونی",
  9: "معنا، باور و افق‌های دورتر",
  10: "مسیر اجتماعی و مسئولیت",
  11: "جمع، دوستی و آینده‌سازی",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const AXIS_SPECS = [
  { id: "axis-1-7", houses: [1, 7], label: "محور هویت و رابطه", destination: "relationships" },
  { id: "axis-4-10", houses: [4, 10], label: "محور ریشه و مسیر اجتماعی", destination: "growth-path" },
  { id: "axis-2-8", houses: [2, 8], label: "محور امنیت و اعتماد", destination: "inner-world" },
  { id: "axis-3-9", houses: [3, 9], label: "محور ذهن و معنا", destination: "mind-language" },
  { id: "axis-5-11", houses: [5, 11], label: "محور بیان شخصی و جمع", destination: "relationships" },
  { id: "axis-6-12", houses: [6, 12], label: "محور نظم روزمره و خلوت", destination: "growth-path" },
] as const satisfies ReadonlyArray<{
  id: string;
  houses: readonly [number, number];
  label: string;
  destination: HumanFirstReadingSectionId;
}>;

const ASPECT_ORB_LIMITS: Record<RealEngineReportAspect["aspectId"], number> = {
  conjunction: 8,
  sextile: 5,
  square: 6,
  trine: 6,
  opposition: 8,
};

const TIME_DEPENDENT_FACTORS = [
  "خانه مسلط",
  "محور مسلط",
  "حاکم چارت",
  "نزدیکی به زاویه‌ها",
  "نیم‌کره‌ها",
  "ربع‌های چارت",
] as const;

export function buildChartProminenceProfile(
  report: AstrologyReport,
): ChartProminenceProfile {
  const snapshot = report.realEngine;
  const hasReliableBirthTime = hasReliableBirthTimeForProminence(report);

  if (!snapshot || snapshot.placements.length === 0) {
    return emptyProfile(hasReliableBirthTime);
  }

  const placements = snapshot.placements.filter((placement) =>
    MAJOR_PLANET_SET.has(placement.id),
  );
  const placementsById = new Map(
    placements.map((placement) => [placement.id, placement]),
  );
  const signature =
    snapshot.chartSignature ?? buildRealEngineChartSignature(snapshot.placements);
  const signCounts = countBy(placements, (placement) => placement.signId);
  const houseCounts = hasReliableBirthTime
    ? countBy(
        placements.filter(
          (placement): placement is RealEngineReportPlacement & {
            house: RealEngineReportHouseNumber;
          } => isHouseNumber(placement.house),
        ),
        (placement) => placement.house,
      )
    : new Map<RealEngineReportHouseNumber, number>();
  const retrogradeIds = new Set(
    snapshot.retrogrades?.status === "calculated"
      ? snapshot.retrogrades.planetIds
      : [],
  );
  const risingSign = hasReliableBirthTime
    ? snapshot.angles?.asc?.signId ?? null
    : null;
  const chartRulerId = risingSign ? CHART_RULER_BY_RISING[risingSign] : null;

  const aspectScores = (snapshot.aspects ?? []).map((aspect) =>
    scoreAspect(
      aspect,
      placementsById,
      chartRulerId,
      retrogradeIds,
      hasReliableBirthTime,
    ),
  );
  const planetScores = buildPlanetScores({
    placements,
    signCounts,
    houseCounts,
    aspectScores,
    chartRulerId,
    retrogradeIds,
    hasReliableBirthTime,
    angles: snapshot.angles,
    signature,
  });
  const houseScores = hasReliableBirthTime
    ? buildHouseScores({
        placements,
        chartRulerId,
        aspectScores,
      })
    : [];
  const axisScores = hasReliableBirthTime
    ? buildAxisScores(houseScores, houseCounts)
    : [];

  const dominantPlanet = selectDistinctLeader(planetScores, 50, 6, 3);
  const dominantHouse = selectDistinctLeader(houseScores, 38, 8, 2);
  const dominantAxis = selectDistinctLeader(axisScores, 54, 10, 2);
  const dominantAspectScore = selectDistinctAspectLeader(aspectScores);
  const dominantAspect = dominantAspectScore
    ? rankedAspectItem(dominantAspectScore)
    : null;
  const repeatedTheme = buildRepeatedTheme({
    signCounts,
    houseCounts,
    signature,
    hasReliableBirthTime,
  });
  const chartRuler = buildChartRulerItem(
    chartRulerId,
    placementsById.get(chartRulerId ?? ""),
    planetScores,
    hasReliableBirthTime,
  );
  const luminaryEmphasis = buildLuminaryEmphasis(planetScores);
  const hemisphere = hasReliableBirthTime
    ? buildHemisphereItem(placements)
    : null;
  const quadrant = hasReliableBirthTime
    ? buildQuadrantItem(placements)
    : null;
  const distribution = buildDistribution(
    placements,
    signCounts,
    houseCounts,
    hasReliableBirthTime,
  );
  const signatures = selectSignatures({
    dominantPlanet,
    dominantHouse,
    dominantAxis,
    dominantAspect,
    dominantAspectScore,
    repeatedTheme,
    luminaryEmphasis,
    hemisphere,
    quadrant,
    distribution,
    signature,
    hasReliableBirthTime,
  });

  return {
    version: CHART_PROMINENCE_VERSION,
    hasReliableBirthTime,
    dominantPlanet,
    dominantHouse,
    dominantAxis,
    dominantAspect,
    repeatedTheme,
    chartRuler,
    luminaryEmphasis,
    hemisphere,
    quadrant,
    distribution,
    signatures,
    chartSentence: buildChartSentence(signatures),
    excludedTimeDependentFactors: hasReliableBirthTime
      ? []
      : [...TIME_DEPENDENT_FACTORS],
  };
}

function buildPlanetScores(input: {
  placements: RealEngineReportPlacement[];
  signCounts: Map<ZodiacKey, number>;
  houseCounts: Map<RealEngineReportHouseNumber, number>;
  aspectScores: AspectScore[];
  chartRulerId: string | null;
  retrogradeIds: Set<string>;
  hasReliableBirthTime: boolean;
  angles: RealEngineReportAngles | undefined;
  signature: ReturnType<typeof buildRealEngineChartSignature>;
}): ScoredEntity[] {
  const output = new Map<string, ScoredEntity>(
    input.placements.map((placement) => [
      placement.id,
      {
        id: placement.id,
        label: PLANET_LABELS[placement.id] ?? placement.label,
        score: 0,
        evidence: [],
      },
    ]),
  );

  const add = (planetId: string, id: string, label: string, score: number) => {
    const entity = output.get(planetId);
    if (!entity || score <= 0) return;
    entity.score += score;
    entity.evidence.push({ id, label, score });
  };

  for (const placement of input.placements) {
    const label = PLANET_LABELS[placement.id] ?? placement.label;

    if (LUMINARY_SET.has(placement.id)) {
      add(placement.id, "luminary", `${label} یکی از دو چراغ اصلی چارت است`, 18);
    }
    if (input.chartRulerId === placement.id) {
      add(placement.id, "chart-ruler", `${label} حاکم طالع ثبت‌شده است`, 28);
    }

    const signCount = input.signCounts.get(placement.signId) ?? 0;
    if (signCount >= 3) {
      add(
        placement.id,
        "sign-repeat",
        `${formatNumber(signCount)} سیارهٔ اصلی در ${SIGN_LABELS[placement.signId]} قرار دارند`,
        (signCount - 2) * 7,
      );
    }
    if (
      input.signature.dominantElement &&
      SIGN_ELEMENT[placement.signId] === input.signature.dominantElement
    ) {
      add(
        placement.id,
        "element-repeat",
        `عنصر ${ELEMENT_LABELS[input.signature.dominantElement]} در چارت تکرار بیشتری دارد`,
        5,
      );
    }
    if (
      input.signature.dominantModality &&
      SIGN_MODALITY[placement.signId] === input.signature.dominantModality
    ) {
      add(
        placement.id,
        "modality-repeat",
        `کیفیت ${MODALITY_LABELS[input.signature.dominantModality]} در چارت تکرار بیشتری دارد`,
        4,
      );
    }
    if (input.retrogradeIds.has(placement.id)) {
      add(placement.id, "retrograde", `${label} با حرکت برگشتی ثبت شده است`, 7);
    }

    if (input.hasReliableBirthTime && isHouseNumber(placement.house)) {
      const houseCount = input.houseCounts.get(placement.house) ?? 0;
      if (ANGULAR_HOUSE_SET.has(placement.house)) {
        add(
          placement.id,
          "angular-house",
          `${label} در خانهٔ زاویه‌ای ${formatNumber(placement.house)} قرار دارد`,
          18,
        );
      }
      if (houseCount >= 2) {
        add(
          placement.id,
          "house-repeat",
          `${formatNumber(houseCount)} سیارهٔ اصلی در خانهٔ ${formatNumber(placement.house)} جمع شده‌اند`,
          (houseCount - 1) * 8,
        );
      }
      for (const angle of Object.values(input.angles ?? {})) {
        if (!angle) continue;
        const distance = angularDistance(placement.longitude, angle.longitude);
        if (distance <= 8) {
          add(
            placement.id,
            `angle-${angle.id}`,
            `${label} با فاصلهٔ ${formatNumber(distance)} درجه به ${angle.label} نزدیک است`,
            Math.max(4, Math.round((8 - distance) * 3)),
          );
        }
      }
    }
  }

  for (const item of input.aspectScores) {
    const participantScore = Math.max(4, Math.round(item.score * 0.24));
    for (const planetId of [
      item.aspect.firstPlanetId,
      item.aspect.secondPlanetId,
    ]) {
      add(
        planetId,
        `aspect-${item.aspect.id}`,
        `${PLANET_LABELS[planetId] ?? planetId} در ${formatAspectLabel(item.aspect)} حضور دارد`,
        participantScore,
      );
    }
  }

  return [...output.values()]
    .map(normalizeEntity)
    .sort(rankEntities);
}

function scoreAspect(
  aspect: RealEngineReportAspect,
  placementsById: Map<string, RealEngineReportPlacement>,
  chartRulerId: string | null,
  retrogradeIds: Set<string>,
  hasReliableBirthTime: boolean,
): AspectScore {
  const participants = [aspect.firstPlanetId, aspect.secondPlanetId];
  const allowedOrb = ASPECT_ORB_LIMITS[aspect.aspectId] ?? 8;
  const closeness = Math.max(0, 1 - aspect.orb / allowedOrb);
  const evidence = [`اورب ${formatNumber(aspect.orb)} درجه`];
  let score = closeness * 48;

  if (aspect.orb <= 1.5) {
    score += 18;
    evidence.push("این تماس بسیار نزدیک است");
  } else if (aspect.orb <= 2.5) {
    score += 8;
    evidence.push("این تماس نزدیک است");
  }

  const luminaryCount = participants.filter((id) => LUMINARY_SET.has(id)).length;
  if (luminaryCount > 0) {
    score += luminaryCount * 18;
    evidence.push("یکی از دو چراغ اصلی چارت در این تماس حضور دارد");
  }
  score += participants.filter((id) => PERSONAL_PLANET_SET.has(id)).length * 8;

  if (chartRulerId && participants.includes(chartRulerId)) {
    score += 20;
    evidence.push("حاکم چارت در این تماس حضور دارد");
  }
  if (DYNAMIC_ASPECTS.has(aspect.aspectId)) {
    score += 14;
    evidence.push("این تماس نیاز به تنظیم فعال‌تری دارد");
  } else if (aspect.aspectId === "conjunction") {
    score += 10;
    evidence.push("دو سیاره در یک نقطه متمرکز شده‌اند");
  } else {
    score += 5;
  }
  if (participants.some((id) => retrogradeIds.has(id))) {
    score += 6;
    evidence.push("یک سیارهٔ برگشتی در این تماس حضور دارد");
  }

  if (hasReliableBirthTime) {
    const angularHits = participants.filter((id) => {
      const house = placementsById.get(id)?.house;
      return isHouseNumber(house) && ANGULAR_HOUSE_SET.has(house);
    }).length;
    if (angularHits > 0) {
      score += angularHits * 7;
      evidence.push("این تماس به یک خانهٔ زاویه‌ای وصل است");
    }
  }

  return { aspect, score: roundScore(score), evidence };
}

function buildHouseScores(input: {
  placements: RealEngineReportPlacement[];
  chartRulerId: string | null;
  aspectScores: AspectScore[];
}): ScoredEntity[] {
  const output: ScoredEntity[] = [];

  for (let house = 1; house <= 12; house += 1) {
    if (!isHouseNumber(house)) continue;
    const placements = input.placements.filter(
      (placement) => placement.house === house,
    );
    if (placements.length === 0) continue;

    const evidence: ChartProminenceEvidence[] = [];
    let score = placements.length * 12;
    evidence.push({
      id: "placement-count",
      label: `${formatNumber(placements.length)} سیارهٔ اصلی در این خانه قرار دارند`,
      score: placements.length * 12,
    });

    const luminaries = placements.filter((placement) =>
      LUMINARY_SET.has(placement.id),
    );
    if (luminaries.length > 0) {
      const value = luminaries.length * 18;
      score += value;
      evidence.push({
        id: "luminary-house",
        label: `${luminaries.map((placement) => PLANET_LABELS[placement.id]).join(" و ")} در این خانه قرار دارد`,
        score: value,
      });
    }
    if (
      input.chartRulerId &&
      placements.some((placement) => placement.id === input.chartRulerId)
    ) {
      score += 24;
      evidence.push({ id: "chart-ruler-house", label: "حاکم چارت در این خانه قرار دارد", score: 24 });
    }
    if (ANGULAR_HOUSE_SET.has(house)) {
      score += 12;
      evidence.push({ id: "angular-house", label: "این خانه یکی از چهار خانهٔ زاویه‌ای چارت است", score: 12 });
    }

    const participantIds = new Set(placements.map((placement) => placement.id));
    const strongAspectHits = input.aspectScores.filter(
      (item) =>
        item.score >= 45 &&
        [item.aspect.firstPlanetId, item.aspect.secondPlanetId].some((id) =>
          participantIds.has(id),
        ),
    ).length;
    if (strongAspectHits > 0) {
      const value = Math.min(strongAspectHits, 3) * 8;
      score += value;
      evidence.push({
        id: "strong-aspects",
        label: `${formatNumber(Math.min(strongAspectHits, 3))} تماس پرامتیاز به سیاره‌های این خانه وصل است`,
        score: value,
      });
    }

    output.push(normalizeEntity({
      id: `house-${house}`,
      label: `خانهٔ ${formatNumber(house)}`,
      score,
      evidence,
    }));
  }

  return output.sort(rankEntities);
}

function buildAxisScores(
  houseScores: ScoredEntity[],
  houseCounts: Map<RealEngineReportHouseNumber, number>,
): ScoredEntity[] {
  const byHouse = new Map(
    houseScores.map((item) => [Number(item.id.replace("house-", "")), item]),
  );

  return AXIS_SPECS.map((axis) => {
    const [firstHouse, secondHouse] = axis.houses;
    const first = byHouse.get(firstHouse);
    const second = byHouse.get(secondHouse);
    const count =
      (houseCounts.get(firstHouse as RealEngineReportHouseNumber) ?? 0) +
      (houseCounts.get(secondHouse as RealEngineReportHouseNumber) ?? 0);
    return normalizeEntity({
      id: axis.id,
      label: axis.label,
      score: (first?.score ?? 0) + (second?.score ?? 0) + count * 5,
      evidence: [
        {
          id: "axis-placement-count",
          label: `${formatNumber(count)} سیارهٔ اصلی روی دو سوی این محور قرار دارند`,
          score: count * 5,
        },
        ...(first ? [{ id: first.id, label: `${first.label} برجستگی مستقل دارد`, score: first.score }] : []),
        ...(second ? [{ id: second.id, label: `${second.label} برجستگی مستقل دارد`, score: second.score }] : []),
      ],
    });
  }).sort(rankEntities);
}

function buildRepeatedTheme(input: {
  signCounts: Map<ZodiacKey, number>;
  houseCounts: Map<RealEngineReportHouseNumber, number>;
  signature: ReturnType<typeof buildRealEngineChartSignature>;
  hasReliableBirthTime: boolean;
}): ChartProminenceRankedItem | null {
  const candidates: ScoredEntity[] = [];

  for (const [signId, count] of input.signCounts) {
    if (count < 3) continue;
    candidates.push({
      id: `sign-${signId}`,
      label: `تکرار برج ${SIGN_LABELS[signId]}`,
      score: 30 + count * 10,
      evidence: [{
        id: "sign-count",
        label: `${formatNumber(count)} سیارهٔ اصلی در ${SIGN_LABELS[signId]} قرار دارند`,
        score: 30 + count * 10,
      }],
    });
  }

  if (input.hasReliableBirthTime) {
    for (const [house, count] of input.houseCounts) {
      if (count < 3) continue;
      candidates.push({
        id: `house-cluster-${house}`,
        label: `تمرکز در خانهٔ ${formatNumber(house)}`,
        score: 34 + count * 10,
        evidence: [{
          id: "house-count",
          label: `${formatNumber(count)} سیارهٔ اصلی در خانهٔ ${formatNumber(house)} قرار دارند`,
          score: 34 + count * 10,
        }],
      });
    }
  }

  const [topElement, secondElement] = rankedCounts(input.signature.elementCounts);
  if (topElement && topElement[1] >= 4 && topElement[1] - (secondElement?.[1] ?? 0) >= 2) {
    candidates.push({
      id: `element-${topElement[0]}`,
      label: `تکرار عنصر ${ELEMENT_LABELS[topElement[0]]}`,
      score: 28 + topElement[1] * 8,
      evidence: [{
        id: "element-count",
        label: `${formatNumber(topElement[1])} سیارهٔ اصلی در برج‌های عنصر ${ELEMENT_LABELS[topElement[0]]} قرار دارند`,
        score: 28 + topElement[1] * 8,
      }],
    });
  }

  const [topModality, secondModality] = rankedCounts(input.signature.modalityCounts);
  if (topModality && topModality[1] >= 5 && topModality[1] - (secondModality?.[1] ?? 0) >= 2) {
    candidates.push({
      id: `modality-${topModality[0]}`,
      label: `تکرار کیفیت ${MODALITY_LABELS[topModality[0]]}`,
      score: 24 + topModality[1] * 7,
      evidence: [{
        id: "modality-count",
        label: `${formatNumber(topModality[1])} سیارهٔ اصلی در برج‌های ${MODALITY_LABELS[topModality[0]]} قرار دارند`,
        score: 24 + topModality[1] * 7,
      }],
    });
  }

  return candidates.sort(rankEntities)[0] ?? null;
}

function buildChartRulerItem(
  chartRulerId: string | null,
  placement: RealEngineReportPlacement | undefined,
  planetScores: ScoredEntity[],
  hasReliableBirthTime: boolean,
): ChartProminenceRankedItem | null {
  if (!hasReliableBirthTime || !chartRulerId || !placement) return null;
  const planet = planetScores.find((item) => item.id === chartRulerId);
  return {
    id: chartRulerId,
    label: PLANET_LABELS[chartRulerId] ?? placement.label,
    score: planet?.score ?? 28,
    evidence: [
      { id: "chart-ruler", label: `${PLANET_LABELS[chartRulerId] ?? placement.label} حاکم طالع ثبت‌شده است`, score: 28 },
      ...(isHouseNumber(placement.house)
        ? [{ id: "chart-ruler-house", label: `حاکم چارت در خانهٔ ${formatNumber(placement.house)} قرار دارد`, score: 12 }]
        : []),
    ],
  };
}

function buildLuminaryEmphasis(
  planetScores: ScoredEntity[],
): ChartProminenceRankedItem | null {
  const sun = planetScores.find((item) => item.id === "sun");
  const moon = planetScores.find((item) => item.id === "moon");
  if (!sun || !moon) return null;

  const difference = Math.abs(sun.score - moon.score);
  if (sun.score >= 45 && moon.score >= 45 && difference <= 8) {
    return {
      id: "luminaries-balanced",
      label: "تأکید هم‌زمان خورشید و ماه",
      score: roundScore((sun.score + moon.score) / 2),
      evidence: [
        { id: "sun", label: "خورشید چند عامل برجستگی هم‌زمان دارد", score: sun.score },
        { id: "moon", label: "ماه چند عامل برجستگی هم‌زمان دارد", score: moon.score },
      ],
    };
  }

  const leader = sun.score > moon.score ? sun : moon;
  const follower = leader.id === "sun" ? moon : sun;
  if (leader.score >= 52 && leader.score - follower.score >= 9) {
    return {
      id: `luminary-${leader.id}`,
      label: `تأکید بیشتر ${leader.label}`,
      score: leader.score,
      evidence: leader.evidence.slice(0, 3),
    };
  }
  return null;
}

function buildHemisphereItem(
  placements: RealEngineReportPlacement[],
): ChartProminenceRankedItem | null {
  const houses = placements.map((placement) => placement.house).filter(isHouseNumber);
  if (houses.length < 6) return null;

  const east = houses.filter((house) => [10, 11, 12, 1, 2, 3].includes(house)).length;
  const north = houses.filter((house) => house <= 6).length;
  const candidates = [
    { id: "east", label: "نیم‌کرهٔ شرقی؛ آغاز از خود", count: east, other: houses.length - east },
    { id: "west", label: "نیم‌کرهٔ غربی؛ شکل‌گیری در رابطه", count: houses.length - east, other: east },
    { id: "north", label: "نیم‌کرهٔ شمالی؛ رشد درونی و خصوصی", count: north, other: houses.length - north },
    { id: "south", label: "نیم‌کرهٔ جنوبی؛ حضور بیرونی و اجتماعی", count: houses.length - north, other: north },
  ].filter((item) => item.count >= 6 && item.count - item.other >= 2);
  const leader = candidates.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))[0];
  return leader
    ? {
        id: `hemisphere-${leader.id}`,
        label: leader.label,
        score: leader.count * 9,
        evidence: [{
          id: "placement-count",
          label: `${formatNumber(leader.count)} از ${formatNumber(houses.length)} سیارهٔ اصلی در این نیم‌کره قرار دارند`,
          score: leader.count * 9,
        }],
      }
    : null;
}

function buildQuadrantItem(
  placements: RealEngineReportPlacement[],
): ChartProminenceRankedItem | null {
  const counts = [0, 0, 0, 0];
  for (const placement of placements) {
    if (isHouseNumber(placement.house)) {
      counts[Math.floor((placement.house - 1) / 3)] += 1;
    }
  }
  const [first, second] = counts
    .map((count, index) => ({ count, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index);
  if (!first || first.count < 4 || first.count - (second?.count ?? 0) < 2) {
    return null;
  }
  const labels = [
    "ربع اول؛ ساختن هویت و منابع شخصی",
    "ربع دوم؛ ریشه، بیان و مهارت روزمره",
    "ربع سوم؛ رابطه، اعتماد و معنا",
    "ربع چهارم؛ نقش اجتماعی، جمع و خلوت",
  ];
  return {
    id: `quadrant-${first.index + 1}`,
    label: labels[first.index],
    score: first.count * 10,
    evidence: [{
      id: "placement-count",
      label: `${formatNumber(first.count)} سیارهٔ اصلی در این ربع قرار دارند`,
      score: first.count * 10,
    }],
  };
}

function buildDistribution(
  placements: RealEngineReportPlacement[],
  signCounts: Map<ZodiacKey, number>,
  houseCounts: Map<RealEngineReportHouseNumber, number>,
  hasReliableBirthTime: boolean,
): ChartProminenceDistribution {
  const counts = hasReliableBirthTime
    ? [...houseCounts.values()]
    : [...signCounts.values()];
  if (placements.length === 0 || counts.length === 0) return "unavailable";
  const ranked = [...counts].sort((a, b) => b - a);
  const maximum = ranked[0] ?? 0;
  const topThree = ranked.slice(0, 3).reduce((total, count) => total + count, 0);
  if (maximum >= 4 || topThree >= 7) return "concentrated";
  if (counts.length >= 8 && maximum <= 2) return "distributed";
  return "mixed";
}

function selectSignatures(input: {
  dominantPlanet: ChartProminenceRankedItem | null;
  dominantHouse: ChartProminenceRankedItem | null;
  dominantAxis: ChartProminenceRankedItem | null;
  dominantAspect: ChartProminenceRankedItem | null;
  dominantAspectScore: AspectScore | null;
  repeatedTheme: ChartProminenceRankedItem | null;
  luminaryEmphasis: ChartProminenceRankedItem | null;
  hemisphere: ChartProminenceRankedItem | null;
  quadrant: ChartProminenceRankedItem | null;
  distribution: ChartProminenceDistribution;
  signature: ReturnType<typeof buildRealEngineChartSignature>;
  hasReliableBirthTime: boolean;
}): ChartProminenceSignature[] {
  const candidates: ChartProminenceSignature[] = [];

  if (input.dominantPlanet) {
    candidates.push({
      id: `planet-${input.dominantPlanet.id}`,
      kind: "planet",
      title: `مرکز ثقل سیاره‌ای: ${input.dominantPlanet.label}`,
      summary: `${input.dominantPlanet.label} فقط به‌دلیل حضور در چارت انتخاب نشده؛ چند عامل مستقل هم‌زمان آن را پررنگ کرده‌اند.`,
      evidence: evidenceLabels(input.dominantPlanet),
      score: input.dominantPlanet.score,
      destination: getPlanetDestination(input.dominantPlanet.id),
    });
  }
  if (input.dominantHouse && input.hasReliableBirthTime) {
    const house = Number(input.dominantHouse.id.replace("house-", ""));
    candidates.push({
      id: input.dominantHouse.id,
      kind: "house",
      title: `میدان پررنگ زندگی: ${input.dominantHouse.label}`,
      summary: HOUSE_FIELDS[house] ?? "این میدان زندگی چند نشانهٔ مستقل را در خود جمع کرده است.",
      evidence: evidenceLabels(input.dominantHouse),
      score: input.dominantHouse.score,
      destination: getHouseDestination(house),
    });
  }
  if (input.dominantAxis && input.hasReliableBirthTime) {
    const axis = AXIS_SPECS.find((item) => item.id === input.dominantAxis?.id);
    candidates.push({
      id: input.dominantAxis.id,
      kind: "axis",
      title: input.dominantAxis.label,
      summary: "دو میدان روبه‌روی هم در این چارت هم‌زمان وزن گرفته‌اند و بهتر است به‌صورت یک محور خوانده شوند.",
      evidence: evidenceLabels(input.dominantAxis),
      score: input.dominantAxis.score * 0.72,
      destination: axis?.destination ?? "growth-path",
    });
  }
  if (input.dominantAspect && input.dominantAspectScore) {
    candidates.push({
      id: `aspect-${input.dominantAspect.id}`,
      kind: "aspect",
      title: `تماس برجسته: ${input.dominantAspect.label}`,
      summary: "نزدیکی زاویه و نقش سیاره‌های درگیر باعث شده این تماس در رتبه‌بندی بالاتر بایستد.",
      evidence: input.dominantAspectScore.evidence.slice(0, 3),
      score: input.dominantAspect.score,
      destination: getAspectDestination(input.dominantAspectScore.aspect),
    });
  }
  if (input.repeatedTheme) {
    candidates.push({
      id: input.repeatedTheme.id,
      kind: "theme",
      title: input.repeatedTheme.label,
      summary: "این موضوع از یک جایگاه تنها نیامده و در چند بخش مستقل چارت تکرار شده است.",
      evidence: evidenceLabels(input.repeatedTheme),
      score: input.repeatedTheme.score,
      destination: getThemeDestination(input.repeatedTheme.id),
    });
  }
  if (input.luminaryEmphasis) {
    candidates.push({
      id: input.luminaryEmphasis.id,
      kind: "luminary",
      title: input.luminaryEmphasis.label,
      summary: "وزن خورشید و ماه از مجموع جایگاه، تماس‌ها و نقش آن‌ها در ساختار چارت به‌دست آمده است.",
      evidence: evidenceLabels(input.luminaryEmphasis),
      score: input.luminaryEmphasis.score * 0.9,
      destination: input.luminaryEmphasis.id === "luminary-sun" ? "overview" : "inner-world",
    });
  }
  if (input.hemisphere && input.hasReliableBirthTime) {
    candidates.push({
      id: input.hemisphere.id,
      kind: "hemisphere",
      title: input.hemisphere.label,
      summary: "پخش سیاره‌های اصلی در دو نیمهٔ چارت یک جهت‌گیری روشن‌تر از حد تصادف ساخته است.",
      evidence: evidenceLabels(input.hemisphere),
      score: input.hemisphere.score * 0.72,
      destination: input.hemisphere.id.includes("west") ? "relationships" : "overview",
    });
  }
  if (input.quadrant && input.hasReliableBirthTime) {
    candidates.push({
      id: input.quadrant.id,
      kind: "quadrant",
      title: input.quadrant.label,
      summary: "چند سیارهٔ اصلی در یک ربع جمع شده‌اند و یک مرحلهٔ رشدی را پررنگ‌تر کرده‌اند.",
      evidence: evidenceLabels(input.quadrant),
      score: input.quadrant.score * 0.72,
      destination: "growth-path",
    });
  }

  const dominantElement = input.signature.dominantElement;
  if (dominantElement && !candidates.some((item) => item.id === `element-${dominantElement}`)) {
    const count = input.signature.elementCounts[dominantElement];
    candidates.push({
      id: `element-${dominantElement}`,
      kind: "theme",
      title: `ریتم تکرارشونده: ${ELEMENT_LABELS[dominantElement]}`,
      summary: "این ریتم از تکرار چند سیارهٔ اصلی در برج‌های هم‌عنصر به‌دست آمده است.",
      evidence: [`${formatNumber(count)} سیارهٔ اصلی در برج‌های عنصر ${ELEMENT_LABELS[dominantElement]} قرار دارند`],
      score: 24 + count * 6,
      destination: "overview",
    });
  }

  if (input.distribution !== "unavailable") {
    const copy = {
      concentrated: ["چارت متمرکز", "بخش بزرگی از انرژی چارت در چند برج یا خانهٔ محدود جمع شده است."],
      mixed: ["تمرکز و پراکندگی متعادل", "چارت هم چند نقطهٔ تجمع دارد و هم میان میدان‌های مختلف پخش شده است."],
      distributed: ["چارت پراکنده و چندمیدانی", "سیاره‌های اصلی میان برج‌ها یا خانه‌های بیشتری پخش شده‌اند."],
    }[input.distribution];
    candidates.push({
      id: `distribution-${input.distribution}`,
      kind: "distribution",
      title: copy[0],
      summary: copy[1],
      evidence: [input.hasReliableBirthTime
        ? "الگوی پخش سیاره‌ها در دوازده خانه بررسی شده است"
        : "الگوی پخش سیاره‌ها فقط در برج‌ها و بدون استفاده از خانه‌ها بررسی شده است"],
      score: input.distribution === "mixed" ? 28 : 36,
      destination: "deeper-layers",
    });
  }

  const selected: ChartProminenceSignature[] = [];
  const kinds = new Set<ChartProminenceSignatureKind>();
  for (const candidate of candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))) {
    if (kinds.has(candidate.kind)) continue;
    selected.push({ ...candidate, score: roundScore(candidate.score) });
    kinds.add(candidate.kind);
    if (selected.length === 3) break;
  }
  return selected;
}

function buildChartSentence(signatures: ChartProminenceSignature[]): string {
  const labels = signatures.slice(0, 3).map((signature) =>
    signature.title
      .replace(/^مرکز ثقل سیاره‌ای:\s*/u, "")
      .replace(/^میدان پررنگ زندگی:\s*/u, "")
      .replace(/^تماس برجسته:\s*/u, ""),
  );
  if (labels.length === 0) {
    return "این چارت بدون شواهد کافی، یک ویژگی را به‌عنوان امضای اصلی اعلام نمی‌کند.";
  }
  if (labels.length === 1) return `امضای کلی این چارت بیشتر حول ${labels[0]} شکل می‌گیرد.`;
  if (labels.length === 2) return `امضای کلی این چارت از کنار هم قرار گرفتن ${labels[0]} و ${labels[1]} شکل می‌گیرد.`;
  return `امضای کلی این چارت از کنار هم قرار گرفتن ${labels[0]}، ${labels[1]} و ${labels[2]} شکل می‌گیرد.`;
}

function selectDistinctLeader(
  items: ScoredEntity[],
  minimumScore: number,
  minimumGap: number,
  minimumEvidence: number,
): ChartProminenceRankedItem | null {
  const [first, second] = [...items].sort(rankEntities);
  if (
    !first ||
    first.score < minimumScore ||
    first.score - (second?.score ?? 0) < minimumGap ||
    new Set(first.evidence.map((item) => item.id)).size < minimumEvidence
  ) {
    return null;
  }
  return first;
}

function selectDistinctAspectLeader(aspects: AspectScore[]): AspectScore | null {
  const [first, second] = [...aspects].sort((a, b) =>
    b.score - a.score || a.aspect.orb - b.aspect.orb || a.aspect.id.localeCompare(b.aspect.id),
  );
  return first && first.score >= 44 && first.score - (second?.score ?? 0) >= 5
    ? first
    : null;
}

function rankedAspectItem(item: AspectScore): ChartProminenceRankedItem {
  return {
    id: item.aspect.id,
    label: formatAspectLabel(item.aspect),
    score: item.score,
    evidence: item.evidence.map((label, index) => ({
      id: `aspect-${index + 1}`,
      label,
      score: 0,
    })),
  };
}

function evidenceLabels(item: ChartProminenceRankedItem): string[] {
  return item.evidence.slice(0, 3).map((evidence) => evidence.label);
}

function getPlanetDestination(planetId: string): HumanFirstReadingSectionId {
  if (planetId === "moon") return "inner-world";
  if (planetId === "mercury") return "mind-language";
  if (planetId === "venus") return "relationships";
  if (planetId === "mars") return "drive-direction";
  if (planetId === "saturn" || planetId === "jupiter") return "growth-path";
  if (["uranus", "neptune", "pluto"].includes(planetId)) return "deeper-layers";
  return "overview";
}

function getHouseDestination(house: number): HumanFirstReadingSectionId {
  if (house === 3) return "mind-language";
  if ([4, 12].includes(house)) return "inner-world";
  if ([5, 7, 8, 11].includes(house)) return "relationships";
  if ([6, 9].includes(house)) return "growth-path";
  if (house === 2) return "strength-challenge";
  if (house === 10) return "drive-direction";
  return "overview";
}

function getAspectDestination(aspect: RealEngineReportAspect): HumanFirstReadingSectionId {
  const participants = new Set([aspect.firstPlanetId, aspect.secondPlanetId]);
  if (participants.has("moon")) return "inner-world";
  if (participants.has("mercury")) return "mind-language";
  if (participants.has("venus")) return "relationships";
  if (participants.has("mars")) return "friction-repair";
  return "primary-patterns";
}

function getThemeDestination(themeId: string): HumanFirstReadingSectionId {
  return themeId.startsWith("house-cluster-")
    ? getHouseDestination(Number(themeId.replace("house-cluster-", "")))
    : "overview";
}

function hasReliableBirthTimeForProminence(report: AstrologyReport): boolean {
  if (report.input.birthTimeAccuracy === "unknown") return false;
  const value = report.input.birthTime?.trim().toLocaleLowerCase("fa-IR") ?? "";
  return Boolean(value) && !["unknown", "نامشخص", "--:--", "00:00?"].includes(value);
}

function emptyProfile(hasReliableBirthTime: boolean): ChartProminenceProfile {
  return {
    version: CHART_PROMINENCE_VERSION,
    hasReliableBirthTime,
    dominantPlanet: null,
    dominantHouse: null,
    dominantAxis: null,
    dominantAspect: null,
    repeatedTheme: null,
    chartRuler: null,
    luminaryEmphasis: null,
    hemisphere: null,
    quadrant: null,
    distribution: "unavailable",
    signatures: [],
    chartSentence: "این چارت بدون شواهد کافی، یک ویژگی را به‌عنوان امضای اصلی اعلام نمی‌کند.",
    excludedTimeDependentFactors: hasReliableBirthTime ? [] : [...TIME_DEPENDENT_FACTORS],
  };
}

function countBy<T, Key>(items: T[], selectKey: (item: T) => Key): Map<Key, number> {
  const counts = new Map<Key, number>();
  for (const item of items) {
    const key = selectKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function rankedCounts<Key extends string>(counts: Record<Key, number>): Array<[Key, number]> {
  return (Object.entries(counts) as Array<[Key, number]>).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

function normalizeEntity(entity: ScoredEntity): ScoredEntity {
  return {
    ...entity,
    score: roundScore(entity.score),
    evidence: [...entity.evidence].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)),
  };
}

function rankEntities(a: ScoredEntity, b: ScoredEntity): number {
  return b.score - a.score || a.id.localeCompare(b.id);
}

function isHouseNumber(value: number | null | undefined): value is RealEngineReportHouseNumber {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
}

function angularDistance(first: number, second: number): number {
  const distance = Math.abs(((first - second + 540) % 360) - 180);
  return Number.isFinite(distance) ? distance : 180;
}

function formatAspectLabel(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}
