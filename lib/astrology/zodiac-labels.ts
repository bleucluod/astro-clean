import type { ZodiacKey, ZodiacSign } from "@/types/astro";

export type ZodiacLabelStyle = "inline" | "stacked";

type ZodiacLabel = {
  faName: string;
  enName: string;
};

export const ZODIAC_LABELS: Record<ZodiacKey, ZodiacLabel> = {
  aries: { faName: "حمل", enName: "Aries" },
  taurus: { faName: "ثور", enName: "Taurus" },
  gemini: { faName: "جوزا", enName: "Gemini" },
  cancer: { faName: "سرطان", enName: "Cancer" },
  leo: { faName: "اسد", enName: "Leo" },
  virgo: { faName: "سنبله", enName: "Virgo" },
  libra: { faName: "میزان", enName: "Libra" },
  scorpio: { faName: "عقرب", enName: "Scorpio" },
  sagittarius: { faName: "قوس", enName: "Sagittarius" },
  capricorn: { faName: "جدی", enName: "Capricorn" },
  aquarius: { faName: "دلو", enName: "Aquarius" },
  pisces: { faName: "حوت", enName: "Pisces" },
};

export const ZODIAC_SIGN_ORDER = [
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
] as const satisfies ZodiacKey[];

export function formatZodiacLabel(
  signId: ZodiacKey,
  style: ZodiacLabelStyle = "inline",
): string {
  const label = ZODIAC_LABELS[signId];

  return style === "stacked"
    ? `${label.faName}
${label.enName}`
    : `${label.faName} (${label.enName})`;
}

export function formatZodiacSign(sign: ZodiacSign): string {
  return `${sign.faName} (${sign.enName})`;
}

export function zodiacSignFromLongitude(longitude: number): ZodiacKey {
  const normalized = normalizeLongitude(longitude);
  const index = Math.floor(normalized / 30) % ZODIAC_SIGN_ORDER.length;

  return ZODIAC_SIGN_ORDER[index];
}

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}
