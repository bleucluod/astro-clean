import * as Astronomy from 'astronomy-engine';
import { FIXED_STAR_CATALOG, FIXED_STAR_CATALOG_VERSION } from '@/src/lib/chart/fixed-star-catalog';

const J2000_MS = Date.UTC(2000, 0, 1, 12);
const JULIAN_YEAR_MS = 365.25 * 86_400_000;
const DEG_TO_RAD = Math.PI / 180;

export type ShopSkyBrightStar = {
  id: string;
  labelFa: string;
  labelEn: string;
  altitudeDegrees: number;
  azimuthDegrees: number;
  /** Unit-radius north-up, east-right azimuthal equidistant projection. */
  x: number;
  y: number;
};

export function parseShopSkyReference(input: {
  referenceUtc: string;
  latitude: number;
  longitude: number;
}) {
  const { referenceUtc, latitude, longitude } = input;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(referenceUtc)) {
    throw new Error('Bright-star proof requires a canonical UTC instant.');
  }
  const date = new Date(referenceUtc);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== referenceUtc) {
    throw new Error('Invalid UTC instant for bright-star proof.');
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Invalid observer coordinates for bright-star proof.');
  }

  return date;
}

export function calculateShopBrightStarProof(input: {
  referenceUtc: string;
  latitude: number;
  longitude: number;
}) {
  const { referenceUtc, latitude, longitude } = input;
  const date = parseShopSkyReference(input);
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const rotation = Astronomy.Rotation_EQJ_HOR(date, observer);
  const years = (date.getTime() - J2000_MS) / JULIAN_YEAR_MS;
  const aboveHorizonStars: ShopSkyBrightStar[] = [];

  for (const entry of FIXED_STAR_CATALOG) {
    const decDegrees = entry.decJ2000Degrees + entry.pmDecMasPerYear * years / 3_600_000;
    const cosDec = Math.cos(decDegrees * DEG_TO_RAD);
    if (Math.abs(cosDec) < 1e-8) throw new Error(`Unstable stellar coordinates: ${entry.id}`);
    const raDegrees = entry.raJ2000Hours * 15 +
      entry.pmRaCosDecMasPerYear * years / (3_600_000 * cosDec);
    const ra = raDegrees * DEG_TO_RAD;
    const dec = decDegrees * DEG_TO_RAD;
    const equatorial = new Astronomy.Vector(
      Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec),
      new Astronomy.AstroTime(date),
    );
    const horizontal = Astronomy.RotateVector(rotation, equatorial);
    const position = Astronomy.HorizonFromVector(horizontal, 'normal');
    if (position.lat <= 0) continue;

    const distanceFromZenith = (90 - position.lat) / 90;
    const azimuth = position.lon * DEG_TO_RAD;
    aboveHorizonStars.push({
      id: entry.id, labelFa: entry.labelFa, labelEn: entry.labelEn,
      altitudeDegrees: position.lat, azimuthDegrees: position.lon,
      x: distanceFromZenith * Math.sin(azimuth),
      y: -distanceFromZenith * Math.cos(azimuth),
    });
  }

  return {
    source: 'halleus-curated-j2000-proper-motion-astronomy-engine-horizon' as const,
    catalogueVersion: FIXED_STAR_CATALOG_VERSION,
    catalogueStarCount: FIXED_STAR_CATALOG.length,
    aboveHorizonStarCount: aboveHorizonStars.length,
    referenceUtc, latitude, longitude,
    coverage: 'curated-bright-stars-only-not-a-complete-sky-map' as const,
    printArtworkReady: false as const,
    aboveHorizonStars,
  };
}
