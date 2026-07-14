export type BehavioralPlanetId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

export type BehavioralSignId =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type BehavioralHouseNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type PlacementBehavioralInterpretation = {
  plainMeaning: string;
  dailyLifeExample: string;
  healthyExpression: string;
  possibleFriction: string;
  focus: string;
  smallExperiment: string;
  symbolicBody: string;
};

export type PlacementBehavioralInterpretationInput = {
  planetId: string;
  signId: string;
  houseNumber?: number | null;
  retrograde?: boolean;
};

type PlanetSemantic = {
  role: string;
  dailyVerb: string;
  healthy: string;
  friction: string;
  experiment: string;
  symbolicBody: string;
};

type SignSemantic = {
  method: string;
  dailyPattern: string;
  healthy: string;
  friction: string;
  experiment: string;
};

type HouseSemantic = {
  scene: string;
  dailyPattern: string;
  healthy: string;
  friction: string;
  experiment: string;
};

const PLANET_SEMANTICS: Record<BehavioralPlanetId, PlanetSemantic> = {
  sun: {
    role: "هویت، جهت شخصی، حق انتخاب و شیوه دیده‌شدن",
    dailyVerb: "جایگاه خود را نشان بدهی و تصمیمی را با امضای شخصی جلو ببری",
    healthy: "حضور روشن، خلاقیت و انتخابی که فقط برای جلب تأیید دیگران نیست",
    friction: "وابسته شدن به تصویری که باید از خودت حفظ کنی یا پنهان کردن نظر واقعی",
    experiment: "در یک موقعیت کم‌ریسک، نظرت را در دو جمله بگو و یک قدم کوچک را به نام خودت شروع کن",
    symbolicBody: "در زبان نمادین، خورشید با نیروی حیاتی، قلب و مرکز بدن تداعی می‌شود",
  },
  moon: {
    role: "امنیت عاطفی، واکنش، ریتم بدن و حس تعلق",
    dailyVerb: "بفهمی برای آرام شدن، دریافت حمایت و احساس امنیت به چه چیزی نیاز داری",
    healthy: "مراقبت، تنظیم احساس و ساختن محیطی که بدن و رابطه در آن قابل اعتمادترند",
    friction: "واکنش دادن پیش از نام‌گذاری احساس یا ماندن در امنیت آشنا فقط چون آشناست",
    experiment: "پیش از واکنش، نام احساس، نیاز بدنی و یک درخواست روشن را جداگانه بنویس",
    symbolicBody: "در زبان نمادین، ماه با خواب، معده، مایعات بدن و ریتم‌های مراقبتی تداعی می‌شود",
  },
  mercury: {
    role: "فکر، نام‌گذاری، یادگیری، تصمیم و گفت‌وگو",
    dailyVerb: "موضوع را بفهمی، به کلمه تبدیل کنی و میان چند گزینه تصمیم بگیری",
    healthy: "زبان روشن، کنجکاوی و تبدیل فکر به توضیح یا تصمیم قابل استفاده",
    friction: "زیاد تحلیل کردن، پریدن میان احتمال‌ها یا حرف زدن بدون رسیدن به نتیجه",
    experiment: "مسئله را در سه خط بنویس: چه می‌دانم، چه نمی‌دانم و قدم بعدی چیست",
    symbolicBody: "در زبان نمادین، عطارد با سیستم عصبی، دست‌ها، تنفس و سرعت پردازش تداعی می‌شود",
  },
  venus: {
    role: "ارزش، لذت، جذب، نزدیکی و انتخاب رابطه‌ای",
    dailyVerb: "تشخیص بدهی چه چیزی برایت خوشایند، ارزشمند و در رابطه قابل قبول است",
    healthy: "نزدیکی همراه با انتخاب، لذت بدون حذف خود و بیان روشن ارزش‌ها",
    friction: "سنجیدن ارزش خود از واکنش دیگران یا نگفتن نارضایتی برای حفظ ظاهر هماهنگ",
    experiment: "در یک انتخاب رابطه‌ای، یک چیز مطلوب و یک مرز غیرقابل‌چشم‌پوشی را روشن بگو",
    symbolicBody: "در زبان نمادین، زهره با گلو، پوست، کلیه‌ها و حس تعادل و لذت تداعی می‌شود",
  },
  mars: {
    role: "خواستن، اقدام، خشم، جرئت و دفاع از مرز",
    dailyVerb: "خواسته‌ات را به حرکت، تصمیم یا دفاع عملی تبدیل کنی",
    healthy: "اقدام روشن، جرئت درخواست و دفاع از خود بدون حمله یا حذف دیگری",
    friction: "انباشته شدن خشم، عجله یا عمل کردن پیش از فهمیدن خواسته واقعی",
    experiment: "پیش از اقدام بنویس: چه می‌خواهم، از چه واکنشی می‌ترسم و کوچک‌ترین درخواست روشن چیست",
    symbolicBody: "در زبان نمادین، مریخ با عضله، خون و انرژی حرکتی تداعی می‌شود",
  },
  jupiter: {
    role: "گسترش، معنا، امید، فرصت و اغراق احتمالی",
    dailyVerb: "امکان‌های بزرگ‌تر را ببینی و تجربه‌ای را به رشد یا معنا وصل کنی",
    healthy: "امید، بخشندگی و جرئت امتحان کردن افقی بزرگ‌تر",
    friction: "شروع کردن بیشتر از ظرفیت، قول بزرگ یا رها کردن جزئیات بعد از موج هیجان",
    experiment: "از میان ایده‌های جذاب فقط یک نسخه کوچک را انتخاب کن و تا پایان همان را اجرا کن",
    symbolicBody: "در زبان نمادین، مشتری با رشد، کبد و فرایندهای گسترش‌دهنده تداعی می‌شود",
  },
  saturn: {
    role: "مرز، مسئولیت، ترس، زمان و مهارت‌سازی",
    dailyVerb: "محدودیت را بسنجی، مسئولیت بپذیری و چیزی را آهسته اما بادوام بسازی",
    healthy: "پایداری، مرزبندی و مهارتی که با تکرار قابل اعتماد می‌شود",
    friction: "خودسانسوری، ترس از اشتباه یا صبر کردن تا زمانی که همه‌چیز کاملاً آماده باشد",
    experiment: "یک مسئولیت را به قدمی بیست‌دقیقه‌ای تبدیل کن و زمان پایانش را از قبل مشخص کن",
    symbolicBody: "در زبان نمادین، زحل با استخوان، دندان، پوست و ساختارهای نگه‌دارنده تداعی می‌شود",
  },
  uranus: {
    role: "آزادی، تازگی، گسست و تغییر الگو",
    dailyVerb: "راه متفاوتی پیدا کنی و به محدودیت یا تکرار واکنش نشان بدهی",
    healthy: "نوآوری، استقلال و توان شکستن الگویی که دیگر کار نمی‌کند",
    friction: "قطع ناگهانی، بی‌حوصلگی نسبت به ادامه یا تصمیم غیرقابل‌برگشت در اوج فشار",
    experiment: "پیش از قطع یا تغییر بزرگ، یک نسخه آزمایشی و قابل برگشت را برای یک هفته امتحان کن",
    symbolicBody: "در زبان نمادین، اورانوس با سیستم عصبی و واکنش‌های ناگهانی تداعی می‌شود",
  },
  neptune: {
    role: "تخیل، حساسیت، ابهام، الهام و نفوذپذیری",
    dailyVerb: "حال‌وهوا و نشانه‌های ظریف را دریافت کنی و میان الهام و حدس فرق بگذاری",
    healthy: "همدلی و تخیل همراه با بررسی واقعیت و مرز روشن",
    friction: "فرض کردن اینکه دریافت درونی حقیقت قطعی است یا حل شدن در نیاز و فضای دیگری",
    experiment: "دریافت شهودی را یادداشت کن و بعد با یک سؤال مستقیم یا شاهد واقعی بررسی‌اش کن",
    symbolicBody: "در زبان نمادین، نپتون با خواب، حساسیت و مایعات بدن تداعی می‌شود",
  },
  pluto: {
    role: "قدرت، شدت، کنترل، رهاسازی و تغییر عمیق",
    dailyVerb: "ریشه یک ترس، کشمکش یا نیاز به کنترل را ببینی و رابطه‌ات را با آن تغییر بدهی",
    healthy: "تاب‌آوری، صداقت با لایه‌های پنهان و توان بازسازی پس از بحران",
    friction: "کنترل پنهانی، همه‌یا‌هیچ دیدن یا نگه داشتن چیزی فقط برای نترسیدن از آسیب‌پذیری",
    experiment: "در یک کشمکش بنویس چه چیزی در اختیار توست، چه چیزی نیست و چه چیزی را می‌توانی رها کنی",
    symbolicBody: "در زبان نمادین، پلوتو با پاکسازی و فرایندهای عمیق بازسازی تداعی می‌شود",
  },
};

