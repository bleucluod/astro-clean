import type {
  SkyDailyAspectKind,
  SkyDailyBodyId,
  SkyDailyMotionState,
  SkyDailyZodiacSign,
} from "@/lib/sky-daily/sky-daily-contract";
import { ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";

export const SKY_BODY_LABELS: Record<SkyDailyBodyId, string> = {
  sun: "خورشید", moon: "ماه", mercury: "عطارد", venus: "زهره", mars: "مریخ",
  jupiter: "مشتری", saturn: "زحل", uranus: "اورانوس", neptune: "نپتون", pluto: "پلوتو",
};

export const SKY_BODY_SYMBOLS: Record<SkyDailyBodyId, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂",
  jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇",
};

export const SKY_SIGN_LABELS: Record<SkyDailyZodiacSign, string> = {
  aries: ZODIAC_LABELS.aries.faName,
  taurus: ZODIAC_LABELS.taurus.faName,
  gemini: ZODIAC_LABELS.gemini.faName,
  cancer: ZODIAC_LABELS.cancer.faName,
  leo: ZODIAC_LABELS.leo.faName,
  virgo: ZODIAC_LABELS.virgo.faName,
  libra: ZODIAC_LABELS.libra.faName,
  scorpio: ZODIAC_LABELS.scorpio.faName,
  sagittarius: ZODIAC_LABELS.sagittarius.faName,
  capricorn: ZODIAC_LABELS.capricorn.faName,
  aquarius: ZODIAC_LABELS.aquarius.faName,
  pisces: ZODIAC_LABELS.pisces.faName,
};

export const SKY_SIGN_ENGLISH_LABELS: Record<SkyDailyZodiacSign, string> = {
  aries: "Aries", taurus: "Taurus", gemini: "Gemini", cancer: "Cancer", leo: "Leo", virgo: "Virgo",
  libra: "Libra", scorpio: "Scorpio", sagittarius: "Sagittarius", capricorn: "Capricorn", aquarius: "Aquarius", pisces: "Pisces",
};

export const SKY_SIGN_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;

export const SKY_ASPECT_LABELS: Record<SkyDailyAspectKind, string> = {
  conjunction: "هم‌نشینی", sextile: "تسدیس", square: "مربع", trine: "تثلیث", opposition: "مقابله",
};

export const SKY_MOTION_LABELS: Record<SkyDailyMotionState, string> = {
  direct: "مستقیم", retrograde: "برگشتی", stationing: "در آستانهٔ تغییر جهت",
};
