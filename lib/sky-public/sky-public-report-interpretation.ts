import type {
  SkyDailyAspect,
  SkyDailyBodyId,
  SkyDailyPlanetaryState,
  SkyDailySnapshot,
  SkyDailyZodiacSign,
} from "@/lib/sky-daily/sky-daily-contract";
import { SKY_ASPECT_LABELS, SKY_BODY_LABELS, SKY_SIGN_LABELS } from "@/lib/sky-public/sky-public-labels";

export const SKY_PUBLIC_REPORT_INTERPRETATION_SOURCE =
  "sky-public-plain-language" as const;

export type SkyPublicReportInterpretation = {
  source: typeof SKY_PUBLIC_REPORT_INTERPRETATION_SOURCE;
  summary: string;
  planetReadings: Record<SkyDailyBodyId, string>;
  aspectReadings: Record<string, string>;
};

const BODY_DAILY_GUIDE: Record<SkyDailyBodyId, { area: string; use: string; watch: string }> = {
  sun: {
    area: "هویت، دیده‌شدن و انتخاب شخصی",
    use: "برای روشن کردن مسیر، معرفی خودت یا تصمیم درباره اینکه کجا بایستی خوب است.",
    watch: "فقط مراقب باش همه‌چیز را به اعتبار و غرور شخصی گره نزنی.",
  },
  moon: {
    area: "حال احساسی، بدن و واکنش‌های سریع",
    use: "به درد فهمیدن حال لحظه‌ای، نیاز به استراحت و واکنش‌های رابطه‌ای می‌خورد.",
    watch: "اگر حس‌ها تند شدند، همان لحظه از آن‌ها نتیجه قطعی نگیر.",
  },
  mercury: {
    area: "فکر، پیام، نوشتن و تصمیم‌های روزمره",
    use: "برای برنامه‌ریزی، حرف زدن، نوشتن و مرتب کردن جزئیات خوب کار می‌کند.",
    watch: "برای امضای چیزی که برگشت ندارد، اول متن و جزئیات را دوباره بخوان.",
  },
  venus: {
    area: "رابطه، ارزش، لذت، پول و انتخاب",
    use: "برای نرم‌تر کردن گفت‌وگو، زیبایی، خریدهای کوچک و سنجیدن کیفیت رابطه مفید است.",
    watch: "راضی نگه داشتن همه یا خرید از روی احساس می‌تواند تصمیم را کدر کند.",
  },
  mars: {
    area: "انرژی، خشم، جرئت و اقدام",
    use: "برای شروع کار بدنی، دفاع از مرز و بیرون آوردن انرژی گیرکرده کمک می‌کند.",
    watch: "عجله، واکنش تند یا جواب دفاعی می‌تواند دردسر بسازد.",
  },
  jupiter: {
    area: "امید، فرصت، رشد و بزرگ‌کردن موضوع‌ها",
    use: "برای دیدن امکان، یادگیری و فکر کردن به تصویر بزرگ‌تر مناسب است.",
    watch: "قول بزرگ، خرج اضافه یا اعتماد بیش از حد را همان روز قطعی نکن.",
  },
  saturn: {
    area: "مرز، تعهد، زمان و مسئولیت",
    use: "برای نظم دادن، محدود کردن کارهای اضافی و جدی گرفتن برنامه مناسب است.",
    watch: "اگر همه‌چیز کند شد، آن را شکست نخوان؛ شاید روزِ بازبینی و محکم‌کاری باشد.",
  },
  uranus: {
    area: "تغییر ناگهانی، آزادی و ایده‌های غیرمنتظره",
    use: "برای دیدن راه تازه، شکستن عادت و امتحان یک مسیر متفاوت خوب است.",
    watch: "به هر پیام، فکر ناگهانی یا میل به تغییر فوری همان لحظه جواب نده.",
  },
  neptune: {
    area: "ابهام، رویا، الهام و حساسیت",
    use: "برای کار خلاق، مدیتیشن، موسیقی و دیدن لایه‌های احساسی مناسب است.",
    watch: "برای قول دادن، خرید مبهم یا تصمیمی که عدد و سند می‌خواهد، شفافیت بیشتری بگیر.",
  },
  pluto: {
    area: "کنترل، فشار عمیق، رهاسازی و تغییر جدی",
    use: "برای دیدن الگوهای تکراری و کنار گذاشتن چیزی که واقعاً تمام شده مفید است.",
    watch: "بازی قدرت، وسواس یا تلاش برای کنترل واکنش دیگران می‌تواند سنگین شود.",
  },
};

