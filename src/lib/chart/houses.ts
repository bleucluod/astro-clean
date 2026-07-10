import {
  ZODIAC_SIGN_SIZE_DEGREES,
  getTropicalZodiacSignFromLongitude,
  normalizeEclipticLongitude,
} from "./zodiac";

export const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type HouseNumber = (typeof HOUSE_NUMBERS)[number];

export type HouseSystemId =
  | "whole-sign"
  | "equal-house"
  | "placidus"
  | "placeholder";

export const PLACIDUS_HOUSE_CONTRACT_VERSION = "0.1.284a" as const;

export type ChartHouse = {
  number: HouseNumber;
  cuspLongitude: number;
  signId: string;
  system: HouseSystemId;
};

export type HouseAssignment = {
  house: HouseNumber;
  system: HouseSystemId;
  cuspLongitude: number;
  distanceFromCusp: number;
};

export function normalizeHouseNumber(house: number): HouseNumber {
  if (!Number.isFinite(house)) {
    throw new TypeError(`Expected finite house number. Received: ${house}`);
  }

  const normalized = ((((Math.trunc(house) - 1) % 12) + 12) % 12) + 1;

  return normalized as HouseNumber;
}

export function getWholeSignFirstHouseCusp(ascendantLongitude: number): number {
  const ascendantSign = getTropicalZodiacSignFromLongitude(ascendantLongitude);

  return ascendantSign.startDegree;
}

export function buildWholeSignHouses(ascendantLongitude: number): ChartHouse[] {
  return buildHouseCusps(
    getWholeSignFirstHouseCusp(ascendantLongitude),
    "whole-sign",
  );
}

export function buildEqualHouseCusps(firstHouseCuspLongitude: number): ChartHouse[] {
  return buildHouseCusps(firstHouseCuspLongitude, "equal-house");
}

export function buildPlacidusHouses(
  cuspLongitudes: readonly number[],
): ChartHouse[] {
  if (cuspLongitudes.length !== HOUSE_NUMBERS.length) {
    throw new Error(
      `Expected 12 Placidus cusps. Received: ${cuspLongitudes.length}`,
    );
  }

  const normalizedCusps = cuspLongitudes.map((cuspLongitude, index) => {
    if (!Number.isFinite(cuspLongitude)) {
      throw new TypeError(
        `Expected finite Placidus cusp at index ${index}. Received: ${cuspLongitude}`,
      );
    }

    return normalizeEclipticLongitude(cuspLongitude);
  });

  const totalSpan = normalizedCusps.reduce((sum, cuspLongitude, index) => {
    const nextCusp = normalizedCusps[(index + 1) % normalizedCusps.length];
    const span = normalizeEclipticLongitude(nextCusp - cuspLongitude);

    if (span <= 0) {
      throw new Error(`Invalid Placidus cusp order at house ${index + 1}.`);
    }

    return sum + span;
  }, 0);

  if (Math.abs(totalSpan - 360) > 0.000001) {
    throw new Error(
      `Placidus cusps must complete exactly one zodiac cycle. Received span: ${totalSpan}`,
    );
  }

  return HOUSE_NUMBERS.map((number, index) => {
    const cuspLongitude = normalizedCusps[index];
    const sign = getTropicalZodiacSignFromLongitude(cuspLongitude);

    return {
      number,
      cuspLongitude,
      signId: sign.id,
      system: "placidus",
    };
  });
}

export function buildPlaceholderHouses(): ChartHouse[] {
  return buildHouseCusps(0, "placeholder");
}

export function getHouseNumberFromCusps(
  longitude: number,
  houses: readonly ChartHouse[],
): HouseNumber {
  assertHouseCoverage([...houses]);

  const orderedHouses = [...houses].sort((left, right) => left.number - right.number);
  const normalizedLongitude = normalizeEclipticLongitude(longitude);

  for (let index = 0; index < orderedHouses.length; index += 1) {
    const currentHouse = orderedHouses[index];
    const nextHouse = orderedHouses[(index + 1) % orderedHouses.length];
    const span = normalizeEclipticLongitude(
      nextHouse.cuspLongitude - currentHouse.cuspLongitude,
    );
    const distanceFromCusp = normalizeEclipticLongitude(
      normalizedLongitude - currentHouse.cuspLongitude,
    );

    if (distanceFromCusp < span) {
      return currentHouse.number;
    }
  }

  throw new Error(
    `Could not assign longitude ${normalizedLongitude} to supplied house cusps.`,
  );
}