const SIGN_SEMANTICS: Record<BehavioralSignId, SignSemantic> = {
  aries: {
    method: "مستقیم، سریع و از راه شروع کردن",
    dailyPattern: "معمولاً پیش از کامل شدن همه جزئیات، میل به حرکت پیدا می‌کنی",
    healthy: "جرئت آغاز و صداقت در خواستن",
    friction: "عجله، بی‌حوصلگی یا رها کردن مسیر بعد از موج اول",
    experiment: "پیش از شروع، یک معیار ساده برای تمام کردن تعیین کن",
  },
  taurus: {
    method: "آهسته، از راه تکرار، تجربه ملموس و پیش‌بینی‌پذیری",
    dailyPattern: "بدن و رفتارهای تکرارشونده ممکن است دیرتر از ذهن به تغییر اعتماد کنند",
    healthy: "ثبات، وفاداری و توان ساختن آرامش قابل لمس",
    friction: "ماندن طولانی در وضعیت آشنا حتی وقتی دیگر رضایت‌بخش نیست",
    experiment: "یک تغییر کوچک را در زمان و محیط ثابت چند بار تکرار کن",
  },
  gemini: {
    method: "از راه سؤال، کلمه، مقایسه و دیدن چند مسیر",
    dailyPattern: "با حرف زدن یا نوشتن، موضوع برایت قابل فهم‌تر می‌شود",
    healthy: "انعطاف ذهنی و توان توضیح دادن چند زاویه",
    friction: "پراکنده شدن میان احتمال‌ها یا جایگزین کردن اطلاعات با تصمیم",
    experiment: "پس از جمع‌آوری اطلاعات، یک deadline کوتاه برای انتخاب بگذار",
  },
  cancer: {
    method: "از راه تعلق، خاطره، مراقبت و امنیت احساسی",
    dailyPattern: "فضای رابطه و حس پذیرفته شدن روی تصمیم و انرژی تو اثر می‌گذارد",
    healthy: "مراقبت و ساختن حس خانه برای خود و دیگران",
    friction: "پنهان کردن خواسته برای حفظ پیوند یا حمل کردن نیاز دیگران",
    experiment: "مراقبت را با یک سؤال همراه کن: خودم الآن چه نیازی دارم",
  },
  leo: {
    method: "از راه حضور، خلاقیت، بیان شخصی و دیده شدن",
    dailyPattern: "وقتی بتوانی امضای خودت را در کاری نشان بدهی، انرژی بیشتری می‌گیری",
    healthy: "گرما، سخاوت و جرئت قابل مشاهده کردن خود",
    friction: "وابستگی به تشویق یا عقب‌نشینی وقتی توجه کافی نیست",
    experiment: "یک کار خلاق را پیش از گرفتن تأیید دیگران منتشر یا تمام کن",
  },
  virgo: {
    method: "از راه جزئیات، اصلاح، مهارت و کاربرد عملی",
    dailyPattern: "معمولاً سریع‌تر متوجه نقص، بی‌نظمی یا چیزی می‌شوی که قابل بهتر شدن است",
    healthy: "دقت و مراقبت عملی",
    friction: "سخت‌گیری، تأخیر به‌خاطر کامل نبودن یا فرسودگی از اصلاح مداوم",
    experiment: "نسخه کافی و قابل استفاده را قبل از نسخه کامل تحویل بده",
  },
  libra: {
    method: "از راه سنجیدن طرف مقابل، انصاف، هماهنگی و مقایسه",
    dailyPattern: "پیش از تصمیم ممکن است واکنش دیگری و تعادل رابطه را زیاد بررسی کنی",
    healthy: "مذاکره، انصاف و دفاع از رابطه بدون حذف خود",
    friction: "دیر گفتن خواسته، موافقت اولیه و دلخوری بعدی",
    experiment: "درخواست را پیش از انباشته شدن دلخوری، کوتاه و روشن بگو",
  },
  scorpio: {
    method: "از راه اعتماد، عمق، وفاداری و حساسیت به لایه‌های پنهان",
    dailyPattern: "پیش از باز شدن ممکن است نشانه‌های امنیت و هماهنگی حرف و عمل را بررسی کنی",
    healthy: "صداقت عمیق و توان ماندن در صمیمیت دشوار",
    friction: "آزمودن پنهانی، همه‌یا‌هیچ دیدن یا کنترل برای جلوگیری از آسیب‌پذیری",
    experiment: "به‌جای آزمون پنهانی، نگرانی و معیار اعتماد را مستقیم بیان کن",
  },
  sagittarius: {
    method: "از راه تجربه، معنا، صراحت و افق بزرگ‌تر",
    dailyPattern: "وقتی هدف بزرگ‌تر یا امکان یادگیری ببینی، حرکت برایت آسان‌تر می‌شود",
    healthy: "امید، شجاعت تجربه و دیدن تصویر بزرگ",
    friction: "قول زیاد، بی‌دقتی در جزئیات یا صراحت بدون توجه به اثر کلام",
    experiment: "یک باور بزرگ را با یک شاهد و یک قدم عملی امتحان کن",
  },
  capricorn: {
    method: "از راه زمان، تعهد، ساختار و نتیجه قابل سنجش",
    dailyPattern: "برای اعتماد کردن به مسیر، معمولاً به برنامه، مسئولیت و پیشرفت قابل مشاهده نیاز داری",
    healthy: "پایداری و توان ساختن چیزی ماندگار",
    friction: "سخت‌گیری، دیر کمک خواستن یا سنجیدن ارزش خود فقط با نتیجه",
    experiment: "در برنامه، زمان استراحت و درخواست کمک را مثل یک مسئولیت ثبت کن",
  },
  aquarius: {
    method: "از راه فاصله فکری، دیدن الگو، استقلال و راه متفاوت",
    dailyPattern: "پیش از گفتن احساس یا تصمیم، ممکن است آن را دسته‌بندی کنی و از بیرون نگاه کنی",
    healthy: "نوآوری و توان دیدن راهی بیرون از عادت جمع",
    friction: "دیر گفتن نیاز، سرد به نظر رسیدن یا قطع ارتباط برای حفظ آزادی",
    experiment: "پس از تحلیل، یک جمله درباره احساس و یک درخواست واقعی هم اضافه کن",
  },
  pisces: {
    method: "از راه جذب فضا، تخیل، همدلی و مرزهای نرم",
    dailyPattern: "ممکن است حال‌وهوای دیگری یا فضای رابطه را سریع دریافت کنی",
    healthy: "دریافت ظرافت‌های عاطفی بدون غرق شدن در آن‌ها",
    friction: "سخت شدن تشخیص احساس خود از احساس طرف مقابل یا فرض گرفتن حدس به‌جای واقعیت",
    experiment: "احساس خودت را نام ببر، از دیگری سؤال کن و تفاوت این دو پاسخ را نگه دار",
  },
};

