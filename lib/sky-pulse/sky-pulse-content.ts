export type SkyPulseDateSnapshot = {
  jalaliDate: string;
  gregorianDate: string;
  jalaliYear: number | null;
  jalaliMonth: string;
  jalaliDay: number | null;
  weekday: string;
  leapYearLabel: string;
};

export type SkyPulseGuidance = {
  title: string;
  description: string;
  use: string;
  avoid: string;
};

export type SkyPulseTransitPreview = {
  title: string;
  status: string;
  description: string;
};

export type SkyPulseProductLayer = {
  snapshot: SkyPulseDateSnapshot;
  monthPulse: SkyPulseGuidance;
  weekPulse: SkyPulseGuidance;
  dayPulse: SkyPulseGuidance;
  transitPreviews: SkyPulseTransitPreview[];
};

const faNumberFormatter = new Intl.NumberFormat("fa-IR");

const fallbackPulse: SkyPulseGuidance = {
  title: "زمینه آرام برای خواندن خودت",
  description:
    "این بخش هنوز ترنزیت واقعی محاسبه نمی‌کند؛ فعلاً از تاریخ زنده و ریتم تقویم برای ساختن یک راهنمای کوتاه استفاده می‌کند.",
  use: "یک برداشت کوتاه از حال امروزت بنویس و بعد برای خوانش شخصی‌تر، گزارش تولدت را بساز.",
  avoid: "این متن را فال قطعی، تصمیم‌گیرنده یا جایگزین گزارش شخصی فرض نکن.",
};

const monthPulses: Record<string, SkyPulseGuidance> = {
  فروردین: {
    title: "شروع تازه و سبک کردن مسیر",
    description:
      "فروردین برای Halleus ماه شروع، نام‌گذاری خواسته‌ها و برگشتن به نیروی اولیه است.",
    use: "یک نیت کوتاه برای ماه بنویس و فقط یک قدم قابل انجام انتخاب کن.",
    avoid: "با هیجان شروع، همه چیز را هم‌زمان عوض نکن.",
  },
  اردیبهشت: {
    title: "بدن، ارزش و ریتم آهسته‌تر",
    description:
      "اردیبهشت یادآوری می‌کند که خودشناسی فقط فکر نیست؛ بدن، امنیت و لذت‌های ساده هم مهم‌اند.",
    use: "روی یک عادت کوچک و پایدار تمرکز کن؛ چیزی که واقعاً بتوانی نگه داری.",
    avoid: "برای نتیجه سریع، ریتم طبیعی خودت را نادیده نگیر.",
  },
  خرداد: {
    title: "گفت‌وگو، یادگیری و اتصال نقطه‌ها",
    description:
      "خرداد زمان جمع کردن نشانه‌ها، حرف زدن با خود و دیدن چند روایت از یک موضوع است.",
    use: "یک سوال روشن از خودت بپرس و جوابش را کوتاه یادداشت کن.",
    avoid: "در پراکندگی اطلاعات گم نشو؛ همه چیز لازم نیست همین امروز حل شود.",
  },
  تیر: {
    title: "خانه درون، احساس و مراقبت",
    description:
      "تیر توجه را به امنیت عاطفی، خاطره‌ها و نیازهای نرم‌تر برمی‌گرداند.",
    use: "یک نیاز عاطفی را بدون قضاوت نام ببر و برایش یک مراقبت کوچک انتخاب کن.",
    avoid: "از روی حساسیت لحظه‌ای، تصمیم نهایی نگیر.",
  },
  مرداد: {
    title: "بیان، جرئت و دیده شدن",
    description:
      "مرداد یادآوری می‌کند که بخشی از خودشناسی، اجازه دادن به دیده شدن سالم است.",
    use: "یک توانایی یا خواسته‌ات را واضح‌تر بیان کن؛ حتی در مقیاس کوچک.",
    avoid: "برای تأیید گرفتن، خودت را بزرگ‌تر یا کوچک‌تر از واقعیت نشان نده.",
  },
  شهریور: {
    title: "نظم، جزئیات و اصلاح آرام",
    description:
      "شهریور زمان تمیز کردن مسیر، ساده کردن انتخاب‌ها و بهتر کردن چیزی است که از قبل وجود دارد.",
    use: "یک بخش شلوغ از برنامه یا ذهنت را مرتب کن.",
    avoid: "کمال‌گرایی را با مراقبت اشتباه نگیر.",
  },
  مهر: {
    title: "رابطه، تعادل و آینه‌ها",
    description:
      "مهر توجه را به رابطه‌ها، مرزها و شکل متعادل‌تر همراهی می‌برد.",
    use: "یک رابطه مهم را با سوال «من اینجا چه نیازی دارم؟» نگاه کن.",
    avoid: "برای نگه داشتن هماهنگی، نیاز خودت را حذف نکن.",
  },
  آبان: {
    title: "عمق، صداقت و رها کردن",
    description:
      "آبان ماه دیدن لایه‌های پنهان‌تر و جدا کردن حقیقت از واکنش‌های دفاعی است.",
    use: "یک ترس یا خواسته پنهان را بی‌قضاوت روی کاغذ بیاور.",
    avoid: "همه چیز را مخفی، سنگین یا بحرانی تفسیر نکن.",
  },
  آذر: {
    title: "معنا، افق و حرکت",
    description:
      "آذر انرژی جست‌وجو، امید و دیدن تصویر بزرگ‌تر را فعال می‌کند.",
    use: "یک مسیر تازه برای یادگیری یا کشف انتخاب کن؛ کوچک ولی واقعی.",
    avoid: "با خوش‌بینی زیاد، جزئیات مهم را رد نکن.",
  },
  دی: {
    title: "ساختار، مسئولیت و قدم‌های واقعی",
    description:
      "دی کمک می‌کند ایده‌ها را به ساختار، تعهد و حرکت قابل اندازه‌گیری تبدیل کنی.",
    use: "یک هدف را به یک کار کوچک امروز تبدیل کن.",
    avoid: "ارزش خودت را فقط با خروجی و بهره‌وری نسنج.",
  },
  بهمن: {
    title: "فاصله سالم، ایده و آینده",
    description:
      "بهمن دعوت می‌کند از الگوهای تکراری فاصله بگیری و امکان تازه‌ای را ببینی.",
    use: "یک عادت قدیمی را از بیرون نگاه کن و یک جایگزین سبک‌تر پیشنهاد بده.",
    avoid: "برای متفاوت بودن، از نیازهای انسانی و ساده‌ات جدا نشو.",
  },
  اسفند: {
    title: "رهاسازی، شهود و جمع‌بندی",
    description:
      "اسفند زمان نرم کردن مرزهای سخت، جمع‌بندی احساسی و آماده شدن برای شروع بعدی است.",
    use: "یک چیز را ببخش، تمام کن یا سبک‌تر با خودت حمل کن.",
    avoid: "در ابهام و خیال‌پردازی بمان و اقدام کوچک را عقب نینداز.",
  },
};

