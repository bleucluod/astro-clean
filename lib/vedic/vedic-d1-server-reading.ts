/**
 * Actual D1 guest calculator. Only used from a server-only route; the client
 * receives the minimal free reading, never the raw validated birth or a draft.
 *
 * Scientific calibration: 14 independent Swiss reference vectors and 154
 * Astronomy Engine 2.1.19 positions under the locked three-arcminute limit.
 * Near boundaries we use the conservative full 3' budget, not the observed
 * fixture maximum, to withhold categorical house/sign/nakshatra labels.
 */
import type { VedicD1ValidatedBirth } from './vedic-d1-contract.ts';
import { calculateVedicD1TropicalInput, type VedicAstronomyEnginePort } from './vedic-d1-astronomy-port.ts';
import { projectVedicD1Longitudes } from './vedic-d1-projection.ts';
import { assembleVedicD1Chart, type VedicD1SiderealSnapshot, type VedicD1AssembledChart } from './vedic-d1-assembly.ts';
import { buildVedicD1FreeReading } from './vedic-d1-free-reading.ts';
import type { VedicD1FreeReading } from './vedic-d1-reading-contract.ts';

export const VEDIC_D1_CERTIFIED_CALCULATION_VERSION = 'vedic-d1-astronomy-engine-2.1.19-lahiri/1' as const;
export const VEDIC_D1_CONSERVATIVE_MAX_ERROR_ARCMINUTES = 3 as const;

export function calculateVedicD1Chart(
  birth: VedicD1ValidatedBirth,
  astronomy: VedicAstronomyEnginePort,
): VedicD1AssembledChart {
  const tropical = calculateVedicD1TropicalInput(birth, astronomy);
  const projected = projectVedicD1Longitudes(tropical);
  if (projected.utcIso !== birth.utcIso ||
      projected.verification !== 'NOT_VALIDATED_AS_FULL_EPHEMERIS' ||
      !projected.ephemerisSource.startsWith('astronomy-engine:GeoVector(')) {
    throw new Error('VEDIC_D1_INVALID_EPHEMERIS_PROVENANCE');
  }
  const snapshot: VedicD1SiderealSnapshot = {
    utcIso: projected.utcIso,
    calculationVersion: VEDIC_D1_CERTIFIED_CALCULATION_VERSION,
    ephemerisSource: projected.ephemerisSource,
    coordinateFrame: 'lahiri-sidereal-ecliptic-of-date',
    ayanamshaMode: 'SE_SIDM_LAHIRI',
    nodeModel: 'mean',
    ayanamshaDegrees: projected.calculatedAyanamshaDegrees,
    ascendantLongitude: projected.ascendantLongitude,
    maxErrorArcMinutes: VEDIC_D1_CONSERVATIVE_MAX_ERROR_ARCMINUTES,
    positions: {
      sun: projected.positions.sun, moon: projected.positions.moon,
      mars: projected.positions.mars, mercury: projected.positions.mercury,
      jupiter: projected.positions.jupiter, venus: projected.positions.venus,
      saturn: projected.positions.saturn, rahu: projected.positions.rahu,
    },
  };
  // All sensitive date/city/UTC fields stay in server memory. This builder
  // returns ONLY the allowlisted public reading schema, no premium manuscript.
  return assembleVedicD1Chart(birth, snapshot);
}

/** Public calculation still returns ONLY the allowlisted free reading. */
export function calculateVedicD1GuestReading(
  birth: VedicD1ValidatedBirth,
  astronomy: VedicAstronomyEnginePort,
): VedicD1FreeReading {
  return buildVedicD1FreeReading(calculateVedicD1Chart(birth, astronomy));
}