const HOUSE_SEMANTICS: Record<BehavioralHouseNumber, HouseSemantic> = {
  1: {
    scene: "بدن، حضور، شروع‌ها و شیوه نشان دادن خود",
    dailyPattern: "در شروع موقعیت، بیان خواسته و مشخص کردن جایگاه خود دیده می‌شود",
    healthy: "حضور قابل مشاهده بدون پنهان شدن پشت رضایت یا واکنش دیگران",
    friction: "واکنش فوری یا کم‌رنگ کردن خود پیش از آنکه خواسته روشن شود",
    experiment: "پیش از توضیح طولانی، خواسته‌ات را در یک جمله بگو",
  },
  2: {
    scene: "امنیت شخصی، ارزش، بدن، پول و منابع",
    dailyPattern: "در خرج کردن، حفظ منابع و چیزهایی که حس ثبات می‌دهند دیده می‌شود",
    healthy: "ارزش شخصی و امنیتی که فقط به تأیید یا دارایی بیرونی وابسته نیست",
    friction: "چسبیدن به منبع آشنا یا سنجیدن ارزش خود فقط با نتیجه و مالکیت",
    experiment: "یک تصمیم مالی یا بدنی را با معیار کافی و پایدار بسنج",
  },
  3: {
    scene: "فکر روزمره، یادگیری، کلام و رفت‌وآمد نزدیک",
    dailyPattern: "در پیام دادن، توضیح دادن، سؤال و تصمیم‌های کوچک دیده می‌شود",
    healthy: "تبدیل تجربه به زبان قابل فهم",
    friction: "پراکنده شدن یا نگه داشتن حرف تا زمانی که کاملاً بی‌نقص شود",
    experiment: "نظر فعلی‌ات را در دو جمله بگو و بعد با گفت‌وگو دقیق‌ترش کن",
  },
  4: {
    scene: "خانه، خانواده، ریشه و امنیت خصوصی",
    dailyPattern: "در فضای خانه، خاطره‌ها و شیوه پناه گرفتن یا مراقبت دیده می‌شود",
    healthy: "ساختن خانه‌ای که در آن نیاز و آسیب‌پذیری قابل گفتن است",
    friction: "حمل کردن الگوهای قدیمی یا پنهان کردن نیاز برای حفظ امنیت خانواده",
    experiment: "یک نیاز خانگی یا عاطفی را بدون اشاره غیرمستقیم بیان کن",
  },
  5: {
    scene: "خلاقیت، عشق، بازی، بیان شخصی و دیده شدن",
    dailyPattern: "در پروژه خلاق، رابطه عاشقانه، سرگرمی و جرئت نشان دادن امضای شخصی دیده می‌شود",
    healthy: "آفرینش، شادی و دیده شدن از راه چیزی که واقعاً از خودت می‌آید",
    friction: "شروع‌های هیجان‌انگیز بدون ادامه یا پنهان شدن وقتی تأیید فوری نمی‌رسد",
    experiment: "یک نسخه کوچک از ایده خلاق را تمام کن و بعد سراغ ایده بعدی برو",
  },
  6: {
    scene: "کار روزمره، روتین، بدن، مراقبت و مهارت",
    dailyPattern: "در برنامه، خواب، غذا، کارهای تکراری و کیفیت انجام مسئولیت دیده می‌شود",
    healthy: "مراقبت عملی و بهتر کردن زندگی با قدم‌های کوچک",
    friction: "سخت‌گیری، فرسودگی یا تحلیل بیشتر به‌جای تنظیم ریتم بدن",
    experiment: "پیش از تحلیل بیشتر، خواب، غذا، تنش بدن و یک قدم عملی را بررسی کن",
  },
  7: {
    scene: "رابطه یک‌به‌یک، شراکت، تعارض و مذاکره",
    dailyPattern: "در گفت‌وگوی نزدیک، نه گفتن، توافق و واکنش به خواسته دیگری دیده می‌شود",
    healthy: "نزدیکی و همکاری بدون حذف خواسته شخصی",
    friction: "گم شدن در رابطه یا عقب‌نشینی کامل از تعارض",
    experiment: "در یک گفت‌وگو، خواسته خودت و چیزی را که می‌پذیری جداگانه بگو",
  },
  8: {
    scene: "اعتماد، صمیمیت، آسیب‌پذیری، منابع مشترک و تغییر عمیق",
    dailyPattern: "در افشای احساس، تقسیم منابع و سنجیدن اینکه چه کسی قابل اعتماد است دیده می‌شود",
    healthy: "اعتمادی که از هماهنگی حرف و عمل، احترام به نه و بازگشت به گفت‌وگو ساخته می‌شود",
    friction: "کنترل، پنهان‌کاری یا ماندن در وضعیت آشنا چون رها کردن زمان می‌خواهد",
    experiment: "یک نشانه کوچک و تکرارشونده اعتماد را مشخص کن و به‌جای قول بزرگ همان را بسنج",
  },
  9: {
    scene: "باور، آموزش، سفر، معنا و افق دورتر",
    dailyPattern: "در انتخاب مسیر یادگیری، دفاع از باور و تجربه‌های تازه دیده می‌شود",
    healthy: "معنایی که با تجربه و واقعیت اصلاح می‌شود",
    friction: "قطعیت زودرس یا استفاده از تصویر بزرگ برای ندیدن جزئیات",
    experiment: "یک باور را با تجربه کوچک یا منبع مخالف آزمایش کن",
  },
  10: {
    scene: "مسیر عمومی، مسئولیت، اعتبار و کار بلندمدت",
    dailyPattern: "در تصمیم حرفه‌ای، دیده شدن و ساختن جایگاه اجتماعی دیده می‌شود",
    healthy: "اعتبار حاصل از کار واقعی و جهت روشن",
    friction: "سنجیدن ارزش خود با مقام یا ترس از دیده شدن پیش از کامل شدن",
    experiment: "یک نتیجه قابل مشاهده و محدود برای این هفته تعریف کن",
  },
  11: {
    scene: "دوستی، جمع، شبکه، آینده و هدف مشترک",
    dailyPattern: "در گروه‌ها، همکاری، دوستی و نقشی که برای آینده جمع می‌سازی دیده می‌شود",
    healthy: "ساختن تعلق و مشارکت بدون گم کردن نظر شخصی",
    friction: "کم‌رنگ کردن خود برای حفظ فضای جمع یا مراقبت از همه به‌جز خود",
    experiment: "در یک جمع، نظر شخصی‌ات را پیش از نقش مراقب یا هماهنگ‌کننده بیان کن",
  },
  12: {
    scene: "خلوت، پشت‌صحنه، پایان چرخه، رؤیا و چیزهای سخت‌نام‌گذاری",
    dailyPattern: "در نیاز به تنهایی، استراحت، خواب و الگوهایی که دیرتر آگاه می‌شوند دیده می‌شود",
    healthy: "خلوتی که به بازیابی و شناخت کمک می‌کند",
    friction: "فرار، انزوا یا انجام دادن فشار در پشت‌صحنه تا زمان فرسودگی",
    experiment: "برای خلوت زمان مشخص بگذار و بعد یک احساس یا نیاز را به کلمه تبدیل کن",
  },
};

