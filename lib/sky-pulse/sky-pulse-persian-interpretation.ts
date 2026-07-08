import type {
  SkyOnlyTransitAspect,
  SkyOnlyTransitBody,
  SkyOnlyTransitBodyId,
  SkyOnlyTransitAspectId,
  SkyPulseHomepageTransitResult,
} from "@/src/lib/chart/sky-only-transit-probe";

export const SKY_PULSE_PERSIAN_INTERPRETATION_VERSION =
  "v0.1.249-sky-pulse-persian-interpretation" as const;

export const SKY_PULSE_PERSIAN_INTERPRETATION_STATUS =
  "persian-technical-inspirational-layer" as const;

export const SKY_PULSE_PERSIAN_INTERPRETATION_MODE =
  "public-sky-only-tehran-daily-interpretation" as const;

export type SkyPulsePersianAspectInterpretation = {
  id: string;
  title: string;
  summary: string;
  technicalNote: string;
  inspiration: string;
  reflection: string;
  avoid: string;
};

export type SkyPulsePersianInterpretationLayer = {
  version: typeof SKY_PULSE_PERSIAN_INTERPRETATION_VERSION;
  status: typeof SKY_PULSE_PERSIAN_INTERPRETATION_STATUS;
  mode: typeof SKY_PULSE_PERSIAN_INTERPRETATION_MODE;
  source: "real-sky-only-transit-aspects";
  timezone: SkyPulseHomepageTransitResult["timezone"];
  localDate: string;
  sampleLocalTime: string;
  seoPhrases: string[];
  title: string;
  summary: string;
  skyMood: string;
  primaryAspects: SkyPulsePersianAspectInterpretation[];
  technicalTrustNote: string;
  publicScopeNote: string;
  copyPolicy: string[];
};

const SEO_PHRASES = [
  "آسمان امروز",
  "ترنزیت امروز",
  "ترنزیت روزانه",
  "وضعیت آسمان امروز",
  "حال و هوای آسمان امروز",
] as const;

const BODY_LABELS_FA: Record<SkyOnlyTransitBodyId, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

const SIGN_LABELS_FA: Record<string, string> = {
  aries: "حمل",
  taurus: "ثور",
  gemini: "جوزا",
  cancer: "سرطان",
  leo: "اسد",
  virgo: "سنبله",
  libra: "میزان",
  scorpio: "عقرب",
  sagittarius: "قوس",
  capricorn: "جدی",
  aquarius: "دلو",
  pisces: "حوت",
};

const ASPECT_LABELS_FA: Record<SkyOnlyTransitAspectId, string> = {
  conjunction: "هم‌نشینی",
  sextile: "تسهیل",
  square: "چالش زاویه‌ای",
  trine: "هماهنگی روان",
  opposition: "رویارویی",
};

const ASPECT_SUMMARIES: Record<SkyOnlyTransitAspectId, string> = {
  conjunction: "دو نیروی آسمان در یک ناحیه نزدیک می‌شوند و موضوع مشترکی را پررنگ‌تر می‌کنند.",
  sextile: "بین دو نیروی آسمان مسیر همکاری نرم‌تری دیده می‌شود؛ فرصت هست، اما نیاز به انتخاب آگاهانه دارد.",
  square: "میان دو نیروی آسمان اصطکاکی فعال است؛ بهتر است واکنش سریع را به تنظیم آگاهانه تبدیل کنی.",
  trine: "بین دو نیروی آسمان جریان روان‌تری شکل می‌گیرد؛ استفاده سالم از آن به حضور و توجه نیاز دارد.",
  opposition: "دو نیروی آسمان روبه‌روی هم قرار می‌گیرند و موضوع تعادل، فاصله و دیدن هر دو سوی ماجرا پررنگ‌تر می‌شود.",
};

const ASPECT_REFLECTIONS: Record<SkyOnlyTransitAspectId, string> = {
  conjunction: "امروز ببین کدام موضوع دارد بیشتر از بقیه توجه تو را جمع می‌کند.",
  sextile: "امروز یک فرصت کوچک را جدی بگیر، اما آن را با فشار یا عجله خراب نکن.",
  square: "امروز قبل از جواب دادن، یک مکث کوتاه بین حس و واکنش بگذار.",
  trine: "امروز از مسیرهای روان‌تر استفاده کن، بی‌آنکه واقعیت‌های مهم را نادیده بگیری.",
  opposition: "امروز از خودت بپرس کدام دو نیاز هم‌زمان دیده شدن می‌خواهند.",
};

const ASPECT_AVOID: Record<SkyOnlyTransitAspectId, string> = {
  conjunction: "از یکی کردن همه تجربه‌ها با یک حس لحظه‌ای پرهیز کن.",
  sextile: "منتظر نشانه کامل نمان؛ فرصت‌های کوچک هم ارزش امتحان دارند.",
  square: "اصطکاک را به معنای شکست نگیر و تصمیم تند را به تعویق بینداز.",
  trine: "آسان‌تر شدن فضا را با بی‌نیازی از دقت اشتباه نگیر.",
  opposition: "برای آرام کردن تنش، یک سوی ماجرا را حذف نکن.",
};

const MAX_PRIMARY_ASPECTS = 4;

