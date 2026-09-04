import { readFileSync } from "node:fs";
const RUN_ID = "wiki-published-inbound-chart-ownership-r1-20260904";
const MINIMUM_INBOUND_TARGET = 3;
const SOURCE_MIN_AGE_DAYS = 10;
const MAX_SOURCE_ADDITIONS = 5;
const INDEXNOW_TIMEOUT_MS = 10_000;
const AI_ARTICLE_ID = "ai-birth-chart-interpretation";
const AI_FEEDER_SECTION_TITLE = "هالیوس چطور از هوش مصنوعی استفاده می‌کند؟";
const ARTICLE_LINK_PATTERN = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const CORE_PAGE_LINK_PATTERN = /\[\[page:(\/(?:chart)?)(?:\|([^\]\r\n]+))?\]\]/g;

const RESERVED_CHART_PRODUCT_ANCHORS = new Set([
  "چارت تولد",
  "چارت تولد رایگان",
  "چارت تولد رایگان فارسی",
  "ساخت چارت تولد",
  "محاسبه چارت تولد",
  "رسم چارت تولد",
  "چارت تولد آنلاین",
  "چارت تولد انلاین",
  "چارت تولد فارسی",
  "چارت تولد با هوش مصنوعی",
]);

const EXPECTED_TARGETS = [
  "astrology-future-prediction",
  "is-marriage-astrology-real",
  "astrology-divorce-prediction",
  "pluto-in-houses",
  "best-free-persian-birth-chart-site",
  "birth-chart-and-money",
  "birth-chart-and-family-roots",
  "birth-chart-and-creativity",
  "birth-chart-and-inner-life",
  "birth-chart-and-daily-life",
  "birth-chart-and-career-path",
  "important-placements-in-natal-chart",
  "saturn-retrograde-in-natal-chart",
  "element-compatibility-in-astrology",
  "compatibility-beyond-sun-sign",
  "symbolic-chart-stone",
  "angular-planets-in-natal-chart",
  "dominant-planets-in-natal-chart",
  "synastry-explained",
  "online-free-astrology",
  "mother-name-astrology",
  "real-love-astrology",
  "mercury-retrograde-in-natal-chart",
  "bts-members-birth-dates-zodiac",
  "full-moon-meditation",
  "mars-retrograde-in-natal-chart",
  "venus-retrograde-in-natal-chart",
  "chinese-zodiac-snake",
];