const TARGETED_INTERPRETATIONS: Record<string, Omit<PlacementBehavioralInterpretation, "symbolicBody">> = {
  "moon:taurus:8": {
    plainMeaning:
      "برای آرام شدن فقط توضیح منطقی کافی نیست؛ اعتماد باید در زمان، رفتار ثابت و نشانه‌های ملموس امنیت حس شود",
    dailyLifeExample:
      "ممکن است ذهن رابطه را امن بداند اما بدن هنوز محتاط بماند، یا رها کردن رابطه و عادت آشنا بیشتر از انتظار زمان ببرد",
    healthyExpression:
      "توان این جایگاه ساختن وفاداری، آرامش و امنیت پایدار در صمیمیت است",
    possibleFriction:
      "ممکن است مدت زیادی در امنیت آشنا بمانی، حتی وقتی دیگر رضایت‌بخش نیست، یا برای جلوگیری از آسیب‌پذیری دیرتر باز شوی",
    focus:
      "اعتماد، صمیمیت، ریتم بدن، رفتار قابل پیش‌بینی و منابع مشترک",
    smallExperiment:
      "به‌جای قول بزرگ، یک رفتار کوچک و تکرارشونده را برای سنجیدن اعتماد مشخص کن",
  },
  "mars:libra:1": {
    plainMeaning:
      "خواستن و اقدام کردن با سنجیدن واکنش طرف مقابل همراه می‌شود؛ دفاع از رابطه مهم است اما نباید به حذف خود تبدیل شود",
    dailyLifeExample:
      "ممکن است ابتدا موافقت کنی، خواسته‌ات را دیر بگویی و بعد از جمع شدن دلخوری وارد مذاکره طولانی یا فشار غیرمستقیم شوی",
    healthyExpression:
      "اقدام منصفانه، گفت‌وگوی مستقیم و دفاع از خود بدون شکستن رابطه",
    possibleFriction:
      "تأخیر در تصمیم، خشم فشرده و وابسته کردن شروع به رضایت یا مجوز دیگری",
    focus:
      "بیان خواسته، حضور شخصی، تعارض و حفظ انصاف بدون محو شدن",
    smallExperiment:
      "پیش از انباشته شدن دلخوری، درخواستت را کوتاه و روشن بگو",
  },
  "sun:aquarius:5": {
    plainMeaning:
      "هویت از راه بیان شخصی، خلاقیت و ساختن امضایی متفاوت شکل می‌گیرد",
    dailyLifeExample:
      "ممکن است وقتی ایده‌ای غیرمعمول را به پروژه، بازی یا اجرای قابل مشاهده تبدیل می‌کنی بیشتر احساس خودت بودن داشته باشی",
    healthyExpression:
      "جرئت متفاوت بودن و دیده شدن برای چیزی که واقعاً ساخته‌ای",
    possibleFriction:
      "فاصله گرفتن از احساس، شروع‌های متعدد یا پنهان شدن پشت متفاوت بودن وقتی نیاز به دیده شدن داری",
    focus:
      "هویت، خلاقیت، عشق، بازی و دیده شدن با امضای شخصی",
    smallExperiment:
      "یک اثر کوچک را با نام و انتخاب خودت تمام و قابل مشاهده کن",
  },
  "mercury:aquarius:5": {
    plainMeaning:
      "ذهن ایده‌های غیرمعمول را به زبان، طنز، داستان یا تجربه خلاق تبدیل می‌کند",
    dailyLifeExample:
      "ممکن است از ترکیب موضوع‌های دور از هم ایده بگیری و بخواهی آن را به دیگران نشان بدهی",
    healthyExpression:
      "نوآوری فکری و توضیح دادن الگویی که دیگران هنوز ندیده‌اند",
    possibleFriction:
      "پریدن میان ایده‌ها یا ترجیح تازگی به تمام کردن و قابل فهم کردن",
    focus:
      "ایده، زبان، خلاقیت، بازی و ارتباط با مخاطب",
    smallExperiment:
      "یک ایده را در قالب یک متن، طرح یا نمونه کوتاه تا پایان اجرا کن",
  },
  "venus:aquarius:5": {
    plainMeaning:
      "کشش و رابطه به دوستی، آزادی ذهنی، تازگی و امکان بیان خود نیاز دارد",
    dailyLifeExample:
      "ممکن است رابطه‌ای جذاب‌تر باشد که در آن گفت‌وگو، تجربه تازه و فضای مستقل وجود داشته باشد",
    healthyExpression:
      "نزدیکی بدون مالکیت و لذت بردن از خلاقیت مشترک",
    possibleFriction:
      "دور شدن وقتی رابطه قابل پیش‌بینی می‌شود یا نگفتن نیاز عاطفی پشت زبان استقلال",
    focus:
      "عشق، لذت، دوستی، آزادی و تجربه خلاق مشترک",
    smallExperiment:
      "در رابطه یک نیاز به نزدیکی و یک نیاز به فضای مستقل را هم‌زمان روشن کن",
  },
  "jupiter:aquarius:5": {
    plainMeaning:
      "امکان‌ها در خلاقیت، عشق و تجربه‌های تازه سریع بزرگ می‌شوند",
    dailyLifeExample:
      "ممکن است چند پروژه یا سرگرمی هیجان‌انگیز را هم‌زمان شروع کنی چون مسیرهای زیادی را ممکن می‌بینی",
    healthyExpression:
      "امید، نوآوری و جرئت امتحان کردن شکل تازه‌ای از بیان شخصی",
    possibleFriction:
      "بزرگ کردن ایده پیش از آزمودن آن یا رها کردن ادامه بعد از موج اول هیجان",
    focus:
      "گسترش خلاقیت، بازی، عشق و فرصت‌های تازه",
    smallExperiment:
      "فقط یک نسخه کوچک از ایده هیجان‌انگیز را تا پایان اجرا کن",
  },
  "uranus:aquarius:5": {
    plainMeaning:
      "آزادی و تازگی در بیان شخصی بسیار پررنگ است و قالب تکراری زود خسته‌کننده می‌شود",
    dailyLifeExample:
      "ممکن است ناگهان مسیر پروژه، سلیقه یا رابطه را عوض کنی تا دوباره حس زنده بودن و انتخاب داشته باشی",
    healthyExpression:
      "نوآوری، جسارت آزمایش و باز کردن مسیر خلاقی که قبلاً وجود نداشته",
    possibleFriction:
      "قطع ناگهانی، بی‌حوصلگی نسبت به ادامه یا تبدیل تازگی به هدفی مهم‌تر از عمق",
    focus:
      "آزادی، خلاقیت، تغییر مسیر و تجربه متفاوت",
    smallExperiment:
      "پیش از تغییر کامل مسیر، یک تغییر کوچک و قابل برگشت را آزمایش کن",
  },
  "moon:aquarius:8": {
    plainMeaning:
      "در صمیمیت عمیق، ممکن است ابتدا فاصله ذهنی بگیری تا الگوی احساس را بفهمی؛ این فاصله همیشه بی‌علاقگی نیست",
    dailyLifeExample:
      "وقتی رابطه سنگین می‌شود ممکن است نیاز به حمایت را دیر بگویی و دیگری تصور کند نیازی نداری",
    healthyExpression:
      "ترکیب عمق عاطفی با فضای ذهنی، مکث و گفت‌وگوی روشن",
    possibleFriction:
      "تحلیل کردن احساس به‌جای تجربه آن، قطع ناگهانی یا پنهان کردن نیاز برای حفظ استقلال",
    focus:
      "صمیمیت، اعتماد، فضای ذهنی و امکان مکث بدون قطع رابطه",
    smallExperiment:
      "پس از مکث، یک جمله درباره احساس و یک درخواست مشخص برای حمایت بگو",
  },
  "venus:scorpio:4": {
    plainMeaning:
      "نزدیکی با اعتماد، وفاداری و امنیت خانه و ریشه‌های عاطفی گره می‌خورد",
    dailyLifeExample:
      "ممکن است پیش از نشان دادن آسیب‌پذیری، هماهنگی حرف و عمل را بررسی کنی یا نشانه‌های امنیت را در فضای خصوصی بسنجی",
    healthyExpression:
      "صداقت عمیق و ساختن خانه‌ای که در آن آسیب‌پذیری قابل گفتن است",
    possibleFriction:
      "همه‌یا‌هیچ دیدن رابطه، پنهان کردن نیاز یا آزمودن پنهانی طرف مقابل",
    focus:
      "وفاداری، امنیت خصوصی، خانواده و اعتماد در نزدیکی",
    smallExperiment:
      "به‌جای آزمون پنهانی، نگرانی و رفتار مشخصی را که اعتماد می‌سازد مستقیم بگو",
  },
  "mars:aquarius:8": {
    plainMeaning:
      "در فشار عاطفی، میل به دفاع از استقلال و شکستن محدودیت می‌تواند خیلی سریع فعال شود",
    dailyLifeExample:
      "ممکن است ناراحتی به پیام فوری، تغییر ناگهانی تصمیم یا قطع ارتباط تبدیل شود",
    healthyExpression:
      "اقدام مستقل و نوآورانه پس از نام‌گذاری احساس و خواسته",
    possibleFriction:
      "سرعت واکنش بیشتر از سرعت فهمیدن احساس یا تصمیم غیرقابل‌برگشت در اوج فشار",
    focus:
      "خشم، آزادی، صمیمیت، اعتماد و تصمیم زیر فشار",
    smallExperiment:
      "پیش از پیام یا تصمیم غیرقابل‌برگشت، سه جمله بنویس: چه شد، چه احساسی دارم و چه می‌خواهم",
  },
  "sun:cancer:11": {
    plainMeaning:
      "هویت با ساختن حس تعلق، مراقبت از جمع و حضور در شبکه‌ای معنادار روشن‌تر می‌شود",
    dailyLifeExample:
      "ممکن است در جمع نقش نگه‌دارنده یا مراقب بگیری و فضای امن برای دوستی و همکاری بسازی",
    healthyExpression:
      "حضور گرم و قابل مشاهده همراه با توان ساختن تعلق در گروه",
    possibleFriction:
      "کم‌رنگ کردن نظر شخصی برای حفظ فضای جمع یا دیده شدن فقط به‌عنوان کسی که از دیگران مراقبت می‌کند",
    focus:
      "دوستی، جمع، تعلق، آینده مشترک و نظر شخصی",
    smallExperiment:
      "در یک جمع، پیش از مراقبت از نیاز دیگران نظر شخصی خودت را در دو جمله بگو",
  },
  "moon:pisces:8": {
    plainMeaning:
      "در صمیمیت ممکن است حال عاطفی دیگری یا فضای رابطه را جذب کنی و تشخیص احساس خود از احساس طرف مقابل دشوار شود",
    dailyLifeExample:
      "ممکن است بدون گفت‌وگوی مستقیم، ناراحتی یا نیاز دیگری را حس کنی و آن را متعلق به خودت فرض کنی",
    healthyExpression:
      "دریافت ظرافت‌های عاطفی بدون غرق شدن در آن‌ها",
    possibleFriction:
      "نفوذپذیری، خستگی عاطفی یا تبدیل شهود به حقیقت قطعی بدون بررسی واقعیت",
    focus:
      "صمیمیت، مرز عاطفی، احساس خود و دیگری و بررسی واقعیت",
    smallExperiment:
      "خلوت کوتاه بگیر، احساس خودت را نام ببر و سپس دریافتت را با یک سؤال مستقیم بررسی کن",
  },
};

