import { normalizePersianDigits, parseJalaliDateInput } from '@/lib/date/jalali';
import type { ShopProductId } from '@/components/shop/product-detail-data';
import { HALLEUS_CITY_OPTIONS, findHalleusCityById, getHalleusCityDisplayName, normalizeHalleusCitySearch } from '@/lib/locations/cities';
import { resolveShopCivilTimeUtc } from './shop-civil-time';

type ShopMomentInput = {
  calendar: 'jalali' | 'gregorian';
  date: string;
  time: string;
  city: string;
  cityId?: string;
};

export type ShopMomentValidation =
  | { ok: true; gregorianIso: string | null; referenceUtc: string | null }
  | { ok: false; message: string };

/** Only migrate a legacy text-only cart value if it identifies exactly one city. */
export function matchUniqueShopBirthCity(text: string) {
  const normalized = normalizeHalleusCitySearch(text);
  if (!normalized) return null;
  const matches = HALLEUS_CITY_OPTIONS.filter((city) => [
    city.faName, getHalleusCityDisplayName(city), ...city.aliases,
  ].some((name) => normalizeHalleusCitySearch(name) === normalized));
  return matches.length === 1 ? matches[0] : null;
}

function parseGregorianDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString().slice(0, 10) !== value) return null;
  return value;
}

/**
 * Shared client/server input boundary. This only normalizes a civil date;
 * choosing the exact UTC instant for astronomical art is a separate decision.
 */
export function validateShopMoment(productId: ShopProductId, input: ShopMomentInput): ShopMomentValidation {
  if (input.calendar !== 'jalali' && input.calendar !== 'gregorian') {
    return { ok: false, message: 'نوع تقویم معتبر نیست.' };
  }
  const date = normalizePersianDigits(input.date).trim();
  if (!date && productId !== 'p03') {
    return { ok: false, message: 'لطفاً تاریخ این لحظه را وارد کن.' };
  }

  let gregorianIso: string | null = null;
  if (date) {
    if (input.calendar === 'jalali') {
      const parsed = parseJalaliDateInput(date);
      if (!parsed.ok) return { ok: false, message: 'تاریخ شمسی معتبر نیست؛ سال، ماه و روز را بررسی کن.' };
      gregorianIso = parsed.gregorianIso;
    } else if (input.calendar === 'gregorian') {
      gregorianIso = parseGregorianDate(date);
      if (!gregorianIso) return { ok: false, message: 'تاریخ میلادی معتبر نیست؛ سال، ماه و روز را بررسی کن.' };
    }
  }

  const time = normalizePersianDigits(input.time).trim();
  if (productId === 'p02' && !time) {
    return { ok: false, message: 'برای آسمان تولد، ساعت تولد هم ضروری است.' };
  }
  if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { ok: false, message: 'ساعت را با قالب ۲۴ساعته و دقیقهٔ معتبر وارد کن.' };
  }
  let referenceUtc: string | null = null;
  if (productId === 'p02') {
    const city = findHalleusCityById(input.cityId ?? '');
    if (!city || normalizeHalleusCitySearch(input.city) !== normalizeHalleusCitySearch(getHalleusCityDisplayName(city))) {
      return { ok: false, message: 'برای محاسبهٔ آسمان تولد، شهر را از فهرست پیشنهادی انتخاب کن.' };
    }
    const instant = resolveShopCivilTimeUtc(gregorianIso!, time, city.timezone);
    if (instant.status === 'ambiguous') {
      return { ok: false, message: 'این ساعت در شهر انتخابی دو بار اتفاق افتاده؛ لطفاً زمان دقیق را با پشتیبانی هماهنگ کن.' };
    }
    if (instant.status !== 'resolved') {
      return { ok: false, message: 'این ساعت با تاریخ و منطقهٔ زمانی شهر سازگار نیست؛ زمان را بررسی کن.' };
    }
    referenceUtc = instant.utcIso;
  }
  return { ok: true, gregorianIso, referenceUtc };
}
