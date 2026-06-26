import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportPlacement,
  RealEngineReportSnapshot,
  ZodiacKey,
} from "@/types/astro";
import {
  calculateRealEngineAspects,
  formatAspectDegree,
} from "@/lib/astrology/real-engine-aspects";

type SignCopy = {
  faName: string;
  energy: string;
  gift: string;
  growth: string;
};

type PlanetCopy = {
  faName: string;
  title: string;
  role: string;
};

const SIGN_ORDER: ZodiacKey[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

const SIGN_COPY: Record<ZodiacKey, SignCopy> = {
  aries: {
    faName: "حمل",
    energy: "شروع‌کننده، مستقیم و پرحرارت",
    gift: "جرئت شروع کردن و جلو بردن چیزهایی که هنوز شکل نگرفته‌اند",
    growth: "تمرین مکث، شنیدن و کامل‌کردن مسیر بعد از موج اول انگیزه",
  },
  taurus: {
    faName: "ثور",
    energy: "آرام، بدن‌مند و ثبات‌ساز",
    gift: "ساختن امنیت، لذت و ریتمی که واقعاً دوام می‌آورد",
    growth: "رها کردن چسبندگی به چیزی که فقط از روی عادت امن به نظر می‌رسد",
  },
  gemini: {
    faName: "جوزا",
    energy: "کنجکاو، ذهنی و ارتباطی",
    gift: "دیدن چند زاویه هم‌زمان و تبدیل تجربه به کلمه، ایده و گفتگو",
    growth: "عمیق‌تر ماندن با یک مسیر به‌جای پریدن سریع بین احتمال‌ها",
  },
  cancer: {
    faName: "سرطان",
    energy: "حساس، حافظه‌محور و مراقبت‌گر",
    gift: "ساختن حس خانه، تعلق و پیوند عاطفی واقعی",
    growth: "مرزبندی احساسی تا مراقبت تبدیل به فرسودگی یا وابستگی نشود",
  },
  leo: {
    faName: "اسد",
    energy: "گرم، نمایان و خلاق",
    gift: "تاباندن حضور، شادی و بیان شخصی به محیط اطراف",
    growth: "درخشش بدون نیاز دائمی به تأیید بیرونی",
  },
  virgo: {
    faName: "سنبله",
    energy: "دقیق، اصلاح‌گر و خدمت‌محور",
    gift: "دیدن جزئیات مهم و بهتر کردن چیزها به شکل عملی",
    growth: "کمتر سخت گرفتن به خود و پذیرفتن اینکه کامل بودن همیشه لازم نیست",
  },
  libra: {
    faName: "میزان",
    energy: "رابطه‌محور، زیباشناس و تعادل‌جو",
    gift: "دیدن دو طرف ماجرا و ساختن هماهنگی بین آدم‌ها و انتخاب‌ها",
    growth: "تصمیم گرفتن حتی وقتی همه را نمی‌شود راضی نگه داشت",
  },
  scorpio: {
    faName: "عقرب",
    energy: "عمیق، شدید و دگرگون‌کننده",
    gift: "دیدن حقیقت‌های پنهان و عبور از سطح به لایه‌های واقعی‌تر",
    growth: "اعتماد کردن، نرم شدن و رها کردن کنترل وقتی رابطه امن است",
  },
  sagittarius: {
    faName: "قوس",
    energy: "جستجوگر، آزاد و معناطلب",
    gift: "دیدن افق بزرگ‌تر و تبدیل تجربه به بینش، مسیر و ایمان شخصی",
    growth: "زمین‌گیر کردن الهام‌ها در عمل و توجه به جزئیات مسیر",
  },
  capricorn: {
    faName: "جدی",
    energy: "ساختارمند، مسئول و بلندمدت",
    gift: "ساختن چیزی جدی، قابل اتکا و مرحله‌به‌مرحله",
    growth: "اجازه دادن به نرمی، بازی و استراحت کنار مسئولیت",
  },
  aquarius: {
    faName: "دلو",
    energy: "مستقل، آینده‌نگر و متفاوت",
    gift: "دیدن الگوهای تازه و آوردن ایده‌هایی که از زمان خود جلوترند",
    growth: "وصل ماندن به بدن و رابطه، نه فقط ایده و فاصله ذهنی",
  },
  pisces: {
    faName: "حوت",
    energy: "شهودی، خیال‌پرداز و مرزناپذیر",
    gift: "حس کردن لایه‌های نامرئی و آوردن مهربانی، هنر و معنا",
    growth: "مرزبندی، وضوح و تبدیل الهام به انتخاب‌های روزمره",
  },
};

const PLANET_COPY: Record<string, PlanetCopy> = {
  sun: {
    faName: "خورشید",
    title: "هسته هویت",
    role: "مسیر اصلی رشد، اعتمادبه‌نفس و چیزی که وقتی خودت‌تر می‌شوی روشن‌تر دیده می‌شود",
  },
  moon: {
    faName: "ماه",
    title: "نیاز عاطفی",
    role: "ریتم درونی، امنیت احساسی و واکنش‌های غریزی تو وقتی دنیا نزدیک‌تر می‌شود",
  },
  mercury: {
    faName: "عطارد",
    title: "ذهن و بیان",
    role: "سبک فکر کردن، یاد گرفتن، حرف زدن و وصل کردن نقطه‌ها به هم",
  },
  venus: {
    faName: "زهره",
    title: "رابطه و ارزش",
    role: "سلیقه، کشش، صمیمیت و چیزهایی که برایت حس ارزش و زیبایی می‌سازند",
  },
  mars: {
    faName: "مریخ",
    title: "انرژی حرکت",
    role: "شیوه اقدام کردن، دفاع از خواسته‌ها و مواجهه با چالش یا میل",
  },
  jupiter: {
    faName: "مشتری",
    title: "رشد و افق",
    role: "جایی که تجربه، امید و یادگیری می‌تواند تو را بزرگ‌تر کند",
  },
  saturn: {
    faName: "زحل",
    title: "درس و ساختار",
    role: "مرز، مسئولیت، بلوغ و بخشی از زندگی که با زمان قوی‌تر می‌شود",
  },
  uranus: {
    faName: "اورانوس",
    title: "آزادی و تغییر",
    role: "جایی که نیاز به استقلال، نوآوری و شکستن الگوهای قدیمی فعال می‌شود",
  },
  neptune: {
    faName: "نپتون",
    title: "رویا و شهود",
    role: "حساسیت، الهام، خیال و جایی که باید بین رؤیا و ابهام فرق بگذاری",
  },
  pluto: {
    faName: "پلوتو",
    title: "عمق و دگرگونی",
    role: "شدت، قدرت پنهان و مسیرهایی که تو را از درون بازسازی می‌کنند",
  },
};

export function enrichReportWithRealEngineCopy(
  report: AstrologyReport,
  realEngine: RealEngineReportSnapshot,
): AstrologyReport {
  const sun = findPlacement(realEngine, "sun");
  const moon = findPlacement(realEngine, "moon");
  const mercury = findPlacement(realEngine, "mercury");
  const venus = findPlacement(realEngine, "venus");
  const mars = findPlacement(realEngine, "mars");
  const risingSign = signFromLongitude(realEngine.ascendantLongitude);
  const aspects = (
    realEngine.aspects?.length
      ? realEngine.aspects
      : calculateRealEngineAspects(realEngine.placements)
  ).slice(0, 8);
  const realEngineWithAspects: RealEngineReportSnapshot = {
    ...realEngine,
    aspects,
  };

  const summary = buildRealEngineSummary({
    name: report.input.name,
    sun,
    moon,
    risingSign,
  });

  const interpretations = [
    buildCorePlacementText(sun, "sun"),
    buildCorePlacementText(moon, "moon"),
    buildRisingText(risingSign, realEngine.ascendantLongitude),
    buildOptionalPlacementText(mercury, "mercury"),
    buildOptionalPlacementText(venus, "venus"),
    buildOptionalPlacementText(mars, "mars"),
    buildAspectOverviewText(aspects),
    buildIntegrationText(realEngineWithAspects),
  ].filter(Boolean) as string[];

  return {
    ...report,
    realEngine: realEngineWithAspects,
    summary,
    interpretations,
  };
}

function buildRealEngineSummary({
  name,
  sun,
  moon,
  risingSign,
}: {
  name?: string;
  sun?: RealEngineReportPlacement;
  moon?: RealEngineReportPlacement;
  risingSign: ZodiacKey;
}) {
  const displayName = name?.trim() ? `${name.trim()}، ` : "";
  const sunSign = sun ? SIGN_COPY[sun.signId] : undefined;
  const moonSign = moon ? SIGN_COPY[moon.signId] : undefined;
  const rising = SIGN_COPY[risingSign];

  if (sunSign && moonSign) {
    return `${displayName}این گزارش با محاسبه واقعی‌تر Halleus ساخته شده است. خورشید تو در ${sunSign.faName}، ماه تو در ${moonSign.faName} و رایزینگ تقریبی تو در ${rising.faName} قرار دارد. ترکیب کلی چارت، شخصیتی را نشان می‌دهد که از یک طرف با انرژی ${sunSign.energy} حرکت می‌کند و از طرف دیگر برای امنیت درونی به کیفیت ${moonSign.energy} نیاز دارد. رایزینگ ${rising.faName} هم نحوه ورود تو به موقعیت‌ها و اولین تصویری که از خودت نشان می‌دهی را رنگ‌آمیزی می‌کند.`;
  }

  return `${displayName}این گزارش با محاسبه واقعی‌تر Halleus ساخته شده است. داده‌های اصلی چارت در snapshot ذخیره شده‌اند و رایزینگ تقریبی تو در ${rising.faName} قرار دارد. متن گزارش بر اساس همین داده‌ها ساخته شده و در نسخه‌های بعدی با لایه‌های خانه‌ها و aspectها عمیق‌تر می‌شود.`;
}

function buildCorePlacementText(
  placement: RealEngineReportPlacement | undefined,
  planetId: "sun" | "moon",
) {
  if (!placement) {
    return undefined;
  }

  const planet = PLANET_COPY[planetId];
  const sign = SIGN_COPY[placement.signId];

  return `${planet.faName}، یعنی ${planet.title}، در ${formatPlacement(placement)} قرار دارد. این جایگاه نشان می‌دهد که ${planet.role}. کیفیت ${sign.faName} این بخش از تو را ${sign.energy} می‌کند. هدیه این جایگاه ${sign.gift} است؛ و مسیر رشدش این است: ${sign.growth}.`;
}

function buildOptionalPlacementText(
  placement: RealEngineReportPlacement | undefined,
  planetId: "mercury" | "venus" | "mars",
) {
  if (!placement) {
    return undefined;
  }

  const planet = PLANET_COPY[planetId];
  const sign = SIGN_COPY[placement.signId];

  return `${planet.faName} در ${formatPlacement(placement)} نشسته است. در لایه ${planet.title}، این یعنی ${planet.role}. وقتی این بخش با انرژی ${sign.faName} کار می‌کند، نقطه قوت اصلی‌اش ${sign.gift} است و چالش طبیعی‌اش ${sign.growth}.`;
}

function buildRisingText(signKey: ZodiacKey, longitude: number) {
  const sign = SIGN_COPY[signKey];

  return `رایزینگ تقریبی تو در ${sign.faName} است (${formatDegree(longitude)} روی دایره چارت). رایزینگ درباره «اولین تماس تو با جهان» حرف می‌زند: اینکه چطور وارد فضاها می‌شوی، چطور دیده می‌شوی و بدنت با موقعیت‌های تازه چه ریتمی می‌گیرد. با ${sign.faName}، ورود تو رنگ ${sign.energy} دارد.`;
}

function buildAspectOverviewText(aspects: RealEngineReportAspect[]) {
  if (aspects.length === 0) {
    return undefined;
  }

  const strongest = aspects.slice(0, 3);
  const aspectLead = strongest
    .map(
      (aspect) =>
        `${aspect.firstPlanetLabel} ${aspect.glyph} ${aspect.secondPlanetLabel} (${aspect.aspectLabel}، orb ${formatAspectDegree(
          aspect.orb,
        )})`,
    )
    .join("؛ ");

  const firstNarrative = strongest[0]?.narrative;

  return `روابط سیاره‌ها در این چارت نشان می‌دهند کدام بخش‌های شخصیت با هم گفت‌وگو، حمایت یا اصطکاک سازنده دارند. برجسته‌ترین رابطه‌ها: ${aspectLead}. ${firstNarrative ?? ""}`.trim();
}

function buildIntegrationText(realEngine: RealEngineReportSnapshot) {
  const visiblePlacements = realEngine.placements
    .slice(0, 6)
    .map((placement) => {
      const planet = PLANET_COPY[placement.id]?.faName ?? placement.label;
      const sign = SIGN_COPY[placement.signId]?.faName ?? placement.signId;

      return `${planet} در ${sign}`;
    })
    .join("، ");

  const aspectCount = realEngine.aspects?.length ?? 0;
  const aspectSummary =
    aspectCount > 0
      ? ` در لایه روابط سیاره‌ها هم ${aspectCount} ارتباط اصلی ذخیره شده که گزارش را از فهرست جایگاه‌ها به یک خوانش پیوسته‌تر نزدیک می‌کند.`
      : " در این نسخه، تمرکز اصلی روی جایگاه‌های واقعی‌تر سیاره‌هاست و لایه روابط سیاره‌ها وقتی داده کافی داشته باشد به گزارش اضافه می‌شود.";

  return `جمع‌بندی چارت: ${visiblePlacements}. این‌ها ستون‌های اولیه گزارش‌اند و متن Halleus از همین داده‌های real engine ساخته شده است.${aspectSummary}`;
}

function findPlacement(snapshot: RealEngineReportSnapshot, id: string) {
  return snapshot.placements.find((placement) => placement.id === id);
}

function formatPlacement(placement: RealEngineReportPlacement) {
  return `${SIGN_COPY[placement.signId].faName}، درجه ${formatDegree(
    placement.degreeInSign,
  )}`;
}

function formatDegree(value: number) {
  return `${value.toFixed(2)}°`;
}

function signFromLongitude(longitude: number): ZodiacKey {
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor(normalized / 30) % SIGN_ORDER.length;

  return SIGN_ORDER[index];
}
