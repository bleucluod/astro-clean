import type { ZodiacKey, ZodiacSign } from "@/types/astro";

export const zodiacSigns: ZodiacSign[] = [
  { key: "aries", faName: "حمل", enName: "Aries", element: "آتش", quality: "کاردینال" },
  { key: "taurus", faName: "ثور", enName: "Taurus", element: "زمین", quality: "ثابت" },
  { key: "gemini", faName: "جوزا", enName: "Gemini", element: "هوا", quality: "متغیر" },
  { key: "cancer", faName: "سرطان", enName: "Cancer", element: "آب", quality: "کاردینال" },
  { key: "leo", faName: "اسد", enName: "Leo", element: "آتش", quality: "ثابت" },
  { key: "virgo", faName: "سنبله", enName: "Virgo", element: "زمین", quality: "متغیر" },
  { key: "libra", faName: "میزان", enName: "Libra", element: "هوا", quality: "کاردینال" },
  { key: "scorpio", faName: "عقرب", enName: "Scorpio", element: "آب", quality: "ثابت" },
  { key: "sagittarius", faName: "قوس", enName: "Sagittarius", element: "آتش", quality: "متغیر" },
  { key: "capricorn", faName: "جدی", enName: "Capricorn", element: "زمین", quality: "کاردینال" },
  { key: "aquarius", faName: "دلو", enName: "Aquarius", element: "هوا", quality: "ثابت" },
  { key: "pisces", faName: "حوت", enName: "Pisces", element: "آب", quality: "متغیر" },
];

export function getZodiacByIndex(index: number): ZodiacSign {
  const safeIndex = Math.abs(index) % zodiacSigns.length;
  return zodiacSigns[safeIndex];
}

export function getZodiacByKey(key: ZodiacKey): ZodiacSign {
  return zodiacSigns.find((sign) => sign.key === key) ?? zodiacSigns[0];
}
