import { formatReportNarrativeAngle } from "@/lib/astrology/report-aspect-display";

export const NATAL_ASPECT_NARRATIVE_MATRIX_VERSION =
  "deep-narrative-natal-aspect-matrix-v1-20260902" as const;
// HALLEUS_DEEP_NARRATIVE_SLICE3_NATAL_ASPECT_MATRIX_R1_20260902

export const NATAL_ASPECT_PLANET_IDS = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
] as const;
export const NATAL_ASPECT_IDS = [
  "conjunction", "sextile", "square", "trine", "opposition",
] as const;

export type NatalAspectPlanetId = (typeof NATAL_ASPECT_PLANET_IDS)[number];
export type NatalAspectId = (typeof NATAL_ASPECT_IDS)[number];

export type NatalAspectSemanticCore = {
  semanticKey: string;
  pairKey: string;
  aspectId: NatalAspectId;
  thesis: string;
  mechanism: string;
  everydayScene: string;
  constructiveExpression: string;
  frictionExpression: string;
  actionCue: string;
  themes: string[];
};

export type CanonicalNatalAspectNarrativeInput = {
  firstPlanetId: string;
  secondPlanetId: string;
  firstSignLabel?: string | null;
  secondSignLabel?: string | null;
  firstHouseNumber?: number | null;
  secondHouseNumber?: number | null;
  aspectId: string;
  actualSeparation?: number | null;
  canonicalAngle?: number | null;
  retrogradePlanetIds?: string[];
};

export type CanonicalNatalAspectNarrative = NatalAspectSemanticCore & {
  factLead: string;
  contextualThesis: string;
  contextualMechanism: string;
  contextualEverydayScene: string;
  contextualConstructiveExpression: string;
  contextualFrictionExpression: string;
};

type PlanetMeaning = {
  label: string;
  function: string;
  constructive: string;
  friction: string;
  action: string;
};

const PLANETS: Record<NatalAspectPlanetId, PlanetMeaning> = {
  sun: { label: "خورشید", function: "هویت و انتخاب شخصی", constructive: "حضور روشن و تصمیمی که امضای خودت را دارد", friction: "وابستگی به تصویری که باید از خودت حفظ کنی", action: "انتخاب شخصی را واضح‌تر کن" },
  moon: { label: "ماه", function: "امنیت عاطفی و واکنش بدنی", constructive: "تنظیم احساس و ساختن امنیت قابل اعتماد", friction: "واکنش پیش از نام‌گذاری نیاز", action: "احساس و نیاز را جداگانه نام ببر" },
  mercury: { label: "عطارد", function: "فکر، زبان و تصمیم", constructive: "فهم روشن و تبدیل ایده به کلمه یا تصمیم", friction: "پخش شدن میان احتمال‌ها یا تحلیل بیش از حد", action: "موضوع را به یک تصمیم قابل توضیح تبدیل کن" },
  venus: { label: "زهره", function: "ارزش، لذت و نزدیکی", constructive: "نزدیکی همراه با انتخاب و مرز", friction: "سنجیدن ارزش خود از واکنش دیگری", action: "یک ترجیح و یک مرز را روشن بگو" },
  mars: { label: "مریخ", function: "خواستن، اقدام و دفاع از مرز", constructive: "اقدام روشن بدون حذف خود یا دیگری", friction: "عجله، خشم انباشته یا اقدام پیش از فهم خواسته", action: "خواسته را به یک اقدام کوچک و روشن تبدیل کن" },
  jupiter: { label: "مشتری", function: "گسترش، معنا و امکان", constructive: "دیدن افق بزرگ‌تر همراه با حرکت واقعی", friction: "اغراق، قول بزرگ یا شروع بیش از ظرفیت", action: "امکان بزرگ را به یک نمونه کوچک وصل کن" },
  saturn: { label: "زحل", function: "مرز، زمان و مسئولیت", constructive: "پایداری و ساختن چیزی که در زمان دوام می‌آورد", friction: "خودسانسوری یا ترس از حرکت تا آمادگی کامل", action: "محدودیت را به یک قدم زمان‌دار تبدیل کن" },
  uranus: { label: "اورانوس", function: "آزادی، تازگی و شکستن الگو", constructive: "نوآوری و تغییر آگاهانه", friction: "قطع ناگهانی یا جلو زدن تازگی از عمق", action: "تغییر را اول در نسخه‌ای برگشت‌پذیر امتحان کن" },
  neptune: { label: "نپتون", function: "تخیل، حساسیت و مرز واقعیت", constructive: "الهام همراه با واقعیت‌سنجی", friction: "ابهام یا تبدیل دریافت درونی به حقیقت قطعی", action: "دریافتت را با یک شاهد واقعی بررسی کن" },
  pluto: { label: "پلوتو", function: "قدرت، شدت و دگرگونی", constructive: "تاب‌آوری و تغییر عمیق بدون انکار لایه پنهان", friction: "کنترل، همه‌یا‌هیچ دیدن یا چسبیدن از ترس آسیب‌پذیری", action: "بخش قابل کنترل را از چیزی که باید رها شود جدا کن" },
};

