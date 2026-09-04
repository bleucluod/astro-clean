import type { ZodiacKey, ZodiacSign } from "@/types/astro";

export type ZodiacLabelStyle = "inline" | "stacked";

type ZodiacLabel = {
  faName: string;
  enName: string;
  aliases?: string[];
};

export const ZODIAC_LABELS: Record<ZodiacKey, ZodiacLabel> = {
  aries: { faName: "اریس", enName: "Aries" },
  taurus: { faName: "تارس", enName: "Taurus" },
  gemini: { faName: "جمنای", enName: "Gemini" },
  cancer: { faName: "کنسر", enName: "Cancer" },
  leo: { faName: "لئو", enName: "Leo" },
  virgo: { faName: "ویرگو", enName: "Virgo" },
  libra: { faName: "لیبرا", enName: "Libra" },
  scorpio: { faName: "اسکورپیو", enName: "Scorpio" },
  sagittarius: { faName: "سجتریس", enName: "Sagittarius" },
  capricorn: { faName: "کپریکورن", enName: "Capricorn" },
  aquarius: { faName: "آکواریوس", enName: "Aquarius" },
  pisces: { faName: "پایسیز", enName: "Pisces" },
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

function formatZodiacFaLabel(label: ZodiacLabel): string {
  return label.aliases?.length
    ? `${label.faName} / ${label.aliases.join(" / ")}`
    : label.faName;
}

export function formatZodiacLabel(
  signId: ZodiacKey,
  style: ZodiacLabelStyle = "inline",
): string {
  const label = ZODIAC_LABELS[signId];
  const faLabel = formatZodiacFaLabel(label);

  return style === "stacked" ? `${faLabel}
${label.enName}` : `${faLabel} (${label.enName})`;
}

export function formatZodiacSign(sign: ZodiacSign): string {
  const label = ZODIAC_LABELS[sign.key];
  return `${label.faName} (${label.enName})`;
}

export function zodiacSignFromLongitude(longitude: number): ZodiacKey {
  const normalized = normalizeLongitude(longitude);
  const index = Math.floor(normalized / 30) % ZODIAC_SIGN_ORDER.length;

  return ZODIAC_SIGN_ORDER[index];
}

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}
