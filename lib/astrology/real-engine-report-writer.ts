import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportAngleId,
  RealEngineReportAngles,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportAspect,
  RealEngineReportHouse,
  RealEngineReportHouseContext,
  RealEngineReportLunarNodePoint,
  RealEngineReportLunarNodes,
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
  aliases?: string[];
  energy: string;
  gift: string;
  growth: string;
};

type PlanetCopy = {
  faName: string;
  title: string;
  role: string;
};

type HouseCopy = {
  field: string;
  gift: string;
  growth: string;
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
    aliases: ["قوچ"],
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
    aliases: ["دوقلو"],
    energy: "کنجکاو، ذهنی و ارتباطی",
    gift: "دیدن چند زاویه هم‌زمان و تبدیل تجربه به کلمه، ایده و گفتگو",
    growth: "عمیق‌تر ماندن با یک مسیر به‌جای پریدن سریع بین احتمال‌ها",
  },
  cancer: {
    faName: "سرطان",
    enName: "Cancer",
    aliases: ["خرچنگ"],
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
    aliases: ["خوشه"],
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
    aliases: ["کماندار"],
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
    aliases: ["ماهی"],
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

const WRITER_ANGLE_ORDER: RealEngineReportAngleId[] = ["asc", "dsc", "mc", "ic"];

const ANGLE_COPY: Record<RealEngineReportAngleId, { faName: string; axis: string; meaning: string }> = {
  asc: {
    faName: "ASC / رایزینگ",
    axis: "محور ASC/DSC",
    meaning: "دروازه ورود تو به جهان، بدن، تصویر اولیه و شیوه شروع کردن موقعیت‌ها",
  },
  dsc: {
    faName: "DSC / نقطه روبه‌رو",
    axis: "محور ASC/DSC",
    meaning: "آینه رابطه، شراکت و کیفیتی که در دیگری پررنگ‌تر دیده می‌شود",
  },
  mc: {
    faName: "MC / میانه آسمان",
    axis: "محور MC/IC",
    meaning: "مسیر بیرونی، اعتبار، جهت اجتماعی و چیزی که در جهان ساخته می‌شود",
  },
  ic: {
    faName: "IC / ریشه آسمان",
    axis: "محور MC/IC",
    meaning: "ریشه درونی، خانه، گذشته و جایی که احساس بنیاد روانی ساخته می‌شود",
  },
};

const HOUSE_COPY: Record<number, HouseCopy> = {
  1: {
    field: "بدن، تصویر بیرونی، شروع‌های شخصی و شیوه ورود به موقعیت‌ها",
    gift: "حضور روشن‌تر و شروع کردن از جایگاهی که با ریتم خودت هماهنگ‌تر است",
    growth: "این است که واکنش اول را بشناسی و آن را به انتخاب آگاهانه‌تر تبدیل کنی",
  },
  2: {
    field: "امنیت، ارزش شخصی، بدن، پول و چیزهایی که حس ثبات می‌سازند",
    gift: "ساختن رابطه سالم‌تر با ارزش، منابع و آرامش بدن‌مند",
    growth: "این است که امنیت را فقط از بیرون نخواهی و ارزش خودت را آهسته‌تر اما واقعی‌تر بسازی",
  },
  3: {
    field: "فکر، یادگیری، کلام، خواهر و برادرها، همسایه‌ها و رفت‌وآمدهای نزدیک",
    gift: "تبدیل تجربه به زبان، مشاهده و ارتباط روشن‌تر",
    growth: "این است که ذهن را از پراکندگی به فهم قابل استفاده نزدیک‌تر کنی",
  },
  4: {
    field: "خانه، ریشه، خانواده، حافظه و جای امن درونی",
    gift: "شناخت ریشه‌ها و ساختن پناهی که فقط بیرونی نیست",
    growth: "این است که گذشته را ببینی بی‌آنکه در آن زندانی بمانی",
  },
  5: {
    field: "خلاقیت، عشق، بازی، دیده‌شدن و بیان شخصی",
    gift: "زنده‌تر کردن شادی، آفرینش و جرئت نمایش چیزی که از دل می‌آید",
    growth: "این است که بیان خودت را به جای نمایش برای تأیید، به تجربه‌ای صادق‌تر تبدیل کنی",
  },
  6: {
    field: "کار روزمره، بدن، مراقبت، عادت‌ها و کیفیت خدمت",
    gift: "بهتر کردن زندگی از راه نظم‌های کوچک و مراقبت عملی",
    growth: "این است که اصلاح را با سخت‌گیری اشتباه نگیری و به بدن و ریتمت هم گوش بدهی",
  },
  7: {
    field: "رابطه یک‌به‌یک، شراکت، آینه‌های نزدیک و گفت‌وگوی برابر",
    gift: "دیدن خودت از راه رابطه و ساختن تعادل در انتخاب‌های مشترک",
    growth: "این است که در رابطه نه گم شوی و نه از نزدیکی فرار کنی",
  },
  8: {
    field: "اعتماد، صمیمیت عمیق، ترس‌ها، منابع مشترک و دگرگونی روانی",
    gift: "توان دیدن لایه‌های پنهان و تبدیل بحران به شناخت عمیق‌تر",
    growth: "این است که شدت احساس را به آگاهی، مرز و اعتماد تدریجی تبدیل کنی",
  },
  9: {
    field: "معنا، سفر، آموزش، باورها، جهان‌بینی و افق‌های دورتر",
    gift: "گسترش نگاه و پیدا کردن معنایی که تجربه‌ها را به مسیر تبدیل می‌کند",
    growth: "این است که باور را با دقت، تجربه و مسئولیت همراه کنی",
  },
  10: {
    field: "مسیر اجتماعی، مسئولیت، اعتبار، کار جدی و چیزی که در جهان ساخته می‌شود",
    gift: "ساختن حضور قابل اعتماد و تبدیل توان درونی به اثر بیرونی",
    growth: "این است که موفقیت را فقط با فشار یا تصویر بیرونی تعریف نکنی",
  },
  11: {
    field: "دوستی‌ها، شبکه‌ها، جمع‌ها، آینده‌سازی و حس تعلق اجتماعی",
    gift: "وصل کردن مسیر فردی به جمع‌های معنادار و چشم‌اندازهای بزرگ‌تر",
    growth: "این است که در جمع حضور داشته باشی بی‌آنکه صدای شخصی‌ات کم‌رنگ شود",
  },
  12: {
    field: "تنهایی، ناخودآگاه، رؤیا، رهاسازی و چیزهایی که پشت صحنه عمل می‌کنند",
    gift: "شنیدن لایه‌های آرام‌تر روان و تبدیل تنهایی به مراقبت و الهام",
    growth: "این است که فرار، ابهام یا سکوت را با حضور آگاهانه‌تر جایگزین کنی",
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
    cityLabel: realEngine.cityLabel,
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
  const houseAnglesText = buildHouseAnglesText(realEngineWithAspects);
  const retrogradeText = buildRetrogradeText(realEngineWithAspects);
  const lunarNodeText = buildLunarNodeText(realEngineWithAspects);
  const natalAccuracyText = buildNatalAccuracyText(realEngineWithAspects);
  const mercuryText = buildOptionalPlacementText(mercury, "mercury");
  const venusText = buildOptionalPlacementText(venus, "venus");
  const marsText = buildOptionalPlacementText(mars, "mars");
  const aspectText = buildAspectOverviewText(aspects);
  const sunAspectText = buildPlanetAspectText("sun", PLANET_COPY.sun.faName, aspects);
  const moonAspectText = buildPlanetAspectText("moon", PLANET_COPY.moon.faName, aspects);
  const mercuryAspectText = buildPlanetAspectText("mercury", PLANET_COPY.mercury.faName, aspects);
  const venusAspectText = buildPlanetAspectText("venus", PLANET_COPY.venus.faName, aspects);
  const marsAspectText = buildPlanetAspectText("mars", PLANET_COPY.mars.faName, aspects);
  const integrationText = buildIntegrationText(realEngineWithAspects);
  const sectionEvidence = buildRealEngineSectionEvidence({
    sun,
    moon,
    risingSign,
    mercury,
    venus,
    mars,
    aspectCount: aspects.length,
    houseCount: realEngineWithAspects.houses?.length ?? 0,
    hasAngles: hasCompleteAngles(realEngineWithAspects.angles),
    retrogradeStatus: realEngineWithAspects.retrogrades?.status,
    retrogradePlanetCount: realEngineWithAspects.retrogrades?.planetIds.length ?? 0,
    lunarNodes: realEngineWithAspects.lunarNodes,
  });
  const interpretations = [
    sunText,
    moonText,
    risingText,
    mercuryText,
    venusText,
    marsText,
    sunAspectText,
    moonAspectText,
    mercuryAspectText,
    venusAspectText,
    marsAspectText,
    houseText,
    houseAnglesText,
    lunarNodeText,
    retrogradeText,
    aspectText,
    integrationText,
    natalAccuracyText,
  ].filter(Boolean) as string[];
  const interpretationSections = buildRealEngineInterpretationSections({
    summary,
    sunText,
    moonText,
    risingText,
    houseText,
    houseAnglesText,
    retrogradeText,
    lunarNodeText,
    natalAccuracyText,
    mercuryText,
    venusText,
    marsText,
    aspectText,
    sunAspectText,
    moonAspectText,
    mercuryAspectText,
    venusAspectText,
    marsAspectText,
    integrationText,
    ...sectionEvidence,
  });

  return {
    ...report,
    realEngine: realEngineWithAspects,
    summary,
    interpretations,
    interpretationSections,
  } as AstrologyReport;
}

type RealEngineSectionEvidence = {
  identityEvidence?: string;
  emotionalEvidence?: string;
  relationshipEvidence?: string;
  careerEvidence?: string;
  growthEvidence?: string;
  houseAnglesEvidence?: string;
  motionEvidence?: string;
  lunarNodeEvidence?: string;
};

type RealEngineSectionEvidenceInput = {
  sun: RealEngineReportPlacement | undefined;
  moon: RealEngineReportPlacement | undefined;
  risingSign: ZodiacKey;
  mercury: RealEngineReportPlacement | undefined;
  venus: RealEngineReportPlacement | undefined;
  mars: RealEngineReportPlacement | undefined;
  aspectCount: number;
  houseCount: number;
  hasAngles: boolean;
  retrogradeStatus?: string;
  retrogradePlanetCount: number;
  lunarNodes?: RealEngineReportLunarNodes;
};

type RealEngineSectionTextInput = {
  summary: string;
  sunText?: string;
  moonText?: string;
  risingText?: string;
  houseText?: string;
  houseAnglesText?: string;
  retrogradeText?: string;
  lunarNodeText?: string;
  natalAccuracyText?: string;
  mercuryText?: string;
  venusText?: string;
  marsText?: string;
  aspectText?: string;
  sunAspectText?: string;
  moonAspectText?: string;
  mercuryAspectText?: string;
  venusAspectText?: string;
  marsAspectText?: string;
  integrationText: string;
  identityEvidence?: string;
  emotionalEvidence?: string;
  relationshipEvidence?: string;
  careerEvidence?: string;
  growthEvidence?: string;
  houseAnglesEvidence?: string;
  motionEvidence?: string;
  lunarNodeEvidence?: string;
};

function buildRealEngineSectionEvidence({
  sun,
  moon,
  risingSign,
  mercury,
  venus,
  mars,
  aspectCount,
  houseCount,
  hasAngles,
  retrogradeStatus,
  retrogradePlanetCount,
  lunarNodes,
}: RealEngineSectionEvidenceInput): RealEngineSectionEvidence {
  const risingEvidence = `رایزینگ در ${formatSignLabel(SIGN_COPY[risingSign])}`;

  return {
    identityEvidence: joinEvidenceLabels(
      buildPlacementEvidenceLabel(sun, "sun"),
      risingEvidence,
    ),
    emotionalEvidence: buildPlacementEvidenceLabel(moon, "moon"),
    relationshipEvidence: joinEvidenceLabels(
      buildPlacementEvidenceLabel(venus, "venus"),
      aspectCount > 0 ? `روابط سیاره‌ها: ${toPersianNumber(aspectCount)} جنبه` : undefined,
    ),
    careerEvidence: joinEvidenceLabels(
      buildPlacementEvidenceLabel(mercury, "mercury"),
      buildPlacementEvidenceLabel(mars, "mars"),
    ),
    growthEvidence: joinEvidenceLabels(
      buildPlacementEvidenceLabel(sun, "sun"),
      buildPlacementEvidenceLabel(moon, "moon"),
      risingEvidence,
    ),
    houseAnglesEvidence: joinEvidenceLabels(
      houseCount === 12 ? "۱۲ خانه Whole Sign محاسبه‌شده" : undefined,
      hasAngles ? "ASC/DSC/MC/IC در داده گزارش" : undefined,
    ),
    motionEvidence: joinEvidenceLabels(
      retrogradeStatus === "calculated" ? "حرکت برگشتی محاسبه‌شده" : undefined,
      retrogradeStatus === "calculated" && retrogradePlanetCount > 0
        ? `${toPersianNumber(retrogradePlanetCount)} سیاره برگشتی`
        : retrogradeStatus === "calculated"
          ? "بدون سیاره برگشتی در داده گزارش"
          : undefined,
      isCalculatedLunarNodes(lunarNodes)
        ? "دست‌های ماه: Mean Lunar Node محاسبه‌شده"
        : "دست‌های ماه و لیلیت هنوز عمداً بیرون از خوانش مانده‌اند",
    ),
    lunarNodeEvidence: buildLunarNodeEvidenceLabel(lunarNodes),
  };
}

function buildLunarNodeEvidenceLabel(lunarNodes: RealEngineReportLunarNodes | undefined): string | undefined {
  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  return "دست‌های ماه: Mean Lunar Node محاسبه‌شده";
}

function buildPlacementEvidenceLabel(
  placement: RealEngineReportPlacement | undefined,
  planetId: "sun" | "moon" | "mercury" | "venus" | "mars",
): string | undefined {
  if (!placement) {
    return undefined;
  }

  const planet = PLANET_COPY[planetId];

  return `${planet.faName} در ${formatPlacementWithHouse(placement)}`;
}

function joinEvidenceLabels(...labels: Array<string | undefined>): string | undefined {
  const filteredLabels = labels.filter(
    (label): label is string => typeof label === "string" && label.trim().length > 0,
  );

  if (filteredLabels.length === 0) {
    return undefined;
  }

  return `پشتوانه این بخش: ${filteredLabels.join("؛ ")}`;
}

function buildEvidenceOpening(evidence: string | undefined, opening: string): string {
  return evidence ? `${evidence}. ${opening}` : opening;
}

function buildRealEngineSummary({
  name,
  cityLabel,
  sun,
  moon,
  risingSign,
  houseContext,
}: {
  name: string;
  cityLabel?: string;
  sun: RealEngineReportPlacement | undefined;
  moon: RealEngineReportPlacement | undefined;
  risingSign: ZodiacKey;
  houseContext?: RealEngineReportHouseContext;
}) {
  const displayName = name ? `${name}، ` : "";
  const cityPhrase = cityLabel ? ` برای تولد در ${cityLabel}` : "";
  const sunSign = sun ? SIGN_COPY[sun.signId] : null;
  const moonSign = moon ? SIGN_COPY[moon.signId] : null;
  const sunHouseSuffix = sun ? formatHouseSuffix(sun) : "";
  const moonHouseSuffix = moon ? formatHouseSuffix(moon) : "";
  const rising = SIGN_COPY[risingSign];
  const risingDescriptor = buildRisingDescriptor(houseContext);

  if (sunSign && moonSign) {
    return [
      `${displayName}این خوانش هالیوس${cityPhrase} از روی چارت محاسبه‌شده تو ساخته شده است؛ زبانش زبان حکم و پیش‌گویی نیست، بلکه زبان نمادین و سنت کهن خواندن آسمان است.`,
      "مسیر خواندن از سه ستون اصلی شروع می‌شود: خورشید، ماه و رایزینگ. بعد آرام‌آرام به ذهن، رابطه، حرکت، خانه‌ها، دست‌های ماه و یادداشت‌های دقت می‌رسیم تا گزارش شبیه فهرست خام داده‌ها نباشد.",
      `خورشید تو در ${formatSignLabel(sunSign)}${sunHouseSuffix} قرار دارد؛ یعنی مسیر هویت و اعتمادبه‌نفس با کیفیت ${sunSign.energy} رنگ می‌گیرد.`,
      `ماه تو در ${formatSignLabel(moonSign)}${moonHouseSuffix} است؛ جایی که امنیت عاطفی و واکنش‌های غریزی به انرژی ${moonSign.energy} نزدیک می‌شوند.`,
      `${risingDescriptor} تو در ${formatSignLabel(rising)} قرار دارد و نشان می‌دهد در برخورد اول با جهان، چه ریتم و تصویری از تو جلوتر دیده می‌شود.`,
      "این خوانش ادعای علمی یا حکم قطعی درباره شخصیت نیست؛ یک نقشه تأملی است تا ببینی کدام نمادها با تجربه تو هم‌صدا هستند و کجاها نیاز به مشاهده بیشتر دارند.",
    ].join(" ");
  }

  return [
    `${displayName}این خوانش هالیوس${cityPhrase} از روی چارت محاسبه‌شده تو ساخته شده است و آن را مثل یک زبان نمادین برای تأمل می‌خواند، نه یک حکم قطعی درباره آینده یا شخصیت.`,
    `داده‌های اصلی چارت آماده‌اند و ${risingDescriptor} تو در ${formatSignLabel(rising)} قرار دارد.`,
    "متن گزارش از همین داده‌های محاسبه‌شده ساخته شده است؛ آن را مثل دعوتی برای دیدن الگوها بخوان، نه جایگزین مشاهده، گفت‌وگو یا تصمیم شخصی.",
  ].join(" ");
}


function buildCoreSynthesisThread(
  sun: RealEngineReportPlacement | undefined,
  moon: RealEngineReportPlacement | undefined,
  risingSign: ZodiacKey,
): string {
  const rising = SIGN_COPY[risingSign];

  if (!sun || !moon) {
    return [
      "سه نخ اصلی این چارت از رایزینگ " + formatSignLabel(rising) + " شروع می‌شود و با جایگاه‌های محاسبه‌شده سیاره‌ها کامل‌تر خوانده می‌شود.",
      "تصویر کلی این چارت را باید آهسته ساخت: اول ببین جهان تو را از کدام دروازه می‌بیند، بعد ببین کدام نیازها و انتخاب‌ها این تصویر را کامل‌تر می‌کنند.",
    ].join(" ");
  }

  const sunSign = SIGN_COPY[sun.signId];
  const moonSign = SIGN_COPY[moon.signId];

  return [
    "سه نخ اصلی این چارت از خورشید در " + formatPlacementWithHouse(sun) + "، ماه در " + formatPlacementWithHouse(moon) + " و رایزینگ " + formatSignLabel(rising) + " ساخته می‌شود.",
    "خورشید با کیفیت " + sunSign.energy + " مسیر روشن‌شدن هویت را نشان می‌دهد؛ ماه با کیفیت " + moonSign.energy + " زبان امنیت عاطفی را می‌سازد؛ رایزینگ " + formatSignLabel(rising) + " هم شیوه ورود به جهان را رنگ می‌دهد.",
    "تصویر کلی این چارت وقتی زنده‌تر می‌شود که این سه را جداگانه نخوانی: یکی می‌گوید چه چیزی در تو روشن می‌شود، یکی می‌گوید چه چیزی تو را آرام می‌کند، و یکی نشان می‌دهد جهان در برخورد اول کدام ریتم را از تو می‌بیند.",
  ].join(" ");
}

function buildAspectSynthesisThread(aspects: RealEngineReportAspect[]): string {
  const tensionCount = aspects.filter((aspect) =>
    aspect.aspectId === "square" || aspect.aspectId === "opposition",
  ).length;
  const flowCount = aspects.filter((aspect) =>
    aspect.aspectId === "sextile" || aspect.aspectId === "trine",
  ).length;
  const conjunctionCount = aspects.filter(
    (aspect) => aspect.aspectId === "conjunction",
  ).length;

  if (aspects.length === 0) {
    return "در لایه کشمکش و استعداد، این نسخه بیشتر از جایگاه‌های اصلی شروع می‌کند؛ هر aspect محاسبه‌شده بعدی باید فقط وقتی وارد روایت شود که داده کافی داشته باشد.";
  }

  const signals = [
    tensionCount > 0
      ? toPersianNumber(tensionCount) + " نشانه تنش یا قطبیت، تمرین رشد را از راه تنظیم دو نیاز متفاوت نشان می‌دهد"
      : null,
    flowCount > 0
      ? toPersianNumber(flowCount) + " نشانه روانی یا حمایت، استعدادهایی را نشان می‌دهد که اگر آگاهانه استفاده شوند هدر نمی‌روند"
      : null,
    conjunctionCount > 0
      ? toPersianNumber(conjunctionCount) + " هم‌نشینی، صدای بعضی نیروهای درونی را پررنگ‌تر می‌کند"
      : null,
  ].filter(Boolean);

  return [
    "در لایه کشمکش و استعداد، aspectها کمک می‌کنند گزارش فقط درباره جایگاه‌های جدا نباشد.",
    signals.length > 0
      ? signals.join("؛ ") + "."
      : "این روابط بیشتر مثل گفت‌وگوی درونی خوانده می‌شوند تا حکم قطعی درباره شخصیت.",
    "تمرین رشد این است که ببینی کدام نیرو باید نرم‌تر همکاری کند و کدام نیرو نیاز به مرز، تمرین یا زمان دارد.",
  ].join(" ");
}

function buildHouseSynthesisThread(realEngine: RealEngineReportSnapshot): string {
  const activeHouses = Array.from(
    new Set(
      realEngine.placements
        .map((placement) => placement.house)
        .filter((house): house is number => typeof house === "number" && Number.isFinite(house)),
    ),
  ).sort((first, second) => first - second);

  if (activeHouses.length === 0) {
    return "از نظر میدان‌های زندگی، خانه‌ها فقط وقتی وارد جمع‌بندی می‌شوند که جایگاه محاسبه‌شده و قابل توضیح داشته باشند.";
  }

  const shownHouses = activeHouses.slice(0, 4).map((house) => "خانه " + toPersianNumber(house)).join("، ");
  const extra = activeHouses.length > 4 ? " و چند خانه دیگر" : "";

  return "از نظر میدان‌های زندگی، تمرکز اولیه در " + shownHouses + extra + " دیده می‌شود؛ یعنی تصویر کلی فقط از نشانه‌ها ساخته نمی‌شود، بلکه از جایی هم ساخته می‌شود که هر نیرو در زندگی روزمره فعال می‌شود.";
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
  const placementLabel = formatPlacementWithHouse(placement);
  const signLabel = formatSignLabel(sign);
  const houseSentence = buildPlanetHouseSentence(placement, planetId);

  return [
    `${planet.faName}، یعنی ${planet.title}، در ${placementLabel} قرار دارد.`,
    `در زبان نمادین هالیوس، این جایگاه با ${planet.role} ارتباط دارد.`,
    `${story.opening}`,
    `کیفیت ${signLabel} این بخش را ${sign.energy} می‌کند؛ بنابراین هدیه طبیعی آن ${sign.gift} است.`,
    houseSentence,
    `${story.everydaySignal}`,
    `مسیر رشد این نشانه این است: ${sign.growth}.`,
    `${story.shadowSignal}`,
    `${story.integration}`,
    `${story.reflection}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
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
  const placementLabel = formatPlacementWithHouse(placement);
  const signLabel = formatSignLabel(sign);
  const houseSentence = buildPlanetHouseSentence(placement, planetId);

  return [
    `${planet.faName}، یعنی ${planet.title}، در ${placementLabel} قرار دارد.`,
    `این لایه درباره ${planet.role} است، اما در گزارش هالیوس فقط به یک جمله کوتاه خلاصه نمی‌شود.`,
    `${story.opening}`,
    `کیفیت ${signLabel} این بخش را ${sign.energy} می‌کند؛ بنابراین نقطه قوت اصلی آن ${sign.gift} است.`,
    houseSentence,
    `${story.everydaySignal}`,
    `${story.relationshipSignal}`,
    `چالش رشد این نشانه در این لایه چنین است: ${sign.growth}.`,
    `${story.shadowSignal}`,
    `${story.integration}`,
    `${story.reflection}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function buildPlanetHouseSentence(
  placement: RealEngineReportPlacement,
  planetId: "sun" | "moon" | "mercury" | "venus" | "mars",
): string | undefined {
  const houseNumber = placement.house;
  const house =
    typeof houseNumber === "number" && Number.isFinite(houseNumber)
      ? HOUSE_COPY[houseNumber]
      : undefined;

  if (!house) {
    return undefined;
  }

  const planet = PLANET_COPY[planetId];
  const resolvedHouseNumber =
    typeof houseNumber === "number" && Number.isFinite(houseNumber)
      ? houseNumber
      : null;

  if (resolvedHouseNumber === null) {
    return undefined;
  }

  const formattedHouse = toPersianNumber(resolvedHouseNumber);

  return `از نظر خانه‌ها، ${planet.faName} در ${formatPlacementWithHouse(placement)} قرار گرفته است؛ یعنی موضوع ${planet.title} بیشتر از مسیر ${house.field} دیده می‌شود. هدیه خانه ${formattedHouse} ${house.gift} است و مسیر رشدش ${house.growth}.`;
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

function buildHouseAnglesText(realEngine: RealEngineReportSnapshot): string | undefined {
  const houses = getSortedReportHouses(realEngine.houses);
  const angles = getOrderedReportAngles(realEngine.angles);

  if (houses.length !== 12 && angles.length === 0) {
    return undefined;
  }

  const houseSystemText =
    houses.length === 12
      ? "خانه‌های این گزارش با سیستم Whole Sign ساخته شده‌اند؛ جدول کامل در کارت گزارش آمده و متن خوانش فقط نقاط پررنگ‌تر را برجسته می‌کند."
      : "در این نسخه هنوز جدول کامل ۱۲ خانه در خروجی گزارش آماده نیست، پس خانه‌ها فقط با احتیاط خوانده می‌شوند.";
  const anglesText = angles.length > 0 ? buildAnglesNarrative(angles) : undefined;
  const ascDscText = realEngine.angles?.asc && realEngine.angles?.dsc
    ? "محور ASC/DSC پیوند میان شیوه ورود تو به جهان و آینه رابطه با دیگری را نشان می‌دهد."
    : undefined;
  const mcIcText = realEngine.angles?.mc && realEngine.angles?.ic
    ? "محور MC/IC مسیر بیرونی و ریشه درونی را جدا از شماره خانه‌ها می‌خواند؛ MC لزوماً با خانه ۱۰ یکی نیست و IC هم فقط نام دیگر خانه ۴ نیست."
    : undefined;
  const housesText = houses.length === 12 ? buildWholeSignHouseNarrative(houses, realEngine.placements) : undefined;

  return [houseSystemText, anglesText, ascDscText, mcIcText, housesText]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

function buildRetrogradeText(realEngine: RealEngineReportSnapshot): string | undefined {
  const retrogrades = realEngine.retrogrades;

  if (retrogrades?.status !== "calculated") {
    return undefined;
  }

  const planetLabels = retrogrades.planetIds
    .map((planetId) => PLANET_COPY[planetId]?.faName ?? planetId)
    .filter((label): label is string => Boolean(label));
  const baseMethod =
    "در این نسخه، حرکت برگشتی از مقایسه جایگاه ظاهری سیاره‌ها در دایره بروج، پیش و پس از لحظه تولد، به دست می‌آید.";
  const deferredPoints = isCalculatedLunarNodes(realEngine.lunarNodes)
    ? "دست‌های ماه با مدل Mean Lunar Node در فصل جداگانه گزارش آمده‌اند؛ لیلیت هنوز عمداً وارد خوانش نشده است."
    : "دست‌های ماه و لیلیت هنوز عمداً وارد خوانش نشده‌اند، چون تعریف نقطه و منبع محاسباتی آن‌ها باید جداگانه روشن و سخت‌گیرانه شود.";

  if (planetLabels.length === 0) {
    return [
      "در داده محاسبه‌شده این گزارش، برای سیاره‌های محاسبه‌شده حرکت برگشتی ثبت نشده است.",
      baseMethod,
      "این نبودنِ retrograde را نباید به معنای ساده بودن کامل چارت خواند؛ خانه‌ها، محورها و روابط سیاره‌ها همچنان لایه‌های اصلی گفت‌وگوی درونی را می‌سازند.",
      deferredPoints,
    ].join(" ");
  }

  return [
    `در داده محاسبه‌شده این گزارش، ${planetLabels.join("، ")} با حرکت برگشتی ثبت شده‌اند.`,
    baseMethod,
    "در خوانش نمادین، retrograde بیشتر به معنای بازنگری و درونی‌تر شدن توجه است؛ نه نشانه ضعف یا اتفاق قطعی.",
    deferredPoints,
  ].join(" ");
}

function buildLunarNodeText(realEngine: RealEngineReportSnapshot): string | undefined {
  const lunarNodes = realEngine.lunarNodes;

  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  return [
    "دست‌های ماه در این گزارش با مدل Mean Lunar Node خوانده می‌شوند؛ بنابراین این بخش ادعای True/Osculating Node ندارد.",
    "این بخش را مثل یک راهنمای رشد بخوان: نه برای تعیین سرنوشت، بلکه برای دیدن کشش میان عادت آشنا و تمرین تازه.",
    formatLunarNodeNarrativePoint(lunarNodes.northNode),
    formatLunarNodeNarrativePoint(lunarNodes.southNode),
    "دست شمالی ماه را مثل جهت تمرین تازه، رشد آگاهانه و دعوتی بخوان که ممکن است اول کمی ناآشنا باشد.",
    "دست جنوبی ماه از دست شمالی ماه + ۱۸۰° مشتق شده و بیشتر از الگوی آشنا، عادت قدیمی و جایی می‌گوید که بازگشت به آن آسان‌تر است.",
    "این فصل پیش‌گویی یا حکم کارمایی قطعی نیست؛ فقط یک لایه تأملی برای دیدن نسبت میان راحتی قدیمی و تمرین تازه است.",
  ].join(" ");
}

function formatLunarNodeNarrativePoint(node: RealEngineReportLunarNodePoint): string {
  const sign = SIGN_COPY[node.signId];
  const handLabel = node.id === "north-node" ? "دست شمالی ماه" : "دست جنوبی ماه";
  const houseSuffix = typeof node.house === "number" ? `، خانه ${toPersianNumber(node.house)}` : "";
  const sourceLabel = node.source === "derived-opposition"
    ? "این نقطه از مخالفت دقیق با Mean North Node ساخته شده است."
    : "این نقطه با فرمول Mean Lunar Node محاسبه شده است.";

  return `${handLabel}: ${formatSignLabel(sign)}، درجه ${formatDegree(node.degreeInSign)}${houseSuffix}. ${sourceLabel}`;
}

function isCalculatedLunarNodes(
  lunarNodes: RealEngineReportLunarNodes | undefined,
): lunarNodes is RealEngineReportCalculatedLunarNodes {
  return Boolean(
    lunarNodes &&
      lunarNodes.status === "calculated" &&
      "northNode" in lunarNodes &&
      "southNode" in lunarNodes &&
      lunarNodes.nodeType === "mean" &&
      isValidLunarNodePoint(lunarNodes.northNode) &&
      isValidLunarNodePoint(lunarNodes.southNode),
  );
}

function isValidLunarNodePoint(node: RealEngineReportLunarNodePoint): boolean {
  return (
    typeof node.longitude === "number" &&
    Number.isFinite(node.longitude) &&
    typeof node.degreeInSign === "number" &&
    Number.isFinite(node.degreeInSign)
  );
}

function buildNatalAccuracyText(realEngine: RealEngineReportSnapshot): string | undefined {
  const quality = realEngine.calculationQuality;

  if (!quality) {
    return undefined;
  }

  const limitationText = [...(quality.limitations ?? []), ...(quality.warnings ?? [])]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 5)
    .join(" ");

  const nodesStatus = realEngine.lunarNodes?.status ?? "not-calculated";
  const lilithStatus = realEngine.lilith?.status ?? "not-calculated";
  const nodesText =
    nodesStatus === "calculated"
      ? "دست‌های ماه با برچسب Mean Lunar Node در داده محاسبه‌شده ثبت شده‌اند؛ این ادعای True Node نیست."
      : "دست‌های ماه هنوز محاسبه نمی‌شوند و تا انتخاب منبع ephemeris و تعریف Mean/True Node وارد نتیجه‌گیری نمی‌شوند.";
  const lilithText =
    lilithStatus === "calculated"
      ? "لیلیت در داده محاسبه‌شده ثبت شده است و می‌تواند در خوانش بعدی وارد شود."
      : "لیلیت هنوز محاسبه نمی‌شود؛ قبل از نمایش باید تصمیم Mean Lilith یا True Lilith و منبع محاسبه روشن شود.";

  return [
    "دقت این گزارش به ساعت تولد، timezone و مختصات شهر تولد تکیه دارد.",
    "اگر ساعت تولد تقریبی باشد، خانه‌ها، رایزینگ، MC/IC و نمونه‌گیری حرکت برگشتی باید محتاط‌تر خوانده شوند.",
    "مرزهای نزدیک نیمه‌شب با QA جداگانه نگهبانی می‌شوند تا گزارش در تغییر روز یا شهر اشتباه claim نکند.",
    nodesText,
    lilithText,
    limitationText,
  ]
    .filter((part) => part.trim().length > 0)
    .join(" ");
}

function getSortedReportHouses(houses: RealEngineReportHouse[] | undefined): RealEngineReportHouse[] {
  if (!Array.isArray(houses)) {
    return [];
  }

  return houses
    .filter((house) => house.system === "whole-sign" && house.reliability === "calculated")
    .slice()
    .sort((first, second) => first.number - second.number);
}

function getOrderedReportAngles(angles: RealEngineReportAngles | undefined): RealEngineReportAngle[] {
  if (!angles) {
    return [];
  }

  return WRITER_ANGLE_ORDER.map((id) => angles[id]).filter(
    (angle): angle is RealEngineReportAngle => Boolean(angle),
  );
}

function hasCompleteAngles(angles: RealEngineReportAngles | undefined): boolean {
  return Boolean(angles?.asc && angles.dsc && angles.mc && angles.ic);
}

function buildAnglesNarrative(angles: RealEngineReportAngle[]): string {
  const details = angles.map((angle) => {
    const copy = ANGLE_COPY[angle.id];
    const sign = SIGN_COPY[angle.signId];
    const houseSuffix = typeof angle.house === "number" ? `، خانه ${toPersianNumber(angle.house)}` : "";
    const sourceLabel = angle.source === "derived-opposition" ? "مشتق‌شده از محور مقابل" : "محاسبه‌شده";

    return `${copy.faName}: ${formatSignLabel(sign)}، درجه ${formatDegree(angle.degreeInSign)}${houseSuffix}؛ ${sourceLabel}. ${copy.meaning}`;
  });

  return `محورهای اصلی این چارت چنین‌اند: ${details.join(" ")}`;
}

function buildWholeSignHouseNarrative(
  houses: RealEngineReportHouse[],
  placements: RealEngineReportPlacement[],
): string {
  const firstHouse = houses.find((house) => house.number === 1);
  const fourthHouse = houses.find((house) => house.number === 4);
  const seventhHouse = houses.find((house) => house.number === 7);
  const tenthHouse = houses.find((house) => house.number === 10);
  const formatHouseStart = (label: string, house: RealEngineReportHouse | undefined) =>
    house ? `${label} از ${formatSignLabel(SIGN_COPY[house.signId])}` : undefined;
  const axisHighlights = [
    formatHouseStart("خانه ۱", firstHouse),
    formatHouseStart("خانه ۴", fourthHouse),
    formatHouseStart("خانه ۷", seventhHouse),
    formatHouseStart("خانه ۱۰", tenthHouse),
  ].filter((part): part is string => Boolean(part));
  const activeHouses = houses
    .map((house) => buildActiveHouseNarrative(house, placements))
    .filter((part): part is string => Boolean(part));
  const visibleActiveHouses = activeHouses.slice(0, 4);
  const extraActiveCount = Math.max(0, activeHouses.length - visibleActiveHouses.length);

  return [
    axisHighlights.length > 0
      ? `در متن خوانش، به جای تکرار فهرست کامل ۱۲ خانه، محورهای خانه‌ای خلاصه می‌شوند: ${axisHighlights.join("؛ ")}. جدول کامل ۱۲ خانه در کارت گزارش و چارت دایره‌ای آمده است.`
      : "جدول کامل ۱۲ خانه در کارت گزارش و چارت دایره‌ای آمده است؛ متن خوانش فقط خانه‌های پررنگ‌تر را برجسته می‌کند.",
    visibleActiveHouses.length > 0
      ? `خانه‌های فعال‌تر این چارت از نظر سیاره‌ها و محورها: ${visibleActiveHouses.join(" ")}${extraActiveCount > 0 ? ` و ${toPersianNumber(extraActiveCount)} خانه فعال دیگر که در جدول کامل دیده می‌شوند.` : ""}`
      : "در داده محاسبه‌شده فعلی، خانه‌ها ذخیره شده‌اند اما سیاره شاخصی برای برجسته‌کردن یک خانه خاص ثبت نشده است.",
  ].join(" ");
}

function buildActiveHouseNarrative(
  house: RealEngineReportHouse,
  placements: RealEngineReportPlacement[],
): string | undefined {
  const copy = HOUSE_COPY[house.number];
  const planetIds = Array.isArray(house.planetIds)
    ? house.planetIds
    : placements.filter((placement) => placement.house === house.number).map((placement) => placement.id);
  const angleLabels = (Array.isArray(house.angleIds) ? house.angleIds : [])
    .map((angleId) => ANGLE_COPY[angleId]?.faName)
    .filter((label): label is string => Boolean(label));
  const planetLabels = planetIds
    .map((planetId) => PLANET_COPY[planetId]?.faName ?? planetId)
    .filter(Boolean);
  const focusLabels = [...planetLabels, ...angleLabels];

  if (focusLabels.length === 0 || !copy) {
    return undefined;
  }

  return `خانه ${toPersianNumber(house.number)} با ${focusLabels.join("، ")} پررنگ شده است؛ میدان آن ${copy.field} است و هدیه‌اش ${copy.gift}.`;
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

function buildPlanetAspectText(
  planetId: "sun" | "moon" | "mercury" | "venus" | "mars",
  planetLabel: string,
  aspects: RealEngineReportAspect[],
): string | undefined {
  const planetAspects = aspects.filter(
    (aspect) => aspect.firstPlanetId === planetId || aspect.secondPlanetId === planetId,
  );

  if (planetAspects.length === 0) {
    return undefined;
  }

  const details = planetAspects.map((aspect) =>
    formatPlanetAspectDetail(planetId, aspect),
  );

  return [
    `زاویه‌های مهم ${planetLabel} با سیاره‌های دیگر هم به خوانش این بخش جهت می‌دهند؛ چون نشان می‌دهند این سیاره در خلأ کار نمی‌کند و با کدام نیروهای چارت گفت‌وگو دارد.`,
    ...details,
  ].join(" ");
}

function formatPlanetAspectDetail(
  planetId: "sun" | "moon" | "mercury" | "venus" | "mars",
  aspect: RealEngineReportAspect,
): string {
  const otherPlanetLabel =
    aspect.firstPlanetId === planetId ? aspect.secondPlanetLabel : aspect.firstPlanetLabel;
  const tone = getPlanetAspectTone(aspect);

  return [
    `با ${otherPlanetLabel}: ${aspect.aspectLabel}، زاویه واقعی ${formatAspectDegree(
      aspect.separation,
    )} و فاصله از زاویه دقیق ${formatAspectDegree(aspect.orb)}.`,
    tone,
  ].join(" ");
}

function getPlanetAspectTone(aspect: RealEngineReportAspect): string {
  if (aspect.aspectId === "square" || aspect.aspectId === "opposition") {
    return "در تجربه روزمره، این رابطه بیشتر جایی حس می‌شود که دو نیاز یا دو ریتم درونی هم‌زمان فعال می‌شوند و لازم است به جای فشار آوردن، سهم هر دو طرف را واضح‌تر ببینی.";
  }

  if (aspect.aspectId === "sextile" || aspect.aspectId === "trine") {
    return "در تجربه روزمره، این رابطه می‌تواند مثل یک توان طبیعی یا مسیر همکاری عمل کند؛ اما وقتی مفیدتر می‌شود که آگاهانه به انتخاب، تمرین یا گفت‌وگو تبدیلش کنی.";
  }

  return "در تجربه روزمره، این هم‌نشینی معمولاً صدای این دو نیرو را به هم نزدیک‌تر می‌کند؛ پس بهتر است ببینی کجا یکی از آن‌ها زیادی بلند می‌شود و دیگری را زیر سایه می‌برد.";
}

function buildAspectOverviewText(aspects: RealEngineReportAspect[]) {
  if (aspects.length === 0) {
    return undefined;
  }

  const strongest = aspects;
  const aspectLead = strongest.map(formatAspectLead).join("؛ ");
  const detailText = strongest.map(buildAspectDetailText).join(" ");
  const reflectionText = buildAspectReflectionText(strongest);

  return [
    "روابط سیاره‌ها در این چارت نشان می‌دهند کدام بخش‌های شخصیت فقط جداگانه کار نمی‌کنند، بلکه با هم گفت‌وگو، حمایت یا اصطکاک سازنده دارند.",
        `در این نسخه، همه ${toPersianNumber(strongest.length)} ارتباط محاسبه‌شده این چارت وارد خوانش می‌شود: ${aspectLead}.`,
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
  const sun = findPlacement(realEngine, "sun");
  const moon = findPlacement(realEngine, "moon");
  const risingSign = signFromLongitude(realEngine.ascendantLongitude);
  const visiblePlacements = realEngine.placements
    .map((placement) => {
      const planet = PLANET_COPY[placement.id]?.faName ?? placement.label;
      const sign = SIGN_COPY[placement.signId];

      return planet + " در " + formatSignLabel(sign) + formatHouseSuffix(placement);
    })
    .join("، ");

  const aspectCount = realEngine.aspects?.length ?? 0;
  const aspectSummary =
    aspectCount > 0
      ? "در لایه روابط سیاره‌ها هم " + toPersianNumber(aspectCount) + " ارتباط اصلی دیده می‌شود که گزارش را از فهرست جایگاه‌ها به یک خوانش پیوسته‌تر نزدیک می‌کند."
      : "در این نسخه، تمرکز اصلی روی جایگاه‌های محاسبه‌شده سیاره‌هاست و روابط سیاره‌ها وقتی داده کافی داشته باشد به گزارش اضافه می‌شود.";
  const houseSummary =
    realEngine.houses?.length === 12
      ? "در لایه خانه‌ها نیز ۱۲ خانه Whole Sign و محورهای ASC/DSC/MC/IC در داده محاسبه‌شده گزارش آمده‌اند."
      : "لایه خانه‌ها فقط وقتی وارد خوانش کامل می‌شود که داده محاسبه‌شده کافی داشته باشد.";
  const motionSummary =
    realEngine.retrogrades?.status === "calculated"
      ? isCalculatedLunarNodes(realEngine.lunarNodes)
        ? "لایه حرکت، وضعیت برگشتی سیاره‌ها را از داده محاسبه‌شده می‌خواند و دست‌های ماه نیز با برچسب Mean Lunar Node در فصل جداگانه آمده‌اند."
        : "لایه حرکت، وضعیت برگشتی سیاره‌ها را از داده محاسبه‌شده می‌خواند، در حالی که دست‌های ماه و لیلیت هنوز عمداً بیرون از نتیجه‌گیری مانده‌اند."
      : "لایه حرکت فقط وقتی وارد گزارش می‌شود که محاسبه واقعی داشته باشد.";

  return [
    buildCoreSynthesisThread(sun, moon, risingSign),
    buildAspectSynthesisThread(realEngine.aspects ?? []),
    buildHouseSynthesisThread(realEngine),
    "جمع‌بندی چارت: " + visiblePlacements + ".",
    "این‌ها ستون‌های اولیه گزارش‌اند و متن هالیوس از همین داده‌های محاسبه‌شده ساخته شده است.",
    "برای خواندن این گزارش، بهتر است خورشید را مثل مسیر آگاهانه، ماه را مثل نیاز عاطفی و رایزینگ را مثل دروازه ورود به جهان ببینی.",
    "وقتی این سه لایه با هم خوانده شوند، گزارش از فهرست جایگاه‌ها به یک روایت شخصی‌تر نزدیک می‌شود: چه چیزی در تو روشن می‌شود، چه چیزی تو را آرام می‌کند، و چگونه خودت را به جهان نشان می‌دهی.",
    aspectSummary,
    houseSummary,
    motionSummary,
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
    input.sunAspectText,
    input.risingText,
    input.houseText,
  );
  const relationshipBody = joinSectionBody(
    input.venusText,
    input.venusAspectText,
    input.aspectText,
  );
  const careerBody = joinSectionBody(
    input.mercuryText,
    input.mercuryAspectText,
    input.marsText,
    input.marsAspectText,
  );
  const fallbackBody =
    input.integrationText ??
    input.summary ??
    "این بخش از گزارش بر اساس داده‌های محاسبه‌شده چارت نوشته شده و بهتر است نمادین، آرام و غیرقطعی خوانده شود.";
  const houseAnglesSection: ReportOutputSection | null = input.houseAnglesText
    ? {
        id: "real-engine-houses-angles",
        kind: "overview",
        title: "خانه‌ها و محورهای چارت",
        body: buildStructuredSectionBody({
          opening: buildEvidenceOpening(
            input.houseAnglesEvidence,
            "این فصل نقشه خانه‌ها و محورهای اصلی را به زبان انسانی وارد گزارش می‌کند؛ یعنی محاسبات فقط در پشت صحنه نمی‌مانند و به تجربه قابل خواندن تبدیل می‌شوند.",
          ),
          body: input.houseAnglesText,
          closing:
            "خانه‌ها را مثل میدان‌های زندگی بخوان و محورهای ASC/DSC و MC/IC را مثل دو خط اصلی جهت‌گیری؛ هیچ‌کدام حکم قطعی درباره رویدادها نیستند.",
        }),
      }
    : null;
  const motionSection: ReportOutputSection | null = input.retrogradeText
    ? {
        id: "real-engine-motion-special-points",
        kind: "overview",
        title: "بازنگری، حرکت برگشتی و نقاط ویژه",
        body: buildStructuredSectionBody({
          opening: buildEvidenceOpening(
            input.motionEvidence,
            "این فصل لایه حرکت را وارد گزارش می‌کند و هم‌زمان مرز داده محاسبه‌شده را روشن نگه می‌دارد.",
          ),
          body: input.retrogradeText,
          closing:
            "حرکت برگشتی را مثل دعوت به بازنگری بخوان؛ نقاط ویژه را هم فقط وقتی وارد نتیجه‌گیری کن که خود گزارش داده محاسبه‌شده و برچسب مدل محاسبه را نشان می‌دهد.",
        }),
      }
    : null;
  const lunarNodeSection: ReportOutputSection | null = input.lunarNodeText
    ? {
        id: "real-engine-lunar-nodes",
        kind: "overview",
        title: "دست‌های ماه",
        body: buildStructuredSectionBody({
          opening: buildEvidenceOpening(
            input.lunarNodeEvidence,
            "این فصل دست‌های ماه را به عنوان یک لایه رشد و بازگشت وارد گزارش می‌کند، اما مدل محاسبه را پنهان نمی‌کند.",
          ),
          body: input.lunarNodeText,
          closing:
            "دست‌های ماه را کنار خورشید، ماه و رایزینگ بخوان؛ نه به عنوان حکم سرنوشت، بلکه مثل جهتی برای مشاهده عادت‌های قدیمی و تمرین تازه.",
        }),
      }
    : null;

  const natalAccuracySection: ReportOutputSection | null = input.natalAccuracyText
    ? {
        id: "real-engine-natal-accuracy",
        kind: "overview",
        title: "دقت تولد و روش خواندن گزارش",
        body: buildStructuredSectionBody({
          opening:
            "این فصل مرز دقت گزارش را روشن می‌کند؛ چون گزارش کامل فقط زمانی قابل اعتماد است که ساعت تولد، منطقه زمانی و مختصات شهر با همان سخت‌گیری داده محاسبه‌شده خوانده شوند.",
          body: input.natalAccuracyText,
          closing:
            "این مرزگذاری برای کم‌کردن ارزش گزارش نیست؛ برای این است که هالیوس به جای متن زیبا اما نامطمئن، خوانشی صادقانه و قابل اعتماد بسازد.",
        }),
      }
    : null;

  return ([
    {
      id: "real-engine-overview",
      kind: "overview",
      title: "نقشه راه خوانش",
      body: buildStructuredSectionBody({
        opening:
          "این بخش ورودی کوتاه گزارش است؛ اول سه نخ اصلی چارت را کنار هم می‌گذارد و بعد ذهن، رابطه، عمل، خانه‌ها، دست‌های ماه و مرزهای دقت را در جای خواناتر خودش باز می‌کند.",
        body: input.summary,
        closing:
          "برای خواندن ادامه گزارش، هر بخش را مثل یک زاویه مشاهده ببین؛ یادداشت‌های روش و دقت بعد از روایت اصلی آمده‌اند تا متن سنگین نشود.",
      }),
    },
    {
      id: "real-engine-identity",
      kind: "identity",
      title: "هویت، حضور و شیوه ورود به جهان",
      body: buildStructuredSectionBody({
        opening: buildEvidenceOpening(
          input.identityEvidence,
          "این فصل از مسیر درونی شروع می‌کند و بعد به شیوه‌ای می‌رسد که در نخستین برخوردها از تو دیده می‌شود؛ مثل پیوند میان نور درونی و دروازه ورود به جهان.",
        ),
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
        opening: buildEvidenceOpening(
          input.emotionalEvidence,
          "اینجا گزارش از لایه بیرونی فاصله می‌گیرد و به ریتم‌های آرام‌تر نزدیک می‌شود: نیازهای احساسی، واکنش‌های بی‌واسطه و راه‌هایی که امنیت درونی ساخته می‌شود.",
        ),
        body: joinSectionBody(input.moonText, input.moonAspectText) || fallbackBody,
        closing:
          "این بخش را آرام‌تر بخوان؛ ماه معمولاً بیشتر از اینکه جواب فوری بدهد، نیاز پنهان یا ریتم مراقبت را نشان می‌دهد.",
      }),
    },
    {
      id: "real-engine-relationships",
      kind: "relationships",
      title: "رابطه، ارزش و گفت‌وگوی سیاره‌ها",
      body: buildStructuredSectionBody({
        opening: buildEvidenceOpening(
          input.relationshipEvidence,
          "این فصل رابطه را فقط به معنای عشق یا جذب نمی‌گیرد؛ درباره ارزش، صمیمیت، مرز و گفت‌وگوی میان نیروهای درونی است.",
        ),
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
        opening: buildEvidenceOpening(
          input.careerEvidence,
          "اینجا گزارش روی تصمیم، بیان، انرژی حرکت و شیوه تبدیل نیت به عمل تمرکز می‌کند.",
        ),
        body: careerBody || input.mercuryText || input.marsText || fallbackBody,
        closing:
          "عطارد و مریخ را کنار هم بخوان: یکی نشان می‌دهد چطور معنا می‌سازی و حرف می‌زنی، دیگری نشان می‌دهد چطور حرکت می‌کنی.",
      }),
    },
    houseAnglesSection,
    lunarNodeSection,
    motionSection,
    {
      id: "real-engine-growth",
      kind: "growth",
      title: "جمع‌بندی و مسیر یکپارچه‌سازی",
      body: buildStructuredSectionBody({
        opening: buildEvidenceOpening(
          input.growthEvidence,
          "این فصل قرار نیست دوباره همه جزئیات را تکرار کند؛ کارش این است که سه نخ اصلی، کشمکش‌ها، استعدادها و تمرین رشد را به یک مسیر قابل‌خواندن وصل کند.",
        ),
        body: input.integrationText || fallbackBody,
        closing: buildFinalSynthesisClosing(input),
      }),
    },
    natalAccuracySection,
    {
      id: "real-engine-reflection-prompts",
      kind: "reflection-prompts",
      title: "تمرین پایانی برای خواندن گزارش",
      body: buildRealEngineReflectionPrompts(input),
    },
  ].filter((section): section is ReportOutputSection => section !== null));
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
    "۴) دست‌های ماه را مثل نسبت میان عادت آشنا و تمرین تازه بخوان؛ کدام دعوت کوچک برای رشد دیده می‌شود؟",
    "۵) روابط سیاره‌ها را مثل گفت‌وگوی درونی ببین: کدام رابطه حمایت می‌سازد و کدام رابطه مهارت تازه می‌خواهد؟",
    "۶) از سه نخ اصلی گزارش یک انتخاب کوچک برای این هفته بردار؛ چیزی که متن را به تجربه قابل مشاهده تبدیل کند.",
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

  return `${formatSignLabel(sign)}، درجه ${formatDegree(placement.degreeInSign)}`;
}

function formatPlacementWithHouse(placement: RealEngineReportPlacement): string {
  return `${formatPlacement(placement)}${formatHouseSuffix(placement)}`;
}

function formatHouseSuffix(placement: RealEngineReportPlacement): string {
  return typeof placement.house === "number" && Number.isFinite(placement.house)
    ? `، خانه ${toPersianNumber(placement.house)}`
    : "";
}

function toPersianNumber(value: number): string {
  const digits: Record<string, string> = {
    "0": "۰",
    "1": "۱",
    "2": "۲",
    "3": "۳",
    "4": "۴",
    "5": "۵",
    "6": "۶",
    "7": "۷",
    "8": "۸",
    "9": "۹",
  };

  return String(value).replace(/[0-9]/g, (digit) => digits[digit] ?? digit);
}

function formatSignLabel(sign: SignCopy) {
  const faLabel = sign.aliases?.length
    ? `${sign.faName} / ${sign.aliases.join(" / ")}`
    : sign.faName;

  return `${faLabel} (${sign.enName})`;
}

function formatDegree(longitude: number) {
  return `${longitude.toFixed(1)}°`;
}

function signFromLongitude(longitude: number): ZodiacKey {
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor(normalized / 30) % SIGN_ORDER.length;

  return SIGN_ORDER[index] ?? "aries";
}
