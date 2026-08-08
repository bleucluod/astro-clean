import type { BehavioralAudienceMode } from "@/lib/astrology/report-behavioral-interpretation";
import type {
  NatalToTransitAspectId,
  NatalToTransitBodyId,
} from "@/src/lib/chart/natal-to-transit-contract";

export const PERSONAL_TRANSIT_RELEVANCE_VERSION =
  "v0.1.321-personal-transit-relevance" as const;

const PERSONAL_BODIES = new Set<NatalToTransitBodyId>([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
]);

const OUTER_BODIES = new Set<NatalToTransitBodyId>([
  "uranus",
  "neptune",
  "pluto",
]);

const BODY_LABELS_FA: Record<NatalToTransitBodyId, string> = {
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

const NATAL_THEME_FA: Record<
  NatalToTransitBodyId,
  {
    theme: string;
    field: string;
    healthy: string;
    friction: string;
    adultScenario: string;
    youthScenario: string;
    caregiverScenario: string;
  }
> = {
  sun: {
    theme: "هویت و جهت",
    field: "حس هویت، اراده و جهت شخصی",
    healthy: "یک انتخاب را با ارزش‌ها و خواست واقعی هماهنگ کنی",
    friction: "نیاز به دیده‌شدن یا ثابت‌کردن خود، جای انتخاب روشن را بگیرد",
    adultScenario: "تصمیمی درباره نقش، مسیر یا شیوه دیده‌شدن",
    youthScenario: "انتخابی درباره استقلال، دیده‌شدن یا مسئولیتی که پذیرفته‌ای",
    caregiverScenario: "واکنش کودک به دیده‌شدن، تشویق یا فرصت انتخاب مستقل",
  },
  moon: {
    theme: "امنیت و احساس",
    field: "نیاز عاطفی، امنیت درونی و واکنش‌های فوری",
    healthy: "نیاز واقعی را پیش از واکنش نام‌گذاری کنی",
    friction: "حال لحظه‌ای به‌جای نیاز اصلی تصمیم بگیرد",
    adultScenario: "موقعیتی در خانه، رابطه نزدیک یا زمان استراحت",
    youthScenario: "موقعیتی در خانه، دوستی یا فضای مدرسه که احساسات را بالا آورده",
    caregiverScenario: "تغییر خلق، نیاز به آرام‌شدن یا واکنش کودک در خانه و مدرسه",
  },
  mercury: {
    theme: "فکر و گفت‌وگو",
    field: "ذهن، گفت‌وگو، یادگیری و شیوه پردازش",
    healthy: "فکر را کوتاه، روشن و قابل گفت‌وگو کنی",
    friction: "سرعت ذهن یا تکرار فکر، شنیدن و تصمیم‌گیری را سخت کند",
    adultScenario: "گفت‌وگو، پیام، برنامه یا تصمیمی که نیاز به بازبینی داشته",
    youthScenario: "درس، پیام، گفت‌وگو یا تصمیمی که نیاز به توضیح ساده‌تر داشته",
    caregiverScenario: "شیوه پرسیدن، توضیح‌دادن یا فهم کودک در یک موقعیت روزمره",
  },
  venus: {
    theme: "ارزش و نزدیکی",
    field: "ارزش‌ها، پسند، پیوند و شیوه نزدیک‌شدن",
    healthy: "مرز و علاقه را بدون راضی‌کردن اجباری کنار هم نگه داری",
    friction: "تأییدگرفتن یا اجتناب از ناراحتی، انتخاب واقعی را پنهان کند",
    adultScenario: "تعامل نزدیک، خرج، انتخاب زیبایی‌شناختی یا تعیین حد رابطه",
    youthScenario: "دوستی، تعلق به جمع، انتخاب شخصی یا مرزی که باید گفته شود",
    caregiverScenario: "شیوه کودک در دوست‌شدن، شریک‌شدن، نه‌گفتن یا انتخاب چیزی که دوست دارد",
  },
  mars: {
    theme: "انرژی و اقدام",
    field: "جرئت، خشم، انگیزه و شیوه اقدام",
    healthy: "انرژی را به یک حرکت مستقیم و اندازه‌دار تبدیل کنی",
    friction: "فشار جمع‌شده به عجله، دعوا یا خاموش‌شدن ناگهانی برسد",
    adultScenario: "کاری که باید شروع، متوقف یا با مرز روشن‌تری انجام می‌شد",
    youthScenario: "رقابت، فعالیت، مخالفت یا کاری که انرژی زیادی خواسته",
    caregiverScenario: "نحوه شروع‌کردن، مخالفت‌کردن یا تخلیه انرژی کودک در بازی و کارهای روزانه",
  },
  jupiter: {
    theme: "رشد و معنا",
    field: "باور، امید، یادگیری و میل به گسترش",
    healthy: "فرصت را با اندازه و قدم بعدی واقعی همراه کنی",
    friction: "هیجان رشد، محدودیت زمان یا توان را نبیند",
    adultScenario: "فرصتی برای یادگیری، سفر ذهنی یا بزرگ‌ترکردن یک برنامه",
    youthScenario: "فرصتی برای یادگیری، تجربه تازه یا اعتماد بیشتر به توانایی‌ها",
    caregiverScenario: "کنجکاوی، امید یا میل کودک به تجربه‌ای بزرگ‌تر از توان فعلی",
  },
  saturn: {
    theme: "مرز و مسئولیت",
    field: "مرز، مسئولیت، ترس و ساختن توان پایدار",
    healthy: "یک حد واقعی را بپذیری و قدم کوچک قابل تکرار بسازی",
    friction: "سخت‌گیری یا ترس از اشتباه، حرکت را متوقف کند",
    adultScenario: "تعهد، تأخیر یا مسئولیتی که نیاز به ساختار روشن‌تر داشته",
    youthScenario: "قانون، تکلیف یا انتظاری که سنگین‌تر از معمول حس شده",
    caregiverScenario: "واکنش کودک به قانون، تأخیر، تمرین یا مسئولیتی متناسب با سن",
  },
  uranus: {
    theme: "تغییر و آزادی",
    field: "استقلال، تغییر ناگهانی و شکستن الگو",
    healthy: "تغییر لازم را کوچک و قابل آزمون نگه داری",
    friction: "بی‌قراری، هر ساختاری را دشمن آزادی نشان دهد",
    adultScenario: "برنامه‌ای که ناگهان تغییر کرده یا نیاز به روش تازه‌ای داشته",
    youthScenario: "میل به متفاوت‌بودن یا تغییر برنامه‌ای که محدودکننده حس شده",
    caregiverScenario: "بی‌قراری، مقاومت در برابر برنامه یا نیاز کودک به انتخاب و تنوع",
  },
  neptune: {
    theme: "حساسیت و مرزبندی",
    field: "حساسیت، خیال، الهام و مرزهای روانی",
    healthy: "احساس ظریف را با واقعیت قابل بررسی همراه کنی",
    friction: "ابهام یا خیال، حد و واقعیت موقعیت را کمرنگ کند",
    adultScenario: "موقعیتی مبهم، الهام‌بخش یا خسته‌کننده که مرز روشنی نداشته",
    youthScenario: "سردرگمی، خیال‌پردازی یا حساسیتی که توضیح روشن‌تری می‌خواسته",
    caregiverScenario: "حساسیت کودک به فضا، خستگی، خیال یا پیام‌های مبهم اطراف",
  },
  pluto: {
    theme: "شدت و دگرگونی",
    field: "قدرت، کنترل، شدت روانی و رهاکردن الگوی فرسوده",
    healthy: "شدت را به مشاهده صادقانه و یک تغییر محدود تبدیل کنی",
    friction: "کنترل یا همه‌یا‌هیچ‌دیدن، انتخاب‌های میانی را حذف کند",
    adultScenario: "موقعیتی که احساس کنترل، ترس از دست‌دادن یا تغییر عمیق را فعال کرده",
    youthScenario: "فشار درونی یا کشمکشی که بیش از اندازه بزرگ و قطعی حس شده",
    caregiverScenario: "واکنش شدید کودک به از دست‌دادن کنترل، تغییر یا پایان یک الگو",
  },
};

const TRANSIT_ROLE_FA: Record<
  NatalToTransitBodyId,
  {
    attention: string;
    helpful: string;
    friction: string;
    action: string;
    caregiverAction: string;
  }
> = {
  sun: {
    attention: "نور و توجه را روی یک موضوع جمع کند",
    helpful: "موضوع اصلی را بدون حاشیه ببینی",
    friction: "نیاز به نتیجه فوری یا دیده‌شدن بالا برود",
    action: "یک جمله بنویس که مهم‌ترین انتخاب همان بازه را روشن کند",
    caregiverAction: "از کودک بپرس در آن موقعیت دوست داشته چه چیزی دیده یا شنیده شود",
  },
  moon: {
    attention: "حالت عاطفی و نیاز لحظه‌ای را پررنگ کند",
    helpful: "بدن و احساس را زودتر تشخیص بدهی",
    friction: "حال لحظه‌ای سریع تغییر کند و تصمیم را با خود ببرد",
    action: "پیش از نتیجه‌گیری، احساس و نیاز را در دو واژه جدا نام ببر",
    caregiverAction: "برای کودک دو انتخاب ساده برای نام‌بردن احساس و نیاز فراهم کن",
  },
  mercury: {
    attention: "فکر، پیام و تصمیم را به حرکت بیندازد",
    helpful: "موضوع را به زبان دقیق‌تر تبدیل کنی",
    friction: "فکرها زیاد شوند یا گفتگو پیش از شنیدن کامل جلو برود",
    action: "پیام یا تصمیم را در سه خط کوتاه بازنویسی کن",
    caregiverAction: "از کودک بخواه موضوع را با یک جمله یا نقاشی ساده توضیح دهد",
  },
  venus: {
    attention: "ارزش، نزدیکی و حس پسند را فعال کند",
    helpful: "آنچه واقعاً دوست داری یا نمی‌خواهی روشن‌تر شود",
    friction: "آرام نگه‌داشتن فضا از صداقت مهم‌تر شود",
    action: "یک ترجیح و یک مرز را بدون توضیح طولانی بیان کن",
    caregiverAction: "به کودک فرصت بده یک علاقه و یک نهِ محترمانه را بیان کند",
  },
  mars: {
    attention: "انرژی، میل و واکنش عملی را بالا ببرد",
    helpful: "کار لازم را مستقیم‌تر شروع کنی",
    friction: "عجله یا خشم پیش از انتخاب مسیر ظاهر شود",
    action: "انرژی را در یک حرکت ده‌دقیقه‌ای و مشخص مصرف کن",
    caregiverAction: "برای کودک یک حرکت بدنی کوتاه و سپس یک انتخاب روشن فراهم کن",
  },
  jupiter: {
    attention: "امید و میل به گسترش را بیشتر کند",
    helpful: "امکان بزرگ‌تر را ببینی و معنا پیدا کنی",
    friction: "قول یا انتظار از ظرفیت واقعی جلو بزند",
    action: "فرصت را به کوچک‌ترین قدم قابل انجام تبدیل کن",
    caregiverAction: "کنجکاوی کودک را به یک تجربه کوچک و قابل پایان تبدیل کن",
  },
  saturn: {
    attention: "مرز، زمان و مسئولیت را جدی‌تر کند",
    helpful: "ساختار لازم را ببینی و توان را حفظ کنی",
    friction: "ترس از اشتباه یا سنگینی وظیفه بالا برود",
    action: "یک حد و یک قدم قابل تکرار برای موضوع تعیین کن",
    caregiverAction: "قانون را کوتاه بگو و یک مسئولیت متناسب با سن تعریف کن",
  },
  uranus: {
    attention: "نیاز به تغییر و آزادی را ناگهانی‌تر کند",
    helpful: "روش تازه‌ای را امتحان کنی",
    friction: "بی‌قراری هر ثباتی را محدودیت نشان دهد",
    action: "فقط یک بخش از الگو را به‌صورت آزمایشی تغییر بده",
    caregiverAction: "به کودک میان دو روش امن و متفاوت حق انتخاب بده",
  },
  neptune: {
    attention: "حساسیت، خیال و ابهام را بیشتر کند",
    helpful: "نشانه‌های ظریف و خلاقیت را ببینی",
    friction: "مرز واقعیت، حدس و آرزو مخلوط شود",
    action: "سه چیز را جدا کن: واقعیت، برداشت و آرزو",
    caregiverAction: "برای کودک فرق میان چیزی که دیده، حدس زده و آرزو کرده روشن کن",
  },
  pluto: {
    attention: "شدت و نیاز به تغییر عمیق را بالا بیاورد",
    helpful: "ریشه فشار را صادقانه‌تر ببینی",
    friction: "کنترل یا نگاه همه‌یا‌هیچ جای انتخاب تدریجی را بگیرد",
    action: "فقط یک رفتار قابل کنترل را برای تغییر انتخاب کن",
    caregiverAction: "به کودک کمک کن از میان واکنش شدید، یک بخش کوچک و قابل انتخاب را پیدا کند",
  },
};

const ASPECT_FRAME_FA: Record<
  NatalToTransitAspectId,
  { framework: string; helpful: string; friction: string }
> = {
  conjunction: {
    framework: "دو نیرو روی یک نقطه جمع می‌شدند و موضوع را فشرده‌تر می‌کردند",
    helpful: "تمرکز را روی یک اولویت نگه داری",
    friction: "فاصله لازم برای دیدن انتخاب‌های دیگر کم شود",
  },
  opposition: {
    framework: "دو قطب روبه‌روی هم قرار می‌گرفتند و تعادل می‌خواستند",
    helpful: "هر دو طرف موقعیت را ببینی و مذاکره کنی",
    friction: "یک قطب به فرد یا موقعیت بیرونی نسبت داده شود",
  },
  square: {
    framework: "اصطکاک، نیاز به تصمیم و تغییر روش را بالا می‌برد",
    helpful: "فشار را به اقدام مشخص تبدیل کنی",
    friction: "عجله برای خلاص‌شدن از فشار، انتخاب ضعیف‌تری بسازد",
  },
  trine: {
    framework: "جریان میان دو نیرو روان‌تر بود و استفاده آگاهانه می‌خواست",
    helpful: "استعداد یا امکان موجود را عمداً به کار بگیری",
    friction: "آسانی باعث شود موضوع جدی گرفته نشود",
  },
  sextile: {
    framework: "یک فرصت کوچک و قابل استفاده میان دو نیرو باز می‌کرد",
    helpful: "فرصت را با یک حرکت داوطلبانه فعال کنی",
    friction: "منتظر بمانی فرصت بدون اقدام خودش کامل شود",
  },
};

export type PersonalTransitAspectLike = {
  id: string;
  aspect: NatalToTransitAspectId;
  transitBody: NatalToTransitBodyId;
  natalBody: NatalToTransitBodyId;
  orb: number;
  orbLimit: number;
};

export type PersonalTransitSelectionContext = {
  audienceMode?: BehavioralAudienceMode;
  chartRulerId?: string | null;
  angularNatalBodyIds?: string[];
  activeNatalBodyIds?: string[];
  natalHouseByBody?: Partial<Record<NatalToTransitBodyId, number | null>>;
  maxVisible?: number;
};

export type PersonalTransitBehavioralInterpretation = {
  theme: string;
  attention: string;
  scenario: string;
  helpful: string;
  friction: string;
  action: string;
  technicalDetail: string;
};

export function selectPersonalTransitHighlights<
  TAspect extends PersonalTransitAspectLike,
>(
  aspects: readonly TAspect[],
  context: PersonalTransitSelectionContext = {},
): TAspect[] {
  const maxVisible = clampVisibleCount(context.maxVisible ?? 5);
  const chartRulerId = context.chartRulerId ?? null;
  const angularBodies = new Set(context.angularNatalBodyIds ?? []);
  const activeBodies = new Set(context.activeNatalBodyIds ?? []);
  const candidates = dedupeAspects(aspects).map((aspect, index) => ({
    aspect,
    index,
    baseScore: scoreTransitAspect(aspect, {
      chartRulerId,
      angularBodies,
      activeBodies,
    }),
  }));
  const selected: TAspect[] = [];
  const natalCounts = new Map<string, number>();
  const transitCounts = new Map<string, number>();
  let outerOnlyCount = 0;

  while (selected.length < maxVisible && candidates.length > 0) {
    let bestIndex = -1;
    let bestAdjustedScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const aspect = candidate.aspect;
      const outerOnly = isOuterOnly(aspect);

      if (outerOnly && outerOnlyCount >= 1 && hasNonOuterCandidate(candidates, index)) {
        continue;
      }

      if (
        (natalCounts.get(aspect.natalBody) ?? 0) >= 2 &&
        hasNatalDiversityCandidate(candidates, index, natalCounts)
      ) {
        continue;
      }

      const repeatedNatalPenalty = (natalCounts.get(aspect.natalBody) ?? 0) * 42;
      const repeatedTransitPenalty = (transitCounts.get(aspect.transitBody) ?? 0) * 12;
      const adjustedScore =
        candidate.baseScore - repeatedNatalPenalty - repeatedTransitPenalty;

      if (
        adjustedScore > bestAdjustedScore ||
        (adjustedScore === bestAdjustedScore &&
          compareTransitAspects(candidate, candidates[bestIndex]) < 0)
      ) {
        bestIndex = index;
        bestAdjustedScore = adjustedScore;
      }
    }

    if (bestIndex < 0) {
      break;
    }

    const [chosen] = candidates.splice(bestIndex, 1);
    selected.push(chosen.aspect);
    natalCounts.set(
      chosen.aspect.natalBody,
      (natalCounts.get(chosen.aspect.natalBody) ?? 0) + 1,
    );
    transitCounts.set(
      chosen.aspect.transitBody,
      (transitCounts.get(chosen.aspect.transitBody) ?? 0) + 1,
    );

    if (isOuterOnly(chosen.aspect)) {
      outerOnlyCount += 1;
    }
  }

  return selected;
}