type PairMeaning = {
  theme: string;
  tension: string;
  strength: string;
  risk: string;
  scene: string;
};

function pair(a: NatalAspectPlanetId, b: NatalAspectPlanetId, theme: string, tension: string, strength: string, risk: string, scene: string): [string, PairMeaning] {
  return [pairKey(a, b), { theme, tension, strength, risk, scene }];
}

const PAIR_MEANINGS = Object.fromEntries([
  pair("sun","moon","هماهنگی میان هویت و نیاز عاطفی","آنچه می‌خواهی باشی با آنچه برای آرام‌شدن لازم داری یک سرعت ندارد","تصمیمی که هم شخصی است و هم از نظر عاطفی قابل تحمل","نمایش یک هویت در حالی که نیاز واقعی عقب می‌ماند","وقتی یک انتخاب مهم هم غرور شخصی و هم امنیت درونی را درگیر می‌کند"),
  pair("sun","mercury","تبدیل هویت به صدا و فکر","فکر کردن درباره خود با خودِ انتخاب کردن یکی نیست","توان توضیح روشن ایده و جهت شخصی","زیاد توضیح دادن به جای تصمیم گرفتن","وقتی باید نظر خودت را در جلسه، نوشته یا پروژه‌ای قابل دیدن کنی"),
  pair("sun","venus","ارزش شخصی و میل به دوست‌داشتنی بودن","اصالت با حفظ هماهنگی و تأیید دیگران مذاکره می‌کند","جذابیت و انتخاب رابطه‌ای که از ارزش شخصی می‌آید","کم کردن خود برای محبوب ماندن","وقتی انتخاب شخصی ممکن است سلیقه یا انتظار دیگری را به چالش بکشد"),
  pair("sun","mars","هویت در حال حرکت","خواستن سریع می‌تواند جلوتر از روشن شدن جهت شخصی بدود","جرئت تبدیل تصمیم شخصی به عمل","اثبات خود از راه واکنش یا رقابت","وقتی باید از نظر خودت دفاع کنی یا شروعی را به نام خودت انجام بدهی"),
  pair("sun","jupiter","هویت و افق بزرگ‌تر","اعتمادبه‌نفس می‌تواند میان رشد واقعی و اغراق جابه‌جا شود","امید و جسارت برای بزرگ‌تر کردن میدان تجربه","بزرگ دیدن خود یا پروژه بیش از ظرفیت فعلی","وقتی یک فرصت تازه تو را وادار می‌کند اندازه واقعی تعهدت را بسنجی"),
  pair("sun","saturn","هویت زیر آزمون زمان","میل به دیده‌شدن با ترس از خطا، مسئولیت یا قضاوت روبه‌رو می‌شود","اقتدار آرام و اعتمادبه‌نفسی که از مهارت می‌آید","خودسانسوری یا اثبات ارزش فقط از راه سختی","وقتی باید کاری را قبل از کامل بودن عرضه کنی و مسئولیت نتیجه را هم بپذیری"),
  pair("sun","uranus","اصالت و آزادی","ثبات هویت با نیاز به متفاوت بودن و تغییر الگو کشیده می‌شود","امضای شخصی، نوآوری و جرئت خارج شدن از قالب","متفاوت بودن فقط برای فاصله گرفتن یا قطع ناگهانی","وقتی پروژه یا رابطه‌ای از تو می‌خواهد هم خودت بمانی هم روش تازه‌ای پیدا کنی"),
  pair("sun","neptune","هویت و تخیل","مرز میان آرمان شخصی و تصویری که دوست داری واقعی باشد مبهم می‌شود","تخیل، همدلی و توان ساختن معنایی الهام‌بخش","گم شدن در تصویر، ایده‌آل‌سازی یا فرار از انتخاب روشن","وقتی الهام زیاد است اما باید تصمیمی قابل سنجش بگیری"),
  pair("sun","pluto","هویت و قدرت تغییر","نیاز به کنترل با ضرورت پوست‌اندازی شخصی روبه‌رو می‌شود","قدرت بازسازی و حضور نافذ بدون زور","همه‌یا‌هیچ کردن، کنترل تصویر یا جنگ قدرت","وقتی انتخابی قدیمی دیگر با کسی که شده‌ای جور درنمی‌آید"),
  pair("moon","mercury","احساس و نام‌گذاری","بدن و احساس همیشه با سرعت ذهن توضیح داده نمی‌شوند","توان تبدیل حالت مبهم به کلمه و درخواست","تحلیل کردن احساس به جای تجربه یا گفتن آن","وقتی چیزی ناراحتت کرده و باید بفهمی دقیقاً چه می‌خواهی بگویی"),
  pair("moon","venus","امنیت و محبت","چیزی که آرامت می‌کند همیشه همان چیزی نیست که جذابت می‌کند","لطافت، دریافت محبت و ساختن رابطه‌ای امن","رضایت ظاهری در حالی که نیاز عاطفی نادیده مانده","وقتی رابطه خوشایند است اما بدن یا دل هنوز امنیت کامل حس نمی‌کند"),
  pair("moon","mars","احساس و واکنش","نیاز عاطفی می‌تواند خیلی سریع به دفاع، خشم یا اقدام تبدیل شود","جرئت دفاع از نیاز و انرژی برای مراقبت از خود","واکنش تند پیش از فهمیدن احساس اصلی","وقتی یک ناراحتی کوچک فوراً میل به جواب دادن یا عمل کردن ایجاد می‌کند"),
  pair("moon","jupiter","احساس و گسترش","حال خوب و بد هر دو می‌توانند بزرگ‌تر از اندازه لحظه حس شوند","گرمی، امید و ظرفیت حمایت عاطفی","اغراق احساسی یا وعده دادن برای آرام کردن فضا","وقتی برای بهتر شدن حال خود یا دیگری وسوسه می‌شوی سریع راه‌حل بزرگ بدهی"),
  pair("moon","saturn","نیاز و مسئولیت","نیاز به حمایت با کنترل، وظیفه یا ترس از وابستگی روبه‌رو می‌شود","ثبات عاطفی و توان مراقبت قابل اعتماد","پنهان کردن نیاز، سرد شدن یا تبدیل احساس به وظیفه","وقتی لازم است کمک بخواهی اما ترجیح می‌دهی اول همه‌چیز را خودت نگه داری"),
  pair("moon","uranus","امنیت و آزادی","بدن ثبات می‌خواهد اما بخشی از تو از تکرار و وابستگی خسته می‌شود","انعطاف عاطفی و ساختن شکل‌های تازه امنیت","قطع ناگهانی، فاصله گرفتن یا تغییر حال بدون توضیح","وقتی نزدیک بودن و داشتن فضای شخصی هم‌زمان مهم می‌شوند"),
  pair("moon","neptune","احساس و نفوذپذیری","مرز میان احساس خودت و فضای دیگری نازک می‌شود","همدلی عمیق همراه با شهود ظریف","جذب حال دیگران، خستگی عاطفی یا سوءبرداشت شهودی","وقتی بدون حرف زدن حال فضا را می‌گیری و باید بفهمی چه بخشی واقعاً مال توست"),
  pair("moon","pluto","امنیت و شدت","نیاز به امنیت با ترس از از دست دادن، کنترل یا آسیب‌پذیری عمیق می‌شود","تاب‌آوری عاطفی و توان روبه‌رو شدن با احساسات سخت","چسبیدن، کنترل یا آزمودن رابطه برای اطمینان","وقتی اعتماد مسئله می‌شود و واکنش تو بیش از خود اتفاق شدت پیدا می‌کند"),
  pair("mercury","venus","فکر و ارزش رابطه‌ای","صراحت با میل به خوشایند و هماهنگ بودن مذاکره می‌کند","زبان جذاب، مذاکره و بیان روشن ترجیح","نرم کردن بیش از حد حرف یا نگفتن مخالفت","وقتی باید چیزی حساس را طوری بگویی که هم روشن باشد هم رابطه را بی‌دلیل زخمی نکند"),
  pair("mercury","mars","فکر و اقدام","سرعت ذهن و سرعت واکنش می‌توانند همدیگر را تیزتر کنند","تصمیم سریع، مناظره روشن و تبدیل فکر به عمل","تیزی کلام، عجله یا جواب دادن پیش از فهم کامل","وقتی بحثی داغ می‌شود و باید میان جواب فوری و پاسخ دقیق انتخاب کنی"),
  pair("mercury","jupiter","جزئیات و تصویر بزرگ","ذهن میان دقت و معنای بزرگ رفت‌وآمد می‌کند","دید وسیع همراه با توان توضیح و آموزش","پریدن از جزئیات یا بزرگ کردن نتیجه","وقتی ایده‌ای جذاب داری و باید آن را به استدلال یا برنامه‌ای قابل دفاع تبدیل کنی"),
  pair("mercury","saturn","فکر و ساختار","ذهن باید میان آزادی فکر و معیار سخت‌گیرانه نظم پیدا کند","تمرکز، دقت و تبدیل ایده به ساختار قابل اعتماد","خودسانسوری، سنگینی ذهن یا ترس از اشتباه","وقتی باید ایده‌ای را ویرایش کنی تا هم خلاق بماند هم قابل اجرا شود"),
  pair("mercury","uranus","ذهن و جهش نو","فکر خطی با میل به دیدن ارتباط‌های غیرمنتظره کنار می‌آید","نوآوری، سرعت اتصال ایده‌ها و راه‌حل غیرمعمول","پریدن میان ایده‌ها، بی‌حوصلگی از توضیح یا ناتمام گذاشتن","وقتی از چند موضوع نامرتبط ناگهان یک ایده پروژه یا راه‌حل تازه درمی‌آوری"),
  pair("mercury","neptune","فکر و تخیل","منطق و دریافت شهودی باید مرز خود را روشن نگه دارند","تصویرسازی، زبان نمادین و فهم ظرافت‌ها","ابهام، فرض‌سازی یا قاطی شدن حدس با واقعیت","وقتی چیزی را حس می‌کنی اما هنوز باید مدرک یا توضیح روشن پیدا کنی"),
  pair("mercury","pluto","فکر و عمق","ذهن سطح را رها می‌کند و دنبال علت، قدرت یا بخش پنهان می‌رود","تحقیق، تمرکز و پرسش عمیق","وسواس فکری، بدگمانی یا تلاش برای کنترل از راه اطلاعات","وقتی جواب ساده قانعت نمی‌کند و لازم است بفهمی زیر ماجرا چه می‌گذرد"),
  pair("venus","mars","جذب و خواستن","میل به نزدیکی با شیوه اقدام و پیگیری خواسته برخورد می‌کند","کشش، ابتکار رابطه‌ای و بیان زنده خواسته","تعقیب، عقب‌نشینی یا اشتباه گرفتن کشش با توافق","وقتی هم علاقه داری و هم باید بفهمی چگونه و با چه مرزی آن را جلو ببری"),
  pair("venus","jupiter","ارزش و فراوانی","لذت و بخشندگی باید با اندازه واقعی منابع و تعهد هماهنگ شوند","گرمی، سخاوت و دیدن امکان در رابطه و هنر","زیاده‌روی، خرج یا قول بیش از اندازه","وقتی چیزی یا کسی خیلی جذاب است و باید فرق اشتیاق با ارزش پایدار را بسنجی"),
  pair("venus","saturn","نزدیکی و تعهد","میل به محبت با معیار، زمان و ترس از آسیب‌پذیری روبه‌رو می‌شود","وفاداری، مرز سالم و رابطه‌ای که در زمان شکل می‌گیرد","سردی دفاعی، کم‌ارزش دیدن خود یا ماندن فقط از وظیفه","وقتی رابطه نیاز دارد خواسته و تعهد را صریح و قابل سنجش تعریف کنی"),
  pair("venus","uranus","نزدیکی و آزادی","جذب با نیاز به فضا، تازگی و استقلال مذاکره می‌کند","رابطه‌ای زنده که انتخاب و تفاوت را جا می‌دهد","بی‌حوصلگی از ثبات، فاصله ناگهانی یا وابستگی به هیجان تازگی","وقتی هم صمیمیت می‌خواهی هم نمی‌خواهی رابطه شکل ثابت و خفه‌کننده بگیرد"),
  pair("venus","neptune","عشق و خیال","ارزش واقعی با تصویر ایده‌آل یا میل به یکی شدن مرز می‌سازد","لطافت، هنر و همدلی عاشقانه همراه با مرز","ایده‌آل‌سازی، نادیده گرفتن نشانه‌ها یا نجات دادن دیگری","وقتی کشش زیاد است و باید رفتار واقعی را جدا از تصویر ذهنی ببینی"),
  pair("venus","pluto","نزدیکی و شدت","محبت با قدرت، مالکیت و ترس از از دست دادن عمیق می‌شود","وفاداری عمیق و صداقت درباره خواسته و حسادت","کنترل، آزمون پنهانی یا همه‌یا‌هیچ دیدن رابطه","وقتی رابطه مهم می‌شود و مسئله اعتماد یا کنترل ناگهان وزن بیشتری می‌گیرد"),
  pair("mars","jupiter","اقدام و گسترش","انگیزه با اعتماد به امکان بزرگ‌تر شتاب می‌گیرد","جسارت، انرژی و توان شروع یک حرکت بزرگ","ریسک اضافه، عجله یا بیشتر برداشتن از ظرفیت","وقتی فرصتی هیجان‌انگیز است و باید قبل از پریدن اندازه قدم اول را تعیین کنی"),
  pair("mars","saturn","حرکت و محدودیت","خواستن با زمان، مسئولیت و پیامد روبه‌رو می‌شود","استقامت و تبدیل فشار به حرکت حساب‌شده","گیر کردن میان گاز و ترمز، خشم از مانع یا تأخیر طولانی","وقتی می‌خواهی جلو بروی اما قرارداد، رابطه یا محدودیتی واقعی سرعتت را تعیین می‌کند"),
  pair("mars","uranus","اقدام و آزادی","انرژی عمل با میل به شکستن محدودیت ناگهان بالا می‌رود","جرئت تجربه و تغییر سریع اما هوشمند","تصمیم ناگهانی، قطع یا خطر کردن فقط برای خلاص شدن از فشار","وقتی چیزی خفه‌کننده می‌شود و وسوسه داری همان لحظه مسیر را عوض کنی"),
  pair("mars","neptune","اقدام و ابهام","انرژی حرکت باید بداند دنبال چه چیزی است و کجا مرز دارد","عمل الهام‌گرفته و حساس به فضا","پخش شدن انرژی، تعلل یا جنگیدن برای چیزی که تعریف روشنی ندارد","وقتی انگیزه هست اما هدف یا درخواست هنوز مبهم مانده"),
  pair("mars","pluto","اقدام و قدرت","خواستن به لایه‌ای عمیق از کنترل، بقا و تغییر وصل می‌شود","تمرکز، شجاعت و توان عبور از مانع سخت","زورآزمایی، وسواس بر بردن یا عمل از ترس از دست دادن کنترل","وقتی مسئله آن‌قدر مهم حس می‌شود که باید فرق قدرت با فشار آوردن را روشن کنی"),
  pair("jupiter","saturn","رشد و واقعیت","افق بزرگ با زمان، ظرفیت و مسئولیت اندازه می‌گیرد","توسعه پایدار و تبدیل امید به ساختار","نوسان میان خوش‌بینی زیاد و ترمز بیش از حد","وقتی ایده بزرگ داری اما باید بودجه، زمان یا تعهد لازم را هم واقعی کنی"),
  pair("jupiter","uranus","گسترش و نوآوری","میل به تجربه بزرگ‌تر با آزادی و جهش ناگهانی متحد می‌شود","جرئت فرصت تازه و دیدن راهی که قبلاً دیده نمی‌شد","پرش بزرگ بدون زیرساخت یا اعتیاد به تازگی","وقتی فرصتی غیرمعمول ظاهر می‌شود و باید نسخه آزمایشی آن را بسازی"),
  pair("jupiter","neptune","معنا و ایمان","امید و تخیل می‌توانند هم الهام بدهند هم اندازه واقعیت را محو کنند","بینش، بخشندگی و تخیل بزرگ همراه با معنا","باور بی‌بررسی، وعده مبهم یا فرار به تصویر آرمانی","وقتی ایده‌ای الهام‌بخش است و باید مشخص کنی کدام بخشش واقعاً قابل اجراست"),
  pair("jupiter","pluto","گسترش و قدرت","باور به امکان بزرگ‌تر با میل به اثرگذاری عمیق شدت می‌گیرد","قدرت تحول در مقیاس بزرگ و پشتکار برای تغییر ساختاری","افراط، قطعیت ایدئولوژیک یا بزرگ کردن کنترل","وقتی پروژه یا باور از حد شخصی بزرگ‌تر می‌شود و باید اثر قدرتش را هم ببینی"),
  pair("saturn","uranus","ساختار و آزادی","حفظ چارچوب با نیاز به شکستن چیزی که دیگر کار نمی‌کند مذاکره می‌کند","اصلاح پایدار؛ تغییر بدون خراب کردن هرچه مفید است","خشکی در برابر تغییر یا انقلاب ناگهانی بعد از تحمل طولانی","وقتی سیستم قدیمی جواب نمی‌دهد اما نمی‌خواهی همه چیز را یکباره دور بریزی"),
  pair("saturn","neptune","مرز و ابهام","ساختار باید چیزی را نگه دارد که ذاتاً سیال، شهودی یا نامطمئن است","شکل دادن به تخیل و ساختن مرز برای حساسیت","ترس از ابهام، فرسودگی یا ساختار دادن به چیزی که هنوز روشن نیست","وقتی ایده یا احساسی مبهم باید به برنامه، زمان یا تعهد مشخص تبدیل شود"),
  pair("saturn","pluto","ساختار و قدرت عمیق","کنترل و دوام با ضرورت تغییر بنیادی روبه‌رو می‌شوند","تاب‌آوری، تحمل فشار و بازسازی ساختار فرسوده","سخت‌گیری، کنترل زیاد یا ماندن در ساختاری که باید تغییر کند","وقتی چیزی قدیمی دیگر قابل ادامه نیست اما تغییرش هزینه و مسئولیت واقعی دارد"),
  pair("uranus","neptune","نوآوری و تخیل جمعی","راه تازه با آرمان و حساسیت به فضای بزرگ‌تر ترکیب می‌شود","تصور آینده متفاوت و دیدن الگوهای تازه","پراکندگی نسلی یا خیال تغییر بدون اقدام شخصی","وقتی ایده‌ای بزرگ درباره آینده داری و باید سهم شخصی و قابل اجرا را پیدا کنی"),
  pair("uranus","pluto","گسست و دگرگونی","تغییر ناگهانی با فشار عمیق برای بازسازی همراه می‌شود","توان شکستن الگوی فرسوده و ساختن شکل تازه","ویرانگری، افراط در تغییر یا شخصی‌سازی بیش از حد یک امضای نسلی","وقتی یک تغییر جمعی فقط در صورت تماس شخصی قوی واقعاً وارد تصمیم‌های خودت می‌شود"),
  pair("neptune","pluto","تخیل و دگرگونی جمعی","حساسیت به جریان‌های پنهان با تغییرات عمیق نسلی همراه است","دیدن لایه‌های نامرئی تغییر و ظرفیت معنابخشی","بیش‌تفسیر امضای نسلی یا تبدیل فضای مبهم به داستان شخصی قطعی","وقتی یک الگوی جمعی فقط با خانه یا تماس شخصی دقیق‌تر برای زندگی تو معنا پیدا می‌کند"),
]) as Record<string, PairMeaning>;

