import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportAspectKind,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";
import type { HumanFirstReadingSectionId } from "@/types/human-first-reading";
import type {
  ChartProminenceProfile,
  ChartProminenceSignature,
  ChartProminenceSignatureKind,
} from "@/lib/astrology/chart-prominence";

export const CHART_PATTERN_VERSION = "chart-patterns-v1" as const;

export type ChartPatternKind =
  | "sign-stellium"
  | "house-stellium"
  | "t-square"
  | "grand-trine"
  | "grand-cross";

export type ChartPattern = {
  id: string;
  kind: ChartPatternKind;
  title: string;
  summary: string;
  technicalSummary: string;
  score: number;
  participantIds: string[];
  participantLabels: string[];
  aspectIds: string[];
  evidence: string[];
  destination: HumanFirstReadingSectionId;
  signId?: ZodiacKey;
  house?: RealEngineReportHouseNumber;
};

export type ChartPatternProfile = {
  version: typeof CHART_PATTERN_VERSION;
  hasReliableBirthTime: boolean;
  patterns: ChartPattern[];
  primaryPattern: ChartPattern | null;
  excludedTimeDependentPatterns: string[];
};

type PairMatch = {
  first: RealEngineReportPlacement;
  second: RealEngineReportPlacement;
  kind: "square" | "trine" | "opposition";
  separation: number;
  orb: number;
  aspectId: string | null;
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

const HOUSE_FIELDS: Record<RealEngineReportHouseNumber, string> = {
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

const ASPECT_LIMITS = {
  square: 6,
  trine: 6,
  opposition: 8,
} as const;

const PATTERN_KIND_ORDER: Record<ChartPatternKind, number> = {
  "grand-cross": 0,
  "t-square": 1,
  "grand-trine": 2,
  "house-stellium": 3,
  "sign-stellium": 4,
};

export function buildChartPatternProfile(
  report: AstrologyReport,
): ChartPatternProfile {
  const hasReliableBirthTime = hasReliableBirthTimeForPatterns(report);
  const snapshot = report.realEngine;
  if (!snapshot || snapshot.placements.length === 0) {
    return emptyPatternProfile(hasReliableBirthTime);
  }

  const placements = snapshot.placements
    .filter((placement) => MAJOR_PLANET_SET.has(placement.id))
    .slice()
    .sort(comparePlacements);
  const aspects = snapshot.aspects ?? [];
  const grandCrosses = detectGrandCrosses(placements, aspects);
  const grandCrossSets = grandCrosses.map(
    (pattern) => new Set(pattern.participantIds),
  );
  const tSquares = detectTSquares(placements, aspects).filter(
    (pattern) =>
      !grandCrossSets.some((participants) =>
        pattern.participantIds.every((id) => participants.has(id)),
      ),
  );
  const patterns = [
    ...grandCrosses,
    ...tSquares,
    ...detectGrandTrines(placements, aspects),
    ...detectSignStelliums(placements, aspects),
    ...(hasReliableBirthTime ? detectHouseStelliums(placements, aspects) : []),
  ]
    .filter(
      (pattern, index, collection) =>
        collection.findIndex((candidate) => candidate.id === pattern.id) === index,
    )
    .sort(comparePatterns);

  return {
    version: CHART_PATTERN_VERSION,
    hasReliableBirthTime,
    patterns,
    primaryPattern: patterns[0] ?? null,
    excludedTimeDependentPatterns: hasReliableBirthTime
      ? []
      : ["استلیوم در خانه"],
  };
}

export function mergeChartPatternsIntoProminence(
  prominence: ChartProminenceProfile,
  profile: ChartPatternProfile,
): ChartProminenceProfile {
  const candidates: ChartProminenceSignature[] = [
    ...prominence.signatures,
    ...profile.patterns.map(patternToSignature),
  ].sort((first, second) =>
    second.score - first.score || first.id.localeCompare(second.id),
  );
  const selected: ChartProminenceSignature[] = [];
  const kinds = new Set<ChartProminenceSignatureKind>();

  for (const candidate of candidates) {
    if (kinds.has(candidate.kind)) continue;
    selected.push(candidate);
    kinds.add(candidate.kind);
    if (selected.length === 3) break;
  }

  return {
    ...prominence,
    signatures: selected,
    chartSentence: buildMergedChartSentence(selected),
  };
}

function detectSignStelliums(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
): ChartPattern[] {
  const bySign = groupBy(placements, (placement) => placement.signId);
  return Array.from(bySign.entries()).flatMap(([signId, members]) => {
    if (members.length < 3) return [];
    const participants = members.slice().sort(comparePlacements);
    const labels = participants.map(getPlanetLabel);
    const personalCount = participants.filter((item) =>
      PERSONAL_PLANET_SET.has(item.id),
    ).length;
    const luminaryCount = participants.filter((item) =>
      LUMINARY_SET.has(item.id),
    ).length;
    const score = roundScore(
      72 +
        (participants.length - 3) * 14 +
        personalCount * 5 +
        luminaryCount * 7,
    );
    const signLabel = SIGN_LABELS[signId];
    return [{
      id: `pattern-sign-stellium-${signId}-${participantKey(participants)}`,
      kind: "sign-stellium",
      title: `استلیوم در برج ${signLabel}`,
      summary: `${formatNumber(participants.length)} سیارهٔ اصلی در برج ${signLabel} جمع شده‌اند؛ بنابراین این ریتم از یک جایگاه تنها نمی‌آید و چند بخش شخصیت را هم‌زمان رنگ می‌زند.`,
      technicalSummary: `${labels.join("، ")} همگی در برج ${signLabel} قرار دارند. این تشخیص از شمارش جایگاه‌های واقعی همان گزارش ساخته شده است.`,
      score,
      participantIds: participants.map((item) => item.id),
      participantLabels: labels,
      aspectIds: findInternalAspectIds(participants, aspects),
      evidence: [
        `${formatNumber(participants.length)} سیارهٔ اصلی در برج ${signLabel}`,
        personalCount > 0
          ? `${formatNumber(personalCount)} سیارهٔ شخصی در این تجمع حضور دارند`
          : "این تجمع از سیاره‌های اجتماعی یا نسلی ساخته شده است",
        labels.join("، "),
      ],
      destination: "primary-patterns",
      signId,
    }];
  });
}

function detectHouseStelliums(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
): ChartPattern[] {
  const withHouse = placements.filter(
    (placement): placement is RealEngineReportPlacement & {
      house: RealEngineReportHouseNumber;
    } => isHouseNumber(placement.house),
  );
  const byHouse = groupBy(withHouse, (placement) => placement.house);
  return Array.from(byHouse.entries()).flatMap(([house, members]) => {
    if (members.length < 3) return [];
    const participants = members.slice().sort(comparePlacements);
    const labels = participants.map(getPlanetLabel);
    const personalCount = participants.filter((item) =>
      PERSONAL_PLANET_SET.has(item.id),
    ).length;
    const luminaryCount = participants.filter((item) =>
      LUMINARY_SET.has(item.id),
    ).length;
    const score = roundScore(
      76 +
        (participants.length - 3) * 15 +
        personalCount * 5 +
        luminaryCount * 7,
    );
    return [{
      id: `pattern-house-stellium-${house}-${participantKey(participants)}`,
      kind: "house-stellium",
      title: `استلیوم در خانه ${formatNumber(house)}`,
      summary: `بخش بزرگی از نیروی چارت در میدان ${HOUSE_FIELDS[house]} متمرکز شده است؛ چند سیارهٔ اصلی این خانه را به یک موضوع تکرارشونده تبدیل کرده‌اند.`,
      technicalSummary: `${labels.join("، ")} در خانه ${formatNumber(house)} قرار دارند. این الگو فقط با ساعت تولد معتبر وارد گزارش می‌شود.`,
      score,
      participantIds: participants.map((item) => item.id),
      participantLabels: labels,
      aspectIds: findInternalAspectIds(participants, aspects),
      evidence: [
        `${formatNumber(participants.length)} سیارهٔ اصلی در خانه ${formatNumber(house)}`,
        `میدان زندگی: ${HOUSE_FIELDS[house]}`,
        labels.join("، "),
      ],
      destination: getHouseDestination(house),
      house,
    }];
  });
}

function detectTSquares(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
): ChartPattern[] {
  return combinations(placements, 3).flatMap((members) => {
    const candidates = members.flatMap((apex) => {
      const base = members.filter((item) => item.id !== apex.id);
      const opposition = matchPair(base[0], base[1], "opposition", aspects);
      const firstSquare = matchPair(apex, base[0], "square", aspects);
      const secondSquare = matchPair(apex, base[1], "square", aspects);
      return opposition && firstSquare && secondSquare
        ? [{ apex, base, matches: [opposition, firstSquare, secondSquare] }]
        : [];
    });
    const selected = candidates.sort((first, second) =>
      totalOrb(first.matches) - totalOrb(second.matches) ||
      first.apex.id.localeCompare(second.apex.id),
    )[0];
    if (!selected) return [];
    const participants = members.slice().sort(comparePlacements);
    const labels = participants.map(getPlanetLabel);
    const apexLabel = getPlanetLabel(selected.apex);
    const score = scoreGeometricPattern(92, participants, selected.matches);
    return [{
      id: `pattern-t-square-${participantKey(participants)}-apex-${selected.apex.id}`,
      kind: "t-square",
      title: `T-square با نقطهٔ مرکزی ${apexLabel}`,
      summary: `دو قطب روبه‌رو با دو مربع به ${apexLabel} وصل شده‌اند؛ این سه تماس یک چرخهٔ واحد می‌سازند و فشارشان بیشتر در شیوهٔ عمل‌کردن این سیاره جمع می‌شود.`,
      technicalSummary: `${getPlanetLabel(selected.base[0])} و ${getPlanetLabel(selected.base[1])} در مقابله‌اند و ${apexLabel} با هر دو مربع دارد.`,
      score,
      participantIds: participants.map((item) => item.id),
      participantLabels: labels,
      aspectIds: selected.matches.flatMap((match) =>
        match.aspectId ? [match.aspectId] : [],
      ),
      evidence: selected.matches.map(formatPairEvidence),
      destination: "friction-repair",
    }];
  });
}

function detectGrandTrines(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
): ChartPattern[] {
  return combinations(placements, 3).flatMap((members) => {
    const matches = pairCombinations(members).map(([first, second]) =>
      matchPair(first, second, "trine", aspects),
    );
    if (matches.some((match) => !match)) return [];
    const confirmed = matches.filter((match): match is PairMatch => Boolean(match));
    const participants = members.slice().sort(comparePlacements);
    const labels = participants.map(getPlanetLabel);
    return [{
      id: `pattern-grand-trine-${participantKey(participants)}`,
      kind: "grand-trine",
      title: `مثلث بزرگ میان ${labels.join("، ")}`,
      summary: "سه جریان هماهنگ به هم وصل شده‌اند و یک مدار نسبتاً روان می‌سازند؛ ارزش این الگو وقتی بیشتر دیده می‌شود که توان طبیعی آن آگاهانه به عمل تبدیل شود.",
      technicalSummary: "هر سه جفت سیاره با زاویهٔ تثلیث و در محدودهٔ اورب تعریف‌شده به هم متصل‌اند.",
      score: scoreGeometricPattern(86, participants, confirmed),
      participantIds: participants.map((item) => item.id),
      participantLabels: labels,
      aspectIds: confirmed.flatMap((match) =>
        match.aspectId ? [match.aspectId] : [],
      ),
      evidence: confirmed.map(formatPairEvidence),
      destination: "primary-patterns",
    }];
  });
}

function detectGrandCrosses(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
): ChartPattern[] {
  return combinations(placements, 4).flatMap((members) => {
    const pairMatches = pairCombinations(members).map(([first, second]) => {
      const opposition = matchPair(first, second, "opposition", aspects);
      if (opposition) return opposition;
      return matchPair(first, second, "square", aspects);
    });
    if (pairMatches.some((match) => !match)) return [];
    const confirmed = pairMatches.filter((match): match is PairMatch => Boolean(match));
    const oppositionCount = confirmed.filter(
      (match) => match.kind === "opposition",
    ).length;
    const squareCount = confirmed.filter((match) => match.kind === "square").length;
    if (oppositionCount !== 2 || squareCount !== 4) return [];
    const participants = members.slice().sort(comparePlacements);
    const labels = participants.map(getPlanetLabel);
    return [{
      id: `pattern-grand-cross-${participantKey(participants)}`,
      kind: "grand-cross",
      title: `صلیب بزرگ میان ${labels.join("، ")}`,
      summary: "دو مقابله و چهار مربع یک شبکهٔ واحد ساخته‌اند؛ فشار این الگو میان چهار نقطه پخش می‌شود و با حذف یکی از آن‌ها توضیح کامل نمی‌شود.",
      technicalSummary: "چهار سیاره دو جفت مقابله و چهار اتصال مربعی می‌سازند؛ T-squareهای درون این ساختار جداگانه گزارش نمی‌شوند.",
      score: scoreGeometricPattern(112, participants, confirmed),
      participantIds: participants.map((item) => item.id),
      participantLabels: labels,
      aspectIds: confirmed.flatMap((match) =>
        match.aspectId ? [match.aspectId] : [],
      ),
      evidence: confirmed.map(formatPairEvidence),
      destination: "friction-repair",
    }];
  });
}

function matchPair(
  first: RealEngineReportPlacement,
  second: RealEngineReportPlacement,
  kind: PairMatch["kind"],
  aspects: RealEngineReportAspect[],
): PairMatch | null {
  const separation = calculateAngularSeparation(
    first.longitude,
    second.longitude,
  );
  const target = kind === "square" ? 90 : kind === "trine" ? 120 : 180;
  const orb = Math.abs(separation - target);
  if (orb > ASPECT_LIMITS[kind]) return null;
  const aspectId = findStoredAspectId(first.id, second.id, kind, aspects);
  return { first, second, kind, separation, orb, aspectId };
}

function findStoredAspectId(
  firstId: string,
  secondId: string,
  kind: RealEngineReportAspectKind,
  aspects: RealEngineReportAspect[],
): string | null {
  return aspects.find(
    (aspect) =>
      aspect.aspectId === kind &&
      ((aspect.firstPlanetId === firstId && aspect.secondPlanetId === secondId) ||
        (aspect.firstPlanetId === secondId && aspect.secondPlanetId === firstId)),
  )?.id ?? null;
}

function findInternalAspectIds(
  placements: RealEngineReportPlacement[],
  aspects: RealEngineReportAspect[],
): string[] {
  const ids = new Set(placements.map((placement) => placement.id));
  return aspects
    .filter(
      (aspect) =>
        ids.has(aspect.firstPlanetId) && ids.has(aspect.secondPlanetId),
    )
    .map((aspect) => aspect.id);
}

function scoreGeometricPattern(
  base: number,
  participants: RealEngineReportPlacement[],
  matches: PairMatch[],
): number {
  const personalCount = participants.filter((item) =>
    PERSONAL_PLANET_SET.has(item.id),
  ).length;
  const luminaryCount = participants.filter((item) =>
    LUMINARY_SET.has(item.id),
  ).length;
  const maximumOrb = matches.reduce(
    (maximum, match) => Math.max(maximum, match.orb),
    0,
  );
  const closenessBonus = Math.max(0, 18 - maximumOrb * 2.5);
  return roundScore(
    base + personalCount * 4 + luminaryCount * 6 + closenessBonus,
  );
}

function patternToSignature(pattern: ChartPattern): ChartProminenceSignature {
  return {
    id: pattern.id,
    kind: "pattern",
    title: pattern.title,
    summary: pattern.summary,
    evidence: pattern.evidence.slice(0, 3),
    score: pattern.score,
    destination: pattern.destination,
  };
}

function buildMergedChartSentence(
  signatures: ChartProminenceSignature[],
): string {
  const labels = signatures.slice(0, 3).map((signature) =>
    signature.title
      .replace(/^مرکز ثقل سیاره‌ای:\s*/u, "")
      .replace(/^میدان پررنگ زندگی:\s*/u, "")
      .replace(/^تماس برجسته:\s*/u, ""),
  );
  if (labels.length === 0) {
    return "این چارت بدون شواهد کافی، یک ویژگی را به‌عنوان امضای اصلی اعلام نمی‌کند.";
  }
  if (labels.length === 1) {
    return `امضای کلی این چارت بیشتر حول ${labels[0]} شکل می‌گیرد.`;
  }
  if (labels.length === 2) {
    return `امضای کلی این چارت از کنار هم قرار گرفتن ${labels[0]} و ${labels[1]} شکل می‌گیرد.`;
  }
  return `امضای کلی این چارت از کنار هم قرار گرفتن ${labels[0]}، ${labels[1]} و ${labels[2]} شکل می‌گیرد.`;
}

function formatPairEvidence(match: PairMatch): string {
  const kindLabel = {
    square: "مربع",
    trine: "تثلیث",
    opposition: "مقابله",
  }[match.kind];
  return `${getPlanetLabel(match.first)} و ${getPlanetLabel(match.second)}: ${kindLabel} با اورب ${formatDegree(match.orb)}`;
}

function getHouseDestination(
  house: RealEngineReportHouseNumber,
): HumanFirstReadingSectionId {
  if ([1, 5, 10].includes(house)) return "overview";
  if ([3, 6, 9].includes(house)) return "mind-language";
  if ([4, 8, 12].includes(house)) return "inner-world";
  if ([2, 7, 11].includes(house)) return "relationships";
  return "primary-patterns";
}

function hasReliableBirthTimeForPatterns(report: AstrologyReport): boolean {
  if (report.input.birthTimeAccuracy === "unknown") return false;
  if (report.input.birthTimeAccuracy === "known") return true;
  const value = report.input.birthTime?.trim().toLocaleLowerCase("fa-IR") ?? "";
  return Boolean(value) && !["unknown", "نامشخص", "--:--", "00:00?"].includes(value);
}

function emptyPatternProfile(
  hasReliableBirthTime: boolean,
): ChartPatternProfile {
  return {
    version: CHART_PATTERN_VERSION,
    hasReliableBirthTime,
    patterns: [],
    primaryPattern: null,
    excludedTimeDependentPatterns: hasReliableBirthTime
      ? []
      : ["استلیوم در خانه"],
  };
}

function combinations<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  function visit(start: number, selected: T[]) {
    if (selected.length === size) {
      output.push(selected.slice());
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      selected.push(items[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  }
  visit(0, []);
  return output;
}

function pairCombinations<T>(items: T[]): Array<[T, T]> {
  const output: Array<[T, T]> = [];
  for (let first = 0; first < items.length; first += 1) {
    for (let second = first + 1; second < items.length; second += 1) {
      output.push([items[first], items[second]]);
    }
  }
  return output;
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const output = new Map<K, T[]>();
  for (const item of items) {
    const value = key(item);
    const group = output.get(value) ?? [];
    group.push(item);
    output.set(value, group);
  }
  return output;
}

function comparePlacements(
  first: RealEngineReportPlacement,
  second: RealEngineReportPlacement,
): number {
  return (
    MAJOR_PLANET_IDS.indexOf(first.id as (typeof MAJOR_PLANET_IDS)[number]) -
      MAJOR_PLANET_IDS.indexOf(second.id as (typeof MAJOR_PLANET_IDS)[number]) ||
    first.id.localeCompare(second.id)
  );
}

function comparePatterns(first: ChartPattern, second: ChartPattern): number {
  return (
    second.score - first.score ||
    PATTERN_KIND_ORDER[first.kind] - PATTERN_KIND_ORDER[second.kind] ||
    first.id.localeCompare(second.id)
  );
}

function participantKey(placements: RealEngineReportPlacement[]): string {
  return placements.map((placement) => placement.id).sort().join("-");
}

function totalOrb(matches: PairMatch[]): number {
  return matches.reduce((total, match) => total + match.orb, 0);
}

function getPlanetLabel(placement: RealEngineReportPlacement): string {
  return PLANET_LABELS[placement.id] ?? placement.label;
}

function calculateAngularSeparation(first: number, second: number): number {
  const raw = Math.abs(normalizeLongitude(first) - normalizeLongitude(second));
  return raw > 180 ? 360 - raw : raw;
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function isHouseNumber(
  value: number | null | undefined,
): value is RealEngineReportHouseNumber {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}

function formatDegree(value: number): string {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value)}°`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}