export function scorePersonalTransitRelevance(
  aspect: PersonalTransitAspectLike,
  context: PersonalTransitSelectionContext = {},
): number {
  return scoreTransitAspect(aspect, {
    chartRulerId: context.chartRulerId ?? null,
    angularBodies: new Set(context.angularNatalBodyIds ?? []),
    activeBodies: new Set(context.activeNatalBodyIds ?? []),
  });
}

export function buildPersonalTransitBehavioralInterpretation(
  aspect: PersonalTransitAspectLike,
  audienceMode: BehavioralAudienceMode = "adult",
  natalHouseNumber: number | null = null,
): PersonalTransitBehavioralInterpretation {
  const transit = TRANSIT_ROLE_FA[aspect.transitBody];
  const natal = NATAL_THEME_FA[aspect.natalBody];
  const frame = ASPECT_FRAME_FA[aspect.aspect];
  const transitLabel = BODY_LABELS_FA[aspect.transitBody];
  const natalLabel = BODY_LABELS_FA[aspect.natalBody];
  const scenario = getAudienceScenario(natal, audienceMode, natalHouseNumber);
  const action =
    audienceMode === "caregiver" ? transit.caregiverAction : transit.action;

  return {
    theme: natal.theme,
    attention: `${transitLabel} ترنزیتی می‌توانسته ${transit.attention} و آن را به ${natal.field} در چارت تولد وصل کند؛ در این زاویه ${frame.framework}.`,
    scenario: `اگر این تماس در تجربه همان بازه محسوس بوده، ممکن بود در ${scenario} خودش را نشان دهد.`,
    helpful: `استفاده سازنده این بود که ${transit.helpful} و هم‌زمان ${natal.healthy}؛ در این حالت می‌شد ${frame.helpful}.`,
    friction: `گیر محتمل این بود که ${transit.friction} و ${natal.friction}؛ در نتیجه ممکن بود ${frame.friction}.`,
    action,
    technicalDetail: `اورب ${roundToTwo(aspect.orb)} درجه از سقف ${roundToTwo(aspect.orbLimit)} درجه؛ اورب کمتر فقط نزدیکی هندسی تماس را نشان می‌دهد، نه قطعیت رویداد.`,
  };
}

