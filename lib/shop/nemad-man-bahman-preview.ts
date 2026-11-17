import * as Astronomy from 'astronomy-engine';
import figures from './catalog/constellations-d3-celestial-v1.json';
import brightStars from './catalog/bsc5-bright-stars-mag6.json';
import { parseJalaliDateInput, normalizePersianDigits } from '@/lib/date/jalali';
import { findHalleusCityById } from '@/lib/locations/cities';
import { resolveShopCivilTimeUtc } from './shop-civil-time';
import { getTropicalZodiacSignFromLongitude, type ZodiacSignId } from '@/src/lib/chart/zodiac';

export type NemadSign = {
  id: ZodiacSignId;
  fa: string;
  displayFa: string;
  en: string;
  glyph: string;
  figure: string;
};

// The sign is determined by the real tropical Sun, not by the Iranian month.
export const NEMAD_SIGNS: readonly NemadSign[] = [
  { id: 'aries', fa: 'حمل', displayFa: 'آریس', en: 'ARIES', glyph: '♈', figure: 'Ari' },
  { id: 'taurus', fa: 'ثور', displayFa: 'تارس', en: 'TAURUS', glyph: '♉', figure: 'Tau' },
  { id: 'gemini', fa: 'جوزا', displayFa: 'جمینای', en: 'GEMINI', glyph: '♊', figure: 'Gem' },
  { id: 'cancer', fa: 'سرطان', displayFa: 'کنسر', en: 'CANCER', glyph: '♋', figure: 'Cnc' },
  { id: 'leo', fa: 'اسد', displayFa: 'لئو', en: 'LEO', glyph: '♌', figure: 'Leo' },
  { id: 'virgo', fa: 'سنبله', displayFa: 'ویرگو', en: 'VIRGO', glyph: '♍', figure: 'Vir' },
  { id: 'libra', fa: 'میزان', displayFa: 'لیبرا', en: 'LIBRA', glyph: '♎', figure: 'Lib' },
  { id: 'scorpio', fa: 'عقرب', displayFa: 'اسکورپیو', en: 'SCORPIO', glyph: '♏', figure: 'Sco' },
  { id: 'sagittarius', fa: 'قوس', displayFa: 'سجیتریس', en: 'SAGITTARIUS', glyph: '♐', figure: 'Sgr' },
  { id: 'capricorn', fa: 'جدی', displayFa: 'کپریکورن', en: 'CAPRICORN', glyph: '♑', figure: 'Cap' },
  { id: 'aquarius', fa: 'دلو', displayFa: 'آکواریوس', en: 'AQUARIUS', glyph: '♒', figure: 'Aqr' },
  { id: 'pisces', fa: 'حوت', displayFa: 'پایسیز', en: 'PISCES', glyph: '♓', figure: 'Psc' },
];

const SIGN_BY_ID = new Map(NEMAD_SIGNS.map((sign) => [sign.id, sign]));
export const BAHMAN_SIGN = SIGN_BY_ID.get('aquarius')!;

export type BahmanPreview = {
  name: string;
  date: string;
  gregorianDate: string;
  sign: NemadSign;
  exactInstant: boolean;
};
export type BahmanPreviewResult =
  | { ok: true; value: BahmanPreview }
  | { ok: false; reason: 'invalid' | 'needs-birth-details'; message: string };

export function getSunSignAt(isoInstant: string): NemadSign {
  // Identical astronomical method used in the existing Halleus chart engine:
  // apparent geocentric solar vector -> ecliptic longitude -> tropical zodiac.
  const time = new Astronomy.AstroTime(new Date(isoInstant));
  const longitude = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, time, true)).elon;
  const id = getTropicalZodiacSignFromLongitude(longitude).id;
  const sign = SIGN_BY_ID.get(id);
  if (!sign) throw new Error('Unsupported zodiac sign: ' + id);
  return sign;
}