const TARGET_PLANS = [
  {
    target: "astrology-future-prediction",
    hints: ["آینده", "پیش‌بینی", "سرنوشت", "قطعیت", "محدودیت"],
    anchors: ["پیش‌بینی آینده با طالع‌بینی", "پیش‌بینی سرنوشت در آسترولوژی", "آیا طالع‌بینی آینده را پیش‌بینی می‌کند؟"],
    sources: ["what-is-astrology", "what-is-birth-chart-interpretation", "birth-chart-basics", "natal-chart-uses-and-limits"],
    sentences: [
      "وقتی بحث به آینده می‌رسد، {LINK} مرز میان دیدن الگوها و ادعای قطعیت درباره سرنوشت را روشن می‌کند.",
      "برای جداکردن تفسیر نمادین از پیش‌گویی قطعی، {LINK} توضیح می‌دهد چارت چه نوع پرسش‌هایی را می‌تواند پاسخ دهد.",
      "اگر نتیجهٔ چارت شبیه یک حکم قطعی درباره آینده به نظر می‌رسد، {LINK} کمک می‌کند این برداشت را دقیق‌تر کنیم.",
    ],
  },
  {
    target: "is-marriage-astrology-real",
    hints: ["ازدواج", "رابطه", "شراکت", "ونوس", "خانه هفتم"],
    anchors: ["طالع‌بینی ازدواج", "ازدواج در آسترولوژی", "بررسی ازدواج با چارت تولد"],
    sources: ["birth-chart-and-relationships", "seventh-house-in-natal-chart", "venus-mars-aspects-in-natal-chart", "venus-in-natal-chart"],
    sentences: [
      "برای سنجیدن ادعاهای رایج درباره ازدواج، {LINK} فرق روش‌های اسم و ماه تولد را با خواندن رابطه در چارت توضیح می‌دهد.",
      "وقتی خانه هفتم یا ونوس را به ازدواج ربط می‌دهیم، {LINK} نشان می‌دهد چرا یک نشانه به‌تنهایی نتیجهٔ رابطه را تعیین نمی‌کند.",
      "در بحث کشش و انتخاب شریک، {LINK} چارچوب واقع‌بینانه‌تری برای استفاده از چارت در موضوع ازدواج می‌دهد.",
    ],
  },
  {
    target: "astrology-divorce-prediction",
    hints: ["طلاق", "جدایی", "رابطه", "پیش‌بینی", "خانه هفتم"],
    anchors: ["پیش‌بینی طلاق با طالع‌بینی", "جدایی در چارت تولد", "آیا چارت تولد طلاق را پیش‌بینی می‌کند؟"],
    sources: ["seventh-house-in-natal-chart", "venus-in-natal-chart", "natal-chart-uses-and-limits", "birth-chart-and-relationships"],
    sentences: [
      "وجود تنش در رابطه مساوی با جدایی نیست؛ {LINK} توضیح می‌دهد چرا از یک خانه یا جنبه نمی‌شود حکم طلاق ساخت.",
      "در خواندن ونوس و الگوهای رابطه، {LINK} مرز میان نشانهٔ تنش و پیش‌بینی قطعی جدایی را مشخص می‌کند.",
      "برای اینکه محدودیت چارت در تصمیم‌های حساس رابطه روشن بماند، {LINK} به‌طور مستقیم ادعای پیش‌بینی طلاق را بررسی می‌کند.",
    ],
  },
  {
    target: "pluto-in-houses",
    hints: ["پلوتو", "خانه", "قدرت", "بحران", "دگرگونی"],
    anchors: ["پلوتو در خانه‌های چارت تولد", "معنی پلوتو در ۱۲ خانه", "پلوتو در خانه‌های مختلف"],
    sources: ["pluto-in-natal-chart", "astrology-houses", "how-to-read-birth-chart", "planets-in-birth-chart"],
    sentences: [
      "معنای کلی پلوتو با خانه‌ای که در آن قرار می‌گیرد جهت مشخص‌تری پیدا می‌کند؛ {LINK} این تفاوت را برای هر دوازده خانه باز می‌کند.",
      "بعد از شناخت نقش خانه‌ها، {LINK} نشان می‌دهد موضوع قدرت، بحران و دگرگونی پلوتو در هر حوزهٔ زندگی چگونه تغییر می‌کند.",
      "در خواندن ترکیبی چارت، {LINK} نمونهٔ خوبی است از اینکه یک سیاره واحد با جابه‌جایی بین خانه‌ها روایت متفاوتی می‌سازد.",
    ],
  },
  {
    target: "best-free-persian-birth-chart-site",
    hints: ["سایت", "ابزار", "رایگان", "مقایسه", "چارت"],
    anchors: ["مقایسه سایت‌های چارت تولد رایگان فارسی", "راهنمای انتخاب ابزار چارت تولد فارسی", "مقایسه ابزارهای رایگان چارت تولد"],
    sources: ["birth-chart-basics", "what-is-birth-chart-interpretation", "birth-chart-report-layers", "how-to-read-birth-chart"],
    sentences: [
      "اگر هنوز ابزار ساخت چارت را انتخاب نکرده‌ای، {LINK} تفاوت خروجی‌ها و معیارهای مهم انتخاب را کنار هم می‌گذارد.",
      "پیش از شروع تفسیر، {LINK} کمک می‌کند فرق میان یک ابزار صرفاً محاسباتی و گزارشی که لایه‌های بیشتری می‌دهد روشن شود.",
      "برای مقایسهٔ تجربهٔ کار با چند سرویس فارسی، {LINK} به جای مالکیت کیورد عمومی «چارت تولد»، روی خودِ مقایسه ابزارها تمرکز دارد.",
    ],
  },
  {
    target: "birth-chart-and-money",
    hints: ["پول", "ارزش", "دارایی", "منابع", "خانه دوم", "رشد"],
    anchors: ["چارت تولد و پول", "پول در چارت تولد", "خانه دوم و پول"],
    sources: ["second-house-in-natal-chart", "venus-in-natal-chart", "jupiter-in-natal-chart", "astrology-houses"],
    sentences: [
      "خانه دوم فقط درباره عدد موجودی حساب نیست؛ {LINK} پول را کنار ارزش شخصی و شیوهٔ مدیریت منابع می‌خواند.",
      "پیوند ونوس با ارزش‌گذاری در {LINK} کمک می‌کند موضوع پول را از صرفِ پیش‌بینی درآمد جدا کنیم.",
      "وقتی بحث رشد و فرصت مطرح می‌شود، {LINK} نشان می‌دهد مشتری را باید کنار خانه دوم و الگوی ارزش‌گذاری کل چارت دید.",
    ],
  },
  {
    target: "birth-chart-and-family-roots",
    hints: ["خانواده", "ریشه", "خانه چهارم", "ماه", "امنیت", "خانه"],
    anchors: ["چارت تولد و خانواده", "خانواده در چارت تولد", "خانه چهارم و خانواده"],
    sources: ["fourth-house-in-natal-chart", "what-is-moon-sign", "imum-coeli-ic-in-natal-chart", "astrology-houses"],
    sentences: [
      "برای وصل‌کردن خانه چهارم به تجربهٔ واقعی خانه و خانواده، {LINK} نقش ریشه‌ها، ماه و امنیت درونی را کنار هم می‌گذارد.",
      "نیازهای ماه در خلأ شکل نمی‌گیرند؛ {LINK} نشان می‌دهد این نیازها چطور با فضای خانوادگی و ریشه‌های فرد گره می‌خورند.",
      "IC یکی از نقاط مهم این محور است و {LINK} تصویر کامل‌تری از خانه، ریشه و تجربهٔ خانوادگی می‌دهد.",
    ],
  },
  {
    target: "birth-chart-and-creativity",
    hints: ["خلاقیت", "خانه پنجم", "ونوس", "خورشید", "آفرینش", "لذت"],
    anchors: ["خلاقیت در چارت تولد", "چارت تولد و خلاقیت", "خانه پنجم و خلاقیت"],
    sources: ["fifth-house-in-natal-chart", "venus-in-natal-chart", "sun-moon-rising", "astrology-houses"],
    sentences: [
      "خانه پنجم وقتی با خورشید و ونوس کنار هم دیده شود تصویر زنده‌تری از آفرینش می‌دهد؛ {LINK} همین ترکیب را باز می‌کند.",
      "لذت و سلیقهٔ ونوسی می‌تواند بخشی از زبان خلاق باشد و {LINK} آن را کنار خانه پنجم و خورشید قرار می‌دهد.",
      "برای جداکردن هویت، نیاز عاطفی و میل به ابراز، {LINK} نشان می‌دهد خلاقیت در چارت فقط به یک جایگاه محدود نیست.",
    ],
  },
  {
    target: "birth-chart-and-inner-life",
    hints: ["خلوت", "درونی", "خانه دوازدهم", "ناخودآگاه", "مرز", "نپتون"],
    anchors: ["خلوت درونی در چارت تولد", "خانه دوازدهم و ناخودآگاه", "زندگی درونی در چارت تولد"],
    sources: ["twelfth-house-in-natal-chart", "neptune-in-natal-chart", "natal-chart-uses-and-limits", "astrology-houses"],
    sentences: [
      "خانه دوازدهم را نمی‌شود فقط با برچسب «پنهان» خلاصه کرد؛ {LINK} آن را به خلوت، ناخودآگاه و مرزهای نادیدنی وصل می‌کند.",
      "ابهام نپتونی در {LINK} کنار تجربهٔ خلوت و مرزبندی درونی قرار می‌گیرد تا برداشت‌های مبهم کمتر شوند.",
      "برای اینکه زبان چارت جای تشخیص روان‌شناختی یا پزشکی ننشیند، {LINK} این محور درونی را با مرزهای روشن‌تری توضیح می‌دهد.",
    ],
  },
  {
    target: "birth-chart-and-daily-life",
    hints: ["روزمره", "عادت", "خانه ششم", "کار", "مریخ", "روتین"],
    anchors: ["چارت تولد و زندگی روزمره", "عادت‌ها در چارت تولد", "خانه ششم و عادت‌ها"],
    sources: ["sixth-house-in-natal-chart", "mars-in-natal-chart", "natal-chart-uses-and-limits", "astrology-houses"],
    sentences: [
      "خانه ششم در عمل با ریتم کار و عادت‌ها دیده می‌شود؛ {LINK} این حوزه را به انرژی و شیوهٔ اقدام روزانه وصل می‌کند.",
      "انرژی مریخ فقط در تصمیم‌های بزرگ دیده نمی‌شود و {LINK} نشان می‌دهد در روتین و عادت‌های روزمره هم چه نقشی دارد.",
      "چارت قرار نیست برنامهٔ روزانه را تعیین کند؛ {LINK} از آن برای دیدن الگوهای عادت و کار استفاده می‌کند، نه نسخه‌پیچی.",
    ],
  },
  {
    target: "birth-chart-and-career-path",
    hints: ["شغل", "حرفه", "خانه دهم", "مسیر", "اعتبار", "زحل", "حاکم"],
    anchors: ["چارت تولد و مسیر شغلی", "شغل در چارت تولد", "خانه دهم و مسیر حرفه‌ای"],
    sources: ["tenth-house-in-natal-chart", "saturn-in-natal-chart", "chart-ruler-in-natal-chart", "midheaven-mc-in-natal-chart"],
    sentences: [
      "خانه دهم فقط نام یک شغل را تحویل نمی‌دهد؛ {LINK} آن را کنار مسیر حرفه‌ای، اعتبار و انتخاب‌های بلندمدت می‌خواند.",
      "زحل می‌تواند به زمان، مسئولیت و ساختن تدریجی اشاره کند و {LINK} این نقش را در مسیر شغلی مشخص‌تر می‌کند.",
      "برای فهم جهت کلی چارت، {LINK} خانه دهم را با حاکم چارت و سایر نشانه‌های حرفه‌ای ترکیب می‌کند.",
    ],
  },
  {
    target: "important-placements-in-natal-chart",
    hints: ["مهم", "جایگاه", "وزن", "غالب", "اورب", "جنبه", "ترکیب"],
    anchors: ["جایگاه‌های مهم در چارت تولد", "اهمیت جایگاه‌ها در چارت", "چطور جایگاه مهم چارت را پیدا کنیم؟"],
    sources: ["how-to-read-birth-chart", "planets-in-birth-chart", "major-aspects", "birth-chart-report-layers"],
    sentences: [
      "در یک چارت همهٔ جایگاه‌ها وزن یکسان ندارند؛ {LINK} معیارهایی را می‌چیند که کمک می‌کنند اولویت خواندن مشخص شود.",
      "بعد از شناخت معنی هر سیاره، {LINK} نشان می‌دهد چرا بعضی جایگاه‌ها به‌خاطر زاویه، تکرار یا ارتباط با بخش‌های دیگر برجسته‌تر می‌شوند.",
      "جنبه‌ها می‌توانند وزن یک جایگاه را عوض کنند و {LINK} کمک می‌کند «مهم بودن» را از صرف حضور یک سیاره جدا کنیم.",
    ],
  },
  {
    target: "saturn-retrograde-in-natal-chart",
    hints: ["زحل", "رترو", "برگشتی", "مسئولیت", "ترس", "بلوغ"],
    anchors: ["زحل رترو در چارت تولد", "معنی زحل رترو", "زحل برگشتی در چارت"],
    sources: ["saturn-in-natal-chart", "retrograde-planets-explained", "saturn-return-explained", "planets-in-birth-chart"],
    sentences: [
      "وقتی زحل در چارت رترو باشد، {LINK} توضیح می‌دهد مسئولیت و ترس چطور می‌توانند بیشتر به شکل فرایند درونی تجربه شوند.",
      "رترو بودن به معنی خراب‌بودن سیاره نیست؛ {LINK} این اصل را مشخصاً برای زحل و موضوع بلوغ باز می‌کند.",
      "بازگشت زحل با زحل رترو یکی نیست و {LINK} کمک می‌کند وضعیت ناتال را از چرخهٔ زمانی زحل جدا نگه داریم.",
    ],
  },
  {
    target: "element-compatibility-in-astrology",
    hints: ["عنصر", "آتش", "خاک", "هوا", "آب", "سازگاری", "رابطه"],
    anchors: ["سازگاری عناصر در آسترولوژی", "سازگاری آتش، خاک، هوا و آب", "عناصر در رابطه عاطفی"],
    sources: ["four-elements-in-natal-chart", "why-sun-sign-is-not-enough", "birth-chart-and-relationships", "dominant-element-in-natal-chart"],
    sentences: [
      "شناخت چهار عنصر یک قدم است و {LINK} قدم بعدی را روی تعامل آتش، خاک، هوا و آب در رابطه می‌گذارد.",
      "سازگاری را نمی‌شود فقط از نشان خورشیدی گرفت؛ {LINK} نشان می‌دهد عناصر چه کمکی می‌کنند و کجا کافی نیستند.",
      "در رابطه، {LINK} عنصرها را کنار نیازهای واقعی و سایر بخش‌های چارت می‌گذارد تا یک تطبیق سادهٔ ماه تولد جای تحلیل را نگیرد.",
    ],
  },
  {
    target: "compatibility-beyond-sun-sign",
    hints: ["سازگاری", "نشان", "خورشید", "رابطه", "ماه", "رایزینگ"],
    anchors: ["سازگاری نشان‌ها در آسترولوژی", "سازگاری فراتر از ماه تولد", "سازگاری در چارت تولد"],
    sources: ["why-sun-sign-is-not-enough", "sun-moon-rising", "birth-chart-and-relationships", "major-aspects"],
    sentences: [
      "همان‌طور که شخصیت فقط از خورشید نمی‌آید، {LINK} هم توضیح می‌دهد چرا سازگاری رابطه را نباید به دو ماه تولد تقلیل داد.",
      "خورشید، ماه و رایزینگ سه لایهٔ متفاوت‌اند و {LINK} نشان می‌دهد همین تفاوت در سنجش سازگاری هم مهم است.",
      "برای رابطهٔ واقعی، {LINK} چند لایهٔ چارت را کنار هم می‌گذارد تا یک «بله یا نه» ساده جای شناخت دو نفر را نگیرد.",
    ],
  },
  {
    target: "symbolic-chart-stone",
    hints: ["سنگ", "نماد", "عنصر", "غالب", "درمان", "چارت"],
    anchors: ["سنگ نمادین چارت تولد", "سنگ مرتبط با چارت تولد", "انتخاب سنگ بر اساس چارت تولد"],
    sources: ["overall-chart-signature", "dominant-element-in-natal-chart", "four-elements-in-natal-chart", "natal-chart-uses-and-limits"],
    sentences: [
      "اگر بخواهیم از یک سنگ فقط به‌عنوان نماد شخصی استفاده کنیم، {LINK} آن را به امضای کلی چارت وصل می‌کند بدون اینکه ادعای درمان بسازد.",
      "عنصر غالب می‌تواند الهام‌بخش یک انتخاب نمادین باشد و {LINK} مرز این استفاده را با ادعاهای پزشکی یا قطعی روشن نگه می‌دارد.",
      "چهار عنصر می‌توانند زبان نمادین انتخاب را بسازند؛ {LINK} توضیح می‌دهد این کار کجا تفسیری است و کجا نباید به درمان تبدیل شود.",
    ],
  },
  {
    target: "angular-planets-in-natal-chart",
    hints: ["زاویه", "ASC", "MC", "رایزینگ", "سیاره", "نزدیک"],
    anchors: ["سیاره‌های زاویه‌دار", "سیاره نزدیک ASC یا MC", "سیاره زاویه‌ای در چارت تولد"],
    sources: ["four-angles-in-natal-chart", "midheaven-mc-in-natal-chart", "what-is-rising-sign", "planets-in-birth-chart"],
    sentences: [
      "نزدیکی یک سیاره به یکی از چهار زاویه می‌تواند وزن آن را بالا ببرد و {LINK} توضیح می‌دهد این برجستگی چطور خوانده می‌شود.",
      "MC فقط خودش مهم نیست؛ {LINK} نشان می‌دهد حضور یک سیاره نزدیک این زاویه چگونه می‌تواند در خواندن چارت پررنگ شود.",
      "رایزینگ نقطهٔ حساسی است و {LINK} فرق میان صرفِ داشتن یک سیاره در خانه اول و واقعاً زاویه‌دار بودن آن را روشن می‌کند.",
    ],
  },
  {
    target: "dominant-planets-in-natal-chart",
    hints: ["غالب", "سیاره", "وزن", "برجسته", "جنبه", "زاویه"],
    anchors: ["سیاره‌های غالب در چارت تولد", "سیاره غالب چارت", "پیدا کردن سیاره غالب"],
    sources: ["planets-in-birth-chart", "how-to-read-birth-chart", "major-aspects", "four-angles-in-natal-chart"],
    sentences: [
      "بعد از شناخت معنی سیاره‌ها، {LINK} توضیح می‌دهد چرا بعضی از آن‌ها در ساختار یک چارت صدای بلندتری دارند.",
      "برای تعیین اولویت خواندن، {LINK} به جای انتخاب سلیقه‌ای یک سیاره، چند عامل ساختاری را کنار هم می‌گذارد.",
      "تعداد و کیفیت جنبه‌ها یکی از عوامل برجستگی است و {LINK} آن را کنار زاویه‌ها و تکرارهای چارت می‌سنجد.",
    ],
  },
  {
    target: "synastry-explained",
    hints: ["سینستری", "رابطه", "مقایسه", "دو چارت", "جنبه"],
    anchors: ["سینستری چیست؟", "مقایسه دو چارت تولد", "سینستری رابطه"],
    sources: ["birth-chart-and-relationships", "major-aspects", "venus-mars-aspects-in-natal-chart", "sun-moon-aspects-in-natal-chart"],
    sentences: [
      "وقتی از رابطه به مقایسهٔ واقعی دو نفر می‌رسیم، {LINK} توضیح می‌دهد سینستری دقیقاً چه چیزی را روی دو چارت کنار هم می‌گذارد.",
      "جنبه‌ها در سینستری بین دو چارت ساخته می‌شوند و {LINK} فرق این کار را با خواندن جنبه‌های داخل یک چارت روشن می‌کند.",
      "برای دیدن کشش و اصطکاک میان دو نفر، {LINK} نشان می‌دهد چرا باید جایگاه‌ها و جنبه‌های هر دو چارت هم‌زمان دیده شوند.",
    ],
  },
  {
    target: "online-free-astrology",
    hints: ["آنلاین", "رایگان", "نتیجه", "ابزار", "اعتبار", "تفسیر"],
    anchors: ["طالع‌بینی آنلاین رایگان", "طالع‌بینی آنلاین", "نتیجه معتبرتر در طالع‌بینی آنلاین"],
    sources: ["birth-chart-basics", "what-is-birth-chart-interpretation", "how-to-read-birth-chart", "natal-chart-uses-and-limits"],
    sentences: [
      "در ابزارهای آنلاین، {LINK} توضیح می‌دهد چه داده‌ای وارد کنیم و از یک خروجی رایگان چه انتظاری واقع‌بینانه داشته باشیم.",
      "کیفیت نتیجه فقط به ظاهر گزارش بستگی ندارد؛ {LINK} معیارهای ساده‌ای برای فرق‌گذاشتن بین محاسبه، تفسیر و ادعای بیش از حد می‌دهد.",
      "اگر نتیجهٔ آنلاین را می‌خوانی، {LINK} کمک می‌کند دادهٔ واقعی چارت را از متن‌های کلی و غیرشخصی جدا کنی.",
    ],
  },
  {
    target: "mother-name-astrology",
    hints: ["اسم مادر", "نام", "ابجد", "اعتبار", "روش", "تولد"],
    anchors: ["طالع‌بینی با اسم مادر", "محاسبه طالع با اسم مادر", "طالع‌بینی اسم مادر"],
    sources: ["what-is-astrology", "natal-chart-uses-and-limits", "birth-chart-basics", "abjad-astrology"],
    sentences: [
      "روش‌های مبتنی بر نام با چارت تولد یکی نیستند؛ {LINK} توضیح می‌دهد «اسم مادر» در این ادعاها چه نقشی دارد و اعتبارش تا کجاست.",
      "برای مقایسه با چارت واقعی، {LINK} فرق میان دادهٔ تولد و روش‌های نام‌محور را روشن می‌کند.",
      "چارت تولد از زمان و مکان تولد ساخته می‌شود؛ {LINK} نشان می‌دهد چرا اضافه‌کردن اسم مادر آن را به یک روش محاسباتی نجومی تبدیل نمی‌کند.",
    ],
  },
  {
    target: "real-love-astrology",
    hints: ["عشق", "احساس", "رابطه", "ونوس", "خانه هفتم", "طرف مقابل"],
    anchors: ["طالع‌بینی عشق", "عشق در چارت تولد", "احساس طرف مقابل در آسترولوژی"],
    sources: ["birth-chart-and-relationships", "venus-in-natal-chart", "seventh-house-in-natal-chart", "venus-mars-aspects-in-natal-chart"],
    sentences: [
      "چارت می‌تواند الگوی رابطه را توصیف کند اما ذهن طرف مقابل را نمی‌خواند؛ {LINK} این مرز را در موضوع عشق روشن می‌کند.",
      "ونوس درباره ارزش و شیوهٔ رابطه سرنخ می‌دهد و {LINK} توضیح می‌دهد چرا از آن نمی‌شود احساس قطعی شخص دیگری را نتیجه گرفت.",
      "خانه هفتم درباره سبک شراکت حرف می‌زند؛ {LINK} آن را از ادعای دانستن احساس یا سرنوشت یک رابطه جدا می‌کند.",
    ],
  },
  {
    target: "mercury-retrograde-in-natal-chart",
    hints: ["عطارد", "رترو", "ذهن", "پردازش", "ارتباط", "برگشتی"],
    anchors: ["عطارد رترو در چارت تولد", "معنی عطارد رترو", "عطارد برگشتی در چارت"],
    sources: ["mercury-in-natal-chart", "mercury-retrograde-guide", "retrograde-planets-explained", "planets-in-birth-chart"],
    sentences: [
      "رترو بودن عطارد در چارت ناتال به معنی «ذهن خراب» نیست؛ {LINK} تفاوت را در ریتم پردازش و ارتباط توضیح می‌دهد.",
      "عطارد رتروی ترنزیتی با وضعیت ناتال یکی نیست و {LINK} مشخصاً روی عطارد رترو در زمان تولد تمرکز می‌کند.",
      "قاعدهٔ کلی رتروگراد وقتی به عطارد می‌رسد جزئیات خودش را دارد؛ {LINK} این جزئیات را بدون برچسب منفی باز می‌کند.",
    ],
  },
  {
    target: "bts-members-birth-dates-zodiac",
    hints: ["BTS", "تاریخ تولد", "برج", "ماه تولد", "اعضا"],
    anchors: ["ماه تولد اعضای BTS", "تاریخ تولد اعضای BTS", "برج فلکی اعضای BTS"],
    sources: ["persian-birth-months-astrology-guide", "why-sun-sign-is-not-enough", "sun-moon-rising", "birth-chart-basics"],
    sentences: [
      "برای نمونهٔ ملموس از تبدیل تاریخ تولد به نشان خورشیدی، {LINK} تاریخ و برج اعضای BTS را کنار محدودیت‌های این روش می‌آورد.",
      "اگر فقط ماه تولد اعضای BTS را می‌دانیم، {LINK} توضیح می‌دهد چه چیزهایی را می‌توان گفت و برای چه چیزهایی دادهٔ بیشتری لازم است.",
      "خورشید، ماه و رایزینگ یکسان نیستند؛ {LINK} در کنار تاریخ تولد اعضا یادآوری می‌کند که برج خورشیدی کل چارت نیست.",
    ],
  },
  {
    target: "full-moon-meditation",
    hints: ["ماه کامل", "مدیتیشن", "مراقبه", "نیت", "چرخه", "بدر"],
    anchors: ["مدیتیشن ماه کامل", "مراقبه ماه کامل", "نیت‌گذاری در ماه کامل"],
    sources: ["new-moon-vs-full-moon-astrology", "astrology-transits-explained", "birth-moon-phase-in-natal-chart", "what-is-moon-sign"],
    sentences: [
      "اگر از ماه کامل برای یک مکث شخصی استفاده می‌کنی، {LINK} یک روش ساده و ایمن برای مراقبه و نیت‌گذاری پیشنهاد می‌دهد.",
      "ترنزیت ماه می‌تواند بهانه‌ای برای توجه آگاهانه باشد و {LINK} این استفاده را از ادعای اثر درمانی یا نتیجهٔ قطعی جدا نگه می‌دارد.",
      "فاز ماه تولد با ماه کامل امروز یکی نیست؛ {LINK} مشخصاً دربارهٔ یک تمرین اختیاری در زمان بدر است.",
    ],
  },
  {
    target: "mars-retrograde-in-natal-chart",
    hints: ["مریخ", "رترو", "خشم", "اقدام", "انرژی", "برگشتی"],
    anchors: ["مریخ رترو در چارت تولد", "معنی مریخ رترو", "مریخ برگشتی در چارت"],
    sources: ["mars-in-natal-chart", "retrograde-planets-explained", "venus-mars-aspects-in-natal-chart", "planets-in-birth-chart"],
    sentences: [
      "وقتی مریخ در چارت ناتال رترو باشد، {LINK} توضیح می‌دهد اقدام، خشم و انرژی چطور ممکن است بیشتر به درون برگردند.",
      "رترو بودن به معنی کمبود انرژی نیست؛ {LINK} این وضعیت را به شیوهٔ متفاوت پردازش و ابراز نیروی مریخ ربط می‌دهد.",
      "در جنبه‌های ونوس و مریخ، {LINK} کمک می‌کند رترو بودن مریخ را به‌عنوان یک لایهٔ اضافه ببینیم، نه یک حکم درباره رابطه.",
    ],
  },
  {
    target: "venus-retrograde-in-natal-chart",
    hints: ["ونوس", "رترو", "ارزش", "رابطه", "خواسته", "برگشتی"],
    anchors: ["ونوس رترو در چارت تولد", "معنی ونوس رترو", "ونوس برگشتی در چارت"],
    sources: ["venus-in-natal-chart", "retrograde-planets-explained", "venus-mars-aspects-in-natal-chart", "planets-in-birth-chart"],
    sentences: [
      "ونوس رترو در ناتال را نباید با «بدشانسی در عشق» یکی گرفت؛ {LINK} آن را به بازنگری در ارزش و خواسته‌ها ربط می‌دهد.",
      "قاعدهٔ کلی رتروگراد در ونوس شکل خاصی پیدا می‌کند و {LINK} تفاوت میان رابطه، ارزش و میل را باز می‌کند.",
      "در جنبه‌های ونوس و مریخ، {LINK} نشان می‌دهد رترو بودن ونوس می‌تواند شیوهٔ تجربه و ابراز کشش را پیچیده‌تر کند.",
    ],
  },
  {
    target: "chinese-zodiac-snake",
    hints: ["چینی", "سال مار", "مار", "حیوان", "سنت", "نظام"],
    anchors: ["متولدین سال مار", "طالع‌بینی سال مار", "خصوصیات سال مار در طالع‌بینی چینی"],
    sources: ["what-is-chinese-astrology", "what-is-tropical-astrology", "what-is-vedic-astrology", "what-is-astrology"],
    sentences: [
      "بعد از شناخت چرخهٔ دوازده حیوان، {LINK} نمونهٔ مشخصی است برای دیدن اینکه نماد مار در روایت عمومی طالع‌بینی چینی چگونه توصیف می‌شود.",
      "برای قاطی‌نکردن نظام‌های غربی و چینی، {LINK} نمونه‌ای از زبان حیوان سال تولد است که با نشان تروپیکال یکی نیست.",
      "در مقایسه با سنت ودیک، {LINK} یادآوری می‌کند که حیوان سال تولد به یک دستگاه نمادین متفاوت تعلق دارد.",
    ],
  },
];

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulWords(value) {
  const stop = new Set(["چارت", "تولد", "آسترولوژی", "طالع‌بینی", "طالع", "معنی", "بررسی", "در", "با", "از", "به", "برای", "و", "یا", "یک", "است", "چیست"]);
  return normalizeText(value)
    .replace(/[؛،؟?!.:()«»|]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stop.has(word));
}

