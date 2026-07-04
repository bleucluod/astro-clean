import {
  calculateBodyGeocentricLongitude,
  getAstronomyBody,
  getZodiacSignForLongitude,
  makeAstronomyTime,
  normalizeLongitude,
} from "@/src/lib/chart/real-chart-engine";
import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import type { ZodiacKey } from "@/types/astro";

export type TehranMoonPulseDateSnapshot = {
  jalaliDate: string;
  gregorianDate: string;
  hijriDate: string;
  weekday: string;
  localTime: string;
  timezone: "Asia/Tehran";
};

export type TehranMoonPulseMoonState = {
  moonSignId: ZodiacKey;
  moonSignLabel: string;
  moonDegree: string;
  sunSignLabel: string;
  phaseAngle: number;
  phaseName: string;
  phaseFamily: "new" | "waxing" | "full" | "waning";
  illuminationPercent: number;
  illuminationLabel: string;
};

export type TehranMoonPulseGuidance = {
  title: string;
  description: string;
  use: string;
  avoid: string;
};

export type TehranMoonPulseResponse = {
  generatedAt: string;
  location: {
    label: "Tehran";
    faLabel: "تهران";
    timezone: "Asia/Tehran";
    note: string;
    futureNote: string;
  };
  dates: TehranMoonPulseDateSnapshot;
  moon: TehranMoonPulseMoonState;
  guidance: TehranMoonPulseGuidance;
};

const TEHRAN_TIME_ZONE = "Asia/Tehran" as const;

const faNumberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

const faDegreeFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

const phaseSegments: Array<{
  name: string;
  family: TehranMoonPulseMoonState["phaseFamily"];
}> = [
  { name: "ماه نو", family: "new" },
  { name: "هلال افزاینده", family: "waxing" },
  { name: "تربیع اول", family: "waxing" },
  { name: "کوژ افزاینده", family: "waxing" },
  { name: "ماه کامل", family: "full" },
  { name: "کوژ کاهنده", family: "waning" },
  { name: "تربیع آخر", family: "waning" },
  { name: "هلال کاهنده", family: "waning" },
];

const phaseGuidance: Record<TehranMoonPulseMoonState["phaseFamily"], TehranMoonPulseGuidance> = {
  new: {
    title: "شروع نرم و نیت روشن",
    description:
      "امروز ریتم ماه بیشتر به آغاز آرام، خلوت کوتاه و نام‌گذاری یک خواسته ساده نزدیک است.",
    use: "یک نیت کوتاه بنویس و آن را به یک قدم کوچک و واقعی تبدیل کن.",
    avoid: "از همان ابتدا همه چیز را بزرگ و سنگین نکن.",
  },
  waxing: {
    title: "رشد تدریجی و حرکت قابل لمس",
    description:
      "ریتم افزاینده ماه کمک می‌کند یک ایده را از حالت ذهنی به حرکت کوچک و پیوسته ببری.",
    use: "یک کار نیمه‌تمام را کمی جلو ببر؛ نه کامل، فقط واقعی.",
    avoid: "پیشرفت آرام را با عقب‌ماندن اشتباه نگیر.",
  },
  full: {
    title: "روشن‌شدن، دیدن و گفت‌وگوی صادق",
    description:
      "ماه کامل نماد روشن‌تر شدن احساس، رابطه و چیزی است که دیگر پنهان نمی‌ماند.",
    use: "یک احساس یا نیاز را واضح‌تر نام ببر و با خودت صادق‌تر باش.",
    avoid: "از شدت احساس، تصمیم قطعی و فوری نگیر.",
  },
  waning: {
    title: "جمع‌بندی، رهاسازی و سبک‌تر شدن",
    description:
      "ریتم کاهنده ماه برای مرور، تمام کردن و کم کردن بارهای اضافه مناسب‌تر است.",
    use: "یک چیز را جمع‌بندی کن یا از فهرست ذهنی‌ات سبک‌تر بردار.",
    avoid: "برای پر کردن سکوت، شروع تازه‌ی سنگین نساز.",
  },
};