const SIGN_DAILY_GUIDE: Record<SkyDailyZodiacSign, { style: string; watch: string }> = {
  aries: { style: "با سرعت، شروع و واکنش مستقیم جلو می‌رود", watch: "عجله و جواب فوری" },
  taurus: { style: "با ثبات، بدن، پول و چیزهای ملموس کار دارد", watch: "لجبازی یا چسبیدن به امن‌ترین گزینه" },
  gemini: { style: "از راه حرف، پیام، مقایسه و چند مسیر هم‌زمان خودش را نشان می‌دهد", watch: "پراکندگی و تصمیم از روی یک پیام" },
  cancer: { style: "به خانه، خاطره، امنیت و حساسیت رابطه‌ای وصل می‌شود", watch: "دفاعی شدن یا بردن همه‌چیز به دل" },
  leo: { style: "دیده‌شدن، خلاقیت و اعتمادبه‌نفس را پررنگ می‌کند", watch: "غرور یا نیاز زیاد به تایید" },
  virgo: { style: "از جزئیات، نظم، اصلاح و کارهای عملی عبور می‌کند", watch: "وسواس و گیر کردن روی ایراد کوچک" },
  libra: { style: "رابطه، انصاف، زیبایی و انتخاب میان دو طرف را پررنگ می‌کند", watch: "تصمیم نگرفتن برای راضی نگه داشتن همه" },
  scorpio: { style: "مرز، صمیمیت، کنترل و چیزهای پنهان‌تر را بالا می‌آورد", watch: "شدت زیاد یا خواندن نیت دیگران بدون شاهد" },
  sagittarius: { style: "به آزادی، معنا، یادگیری و تصمیم‌های بزرگ‌تر وصل می‌شود", watch: "اغراق یا قول دادن قبل از دیدن جزئیات" },
  capricorn: { style: "برنامه، مسئولیت، نتیجه و واقع‌بینی را جدی‌تر می‌کند", watch: "سخت گرفتن بیش از حد به خودت یا دیگران" },
  aquarius: { style: "فاصله ذهنی، نگاه از بیرون، جمع و راه متفاوت را فعال می‌کند", watch: "سرد شدن بیش از حد یا بریدن ناگهانی" },
  pisces: { style: "حساسیت، تخیل، همدلی و مرزهای نرم را بیشتر می‌کند", watch: "ابهام، فرار از واقعیت یا قول احساسی" },
};

export function buildSkyPublicReportInterpretation(
  snapshot: SkyDailySnapshot,
): SkyPublicReportInterpretation {
  const retrogradePlanetIds = snapshot.planetaryStates
    .filter((state) => state.motion === "retrograde")
    .map((state) => state.body);
  const stateByBody = new Map(
    snapshot.planetaryStates.map((state) => [state.body, state]),
  );
  const planetReadings = Object.fromEntries(
    snapshot.planetaryStates.map((state) => [state.body, buildPlainPublicPlacementReading(state)]),
  ) as Record<SkyDailyBodyId, string>;
  const aspectReadings = Object.fromEntries(
    snapshot.aspects.map((aspect) => {
      const firstState = stateByBody.get(aspect.leftBody);
      const secondState = stateByBody.get(aspect.rightBody);
      const reading = buildPlainPublicAspectReading(aspect, firstState, secondState, retrogradePlanetIds);

      return [aspectKey(aspect), reading];
    }),
  );
  const moonReading = planetReadings.moon;
  const leadAspectReading = snapshot.aspects[0]
    ? aspectReadings[aspectKey(snapshot.aspects[0])]
    : undefined;

  return {
    source: SKY_PUBLIC_REPORT_INTERPRETATION_SOURCE,
    summary: [leadAspectReading, moonReading].filter(Boolean).join(" "),
    planetReadings,
    aspectReadings,
  };
}

export function skyPublicAspectKey(aspect: SkyDailyAspect) {
  return aspectKey(aspect);
}

