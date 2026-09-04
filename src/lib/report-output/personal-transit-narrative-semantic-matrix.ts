// HALLEUS_DEEP_NARRATIVE_SLICE4_PERSONAL_TRANSIT_MATRIX_R1_20260902
import type { BehavioralAudienceMode } from "@/lib/astrology/report-behavioral-interpretation";
import type { NatalToTransitAspectId, NatalToTransitBodyId } from "@/src/lib/chart/natal-to-transit-contract";

export const PERSONAL_TRANSIT_NARRATIVE_MATRIX_VERSION = "deep-narrative-slice4-transit-matrix-v1" as const;
export const PERSONAL_TRANSIT_BODY_ORDER = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const satisfies readonly NatalToTransitBodyId[];
export const PERSONAL_TRANSIT_ASPECT_ORDER = ["conjunction", "sextile", "square", "trine", "opposition"] as const satisfies readonly NatalToTransitAspectId[];

export type PersonalTransitPairSemanticCore = { key: string; transitBody: NatalToTransitBodyId; natalBody: NatalToTransitBodyId; transitLabel: string; natalLabel: string; theme: string; thesis: string; mechanism: string; constructive: string; friction: string; adultScenario: string; youthScenario: string; caregiverScenario: string; action: string; caregiverAction: string; };
export type PersonalTransitAspectDynamic = { id: NatalToTransitAspectId; mechanism: string; constructive: string; friction: string; };
export type PersonalTransitNarrativeSemanticUnit = PersonalTransitPairSemanticCore & { aspect: NatalToTransitAspectId; semanticKey: string; aspectMechanism: string; constructiveSynthesis: string; frictionSynthesis: string; scenario: string; surfaceFamily: number; natalRetrograde: boolean; };

const BODY_LABELS_FA: Record<NatalToTransitBodyId, string> = {
  "sun": "خورشید",
  "moon": "ماه",
  "mercury": "عطارد",
  "venus": "زهره",
  "mars": "مریخ",
  "jupiter": "مشتری",
  "saturn": "زحل",
  "uranus": "اورانوس",
  "neptune": "نپتون",
  "pluto": "پلوتو"
};

