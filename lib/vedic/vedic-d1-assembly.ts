/**
 * Strictly downstream of a verified Lahiri / mean-node ephemeris adapter.
 * This file never computes planetary longitudes or substitutes Western chart values.
 * Source-specific astronomical accuracy must be verified independently.
 */
import {
  VEDIC_D1_CALCULATION,
  VEDIC_D1_CONTRACT_VERSION,
  type VedicD1Chart,
  type VedicD1Nakshatra,
  type VedicD1Placement,
  type VedicD1PlacementId,
  type VedicD1ValidatedBirth,
} from './vedic-d1-contract.ts';

export const VEDIC_D1_CLASSIFICATION_VERSION = 'vedic-d1-classes/v1' as const;
export const VEDIC_D1_BODY_ORDER = [
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu',
] as const satisfies readonly VedicD1PlacementId[];

type SuppliedBody = Exclude<VedicD1PlacementId, 'ketu'>;

/** Raw *sidereal* ecliptic longitudes, already Lahiri-adjusted in one coherent frame. */
export type VedicD1SiderealSnapshot = {
  utcIso: string;
  calculationVersion: string;
  ephemerisSource: string;
  coordinateFrame: 'lahiri-sidereal-ecliptic-of-date';
  ayanamshaMode: 'SE_SIDM_LAHIRI';
  nodeModel: 'mean';
  ayanamshaDegrees: number;
  ascendantLongitude: number;
  positions: Record<SuppliedBody, number>;
  /** Conservative maximum absolute error for signs / Nakshatra decisions. */
  maxErrorArcMinutes: number;
};

export type VedicD1ClassificationUncertainty = {
  ascendantSign: boolean;
  placementSign: Record<VedicD1PlacementId, boolean>;
  placementHouse: Record<VedicD1PlacementId, boolean>;
  moonNakshatra: boolean;
  moonPada: boolean;
};

export type VedicD1AssembledChart = VedicD1Chart & {
  classificationVersion: typeof VEDIC_D1_CLASSIFICATION_VERSION;
  uncertainty: VedicD1ClassificationUncertainty;
};

export function normalizeVedicLongitude(angle: number): number {
  if (!Number.isFinite(angle)) throw new Error('VEDIC_D1_LONGITUDE_INVALID');
  if (angle >= 0 && angle < 360) return angle;
  const remainder = angle % 360;
  return remainder < 0 ? remainder + 360 : remainder;
}

export function isNearVedicBoundary(angle: number, segmentDegrees: number, maxErrorDegrees: number): boolean {
  if (!Number.isFinite(segmentDegrees) || segmentDegrees <= 0 || !Number.isFinite(maxErrorDegrees) || maxErrorDegrees < 0) {
    throw new Error('VEDIC_D1_BOUNDARY_PARAMETERS_INVALID');
  }
  const remainder = normalizeVedicLongitude(angle) % segmentDegrees;
  return Math.min(remainder, segmentDegrees - remainder) <= maxErrorDegrees;
}

export function classifyVedicSign(longitude: number): { signIndex: number; degreeInSign: number } {
  const normalized = normalizeVedicLongitude(longitude);
  return { signIndex: Math.floor(normalized / 30), degreeInSign: normalized % 30 };
}

function halfOpenSegmentIndex(value: number, segmentsPerCircle: number): number {
  const ratio = value * segmentsPerCircle / 360;
  const nearest = Math.round(ratio);
  return Math.abs(ratio - nearest) <= 8 * Number.EPSILON * Math.max(1, Math.abs(ratio))
    ? nearest % segmentsPerCircle
    : Math.floor(ratio);
}

export function classifyVedicMoon(longitude: number): VedicD1Nakshatra {
  const normalized = normalizeVedicLongitude(longitude);
  const nakshatraIndex = halfOpenSegmentIndex(normalized, 27);
  // Computing the pada from 108 equal segments ensures half-open boundaries.
  const padaGlobalIndex = halfOpenSegmentIndex(normalized, 108);
  return {
    index: nakshatraIndex,
    pada: ((padaGlobalIndex % 4) + 1) as 1 | 2 | 3 | 4,
    moonLongitude: normalized,
  };
}

const REQUIRED_SUPPLIED_BODIES: readonly SuppliedBody[] = [
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu',
];