function formatDegree(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function getBodyLabel(bodyId: SkyOnlyTransitBodyId): string {
  return BODY_LABELS_FA[bodyId];
}

function getBodySignLabel(body: SkyOnlyTransitBody | undefined): string {
  if (!body) {
    return "جایگاه نامشخص";
  }

  return SIGN_LABELS_FA[body.signId] ?? body.signId;
}

function describeBodyPosition(body: SkyOnlyTransitBody | undefined): string {
  if (!body) {
    return "جایگاه این جرم در خروجی محاسبه پیدا نشد.";
  }

  return `${getBodyLabel(body.id)} در ${formatDegree(body.degreeInSign)} درجه ${getBodySignLabel(body)}`;
}

function buildAspectInterpretation(
  aspect: SkyOnlyTransitAspect,
  bodiesById: Map<SkyOnlyTransitBodyId, SkyOnlyTransitBody>,
): SkyPulsePersianAspectInterpretation {
  const bodyA = bodiesById.get(aspect.bodyA);
  const bodyB = bodiesById.get(aspect.bodyB);
  const bodyALabel = getBodyLabel(aspect.bodyA);
  const bodyBLabel = getBodyLabel(aspect.bodyB);
  const aspectLabel = ASPECT_LABELS_FA[aspect.aspect];

  return {
    id: aspect.id,
    title: `${aspectLabel} ${bodyALabel} و ${bodyBLabel}`,
    summary: ASPECT_SUMMARIES[aspect.aspect],
    technicalNote: `${describeBodyPosition(bodyA)} و ${describeBodyPosition(
      bodyB,
    )}. جدایی زاویه‌ای امروز ${formatDegree(aspect.separation)} درجه است؛ فاصله از زاویه دقیق ${formatDegree(
      aspect.orb,
    )} درجه و حد مجاز orb ${formatDegree(aspect.orbLimit)} درجه ثبت شده است.`,
    inspiration: `در حال و هوای آسمان امروز، پیوند ${bodyALabel} و ${bodyBLabel} می‌تواند یک نشانه برای مشاهده دقیق‌تر ریتم درونی باشد؛ نه حکم قطعی برای تصمیم‌های زندگی.`,
    reflection: ASPECT_REFLECTIONS[aspect.aspect],
    avoid: ASPECT_AVOID[aspect.aspect],
  };
}

function buildEmptyAspectSummary(transit: SkyPulseHomepageTransitResult): Pick<
  SkyPulsePersianInterpretationLayer,
  "summary" | "skyMood" | "primaryAspects"
> {
  return {
    summary:
      "در ترنزیت امروز، در محدوده aspectهای اصلی و orbهای تعریف‌شده، aspect نزدیک و قابل گزارش پیدا نشد. بنابراین Halleus امروز به‌جای ساختن ادعای مصنوعی، فقط زمینه کلی آسمان را با داده محاسباتی نگه می‌دارد.",
    skyMood:
      "وضعیت آسمان امروز آرام‌تر خوانده می‌شود: نبود aspect اصلی نزدیک، خودش یک داده است و یعنی بهتر است از بزرگ‌نمایی نشانه‌ها پرهیز شود.",
    primaryAspects: [],
  };
}

export function buildSkyPulsePersianInterpretation(
  transit: SkyPulseHomepageTransitResult,
): SkyPulsePersianInterpretationLayer {
  const bodiesById = new Map(transit.bodies.map((body) => [body.id, body]));
  const primaryAspects = transit.aspects
    .slice(0, MAX_PRIMARY_ASPECTS)
    .map((aspect) => buildAspectInterpretation(aspect, bodiesById));
  const emptySummary = primaryAspects.length === 0 ? buildEmptyAspectSummary(transit) : null;
  const leadAspect = primaryAspects[0];

  return {
    version: SKY_PULSE_PERSIAN_INTERPRETATION_VERSION,
    status: SKY_PULSE_PERSIAN_INTERPRETATION_STATUS,
    mode: SKY_PULSE_PERSIAN_INTERPRETATION_MODE,
    source: "real-sky-only-transit-aspects",
    timezone: transit.timezone,
    localDate: transit.localDate,
    sampleLocalTime: transit.sampleLocalTime,
    seoPhrases: [...SEO_PHRASES],
    title: "آسمان امروز؛ ترنزیت روزانه تهران",
    summary:
      emptySummary?.summary ??
      `ترنزیت امروز بر اساس aspectهای واقعی محاسبه‌شده برای آسمان عمومی تهران ساخته شده است. برجسته‌ترین نشانه امروز ${leadAspect?.title ?? "بدون aspect اصلی"} است و باید به‌عنوان زبان مشاهده و خودشناسی خوانده شود، نه پیش‌گویی یا دستور قطعی.`,
    skyMood:
      emptySummary?.skyMood ??
      `حال و هوای آسمان امروز بیشتر با ${leadAspect?.title ?? "ریتم کلی آسمان"} شروع می‌شود. این خوانش عمومی است و هنوز به چارت تولد شخصی وصل نشده است.`,
    primaryAspects: emptySummary?.primaryAspects ?? primaryAspects,
    technicalTrustNote:
      `این متن از خروجی sky-only transit ساخته شده است: ${transit.bodies.length} جرم آسمانی، ${transit.aspects.length} aspect معتبر، زمان نمونه ${transit.sampleLocalTime} در timezone ${transit.timezone}.`,
    publicScopeNote:
      "این لایه برای Sky Pulse عمومی، رایگان و بدون لاگین است؛ هنوز natal-to-transit، خانه‌ها، زاویه‌ها، دست‌های ماه، لیلیت و گزارش شخصی را وارد نمی‌کند.",
    copyPolicy: [
      "فنی + الهام‌بخش",
      "بدون ادعای قطعی یا ترسناک",
      "بدون متن ساختگی وقتی aspect معتبر وجود ندارد",
      "سازگار با آسمان امروز، ترنزیت امروز و ترنزیت روزانه",
    ],
  };
}