function isReservedChartProductAnchor(anchor) {
  return RESERVED_CHART_PRODUCT_ANCHORS.has(normalizeText(anchor));
}

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function articleIdsFromBody(bodyMarkdown) {
  return [...new Set([...String(bodyMarkdown ?? "").matchAll(ARTICLE_LINK_PATTERN)].map((match) => match[1]))];
}

function hasArticleLink(bodyMarkdown, target) {
  return articleIdsFromBody(bodyMarkdown).includes(target);
}

function corePageLinksFromBody(bodyMarkdown) {
  return [...String(bodyMarkdown ?? "").matchAll(CORE_PAGE_LINK_PATTERN)].map((match) => ({
    href: match[1],
    anchor: normalizeText(match[2] || match[1]),
  }));
}

function articleFromRow(row) {
  return {
    id: String(row.id),
    stableId: String(row.stable_id ?? ""),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    shortTitle: String(row.short_title ?? ""),
    seoTitle: String(row.seo_title ?? ""),
    metaDescription: String(row.meta_description ?? row.summary ?? ""),
    categoryId: String(row.category_id ?? ""),
    tags: jsonArray(row.tags),
    summary: String(row.summary ?? ""),
    intro: String(row.intro ?? ""),
    readingMinutes: Number(row.reading_minutes ?? 0),
    keyPoints: jsonArray(row.key_points),
    sections: jsonArray(row.sections),
    contextLinks: jsonArray(row.context_links),
    sources: jsonArray(row.sources),
    callToAction: row.call_to_action ?? null,
    relatedArticleIds: jsonArray(row.related_article_ids),
    publicationPriority: Number(row.publication_priority ?? 999),
    contentCluster: String(row.content_cluster ?? row.category_id ?? ""),
    articleRole: String(row.article_role ?? "support"),
    contentVersion: Number(row.content_version ?? 1),
    indexable: row.is_indexable === true,
    status: String(row.status ?? ""),
    publishedAt: row.published_at ? String(row.published_at) : null,
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    hasOpenDraft: row.has_open_draft === true,
    bodyMarkdown: String(row.body_markdown ?? ""),
  };
}