const NATAL_RECEIVERS: Record<NatalToTransitBodyId, { theme: string; process: string; healthy: string; friction: string; adult: string; youth: string; caregiver: string }> = {
  "sun": {
    "theme": "هویت و جهت",
    "process": "انتخاب شخصی، اراده و شیوهٔ دیده‌شدن",
    "healthy": "انتخابی که از ارزش و خواست واقعی خودت می‌آید روشن‌تر شود",
    "friction": "نیاز به اثبات خود یا واکنش به نگاه دیگران جای انتخاب واقعی را بگیرد",
    "adult": "تصمیمی دربارهٔ نقش، مسیر یا شیوهٔ دیده‌شدن",
    "youth": "انتخابی دربارهٔ استقلال، دیده‌شدن یا مسئولیتی که پذیرفته‌ای",
    "caregiver": "واکنش کودک به دیده‌شدن، تشویق یا حق انتخاب مستقل"
  },
  "moon": {
    "theme": "امنیت و احساس",
    "process": "نیاز عاطفی، امنیت درونی و ریتم واکنش",
    "healthy": "نیاز واقعی زودتر از واکنش لحظه‌ای شناخته شود",
    "friction": "حال لحظه‌ای یا دفاع عاطفی به‌جای نیاز اصلی تصمیم بگیرد",
    "adult": "خانه، رابطهٔ نزدیک یا زمانی که بدن و احساس به امنیت بیشتری نیاز دارند",
    "youth": "خانه، دوستی یا فضای مدرسه‌ای که احساسات را بالا آورده",
    "caregiver": "تغییر خلق، نیاز به آرام‌شدن یا واکنش کودک در خانه و مدرسه"
  },
  "mercury": {
    "theme": "فکر و گفت‌وگو",
    "process": "فکر، زبان، یادگیری و تصمیم",
    "healthy": "فکر به زبان روشن‌تر و تصمیم قابل اجرا تبدیل شود",
    "friction": "سرعت یا تکرار فکر، شنیدن و جمع‌بندی را سخت کند",
    "adult": "گفت‌وگو، پیام، برنامه یا تصمیمی که نیاز به بازبینی دارد",
    "youth": "درس، پیام، گفت‌وگو یا تصمیمی که توضیح روشن‌تری می‌خواهد",
    "caregiver": "شیوهٔ پرسیدن، توضیح‌دادن یا فهم کودک در یک موقعیت روزمره"
  },
  "venus": {
    "theme": "ارزش و نزدیکی",
    "process": "ارزش، پسند، لذت، نزدیکی و مرز رابطه‌ای",
    "healthy": "علاقه و مرز بتوانند هم‌زمان روشن بمانند",
    "friction": "تأییدگرفتن یا اجتناب از ناراحتی انتخاب واقعی را پنهان کند",
    "adult": "تعامل نزدیک، انتخاب شخصی، خرج یا تعیین حد یک رابطه",
    "youth": "دوستی، تعلق به جمع، انتخاب شخصی یا مرزی که باید گفته شود",
    "caregiver": "شیوهٔ کودک در دوست‌شدن، شریک‌شدن، نه‌گفتن یا انتخاب چیزی که دوست دارد"
  },
  "mars": {
    "theme": "انرژی و اقدام",
    "process": "خواستن، جرئت، خشم و تبدیل میل به اقدام",
    "healthy": "انرژی به حرکت مستقیم و اندازه‌دار تبدیل شود",
    "friction": "فشار جمع‌شده به عجله، درگیری یا خاموش‌شدن ناگهانی برسد",
    "adult": "کاری که باید شروع، متوقف یا با مرز روشن‌تری انجام شود",
    "youth": "رقابت، فعالیت، مخالفت یا کاری که انرژی زیادی می‌خواهد",
    "caregiver": "نحوهٔ شروع‌کردن، مخالفت‌کردن یا تخلیهٔ انرژی کودک در بازی و کارهای روزانه"
  },
  "jupiter": {
    "theme": "رشد و معنا",
    "process": "باور، امید، یادگیری و میل به گسترش",
    "healthy": "فرصت با اندازه و قدم بعدی واقعی همراه شود",
    "friction": "هیجان رشد محدودیت زمان، ظرفیت یا جزئیات را نبیند",
    "adult": "فرصتی برای یادگیری، تجربه یا بزرگ‌ترکردن یک برنامه",
    "youth": "فرصتی برای یادگیری، تجربهٔ تازه یا اعتماد بیشتر به توانایی‌ها",
    "caregiver": "کنجکاوی، امید یا میل کودک به تجربه‌ای بزرگ‌تر از توان فعلی"
  },
  "saturn": {
    "theme": "مرز و مسئولیت",
    "process": "مرز، ترس، مسئولیت و ساختن توان پایدار",
    "healthy": "یک حد واقعی به ساختار یا مهارت قابل تکرار تبدیل شود",
    "friction": "سخت‌گیری یا ترس از اشتباه حرکت را بیش از حد متوقف کند",
    "adult": "تعهد، تأخیر یا مسئولیتی که ساختار روشن‌تری می‌خواهد",
    "youth": "قانون، تکلیف یا انتظاری که سنگین‌تر از معمول حس می‌شود",
    "caregiver": "واکنش کودک به قانون، تأخیر، تمرین یا مسئولیتی متناسب با سن"
  },
  "uranus": {
    "theme": "تغییر و آزادی",
    "process": "استقلال، تغییر الگو و تحمل محدودیت",
    "healthy": "تغییر لازم به شکل آزمایشی و قابل برگشت امتحان شود",
    "friction": "بی‌قراری هر نوع ثبات را به شکل محدودیت تجربه کند",
    "adult": "برنامه یا الگویی که ناگهان نیاز به روش تازه‌ای پیدا کرده",
    "youth": "میل به متفاوت‌بودن یا تغییر برنامه‌ای که محدودکننده حس شده",
    "caregiver": "بی‌قراری، مقاومت در برابر برنامه یا نیاز کودک به انتخاب و تنوع"
  },
  "neptune": {
    "theme": "حساسیت و مرزبندی",
    "process": "حساسیت، تخیل، الهام و مرز واقعیت با برداشت",
    "healthy": "دریافت ظریف با شاهد واقعی و مرز روشن همراه شود",
    "friction": "ابهام یا خیال حد موقعیت را کمرنگ کند",
    "adult": "موقعیتی مبهم، الهام‌بخش یا خسته‌کننده که مرز روشنی ندارد",
    "youth": "سردرگمی، خیال‌پردازی یا حساسیتی که توضیح روشن‌تری می‌خواهد",
    "caregiver": "حساسیت کودک به فضا، خستگی، خیال یا پیام‌های مبهم اطراف"
  },
  "pluto": {
    "theme": "شدت و دگرگونی",
    "process": "قدرت، کنترل، شدت و رهاکردن الگوی فرسوده",
    "healthy": "شدت به مشاهدهٔ صادقانه و تغییر محدود تبدیل شود",
    "friction": "کنترل یا نگاه همه‌یا‌هیچ انتخاب‌های میانی را حذف کند",
    "adult": "موقعیتی که کنترل، ترس از دست‌دادن یا تغییر عمیق را فعال کرده",
    "youth": "فشار درونی یا کشمکشی که بیش از اندازه بزرگ و قطعی حس شده",
    "caregiver": "واکنش شدید کودک به از دست‌دادن کنترل، تغییر یا پایان یک الگو"
  }
};
const TRANSIT_DRIVERS: Record<NatalToTransitBodyId, { effect: string; mechanism: string; constructive: string; friction: string; action: string; caregiver: string }> = {
  "sun": {
    "effect": "نور بیشتری روی",
    "mechanism": "موضوع را از حاشیه بیرون می‌آورد و آن را به انتخابی آگاهانه‌تر تبدیل می‌کند",
    "constructive": "اولویت اصلی دیده شود و انتخاب شخصی روشن بماند",
    "friction": "نیاز به نتیجه یا دیده‌شدن سریع‌تر از فهم مسئله جلو بزند",
    "action": "مهم‌ترین انتخاب این بازه را در یک جمله بنویس",
    "caregiver": "از کودک بپرس در آن موقعیت دوست داشته چه چیزی دیده یا شنیده شود"
  },
  "moon": {
    "effect": "حساسیت و واکنش لحظه‌ای بیشتری وارد",
    "mechanism": "ریتم عاطفی را سریع‌تر می‌کند و نیازهای فوری را به سطح می‌آورد",
    "constructive": "بدن و احساس پیش از تصمیم شناخته شوند",
    "friction": "حال لحظه‌ای جهت تصمیم را بیش از اندازه عوض کند",
    "action": "پیش از نتیجه‌گیری، احساس و نیاز را جداگانه نام ببر",
    "caregiver": "برای کودک دو انتخاب ساده برای نام‌بردن احساس و نیاز فراهم کن"
  },
  "mercury": {
    "effect": "حرکت ذهنی و گفت‌وگوی بیشتری وارد",
    "mechanism": "موضوع را به سؤال، پیام، مقایسه و تصمیم تبدیل می‌کند",
    "constructive": "موضوع با زبان دقیق و قابل بررسی بیان شود",
    "friction": "فکرها زیاد شوند و تصمیم پیش از شنیدن کامل بسته شود",
    "action": "پیام یا تصمیم را در سه خط کوتاه بازنویسی کن",
    "caregiver": "از کودک بخواه موضوع را با یک جملهٔ ساده توضیح دهد"
  },
  "venus": {
    "effect": "مسئلهٔ ارزش، پسند و رابطه را وارد",
    "mechanism": "می‌پرسد چه چیزی مطلوب، منصفانه یا قابل پذیرفتن است",
    "constructive": "علاقه با مرز و انتخاب واقعی همراه شود",
    "friction": "راحت نگه‌داشتن فضا به حذف ترجیح واقعی منجر شود",
    "action": "یک ترجیح و یک مرز را کنار هم روشن کن",
    "caregiver": "به کودک کمک کن یک چیز دوست‌داشتنی و یک حد را جداگانه بگوید"
  },
  "mars": {
    "effect": "فشار برای حرکت و واکنش را وارد",
    "mechanism": "موضوع را از فکر به اقدام، مخالفت یا دفاع از مرز می‌برد",
    "constructive": "انرژی به اقدام روشن و اندازه‌دار تبدیل شود",
    "friction": "عجله یا خشم پیش از فهمیدن خواستهٔ اصلی عمل کند",
    "action": "خواسته‌ات را به کوچک‌ترین اقدام روشن تبدیل کن",
    "caregiver": "به کودک کمک کن انرژی یا مخالفت را به یک درخواست امن تبدیل کند"
  },
  "jupiter": {
    "effect": "میل به گسترش و امکان بیشتر را وارد",
    "mechanism": "افق موضوع را بزرگ‌تر می‌کند و فرصت یا معنای بیشتری نشان می‌دهد",
    "constructive": "فرصت با اندازه و قدم بعدی واقعی همراه شود",
    "friction": "امکان بزرگ جزئیات و ظرفیت واقعی را کنار بزند",
    "action": "از امکان بزرگ فقط یک نسخهٔ کوچک را امتحان کن",
    "caregiver": "به کودک کمک کن از ایدهٔ بزرگ یک تجربهٔ کوچک انتخاب کند"
  },
  "saturn": {
    "effect": "وزن واقعیت، زمان و مسئولیت را وارد",
    "mechanism": "موضوع را وادار می‌کند با حد، تأخیر، تعهد یا مهارت واقعی روبه‌رو شود",
    "constructive": "مرز واقعی به ساختار قابل اتکا تبدیل شود",
    "friction": "ترس از خطا یا سخت‌گیری حرکت را متوقف کند",
    "action": "یک محدودیت واقعی و یک قدم قابل تکرار را مشخص کن",
    "caregiver": "قانون یا مسئولیت را برای کودک به یک قدم کوتاه و روشن تبدیل کن"
  },
  "uranus": {
    "effect": "نیاز به آزادی و تغییر الگو را وارد",
    "mechanism": "روش آشنا را به چالش می‌کشد تا امکان تازه‌ای دیده شود",
    "constructive": "تغییر به شکل آزمایشی و برگشت‌پذیر امتحان شود",
    "friction": "بی‌قراری به قطع ناگهانی یا تصمیم غیرقابل برگشت برسد",
    "action": "فقط یک بخش از الگو را به شکل قابل برگشت تغییر بده",
    "caregiver": "به کودک میان دو روش امن و متفاوت حق انتخاب بده"
  },
  "neptune": {
    "effect": "حساسیت، تخیل و ابهام بیشتری وارد",
    "mechanism": "مرز میان حس، تصویر ذهنی و واقعیت قابل مشاهده را نازک‌تر می‌کند",
    "constructive": "الهام با بررسی واقعیت و مرز روشن همراه شود",
    "friction": "حدس یا آرزو به جای واقعیت قطعی گرفته شود",
    "action": "واقعیت، برداشت و آرزو را در سه خط جدا کن",
    "caregiver": "برای کودک فرق میان چیزی که دیده، حدس زده و آرزو کرده روشن کن"
  },
  "pluto": {
    "effect": "شدت و نیاز به تغییر عمیق را وارد",
    "mechanism": "موضوع را به لایهٔ قدرت، کنترل و چیزی که دیگر نمی‌تواند مثل قبل ادامه پیدا کند می‌برد",
    "constructive": "شدت به صداقت و تغییر محدود تبدیل شود",
    "friction": "کنترل یا نگاه همه‌یا‌هیچ انتخاب‌های میانی را حذف کند",
    "action": "فقط یک رفتار قابل کنترل را برای تغییر انتخاب کن",
    "caregiver": "به کودک کمک کن از واکنش شدید یک بخش کوچک و قابل انتخاب را پیدا کند"
  }
};
const TARGETED_PAIR_OVERRIDES: Partial<Record<string, { thesis: string; mechanism: string }>> = {
  "uranus->mars": {
    "thesis": "اورانوس روی مریخ، آزادی را مستقیماً وارد نحوهٔ خواستن و اقدام می‌کند؛ نتیجه می‌تواند شجاعت برای شکستن یک روش فرسوده باشد، به شرطی که تغییر با قطع ناگهانی اشتباه نشود",
    "mechanism": "نیاز به حرکت تازه با میل مریخ برای اقدام یکی می‌شود؛ بنابراین تصمیم‌های کوچک و قابل برگشت از واکنش ناگهانی مفیدترند"
  },
  "saturn->venus": {
    "thesis": "زحل روی زهره، رابطه و ارزش را از فیلتر دوام، مرز و واقعیت عبور می‌دهد؛ چیزی که فقط خوشایند است باید نشان دهد تا چه اندازه قابل اتکاست",
    "mechanism": "کشش و لذت با سؤال‌های زمان، تعهد و حد روبه‌رو می‌شوند و کیفیت انتخاب از ظاهر هماهنگی مهم‌تر می‌شود"
  },
  "pluto->moon": {
    "thesis": "پلوتو روی ماه، واکنش عاطفی را عمیق‌تر می‌کند و مسئلهٔ امنیت را به لایهٔ کنترل، وابستگی و رهاکردن الگوی قدیمی می‌برد",
    "mechanism": "احساس شدید می‌تواند چیزی را که قبلاً زیر سطح مانده آشکار کند؛ ارزش این تماس در مشاهدهٔ صادقانه است، نه در بزرگ‌کردن ترس"
  },
  "jupiter->mercury": {
    "thesis": "مشتری روی عطارد، میدان فکر را بزرگ می‌کند؛ ایده، یادگیری و گفت‌وگو می‌توانند سریع‌تر رشد کنند اما هر امکان تازه‌ای هنوز به جمع‌بندی نیاز دارد",
    "mechanism": "ذهن هم‌زمان افق بیشتری می‌بیند و احتمال پخش‌شدن میان گزینه‌ها بیشتر می‌شود؛ انتخاب یک خط فکری، رشد را قابل استفاده می‌کند"
  },
  "saturn->sun": {
    "thesis": "زحل روی خورشید، هویت و انتخاب شخصی را با واقعیت زمان، مسئولیت و نتیجه می‌سنجد؛ فشار این تماس می‌تواند جدیت بسازد بدون اینکه به خودکوچک‌بینی تبدیل شود",
    "mechanism": "خواست شخصی باید از آزمون محدودیت عبور کند و همین فرایند نشان می‌دهد کدام انتخاب ارزش ساختن دارد"
  },
  "uranus->mercury": {
    "thesis": "اورانوس روی عطارد، فکر را از مسیر معمول بیرون می‌کشد؛ ارتباط‌های تازه و جهش‌های ذهنی بیشتر می‌شوند اما سرعت ایده نباید جای پایان‌دادن را بگیرد",
    "mechanism": "الگوی ذهنی قدیمی سریع‌تر شکسته می‌شود و فضا برای راه‌حل نامعمول باز می‌شود؛ ثبت و آزمون ایده از پریدن بی‌وقفه میان آن‌ها مهم‌تر است"
  },
  "neptune->venus": {
    "thesis": "نپتون روی زهره، زیبایی، علاقه و نزدیکی را حساس‌تر و خیال‌پذیرتر می‌کند؛ ظرفیت همدلی بالا می‌رود اما مرز میان دریافت واقعی و تصویر مطلوب باید روشن بماند",
    "mechanism": "ارزش و جذب بیشتر از نشانه‌های ظریف اثر می‌گیرند، پس پرسش مستقیم و رفتار قابل مشاهده تعادل لازم را می‌سازند"
  },
  "pluto->sun": {
    "thesis": "پلوتو روی خورشید، مسئلهٔ قدرت و هویت را نزدیک می‌کند؛ انتخاب‌هایی که فقط برای حفظ کنترل یا تصویر قدیمی ساخته شده‌اند سخت‌تر نادیده گرفته می‌شوند",
    "mechanism": "فشار این تماس می‌تواند جهت شخصی را بازتعریف کند، به شرطی که تغییر از راه انتخاب محدود و آگاهانه پیش برود نه همه‌یا‌هیچ"
  },
  "saturn->mars": {
    "thesis": "زحل روی مریخ، سرعت اقدام را با حد و پیامد روبه‌رو می‌کند؛ این تماس می‌تواند نیروی خام را به استقامت تبدیل کند یا اگر سخت‌گیری زیاد شود حرکت را قفل کند",
    "mechanism": "مریخ می‌خواهد جلو برود و زحل می‌خواهد مطمئن شود حرکت قابل دوام است؛ ریتم درست میان این دو از زور بیشتر مفیدتر است"
  },
  "jupiter->sun": {
    "thesis": "مشتری روی خورشید، میل به رشد و دیده‌شدن را بزرگ‌تر می‌کند؛ اعتماد می‌تواند بالا برود اما جهت شخصی هنوز به انتخاب مشخص و اندازهٔ واقعی نیاز دارد",
    "mechanism": "افق بزرگ‌تر به هویت انرژی می‌دهد؛ در همان حرکت احتمال قول یا هدف بیش از ظرفیت هم بالا می‌رود"
  }
};
export const PERSONAL_TRANSIT_ASPECT_DYNAMICS: Record<NatalToTransitAspectId, PersonalTransitAspectDynamic> = {
  "conjunction": {
    "id": "conjunction",
    "mechanism": "دو نیرو در یک میدان جمع می‌شوند و موضوع را فشرده‌تر و فوری‌تر می‌کنند",
    "constructive": "تمرکز روی یک اولویت می‌تواند انرژی تماس را یکپارچه کند",
    "friction": "نزدیکی زیاد ممکن است فاصلهٔ لازم برای دیدن انتخاب‌های دیگر را کم کند"
  },
  "sextile": {
    "id": "sextile",
    "mechanism": "میان دو نیرو یک مسیر همکاری باز می‌شود که بدون حرکت داوطلبانه لزوماً فعال نمی‌ماند",
    "constructive": "یک اقدام کوچک می‌تواند امکان موجود را به نتیجهٔ قابل مشاهده وصل کند",
    "friction": "آسان‌بودن فرصت ممکن است باعث شود اقدام لازم عقب بیفتد"
  },
  "square": {
    "id": "square",
    "mechanism": "اصطکاک میان دو نیرو نیاز به تصمیم، تنظیم و تغییر روش را بیشتر می‌کند",
    "constructive": "فشار وقتی مفید می‌شود که به یک تغییر مشخص و قابل سنجش تبدیل شود",
    "friction": "میل به خلاص‌شدن سریع از فشار می‌تواند واکنش عجولانه بسازد"
  },
  "trine": {
    "id": "trine",
    "mechanism": "جریان میان دو نیرو روان‌تر است و ظرفیت موجود راحت‌تر در دسترس قرار می‌گیرد",
    "constructive": "استفادهٔ آگاهانه از این روانی می‌تواند یک توان موجود را به خروجی واقعی تبدیل کند",
    "friction": "آسانی ممکن است باعث شود امکان موجود بدیهی فرض شود و کمتر به کار گرفته شود"
  },
  "opposition": {
    "id": "opposition",
    "mechanism": "دو قطب روبه‌روی هم قرار می‌گیرند و مسئلهٔ تعادل، مذاکره و دیدن هر دو سوی موقعیت را پررنگ می‌کنند",
    "constructive": "دیدن هر دو قطب می‌تواند به انتخابی متعادل‌تر و مرز روشن‌تر برسد",
    "friction": "یکی از قطب‌ها ممکن است فقط به فرد یا موقعیت بیرونی نسبت داده شود و سهم شخصی دیده نشود"
  }
};