const signTone: Partial<Record<ZodiacKey, string>> = {
  aries: "جسارت، شروع و واکنش سریع",
  taurus: "بدن، ثبات و ارزش‌های ملموس",
  gemini: "کلمه، ارتباط و جابه‌جایی ذهن",
  cancer: "احساس، خانه و مراقبت",
  leo: "بیان، دیده‌شدن و دلگرمی",
  virgo: "جزئیات، نظم و اصلاح آرام",
  libra: "رابطه، تعادل و آینه‌ها",
  scorpio: "عمق، صداقت و رهاسازی",
  sagittarius: "معنا، افق و حرکت",
  capricorn: "ساختار، مسئولیت و قدم‌های واقعی",
  aquarius: "فاصله سالم، ایده و آینده",
  pisces: "رهاسازی، شهود و نرم شدن مرزها",
};

function formatInTehran(date: Date, calendar: "persian" | "gregory" | "islamic"): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TEHRAN_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  if (calendar === "persian") {
    options.weekday = "long";
  }

  return new Intl.DateTimeFormat(`fa-IR-u-ca-${calendar}`, options).format(date);
}

function formatTehranTime(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: TEHRAN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTehranWeekday(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: TEHRAN_TIME_ZONE,
    weekday: "long",
  }).format(date);
}

function formatDegree(value: number): string {
  return `${faDegreeFormatter.format(value)}°`;
}

function buildMoonState(date: Date): TehranMoonPulseMoonState {
  const astroTime = makeAstronomyTime(date);
  const sunLongitude = calculateBodyGeocentricLongitude(getAstronomyBody("sun"), astroTime);
  const moonLongitude = calculateBodyGeocentricLongitude(getAstronomyBody("moon"), astroTime);
  const moonSign = getZodiacSignForLongitude(moonLongitude);
  const sunSign = getZodiacSignForLongitude(sunLongitude);
  const phaseAngle = normalizeLongitude(moonLongitude - sunLongitude);
  const phaseIndex = Math.floor((phaseAngle + 22.5) / 45) % phaseSegments.length;
  const phase = phaseSegments[phaseIndex] ?? phaseSegments[0];
  const illuminationPercent = Math.round(((1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2) * 100);

  return {
    moonSignId: moonSign.signId as ZodiacKey,
    moonSignLabel: formatZodiacLabel(moonSign.signId as ZodiacKey),
    moonDegree: formatDegree(moonSign.degreeInSign),
    sunSignLabel: formatZodiacLabel(sunSign.signId as ZodiacKey),
    phaseAngle: Number(phaseAngle.toFixed(2)),
    phaseName: phase.name,
    phaseFamily: phase.family,
    illuminationPercent,
    illuminationLabel: `${faNumberFormatter.format(illuminationPercent)}٪ روشنایی تقریبی`,
  };
}

function buildGuidance(moon: TehranMoonPulseMoonState): TehranMoonPulseGuidance {
  const base = phaseGuidance[moon.phaseFamily];
  const signDescription = signTone[moon.moonSignId];

  return {
    title: base.title,
    description: signDescription
      ? `${base.description} ماه اکنون در فضای ${signDescription} خوانده می‌شود.`
      : base.description,
    use: base.use,
    avoid: base.avoid,
  };
}

export function buildTehranMoonPulse(date: Date = new Date()): TehranMoonPulseResponse {
  const moon = buildMoonState(date);

  return {
    generatedAt: date.toISOString(),
    location: {
      label: "Tehran",
      faLabel: "تهران",
      timezone: TEHRAN_TIME_ZONE,
      note: "خوانش امروز با زمان و افق تهران تنظیم شده است.",
      futureNote: "نسخه شهرهای دیگر بعداً بر اساس موقعیت کاربر اضافه می‌شود.",
    },
    dates: {
      jalaliDate: formatInTehran(date, "persian"),
      gregorianDate: formatInTehran(date, "gregory"),
      hijriDate: formatInTehran(date, "islamic"),
      weekday: getTehranWeekday(date),
      localTime: formatTehranTime(date),
      timezone: TEHRAN_TIME_ZONE,
    },
    moon,
    guidance: buildGuidance(moon),
  };
}