function requireCoherentSnapshot(birth: VedicD1ValidatedBirth, snapshot: VedicD1SiderealSnapshot): void {
  if (snapshot.utcIso !== birth.utcIso || !Number.isFinite(Date.parse(snapshot.utcIso))) {
    throw new Error('VEDIC_D1_SNAPSHOT_TIME_MISMATCH');
  }
  if (snapshot.coordinateFrame !== 'lahiri-sidereal-ecliptic-of-date' ||
      snapshot.ayanamshaMode !== 'SE_SIDM_LAHIRI' || snapshot.nodeModel !== 'mean') {
    throw new Error('VEDIC_D1_SNAPSHOT_FRAME_MISMATCH');
  }
  if (!snapshot.calculationVersion || !snapshot.ephemerisSource ||
      !Number.isFinite(snapshot.ayanamshaDegrees) || snapshot.ayanamshaDegrees < 0 || snapshot.ayanamshaDegrees >= 360 ||
      !Number.isFinite(snapshot.maxErrorArcMinutes) || snapshot.maxErrorArcMinutes < 0 || snapshot.maxErrorArcMinutes > 3) {
    throw new Error('VEDIC_D1_SNAPSHOT_PROVENANCE_INVALID');
  }
  normalizeVedicLongitude(snapshot.ascendantLongitude);
  for (const body of REQUIRED_SUPPLIED_BODIES) normalizeVedicLongitude(snapshot.positions?.[body]);
}

/**
 * Classify only provided, verified sidereal longitudes. This does not prove that
 * the provider itself achieves the stated error bound. Near a boundary, the UI
 * must avoid categorical sign/house/Nakshatra/pada interpretation.
 */
export function assembleVedicD1Chart(
  birth: VedicD1ValidatedBirth,
  snapshot: VedicD1SiderealSnapshot,
): VedicD1AssembledChart {
  requireCoherentSnapshot(birth, snapshot);
  const ascendantLongitude = normalizeVedicLongitude(snapshot.ascendantLongitude);
  const ascendantSignIndex = classifyVedicSign(ascendantLongitude).signIndex;
  const errorDegrees = snapshot.maxErrorArcMinutes / 60;
  const ascendantUncertain = isNearVedicBoundary(ascendantLongitude, 30, errorDegrees);
  const longitudes: Record<VedicD1PlacementId, number> = {
    sun: normalizeVedicLongitude(snapshot.positions.sun),
    moon: normalizeVedicLongitude(snapshot.positions.moon),
    mars: normalizeVedicLongitude(snapshot.positions.mars),
    mercury: normalizeVedicLongitude(snapshot.positions.mercury),
    jupiter: normalizeVedicLongitude(snapshot.positions.jupiter),
    venus: normalizeVedicLongitude(snapshot.positions.venus),
    saturn: normalizeVedicLongitude(snapshot.positions.saturn),
    rahu: normalizeVedicLongitude(snapshot.positions.rahu),
    ketu: normalizeVedicLongitude(snapshot.positions.rahu + 180),
  };
  const placementSign = {} as Record<VedicD1PlacementId, boolean>;
  const placementHouse = {} as Record<VedicD1PlacementId, boolean>;
  const placements: VedicD1Placement[] = VEDIC_D1_BODY_ORDER.map((id) => {
    const longitude = longitudes[id];
    const { signIndex, degreeInSign } = classifyVedicSign(longitude);
    placementSign[id] = isNearVedicBoundary(longitude, 30, errorDegrees);
    placementHouse[id] = placementSign[id] || ascendantUncertain;
    return {
      id, longitude, signIndex, degreeInSign,
      houseNumber: ((signIndex - ascendantSignIndex + 12) % 12) + 1,
    };
  });
  const moon = longitudes.moon;
  return {
    contractVersion: VEDIC_D1_CONTRACT_VERSION,
    calculation: VEDIC_D1_CALCULATION,
    calculationVersion: snapshot.calculationVersion,
    classificationVersion: VEDIC_D1_CLASSIFICATION_VERSION,
    ayanamshaDegrees: snapshot.ayanamshaDegrees,
    ephemerisSource: snapshot.ephemerisSource,
    coordinateFrame: snapshot.coordinateFrame,
    utcIso: birth.utcIso,
    cityId: birth.city.id,
    ascendantLongitude,
    ascendantSignIndex,
    placements,
    nakshatra: classifyVedicMoon(moon),
    uncertainty: {
      ascendantSign: ascendantUncertain,
      placementSign,
      placementHouse,
      moonNakshatra: isNearVedicBoundary(moon, 360 / 27, errorDegrees),
      moonPada: isNearVedicBoundary(moon, 360 / 108, errorDegrees),
    },
  };
}