function buildPairCore(transitBody: NatalToTransitBodyId, natalBody: NatalToTransitBodyId): PersonalTransitPairSemanticCore {
  const driver = TRANSIT_DRIVERS[transitBody];
  const receiver = NATAL_RECEIVERS[natalBody];
  const transitLabel = BODY_LABELS_FA[transitBody];
  const natalLabel = BODY_LABELS_FA[natalBody];
  const key = `${transitBody}->${natalBody}`;
  const override = TARGETED_PAIR_OVERRIDES[key];
  return {
    key,
    transitBody,
    natalBody,
    transitLabel,
    natalLabel,
    theme: receiver.theme,
    thesis: override?.thesis ?? `${transitLabel} ترنزیتی ${driver.effect} ${receiver.process}ِ ${natalLabel} تولدی می‌کند؛ در این ترکیب، ${driver.constructive} وقتی پایدارتر می‌شود که ${receiver.healthy}.`,
    mechanism: override?.mechanism ?? `${driver.mechanism} در حوزهٔ ${receiver.process}؛ در نتیجه نحوهٔ پاسخ ${natalLabel} به فشار یا فرصت ${transitLabel} اهمیت پیدا می‌کند.`,
    constructive: `${driver.constructive} و ${receiver.healthy}.`,
    friction: `${driver.friction}؛ در چنین وضعی ${receiver.friction}.`,
    adultScenario: receiver.adult,
    youthScenario: receiver.youth,
    caregiverScenario: receiver.caregiver,
    action: driver.action,
    caregiverAction: driver.caregiver,
  };
}

