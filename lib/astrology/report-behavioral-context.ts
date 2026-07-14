import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportSnapshot,
} from "@/types/astro";
import type {
  BehavioralAudienceMode,
  BehavioralPlacementAspectModifier,
} from "@/lib/astrology/report-behavioral-interpretation";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

export function resolveBehavioralAudienceMode(
  birthDate: string | null | undefined,
  generatedAt: string | null | undefined,
): BehavioralAudienceMode {
  const birth = parseIsoDate(birthDate);
  const generated = parseGeneratedDate(generatedAt);

  if (!birth || !generated) {
    return "adult";
  }

  let age = generated.year - birth.year;
  const birthdayHasPassed =
    generated.month > birth.month ||
    (generated.month === birth.month && generated.day >= birth.day);

  if (!birthdayHasPassed) {
    age -= 1;
  }

  if (age < 13) {
    return "caregiver";
  }

  if (age < 18) {
    return "youth";
  }

  return "adult";
}

export function getReportBehavioralAudienceMode(
  report: AstrologyReport,
): BehavioralAudienceMode {
  const storedMode = report.realEngine?.behavioralAudienceMode;

  if (isBehavioralAudienceMode(storedMode)) {
    return storedMode;
  }

  return resolveBehavioralAudienceMode(
    report.input.birthDate,
    report.realEngine?.generatedAt ?? report.createdAt,
  );
}

export function getSnapshotBehavioralAudienceMode(
  snapshot: RealEngineReportSnapshot,
): BehavioralAudienceMode {
  return isBehavioralAudienceMode(snapshot.behavioralAudienceMode)
    ? snapshot.behavioralAudienceMode
    : "adult";
}

export function selectPlacementMajorAspectModifier(
  planetId: string,
  aspects: RealEngineReportAspect[] | undefined,
): BehavioralPlacementAspectModifier | null {
  if (!Array.isArray(aspects)) {
    return null;
  }

  const index = aspects.findIndex(
    (aspect) =>
      aspect.firstPlanetId === planetId ||
      aspect.secondPlanetId === planetId,
  );

  if (index < 0) {
    return null;
  }

  const aspect = aspects[index];
  const otherPlanetId =
    aspect.firstPlanetId === planetId
      ? aspect.secondPlanetId
      : aspect.firstPlanetId;

  return {
    otherPlanetId,
    aspectId: aspect.aspectId,
    primary: index === 0,
  };
}

function isBehavioralAudienceMode(
  value: string | null | undefined,
): value is BehavioralAudienceMode {
  return value === "caregiver" || value === "youth" || value === "adult";
}

function parseGeneratedDate(
  value: string | null | undefined,
): ParsedDate | null {
  if (typeof value !== "string") {
    return null;
  }

  return parseIsoDate(value.slice(0, 10));
}

type ParsedDate = {
  year: number;
  month: number;
  day: number;
};

function parseIsoDate(
  value: string | null | undefined,
): ParsedDate | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}