export function buildPlacementBehavioralInterpretation(
  input: PlacementBehavioralInterpretationInput,
): PlacementBehavioralInterpretation {
  const planetId = normalizePlanetId(input.planetId);
  const signId = normalizeSignId(input.signId);
  const houseNumber = normalizeHouseNumber(input.houseNumber);
  const planet = PLANET_SEMANTICS[planetId];
  const sign = SIGN_SEMANTICS[signId];
  const house = houseNumber ? HOUSE_SEMANTICS[houseNumber] : null;
  const targeted = houseNumber
    ? TARGETED_INTERPRETATIONS[`${planetId}:${signId}:${houseNumber}`]
    : undefined;
  const retrogradeNote =
    input.retrograde && ["mercury", "venus", "mars", "jupiter", "saturn"].includes(planetId)
      ? " اگر این سیاره پس‌روست، ممکن است این فرایند بیشتر درونی شود، دیرتر بیرون بیاید یا پیش از اقدام چند بار بازبینی شود."
      : "";

  if (targeted) {
    return {
      ...targeted,
      possibleFriction: `${targeted.possibleFriction}.${retrogradeNote}`.replace(/\.\s*\./gu, ".").trim(),
      symbolicBody: planet.symbolicBody,
    };
  }

  const houseScene = house?.scene ?? "بخشی از زندگی که خانه آن در داده گزارش ثبت نشده";
  const dailyHouse = house?.dailyPattern ?? "در رفتارهای کوچک روزمره قابل مشاهده می‌شود";
  const houseHealthy = house?.healthy ?? "با مشاهده و انتخاب روشن‌تر قابل رشد است";
  const houseFriction = house?.friction ?? "ممکن است بدون زمینه خانه، بیش از حد کلی فهمیده شود";
  const houseExperiment = house?.experiment ?? "یک نمونه واقعی از این الگو را ثبت کن";

  return {
    plainMeaning:
      `${planet.role} به شیوه‌ای ${sign.method} و در صحنه ${houseScene} عمل می‌کند`,
    dailyLifeExample:
      `${sign.dailyPattern}. این موضوع وقتی می‌خواهی ${planet.dailyVerb}، ${dailyHouse}`,
    healthyExpression:
      `${planet.healthy}؛ ${sign.healthy} و ${houseHealthy}`,
    possibleFriction:
      `${planet.friction}؛ ${sign.friction} و ${houseFriction}.${retrogradeNote}`.replace(/\.\s*\./gu, ".").trim(),
    focus: `${planet.role} در ${houseScene}`,
    smallExperiment:
      `${houseExperiment}. سپس ${planet.experiment}. ${sign.experiment}`,
    symbolicBody: planet.symbolicBody,
  };
}

export function isBehavioralPlacementInput(
  planetId: string | null | undefined,
  signId: string | null | undefined,
  houseNumber: number | null | undefined,
): boolean {
  return (
    typeof planetId === "string" &&
    planetId in PLANET_SEMANTICS &&
    typeof signId === "string" &&
    signId in SIGN_SEMANTICS &&
    normalizeHouseNumber(houseNumber) !== null
  );
}

function normalizePlanetId(value: string): BehavioralPlanetId {
  return value in PLANET_SEMANTICS
    ? (value as BehavioralPlanetId)
    : "sun";
}

function normalizeSignId(value: string): BehavioralSignId {
  return value in SIGN_SEMANTICS
    ? (value as BehavioralSignId)
    : "aries";
}

function normalizeHouseNumber(
  value: number | null | undefined,
): BehavioralHouseNumber | null {
  return Number.isInteger(value) && value! >= 1 && value! <= 12
    ? (value as BehavioralHouseNumber)
    : null;
}

export type BehavioralAspectId =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposition";

export type BehavioralSynthesisRole =
  | "challenge"
  | "support"
  | "daily-bridge";

export type AspectBehavioralInterpretation = {
  titleFragment: string;
  narrativeSummary: string;
  plainMeaning: string;
  dailyLifeExample: string;
  healthyExpression: string;
  possibleFriction: string;
  smallExperiment: string;
  confidenceNote: string;
  focus: string;
  patternKey: string;
};

