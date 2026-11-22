/**
 * Vedic D1 lunar mansion names in canonical sidereal order, starting at 0° Aries.
 * Indian/Roman sequence: Government of India's Rashtriya Panchang
 * https://packolkata.imd.gov.in/panchang/en/nakshatra_division
 * Persian spellings are editorial transliterations; see docs/VEDIC_D1_PROGRESS.md.
 * The 27 equal *divisions* are not the varying principal-star longitudes on
 * the cited page. Use the already calculated Moon longitude for membership.
 */
import type { VedicD1Nakshatra } from './vedic-d1-contract.ts';
import { classifyVedicMoon } from './vedic-d1-assembly.ts';

export const VEDIC_D1_NAKSHATRA_CATALOG_VERSION = 'vedic-d1-nakshatra-catalog/1' as const;

/** IDs must be stable for saved-report references; labels are user-facing. */
export const VEDIC_D1_NAKSHATRAS = [
  { id: 'ashwini', nameEn: 'Ashwini', nameFa: 'آشوینی' },
  { id: 'bharani', nameEn: 'Bharani', nameFa: 'بهارانی' },
  { id: 'krittika', nameEn: 'Krittika', nameFa: 'کریتیکا' },
  { id: 'rohini', nameEn: 'Rohini', nameFa: 'روهینی' },
  { id: 'mrigashira', nameEn: 'Mrigashira', nameFa: 'مریگاشیرا' },
  { id: 'ardra', nameEn: 'Ardra', nameFa: 'آردرا' },
  { id: 'punarvasu', nameEn: 'Punarvasu', nameFa: 'پونارواسو' },
  { id: 'pushya', nameEn: 'Pushya', nameFa: 'پوشیا' },
  { id: 'ashlesha', nameEn: 'Ashlesha', nameFa: 'آشلشا' },
  { id: 'magha', nameEn: 'Magha', nameFa: 'ماگا' },
  { id: 'purva-phalguni', nameEn: 'Purva Phalguni', nameFa: 'پوروا فالگونی' },
  { id: 'uttara-phalguni', nameEn: 'Uttara Phalguni', nameFa: 'اوتارا فالگونی' },
  { id: 'hasta', nameEn: 'Hasta', nameFa: 'هاستا' },
  { id: 'chitra', nameEn: 'Chitra', nameFa: 'چیترا' },
  { id: 'swati', nameEn: 'Swati', nameFa: 'سواتی' },
  { id: 'vishakha', nameEn: 'Vishakha', nameFa: 'ویشاکا' },
  { id: 'anuradha', nameEn: 'Anuradha', nameFa: 'آنورادا' },
  { id: 'jyeshtha', nameEn: 'Jyeshtha', nameFa: 'جیشتا' },
  { id: 'mula', nameEn: 'Mula', nameFa: 'مولا' },
  { id: 'purva-ashadha', nameEn: 'Purva Ashadha', nameFa: 'پوروا آشادا' },
  { id: 'uttara-ashadha', nameEn: 'Uttara Ashadha', nameFa: 'اوتارا آشادا' },
  { id: 'shravana', nameEn: 'Shravana', nameFa: 'شراوانا' },
  { id: 'dhanishta', nameEn: 'Dhanishta', nameFa: 'دانیشتا' },
  { id: 'shatabhisha', nameEn: 'Shatabhisha', nameFa: 'شاتابیشا' },
  { id: 'purva-bhadrapada', nameEn: 'Purva Bhadrapada', nameFa: 'پوروا بهادراپادا' },
  { id: 'uttara-bhadrapada', nameEn: 'Uttara Bhadrapada', nameFa: 'اوتارا بهادراپادا' },
  { id: 'revati', nameEn: 'Revati', nameFa: 'ریواتی' },
] as const;

export type VedicD1NakshatraId = (typeof VEDIC_D1_NAKSHATRAS)[number]['id'];
export type VedicD1NakshatraName = (typeof VEDIC_D1_NAKSHATRAS)[number];

export function getVedicD1NakshatraByIndex(index: number): VedicD1NakshatraName {
  if (!Number.isInteger(index) || index < 0 || index >= VEDIC_D1_NAKSHATRAS.length) {
    throw new Error('VEDIC_D1_NAKSHATRA_INDEX_INVALID');
  }
  return VEDIC_D1_NAKSHATRAS[index];
}

/**
 * Presentation data only. If near an error boundary, withhold categorical
 * claims even though the internal technical calculation remains available.
 * Does not infer membership from star names or rounded degrees.
 */
export function getVedicD1NakshatraDisplay(
  moon: VedicD1Nakshatra,
  uncertainty: { moonNakshatra: boolean; moonPada: boolean },
): { id: VedicD1NakshatraId | null; nameFa: string | null; nameEn: string | null; pada: 1 | 2 | 3 | 4 | null; cautionFa: string | null } {
  if (!moon || !Number.isFinite(moon.moonLongitude) || moon.moonLongitude < 0 || moon.moonLongitude >= 360 ||
      !Number.isInteger(moon.index) || !Number.isInteger(moon.pada) || moon.pada < 1 || moon.pada > 4 ||
      typeof uncertainty?.moonNakshatra !== 'boolean' || typeof uncertainty?.moonPada !== 'boolean') {
    throw new Error('VEDIC_D1_NAKSHATRA_DISPLAY_INPUT_INVALID');
  }
  const assigned = getVedicD1NakshatraByIndex(moon.index);
  // The calculated classification must be self-consistent, not a client-supplied label.
  const expected = classifyVedicMoon(moon.moonLongitude);
  if (expected.index !== moon.index || expected.pada !== moon.pada) {
    throw new Error('VEDIC_D1_NAKSHATRA_CLASSIFICATION_MISMATCH');
  }
  const uncertainName = uncertainty.moonNakshatra;
  const uncertainPada = uncertainName || uncertainty.moonPada;
  return {
    id: uncertainName ? null : assigned.id,
    nameFa: uncertainName ? null : assigned.nameFa,
    nameEn: uncertainName ? null : assigned.nameEn,
    pada: uncertainPada ? null : moon.pada,
    cautionFa: uncertainName
      ? 'جایگاه ماه نزدیک مرز ناکشاتراست؛ تعیین نام قطعی نیست.'
      : uncertainPada
        ? 'پادای ماه نزدیک مرز است؛ تعیین پادای قطعی نیست.'
        : null,
  };
}
