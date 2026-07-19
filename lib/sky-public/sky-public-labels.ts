import type {
  SkyDailyAspectKind,
  SkyDailyBodyId,
  SkyDailyMotionState,
  SkyDailyZodiacSign,
} from "@/lib/sky-daily/sky-daily-contract";

export const SKY_BODY_LABELS: Record<SkyDailyBodyId, string> = {
  sun: "خورشید", moon: "ماه", mercury: "عطارد", venus: "زهره", mars: "مریخ",
  jupiter: "مشتری", saturn: "زحل", uranus: "اورانوس", neptune: "نپتون", pluto: "پلوتو",
};

export const SKY_BODY_SYMBOLS: Record<SkyDailyBodyId, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂",
  jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇",
};

export const SKY_SIGN_LABELS: Record<SkyDailyZodiacSign, string> = {
  aries: "حمل", taurus: "ثور", gemini: "جوزا", cancer: "سرطان", leo: "اسد", virgo: "سنبله",
  libra: "میزان", scorpio: "عقرب", sagittarius: "قوس", capricorn: "جدی", aquarius: "دلو", pisces: "حوت",
};

export const SKY_SIGN_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;

export const SKY_ASPECT_LABELS: Record<SkyDailyAspectKind, string> = {
  conjunction: "هم‌نشینی", sextile: "تسدیس", square: "مربع", trine: "تثلیث", opposition: "مقابله",
};

export const SKY_MOTION_LABELS: Record<SkyDailyMotionState, string> = {
  direct: "مستقیم", retrograde: "برگشتی", stationing: "در آستانهٔ تغییر جهت",
};