export type AspectBehavioralInterpretationInput = {
  firstPlanetId: string;
  secondPlanetId: string;
  firstSignId?: string | null;
  secondSignId?: string | null;
  firstHouseNumber?: number | null;
  secondHouseNumber?: number | null;
  aspectId: string;
  orb?: number | null;
  chartRulerId?: string | null;
  activeHouseNumbers?: number[];
  retrogradePlanetIds?: string[];
  synthesisRole?: BehavioralSynthesisRole | null;
};

type AspectFormSemantic = {
  titleFragment: string;
  relationship: string;
  healthy: string;
  friction: string;
};

type AspectParticipantContext = {
  id: BehavioralPlanetId;
  planet: PlanetSemantic;
  sign: SignSemantic | null;
  house: HouseSemantic | null;
  houseNumber: BehavioralHouseNumber | null;
  retrograde: boolean;
};

const ASPECT_FORM_SEMANTICS: Record<BehavioralAspectId, AspectFormSemantic> = {
  conjunction: {
    titleFragment: "هم‌نشینی ۰ درجه",
    relationship:
      "دو نیاز تقریباً هم‌زمان فعال می‌شوند و صدای یکدیگر را بلندتر می‌کنند",
    healthy:
      "تمرکز و توان یکپارچه‌کردن دو نیرو در یک حرکت روشن",
    friction:
      "تشخیص ندادن اینکه کدام نیاز هدایت می‌کند و واکنش‌دادن با شدت بیشتر از موقعیت",
  },
  sextile: {
    titleFragment: "زاویه‌ی ۶۰ درجه",
    relationship:
      "دو نیاز امکان همکاری دارند، اما این امکان باید با انتخاب و تمرین فعال شود",
    healthy:
      "یادگیری سریع‌تر و ساختن راهی کوچک که دو توان را به هم وصل می‌کند",
    friction:
      "نادیده‌گرفتن امکان چون فشار فوری ندارد یا رهاکردن آن در حد استعداد خام",
  },
  square: {
    titleFragment: "زاویه‌ی ۹۰ درجه",
    relationship:
      "دو نیاز با ریتم‌های متفاوت به هم فشار می‌آورند و مسئله‌ای واقعی برای حل‌کردن می‌سازند",
    healthy:
      "ساختن مهارت، مرز و تصمیم از راه روبه‌روشدن با اصطکاک",
    friction:
      "سرکوب یک نیاز، نوسان میان دو واکنش یا تکرار تنش بدون تبدیل آن به مسئله‌ای قابل حل",
  },
  trine: {
    titleFragment: "زاویه‌ی ۱۲۰ درجه",
    relationship:
      "دو نیاز طبیعی‌تر به هم راه می‌دهند و می‌توانند بدون فشار زیاد همکاری کنند",
    healthy:
      "استفاده آگاهانه از روانی و استعداد برای ساختن مهارت یا نتیجه‌ای قابل مشاهده",
    friction:
      "عادی فرض‌کردن توان، پراکندگی یا تکیه‌کردن به موج آسانی بدون ادامه‌دادن",
  },
  opposition: {
    titleFragment: "روبه‌رویی ۱۸۰ درجه",
    relationship:
      "دو نیاز در دو سر یک محور قرار می‌گیرند و تعادل میان خود و دیگری یا دو میدان زندگی را می‌طلبند",
    healthy:
      "دیدن هر دو طرف، مذاکره و انتخابی که هیچ قطب را حذف نمی‌کند",
    friction:
      "رفت‌وبرگشت، فرافکنی یک قطب به دیگری یا منتظرماندن برای مجوز و زمان کاملاً بی‌تنش",
  },
};