/** Date-only certainty holds for every world timezone, from UTC+14 to UTC-12.
 * If the Sun changes sign anywhere across that conservative range, request
 * exact birth time and city instead of guessing from a calendar month. */
export function getCertainSignForBirthDate(gregorianIso: string): NemadSign | null {
  const start = Date.parse(gregorianIso + 'T00:00:00.000Z');
  const first = getSunSignAt(new Date(start - 14 * 3600000).toISOString());
  const last = getSunSignAt(new Date(start + 36 * 3600000).toISOString());
  return first.id === last.id ? first : null;
}

function safeName(input: string) {
  const name = input.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name || Array.from(name).length > 28 ||
      /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\ufeff\ufffe\uffff]/u.test(name) ||
      /[<>]/u.test(name)) return null;
  return name;
}

/** The Bahman shop landing may show a different sign automatically.
 * No approval dialog or request outside the browser is necessary. */
export function validateBahmanPreview(
  nameInput: string, dateInput: string, details?: { time?: string; cityId?: string },
): BahmanPreviewResult {
  const name = safeName(nameInput);
  if (!name) return { ok: false, reason: 'invalid', message: 'نام را کوتاه و بدون نویسه‌های غیرمجاز وارد کن.' };
  const parsed = parseJalaliDateInput(dateInput);
  if (!parsed.ok) return { ok: false, reason: 'invalid', message: parsed.message };
  // This is the first entry point for Bahman, but other input months must not
  // be silently rejected: selection comes only from the solar longitude.
  const certain = getCertainSignForBirthDate(parsed.gregorianIso);
  let sign = certain;
  let exactInstant = false;
  if (!certain) {
    const time = normalizePersianDigits(details?.time || '').trim();
    const city = findHalleusCityById(details?.cityId || '');
    if (!time || !city) return {
      ok: false, reason: 'needs-birth-details',
      message: 'این تاریخ نزدیک مرز دو برج است. برای تشخیص دقیق، ساعت و شهر تولد را وارد کن.',
    };
    const resolved = resolveShopCivilTimeUtc(parsed.gregorianIso, time, city.timezone);
    if (resolved.status !== 'resolved') return {
      ok: false, reason: 'needs-birth-details',
      message: resolved.status === 'ambiguous'
        ? 'این ساعت در شهر انتخاب‌شده تکرار شده؛ برای انتخاب دقیق‌تر با پشتیبانی هماهنگ کن.'
        : 'ساعت و شهر تولد با تاریخ انتخابی سازگار نیستند؛ دوباره بررسی کن.',
    };
    sign = getSunSignAt(resolved.utcIso);
    exactInstant = true;
  }
  if (!sign) throw new Error('Could not determine solar sign safely.');
  const date = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(parsed.gregorianIso + 'T12:00:00Z')).replace(/\u0654/g, '');
  return { ok: true, value: { name, date: parsed.normalizedJalali, gregorianDate: date, sign, exactInstant } };
}

export type PosterPoint = { x: number; y: number };
export type PosterStar = PosterPoint & { radius: number; opacity: number; prominent: boolean };
export type PosterSky = { paths: PosterPoint[][]; nodes: PosterStar[]; stars: PosterStar[]; source: string };

const SKY_CENTER = { x: 450, y: 358 } as const;
const SKY_RADIUS = 294;
const BSC = brightStars.stars;
const POSTER_SKY_CACHE = new Map<ZodiacSignId, PosterSky>();
if (brightStars.meta.count !== 5080 || BSC.length !== brightStars.meta.count * 4) {
  throw new Error('Unexpected sourced bright star catalogue shape.');
}

function wrapRa(ra: number, reference: number) {
  return reference + ((((ra - reference) + 540) % 360) + 360) % 360 - 180;
}

/** Decorative view is a north-up/east-left J2000 tangent approximation.
 * It is a faithful *constellation figure*, NOT the night sky above a birthplace. */