const ASPECT_DYNAMICS: Record<NatalAspectId, { mechanism: (p: PairMeaning) => string; strength: (p: PairMeaning) => string; friction: (p: PairMeaning) => string; action: string }> = {
  conjunction: {
    mechanism: (p) => `دو کارکرد در یک نقطه جمع می‌شوند؛ ${p.theme} به‌سختی می‌تواند یکی را بدون دیگری فعال کند`,
    strength: (p) => `وقتی این دو نیرو یک هدف داشته باشند، ${p.strength} به توان متمرکز تبدیل می‌شود`,
    friction: (p) => `اگر مرز دو نیاز روشن نباشد، ${p.risk} می‌تواند سریع‌تر و شدیدتر شود`,
    action: "قبل از واکنش، مشخص کن کدام نیاز رهبر تصمیم است و دیگری چه نقشی دارد",
  },
  sextile: {
    mechanism: (p) => `میان دو کارکرد یک مسیر همکاری در دسترس است؛ ${p.theme} با انتخاب آگاهانه می‌تواند از یکی برای رشد دیگری استفاده کند`,
    strength: (p) => `فرصت این رابطه در ${p.strength} است، به شرط اینکه استعداد خام به تمرین واقعی برسد`,
    friction: (p) => `چون فشار فوری کم است، ${p.risk} ممکن است دیده نشود تا فرصت استفاده‌نشده بماند`,
    action: "یک موقعیت کوچک انتخاب کن که در آن عمداً از توان یک طرف برای حمایت از طرف دیگر استفاده کنی",
  },
  square: {
    mechanism: (p) => `دو کارکرد با ریتم متفاوت فشار می‌آورند؛ ${p.tension} و مجبور می‌شوی مسئله را به مهارت تبدیل کنی`,
    strength: (p) => `بخش سازنده این فشار، ساختن ${p.strength} از راه تمرین و اصلاح مکرر است`,
    friction: (p) => `اگر یکی از دو طرف حذف شود، ${p.risk} به شکل اصطکاک تکرارشونده برمی‌گردد`,
    action: "به‌جای انتخاب صفر و یک، تعارض را به دو نیاز مشخص و یک تصمیم قابل آزمایش تقسیم کن",
  },
  trine: {
    mechanism: (p) => `دو کارکرد طبیعی‌تر به هم راه می‌دهند؛ ${p.theme} بدون اصطکاک زیاد می‌تواند به یک جریان واحد تبدیل شود`,
    strength: (p) => `توان اصلی در ${p.strength} است و با تکرار می‌تواند به مهارتی بسیار قابل اتکا تبدیل شود`,
    friction: (p) => `آسان بودن جریان ممکن است باعث شود ${p.risk} دیر دیده شود یا استعداد بدون ساختار بماند`,
    action: "این توان طبیعی را به یک خروجی مشخص، زمان‌بندی‌شده و قابل سنجش وصل کن",
  },
  opposition: {
    mechanism: (p) => `دو کارکرد در دو سر یک محور ایستاده‌اند؛ ${p.tension} و راه سالم، مذاکره میان دو قطب است نه حذف یکی`,
    strength: (p) => `پختگی این محور در ${p.strength} است؛ توان دیدن هر دو سمت قبل از تصمیم`,
    friction: (p) => `زیر فشار، ${p.risk} می‌تواند به رفت‌وبرگشت یا سپردن یک قطب به آدم یا موقعیت مقابل تبدیل شود`,
    action: "برای هر دو قطب یک خواسته مستقل بنویس و تصمیمی پیدا کن که هزینه هر دو را صادقانه ببیند",
  },
};

