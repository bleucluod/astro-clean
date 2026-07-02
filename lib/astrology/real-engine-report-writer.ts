import type {
  AstrologyReport,
  RealEngineReportAspect,
  RealEngineReportHouseContext,
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

type AspectStory = {
  theme: string;
  supportSignal: string;
  growthSignal: string;
  integration: string;
  reflection: string;
};

const ASPECT_STORY: Record<RealEngineReportAspect["aspectId"], AspectStory> = {
  conjunction: {
    theme:
      "هم‌نشینی مثل این است که دو بخش شخصیت در یک اتاق مشترک حرف بزنند؛ صداها جدا هستند، اما اثرشان روی هم می‌افتد و یک هسته پررنگ‌تر می‌سازند.",
    supportSignal:
      "وقتی آگاهانه زندگی شود، این رابطه می‌تواند تمرکز، شدت و حس جهت‌دار بودن ایجاد کند.",
    growthSignal:
      "چالش طبیعی‌اش این است که یکی از دو نیرو ممکن است دیگری را بیش از حد رنگ کند و انتخاب‌های تو از حالت آزاد به حالت واکنشی نزدیک شود.",
    integration:
      "راه یکپارچه‌تر این است که قبل از عمل، از خودت بپرسی کدام صدا واقعاً در حال هدایت است و کدام صدا فقط همراه شده است.",
    reflection:
      "پرسش تأملی: این دو بخش وقتی با هم فعال می‌شوند، تو را به تمرکز نزدیک‌تر می‌کنند یا به فشار؟",
  },
  sextile: {
    theme:
      "فرصت نرم نشان می‌دهد دو بخش شخصیت می‌توانند بدون اجبار زیاد با هم همکاری کنند، اما این همکاری معمولاً نیاز به انتخاب آگاهانه دارد.",
    supportSignal:
      "وقتی از آن استفاده کنی، این رابطه می‌تواند راه‌حل، یادگیری و حرکت آرام بسازد.",
    growthSignal:
      "چالش طبیعی‌اش این است که چون تنش زیادی ندارد، ممکن است نادیده گرفته شود و به جای توان فعال، فقط یک امکان خام بماند.",
    integration:
      "راه یکپارچه‌تر این است که این استعداد را کوچک اما عملی وارد روزمره کنی؛ با یک گفت‌وگو، یک تمرین یا یک تصمیم ساده.",
    reflection:
      "پرسش تأملی: کدام فرصت کوچک در این رابطه هست که اگر فعالش کنی، زندگی‌ات کمی روان‌تر می‌شود؟",
  },
  square: {
    theme:
      "چالش سازنده یعنی دو بخش شخصیت با ریتم‌های متفاوت به هم فشار می‌آورند؛ این فشار همیشه بد نیست، اما اگر دیده نشود می‌تواند فرسوده‌کننده شود.",
    supportSignal:
      "وقتی آگاهانه هدایت شود، این رابطه می‌تواند اراده، بلوغ و توان عمل بسازد.",
    growthSignal:
      "چالش طبیعی‌اش این است که ممکن است یکی از دو نیاز را سرکوب کنی یا مدام بین آن‌ها نوسان داشته باشی.",
    integration:
      "راه یکپارچه‌تر این است که تنش را به مسئله قابل حل تبدیل کنی: نه جنگ درونی، نه انکار، بلکه تنظیم قدم‌به‌قدم.",
    reflection:
      "پرسش تأملی: این اصطکاک از تو چه مهارتی می‌خواهد که هنوز در حال ساختنش هستی؟",
  },
  trine: {
    theme:
      "جریان هماهنگ یعنی دو بخش شخصیت راحت‌تر به هم راه می‌دهند و ممکن است حس استعداد طبیعی یا حمایت درونی بسازند.",
    supportSignal:
      "وقتی آگاهانه استفاده شود، این رابطه می‌تواند اعتماد، روانی و حس طبیعی بودن مسیر را بیشتر کند.",
    growthSignal:
      "چالش طبیعی‌اش این است که چون راحت است، ممکن است تنبل یا ناخودآگاه بماند و به جای رشد فعال، فقط به عادت تبدیل شود.",
    integration:
      "راه یکپارچه‌تر این است که این روانی را قدر بدانی، اما آن را به انتخاب، تمرین و مسئولیت تبدیل کنی.",
    reflection:
      "پرسش تأملی: کدام توان طبیعی را آن‌قدر عادی می‌دانی که شاید ارزش واقعی‌اش را کم می‌بینی؟",
  },
  opposition: {
    theme:
      "قطبیت آگاه‌کننده یعنی دو بخش شخصیت روبه‌روی هم می‌ایستند تا تو یاد بگیری هیچ سر طیف را کامل حذف نکنی.",
    supportSignal:
      "وقتی آگاهانه زندگی شود، این رابطه می‌تواند نگاه دوطرفه، بلوغ رابطه‌ای و قدرت انتخاب میان دو نیاز متفاوت بسازد.",
    growthSignal:
      "چالش طبیعی‌اش این است که ممکن است یکی از دو بخش را به دیگران نسبت بدهی یا فقط یک طرف را درست بدانی.",
    integration:
      "راه یکپارچه‌تر این است که به جای انتخاب یکی علیه دیگری، ببینی هر دو قطب چه نیازی را نمایندگی می‌کنند.",
    reflection:
      "پرسش تأملی: کدام دو نیاز در تو روبه‌روی هم ایستاده‌اند و چه گفت‌وگویی بین آن‌ها لازم است؟",
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
    houseContext: realEngine.houseContext,
  });

  const sunText = buildCorePlacementText(sun, "sun");
  const moonText = buildCorePlacementText(moon, "moon");
  const risingText = buildRisingText(
    risingSign,
    realEngine.ascendantLongitude,
    realEngine.houseContext,
  );
  const houseText = buildHouseContextText(realEngine.houseContext, risingSign);
  const mercuryText = buildOptionalPlacementText(mercury, "mercury");
  const venusText = buildOptionalPlacementText(venus, "venus");
  const marsText = buildOptionalPlacementText(mars, "mars");
  const aspectText = buildAspectOverviewText(aspects);
  const integrationText = buildIntegrationText(realEngineWithAspects);
  const interpretations = [
    sunText,
    moonText,
    risingText,
    houseText,
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
    houseText,
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
  houseText?: string;
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
  houseContext,
}: {
  name: string;
  sun: RealEngineReportPlacement | undefined;
  moon: RealEngineReportPlacement | undefined;
  risingSign: ZodiacKey;
  houseContext?: RealEngineReportHouseContext;
}) {
  const displayName = name ? `${name}، ` : "";
  const sunSign = sun ? SIGN_COPY[sun.signId] : null;
  const moonSign = moon ? SIGN_COPY[moon.signId] : null;
  const rising = SIGN_COPY[risingSign];
  const risingDescriptor = buildRisingDescriptor(houseContext);

  if (sunSign && moonSign) {
    return [
      `${displayName}این گزارش با محاسبه واقعی‌تر هالیوس ساخته شده است و به جای یک توضیح عمومی، از سه ستون اصلی چارت شروع می‌کند: خورشید، ماه و رایزینگ.`,
      `خورشید تو در ${formatSignLabel(sunSign)} قرار دارد؛ یعنی مسیر هویت و اعتمادبه‌نفس با کیفیت ${sunSign.energy} رنگ می‌گیرد.`,
      `ماه تو در ${formatSignLabel(moonSign)} است؛ جایی که امنیت عاطفی و واکنش‌های غریزی به انرژی ${moonSign.energy} نزدیک می‌شوند.`,
      `${risingDescriptor} تو در ${formatSignLabel(rising)} قرار دارد و نشان می‌دهد در برخورد اول با جهان، چه ریتم و تصویری از تو جلوتر دیده می‌شود.`,
      "این خوانش حکم قطعی درباره شخصیت نیست؛ یک نقشه تأملی است تا ببینی کدام بخش‌ها واقعاً با تجربه تو هم‌صدا هستند و کجاها نیاز به مشاهده بیشتر دارند.",
    ].join(" ");
  }

  return [
    `${displayName}این گزارش با محاسبه واقعی‌تر هالیوس ساخته شده است.`,
    `داده‌های اصلی چارت در snapshot ذخیره شده‌اند و ${risingDescriptor} تو در ${formatSignLabel(rising)} قرار دارد.`,
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
    `در زبان نمادین هالیوس، این جایگاه با ${planet.role} ارتباط دارد.`,
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
    `این لایه درباره ${planet.role} است، اما در گزارش هالیوس فقط به یک جمله کوتاه خلاصه نمی‌شود.`,
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

function buildRisingText(
  signKey: ZodiacKey,
  longitude: number,
  houseContext?: RealEngineReportHouseContext,
) {
  const sign = SIGN_COPY[signKey];
  const signLabel = formatSignLabel(sign);
  const risingDescriptor = buildRisingDescriptor(houseContext);

  return [
    `${risingDescriptor} تو در ${signLabel} است (${formatDegree(longitude)} روی دایره چارت).`,
    "رایزینگ درباره «اولین تماس تو با جهان» حرف می‌زند: اینکه چطور وارد فضاها می‌شوی، چطور دیده می‌شوی و بدنت با موقعیت‌های تازه چه ریتمی می‌گیرد.",
    `با ${signLabel}، ورود تو رنگ ${sign.energy} دارد؛ یعنی قبل از اینکه دیگران لایه‌های عمیق‌ترت را ببینند، معمولاً این کیفیت در رفتار، نگاه یا شیوه پاسخ دادنت جلوتر دیده می‌شود.`,
    `هدیه این رایزینگ ${sign.gift} است و وقتی آگاهانه زندگی شود، می‌تواند به تو کمک کند موقعیت‌های تازه را با اعتماد بیشتری شروع کنی.`,
    `چالش رشد آن هم ${sign.growth} است؛ یعنی تصویر بیرونی تو وقتی سالم‌تر می‌شود که فقط ماسک محافظ نباشد و به نیازهای واقعی خورشید و ماهت هم جا بدهد.`,
    "پرسش تأملی: در برخوردهای تازه، کدام بخش از این رایزینگ به تو کمک می‌کند و کدام بخش ممکن است پشت یک عادت دفاعی پنهان شده باشد؟",
  ].join(" ");
}

function buildHouseContextText(
  houseContext: RealEngineReportHouseContext | undefined,
  risingSign: ZodiacKey,
) {
  if (!isCalculatedWholeSignHouseContext(houseContext)) {
    return undefined;
  }

  const sign = SIGN_COPY[risingSign];
  const signLabel = formatSignLabel(sign);

  return [
    "خانه‌های این گزارش با سیستم Whole Sign و بر پایه رایزینگ محاسبه‌شده خوانده می‌شوند.",
    `در این روش، نشانه ${signLabel} دروازه خانه اول است و هر نشانه بعدی یک خانه کامل از چارت را می‌سازد.`,
    `برای تو، خانه اول با کیفیت ${sign.energy} شروع می‌شود؛ بنابراین شیوه ورود، بدن، تصویر بیرونی و شروع‌های شخصی با همین ریتم رنگ می‌گیرند.`,
    "در این نسخه، خانه‌ها برای جهت‌گیری تفسیری استفاده می‌شوند: اینکه انرژی سیاره‌ها بیشتر در کدام میدان زندگی دیده می‌شود، نه برای حکم قطعی درباره رویدادها.",
  ].join(" ");
}

function buildRisingDescriptor(
  houseContext: RealEngineReportHouseContext | undefined,
) {
  return isCalculatedWholeSignHouseContext(houseContext)
    ? "رایزینگ محاسبه‌شده"
    : "رایزینگ تقریبی";
}

function isCalculatedWholeSignHouseContext(
  houseContext: RealEngineReportHouseContext | undefined,
): boolean {
  return (
    houseContext?.appliedSystem === "whole-sign" &&
    houseContext.confidence === "calculated-ascendant" &&
    houseContext.ascendantMethod === "astronomy-engine-local-sidereal-time"
  );
}

function buildAspectOverviewText(aspects: RealEngineReportAspect[]) {
  if (aspects.length === 0) {
    return undefined;
  }

  const strongest = aspects.slice(0, 4);
  const aspectLead = strongest.map(formatAspectLead).join("؛ ");
  const detailText = strongest.map(buildAspectDetailText).join(" ");
  const reflectionText = buildAspectReflectionText(strongest);

  return [
    "روابط سیاره‌ها در این چارت نشان می‌دهند کدام بخش‌های شخصیت فقط جداگانه کار نمی‌کنند، بلکه با هم گفت‌وگو، حمایت یا اصطکاک سازنده دارند.",
    `در این نسخه، تمرکز روی ${strongest.length} ارتباط برجسته‌تر است: ${aspectLead}.`,
    detailText,
    reflectionText,
  ].join(" ");
}

function formatAspectLead(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.glyph} ${aspect.secondPlanetLabel} (${aspect.aspectLabel}، orb ${formatAspectDegree(
    aspect.orb,
  )})`;
}

function buildAspectDetailText(aspect: RealEngineReportAspect): string {
  const story = ASPECT_STORY[aspect.aspectId];

  return [
    `${aspect.firstPlanetLabel} و ${aspect.secondPlanetLabel} در الگوی ${aspect.aspectLabel} قرار گرفته‌اند.`,
    `زاویه واقعی این رابطه ${formatAspectDegree(aspect.separation)} است و با فاصله ${formatAspectDegree(
      aspect.orb,
    )} از زاویه دقیق، جزو ارتباط‌های مهم این چارت دیده می‌شود.`,
    story.theme,
    aspect.meaning,
    story.supportSignal,
    story.growthSignal,
    story.integration,
    story.reflection,
  ].join(" ");
}

function buildAspectReflectionText(aspects: RealEngineReportAspect[]): string {
  const tensionCount = aspects.filter((aspect) =>
    aspect.aspectId === "square" || aspect.aspectId === "opposition",
  ).length;
  const flowCount = aspects.filter((aspect) =>
    aspect.aspectId === "sextile" || aspect.aspectId === "trine",
  ).length;
  const conjunctionCount = aspects.filter(
    (aspect) => aspect.aspectId === "conjunction",
  ).length;

  const signals = [
    tensionCount > 0
      ? `${tensionCount} رابطه تنشی/قطبی نشان می‌دهد بخشی از رشد از راه تنظیم تعارض‌های درونی ساخته می‌شود.`
      : null,
    flowCount > 0
      ? `${flowCount} رابطه نرم/هماهنگ نشان می‌دهد بعضی توانایی‌ها با فشار کمتر در دسترس‌اند، اما هنوز نیاز به استفاده آگاهانه دارند.`
      : null,
    conjunctionCount > 0
      ? `${conjunctionCount} هم‌نشینی نشان می‌دهد بعضی نیروها در چارت تو صدای مشترک و پررنگ‌تری پیدا می‌کنند.`
      : null,
  ].filter(Boolean);

  return [
    "جمع‌بندی رابطه‌های سیاره‌ای:",
    signals.length > 0
      ? signals.join(" ")
      : "این روابط بیشتر به عنوان نشانه‌های گفت‌وگوی درونی خوانده می‌شوند، نه حکم قطعی درباره شخصیت.",
    "پرسش تأملی: اگر این روابط را مثل یک گفت‌وگوی درونی ببینی، کدام بخش نیاز به همکاری بیشتر دارد و کدام بخش نیاز به مرزبندی روشن‌تر؟",
  ].join(" ");
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
    "این‌ها ستون‌های اولیه گزارش‌اند و متن هالیوس از همین داده‌های real engine ساخته شده است.",
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
  const identityBody = joinSectionBody(
    input.sunText,
    input.risingText,
    input.houseText,
  );
  const relationshipBody = joinSectionBody(input.venusText, input.aspectText);
  const careerBody = joinSectionBody(input.mercuryText, input.marsText);
  const fallbackBody =
    input.integrationText ??
    input.summary ??
    "این بخش از گزارش بر اساس داده‌های محاسبه‌شده چارت نوشته شده و باید نمادین، آرام و غیرقطعی خوانده شود.";

  return [
    {
      id: "real-engine-overview",
      kind: "overview",
      title: "نقشه راه خوانش",
      body: buildStructuredSectionBody({
        opening:
          "این بخش مثل نقشه راه گزارش است؛ قبل از ورود به جزئیات، ستون‌های اصلی خوانش را کنار هم می‌گذارد.",
        body: input.summary,
        closing:
          "برای خواندن ادامه گزارش، هر بخش را نه به عنوان حکم قطعی، بلکه مثل یک زاویه مشاهده و گفت‌وگو با خودت ببین.",
      }),
    },
    {
      id: "real-engine-identity",
      kind: "identity",
      title: "هویت، حضور و شیوه ورود به جهان",
      body: buildStructuredSectionBody({
        opening:
          "این فصل از مسیر درونی شروع می‌کند و بعد به شیوه‌ای می‌رسد که جهان در برخورد اول از تو می‌بیند.",
        body: identityBody || input.sunText || input.risingText || fallbackBody,
        closing:
          "خورشید و رایزینگ را کنار هم بخوان: یکی از مسیر آگاهانه و حس هویت می‌گوید، دیگری از دروازه ورود تو به موقعیت‌ها.",
      }),
    },
    {
      id: "real-engine-emotional-pattern",
      kind: "emotional-pattern",
      title: "ریتم عاطفی و امنیت درونی",
      body: buildStructuredSectionBody({
        opening:
          "اینجا گزارش از لایه بیرونی فاصله می‌گیرد و به نیازهای آرام‌تر، واکنش‌های احساسی و شیوه امن شدن نزدیک می‌شود.",
        body: input.moonText ?? fallbackBody,
        closing:
          "این بخش را آرام‌تر بخوان؛ ماه معمولاً بیشتر از اینکه جواب فوری بدهد، نیاز پنهان یا ریتم مراقبت را نشان می‌دهد.",
      }),
    },
    {
      id: "real-engine-relationships",
      kind: "relationships",
      title: "رابطه، ارزش و گفت‌وگوی سیاره‌ها",
      body: buildStructuredSectionBody({
        opening:
          "این فصل رابطه را فقط به معنای عشق یا جذب نمی‌گیرد؛ درباره ارزش، صمیمیت، مرز و گفت‌وگوی میان نیروهای درونی است.",
        body: relationshipBody || input.venusText || input.aspectText || fallbackBody,
        closing:
          "اگر این فصل طولانی‌تر است، آن را در دو لایه بخوان: اول زهره و شیوه ارزش‌گذاری، بعد aspectها و گفت‌وگوی بخش‌های مختلف شخصیت.",
      }),
    },
    {
      id: "real-engine-career",
      kind: "career",
      title: "ذهن، حرکت و مسیر عمل",
      body: buildStructuredSectionBody({
        opening:
          "اینجا گزارش روی تصمیم، بیان، انرژی حرکت و شیوه تبدیل نیت به عمل تمرکز می‌کند.",
        body: careerBody || input.mercuryText || input.marsText || fallbackBody,
        closing:
          "عطارد و مریخ را کنار هم بخوان: یکی نشان می‌دهد چطور معنا می‌سازی و حرف می‌زنی، دیگری نشان می‌دهد چطور حرکت می‌کنی.",
      }),
    },
    {
      id: "real-engine-growth",
      kind: "growth",
      title: "جمع‌بندی و مسیر یکپارچه‌سازی",
      body: buildStructuredSectionBody({
        opening:
          "این فصل قرار نیست دوباره همه جزئیات را تکرار کند؛ کارش این است که نخ‌های اصلی گزارش را به یک مسیر قابل‌خواندن وصل کند.",
        body: input.integrationText || fallbackBody,
        closing: buildFinalSynthesisClosing(input),
      }),
    },
    {
      id: "real-engine-reflection-prompts",
      kind: "reflection-prompts",
      title: "تمرین پایانی برای خواندن گزارش",
      body: buildRealEngineReflectionPrompts(input),
    },
  ];
}

type StructuredSectionBodyInput = {
  opening: string;
  body: string | undefined;
  closing?: string;
};

function buildStructuredSectionBody({
  opening,
  body,
  closing,
}: StructuredSectionBodyInput): string {
  return [opening, body, closing]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

function buildFinalSynthesisClosing(input: RealEngineSectionTextInput): string {
  const threads = [
    input.sunText && input.risingText
      ? "هویت و رایزینگ نشان می‌دهند درون و بیرون گزارش باید با هم خوانده شوند."
      : null,
    input.mercuryText && input.marsText
      ? "ذهن و عمل نشان می‌دهند وضوح فقط در فکر نیست؛ در قدم بعدی هم دیده می‌شود."
      : null,
    input.venusText && input.aspectText
      ? "زهره و aspectها کمک می‌کنند رابطه را هم به عنوان انتخاب بیرونی و هم گفت‌وگوی درونی ببینی."
      : null,
  ].filter(Boolean);

  return [
    threads.length > 0
      ? threads.join(" ")
      : "برای یکپارچه‌سازی، از بخشی شروع کن که بیشترین شباهت را به تجربه فعلی تو دارد.",
    "جمع‌بندی نهایی هالیوس این است: چارت قرار نیست جای تو تصمیم بگیرد؛ فقط چند زاویه برای دیدن خودت با آرامش و صداقت بیشتر باز می‌کند.",
  ].join(" ");
}

function buildRealEngineReflectionPrompts(input: RealEngineSectionTextInput): string {
  const prompts = [
    "۱) از بخش هویت شروع کن: کدام جمله واقعاً به حس مسیر و حضور تو نزدیک است؟",
    "۲) بعد سراغ ماه برو: کدام نیاز عاطفی را بهتر است زودتر و مهربان‌تر بشناسی؟",
    "۳) عطارد، زهره و مریخ را مثل سه ابزار روزمره بخوان: فکر، ارزش و عمل کجا با هم هماهنگ‌اند و کجا نه؟",
    "۴) aspectها را مثل گفت‌وگوی درونی ببین: کدام رابطه حمایت می‌سازد و کدام رابطه مهارت تازه می‌خواهد؟",
    "۵) یک انتخاب کوچک برای این هفته بردار؛ چیزی که گزارش را از متن به تجربه قابل مشاهده تبدیل کند.",
  ];
  const closing =
    input.integrationText || input.aspectText
      ? "این تمرین پایانی برای تأمل است، نه برای گرفتن حکم قطعی از چارت."
      : "اگر بخشی هنوز مبهم است، آن را به‌عنوان دعوت به مشاهده آرام‌تر نگه دار.";

  return [prompts.join(" "), closing].join(" ");
}

function joinSectionBody(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ");
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
