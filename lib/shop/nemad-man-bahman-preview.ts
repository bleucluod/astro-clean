import constellationFigures from './catalog/constellations-d3-celestial-v1.json';
import { parseJalaliDateInput } from '@/lib/date/jalali';

export type BahmanPreview = { name: string; date: string; gregorianDate: string };
export type BahmanPreviewResult = { ok: true; value: BahmanPreview } | { ok: false; message: string };

/** Sourced D3-Celestial J2000 line figures (BSD-3-Clause), not the sky at someone's birth. */
const aquarius = constellationFigures.features.find((feature) => feature.id === 'Aqr');
if (!aquarius || aquarius.geometry.type !== 'MultiLineString' || aquarius.geometry.coordinates.length !== 5) {
  throw new Error('Approved Aquarius source geometry was not found in the shop catalogue.');
}

const paths = aquarius.geometry.coordinates;
const points = paths.flatMap((path) => path);
if (points.some((point) => point.length !== 2 || !point.every(Number.isFinite))) {
  throw new Error('Aquarius source geometry has invalid coordinates.');
}

// An equirectangular, uniform-scale illustration of the sourced RA/Dec lines,
// deliberately independent from date, place and hour of birth.
const centerRa = (Math.min(...points.map((p) => p[0])) + Math.max(...points.map((p) => p[0]))) / 2;
const centerDec = (Math.min(...points.map((p) => p[1])) + Math.max(...points.map((p) => p[1]))) / 2;
const projected = (ra: number, dec: number) => ({
  x: 450 + (ra - centerRa) * 10.3 * Math.cos(centerDec * Math.PI / 180),
  y: 375 - (dec - centerDec) * 10.3,
});
export const BAHMAN_CONSTELLATION = paths.map((path) => path.map(([ra, dec]) => projected(ra, dec)));

/** Decorative background stars, stable across rerenders; never a claimed natal sky. */
export const BAHMAN_DECORATIVE_STARS = Array.from({ length: 100 }, (_, index) => {
  const angle = index * 2.399963229728653;
  const radius = 284 * Math.sqrt((index + 0.42) / 100);
  return {
    x: 450 + Math.cos(angle) * radius,
    y: 375 + Math.sin(angle) * radius,
    r: index % 13 === 0 ? 2.1 : index % 6 === 0 ? 1.4 : 0.85,
  };
});

export function validateBahmanPreview(nameInput: string, dateInput: string): BahmanPreviewResult {
  const name = nameInput.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name || Array.from(name).length > 28 || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\ufeff\ufffe\uffff]/u.test(name)) {
    return { ok: false, message: 'نام را با حداکثر ۲۸ حرف و بدون نویسه‌های کنترلی وارد کن.' };
  }
  const parsed = parseJalaliDateInput(dateInput);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  if (parsed.jalaliMonth !== 11) {
    return { ok: false, message: 'این پیش‌نمایش فعلاً مخصوص متولدین بهمن است؛ تاریخ شمسیِ بهمن وارد کن.' };
  }
  const gregorian = new Date(parsed.gregorianIso + 'T12:00:00.000Z');
  const formatted = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  }).format(gregorian);
  return { ok: true, value: { name, date: parsed.normalizedJalali, gregorianDate: formatted } };
}
