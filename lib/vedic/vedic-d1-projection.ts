/**
 * Testable arithmetic boundary between a tropical-of-date geocentric provider
 * and the sidereal D1 classifier. This is NOT an ephemeris. In particular it
 * does not certify the source planet or ascendant algorithms as accurate.
 */

/**
 * Mean Lahiri ayanamsha approximation (degrees) calibrated at JD J2000 and
 * +/-100 Julian years against Swiss Ephemeris SE_SIDM_LAHIRI mean ayanamsha.
 * Supports only 1900-2100; output is an approximation, not Swiss Ephemeris.
 * This intentionally does not use a constant 24-degree subtraction.
 */
export const VEDIC_D1_PROJECTION_VERSION = 'vedic-d1-projection/1' as const;
const JULIAN_DAY_UNIX_EPOCH = 2440587.5;
const JULIAN_DAY_J2000 = 2451545;
const DAYS_PER_CENTURY = 36525;
const LAHIRI_J2000_DEG = 23.857092353708822;
const LAHIRI_RATE_DEG_PER_CENTURY = 1.396887962566062;
const LAHIRI_QUADRATIC_DEG = 0.00030708729841677496;

export function julianCenturiesFromUtc(date: Date): number {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error('VEDIC_D1_UTC_INVALID');
  }
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) {
    throw new Error('VEDIC_D1_DATE_OUTSIDE_CALIBRATION');
  }
  return (date.getTime() / 86400000 + JULIAN_DAY_UNIX_EPOCH - JULIAN_DAY_J2000) / DAYS_PER_CENTURY;
}

export function approximateMeanLahiriAyanamsha(utcDate: Date): number {
  const t = julianCenturiesFromUtc(utcDate);
  return LAHIRI_J2000_DEG + LAHIRI_RATE_DEG_PER_CENTURY * t + LAHIRI_QUADRATIC_DEG * t * t;
}

export function meanTropicalRahuLongitude(utcDate: Date): number {
  const t = julianCenturiesFromUtc(utcDate);
  return wrapVedicAngle(125.04455501 - 1934.1361849 * t + 0.0020762 * t ** 2 + t ** 3 / 467410 - t ** 4 / 60616000);
}

export function wrapVedicAngle(longitude: number): number {
  if (!Number.isFinite(longitude)) throw new Error('VEDIC_D1_LONGITUDE_INVALID');
  const v = longitude % 360;
  return v < 0 ? v + 360 : v;
}

const TROPICAL_BODY_IDS = [
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn',
] as const;
type ClassicalBodyId = (typeof TROPICAL_BODY_IDS)[number];

/**
 * Input must be in the same apparent tropical ecliptic-of-date frame for all
 * seven bodies and tropical ascendant. Does NOT accept planets in J2000.
 */
export type VedicD1TropicalInput = {
  utcIso: string;
  coordinateFrame: 'apparent-tropical-ecliptic-of-date';
  ephemerisSource: string;
  ascendantLongitude: number;
  positions: Record<ClassicalBodyId, number>;
};

/** This deliberately lacks a verified maxErrorArcMinutes claim. */
export type VedicD1ProjectedLongitudes = {
  projectionVersion: typeof VEDIC_D1_PROJECTION_VERSION;
  utcIso: string;
  calculatedAyanamshaDegrees: number;
  coordinateFrame: 'approx-lahiri-sidereal-ecliptic-of-date';
  ephemerisSource: string;
  ascendantLongitude: number;
  positions: Record<ClassicalBodyId | 'rahu' | 'ketu', number>;
  verification: 'NOT_VALIDATED_AS_FULL_EPHEMERIS';
};

export function projectVedicD1Longitudes(source: VedicD1TropicalInput): VedicD1ProjectedLongitudes {
  if (!source || source.coordinateFrame !== 'apparent-tropical-ecliptic-of-date' ||
      !source.ephemerisSource || typeof source.ephemerisSource !== 'string') {
    throw new Error('VEDIC_D1_SOURCE_FRAME_INVALID');
  }
  const date = new Date(source.utcIso);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== source.utcIso) {
    throw new Error('VEDIC_D1_UTC_INVALID');
  }
  const ayanamsha = approximateMeanLahiriAyanamsha(date);
  const positions = {} as Record<ClassicalBodyId | 'rahu' | 'ketu', number>;
  for (const id of TROPICAL_BODY_IDS) {
    positions[id] = wrapVedicAngle(wrapVedicAngle(source.positions?.[id]) - ayanamsha);
  }
  const rahu = wrapVedicAngle(meanTropicalRahuLongitude(date) - ayanamsha);
  positions.rahu = rahu;
  positions.ketu = wrapVedicAngle(rahu + 180);
  return {
    projectionVersion: VEDIC_D1_PROJECTION_VERSION,
    utcIso: source.utcIso,
    calculatedAyanamshaDegrees: ayanamsha,
    coordinateFrame: 'approx-lahiri-sidereal-ecliptic-of-date',
    ephemerisSource: source.ephemerisSource,
    ascendantLongitude: wrapVedicAngle(wrapVedicAngle(source.ascendantLongitude) - ayanamsha),
    positions,
    verification: 'NOT_VALIDATED_AS_FULL_EPHEMERIS',
  };
}
