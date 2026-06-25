export const REAL_CHART_COPY_LIBRARY_VERSION = "0.1.50" as const;

export type SymbolicCopyEntry = {
  id: string;
  labelFa: string;
  tone: "soft" | "reflective" | "dynamic" | "grounding";
  keywords: string[];
  copy: string;
};

export type AspectCopyEntry = SymbolicCopyEntry & {
  polarity: "harmonious" | "dynamic" | "neutral";
};

export const POINT_COPY_LIBRARY: Record<string, SymbolicCopyEntry> = {
  sun: {
    id: "sun",
    labelFa: "خورشید",
    tone: "grounding",
    keywords: ["هویت", "حضور", "جهت"],
    copy:
      "خورشید معمولاً به حس هویت، مرکزیت و شیوه‌ی دیده‌شدن اشاره می‌کند. در گزارش Halleus، این نقطه مثل چراغی است که نشان می‌دهد فرد چطور می‌خواهد خودش را تجربه کند و به جهان نشان بدهد.",
  },
  moon: {
    id: "moon",
    labelFa: "ماه",
    tone: "soft",
    keywords: ["احساس", "نیاز", "امنیت"],
    copy:
      "ماه با نیازهای احساسی، ریتم درونی و حس امنیت مرتبط خوانده می‌شود. متن گزارش باید این بخش را آرام، انسانی و بدون قضاوت توضیح بدهد.",
  },
  mercury: {
    id: "mercury",
    labelFa: "عطارد",
    tone: "reflective",
    keywords: ["فکر", "زبان", "یادگیری"],
    copy:
      "عطارد به شیوه‌ی فکر کردن، بیان کردن و پیوند دادن ایده‌ها اشاره می‌کند. این بخش می‌تواند زبان ذهنی فرد را روشن‌تر کند.",
  },
  venus: {
    id: "venus",
    labelFa: "زهره",
    tone: "soft",
    keywords: ["رابطه", "زیبایی", "ارزش"],
    copy:
      "زهره با سلیقه، رابطه، ارزش‌گذاری و میل به هماهنگی خوانده می‌شود. در متن گزارش بهتر است لطیف، ملموس و غیرقطعی نوشته شود.",
  },
  mars: {
    id: "mars",
    labelFa: "مریخ",
    tone: "dynamic",
    keywords: ["انگیزه", "کنش", "مرز"],
    copy:
      "مریخ به انرژی کنش، خواستن، دفاع از مرزها و حرکت رو به جلو مربوط می‌شود. این بخش می‌تواند نشان دهد فرد چگونه با فشار یا میل شخصی برخورد می‌کند.",
  },
  jupiter: {
    id: "jupiter",
    labelFa: "مشتری",
    tone: "reflective",
    keywords: ["رشد", "معنا", "اعتماد"],
    copy:
      "مشتری معمولاً به رشد، معنا، امید و افق‌های بزرگ‌تر اشاره دارد. در گزارش باید به‌عنوان ظرفیت توسعه دیده شود، نه وعده‌ی قطعی موفقیت.",
  },
  saturn: {
    id: "saturn",
    labelFa: "زحل",
    tone: "grounding",
    keywords: ["ساختار", "مسئولیت", "زمان"],
    copy:
      "زحل با مرز، مسئولیت، زمان و ساختن تدریجی مرتبط است. متن گزارش باید این بخش را بالغ و مهربان توضیح دهد، نه ترسناک یا تنبیهی.",
  },
};

