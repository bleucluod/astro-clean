import { normalizePersianDigits, parseJalaliDateInput } from '@/lib/date/jalali';
import type { ShopProductId } from '@/components/shop/product-detail-data';

type ShopMomentInput = {
  calendar: 'jalali' | 'gregorian';
  date: string;
  time: string;
  city: string;
};

export type ShopMomentValidation =
  | { ok: true; gregorianIso: string | null }
  | { ok: false; message: string };

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
  if (productId === 'p02' && !input.city.trim()) {
    return { ok: false, message: 'برای آسمان تولد، شهر تولد هم ضروری است.' };
  }
  return { ok: true, gregorianIso };
}
