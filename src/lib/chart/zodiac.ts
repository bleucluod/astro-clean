export const ZODIAC_SIGN_IDS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type ZodiacSignId = (typeof ZODIAC_SIGN_IDS)[number];

export type ZodiacElement = "fire" | "earth" | "air" | "water";

export type ZodiacModality = "cardinal" | "fixed" | "mutable";

export type ZodiacSign = {
  id: ZodiacSignId;
  index: number;
  startDegree: number;
  endDegree: number;
  element: ZodiacElement;
  modality: ZodiacModality;
};

export type ZodiacPosition = {
  longitude: number;
  normalizedLongitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
};

export const ZODIAC_SIGN_SIZE_DEGREES = 30 as const;

export const FULL_CIRCLE_DEGREES = 360 as const;

export const TROPICAL_ZODIAC_SIGNS: ZodiacSign[] = [
  {
    id: "aries",
    index: 0,
    startDegree: 0,
    endDegree: 30,
    element: "fire",
    modality: "cardinal",
  },
  {
    id: "taurus",
    index: 1,
    startDegree: 30,
    endDegree: 60,
    element: "earth",
    modality: "fixed",
  },
  {
    id: "gemini",
    index: 2,
    startDegree: 60,
    endDegree: 90,
    element: "air",
    modality: "mutable",
  },
  {
    id: "cancer",
    index: 3,
    startDegree: 90,
    endDegree: 120,
    element: "water",
    modality: "cardinal",
  },
  {
    id: "leo",
    index: 4,
    startDegree: 120,
    endDegree: 150,
    element: "fire",
    modality: "fixed",
  },
  {
    id: "virgo",
    index: 5,
    startDegree: 150,
    endDegree: 180,
    element: "earth",
    modality: "mutable",
  },
  {
    id: "libra",
    index: 6,
    startDegree: 180,
    endDegree: 210,
    element: "air",
    modality: "cardinal",
  },
  {
    id: "scorpio",
    index: 7,
    startDegree: 210,
    endDegree: 240,
    element: "water",
    modality: "fixed",
  },
  {
    id: "sagittarius",
    index: 8,
    startDegree: 240,
    endDegree: 270,
    element: "fire",
    modality: "mutable",
  },
  {
    id: "capricorn",
    index: 9,
    startDegree: 270,
    endDegree: 300,
    element: "earth",
    modality: "cardinal",
  },
  {
    id: "aquarius",
    index: 10,
    startDegree: 300,
    endDegree: 330,
    element: "air",
    modality: "fixed",
  },
  {
    id: "pisces",
    index: 11,
    startDegree: 330,
    endDegree: 360,
    element: "water",
    modality: "mutable",
  },
] as const satisfies ZodiacSign[];

export function normalizeEclipticLongitude(longitude: number): number {
  assertFiniteLongitude(longitude);

  const normalized = longitude % FULL_CIRCLE_DEGREES;

  return normalized < 0 ? normalized + FULL_CIRCLE_DEGREES : normalized;
}

export function getZodiacSignIndexFromLongitude(longitude: number): number {
  const normalized = normalizeEclipticLongitude(longitude);
  const index = Math.floor(normalized / ZODIAC_SIGN_SIZE_DEGREES);

  return index >= TROPICAL_ZODIAC_SIGNS.length ? 0 : index;
}

export function getTropicalZodiacSignFromLongitude(longitude: number): ZodiacSign {
  return TROPICAL_ZODIAC_SIGNS[getZodiacSignIndexFromLongitude(longitude)];
}

export function getDegreeWithinZodiacSign(longitude: number): number {
  const normalized = normalizeEclipticLongitude(longitude);

  return normalized % ZODIAC_SIGN_SIZE_DEGREES;
}

export function getZodiacPosition(longitude: number): ZodiacPosition {
  const normalizedLongitude = normalizeEclipticLongitude(longitude);

  return {
    longitude,
    normalizedLongitude,
    sign: getTropicalZodiacSignFromLongitude(normalizedLongitude),
    degreeInSign: getDegreeWithinZodiacSign(normalizedLongitude),
  };
}

export function formatZodiacPosition(longitude: number, precision = 2): string {
  const position = getZodiacPosition(longitude);
  const safePrecision = Math.max(0, Math.min(6, Math.trunc(precision)));

  return `${position.degreeInSign.toFixed(safePrecision)} ${position.sign.id}`;
}

export function isZodiacBoundaryLongitude(
  longitude: number,
  tolerance = 0.000001,
): boolean {
  const degreeInSign = getDegreeWithinZodiacSign(longitude);

  return (
    degreeInSign <= tolerance ||
    ZODIAC_SIGN_SIZE_DEGREES - degreeInSign <= tolerance
  );
}

function assertFiniteLongitude(longitude: number): void {
  if (!Number.isFinite(longitude)) {
    throw new TypeError(`Expected finite ecliptic longitude. Received: ${longitude}`);
  }
}