const weekdayPulses: Record<string, SkyPulseGuidance> = {
  شنبه: {
    title: "شروع هفته با یک نیت روشن",
    description: "امروز برای انتخاب مسیر هفته مناسب است؛ نه برای فشار آوردن به خودت.",
    use: "یک اولویت واقعی برای هفته انتخاب کن.",
    avoid: "هفته را با فهرست سنگین و غیرواقعی شروع نکن.",
  },
  یکشنبه: {
    title: "پیگیری آرام و ساختن ریتم",
    description: "انرژی امروز بیشتر به ادامه دادن کمک می‌کند تا شروع‌های نمایشی.",
    use: "کاری را که دیروز شروع کردی کمی جلو ببر.",
    avoid: "به خاطر کند بودن پیشرفت، مسیر را عوض نکن.",
  },
  دوشنبه: {
    title: "ارتباط، کلمه و وضوح",
    description: "امروز برای نام‌گذاری احساسات و روشن‌تر گفتن نیازها مناسب است.",
    use: "یک جمله صادقانه درباره حالت امروزت بنویس.",
    avoid: "هر فکر گذرا را فوراً پیام یا تصمیم نکن.",
  },
  سه‌شنبه: {
    title: "اقدام سنجیده",
    description: "امروز می‌تواند برای حرکت دادن یک موضوع مانده مفید باشد، اگر عجله را کم کنی.",
    use: "یک اقدام کوچک ولی واقعی انجام بده.",
    avoid: "از روی بی‌حوصلگی، تصمیم تند نگیر.",
  },
  چهارشنبه: {
    title: "مرور و تنظیم دوباره",
    description: "وسط هفته زمان خوبی برای اصلاح مسیر است؛ بدون اینکه همه چیز را خراب بدانی.",
    use: "یک چیز را ساده‌تر کن و یک چیز را نگه دار.",
    avoid: "خودت را بابت کامل نبودن برنامه سرزنش نکن.",
  },
  پنجشنبه: {
    title: "سبک کردن و برگشتن به خود",
    description: "امروز برای کم کردن بار ذهنی و آماده شدن برای استراحت مناسب است.",
    use: "یک کار کوچک را تمام کن یا از فهرست حذف کن.",
    avoid: "همه چیز را به آخر هفته موکول نکن.",
  },
  جمعه: {
    title: "استراحت، حس و جمع‌بندی نرم",
    description: "جمعه برای گوش دادن به درون و سبک کردن توقع‌هاست.",
    use: "یک برداشت کوتاه از هفته بنویس؛ بدون تحلیل سنگین.",
    avoid: "استراحت را با عقب افتادن اشتباه نگیر.",
  },
};

