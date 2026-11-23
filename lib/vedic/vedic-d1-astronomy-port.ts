/**
 * Real Astronomy Engine call boundary for Vedic D1.
 *
 * The application supplies its installed astronomy-engine namespace at the call site.
 * No Swiss Ephemeris, Western report builder, mocks or stored user data are imported.
 * This component returns tropical-of-date coordinates to the separately tested
 * Lahiri projector; it is NOT a certified complete D1 ephemeris until real
 * astronomy-engine@2.1.19 outputs pass the locked independent reference suite.
 */
import type { VedicD1ValidatedBirth } from './vedic-d1-contract.ts';
import type { VedicD1TropicalInput } from './vedic-d1-projection.ts';

export const VEDIC_ASTRONOMY_PORT_VERSION = 'vedic-d1-astronomy-port/1' as const;

/** The structural subset of the astronomy-engine 2.1.19 API used here. */
export type VedicAstronomyEnginePort = {
  Body: {
    Sun: unknown;
    Moon: unknown;
    Mars: unknown;
    Mercury: unknown;
    Jupiter: unknown;
    Venus: unknown;
    Saturn: unknown;
  };
  AstroTime: new (date: Date) => unknown;
  GeoVector: (body: never, time: never, aberration: boolean) => unknown;
  Ecliptic: (equatorialVector: never) => { elon: number };
  SiderealTime: (time: never) => number;
};

const DEG = Math.PI / 180;
const BODIES = [
  ['sun', 'Sun'], ['moon', 'Moon'], ['mars', 'Mars'],
  ['mercury', 'Mercury'], ['jupiter', 'Jupiter'],
  ['venus', 'Venus'], ['saturn', 'Saturn'],
] as const;

type ClassicalId = (typeof BODIES)[number][0];

function wrap(angle: number): number {
  if (!Number.isFinite(angle)) throw new Error('VEDIC_ASTRONOMY_NONFINITE_LONGITUDE');
  const result = angle % 360;
  return result < 0 ? result + 360 : result;
}

/**
 * Approximate true obliquity of date (degrees), consistent with apparent
 * sidereal time and Astronomy Engine's Ecliptic true-equinox-of-date outputs.
 * Truncated IAU nutation terms; numeric acceptance must cover the high-latitude
 * ascendant and 1900-2100 chronology, not just a low-latitude example.
 */
export function approximateTrueObliquity(utcDate: Date): number {
  if (!(utcDate instanceof Date) || !Number.isFinite(utcDate.valueOf())) {
    throw new Error('VEDIC_ASTRONOMY_INVALID_TIME');
  }
  if (utcDate.getUTCFullYear() < 1900 || utcDate.getUTCFullYear() > 2100) {
    throw new Error('VEDIC_ASTRONOMY_DATE_OUT_OF_RANGE');
  }
  const jd = utcDate.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const omega = (125.04452 - 1934.136261 * t + .0020708 * t * t + t ** 3 / 450000) * DEG;
  const sunMean = (280.4665 + 36000.7698 * t) * DEG;
  const moonMean = (218.3165 + 481267.8813 * t) * DEG;
  const meanArcseconds = 84381.448 - 46.8150 * t - .00059 * t * t + .001813 * t ** 3;
  const nutationArcseconds = 9.20 * Math.cos(omega) + .57 * Math.cos(2 * sunMean) +
    .10 * Math.cos(2 * moonMean) - .09 * Math.cos(2 * omega);
  return (meanArcseconds + nutationArcseconds) / 3600;
}

/**
 * Calculate tropical apparent ascendant from Greenwich apparent sidereal
 * time (hours), east-positive geographical longitude, and latitude.
 */
export function calculateVedicPortTropicalAscendant(
  siderealHours: number,
  obliquityDegrees: number,
  latitudeDegrees: number,
  longitudeDegrees: number,
): number {
  if (![siderealHours, obliquityDegrees, latitudeDegrees, longitudeDegrees].every(Number.isFinite) ||
      siderealHours < 0 || siderealHours >= 24 ||
      Math.abs(latitudeDegrees) >= 89.999999 || Math.abs(longitudeDegrees) > 180 ||
      obliquityDegrees <= 0 || obliquityDegrees >= 90) {
    throw new Error('VEDIC_ASTRONOMY_ASCENDANT_INPUT_INVALID');
  }
  const local = wrap(siderealHours * 15 + longitudeDegrees) * DEG;
  const epsilon = obliquityDegrees * DEG;
  const latitude = latitudeDegrees * DEG;
  return wrap(Math.atan2(
    -Math.cos(local),
    Math.sin(local) * Math.cos(epsilon) + Math.tan(latitude) * Math.sin(epsilon),
  ) / DEG + 180);
}

/** No client coordinates. The city has already been validated on the server. */
export function calculateVedicD1TropicalInput(
  birth: VedicD1ValidatedBirth,
  astronomy: VedicAstronomyEnginePort,
): VedicD1TropicalInput {
  if (!birth || !birth.city || !birth.utcIso ||
      !Number.isFinite(birth.city.latitude) || !Number.isFinite(birth.city.longitude) ||
      Math.abs(birth.city.latitude) >= 89.999999 || Math.abs(birth.city.longitude) > 180) {
    throw new Error('VEDIC_ASTRONOMY_CITY_INVALID');
  }
  const utcDate = new Date(birth.utcIso);
  if (!Number.isFinite(utcDate.getTime()) || utcDate.toISOString() !== birth.utcIso) {
    throw new Error('VEDIC_ASTRONOMY_INVALID_TIME');
  }
  const astroTime = new astronomy.AstroTime(utcDate);
  const sidereal = astronomy.SiderealTime(astroTime as never);
  const positions = {} as Record<ClassicalId, number>;
  for (const [id, bodyKey] of BODIES) {
    const body = astronomy.Body[bodyKey];
    if (body === undefined || body === null) throw new Error('VEDIC_ASTRONOMY_BODY_MISSING');
    const vector = astronomy.GeoVector(body as never, astroTime as never, true);
    const ecliptic = astronomy.Ecliptic(vector as never);
    positions[id] = wrap(ecliptic?.elon);
  }
  return {
    utcIso: birth.utcIso,
    coordinateFrame: 'apparent-tropical-ecliptic-of-date',
    ephemerisSource: 'astronomy-engine:GeoVector(aberration=true):Ecliptic(true-of-date)',
    ascendantLongitude: calculateVedicPortTropicalAscendant(
      sidereal, approximateTrueObliquity(utcDate), birth.city.latitude, birth.city.longitude,
    ),
    positions,
  };
}
