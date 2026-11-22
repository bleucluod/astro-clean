/**
 * Vedic D1 input/output boundary. Intentionally does not call the Western chart
 * builder or accept client-supplied coordinates. The server must resolve cityId
 * against Halleus's known-city directory and supply the existing Jalali parser.
 */
export const VEDIC_D1_CONTRACT_VERSION = 'vedic-d1/v1' as const;
export const VEDIC_D1_CALCULATION = {
  zodiac: 'sidereal',
  ayanamsha: 'lahiri-standard-SE_SIDM_LAHIRI',
  houses: 'whole-sign',
  node: 'mean',
  nakshatraCount: 27,
  padaCount: 4,
  chart: 'D1',
} as const;

export type VedicD1InputIssueCode =
  | 'INPUT_REQUIRED' | 'DATE_INVALID' | 'TIME_REQUIRED' | 'TIME_INVALID'
  | 'CITY_REQUIRED' | 'CITY_UNKNOWN' | 'TIMEZONE_INVALID'
  | 'TIME_NONEXISTENT' | 'TIME_AMBIGUOUS' | 'CALENDAR_INVALID';

export type VedicD1InputIssue = { code: VedicD1InputIssueCode; message: string };
export type VedicD1Calendar = 'jalali' | 'gregorian';
export type VedicD1Occurrence = 'earlier' | 'later';
export type VedicD1BirthRequest = {
  birthDate: string;
  calendar: VedicD1Calendar;
  birthTime: string;
  cityId: string;
  /** Required only when the local clock time occurred twice. */
  occurrence?: VedicD1Occurrence;
};
export type VedicD1City = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};
export type VedicD1ValidatedBirth = {
  contractVersion: typeof VEDIC_D1_CONTRACT_VERSION;
  birthDateGregorian: string;
  birthTime: string;
  sourceCalendar: VedicD1Calendar;
  city: VedicD1City;
  utcIso: string;
  occurrence: VedicD1Occurrence | null;
};
export type VedicD1InputResult =
  | { ok: true; value: VedicD1ValidatedBirth }
  | { ok: false; issue: VedicD1InputIssue };
export type VedicD1JalaliParser = (date: string) =>
  | { ok: true; gregorianIso: string }
  | { ok: false; message: string };
export type VedicD1InputDependencies = {
  findCityById: (cityId: string) => VedicD1City | null;
  parseJalali: VedicD1JalaliParser;
};

export type VedicD1PlacementId =
  | 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus'
  | 'saturn' | 'rahu' | 'ketu';
export type VedicD1Placement = {
  id: VedicD1PlacementId;
  longitude: number;
  signIndex: number; // 0=Aries; 11=Pisces
  degreeInSign: number;
  houseNumber: number; // 1..12 by whole-sign from Lagna
};
export type VedicD1Nakshatra = {
  index: number; // 0..26
  pada: 1 | 2 | 3 | 4;
  moonLongitude: number;
};
export type VedicD1Chart = {
  contractVersion: typeof VEDIC_D1_CONTRACT_VERSION;
  calculation: typeof VEDIC_D1_CALCULATION;
  calculationVersion: string;
  ayanamshaDegrees: number;
  ephemerisSource: string;
  coordinateFrame: string;
  utcIso: string;
  cityId: string;
  ascendantLongitude: number;
  ascendantSignIndex: number;
  placements: VedicD1Placement[];
  nakshatra: VedicD1Nakshatra;
};

const issue = (code: VedicD1InputIssueCode, message: string): VedicD1InputResult =>
  ({ ok: false, issue: { code, message } });