const TARGETED: Partial<Record<string, Partial<NatalAspectSemanticCore>>> = {
  "mercury:uranus:conjunction": {
    thesis: "ذهن فقط سریع نیست؛ مسیر معمول فکر کردن را هم زود کنار می‌زند تا اتصال تازه‌ای پیدا کند",
    mechanism: "عطارد و اورانوس تقریباً در یک نقطه کار می‌کنند، پس زبان، تصمیم و ایده ناگهان به جهش و نوآوری وصل می‌شوند",
    constructiveExpression: "توان دیدن ارتباطی که دیگران هنوز جدا می‌بینند و تبدیل آن به ایده، محصول یا بیان شخصی",
    frictionExpression: "تازگی می‌تواند از تکمیل جلو بزند؛ ایده بعدی قبل از اینکه قبلی شکل نهایی بگیرد جذاب‌تر می‌شود",
  },
  "mars:saturn:opposition": {
    thesis: "خواستن و حرکت کردن هر بار باید از روبه‌روی پیامد، مسئولیت یا مخالفت عبور کند",
    mechanism: "مریخ و زحل در دو سر محور قرار می‌گیرند؛ یک طرف می‌خواهد جلو برود و طرف دیگر زمان، حد و نتیجه رابطه‌ای تصمیم را می‌سنجد",
    constructiveExpression: "قدرت این محور در اقدام حساب‌شده است: نه عقب‌نشینی دائمی و نه شکستن هر مانع با زور",
    frictionExpression: "زیر فشار ممکن است حرکت دیر شود، خشم جمع شود یا بعد از تحمل طولانی یک‌باره به واکنش سخت تبدیل شود",
  },
  "mercury:saturn:sextile": {
    thesis: "ذهن راهی عملی برای تبدیل ایده به ساختار پیدا می‌کند؛ دقت می‌تواند به جای ترمز، ابزار اجرا باشد",
    constructiveExpression: "فکر منظم، ویرایش خوب و توان توضیح چیزی پیچیده به شکل قابل استفاده",
  },
  "mercury:saturn:trine": {
    thesis: "فکر و ساختار طبیعی‌تر همدیگر را پیدا می‌کنند و ایده راحت‌تر به نظم، متن یا تصمیم قابل اتکا می‌رسد",
    constructiveExpression: "تمرکز، دقت و توان ساختن استدلال یا سیستم بدون از دست دادن خط اصلی فکر",
  },
  "moon:venus:square": {
    thesis: "چیزی که خوشایند و جذاب است همیشه همان چیزی نیست که بدن و احساس برای امنیت می‌خواهند",
    mechanism: "ماه و زهره با فشار ۹۰ درجه مجبور می‌کنند تفاوت میان محبت، رضایت ظاهری و امنیت واقعی روشن شود",
    constructiveExpression: "توان ساختن رابطه‌ای که هم لطافت دارد هم نیاز عاطفی را جدی می‌گیرد",
    frictionExpression: "برای حفظ هماهنگی ممکن است ناراحتی واقعی دیرتر گفته شود یا رضایت ظاهری جای امنیت را بگیرد",
  },
};

