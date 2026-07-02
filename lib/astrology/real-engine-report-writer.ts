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
import type { ReportOutputSection } from "@/types/report-output";

type SignCopy = {
  faName: string;
  enName: string;
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
    enName: "Aries",
    energy: "شروع‌کننده، مستقیم و پرحرارت",
    gift: "جرئت شروع کردن و جلو بردن چیزهایی که هنوز شکل نگرفته‌اند",
    growth: "تمرین مکث، شنیدن و کامل‌کردن مسیر بعد از موج اول انگیزه",
  },
  taurus: {
    faName: "ثور",
    enName: "Taurus",
    energy: "آرام، بدن‌مند و ثبات‌ساز",
    gift: "ساختن امنیت، لذت و ریتمی که واقعاً دوام می‌آورد",
    growth: "رها کردن چسبندگی به چیزی که فقط از روی عادت امن به نظر می‌رسد",
  },
  gemini: {
    faName: "جوزا",
    enName: "Gemini",
    energy: "کنجکاو، ذهنی و ارتباطی",
    gift: "دیدن چند زاویه هم‌زمان و تبدیل تجربه به کلمه، ایده و گفتگو",
    growth: "عمیق‌تر ماندن با یک مسیر به‌جای پریدن سریع بین احتمال‌ها",
  },
  cancer: {
    faName: "سرطان",
    enName: "Cancer",
    energy: "حساس، حافظه‌محور و مراقبت‌گر",
    gift: "ساختن حس خانه، تعلق و پیوند عاطفی واقعی",
    growth: "مرزبندی احساسی تا مراقبت تبدیل به فرسودگی یا وابستگی نشود",
  },
  leo: {
    faName: "اسد",
    enName: "Leo",
    energy: "گرم، نمایان و خلاق",
    gift: "تاباندن حضور، شادی و بیان شخصی به محیط اطراف",
    growth: "درخشش بدون نیاز دائمی به تأیید بیرونی",
  },
  virgo: {
    faName: "سنبله",
    enName: "Virgo",
    energy: "دقیق، اصلاح‌گر و خدمت‌محور",
    gift: "دیدن جزئیات مهم و بهتر کردن چیزها به شکل عملی",
    growth: "کمتر سخت گرفتن به خود و پذیرفتن اینکه کامل بودن همیشه لازم نیست",
  },
  libra: {
    faName: "میزان",
    enName: "Libra",
    energy: "رابطه‌محور، زیباشناس و تعادل‌جو",
    gift: "دیدن دو طرف ماجرا و ساختن هماهنگی بین آدم‌ها و انتخاب‌ها",
    growth: "تصمیم گرفتن حتی وقتی همه را نمی‌شود راضی نگه داشت",
  },
  scorpio: {
    faName: "عقرب",
    enName: "Scorpio",
    energy: "عمیق، شدید و دگرگون‌کننده",
    gift: "دیدن حقیقت‌های پنهان و عبور از سطح به لایه‌های واقعی‌تر",
    growth: "اعتماد کردن، نرم شدن و رها کردن کنترل وقتی رابطه امن است",
  },
  sagittarius: {
    faName: "قوس",
    enName: "Sagittarius",
    energy: "جستجوگر، آزاد و معناطلب",
    gift: "دیدن افق بزرگ‌تر و تبدیل تجربه به بینش، مسیر و ایمان شخصی",
    growth: "زمین‌گیر کردن الهام‌ها در عمل و توجه به جزئیات مسیر",
  },
  capricorn: {
    faName: "جدی",
    enName: "Capricorn",
    energy: "ساختارمند، مسئول و بلندمدت",
    gift: "ساختن چیزی جدی، قابل اتکا و مرحله‌به‌مرحله",
    growth: "اجازه دادن به نرمی، بازی و استراحت کنار مسئولیت",
  },
  aquarius: {
    faName: "دلو",
    enName: "Aquarius",
    energy: "مستقل، آینده‌نگر و متفاوت",
    gift: "دیدن الگوهای تازه و آوردن ایده‌هایی که از زمان خود جلوترند",
    growth: "وصل ماندن به بدن و رابطه، نه فقط ایده و فاصله ذهنی",
  },
  pisces: {
    faName: "حوت",
    enName: "Pisces",
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

type CorePlacementStory = {
  opening: string;
  everydaySignal: string;
  shadowSignal: string;
  integration: string;
  reflection: string;
};

const CORE_PLACEMENT_STORY: Record<"sun" | "moon", CorePlacementStory> = {
  sun: {
    opening:
      "این بخش فقط یک برچسب شخصیتی نیست؛ خورشید نشان می‌دهد وقتی از حالت واکنش بیرون می‌آیی و انتخاب آگاهانه‌تری می‌کنی، چه کیفیتی در تو روشن‌تر می‌شود.",
    everydaySignal:
      "در زندگی روزمره، این جایگاه می‌تواند خودش را در نوع تصمیم گرفتن، شکل گرفتن اعتمادبه‌نفس و چیزهایی نشان بدهد که به تو حس زنده بودن می‌دهند.",
    shadowSignal:
      "سایه طبیعی این ترکیب معمولاً زمانی دیده می‌شود که بخواهی خیلی سریع خودت را ثابت کنی، یا برعکس، از ترس دیده شدن انرژی اصلی‌ات را عقب نگه داری.",
    integration:
      "راه یکپارچه‌تر این است که به جای بازی کردن نقش کامل، ببینی کدام انتخاب کوچک امروز تو را به حس اصیل‌تر بودن نزدیک‌تر می‌کند.",
    reflection:
      "پرسش تأملی: وقتی مجبور نیستی چیزی را به کسی ثابت کنی، این خورشید چه نوع حضوری را از تو می‌خواهد؟",
  },
  moon: {
    opening:
      "ماه درباره نیاز عاطفی و ریتم امنیت درونی حرف می‌زند؛ جایی که قبل از فکر کردن، بدن و احساس تو به جهان پاسخ می‌دهد.",
    everydaySignal:
      "در زندگی روزمره، این جایگاه می‌تواند در شیوه آرام شدن، نیاز به نزدیکی یا فاصله، و واکنشی که هنگام خستگی یا فشار نشان می‌دهی دیده شود.",
    shadowSignal:
      "سایه طبیعی این ترکیب زمانی فعال می‌شود که نیازت را یا پنهان کنی، یا آن‌قدر با شدت از آن دفاع کنی که رابطه و آرامش سخت‌تر شود.",
    integration:
      "راه مهربان‌تر این است که نیازت را زودتر و واضح‌تر بشناسی؛ نه برای اینکه همه چیز مطابق میل تو شود، بلکه برای اینکه احساساتت دیرتر به بحران تبدیل شوند.",
    reflection:
      "پرسش تأملی: برای اینکه این ماه احساس امنیت بیشتری کند، این هفته چه مرز یا مراقبت کوچکی لازم است؟",
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

  const sunText = buildCorePlacementText(sun, "sun");
  const moonText = buildCorePlacementText(moon, "moon");
  const risingText = buildRisingText(risingSign, realEngine.ascendantLongitude);
  const mercuryText = buildOptionalPlacementText(mercury, "mercury");
  const venusText = buildOptionalPlacementText(venus, "venus");
  const marsText = buildOptionalPlacementText(mars, "mars");
  const aspectText = buildAspectOverviewText(aspects);
  const integrationText = buildIntegrationText(realEngineWithAspects);
  const interpretations = [
    sunText,
    moonText,
    risingText,
    mercuryText,
    venusText,
    marsText,
    aspectText,
    integrationText,
  ].filter(Boolean) as string[];
  const interpretationSections = buildRealEngineInterpretationSections({
    summary,
    sunText,
    moonText,
    risingText,
    mercuryText,
    venusText,
    marsText,
    aspectText,
    integrationText,
  });

  return {
    ...report,
    realEngine: realEngineWithAspects,
    summary,
    interpretations,
    interpretationSections,
  } as AstrologyReport;
}


type RealEngineSectionTextInput = {
  summary: string;
  sunText?: string;
  moonText?: string;
  risingText?: string;
  mercuryText?: string;
  venusText?: string;
  marsText?: string;
  aspectText?: string;
  integrationText?: string;
};

function buildRealEngineInterpretationSections(
  input: RealEngineSectionTextInput,
): ReportOutputSection[] {
  const relationshipBody = joinSectionBody(input.venusText, input.aspectText);
  const careerBody = joinSectionBody(input.mercuryText, input.marsText);
  const growthBody = joinSectionBody(input.integrationText, input.aspectText);
  const fallbackBody =
    input.integrationText ??
    input.summary ??
    "این بخش از گزارش بر اساس داده‌های محاسبه‌شده چارت نوشته شده و باید نمادین، آرام و غیرقطعی خوانده شود.";

  return [
    {
      id: "real-engine-overview",
      kind: "overview",
      title: "نمای کلی چارت واقعی‌تر",
      body: input.summary,
    },
    {
      id: "real-engine-identity",
      kind: "identity",
      title: "هویت، حضور و مسیر اصلی",
      body: input.sunText ?? fallbackBody,
    },
    {
      id: "real-engine-emotional-pattern",
      kind: "emotional-pattern",
      title: "ریتم عاطفی و امنیت درونی",
      body: input.moonText ?? fallbackBody,
    },
    {
      id: "real-engine-relationships",
      kind: "relationships",
      title: "رابطه، ارزش و گفت‌وگوی درونی",
      body: relationshipBody || input.venusText || input.aspectText || fallbackBody,
    },
    {
      id: "real-engine-career",
      kind: "career",
      title: "ذهن، حرکت و مسیر رشد",
      body: careerBody || input.mercuryText || input.marsText || fallbackBody,
    },
    {
      id: "real-engine-growth",
      kind: "growth",
      title: "جمع‌بندی رشد شخصی",
      body: growthBody || fallbackBody,
    },
    {
      id: "real-engine-reflection-prompts",
      kind: "reflection-prompts",
      title: "پرسش‌های تأملی بر اساس همین چارت",
      body: buildRealEngineReflectionPrompts(input),
    },
  ];
}

function buildRealEngineReflectionPrompts(input: RealEngineSectionTextInput): string {
  const prompts = [
    "کدام جمله از خوانش خورشید بیشتر به حس مسیر و هویت تو نزدیک است؟",
    "نیاز عاطفی ماه در این گزارش کجا به تجربه روزمره تو شباهت دارد؟",
    "در رابطه‌ها یا تصمیم‌ها، کدام گفت‌وگوی درونی را می‌توانی آرام‌تر و آگاهانه‌تر ببینی؟",
  ];
  const closing =
    input.integrationText || input.aspectText
      ? "این پرسش‌ها برای تأمل‌اند، نه برای گرفتن حکم قطعی از چارت."
      : "اگر بخشی هنوز مبهم است، آن را به‌عنوان دعوت به مشاهده آرام‌تر نگه دار.";

  return `${prompts.join(" ")} ${closing}`;
}

function joinSectionBody(
  first: string | undefined,
  second: string | undefined,
): string {
  return [first, second].filter(Boolean).join(" ");
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
    return [
      `${displayName}این گزارش با محاسبه واقعی‌تر Halleus ساخته شده است و به جای یک توضیح عمومی، از سه ستون اصلی چارت شروع می‌کند: خورشید، ماه و رایزینگ.`,
      `خورشید تو در ${formatSignLabel(sunSign)} قرار دارد؛ یعنی مسیر هویت و اعتمادبه‌نفس با کیفیت ${sunSign.energy} رنگ می‌گیرد.`,
      `ماه تو در ${formatSignLabel(moonSign)} است؛ جایی که امنیت عاطفی و واکنش‌های غریزی به انرژی ${moonSign.energy} نزدیک می‌شوند.`,
      `رایزینگ تقریبی تو در ${formatSignLabel(rising)} قرار دارد و نشان می‌دهد در برخورد اول با جهان، چه ریتم و تصویری از تو جلوتر دیده می‌شود.`,
      "این خوانش حکم قطعی درباره شخصیت نیست؛ یک نقشه تأملی است تا ببینی کدام بخش‌ها واقعاً با تجربه تو هم‌صدا هستند و کجاها نیاز به مشاهده بیشتر دارند.",
    ].join(" ");
  }

  return [
    `${displayName}این گزارش با محاسبه واقعی‌تر Halleus ساخته شده است.`,
    `داده‌های اصلی چارت در snapshot ذخیره شده‌اند و رایزینگ تقریبی تو در ${formatSignLabel(rising)} قرار دارد.`,
    "متن گزارش بر اساس همین داده‌ها ساخته شده و در نسخه‌های بعدی با لایه‌های خانه‌ها، aspectها و روایت‌های عمیق‌تر کامل‌تر می‌شود.",
  ].join(" ");
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
  const story = CORE_PLACEMENT_STORY[planetId];
  const placementLabel = formatPlacement(placement);
  const signLabel = formatSignLabel(sign);

  return [
    `${planet.faName}، یعنی ${planet.title}، در ${placementLabel} قرار دارد.`,
    `در زبان نمادین Halleus، این جایگاه با ${planet.role} ارتباط دارد.`,
    `${story.opening}`,
    `کیفیت ${signLabel} این بخش را ${sign.energy} می‌کند؛ بنابراین هدیه طبیعی آن ${sign.gift} است.`,
    `${story.everydaySignal}`,
    `مسیر رشد این نشانه این است: ${sign.growth}.`,
    `${story.shadowSignal}`,
    `${story.integration}`,
    `${story.reflection}`,
  ].join(" ");
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

  return `${planet.faName} در ${formatPlacement(placement)} نشسته است. در لایه ${planet.title}، این یعنی ${planet.role}. وقتی این بخش با انرژی ${formatSignLabel(sign)} کار می‌کند، نقطه قوت اصلی‌اش ${sign.gift} است و چالش طبیعی‌اش ${sign.growth}.`;
}

function buildRisingText(signKey: ZodiacKey, longitude: number) {
  const sign = SIGN_COPY[signKey];
  const signLabel = formatSignLabel(sign);

  return [
    `رایزینگ تقریبی تو در ${signLabel} است (${formatDegree(longitude)} روی دایره چارت).`,
    "رایزینگ درباره «اولین تماس تو با جهان» حرف می‌زند: اینکه چطور وارد فضاها می‌شوی، چطور دیده می‌شوی و بدنت با موقعیت‌های تازه چه ریتمی می‌گیرد.",
    `با ${signLabel}، ورود تو رنگ ${sign.energy} دارد؛ یعنی قبل از اینکه دیگران لایه‌های عمیق‌ترت را ببینند، معمولاً این کیفیت در رفتار، نگاه یا شیوه پاسخ دادنت جلوتر دیده می‌شود.`,
    `هدیه این رایزینگ ${sign.gift} است و وقتی آگاهانه زندگی شود، می‌تواند به تو کمک کند موقعیت‌های تازه را با اعتماد بیشتری شروع کنی.`,
    `چالش رشد آن هم ${sign.growth} است؛ یعنی تصویر بیرونی تو وقتی سالم‌تر می‌شود که فقط ماسک محافظ نباشد و به نیازهای واقعی خورشید و ماهت هم جا بدهد.`,
    "پرسش تأملی: در برخوردهای تازه، کدام بخش از این رایزینگ به تو کمک می‌کند و کدام بخش ممکن است پشت یک عادت دفاعی پنهان شده باشد؟",
  ].join(" ");
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
      const sign = SIGN_COPY[placement.signId];

      return `${planet} در ${sign ? formatSignLabel(sign) : placement.signId}`;
    })
    .join("، ");

  const aspectCount = realEngine.aspects?.length ?? 0;
  const aspectSummary =
    aspectCount > 0
      ? ` در لایه روابط سیاره‌ها هم ${aspectCount} ارتباط اصلی ذخیره شده که گزارش را از فهرست جایگاه‌ها به یک خوانش پیوسته‌تر نزدیک می‌کند.`
      : " در این نسخه، تمرکز اصلی روی جایگاه‌های واقعی‌تر سیاره‌هاست و لایه روابط سیاره‌ها وقتی داده کافی داشته باشد به گزارش اضافه می‌شود.";

  return [
    `جمع‌بندی چارت: ${visiblePlacements}.`,
    "این‌ها ستون‌های اولیه گزارش‌اند و متن Halleus از همین داده‌های real engine ساخته شده است.",
    "برای خواندن این گزارش، بهتر است خورشید را مثل مسیر آگاهانه، ماه را مثل نیاز عاطفی و رایزینگ را مثل دروازه ورود به جهان ببینی.",
    "وقتی این سه لایه با هم خوانده شوند، گزارش از فهرست جایگاه‌ها به یک روایت شخصی‌تر نزدیک می‌شود: چه چیزی در تو روشن می‌شود، چه چیزی تو را آرام می‌کند، و چگونه خودت را به جهان نشان می‌دهی.",
    aspectSummary.trim(),
  ].join(" ");
}

function findPlacement(snapshot: RealEngineReportSnapshot, id: string) {
  return snapshot.placements.find((placement) => placement.id === id);
}

function formatPlacement(placement: RealEngineReportPlacement) {
  return `${formatSignLabel(SIGN_COPY[placement.signId])}، درجه ${formatDegree(
    placement.degreeInSign,
  )}`;
}

function formatSignLabel(sign: SignCopy) {
  return `${sign.faName} (${sign.enName})`;
}

function formatDegree(value: number) {
  return `${value.toFixed(2)}°`;
}

function signFromLongitude(longitude: number): ZodiacKey {
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor(normalized / 30) % SIGN_ORDER.length;

  return SIGN_ORDER[index];
}