export function getNemadPosterSky(sign: NemadSign): PosterSky {
  const cached = POSTER_SKY_CACHE.get(sign.id);
  if (cached) return cached;
  const feature = figures.features.find((item) => item.id === sign.figure);
  if (!feature || feature.geometry.type !== 'MultiLineString') {
    throw new Error('Missing sourced figure geometry: ' + sign.figure);
  }
  const sourcePaths = feature.geometry.coordinates;
  const sourceNodes = sourcePaths.flat();
  if (sourcePaths.length === 0 || sourceNodes.some((point) => point.length !== 2 || point.some((n) => !Number.isFinite(n)))) {
    throw new Error('Invalid sourced constellation geometry.');
  }
  const anchorRa = sourceNodes[0][0];
  const source = sourceNodes.map(([ra, dec]) => [wrapRa(ra, anchorRa), dec] as const);
  const ras = source.map((point) => point[0]);
  const decs = source.map((point) => point[1]);
  const centerRa = (Math.min(...ras) + Math.max(...ras)) / 2;
  const centerDec = (Math.min(...decs) + Math.max(...decs)) / 2;
  const cosDec = Math.cos(centerDec * Math.PI / 180);
  const halfWidth = Math.max(...source.map(([ra]) => Math.abs((ra - centerRa) * cosDec)));
  const halfHeight = Math.max(...source.map(([,dec]) => Math.abs(dec - centerDec)));
  const scale = Math.min(14, 224 / Math.hypot(halfWidth, halfHeight));
  const project = (ra: number, dec: number) => ({
    x: SKY_CENTER.x - (wrapRa(ra, centerRa) - centerRa) * cosDec * scale,
    y: SKY_CENTER.y - (dec - centerDec) * scale,
  });
  const paths = sourcePaths.map((path) => path.map(([ra, dec]) => project(ra, dec)));
  const realStars: PosterStar[] = [];
  for (let index = 0; index < BSC.length; index += 4) {
    const ra = BSC[index], dec = BSC[index+1], mag = BSC[index+2];
    if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag) || mag > 6) continue;
    const point = project(ra, dec);
    const d = Math.hypot(point.x - SKY_CENTER.x, point.y - SKY_CENTER.y);
    if (d > SKY_RADIUS - 5) continue;
    const luminance = Math.max(0, (6 - mag) / 6);
    realStars.push({ ...point,
      radius: Math.min(4.25, Math.max(.8, .83 + 2.8 * Math.pow(luminance, 1.8))),
      opacity: Math.min(.96, .36 + .64 * Math.pow(luminance, .7)),
      prominent: mag <= 2.4,
    });
  }
  // Repeated vertices at segment joins are rendered only once.
  const unique = new Set<string>();
  const nodes = sourceNodes.flatMap(([ra, dec]) => {
    const key = `${ra.toFixed(4)},${dec.toFixed(4)}`;
    if (unique.has(key)) return [];
    unique.add(key);
    let nearest = { distance: Infinity, mag: 6 };
    for (let index = 0; index < BSC.length; index += 4) {
      const dra = (wrapRa(BSC[index], ra) - ra) * Math.cos(dec * Math.PI / 180);
      const ddec = BSC[index+1] - dec;
      const distance = Math.hypot(dra, ddec);
      if (distance < nearest.distance) nearest = { distance, mag: BSC[index+2] };
    }
    const mag = nearest.distance < .38 ? nearest.mag : 4.5;
    const glow = Math.max(0, (6 - mag) / 6);
    return [{ ...project(ra, dec), radius: 2.3 + 5.1 * Math.pow(glow, 1.6), opacity: 1, prominent: mag < 2.4 }];
  });
  const sky = { paths, nodes, stars: realStars, source: 'D3-Celestial J2000 figure + Yale Bright Star Catalogue V/50 (north-up, east-left)' };
  POSTER_SKY_CACHE.set(sign.id, sky);
  return sky;
}