function pairKey(a: NatalAspectPlanetId, b: NatalAspectPlanetId): string {
  return [a, b].sort().join(":");
}

function normalizePlanet(value: string): NatalAspectPlanetId {
  if ((NATAL_ASPECT_PLANET_IDS as readonly string[]).includes(value)) return value as NatalAspectPlanetId;
  throw new Error(`Unsupported natal aspect planet: ${value}`);
}
function normalizeAspect(value: string): NatalAspectId {
  if ((NATAL_ASPECT_IDS as readonly string[]).includes(value)) return value as NatalAspectId;
  throw new Error(`Unsupported natal aspect form: ${value}`);
}

function buildCore(a: NatalAspectPlanetId, b: NatalAspectPlanetId, aspectId: NatalAspectId): NatalAspectSemanticCore {
  const key = pairKey(a, b);
  const meaning = PAIR_MEANINGS[key];
  if (!meaning) throw new Error(`Missing pair semantics: ${key}`);
  const dynamic = ASPECT_DYNAMICS[aspectId];
  const first = PLANETS[a];
  const second = PLANETS[b];
  const semanticKey = `${key}:${aspectId}`;
  const core: NatalAspectSemanticCore = {
    semanticKey,
    pairKey: key,
    aspectId,
    thesis: `${first.label} و ${second.label}: ${meaning.theme}`,
    mechanism: dynamic.mechanism(meaning),
    everydayScene: meaning.scene,
    constructiveExpression: dynamic.strength(meaning),
    frictionExpression: dynamic.friction(meaning),
    actionCue: dynamic.action,
    themes: [meaning.theme, first.function, second.function],
  };
  return { ...core, ...(TARGETED[semanticKey] ?? {}) };
}

