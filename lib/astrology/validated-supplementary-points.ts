import type {
  AstrologyReport,
  RealEngineReportHouse,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";

export const VALIDATED_SUPPLEMENTARY_POINTS_VERSION =
  "validated-supplementary-points-v1" as const;

export const CHIRON_VALIDATION_DECISION =
  "excluded-pending-independent-ephemeris-validation" as const;

export type PartOfFortuneSect = "day" | "night";
export type PartOfFortuneFormula =
  | "ascendant+moon-sun"
  | "ascendant+sun-moon";

export type ValidatedChironPoint = {
  id: "chiron";
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house: RealEngineReportHouseNumber | null;
};

export type PartOfFortunePoint = {
  id: "part-of-fortune";
  label: "سهم سعادت";
  longitude: number;
  signId: ZodiacKey;
  signLabel: string;
  degreeInSign: number;
  house: RealEngineReportHouseNumber;
  sect: PartOfFortuneSect;
  formula: PartOfFortuneFormula;
  summary: string;
  evidence: string[];
};

export type ValidatedSupplementaryPointsProfile = {
  version: typeof VALIDATED_SUPPLEMENTARY_POINTS_VERSION;
  hasReliableBirthTime: boolean;
  chiron: ValidatedChironPoint | null;
  chironValidationDecision: typeof CHIRON_VALIDATION_DECISION;
  partOfFortune: PartOfFortunePoint | null;
  excludedTimeDependentFactors: string[];
};

export type BuildValidatedSupplementaryPointsOptions = {
  hasReliableBirthTime: boolean;
};

const SIGN_ORDER: ZodiacKey[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

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

const DAY_HOUSES = new Set<RealEngineReportHouseNumber>([
  7, 8, 9, 10, 11, 12,
]);

export function calculatePartOfFortuneLongitude({
  ascendantLongitude,
  sunLongitude,
  moonLongitude,
  sect,
}: {
  ascendantLongitude: number;
  sunLongitude: number;
  moonLongitude: number;
  sect: PartOfFortuneSect;
}): number {
  assertFiniteLongitude(ascendantLongitude, "ascendantLongitude");
  assertFiniteLongitude(sunLongitude, "sunLongitude");
  assertFiniteLongitude(moonLongitude, "moonLongitude");

  return normalizeLongitude(
    sect === "day"
      ? ascendantLongitude + moonLongitude - sunLongitude
      : ascendantLongitude + sunLongitude - moonLongitude,
  );
}

export function buildValidatedSupplementaryPointsProfile(
  report: AstrologyReport,
  options: BuildValidatedSupplementaryPointsOptions,
): ValidatedSupplementaryPointsProfile {
  const excludedTimeDependentFactors: string[] = [];
  const partOfFortune = options.hasReliableBirthTime
    ? buildPartOfFortune(report)
    : null;

  if (!options.hasReliableBirthTime) {
    excludedTimeDependentFactors.push("part-of-fortune");
  }

  return {
    version: VALIDATED_SUPPLEMENTARY_POINTS_VERSION,
    hasReliableBirthTime: options.hasReliableBirthTime,
    chiron: null,
    chironValidationDecision: CHIRON_VALIDATION_DECISION,
    partOfFortune,
    excludedTimeDependentFactors,
  };
}

function buildPartOfFortune(
  report: AstrologyReport,
): PartOfFortunePoint | null {
  const snapshot = report.realEngine;
  if (!snapshot) return null;

  const sun = findPlacement(snapshot.placements, "sun");
  const moon = findPlacement(snapshot.placements, "moon");
  const sunHouse = toHouseNumber(sun?.house);
  const ascendantLongitude = resolveAscendantLongitude(report);
  const houses = normalizeHouses(snapshot.houses ?? []);

  if (
    !sun ||
    !moon ||
    !sunHouse ||
    ascendantLongitude === null ||
    houses.length !== 12
  ) {
    return null;
  }

  const sect: PartOfFortuneSect = DAY_HOUSES.has(sunHouse)
    ? "day"
    : "night";
  const formula: PartOfFortuneFormula =
    sect === "day" ? "ascendant+moon-sun" : "ascendant+sun-moon";
  const longitude = calculatePartOfFortuneLongitude({
    ascendantLongitude,
    sunLongitude: sun.longitude,
    moonLongitude: moon.longitude,
    sect,
  });
  const house = findHouseForLongitude(longitude, houses);

  if (!house) return null;

  const signId = signFromLongitude(longitude);
  const signLabel = SIGN_LABELS[signId];
  const degreeInSign = normalizeLongitude(longitude) % 30;
  const sectLabel = sect === "day" ? "چارت روز" : "چارت شب";

  return {
    id: "part-of-fortune",
    label: "سهم سعادت",
    longitude,
    signId,
    signLabel,
    degreeInSign,
    house: house.number,
    sect,
    formula,
    summary:
      `سهم سعادت در ${signLabel} و خانه ${formatPersianNumber(house.number)} قرار می‌گیرد. ` +
      "این نقطه از رابطهٔ طالع، خورشید و ماه ساخته می‌شود و در این گزارش فقط برای دیدن زمینه‌هایی به کار می‌رود که هماهنگی میان ریتم درونی و شیوهٔ حضور می‌تواند طبیعی‌تر شکل بگیرد؛ نه برای وعدهٔ شانس یا نتیجهٔ قطعی.",
    evidence: [
      `طالع ${formatDegree(ascendantLongitude)}`,
      `خورشید ${formatDegree(sun.longitude)} در خانه ${formatPersianNumber(sunHouse)}`,
      `ماه ${formatDegree(moon.longitude)}`,
      `${sectLabel}: ${formatFormula(formula)}`,
      `نتیجه ${formatDegree(longitude)}؛ ${signLabel} ${formatDegree(degreeInSign)}، خانه ${formatPersianNumber(house.number)}`,
    ],
  };
}

function resolveAscendantLongitude(report: AstrologyReport): number | null {
  const candidates = [
    report.realEngine?.angles?.asc?.longitude,
    report.realEngine?.houseContext?.ascendantLongitude,
    report.realEngine?.ascendantLongitude,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return normalizeLongitude(value);
    }
  }

  return null;
}

function normalizeHouses(
  houses: RealEngineReportHouse[],
): RealEngineReportHouse[] {
  const unique = new Map<RealEngineReportHouseNumber, RealEngineReportHouse>();
  for (const house of houses) {
    if (
      toHouseNumber(house.number) &&
      typeof house.cuspLongitude === "number" &&
      Number.isFinite(house.cuspLongitude)
    ) {
      unique.set(house.number, house);
    }
  }
  return [...unique.values()].sort((a, b) => a.number - b.number);
}

export function findHouseForLongitude(
  longitude: number,
  houses: RealEngineReportHouse[],
): RealEngineReportHouse | null {
  if (!Number.isFinite(longitude) || houses.length !== 12) return null;
  const ordered = normalizeHouses(houses);
  if (ordered.length !== 12) return null;
  const point = normalizeLongitude(longitude);

  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const next = ordered[(index + 1) % ordered.length];
    const start = normalizeLongitude(current.cuspLongitude);
    const end = normalizeLongitude(next.cuspLongitude);
    const arc = normalizeLongitude(end - start);
    const pointArc = normalizeLongitude(point - start);

    if (pointArc < arc || Math.abs(pointArc) < 1e-9) {
      return current;
    }
  }

  return null;
}

function findPlacement(
  placements: RealEngineReportPlacement[],
  id: string,
): RealEngineReportPlacement | undefined {
  return placements.find((placement) => placement.id === id);
}

function toHouseNumber(
  value: number | null | undefined,
): RealEngineReportHouseNumber | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
    ? (value as RealEngineReportHouseNumber)
    : null;
}

function signFromLongitude(longitude: number): ZodiacKey {
  const index = Math.floor(normalizeLongitude(longitude) / 30) % 12;
  return SIGN_ORDER[index];
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function assertFiniteLongitude(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function formatFormula(formula: PartOfFortuneFormula): string {
  return formula === "ascendant+moon-sun"
    ? "طالع + ماه − خورشید"
    : "طالع + خورشید − ماه";
}

function formatDegree(value: number): string {
  return `${formatPersianNumber(Number(value.toFixed(2)))}°`;
}

function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value);
}
