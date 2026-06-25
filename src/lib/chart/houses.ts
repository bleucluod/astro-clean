import {
  ZODIAC_SIGN_SIZE_DEGREES,
  getTropicalZodiacSignFromLongitude,
  normalizeEclipticLongitude,
} from "./zodiac";

export const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type HouseNumber = (typeof HOUSE_NUMBERS)[number];

export type HouseSystemId = "whole-sign" | "equal-house" | "placeholder";

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

export function buildPlaceholderHouses(): ChartHouse[] {
  return buildHouseCusps(0, "placeholder");
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
  return system === "whole-sign" || system === "equal-house" || system === "placeholder";
}

export function describeHouseSystem(system: HouseSystemId): string {
  if (system === "whole-sign") {
    return "Whole sign houses foundation. Uses the Ascendant sign as the first house sign.";
  }

  if (system === "equal-house") {
    return "Equal house foundation. Uses 30-degree houses from a supplied first-house cusp.";
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