export const NATAL_ASPECT_SEMANTIC_MATRIX: Readonly<Record<string, NatalAspectSemanticCore>> = (() => {
  const rows: Record<string, NatalAspectSemanticCore> = {};
  for (let i = 0; i < NATAL_ASPECT_PLANET_IDS.length; i += 1) {
    for (let j = i + 1; j < NATAL_ASPECT_PLANET_IDS.length; j += 1) {
      const a = NATAL_ASPECT_PLANET_IDS[i];
      const b = NATAL_ASPECT_PLANET_IDS[j];
      for (const aspectId of NATAL_ASPECT_IDS) {
        const row = buildCore(a, b, aspectId);
        rows[row.semanticKey] = row;
      }
    }
  }
  return Object.freeze(rows);
})();

export function getNatalAspectSemanticCore(firstPlanetId: string, secondPlanetId: string, aspectId: string): NatalAspectSemanticCore {
  const a = normalizePlanet(firstPlanetId);
  const b = normalizePlanet(secondPlanetId);
  const aspect = normalizeAspect(aspectId);
  const key = `${pairKey(a, b)}:${aspect}`;
  const row = NATAL_ASPECT_SEMANTIC_MATRIX[key];
  if (!row) throw new Error(`Missing natal aspect semantic core: ${key}`);
  return row;
}

