import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportAngleId,
  RealEngineReportAngles,
  RealEngineReportCalculatedLilith,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportAspect,
  RealEngineReportHouse,
  RealEngineReportHouseContext,
  RealEngineReportLilith,
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
import {
  REPORT_ASPECT_HIGHLIGHT_LIMIT,
  mergeRealEngineAspectInventory,
  rankRealEngineAspects,
  selectNarrativeAspectHighlights,
  type RealEngineAspectSelectionContext,
} from "@/lib/astrology/real-engine-aspect-selection";
import {
  buildRealEngineSynthesisPlan,
  getRealEngineSynthesisRoles,
  type RealEngineSynthesisPlan,
  type RealEngineSynthesisRole,
} from "@/lib/astrology/real-engine-synthesis";
import {
  buildAspectBehavioralInterpretation,
  buildPlacementBehavioralInterpretation,
  isBehavioralAspectInput,
  isBehavioralPlacementInput,
  type AspectBehavioralInterpretation,
  type BehavioralSynthesisRole,
} from "@/lib/astrology/report-behavioral-interpretation";
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
    energy: "آرام، ملموس و وابسته به زمان و ثبات",
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

const PLANET_SYNTHESIS_NEED: Record<string, string> = {
  sun: "هویت، جهت و حق انتخاب روشن",
  moon: "امنیت عاطفی، ریتم بدن و نیاز به تعلق",
  mercury: "فهم، نام‌گذاری و تصمیم‌گیری",
  venus: "ارزش، نزدیکی و انتخاب رابطه‌ای",
  mars: "میل، مرز و اقدام مستقیم",
  jupiter: "رشد، معنا و اعتماد به افق بزرگ‌تر",
  saturn: "مرز، مسئولیت و ساختن چیزی بادوام",
  uranus: "آزادی، تغییر و حق متفاوت بودن",
  neptune: "الهام، حساسیت و مرزبندی با ابهام",
  pluto: "قدرت، عمق و دگرگونی درونی",
};

const PLANET_SYNTHESIS_NEED_SHORT: Record<string, string> = {
  sun: "هویت و جهت",
  moon: "امنیت عاطفی",
  mercury: "فهم و تصمیم",
  venus: "ارزش و نزدیکی",
  mars: "میل و اقدام",
  jupiter: "معنا و گسترش",
  saturn: "مرز و مسئولیت",
  uranus: "آزادی و تغییر",
  neptune: "الهام و حساسیت",
  pluto: "قدرت و دگرگونی",
};

const WRITER_ANGLE_ORDER: RealEngineReportAngleId[] = ["asc", "dsc", "mc", "ic"];

const ANGLE_COPY: Record<RealEngineReportAngleId, { faName: string; axis: string; meaning: string }> = {
  asc: {
    faName: "رایزینگ",
    axis: "محور رایزینگ/نقطه روبه‌رو",
    meaning: "دروازه ورود تو به جهان، بدن، تصویر اولیه و شیوه شروع کردن موقعیت‌ها",
  },
  dsc: {
    faName: "نقطه روبه‌رو",
    axis: "محور رایزینگ/نقطه روبه‌رو",
    meaning: "آینه رابطه، شراکت و کیفیتی که در دیگری پررنگ‌تر دیده می‌شود",
  },
  mc: {
    faName: "میانه آسمان",
    axis: "محور میانه آسمان/ریشه آسمان",
    meaning: "مسیر بیرونی، اعتبار، جهت اجتماعی و چیزی که در جهان ساخته می‌شود",
  },
  ic: {
    faName: "ریشه آسمان",
    axis: "محور میانه آسمان/ریشه آسمان",
    meaning: "ریشه درونی، خانه، گذشته و جایی که احساس بنیاد روانی ساخته می‌شود",
  },
};

