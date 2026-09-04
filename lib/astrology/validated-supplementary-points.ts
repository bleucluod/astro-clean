import { ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";
import { getZodiacPosition } from "@/src/lib/chart/zodiac";
import type {
  AstrologyReport,
  RealEngineReportCalculatedSpecialPoint,
  RealEngineReportHouse,
  RealEngineReportHouseNumber,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";

export const VALIDATED_SUPPLEMENTARY_POINTS_VERSION =
  "validated-supplementary-points-v2-unified-special-points" as const;

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R1_20260830

export const CHIRON_VALIDATION_DECISION =
  "included-after-independent-ephemeris-validation" as const;

// HALLEUS_R39_STAGE1_CHIRON_CONTRACT_20260901

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

export type ValidatedVertexPoint = {
  id: "vertex";
  label: "ورتکس";
  longitude: number;
  signId: ZodiacKey;
  signLabel: string;
  degreeInSign: number;
  house: RealEngineReportHouseNumber | null;
};

export type PartOfFortunePoint = {
  id: "part-of-fortune";
  label: "فورچون";
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
  vertex: ValidatedVertexPoint | null;
  excludedTimeDependentFactors: string[];
};

export type BuildValidatedSupplementaryPointsOptions = {
  hasReliableBirthTime: boolean;
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
  const vertex = options.hasReliableBirthTime
    ? buildVertex(report)
    : null;
  const chiron = buildChiron(report);

  if (!options.hasReliableBirthTime) {
    excludedTimeDependentFactors.push("part-of-fortune", "vertex");
  }

  return {
    version: VALIDATED_SUPPLEMENTARY_POINTS_VERSION,
    hasReliableBirthTime: options.hasReliableBirthTime,
    chiron,
    chironValidationDecision: CHIRON_VALIDATION_DECISION,
    partOfFortune,
    vertex,
    excludedTimeDependentFactors,
  };
}

function buildPartOfFortune(
  report: AstrologyReport,
): PartOfFortunePoint | null {
  const canonical = findCalculatedSpecialPoint(report, "part-of-fortune");

  if (
    canonical &&
    canonical.house &&
    (canonical.calculationContext?.sect === "day" ||
      canonical.calculationContext?.sect === "night") &&
    (canonical.calculationContext?.formulaId === "ascendant+moon-sun" ||
      canonical.calculationContext?.formulaId === "ascendant+sun-moon")
  ) {
    return toPartOfFortunePoint({
      report,
      longitude: canonical.longitude,
      signId: canonical.signId,
      degreeInSign: canonical.degreeInSign,
      house: canonical.house,
      sect: canonical.calculationContext.sect,
      formula: canonical.calculationContext.formulaId,
      sourceLabel: "canonical special-point snapshot",
    });
  }

  return buildLegacyPartOfFortune(report);
}

function buildLegacyPartOfFortune(
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
    sect === "day"
      ? "ascendant+moon-sun"
      : "ascendant+sun-moon";
  const longitude = calculatePartOfFortuneLongitude({
    ascendantLongitude,
    sunLongitude: sun.longitude,
    moonLongitude: moon.longitude,
    sect,
  });
  const house = findHouseForLongitude(longitude, houses);

  if (!house) return null;

  const zodiac = getZodiacPosition(longitude);
  const signId = zodiac.sign.id as ZodiacKey;

  return toPartOfFortunePoint({
    report,
    longitude: zodiac.normalizedLongitude,
    signId,
    degreeInSign: zodiac.degreeInSign,
    house: house.number,
    sect,
    formula,
    sourceLabel: "legacy stored-report fallback",
  });
}

function toPartOfFortunePoint(input: {
  report: AstrologyReport;
  longitude: number;
  signId: ZodiacKey;
  degreeInSign: number;
  house: RealEngineReportHouseNumber;
  sect: PartOfFortuneSect;
  formula: PartOfFortuneFormula;
  sourceLabel: string;
}): PartOfFortunePoint {
  const signLabel = ZODIAC_LABELS[input.signId].faName;
  const sectLabel = input.sect === "day" ? "چارت روز" : "چارت شب";

  return {
    id: "part-of-fortune",
    label: "فورچون",
    longitude: input.longitude,
    signId: input.signId,
    signLabel,
    degreeInSign: input.degreeInSign,
    house: input.house,
    sect: input.sect,
    formula: input.formula,
    summary:
      `فورچون در ${signLabel} و خانه ${formatPersianNumber(input.house)} قرار می‌گیرد. ` +
      "این نقطه از رابطهٔ طالع، خورشید و ماه ساخته می‌شود و در این گزارش برای زمینهٔ تحقق و شرایط بدنی/زیسته خوانده می‌شود؛ نه به‌عنوان وعدهٔ شانس یا نتیجهٔ قطعی.",
    evidence: [
      `${sectLabel}: ${formatFormula(input.formula)}`,
      `نتیجه ${formatDegree(input.longitude)}؛ ${signLabel} ${formatDegree(input.degreeInSign)}، خانه ${formatPersianNumber(input.house)}`,
      `منبع: ${input.sourceLabel}`,
    ],
  };
}

function buildVertex(report: AstrologyReport): ValidatedVertexPoint | null {
  const canonical = findCalculatedSpecialPoint(report, "vertex");
  if (!canonical) return null;

  return {
    id: "vertex",
    label: "ورتکس",
    longitude: canonical.longitude,
    signId: canonical.signId,
    signLabel: ZODIAC_LABELS[canonical.signId].faName,
    degreeInSign: canonical.degreeInSign,
    house: canonical.house,
  };
}

function buildChiron(report: AstrologyReport): ValidatedChironPoint | null {
  const canonical = findCalculatedSpecialPoint(report, "chiron");
  if (!canonical) return null;

  return {
    id: "chiron",
    longitude: canonical.longitude,
    signId: canonical.signId,
    degreeInSign: canonical.degreeInSign,
    house: canonical.house,
  };
}

function findCalculatedSpecialPoint(
  report: AstrologyReport,
  id: "chiron" | "part-of-fortune" | "vertex",
): RealEngineReportCalculatedSpecialPoint | null {
  const point = report.realEngine?.specialPoints?.find(
    (candidate) => candidate.id === id,
  );

  return point?.status === "calculated" ? point : null;
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
  const unique = new Map<
    RealEngineReportHouseNumber,
    RealEngineReportHouse
  >();

  for (const house of houses) {
    if (
      toHouseNumber(house.number) &&
      typeof house.cuspLongitude === "number" &&
      Number.isFinite(house.cuspLongitude)
    ) {
      unique.set(house.number, house);
    }
  }

  return [...unique.values()].sort(
    (left, right) => left.number - right.number,
  );
}

export function findHouseForLongitude(
  longitude: number,
  houses: RealEngineReportHouse[],
): RealEngineReportHouse | null {
  if (!Number.isFinite(longitude) || houses.length !== 12) {
    return null;
  }

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