function contextLabel(label: string | null | undefined, house: number | null | undefined): string | null {
  if (!label && !house) return null;
  if (label && house) return `${label} و خانهٔ ${house.toLocaleString("fa-IR")}`;
  if (label) return label;
  return `خانهٔ ${Number(house).toLocaleString("fa-IR")}`;
}

export function buildCanonicalNatalAspectNarrative(input: CanonicalNatalAspectNarrativeInput): CanonicalNatalAspectNarrative {
  const a = normalizePlanet(input.firstPlanetId);
  const b = normalizePlanet(input.secondPlanetId);
  const core = getNatalAspectSemanticCore(a, b, input.aspectId);
  const first = PLANETS[a];
  const second = PLANETS[b];
  const actual = typeof input.actualSeparation === "number" && Number.isFinite(input.actualSeparation)
    ? formatReportNarrativeAngle(input.actualSeparation)
    : null;
  const factLead = actual
    ? `${first.label} و ${second.label} با زاویهٔ واقعی ${actual} به هم وصل شده‌اند`
    : `${first.label} و ${second.label} یک رابطهٔ زاویه‌ای ثبت‌شده دارند`;
  const firstContext = contextLabel(input.firstSignLabel, input.firstHouseNumber);
  const secondContext = contextLabel(input.secondSignLabel, input.secondHouseNumber);
  const context = firstContext && secondContext
    ? `${first.label} در ${firstContext} و ${second.label} در ${secondContext}`
    : firstContext
      ? `${first.label} در ${firstContext}`
      : secondContext
        ? `${second.label} در ${secondContext}`
        : null;
  const retrogrades = new Set(input.retrogradePlanetIds ?? []);
  const retrogradeLabels = [a, b].filter((id) => retrogrades.has(id)).map((id) => PLANETS[id].label);
  const retrogradeNote = retrogradeLabels.length
    ? `پس‌روی ${retrogradeLabels.join(" و ")} بخشی از این تعامل را پیش از بیان بیرونی به بازبینی درونی برمی‌گرداند`
    : null;
  return {
    ...core,
    factLead,
    contextualThesis: [factLead, core.thesis, context ? `زمینهٔ این تماس: ${context}` : null].filter(Boolean).join("؛ "),
    contextualMechanism: [core.mechanism, retrogradeNote].filter(Boolean).join("؛ "),
    contextualEverydayScene: core.everydayScene,
    contextualConstructiveExpression: core.constructiveExpression,
    contextualFrictionExpression: [core.frictionExpression, retrogradeNote].filter(Boolean).join("؛ "),
  };
}

export function getNatalAspectMatrixCounts() {
  return {
    planetPairs: 45,
    aspectForms: 5,
    pairAspectCores: Object.keys(NATAL_ASPECT_SEMANTIC_MATRIX).length,
  } as const;
}