export const SIGN_COPY_LIBRARY: Record<string, SymbolicCopyEntry> = {
  aries: {
    id: "aries",
    labelFa: "حمل",
    tone: "dynamic",
    keywords: ["شروع", "جرئت", "حرکت"],
    copy: "حمل فضای شروع، حرکت و واکنش مستقیم را پررنگ می‌کند.",
  },
  taurus: {
    id: "taurus",
    labelFa: "ثور",
    tone: "grounding",
    keywords: ["ثبات", "بدن", "ارزش"],
    copy: "ثور به ثبات، بدن، ارزش‌های ملموس و آهستگی سازنده اشاره می‌کند.",
  },
  gemini: {
    id: "gemini",
    labelFa: "جوزا",
    tone: "reflective",
    keywords: ["کنجکاوی", "گفت‌وگو", "تنوع"],
    copy: "جوزا فضا را ذهنی، کنجکاو و چندصدایی می‌کند.",
  },
  cancer: {
    id: "cancer",
    labelFa: "سرطان",
    tone: "soft",
    keywords: ["خانه", "حافظه", "مراقبت"],
    copy: "سرطان با مراقبت، حافظه‌ی احساسی و نیاز به پناه مرتبط است.",
  },
  leo: {
    id: "leo",
    labelFa: "اسد",
    tone: "dynamic",
    keywords: ["بیان", "قلب", "خلاقیت"],
    copy: "اسد به بیان شخصی، دیده‌شدن و خلاقیت قلبی رنگ می‌دهد.",
  },
  virgo: {
    id: "virgo",
    labelFa: "سنبله",
    tone: "grounding",
    keywords: ["دقت", "بهبود", "خدمت"],
    copy: "سنبله کیفیت دقت، اصلاح و توجه به جزئیات را برجسته می‌کند.",
  },
  libra: {
    id: "libra",
    labelFa: "میزان",
    tone: "soft",
    keywords: ["رابطه", "تعادل", "زیبایی"],
    copy: "میزان به رابطه، تعادل، انتخاب و زیبایی در تعامل اشاره دارد.",
  },
  scorpio: {
    id: "scorpio",
    labelFa: "عقرب",
    tone: "dynamic",
    keywords: ["عمق", "اعتماد", "دگرگونی"],
    copy: "عقرب فضا را عمیق‌تر، صمیمی‌تر و گاهی دگرگون‌کننده می‌کند.",
  },
  sagittarius: {
    id: "sagittarius",
    labelFa: "قوس",
    tone: "reflective",
    keywords: ["معنا", "سفر", "افق"],
    copy: "قوس به جست‌وجوی معنا، افق‌های تازه و آزادی نگاه اشاره می‌کند.",
  },
  capricorn: {
    id: "capricorn",
    labelFa: "جدی",
    tone: "grounding",
    keywords: ["ساختار", "مسیر", "پختگی"],
    copy: "جدی کیفیت ساختار، پختگی، هدف و حرکت مرحله‌به‌مرحله را پررنگ می‌کند.",
  },
  aquarius: {
    id: "aquarius",
    labelFa: "دلو",
    tone: "reflective",
    keywords: ["فاصله", "آینده", "جمع"],
    copy: "دلو به نگاه متفاوت، آینده‌نگری و نسبت فرد با جمع اشاره دارد.",
  },
  pisces: {
    id: "pisces",
    labelFa: "حوت",
    tone: "soft",
    keywords: ["خیال", "همدلی", "رهاسازی"],
    copy: "حوت فضا را خیال‌انگیز، همدلانه و مرزناپذیرتر می‌کند.",
  },
  unknown: {
    id: "unknown",
    labelFa: "نامشخص",
    tone: "reflective",
    keywords: ["ابهام", "احتیاط"],
    copy: "برای این بخش هنوز داده‌ی کافی وجود ندارد و متن باید محتاط بماند.",
  },
};

