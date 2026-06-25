import { FULL_CIRCLE_DEGREES, normalizeEclipticLongitude } from "./zodiac";

export const MAJOR_ASPECT_IDS = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
] as const;

export type MajorAspectId = (typeof MAJOR_ASPECT_IDS)[number];

export type AspectDefinition = {
  id: MajorAspectId;
  angle: number;
  defaultOrb: number;
  polarity: "neutral" | "harmonious" | "dynamic";
};

export type AspectPlacement = {
  id: string;
  longitude: number;
  label?: string;
};

export type CalculatedAspect = {
  id: MajorAspectId;
  pointA: string;
  pointB: string;
  angle: number;
  separation: number;
  orb: number;
  applying: boolean | null;
  polarity: AspectDefinition["polarity"];
};

export const MAJOR_ASPECT_DEFINITIONS: AspectDefinition[] = [
  {
    id: "conjunction",
    angle: 0,
    defaultOrb: 8,
    polarity: "neutral",
  },
  {
    id: "sextile",
    angle: 60,
    defaultOrb: 4,
    polarity: "harmonious",
  },
  {
    id: "square",
    angle: 90,
    defaultOrb: 6,
    polarity: "dynamic",
  },
  {
    id: "trine",
    angle: 120,
    defaultOrb: 6,
    polarity: "harmonious",
  },
  {
    id: "opposition",
    angle: 180,
    defaultOrb: 8,
    polarity: "dynamic",
  },
];

export function calculateAngularSeparation(
  longitudeA: number,
  longitudeB: number,
): number {
  const normalizedA = normalizeEclipticLongitude(longitudeA);
  const normalizedB = normalizeEclipticLongitude(longitudeB);
  const rawDistance = Math.abs(normalizedA - normalizedB);

  return Math.min(rawDistance, FULL_CIRCLE_DEGREES - rawDistance);
}

export function getAspectDefinition(id: MajorAspectId): AspectDefinition {
  const definition = MAJOR_ASPECT_DEFINITIONS.find((aspect) => aspect.id === id);

  if (!definition) {
    throw new Error(`Unknown aspect definition: ${id}`);
  }

  return definition;
}

export function getAspectOrb(
  separation: number,
  aspectAngle: number,
): number {
  return Math.abs(separation - aspectAngle);
}

export function findMajorAspect(
  longitudeA: number,
  longitudeB: number,
  orbScale = 1,
): Omit<CalculatedAspect, "pointA" | "pointB"> | null {
  if (!Number.isFinite(orbScale) || orbScale <= 0) {
    throw new TypeError(`Expected positive orb scale. Received: ${orbScale}`);
  }

  const separation = calculateAngularSeparation(longitudeA, longitudeB);
  let bestMatch: Omit<CalculatedAspect, "pointA" | "pointB"> | null = null;

  for (const definition of MAJOR_ASPECT_DEFINITIONS) {
    const orb = getAspectOrb(separation, definition.angle);
    const allowedOrb = definition.defaultOrb * orbScale;

    if (orb <= allowedOrb && (!bestMatch || orb < bestMatch.orb)) {
      bestMatch = {
        id: definition.id,
        angle: definition.angle,
        separation,
        orb,
        applying: null,
        polarity: definition.polarity,
      };
    }
  }

  return bestMatch;
}

export function findMajorAspectBetweenPlacements(
  placementA: AspectPlacement,
  placementB: AspectPlacement,
  orbScale = 1,
): CalculatedAspect | null {
  const aspect = findMajorAspect(
    placementA.longitude,
    placementB.longitude,
    orbScale,
  );

  if (!aspect) {
    return null;
  }

  return {
    ...aspect,
    pointA: placementA.id,
    pointB: placementB.id,
  };
}

export function calculateMajorAspects(
  placements: AspectPlacement[],
  orbScale = 1,
): CalculatedAspect[] {
  const aspects: CalculatedAspect[] = [];

  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    const left = placements[leftIndex];

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < placements.length;
      rightIndex += 1
    ) {
      const right = placements[rightIndex];
      const aspect = findMajorAspectBetweenPlacements(left, right, orbScale);

      if (aspect) {
        aspects.push(aspect);
      }
    }
  }

  return aspects;
}

export function sortAspectsByOrb(aspects: CalculatedAspect[]): CalculatedAspect[] {
  return [...aspects].sort((left, right) => {
    if (left.orb !== right.orb) {
      return left.orb - right.orb;
    }

    return left.id.localeCompare(right.id);
  });
}

export function formatAspectOrb(orb: number, precision = 2): string {
  const safePrecision = Math.max(0, Math.min(6, Math.trunc(precision)));

  return `${orb.toFixed(safePrecision)}°`;
}