const transitPreviews: SkyPulseTransitPreview[] = [
  {
    title: "ترنزیت‌های روز",
    status: "در حال طراحی",
    description:
      "قرار است بعداً از داده واقعی آسمان ساخته شود؛ فعلاً در homepage فقط جایگاه و زبان محصول را آماده می‌کنیم.",
  },
  {
    title: "ترنزیت‌های ماه",
    status: "در مرحله مدل‌سازی",
    description:
      "هدف این است که فقط چند ترنزیت مهم و قابل فهم نمایش داده شود، نه فهرست طولانی و گیج‌کننده.",
  },
  {
    title: "نسخه شخصی در گزارش چارت",
    status: "مرحله بعدی محصول",
    description:
      "خلاصه عمومی در homepage می‌آید؛ توضیح کامل‌تر باید به چارت تولد شخصی و گزارش اختصاصی وصل شود.",
  },
];

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function getDatePart(
  formatter: Intl.DateTimeFormat,
  date: Date,
  type: "year" | "month" | "weekday" | "day",
): string {
  return formatter.formatToParts(date).find((part) => part.type === type)?.value ?? "";
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - div(a, b) * b;
}

function getJalaaliLeapState(jalaliYear: number): boolean | null {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];

  const firstBreak = breaks[0];
  const lastBreak = breaks[breaks.length - 1];

  if (jalaliYear < firstBreak || jalaliYear >= lastBreak) {
    return null;
  }

  let leapJ = -14;
  let jp = firstBreak;
  let jump = 0;

  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;

    if (jalaliYear < jm) {
      break;
    }

    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jalaliYear - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);

  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }

  let leap = mod(mod(n + 1, 33) - 1, 4);

  if (leap === -1) {
    leap = 4;
  }

  return leap === 0;
}

function buildDateSnapshot(date: Date): SkyPulseDateSnapshot {
  const jalaliFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const gregorianFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jalaliYearText = getDatePart(jalaliFormatter, date, "year");
  const jalaliDayText = getDatePart(jalaliFormatter, date, "day");
  const jalaliYear = Number(normalizeDigits(jalaliYearText));
  const jalaliDay = Number(normalizeDigits(jalaliDayText));
  const safeJalaliYear = Number.isFinite(jalaliYear) ? jalaliYear : null;
  const safeJalaliDay = Number.isFinite(jalaliDay) ? jalaliDay : null;
  const leapState = safeJalaliYear === null ? null : getJalaaliLeapState(safeJalaliYear);
  const formattedYear = safeJalaliYear === null ? "این" : faNumberFormatter.format(safeJalaliYear);

  return {
    jalaliDate: jalaliFormatter.format(date),
    gregorianDate: gregorianFormatter.format(date),
    jalaliYear: safeJalaliYear,
    jalaliMonth: getDatePart(jalaliFormatter, date, "month"),
    jalaliDay: safeJalaliDay,
    weekday: getDatePart(jalaliFormatter, date, "weekday"),
    leapYearLabel:
      leapState === null
        ? "برای تشخیص کبیسه بودن این سال به داده تقویمی دقیق‌تری نیاز داریم."
        : `سال ${formattedYear} در تقویم جلالی ${leapState ? "کبیسه است" : "کبیسه نیست"}.`,
  };
}

function buildWeekPulse(jalaliDay: number | null): SkyPulseGuidance {
  if (jalaliDay === null) {
    return fallbackPulse;
  }

  if (jalaliDay <= 10) {
    return {
      title: "آغاز ماه: نیت و جهت",
      description: "در دهه اول ماه، کارت Sky Pulse بیشتر روی شروع نرم و انتخاب مسیر تمرکز می‌کند.",
      use: "یک موضوع را انتخاب کن که می‌خواهی این ماه با آن آگاهانه‌تر برخورد کنی.",
      avoid: "قبل از روشن شدن جهت، خودت را با چند هدف هم‌زمان خسته نکن.",
    };
  }

  if (jalaliDay <= 20) {
    return {
      title: "میانه ماه: تنظیم و پیگیری",
      description: "در میانه ماه، انرژی محصولی این کارت روی اصلاح مسیر و ادامه دادن است.",
      use: "یک قدم نیمه‌کاره را کمی جلو ببر یا ساده‌ترش کن.",
      avoid: "به خاطر کامل نبودن نتیجه، اصل مسیر را رها نکن.",
    };
  }

  return {
    title: "پایان ماه: جمع‌بندی و سبک‌سازی",
    description: "در روزهای پایانی ماه، Sky Pulse بیشتر به مرور، رهاسازی و آماده شدن برای چرخه بعدی نگاه می‌کند.",
    use: "یک چیز را جمع‌بندی کن: چه دیدی، چه فهمیدی، چه لازم نیست ادامه پیدا کند؟",
    avoid: "قبل از جمع‌بندی، پروژه یا تصمیم تازه بزرگی روی خودت نگذار.",
  };
}

export function buildSkyPulseProductLayer(date: Date): SkyPulseProductLayer {
  const snapshot = buildDateSnapshot(date);

  return {
    snapshot,
    monthPulse: monthPulses[snapshot.jalaliMonth] ?? fallbackPulse,
    weekPulse: buildWeekPulse(snapshot.jalaliDay),
    dayPulse: weekdayPulses[snapshot.weekday] ?? fallbackPulse,
    transitPreviews,
  };
}