export const PERSONAL_TRANSIT_PAIR_SEMANTIC_CORES: Record<string, PersonalTransitPairSemanticCore> = Object.fromEntries(
  PERSONAL_TRANSIT_BODY_ORDER.flatMap((transitBody) =>
    PERSONAL_TRANSIT_BODY_ORDER.map((natalBody) => {
      const core = buildPairCore(transitBody, natalBody);
      return [core.key, core] as const;
    }),
  ),
);

function stableSurfaceFamily(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 5;
}

export function getPersonalTransitPairSemanticCore(transitBody: NatalToTransitBodyId, natalBody: NatalToTransitBodyId): PersonalTransitPairSemanticCore {
  const key = `${transitBody}->${natalBody}`;
  const core = PERSONAL_TRANSIT_PAIR_SEMANTIC_CORES[key];
  if (!core) throw new Error(`Missing personal transit pair semantic core: ${key}`);
  return core;
}

export function buildPersonalTransitNarrativeSemanticUnit(input: {
  transitBody: NatalToTransitBodyId;
  natalBody: NatalToTransitBodyId;
  aspect: NatalToTransitAspectId;
  audienceMode?: BehavioralAudienceMode;
  natalRetrograde?: boolean;
}): PersonalTransitNarrativeSemanticUnit {
  const pair = getPersonalTransitPairSemanticCore(input.transitBody, input.natalBody);
  const dynamic = PERSONAL_TRANSIT_ASPECT_DYNAMICS[input.aspect];
  const audienceMode = input.audienceMode ?? "adult";
  const retrograde = input.natalRetrograde === true && input.natalBody !== "sun" && input.natalBody !== "moon";
  const retrogradeMechanism = retrograde
    ? `${pair.natalLabel} تولدی در حالت پس‌رو این موضوع را پیش از بیان بیرونی بیشتر درون‌پردازش می‌کند.`
    : "";
  const scenario = audienceMode === "caregiver" ? pair.caregiverScenario : audienceMode === "youth" ? pair.youthScenario : pair.adultScenario;
  return {
    ...pair,
    aspect: input.aspect,
    semanticKey: `transit:${pair.key}:${input.aspect}`,
    aspectMechanism: [pair.mechanism, dynamic.mechanism, retrogradeMechanism].filter(Boolean).join(" "),
    constructiveSynthesis: `${pair.constructive} ${dynamic.constructive}`,
    frictionSynthesis: `${pair.friction} ${dynamic.friction}`,
    scenario,
    surfaceFamily: stableSurfaceFamily(`transit:${pair.key}:${input.aspect}`),
    natalRetrograde: retrograde,
  };
}

export function assertPersonalTransitNarrativeMatrixCoverage(): { pairCount: number; contactCount: number; dynamicCount: number } {
  const pairCount = Object.keys(PERSONAL_TRANSIT_PAIR_SEMANTIC_CORES).length;
  const dynamicCount = Object.keys(PERSONAL_TRANSIT_ASPECT_DYNAMICS).length;
  const contactCount = pairCount * dynamicCount;
  if (pairCount !== 100) throw new Error(`Expected 100 ordered transit pair cores, found ${pairCount}`);
  if (dynamicCount !== 5) throw new Error(`Expected 5 transit aspect dynamics, found ${dynamicCount}`);
  if (contactCount !== 500) throw new Error(`Expected 500 transit contacts, found ${contactCount}`);
  return { pairCount, contactCount, dynamicCount };
}