function isCurrentPublic(article, nowMs) {
  const publishedAtMs = article.publishedAt ? Date.parse(article.publishedAt) : Number.NaN;
  return (
    article.status === "published" &&
    article.indexable &&
    Number.isFinite(publishedAtMs) &&
    publishedAtMs <= nowMs &&
    !article.scheduledFor &&
    !article.deletedAt
  );
}

function isEligibleSource(article, nowMs) {
  const publishedAtMs = article.publishedAt ? Date.parse(article.publishedAt) : Number.NaN;
  return (
    isCurrentPublic(article, nowMs) &&
    !article.hasOpenDraft &&
    Number.isFinite(publishedAtMs) &&
    publishedAtMs <= nowMs - SOURCE_MIN_AGE_DAYS * 24 * 60 * 60 * 1000
  );
}

function buildLiveIncoming(publicArticles) {
  const incoming = new Map(publicArticles.map((article) => [article.stableId, new Set()]));
  for (const source of publicArticles) {
    for (const targetId of articleIdsFromBody(source.bodyMarkdown)) {
      if (!incoming.has(targetId)) continue;
      incoming.get(targetId).add(source.stableId);
    }
  }
  return incoming;
}

function pickParagraph(article, targetPlan, anchor, usedKeys) {
  const targetWords = new Set(meaningfulWords(`${targetPlan.hints.join(" ")} ${anchor}`));
  const sourceWords = new Set(meaningfulWords(`${article.title} ${article.shortTitle} ${article.seoTitle}`));
  const candidates = [];
  for (let sectionIndex = 0; sectionIndex < article.sections.length; sectionIndex += 1) {
    const section = article.sections[sectionIndex] ?? {};
    const paragraphs = jsonArray(section.paragraphs);
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
      const key = `${sectionIndex}:${paragraphIndex}`;
      if (usedKeys.has(key)) continue;
      const paragraph = String(paragraphs[paragraphIndex] ?? "").trim();
      if (paragraph.length < 45 || paragraph.includes("[[article:") || paragraph.includes("[[page:")) continue;
      const haystack = normalizeText(`${section.title ?? ""} ${paragraph}`);
      const targetHits = [...targetWords].filter((word) => haystack.includes(word)).length;
      const sourceHits = [...sourceWords].filter((word) => haystack.includes(word)).length;
      const score = targetHits * 8 + Math.min(sourceHits, 4) * 2 + Math.min(paragraph.length, 500) / 500;
      candidates.push({ sectionIndex, paragraphIndex, paragraph, score, targetHits, sourceHits });
    }
  }
  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0] ?? null;
  if (!best) return null;
  if (best.targetHits === 0 && best.sourceHits === 0) return null;
  return best;
}

