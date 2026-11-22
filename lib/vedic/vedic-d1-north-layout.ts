/**
 * Fixed North Indian D1 layout: house 1 is the upper diamond, 2..12 proceed
 * counterclockwise. Signs change with Lagna; geometry does not mirror in RTL.
 * Pure presentation math: this does not compute or certify an ephemeris.
 */
import {
  VEDIC_D1_CALCULATION,
  VEDIC_D1_CONTRACT_VERSION,
  type VedicD1PlacementId,
} from './vedic-d1-contract.ts';
import {
  VEDIC_D1_BODY_ORDER,
  VEDIC_D1_CLASSIFICATION_VERSION,
  classifyVedicMoon,
  type VedicD1AssembledChart,
} from './vedic-d1-assembly.ts';
import { getVedicD1NakshatraDisplay } from './vedic-d1-nakshatras.ts';

export const VEDIC_D1_NORTH_LAYOUT_VERSION = 'vedic-d1-north-layout/1' as const;
export const VEDIC_D1_SIGNS_FA = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت',
] as const;
export const VEDIC_D1_BODIES_FA: Readonly<Record<VedicD1PlacementId, string>> = {
  sun: 'خورشید', moon: 'ماه', mars: 'مریخ', mercury: 'عطارد',
  jupiter: 'مشتری', venus: 'زهره', saturn: 'زحل',
  rahu: 'راهو', ketu: 'کیتو',
};

// Immutable centers in a 480 by 480 North Indian square. The central diamonds
// are H1 (top), H4 (left), H7 (bottom), H10 (right).
export const VEDIC_D1_NORTH_CENTERS = [
  { houseNumber: 1, x: 240, y: 122 },
  { houseNumber: 2, x: 122, y: 51 },
  { houseNumber: 3, x: 51, y: 122 },
  { houseNumber: 4, x: 122, y: 240 },
  { houseNumber: 5, x: 51, y: 358 },
  { houseNumber: 6, x: 122, y: 429 },
  { houseNumber: 7, x: 240, y: 358 },
  { houseNumber: 8, x: 358, y: 429 },
  { houseNumber: 9, x: 429, y: 358 },
  { houseNumber: 10, x: 358, y: 240 },
  { houseNumber: 11, x: 429, y: 122 },
  { houseNumber: 12, x: 358, y: 51 },
] as const;
export const VEDIC_D1_NORTH_GRID_PATH = 'M240 0 L480 240 L240 480 L0 240 Z M0 0 L480 480 M480 0 L0 480' as const;

export type VedicD1NorthPlacementRow = {
  id: VedicD1PlacementId;
  labelFa: string;
  longitude: number;
  degreeInSign: number;
  signIndex: number | null;
  signNameFa: string | null;
  houseNumber: number | null;
  isBoundaryUncertain: boolean;
};
export type VedicD1NorthHouse = {
  houseNumber: number;
  x: number;
  y: number;
  signIndex: number;
  signNumber: number;
  signNameFa: string;
  placements: readonly VedicD1NorthPlacementRow[];
};
export type VedicD1NorthView = {
  version: typeof VEDIC_D1_NORTH_LAYOUT_VERSION;
  canDrawHouses: boolean;
  ascendantSignNumber: number | null;
  houses: readonly VedicD1NorthHouse[];
  rows: readonly VedicD1NorthPlacementRow[];
  boundaryRows: readonly VedicD1NorthPlacementRow[];
  moonNakshatra: ReturnType<typeof getVedicD1NakshatraDisplay>;
};

