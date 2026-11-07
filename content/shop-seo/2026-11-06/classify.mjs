// Pure classifier, frozen with this research snapshot; no network or filesystem writes.
export function classify(r,cfg){
 const k=r.keyword, has=p=>new RegExp(p).test(k);
 for(const [c,ids] of Object.entries(cfg.product))if(ids.split(" ").includes(r.id))return c;
 if(cfg.shop.includes(r.id))return "SHOP";
 for(const [c,ids] of Object.entries(cfg.manual))if(ids.split(" ").includes(r.id))return c;
 if(k.startsWith("متن")&&has("هدیه|کارت|تابلو"))return "B-MESSAGE";
 for(const [c,p] of cfg.filters)if(has(p))return c;
 if(has("فوری|سریع|مجازی|غیر حضوری"))return "R-SERVICE";
 if(has("قزوین|گرگان|مشهد|تهران|اصفهان|شیراز|تبریز|کرج|رشت|یزد|همدان|قم|اهواز|ارومیه|کرمان|بندر|ایران|خارج|امریکا|آمریکا|کانادا|دبی|ترکیه|آلمان|فرانسه|انگلیس|استرالیا|قائمشهر"))return "R-GEO";
 if(has("سایت نجوم|نقشه آسمان|نقشه اسمان|سایت آسمان|شکل آسمان|عکس آسمان شب تولد|آسمان شب تولد")&&!k.includes("تابلو"))return "W-SKY-VIEW";
 if(k.includes("ماه")&&has("تاریخ|روز تولد|روزتولد|روزتولدم|شب تولد|در روز تولد|ماه روز")&&!k.includes("تابلو")){
  if(has("ماه و روز|سال ماه|روز ماه|به میلادی")&&!has("عکس|شکل|تصویر|وضعیت|حالت|فاز"))return "X-CALENDAR-CONVERSION";
  return "W-BIRTH-MOON";
 }
 if(has("^عکس | عکس$|^تصویر ")&&!has("تابلو عکس|عکس دلخواه"))return "R-VISUAL-INSPIRATION";
 if(k.startsWith("متن"))return "B-MESSAGE";
 if(has("بسته بندی تابلو|تزیین تابلو"))return "B-WRAP";
 if(has("آموزش|اموزش|چگونه|چطور|ساخت | ساخت$|درست کردنی|درست کنم|کاردستی|با کاغذ|با گچ|با خمیر|با دستمال|با شانه تخم"))return k.includes("تابلو")&&has("آسمان|اسمان")?"B-SKY-EXPLAIN":"B-DIY";
 if(has("فنگ شویی|فنگشویی"))return "R-SYMBOLISM";
 if(has("نماد چیست|استارمپ چیست"))return "W-ART-EXPLAIN";
 if(k.includes("تابلو")||k.startsWith("پوستر")){
  if(has("شب پر ستاره|شب پرستاره|شبهای پر ستاره|شب ستاره اثر|پر ستاره کجاست|خرید تابلو جیغ|گرنیکا"))return "X-NAVIGATION-ARTWORK";
  if(has("ستاره دریایی|سیخ چوبی|تابلو ماهی$"))return "F-DECOR-ART";
  if(has("صور فلکی|صورت فلکی")&&!has("روز تولد|شب تولد"))return "F-CONSTELLATION-ART";
  if(has("خام|خالی|لوازم|فریم|قاب تابلو"))return "F-PRINT-SUPPLIES";
  if(has("سایز|قطر|یک متری|بزرگ")&&k.includes("ماه"))return "R-ART-SIZE";
  if(has("ریموت|بالبینگ|لایت باکس|چشمک زن|چراغ|لامپ|نور|بک لایت|ال ای دی|نئون|نئونی|ریسه|شب تاب|شب نما|برقی|روشن میشه|هفت رنگ|ماه روشن"))return "F-LIGHT-ART";
  if(has("موزیک|آهنگ|اهنگ|صوت|بارکد|صدا"))return "F-SOUND-ART";
  if(has("تکسچر|برجسته|خمیر|پاپیه|گچی|گچ|میکروسمنت|پتینه|رزین|اکلیلی|سه بعدی|سنگ مصنوعی|سنگی|شاین"))return "F-TEXTURE-ART";
  if(has("فرش|طلا|نقره|خاتم|معرق|منبت|قلم زنی|سوخته نگاری"))return "F-CRAFT-ART";
  if(has("آینه|اینه|آیینه|ساعت"))return "F-MIRROR-CLOCK";
  if(has("ماه تولد|متولدین|فروردین|اردیبهشت|خرداد|تیر |مرداد|شهریور|مهر|آبان|آذر|دی |بهمن|اسفند")&&!has("روز تولد|شب تولد"))return "F-ZODIAC-ART";
  if(has("عکس دلخواه|عکس دار|و عکس|با عکس|سفارشی عکس|سفارشی چهره|تابلو عکس|شاسی مشاهیر|کلاژ|ماهگرد|تولدت مبارک"))return "F-PHOTO-ART";
  if(has("چهره|سیاه قلم|رنگ روغن|خطاطی|خوشنویسی|نستعلیق|نقاشی|کالیگرافی|تابلو خط|تابلو شعر|تابلو نوشته|سفارشی متن"))return "F-TEXT-PORTRAIT";
  if(has("کهکشان.*روز تولد"))return "REVIEW-SKY-GALAXY";
  if(has("ماه"))return "C-MOON";
  if(has("آسمان|اسمان|ستاره|پرستاره|پر ستاره|استارمپ"))return "C-SKY";
  if(has("کهکشان|کهکشانی|فضانورد"))return "C-SPACE";
  if(has("سفارش|سفارشی|دلخواه"))return "C-CUSTOM-ART";
  if(has("بهترین|انواع")&&k.includes("هدیه"))return "B-CHOOSE-ART";
  if(has("هدیه|کادو|سالگرد|عاشقانه|ولنتاین"))return "C-GIFT-ART";
  return "F-DECOR-ART";
 }
 if(has("پک|باکس|جعبه|پاکت|کاغذ کادو|بگ |بسته بندی|تزیین پول|سبد هدیه|پکیج"))return "F-GIFT-SETS";
 const families=[["F-JEWELRY","طلا|نقره|گردنبند|دستبند|سکه|شمش|انگشتر"],["F-PLANTS","گل|گیاه|گلدان|گلدون|درخت|نهال"],["F-FOOD","خوراکی|لواشک|ژله|زعفران|شکلات|اجیل|نمک"],["F-FASHION","عطر|ادکلن|لباس|آرایش|جوراب|چرم|ژیلت|شومیز|کفش|کتونی|کیف|روسری|شال |پوشاک"],["F-TECH-TOYS","گجت|گیم|گوشی|عروسک|اسباب بازی|کرومی|سگ های نگهبان|موبایل|لپ تاپ|کامپیوتر|کنسول|لگو|هدفون"],["F-BOOKS-CULTURE","کتاب|تحریر|خودکار"],["F-HOMEWARE","ظرف|ظروف|لیوان|ماگ|فنجان|ساعت|گوی|ژانومه"],["R-EXPERIENCE","ماساژ|بلیط"]];
 for(const [c,p] of families)if(has(p))return c;
 if(has("کوسن|پازل|لوازم ورزشی|شمع|فندک|فلاسک|قهوه|چوبی|جاکلیدی|جاکارتی|اکسسوری|مجسمه|تندیس|میناکاری|سررسید|(?:^| )مس(?: |$)|ملزومات|لوازم |گیفت|کیسه"))return "F-OTHER-GIFTS";
 if(has("تومان|تومنی|تومانی|هزار|میلیون|ارزان|ارزون|اقتصادی|کم هزینه|قیمت مناسب|گرون|گران|قسطی"))return "B-BUDGET";
 if(has("آشتی|قهر|گرفتن از|نگرفتن|ندادن|نخریدن|پس دادن|دادن همسر|رد کردن|دادن به|گرفتن|قبول کردن")&&!has("چی|چه|خرید|سفارش"))return "R-ETIQUETTE";
 const guide=has("ایده|بهترین|چی |چه |چگونه|چطور|لیست|پیشنهاد|انتخاب|راهنما|اولین دیدار|دیت اول");
 if(has("دست ساز|دستی|ساخت"))return "B-DIY";
 if(has("سالگرد|ماهگرد"))return guide?"B-ANNIVERSARY":"C-ANNIVERSARY";
 if(has("ولنتاین|روز عشق"))return guide?"B-VALENTINE":"C-VALENTINE";
 if(has("روز مادر|روز زن|روز پدر|روز مرد|روز دختر|روز پسر|روز معلم|روز پزشک|یلدا|نوروز|عید|کریسمس|روز حسابدار|روز پرستار|روز داروساز|روز دانش آموز|فارغ التحصیلی|قبولی دانشگاه|جشن اسم|جشن الفبا|جشن آب|جشن شکوفه"))return "R-SEASONAL";
 if(has("سازمانی|تبلیغاتی|مدیریتی|نمایشگاهی|عمده|کارمند|همکار|مدیر|شرکت|اداری"))return "R-CORPORATE";
 if(has("نوزاد|کودک|بچه|نوجوان|ساله|زایمان|باردار|سیسمونی|دانش آموز|تینیجری|کلاس اولی|یک ?سالگی|سه سالگی|حامله"))return "R-KIDS";
 if(has("مهاجرت|خداحافظی|سرباز"))return guide?"B-FAREWELL":"C-KEEPSAKE";
 if(has("شخصی|سفارشی"))return "C-PERSONAL";
 if(has("دوست صمیمی|رفیق|دوست معمولی|دوست اجتماعی"))return guide?"B-FRIEND":"C-FRIEND";
 if(has("همسر|شوهر|پارتنر|نامزد|دوست دختر|دوست پسر|عاشقانه|رمانتیک|عشق|زوج|عروس|داماد|ازدواج|عروسی|عقد"))return guide?"B-PARTNER":"C-PARTNER";
 if(has("تولد"))return guide?"B-BIRTHDAY":"C-BIRTHDAY";
 if(has("خانم|خانوم|زنانه|دختر|خواهر|مادر|(?:^| )زن(?: |$)"))return "R-WOMEN";
 if(has("مرد|آقا|اقا|پسر|پدر|برادر"))return "R-MEN";
 if(has("یادگاری|ماندگار|یادبود"))return guide?"B-KEEPSAKE":"C-KEEPSAKE";
 if(has("هدیه|کادو")){
  if(has("خونه|خانه|چشم روشنی"))return "R-HOUSEWARMING";
  if(has("حضوری"))return "R-SERVICE";
  if(has("استاد|وکیل|پزشک|معلم"))return "R-PROFESSION";
  if(has("دوست"))return "C-FRIEND";
  if(guide)return "B-GIFT-CHOICE";
  return "X-ENTITY-OTHER-INTENT";
 }
 return "REVIEW-UNRESOLVED";
}
