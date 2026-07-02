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
    gift: "دیدن جزئیات، بهتر کردن سیستم‌ها و مراقبت عملی از چیزی که مهم است",
    growth: "مهربانی با نقص‌ها و رها کردن کنترل افراطی",
  },
  libra: {
    faName: "میزان",
    enName: "Libra",
    energy: "رابطه‌محور، هماهنگ و زیبایی‌جو",
    gift: "دیدن تعادل، انصاف و ظرافت در رابطه‌ها و انتخاب‌ها",
    growth: "تصمیم گرفتن بدون گم شدن در رضایت دیگران",
  },
  scorpio: {
    faName: "عقرب",
    enName: "Scorpio",
    energy: "عمیق، متمرکز و دگرگون‌کننده",
    gift: "دیدن لایه‌های پنهان، وفاداری عمیق و توان عبور از بحران",
    growth: "اعتماد، رها کردن کنترل و تبدیل شدت احساس به آگاهی",
  },
  sagittarius: {
    faName: "قوس",
    enName: "Sagittarius",
    energy: "جست‌وجوگر، صریح و افق‌گشا",
    gift: "دیدن معنای بزرگ‌تر و حرکت به سمت تجربه، دانش و آزادی",
    growth: "تبدیل شوق و باور به تعهد، دقت و مسئولیت در کلام",
  },
  capricorn: {
    faName: "جدی",
    enName: "Capricorn",
    energy: "ساختارمند، مسئول و هدف‌محور",
    gift: "ساختن چیزی ماندگار، قابل اعتماد و جدی گرفتن مسیر رشد",
    growth: "نرم‌تر کردن سخت‌گیری و اجازه دادن به حمایت، احساس و استراحت",
  },
  aquarius: {
    faName: "دلو",
    enName: "Aquarius",
    energy: "آزاد، آینده‌نگر و متفاوت",
    gift: "دیدن الگوهای تازه، استقلال فکری و ارتباط با جمع‌های معنادار",
    growth: "حاضر ماندن در احساس و رابطه، نه فقط ایده و فاصله",
  },
  pisces: {
    faName: "حوت",
    enName: "Pisces",
    energy: "حساس، شهودی و خیال‌پرداز",
    gift: "همدلی، الهام و دیدن پیوندهای نامرئی بین آدم‌ها و تجربه‌ها",
    growth: "مرزبندی، واقع‌سنجی و تبدیل رؤیا به مراقبت عملی",
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

type PersonalPlanetStory = {
  opening: string;
  everydaySignal: string;
  relationshipSignal: string;
  shadowSignal: string;
  integration: string;
  reflection: string;
};

const PERSONAL_PLANET_STORY: Record<
  "mercury" | "venus" | "mars",
  PersonalPlanetStory
> = {
  mercury: {
    opening:
      "عطارد فقط درباره هوش یا سرعت ذهن نیست؛ نشان می‌دهد تجربه را چطور نام‌گذاری می‌کنی، چطور سؤال می‌پرسی و وقتی چیزی مبهم است چگونه دنبال معنا می‌گردی.",
    everydaySignal:
      "در روزمره، این جایگاه می‌تواند در سبک تصمیم‌گیری، شیوه پیام دادن، نوع یادگیری و اینکه هنگام اضطراب زیاد حرف می‌زنی یا در خودت فرو می‌روی دیده شود.",
    relationshipSignal:
      "در رابطه‌ها، عطارد کیفیت گفت‌وگو را رنگ می‌کند: اینکه چطور سوءتفاهم را روشن می‌کنی، چه چیزهایی را راحت می‌گویی و کدام فکرها را برای خودت نگه می‌داری.",
    shadowSignal:
      "سایه طبیعی این لایه زمانی فعال می‌شود که ذهن بخواهد همه چیز را کنترل کند، بیش از حد توضیح بدهد، یا آن‌قدر بین احتمال‌ها بچرخد که حس و تصمیم عقب بماند.",
    integration:
      "راه یکپارچه‌تر این است که ذهن را به جای قاضی نهایی، مثل مترجم تجربه ببینی؛ ابزاری برای واضح‌تر کردن حس، نه ابزاری برای فرار از حس.",
    reflection:
      "پرسش تأملی: عطارد تو وقتی آرام‌تر و صادق‌تر حرف می‌زند، چه فکری را می‌تواند ساده‌تر و انسانی‌تر بیان کند؟",
  },
  venus: {
    opening:
      "زهره درباره رابطه، ارزش و لذت حرف می‌زند؛ جایی که می‌فهمی چه چیزی برایت زیبا، امن، دلپذیر یا واقعاً ارزشمند است.",
    everydaySignal:
      "در روزمره، این جایگاه می‌تواند در سلیقه، خرج کردن، انتخاب آدم‌ها، شکل صمیمیت و چیزهایی دیده شود که به تو حس دوست‌داشتنی بودن می‌دهند.",
    relationshipSignal:
      "در رابطه‌ها، زهره نشان می‌دهد چگونه جذب می‌شوی، چگونه محبت را نشان می‌دهی و در برابر نزدیکی، توجه یا فاصله چه واکنشی داری.",
    shadowSignal:
      "سایه طبیعی این لایه زمانی دیده می‌شود که برای حفظ صلح از نیاز خودت بگذری، ارزش خودت را از واکنش دیگران بگیری، یا لذت را با امنیت اشتباه بگیری.",
    integration:
      "راه سالم‌تر این است که ارزش را فقط در تأیید بیرونی نبینی؛ ببینی چه انتخاب‌هایی رابطه را هم لطیف‌تر می‌کنند و هم راستگوتر.",
    reflection:
      "پرسش تأملی: زهره تو برای اینکه رابطه و لذت را واقعی‌تر تجربه کند، کجا باید بیشتر انتخاب کند و کمتر فقط سازگار شود؟",
  },
  mars: {
    opening:
      "مریخ درباره میل، حرکت، خشم و جرئت عمل است؛ بخشی از تو که می‌خواهد چیزی را آغاز کند، از خواسته‌اش دفاع کند یا از حالت سکون بیرون بیاید.",
    everydaySignal:
      "در روزمره، این جایگاه می‌تواند در انرژی کار، واکنش به مانع، نحوه رقابت، سرعت شروع کردن و شکل برخورد با فشار دیده شود.",
    relationshipSignal:
      "در رابطه‌ها، مریخ نشان می‌دهد چطور مرز می‌گذاری، چگونه خواسته را مستقیم یا غیرمستقیم بیان می‌کنی و وقتی خشم یا میل بالا می‌آید چه الگویی فعال می‌شود.",
    shadowSignal:
      "سایه طبیعی این لایه یا به شکل عجله، تندی و دفاع بیش از حد دیده می‌شود، یا به شکل خاموش کردن خشم تا جایی که انرژی درونی سنگین و فرسوده شود.",
    integration:
      "راه یکپارچه‌تر این است که میل و خشم را دشمن ندانی؛ آن‌ها را زودتر بشنوی، مسئولانه‌تر بیان کنی و به حرکت‌های کوچک اما واقعی تبدیلشان کنی.",
    reflection:
      "پرسش تأملی: مریخ تو این هفته برای دفاع سالم از خواسته‌ات به چه اقدام کوچک، روشن و بدون خشونتی نیاز دارد؟",
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
    name: report.input.name ?? "",
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
  integrationText: string;
};

function buildRealEngineSummary({
  name,
  sun,
  moon,
  risingSign,
}: {
  name: string;
  sun: RealEngineReportPlacement | undefined;
  moon: RealEngineReportPlacement | undefined;
  risingSign: ZodiacKey;
}) {
  const displayName = name ? `${name}، ` : "";
  const sunSign = sun ? SIGN_COPY[sun.signId] : null;
  const moonSign = moon ? SIGN_COPY[moon.signId] : null;
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
  const story = PERSONAL_PLANET_STORY[planetId];
  const placementLabel = formatPlacement(placement);
  const signLabel = formatSignLabel(sign);

  return [
    `${planet.faName}، یعنی ${planet.title}، در ${placementLabel} قرار دارد.`,
    `این لایه درباره ${planet.role} است، اما در گزارش Halleus فقط به یک جمله کوتاه خلاصه نمی‌شود.`,
    `${story.opening}`,
    `کیفیت ${signLabel} این بخش را ${sign.energy} می‌کند؛ بنابراین نقطه قوت اصلی آن ${sign.gift} است.`,
    `${story.everydaySignal}`,
    `${story.relationshipSignal}`,
    `چالش رشد این نشانه در این لایه چنین است: ${sign.growth}.`,
    `${story.shadowSignal}`,
    `${story.integration}`,
    `${story.reflection}`,
  ].join(" ");
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

      return `${planet} در ${formatSignLabel(sign)}`;
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
    "عطارد، زهره یا مریخ کدام گفت‌وگوی درونی را درباره ذهن، رابطه یا عمل روشن‌تر می‌کند؟",
    "در رابطه‌ها یا تصمیم‌ها، کدام الگو را می‌توانی آرام‌تر و آگاهانه‌تر ببینی؟",
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

function formatPlacement(placement: RealEngineReportPlacement) {
  const sign = SIGN_COPY[placement.signId];

  return `${formatSignLabel(sign)}، درجه ${formatDegree(placement.longitude)}`;
}

function formatSignLabel(sign: SignCopy) {
  return `${sign.faName} (${sign.enName})`;
}

function formatDegree(longitude: number) {
  return `${longitude.toFixed(1)}°`;
}

function signFromLongitude(longitude: number): ZodiacKey {
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor(normalized / 30) % SIGN_ORDER.length;

  return SIGN_ORDER[index] ?? "aries";
}