function assertChart(chart: VedicD1AssembledChart): void {
  const fail = (): never => { throw new Error('VEDIC_D1_NORTH_CHART_INVALID'); };
  if (!chart || chart.contractVersion !== VEDIC_D1_CONTRACT_VERSION ||
      chart.classificationVersion !== VEDIC_D1_CLASSIFICATION_VERSION ||
      chart.calculation?.zodiac !== VEDIC_D1_CALCULATION.zodiac ||
      chart.calculation?.ayanamsha !== VEDIC_D1_CALCULATION.ayanamsha ||
      chart.calculation?.houses !== VEDIC_D1_CALCULATION.houses ||
      chart.calculation?.node !== VEDIC_D1_CALCULATION.node ||
      chart.coordinateFrame !== 'lahiri-sidereal-ecliptic-of-date' ||
      typeof chart.calculationVersion !== 'string' || !chart.calculationVersion ||
      typeof chart.ephemerisSource !== 'string' || !chart.ephemerisSource ||
      !Number.isFinite(chart.ayanamshaDegrees) ||
      !Number.isFinite(chart.ascendantLongitude) ||
      chart.ascendantLongitude < 0 || chart.ascendantLongitude >= 360 ||
      !Number.isInteger(chart.ascendantSignIndex) || chart.ascendantSignIndex < 0 || chart.ascendantSignIndex > 11 ||
      chart.ascendantSignIndex !== Math.floor(chart.ascendantLongitude / 30) ||
      !chart.uncertainty || typeof chart.uncertainty.ascendantSign !== 'boolean' ||
      typeof chart.uncertainty.moonNakshatra !== 'boolean' || typeof chart.uncertainty.moonPada !== 'boolean' ||
      !Array.isArray(chart.placements) || chart.placements.length !== VEDIC_D1_BODY_ORDER.length) fail();
  const seen = new Set<VedicD1PlacementId>();
  for (const item of chart.placements) {
    if (!item || !VEDIC_D1_BODY_ORDER.includes(item.id) || seen.has(item.id) ||
        !Number.isFinite(item.longitude) || item.longitude < 0 || item.longitude >= 360 ||
        !Number.isInteger(item.signIndex) || item.signIndex < 0 || item.signIndex > 11 ||
        item.signIndex !== Math.floor(item.longitude / 30) ||
        !Number.isFinite(item.degreeInSign) || Math.abs(item.degreeInSign - item.longitude % 30) > 1e-7 ||
        !Number.isInteger(item.houseNumber) || item.houseNumber !== ((item.signIndex - chart.ascendantSignIndex + 12) % 12) + 1 ||
        typeof chart.uncertainty.placementSign?.[item.id] !== 'boolean' ||
        typeof chart.uncertainty.placementHouse?.[item.id] !== 'boolean') fail();
    seen.add(item.id);
  }
  if (seen.size !== VEDIC_D1_BODY_ORDER.length) fail();
  const rahu = chart.placements.find(item => item.id === 'rahu')!;
  const ketu = chart.placements.find(item => item.id === 'ketu')!;
  if (Math.abs(((ketu.longitude - rahu.longitude - 180 + 540) % 360) - 180) > 1e-7) fail();
  const moon = chart.placements.find(item => item.id === 'moon')!;
  const classified = classifyVedicMoon(moon.longitude);
  if (!chart.nakshatra || chart.nakshatra.index !== classified.index ||
      chart.nakshatra.pada !== classified.pada ||
      chart.nakshatra.moonLongitude !== classified.moonLongitude) fail();
}

/**
 * All nine bodies remain in `rows`, including ambiguous or densely occupied
 * houses. Boundary-uncertain house placements are NOT placed categorically on
 * the chart. If Lagna is boundary-uncertain, the entire 12-house drawing is
 * withheld while the text rows remain available.
 */
export function buildVedicD1NorthView(chart: VedicD1AssembledChart): VedicD1NorthView {
  assertChart(chart);
  const ascUncertain = chart.uncertainty.ascendantSign;
  const byId = new Map(chart.placements.map(item => [item.id, item]));
  const rows = VEDIC_D1_BODY_ORDER.map((id): VedicD1NorthPlacementRow => {
    const item = byId.get(id)!;
    const signUncertain = chart.uncertainty.placementSign[id];
    const houseUncertain = ascUncertain || chart.uncertainty.placementHouse[id] || signUncertain;
    return {
      id, labelFa: VEDIC_D1_BODIES_FA[id], longitude: item.longitude,
      degreeInSign: item.degreeInSign,
      signIndex: signUncertain ? null : item.signIndex,
      signNameFa: signUncertain ? null : VEDIC_D1_SIGNS_FA[item.signIndex],
      houseNumber: houseUncertain ? null : item.houseNumber,
      isBoundaryUncertain: signUncertain || houseUncertain,
    };
  });
  const houses: VedicD1NorthHouse[] = ascUncertain ? [] : VEDIC_D1_NORTH_CENTERS.map(center => {
    const signIndex = (chart.ascendantSignIndex + center.houseNumber - 1) % 12;
    return {
      ...center,
      signIndex,
      signNumber: signIndex + 1,
      signNameFa: VEDIC_D1_SIGNS_FA[signIndex],
      placements: rows.filter(row => row.houseNumber === center.houseNumber),
    };
  });
  return {
    version: VEDIC_D1_NORTH_LAYOUT_VERSION,
    canDrawHouses: !ascUncertain,
    ascendantSignNumber: ascUncertain ? null : chart.ascendantSignIndex + 1,
    houses,
    rows,
    boundaryRows: rows.filter(row => row.isBoundaryUncertain),
    moonNakshatra: getVedicD1NakshatraDisplay(chart.nakshatra, {
      moonNakshatra: chart.uncertainty.moonNakshatra,
      moonPada: chart.uncertainty.moonPada,
    }),
  };
}
