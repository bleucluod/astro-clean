import { Body, Illumination, MoonPhase } from 'astronomy-engine';

export type ShopMoonEphemeris = {
  referenceUtc: string;
  phaseAngleDegrees: number;
  illuminatedFraction: number;
  phase: 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous'
    | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';
};

/**
 * Actual geocentric lunar phase at an explicitly supplied UTC instant.
 * No arbitrary timezone, civil-date noon or observer location is inferred here.
 * An owner-approved time policy is required before rendering date-only P01 orders.
 */
export function calculateShopMoonAtUtc(referenceUtc: string): ShopMoonEphemeris {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(referenceUtc)) {
    throw new Error('Shop moon calculations require an explicit ISO UTC instant.');
  }
  const instant = new Date(referenceUtc);
  if (!Number.isFinite(instant.getTime())) {
    throw new Error('Invalid shop moon calculation instant.');
  }
  // Date roundtrips catch invalid ISO calendar dates that JavaScript normalizes.
  if (!instant.toISOString().startsWith(referenceUtc.slice(0, 19))) {
    throw new Error('Invalid shop moon calculation calendar date.');
  }
  const phaseAngleDegrees = MoonPhase(instant);
  const illuminatedFraction = Illumination(Body.Moon, instant).phase_fraction;
  if (!Number.isFinite(phaseAngleDegrees) || !Number.isFinite(illuminatedFraction)
      || illuminatedFraction < 0 || illuminatedFraction > 1) {
    throw new Error('Shop moon ephemeris returned an invalid result.');
  }
  const phases: ShopMoonEphemeris['phase'][] = [
    'new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous',
    'full', 'waning-gibbous', 'last-quarter', 'waning-crescent',
  ];
  const phase = phases[Math.floor(((phaseAngleDegrees + 22.5) % 360) / 45)];
  return {
    referenceUtc: instant.toISOString(),
    phaseAngleDegrees: Number(phaseAngleDegrees.toFixed(6)),
    illuminatedFraction: Number(illuminatedFraction.toFixed(6)),
    phase,
  };
}