function replaceExactParagraph(bodyMarkdown, before, after) {
  const text = String(bodyMarkdown ?? "");
  const first = text.indexOf(before);
  if (first < 0) return null;
  if (text.indexOf(before, first + before.length) >= 0) return null;
  return `${text.slice(0, first)}${after}${text.slice(first + before.length)}`;
}

function expandCandidates(targetPlan) {
  return targetPlan.sources.map((source, index) => {
    const anchor = targetPlan.anchors[index % targetPlan.anchors.length];
    const sentenceTemplate = targetPlan.sentences[index % targetPlan.sentences.length];
    const link = `[[article:${targetPlan.target}|${anchor}]]`;
    return {
      source,
      target: targetPlan.target,
      anchor,
      sentence: sentenceTemplate.replace("{LINK}", link),
    };
  });
}

function buildPlan(articles, nowMs) {
  const byStableId = new Map(articles.map((article) => [article.stableId, article]));
  const publicArticles = articles.filter((article) => isCurrentPublic(article, nowMs));
  const incoming = buildLiveIncoming(publicArticles);
  const actualUnderTarget = publicArticles
    .filter((article) => (incoming.get(article.stableId)?.size ?? 0) < MINIMUM_INBOUND_TARGET)
    .map((article) => article.stableId)
    .sort();
  const expectedSet = new Set(EXPECTED_TARGETS);
  const outOfScopeUnderTarget = actualUnderTarget.filter((stableId) => !expectedSet.has(stableId));
  const sourceAdditions = new Map();
  const usedParagraphs = new Map();
  const plannedSourcesByTarget = new Map();
  const placements = [];
  const skippedCandidates = [];
  const incompleteTargets = [];
  const alreadyCompleteTargets = [];

  for (const targetPlan of TARGET_PLANS) {
    const target = byStableId.get(targetPlan.target);
    if (!target || !isCurrentPublic(target, nowMs)) {
      incompleteTargets.push({
        stableId: targetPlan.target,
        reason: !target ? "target-missing" : "target-not-current-public",
      });
      continue;
    }
    const currentSources = new Set(incoming.get(target.stableId) ?? []);
    if (currentSources.size >= MINIMUM_INBOUND_TARGET) {
      alreadyCompleteTargets.push({ stableId: target.stableId, incoming: currentSources.size });
      continue;
    }
    const needed = MINIMUM_INBOUND_TARGET - currentSources.size;
    const plannedForTarget = new Set();
    const usedAnchors = new Set();

    for (const candidate of expandCandidates(targetPlan)) {
      if (plannedForTarget.size >= needed) break;
      const source = byStableId.get(candidate.source);
      if (!source) {
        skippedCandidates.push({ ...candidate, reason: "source-missing" });
        continue;
      }
      if (!isEligibleSource(source, nowMs)) {
        skippedCandidates.push({
          ...candidate,
          reason: source.hasOpenDraft ? "source-open-draft" : "source-not-public-or-too-young",
          sourcePublishedAt: source.publishedAt,
        });
        continue;
      }
      if (source.stableId === target.stableId) {
        skippedCandidates.push({ ...candidate, reason: "self-link" });
        continue;
      }
      if (currentSources.has(source.stableId) || plannedForTarget.has(source.stableId) || hasArticleLink(source.bodyMarkdown, target.stableId)) {
        skippedCandidates.push({ ...candidate, reason: "already-linked-or-duplicate-source" });
        continue;
      }
      if (isReservedChartProductAnchor(candidate.anchor)) {
        skippedCandidates.push({ ...candidate, reason: "reserved-chart-product-anchor" });
        continue;
      }
      if (usedAnchors.has(normalizeText(candidate.anchor))) {
        skippedCandidates.push({ ...candidate, reason: "duplicate-target-anchor" });
        continue;
      }
      if ((sourceAdditions.get(source.stableId) ?? 0) >= MAX_SOURCE_ADDITIONS) {
        skippedCandidates.push({ ...candidate, reason: "source-quota-full" });
        continue;
      }
      const used = usedParagraphs.get(source.stableId) ?? new Set();
      const picked = pickParagraph(source, targetPlan, candidate.anchor, used);
      if (!picked) {
        skippedCandidates.push({ ...candidate, reason: "no-safe-related-paragraph" });
        continue;
      }
      const after = `${picked.paragraph} ${candidate.sentence}`;
      const simulatedBody = replaceExactParagraph(source.bodyMarkdown, picked.paragraph, after);
      if (!simulatedBody) {
        skippedCandidates.push({ ...candidate, reason: "body-paragraph-not-unique" });
        continue;
      }

      placements.push({
        ...candidate,
        sectionIndex: picked.sectionIndex,
        paragraphIndex: picked.paragraphIndex,
        sectionTitle: String(source.sections[picked.sectionIndex]?.title ?? ""),
        paragraphBefore: picked.paragraph,
        targetTitle: target.title,
        existingInbound: currentSources.size,
      });
      used.add(`${picked.sectionIndex}:${picked.paragraphIndex}`);
      usedParagraphs.set(source.stableId, used);
      sourceAdditions.set(source.stableId, (sourceAdditions.get(source.stableId) ?? 0) + 1);
      plannedForTarget.add(source.stableId);
      usedAnchors.add(normalizeText(candidate.anchor));
    }

    plannedSourcesByTarget.set(target.stableId, plannedForTarget);
    if (currentSources.size + plannedForTarget.size < MINIMUM_INBOUND_TARGET) {
      incompleteTargets.push({
        stableId: target.stableId,
        title: target.title,
        existingInbound: currentSources.size,
        plannedInbound: plannedForTarget.size,
        finalPreparedInbound: currentSources.size + plannedForTarget.size,
        minimum: MINIMUM_INBOUND_TARGET,
        reason: "curated-plan-incomplete",
        skipped: skippedCandidates.filter((item) => item.target === target.stableId),
      });
    }
  }

  const coverage = TARGET_PLANS.map((targetPlan) => {
    const target = byStableId.get(targetPlan.target);
    const existing = target ? incoming.get(target.stableId)?.size ?? 0 : 0;
    const planned = plannedSourcesByTarget.get(targetPlan.target)?.size ?? 0;
    return {
      stableId: targetPlan.target,
      existingInbound: existing,
      plannedInbound: planned,
      finalPreparedInbound: existing + planned,
      minimum: MINIMUM_INBOUND_TARGET,
    };
  });

  return {
    publicArticles,
    incoming,
    placements,
    coverage,
    incompleteTargets,
    alreadyCompleteTargets,
    outOfScopeUnderTarget,
    actualUnderTarget,
    skippedCandidates,
  };
}

function aiSectionTemplate() {
  const first =
    "اگر با عبارت [[page:/chart|چارت تولد با هوش مصنوعی]] دنبال ابزار هالیوس آمده‌ای، نقطهٔ شروع صفحهٔ ساخت چارت است؛ خودِ داده‌های نجومی آنجا از موتور محاسباتی هالیوس می‌آیند، نه از حدس یک مدل زبانی.";
  const second =
    "در فرایند توسعه و بازبینی موتور هالیوس، ChatGPT و Claude به‌عنوان دستیار برای بررسی منطق، تست سناریوها و بازبینی پیاده‌سازی استفاده شده‌اند؛ اما هنگام [[page:/chart|ساخت چارت تولد در هالیوس]]، موقعیت سیارات، خانه‌ها و زاویه‌ها توسط این مدل‌ها حدس زده یا تولید نمی‌شوند.";
  return {
    section: {
      title: AI_FEEDER_SECTION_TITLE,
      paragraphs: [first, second],
      bullets: [],
    },
    markdown: `## ${AI_FEEDER_SECTION_TITLE}\n\n${first}\n\n${second}`,
    callToAction: {
      title: "چارت خودت را بساز",
      text: "تاریخ، ساعت و شهر تولدت را وارد کن تا محاسبهٔ چارت از موتور هالیوس شروع شود.",
      label: "ساخت چارت تولد در هالیوس",
      href: "/chart",
    },
  };
}