export const HOUSE_COPY_LIBRARY: Record<number, SymbolicCopyEntry> = {
  1: {
    id: "house-1",
    labelFa: "خانه‌ی ۱",
    tone: "dynamic",
    keywords: ["بدن", "حضور", "شروع"],
    copy: "خانه‌ی ۱ بیشتر به حضور، بدن، شروع‌ها و تصویر اولیه‌ی فرد مربوط می‌شود.",
  },
  2: {
    id: "house-2",
    labelFa: "خانه‌ی ۲",
    tone: "grounding",
    keywords: ["ارزش", "منبع", "امنیت"],
    copy: "خانه‌ی ۲ به منابع، ارزش‌های شخصی، امنیت و نسبت فرد با داشته‌ها اشاره دارد.",
  },
  3: {
    id: "house-3",
    labelFa: "خانه‌ی ۳",
    tone: "reflective",
    keywords: ["زبان", "یادگیری", "ارتباط"],
    copy: "خانه‌ی ۳ فضای ارتباط روزمره، یادگیری، زبان و کنجکاوی را نشان می‌دهد.",
  },
  4: {
    id: "house-4",
    labelFa: "خانه‌ی ۴",
    tone: "soft",
    keywords: ["ریشه", "خانه", "درون"],
    copy: "خانه‌ی ۴ به ریشه‌ها، خانه، خانواده و حس درونی امنیت مربوط می‌شود.",
  },
  5: {
    id: "house-5",
    labelFa: "خانه‌ی ۵",
    tone: "dynamic",
    keywords: ["خلاقیت", "عشق", "بازی"],
    copy: "خانه‌ی ۵ با خلاقیت، عشق، بازی، لذت و بیان شخصی خوانده می‌شود.",
  },
  6: {
    id: "house-6",
    labelFa: "خانه‌ی ۶",
    tone: "grounding",
    keywords: ["روتین", "بدن", "کار"],
    copy: "خانه‌ی ۶ به روتین، کار روزمره، مراقبت از بدن و بهبودهای کوچک اشاره دارد.",
  },
  7: {
    id: "house-7",
    labelFa: "خانه‌ی ۷",
    tone: "soft",
    keywords: ["رابطه", "آینه", "تعهد"],
    copy: "خانه‌ی ۷ فضای رابطه، همکاری، آینه‌شدن و تعهد را برجسته می‌کند.",
  },
  8: {
    id: "house-8",
    labelFa: "خانه‌ی ۸",
    tone: "dynamic",
    keywords: ["عمق", "اعتماد", "اشتراک"],
    copy: "خانه‌ی ۸ با اعتماد، عمق، منابع مشترک و دگرگونی‌های آهسته مرتبط است.",
  },
  9: {
    id: "house-9",
    labelFa: "خانه‌ی ۹",
    tone: "reflective",
    keywords: ["معنا", "باور", "افق"],
    copy: "خانه‌ی ۹ به معنا، باور، سفر، آموزش و نگاه وسیع‌تر اشاره می‌کند.",
  },
  10: {
    id: "house-10",
    labelFa: "خانه‌ی ۱۰",
    tone: "grounding",
    keywords: ["مسیر", "کار", "اعتبار"],
    copy: "خانه‌ی ۱۰ مسیر بیرونی، کار، اعتبار و مسئولیت اجتماعی را پررنگ می‌کند.",
  },
  11: {
    id: "house-11",
    labelFa: "خانه‌ی ۱۱",
    tone: "reflective",
    keywords: ["جمع", "دوستی", "آینده"],
    copy: "خانه‌ی ۱۱ به دوستی‌ها، شبکه‌ها، آرزوها و نسبت فرد با جمع مربوط است.",
  },
  12: {
    id: "house-12",
    labelFa: "خانه‌ی ۱۲",
    tone: "soft",
    keywords: ["خلوت", "ناخودآگاه", "رهاسازی"],
    copy: "خانه‌ی ۱۲ فضای خلوت، ناخودآگاه، پایان چرخه‌ها و رهاسازی را نشان می‌دهد.",
  },
};