const HOUSE_COPY: Record<number, HouseCopy> = {
  1: {
    field: "بدن، تصویر بیرونی، شروع‌های شخصی و شیوه ورود به موقعیت‌ها",
    gift: "بیان خواسته و مشخص کردن جایگاه خود پیش از پنهان شدن پشت واکنش دیگران",
    growth: "این است که واکنش اول را بشناسی و آن را به انتخاب آگاهانه‌تر تبدیل کنی",
  },
  2: {
    field: "امنیت، ارزش شخصی، بدن، پول و چیزهایی که حس ثبات می‌سازند",
    gift: "ساختن امنیتی که در خواب، غذا، ریتم بدن و منابع قابل اتکا حس می‌شود",
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
    growth: "این است که حد خود را روشن کنی و اعتماد را با هماهنگی حرف و عمل، احترام به نه و بازگشت به گفت‌وگو بسازی",
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

const HOUSE_SYNTHESIS_FIELD: Record<number, string> = {
  1: "بدن، حضور و شروع",
  2: "امنیت، ارزش و منابع",
  3: "فکر، کلام و یادگیری",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و عادت‌ها",
  7: "رابطه نزدیک و شراکت",
  8: "اعتماد، صمیمیت و دگرگونی",
  9: "معنا، باور و افق‌های دورتر",
  10: "مسیر اجتماعی و مسئولیت",
  11: "جمع، دوستی و آینده‌سازی",
  12: "خلوت، ناخودآگاه و رهاسازی",
};


type ChartElementKey = "fire" | "earth" | "air" | "water";
type ChartModalityKey = "cardinal" | "fixed" | "mutable";
type ChartPolarityKey = "masculine" | "feminine";

const SIGN_ELEMENT: Record<ZodiacKey, ChartElementKey> = {
  aries: "fire",
  leo: "fire",
  sagittarius: "fire",
  taurus: "earth",
  virgo: "earth",
  capricorn: "earth",
  gemini: "air",
  libra: "air",
  aquarius: "air",
  cancer: "water",
  scorpio: "water",
  pisces: "water",
};

const SIGN_MODALITY: Record<ZodiacKey, ChartModalityKey> = {
  aries: "cardinal",
  cancer: "cardinal",
  libra: "cardinal",
  capricorn: "cardinal",
  taurus: "fixed",
  leo: "fixed",
  scorpio: "fixed",
  aquarius: "fixed",
  gemini: "mutable",
  virgo: "mutable",
  sagittarius: "mutable",
  pisces: "mutable",
};

const SIGN_POLARITY: Record<ZodiacKey, ChartPolarityKey> = {
  aries: "masculine",
  gemini: "masculine",
  leo: "masculine",
  libra: "masculine",
  sagittarius: "masculine",
  aquarius: "masculine",
  taurus: "feminine",
  cancer: "feminine",
  virgo: "feminine",
  scorpio: "feminine",
  capricorn: "feminine",
  pisces: "feminine",
};

const CHART_RULER_BY_RISING: Record<ZodiacKey, string> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

const HOUSE_REFLECTIONS: Record<number, string> = {
  1: "واکنش اول تو در شروع‌ها بیشتر از نیاز واقعی می‌آید یا از دفاع قدیمی؟",
  2: "ارزش، بدن یا پول این هفته کجا به یک انتخاب آرام‌تر و مستقل‌تر نیاز دارد؟",
  3: "کدام حرف یا فکر اگر ساده‌تر گفته شود، فشار ذهنی کمتری می‌سازد؟",
  4: "برای ساختن امنیت درونی، کدام خاطره یا الگوی خانوادگی باید مهربان‌تر دیده شود؟",
  5: "کجا می‌توانی بدون دنبال کردن تأیید، کمی گرم‌تر، خلاق‌تر یا بازیگوش‌تر دیده شوی؟",
  6: "کدام روتین کوچک بدن، کار یا مراقبت را انسانی‌تر می‌کند، نه سخت‌گیرانه‌تر؟",
  7: "در رابطه نزدیک، کدام مرز یا درخواست اگر روشن‌تر شود صمیمیت را سالم‌تر می‌کند؟",
  8: "در اعتماد، ترس یا صمیمیت عمیق، کجا می‌توانی به جای کنترل، مرز و صداقت تدریجی بسازی؟",
  9: "کدام باور یا افق تازه باید با تجربه واقعی سنجیده شود، نه فقط با اطمینان ذهنی؟",
  10: "در مسیر اجتماعی یا کار بیرونی، کجا لازم است اثر واقعی را از تصویر ایده‌آل جدا کنی؟",
  11: "کدام جمع، دوستی یا چشم‌انداز آینده باید با صدای شخصی تو هماهنگ‌تر شود؟",
  12: "در خلوت یا پشت صحنه، کدام احساس خاموش نیاز دارد دیده شود بی‌آنکه فوری تبدیل به تصمیم شود؟",
};

const ELEMENT_LABELS: Record<ChartElementKey, string> = {
  fire: "آتش",
  earth: "زمین",
  air: "هوا",
  water: "آب",
};

const MODALITY_LABELS: Record<ChartModalityKey, string> = {
  cardinal: "کاردینال",
  fixed: "ثابت",
  mutable: "متغیر",
};

const POLARITY_LABELS: Record<ChartPolarityKey, string> = {
  masculine: "مذکر",
  feminine: "مونث",
};

const CORE_SPINE_IDS = new Set(["sun", "moon"]);


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
      "این بخش از یک برچسب شخصیتی فراتر می‌رود؛ خورشید نشان می‌دهد وقتی از حالت واکنش بیرون می‌آیی و انتخاب آگاهانه‌تری می‌کنی، چه کیفیتی در تو روشن‌تر می‌شود.",
    everydaySignal:
      "در زندگی روزمره، این جایگاه می‌تواند خودش را در نوع تصمیم گرفتن، شکل گرفتن اعتمادبه‌نفس و چیزهایی نشان بدهد که به تو حس زنده بودن می‌دهند.",
    shadowSignal:
      "سایه طبیعی این ترکیب معمولاً زمانی دیده می‌شود که بخواهی خیلی سریع خودت را ثابت کنی، یا برعکس، از ترس دیده شدن انرژی اصلی‌ات را عقب نگه داری.",
    integration:
      "راه یکپارچه‌تر این است که به جای بازی کردن نقش کامل، ببینی کدام انتخاب کوچک امروز تو را به حس اصیل‌تر بودن نزدیک‌تر می‌کند.",
    reflection:
      "برای تأمل: وقتی مجبور نیستی چیزی را به کسی ثابت کنی، این خورشید چه نوع حضوری را از تو می‌خواهد؟",
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
      "برای تأمل: برای اینکه این ماه احساس امنیت بیشتری کند، این هفته چه مرز یا مراقبت کوچکی لازم است؟",
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
      "برای تأمل: عطارد تو وقتی آرام‌تر و صادق‌تر حرف می‌زند، چه فکری را می‌تواند ساده‌تر و انسانی‌تر بیان کند؟",
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
      "برای تأمل: زهره تو برای اینکه رابطه و لذت را واقعی‌تر تجربه کند، کجا باید بیشتر انتخاب کند و کمتر فقط سازگار شود؟",
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
      "برای تأمل: مریخ تو این هفته برای دفاع سالم از خواسته‌ات به چه اقدام کوچک، روشن و بدون خشونتی نیاز دارد؟",
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
  const rawAspects = calculateRealEngineAspects(realEngine.placements);
  const storedAspects = realEngine.aspects ?? [];
  const allAspects = mergeRealEngineAspectInventory(rawAspects, storedAspects);
  const chartSpineDraft = buildChartSpine(realEngine, allAspects);
  const aspectHighlights = selectNarrativeAspectHighlights(
    allAspects,
    buildAspectSelectionContext(chartSpineDraft, realEngine),
    REPORT_ASPECT_HIGHLIGHT_LIMIT,
  );
  const realEngineWithAspects: RealEngineReportSnapshot = {
    ...realEngine,
    aspects: allAspects,
    aspectHighlights,
  };
  const chartSpine = buildChartSpine(realEngineWithAspects, aspectHighlights);
  const synthesisPlan = buildRealEngineSynthesisPlan({
    aspects: aspectHighlights,
    placements: realEngineWithAspects.placements,
    chartRulerId: chartSpine.chartRulerId,
    activeHouseNumbers: chartSpine.activeHouses.map((activeHouse) => activeHouse.house.number),
  });
  const risingSign = chartSpine.risingSign;

  const summary = sanitizeUserFacingReportText(buildRealEngineSummary({
    name: report.input.name ?? "",
    cityLabel: realEngine.cityLabel,
    sun,
    moon,
    risingSign,
    houseContext: realEngine.houseContext,
    lunarNodes: realEngine.lunarNodes,
    chartSpine,
  }));

  const sunText = buildCorePlacementText(sun, "sun");
  const moonText = buildCorePlacementText(moon, "moon");
  const coreSynthesisText = buildCoreSynthesisThread(sun, moon, risingSign);
  const risingText = buildRisingText(
    risingSign,
    chartSpine.ascendantDegreeInSign,
    realEngine.houseContext,
  );
  const chartRulerText = buildChartRulerText(chartSpine, realEngineWithAspects);
  const activeHouseText = buildActiveHousesText(chartSpine);
  const balanceText = buildChartBalanceText(realEngineWithAspects);
  const houseText = buildHouseContextText(realEngine.houseContext, risingSign);
  const houseAnglesText = buildHouseAnglesText(realEngineWithAspects);
  const retrogradeText = buildRetrogradeText(realEngineWithAspects, chartSpine);
  const lunarNodeText = buildLunarNodeText(realEngineWithAspects, chartSpine);
  const natalAccuracyText = buildNatalAccuracyText(realEngineWithAspects);
  const mercuryText = buildOptionalPlacementText(mercury, "mercury");
  const venusText = buildOptionalPlacementText(venus, "venus");
  const marsText = buildOptionalPlacementText(mars, "mars");
  const dailyLifeSynthesisText = buildDailyLifeSynthesisThread(mercury, venus, mars);
  const aspectText = buildAspectOverviewText(synthesisPlan, realEngineWithAspects);
  const sunAspectText = buildPlanetAspectText(
    "sun",
    PLANET_COPY.sun.faName,
    aspectHighlights,
    realEngineWithAspects,
    chartSpine,
  );
  const moonAspectText = buildPlanetAspectText(
    "moon",
    PLANET_COPY.moon.faName,
    aspectHighlights,
    realEngineWithAspects,
    chartSpine,
  );
  const mercuryAspectText = buildPlanetAspectText(
    "mercury",
    PLANET_COPY.mercury.faName,
    aspectHighlights,
    realEngineWithAspects,
    chartSpine,
  );
  const venusAspectText = buildPlanetAspectText(
    "venus",
    PLANET_COPY.venus.faName,
    aspectHighlights,
    realEngineWithAspects,
    chartSpine,
  );
  const marsAspectText = buildPlanetAspectText(
    "mars",
    PLANET_COPY.mars.faName,
    aspectHighlights,
    realEngineWithAspects,
    chartSpine,
  );
  const firstSynthesisText = buildFirstSynthesisText(
    realEngineWithAspects,
    chartSpine,
    synthesisPlan,
  );
  const integrationText = buildIntegrationText(
    realEngineWithAspects,
    chartSpine,
    synthesisPlan,
  );
  const sectionEvidence = buildRealEngineSectionEvidence({
    sun,
    moon,
    risingSign,
    mercury,
    venus,
    mars,
    aspectCount: aspectHighlights.length,
    houseCount: realEngineWithAspects.houses?.length ?? 0,
    houseContext: realEngineWithAspects.houseContext,
    hasAngles: hasCompleteAngles(realEngineWithAspects.angles),
    retrogradeStatus: realEngineWithAspects.retrogrades?.status,
    retrogradePlanetCount: realEngineWithAspects.retrogrades?.planetIds.length ?? 0,
    lunarNodes: realEngineWithAspects.lunarNodes,
    chartSpine,
  });
  const interpretations = [
    summary,
    firstSynthesisText,
    integrationText,
  ].filter(Boolean).map((text) => sanitizeUserFacingReportText(text as string));
  const interpretationSections = buildRealEngineInterpretationSections({
    summary,
    sunText,
    moonText,
    coreSynthesisText,
    risingText,
    chartRulerText,
    activeHouseText,
    balanceText,
    houseText,
    houseAnglesText,
    retrogradeText,
    lunarNodeText,
    natalAccuracyText,
    mercuryText,
    venusText,
    marsText,
    dailyLifeSynthesisText,
    aspectText,
    sunAspectText,
    moonAspectText,
    mercuryAspectText,
    venusAspectText,
    marsAspectText,
    firstSynthesisText,
    integrationText,
    ...sectionEvidence,
  }).map(sanitizeReportOutputSection);

  return {
    ...report,
    realEngine: realEngineWithAspects,
    summary,
    interpretations,
    interpretationSections,
  } as AstrologyReport;
}

function sanitizeReportOutputSection(section: ReportOutputSection): ReportOutputSection {
  return {
    ...section,
    title: sanitizeUserFacingReportText(section.title),
    body: sanitizeUserFacingReportText(section.body),
  };
}

function sanitizeUserFacingReportText(text: string): string {
  return text
    .replace(/chartSpine/giu, "ستون فقرات چارت")
    .replace(/hard aspectها/giu, "رابطه‌های تنشی")
    .replace(/hard aspect/giu, "رابطه تنشی")
    .replace(/aspectهای/giu, "رابطه‌های سیاره‌ای")
    .replace(/aspectها/giu, "رابطه‌های سیاره‌ای")
    .replace(/aspectی/giu, "رابطه‌ای")
    .replace(/aspect/giu, "رابطه سیاره‌ای")
    .replace(/placementهای/giu, "جایگاه‌های")
    .replace(/placementها/giu, "جایگاه‌ها")
    .replace(/placementی/giu, "جایگاهی")
    .replace(/placement/giu, "جایگاه")
    .replace(/engine/giu, "موتور گزارش")
    .replace(/algorithm/giu, "روش محاسبه")
    .replace(/debug/giu, "پشتوانه فنی")
    .replace(/template/giu, "قالب")
    .replace(/longitude خام/giu, "درجه دایره‌ای فنی")
    .replace(/دست‌های ماه با مدل دست‌های ماه با مدل میانگین\s*\/\s*میانگین/gu, "دست‌های ماه با مدل میانگین")
    .replace(/دست‌های ماه با مدل دست‌های ماه با مدل میانگین/gu, "دست‌های ماه با مدل میانگین")
    .replace(/محور دست‌های ماه با مدل دست‌های ماه با مدل میانگین/gu, "محور دست‌های ماه با مدل میانگین")
    .replace(/مدل مدل نوسانی\/واقعی/gu, "مدل واقعی/نوسانی")
    .replace(/رابطه سیاره‌ایهای/gu, "رابطه‌های سیاره‌ای")
    .replace(/رابطه سیاره‌ایها/gu, "رابطه‌های سیاره‌ای")
    .replace(/میانه آسمان\s*\/\s*میانه آسمان/gu, "میانه آسمان")
    .replace(/ریشه آسمان\s*\/\s*ریشه آسمان/gu, "ریشه آسمان")
    .replace(/پشتوانه این بخش:\s*پشتوانه این بخش:/gu, "پشتوانه این بخش:")
    .replace(/یعنی تمرین این جایگاه دقیقاً از ترکیب سیاره، نشانه و خانه ساخته می‌شود، نه از یک توصیه عمومی\.?/gu, "")
    .replace(/این بخش گزارش را از فهرست جایگاه‌ها به نخ مرکزی چارت تبدیل می‌کند\.?/gu, "")
    .replace(/بنابراین گزارش از میدان‌های واقعی زندگی شروع می‌شود، نه از فهرست جداگانه جایگاه‌ها\.?/gu, "")
    .replace(/این رابطه به دلیل پیوندش با ستون‌های چارت جلوتر از رابطه‌های سیاره‌ای صرفاً نزدیک خوانده می‌شود\.?/gu, "")
    .replace(/\s+([.،؛])/gu, "$1")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

type RealEngineSectionEvidence = {
  identityEvidence?: string;
  emotionalEvidence?: string;
  relationshipEvidence?: string;
  careerEvidence?: string;
  growthEvidence?: string;
  chartSpineEvidence?: string;
  chartRulerEvidence?: string;
  activeHouseEvidence?: string;
  houseAnglesEvidence?: string;
  balanceEvidence?: string;
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
  houseContext?: RealEngineReportHouseContext;
  hasAngles: boolean;
  retrogradeStatus?: string;
  retrogradePlanetCount: number;
  lunarNodes?: RealEngineReportLunarNodes;
  chartSpine?: ChartSpine;
};

type RealEngineSectionTextInput = {
  summary: string;
  sunText?: string;
  moonText?: string;
  coreSynthesisText?: string;
  risingText?: string;
  houseText?: string;
  houseAnglesText?: string;
  chartRulerText?: string;
  activeHouseText?: string;
  balanceText?: string;
  retrogradeText?: string;
  lunarNodeText?: string;
  natalAccuracyText?: string;
  mercuryText?: string;
  venusText?: string;
  marsText?: string;
  dailyLifeSynthesisText?: string;
  aspectText?: string;
  sunAspectText?: string;
  moonAspectText?: string;
  mercuryAspectText?: string;
  venusAspectText?: string;
  marsAspectText?: string;
  firstSynthesisText: string;
  integrationText: string;
  identityEvidence?: string;
  emotionalEvidence?: string;
  relationshipEvidence?: string;
  careerEvidence?: string;
  growthEvidence?: string;
  chartSpineEvidence?: string;
  chartRulerEvidence?: string;
  activeHouseEvidence?: string;
  houseAnglesEvidence?: string;
  balanceEvidence?: string;
  motionEvidence?: string;
  lunarNodeEvidence?: string;
};


type ChartSpineActiveHouse = {
  house: RealEngineReportHouse;
  score: number;
  placementIds: string[];
  angleIds: RealEngineReportAngleId[];
  nodeLabels: string[];
  reasons: string[];
};

type ChartSpineCluster = {
  kind: "sign" | "house";
  label: string;
  placementIds: string[];
};

type ChartSpine = {
  risingSign: ZodiacKey;
  ascendantDegreeInSign: number;
  chartRulerId: string;
  chartRulerPlacement?: RealEngineReportPlacement;
  chartRulerAspects: RealEngineReportAspect[];
  activeHouses: ChartSpineActiveHouse[];
  signClusters: ChartSpineCluster[];
  houseClusters: ChartSpineCluster[];
  centralAspects: RealEngineReportAspect[];
};

type ReportHouseNumber = RealEngineReportHouse["number"];

function isReportHouseNumber(house: number | null | undefined): house is ReportHouseNumber {
  return typeof house === "number" && Number.isInteger(house) && house >= 1 && house <= 12;
}

function buildChartSpine(
  realEngine: RealEngineReportSnapshot,
  aspects: RealEngineReportAspect[],
): ChartSpine {
  const risingSign = realEngine.angles?.asc?.signId ?? signFromLongitude(realEngine.ascendantLongitude);
  const ascendantDegreeInSign =
    typeof realEngine.angles?.asc?.degreeInSign === "number"
      ? realEngine.angles.asc.degreeInSign
      : degreeInSignFromLongitude(realEngine.ascendantLongitude);
  const chartRulerId = CHART_RULER_BY_RISING[risingSign];
  const chartRulerPlacement = findPlacement(realEngine, chartRulerId);
  const activeHouses = buildChartSpineActiveHouses(realEngine, chartRulerId);
  const activeHouseNumbers = new Set<ReportHouseNumber>(activeHouses.map((activeHouse) => activeHouse.house.number));
  const centralAspects = prioritizeRealEngineAspects(aspects, {
    risingSign,
    ascendantDegreeInSign,
    chartRulerId,
    chartRulerPlacement,
    chartRulerAspects: [],
    activeHouses,
    signClusters: [],
    houseClusters: [],
    centralAspects: [],
  }, realEngine).slice(0, 4);
  const chartRulerAspects = centralAspects.filter((aspect) =>
    aspectHasParticipant(aspect, chartRulerId),
  );

  return {
    risingSign,
    ascendantDegreeInSign,
    chartRulerId,
    chartRulerPlacement,
    chartRulerAspects,
    activeHouses,
    signClusters: buildChartSpineSignClusters(realEngine.placements),
    houseClusters: buildChartSpineHouseClusters(realEngine.placements, activeHouseNumbers),
    centralAspects,
  };
}

function buildChartSpineActiveHouses(
  realEngine: RealEngineReportSnapshot,
  chartRulerId: string,
): ChartSpineActiveHouse[] {
  const houses = getSortedReportHouses(realEngine.houses);
  const placements = realEngine.placements;
  const nodeHouseLabels = buildLunarNodeHouseLabels(realEngine.lunarNodes);

  return houses
    .map((house): ChartSpineActiveHouse | null => {
      const placementIds = placements
        .filter((placement) => placement.house === house.number)
        .map((placement) => placement.id);
      const storedPlanetIds = Array.isArray(house.planetIds) ? house.planetIds : [];
      const planetIds = Array.from(new Set([...storedPlanetIds, ...placementIds]));
      const angleIds = (Array.isArray(house.angleIds) ? house.angleIds : [])
        .filter((angleId): angleId is RealEngineReportAngleId => WRITER_ANGLE_ORDER.includes(angleId as RealEngineReportAngleId));
      const nodeLabels = nodeHouseLabels.get(house.number) ?? [];
      const reasons: string[] = [];
      let score = 0;

      if (planetIds.length >= 3) {
        score += 40;
        reasons.push(`${toPersianNumber(planetIds.length)} جایگاه در این خانه جمع شده‌اند`);
      }

      if (planetIds.includes("sun")) {
        score += 35;
        reasons.push("خورشید این خانه را به هویت آگاهانه وصل می‌کند");
      }

      if (planetIds.includes("moon")) {
        score += 35;
        reasons.push("ماه این خانه را به امنیت عاطفی وصل می‌کند");
      }

      if (planetIds.includes(chartRulerId)) {
        score += 38;
        reasons.push(`${getPlanetLabel(chartRulerId)} به‌عنوان حاکم چارت در این خانه وزن مرکزی دارد`);
      }

      if (nodeLabels.length > 0) {
        score += 32;
        reasons.push(`محور دست‌های ماه این خانه را فعال می‌کند: ${joinPersianList(nodeLabels)}`);
      }

      if (angleIds.length > 0 && score > 0) {
        score += 12;
        reasons.push(`محور ${joinPersianList(angleIds.map((angleId) => ANGLE_COPY[angleId].faName))} به این میدان جهت می‌دهد`);
      }

      const include =
        planetIds.length >= 3 ||
        planetIds.includes("sun") ||
        planetIds.includes("moon") ||
        planetIds.includes(chartRulerId) ||
        nodeLabels.length > 0;

      if (!include || score <= 0) {
        return null;
      }

      return {
        house,
        score,
        placementIds: planetIds,
        angleIds,
        nodeLabels,
        reasons,
      };
    })
    .filter((activeHouse): activeHouse is ChartSpineActiveHouse => activeHouse !== null)
    .sort((first, second) => second.score - first.score || first.house.number - second.house.number);
}

function buildLunarNodeHouseLabels(
  lunarNodes: RealEngineReportLunarNodes | undefined,
): Map<number, string[]> {
  const labels = new Map<number, string[]>();

  if (!isCalculatedLunarNodes(lunarNodes)) {
    return labels;
  }

  for (const node of [lunarNodes.northNode, lunarNodes.southNode]) {
    if (typeof node.house !== "number" || !Number.isFinite(node.house)) {
      continue;
    }

    const current = labels.get(node.house) ?? [];
    current.push(node.id === "north-node" ? "دست شمالی ماه" : "دست جنوبی ماه");
    labels.set(node.house, current);
  }

  return labels;
}

function buildChartSpineSignClusters(placements: RealEngineReportPlacement[]): ChartSpineCluster[] {
  return SIGN_ORDER.map((signId) => {
    const signPlacements = placements.filter((placement) => placement.signId === signId);
    return {
      kind: "sign" as const,
      label: formatSignLabel(SIGN_COPY[signId]),
      placementIds: signPlacements.map((placement) => placement.id),
    };
  }).filter((cluster) => cluster.placementIds.length >= 3);
}

function buildChartSpineHouseClusters(
  placements: RealEngineReportPlacement[],
  _activeHouseNumbers: Set<ReportHouseNumber>,
): ChartSpineCluster[] {
  const houseNumbers = Array.from(
    new Set(
      placements
        .map((placement) => placement.house)
        .filter(isReportHouseNumber),
    ),
  ).sort((first, second) => first - second);

  return houseNumbers
    .map((houseNumber) => {
      const housePlacements = placements.filter((placement) => placement.house === houseNumber);
      return {
        kind: "house" as const,
        label: `خانه ${toPersianNumber(houseNumber)}`,
        placementIds: housePlacements.map((placement) => placement.id),
      };
    })
    .filter((cluster) => cluster.placementIds.length >= 3);
}

function prioritizeRealEngineAspects(
  aspects: RealEngineReportAspect[],
  chartSpine: ChartSpine,
  realEngine: RealEngineReportSnapshot,
): RealEngineReportAspect[] {
  return rankRealEngineAspects(
    aspects,
    buildAspectSelectionContext(chartSpine, realEngine),
  );
}

function buildAspectSelectionContext(
  chartSpine: ChartSpine,
  realEngine: RealEngineReportSnapshot,
): RealEngineAspectSelectionContext {
  return {
    chartRulerId: chartSpine.chartRulerId,
    activeHouseNumbers: chartSpine.activeHouses.map((activeHouse) => activeHouse.house.number),
    placements: realEngine.placements.map((placement) => ({
      id: placement.id,
      house: placement.house ?? null,
    })),
    retrogradePlanetIds:
      realEngine.retrogrades?.status === "calculated"
        ? realEngine.retrogrades.planetIds
        : [],
  };
}

function aspectHasParticipant(aspect: RealEngineReportAspect, planetId: string): boolean {
  return aspect.firstPlanetId === planetId || aspect.secondPlanetId === planetId;
}

function buildChartSpineEvidenceLabel(chartSpine: ChartSpine): string {
  const activeHouses = chartSpine.activeHouses.map((activeHouse) => `خانه ${toPersianNumber(activeHouse.house.number)}`);

  return joinEvidenceLabels(
    `رایزینگ ${formatSignLabel(SIGN_COPY[chartSpine.risingSign])}، درجه ${formatDegree(chartSpine.ascendantDegreeInSign)}`,
    `حاکم چارت ${getPlanetLabel(chartSpine.chartRulerId)}`,
    activeHouses.length > 0 ? `خانه‌های فعال ${joinPersianList(activeHouses)}` : undefined,
    chartSpine.centralAspects.length > 0
      ? `روابط وزن‌دار ${chartSpine.centralAspects.slice(0, 3).map(formatAspectLead).join("؛ ")}`
      : undefined,
  ) ?? "";
}

function buildHumanChartTitle(chartSpine: ChartSpine): string {
  const rising = SIGN_COPY[chartSpine.risingSign];
  const ruler = getPlanetLabel(chartSpine.chartRulerId);
  const topHouse = chartSpine.activeHouses[0];
  const housePhrase = topHouse ? `خانه ${toPersianNumber(topHouse.house.number)}` : "میدان‌های فعال چارت";

  return `عنوان خوانش: ورود ${rising.energy}، هدایت ${ruler} و تمرکز روی ${housePhrase}`;
}

function buildChartSpineOpeningText(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string {
  const rising = SIGN_COPY[chartSpine.risingSign];
  const rulerPlacement = chartSpine.chartRulerPlacement;
  const rulerPhrase = rulerPlacement
    ? `${getPlanetLabel(chartSpine.chartRulerId)} در ${formatPlacementWithHouse(rulerPlacement)}`
    : `${getPlanetLabel(chartSpine.chartRulerId)} به‌عنوان حاکم چارت`;
  const activeHouses = chartSpine.activeHouses
    .slice(0, 4)
    .map((activeHouse) => {
      const copy = HOUSE_COPY[activeHouse.house.number];
      return `خانه ${toPersianNumber(activeHouse.house.number)}${copy ? `؛ ${copy.field}` : ""}`;
    });
  const clusterPhrase = buildClusterPhrase(chartSpine);
  const nodePhrase = buildNodeAxisSpinePhrase(realEngine.lunarNodes, chartSpine);
  const centralAspect = chartSpine.centralAspects.find((aspect) =>
    aspect.aspectId === "square" || aspect.aspectId === "opposition",
  ) ?? chartSpine.centralAspects[0];
  const centralAspectPhrase = centralAspect
    ? `یکی از گفت‌وگوهای مهم چارت میان ${centralAspect.firstPlanetLabel} و ${centralAspect.secondPlanetLabel} است؛ این رابطه نشان می‌دهد کجا دو نیاز هم‌زمان فعال می‌شوند و باید به جای حذف یکی، برایشان مرز و زبان پیدا شود.`
    : undefined;

  return [
    buildHumanChartTitle(chartSpine),
    buildChartSpineHumanSummary(chartSpine),
    `ستون فقرات چارت از رایزینگ ${formatSignLabel(rising)} در درجه ${formatDegree(chartSpine.ascendantDegreeInSign)} شروع می‌شود و با ${rulerPhrase} ادامه پیدا می‌کند.`,
    activeHouses.length > 0
      ? `میدان‌های اصلی این خوانش: ${joinPersianList(activeHouses)}.`
      : "در داده فعلی خانه فعال غالبی دیده نمی‌شود؛ بنابراین خوانش با سه ستون اصلی و حاکم چارت شروع می‌شود.",
    clusterPhrase,
    nodePhrase,
    centralAspectPhrase,
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n");
}

function buildClusterPhrase(chartSpine: ChartSpine): string | undefined {
  const clusters = [...chartSpine.signClusters, ...chartSpine.houseClusters]
    .filter((cluster) => cluster.placementIds.length >= 3)
    .slice(0, 2)
    .map((cluster) => `${cluster.label} با ${joinPersianList(cluster.placementIds.map(getPlanetLabel))}`);

  if (clusters.length === 0) {
    return undefined;
  }

  return `چند نیرو در یک نقطه جمع شده‌اند: ${clusters.join("؛ ")}. این تمرکز معمولاً نشان می‌دهد همان نشانه یا خانه در تجربه روزمره صدای بلندتری دارد.`;
}

function buildNodeAxisSpinePhrase(
  lunarNodes: RealEngineReportLunarNodes | undefined,
  chartSpine: ChartSpine,
): string | undefined {
  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  const modelLabel = getLunarNodeModelLabel(lunarNodes);
  const northHouse = isReportHouseNumber(lunarNodes.northNode.house)
    ? `خانه ${toPersianNumber(lunarNodes.northNode.house)}`
    : "خانه نامشخص";
  const southHouse = isReportHouseNumber(lunarNodes.southNode.house)
    ? `خانه ${toPersianNumber(lunarNodes.southNode.house)}`
    : "خانه نامشخص";
  const activeHouseNumbers = new Set<ReportHouseNumber>(
    chartSpine.activeHouses.map((activeHouse) => activeHouse.house.number),
  );
  const overlap = [lunarNodes.northNode.house, lunarNodes.southNode.house].flatMap((house) =>
    isReportHouseNumber(house) && activeHouseNumbers.has(house)
      ? [`خانه ${toPersianNumber(house)}`]
      : [],
  );

  return [
    `دست‌های ماه با ${modelLabel} از دست جنوبی ${formatSignLabel(SIGN_COPY[lunarNodes.southNode.signId])} در ${southHouse} به سمت دست شمالی ${formatSignLabel(SIGN_COPY[lunarNodes.northNode.signId])} در ${northHouse} خوانده می‌شوند.`,
    overlap.length > 0
      ? `چون این محور با ${joinPersianList(overlap)} هم‌پوشانی دارد، مسیر رشد در متن اصلی هم پررنگ است.`
      : undefined,
  ].filter((part): part is string => Boolean(part)).join(" ");
}

function buildChartRulerText(
  chartSpine: ChartSpine,
  realEngine: RealEngineReportSnapshot,
): string | undefined {
  const rulerLabel = getPlanetLabel(chartSpine.chartRulerId);
  const risingLabel = formatSignLabel(SIGN_COPY[chartSpine.risingSign]);
  const placement = chartSpine.chartRulerPlacement;

  if (!placement) {
    return `با رایزینگ ${risingLabel}، حاکم سنتی چارت ${rulerLabel} است و روی ریتم شروع‌ها و انتخاب‌های روزمره وزن بیشتری دارد. جایگاه ${rulerLabel} در دادهٔ ذخیره‌شده حاضر نیست؛ بنابراین تفسیر خانه یا نشان به آن اضافه نمی‌شود.`;
  }

  const interpretation = buildPlacementBehavioralInterpretation({
    planetId: chartSpine.chartRulerId,
    signId: placement.signId,
    houseNumber: placement.house,
    retrograde:
      realEngine.retrogrades?.status === "calculated" &&
      realEngine.retrogrades.planetIds.includes(chartSpine.chartRulerId),
  });

  return [
    `با رایزینگ ${risingLabel}، حاکم سنتی چارت ${rulerLabel} است و روی ریتم شروع‌ها و انتخاب‌های روزمره وزن بیشتری دارد.`,
    `${rulerLabel} در ${formatPlacementWithHouse(placement)} قرار دارد؛ ${interpretation.plainMeaning}.`,
    `توان این جایگاه ${interpretation.healthyExpression} است؛ تمرین خانه‌اش: ${interpretation.smallExperiment}.`,
  ].join(" ");
}

function buildActiveHousesText(chartSpine: ChartSpine): string | undefined {
  if (chartSpine.activeHouses.length === 0) {
    return undefined;
  }

  const houses = chartSpine.activeHouses
    .slice(0, 4)
    .map((activeHouse) => buildChartSpineActiveHouseNarrative(activeHouse));

  return houses.join("\n\n");
}

function buildChartSpineActiveHouseNarrative(activeHouse: ChartSpineActiveHouse): string {
  const houseNumber = activeHouse.house.number;
  const copy = HOUSE_COPY[houseNumber];
  const houseLabel = toPersianNumber(houseNumber);
  const focusLabels = [
    ...activeHouse.placementIds.map(getPlanetLabel),
    ...activeHouse.nodeLabels,
  ];
  const focusText = focusLabels.length > 0 ? ` با ${joinPersianList(focusLabels)}` : "";
  const special = buildSpecialActiveHouseNarrative(activeHouse);

  if (special) {
    return special;
  }

  return [
    `خانه ${houseLabel}${focusText} پررنگ است؛ یعنی موضوع ${copy?.field ?? "این بخش زندگی"} در تجربه این چارت بیشتر دیده می‌شود.`,
    copy ? `هدیه این خانه ${copy.gift} است و تمرینش ${copy.growth}.` : undefined,
    `پرسش خانه ${houseLabel}: ${HOUSE_REFLECTIONS[houseNumber] ?? "این میدان زندگی الان چه تمرین کوچک و واقعی می‌خواهد؟"}`,
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

function buildSpecialActiveHouseNarrative(activeHouse: ChartSpineActiveHouse): string | undefined {
  const houseNumber = activeHouse.house.number;
  const labels = joinPersianList([...activeHouse.placementIds.map(getPlanetLabel), ...activeHouse.nodeLabels]);
  const houseLabel = toPersianNumber(houseNumber);

  if (houseNumber === 6) {
    return `خانه ${houseLabel}${labels ? ` با ${labels}` : ""} بسیار پررنگ است: کار روزمره، بدن، مهارت، روتین و مفید بودن میدان اصلی رشد‌اند. این خانه وقتی سالم‌تر زندگی می‌شود که ایده، باور یا نیت خوب به مراقبت عملی، نظم قابل اجرا و راه‌حل واقعی تبدیل شود. خطرش این است که زندگی به پروژه دائمی اصلاح تبدیل شود و بدن زیر فشار ذهن جا بماند. پرسش خانه ${houseLabel}: کدام روتین باید ساده‌تر شود، نه کامل‌تر؟`;
  }

  if (houseNumber === 8) {
    return `خانه ${houseLabel}${labels ? ` با ${labels}` : ""} بسیار فعال است: صمیمیت، اعتماد، ترس، منابع مشترک و دگرگونی روانی اینجا برجسته‌اند. نزدیکی ممکن است ساده و خطی نباشد؛ هم کشش به عمق وجود دارد و هم نیاز به آزادی، مرز یا فاصله. تمرین این خانه ساختن اعتماد تدریجی، گفتن احساس پیش از واکنش و مرز امن در نزدیکی است. پرسش خانه ${houseLabel}: در صمیمیت، الان بیشتر به اعتماد تدریجی نیاز داری یا به مرز روشن‌تر؟`;
  }

  if (houseNumber === 2) {
    return `خانه ${houseLabel}${labels ? ` با ${labels}` : ""} مسیر ارزش شخصی، بدن، پول، منابع و امنیت را پررنگ می‌کند. این خانه می‌پرسد «من چه می‌خواهم و چه چیزی واقعاً به من حس ثبات می‌دهد؟» تمرینش ساختن امنیت از بدن و انتخاب‌های کوچک است، نه فقط گرفتن تأیید یا آرامش از بیرون. پرسش خانه ${houseLabel}: یک خواسته مالی، بدنی یا شخصی را چطور می‌توان ساده و روشن بیان کرد؟`;
  }

  if (houseNumber === 5) {
    return `خانه ${houseLabel}${labels ? ` با ${labels}` : ""} میدان عشق، خلاقیت، بازی، دیده‌شدن و بیان شخصی را باز می‌کند. تمرین این خانه این است که بیان خودت فقط برای تأیید نباشد و شادی، میل و آفرینش شکل صادق‌تری پیدا کند. پرسش خانه ${houseLabel}: کدام بیان کوچک از دل می‌آید، حتی اگر کامل نباشد؟`;
  }

  if (houseNumber === 10) {
    return `خانه ${houseLabel}${labels ? ` با ${labels}` : ""} مسیر اجتماعی، اعتبار، مسئولیت و کار بیرونی را پررنگ می‌کند. تمرین این خانه این است که جهت بیرونی از واکنش لحظه‌ای جدا شود و به مسئولیتی قابل ادامه تبدیل شود. پرسش خانه ${houseLabel}: کدام قدم بیرونی با تصویر بلندمدت تو سازگارتر است؟`;
  }

  return undefined;
}

function buildChartBalanceText(realEngine: RealEngineReportSnapshot): string | undefined {
  if (!realEngine.placements.length) {
    return undefined;
  }

  const elementCounts = countChartItems(realEngine.placements.map((placement) => SIGN_ELEMENT[placement.signId]));
  const modalityCounts = countChartItems(realEngine.placements.map((placement) => SIGN_MODALITY[placement.signId]));
  const polarityCounts = countChartItems(realEngine.placements.map((placement) => SIGN_POLARITY[placement.signId]));
  const elementLine = formatCountMap(elementCounts, ELEMENT_LABELS);
  const modalityLine = formatCountMap(modalityCounts, MODALITY_LABELS);
  const polarityLine = formatCountMap(polarityCounts, POLARITY_LABELS);
  const elementInterpretation = buildElementBalanceInterpretation(elementCounts);
  const modalityInterpretation = buildModalityBalanceInterpretation(modalityCounts);

  return [
    `در عنصرها، این چارت چنین پخش شده است: ${elementLine}.`,
    elementInterpretation,
    `در کیفیت‌ها، پخش چارت این است: ${modalityLine}.`,
    modalityInterpretation,
    `قطبیت کلی هم چنین دیده می‌شود: ${polarityLine}. این عددها حکم قطعی درباره شخصیت نیستند؛ فقط نشان می‌دهند انرژی چارت از چه مسیرهایی راحت‌تر بیان می‌شود.`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function countChartItems<T extends string>(items: T[]): Record<T, number> {
  return items.reduce((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

function formatCountMap<T extends string>(
  counts: Record<T, number>,
  labels: Record<T, string>,
): string {
  return Object.entries(labels)
    .map(([key, label]) => `${toPersianNumber(counts[key as T] ?? 0)} ${label}`)
    .join("، ");
}

function buildElementBalanceInterpretation(counts: Record<ChartElementKey, number>): string {
  const notes: string[] = [];

  if ((counts.air ?? 0) >= 4) {
    notes.push("هوای پررنگ یعنی ذهن، تحلیل و فاصله گرفتن برای دیدن الگو در چارت قوی است؛ تمرینش این است که پیش از تحلیل بیشتر، خواب، غذا و تنش بدن را بررسی کنی و فکر را به یک قدم عملی با زمان مشخص تبدیل کنی.");
  }

  if ((counts.fire ?? 0) >= 4) {
    notes.push("آتش پررنگ حرکت، شوق، شروع کردن و صراحت را بالا می‌آورد؛ تمرینش مکث، پیگیری و نسوزاندن انرژی در بی‌قراری است.");
  }

  if ((counts.water ?? 0) <= 1) {
    notes.push("آب کم به معنی بی‌احساسی نیست؛ فقط ممکن است بیان مستقیم احساس نیاز به تمرین داشته باشد و محبت بیشتر از مسیر فکر، عمل، وفاداری یا بدن نشان داده شود.");
  }

  if ((counts.earth ?? 0) <= 1) {
    notes.push("زمین کم می‌تواند نشان دهد ساختن روتین، بدن، ثبات مالی/عملی و پیگیری آرام باید آگاهانه‌تر تمرین شود.");
  }

  return notes.length > 0
    ? notes.join(" ")
    : "عنصرها پخش نسبتاً متعادلی دارند؛ بنابراین بهتر است به خانه‌ها و حاکم چارت برای تشخیص وزن اصلی نگاه شود.";
}

function buildModalityBalanceInterpretation(counts: Record<ChartModalityKey, number>): string {
  const notes: string[] = [];

  if ((counts.fixed ?? 0) >= 5) {
    notes.push("کیفیت ثابت پررنگ، پایداری، وفاداری و تمرکز می‌دهد؛ اما ممکن است تغییر دادن الگوهای آشنا را کندتر یا مقاوم‌تر کند.");
  }

  if ((counts.cardinal ?? 0) >= 5) {
    notes.push("کاردینال پررنگ، شروع کردن و تصمیم گرفتن را فعال می‌کند؛ تمرینش ادامه دادن بعد از موج اول حرکت است.");
  }

  if ((counts.mutable ?? 0) <= 1) {
    notes.push("متغیر کم یعنی انعطاف و تغییر مسیر ممکن است نیاز به زمان، دلیل روشن و تمرین تدریجی داشته باشد.");
  }

  return notes.length > 0
    ? notes.join(" ")
    : "کیفیت‌ها فشار غالب خیلی تندی نشان نمی‌دهند؛ پس باید دید کدام خانه یا aspect عملاً میدان اصلی رشد را فعال می‌کند.";
}

function getPlanetLabel(planetId: string): string {
  return PLANET_COPY[planetId]?.faName ?? planetId;
}

function degreeInSignFromLongitude(longitude: number): number {
  const normalized = ((longitude % 360) + 360) % 360;

  return normalized % 30;
}


function buildRealEngineSectionEvidence({
  sun,
  moon,
  risingSign,
  mercury,
  venus,
  mars,
  aspectCount,
  houseCount,
  houseContext,
  hasAngles,
  retrogradeStatus,
  retrogradePlanetCount,
  lunarNodes,
  chartSpine,
}: RealEngineSectionEvidenceInput): RealEngineSectionEvidence {
  const risingEvidence = `رایزینگ در ${formatSignLabel(SIGN_COPY[risingSign])}`;
  const chartRulerEvidence = chartSpine
    ? `حاکم چارت: ${getPlanetLabel(chartSpine.chartRulerId)}${chartSpine.chartRulerPlacement ? ` در ${formatPlacementWithHouse(chartSpine.chartRulerPlacement)}` : ""}`
    : undefined;
  const activeHouseEvidence = chartSpine?.activeHouses.length
    ? `خانه‌های فعال: ${chartSpine.activeHouses.map((activeHouse) => `خانه ${toPersianNumber(activeHouse.house.number)}`).join("، ")}`
    : undefined;

  return {
    identityEvidence: joinEvidenceLabels(
      buildPlacementEvidenceLabel(sun, "sun"),
      risingEvidence,
    ),
    emotionalEvidence: buildPlacementEvidenceLabel(moon, "moon"),
    relationshipEvidence: joinEvidenceLabels(
      buildPlacementEvidenceLabel(venus, "venus"),
      aspectCount > 0 ? `روابط سیاره‌ای: ${toPersianNumber(aspectCount)} رابطه برجسته` : undefined,
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
    chartSpineEvidence: chartSpine
      ? buildChartSpineEvidenceLabel(chartSpine)
      : joinEvidenceLabels(
          risingEvidence,
          chartRulerEvidence,
          activeHouseEvidence,
          buildLunarNodeEvidenceLabel(lunarNodes),
        ),
    chartRulerEvidence: joinEvidenceLabels(chartRulerEvidence),
    activeHouseEvidence: joinEvidenceLabels(activeHouseEvidence),
    balanceEvidence: "نشانه‌های محاسبه‌شده این بخش: عنصرها و کیفیت‌ها از جایگاه‌های ذخیره‌شده محاسبه شده‌اند",
    houseAnglesEvidence: joinEvidenceLabels(
      buildHouseEvidenceLabel(houseContext, houseCount),
      hasAngles ? "رایزینگ، نقطه روبه‌رو، میانه آسمان و ریشه آسمان در داده گزارش" : undefined,
    ),
    motionEvidence: joinEvidenceLabels(
      retrogradeStatus === "calculated" ? "حرکت برگشتی محاسبه‌شده" : undefined,
      retrogradeStatus === "calculated" && retrogradePlanetCount > 0
        ? `${toPersianNumber(retrogradePlanetCount)} سیاره برگشتی`
        : retrogradeStatus === "calculated"
          ? "بدون سیاره برگشتی در داده گزارش"
          : undefined,
      isCalculatedLunarNodes(lunarNodes)
        ? buildLunarNodeEvidenceLabel(lunarNodes)
        : "دست‌های ماه و لیلیت هنوز عمداً بیرون از خوانش مانده‌اند",
    ),
    lunarNodeEvidence: buildLunarNodeEvidenceLabel(lunarNodes),
  };
}

function buildLunarNodeEvidenceLabel(lunarNodes: RealEngineReportLunarNodes | undefined): string | undefined {
  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  return `دست‌های ماه با ${getLunarNodeModelLabel(lunarNodes)} محاسبه‌شده`;
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
  const filteredLabels = labels
    .map((label) =>
      typeof label === "string"
        ? label.replace(/^پشتوانه این بخش:\s*/u, "").trim()
        : undefined,
    )
    .filter((label): label is string => typeof label === "string" && label.length > 0);

  if (filteredLabels.length === 0) {
    return undefined;
  }

  return `نشانه‌های محاسبه‌شده این بخش: ${filteredLabels.join("؛ ")}`;
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
  lunarNodes,
  chartSpine,
}: {
  name: string;
  cityLabel?: string;
  sun: RealEngineReportPlacement | undefined;
  moon: RealEngineReportPlacement | undefined;
  risingSign: ZodiacKey;
  houseContext?: RealEngineReportHouseContext;
  lunarNodes?: RealEngineReportLunarNodes;
  chartSpine?: ChartSpine;
}) {
  const displayName = name ? `${name}، ` : "";
  const cityPhrase = cityLabel ? ` برای تولد در ${cityLabel}` : "";
  const rising = SIGN_COPY[risingSign];
  const risingDescriptor = buildRisingDescriptor(houseContext);

  if (chartSpine) {
    const rulerPlacement = chartSpine.chartRulerPlacement;
    const rulerPhrase = rulerPlacement
      ? `${getPlanetLabel(chartSpine.chartRulerId)} در ${formatSignHouseLabel(rulerPlacement)}`
      : getPlanetLabel(chartSpine.chartRulerId);
    const topHouses = chartSpine.activeHouses
      .slice(0, 4)
      .map((activeHouse) => `خانه ${toPersianNumber(activeHouse.house.number)}`);

    return [
      `${displayName}این خوانش هالیوس${cityPhrase} با ${risingDescriptor} ${rising.faName} و حاکم چارت، ${rulerPhrase}، شروع می‌شود.`,
      sun && moon ? buildCoreSynthesisThread(sun, moon, risingSign) : undefined,
      topHouses.length > 0 ? `میدان‌های پررنگ‌تر این چارت ${joinPersianList(topHouses)} هستند.` : undefined,
      buildNodeAxisSummaryPhrase(chartSpine, lunarNodes),
    ]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join("\n");
  }

  if (sun && moon) {
    return [
      `${displayName}این خوانش هالیوس${cityPhrase} از سه ستون اصلی چارت شروع می‌شود.`,
      buildCoreSynthesisThread(sun, moon, risingSign),
    ].join("\n");
  }

  return `${displayName}این خوانش هالیوس${cityPhrase} از ${risingDescriptor} ${rising.faName} شروع می‌شود.`;
}

function buildChartSpineHumanSummary(
  chartSpine: ChartSpine,
  primaryHouseNumber?: number | null,
): string {
  const rising = SIGN_COPY[chartSpine.risingSign];
  const rulerLabel = getPlanetLabel(chartSpine.chartRulerId);
  const rulerPlacement = chartSpine.chartRulerPlacement;
  const topHouse = primaryHouseNumber ?? chartSpine.activeHouses[0]?.house.number;

  if (!rulerPlacement) {
    const housePhrase = topHouse
      ? `خانه ${toPersianNumber(topHouse)}، یعنی ${HOUSE_SYNTHESIS_FIELD[topHouse]}`
      : "میدان‌های فعال چارت";

    return `جمع‌بندی همان نخ آغاز گزارش را نگه می‌دارد. رایزینگ ${formatSignLabel(rising)} شیوه ورود را با کیفیت ${rising.energy} رنگ می‌زند. ${rulerLabel} حاکم چارت است، اما جایگاهش در دادهٔ این گزارش ذخیره نشده؛ بنابراین جمع‌بندی عملی از ${housePhrase} شروع می‌شود و درباره حاکم چارت ادعای اضافه نمی‌سازد.`;
  }

  const rulerSign = SIGN_COPY[rulerPlacement.signId];
  const housePhrase = isReportHouseNumber(rulerPlacement.house)
    ? `در میدان ${HOUSE_SYNTHESIS_FIELD[rulerPlacement.house]}`
    : "در میدان خانه‌ای نامشخص";
  const activeHousePhrase = topHouse
    ? `خانه ${toPersianNumber(topHouse)} (${HOUSE_SYNTHESIS_FIELD[topHouse]}) پررنگ‌ترین صحنهٔ تمرین است`
    : "خانهٔ غالبی برای تمرین ثبت نشده است";

  return `جمع‌بندی همان نخ آغاز گزارش را نگه می‌دارد. رایزینگ ${formatSignLabel(rising)} شیوه ورود را با کیفیت ${rising.energy} رنگ می‌زند؛ ${rulerLabel} در ${formatSignHouseLabel(rulerPlacement)} هم ${PLANET_SYNTHESIS_NEED[chartSpine.chartRulerId] ?? PLANET_COPY[chartSpine.chartRulerId]?.role ?? "ریتم تصمیم"} را با کیفیت ${rulerSign.energy} ${housePhrase} هدایت می‌کند. ${activeHousePhrase}.`;
}

function buildNodeAxisSummaryPhrase(
  _chartSpine: ChartSpine,
  lunarNodes: RealEngineReportLunarNodes | undefined,
): string | undefined {
  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  const northHouse = isReportHouseNumber(lunarNodes.northNode.house)
    ? `خانه ${toPersianNumber(lunarNodes.northNode.house)}`
    : "خانه نامشخص";
  const southHouse = isReportHouseNumber(lunarNodes.southNode.house)
    ? `خانه ${toPersianNumber(lunarNodes.southNode.house)}`
    : "خانه نامشخص";

  return `مسیر رشد از الگوی آشنای دست جنوبی در ${formatSignLabel(SIGN_COPY[lunarNodes.southNode.signId])} ${southHouse} به سمت تمرین تازه دست شمالی در ${formatSignLabel(SIGN_COPY[lunarNodes.northNode.signId])} ${northHouse} حرکت می‌کند.`;
}

function buildCoreSynthesisThread(
  sun: RealEngineReportPlacement | undefined,
  moon: RealEngineReportPlacement | undefined,
  risingSign: ZodiacKey,
): string {
  const rising = SIGN_COPY[risingSign];

  if (!sun || !moon) {
    return `رایزینگ ${rising.faName} شیوه ورود به جهان را شکل می‌دهد و جایگاه‌های محاسبه‌شده بعدی این تصویر را کامل‌تر می‌کنند.`;
  }

  const sunSign = SIGN_COPY[sun.signId];
  const moonSign = SIGN_COPY[moon.signId];

  return `خورشید ${formatSignHouseLabel(sun)} مسیر هویت را با ${sunSign.gift} پیوند می‌دهد؛ ماه ${formatSignHouseLabel(moon)} زبان امنیت عاطفی را با ریتم ${moonSign.energy} می‌سازد؛ رایزینگ ${rising.faName} هم شیوه ورود به جهان را با کیفیت ${rising.energy} شکل می‌دهد.`;
}

function buildDailyLifeSynthesisThread(
  mercury: RealEngineReportPlacement | undefined,
  venus: RealEngineReportPlacement | undefined,
  mars: RealEngineReportPlacement | undefined,
): string | undefined {
  const parts: string[] = [];
  const mercuryVenusShareField =
    mercury &&
    venus &&
    mercury.signId === venus.signId &&
    mercury.house === venus.house;

  if (mercuryVenusShareField) {
    parts.push(`عطارد و زهره در ${formatSignHouseLabel(mercury)} فکر، انتخاب و زبان نزدیکی را در یک میدان مشترک فعال می‌کنند`);
  } else {
    if (mercury) {
      parts.push(`عطارد ${formatSignHouseLabel(mercury)} شیوه فکر و تصمیم را نشان می‌دهد`);
    }
    if (venus) {
      parts.push(`زهره ${formatSignHouseLabel(venus)} زبان ارزش، انتخاب و نزدیکی را رنگ می‌زند`);
    }
  }

  if (mars) {
    parts.push(`مریخ ${formatSignHouseLabel(mars)} ریتم عمل، خواستن و برخورد با فشار را نشان می‌دهد`);
  }

  return parts.length > 0 ? `${parts.join("؛ ")}.` : undefined;
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
    return "در لایه کشمکش و استعداد، این نسخه بیشتر از جایگاه‌های اصلی شروع می‌کند؛ هر رابطه سیاره‌ای محاسبه‌شده بعدی باید فقط وقتی وارد روایت شود که داده کافی داشته باشد.";
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
    "در لایه کشمکش و استعداد، رابطه‌های سیاره‌ای کمک می‌کنند گزارش فقط درباره جایگاه‌های جدا نباشد.",
    signals.length > 0
      ? signals.join("؛ ") + "."
      : "این روابط بیشتر مثل گفت‌وگوی درونی خوانده می‌شوند تا حکم قطعی درباره شخصیت.",
    "تمرین رشد این است که ببینی کدام نیرو باید نرم‌تر همکاری کند و کدام نیرو نیاز به مرز، تمرین یا زمان دارد.",
  ].join(" ");
}

function buildHouseSynthesisThread(
  realEngine: RealEngineReportSnapshot,
  chartSpine?: ChartSpine,
): string {
  const activeHouses = chartSpine?.activeHouses.length
    ? chartSpine.activeHouses.map((activeHouse) => activeHouse.house.number)
    : Array.from(
        new Set(
          realEngine.placements
            .map((placement) => placement.house)
            .filter(isReportHouseNumber),
        ),
      ).sort((first, second) => first - second);

  if (activeHouses.length === 0) {
    return "از نظر میدان‌های زندگی، خانه‌ها فقط وقتی وارد جمع‌بندی می‌شوند که جایگاه محاسبه‌شده و قابل توضیح داشته باشند.";
  }

  const shownHouses = activeHouses.map((house) => "خانه " + toPersianNumber(house)).join("، ");

  return "از نظر میدان‌های زندگی، تمرکز اولیه در " + shownHouses + " دیده می‌شود؛ یعنی تصویر کلی فقط از نشانه‌ها ساخته نمی‌شود، بلکه از جایی هم ساخته می‌شود که هر نیرو در زندگی روزمره فعال می‌شود.";
}

function buildFirstSynthesisText(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  synthesisPlan: RealEngineSynthesisPlan,
): string {
  return [
    buildSynthesisChallengeThread(
      synthesisPlan.primaryChallenge,
      realEngine,
      chartSpine,
    ),
    buildSynthesisSupportThread(
      synthesisPlan.primarySupport,
      realEngine,
      chartSpine,
    ),
    buildSynthesisDailyBridgeThread(
      synthesisPlan.dailyBridge,
      realEngine,
      chartSpine,
    ),
    buildAspectClusterSynthesisThread(realEngine, chartSpine),
    buildSynthesisWeeklyPractice(realEngine, chartSpine, synthesisPlan),
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n\n");
}

function buildSynthesisChallengeThread(
  aspect: RealEngineReportAspect | undefined,
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string | undefined {
  if (!aspect) {
    return undefined;
  }

  const label = aspect.aspectId === "conjunction" ? "تمرکز اصلی" : "کشمکش اصلی";
  return `${label}: ${buildSynthesisAspectBridge(
    aspect,
    realEngine,
    chartSpine,
    "challenge",
  )}`;
}

function buildSynthesisSupportThread(
  aspect: RealEngineReportAspect | undefined,
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string | undefined {
  if (!aspect) {
    return undefined;
  }

  return `منبع همراه: ${buildSynthesisAspectBridge(
    aspect,
    realEngine,
    chartSpine,
    "support",
  )}`;
}

function buildSynthesisDailyBridgeThread(
  aspect: RealEngineReportAspect | undefined,
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string | undefined {
  if (!aspect) {
    return undefined;
  }

  return `ترجمهٔ روزمره: ${buildSynthesisAspectBridge(
    aspect,
    realEngine,
    chartSpine,
    "daily-bridge",
  )}`;
}

function buildSynthesisAspectBridge(
  aspect: RealEngineReportAspect,
  realEngine: RealEngineReportSnapshot,
  chartSpine?: ChartSpine,
  synthesisRole?: BehavioralSynthesisRole,
): string {
  const interpretation = buildWriterAspectInterpretation(
    aspect,
    realEngine,
    chartSpine,
    synthesisRole,
  );

  return interpretation.narrativeSummary;
}

function buildSynthesisParticipantPhrase(
  planetId: string,
  placement: RealEngineReportPlacement | undefined,
): string {
  const planetLabel = getPlanetLabel(planetId);
  const need = PLANET_SYNTHESIS_NEED_SHORT[planetId] ?? PLANET_COPY[planetId]?.title ?? "یک نیاز مهم";

  if (!placement) {
    return `${planetLabel} (${need})`;
  }

  const sign = SIGN_COPY[placement.signId];
  const field = isReportHouseNumber(placement.house)
    ? ` در میدان ${HOUSE_SYNTHESIS_FIELD[placement.house]}`
    : "";

  return `${planetLabel} ${sign.faName}${field} (${need})`;
}

type SynthesisGrowthLanguageInput = {
  sun: RealEngineReportPlacement | undefined;
  moon: RealEngineReportPlacement | undefined;
  mercury: RealEngineReportPlacement | undefined;
  venus: RealEngineReportPlacement | undefined;
  mars: RealEngineReportPlacement | undefined;
  risingSign: ZodiacKey;
  chartSpine: ChartSpine;
};

function buildSynthesisGrowthLanguage({
  sun,
  moon,
  mercury,
  venus,
  mars,
  risingSign,
  chartSpine,
}: SynthesisGrowthLanguageInput): string {
  const chartRulerGrowth =
    chartSpine.chartRulerPlacement && !CORE_SPINE_IDS.has(chartSpine.chartRulerId)
      ? "حاکم چارت: " +
        trimSentenceEnd(buildPlacementGrowthPractice(chartSpine.chartRulerId, chartSpine.chartRulerPlacement))
      : null;
  const growthParts = [
    sun ? trimSentenceEnd(buildPlacementGrowthPractice("sun", sun)) : null,
    moon ? trimSentenceEnd(buildPlacementGrowthPractice("moon", moon)) : null,
    "رایزینگ: " + trimSentenceEnd(SIGN_COPY[risingSign].growth),
    chartRulerGrowth,
  ].filter(Boolean);
  const tools = [
    mercury ? "عطارد برای روشن‌تر کردن زبان و تصمیم" : null,
    venus ? "زهره برای شناخت ارزش، انتخاب و مرز رابطه" : null,
    mars ? "مریخ برای تبدیل میل، خشم یا نیت به قدم عملی" : null,
  ].filter(Boolean);

  return [
    "زبان رشد: این چارت رشد را با شعارهای کلی توضیح نمی‌دهد؛ از تمرین‌های کوچک و قابل مشاهده شروع می‌کند.",
    growthParts.length > 0 ? growthParts.join("؛ ") + "." : "اولین تمرین رشد، مشاهده آرام‌تر واکنش‌ها پیش از تصمیم است.",
    tools.length > 0
      ? "ابزارهای روزمره این رشد در این گزارش چنین دیده می‌شوند: " + tools.join("، ") + "."
      : "ابزارهای روزمره این رشد باید از همان بخشی انتخاب شوند که در متن گزارش بیشتر با تجربه تو هم‌صداست.",
  ].join(" ");
}

function trimSentenceEnd(text: string): string {
  return text.replace(/[.؟!]+$/u, "").trim();
}

function buildSynthesisWeeklyPractice(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  synthesisPlan: RealEngineSynthesisPlan,
): string {
  const [firstPractice] = buildSynthesisPracticeItems(
    realEngine,
    chartSpine,
    synthesisPlan,
  );

  return `تمرین این هفته: ${firstPractice}.`;
}

function buildCorePlacementText(
  placement: RealEngineReportPlacement | undefined,
  planetId: "sun" | "moon",
) {
  if (!placement) {
    return undefined;
  }

  const planet = PLANET_COPY[planetId];
  const placementLabel = formatPlacementWithHouse(placement);
  const interpretation = buildPlacementInterpretation(
    planetId,
    placement,
  );
  const houseSentence = buildPlanetHouseSentence(
    placement,
    planetId,
  );

  if (!interpretation) {
    return `${planet.faName} در ${placementLabel} قرار دارد؛ برای این جایگاه هنوز ترکیب کامل سیاره، نشان و خانه در دسترس نیست.`;
  }

  return [
    `${planet.faName} در ${placementLabel} قرار دارد.`,
    `به زبان ساده، ${interpretation.plainMeaning}.`,
    `در زندگی روزمره، ${interpretation.dailyLifeExample}.`,
    `شکل سالم این جایگاه ${interpretation.healthyExpression}.`,
    `گیر احتمالی آن ${interpretation.possibleFriction}.`,
    houseSentence,
    `آزمایش کوچک: ${interpretation.smallExperiment}.`,
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
  const placementLabel = formatPlacementWithHouse(placement);
  const interpretation = buildPlacementInterpretation(
    planetId,
    placement,
  );
  const houseSentence = buildPlanetHouseSentence(
    placement,
    planetId,
  );

  if (!interpretation) {
    return `${planet.faName} در ${placementLabel} قرار دارد؛ برای این جایگاه هنوز ترکیب کامل سیاره، نشان و خانه در دسترس نیست.`;
  }

  return [
    `${planet.faName} در ${placementLabel} قرار دارد.`,
    `به زبان ساده، ${interpretation.plainMeaning}.`,
    `نمونه روزمره آن ${interpretation.dailyLifeExample}.`,
    `توان سالمش ${interpretation.healthyExpression}.`,
    `گیر احتمالی‌اش ${interpretation.possibleFriction}.`,
    houseSentence,
    `آزمایش کوچک: ${interpretation.smallExperiment}.`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function buildPlanetHouseSentence(
  placement: RealEngineReportPlacement,
  planetId: "sun" | "moon" | "mercury" | "venus" | "mars",
): string | undefined {
  const interpretation = buildPlacementInterpretation(
    planetId,
    placement,
  );

  return interpretation
    ? `از نظر خانه‌ها، این جایگاه بیشتر در این صحنه دیده می‌شود: ${interpretation.focus}.`
    : undefined;
}

function buildPlacementGrowthPractice(
  planetId: string,
  placement: RealEngineReportPlacement,
): string {
  const interpretation = buildPlacementInterpretation(
    planetId,
    placement,
  );

  if (interpretation) {
    return `تمرین این جایگاه: ${interpretation.smallExperiment}.`;
  }

  return "تمرین این جایگاه این است که یک نمونه واقعی از الگو را ثبت کنی و آن را به یک رفتار کوچک و قابل مشاهده تبدیل کنی.";
}

function buildPlacementInterpretation(
  planetId: string,
  placement: RealEngineReportPlacement,
) {
  if (
    !isBehavioralPlacementInput(
      planetId,
      placement.signId,
      placement.house,
    )
  ) {
    return undefined;
  }

  return buildPlacementBehavioralInterpretation({
    planetId,
    signId: placement.signId,
    houseNumber: placement.house,
  });
}

function buildRisingText(
  signKey: ZodiacKey,
  degreeInSign: number,
  houseContext?: RealEngineReportHouseContext,
) {
  const sign = SIGN_COPY[signKey];
  const signLabel = formatSignLabel(sign);
  const risingDescriptor = buildRisingDescriptor(houseContext);

  return [
    `${risingDescriptor} تو در ${signLabel}، درجه ${formatDegree(degreeInSign)} ${sign.faName} است.`,
    `رایزینگ از شیوه ورود تو به فضاها، شروع‌ها و برخورد اول با جهان می‌گوید. با ${signLabel}، این ورود رنگ ${sign.energy} دارد.`,
    `هدیه این رایزینگ ${sign.gift} است و تمرین رشد آن ${sign.growth}.`,
  ].join(" ");
}

function buildHouseContextText(
  houseContext: RealEngineReportHouseContext | undefined,
  _risingSign: ZodiacKey,
) {
  if (isUnavailablePlacidusHouseContext(houseContext)) {
    return houseContext.unavailableReason === "polar-circle"
      ? "برای این عرض جغرافیایی، خانه‌های پلاسیدوس در دسترس نیستند؛ هالیوس هیچ روش خانه جایگزینی را پنهانی اعمال نکرده و خوانش خانه‌ها را کنار گذاشته است."
      : "حل‌گر محلی پلاسیدوس برای این چارت همگرا نشد؛ هالیوس هیچ روش خانه جایگزینی را پنهانی اعمال نکرده و خوانش خانه‌ها را کنار گذاشته است.";
  }

  if (isCalculatedPlacidusHouseContext(houseContext)) {
    return "خانه‌ها با روش پلاسیدوس و دوازده سرخانه نامساویِ محاسبه‌شده خوانده شده‌اند؛ جزئیات کامل پایین صفحه آمده است.";
  }

  if (isCalculatedWholeSignHouseContext(houseContext)) {
    return "این گزارش قدیمی، خانه‌های ذخیره‌شده با روش نشانه کامل را بدون بازنویسی حفظ کرده است.";
  }

  return undefined;
}


function buildHouseAnglesText(realEngine: RealEngineReportSnapshot): string | undefined {
  const houses = getSortedReportHouses(realEngine.houses);
  const angles = getOrderedReportAngles(realEngine.angles);

  if (houses.length !== 12 && angles.length === 0) {
    return undefined;
  }

  const houseSystemText =
    houses.length === 12
      ? realEngine.houseSystem === "placidus"
        ? "خانه‌های این گزارش با روش پلاسیدوس و سرخانه‌های نامساوی محاسبه شده‌اند؛ جدول کامل در پشتوانه محاسبه آمده و متن خوانش فقط نقاط پررنگ‌تر را برجسته می‌کند."
        : "این نسخهٔ ذخیره‌شدهٔ قدیمی، خانه‌های روش نشانه کامل را همان‌طور که ثبت شده‌اند حفظ می‌کند؛ جدول کامل در پشتوانه محاسبه آمده و متن خوانش فقط نقاط پررنگ‌تر را برجسته می‌کند."
      : isUnavailablePlacidusHouseContext(realEngine.houseContext)
        ? "خانه‌های پلاسیدوس برای این چارت در دسترس نیستند و هیچ روش جایگزین پنهانی اعمال نشده است؛ محورها و جایگاه‌های نشانه‌ای همچنان قابل خواندن‌اند."
        : "در این نسخه جدول کامل ۱۲ خانه در خروجی گزارش آماده نیست، پس خانه‌ها وارد خوانش نمی‌شوند.";
  const anglesText = angles.length > 0 ? buildAnglesNarrative(angles) : undefined;
  const ascDscText = realEngine.angles?.asc && realEngine.angles?.dsc
    ? "محور رایزینگ و نقطه روبه‌رو پیوند میان شیوه ورود تو به جهان و آینه رابطه با دیگری را نشان می‌دهد."
    : undefined;
  const mcIcText = realEngine.angles?.mc && realEngine.angles?.ic
    ? "محور میانه آسمان و ریشه آسمان مسیر بیرونی و ریشه درونی را جدا از شماره خانه‌ها می‌خواند."
    : undefined;
  const housesText = houses.length === 12 ? buildHouseNarrative(houses, realEngine.placements) : undefined;

  return [houseSystemText, anglesText, ascDscText, mcIcText, housesText]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

function buildRetrogradeText(
  realEngine: RealEngineReportSnapshot,
  chartSpine?: ChartSpine,
): string | undefined {
  const retrogrades = realEngine.retrogrades;

  if (retrogrades?.status !== "calculated") {
    return undefined;
  }

  const planetIds = retrogrades.planetIds.filter(
    (planetId) => typeof planetId === "string" && planetId.length > 0,
  );
  const planetLabels = planetIds
    .map((planetId) => PLANET_COPY[planetId]?.faName ?? planetId)
    .filter((label): label is string => Boolean(label));
  const method =
    "حرکت برگشتی از مقایسه جایگاه ظاهری سیاره‌ها نزدیک لحظه تولد به دست می‌آید و اگر سیاره نزدیک ایستایی باشد، باید ملایم‌تر خوانده شود.";
  const nodeBoundary = isCalculatedLunarNodes(realEngine.lunarNodes)
    ? `دست‌های ماه با ${getLunarNodeModelLabel(realEngine.lunarNodes)} آمده‌اند و لیلیت فقط در بخش فنی نمایش داده می‌شود؛ روایت لیلیت در این نسخه فعال نیست.`
    : "دست‌های ماه و لیلیت فقط وقتی وارد خوانش می‌شوند که مدل و منبع محاسبه روشن باشد.";

  if (planetLabels.length === 0) {
    return [
      "برای سیاره‌های محاسبه‌شده این چارت حرکت برگشتی ثبت نشده است.",
      method,
      nodeBoundary,
    ].join(" ");
  }

  const verb = planetLabels.length === 1 ? "ثبت شده است" : "ثبت شده‌اند";
  const focusLabels = chartSpine
    ? planetIds.filter((planetId) =>
        planetId === chartSpine.chartRulerId || planetId === "sun" || planetId === "moon",
      ).map(getPlanetLabel)
    : [];
  const focusText = focusLabels.length > 0
    ? `چون ${joinPersianList(focusLabels)} به ستون‌های اصلی چارت وصل است، حرکت برگشتی‌اش باید بیشتر به‌عنوان بازنگری درونی خوانده شود.`
    : "در خوانش نمادین، این وضعیت بیشتر دعوت به بازنگری و توجه درونی است؛ نه نشانه ضعف یا اتفاق قطعی.";

  return [
    `در این چارت ${joinPersianList(planetLabels)} با حرکت برگشتی ${verb}.`,
    method,
    focusText,
    nodeBoundary,
  ].join(" ");
}


function buildLunarNodeText(
  realEngine: RealEngineReportSnapshot,
  chartSpine?: ChartSpine,
): string | undefined {
  const lunarNodes = realEngine.lunarNodes;

  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  const modelLabel = getLunarNodeModelLabel(lunarNodes);
  const boundaryWarning = buildLunarNodeBoundaryWarning(lunarNodes);
  const northHouse = isReportHouseNumber(lunarNodes.northNode.house)
    ? HOUSE_COPY[lunarNodes.northNode.house]
    : undefined;
  const southHouse = isReportHouseNumber(lunarNodes.southNode.house)
    ? HOUSE_COPY[lunarNodes.southNode.house]
    : undefined;

  const axisSentence = buildLunarNodeAxisHumanSentence(lunarNodes, northHouse, southHouse);
  const overlapText = chartSpine ? buildNodeAxisSpinePhrase(lunarNodes, chartSpine) : undefined;

  return [
    `دست‌های ماه در این گزارش با ${modelLabel} خوانده می‌شوند.`,
    axisSentence,
    overlapText,
    boundaryWarning,
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

function buildLunarNodeAxisHumanSentence(
  lunarNodes: RealEngineReportCalculatedLunarNodes,
  northHouse: HouseCopy | undefined,
  southHouse: HouseCopy | undefined,
): string {
  const northSign = formatSignLabel(SIGN_COPY[lunarNodes.northNode.signId]);
  const southSign = formatSignLabel(SIGN_COPY[lunarNodes.southNode.signId]);
  const northHouseText = isReportHouseNumber(lunarNodes.northNode.house)
    ? `خانه ${toPersianNumber(lunarNodes.northNode.house)}`
    : "خانه نامشخص";
  const southHouseText = isReportHouseNumber(lunarNodes.southNode.house)
    ? `خانه ${toPersianNumber(lunarNodes.southNode.house)}`
    : "خانه نامشخص";
  const southField = southHouse ? ` در میدان ${southHouse.field}` : "";
  const northField = northHouse ? ` در میدان ${northHouse.field}` : "";

  return `دست جنوبی در ${southSign}، ${southHouseText}${southField} الگویی آشنا یا مهارتی قدیمی را نشان می‌دهد؛ دست شمالی در ${northSign}، ${northHouseText}${northField} جهت تمرینی تازه را پیشنهاد می‌کند. این محور حکم قطعی درباره گذشته یا آینده نیست و بهتر است با تجربه‌ی واقعی زندگی سنجیده شود.`;
}

function buildLunarNodeBoundaryWarning(
  lunarNodes: RealEngineReportCalculatedLunarNodes,
): string | undefined {
  const nearBoundary = [lunarNodes.northNode, lunarNodes.southNode].some((node) =>
    node.degreeInSign <= 1.5 || node.degreeInSign >= 28.5,
  );

  return nearBoundary
    ? "چون یکی از دست‌های ماه نزدیک مرز نشانه ثبت شده است، این بخش باید ملایم و احتمالی خوانده شود."
    : undefined;
}


function formatLunarNodeNarrativePoint(node: RealEngineReportLunarNodePoint): string {
  const sign = SIGN_COPY[node.signId];
  const handLabel = node.id === "north-node" ? "دست شمالی ماه" : "دست جنوبی ماه";
  const houseSuffix = typeof node.house === "number" ? `، خانه ${toPersianNumber(node.house)}` : "";
  const sourceLabel = node.source === "derived-opposition"
    ? "بر پایه محور مقابل دست شمالی خوانده می‌شود."
    : node.method === "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date"
      ? "با مدل نوسانی/واقعی محلی محاسبه شده است."
      : "با مدل میانگین محاسبه شده است.";

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
      (lunarNodes.nodeType === "mean" || lunarNodes.nodeType === "local-true-osculating") &&
      isValidLunarNodePoint(lunarNodes.northNode) &&
      isValidLunarNodePoint(lunarNodes.southNode),
  );
}

function getLunarNodeModelLabel(
  lunarNodes: RealEngineReportCalculatedLunarNodes,
): string {
  return lunarNodes.nodeType === "mean"
    ? "مدل میانگین"
    : "مدل نوسانی/واقعی محلی";
}

function isCalculatedLilith(
  lilith: RealEngineReportLilith | undefined,
): lilith is RealEngineReportCalculatedLilith {
  if (
    !lilith ||
    lilith.status !== "calculated" ||
    !("id" in lilith) ||
    lilith.id !== "black-moon-lilith" ||
    !("approvedForReportOutput" in lilith)
  ) {
    return false;
  }

  return true;
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
    .slice(0, 2)
    .join(" ");

  const nodesText = isCalculatedLunarNodes(realEngine.lunarNodes)
    ? `دست‌های ماه با ${getLunarNodeModelLabel(realEngine.lunarNodes)} در داده ثبت شده‌اند.`
    : "دست‌های ماه تا روشن شدن مدل و منبع محاسبه وارد نتیجه‌گیری نمی‌شوند.";
  const lilithText =
    isCalculatedLilith(realEngine.lilith)
      ? realEngine.lilith.approvedForReportOutput
        ? "لیلیت محاسبه شده و مجوز ورود به روایت این گزارش را دارد."
        : "جایگاه لیلیت در بخش فنی ثبت شده است، اما مجوز ورود به روایت تفسیری این گزارش فعال نیست."
      : "لیلیت در این نسخه محاسبه نمی‌شود و وارد خوانش نشده است.";

  return [
    "دقت این گزارش به ساعت تولد، شهر و تبدیل زمان وابسته است؛ اگر ساعت تولد تقریبی باشد، خانه‌ها و محورها باید محتاط‌تر خوانده شوند.",
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
    .filter(
      (house) =>
        (house.system === "whole-sign" || house.system === "placidus") &&
        house.reliability === "calculated",
    )
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

function buildHouseNarrative(
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

  return [
    axisHighlights.length > 0
      ? `محورهای خانه‌ای به‌صورت فشرده چنین‌اند: ${axisHighlights.join("؛ ")}. جدول کامل ۱۲ خانه در کارت گزارش و چارت دایره‌ای آمده است.`
      : "جدول کامل ۱۲ خانه در کارت گزارش و چارت دایره‌ای آمده است؛ متن خوانش فقط خانه‌های پررنگ‌تر را برجسته می‌کند.",
    activeHouses.length > 0
      ? `خانه‌های فعال‌تر این چارت از نظر سیاره‌ها و محورها: ${activeHouses.join(" ")}`
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

  const houseLabel = toPersianNumber(house.number);

  return [
    `خانه ${houseLabel} با ${joinPersianList(focusLabels)} پررنگ شده است؛ یعنی میدان ${copy.field} در این چارت فقط پس‌زمینه نیست و می‌تواند بیشتر دیده شود.`,
    `هدیه این خانه ${copy.gift} است.`,
    `تمرین انسانی این خانه ${copy.growth}.`,
    `پرسش خانه ${houseLabel}: ${HOUSE_REFLECTIONS[house.number] ?? "این میدان زندگی الان چه تمرین کوچک و واقعی می‌خواهد؟"}`,
  ].join(" ");
}

function buildRisingDescriptor(
  houseContext: RealEngineReportHouseContext | undefined,
) {
  return houseContext?.ascendantMethod === "astronomy-engine-local-sidereal-time" &&
    typeof houseContext.ascendantLongitude === "number" &&
    Number.isFinite(houseContext.ascendantLongitude)
    ? "رایزینگ محاسبه‌شده"
    : "رایزینگ تقریبی";
}

function buildHouseEvidenceLabel(
  houseContext: RealEngineReportHouseContext | undefined,
  houseCount: number,
): string | undefined {
  if (houseCount === 12 && isCalculatedPlacidusHouseContext(houseContext)) {
    return "۱۲ خانه با روش پلاسیدوس و سرخانه‌های نامساوی محاسبه‌شده";
  }

  if (houseCount === 12 && isCalculatedWholeSignHouseContext(houseContext)) {
    return "۱۲ خانه ذخیره‌شده با روش نشانه کامل";
  }

  if (isUnavailablePlacidusHouseContext(houseContext)) {
    return "خانه‌های پلاسیدوس در دسترس نیستند و روش جایگزین پنهانی اعمال نشده است";
  }

  return undefined;
}

function isCalculatedPlacidusHouseContext(
  houseContext: RealEngineReportHouseContext | undefined,
): houseContext is RealEngineReportHouseContext {
  return (
    houseContext?.appliedSystem === "placidus" &&
    houseContext.availability !== "unavailable" &&
    houseContext.confidence === "calculated-cusps"
  );
}

function isUnavailablePlacidusHouseContext(
  houseContext: RealEngineReportHouseContext | undefined,
): houseContext is RealEngineReportHouseContext {
  return (
    houseContext?.requestedSystem === "placidus" &&
    houseContext.availability === "unavailable"
  );
}

function isCalculatedWholeSignHouseContext(
  houseContext: RealEngineReportHouseContext | undefined,
): houseContext is RealEngineReportHouseContext {
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
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string | undefined {
  const aspect = aspects
    .filter(
      (candidate) =>
        candidate.firstPlanetId === planetId ||
        candidate.secondPlanetId === planetId,
    )
    .sort((first, second) => first.orb - second.orb)[0];

  if (!aspect) {
    return undefined;
  }

  const interpretation = buildWriterAspectInterpretation(
    aspect,
    realEngine,
    chartSpine,
  );
  const otherPlanetLabel =
    aspect.firstPlanetId === planetId
      ? aspect.secondPlanetLabel
      : aspect.firstPlanetLabel;

  return [
    `رابطه برجسته ${planetLabel}: با ${otherPlanetLabel} در الگوی ${aspect.aspectLabel} و اورب ${formatAspectDegree(aspect.orb)}.`,
    interpretation.narrativeSummary,
  ].join(" ");
}


function buildAspectOverviewText(
  synthesisPlan: RealEngineSynthesisPlan,
  realEngine: RealEngineReportSnapshot,
) {
  const roles = getRealEngineSynthesisRoles(synthesisPlan);
  const chartSpine = buildChartSpine(
    realEngine,
    realEngine.aspectHighlights ?? [],
  );

  if (roles.length === 0) {
    return undefined;
  }

  const details = roles.map((role) =>
    buildSynthesisRoleContinuation(
      role,
      realEngine,
      chartSpine,
    ),
  );

  return [
    "در این فصل همان رابطه‌های سیاره‌ای نخ اصلی به‌عنوان گفت‌وگوی درونی دنبال می‌شوند؛ جزئیات کامل همهٔ رابطه‌های محاسبه‌شده در جدول فنی گزارش باقی مانده است.",
    ...details,
    buildAspectReflectionText(roles.map((role) => role.aspect)),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

function buildSynthesisRoleContinuation(
  role: RealEngineSynthesisRole,
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string {
  const synthesisRole: BehavioralSynthesisRole =
    role.id === "challenge"
      ? "challenge"
      : role.id === "support"
        ? "support"
        : "daily-bridge";
  const interpretation = buildWriterAspectInterpretation(
    role.aspect,
    realEngine,
    chartSpine,
    synthesisRole,
  );
  const prefix =
    role.id === "challenge"
      ? "ادامهٔ کشمکش اصلی"
      : role.id === "support"
        ? "ادامهٔ منبع همراه"
        : "ادامهٔ ترجمهٔ روزمره";

  return `${prefix}: ${interpretation.narrativeSummary}.`;
}


function buildWriterAspectInterpretation(
  aspect: RealEngineReportAspect,
  realEngine: RealEngineReportSnapshot,
  chartSpine?: ChartSpine,
  synthesisRole?: BehavioralSynthesisRole,
): AspectBehavioralInterpretation {
  const first = findPlacement(realEngine, aspect.firstPlanetId);
  const second = findPlacement(realEngine, aspect.secondPlanetId);
  const activeHouseNumbers = chartSpine?.activeHouses.map(
    (activeHouse) => activeHouse.house.number,
  );
  const retrogradePlanetIds =
    realEngine.retrogrades?.status === "calculated"
      ? realEngine.retrogrades.planetIds
      : [];

  if (
    !isBehavioralAspectInput(
      aspect.firstPlanetId,
      aspect.secondPlanetId,
      aspect.aspectId,
    )
  ) {
    throw new Error(
      `Unsupported behavioral aspect input: ${aspect.id}`,
    );
  }

  return buildAspectBehavioralInterpretation({
    firstPlanetId: aspect.firstPlanetId,
    secondPlanetId: aspect.secondPlanetId,
    firstSignId: first?.signId,
    secondSignId: second?.signId,
    firstHouseNumber: first?.house,
    secondHouseNumber: second?.house,
    aspectId: aspect.aspectId,
    orb: aspect.orb,
    chartRulerId: chartSpine?.chartRulerId,
    activeHouseNumbers,
    retrogradePlanetIds,
    synthesisRole,
  });
}

function buildAspectClusterSynthesisThread(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string | undefined {
  const highlights = realEngine.aspectHighlights ?? [];
  const clusterPlanetIds = ["moon", "mars", "uranus"];
  const clusterAspects = highlights.filter((aspect) =>
    clusterPlanetIds.includes(aspect.firstPlanetId) &&
    clusterPlanetIds.includes(aspect.secondPlanetId),
  );

  if (clusterAspects.length < 2) {
    return undefined;
  }

  const readings = clusterAspects.map((aspect) =>
    buildWriterAspectInterpretation(
      aspect,
      realEngine,
      chartSpine,
      "daily-bridge",
    ),
  );
  const sharedExperiment = readings[0]?.smallExperiment;

  return [
    "الگوی خوشه‌ای: ماه، مریخ و اورانوس اینجا سه جملهٔ جدا نیستند؛ احساس، واکنش عملی و نیاز به آزادی می‌توانند پشت سر هم روشن شوند.",
    "توان این خوشه صداقت، دفاع از احساس و تغییر مستقل است؛ گیر آن تصمیم یا قطع‌کردن پیش از نام‌گذاری احساس و درخواست است.",
    sharedExperiment ? `آزمایش خوشه: ${sharedExperiment}.` : undefined,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function formatAspectLead(aspect: RealEngineReportAspect): string {
  return `${aspect.firstPlanetLabel} ${aspect.glyph} ${aspect.secondPlanetLabel} (${aspect.aspectLabel}، اورب ${formatAspectDegree(
    aspect.orb,
  )})`;
}

function buildAspectPriorityText(aspects: RealEngineReportAspect[]): string {
  const closest = aspects
    .slice(0, 3)
    .map(
      (aspect) =>
        `${aspect.firstPlanetLabel} و ${aspect.secondPlanetLabel}`,
    );

  if (closest.length === 0) {
    return "اولویت خواندن رابطه‌های سیاره‌ای از وزن چارت شروع می‌شود: نورها، حاکم چارت، خانه‌های فعال، رابطه‌های تنشی و بعد اورب نزدیک.";
  }

  return `اولویت خواندن رابطه‌های سیاره‌ای از رابطه‌هایی شروع می‌شود که به نورها، حاکم چارت، خانه‌های فعال یا رابطه‌های تنشی وصل‌اند: ${closest.join("، ")}. اورب نزدیک مهم است، اما تنها معیار انتخاب نیست.`;
}


function buildAspectReflectionText(aspects: RealEngineReportAspect[]): string {
  const tensionCount = aspects.filter((aspect) =>
    aspect.aspectId === "square" || aspect.aspectId === "opposition",
  ).length;
  const flowCount = aspects.filter((aspect) =>
    aspect.aspectId === "sextile" || aspect.aspectId === "trine",
  ).length;

  const signals = [
    tensionCount > 0
      ? `${toPersianNumber(tensionCount)} رابطه تنشی/قطبی به تنظیم دو نیاز متفاوت اشاره می‌کند.`
      : null,
    flowCount > 0
      ? `${toPersianNumber(flowCount)} رابطه نرم‌تر، مسیر همکاری یا استعداد طبیعی را برجسته می‌کند.`
      : null,
  ].filter(Boolean);

  return signals.length > 0
    ? signals.join(" ")
    : "این رابطه‌ها بیشتر مثل گفت‌وگوی درونی خوانده می‌شوند، نه حکم قطعی درباره شخصیت.";
}


function buildIntegrationText(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  synthesisPlan: RealEngineSynthesisPlan,
) {
  return [
    buildChartSpineHumanSummary(
      chartSpine,
      synthesisPlan.primaryHouseNumber,
    ),
    buildChartPracticeList(chartSpine, realEngine, synthesisPlan),
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

function buildChartPracticeList(
  chartSpine: ChartSpine,
  realEngine: RealEngineReportSnapshot,
  synthesisPlan: RealEngineSynthesisPlan,
): string {
  const practices = buildSynthesisPracticeItems(
    realEngine,
    chartSpine,
    synthesisPlan,
  );

  return `سه تمرین کوچک این چارت: ${practices
    .slice(0, 3)
    .map((practice, index) => `${toPersianNumber(index + 1)}) ${practice}`)
    .join("؛ ")}.`;
}

function buildSynthesisPracticeItems(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  synthesisPlan: RealEngineSynthesisPlan,
): string[] {
  const practices: string[] = [];
  const challenge = synthesisPlan.primaryChallenge;
  const support = synthesisPlan.primarySupport;
  const dailyBridge = synthesisPlan.dailyBridge;

  for (const [aspect, role] of [
    [challenge, "challenge"],
    [support, "support"],
    [dailyBridge, "daily-bridge"],
  ] as const) {
    if (!aspect) {
      continue;
    }

    practices.push(
      buildWriterAspectInterpretation(
        aspect,
        realEngine,
        chartSpine,
        role,
      ).smallExperiment,
    );
  }

  const activeHouse = synthesisPlan.primaryHouseNumber ?? chartSpine.activeHouses[0]?.house.number;
  if (practices.length < 3 && activeHouse && HOUSE_COPY[activeHouse]) {
    const growth = trimSentenceEnd(HOUSE_COPY[activeHouse].growth).replace(/^این است که /u, "");
    practices.push(`در خانه ${toPersianNumber(activeHouse)} فقط یک قدم بردار تا ${growth}`);
  }

  const fallbacks = [
    "یک واکنش تکراری را پیش از عمل نام‌گذاری کن",
    "یک نیاز را کوتاه و مستقیم بیان کن",
    "یک انتخاب کوچک را به‌جای تصمیم بزرگ امتحان کن",
  ];

  for (const fallback of fallbacks) {
    if (practices.length >= 3) {
      break;
    }
    practices.push(fallback);
  }

  return Array.from(new Set(practices)).slice(0, 3);
}

function findPlacement(snapshot: RealEngineReportSnapshot, id: string) {
  return snapshot.placements.find((placement) => placement.id === id);
}

function buildReportHumanReadingRhythmText(input: RealEngineSectionTextInput): string {
  const hasSynthesis = Boolean(input.firstSynthesisText || input.integrationText);
  const rhythm = hasSynthesis
    ? "اول خلاصه و ستون فقرات را بخوان؛ بعد فقط سراغ فصلی برو که به تجربه امروزت نزدیک‌تر است."
    : "اول یک فصل نزدیک به تجربه امروزت را بخوان؛ لازم نیست گزارش را یک‌باره تمام کنی.";

  return [
    "این گزارش برای خواندن آرام نوشته شده است، نه برای حفظ کردن همه جزئیات.",
    rhythm,
    "در پایان فقط یک جمله یا یک تمرین کوچک را نگه دار.",
  ].join("\n\n");
}

function buildRealEngineInterpretationSections(
  input: RealEngineSectionTextInput,
): ReportOutputSection[] {
  const coreBody = input.coreSynthesisText ?? joinSectionBody(
    input.sunText,
    input.moonText,
    input.risingText,
  );
  const dailyBody = joinSectionBody(
    input.dailyLifeSynthesisText,
    input.aspectText,
  );
  const nodeMotionBody = joinSectionBody(
    input.lunarNodeText,
    input.retrogradeText,
  );
  const activeHouseBody = joinSectionBody(
    input.activeHouseText,
    input.houseText,
  );
  const fallbackBody =
    input.integrationText ??
    input.summary ??
    "این بخش از گزارش بر اساس داده‌های محاسبه‌شده چارت نوشته شده و بهتر است آرام و غیرقطعی خوانده شود.";

  const chartRulerSection: ReportOutputSection | null = input.chartRulerText
    ? {
        id: "real-engine-chart-ruler",
        kind: "identity",
        title: "حاکم چارت",
        body: buildStructuredSectionBody({
          opening: "حاکم چارت ریتم پشت‌صحنه بسیاری از شروع‌ها، واکنش‌ها و انتخاب‌های روزمره را نشان می‌دهد.",
          body: input.chartRulerText,
          reflection: "این نیرو بیشتر کجا کمک می‌کند شروع کنی و کجا ممکن است تو را به تکرار یک عادت بکشاند؟",
        }),
      }
    : null;
  const activeHouseSection: ReportOutputSection | null = activeHouseBody
    ? {
        id: "real-engine-active-houses",
        kind: "growth",
        title: "خانه‌های فعال",
        body: buildStructuredSectionBody({
          readerCue: "خانه‌های فعال را مثل صحنه‌های زندگی بخوان؛ جایی که موضوعات چارت بیشتر دیده و تجربه می‌شوند.",
          opening: "در روایت اصلی فقط خانه‌هایی آمده‌اند که در این چارت وزن بیشتری دارند.",
          chapterSummary: "این فصل نیروهای اصلی چارت را به چند میدان واقعی زندگی وصل می‌کند.",
          body: activeHouseBody,
          reflection: "این روزها کدام میدان زندگی بیشتر توجه تو را می‌خواهد و چه کار کوچکی آن را روشن‌تر می‌کند؟",
        }),
      }
    : null;
  const nodeMotionSection: ReportOutputSection | null = nodeMotionBody
    ? {
        id: "real-engine-node-axis",
        kind: "growth",
        title: "دست‌های ماه و مسیر رشد",
        body: buildStructuredSectionBody({
          readerCue: "دست‌های ماه را مثل مسیر تمرین بخوان؛ از الگوی آشنا به سمت رفتاری که هنوز تازه است.",
          opening: "دست‌های ماه مسیر رشد را به زبان حرکت از الگوی آشنا به تمرین تازه توضیح می‌دهند.",
          chapterSummary: "این فصل تفاوت میان عادت امن و رفتار تازه را نشان می‌دهد.",
          body: nodeMotionBody,
          reflection: "کدام واکنش برایت آشنا و امن است، و کدام رفتار کوچک می‌تواند رشد تازه‌ای بسازد؟",
        }),
      }
    : null;
  const balanceSection: ReportOutputSection | null = input.balanceText
    ? {
        id: "real-engine-balance",
        kind: "overview",
        title: "عنصرها، کیفیت‌ها و ریتم کلی",
        body: buildStructuredSectionBody({
          opening: "عنصرها و کیفیت‌ها ریتم کلی انرژی را نشان می‌دهند؛ نه یک برچسب ثابت برای شخصیت.",
          body: input.balanceText,
          reflection: "برای ادامه دادن، بیشتر به شروع، انعطاف، ثبات، یا رها کردن یک فشار قدیمی نیاز داری؟",
        }),
      }
    : null;

  return ([
    {
      id: "real-engine-first-synthesis",
      kind: "overview",
      title: "نخ اصلی این چارت",
      body: buildStructuredSectionBody({
        readerCue: "اول این خلاصه را بخوان؛ لازم نیست همه جزئیات را حفظ کنی، فقط نخ اصلی را پیدا کن.",
        opening: input.summary,
        body: input.firstSynthesisText,
        reflection: "کدام جمله از این خلاصه بیشتر شبیه تجربه واقعی توست و کدام بخش هنوز نیاز به زمان دارد؟",
      }),
    },
    {
      id: "real-engine-core-pattern",
      kind: "identity",
      title: "سه ستون اصلی",
      body: buildStructuredSectionBody({
        opening: coreBody || fallbackBody,
        body: undefined,
        reflection: "وقتی بین خواسته، احساس و ظاهر بیرونی‌ات فاصله می‌افتد، معمولاً کدام بخش زودتر صدا بلند می‌کند؟",
      }),
    },
    chartRulerSection,
    activeHouseSection,
    {
      id: "real-engine-daily-life",
      kind: "relationships",
      title: "ذهن، رابطه، عمل و روابط مهم",
      body: buildStructuredSectionBody({
        opening: "عطارد، زهره و مریخ ابزارهای روزمره فکر، انتخاب، نزدیکی و عمل را نشان می‌دهند.",
        body: dailyBody || fallbackBody,
        reflection: "در یک موقعیت واقعی، کدام ابزار زودتر فعال می‌شود و کدام ابزار به مکث بیشتری نیاز دارد؟",
      }),
    },
    nodeMotionSection,
    balanceSection,
    {
      id: "real-engine-personal-summary",
      kind: "growth",
      title: "جمع‌بندی و سه تمرین کوچک",
      body: buildStructuredSectionBody({
        opening: input.integrationText || fallbackBody,
        body: undefined,
        reflection: "از کل گزارش فقط یک تمرین را برای این هفته نگه دار؛ کدام تمرین هم واقعی است و هم قابل ادامه؟",
        closing: buildFinalSynthesisClosing(input),
      }),
    },
  ].filter((section): section is ReportOutputSection => section !== null));
}

type StructuredSectionBodyInput = {
  opening: string;
  chapterSummary?: string;
  readerCue?: string;
  body: string | undefined;
  reflection?: string;
  closing?: string;
};

function buildStructuredSectionBody({
  opening,
  chapterSummary,
  readerCue,
  body,
  reflection,
  closing,
}: StructuredSectionBodyInput): string {
  const chapterSummaryText = chapterSummary ? `خلاصه فصل: ${chapterSummary}` : undefined;
  const readerCueText = readerCue ? `چطور بخوانی: ${readerCue}` : undefined;
  const reflectionText = reflection ? `برای تأمل: ${reflection}` : undefined;

  return [readerCueText, opening, chapterSummaryText, body, reflectionText, closing]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map(sanitizeUserFacingReportText)
    .join("\n\n");
}

function buildFinalSynthesisClosing(input: RealEngineSectionTextInput): string {
  return "چارت قرار نیست جای تو تصمیم بگیرد؛ فقط چند زاویه برای دیدن خودت با آرامش و صداقت بیشتر باز می‌کند.";
}

function buildRealEngineReflectionPrompts(input: RealEngineSectionTextInput): string {
  const prompts = [
    "۱) از بخش هویت شروع کن: کدام جمله واقعاً به حس مسیر و حضور تو نزدیک است؟",
    "۲) بعد سراغ ماه برو: کدام نیاز عاطفی را بهتر است زودتر و مهربان‌تر بشناسی؟",
    "۳) عطارد، زهره و مریخ را مثل سه ابزار روزمره بخوان: فکر، ارزش و عمل کجا با هم هماهنگ‌اند و کجا نه؟",
    "۴) دست‌های ماه را مثل نسبت میان عادت آشنا و تمرین تازه بخوان؛ کدام دعوت کوچک برای رشد دیده می‌شود؟",
    "۵) روابط سیاره‌ها را مثل گفت‌وگوی درونی ببین و با زبان روزمره بنویس: آیا این رابطه حمایت می‌سازد، کشش می‌آورد، یا مهارت تازه می‌خواهد؟",
    "۶) از خانه‌های پررنگ گزارش یک میدان زندگی انتخاب کن و ببین کدام رفتار کوچک می‌تواند آن را قابل مشاهده‌تر کند.",
    "۷) از سه نخ اصلی گزارش یک انتخاب کوچک برای این هفته بردار؛ چیزی که متن را به تجربه قابل مشاهده تبدیل کند.",
  ];
  const closing =
    input.integrationText || input.aspectText
      ? "این تمرین کوتاه برای تأمل است، نه برای گرفتن حکم قطعی از چارت."
      : "اگر بخشی هنوز مبهم است، آن را به‌عنوان دعوت به مشاهده آرام‌تر نگه دار.";

  return [prompts.join(" "), closing].join(" ");
}

function joinPersianList(items: string[]): string {
  const filteredItems = items.filter((item) => typeof item === "string" && item.trim().length > 0);

  if (filteredItems.length <= 2) {
    return filteredItems.join(" و ");
  }

  return `${filteredItems.slice(0, -1).join("، ")} و ${filteredItems[filteredItems.length - 1]}`;
}

function joinSectionBody(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function formatSignHouseLabel(placement: RealEngineReportPlacement): string {
  const sign = SIGN_COPY[placement.signId];
  const house = isReportHouseNumber(placement.house)
    ? ` خانه ${toPersianNumber(placement.house)}`
    : "";

  return `${sign.faName}${house}`;
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
