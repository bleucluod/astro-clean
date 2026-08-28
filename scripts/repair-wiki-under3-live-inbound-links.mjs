import postgres from "postgres";

const ARTICLE_LINK_PATTERN = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const RUN_ID = "wiki-under3-live-inbound-links-20260828";
const LIVE_INBOUND_TARGET = 3;

const placements = [
  {
    source: "aban-woman-traits",
    target: "aban-birth-month-compatibility",
    anchor: "سازگاری آبان در رابطه",
    sentence: "وقتی بحث از انتخاب شریک جلوتر می‌رود، [[article:aban-birth-month-compatibility|سازگاری آبان در رابطه]] کمک می‌کند این ویژگی‌ها را کنار ماه‌های دیگر هم ببینی.",
    hints: ["آبان", "عشق", "رابطه", "ازدواج"],
  },
  {
    source: "why-sun-sign-is-not-enough",
    target: "is-astrology-real-science",
    anchor: "مرز آسترولوژی و علم",
    sentence: "همین‌جا باید [[article:is-astrology-real-science|مرز آسترولوژی و علم]] را هم جدی گرفت، چون نشان خورشیدی به‌تنهایی نه دادهٔ علمی می‌سازد و نه حکم قطعی دربارهٔ آدم‌ها.",
    hints: ["علم", "واقعی", "محدودیت", "خورشید"],
  },
  {
    source: "birth-chart-basics",
    target: "astrology-learning-roadmap",
    anchor: "مسیر یادگیری آسترولوژی",
    sentence: "اگر بعد از شناخت اجزای چارت دنبال ترتیب مطالعه هستی، [[article:astrology-learning-roadmap|مسیر یادگیری آسترولوژی]] کمک می‌کند این لایه‌ها را قدم‌به‌قدم بچینی.",
    hints: ["شروع", "خواندن", "چارت", "لایه"],
  },
  {
    source: "how-to-read-birth-chart",
    target: "astrology-learning-roadmap",
    anchor: "نقشه راه یادگیری آسترولوژی",
    sentence: "برای اینکه خواندن چارت به پرش میان مقاله‌های پراکنده تبدیل نشود، [[article:astrology-learning-roadmap|نقشه راه یادگیری آسترولوژی]] ترتیب امن‌تری پیشنهاد می‌کند.",
    hints: ["ترتیب", "شروع", "خواندن", "چارت"],
  },
  {
    source: "what-is-astrology",
    target: "astrology-learning-roadmap",
    anchor: "شروع یادگیری آسترولوژی",
    sentence: "اگر این تعریف برایت نقطه شروع است، [[article:astrology-learning-roadmap|شروع یادگیری آسترولوژی]] مسیر بعدی را از مفاهیم پایه تا خواندن ترکیبی روشن‌تر می‌کند.",
    hints: ["شروع", "تعریف", "آسترولوژی", "یادگیری"],
  },
  {
    source: "esfand-woman-traits",
    target: "esfand-birth-month-compatibility",
    anchor: "سازگاری اسفند در رابطه",
    sentence: "برای دیدن همین حساسیت‌ها در رابطهٔ دوطرفه، [[article:esfand-birth-month-compatibility|سازگاری اسفند در رابطه]] تصویر کامل‌تری از مرز و صمیمیت می‌دهد.",
    hints: ["اسفند", "عشق", "رابطه", "مرز"],
  },
  {
    source: "why-birth-time-matters",
    target: "birth-time-rectification",
    anchor: "اصلاح ساعت تولد",
    sentence: "وقتی اختلاف چند دقیقه‌ای می‌تواند زاویه‌ها را جابه‌جا کند، [[article:birth-time-rectification|اصلاح ساعت تولد]] تبدیل به مسیر دقیق‌تری برای بررسی زمان تولد می‌شود.",
    hints: ["ساعت", "دقیق", "زاویه", "تولد"],
  },
  {
    source: "birth-chart-without-birth-time",
    target: "birth-time-rectification",
    anchor: "اصلاح ساعت تولد",
    sentence: "اگر نبودن ساعت دقیق فقط یک حدس کلی باقی بگذارد، [[article:birth-time-rectification|اصلاح ساعت تولد]] راهی است برای نزدیک‌شدن محتاطانه به زمان واقعی.",
    hints: ["بدون ساعت", "ساعت", "رایزینگ", "خانه"],
  },
  {
    source: "find-exact-birth-time",
    target: "birth-time-rectification",
    anchor: "Birth Time Rectification",
    sentence: "اگر هیچ مسیر مستقیمی جواب نداد، [[article:birth-time-rectification|Birth Time Rectification]] همان مرحلهٔ تخصصی‌تر است که از رویدادهای زندگی برای تخمین ساعت کمک می‌گیرد.",
    hints: ["ساعت", "تخمین", "دقیق", "ثبت"],
  },
  {
    source: "birth-chart-basics",
    target: "ai-birth-chart-interpretation",
    anchor: "تفسیر چارت تولد با هوش مصنوعی",
    sentence: "بعد از شناخت اجزای پایه، [[article:ai-birth-chart-interpretation|تفسیر چارت تولد با هوش مصنوعی]] نشان می‌دهد خروجی سریع ابزار را چطور با احتیاط بخوانی.",
    hints: ["چارت", "تفسیر", "هالیوس", "ابزار"],
  },
  {
    source: "annual-astrology-1405",
    target: "mehr-1405-transit-guide",
    anchor: "ترنزیت مهر ۱۴۰۵",
    sentence: "در ادامهٔ تصویر سالانه، [[article:mehr-1405-transit-guide|ترنزیت مهر ۱۴۰۵]] جزئیات ماهی را باز می‌کند که از دل همین روندهای بزرگ‌تر می‌آید.",
    hints: ["۱۴۰۵", "سال", "ترنزیت", "ماه"],
  },
  {
    source: "full-moon-in-natal-chart",
    target: "full-moon-calendar-1405",
    anchor: "تقویم ماه کامل ۱۴۰۵",
    sentence: "برای دنبال‌کردن زمان بدرهای امسال، [[article:full-moon-calendar-1405|تقویم ماه کامل ۱۴۰۵]] تاریخ‌ها را جدا از معنی تولدی ماه کامل مرتب کرده است.",
    hints: ["ماه کامل", "بدر", "تقویم", "چرخه"],
  },
  {
    source: "astrology-transits-explained",
    target: "full-moon-calendar-1405",
    anchor: "تاریخ ماه‌های کامل ۱۴۰۵",
    sentence: "در کنار ترنزیت سیاره‌ها، [[article:full-moon-calendar-1405|تاریخ ماه‌های کامل ۱۴۰۵]] نقاط اوج چرخهٔ ماه را هم به تصویر زمانی اضافه می‌کند.",
    hints: ["ترنزیت", "زمان", "ماه", "چرخه"],
  },
  {
    source: "new-moon-in-natal-chart",
    target: "new-moon-calendar-1405",
    anchor: "تقویم ماه نو ۱۴۰۵",
    sentence: "اگر می‌خواهی شروع‌های چرخهٔ ماه را در سال دنبال کنی، [[article:new-moon-calendar-1405|تقویم ماه نو ۱۴۰۵]] تاریخ‌های کاربردی‌تری کنار این خوانش تولدی می‌گذارد.",
    hints: ["ماه نو", "شروع", "چرخه", "تقویم"],
  },
  {
    source: "astrology-transits-explained",
    target: "new-moon-calendar-1405",
    anchor: "تاریخ ماه‌های نو ۱۴۰۵",
    sentence: "برای دیدن شروع چرخه‌ها در کنار ترنزیت‌ها، [[article:new-moon-calendar-1405|تاریخ ماه‌های نو ۱۴۰۵]] یک لایهٔ زمانی ساده‌تر اضافه می‌کند.",
    hints: ["ترنزیت", "زمان", "ماه", "شروع"],
  },
  {
    source: "venus-in-natal-chart",
    target: "birth-chart-and-relationships",
    anchor: "چارت تولد و رابطه",
    sentence: "وقتی ونوس را کنار مریخ و خانه هفتم بگذاری، [[article:birth-chart-and-relationships|چارت تولد و رابطه]] تصویر رابطه‌ای را از یک placement جدا فراتر می‌برد.",
    hints: ["ونوس", "رابطه", "عشق", "خانه هفتم"],
  },
  {
    source: "seventh-house-in-natal-chart",
    target: "birth-chart-and-relationships",
    anchor: "رابطه در چارت تولد",
    sentence: "برای اینکه خانه هفتم تنها معیار رابطه نشود، [[article:birth-chart-and-relationships|رابطه در چارت تولد]] ونوس، مریخ و الگوهای دیگر را هم وارد خوانش می‌کند.",
    hints: ["خانه هفتم", "رابطه", "ازدواج", "شراکت"],
  },
  {
    source: "why-birth-time-matters",
    target: "placidus-houses-in-halleus",
    anchor: "خانه‌های Placidus در هالیوس",
    sentence: "از همین حساسیت زمانی است که [[article:placidus-houses-in-halleus|خانه‌های Placidus در هالیوس]] اهمیت پیدا می‌کند، چون روش خانه‌بندی به ساعت و مکان وابسته است.",
    hints: ["ساعت", "خانه", "محاسبه", "هالیوس"],
  },
  {
    source: "birth-time-rectification",
    target: "find-exact-birth-time",
    anchor: "پیدا کردن ساعت دقیق تولد",
    sentence: "پیش از رفتن سراغ اصلاح تخصصی، [[article:find-exact-birth-time|پیدا کردن ساعت دقیق تولد]] چند راه ساده‌تر برای رسیدن به دادهٔ قابل اتکاتر پیشنهاد می‌کند.",
    hints: ["ساعت", "دقیق", "تولد", "داده"],
  },
  {
    source: "astrology-houses",
    target: "four-angles-in-natal-chart",
    anchor: "چهار زاویه اصلی چارت",
    sentence: "در میان خانه‌ها، [[article:four-angles-in-natal-chart|چهار زاویه اصلی چارت]] ستون‌های پررنگ‌تری هستند که خوانش طالع، رابطه، خانه و مسیر اجتماعی را شکل می‌دهند.",
    hints: ["خانه", "زاویه", "طالع", "محور"],
  },
  {
    source: "what-is-rising-sign",
    target: "four-angles-in-natal-chart",
    anchor: "چهار زاویه چارت تولد",
    sentence: "رایزینگ فقط یکی از محورهای اصلی است؛ [[article:four-angles-in-natal-chart|چهار زاویه چارت تولد]] نشان می‌دهد ASC کنار DSC، MC و IC چه تصویری می‌سازد.",
    hints: ["رایزینگ", "ASC", "طالع", "محور"],
  },
  {
    source: "transits-to-ascendant-and-midheaven",
    target: "four-angles-in-natal-chart",
    anchor: "زاویه‌های اصلی چارت",
    sentence: "وقتی ترنزیت‌ها به ASC یا MC می‌رسند، شناخت [[article:four-angles-in-natal-chart|زاویه‌های اصلی چارت]] کمک می‌کند اثر این تماس‌ها را دقیق‌تر بفهمی.",
    hints: ["ASC", "MC", "ترنزیت", "زاویه"],
  },
  {
    source: "astrology-houses",
    target: "house-rulers-in-natal-chart",
    anchor: "حاکم خانه‌ها در چارت تولد",
    sentence: "بعد از معنی هر خانه، [[article:house-rulers-in-natal-chart|حاکم خانه‌ها در چارت تولد]] لایهٔ بعدی را نشان می‌دهد: اینکه موضوع هر خانه از کجا هدایت می‌شود.",
    hints: ["خانه", "حاکم", "لرد", "چارت"],
  },
  {
    source: "empty-houses-in-natal-chart",
    target: "house-rulers-in-natal-chart",
    anchor: "حاکم خانه در چارت",
    sentence: "برای خانه‌های خالی، [[article:house-rulers-in-natal-chart|حاکم خانه در چارت]] معمولاً مهم‌تر از نبودن سیاره داخل آن خانه است.",
    hints: ["خانه خالی", "حاکم", "خانه", "سیاره"],
  },
  {
    source: "chart-ruler-in-natal-chart",
    target: "house-rulers-in-natal-chart",
    anchor: "حاکم خانه‌ها",
    sentence: "حاکم چارت از همین منطق بزرگ‌تر می‌آید؛ [[article:house-rulers-in-natal-chart|حاکم خانه‌ها]] توضیح می‌دهد هر حوزهٔ زندگی از کدام سیاره مسیر می‌گیرد.",
    hints: ["حاکم", "چارت", "سیاره", "خانه"],
  },
  {
    source: "khordad-woman-traits",
    target: "khordad-birth-month-compatibility",
    anchor: "سازگاری خرداد در رابطه",
    sentence: "برای دیدن همین نیاز به گفت‌وگو در رابطهٔ دوطرفه، [[article:khordad-birth-month-compatibility|سازگاری خرداد در رابطه]] تصویر روشن‌تری از عشق و ازدواج می‌دهد.",
    hints: ["خرداد", "عشق", "رابطه", "ازدواج"],
  },
  {
    source: "aban-birth-month-compatibility",
    target: "aban-woman-traits",
    anchor: "زن متولد آبان",
    sentence: "در همین بحث سازگاری، شناخت [[article:aban-woman-traits|زن متولد آبان]] کمک می‌کند شدت، اعتماد و مرزهای عاطفی این ماه دقیق‌تر دیده شود.",
    hints: ["آبان", "زن", "عشق", "سازگاری"],
  },
  {
    source: "esfand-birth-month-compatibility",
    target: "esfand-woman-traits",
    anchor: "زن متولد اسفند",
    sentence: "برای فهم ظرافت‌های احساسی این ماه، [[article:esfand-woman-traits|زن متولد اسفند]] لایهٔ شخصی‌تری کنار بحث سازگاری می‌گذارد.",
    hints: ["اسفند", "زن", "عشق", "سازگاری"],
  },
  {
    source: "khordad-birth-month-compatibility",
    target: "khordad-woman-traits",
    anchor: "زن متولد خرداد",
    sentence: "در رابطه با خرداد، [[article:khordad-woman-traits|زن متولد خرداد]] نشان می‌دهد کنجکاوی، گفت‌وگو و تغییر ریتم چطور در تجربهٔ عاطفی دیده می‌شود.",
    hints: ["خرداد", "زن", "عشق", "ارتباط"],
  },
  {
    source: "dey-man-traits",
    target: "dey-woman-traits",
    anchor: "زن متولد دی",
    sentence: "برای کامل‌تر دیدن تفاوت بیان همین انرژی، [[article:dey-woman-traits|زن متولد دی]] کنار خوانش مرد دی‌ماهی تصویر رابطه‌ای دقیق‌تری می‌سازد.",
    hints: ["دی", "زن", "مرد", "عشق"],
  },
  {
    source: "farvardin-birth-month-compatibility",
    target: "farvardin-woman-traits",
    anchor: "زن متولد فروردین",
    sentence: "وقتی پای رابطه و تعارض وسط است، [[article:farvardin-woman-traits|زن متولد فروردین]] بخش شخصی‌تر این انرژی مستقیم و آغازگر را روشن می‌کند.",
    hints: ["فروردین", "زن", "رابطه", "عشق"],
  },
  {
    source: "aban-birth-month-compatibility",
    target: "aban-man-traits",
    anchor: "مرد متولد آبان",
    sentence: "برای فهم اینکه این شدت عاطفی در رفتار مردانه چطور دیده می‌شود، [[article:aban-man-traits|مرد متولد آبان]] کنار بحث سازگاری خوانش کاربردی‌تری می‌دهد.",
    hints: ["آبان", "مرد", "عشق", "سازگاری"],
  },
  {
    source: "esfand-birth-month-compatibility",
    target: "esfand-man-traits",
    anchor: "مرد متولد اسفند",
    sentence: "در ادامهٔ بحث سازگاری، [[article:esfand-man-traits|مرد متولد اسفند]] نشان می‌دهد احساس، فرار از فشار و نیاز به امنیت چطور در رابطه ظاهر می‌شود.",
    hints: ["اسفند", "مرد", "رابطه", "عشق"],
  },
  {
    source: "khordad-birth-month-compatibility",
    target: "khordad-man-traits",
    anchor: "مرد متولد خرداد",
    sentence: "برای دیدن همین الگوی ذهنی در رفتار فردی، [[article:khordad-man-traits|مرد متولد خرداد]] مکمل طبیعی بحث سازگاری خرداد است.",
    hints: ["خرداد", "مرد", "عشق", "ارتباط"],
  },
  {
    source: "persian-birth-months-astrology-guide",
    target: "dey-man-traits",
    anchor: "مرد متولد دی",
    sentence: "در بخش دی، [[article:dey-man-traits|مرد متولد دی]] نمونهٔ دقیق‌تری از مسئولیت، فاصلهٔ عاطفی و تعهد در این ماه می‌دهد.",
    hints: ["دی", "ماه تولد", "مرد", "شخصیت"],
  },
  {
    source: "farvardin-birth-month-compatibility",
    target: "farvardin-man-traits",
    anchor: "مرد متولد فروردین",
    sentence: "برای اینکه سازگاری فقط کلی نماند، [[article:farvardin-man-traits|مرد متولد فروردین]] رفتار مستقیم، تعهد و قهر را در همین ماه جداگانه باز می‌کند.",
    hints: ["فروردین", "مرد", "رابطه", "عشق"],
  },
  {
    source: "seventh-house-in-natal-chart",
    target: "descendant-dsc-in-natal-chart",
    anchor: "دسندنت در چارت تولد",
    sentence: "در لبهٔ همین خانه، [[article:descendant-dsc-in-natal-chart|دسندنت در چارت تولد]] نشان می‌دهد رابطه از کدام نقطهٔ مقابل طالع وارد خوانش می‌شود.",
    hints: ["خانه هفتم", "دسندنت", "رابطه", "طالع"],
  },
  {
    source: "what-is-rising-sign",
    target: "descendant-dsc-in-natal-chart",
    anchor: "DSC در چارت تولد",
    sentence: "هرجا از ASC حرف می‌زنیم، نقطهٔ روبه‌رو هم مهم است؛ [[article:descendant-dsc-in-natal-chart|DSC در چارت تولد]] این آینهٔ رابطه‌ای را روشن‌تر می‌کند.",
    hints: ["ASC", "طالع", "روبه‌رو", "رابطه"],
  },
  {
    source: "astrology-houses",
    target: "house-systems-in-astrology",
    anchor: "سیستم خانه‌ها در آسترولوژی",
    sentence: "معنی خانه‌ها بدون روش محاسبه کامل نمی‌شود؛ [[article:house-systems-in-astrology|سیستم خانه‌ها در آسترولوژی]] فرق Placidus، Whole Sign و Equal را جدا می‌کند.",
    hints: ["خانه", "سیستم", "محاسبه", "Placidus"],
  },
  {
    source: "what-is-tropical-astrology",
    target: "house-systems-in-astrology",
    anchor: "روش‌های خانه‌بندی",
    sentence: "در کنار تفاوت زودیاک‌ها، [[article:house-systems-in-astrology|روش‌های خانه‌بندی]] هم توضیح می‌دهد چرا دو چارت ممکن است با دادهٔ یکسان چیدمان متفاوتی داشته باشند.",
    hints: ["تروپیکال", "زودیاک", "خانه", "روش"],
  },
  {
    source: "is-astrology-real-science",
    target: "abjad-astrology",
    anchor: "طالع‌بینی ابجد",
    sentence: "همین مرزبندی دربارهٔ روش‌های نام‌محور هم لازم است؛ [[article:abjad-astrology|طالع‌بینی ابجد]] باید جدا از چارت تولد و با محدودیت‌های خودش سنجیده شود.",
    hints: ["علم", "روش", "اعتبار", "نام"],
  },
  {
    source: "what-is-chinese-astrology",
    target: "chinese-zodiac-compatibility-marriage",
    anchor: "سازگاری سال‌های چینی",
    sentence: "وقتی حیوان سال تولد وارد رابطه می‌شود، [[article:chinese-zodiac-compatibility-marriage|سازگاری سال‌های چینی]] توضیح می‌دهد این منطق در عشق و ازدواج چطور استفاده می‌شود.",
    hints: ["چینی", "حیوان", "سال", "ازدواج"],
  },
  {
    source: "year-of-horse-1405-chinese-astrology",
    target: "chinese-zodiac-compatibility-marriage",
    anchor: "سازگاری حیوان سال‌ها",
    sentence: "برای سنجیدن رابطهٔ سال اسب با سال‌های دیگر، [[article:chinese-zodiac-compatibility-marriage|سازگاری حیوان سال‌ها]] چارچوب کاربردی‌تری از توصیف یک سال تنها می‌دهد.",
    hints: ["اسب", "سال", "چینی", "سازگاری"],
  },
  {
    source: "marriage-astrology-name-vs-synastry",
    target: "chinese-zodiac-compatibility-marriage",
    anchor: "طالع‌بینی چینی ازدواج",
    sentence: "در کنار روش‌های اسمی و سینستری، [[article:chinese-zodiac-compatibility-marriage|طالع‌بینی چینی ازدواج]] یک نمونهٔ سال‌محور برای مقایسهٔ روش‌هاست.",
    hints: ["ازدواج", "سازگاری", "روش", "سینستری"],
  },
  {
    source: "weekly-astrology",
    target: "annual-astrology-1405",
    anchor: "طالع‌بینی سال ۱۴۰۵",
    sentence: "اگر از ریتم هفتگی عقب‌تر بروی و تصویر بزرگ‌تری بخواهی، [[article:annual-astrology-1405|طالع‌بینی سال ۱۴۰۵]] روندهای اصلی سال را کنار هم می‌گذارد.",
    hints: ["هفتگی", "سال", "۱۴۰۵", "ترنزیت"],
  },
  {
    source: "what-is-chinese-astrology",
    target: "year-of-horse-1405-chinese-astrology",
    anchor: "سال اسب ۱۴۰۵",
    sentence: "برای نمونهٔ امسال، [[article:year-of-horse-1405-chinese-astrology|سال اسب ۱۴۰۵]] همین منطق حیوان سال را در یک بازهٔ مشخص‌تر نشان می‌دهد.",
    hints: ["چینی", "سال", "حیوان", "اسب"],
  },
  {
    source: "chinese-zodiac-compatibility-marriage",
    target: "year-of-horse-1405-chinese-astrology",
    anchor: "سال اسب ۱۴۰۵",
    sentence: "اگر یکی از طرفین با نماد اسب سنجیده می‌شود، [[article:year-of-horse-1405-chinese-astrology|سال اسب ۱۴۰۵]] زمینهٔ همان نماد را دقیق‌تر توضیح می‌دهد.",
    hints: ["اسب", "سازگاری", "چینی", "سال"],
  },
  {
    source: "annual-astrology-1405",
    target: "year-of-horse-1405-chinese-astrology",
    anchor: "طالع‌بینی چینی سال اسب",
    sentence: "در کنار خوانش سالانهٔ ترنزیت‌ها، [[article:year-of-horse-1405-chinese-astrology|طالع‌بینی چینی سال اسب]] نگاه سال‌محور دیگری به ۱۴۰۵ اضافه می‌کند.",
    hints: ["۱۴۰۵", "سال", "چینی", "طالع"],
  },
  {
    source: "is-astrology-real-science",
    target: "marriage-astrology-name-vs-synastry",
    anchor: "تفاوت اسم و سینستری در ازدواج",
    sentence: "برای رابطه و ازدواج هم [[article:marriage-astrology-name-vs-synastry|تفاوت اسم و سینستری]] نشان می‌دهد کدام روش فقط سرگرمی است و کدام به دادهٔ چارت نزدیک‌تر می‌شود.",
    hints: ["ازدواج", "رابطه", "روش", "اعتبار"],
  },
  {
    source: "chinese-zodiac-compatibility-marriage",
    target: "what-is-chinese-astrology",
    anchor: "طالع‌بینی چینی",
    sentence: "برای اینکه جدول سازگاری بی‌زمینه نماند، [[article:what-is-chinese-astrology|طالع‌بینی چینی]] منطق حیوان سال، عنصر و چرخه را از پایه توضیح می‌دهد.",
    hints: ["چینی", "سال", "حیوان", "سازگاری"],
  },
  {
    source: "annual-astrology-1405",
    target: "weekly-astrology",
    anchor: "طالع‌بینی هفتگی",
    sentence: "وقتی تصویر سالانه بیش از حد کلی می‌شود، [[article:weekly-astrology|طالع‌بینی هفتگی]] همان روندها را در بازهٔ کوتاه‌تر و قابل پیگیری‌تر می‌آورد.",
    hints: ["سال", "هفته", "ترنزیت", "۱۴۰۵"],
  },
  {
    source: "four-elements-in-natal-chart",
    target: "dominant-element-in-natal-chart",
    anchor: "عنصر غالب در چارت تولد",
    sentence: "بعد از شناخت چهار عنصر، [[article:dominant-element-in-natal-chart|عنصر غالب در چارت تولد]] نشان می‌دهد وقتی یکی از این کیفیت‌ها پررنگ‌تر است چطور باید خوانده شود.",
    hints: ["عنصر", "آتش", "خاک", "هوا", "آب"],
  },
  {
    source: "overall-chart-signature",
    target: "dominant-element-in-natal-chart",
    anchor: "عنصر غالب چارت",
    sentence: "امضای کلی چارت بدون دیدن وزن عناصر ناقص می‌ماند؛ [[article:dominant-element-in-natal-chart|عنصر غالب چارت]] یکی از راه‌های سنجیدن همین وزن است.",
    hints: ["امضا", "کلی", "عنصر", "چارت"],
  },
  {
    source: "missing-elements-in-natal-chart",
    target: "dominant-element-in-natal-chart",
    anchor: "عنصر غالب",
    sentence: "کم‌رنگی یک عنصر معمولاً کنار [[article:dominant-element-in-natal-chart|عنصر غالب]] بهتر فهمیده می‌شود، چون هر دو دربارهٔ توزیع انرژی در کل چارت‌اند.",
    hints: ["عنصر", "کم‌رنگ", "غالب", "چارت"],
  },
  {
    source: "farvardin-woman-traits",
    target: "farvardin-birth-month-compatibility",
    anchor: "سازگاری فروردین در رابطه",
    sentence: "برای دیدن همین انرژی مستقیم در رابطهٔ دوطرفه، [[article:farvardin-birth-month-compatibility|سازگاری فروردین در رابطه]] تعارض و جذب را کنار ماه‌های دیگر بررسی می‌کند.",
    hints: ["فروردین", "عشق", "رابطه", "تعارض"],
  },
  {
    source: "ordibehesht-born-traits",
    target: "birth-month-flowers",
    anchor: "گل ماه تولد",
    sentence: "اگر از نمادهای شخصیتی به نمادهای هدیه و معنا برویم، [[article:birth-month-flowers|گل ماه تولد]] مسیر نرم‌تری برای دیدن ماه‌ها می‌دهد.",
    hints: ["اردیبهشت", "ماه تولد", "نماد", "هدیه"],
  },
  {
    source: "pluto-in-natal-chart",
    target: "lilith-in-natal-chart",
    anchor: "لیلث در چارت تولد",
    sentence: "در کنار شدت پلوتویی، [[article:lilith-in-natal-chart|لیلث در چارت تولد]] لایهٔ دیگری از مرز، سایه و آزادی شخصی را وارد خوانش می‌کند.",
    hints: ["پلوتو", "سایه", "قدرت", "مرز"],
  },
  {
    source: "planets-in-birth-chart",
    target: "lilith-in-natal-chart",
    anchor: "لیلث در چارت",
    sentence: "بعد از سیاره‌ها و نقاط اصلی، [[article:lilith-in-natal-chart|لیلث در چارت]] یکی از نقاط تفسیری است که باید با احتیاط و بدون اغراق خوانده شود.",
    hints: ["سیاره", "نقطه", "چارت", "لیلث"],
  },
  {
    source: "new-moon-vs-full-moon-astrology",
    target: "full-moon-in-natal-chart",
    anchor: "ماه کامل در چارت تولد",
    sentence: "اگر تفاوت چرخه‌ای ماه نو و بدر برایت روشن شد، [[article:full-moon-in-natal-chart|ماه کامل در چارت تولد]] این اوج چرخه را در نقشهٔ تولد شخصی‌تر می‌کند.",
    hints: ["ماه کامل", "بدر", "چرخه", "تولد"],
  },
  {
    source: "new-moon-vs-full-moon-astrology",
    target: "new-moon-in-natal-chart",
    anchor: "ماه نو در چارت تولد",
    sentence: "در سوی دیگر همین چرخه، [[article:new-moon-in-natal-chart|ماه نو در چارت تولد]] دربارهٔ شروع، نیت و جهت‌گیری درونی حرف می‌زند.",
    hints: ["ماه نو", "شروع", "چرخه", "تولد"],
  },
  {
    source: "tenth-house-in-natal-chart",
    target: "midheaven-mc-in-natal-chart",
    anchor: "میانه آسمان در چارت تولد",
    sentence: "در لبهٔ خانه دهم، [[article:midheaven-mc-in-natal-chart|میانه آسمان در چارت تولد]] مسیر اجتماعی و دیده‌شدن را دقیق‌تر از خود خانه جدا می‌کند.",
    hints: ["خانه دهم", "MC", "مسیر", "اجتماعی"],
  },
  {
    source: "astrology-houses",
    target: "midheaven-mc-in-natal-chart",
    anchor: "MC در چارت تولد",
    sentence: "در میان زاویه‌ها، [[article:midheaven-mc-in-natal-chart|MC در چارت تولد]] نقطه‌ای است که خانه‌ها را به مسیر اجتماعی و جایگاه بیرونی وصل می‌کند.",
    hints: ["خانه", "زاویه", "MC", "دهم"],
  },
  {
    source: "fourth-house-in-natal-chart",
    target: "imum-coeli-ic-in-natal-chart",
    anchor: "IC در چارت تولد",
    sentence: "در ریشهٔ خانه چهارم، [[article:imum-coeli-ic-in-natal-chart|IC در چارت تولد]] نقطهٔ عمیق‌تری برای فهم خانه، خانواده و امنیت پنهان می‌سازد.",
    hints: ["خانه چهارم", "IC", "ریشه", "امنیت"],
  },
  {
    source: "astrology-houses",
    target: "imum-coeli-ic-in-natal-chart",
    anchor: "IC و ریشه‌های چارت",
    sentence: "در کنار معنی خانه چهارم، [[article:imum-coeli-ic-in-natal-chart|IC و ریشه‌های چارت]] نشان می‌دهد پایین‌ترین زاویهٔ نقشه چه نقشی در حس خانه دارد.",
    hints: ["خانه", "زاویه", "IC", "چهارم"],
  },
  {
    source: "planets-in-birth-chart",
    target: "mean-lilith-vs-true-lilith",
    anchor: "Mean Lilith و True Lilith",
    sentence: "برای نقاط محاسباتی‌تر، [[article:mean-lilith-vs-true-lilith|Mean Lilith و True Lilith]] یادآوری می‌کند که نوع محاسبه می‌تواند جایگاه نهایی را تغییر دهد.",
    hints: ["نقطه", "محاسبه", "جایگاه", "لیلث"],
  },
  {
    source: "natal-chart-uses-and-limits",
    target: "mean-lilith-vs-true-lilith",
    anchor: "اختلاف Mean Lilith و True Lilith",
    sentence: "نمونه‌ای مثل [[article:mean-lilith-vs-true-lilith|اختلاف Mean Lilith و True Lilith]] نشان می‌دهد چرا خروجی چارت باید با منبع محاسبه و محدودیت‌هایش خوانده شود.",
    hints: ["محدودیت", "محاسبه", "داده", "چارت"],
  },
  {
    source: "degrees-in-natal-chart",
    target: "mean-node-vs-true-node",
    anchor: "Mean Node و True Node",
    sentence: "برای گره‌های ماه هم همین دقت درجه‌ای مهم است؛ [[article:mean-node-vs-true-node|Mean Node و True Node]] توضیح می‌دهد چرا نوع محاسبه می‌تواند عدد نهایی را کمی جابه‌جا کند.",
    hints: ["درجه", "محاسبه", "گره", "نود"],
  },
];

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    apply: args.has("--apply"),
    printPlan: args.has("--print-plan"),
  };
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function countArticleLinks(text) {
  return [...String(text ?? "").matchAll(ARTICLE_LINK_PATTERN)].length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function articleIdsFromBody(bodyMarkdown) {
  return [...new Set([...String(bodyMarkdown ?? "").matchAll(ARTICLE_LINK_PATTERN)].map((match) => match[1]))];
}

function hasTargetLink(bodyMarkdown, target) {
  return new RegExp(String.raw`\[\[article:${escapeRegExp(target)}(?:\||\]\])`).test(bodyMarkdown);
}

function pickParagraph(sections, hints, usedParagraphs) {
  const candidates = [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const paragraphs = Array.isArray(section?.paragraphs) ? section.paragraphs : [];
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
      const paragraphKey = `${sectionIndex}:${paragraphIndex}`;
      const paragraph = String(paragraphs[paragraphIndex] ?? "");
      if (!paragraph.trim() || countArticleLinks(paragraph) >= 3) continue;
      const haystack = normalizeText(`${section?.title ?? ""} ${paragraph}`);
      const hintScore = hints.filter((hint) => haystack.includes(hint)).length;
      candidates.push({
        sectionIndex,
        paragraphIndex,
        paragraph,
        hintScore,
        fresh: usedParagraphs.has(paragraphKey) ? 0 : 1,
        length: paragraph.length,
      });
    }
  }

  candidates.sort((left, right) =>
    right.hintScore - left.hintScore || right.fresh - left.fresh || right.length - left.length
  );
  return candidates[0] ?? null;
}