function aspectKey(aspect: SkyDailyAspect) {
  return `${aspect.leftBody}:${aspect.kind}:${aspect.rightBody}`;
}

function buildPlainPublicPlacementReading(state: SkyDailyPlanetaryState) {
  const body = BODY_DAILY_GUIDE[state.body];
  const sign = SIGN_DAILY_GUIDE[state.sign];
  const motionNote = state.motion === "retrograde"
    ? "چون برگشتی است، امروز برای مرور، اصلاح متن‌ها و دوباره‌دیدن تصمیم‌ها بهتر از جواب نهایی است."
    : state.motion === "stationing" || state.nearStation
      ? "چون نزدیک تغییر جهت است، ممکن است ریتم این موضوع یک‌دفعه کند، حساس یا عوض‌شونده حس شود."
      : "حرکتش مستقیم است، پس این موضوع راحت‌تر وارد کارهای روزمره می‌شود.";

  return `${SKY_BODY_LABELS[state.body]} امروز روی ${body.area} نور می‌اندازد. چون در ${SKY_SIGN_LABELS[state.sign]} است، این موضوع ${sign.style}. از آن برای امروز این‌طور استفاده کن: ${body.use} سمت سختش هم این است: ${body.watch} مخصوصاً اگر ${sign.watch} بالا آمد. ${motionNote}`;
}

function buildPlainPublicAspectReading(
  aspect: SkyDailyAspect,
  firstState: SkyDailyPlanetaryState | undefined,
  secondState: SkyDailyPlanetaryState | undefined,
  retrogradePlanetIds: SkyDailyBodyId[],
) {
  const left = BODY_DAILY_GUIDE[aspect.leftBody];
  const right = BODY_DAILY_GUIDE[aspect.rightBody];
  const firstSign = firstState ? SIGN_DAILY_GUIDE[firstState.sign] : undefined;
  const secondSign = secondState ? SIGN_DAILY_GUIDE[secondState.sign] : undefined;
  const retrogradeNote = retrogradePlanetIds.includes(aspect.leftBody) || retrogradePlanetIds.includes(aspect.rightBody)
    ? "چون یکی از دو سیاره برگشتی است، بهتر است عجله برای نتیجه نهایی کمتر باشد."
    : "";
  const precision = aspect.orb < 1
    ? "اورب این زاویه کم است، پس در داده امروز پررنگ‌تر حساب می‌شود."
    : "اورب این زاویه خیلی کم نیست، پس آن را به عنوان زمینه روز بخوان، نه حکم قطعی.";

  if (aspect.kind === "square" || aspect.kind === "opposition") {
    return `اینجا بین ${left.area} و ${right.area} اصطکاک دیده می‌شود. ممکن است عجله، حساسیت، سوءبرداشت یا دو خواستهٔ متفاوت هم‌زمان بالا بیاید. برای قرارداد، خرید بزرگ، جواب تند یا تصمیمی که برگشت ندارد، بهتر است مکث کنی و جزئیات را دوباره ببینی. ${firstSign && secondSign ? `یک طرف ماجرا ${firstSign.style} و طرف دیگر ${secondSign.style}.` : ""} ${precision} ${retrogradeNote}`.trim();
  }

  if (aspect.kind === "trine" || aspect.kind === "sextile") {
    return `این زاویه کمک می‌کند ${left.area} و ${right.area} راحت‌تر با هم هماهنگ شوند. برای شروع آرام، گفت‌وگوی سبک، مرتب کردن برنامه یا برداشتن یک قدم واقعی مناسب‌تر است. فقط حواست باشد فرصت خوب هم اگر بدون مرز و زمان‌بندی باشد، می‌تواند پخش و بی‌نتیجه شود. ${precision} ${retrogradeNote}`.trim();
  }

  return `در ${SKY_ASPECT_LABELS[aspect.kind]}، ${left.area} و ${right.area} روی هم می‌افتند و توجه بیشتری می‌خواهند. این می‌تواند تمرکز و شروع بدهد، ولی اگر زیادش کنی ممکن است یک موضوع بیش از حد بزرگ یا شخصی شود. امروز بهتر است همان یک نقطه را روشن کنی و تصمیم‌های حساس را با شواهد بیشتر جلو ببری. ${precision} ${retrogradeNote}`.trim();
}
