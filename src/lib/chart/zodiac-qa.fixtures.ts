import {
  type ZodiacSignId,
  ZODIAC_SIGN_IDS,
  formatZodiacPosition,
  getDegreeWithinZodiacSign,
  getTropicalZodiacSignFromLongitude,
  getZodiacPosition,
  isZodiacBoundaryLongitude,
  normalizeEclipticLongitude,
} from "./zodiac";

export type ZodiacQaFixture = {
  id: string;
  longitude: number;
  expectedSign: ZodiacSignId;
  expectedDegreeInSign: number;
  expectedNormalizedLongitude: number;
  shouldBeBoundary: boolean;
};

export const zodiacQaFixtures: ZodiacQaFixture[] = [
  {
    id: "aries-start",
    longitude: 0,
    expectedSign: "aries",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 0,
    shouldBeBoundary: true,
  },
  {
    id: "aries-end-before-taurus",
    longitude: 29.999,
    expectedSign: "aries",
    expectedDegreeInSign: 29.999,
    expectedNormalizedLongitude: 29.999,
    shouldBeBoundary: false,
  },
  {
    id: "taurus-start",
    longitude: 30,
    expectedSign: "taurus",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 30,
    shouldBeBoundary: true,
  },
  {
    id: "gemini-start",
    longitude: 60,
    expectedSign: "gemini",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 60,
    shouldBeBoundary: true,
  },
  {
    id: "cancer-start",
    longitude: 90,
    expectedSign: "cancer",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 90,
    shouldBeBoundary: true,
  },
  {
    id: "leo-start",
    longitude: 120,
    expectedSign: "leo",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 120,
    shouldBeBoundary: true,
  },
  {
    id: "virgo-start",
    longitude: 150,
    expectedSign: "virgo",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 150,
    shouldBeBoundary: true,
  },
  {
    id: "libra-start",
    longitude: 180,
    expectedSign: "libra",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 180,
    shouldBeBoundary: true,
  },
  {
    id: "scorpio-start",
    longitude: 210,
    expectedSign: "scorpio",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 210,
    shouldBeBoundary: true,
  },
  {
    id: "sagittarius-start",
    longitude: 240,
    expectedSign: "sagittarius",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 240,
    shouldBeBoundary: true,
  },
  {
    id: "capricorn-start",
    longitude: 270,
    expectedSign: "capricorn",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 270,
    shouldBeBoundary: true,
  },
  {
    id: "aquarius-start",
    longitude: 300,
    expectedSign: "aquarius",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 300,
    shouldBeBoundary: true,
  },
  {
    id: "pisces-start",
    longitude: 330,
    expectedSign: "pisces",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 330,
    shouldBeBoundary: true,
  },
  {
    id: "wrap-360-to-aries",
    longitude: 360,
    expectedSign: "aries",
    expectedDegreeInSign: 0,
    expectedNormalizedLongitude: 0,
    shouldBeBoundary: true,
  },
  {
    id: "negative-one-degree-to-pisces",
    longitude: -1,
    expectedSign: "pisces",
    expectedDegreeInSign: 29,
    expectedNormalizedLongitude: 359,
    shouldBeBoundary: false,
  },
  {
    id: "large-longitude-normalization",
    longitude: 765,
    expectedSign: "taurus",
    expectedDegreeInSign: 15,
    expectedNormalizedLongitude: 45,
    shouldBeBoundary: false,
  },
];

export function runZodiacQaFixtures(): string[] {
  const failures: string[] = [];

  if (ZODIAC_SIGN_IDS.length !== 12) {
    failures.push(`Expected 12 zodiac signs, received ${ZODIAC_SIGN_IDS.length}`);
  }

  for (const fixture of zodiacQaFixtures) {
    const sign = getTropicalZodiacSignFromLongitude(fixture.longitude);
    const position = getZodiacPosition(fixture.longitude);
    const degreeInSign = getDegreeWithinZodiacSign(fixture.longitude);
    const normalizedLongitude = normalizeEclipticLongitude(fixture.longitude);
    const boundary = isZodiacBoundaryLongitude(fixture.longitude);

    if (sign.id !== fixture.expectedSign) {
      failures.push(`${fixture.id}: sign ${sign.id} !== ${fixture.expectedSign}`);
    }

    if (position.sign.id !== fixture.expectedSign) {
      failures.push(
        `${fixture.id}: position sign ${position.sign.id} !== ${fixture.expectedSign}`,
      );
    }

    if (!nearlyEqual(degreeInSign, fixture.expectedDegreeInSign)) {
      failures.push(
        `${fixture.id}: degree ${degreeInSign} !== ${fixture.expectedDegreeInSign}`,
      );
    }

    if (!nearlyEqual(normalizedLongitude, fixture.expectedNormalizedLongitude)) {
      failures.push(
        `${fixture.id}: normalized ${normalizedLongitude} !== ${fixture.expectedNormalizedLongitude}`,
      );
    }

    if (boundary !== fixture.shouldBeBoundary) {
      failures.push(
        `${fixture.id}: boundary ${boundary} !== ${fixture.shouldBeBoundary}`,
      );
    }
  }

  const formatted = formatZodiacPosition(45, 1);
  if (formatted !== "15.0 taurus") {
    failures.push(`format-zodiac-position: ${formatted} !== 15.0 taurus`);
  }

  return failures;
}

function nearlyEqual(left: number, right: number, epsilon = 0.000001): boolean {
  return Math.abs(left - right) <= epsilon;
}
