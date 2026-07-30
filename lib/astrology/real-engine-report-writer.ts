import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportAngleId,
  RealEngineReportAngles,
  RealEngineReportCalculatedLilith,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportAspect,
  RealEngineChartSignature,
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
  buildRealEngineHouseEmphasis,
  type RealEngineHouseEmphasis,
  type RealEngineHouseEmphasisReason,
} from "@/lib/astrology/real-engine-house-emphasis";
import {
  buildRealEngineNarrativeSynthesisProfile,
  selectThreeDomainNarrativePractices,
  type RealEngineChartBalanceProfile,
  type RealEngineNarrativeCluster,
  type RealEngineNarrativeSynthesisProfile,
  type RealEngineNodeAxisSynthesis,
  type RealEnginePracticeCandidate,
} from "@/lib/astrology/real-engine-narrative-synthesis";
import {
  buildAspectBehavioralInterpretation,
  buildPlacementBehavioralInterpretation,
  isBehavioralAspectInput,
  isBehavioralPlacementInput,
  type AspectBehavioralInterpretation,
  type BehavioralSynthesisRole,
} from "@/lib/astrology/report-behavioral-interpretation";
import {
  getSnapshotBehavioralAudienceMode,
  resolveBehavioralAudienceMode,
  selectPlacementMajorAspectModifier,
} from "@/lib/astrology/report-behavioral-context";
import type { ReportOutputSection } from "@/types/report-output";
import { applyHalleusReportVoice } from "@/lib/report-quality/tone-profile";

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
  const aspectSelectionContext = buildAspectSelectionContext(
    chartSpineDraft,
    realEngine,
  );
  const narrativeProfile = buildRealEngineNarrativeSynthesisProfile({
    aspects: allAspects,
    placements: realEngine.placements,
    chartRulerId: chartSpineDraft.chartRulerId,
    activeHouseNumbers: chartSpineDraft.activeHouses.map(
      (activeHouse) => activeHouse.house.number,
    ),
    retrogradePlanetIds:
      realEngine.retrogrades?.status === "calculated"
        ? realEngine.retrogrades.planetIds
        : [],
    lunarNodes: realEngine.lunarNodes,
    houseEmphasis: chartSpineDraft.activeHouses,
    chartSignature: realEngine.chartSignature,
  });
  const aspectHighlights = selectNarrativeAspectHighlights(
    allAspects,
    aspectSelectionContext,
    {
      limit: narrativeProfile.relationshipLimit,
      primaryAspect:
        narrativeProfile.mode === "tension-led"
          ? narrativeProfile.primaryAspect
          : undefined,
      forceDynamicAnchor: narrativeProfile.mode === "tension-led",
    },
  );
  const primaryAnchor =
    narrativeProfile.mode === "tension-led"
      ? narrativeProfile.primaryAspect
      : undefined;
  const behavioralAudienceMode =
    realEngine.behavioralAudienceMode ??
    resolveBehavioralAudienceMode(
      report.input.birthDate,
      realEngine.generatedAt,
    );
  const realEngineWithAspects: RealEngineReportSnapshot = {
    ...realEngine,
    behavioralAudienceMode,
    aspects: allAspects,
    aspectHighlights,
  };
  const chartSpine = buildChartSpine(
    realEngineWithAspects,
    aspectHighlights,
    primaryAnchor,
  );
  const synthesisPlan = buildRealEngineSynthesisPlan({
    aspects: aspectHighlights,
    placements: realEngineWithAspects.placements,
    chartRulerId: chartSpine.chartRulerId,
    activeHouseNumbers: chartSpine.activeHouses.map(
      (activeHouse) => activeHouse.house.number,
    ),
    retrogradePlanetIds:
      realEngineWithAspects.retrogrades?.status === "calculated"
        ? realEngineWithAspects.retrogrades.planetIds
        : [],
    houseEmphasis: chartSpine.activeHouses,
    lunarNodes: realEngineWithAspects.lunarNodes,
    narrativeProfile,
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
  const personalOpening = sanitizeUserFacingReportText(buildPersonalOpening({
    name: report.input.name ?? "",
    risingSign,
    chartRulerId: chartSpine.chartRulerId,
    chartRulerPlacement: chartSpine.chartRulerPlacement,
    activeHouseNumber: chartSpine.activeHouses[0]?.house.number,
    chartSignature: realEngineWithAspects.chartSignature,
    synthesisPlan,
  }));

  const sunText = buildCorePlacementText(sun, "sun", realEngineWithAspects);
  const moonText = buildCorePlacementText(moon, "moon", realEngineWithAspects);
  const coreSynthesisText = buildCoreSynthesisThread(
    sun,
    moon,
    risingSign,
    realEngineWithAspects,
  );
  const risingText = buildRisingText(
    risingSign,
    chartSpine.ascendantDegreeInSign,
    realEngine.houseContext,
  );
  const chartRulerText = buildChartRulerText(chartSpine, realEngineWithAspects);
  const activeHouseText = buildActiveHousesText(chartSpine);
  const balanceText = buildChartBalanceText(
    realEngineWithAspects,
    synthesisPlan.narrativeProfile.balance,
  );
  const houseText = buildHouseContextText(realEngine.houseContext, risingSign);
  const houseAnglesText = buildHouseAnglesText(realEngineWithAspects);
  const retrogradeText = buildRetrogradeText(realEngineWithAspects, chartSpine);
  const lunarNodeText = buildLunarNodeText(
    realEngineWithAspects,
    chartSpine,
    synthesisPlan.narrativeProfile.nodeAxis,
  );
  const natalAccuracyText = buildNatalAccuracyText(realEngineWithAspects);
  const mercuryText = buildOptionalPlacementText(mercury, "mercury", realEngineWithAspects);
  const venusText = buildOptionalPlacementText(venus, "venus", realEngineWithAspects);
  const marsText = buildOptionalPlacementText(mars, "mars", realEngineWithAspects);
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
  const themeChapters = buildReportThemeChapters(
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
    personalOpening,
    summary,
    firstSynthesisText,
    integrationText,
  ].filter(Boolean).map((text) => sanitizeUserFacingReportText(text as string));
  const interpretationSections = buildRealEngineInterpretationSections({
    personalOpening,
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
    themeChapters,
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
  return applyHalleusReportVoice(text)
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
  personalOpening: string;
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
  themeChapters?: ReportOutputSection[];
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


type ChartSpineActiveHouse = RealEngineHouseEmphasis;

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
  primaryAnchor?: RealEngineReportAspect,
): ChartSpine {
  const risingSign =
    realEngine.angles?.asc?.signId ??
    signFromLongitude(realEngine.ascendantLongitude);
  const ascendantDegreeInSign =
    typeof realEngine.angles?.asc?.degreeInSign === "number"
      ? realEngine.angles.asc.degreeInSign
      : degreeInSignFromLongitude(realEngine.ascendantLongitude);
  const chartRulerId = CHART_RULER_BY_RISING[risingSign];
  const chartRulerPlacement = findPlacement(realEngine, chartRulerId);
  const activeHouses = buildChartSpineActiveHouses(
    realEngine,
    chartRulerId,
    primaryAnchor,
  );
  const activeHouseNumbers = new Set<ReportHouseNumber>(
    activeHouses.map((activeHouse) => activeHouse.house.number),
  );
  const rankedCentralAspects = prioritizeRealEngineAspects(
    aspects,
    {
      risingSign,
      ascendantDegreeInSign,
      chartRulerId,
      chartRulerPlacement,
      chartRulerAspects: [],
      activeHouses,
      signClusters: [],
      houseClusters: [],
      centralAspects: [],
    },
    realEngine,
  );
  const centralAspects = primaryAnchor
    ? [
        primaryAnchor,
        ...rankedCentralAspects.filter(
          (aspect) => aspect.id !== primaryAnchor.id,
        ),
      ].slice(0, 4)
    : rankedCentralAspects.slice(0, 4);
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
    houseClusters: buildChartSpineHouseClusters(
      realEngine.placements,
      activeHouseNumbers,
    ),
    centralAspects,
  };
}

function buildChartSpineActiveHouses(
  realEngine: RealEngineReportSnapshot,
  chartRulerId: string,
  primaryAnchor?: RealEngineReportAspect,
): ChartSpineActiveHouse[] {
  return buildRealEngineHouseEmphasis({
    houses: realEngine.houses,
    placements: realEngine.placements,
    chartRulerId,
    lunarNodes: realEngine.lunarNodes,
    primaryAnchor,
  });
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

export function buildChartRulerText(
  chartSpine: ChartSpine,
  realEngine: RealEngineReportSnapshot,
): string | undefined {
  const rulerLabel = getPlanetLabel(chartSpine.chartRulerId);
  const risingLabel = formatSignLabel(SIGN_COPY[chartSpine.risingSign]);
  const placement = chartSpine.chartRulerPlacement;
  const rulerNeed = getPersonalOpeningPlanetNeed(chartSpine.chartRulerId);

  if (!placement) {
    return [
      `ممکن است در شروع‌ها و انتخاب‌های مهم، نیاز به ${rulerNeed} را زودتر از بقیهٔ نیازها حس کنی، اما دادهٔ فعلی برای گفتن اینکه این نیرو دقیقاً در کدام میدان زندگی عمل می‌کند کافی نیست.`,
      `این برداشت محدود از رایزینگ ${risingLabel} می‌آید؛ در این چارت ${rulerLabel} سیارهٔ راهبر است، اما جایگاه ذخیره‌شدهٔ آن حاضر نیست و هیچ نشان یا خانه‌ای برایش حدس زده نمی‌شود.`,
      "برای دیدن این الگو در زندگی واقعی، فقط یک شروع یا تصمیم را ثبت کن و ببین پیش از حرکت، کدام نیاز می‌خواهد جهت را در دست بگیرد.",
    ].join(" ");
  }

  const interpretation = buildPlacementBehavioralInterpretation({
    planetId: chartSpine.chartRulerId,
    signId: placement.signId,
    houseNumber: placement.house,
    retrograde:
      realEngine.retrogrades?.status === "calculated" &&
      realEngine.retrogrades.planetIds.includes(chartSpine.chartRulerId),
    audienceMode: getSnapshotBehavioralAudienceMode(realEngine),
    majorAspect: selectPlacementMajorAspectModifier(
      chartSpine.chartRulerId,
      realEngine.aspectHighlights,
    ),
  });
  const focusField = isReportHouseNumber(placement.house)
    ? HOUSE_SYNTHESIS_FIELD[placement.house]
    : "شروع‌ها و انتخاب‌های روزمره";
  const placementSign = SIGN_COPY[placement.signId];

  return [
    `ممکن است هنگام شروع یا تصمیم‌گیری، در میدان ${focusField} خیلی زود تلاش کنی ${rulerNeed} را با ریتم ${placementSign.energy} جلو ببری.`,
    `زیر فشار، ممکن است ${interpretation.possibleFriction} پررنگ‌تر شود؛ در شکل سالم‌تر، ${interpretation.healthyExpression} راه حرکت را قابل‌اعتمادتر می‌کند.`,
    `این الگو از ${rulerLabel} در ${formatPlacementWithHouse(placement)} می‌آید؛ چون رایزینگ ${risingLabel} است، ${rulerLabel} سیارهٔ راهبر چارت و یکی از مسیرهای اصلی بیرونی شدن انتخاب‌هاست.`,
    `برای دیدن این الگو در زندگی واقعی، ${interpretation.smallExperiment}.`,
  ].join(" ");
}

export function buildActiveHousesText(chartSpine: ChartSpine): string | undefined {
  if (chartSpine.activeHouses.length === 0) {
    return undefined;
  }

  const houses = chartSpine.activeHouses
    .slice(0, 4)
    .map((activeHouse) =>
      buildChartSpineActiveHouseNarrative(activeHouse),
    );

  return houses.join("\n\n");
}

function buildChartSpineActiveHouseNarrative(
  activeHouse: ChartSpineActiveHouse,
): string {
  const houseNumber = activeHouse.house.number;
  const copy = HOUSE_COPY[houseNumber];
  const houseLabel = toPersianNumber(houseNumber);
  const reasonText = buildHouseEmphasisReasonText(activeHouse);
  const focusField = HOUSE_SYNTHESIS_FIELD[houseNumber];
  const specialTheme = buildSpecialActiveHouseNarrative(houseNumber);
  const livedExperience = `ممکن است موضوع ${focusField} بیشتر از بعضی میدان‌های دیگر به تصمیم‌ها، رابطه‌ها یا واکنش‌های روزمره‌ات برگردد.`;
  const meaningText = specialTheme
    ? specialTheme
    : copy
      ? `در شکل سازنده، ${copy.gift} می‌تواند از این میدان بیرون بیاید؛ تمرینش ${copy.growth}.`
      : "این میدان زندگی به‌دلیل شواهد محاسبه‌شده وزن بیشتری گرفته و بهتر است با نمونه‌های واقعی سنجیده شود.";
  const reflection =
    HOUSE_REFLECTIONS[houseNumber] ??
    "این میدان زندگی الان چه تمرین کوچک و واقعی می‌خواهد؟";

  return [
    livedExperience,
    meaningText,
    `این تأکید از خود چارت می‌آید: ${trimSentenceEnd(reasonText)}.`,
    `برای دیدن خانه ${houseLabel} در زندگی واقعی، ${reflection}`,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join(" ");
}

function buildHouseEmphasisReasonText(
  activeHouse: ChartSpineActiveHouse,
): string {
  const houseLabel = toPersianNumber(activeHouse.house.number);
  const concentration = findHouseReason(
    activeHouse,
    "planetary-concentration",
  );
  const chartRuler = findHouseReason(activeHouse, "chart-ruler-house");
  const northNode = findHouseReason(activeHouse, "north-node-house");
  const southNode = findHouseReason(activeHouse, "south-node-house");
  const luminary = findHouseReason(activeHouse, "luminary-house");
  const majorAspect = findHouseReason(activeHouse, "major-aspect-house");
  const placement = findHouseReason(activeHouse, "placement-house");
  const angle = findHouseReason(activeHouse, "angle-house");
  const sentences: string[] = [];

  if (concentration) {
    const labels = joinReasonPlanetLabels(concentration);
    sentences.push(
      `خانه ${houseLabel} به‌دلیل جمع شدن ${
        labels || "چند سیاره"
      } یک تمرکز سیاره‌ای واقعی دارد${
        chartRuler
          ? "؛ حاکم چارت نیز در همین خانه قرار دارد و روی شروع‌ها و انتخاب‌های روزمره وزن بیشتری می‌گیرد"
          : ""
      }.`,
    );
  } else if (chartRuler) {
    sentences.push(
      `خانه ${houseLabel} به‌دلیل حضور حاکم چارت روی شروع‌ها و انتخاب‌های روزمره وزن بیشتری می‌گیرد.`,
    );
  }

  if (northNode) {
    sentences.push(
      `این خانه جهت رشد و تمرین تازه را نشان می‌دهد؛ نه اینکه الزاماً شلوغ‌ترین میدان چارت باشد.`,
    );
  } else if (southNode) {
    sentences.push(
      `این خانه یک الگوی آشنا یا پاسخ قدیمی را نشان می‌دهد؛ نه تمرکز سیاره‌ای اصلی.`,
    );
  }

  if (majorAspect && sentences.length < 2) {
    const labels = joinReasonPlanetLabels(majorAspect);
    sentences.push(
      `${labels || "یکی از نیروهای این خانه"} در کشمکش اصلی گزارش حضور دارد و این میدان را به خانهٔ مرتبط دیگری وصل می‌کند.`,
    );
  }

  if (luminary && sentences.length < 2) {
    const labels = joinReasonPlanetLabels(luminary);
    sentences.push(
      `${labels || "یکی از دو نور اصلی چارت"} در این خانه قرار دارد و آن را به هویت یا امنیت عاطفی نزدیک می‌کند.`,
    );
  }

  if (placement && sentences.length < 2) {
    const labels = joinReasonPlanetLabels(placement);
    sentences.push(
      `${labels || "یک جایگاه محاسبه‌شده"} نیز در این خانه قرار دارد و موضوع آن را در رفتار روزمره قابل مشاهده‌تر می‌کند.`,
    );
  }

  if (angle && sentences.length < 2) {
    const angleLabels = joinPersianList(
      (angle.angleIds ?? []).map(
        (angleId) => ANGLE_COPY[angleId].faName,
      ),
    );
    sentences.push(
      `${angleLabels || "یکی از محورهای اصلی چارت"} به این خانه جهت بیشتری می‌دهد.`,
    );
  }

  if (sentences.length === 0) {
    return `خانه ${houseLabel} به‌دلیل شواهد محاسبه‌شدهٔ این چارت وزن بیشتری گرفته است.`;
  }

  return sentences.slice(0, 2).join(" ");
}

function findHouseReason(
  activeHouse: ChartSpineActiveHouse,
  reasonId: RealEngineHouseEmphasisReason["id"],
): RealEngineHouseEmphasisReason | undefined {
  return activeHouse.reasons.find((reason) => reason.id === reasonId);
}

function joinReasonPlanetLabels(
  reason: RealEngineHouseEmphasisReason,
): string {
  return joinPersianList(
    (reason.planetIds ?? []).map(getPlanetLabel),
  );
}

function buildSpecialActiveHouseNarrative(
  houseNumber: ReportHouseNumber,
): string | undefined {
  if (houseNumber === 6) {
    return "در شکل سازنده، این تأکید می‌تواند نیت خوب را به مراقبت عملی تبدیل کند؛ زیر فشار، خطرش این است که اصلاح به سخت‌گیری با خودت تبدیل شود.";
  }

  if (houseNumber === 8) {
    return "در شکل سازنده، این تأکید می‌تواند صمیمیت و اعتماد را عمیق‌تر کند؛ زیر فشار، کنترل یا آزمودن پنهانی دیگری ممکن است جای گفت‌وگوی روشن را بگیرد.";
  }

  if (houseNumber === 2) {
    return "در شکل سازنده، این تأکید می‌تواند ثبات و ارزش شخصی را از انتخاب‌های واقعی بسازد؛ زیر فشار، ترس از دست دادن امنیت ممکن است خواستهٔ واقعی را عقب بیندازد.";
  }

  if (houseNumber === 5) {
    return "در شکل سازنده، این تأکید می‌تواند به بیان صادقانه و خلاقیت جان بدهد؛ زیر فشار، نیاز به تأیید ممکن است لذت خودِ تجربه را کم‌رنگ کند.";
  }

  if (houseNumber === 10) {
    return "در شکل سازنده، این تأکید می‌تواند جهت بلندمدت را به مسئولیتی قابل ادامه تبدیل کند؛ زیر فشار، نقش بیرونی ممکن است بیشتر از نیاز شخصی وزن بگیرد.";
  }

  return undefined;
}

export function buildChartBalanceText(
  realEngine: RealEngineReportSnapshot,
  balance: RealEngineChartBalanceProfile,
): string | undefined {
  if (!realEngine.placements.length) {
    return undefined;
  }

  const elementInterpretation = buildElementBalanceInterpretation(balance);
  const modalityInterpretation = buildModalityBalanceInterpretation(balance);
  const expressionInterpretation = buildExpressionBalanceInterpretation(balance);
  const evidenceParts = [
    balance.dominantElement
      ? `عنصر غالب ${ELEMENT_LABELS[balance.dominantElement]}`
      : undefined,
    balance.dominantModality
      ? `کیفیت غالب ${MODALITY_LABELS[balance.dominantModality]}`
      : undefined,
    balance.dominantExpression === "active"
      ? "ریتم بیان فعال"
      : balance.dominantExpression === "receptive"
        ? "ریتم بیان پذیرا"
        : undefined,
  ].filter((part): part is string => Boolean(part));
  const dominantEvidence = [
    balance.dominantElement
      ? `${ELEMENT_LABELS[balance.dominantElement]} پررنگ‌تر است`
      : "عنصرها در این چارت توازن نسبی دارند",
    balance.dominantModality
      ? `کیفیت ${MODALITY_LABELS[balance.dominantModality]} پررنگ‌تر است`
      : "کیفیت‌های آغازگر، پایدار و انعطاف‌پذیر توازن نسبی دارند",
    balance.dominantExpression === "active"
      ? "ریتم فعال پررنگ‌تر است"
      : balance.dominantExpression === "receptive"
        ? "ریتم پذیرا پررنگ‌تر است"
        : "ریتم فعال و پذیرا در این چارت توازن نسبی دارند",
  ];
  const evidenceSentence = evidenceParts.length > 0
    ? `این برداشت از کنار هم گذاشتن ${joinPersianList(evidenceParts)} در جایگاه‌های اصلی چارت به دست آمده است: ${dominantEvidence.join("؛ ")}؛ کم‌حضور بودن یک کیفیت به معنی نقص یا ناتوانی نیست.`
    : `این برداشت از توزیع نسبتاً متعادل عنصرها، کیفیت‌ها و شیوهٔ بیان انرژی در جایگاه‌های اصلی چارت به دست آمده است: ${dominantEvidence.join("؛ ")}.`;
  const observation = buildBalanceObservation(balance);

  return [
    elementInterpretation,
    modalityInterpretation,
    expressionInterpretation,
    evidenceSentence,
    observation,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function buildElementBalanceInterpretation(
  balance: RealEngineChartBalanceProfile,
): string {
  const experience = balance.dominantElement === "air"
    ? "ممکن است پیش از آنکه یک تجربه را در بدن یا عمل حس کنی، اول آن را در ذهنت باز کنی و از چند زاویه ببینی."
    : balance.dominantElement === "fire"
      ? "ممکن است شروع کردن و روشن کردن موج اول حرکت برایت طبیعی‌تر از آهسته ادامه دادن و نگه داشتن همان انرژی باشد."
      : balance.dominantElement === "earth"
        ? "ممکن است وقتی چیزی قابل لمس، قابل اندازه‌گیری یا قابل اتکا نیست، دیرتر به آن اعتماد کنی و برای حرکت به نشانه‌ای واقعی نیاز داشته باشی."
        : balance.dominantElement === "water"
          ? "ممکن است حال‌وهوای فضا و آدم‌ها را پیش از آنکه چیزی مستقیم گفته شود دریافت کنی و برای جدا کردن حس خودت از دیگری به زمان نیاز داشته باشی."
          : "ممکن است بسته به موقعیت، گاهی از فکر، گاهی از احساس و گاهی از عمل وارد تجربه شوی و یک مسیر ثابت همیشه جلوتر نباشد.";
  const lowElement = balance.zeroElements[0] ?? balance.lowElements[0];
  const practice = lowElement === "water"
    ? "کم‌حضور بودن آب به معنی بی‌احساسی نیست؛ نام‌گذاری و بیان مستقیم احساس ممکن است به تمرین آگاهانه‌تری نیاز داشته باشد"
    : lowElement === "earth"
      ? "کم‌حضور بودن زمین یعنی توجه به بدن، روتین و پیگیری آرام ممکن است به ساختن عمدی‌تری نیاز داشته باشد"
      : lowElement === "air"
        ? "کم‌حضور بودن هوا یعنی فاصله گرفتن و دیدن چند زاویه ممکن است به مکث آگاهانه‌تری نیاز داشته باشد"
        : lowElement === "fire"
          ? "کم‌حضور بودن آتش یعنی آغاز، ریسک سنجیده و ابراز مستقیم خواسته ممکن است در قدم‌های کوچک آسان‌تر ساخته شود"
          : undefined;

  return practice ? `${experience} در سوی کم‌حضورتر این ترکیب، ${practice}.` : experience;
}

function buildModalityBalanceInterpretation(
  balance: RealEngineChartBalanceProfile,
): string {
  if (balance.dominantModality === "fixed") {
    return "وقتی تصمیمی می‌گیری، ماندن و حفظ مسیر می‌تواند نقطهٔ قوتت باشد؛ بخش دشوارتر ممکن است تشخیص لحظه‌ای باشد که ادامه دادن دیگر با نیاز واقعی تو هماهنگ نیست.";
  }

  if (balance.dominantModality === "cardinal") {
    return "ممکن است در شروع‌ها سریع‌تر از دیگران جهت بگیری، اما ارزش واقعی این ریتم زمانی دیده می‌شود که بعد از موج اول هم چیزی را ادامه بدهی.";
  }

  if (balance.dominantModality === "mutable") {
    return "ممکن است تغییر مسیر و سازگار شدن برایت آسان‌تر باشد، اما گاهی همین انعطاف تصمیم نهایی یا تمام کردن یک مسیر را عقب بیندازد.";
  }

  return "ریتم حرکتت احتمالاً با موضوع تغییر می‌کند؛ بعضی جاها شروع می‌کنی، بعضی جاها می‌مانی و بعضی جاها زودتر مسیر را تنظیم می‌کنی.";
}

function buildExpressionBalanceInterpretation(
  balance: RealEngineChartBalanceProfile,
): string {
  if (balance.dominantExpression === "active") {
    return "ممکن است تجربه‌ات زمانی روشن‌تر شود که آن را به اقدام، گفتن یا اثر گذاشتن تبدیل کنی؛ مکث پیش از پاسخ کمک می‌کند حرکت فقط واکنش لحظه‌ای نباشد.";
  }

  if (balance.dominantExpression === "receptive") {
    return "ممکن است ابتدا مشاهده کنی، فضا را جذب کنی و بعد به نتیجه برسی؛ بیان مستقیم خواسته کمک می‌کند پردازش درونی به فاصله یا سکوت ناخواسته تبدیل نشود.";
  }

  return "می‌توانی میان اقدام و دریافت جابه‌جا شوی؛ مسئله بیشتر این است که در هر موقعیت تشخیص بدهی کدام ریتم واقعاً لازم است.";
}

function buildBalanceObservation(
  balance: RealEngineChartBalanceProfile,
): string {
  const observation = balance.dominantElement === "air"
    ? "یک تصمیم را انتخاب کن و ببین بعد از تحلیل، چه نشانهٔ بدنی و چه اقدام مشخصی هنوز جا مانده است"
    : balance.dominantElement === "fire"
      ? "یک شروع تازه را انتخاب کن و ببین برای ادامه دادن بعد از موج اول چه ریتم کوچکی لازم داری"
      : balance.dominantElement === "earth"
        ? "در یک برنامهٔ امن بررسی کن کدام بخش واقعاً مفید است و کدام بخش فقط چون آشناست تغییر نمی‌کند"
        : balance.dominantElement === "water"
          ? "در یک موقعیت عاطفی جدا بنویس چه چیزی را حس کردی، چه چیزی را از دیگری دریافت کردی و درخواست خودت چیست"
          : "یک موقعیت را ثبت کن و ببین فکر، احساس، بدن و عمل به چه ترتیبی وارد آن شدند";

  return `برای دیدن این ترکیب در زندگی واقعی، ${observation}.`;
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

type PersonalOpeningInput = {
  name: string;
  risingSign: ZodiacKey;
  chartRulerId: string;
  chartRulerPlacement?: RealEngineReportPlacement;
  activeHouseNumber?: number;
  chartSignature?: RealEngineChartSignature;
  synthesisPlan?: RealEngineSynthesisPlan;
};

const PERSONAL_OPENING_HOUSE_EXPERIENCES: Record<number, string> = {
  1: "شاید در شروع موقعیت‌ها خیلی زود خودت را جمع‌وجور کنی و تصمیم بگیری چه تصویری از تو دیده شود، حتی وقتی هنوز درونت به نتیجه نرسیده است",
  2: "ممکن است آرامش تو بیشتر از چیزی که دیگران می‌بینند به حس امنیت، ارزش شخصی و قابل‌اتکا بودن شرایط وابسته باشد",
  3: "شاید ذهنت پیش از آنکه یک تجربه را کامل حس کنی، شروع به نام‌گذاری، مقایسه یا پیدا کردن چند توضیح مختلف برای آن کند",
  4: "ممکن است از بیرون آرام‌تر از چیزی که درونت می‌گذرد به نظر برسی و پیش از نزدیک شدن، ناخودآگاه بسنجی این فضا واقعاً امن است یا نه",
  5: "شاید هم بخواهی دیده شوی و خودت را بی‌واسطه نشان بدهی و هم درست نزدیک لحظهٔ بیان، بخشی از تو نگران قضاوت یا از دست دادن کنترل شود",
  6: "ممکن است وقتی زندگی نامنظم می‌شود، خیلی زود سراغ درست کردن جزئیات بروی و نیازهای خودت را تا بعد از انجام کارها عقب بیندازی",
  7: "شاید نزدیکی را عمیق بخواهی، اما وقتی رابطه جدی‌تر می‌شود بخشی از تو برای حفظ مرزها یا اطمینان از امنیتش کمی عقب برود",
  8: "ممکن است صمیمیت را سطحی نخواهی، اما برای اعتماد کردن بیشتر از چیزی که دیگران می‌بینند زمان و نشانهٔ واقعی بخواهی",
  9: "شاید وقتی تجربه‌ای برایت معنا نداشته باشد، حتی موفقیت یا آرامش ظاهری هم نتواند برای مدت زیادی تو را راضی نگه دارد",
  10: "ممکن است دیگران تو را محکم و قابل‌اتکا ببینند، حتی وقتی درونت هنوز مطمئن نیست چه‌قدر از مسئولیت‌هایی که حمل می‌کنی واقعاً مال توست",
  11: "شاید حتی وقتی میان آدم‌ها هستی، بخشی از تو همچنان منتظر بماند تا واقعاً دیده یا فهمیده شود",
  12: "شاید گاهی برای آرام شدن به خلوت پناه ببری، اما همان خلوت اگر طولانی شود فاصله‌ای بسازد که خودت هم قصدش را نداشتی",
};

const PERSONAL_OPENING_HOUSE_OBSERVATIONS: Record<number, string> = {
  1: "پیش از واکنش اول، یک لحظه ببین واقعاً چه می‌خواهی و چه بخشی فقط می‌خواهد تصویر امن‌تری بسازد",
  2: "در یک تصمیم کوچک بررسی کن آیا انتخابت از ارزش واقعی می‌آید یا فقط از ترس از دست دادن ثبات",
  3: "پیش از پیدا کردن توضیح بعدی، یک بار همان تجربه را با یک جمله ساده و مستقیم نام ببر",
  4: "وقتی عقب می‌روی، بررسی کن واقعاً به خلوت نیاز داری یا هنوز مطمئن نشده‌ای که این فضا امن است",
  5: "یک چیز کوچک را فقط برای لذت و بیان خودت نشان بده، نه برای گرفتن تأیید یا کامل بودن",
  6: "در میان کارهای روزمره یک نیاز بدنی یا عاطفی خودت را هم مثل یک وظیفه واقعی جدی بگیر",
  7: "پیش از فاصله گرفتن، خواسته و مرزت را با یک جمله روشن و بدون توضیح اضافه بیان کن",
  8: "به جای آزمودن پنهانی دیگری، یک نشانه مشخص از اعتماد یا مرز را مستقیم درخواست کن",
  9: "ببین کدام باور به تو جهت می‌دهد و کدام باور فقط اجازه نمی‌دهد تجربه تازه‌ای را امتحان کنی",
  10: "یکی از مسئولیت‌هایت را بررسی کن و ببین انجام دادنش انتخاب توست یا فقط به نقش همیشگی‌ات وفادار مانده‌ای",
  11: "در یک جمع، به جای سنجیدن اینکه پذیرفته شده‌ای یا نه، یک علاقه یا نظر واقعی خودت را آشکار کن",
  12: "برای خلوتت پایان مشخص بگذار تا استراحت به قطع ارتباط ناخواسته تبدیل نشود",
};

const PERSONAL_OPENING_ELEMENT_RESOURCES: Record<
  NonNullable<RealEngineChartSignature["dominantElement"]>,
  string
> = {
  fire: "جرئت شروع کردن و زنده کردن چیزی که هنوز شکل کامل نگرفته",
  earth: "ساختن ریتم قابل‌اتکا و تبدیل قصد به نتیجه‌ای که در زندگی واقعی دیده می‌شود",
  air: "دیدن ارتباط‌ها و پیدا کردن زبان برای چیزی که هنوز مبهم است",
  water: "دریافت لایه‌های عاطفی و ساختن پیوندی که در سطح متوقف نمی‌ماند",
};

const PERSONAL_OPENING_ASPECT_EVIDENCE: Record<string, string> = {
  conjunction: "هم‌نشینی",
  sextile: "فرصت همکاری",
  square: "رابطهٔ تنشی",
  trine: "رابطهٔ روان و حمایتی",
  opposition: "کشش میان دو قطب",
};

function getPersonalOpeningPlanetNeed(planetId: string): string {
  return (
    PLANET_SYNTHESIS_NEED_SHORT[planetId] ??
    PLANET_SYNTHESIS_NEED[planetId] ??
    PLANET_COPY[planetId]?.role ??
    "یک نیاز مهم"
  );
}

function selectDistinctPersonalOpeningAspects(
  synthesisPlan: RealEngineSynthesisPlan | undefined,
): {
  challenge?: RealEngineReportAspect;
  support?: RealEngineReportAspect;
  dailyBridge?: RealEngineReportAspect;
} {
  const challenge = synthesisPlan?.primaryChallenge;
  const usedIds = new Set(
    [challenge?.id].filter((id): id is string => typeof id === "string"),
  );
  const support =
    synthesisPlan?.primarySupport &&
    !usedIds.has(synthesisPlan.primarySupport.id)
      ? synthesisPlan.primarySupport
      : undefined;
  if (support) {
    usedIds.add(support.id);
  }
  const dailyBridge =
    synthesisPlan?.dailyBridge &&
    !usedIds.has(synthesisPlan.dailyBridge.id)
      ? synthesisPlan.dailyBridge
      : undefined;

  return { challenge, support, dailyBridge };
}

function getPersonalOpeningFocusHouse({
  synthesisPlan,
  activeHouseNumber,
  chartRulerPlacement,
}: {
  synthesisPlan: RealEngineSynthesisPlan | undefined;
  activeHouseNumber: number | undefined;
  chartRulerPlacement: RealEngineReportPlacement | undefined;
}): ReportHouseNumber | undefined {
  const candidates = [
    synthesisPlan?.primaryHouseNumber,
    activeHouseNumber,
    chartRulerPlacement?.house,
  ];

  return candidates.find(isReportHouseNumber);
}

function buildPersonalOpeningContrastSentence({
  risingSign,
  chartRulerId,
  challenge,
}: {
  risingSign: ZodiacKey;
  chartRulerId: string;
  challenge: RealEngineReportAspect | undefined;
}): string {
  const rising = SIGN_COPY[risingSign];

  if (!challenge) {
    return `ممکن است از بیرون ${rising.energy} به نظر برسی، اما درونت برای ${getPersonalOpeningPlanetNeed(chartRulerId)} به فضایی نیاز داشته باشد که با ریتم خودت هماهنگ باشد.`;
  }

  const firstNeed = getPersonalOpeningPlanetNeed(challenge.firstPlanetId);
  const secondNeed = getPersonalOpeningPlanetNeed(challenge.secondPlanetId);
  const closing =
    challenge.aspectId === "conjunction"
      ? "این دو نیاز گاهی آن‌قدر به هم گره می‌خورند که تشخیص اینکه کدام یکی جلوتر است سخت می‌شود"
      : challenge.aspectId === "square" || challenge.aspectId === "opposition"
        ? "برای همین بعضی تصمیم‌ها ممکن است از بیرون ساده به نظر برسند، اما درونت به زمان بیشتری نیاز داشته باشد تا هیچ‌کدام نادیده نماند"
        : "این دو نیاز معمولاً راه همکاری پیدا می‌کنند، هرچند ممکن است چون طبیعی‌اند نقششان را کمتر ببینی";

  return `ممکن است از بیرون ${rising.energy} به نظر برسی، اما درونت هم‌زمان هم ${firstNeed} را بخواهد و هم ${secondNeed} را؛ ${closing}.`;
}

function buildPersonalOpeningResourceSentence({
  support,
  chartSignature,
  risingSign,
}: {
  support: RealEngineReportAspect | undefined;
  chartSignature: RealEngineChartSignature | undefined;
  risingSign: ZodiacKey;
}): string {
  if (support) {
    const firstNeed = getPersonalOpeningPlanetNeed(support.firstPlanetId);
    const secondNeed = getPersonalOpeningPlanetNeed(support.secondPlanetId);

    return `در عین حال، همکاری ${getPlanetLabel(support.firstPlanetId)} و ${getPlanetLabel(support.secondPlanetId)} نشان می‌دهد وقتی «${firstNeed}» و «${secondNeed}» را هم‌زمان جدی می‌گیری، معمولاً راهی پیدا می‌کنی که حرکتت را دوباره قابل‌اعتمادتر کند.`;
  }

  const dominantElement = chartSignature?.dominantElement;
  const resource = dominantElement
    ? PERSONAL_OPENING_ELEMENT_RESOURCES[dominantElement]
    : SIGN_COPY[risingSign].gift;

  return `وقتی به ریتم خودت فرصت می‌دهی، توان ${resource} می‌تواند به جای واکنش خودکار، راه انتخاب آگاهانه‌تری را باز کند.`;
}

function buildPersonalOpeningEvidenceSentence({
  risingSign,
  chartRulerId,
  focusHouse,
  chartSignature,
  challenge,
}: {
  risingSign: ZodiacKey;
  chartRulerId: string;
  focusHouse: ReportHouseNumber | undefined;
  chartSignature: RealEngineChartSignature | undefined;
  challenge: RealEngineReportAspect | undefined;
}): string {
  const houseEvidence = focusHouse
    ? `تأکید خانه ${toPersianNumber(focusHouse)}، یعنی ${HOUSE_SYNTHESIS_FIELD[focusHouse]}`
    : undefined;

  if (challenge) {
    const relation =
      PERSONAL_OPENING_ASPECT_EVIDENCE[challenge.aspectId] ??
      challenge.aspectLabel ??
      "رابطهٔ سیاره‌ای";

    const evidenceParts = [
      `${relation} ${getPlanetLabel(challenge.firstPlanetId)} و ${getPlanetLabel(challenge.secondPlanetId)}`,
      houseEvidence,
    ].filter((part): part is string => Boolean(part));

    return `این برداشت بیشتر از ${joinPersianList(evidenceParts)} می‌آید؛ رایزینگ ${SIGN_COPY[risingSign].faName} و ${getPlanetLabel(chartRulerId)} به‌عنوان سیارهٔ راهبر، شیوهٔ بیرونی شدنش را رنگ می‌زنند.`;
  }

  const signatureEvidence = [
    chartSignature?.dominantElement
      ? `عنصر غالب ${ELEMENT_LABELS[chartSignature.dominantElement]}`
      : undefined,
    chartSignature?.dominantModality
      ? `کیفیت غالب ${MODALITY_LABELS[chartSignature.dominantModality]}`
      : undefined,
  ].filter((part): part is string => Boolean(part));
  const signaturePhrase =
    signatureEvidence.length > 0
      ? joinPersianList(signatureEvidence)
      : "ریتم کلی جایگاه‌های اصلی";

  const evidenceParts = [
    `رایزینگ ${SIGN_COPY[risingSign].faName}`,
    `${getPlanetLabel(chartRulerId)} به‌عنوان سیارهٔ راهبر`,
    houseEvidence,
    signaturePhrase,
  ].filter((part): part is string => Boolean(part));

  return `این تصویر بیشتر از ${joinPersianList(evidenceParts)} می‌آید؛ این ترکیب، نه فقط نشانهٔ خورشیدی، پایهٔ این برداشت است.`;
}

function buildPersonalOpeningDailySentence({
  dailyBridge,
  focusHouse,
}: {
  dailyBridge: RealEngineReportAspect | undefined;
  focusHouse: ReportHouseNumber | undefined;
}): string {
  if (dailyBridge) {
    const firstNeed = getPersonalOpeningPlanetNeed(dailyBridge.firstPlanetId);
    const secondNeed = getPersonalOpeningPlanetNeed(dailyBridge.secondPlanetId);

    return `دفعهٔ بعد که این الگو فعال شد، پیش از واکنش میان «${firstNeed}» و «${secondNeed}» یک مکث کوتاه بساز و ببین کدام نیاز واقعاً به توجه فوری نیاز دارد.`;
  }

  const observation = focusHouse
    ? PERSONAL_OPENING_HOUSE_OBSERVATIONS[focusHouse]
    : "یک موقعیت واقعی را ثبت کن و ببین پشت واکنش اول، کدام نیاز هنوز فرصت بیان پیدا نکرده است";

  return `برای دیدن این الگو در زندگی واقعی، ${observation}.`;
}

export function buildPersonalOpening({
  name,
  risingSign,
  chartRulerId,
  chartRulerPlacement,
  activeHouseNumber,
  chartSignature,
  synthesisPlan,
}: PersonalOpeningInput): string {
  const displayName = name.trim() ? `${name.trim()}، ` : "";
  const focusHouse = getPersonalOpeningFocusHouse({
    synthesisPlan,
    activeHouseNumber,
    chartRulerPlacement,
  });
  const { challenge, support, dailyBridge } =
    selectDistinctPersonalOpeningAspects(synthesisPlan);
  const experience = focusHouse
    ? PERSONAL_OPENING_HOUSE_EXPERIENCES[focusHouse]
    : `شاید در بعضی موقعیت‌ها چیزی که از بیرون نشان می‌دهی، همهٔ آن چیزی نباشد که هم‌زمان درونت می‌گذرد`;

  return [
    `${displayName}${experience}.`,
    buildPersonalOpeningContrastSentence({
      risingSign,
      chartRulerId,
      challenge,
    }),
    buildPersonalOpeningResourceSentence({
      support,
      chartSignature,
      risingSign,
    }),
    buildPersonalOpeningEvidenceSentence({
      risingSign,
      chartRulerId,
      focusHouse,
      chartSignature,
      challenge,
    }),
    buildPersonalOpeningDailySentence({
      dailyBridge,
      focusHouse,
    }),
  ].join(" ");
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

export function buildCoreSynthesisThread(
  sun: RealEngineReportPlacement | undefined,
  moon: RealEngineReportPlacement | undefined,
  risingSign: ZodiacKey,
  realEngine?: RealEngineReportSnapshot,
): string {
  const rising = SIGN_COPY[risingSign];

  if (!sun || !moon) {
    const availablePlacement = sun ?? moon;
    const availableEvidence = availablePlacement
      ? `${getPlanetLabel(availablePlacement.id)} در ${formatSignHouseLabel(availablePlacement)}`
      : undefined;

    return [
      "ممکن است چیزی که از بیرون نشان می‌دهی همهٔ آن چیزی نباشد که برای تصمیم گرفتن یا آرام شدن درونت نیاز دارد.",
      `از بیرون، کیفیت ${rising.energy} ممکن است زودتر دیده شود؛ برای کامل کردن فاصلهٔ میان خواسته، احساس و ظاهر بیرونی هنوز دادهٔ کافی وجود ندارد.`,
      availableEvidence
        ? `این برداشت محدود از ${availableEvidence} و رایزینگ ${rising.faName} می‌آید و هیچ جایگاه غایبی برای کامل کردن روایت حدس زده نمی‌شود.`
        : `این برداشت محدود فقط از رایزینگ ${rising.faName} می‌آید و هیچ جایگاه غایبی برای کامل کردن روایت حدس زده نمی‌شود.`,
      "برای دیدن این فاصله در زندگی واقعی، یک موقعیت را ثبت کن و بنویس چه چیزی نشان دادی، چه چیزی خواستی و برای آرام شدن به چه نیاز داشتی.",
    ].join(" ");
  }

  const sunField = isReportHouseNumber(sun.house)
    ? HOUSE_SYNTHESIS_FIELD[sun.house]
    : "انتخاب‌ها و جهت شخصی";
  const moonField = isReportHouseNumber(moon.house)
    ? HOUSE_SYNTHESIS_FIELD[moon.house]
    : "احساس و امنیت روزمره";
  const sunNeed = getPersonalOpeningPlanetNeed("sun");
  const moonNeed = getPersonalOpeningPlanetNeed("moon");
  const sunSign = SIGN_COPY[sun.signId];
  const moonSign = SIGN_COPY[moon.signId];
  const sameField = sun.house === moon.house && isReportHouseNumber(sun.house);
  const livedExperience = sameField
    ? `ممکن است در میدان ${sunField} هم بخواهی ${sunNeed} خودت را روشن‌تر دنبال کنی و هم پیش از حرکت مطمئن شوی ${moonNeed} نادیده نمانده است.`
    : `ممکن است در میدان ${sunField} بخواهی ${sunNeed} خودت را روشن‌تر دنبال کنی، اما در میدان ${moonField} پیش از آرام شدن به ${moonNeed} بیشتری نیاز داشته باشی.`;
  const outwardContrast = `از بیرون، کیفیت ${rising.energy} ممکن است زودتر دیده شود؛ برای همین دیگران همیشه متوجه نمی‌شوند که پشت این ظاهر، خواستهٔ شخصی و نیاز عاطفی تو با یک سرعت جلو نمی‌روند.`;
  const evidence = `این تصویر از خورشید ${formatSignHouseLabel(sun)} با ریتم ${sunSign.energy}، ماه ${formatSignHouseLabel(moon)} با ریتم ${moonSign.energy} و رایزینگ ${rising.faName} می‌آید؛ نشان‌ها شیوهٔ بیان را و خانه‌ها صحنهٔ اصلی آن را مشخص می‌کنند.`;
  const sunInterpretation = realEngine
    ? buildPlacementInterpretation("sun", sun, realEngine)
    : undefined;
  const moonInterpretation = realEngine
    ? buildPlacementInterpretation("moon", moon, realEngine)
    : undefined;
  const observation = sunInterpretation && moonInterpretation
    ? `در یک تصمیم واقعی، اول چیزی را که می‌خواهی به نام خودت جلو ببری بنویس؛ بعد جداگانه مشخص کن برای احساس امنیت به چه نیاز داری و قدم بعدی را طوری کوچک کن که هیچ‌کدام حذف نشود.`
    : "در یک تصمیم واقعی ببین چه چیزی می‌خواهی به نام خودت جلو ببری، برای آرام ماندن به چه نیاز داری و کدام بخش را دیگران زودتر می‌بینند.";

  return [livedExperience, outwardContrast, evidence, observation].join(" ");
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

  const shownHouses = activeHouses
    .slice(0, 4)
    .map((house) => "خانه " + toPersianNumber(house))
    .join("، ");

  return "از نظر میدان‌های زندگی، تمرکز اولیه در " + shownHouses + " دیده می‌شود؛ یعنی تصویر کلی فقط از نشانه‌ها ساخته نمی‌شود، بلکه از جایی هم ساخته می‌شود که هر نیرو در زندگی روزمره فعال می‌شود.";
}

export function buildWholeChartSynthesisThread(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  synthesisPlan: RealEngineSynthesisPlan,
): string {
  const sun = findPlacement(realEngine, "sun");
  const moon = findPlacement(realEngine, "moon");
  const rising = SIGN_COPY[chartSpine.risingSign];
  const chartRulerLabel = getPlanetLabel(chartSpine.chartRulerId);
  const focusHouse =
    synthesisPlan.primaryHouseNumber ??
    chartSpine.activeHouses[0]?.house.number;
  const focusField = isReportHouseNumber(focusHouse)
    ? HOUSE_SYNTHESIS_FIELD[focusHouse]
    : "میدان‌های فعال چارت";
  const sunField =
    sun && isReportHouseNumber(sun.house)
      ? HOUSE_SYNTHESIS_FIELD[sun.house]
      : "هویت و جهت شخصی";
  const moonField =
    moon && isReportHouseNumber(moon.house)
      ? HOUSE_SYNTHESIS_FIELD[moon.house]
      : "احساس و امنیت روزمره";
  const coreSentence =
    sun && moon
      ? `ممکن است در میدان ${sunField} بخواهی ${getPersonalOpeningPlanetNeed(
          "sun",
        )} را روشن‌تر جلو ببری، در حالی که در میدان ${moonField} برای ${getPersonalOpeningPlanetNeed(
          "moon",
        )} به ریتم دیگری نیاز داری؛ از بیرون هم کیفیت ${rising.energy} زودتر دیده می‌شود.`
      : `ممکن است چیزی که از بیرون نشان می‌دهی با نیاز درونی‌ات برای تصمیم یا آرام شدن یک ریتم نداشته باشد؛ داده‌های موجود اجازه می‌دهند این فاصله بدون حدس زدن جایگاه‌های غایب خوانده شود.`;
  const evidenceParts = [
    sun ? `خورشید ${formatSignHouseLabel(sun)}` : undefined,
    moon ? `ماه ${formatSignHouseLabel(moon)}` : undefined,
    `رایزینگ ${rising.faName}`,
  ].filter((part): part is string => Boolean(part));
  const chartRulerPhrase = chartSpine.chartRulerPlacement
    ? `${chartRulerLabel} در ${formatSignHouseLabel(
        chartSpine.chartRulerPlacement,
      )}`
    : `${chartRulerLabel} به‌عنوان سیارهٔ راهبر`;
  const evidenceSentence = `پشتوانه این نخ ${joinPersianList(
    evidenceParts,
  )} است؛ ${chartRulerPhrase} نشان می‌دهد یکپارچه کردن این لایه‌ها به ${getPersonalOpeningPlanetNeed(
    chartSpine.chartRulerId,
  )} نیاز دارد و بیشتر در میدان ${focusField} دیده می‌شود.`;
  const primaryRelationship =
    synthesisPlan.primaryChallenge ?? synthesisPlan.primaryRelationship;
  const relationshipSentence = primaryRelationship
    ? `گفت‌وگوی ${getPlanetLabel(
        primaryRelationship.firstPlanetId,
      )} و ${getPlanetLabel(
        primaryRelationship.secondPlanetId,
      )} نقطهٔ اصلی تنظیم ${getPersonalOpeningPlanetNeed(
        primaryRelationship.firstPlanetId,
      )} و ${getPersonalOpeningPlanetNeed(
        primaryRelationship.secondPlanetId,
      )} است؛ تصمیم وقتی روشن‌تر می‌شود که هر دو نیاز نام برده شوند.`
    : undefined;
  const support = synthesisPlan.primarySupport;
  const supportSentence = support
    ? `همکاری ${getPlanetLabel(support.firstPlanetId)} و ${getPlanetLabel(
        support.secondPlanetId,
      )} منبع همراه این نخ است و راه بازگشت به تعادل را نشان می‌دهد.`
    : undefined;

  return [
    coreSentence,
    evidenceSentence,
    relationshipSentence,
    supportSentence,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join(" ");
}

export function buildReportThemeChapters(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  synthesisPlan: RealEngineSynthesisPlan,
): ReportOutputSection[] {
  const sun = findPlacement(realEngine, "sun");
  const moon = findPlacement(realEngine, "moon");
  const mercury = findPlacement(realEngine, "mercury");
  const venus = findPlacement(realEngine, "venus");
  const mars = findPlacement(realEngine, "mars");
  const sunReading = sun
    ? buildPlacementInterpretation("sun", sun, realEngine)
    : undefined;
  const moonReading = moon
    ? buildPlacementInterpretation("moon", moon, realEngine)
    : undefined;
  const mercuryReading = mercury
    ? buildPlacementInterpretation("mercury", mercury, realEngine)
    : undefined;
  const venusReading = venus
    ? buildPlacementInterpretation("venus", venus, realEngine)
    : undefined;
  const marsReading = mars
    ? buildPlacementInterpretation("mars", mars, realEngine)
    : undefined;
  const rising = SIGN_COPY[chartSpine.risingSign];
  const chartRulerLabel = getPlanetLabel(chartSpine.chartRulerId);
  const focusHouse =
    synthesisPlan.primaryHouseNumber ??
    chartSpine.activeHouses[0]?.house.number;
  const focusField = isReportHouseNumber(focusHouse)
    ? HOUSE_SYNTHESIS_FIELD[focusHouse]
    : "میدان‌های فعال چارت";
  const primaryChallenge =
    synthesisPlan.primaryChallenge ?? synthesisPlan.primaryRelationship;
  const support = synthesisPlan.primarySupport ?? synthesisPlan.dailyBridge;

  const placementEvidence = (
    placement: RealEngineReportPlacement | undefined,
    planetId: string,
  ) =>
    placement
      ? `${getPlanetLabel(planetId)} در ${formatSignHouseLabel(placement)}`
      : `${getPlanetLabel(planetId)} بدون جایگاه کامل ذخیره‌شده`;
  const sentence = (value: string) =>
    /[.؟!]$/u.test(value.trim()) ? value.trim() : `${value.trim()}.`;
  const placementChapter = ({
    id,
    title,
    kind,
    placement,
    planetId,
    reading,
    fallback,
    reflection,
  }: {
    id: string;
    title: string;
    kind: string;
    placement: RealEngineReportPlacement | undefined;
    planetId: string;
    reading: ReturnType<typeof buildPlacementInterpretation>;
    fallback: string;
    reflection: string;
  }): ReportOutputSection => ({
    id,
    title,
    kind,
    body: buildStructuredSectionBody({
      opening: reading
        ? sentence(`ممکن است ${reading.dailyLifeExample}`)
        : fallback,
      body: reading
        ? [
            sentence(`وقتی این بخش خوب کار می‌کند، ${reading.healthyExpression}`),
            sentence(`زیر فشار، ${reading.possibleFriction}`),
            `پشتوانه اصلی: ${placementEvidence(placement, planetId)}.`,
          ].join("\n\n")
        : `پشتوانه اصلی: ${placementEvidence(placement, planetId)}؛ هیچ نشان یا خانه‌ای برای دادهٔ غایب حدس زده نمی‌شود.`,
      reflection,
    }),
  });

  const relationshipFriction = primaryChallenge
    ? `اصطکاک محتمل: گفت‌وگوی ${getPlanetLabel(
        primaryChallenge.firstPlanetId,
      )} و ${getPlanetLabel(
        primaryChallenge.secondPlanetId,
      )} می‌تواند میان ${getPersonalOpeningPlanetNeed(
        primaryChallenge.firstPlanetId,
      )} و ${getPersonalOpeningPlanetNeed(
        primaryChallenge.secondPlanetId,
      )} کشش بسازد؛ مسئله حذف یکی از این دو نیاز نیست، بلکه نام‌گذاری هر دو است.`
    : "اصطکاک محتمل: در دادهٔ انتخاب‌شده رابطهٔ تنشی محوری ثبت نشده است؛ بنابراین این فصل از ساختن کشمکش فرضی خودداری می‌کند.";
  const relationshipRepair = support
    ? `ترمیم و همکاری: همکاری ${getPlanetLabel(
        support.firstPlanetId,
      )} و ${getPlanetLabel(
        support.secondPlanetId,
      )} یادآوری می‌کند که ${getPersonalOpeningPlanetNeed(
        support.firstPlanetId,
      )} و ${getPersonalOpeningPlanetNeed(
        support.secondPlanetId,
      )} می‌توانند به جای رقابت، مسیر بازگشت به گفت‌وگو را بسازند.`
    : "ترمیم و همکاری: یک نیاز را زودتر نام ببر، یک مرز روشن بگو و پیش از نتیجه‌گیری از طرف مقابل سؤال مستقیم بپرس.";
  const recurringEvidence = primaryChallenge
    ? `الگوی منتخب ${getPlanetLabel(
        primaryChallenge.firstPlanetId,
      )} و ${getPlanetLabel(primaryChallenge.secondPlanetId)}`
    : synthesisPlan.narrativeProfile.primaryCluster
      ? `خوشهٔ ${joinPersianList(
          synthesisPlan.narrativeProfile.primaryCluster.placementIds.map(
            getPlanetLabel,
          ),
        )}`
      : "ریتم غالب چارت";
  const recurringBody = primaryChallenge
    ? `ممکن است موقعیت‌های متفاوت بارها همان پرسش را برگردانند: چطور ${getPersonalOpeningPlanetNeed(
        primaryChallenge.firstPlanetId,
      )} را در کنار ${getPersonalOpeningPlanetNeed(
        primaryChallenge.secondPlanetId,
      )} نگه داری، بدون اینکه یکی برای آرام کردن دیگری حذف شود.`
    : "ممکن است تکرار اصلی بیشتر از یک کشمکش واحد، در شیوه آغاز، ادامه دادن یا تغییر مسیر دیده شود.";

  return [
    {
      id: "real-engine-theme-signature",
      title: "امضای کلی چارت",
      kind: "overview",
      body: buildStructuredSectionBody({
        opening: `ممکن است از بیرون کیفیت ${rising.energy} زودتر دیده شود، در حالی که تصمیم‌های مهم برای ${getPersonalOpeningPlanetNeed(
          chartSpine.chartRulerId,
        )} به ریتم شخصی‌تری نیاز دارند.`,
        body: [
          `سیارهٔ راهبر این چارت ${chartRulerLabel} است و میدان ${focusField} یکی از جاهایی است که این امضا بیشتر به تجربهٔ واقعی وصل می‌شود.`,
          `پشتوانه اصلی: رایزینگ ${rising.faName} و ${
            chartSpine.chartRulerPlacement
              ? `${chartRulerLabel} در ${formatSignHouseLabel(
                  chartSpine.chartRulerPlacement,
                )}`
              : `${chartRulerLabel} به‌عنوان سیارهٔ راهبر`
          }.`,
        ].join("\n\n"),
        reflection:
          "در یک تصمیم تازه، کدام کیفیت زودتر دیده می‌شود و کدام نیاز پشت‌صحنه جهت را تعیین می‌کند؟",
      }),
    },
    placementChapter({
      id: "real-engine-theme-mind-language",
      title: "ذهن و زبان",
      kind: "identity",
      placement: mercury,
      planetId: "mercury",
      reading: mercuryReading,
      fallback:
        "دادهٔ فعلی برای ساختن یک خوانش کامل از ذهن و زبان کافی نیست و هالیوس جایگاه عطارد را حدس نمی‌زند.",
      reflection:
        "وقتی چیزی مبهم می‌شود، چه جمله‌ای می‌تواند فکر را کوتاه‌تر، روشن‌تر و قابل‌گفت‌وگو کند؟",
    }),
    placementChapter({
      id: "real-engine-theme-emotional-security",
      title: "احساسات و امنیت درونی",
      kind: "emotional-pattern",
      placement: moon,
      planetId: "moon",
      reading: moonReading,
      fallback:
        "دادهٔ فعلی برای ساختن یک خوانش کامل از امنیت درونی کافی نیست و هالیوس جایگاه ماه را حدس نمی‌زند.",
      reflection:
        "پیش از واکنش بعدی، نام احساس، نیاز بدنی و درخواست روشن تو چیست؟",
    }),
    {
      id: "real-engine-theme-relationship-style",
      title: "رابطه و صمیمیت",
      kind: "relationships",
      body: buildStructuredSectionBody({
        opening:
          "این فصل سبک رابطه را در یک چارت می‌خواند؛ دربارهٔ فرد دیگری، سازگاری دو نفر یا نتیجهٔ قطعی یک رابطه ادعایی نمی‌کند.",
        body: [
          `نزدیک‌شدن: ${
            venusReading?.dailyLifeExample ??
            "جایگاه کامل زهره در دادهٔ ذخیره‌شده حاضر نیست، پس شیوه نزدیک‌شدن حدس زده نمی‌شود"
          }.`,
          `امنیت: ${
            moonReading?.healthyExpression ??
            "برای امنیت عاطفی فقط داده‌های موجود ماه معتبرند و جزئیات غایب ساخته نمی‌شوند"
          }.`,
          `گفت‌وگو: ${
            mercuryReading?.healthyExpression ??
            "سبک گفت‌وگو بدون جایگاه معتبر عطارد به یک توصیه عمومی محدود می‌ماند"
          }.`,
          `مرز: ${
            marsReading?.healthyExpression ??
            "مرزبندی بدون جایگاه معتبر مریخ به‌صورت شخصی‌سازی‌شده تفسیر نمی‌شود"
          }.`,
          `استقلال: کیفیت ${rising.energy} در ورود به رابطه دیده می‌شود و سیارهٔ راهبر برای ${getPersonalOpeningPlanetNeed(
            chartSpine.chartRulerId,
          )} به فضای کافی نیاز دارد.`,
          `ریتم صمیمیت: زهره برای ${getPersonalOpeningPlanetNeed(
            "venus",
          )} و ماه برای ${getPersonalOpeningPlanetNeed(
            "moon",
          )} باید هم‌زمان شنیده شوند؛ نزدیکی وقتی پایدارتر است که لذت و امنیت جای یکدیگر را نگیرند.`,
          relationshipFriction,
          relationshipRepair,
          `پشتوانه اصلی: ${placementEvidence(venus, "venus")}; شواهد همراه از ${placementEvidence(
            moon,
            "moon",
          )}، ${placementEvidence(mercury, "mercury")} و ${placementEvidence(
            mars,
            "mars",
          )} می‌آیند.`,
        ].join("\n\n"),
        reflection:
          "در یک رابطهٔ واقعی، کدام نیاز را زودتر می‌گویی و کدام مرز یا درخواست را معمولاً دیرتر روشن می‌کنی؟",
      }),
    },
    placementChapter({
      id: "real-engine-theme-will-action",
      title: "اراده و حرکت",
      kind: "growth",
      placement: mars,
      planetId: "mars",
      reading: marsReading,
      fallback:
        "دادهٔ فعلی برای ساختن یک خوانش کامل از اراده و حرکت کافی نیست و هالیوس جایگاه مریخ را حدس نمی‌زند.",
      reflection:
        "کوچک‌ترین اقدام روشن و بدون خشونتی که خواسته را قابل مشاهده می‌کند چیست؟",
    }),
    placementChapter({
      id: "real-engine-theme-direction-path",
      title: "جهت و مسیر",
      kind: "career",
      placement: sun,
      planetId: "sun",
      reading: sunReading,
      fallback:
        "دادهٔ فعلی برای ساختن یک خوانش کامل از جهت و مسیر کافی نیست و هالیوس جایگاه خورشید را حدس نمی‌زند.",
      reflection:
        "کدام انتخاب کوچک بیشتر امضای خودت را دارد، حتی اگر هنوز نتیجهٔ کاملش معلوم نباشد؟",
    }),
    {
      id: "real-engine-theme-recurring-patterns",
      title: "الگوهای تکرارشونده",
      kind: "growth",
      body: buildStructuredSectionBody({
        opening: recurringBody,
        body: [
          support
            ? `راه خروج از تکرار فقط فشار بیشتر نیست؛ همکاری ${getPlanetLabel(
                support.firstPlanetId,
              )} و ${getPlanetLabel(
                support.secondPlanetId,
              )} یک منبع عملی برای تنظیم الگو می‌سازد.`
            : "راه خروج از تکرار با مشاهدهٔ موقعیت، نام‌گذاری نیاز و انتخاب یک پاسخ کوچک و قابل برگشت شروع می‌شود.",
          `این الگو بیشتر در میدان ${focusField} قابل مشاهده است و باید با نمونه‌های واقعی زندگی سنجیده شود.`,
          `پشتوانه اصلی: ${recurringEvidence}.`,
        ].join("\n\n"),
        reflection:
          "کدام موقعیت متفاوت در ظاهر، همان کشمکش یا عادت آشنا را دوباره فعال می‌کند؟",
      }),
    },
  ];
}

function buildFirstSynthesisText(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  synthesisPlan: RealEngineSynthesisPlan,
): string {
  const wholeChartThread = buildWholeChartSynthesisThread(
    realEngine,
    chartSpine,
    synthesisPlan,
  );
  const profile = synthesisPlan.narrativeProfile;
  const driverThread = buildNarrativeDriverThread(
    profile,
    realEngine,
    chartSpine,
  );
  const relationshipThread =
    profile.mode === "tension-led"
      ? buildSynthesisChallengeThread(
          synthesisPlan.primaryChallenge,
          realEngine,
          chartSpine,
        )
      : buildSynthesisPrimaryRelationshipThread(
          synthesisPlan.primaryRelationship,
          realEngine,
          chartSpine,
        );
  const clusterThread =
    profile.mode === "cluster-led"
      ? undefined
      : buildAspectClusterSynthesisThread(
          realEngine,
          chartSpine,
          profile.primaryCluster,
        );

  return [
    wholeChartThread,
    driverThread,
    relationshipThread,
    clusterThread,
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
    buildSynthesisWeeklyPractice(realEngine, chartSpine, synthesisPlan),
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join("\n\n");
}

function buildNarrativeDriverThread(
  profile: RealEngineNarrativeSynthesisProfile,
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string | undefined {
  if (profile.primaryDriver.kind === "aspect") {
    return undefined;
  }

  if (profile.primaryDriver.kind === "cluster") {
    return buildAspectClusterSynthesisThread(
      realEngine,
      chartSpine,
      profile.primaryDriver.cluster,
    );
  }

  if (profile.primaryDriver.kind === "axis") {
    return buildNodeAxisDriverThread(profile.primaryDriver.axis);
  }

  return buildStrengthDriverThread(profile);
}

function buildSynthesisPrimaryRelationshipThread(
  aspect: RealEngineReportAspect | undefined,
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
): string | undefined {
  if (!aspect) {
    return undefined;
  }

  return `رابطهٔ همراه: ${buildSynthesisAspectBridge(
    aspect,
    realEngine,
    chartSpine,
    "support",
  )}`;
}

function buildStrengthDriverThread(
  profile: RealEngineNarrativeSynthesisProfile,
): string {
  const parts = [
    profile.balance.dominantElement
      ? `${ELEMENT_LABELS[profile.balance.dominantElement]} مسیر راحت‌تر بیان انرژی است`
      : undefined,
    profile.balance.dominantModality
      ? `${MODALITY_LABELS[profile.balance.dominantModality]} ریتم غالب حرکت و تصمیم است`
      : undefined,
    profile.balance.zeroElements.length > 0
      ? `عنصر کم‌حضور ${joinPersianList(
          profile.balance.zeroElements.map((item) => ELEMENT_LABELS[item]),
        )} باید آگاهانه‌تر تمرین شود`
      : undefined,
  ].filter((part): part is string => Boolean(part));

  return `نقطهٔ قوت اصلی: ${parts.join("؛ ")}. این الگو یک برچسب ثابت نیست؛ نشان می‌دهد چارت از کدام مسیر راحت‌تر شروع می‌کند و کجا برای تعادل به تمرین نیاز دارد.`;
}

function buildNodeAxisDriverThread(
  axis: RealEngineNodeAxisSynthesis,
): string {
  const southHouse = axis.southHouse
    ? `خانه ${toPersianNumber(axis.southHouse)}`
    : "خانه نامشخص";
  const northHouse = axis.northHouse
    ? `خانه ${toPersianNumber(axis.northHouse)}`
    : "خانه نامشخص";
  const confidence =
    axis.confidence === "very-near"
      ? "چون محور بسیار نزدیک مرز نشانه است، خانه‌ها مبنای اصلی‌اند و نشانه‌ها با احتیاط خوانده می‌شوند"
      : axis.confidence === "near"
        ? "چون محور نزدیک مرز نشانه است، خانه‌ها وزن بیشتری دارند و نشانه‌ها ملایم‌تر خوانده می‌شوند"
        : "خانه و نشانه هر دو پشتوانه کافی برای خوانش این محور دارند";

  return `محور اصلی رشد: الگوی آشنای ${southHouse} به تمرین تازهٔ ${northHouse} وصل می‌شود. ${confidence}.`;
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
  realEngine: RealEngineReportSnapshot,
) {
  if (!placement) {
    return undefined;
  }

  const planet = PLANET_COPY[planetId];
  const placementLabel = formatPlacementWithHouse(placement);
  const interpretation = buildPlacementInterpretation(
    planetId,
    placement,
    realEngine,
  );
  const houseSentence = buildPlanetHouseSentence(
    placement,
    planetId,
    realEngine,
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
  realEngine: RealEngineReportSnapshot,
) {
  if (!placement) {
    return undefined;
  }

  const planet = PLANET_COPY[planetId];
  const placementLabel = formatPlacementWithHouse(placement);
  const interpretation = buildPlacementInterpretation(
    planetId,
    placement,
    realEngine,
  );
  const houseSentence = buildPlanetHouseSentence(
    placement,
    planetId,
    realEngine,
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
  realEngine: RealEngineReportSnapshot,
): string | undefined {
  const interpretation = buildPlacementInterpretation(
    planetId,
    placement,
    realEngine,
  );

  return interpretation
    ? `از نظر خانه‌ها، این جایگاه بیشتر در این صحنه دیده می‌شود: ${interpretation.focus}.`
    : undefined;
}

function buildPlacementGrowthPractice(
  planetId: string,
  placement: RealEngineReportPlacement,
  realEngine?: RealEngineReportSnapshot,
): string {
  const interpretation = realEngine
    ? buildPlacementInterpretation(planetId, placement, realEngine)
    : isBehavioralPlacementInput(planetId, placement.signId, placement.house)
      ? buildPlacementBehavioralInterpretation({
          planetId,
          signId: placement.signId,
          houseNumber: placement.house,
        })
      : undefined;

  if (interpretation) {
    return `تمرین این جایگاه: ${interpretation.smallExperiment}.`;
  }

  return "تمرین این جایگاه این است که یک نمونه واقعی از الگو را ثبت کنی و آن را به یک رفتار کوچک و قابل مشاهده تبدیل کنی.";
}

function buildPlacementInterpretation(
  planetId: string,
  placement: RealEngineReportPlacement,
  realEngine: RealEngineReportSnapshot,
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
    retrograde:
      realEngine.retrogrades?.status === "calculated" &&
      realEngine.retrogrades.planetIds.includes(planetId),
    audienceMode: getSnapshotBehavioralAudienceMode(realEngine),
    majorAspect: selectPlacementMajorAspectModifier(
      planetId,
      realEngine.aspectHighlights,
    ),
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
  nodeAxis?: RealEngineNodeAxisSynthesis,
): string | undefined {
  const lunarNodes = realEngine.lunarNodes;

  if (!isCalculatedLunarNodes(lunarNodes)) {
    return undefined;
  }

  const modelLabel = getLunarNodeModelLabel(lunarNodes);
  const boundaryWarning = buildLunarNodeBoundaryWarning(nodeAxis);
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
  nodeAxis: RealEngineNodeAxisSynthesis | undefined,
): string | undefined {
  if (!nodeAxis || nodeAxis.confidence === "stable") {
    return undefined;
  }

  const distance = formatAspectDegree(nodeAxis.boundaryDistance);

  return nodeAxis.confidence === "very-near"
    ? `فاصله این محور تا مرز نشانه ${distance} است؛ بنابراین محور خانه‌ها مبنای اصلی خوانش است و جزئیات نشانه‌ای با احتیاط گفته می‌شود.`
    : `فاصله این محور تا مرز نشانه ${distance} است؛ خانه‌ها قابل اتکاترند و جزئیات نشانه‌ای ملایم‌تر خوانده می‌شوند.`;
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
    audienceMode: getSnapshotBehavioralAudienceMode(realEngine),
  });
}

function getNarrativeClusterAspects(
  realEngine: RealEngineReportSnapshot,
  cluster: RealEngineNarrativeCluster | undefined,
): RealEngineReportAspect[] {
  if (!cluster) {
    return [];
  }

  const planetIds = new Set(cluster.placementIds);

  return (realEngine.aspectHighlights ?? []).filter(
    (aspect) =>
      planetIds.has(aspect.firstPlanetId) &&
      planetIds.has(aspect.secondPlanetId),
  );
}

function buildAspectClusterPractice(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  cluster: RealEngineNarrativeCluster | undefined,
): string | undefined {
  const clusterAspects = getNarrativeClusterAspects(realEngine, cluster);

  if (clusterAspects.length > 0) {
    return buildWriterAspectInterpretation(
      clusterAspects[0],
      realEngine,
      chartSpine,
      "daily-bridge",
    ).smallExperiment;
  }

  const placement = cluster?.placementIds
    .map((planetId) => findPlacement(realEngine, planetId))
    .find((item): item is RealEngineReportPlacement => Boolean(item));

  return placement
    ? buildPlacementInterpretation(
        placement.id,
        placement,
        realEngine,
      )?.smallExperiment
    : undefined;
}

function buildAspectClusterSynthesisThread(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  cluster: RealEngineNarrativeCluster | undefined,
): string | undefined {
  if (!cluster) {
    return undefined;
  }

  const labels = joinPersianList(
    cluster.placementIds.map(getPlanetLabel),
  );
  const field =
    cluster.kind === "house" && cluster.houseNumber
      ? `خانه ${toPersianNumber(cluster.houseNumber)}`
      : cluster.signId
        ? formatSignLabel(SIGN_COPY[cluster.signId])
        : "یک میدان مشترک";
  const sharedExperiment = buildAspectClusterPractice(
    realEngine,
    chartSpine,
    cluster,
  );

  return [
    `الگوی خوشه‌ای: ${labels} در ${field} باید پیش از کارت‌های جداگانه به‌عنوان یک سیستم واحد خوانده شوند.`,
    "توان این تمرکز، هماهنگ کردن چند نیاز در یک میدان است؛ گیر آن شلوغ شدن همان میدان و واکنش پیش از روشن شدن اولویت است.",
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
  const buildRolePractice = (
    aspect: RealEngineReportAspect | undefined,
    role: BehavioralSynthesisRole,
  ) =>
    aspect
      ? trimSentenceEnd(
          buildWriterAspectInterpretation(
            aspect,
            realEngine,
            chartSpine,
            role,
          ).smallExperiment,
        )
      : undefined;
  const challengePractice = buildRolePractice(
    synthesisPlan.primaryChallenge,
    "challenge",
  );
  const supportPractice = buildRolePractice(
    synthesisPlan.primarySupport,
    "support",
  );
  const dailyBridgePractice = buildRolePractice(
    synthesisPlan.dailyBridge,
    "daily-bridge",
  );
  const clusterPractice = buildAspectClusterPractice(
    realEngine,
    chartSpine,
    synthesisPlan.narrativeProfile.primaryCluster,
  );
  const primaryHousePractice = buildPrimaryHousePlacementPractice(
    realEngine,
    chartSpine,
    synthesisPlan.primaryHouseNumber,
  );
  const chartRulerPractice = chartSpine.chartRulerPlacement
    ? buildPlacementInterpretation(
        chartSpine.chartRulerPlacement.id,
        chartSpine.chartRulerPlacement,
        realEngine,
      )?.smallExperiment
    : undefined;
  const candidates: RealEnginePracticeCandidate[] = [
    {
      domain: "emotional-relational",
      text: challengePractice,
      priority: 100,
    },
    {
      domain: "emotional-relational",
      text: supportPractice,
      priority: 70,
    },
    {
      domain: "emotional-relational",
      text: "یک احساس یا نیاز را پیش از واکنش در یک جمله روشن بیان کن",
      priority: 10,
    },
    {
      domain: "daily-body-work",
      text: dailyBridgePractice,
      priority: 100,
    },
    {
      domain: "daily-body-work",
      text: primaryHousePractice,
      priority: 90,
    },
    {
      domain: "daily-body-work",
      text: "یک روتین کوچک بدن یا کار را برای هفت روز در زمان مشخص تکرار کن",
      priority: 10,
    },
    {
      domain: "identity-decision-creative",
      text: clusterPractice,
      priority:
        synthesisPlan.narrativeProfile.mode === "cluster-led" ? 110 : 80,
    },
    {
      domain: "identity-decision-creative",
      text: chartRulerPractice,
      priority: 90,
    },
    {
      domain: "identity-decision-creative",
      text: supportPractice,
      priority: 60,
    },
    {
      domain: "identity-decision-creative",
      text: "یک انتخاب کوچک و قابل مشاهده را بدون منتظر ماندن برای نتیجه کامل انجام بده",
      priority: 10,
    },
  ];

  return selectThreeDomainNarrativePractices(candidates).map(
    trimSentenceEnd,
  );
}

function buildPrimaryHousePlacementPractice(
  realEngine: RealEngineReportSnapshot,
  chartSpine: ChartSpine,
  primaryHouseNumber: number | null,
): string | undefined {
  if (!isReportHouseNumber(primaryHouseNumber)) {
    return undefined;
  }

  const priority = [
    chartSpine.chartRulerId,
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
  ];
  const placement = [...realEngine.placements]
    .filter((item) => item.house === primaryHouseNumber)
    .sort(
      (first, second) =>
        getPlacementPracticePriority(first.id, priority) -
          getPlacementPracticePriority(second.id, priority) ||
        first.id.localeCompare(second.id),
    )[0];

  if (
    !placement ||
    !isBehavioralPlacementInput(
      placement.id,
      placement.signId,
      placement.house,
    )
  ) {
    return undefined;
  }

  return buildPlacementBehavioralInterpretation({
    planetId: placement.id,
    signId: placement.signId,
    houseNumber: placement.house,
    retrograde:
      realEngine.retrogrades?.status === "calculated" &&
      realEngine.retrogrades.planetIds.includes(placement.id),
    audienceMode: getSnapshotBehavioralAudienceMode(realEngine),
    majorAspect: selectPlacementMajorAspectModifier(
      placement.id,
      realEngine.aspectHighlights,
    ),
  }).smallExperiment;
}

function getPlacementPracticePriority(
  planetId: string,
  priority: string[],
): number {
  const index = priority.indexOf(planetId);
  return index >= 0 ? index : priority.length;
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

export function buildRealEngineInterpretationSections(
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
        title: "سیاره‌ی راهبر",
        body: buildStructuredSectionBody({
          opening: input.chartRulerText,
          body: undefined,
          reflection: "این نیرو بیشتر کجا کمک می‌کند شروع کنی و کجا ممکن است تو را به تکرار یک عادت بکشاند؟",
        }),
      }
    : null;
  const activeHouseSection: ReportOutputSection | null = activeHouseBody
    ? {
        id: "real-engine-active-houses",
        kind: "growth",
        title: "خانه‌های مهم",
        body: buildStructuredSectionBody({
          opening: activeHouseBody,
          body: undefined,
          reflection: "این روزها کدام میدان زندگی بیشتر توجه تو را می‌خواهد و چه کار کوچکی آن را روشن‌تر می‌کند؟",
        }),
      }
    : null;
  const nodeMotionSection: ReportOutputSection | null = nodeMotionBody
    ? {
        id: "real-engine-node-axis",
        kind: "growth",
        title: "دست‌های ماه — الگوی آشنا، انتخاب تازه",
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
        title: "ترکیب انرژی‌ها",
        body: buildStructuredSectionBody({
          opening: input.balanceText,
          body: undefined,
          reflection: "برای ادامه دادن، بیشتر به شروع، انعطاف، ثبات، یا رها کردن یک فشار قدیمی نیاز داری؟",
        }),
      }
    : null;

  return ([
    {
      id: "real-engine-first-synthesis",
      kind: "overview",
      title: "خلاصه",
      body: buildStructuredSectionBody({
        opening: input.personalOpening,
        body: joinSectionBody(input.summary, input.firstSynthesisText),
        reflection: "کدام جمله از این خلاصه بیشتر شبیه تجربه واقعی توست و کدام بخش هنوز نیاز به زمان دارد؟",
      }),
    },
    ...(input.themeChapters ?? []),
    {
      id: "real-engine-core-pattern",
      kind: "identity",
      title: "خورشید، ماه و رایزینگ",
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
      title: "رابطه‌های مهم",
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
      title: "سه کار برای این هفته",
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