export function assignHouseToCusps(
  longitude: number,
  houses: readonly ChartHouse[],
  system: HouseSystemId = "placidus",
): HouseAssignment {
  const house = getHouseNumberFromCusps(longitude, houses);
  const matchedHouse = houses.find((candidate) => candidate.number === house);

  if (!matchedHouse) {
    throw new Error(`Missing cusp for assigned house ${house}.`);
  }

  const normalizedLongitude = normalizeEclipticLongitude(longitude);
  const cuspLongitude = normalizeEclipticLongitude(matchedHouse.cuspLongitude);

  return {
    house,
    system,
    cuspLongitude,
    distanceFromCusp: normalizeEclipticLongitude(
      normalizedLongitude - cuspLongitude,
    ),
  };
}

export function getHouseNumberFromLongitude(
  longitude: number,
  firstHouseCuspLongitude: number,
): HouseNumber {
  const normalizedLongitude = normalizeEclipticLongitude(longitude);
  const normalizedCusp = normalizeEclipticLongitude(firstHouseCuspLongitude);
  const distanceFromFirstHouse = normalizeEclipticLongitude(
    normalizedLongitude - normalizedCusp,
  );
  const houseIndex = Math.floor(distanceFromFirstHouse / ZODIAC_SIGN_SIZE_DEGREES);

  return normalizeHouseNumber(houseIndex + 1);
}

export function assignHouseToLongitude(
  longitude: number,
  firstHouseCuspLongitude: number,
  system: HouseSystemId = "equal-house",
): HouseAssignment {
  const house = getHouseNumberFromLongitude(longitude, firstHouseCuspLongitude);
  const cuspLongitude = getHouseCuspLongitude(firstHouseCuspLongitude, house);
  const distanceFromCusp = normalizeEclipticLongitude(
    normalizeEclipticLongitude(longitude) - cuspLongitude,
  );

  return {
    house,
    system,
    cuspLongitude,
    distanceFromCusp,
  };
}

export function getHouseCuspLongitude(
  firstHouseCuspLongitude: number,
  house: HouseNumber,
): number {
  const houseOffset = (house - 1) * ZODIAC_SIGN_SIZE_DEGREES;

  return normalizeEclipticLongitude(firstHouseCuspLongitude + houseOffset);
}

export function isSupportedHouseSystem(system: string): system is HouseSystemId {
  return (
    system === "whole-sign" ||
    system === "equal-house" ||
    system === "placidus" ||
    system === "placeholder"
  );
}

export function describeHouseSystem(system: HouseSystemId): string {
  if (system === "whole-sign") {
    return "Whole sign houses foundation. Uses the Ascendant sign as the first house sign.";
  }

  if (system === "equal-house") {
    return "Equal house foundation. Uses 30-degree houses from a supplied first-house cusp.";
  }

  if (system === "placidus") {
    return "Placidus house contract. Uses a validated array of twelve unequal house cusps.";
  }

  return "Placeholder houses. Used only until birth place and house calculation are production-ready.";
}

export function assertHouseCoverage(houses: ChartHouse[]): void {
  if (houses.length !== HOUSE_NUMBERS.length) {
    throw new Error(`Expected 12 houses. Received: ${houses.length}`);
  }

  const seen = new Set<number>();

  for (const house of houses) {
    if (seen.has(house.number)) {
      throw new Error(`Duplicate house number: ${house.number}`);
    }

    seen.add(house.number);
  }
}

function buildHouseCusps(
  firstHouseCuspLongitude: number,
  system: HouseSystemId,
): ChartHouse[] {
  const firstCusp = normalizeEclipticLongitude(firstHouseCuspLongitude);

  return HOUSE_NUMBERS.map((number) => {
    const cuspLongitude = getHouseCuspLongitude(firstCusp, number);
    const sign = getTropicalZodiacSignFromLongitude(cuspLongitude);

    return {
      number,
      cuspLongitude,
      signId: sign.id,
      system,
    };
  });
}
