import * as Astronomy from 'astronomy-engine';
import bsc5 from './catalog/bsc5-bright-stars-mag6.json';
import { parseShopSkyReference } from './shop-sky-stars';

export type ShopSkyAtlasStar = {
  x: number;
  y: number;
  altitudeDegrees: number;
  azimuthDegrees: number;
  visualMagnitude: number;
};

/**
 * A source-attributed dense star field, independent of constellation drawings.
 * Source coordinates are J2000; omitted stellar proper motions limit precision.
 * "Above horizon" does not imply visibility to a human in daylight.
 */
export function calculateShopStarAtlas(input: {
  referenceUtc: string;
  latitude: number;
  longitude: number;
}) {
  const date = parseShopSkyReference(input);
  const observer = new Astronomy.Observer(input.latitude, input.longitude, 0);
  const rotation = Astronomy.Rotation_EQJ_HOR(date, observer);
  const time = new Astronomy.AstroTime(date);
  const stars = bsc5.stars;
  if (stars.length !== bsc5.meta.count * 4 || bsc5.meta.count !== 5080) {
    throw new Error('Unverified BSC5 shop star catalog shape.');
  }

  const aboveHorizonStars: ShopSkyAtlasStar[] = [];
  for (let index = 0; index < stars.length; index += 4) {
    const raDegrees = stars[index];
    const decDegrees = stars[index + 1];
    const visualMagnitude = stars[index + 2];
    if (typeof raDegrees !== 'number' || !Number.isFinite(raDegrees) || raDegrees < 0 || raDegrees >= 360 ||
        typeof decDegrees !== 'number' || !Number.isFinite(decDegrees) || decDegrees < -90 || decDegrees > 90 ||
        typeof visualMagnitude !== 'number' || !Number.isFinite(visualMagnitude) || visualMagnitude > 6) {
      throw new Error(`Invalid BSC5 shop star record at index ${index / 4}.`);
    }
    const ra = raDegrees * Math.PI / 180;
    const dec = decDegrees * Math.PI / 180;
    const equatorial = new Astronomy.Vector(
      Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), time,
    );
    const horizon = Astronomy.HorizonFromVector(Astronomy.RotateVector(rotation, equatorial), 'normal');
    if (horizon.lat <= 0) continue;
    const normalizedRadius = (90 - horizon.lat) / 90;
    const azimuth = horizon.lon * Math.PI / 180;
    aboveHorizonStars.push({
      x: normalizedRadius * Math.sin(azimuth),
      y: -normalizedRadius * Math.cos(azimuth),
      altitudeDegrees: horizon.lat,
      azimuthDegrees: horizon.lon,
      visualMagnitude,
    });
  }

  return {
    source: 'yale-bsc5-j2000-magnitude6-astronomy-engine-horizon' as const,
    catalogueCount: bsc5.meta.count,
    aboveHorizonCount: aboveHorizonStars.length,
    brightnessLimit: bsc5.meta.magnitudeLimitInclusive,
    originalCatalogueUrl: bsc5.meta.sourceUrl,
    upstreamGitBlob: bsc5.meta.upstreamGitBlob,
    properMotionIncluded: false as const,
    constellationLinesIncluded: false as const,
    coverage: 'actual-catalogue-stars-up-to-visual-magnitude6' as const,
    printArtworkReady: false as const,
    referenceUtc: input.referenceUtc,
    latitude: input.latitude,
    longitude: input.longitude,
    aboveHorizonStars,
  };
}