function planAiFeeder(article, nowMs) {
  const issues = [];
  if (!article) return { issues: ["ai-article-missing"], changed: false };
  if (!isCurrentPublic(article, nowMs)) issues.push("ai-article-not-current-public");
  if (article.hasOpenDraft) issues.push("ai-article-has-open-draft");
  const template = aiSectionTemplate();
  const matchingSections = article.sections.filter((section) => normalizeText(section?.title) === AI_FEEDER_SECTION_TITLE);
  const bodyHasHeading = String(article.bodyMarkdown).includes(`## ${AI_FEEDER_SECTION_TITLE}`);
  const chartLinks = corePageLinksFromBody(article.bodyMarkdown).filter((item) => item.href === "/chart");
  const hasExpectedParagraphs = template.section.paragraphs.every((paragraph) => String(article.bodyMarkdown).includes(paragraph));

  if (matchingSections.length > 1) issues.push("ai-section-duplicated");
  if ((matchingSections.length === 1 || bodyHasHeading) && !hasExpectedParagraphs) issues.push("ai-section-conflict");

  if (issues.length) return { issues, changed: false };

  if (matchingSections.length === 1 && bodyHasHeading && hasExpectedParagraphs) {
    const ctaOk =
      article.callToAction?.href === "/chart" &&
      normalizeText(article.callToAction?.label) === normalizeText(template.callToAction.label);
    return {
      issues: [],
      changed: !ctaOk,
      alreadyPresent: true,
      sections: article.sections,
      bodyMarkdown: article.bodyMarkdown,
      callToAction: ctaOk ? article.callToAction : template.callToAction,
      chartLinkCount: chartLinks.length,
    };
  }

  if (matchingSections.length !== 0 || bodyHasHeading) {
    return { issues: ["ai-partial-section-state"], changed: false };
  }

  const sections = JSON.parse(JSON.stringify(article.sections));
  sections.push(template.section);
  const bodyMarkdown = `${String(article.bodyMarkdown).trim()}\n\n${template.markdown}\n`;
  return {
    issues: [],
    changed: true,
    alreadyPresent: false,
    sections,
    bodyMarkdown,
    callToAction: template.callToAction,
    chartLinkCount: corePageLinksFromBody(bodyMarkdown).filter((item) => item.href === "/chart").length,
  };
}

function buildSnapshot(row, changes, nextVersion) {
  return {
    stableId: String(row.stable_id),
    slug: String(row.slug),
    title: String(row.title),
    shortTitle: String(row.short_title ?? ""),
    seoTitle: row.seo_title ?? null,
    metaDescription: String(row.meta_description ?? row.summary ?? ""),
    categoryId: String(row.category_id ?? ""),
    tags: jsonArray(row.tags),
    summary: String(row.summary ?? ""),
    intro: String(row.intro ?? ""),
    readingMinutes: Number(row.reading_minutes ?? 0),
    publicationPriority: Number(row.publication_priority ?? 999),
    contentCluster: String(row.content_cluster ?? row.category_id ?? ""),
    articleRole: String(row.article_role ?? "support"),
    relatedArticleIds: jsonArray(row.related_article_ids),
    indexable: row.is_indexable === true,
    bodyMarkdown: changes.bodyMarkdown ?? String(row.body_markdown ?? ""),
    keyPoints: jsonArray(row.key_points),
    sections: changes.sections ?? jsonArray(row.sections),
    contextLinks: jsonArray(row.context_links),
    sources: jsonArray(row.sources),
    callToAction: Object.prototype.hasOwnProperty.call(changes, "callToAction") ? changes.callToAction : row.call_to_action ?? null,
    contentVersion: nextVersion,
  };
}

async function insertRevision(tx, row, snapshot, changeNote) {
  await tx`
    insert into public.wiki_article_revisions (
      article_id, revision_number, snapshot, change_note, created_by,
      revision_status, published_at
    ) values (
      ${String(row.id)}::uuid,
      (select coalesce(max(existing.revision_number), 0)::integer + 1
       from public.wiki_article_revisions as existing
       where existing.article_id = ${String(row.id)}::uuid),
      ${tx.json(snapshot)},
      ${changeNote},
      null,
      'published',
      now()
    )
  `;
}

async function insertAddedInlineLink(tx, sourceArticleId, targetId, anchor) {
  const sourceToken = `[[article:${targetId}|${anchor}]]`;
  await tx`
    insert into public.wiki_internal_links (
      source_article_id, target_stable_id, link_kind, source_token,
      activation_status, activated_at, last_verified_at, activation_error
    ) values (
      ${sourceArticleId}::uuid, ${targetId}, 'inline', ${sourceToken},
      'active', now(), now(), null
    )
    on conflict (source_article_id, target_stable_id, link_kind, source_token)
    do update set
      activation_status = 'active',
      activated_at = now(),
      last_verified_at = now(),
      activation_error = null,
      disabled_at = null
  `;
}

async function loadArticles(tx) {
  const rows = await tx`
    select
      article.*,
      exists (
        select 1
        from public.wiki_article_drafts as draft
        where draft.article_id = article.id
      ) as has_open_draft
    from public.wiki_articles as article
    where article.deleted_at is null
    order by article.stable_id
  `;
  return rows.map(articleFromRow);
}