function scoreTransitAspect(
  aspect: PersonalTransitAspectLike,
  context: {
    chartRulerId: string | null;
    angularBodies: Set<string>;
    activeBodies: Set<string>;
  },
): number {
  const orbRatio =
    aspect.orbLimit > 0
      ? Math.max(0, Math.min(1, 1 - aspect.orb / aspect.orbLimit))
      : 0;
  const luminaryScore =
    aspect.natalBody === "sun" || aspect.natalBody === "moon" ? 120 : 0;
  const rulerScore = aspect.natalBody === context.chartRulerId ? 92 : 0;
  const personalNatalScore = PERSONAL_BODIES.has(aspect.natalBody) ? 58 : 0;
  const personalTransitScore = PERSONAL_BODIES.has(aspect.transitBody) ? 18 : 0;
  const angularScore = context.angularBodies.has(aspect.natalBody) ? 34 : 0;
  const activeScore = context.activeBodies.has(aspect.natalBody) ? 24 : 0;
  const dynamicScore = getDynamicScore(aspect.aspect);
  const closenessScore = orbRatio * 50;
  const outerPenalty = isOuterOnly(aspect) ? 135 : 0;

  return (
    luminaryScore +
    rulerScore +
    personalNatalScore +
    personalTransitScore +
    angularScore +
    activeScore +
    dynamicScore +
    closenessScore -
    outerPenalty
  );
}