export const ASPECT_COPY_LIBRARY: Record<string, AspectCopyEntry> = {
  conjunction: {
    id: "conjunction",
    labelFa: "هم‌نشینی",
    tone: "grounding",
    polarity: "neutral",
    keywords: ["ترکیب", "شدت", "هم‌مرکزی"],
    copy:
      "هم‌نشینی یعنی دو نقطه در یک فضای نمادین به هم نزدیک می‌شوند و صدایشان در گزارش با هم شنیده می‌شود.",
  },
  sextile: {
    id: "sextile",
    labelFa: "هماهنگی نرم",
    tone: "soft",
    polarity: "harmonious",
    keywords: ["فرصت", "همکاری", "نرمی"],
    copy:
      "سکستایل معمولاً به فرصت‌های نرم و همکاری آرام میان دو بخش از روان نمادین اشاره می‌کند.",
  },
  square: {
    id: "square",
    labelFa: "چالش سازنده",
    tone: "dynamic",
    polarity: "dynamic",
    keywords: ["تنش", "حرکت", "رشد"],
    copy:
      "مربع تنش و اصطکاک می‌آورد، اما در زبان Halleus این تنش باید به‌عنوان دعوت به رشد نوشته شود، نه تهدید.",
  },
  trine: {
    id: "trine",
    labelFa: "جریان طبیعی",
    tone: "soft",
    polarity: "harmonious",
    keywords: ["روانی", "استعداد", "آسانی"],
    copy:
      "ترین به جریان طبیعی، استعداد یا مسیری اشاره می‌کند که معمولاً با مقاومت کمتری حرکت می‌کند.",
  },
  opposition: {
    id: "opposition",
    labelFa: "کشش دو قطبی",
    tone: "dynamic",
    polarity: "dynamic",
    keywords: ["تعادل", "آینه", "کشش"],
    copy:
      "اپوزیشن دو قطب را روبه‌روی هم قرار می‌دهد و گزارش باید آن را به زبان تعادل، آینه و گفت‌وگو توضیح دهد.",
  },
};

export function getPointCopyEntry(pointId: string): SymbolicCopyEntry {
  return POINT_COPY_LIBRARY[pointId] ?? {
    id: pointId,
    labelFa: pointId,
    tone: "reflective",
    keywords: ["نماد", "تأمل"],
    copy: "این نقطه به‌عنوان یک نماد در گزارش خوانده می‌شود و نیاز به متن اختصاصی‌تر دارد.",
  };
}

export function getSignCopyEntry(signId: string): SymbolicCopyEntry {
  return SIGN_COPY_LIBRARY[signId] ?? SIGN_COPY_LIBRARY.unknown;
}

export function getHouseCopyEntry(houseNumber: number | null): SymbolicCopyEntry {
  if (houseNumber === null) {
    return {
      id: "house-unknown",
      labelFa: "خانه‌ی نامشخص",
      tone: "reflective",
      keywords: ["ابهام", "احتیاط"],
      copy: "خانه برای این جایگاه هنوز مشخص نیست و تفسیر باید محتاط باقی بماند.",
    };
  }

  return HOUSE_COPY_LIBRARY[houseNumber] ?? HOUSE_COPY_LIBRARY[1];
}

export function getAspectCopyEntry(aspectId: string): AspectCopyEntry {
  return ASPECT_COPY_LIBRARY[aspectId] ?? {
    id: aspectId,
    labelFa: aspectId,
    tone: "reflective",
    polarity: "neutral",
    keywords: ["رابطه", "نماد"],
    copy: "این جنبه یک رابطه‌ی نمادین میان دو نقطه ایجاد می‌کند و نیاز به متن اختصاصی‌تر دارد.",
  };
}

export function getCopyLibraryStats() {
  return {
    pointCount: Object.keys(POINT_COPY_LIBRARY).length,
    signCount: Object.keys(SIGN_COPY_LIBRARY).length,
    houseCount: Object.keys(HOUSE_COPY_LIBRARY).length,
    aspectCount: Object.keys(ASPECT_COPY_LIBRARY).length,
  };
}