export function normalizeVedicDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function parseGregorian(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

function partsAt(formatter: Intl.DateTimeFormat, ms: number) {
  const fields = Object.fromEntries(
    formatter.formatToParts(new Date(ms))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: fields.year, month: fields.month, day: fields.day,
    hour: fields.hour, minute: fields.minute, second: fields.second,
  };
}

/**
 * Enumerate every possible UTC offset around the requested civil clock time.
 * A simple iterative timezone guess is unsafe during DST gaps/overlaps.
 */
export function resolveVedicCivilTime(
  dateIso: string,
  time: string,
  timezone: string,
  occurrence?: VedicD1Occurrence,
): { ok: true; utcIso: string; occurrence: VedicD1Occurrence | null } | { ok: false; issue: VedicD1InputIssue } {
  const parsedDate = parseGregorian(dateIso);
  if (!parsedDate) return { ok: false, issue: { code: 'DATE_INVALID', message: 'تاریخ تولد معتبر نیست.' } };
  const match = /^(\d{2}):(\d{2})$/.exec(normalizeVedicDigits(time));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
    return { ok: false, issue: { code: 'TIME_INVALID', message: 'ساعت تولد را به شکل ۲۳:۵۹ وارد کن.' } };
  }
  if (occurrence !== undefined && occurrence !== 'earlier' && occurrence !== 'later') {
    return { ok: false, issue: { code: 'TIME_AMBIGUOUS', message: 'انتخاب تکرار ساعت معتبر نیست.' } };
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return { ok: false, issue: { code: 'TIMEZONE_INVALID', message: 'منطقهٔ زمانی شهر تولد معتبر نیست.' } };
  }
  const { year, month, day } = parsedDate;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const candidates = new Set<number>();
  for (let deltaHours = -48; deltaHours <= 48; deltaHours += 2) {
    const sampledUtc = localAsUtc + deltaHours * 3600000;
    const p = partsAt(formatter, sampledUtc);
    const offsetMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - sampledUtc;
    const candidate = localAsUtc - offsetMs;
    const checked = partsAt(formatter, candidate);
    if (checked.year === year && checked.month === month && checked.day === day &&
        checked.hour === hour && checked.minute === minute && checked.second === 0) {
      candidates.add(candidate);
    }
  }
  const matches = [...candidates].sort((a, b) => a - b);
  if (matches.length === 0) {
    return { ok: false, issue: { code: 'TIME_NONEXISTENT', message: 'این ساعت در شهر تولد به دلیل تغییر ساعت رسمی وجود نداشته است؛ ساعت را بررسی کن.' } };
  }
  if (matches.length > 1 && !occurrence) {
    return { ok: false, issue: { code: 'TIME_AMBIGUOUS', message: 'این ساعت در شهر تولد دوبار رخ داده است؛ بار اول یا دوم را انتخاب کن.' } };
  }
  const chosen = occurrence === 'later' ? matches[matches.length - 1] : matches[0];
  return { ok: true, utcIso: new Date(chosen).toISOString(), occurrence: matches.length > 1 ? (occurrence ?? null) : null };
}

export function validateVedicD1BirthRequest(
  value: unknown,
  dependencies: VedicD1InputDependencies,
): VedicD1InputResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return issue('INPUT_REQUIRED', 'اطلاعات تولد را کامل وارد کن.');
  }
  const input = value as Record<string, unknown>;
  if (input.calendar !== 'gregorian' && input.calendar !== 'jalali') {
    return issue('CALENDAR_INVALID', 'نوع تقویم را شمسی یا میلادی انتخاب کن.');
  }
  if (typeof input.birthDate !== 'string' || !input.birthDate.trim()) {
    return issue('DATE_INVALID', 'تاریخ تولد را وارد کن.');
  }
  const rawDate = normalizeVedicDigits(input.birthDate.trim());
  let dateIso: string;
  if (input.calendar === 'jalali') {
    const converted = dependencies.parseJalali(rawDate);
    if (!converted.ok) return issue('DATE_INVALID', converted.message);
    dateIso = converted.gregorianIso;
  } else {
    dateIso = rawDate;
  }
  if (!parseGregorian(dateIso)) return issue('DATE_INVALID', 'تاریخ تولد معتبر نیست یا خارج از بازهٔ پشتیبانی‌شده است.');
  if (typeof input.birthTime !== 'string' || !input.birthTime.trim()) {
    return issue('TIME_REQUIRED', 'برای محاسبهٔ طالع و خانه‌های ودیک، ساعت دقیق تولد لازم است.');
  }
  const birthTime = normalizeVedicDigits(input.birthTime.trim());
  if (!/^\d{2}:\d{2}$/.test(birthTime)) return issue('TIME_INVALID', 'ساعت تولد را به شکل ۲۳:۵۹ وارد کن.');
  if (typeof input.cityId !== 'string' || !input.cityId.trim()) {
    return issue('CITY_REQUIRED', 'شهر تولد را از فهرست انتخاب کن.');
  }
  const city = dependencies.findCityById(input.cityId.trim());
  if (!city || !Number.isFinite(city.latitude) || Math.abs(city.latitude) > 90 ||
      !Number.isFinite(city.longitude) || Math.abs(city.longitude) > 180 ||
      !city.timezone || !city.id) {
    return issue('CITY_UNKNOWN', 'شهر تولد در فهرست معتبر پیدا نشد.');
  }
  const resolved = resolveVedicCivilTime(
    dateIso, birthTime, city.timezone,
    input.occurrence as VedicD1Occurrence | undefined,
  );
  if (!resolved.ok) return { ok: false, issue: resolved.issue };
  return {
    ok: true,
    value: {
      contractVersion: VEDIC_D1_CONTRACT_VERSION,
      birthDateGregorian: dateIso,
      birthTime,
      sourceCalendar: input.calendar,
      city: { ...city },
      utcIso: resolved.utcIso,
      occurrence: resolved.occurrence,
    },
  };
}