function getDynamicScore(aspect: NatalToTransitAspectId): number {
  if (aspect === "square" || aspect === "opposition") {
    return 24;
  }

  if (aspect === "conjunction") {
    return 20;
  }

  if (aspect === "trine") {
    return 13;
  }

  return 10;
}

const NATAL_HOUSE_SCENARIO_FA: Partial<Record<number, string>> = {
  1: "شروع، بدن یا موقعیتی که باید جای خودت را روشن کنی",
  2: "خرج، منابع یا تصمیمی درباره امنیت شخصی",
  3: "پیام، گفت‌وگو، یادگیری یا تصمیم روزمره",
  4: "خانه، خانواده یا نیاز به فضای خصوصی",
  5: "خلاقیت، بازی یا چیزی که می‌خواهی نشان بدهی",
  6: "برنامه روزانه، کار تکراری یا مراقبت از بدن",
  7: "رابطه نزدیک، همکاری یا مذاکره مستقیم",
  8: "اعتماد، آسیب‌پذیری یا یک مسئولیت و منبع مشترک",
  9: "یادگیری، سفر، باور یا دیدگاهی که لازم است دوباره سنجیده شود",
  10: "مسئولیت دیده‌شده، تحویل کار یا تصمیم درباره جهت عمومی",
  11: "دوستی، جمع یا برنامه‌ای که با دیگران می‌سازی",
  12: "استراحت، خلوت یا زمانی که قبل از پاسخ به پردازش خصوصی نیاز داری",
};

