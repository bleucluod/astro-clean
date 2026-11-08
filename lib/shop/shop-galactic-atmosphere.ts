import * as Astronomy from 'astronomy-engine';
import { parseShopSkyReference } from './shop-sky-stars';

type Point = { x: number; y: number; brightness: number; size: number };

const RAD = Math.PI / 180;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function unitEquatorial(ra: number, dec: number) {
  const rightAscension = ra * RAD;
  const declination = dec * RAD;
  return {
    x: Math.cos(declination) * Math.cos(rightAscension),
    y: Math.cos(declination) * Math.sin(rightAscension),
    z: Math.sin(declination),
  };
}

function cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: { x: number; y: number; z: number }) {
  const length = Math.hypot(v.x, v.y, v.z);
  if (!(length > .999) || !Number.isFinite(length)) {
    throw new Error('Galactic reference basis is invalid.');
  }
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

// IAU 1958 galactic orientation in the J2000 equatorial system. Both the
// north galactic pole and the galactic-centre direction are fixed in inertial
// coordinates; the atmosphere then rotates with the observer's real sky.
// The visual cloud is ARTISTIC STYLIZATION, not a photometric galaxy survey.
const galacticCentre = unitEquatorial(266.4051, -28.936175);
const galacticNorth = unitEquatorial(192.85948, 27.12825);
const galacticTangent = normalize(cross(galacticNorth, galacticCentre));

function hash01(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function normalNoise(index: number, salt: number) {
  const a = Math.max(1e-8, hash01(index, salt));
  const b = hash01(index, salt + 19);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

function density(longitudeRadians: number) {
  const cloud = Math.sin(longitudeRadians * 3 + .8) * .23 +
    Math.cos(longitudeRadians * 7.0 - .4) * .17 +
    Math.sin(longitudeRadians * 11.3) * .08;
  return Math.max(.12, Math.min(1, .62 + cloud));
}

function equatorialGalactic(longitude: number, latitude: number) {
  const l = longitude * RAD;
  const b = latitude * RAD;
  const x = Math.cos(b) * Math.cos(l);
  const y = Math.cos(b) * Math.sin(l);
  const z = Math.sin(b);
  return {
    x: x * galacticCentre.x + y * galacticTangent.x + z * galacticNorth.x,
    y: x * galacticCentre.y + y * galacticTangent.y + z * galacticNorth.y,
    z: x * galacticCentre.z + y * galacticTangent.z + z * galacticNorth.z,
  };
}

/**
 * A physically oriented galactic band, presented as a decorative density
 * texture. It is NOT a historic photograph or a claim of visible nebulosity.
 * Its orientation changes with the same UTC instant and observer coordinates
 * as the actual BSC5 stars and d3-celestial constellation figures.
 */
export function calculateShopGalacticAtmosphere(input: {
  referenceUtc: string;
  latitude: number;
  longitude: number;
}) {
  const date = parseShopSkyReference(input);
  const rotation = Astronomy.Rotation_EQJ_HOR(
    date, new Astronomy.Observer(input.latitude, input.longitude, 0),
  );
  const astroTime = new Astronomy.AstroTime(date);
  const projected = (longitude: number, latitude: number) => {
    const vector = equatorialGalactic(longitude, latitude);
    const rotated = Astronomy.RotateVector(rotation,
      new Astronomy.Vector(vector.x, vector.y, vector.z, astroTime));
    const horizontal = Astronomy.HorizonFromVector(rotated, 'normal');
    if (horizontal.lat <= 0) return null;
    const r = (90 - horizontal.lat) / 90;
    const azimuth = horizontal.lon * RAD;
    return { x: r * Math.sin(azimuth), y: -r * Math.cos(azimuth) };
  };

  // Contiguous visible points along the actual galactic equator form a
  // continuous atmospheric underlay, without inventing a fixed diagonal.
  const band: Array<Array<{ x: number; y: number }>> = [];
  let section: Array<{ x: number; y: number }> = [];
  for (let longitude = 0; longitude <= 360; longitude += 2) {
    const point = projected(longitude, 0);
    if (point) section.push(point);
    else {
      if (section.length > 1) band.push(section);
      section = [];
    }
  }
  if (section.length > 1) band.push(section);

  const clouds: Point[] = [];
  const grains: Point[] = [];
  const CLOUD_COUNT = 4800;
  const GRAIN_COUNT = 9500;

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const longitude = (i * 137.507764 + 24 * hash01(i, 3)) % 360;
    // A double-scaled Gaussian creates feathery edges and a bright centre.
    const latitude = Math.max(-24, Math.min(24,
      normalNoise(i, 7) * (i % 4 === 0 ? 10.5 : 5.1)));
    const position = projected(longitude, latitude);
    if (!position) continue;
    const strength = density(longitude * RAD);
    if (hash01(i, 12) > strength) continue;
    clouds.push({
      ...position, brightness: .13 + strength * .28,
      size: 17 + 46 * hash01(i, 14),
    });
  }

  for (let i = 0; i < GRAIN_COUNT; i++) {
    const longitude = (i * GOLDEN_ANGLE / RAD + 11 * hash01(i, 16)) % 360;
    const latitude = Math.max(-19, Math.min(19, normalNoise(i, 20) * 6.3));
    const position = projected(longitude, latitude);
    if (!position) continue;
    const strength = density(longitude * RAD);
    if (hash01(i, 21) > strength) continue;
    grains.push({
      ...position, brightness: .13 + strength * .54,
      size: .5 + 1.35 * hash01(i, 25),
    });
  }

  return {
    source: 'computed-J2000-galactic-plane-artistic-atmosphere' as const,
    isPhotographic: false as const,
    referenceUtc: input.referenceUtc,
    latitude: input.latitude,
    longitude: input.longitude,
    band,
    clouds,
    grains,
  };
}