function replaceBodyParagraph(bodyMarkdown, before, after) {
  if (bodyMarkdown.includes(before)) return bodyMarkdown.replace(before, after);
  const compactPattern = escapeRegExp(normalizeText(before)).replace(/\\ /g, String.raw`\s+`);
  const match = bodyMarkdown.match(new RegExp(compactPattern));
  if (!match) return null;
  return bodyMarkdown.replace(match[0], after);
}

function buildSnapshot(row, sections, bodyMarkdown, relatedArticleIds, contentVersion) {
  return {
    stableId: row.stable_id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    seoTitle: row.seo_title,
    metaDescription: row.meta_description ?? row.summary,
    categoryId: row.category_id,
    tags: row.tags ?? [],
    summary: row.summary,
    intro: row.intro,
    readingMinutes: row.reading_minutes,
    publicationPriority: row.publication_priority,
    contentCluster: row.content_cluster ?? row.category_id,
    articleRole: row.article_role,
    relatedArticleIds,
    indexable: row.is_indexable,
    bodyMarkdown,
    keyPoints: row.key_points ?? [],
    sections,
    contextLinks: row.context_links ?? [],
    sources: row.sources ?? [],
    callToAction: row.call_to_action ?? null,
    contentVersion,
  };
}

async function syncInlineLinks(tx, sourceArticleId, bodyMarkdown, relatedArticleIds) {
  const inlineIds = articleIdsFromBody(bodyMarkdown);
  const relatedIds = [...new Set(relatedArticleIds ?? [])];
  await tx`delete from public.wiki_internal_links where source_article_id = ${sourceArticleId}::uuid`;
  for (const targetId of inlineIds) {
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`},
        'active', now(), now()
      )
    `;
  }
  for (const targetId of relatedIds) {
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'related', ${targetId},
        'active', now(), now()
      )
      on conflict do nothing
    `;
  }
  return { inlineCount: inlineIds.length, relatedCount: relatedIds.length };
}

async function submitIndexNowBestEffort(slugs) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://halleus.ir").replace(/\/+$/, "");
  const key = process.env.HALLEUS_INDEXNOW_KEY;
  const urlList = [...new Set(slugs.filter(Boolean).map((slug) => `${site}/wiki/${slug}`))].slice(0, 10000);
  if (!key || !urlList.length) return { ok: true, skipped: true, submitted: 0 };
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      host: new URL(site).host,
      key,
      keyLocation: `${site}/indexnow-key.txt`,
      urlList,
    }),
  });
  return { ok: response.ok, skipped: false, status: response.status, submitted: response.ok ? urlList.length : 0 };
}

async function main() {
  const options = parseArgs();
  if (options.printPlan) {
    console.log(JSON.stringify({ runId: RUN_ID, liveInboundTarget: LIVE_INBOUND_TARGET, placements }, null, 2));
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const result = await sql.begin(async (tx) => {
      const touchedSources = [...new Set(placements.map((item) => item.source))];
      const targetIds = [...new Set(placements.map((item) => item.target))];
      const allIds = [...new Set([...touchedSources, ...targetIds])];
      const articleRows = await tx`
        select
          id::text, stable_id, slug, title, short_title, seo_title, meta_description,
          category_id, tags, summary, intro, reading_minutes, key_points, sections,
          context_links, sources, call_to_action, related_article_ids, publication_priority,
          content_cluster, article_role, content_version, is_indexable, body_markdown,
          status, published_at::text, scheduled_for::text, deleted_at::text
        from public.wiki_articles
        where stable_id = any(${allIds}::text[])
        for update
      `;
      const byStableId = new Map(articleRows.map((row) => [String(row.stable_id), row]));
      const missing = allIds.filter((stableId) => !byStableId.has(stableId));
      if (missing.length) throw new Error(`Missing Wiki articles: ${missing.join(", ")}`);

      const notPublicReady = allIds.filter((stableId) => {
        const row = byStableId.get(stableId);
        return row.status !== "published" || !row.is_indexable || !row.published_at || row.scheduled_for || row.deleted_at;
      });
      if (notPublicReady.length) throw new Error(`Articles are not current-public: ${notPublicReady.join(", ")}`);

      const openDraftRows = await tx`
        select article.stable_id
        from public.wiki_article_drafts as draft
        join public.wiki_articles as article on article.id = draft.article_id
        where article.stable_id = any(${touchedSources}::text[])
      `;
      if (openDraftRows.length) {
        throw new Error(`Sources with open drafts must be resolved first: ${openDraftRows.map((row) => row.stable_id).join(", ")}`);
      }

      const incomingRows = await tx`
        select target_stable_id, count(distinct source_article_id)::int as count
        from public.wiki_internal_links
        where target_stable_id = any(${targetIds}::text[])
          and link_kind = 'inline'
          and activation_status = 'active'
        group by target_stable_id
      `;
      const incomingByTarget = new Map(incomingRows.map((row) => [String(row.target_stable_id), Number(row.count ?? 0)]));
      const beforeIncomingByTarget = Object.fromEntries(targetIds.map((target) => [target, incomingByTarget.get(target) ?? 0]));
      const sourcePlacements = new Map();
      for (const placement of placements) {
        const current = sourcePlacements.get(placement.source) ?? [];
        current.push(placement);
        sourcePlacements.set(placement.source, current);
      }

      const applied = [];
      const skipped = [];
      const changedSourceSlugs = [];
      for (const source of touchedSources) {
        const row = byStableId.get(source);
        let bodyMarkdown = String(row.body_markdown ?? "");
        const sections = JSON.parse(JSON.stringify(row.sections ?? []));
        let relatedArticleIds = [...new Set(row.related_article_ids ?? [])];
        const usedParagraphs = new Set();
        let changed = false;

        for (const placement of sourcePlacements.get(source) ?? []) {
          const currentIncoming = incomingByTarget.get(placement.target) ?? 0;
          if (currentIncoming >= LIVE_INBOUND_TARGET) {
            skipped.push({ ...placement, reason: "target-already-complete", currentIncoming });
            continue;
          }
          if (hasTargetLink(bodyMarkdown, placement.target)) {
            skipped.push({ ...placement, reason: "already-linked" });
            continue;
          }
          const picked = pickParagraph(sections, placement.hints, usedParagraphs);
          if (!picked) {
            skipped.push({ ...placement, reason: "no-safe-paragraph" });
            continue;
          }
          const before = String(sections[picked.sectionIndex].paragraphs[picked.paragraphIndex]);
          const after = `${before.trim()} ${placement.sentence}`;
          const nextBody = replaceBodyParagraph(bodyMarkdown, before, after);
          if (!nextBody) {
            skipped.push({ ...placement, reason: "body-paragraph-not-found" });
            continue;
          }
          sections[picked.sectionIndex].paragraphs[picked.paragraphIndex] = after;
          usedParagraphs.add(`${picked.sectionIndex}:${picked.paragraphIndex}`);
          bodyMarkdown = nextBody;
          relatedArticleIds = [...new Set([...relatedArticleIds, placement.target])];
          incomingByTarget.set(placement.target, currentIncoming + 1);
          changed = true;
          applied.push({
            source,
            target: placement.target,
            anchor: placement.anchor,
            section: sections[picked.sectionIndex].title ?? "",
          });
        }

        if (!changed) continue;
        changedSourceSlugs.push(row.slug);
        if (options.apply) {
          const nextVersion = Number(row.content_version ?? 1) + 1;
          const snapshot = buildSnapshot(row, sections, bodyMarkdown, relatedArticleIds, nextVersion);
          await tx`
            update public.wiki_articles
            set sections = ${tx.json(sections)},
                body_markdown = ${bodyMarkdown},
                related_article_ids = ${tx.json(relatedArticleIds)},
                content_version = ${nextVersion},
                updated_at = now()
            where id = ${row.id}::uuid
          `;
          await tx`
            insert into public.wiki_article_revisions (
              article_id, revision_number, snapshot, change_note, created_by,
              revision_status, published_at
            ) values (
              ${row.id}::uuid,
              (select coalesce(max(existing.revision_number), 0)::integer + 1
               from public.wiki_article_revisions as existing
               where existing.article_id = ${row.id}::uuid),
              ${tx.json(snapshot)},
              ${`Add natural live inbound links for ${RUN_ID}`},
              null,
              'published',
              now()
            )
          `;
          await syncInlineLinks(tx, row.id, bodyMarkdown, relatedArticleIds);
        }
      }

      const afterIncomingByTarget = Object.fromEntries(targetIds.map((target) => [target, incomingByTarget.get(target) ?? 0]));
      if (options.apply) {
        await tx`
          insert into halleus_private.admin_audit_events (
            actor_user_id, actor_role, action, target_type, target_id,
            before_summary, after_summary, reason, success, request_correlation_id
          ) values (
            null, 'system', 'system.wiki.under3_live_inbound_link_repair',
            'wiki_graph', ${RUN_ID},
            ${tx.json({ incoming: beforeIncomingByTarget })},
            ${tx.json({ incoming: afterIncomingByTarget, applied, skipped })},
            'Add natural live-to-live inbound Wiki links without removing existing links.',
            true,
            ${RUN_ID}
          )
        `;
      }

      return {
        mode: options.apply ? "applied" : "dry-run",
        liveInboundTarget: LIVE_INBOUND_TARGET,
        sources: touchedSources.length,
        targets: targetIds.length,
        appliedCount: applied.length,
        skippedCount: skipped.length,
        changedSourceSlugs,
        beforeIncomingByTarget,
        afterIncomingByTarget,
        applied,
        skipped,
      };
    });

    const discovery = options.apply ? await submitIndexNowBestEffort(result.changedSourceSlugs) : null;
    console.log(JSON.stringify({ ...result, discovery }, null, 2));
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