function getAudienceScenario(
  natal: (typeof NATAL_THEME_FA)[NatalToTransitBodyId],
  audienceMode: BehavioralAudienceMode,
  natalHouseNumber: number | null = null,
): string {
  const bodyScenario =
    audienceMode === "caregiver"
      ? natal.caregiverScenario
      : audienceMode === "youth"
        ? natal.youthScenario
        : natal.adultScenario;
  const houseScenario =
    typeof natalHouseNumber === "number"
      ? NATAL_HOUSE_SCENARIO_FA[natalHouseNumber]
      : null;

  return houseScenario
    ? `${houseScenario}؛ جایی که ${bodyScenario}`
    : bodyScenario;
}

// HALLEUS_PERSONAL_TRANSIT_NATAL_HOUSE_CONTEXT_20260808

function dedupeAspects<TAspect extends PersonalTransitAspectLike>(
  aspects: readonly TAspect[],
): TAspect[] {
  const seen = new Set<string>();
  const output: TAspect[] = [];

  for (const aspect of aspects) {
    if (seen.has(aspect.id)) {
      continue;
    }

    seen.add(aspect.id);
    output.push(aspect);
  }

  return output;
}

function isOuterOnly(aspect: PersonalTransitAspectLike): boolean {
  return OUTER_BODIES.has(aspect.transitBody) && OUTER_BODIES.has(aspect.natalBody);
}

function hasNonOuterCandidate<TAspect extends PersonalTransitAspectLike>(
  candidates: Array<{ aspect: TAspect }>,
  excludedIndex: number,
): boolean {
  return candidates.some(
    (candidate, index) => index !== excludedIndex && !isOuterOnly(candidate.aspect),
  );
}

function hasNatalDiversityCandidate<
  TAspect extends PersonalTransitAspectLike,
>(
  candidates: Array<{ aspect: TAspect }>,
  excludedIndex: number,
  natalCounts: Map<string, number>,
): boolean {
  return candidates.some(
    (candidate, index) =>
      index !== excludedIndex &&
      (natalCounts.get(candidate.aspect.natalBody) ?? 0) < 2,
  );
}

function compareTransitAspects<
  TAspect extends PersonalTransitAspectLike,
>(
  left: { aspect: TAspect; index: number } | undefined,
  right: { aspect: TAspect; index: number } | undefined,
): number {
  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  if (left.aspect.orb !== right.aspect.orb) {
    return left.aspect.orb - right.aspect.orb;
  }

  return left.index - right.index;
}

function clampVisibleCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 5;
  }

  return Math.max(3, Math.min(5, Math.trunc(value)));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