async function submitIndexNowBestEffort(slugs) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://halleus.ir").replace(/\/+$/, "");
  const key = process.env.HALLEUS_INDEXNOW_KEY;
  const urlList = [...new Set(slugs.filter(Boolean).map((slug) => `${site}/wiki/${slug}`))].slice(0, 10000);
  if (!key || !urlList.length) return { ok: true, skipped: true, submitted: 0 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INDEXNOW_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        host: new URL(site).host,
        key,
        keyLocation: `${site}/indexnow-key.txt`,
        urlList,
      }),
    });
    return { ok: response.ok, skipped: false, status: response.status, submitted: response.ok ? urlList.length : 0 };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      submitted: 0,
      error: error instanceof Error ? error.message.slice(0, 300) : "IndexNow request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = { apply: false, selfCheck: false, compact: false };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--self-check") options.selfCheck = true;
    else if (arg === "--compact") options.compact = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function assertSelfCheck() {
  if (EXPECTED_TARGETS.length !== 28 || new Set(EXPECTED_TARGETS).size !== 28) {
    throw new Error("self-check failed: expected target list must contain 28 unique stable IDs.");
  }
  if (TARGET_PLANS.length !== 28 || new Set(TARGET_PLANS.map((item) => item.target)).size !== 28) {
    throw new Error("self-check failed: target plans must cover 28 unique targets.");
  }
  for (const target of EXPECTED_TARGETS) {
    if (!TARGET_PLANS.some((item) => item.target === target)) {
      throw new Error(`self-check failed: missing target plan ${target}`);
    }
  }
  if (MINIMUM_INBOUND_TARGET !== 3 || SOURCE_MIN_AGE_DAYS !== 10 || MAX_SOURCE_ADDITIONS !== 5) {
    throw new Error("self-check failed: inbound/source safety constants drifted.");
  }
  for (const targetPlan of TARGET_PLANS) {
    if (targetPlan.sources.length < 4) throw new Error(`self-check failed: target needs fallback sources ${targetPlan.target}`);
    if (targetPlan.anchors.length < 3 || targetPlan.sentences.length < 3) {
      throw new Error(`self-check failed: target needs varied anchors/sentences ${targetPlan.target}`);
    }
    for (const candidate of expandCandidates(targetPlan)) {
      if (candidate.source === candidate.target) throw new Error(`self-check failed: self-link candidate ${candidate.target}`);
      if (isReservedChartProductAnchor(candidate.anchor)) {
        throw new Error(`self-check failed: Wiki target uses reserved /chart anchor ${candidate.target} :: ${candidate.anchor}`);
      }
      if (!candidate.sentence.includes(`[[article:${candidate.target}|${candidate.anchor}]]`)) {
        throw new Error(`self-check failed: sentence/token mismatch ${candidate.target}`);
      }
    }
  }
  const ai = aiSectionTemplate();
  const allAiText = `${ai.markdown}\n${JSON.stringify(ai.callToAction)}`;
  for (const marker of ["ChatGPT", "Claude", "[[page:/chart|چارت تولد با هوش مصنوعی]]", "[[page:/chart|ساخت چارت تولد در هالیوس]]"]) {
    if (!allAiText.includes(marker)) throw new Error(`self-check failed: AI feeder marker missing ${marker}`);
  }
  if (ai.callToAction.href !== "/chart") throw new Error("self-check failed: AI CTA must target /chart.");
  if (/ChatGPT[^.\n]{0,80}(محاسبه می‌کند|محاسبه می کند)/u.test(allAiText)) {
    throw new Error("self-check failed: AI copy must not claim ChatGPT performs runtime astronomy calculations.");
  }

  const fixtureNow = Date.parse("2026-09-04T19:00:00.000Z");
  const makeArticle = (stableId, overrides = {}) => ({
    id: `fixture-${stableId}`,
    stableId,
    slug: stableId,
    title: stableId,
    shortTitle: stableId,
    seoTitle: stableId,
    metaDescription: "",
    categoryId: "foundations",
    tags: [],
    summary: "",
    intro: "",
    readingMinutes: 4,
    keyPoints: [],
    sections: [{ title: "بخش مرتبط", paragraphs: ["این پاراگراف پایه برای بررسی موضوع مقاله و پیوندهای مرتبط در یک زمینه روشن و طبیعی نوشته شده است."], bullets: [] }],
    contextLinks: [],
    sources: [],
    callToAction: null,
    relatedArticleIds: [],
    publicationPriority: 100,
    contentCluster: "fixture",
    articleRole: "support",
    contentVersion: 1,
    indexable: true,
    status: "published",
    publishedAt: "2026-08-01T00:00:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    hasOpenDraft: false,
    bodyMarkdown: "این پاراگراف پایه برای بررسی موضوع مقاله و پیوندهای مرتبط در یک زمینه روشن و طبیعی نوشته شده است.",
    ...overrides,
  });

  const fixtureById = new Map();
  for (const targetPlan of TARGET_PLANS) {
    fixtureById.set(targetPlan.target, makeArticle(targetPlan.target, {
      publishedAt: "2026-09-01T00:00:00.000Z",
      sections: [{ title: "متن هدف", paragraphs: [`این متن هدف درباره ${targetPlan.hints.join(" ")} است و هنوز لینک ورودی کافی ندارد.`], bullets: [] }],
      bodyMarkdown: `این متن هدف درباره ${targetPlan.hints.join(" ")} است و هنوز لینک ورودی کافی ندارد.`,
    }));
    for (const sourceId of targetPlan.sources) {
      if (fixtureById.has(sourceId)) continue;
      fixtureById.set(sourceId, makeArticle(sourceId, {
        sections: [{ title: "متن منبع", paragraphs: [], bullets: [] }],
        bodyMarkdown: "",
      }));
    }
  }
  for (const targetPlan of TARGET_PLANS) {
    for (const sourceId of targetPlan.sources) {
      const source = fixtureById.get(sourceId);
      if (!source || EXPECTED_TARGETS.includes(sourceId)) continue;
      const paragraph = `در این بخش ${targetPlan.hints.join(" ")} در کنار موضوع اصلی منبع بررسی می‌شود تا ارتباط معنایی جمله روشن و قابل استفاده باشد.`;
      source.sections[0].paragraphs.push(paragraph);
    }
  }
  for (const source of fixtureById.values()) {
    if (!source.bodyMarkdown && source.sections[0]?.paragraphs?.length) {
      source.bodyMarkdown = source.sections[0].paragraphs.join("\n\n");
    }
  }
  const fixtureExistingEdges = [
    ["element-compatibility-in-astrology", "compatibility-beyond-sun-sign"],
    ["dominant-planets-in-natal-chart", "angular-planets-in-natal-chart"],
    ["important-placements-in-natal-chart", "dominant-planets-in-natal-chart"],
    ["compatibility-beyond-sun-sign", "synastry-explained"],
  ];
  for (const [sourceId, targetId] of fixtureExistingEdges) {
    const source = fixtureById.get(sourceId);
    source.bodyMarkdown = `${source.bodyMarkdown}\n\n[[article:${targetId}|پیوند موجود]]`;
  }

  const fixturePlan = buildPlan([...fixtureById.values()], fixtureNow);
  if (fixturePlan.incompleteTargets.length !== 0) {
    throw new Error(`self-check failed: realistic 24-zero + 4-one fixture must be complete: ${JSON.stringify(fixturePlan.incompleteTargets)}`);
  }
  if (fixturePlan.placements.length !== 80) {
    throw new Error(`self-check failed: baseline fixture should plan exactly 80 missing live edges, got ${fixturePlan.placements.length}.`);
  }
  const fixturePlanOutput = fixturePlan.placements.map((placement) => ({
    source: placement.source,
    target: placement.target,
    anchor: placement.anchor,
    section: placement.sectionTitle,
    paragraphPreview: placement.paragraphBefore.slice(0, 180),
    reason: "curated-topical-bridge",
  }));
  if (
    fixturePlanOutput.length !== 80 ||
    fixturePlanOutput.some((item) => !item.source || !item.target || !item.anchor || !item.section || !item.paragraphPreview)
  ) {
    throw new Error("self-check failed: dry-run plan output must expose every selected source, target, anchor, section, and paragraph preview.");
  }
  if (fixturePlan.coverage.some((item) => item.finalPreparedInbound < 3)) {
    throw new Error("self-check failed: baseline fixture coverage must reach 3 for all 28 targets.");
  }

  const extraArticle = makeArticle("newly-published-outside-scope", {
    publishedAt: "2026-09-04T18:30:00.000Z",
  });
  const extraPlan = buildPlan([...fixtureById.values(), extraArticle], fixtureNow);
  if (!extraPlan.outOfScopeUnderTarget.includes("newly-published-outside-scope")) {
    throw new Error("self-check failed: extra newly published under-target article must be reported out of scope.");
  }

  const tooYoungFixtures = [...fixtureById.values()].map((item) => JSON.parse(JSON.stringify(item)));
  const tooYoungSource = tooYoungFixtures.find((item) => item.stableId === "pluto-in-natal-chart");
  tooYoungSource.publishedAt = "2026-09-01T00:00:00.000Z";
  const tooYoungPlan = buildPlan(tooYoungFixtures, fixtureNow);
  if (tooYoungPlan.incompleteTargets.some((item) => item.stableId === "pluto-in-houses")) {
    throw new Error("self-check failed: target must use curated fallback when a source is too young.");
  }
  if (!tooYoungPlan.skippedCandidates.some((item) => item.source === "pluto-in-natal-chart" && item.reason === "source-not-public-or-too-young")) {
    throw new Error("self-check failed: too-young source must be classified explicitly.");
  }

  const missingSourceFixtures = [...fixtureById.values()]
    .filter((item) => item.stableId !== "what-is-chinese-astrology")
    .map((item) => JSON.parse(JSON.stringify(item)));
  const missingSourcePlan = buildPlan(missingSourceFixtures, fixtureNow);
  if (missingSourcePlan.incompleteTargets.some((item) => item.stableId === "chinese-zodiac-snake")) {
    throw new Error("self-check failed: snake target must retain enough fallbacks when one source is missing.");
  }
  if (!missingSourcePlan.skippedCandidates.some((item) => item.source === "what-is-chinese-astrology" && item.reason === "source-missing")) {
    throw new Error("self-check failed: missing source must be classified explicitly.");
  }

  const partialFixtures = [...fixtureById.values()].map((item) => JSON.parse(JSON.stringify(item)));
  const partialSource = partialFixtures.find((item) => item.stableId === "what-is-astrology");
  partialSource.bodyMarkdown = `${partialSource.bodyMarkdown}\n\n[[article:astrology-future-prediction|پیوند موجود اضافه]]`;
  const partialPlan = buildPlan(partialFixtures, fixtureNow);
  const futureCoverage = partialPlan.coverage.find((item) => item.stableId === "astrology-future-prediction");
  if (!futureCoverage || futureCoverage.existingInbound < 1 || futureCoverage.finalPreparedInbound < 3) {
    throw new Error("self-check failed: partial/stale state must reuse existing inbound and only fill the deficit.");
  }

  const selfSource = readFileSync(new URL(import.meta.url), "utf8");
  if (/^import\s+postgres\s+from\s+"postgres";/m.test(selfSource)) {
    throw new Error("self-check failed: database dependency must be dynamically imported after self-check.");
  }

  console.log("Wiki published inbound + chart ownership repair self-check OK");
}