const CHART_RULER_BY_RISING: Record<BehavioralSignId, BehavioralPlanetId> = {
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

export function getBehavioralChartRulerId(
  risingSignId: string | null | undefined,
): BehavioralPlanetId | null {
  return typeof risingSignId === "string" && risingSignId in CHART_RULER_BY_RISING
    ? CHART_RULER_BY_RISING[risingSignId as BehavioralSignId]
    : null;
}

export function isBehavioralAspectInput(
  firstPlanetId: string | null | undefined,
  secondPlanetId: string | null | undefined,
  aspectId: string | null | undefined,
): boolean {
  return (
    typeof firstPlanetId === "string" &&
    firstPlanetId in PLANET_SEMANTICS &&
    typeof secondPlanetId === "string" &&
    secondPlanetId in PLANET_SEMANTICS &&
    typeof aspectId === "string" &&
    aspectId in ASPECT_FORM_SEMANTICS
  );
}

export function buildAspectBehavioralInterpretation(
  input: AspectBehavioralInterpretationInput,
): AspectBehavioralInterpretation {
  const first = buildAspectParticipantContext(
    input.firstPlanetId,
    input.firstSignId,
    input.firstHouseNumber,
    input.retrogradePlanetIds,
  );
  const second = buildAspectParticipantContext(
    input.secondPlanetId,
    input.secondSignId,
    input.secondHouseNumber,
    input.retrogradePlanetIds,
  );
  const aspectId = normalizeAspectId(input.aspectId);
  const form = ASPECT_FORM_SEMANTICS[aspectId];
  const pairKey = [first.id, second.id].sort().join(":");
  const patternKey = `${pairKey}:${aspectId}`;
  const targeted = buildTargetedAspectInterpretation(
    patternKey,
    first,
    second,
    form,
  );
  const context = buildAspectContextSentence(first, second);
  const relevance = buildAspectRelevanceNote(input, first, second);
  const confidenceNote = buildAspectConfidenceNote(input.orb);

  if (targeted) {
    return {
      ...targeted,
      titleFragment: form.titleFragment,
      narrativeSummary: targeted.plainMeaning,
      plainMeaning: `${targeted.plainMeaning}. ${context}`,
      healthyExpression: `${targeted.healthyExpression}. ${relevance}`,
      confidenceNote,
      patternKey,
    };
  }

  const firstMethod = first.sign?.method ?? "به شیوه‌ای که نشان آن در داده ثبت کرده";
  const secondMethod = second.sign?.method ?? "به شیوه‌ای که نشان آن در داده ثبت کرده";
  const firstScene = first.house?.scene ?? "میدان زندگی ثبت‌شده برای سیاره اول";
  const secondScene = second.house?.scene ?? "میدان زندگی ثبت‌شده برای سیاره دوم";
  const retrogradeNote = buildRetrogradeAspectNote(first, second);

  return {
    titleFragment: form.titleFragment,
    narrativeSummary:
      `${first.planet.role} و ${second.planet.role} ${form.relationship}`,
    plainMeaning:
      `${first.planet.role} و ${second.planet.role} در این رابطه ${form.relationship}. ${context}`,
    dailyLifeExample:
      `ممکن است هنگام ${first.planet.dailyVerb} در ${firstScene}، هم‌زمان لازم باشد ${second.planet.dailyVerb} در ${secondScene}. نیروی اول ${firstMethod} عمل می‌کند و نیروی دوم ${secondMethod}${retrogradeNote}`,
    healthyExpression:
      `${form.healthy}. شکل سالم آن این است که ${first.planet.healthy} با ${second.planet.healthy} هم‌زمان جا داشته باشد. ${relevance}`,
    possibleFriction:
      `${form.friction}. در عمل ممکن است ${first.planet.friction} با ${second.planet.friction} ترکیب شود`,
    smallExperiment:
      buildGenericAspectExperiment(aspectId, first, second),
    confidenceNote,
    focus: `${first.planet.role} × ${second.planet.role}`,
    patternKey,
  };
}

function buildTargetedAspectInterpretation(
  patternKey: string,
  first: AspectParticipantContext,
  second: AspectParticipantContext,
  form: AspectFormSemantic,
): Omit<
  AspectBehavioralInterpretation,
  "titleFragment" | "narrativeSummary" | "confidenceNote" | "patternKey"
> | null {
  const contextFor = (planetId: BehavioralPlanetId) =>
    first.id === planetId ? first : second;
  const sceneFor = (planetId: BehavioralPlanetId) =>
    contextFor(planetId).house?.scene ?? "میدان زندگی مربوط به آن سیاره";

  if (patternKey === "mars:saturn:opposition") {
    return {
      plainMeaning:
        "یک بخش می‌خواهد خواسته، ناراحتی یا تصمیمش را بیان کند و بخش دیگر پیامد رابطه، مخالفت، ردشدن یا مسئولیت آن را می‌سنجد",
      dailyLifeExample:
        "ممکن است پیش از اقدام واکنش دیگری را بیش از حد بررسی کنی، شروع کنی و عقب بکشی، یا برای حفظ رابطه موافقت کنی و بعد دلخوری جمع شود",
      healthyExpression:
        "اقدام سنجیده، مسئولیت‌پذیری و مذاکره‌ای که خواسته را روشن می‌کند بدون اینکه رابطه یا خودت حذف شود",
      possibleFriction:
        "توقف‌وحرکت، خشم فشرده، دیرگفتن خواسته یا احساس اینکه همیشه به مجوز و زمان مناسب‌تری نیاز داری",
      smallExperiment:
        "پیش از گفت‌وگوی مهم سه خط بنویس: چه می‌خواهم؟ از چه واکنشی می‌ترسم؟ کوچک‌ترین درخواست روشن من چیست؟",
      focus: `${sceneFor("mars")} در برابر ${sceneFor("saturn")}`,
    };
  }

  if (patternKey === "jupiter:uranus:conjunction") {
    return {
      plainMeaning:
        "گسترش و آزادی هم‌زمان فعال می‌شوند؛ ایده یا امکان تازه می‌تواند ناگهان بسیار هیجان‌انگیز و بزرگ به نظر برسد",
      dailyLifeExample:
        "ممکن است پروژه، عشق، سرگرمی یا تجربه خلاقانه را سریع شروع کنی چون چند مسیر تازه را یک‌باره می‌بینی",
      healthyExpression:
        "نوآوری، جسارت آزمایش و بازکردن راهی که قبلاً وجود نداشته است",
      possibleFriction:
        "رهاکردن ادامه بعد از موج اول هیجان، زیادکردن هم‌زمان پروژه‌ها یا اشتباه‌گرفتن تازگی با ارزش پایدار",
      smallExperiment:
        "وقتی ایده‌ای تازه خیلی هیجان‌انگیز شد، فقط یک نسخه کوچک آن را تا پایان اجرا کن و ایده‌های بعدی را در فهرستی جدا نگه دار",
      focus: `${sceneFor("jupiter")} و ${sceneFor("uranus")}`,
    };
  }

  if (patternKey === "mars:saturn:square") {
    return {
      plainMeaning:
        "میل به اقدام با نیاز به احتیاط، زمان، مسئولیت یا ترس از پیامد اصطکاک پیدا می‌کند",
      dailyLifeExample:
        "ممکن است یک‌بار با فشار زیاد جلو بروی و بار دیگر کاملاً متوقف شوی، چون سرعت خواستن با سرعت اطمینان و مهارت‌سازی یکی نیست",
      healthyExpression:
        "انضباط عملی، تحمل تأخیر و تبدیل خشم یا فشار به برنامه‌ای مرحله‌بندی‌شده",
      possibleFriction:
        "خودسرزنشی، سخت‌گیری، خشم انباشته یا رهاکردن کار درست پیش از آنکه زمان کافی برای ساختن مهارت بگیرد",
      smallExperiment:
        "کار دشوار را به یک قدم پانزده‌دقیقه‌ای تبدیل کن و پیش از شروع فقط مانع واقعی همان قدم را بنویس",
      focus: `${sceneFor("mars")} و ${sceneFor("saturn")}`,
    };
  }

  if (patternKey === "moon:saturn:square") {
    return {
      plainMeaning:
        "احساس و نیاز به حمایت با نگرانی درباره ثبات، جایگاه، مسئولیت یا پیامد بلندمدت اصطکاک پیدا می‌کند",
      dailyLifeExample:
        "ممکن است از ترس باربودن، نیازت را دیر بگویی و قوی، منطقی یا بی‌نیاز به نظر برسی، در حالی که همراهی یا محدودیت روشن لازم داری",
      healthyExpression:
        "تحمل احساس، ساختن اعتماد قابل اتکا و درخواست حمایتی که شکل و مرز مشخص دارد",
      possibleFriction:
        "کنترل یا تحلیل احساس تا زمانی که فشار زیاد شود، تنهایی کشیدن بار یا فرض‌کردن اینکه نیازداشتن نشانه ضعف است",
      smallExperiment:
        "پیش از تصمیم دو سؤال را جواب بده: الان چه احساسی دارم؟ چه حمایت یا محدودیت مشخصی باید در نظر گرفته شود؟",
      focus: `${sceneFor("moon")} و ${sceneFor("saturn")}`,
    };
  }

  if (patternKey === "mars:moon:conjunction") {
    return {
      plainMeaning:
        "احساس و واکنش عملی بسیار نزدیک‌اند و ناراحتی می‌تواند سریع به تصمیم، پیام، دفاع یا قطع‌کردن تبدیل شود",
      dailyLifeExample:
        "در موقعیت عاطفی سنگین ممکن است سرعت واکنش از سرعت فهمیدن و نام‌گذاری احساس بیشتر باشد",
      healthyExpression:
        "جرئت دفاع از احساس، صداقت سریع و توان تبدیل نیاز به درخواست مستقیم",
      possibleFriction:
        "عمل‌کردن پیش از فهمیدن احساس، پیام فوری، دفاع تند یا تصمیم غیرقابل‌برگشت در اوج فشار",
      smallExperiment:
        "قبل از پیام‌دادن یا تصمیم‌گرفتن سه جمله بنویس: چه اتفاقی افتاد؟ چه احساسی دارم؟ الان چه درخواستی دارم؟",
      focus: `${sceneFor("moon")} و ${sceneFor("mars")}`,
    };
  }

  if (patternKey === "mars:uranus:conjunction") {
    return {
      plainMeaning:
        "اقدام و نیاز به آزادی هم‌زمان روشن می‌شوند و محدودشدن می‌تواند واکنش بسیار سریع ایجاد کند",
      dailyLifeExample:
        "ممکن است برای شکستن فشار تصمیم ناگهانی بگیری، مسیر را عوض کنی یا ارتباط را پیش از گفت‌وگوی کامل قطع کنی",
      healthyExpression:
        "نوآوری، استقلال و جرئت تغییر روشی که واقعاً دیگر کار نمی‌کند",
      possibleFriction:
        "بی‌تابی، تغییر غیرقابل‌برگشت در اوج فشار یا اشتباه‌گرفتن مکث کوتاه با از دست‌دادن آزادی",
      smallExperiment:
        "پیش از تصمیم غیرقابل‌برگشت ده دقیقه مکث کن و یک تغییر کوچک و قابل برگشت را اول امتحان کن",
      focus: `${sceneFor("mars")} و ${sceneFor("uranus")}`,
    };
  }

  if (patternKey === "saturn:sun:square") {
    return {
      plainMeaning:
        "میل به حضور، انتخاب و دیده‌شدن با ترس از اشتباه، قضاوت، مسئولیت یا برهم‌زدن تعادل اصطکاک پیدا می‌کند",
      dailyLifeExample:
        "ممکن است حرف یا نظر شخصی را آن‌قدر بسنجی که دیر گفته شود، مخصوصاً وقتی جایگاهت در جمع یا رابطه برایت مهم است",
      healthyExpression:
        "حضور مسئولانه، صدای دقیق و توان ساختن اعتبار با تکرار عمل‌های کوچک",
      possibleFriction:
        "خودسانسوری، سخت‌گیری، عقب‌انداختن دیده‌شدن تا زمان آمادگی کامل یا تعریف خود فقط از راه وظیفه",
      smallExperiment:
        "در یک جمع یا گفت‌وگو، یک نظر شخصی را در دو جمله بگو و یک اقدام کوچک قابل مشاهده برای آن تعیین کن",
      focus: `${sceneFor("sun")} و ${sceneFor("saturn")}`,
    };
  }

  if (
    (patternKey === "jupiter:mars:trine" ||
      patternKey === "mars:uranus:trine" ||
      patternKey === "jupiter:mars:sextile" ||
      patternKey === "mars:uranus:sextile")
  ) {
    return {
      plainMeaning:
        "اقدام با گسترش یا آزادی همکاری می‌کند و شروع‌کردن، ریسک سنجیده و بیان متفاوت را آسان‌تر می‌سازد",
      dailyLifeExample:
        "ممکن است برای پروژه خلاق، تجربه تازه یا نشان‌دادن ایده شخصی سریع انرژی بگیری و دیگران را هم با حرکتت همراه کنی",
      healthyExpression:
        "جرئت، ابتکار و تبدیل امکان به نمونه‌ای واقعی و قابل مشاهده",
      possibleFriction:
        "پراکندگی، زیادشروع‌کردن یا وابسته‌شدن ادامه کار به موج هیجان و آزادی لحظه‌ای",
      smallExperiment:
        "از میان ایده‌های امروز یکی را انتخاب کن، نسخه کوچک آن را تمام کن و تا پایان آن شروع تازه‌ای اضافه نکن",
      focus: `${first.house?.scene ?? "اقدام"} و ${second.house?.scene ?? "خلاقیت"}`,
    };
  }

  return null;
}

function buildAspectParticipantContext(
  planetId: string,
  signId: string | null | undefined,
  houseNumber: number | null | undefined,
  retrogradePlanetIds: string[] | undefined,
): AspectParticipantContext {
  const normalizedPlanet = normalizePlanetId(planetId);
  const normalizedSign =
    typeof signId === "string" && signId in SIGN_SEMANTICS
      ? (signId as BehavioralSignId)
      : null;
  const normalizedHouse = normalizeHouseNumber(houseNumber);

  return {
    id: normalizedPlanet,
    planet: PLANET_SEMANTICS[normalizedPlanet],
    sign: normalizedSign ? SIGN_SEMANTICS[normalizedSign] : null,
    house: normalizedHouse ? HOUSE_SEMANTICS[normalizedHouse] : null,
    houseNumber: normalizedHouse,
    retrograde: retrogradePlanetIds?.includes(normalizedPlanet) ?? false,
  };
}

function buildAspectContextSentence(
  first: AspectParticipantContext,
  second: AspectParticipantContext,
): string {
  const firstHouse = first.houseNumber
    ? `خانه ${first.houseNumber} (${first.house?.scene})`
    : "خانه ثبت‌نشده";
  const secondHouse = second.houseNumber
    ? `خانه ${second.houseNumber} (${second.house?.scene})`
    : "خانه ثبت‌نشده";
  const firstMethod = first.sign?.method ?? "شیوه نشان ثبت‌نشده";
  const secondMethod = second.sign?.method ?? "شیوه نشان ثبت‌نشده";

  return `نیروی اول با ریتم ${firstMethod} در ${firstHouse} و نیروی دوم با ریتم ${secondMethod} در ${secondHouse} عمل می‌کند`;
}

function buildAspectRelevanceNote(
  input: AspectBehavioralInterpretationInput,
  first: AspectParticipantContext,
  second: AspectParticipantContext,
): string {
  const notes: string[] = [];
  const participants = new Set([first.id, second.id]);

  if (input.chartRulerId && participants.has(input.chartRulerId as BehavioralPlanetId)) {
    notes.push("این رابطه به حاکم چارت وصل است و روی شیوه شروع و انتخاب وزن بیشتری دارد");
  }
  if (participants.has("sun") || participants.has("moon")) {
    notes.push("چون خورشید یا ماه درگیر است، الگو به هویت یا امنیت عاطفی نزدیک می‌شود");
  }
  const activeHouses = new Set(
    (input.activeHouseNumbers ?? []).map((house) => normalizeHouseNumber(house)).filter(Boolean),
  );
  if (
    (first.houseNumber && activeHouses.has(first.houseNumber)) ||
    (second.houseNumber && activeHouses.has(second.houseNumber))
  ) {
    notes.push("یکی از میدان‌های فعال چارت در این رابطه حضور دارد");
  }
  if (input.synthesisRole === "challenge") {
    notes.push("این رابطه در synthesis به‌عنوان کشمکش اصلی انتخاب شده است");
  } else if (input.synthesisRole === "support") {
    notes.push("این رابطه در synthesis منبع همراه و تنظیم‌کننده است");
  } else if (input.synthesisRole === "daily-bridge") {
    notes.push("این رابطه پل ترجمه الگو به رفتار روزمره است");
  }

  return notes.length > 0
    ? notes.join("؛ ")
    : "اهمیت این رابطه از ترکیب دو سیاره، خانه‌ها، نشان‌ها و نزدیکی زاویه به دست می‌آید";
}

function buildRetrogradeAspectNote(
  first: AspectParticipantContext,
  second: AspectParticipantContext,
): string {
  const retrograde = [first, second].filter((participant) => participant.retrograde);

  if (retrograde.length === 0) {
    return "";
  }

  return "؛ یکی از نیروها پس‌روست و ممکن است پیش از بیان بیرونی چند بار درونت مرور یا بازبینی شود";
}

function buildGenericAspectExperiment(
  aspectId: BehavioralAspectId,
  first: AspectParticipantContext,
  second: AspectParticipantContext,
): string {
  if (aspectId === "square" || aspectId === "opposition") {
    return `یک موقعیت واقعی را انتخاب کن و روی کاغذ بنویس: نیاز اول چیست، نیاز دوم چیست و کوچک‌ترین توافق یا مرز قابل اجرا میان ${first.house?.scene ?? "میدان اول"} و ${second.house?.scene ?? "میدان دوم"} کدام است`;
  }

  if (aspectId === "conjunction") {
    return `پیش از واکنش، نام ببر کدام نیاز هدایت می‌کند و سپس یک اقدام کوچک انجام بده که ${first.planet.role} و ${second.planet.role} را هم‌زمان اما جداگانه جا بدهد`;
  }

  return `یک توان طبیعی این رابطه را انتخاب کن و آن را تا پایان هفته به یک کار قابل مشاهده در ${first.house?.scene ?? "زندگی روزمره"} تبدیل کن`;
}

function buildAspectConfidenceNote(orb: number | null | undefined): string {
  if (typeof orb !== "number" || !Number.isFinite(orb)) {
    return "عدد اورب برای این کارت در دسترس نیست؛ وزن خوانش از زمینه کامل چارت می‌آید";
  }

  if (orb <= 1.5) {
    return `اورب ${orb.toFixed(1)} درجه است؛ تماس بسیار نزدیک است، اما معنای انسانی آن همچنان از سیاره‌ها و خانه‌ها می‌آید`;
  }

  if (orb <= 4) {
    return `اورب ${orb.toFixed(1)} درجه است؛ تماس روشن و قابل استفاده است، بدون اینکه نزدیکی عددی جای زمینه را بگیرد`;
  }

  return `اورب ${orb.toFixed(1)} درجه است؛ این رابطه با اعتماد ملایم‌تر و در کنار بقیه شواهد چارت خوانده می‌شود`;
}

function normalizeAspectId(value: string): BehavioralAspectId {
  return value in ASPECT_FORM_SEMANTICS
    ? (value as BehavioralAspectId)
    : "conjunction";
}
