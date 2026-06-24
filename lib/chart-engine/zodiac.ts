export const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

export function longitudeToZodiac(longitude: number) {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized % 30;

  return {
    longitude: normalized,
    sign: ZODIAC_SIGNS[signIndex] ?? "Aries",
    degree: Number(degreeInSign.toFixed(2)),
  };
}