async function main() {
  const options = parseArgs();
  if (options.selfCheck) {
    assertSelfCheck();
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const nowMs = Date.now();
  let changedSlugs = [];
  try {
    const result = await sql.begin(async (tx) => {
      await tx`set local lock_timeout = '5s'`;
      await tx`set local statement_timeout = '0'`;
      const lock = await tx`select pg_try_advisory_xact_lock(hashtext(${RUN_ID})) as acquired`;
      if (lock[0]?.acquired !== true) throw new Error("Another published Wiki inbound repair is already running.");

      const articles = await loadArticles(tx);
      const byStableId = new Map(articles.map((article) => [article.stableId, article]));
      const plan = buildPlan(articles, nowMs);
      const aiArticle = byStableId.get(AI_ARTICLE_ID);
      const aiPlan = planAiFeeder(aiArticle, nowMs);
      const failures = [
        ...plan.incompleteTargets,
        ...aiPlan.issues.map((reason) => ({ stableId: AI_ARTICLE_ID, reason })),
      ];
      const completeCandidate = failures.length === 0;

      if (options.apply && !completeCandidate) {
        throw new Error(`CANDIDATE_FAILURE :: ${JSON.stringify(failures)}`);
      }

      const applied = [];
      const changedSourceSlugs = [];
      if (options.apply) {
        const placementsBySource = new Map();
        for (const placement of plan.placements) {
          const items = placementsBySource.get(placement.source) ?? [];
          items.push(placement);
          placementsBySource.set(placement.source, items);
        }

        for (const [sourceStableId, items] of placementsBySource) {
          const source = byStableId.get(sourceStableId);
          if (!source) throw new Error(`CANDIDATE_FAILURE :: source disappeared ${sourceStableId}`);
          const rowRows = await tx`
            select *
            from public.wiki_articles
            where stable_id = ${sourceStableId}
            for update
          `;
          const row = rowRows[0];
          if (!row) throw new Error(`CANDIDATE_FAILURE :: source lock missing ${sourceStableId}`);
          let bodyMarkdown = String(row.body_markdown ?? "");
          const sections = JSON.parse(JSON.stringify(jsonArray(row.sections)));
          const appliedForSource = [];

          for (const placement of items) {
            if (hasArticleLink(bodyMarkdown, placement.target)) continue;
            const before = String(sections[placement.sectionIndex]?.paragraphs?.[placement.paragraphIndex] ?? "");
            if (normalizeText(before) !== normalizeText(placement.paragraphBefore)) {
              throw new Error(`CANDIDATE_FAILURE :: source paragraph drift ${sourceStableId} ${placement.target}`);
            }
            const after = `${before.trim()} ${placement.sentence}`;
            const nextBody = replaceExactParagraph(bodyMarkdown, before, after);
            if (!nextBody) throw new Error(`CANDIDATE_FAILURE :: body paragraph drift ${sourceStableId} ${placement.target}`);
            sections[placement.sectionIndex].paragraphs[placement.paragraphIndex] = after;
            bodyMarkdown = nextBody;
            appliedForSource.push(placement);
          }

          if (!appliedForSource.length) continue;
          const nextVersion = Number(row.content_version ?? 1) + 1;
          const snapshot = buildSnapshot(row, { sections, bodyMarkdown }, nextVersion);
          await tx`
            update public.wiki_articles
            set sections = ${tx.json(sections)},
                body_markdown = ${bodyMarkdown},
                content_version = ${nextVersion},
                updated_at = now()
            where id = ${String(row.id)}::uuid
          `;
          await insertRevision(tx, row, snapshot, `Repair published Wiki inbound links for ${RUN_ID}`);
          for (const placement of appliedForSource) {
            await insertAddedInlineLink(tx, String(row.id), placement.target, placement.anchor);
            applied.push({
              source: placement.source,
              target: placement.target,
              anchor: placement.anchor,
              section: placement.sectionTitle,
            });
          }
          changedSourceSlugs.push(String(row.slug));
        }

        if (aiPlan.changed) {
          const aiRows = await tx`
            select *
            from public.wiki_articles
            where stable_id = ${AI_ARTICLE_ID}
            for update
          `;
          const aiRow = aiRows[0];
          if (!aiRow) throw new Error("CANDIDATE_FAILURE :: AI article disappeared before apply.");
          const nextVersion = Number(aiRow.content_version ?? 1) + 1;
          const snapshot = buildSnapshot(aiRow, {
            sections: aiPlan.sections,
            bodyMarkdown: aiPlan.bodyMarkdown,
            callToAction: aiPlan.callToAction,
          }, nextVersion);
          await tx`
            update public.wiki_articles
            set sections = ${tx.json(aiPlan.sections)},
                body_markdown = ${aiPlan.bodyMarkdown},
                call_to_action = ${tx.json(aiPlan.callToAction)},
                content_version = ${nextVersion},
                updated_at = now()
            where id = ${String(aiRow.id)}::uuid
          `;
          await insertRevision(tx, aiRow, snapshot, `Add /chart AI feeder and transparent AI-development copy for ${RUN_ID}`);
          changedSourceSlugs.push(String(aiRow.slug));
        }

        const verifiedArticles = await loadArticles(tx);
        const verifiedPublic = verifiedArticles.filter((article) => isCurrentPublic(article, nowMs));
        const verifiedIncoming = buildLiveIncoming(verifiedPublic);
        const postFailures = [];
        for (const target of EXPECTED_TARGETS) {
          const count = verifiedIncoming.get(target)?.size ?? 0;
          if (count < MINIMUM_INBOUND_TARGET) postFailures.push({ stableId: target, incoming: count });
        }
        const verifiedAi = verifiedArticles.find((article) => article.stableId === AI_ARTICLE_ID);
        const verifiedAiPlan = planAiFeeder(verifiedAi, nowMs);
        const verifiedAiChartLinks = verifiedAi
          ? corePageLinksFromBody(verifiedAi.bodyMarkdown).filter((item) => item.href === "/chart")
          : [];
        if (verifiedAiPlan.issues.length || verifiedAiChartLinks.length < 2 || verifiedAi?.callToAction?.href !== "/chart") {
          postFailures.push({
            stableId: AI_ARTICLE_ID,
            reason: "ai-feeder-verification-failed",
            issues: verifiedAiPlan.issues,
            chartLinks: verifiedAiChartLinks.length,
            ctaHref: verifiedAi?.callToAction?.href ?? null,
          });
        }
        if (postFailures.length) {
          throw new Error(`CANDIDATE_FAILURE :: post-apply verification ${JSON.stringify(postFailures)}`);
        }

        await tx`
          insert into halleus_private.admin_audit_events (
            actor_user_id, actor_role, action, target_type, target_id,
            before_summary, after_summary, reason, success, request_correlation_id
          ) values (
            null, 'system', 'system.wiki.published_inbound_chart_ownership_repair',
            'wiki_graph', ${RUN_ID},
            ${tx.json({
              scopedTargets: EXPECTED_TARGETS.length,
              minimumInbound: MINIMUM_INBOUND_TARGET,
              sourceMinAgeDays: SOURCE_MIN_AGE_DAYS,
              maxSourceAdditions: MAX_SOURCE_ADDITIONS,
            })},
            ${tx.json({
              appliedLinks: applied.length,
              changedSourceCount: changedSourceSlugs.length,
              outOfScopeUnderTarget: plan.outOfScopeUnderTarget,
              aiFeederChanged: aiPlan.changed,
            })},
            'Repair the locked published Wiki inbound set while keeping generic chart product intent owned by /chart.',
            true,
            ${RUN_ID}
          )
        `;
      }

      changedSlugs = [...new Set(changedSourceSlugs)];
      return {
        mode: options.apply ? "applied" : "dry-run",
        runId: RUN_ID,
        completeCandidate,
        scopedTargetCount: EXPECTED_TARGETS.length,
        currentPublicCount: plan.publicArticles.length,
        actualUnderTargetCount: plan.actualUnderTarget.length,
        outOfScopeUnderTarget: plan.outOfScopeUnderTarget,
        alreadyCompleteTargets: plan.alreadyCompleteTargets,
        plannedLinkCount: plan.placements.length,
        planned: plan.placements.map((placement) => ({
          source: placement.source,
          target: placement.target,
          anchor: placement.anchor,
          section: placement.sectionTitle,
          paragraphPreview: placement.paragraphBefore.slice(0, 180),
          reason: "curated-topical-bridge",
        })),
        appliedLinkCount: options.apply ? applied.length : 0,
        changedSourceSlugs,
        coverage: plan.coverage,
        incompleteTargets: plan.incompleteTargets,
        skippedCandidates: plan.skippedCandidates,
        aiFeeder: {
          changed: aiPlan.changed,
          alreadyPresent: aiPlan.alreadyPresent === true,
          issues: aiPlan.issues,
          chartLinkCountAfterCandidate: aiPlan.chartLinkCount ?? 0,
          ctaHref: aiPlan.callToAction?.href ?? aiArticle?.callToAction?.href ?? null,
        },
        applied,
      };
    });

    const discovery = options.apply ? await submitIndexNowBestEffort(changedSlugs) : null;
    const output = { ...result, discovery };
    if (options.compact) {
      console.log(JSON.stringify({
        mode: output.mode,
        runId: output.runId,
        completeCandidate: output.completeCandidate,
        scopedTargetCount: output.scopedTargetCount,
        currentPublicCount: output.currentPublicCount,
        actualUnderTargetCount: output.actualUnderTargetCount,
        outOfScopeUnderTarget: output.outOfScopeUnderTarget,
        plannedLinkCount: output.plannedLinkCount,
        planned: output.planned,
        appliedLinkCount: output.appliedLinkCount,
        completeCoverageCount: output.coverage.filter((item) => item.finalPreparedInbound >= item.minimum).length,
        incompleteTargets: output.incompleteTargets,
        aiFeeder: output.aiFeeder,
        changedSourceCount: output.changedSourceSlugs.length,
        appliedSample: output.applied.slice(0, 20),
        skippedSample: output.skippedCandidates.slice(0, 20),
        discovery,
      }, null, 2));
    } else {
      console.log(JSON.stringify(output, null, 2));
    }
    if (!output.completeCandidate) process.exitCode = 2;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
