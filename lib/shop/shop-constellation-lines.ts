import * as Astronomy from 'astronomy-engine';
import constellationGeojson from './catalog/constellations-d3-celestial-v1.json';
import { parseShopSkyReference } from './shop-sky-stars';

type SourcePoint = readonly [number, number];
type SourceVector = { x: number; y: number; z: number };
type ProjectedPoint = { x: number; y: number };

export type ShopConstellationLine = {
  constellationId: string;
  rank: number;
  points: ProjectedPoint[];
};

function unitEquatorial([raDegrees, decDegrees]: SourcePoint): SourceVector {
  if (!Number.isFinite(raDegrees) || !Number.isFinite(decDegrees) ||
      raDegrees < -180 || raDegrees > 180 || decDegrees < -90 || decDegrees > 90) {
    throw new Error('Invalid sourced constellation J2000 coordinate.');
  }
  const ra = raDegrees * Math.PI / 180;
  const dec = decDegrees * Math.PI / 180;
  return { x: Math.cos(dec) * Math.cos(ra), y: Math.cos(dec) * Math.sin(ra), z: Math.sin(dec) };
}

function sphericalInterpolation(a: SourceVector, b: SourceVector, fraction: number): SourceVector {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const angle = Math.acos(dot);
  if (angle < 1e-8) return a;
  const denominator = Math.sin(angle);
  if (Math.abs(denominator) < 1e-8) throw new Error('Antipodal constellation line cannot be projected.');
  const left = Math.sin((1 - fraction) * angle) / denominator;
  const right = Math.sin(fraction * angle) / denominator;
  return { x: a.x * left + b.x * right, y: a.y * left + b.y * right, z: a.z * left + b.z * right };
}

function asProjectedPoint(altitude: number, azimuth: number): ProjectedPoint {
  const normalizedRadius = Math.max(0, Math.min(1, (90 - altitude) / 90));
  const azimuthRadians = azimuth * Math.PI / 180;
  return { x: normalizedRadius * Math.sin(azimuthRadians), y: -normalizedRadius * Math.cos(azimuthRadians) };
}

/**
 * Project licensed star-figure line segments (not IAU constellation boundaries).
 * A great-circle sampling step and binary horizon intersections prevent
 * shortcuts across the map edge or false lines through the hidden hemisphere.
 */
export function calculateShopConstellationLines(input: {
  referenceUtc: string;
  latitude: number;
  longitude: number;
}) {
  const date = parseShopSkyReference(input);
  const rotation = Astronomy.Rotation_EQJ_HOR(date, new Astronomy.Observer(input.latitude, input.longitude, 0));
  const astroTime = new Astronomy.AstroTime(date);
  const catalogue = constellationGeojson.features;
  if (catalogue.length !== 89) throw new Error('Unexpected constellation figure source count.');
  const lines: ShopConstellationLine[] = [];
  let sourcePolylines = 0;
  let sourceVertices = 0;

  function project(vector: SourceVector) {
    const rotated = Astronomy.RotateVector(rotation, new Astronomy.Vector(vector.x, vector.y, vector.z, astroTime));
    const horizontal = Astronomy.HorizonFromVector(rotated, 'normal');
    return { altitude: horizontal.lat, ...asProjectedPoint(horizontal.lat, horizontal.lon) };
  }

  for (const feature of catalogue) {
    if (feature.geometry.type !== 'MultiLineString' || !/^[A-Za-z]{3}$/.test(feature.id)) {
      throw new Error('Invalid constellation figure geometry.');
    }
    const rank = Number(feature.properties.rank);
    if (!Number.isSafeInteger(rank) || rank < 1 || rank > 3) {
      throw new Error('Invalid constellation figure rank.');
    }
    for (const rawPolyline of feature.geometry.coordinates) {
      sourcePolylines++;
      sourceVertices += rawPolyline.length;
      if (rawPolyline.length < 2) throw new Error('Constellation figure has an invalid source polyline.');
      const source = rawPolyline.map((coords) => {
        if (coords.length !== 2) throw new Error('Unexpected constellation coordinate tuple.');
        return unitEquatorial([coords[0], coords[1]]);
      });
      let visiblePiece: ProjectedPoint[] = [];
      const flush = () => {
        if (visiblePiece.length > 1) {
          lines.push({ constellationId: feature.id, rank, points: visiblePiece });
        }
        visiblePiece = [];
      };
      let previous = project(source[0]);
      if (previous.altitude > 0) visiblePiece.push({ x: previous.x, y: previous.y });

      for (let i = 1; i < source.length; i++) {
        const first = source[i - 1];
        const second = source[i];
        const dot = Math.max(-1, Math.min(1, first.x * second.x + first.y * second.y + first.z * second.z));
        const arcDegrees = Math.acos(dot) * 180 / Math.PI;
        const steps = Math.max(1, Math.ceil(arcDegrees / 2));
        const at = (fraction: number) => project(sphericalInterpolation(first, second, fraction));

        for (let step = 1; step <= steps; step++) {
          const fraction = step / steps;
          const current = at(fraction);
          const previousVisible = previous.altitude > 0;
          const currentVisible = current.altitude > 0;
          if (previousVisible !== currentVisible) {
            let low = (step - 1) / steps;
            let high = fraction;
            for (let iteration = 0; iteration < 25; iteration++) {
              const midpoint = (low + high) / 2;
              if ((at(midpoint).altitude > 0) === previousVisible) low = midpoint;
              else high = midpoint;
            }
            const edge = at((low + high) / 2);
            if (previousVisible) {
              visiblePiece.push({ x: edge.x, y: edge.y });
              flush();
            } else {
              visiblePiece.push({ x: edge.x, y: edge.y });
            }
          }
          if (currentVisible) visiblePiece.push({ x: current.x, y: current.y });
          previous = current;
        }
      }
      flush();
    }
  }
  return {
    source: 'd3-celestial-constellation-line-figures-bsd-3-clause' as const,
    sourceGitBlob: 'ce64cf3c18b627f4d9749b9076cd4693b777697e' as const,
    featureCount: catalogue.length,
    sourcePolylines, sourceVertices,
    projectedVisiblePieces: lines.length,
    coordinates: 'J2000-right-ascension-and-declination' as const,
    printArtworkReady: false as const,
    referenceUtc: input.referenceUtc,
    latitude: input.latitude,
    longitude: input.longitude,
    lines,
  };
}
