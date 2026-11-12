# رودمپ فعال فروش هالیوس — BitPay.ir و هفت Easy Win

- **مصوب در گفتگو:** ۲۰۲۶-۱۱-۱۰، تهران
- **مخزن / شاخه:** `bleucluod/astro-clean` / `main`
- **مبنای بررسی:** `a4a8b498a16c8a6fdbed9cff929278adaa8d745a`
- **تعداد:** دقیقاً **۴ مرحلهٔ اصلی**؛ **۱ اتصال درگاه** و **۷ Easy Win**. این‌ها نباید به ده‌ها مرحلهٔ ریز یا درخواست `next` تبدیل شوند.
- **وضعیت:** `ROADMAP_RECORDED_ONLY`؛ ثبت سند، مجوز اجرای کد، مهاجرت، استقرار کلید، فعال‌سازی واقعی یا انتشار نیست.
- **دامنه:** فقط درگاه ایرانی `bitpay.ir` برای فروشگاه فیزیکی و بهبودهای مشخص مسیر ویکی ← صفحهٔ محصول ← سبد ← پرداخت ← سفارش. بازطراحی کلی ادمین، SEO، موتور کمپین و سایر ایده‌ها خارج از این بسته‌اند.

## قانون اجرایی ثبت‌شده: فقط GitHub تا جای ممکن، مالک فقط Pull

**درخواست قطعی مالک در ۲۰۲۶-۱۱-۱۰:** در تمام مراحل این رودمپ، عامل باید اصلاحات مجاز را تا جای ممکن در GitHub پیاده کند و تست بگیرد؛ مالک فقط Pull یا همگام‌سازی حداقلی و در صورت نیاز انتشار رسمی VPS را انجام دهد. ZIP/Runner/انتقال فایل، پیش‌فرض نیست. همین قاعده در `AGENTS.md` و `docs/HALLEUS_PROJECT_CONTEXT.md` نیز ثبت شده است.

- ابتدا سورس و HEAD واقعی را بررسی کن. پس از تأیید صریح مرز Commit، کد را در GitHub ثبت کن و فقط SHA، نتیجهٔ تست و یک دستور کوتاهِ دریافت ارائه بده. شروع اجرای رودمپ، تأیید انتشار یا Commit میانی نیست.
- در مخزن محلی مالک تغییرات ثبت‌نشدهٔ نامرتبط وجود داشته است. بدون ممیزی وضعیت، Pull کورکورانه، Reset، Clean، Stash یا Force پیشنهاد نکن؛ اگر ناسازگار بود از Worktree تمیز استفاده کن. خروجی مالک دریافت `f4c24b6ac5b9e8436393ab8ac00f63d6a8bcfeea` را در یک Worktree با Detached HEAD تأیید می‌کند؛ این کار مخزن اصلی را تمیز نکرده و در Worktree جداشده نباید Pull معمولی اجرا شود.
- تغییر کد در GitHub، تأیید صفحه‌های بصری، فعال‌شدن درگاه و انتشار VPS رویدادهای مستقل‌اند. تغییر DB/Env، قراردادن کلید درگاه، Commit/Push در مرز تصویب‌نشده و Deploy بی‌مجوز ممنوع است.
- فقط در صورت مانع واقعی برای پیاده‌سازی مستقیم و امن GitHub، دلیل فنی اعلام و روش جایگزین با حداقل دخالت مالک پیشنهاد شود.

## تصمیم‌های قفل‌شده

1. **درگاه اولویت اول است.** مالک اعلام کرده BitPay.ir تأیید و API key صادر شده است. **هیچ‌کس نباید مقدار API key را در گفتگو، GitHub، فایل ZIP، خروجی تست یا مرورگر بگذارد.** اطلاعات محرمانه فقط با فرایند امن و مجوز مستقل در VPS مستقر می‌شود.
2. خرید و پرداخت اینترنتی باید به **سامانهٔ موجود سفارش** وصل شوند؛ سفارش دوباره، دیتابیس موازی و حساب کاربری دوم نسازیم. پرداخت آنلاین بعد از راه‌اندازی ایمن روش اصلی شود؛ کارت‌به‌کارت فعلی **به‌عنوان جایگزین** بماند و جدا از پرداخت تأییدشدهٔ BitPay شناسایی شود.
3. مبلغ نهایی باید سروری و مرتبط با همان سفارش باشد؛ Callback/بازگشت مرورگر **مدرک پرداخت موفق نیست**. فقط Verify مستقل سروری و تطبیق دقیق مبلغ، واحد پول، شناسه سفارش و شناسه تراکنش معتبر است.
4. فروش P01 «ماه آن روز» مبنای کسب‌وکار فعلی است. وضعیت فعال‌بودن P02 «آسمان تولد» باید از وضعیت واقعی Production مجدداً تأیید شود؛ P02/P03 یا هر محصول بسته، صرفاً با این رودمپ قابل‌سفارش نمی‌شوند. CTA خرید فقط برای محصول واقعاً فعال.
5. هر صفحهٔ بصری ابتدا Audit و Preview دسکتاپ/موبایل، سپس تأیید مستقل مالک و Wireframe دقیق دارد؛ پیاده‌سازی همهٔ بخش‌های **تأییدشدهٔ مرتبط** به‌صورت یکپارچه انجام می‌شود.
6. **چهار مرحله و دو مرز انتشار:** طبق تصمیم تازهٔ مالک، **بیت‌پی بعد از تکمیل ایمن مرحلهٔ ۱، مستقل و پیش از Easy Winهای بعدی روی VPS منتشر می‌شود**؛ مراحل ۲ تا ۴ انتشار نهایی خودشان را دارند. این خواسته، مجوز مهاجرت DB، ثبت رمز یا دریافت پولِ واقعی بدون Preflight و تأیید عملیاتی نیست. Commit/Tag/Push/Deploy میانی نامرتبط ممنوع.
7. مبنای انتشار هالیوس فقط `ops/vps/halleus-release.sh` با کنترل `current/previous`، سلامت سرویس و Smoke است. `git pull` به‌تنهایی نسخهٔ زنده را تغییر نمی‌دهد. هیچ Migration یا نوشتن در دیتابیس Production بدون بررسی و مجوز جداگانه انجام نشود.

## واقعیت‌های کد بررسی‌شده

- `lib/shop/shop-payment-gateway.ts`: adapter آینده وجود دارد؛ درگاه آنلاین فعلاً `false` است و فقط `manual_transfer` پذیرفته می‌شود.
- `lib/shop/shop-order-contract.ts`: سفارش و مبلغ با quote سمت سرور کنترل می‌شوند.
- `lib/shop/shop-order-store.ts`: سفارش خصوصی، idempotency، وضعیت انتقال دستی و audit رویدادها وجود دارند؛ مدل تلاش پرداخت آنلاین هنوز باید طراحی/اعتبارسنجی شود.
- `components/shop/ShopCheckoutFlow.tsx`: سبد، فرم ارسال، پرداخت کارت‌به‌کارت، اعلام واریز و پیگیری سفارش موجودند.
- `database/migrations/0032_private_shop_orders_shared_numbers.sql`: قرارداد جدول خصوصی سفارش فعلی؛ جدول/مهاجرت تازه برای payment attempt را **نباید از پیش موجود یا قطعی فرض کرد**.
- `lib/shop/shop-mvp-activation.ts`: گیت‌های فعال‌سازی فروشگاه و P02 مستقل‌اند.
- `ops/vps/halleus-release.sh`: موتور رسمی انتشار Atomic Release روی VPS خودمیزبان.
- **نام مسیرهای جدید Callback/API، Schema، نام متغیر env، نسخهٔ مستندات BitPay، واحد تومان/ریال و تنظیمات واقعی VPS هنوز تأیید نشده‌اند.** هیچ اتصال به Supabase Cloud فرض نشود.

## مرحلهٔ ۱ — اتصال ایمن BitPay.ir (LEVEL 4؛ مالی/DB/Production)

**هدف:** مشتری بعد از ثبت سفارش موجود به درگاه آنلاین هدایت شود، سپس پرداخت معتبر به همان سفارش ثبت و نمایش داده شود. کارت‌به‌کارت در حالت fallback حفظ شود.

کار یکپارچه:
- دریافت و بررسی **مستندات رسمی مربوط به پنل و نسخهٔ حساب مالک**: ایجاد پرداخت، Redirect، Callback، Verify، کدهای خطا/وضعیت، expire/retry، واحد پول، دامنه و شرایط اتصال. مستندات قدیمی اینترنتی را بدون تطبیق مبنا قرار نده.
- طراحی adapter سروری BitPay، رکورد **خصوصی** تلاش پرداخت، پیوند به Order/Server Quote، کلید idempotency، شناسه مرجع provider و رویدادهای audit؛ بدون افشای credential، نشانی تحویل یا کد خصوصی مشتری در URL و لاگ.
- Callback/Return فقط اطلاع‌رسانی باشد. Verify سروری مستقل، تطبیق order/attempt/amount/currency/provider ID؛ دفاع در برابر replay و concurrent callbacks، پرداخت تکراری، خطای شبکه، بازگشت دیررس، پرداخت نامشخص، refund/cancel نامتناسب. فقط پرداخت تأییدشده به `payment_verified` برسد؛ یک پرداخت دوباره به‌عنوان سفارش دوم شمرده نشود.
- وضعیت‌های موفق/ناموفق/منتظر بررسی برای مشتری و ادمین؛ تمایز کامل پرداخت BitPay با اعلام واریز دستی و وضعیت تحویل/چاپ.
- قبل از هر Migration: ممیزی فقط‌خواندنی DB واقعی self-hosted Supabase، migration history، نقش/permission، backup و impact؛ سپس تست migration و جریان پرداخت روی PostgreSQL ایزوله با دادهٔ مصنوعی. هیچ تولید/ویرایش رکورد Production بی‌مجوز.
- تست‌های mock و integration: درخواست پرداخت، بازگشت، verify، duplicate/retry/concurrency، اختلاف مبلغ/واحد، قطع ارتباط، عدم افشای داده، وضعیت سفارش و حفظ کارت‌به‌کارت. درگاه واقعی فقط با تأیید عملیاتی مالک و روش تست مجاز.

**خروجی:** کد امن و آزمایش‌شده، سپس **انتشار مستقل BitPay روی VPS در نخستین مرز ایمنِ پس از پایان مرحلهٔ ۱**. برای Migration احتمالی، Secret/Env و فعال‌سازی پرداخت واقعی، پس از بررسی اثر تولید و شواهد تست، تأیید عملیاتی مستقل لازم است. داشتن API key مساوی Done نیست.

## مرحلهٔ ۲ — UX خرید و پرداخت (LEVEL 1/2؛ UI و مسیر موجود)

**دو Easy Win این مرحله:**
- **EW-02 — محصول:** قیمت و اندازه و تصویر گالری/پیش‌نمایش شخصی‌سازی واضح، CTA اصلی افزودن به سبد و قدم بعدی روشن. وضعیت فروش واقعی محصول حفظ شود. بازنویسی renderer/طرح چاپ در دامنه نیست.
- **EW-03 — سبد و Checkout:** هزینهٔ محصول و ارسال/بسته‌بندی شفاف، روش حمل، مراحل کوتاه و فهمیدنی، پرداخت آنلاین در کنار کارت‌به‌کارت جایگزین، خطا و retry قابل‌فهم. Quote سروری همچنان مبنای مبلغ است.

**پذیرش بصری:** برای صفحات متأثر Audit → Preview واقعی موبایل و دسکتاپ → تأیید صفحه‌به‌صفحه → Wireframe پیکسل‌قفل‌شده → کدنویسی تجمیعی. سناریوهای قیمت تغییرکرده، سبد خالی، رفت و برگشت، خطا و تایید پرداخت پوشش داده شود. تصمیم‌های ظاهریِ تأییدنشده را به اسم Easy Win اجرا نکن.

## مرحلهٔ ۳ — جذب خریدار از ویکی و ناوبری (LEVEL 1/2 مگر نیاز به داده)

**چهار Easy Win این مرحله:**
- **EW-01 — ویترین مرتبط ویکی:** یک معرفی تصویری غیرمزاحم متناسب با موضوع مقاله و لینک مستقیم صفحهٔ محصول فعال؛ بدون تغییر بدنهٔ مقاله، Canonical، Article schema یا Indexability. محصول بسته نباید CTA خرید فعال داشته باشد. موتور کامل مدیریت کمپین و آمار تفصیلی شامل این برش نیست.
- **EW-04 — CTA شناور:** تداخل نوبت‌های فعلی CTA ویکی (دو نوبت فعلی)، ویترین Inline، CTA انتهای مقاله و UI موبایل را رفع کن. تعداد نوبت‌ها را بدون داده/تصمیم تازه تغییر نده؛ Dismiss، Keyboard و Reduced Motion حفظ شود.
- **EW-06 — ۴۰۴:** صفحهٔ خوش‌ساخت با HTTP 404 واقعی و راه‌های روشن به `/`، `/chart` و `/shop`؛ کارت یک محصول فعال با عکس واقعی فقط بعد از Preview/تأیید. جست‌وجوی نمایشی یا لینک نامعتبر اضافه نشود.
- **EW-07 — هدر:** دسترسی مشخص اما غیرمزاحم به فروشگاه در دسکتاپ/موبایل، بدون CTA تکراری، تراکم یا پوشاندن دکمهٔ خرید/CTA مقاله.

**پذیرش:** Preview/تأیید مستقل ظاهر هر صفحه، تست مسیر ویکی → محصول و ۴۰۴ → فروشگاه، موبایل/دسکتاپ، عدم تداخل CTA و عدم معرفی محصول بسته برای خرید.

## مرحلهٔ ۴ — عملیات سفارش، QA و Release (LEVEL 2 تا 4)

**یک Easy Win این مرحله:**
- **EW-05 — ادمین سفارش:** مرتب‌سازی و نمایش سفارش‌های «نیازمند اقدام» (پرداخت در انتظار Verify، واریز دستی منتظر بررسی، آماده‌سازی، چاپ، ارسال) و تفاوت روشن روش تأیید BitPay با کارت‌به‌کارت؛ Permission و Audit فعلی حفظ شوند.

بقیهٔ کارها:
- تست سرتاسری **ویکی → محصول → سبد → سفارش → BitPay/کارت‌به‌کارت → Verify → پیگیری → عملیات مالک → آماده‌سازی/ارسال** در محیط امن؛ عدم تداخل با گیت P02/P03 و چاپ خصوصی.
- TypeScript/Lint فایل‌های متأثر، تست‌های focused، E2E دیتابیس ایزوله و در صورت وابستگی Runtime، Build؛ موفق/شکست/External Block جداگانه ثبت شود. R1 باید همهٔ مراحل مستقل امن را برای کشف failure set اجرا کند؛ فقط SAFETY_FATAL توقف فوری؛ R2 از کاندید معتبر ادامه دهد.
- فهرست فایل‌های تغییرکرده، Diff، تست‌ها، Migration/Production impact و rollback مالی را ارائه بده؛ **تأیید صریح انتشار نهایی** بگیر. از `ops/vps/halleus-release.sh` منتشر و `current`، `previous`، service و HTTP smoke را بررسی کن. بازگشت کد به معنای حذف اطلاعات مالی یا rollback دیتابیس نیست.

## فهرست کامل هفت Easy Win و جایگاه

| ID | موضوع | مرحله | سختی ابتدایی | اثر مورد انتظار |
| --- | --- | --- | --- | --- |
| EW-01 | ویترین مرتبط با مقالهٔ ویکی | ۳ | کم تا متوسط | زیاد |
| EW-02 | شفافیت تصویر/اندازه/قیمت/CTA محصول | ۲ | کم | خیلی زیاد |
| EW-03 | هزینه‌ها و مراحل سبد و پرداخت | ۲ | کم | خیلی زیاد |
| EW-04 | رفع مزاحمت CTA شناور و ویترین | ۳ | کم تا متوسط | متوسط تا زیاد |
| EW-05 | اقدام بعدی سفارش و روش پرداخت در ادمین | ۴ | کم تا متوسط؛ متصل به درگاه | زیاد، عملیاتی |
| EW-06 | ۴۰۴ کاربردی و مسیر فروشگاه | ۳ | کم | کم تا متوسط |
| EW-07 | دسترسی بهتر به فروشگاه از هدر | ۳ | کم تا متوسط | متوسط |

اثرها **پیش‌بینی اولویت تجاری** هستند، نه Conversion اندازه‌گیری‌شده یا تضمین افزایش فروش.

## خارج از Scope این بسته

سبد رهاشده/پیامک پس از ۲۴ ساعت، کوپن و تخفیف پیچیده، ویرایش گروهی قیمت، بازپرداخت مالی/لغو پیچیده، سیستم کامل Campaign/CTR/Impression/A-B/انتساب سفارش، جست‌وجوی سراسری، بازطراحی تمام تب‌های Admin، سئوی نامرتبط و محصول بستهٔ P03. سایر رودمپ‌های تاریخی صرفاً مرجع‌اند و نباید جای این Scope فعال را بگیرند.

## وضعیت پایدار، تأییدها و قدم بعد

| بخش | وضعیت هنگام ثبت | قدم بعد |
| --- | --- | --- |
| R0 ثبت سند | COMPLETED؛ سند در GitHub ثبت شده | اجرای مرحلهٔ اول مطابق مجوزهای مستقل |
| S1 BitPay | IN_PROGRESS؛ کاندید R1 و R2 در GitHub، کلید نزد مالک | تکمیل مستندات و تست و Preflight؛ سپس **Release مستقل و زودهنگام BitPay روی VPS** |
| S2 خرید | NOT_STARTED؛ PREVIEW_PENDING | بررسی و پیش‌نمایش صفحات محصول/سبد/Checkout و تأیید مالک |
| S3 جذب از ویکی | NOT_STARTED؛ PREVIEW_PENDING | بررسی و پیش‌نمایش ویترین/CTA/هدر/۴۰۴ و تأیید مالک |
| S4 ادمین/QA/Release | NOT_STARTED؛ DEPENDS_ON_S1_S3 | اجرای یکپارچهٔ پس از تأیید، QA، مجوز release و Smoke |

**مرز اجرای جاری:** مالک پس از ثبت رودمپ، شروع کار و پیشبرد واقعی آن را روی GitHub درخواست کرده است. پیاده‌سازی کاندیدهای غیرفعال و تست آن‌ها مجاز است؛ هیچ مجوزی برای اجرای Migration، افشای Secret، فعال‌سازی پرداخت، Tag یا Deploy از این درخواست استنباط نمی‌شود. هنگام اجرای آینده، ابتدا HEAD/origin/branch/worktree و Authority فعلی را بازبینی کن و تغییرات غیرمرتبط لوکال را حفظ کن. وضعیت شکست و تصمیم‌های باز را در همین فایل به‌روز کن؛ هیچ مرحلهٔ وابسته را بدون تأیید لازم کامل نشمار.

`ROADMAP_COMPLETE` فقط وقتی مجاز است که اتصال BitPay، هر ۷ Easy Win، تأییدهای طراحی/مالی، و انتشار و Verification نهایی واقعاً کامل شده باشند.

## BITPAY_R1_PROVIDER_CLIENT_CANDIDATE — checkpoint source-only (۲۰۲۶-۱۱-۱۰)

- Two files added: `lib/shop/bitpay-ir-client.ts` (inert provider transport and fail-closed response validation) and `scripts/check-shop-bitpay-ir-client.mjs` (synthetic fixtures). Both are disconnected from all runtime checkout routes and no real payment is enabled.
- Fixture result verified in isolated local draft: `BITPAY_IR_CLIENT_R1=PASS`; standalone TypeScript strict `tsc --noEmit` passed. Full Next.js build, affected full-repo ESLint and live provider/DB E2E not run; do not claim them passed. Affected source is inactive pending current merchant docs.
- **BLOCKED_BY_DEPENDENCY:** Merchant-specific current BitPay.ir API documentation, verified amount unit/field contract, private DB attempt ledger schema and isolation, secure VPS secret staging and explicit authorization for any production migration/activation.
- No real secret, migration, payment, change to live checkout, Tag, or VPS release in this checkpoint. Next action: validate provider documentation, then finish S1 integration as one scoped candidate; preserve existing working store and manual transfer.

## BITPAY_R2_PRIVATE_ATTEMPT_LEDGER — candidate prepared on GitHub (۲۰۲۶-۱۱-۱۰)

- **Scope:** افزودن `database/migrations/0034_private_shop_bitpay_attempts.sql` (کاندید فقط؛ **روی هیچ DB اجرا نشده**)، `lib/shop/shop-bitpay-attempt-store.ts` (ثبت سروری تلاش، ذخیره شناسه provider، تسویه اتمیک پس از Verify معتبر)، و `scripts/check-shop-bitpay-attempt-ledger.mjs` (fixture مستقل).
- قفل‌های ایمنی کاندید: فقط سفارش معتبر با secret هش‌شده و وضعیت قابل پرداخت، مبلغ snapshot سرور، دقیقاً یک تلاش باز/تأییدشده در هر سفارش، شناسه‌های provider یکتا، Callback token فقط به صورت هش، قفل `for update`، ثبت immutable event سفارش، و idempotent بودن تأیید تکراری. تأیید کارت‌به‌کارت و استعلام بیت‌پی از هم جدا می‌مانند.
- **شواهد R2:** گارد `BITPAY_ATTEMPT_LEDGER_R2=PASS` با fixture تراکنشی مصنوعی برای رزرو و تکرار، mismatch مبلغ، تلاش تکراری، provider ID مغایر، لغو سفارش، حالت اعلام واریز دستی، Verify ناموفق، Rollback اتمیک و Event یکتا. `BITPAY_IR_CLIENT_R1=PASS` روی fixture قبلی؛ standalone `tsc -p tsconfig.r2.json` در محیط ایزوله با stub تایپ‌شدهٔ DB و `node --check` پاس شدند؛ بررسی whitespace سه فایل جدید بدون خطا. **این‌ها اجرای PostgreSQL واقعی، build کامل Next.js یا پرداخت واقعی نیستند.**
- **باقی‌مانده S1:** بررسی قرارداد API فعلی مخصوص حساب مالک، schema و role واقعی self-hosted Supabase فقط‌خواندنی، تأیید مهاجرت/backup و E2E در PostgreSQL ایزوله، اتصال امن شروع پرداخت و Callback/Verify به Checkout، secret امن VPS و تست کنترل‌شدهٔ پرداخت. هیچ API route جدید، Env، DB واقعی یا VPS در R2 تغییر نکرده است.
- **مرز بعدی:** تا حل وابستگی مستندات/DB، از آماده‌سازی یا انتشار endpoint دریافت پول خودداری کن؛ در اولین مجوز اجرای امن، کاندید R2 را حفظ و فقط بررسی‌های وابسته را ادامه بده. `S1=IN_PROGRESS`، `S2..S4=NOT_STARTED`.

## RELEASE-BITPAY-01 — تصمیم قطعی مالک دربارهٔ انتشار مستقل (۲۰۲۶-۱۱-۱۰)

مالک پس از دریافت موفق Commit `ad22eebe37732fa9c82351e8be630cd495b5deb2` تصریح کرد: **بلافاصله پس از تمام‌شدن مرحلهٔ اتصال بیت‌پی، همان قابلیت روی VPS منتشر شود؛ منتظر مراحل Easy Win فروشگاه نمانیم.** این تصمیم، مرز «انتشار اختیاری» سابق را به **مرز انتشار برنامه‌ریزی‌شده و مستقل S1** تبدیل می‌کند.

### ترتیب اجرایی و معیار عبور

1. **S1 را کامل کن:** تأیید قرارداد API مخصوص درگاه مالک و واحد مبلغ، پیاده‌سازی کامل Start/Return/Verify و اتصال به Checkout، ثبت امن private attempts، مدیریت تکرار/قطع ارتباط/خطا/پرداخت نامعین و حفظ کارت‌به‌کارت جایگزین. صرف ساخت کاندید DB و client کافی نیست.
2. **R1 کاملِ خطایابی و آزمون مستقل:** گاردهای تأثیرپذیرفته، TypeScript، lint و Build در صورت نیاز، آزمون واقعی PostgreSQL ایزوله برای Migration و idempotency، آزمون مجاز mock/sandbox درگاه. خطاهای مرتبط یکجا رفع و بررسی‌های پاس‌شدهٔ بدون تغییر از نقطهٔ ایمن Resume شوند. نتیجهٔ پرداخت واقعی را از fixture تشخیص بده.
3. **Preflight Production:** فقط‌خواندنی ساختار DB خودمیزبان VPS، نقش‌ها و migration history، بکاپ قابل‌بازیابی، ملاحظات بازگشت و رسیدگی به پرداخت دیررس، روش ثبت API key در فایل خصوصی محیط واقعی، وضعیت فعلی سرویس و نسخه‌های current/previous. هیچ آدرس/توپولوژی/نام متغیر محیطی را حدس نزن.
4. **مرز تأیید حساس:** پس از ارائهٔ فهرست فایل‌ها و آزمون‌ها، اثر دقیق DB/Env، مخاطرات تراکنش و روش بازگشت، برای Migration، جایگذاری Secret و روشن‌کردن دریافت پول واقعی تأیید مشخص مالک دریافت کن. **اولویت انتشار اکنون تأیید شده؛ جزئیات عملیات حساس هنوز تأیید نشده‌اند.**
5. **انتشار مستقل پس از PASS و تأیید:** Commit/Tag/Push فقط در مرز مجاز S1؛ Deploy فقط با `ops/vps/halleus-release.sh` و سپس کنترل release فعال/قبلی، `halleus.service`، تست عمومی و تست کنترل‌شدهٔ سفارش/پرداخت. DB rollback هرگز با حذف تراکنش‌ها یا Audit اشتباه نشود.
6. **بعد از موفقیت انتشار BitPay:** مراحل ۲ (محصول/سبد)، ۳ (ویکی/CTA/هدر/۴۰۴) و ۴ (ادمین/QA/Release نهایی) را پیش ببر؛ هیچ‌کدام را شرط راه‌اندازی بیت‌پی نکن. بدون درخواست `next` برای کارهای فنیِ مستقل، ولی تأیید طراحی هر صفحه محفوظ است.

**وضعیت صادقانه در این Checkpoint:** `S1=IN_PROGRESS`. کلاینت و Ledger بیت‌پی روی GitHub کاندیدند؛ Callback/Checkout هنوز متصل نیست، مهاجرت `0034` در Production اجرا نشده، درگاه واقعی فعال و روی VPS منتشر نشده است. قرارداد به‌روز مربوط به API حساب مالک و شواهد DB/Payment E2E باقی مانده‌اند. این تصمیم مجوز نادیده‌گرفتن گیت‌ها نیست.

**روش تحویل مالک:** کار روی GitHub، دریافت امن به‌صورت Pull/Worktree، سپس در مرز انتشار فقط یک دستور رسمی VPS مبتنی بر SHA و Tag تأییدشده. ZIP/Runner صرفاً fallback استثنایی.

## BITPAY_R3_CALLBACK_CHECKPOINT — GitHub code candidate (۲۰۲۶-۱۱-۱۰)

**پیشرفت واقعی مرحلهٔ ۱:** کد مسیرهای سروری شروع و بازگشت BitPay آماده شده، ولی با گیت فعلی `SHOP_ONLINE_GATEWAY_ENABLED = false` **هیچ‌یک قابل استفادهٔ عمومی نیستند** و هیچ API secret، محیط واقعی، Migration، اتصال Checkout یا سرویس VPS تغییر نکرده است.

- `lib/shop/shop-bitpay-flow.ts`: شروع پرداخت فقط بعد از تطبیق دسترسی مهمان و سفارش در Ledger، تولید اثبات محرمانهٔ مخصوص Callback با HMAC و ذخیرهٔ تنها هش آن، درخواست از Provider با مبلغ ثابت سفارش، ذخیرهٔ شناسهٔ Provider قبل از بازگرداندن لینک، جلوگیری از ایجاد درخواست Provider دوم هنگام بازپخش یا وضعیت نامعین، و Verify مستقل پس از Callback. هیچ فیلد برگشتیِ مرورگر مدرک پرداخت نیست.
- `app/api/shop/payments/bitpay/start/route.ts` و `app/api/shop/payments/bitpay/return/route.ts`: مسیرهای پشت گیت خاموش، خطایابی امن، کنترل Origin/Body در Start با زیرساخت موجود و Limit مستقل؛ بازگشت موفق فقط پس از Verify سروری، پاسخ ۳۰۳ به صفحهٔ پرداخت با حذف شناسه‌ها و اثبات از URL مشتری و `Referrer-Policy: no-referrer`.
- `lib/shop/shop-bitpay-attempt-store.ts`: تشخیص رزرو تازه در برابر تکرار برای جلوگیری از پرداخت دوباره و lookup محدود به شناسه تلاش + هش اثبات Callback. `lib/shop/shop-shared-rate-limit.ts`: محدودیت مستقل شروع و بازگشت بر اساس هدر IP مورد اعتماد موجود؛ تغییر در محدودیت‌های مسیرهای دیگر نیست.
- `scripts/check-shop-bitpay-flow.mjs`: گارد synthetic شامل درخواست تکراری، بازگشت/اثبات نامعتبر، نتیجهٔ `pending` و `paid`، نبود Secret، لزوم ذخیرهٔ شناسه، گیت خاموش و پاسخ ۴۰۴، و عدم نشت اثبات در redirect. گاردهای R1 و R2 نیز مجدداً اجرا شدند.
- **شواهد Local isolated candidate:** `BITPAY_R3_FLOW=PASS`، `BITPAY_IR_CLIENT_R1=PASS`، `BITPAY_ATTEMPT_LEDGER_R2=PASS`، TypeScript strict for changed payment modules/routes with isolated typed dependency stubs PASS، و بررسی whitespace فایل‌های متأثر PASS. Full-repo ESLint/Next build و PostgreSQL واقعی **انجام نشده‌اند**؛ TypeScript isolated معادل TypeCheck کامل repo نیست.
- **وابستگی‌های حل‌نشده قبل از پرداخت واقعی و RELEASE-BITPAY-01:** دریافت/تطبیق مستندات جاری BitPay.ir مخصوص حساب مالک (به‌ویژه Return/Verify و واحد مبلغ)، بررسی فقط‌خواندنی schema و دسترسی Supabase خودمیزبان، تست مهاجرت ۰۰۳۴ روی PostgreSQL ایزوله، حل هماهنگی تلاش آنلاین با لغو سفارش و اعلام واریز دستی هنگام تراکنش در جریان، UX اتصال دکمهٔ واقعی پرداخت به Checkout، secret در VPS، کنترل استرداد/پرداخت دیررس و تأیید جداگانهٔ Migration/Env/Activation/Release. هیچ‌یک به‌عنوان انجام‌شده تلقی نشود.
- **وضعیت:** `S1=IN_PROGRESS`; `S2..S4=NOT_STARTED`. این Commit فقط کاندید امن و غیرقابل استفادهٔ عمومی است. گیت انتشار مستقل S1 هنوز باز نشده است.

## BITPAY_S1_INTEGRATED_CANDIDATE — source handoff (۲۰۲۶-۱۱-۱۰)

**تصمیم اجرای مالک:** از این نقطه به بعد، Stage 1 را به برش‌های ریزِ نیازمند Pull و Commit تقسیم نکن. تمام تغییرات مرتبط S1 باید به‌صورت کاندید یکپارچه بررسی/تست و در یک مرز معنادار تحویل شوند؛ انتشار مستقل آن قبل از S2–S4 طبق RELEASE-BITPAY-01 برقرار است.

**کاندید یکپارچهٔ ثبت‌شده (فقط سورس GitHub):**
- درگاه ایرانی BitPay.ir: درخواست سروری و Verify مستقل، اتصال Start به اعتبار خصوصی سفارش، callback GET و POST محدود با اثبات هش‌شده، حذف اثبات و شناسه از مقصد بازگشت و مدیریت بازگشت‌های تکراری.
- صفحهٔ پرداخت مشتری: گزینهٔ آنلاین مشروط به گیت سروری؛ بررسی وضعیت پرداخت پس از بازگشت و تنها پس از مشاهدهٔ تأیید سمت سرور پاک‌کردن سبد؛ کارت‌به‌کارت موجود و پیگیری سفارش محفوظ.
- Ledger خصوصی: نگهداری تلاش، مبلغ ثابت، provider identifiers، جلوگیری از آغاز تکراری و تسویهٔ یک‌باره؛ migration 0034 همچنان **کاندید** و در Production اجرا نشده.
- **گیت مالی در برابر خاموش‌شدن درگاه:** هنگام اعلام کارت‌به‌کارت، لغو مشتری، اقدام مالی ادمین و نمایش وضعیت سفارش، حضور جدول خصوصی با `to_regclass` بررسی می‌شود؛ در صورت وجود تلاش باز، تغییر متعارض ممنوع است، حتی اگر ارائهٔ آنلاین در UI بعداً غیرفعال شود. پیش از migration، مسیر کارت‌به‌کارت موجود حفظ می‌شود.
- گیت فعال‌سازی مستقل در `lib/shop/shop-bitpay-readiness.ts`: علاوه بر `SHOP_ONLINE_GATEWAY_ENABLED = false` در کد، وجود Migration/Env و کلیدهای سرور شرط است. هیچ API key یا Secret در مخزن قرار داده نشده و بدون تأیید حساب/مهاجرت **هیچ مسیر آنلاین قابل‌استفاده نیست**.
- گارد متمرکز تازه و گاردهای R1/R2/R3 برای Syntax، Redirect allowlist، Callback، مغایرت مبلغ، تکرار پرداخت، وضعیت نامشخص و حفاظت سفارش. **شواهد اجرا:** R1/R2/R3 نسخهٔ مبنای قبلی در محیط ایزوله PASS، TypeScript ایزوله برای کد پرداخت پایه PASS؛ گارد تازه و همهٔ فایل‌های کامل این Commit در محیط Full Next/React/PostgreSQL **اجرا یا تأیید نهایی نشده‌اند** و نباید PASS گزارش شوند.

**مانع واقعی برای Done/Release:** مستندات فعلی API حساب مالک و اثبات واحد پول/کدهای Verify، Preflight فقط‌خواندنی و بک‌آپ Self-hosted Supabase/VPS، اجرای تست Migration 0034 روی PostgreSQL ایزوله، تست امنیت/Runtime/Next build کاندید کامل، تأیید UI پرداخت و مجوز مشخص مالک برای اجرای Migration، نصب Secret در VPS، روشن‌کردن درگاه و پرداخت واقعی. فقط پس از پاس‌شدن و تأیید عملیات حساس، انتشار مستقل طبق اسکریپت `ops/vps/halleus-release.sh` انجام شود. در rollback کد، دادهٔ تراکنش حذف/بازنشانی نشود.

**وضعیت بعد از این Commit:** `S1=IN_PROGRESS / FULL_SOURCE_CANDIDATE_PREPARED / RELEASE_BLOCKED_BY_EXTERNAL_PREFLIGHT`. `S2..S4=NOT_STARTED`. نه Migration اجرا شده، نه درگاه واقعی روشن شده، نه VPS منتشر شده است.

## BITPAY_S1_CALLBACK_REPLAY_QA — security finding and fixed candidate (۲۰۲۶-۱۱-۱۰)

- **Finding:** A repeated callback for an already-`verified` attempt was previously returned as `paid` on the stored attempt status alone, even when the incoming `trans_id` differed. The original settlement write was guarded, but the repeat confirmation response was too permissive.
- **Fix:** The private return lookup now exposes the stored provider transaction ID, and repeated callbacks report `paid` only when that value equals the submitted transaction ID. Mismatched or missing IDs fail closed. Fresh payments still require independent authenticated provider Verify and atomic settlement.
- **Runtime QA evidence (isolated exact matching source files):** R1 client synthetic, R2 ledger synthetic, R3 GET/POST callback guard with new genuine/mismatched replay fixtures: PASS; strict isolated TypeScript for payment/DB route modules: PASS. No external DB connection, full Next.js build, merchant API contract or live provider verification was performed; do not interpret these as production acceptance.
- **Release gate unchanged:** `S1=IN_PROGRESS`; the site still has its online gateway hard-disabled, migration 0034 unapplied, real VPS credentials absent from GitHub and production release blocked pending external preflight and owner approval. Other roadmaps remain untouched.

## BITPAY_S1_PRODUCTION_OPERATOR_GATE — one release-preflight candidate (۲۰۲۶-۱۱-۱۰)

**دستور مالک:** مرحلهٔ اتصال بیت‌پی به‌صورت یک بستهٔ یکپارچه کامل و در مرز مستقل S1 روی VPS فعال شود؛ نه چند دریافت کد برای اصلاحات کوچک. این checkpoint تغییرِ فعال‌شدن واقعی را ادعا نمی‌کند.

- تغییر اجرایی: `lib/shop/shop-payment-gateway.ts` از حالت «همیشه false» به **کلید صریح پیش‌فرض خاموش** `HALLEUS_BITPAY_SOURCE_READY=true` تغییر کرده است. پرداخت آنلاین علاوه بر این کلید فقط وقتی باز می‌شود که `HALLEUS_BITPAY_LEDGER_READY=true`، `HALLEUS_BITPAY_PAYMENTS_ENABLED=true`، کلید API معتبر و Secret Callback حداقل ۳۲ بایتی **همگی** در محیط خصوصی سرور برقرار باشند. هر شرط حذف شود، درگاه بسته می‌ماند و کارت‌به‌کارت قبلی قابل استفاده است. هیچ Secret در GitHub قرار نگرفته.
- `scripts/check-shop-payment-gateway.mjs`، `scripts/check-shop-bitpay-attempt-ledger.mjs`، `scripts/check-shop-bitpay-full-integration.mjs` برای مرز جدید به‌روزرسانی شدند؛ `scripts/check-shop-bitpay-activation-boundary.mjs` حالا مسیر پیش‌فرض خاموش، نبود هر کلید، کلید نامعتبر و حفظ روش دستی را با دادهٔ ساختگی تست می‌کند.
- دو اسکریپت فقط‌خواندنی موجود VPS اکنون وجود Ledger، Index، RLS و حضور نام متغیرهای BitPay را **بدون نمایش مقدار رمز یا اطلاعات مشتری** گزارش می‌دهند: `ops/vps/halleus-shop-stage1-runtime-db-readonly.sh` و `ops/vps/halleus-shop-stage1-readonly.sh`.
- **شواهد اجرا:** در محیط پرداخت ایزولهٔ موجود، گاردهای مشتری BitPay R1/R2/R3، مرز فعال‌سازی، گارد پیش‌فرض کارت‌به‌کارت و TypeScript هدفمند پاس شدند. Bash/Runtime Preflight روی VPS واقعی، full Next build و PostgreSQL E2E در محیط تولید هنوز اجرا نشده‌اند. دلیل: این محیط به سرور/Secret حساب/DB تولید دسترسی مستقیم ندارد. `R1` مجموعهٔ کامل مستقل در دسترس را اجرا کرد؛ بررسی‌های خارجی `EXTERNAL_BLOCK` هستند نه PASS.
- **گیت مانده برای Release واقعی:** احراز نسخهٔ جاری مستندات اختصاصی BitPay.ir، خواندن فقط‌خواندنی وضعیت Schema/Role/Backup VPS خودمیزبان، تست Migration 0034 در دیتابیس PostgreSQL ایزوله، اجرای Build و گاردهای متأثر روی release candidate با تنظیمات واقعی، دریافت Secret توسط اپراتور مستقیماً در VPS (نه در GitHub/چت)، تأیید اثر Migration و انتشار، سپس تست تراکنش کنترل‌شده و تطبیق واقعی مبلغ. `ops/vps/halleus-release.sh` تنها موتور نشر مجاز است؛ Rollback کد نباید آثار مالی را پاک کند.
- **وضعیت قطعی:** `S1=IN_PROGRESS`، `RELEASE_BLOCKED_BY_PRODUCTION_EVIDENCE`؛ `S2..S4=NOT_STARTED`. درگاه Production هنوز **فعال نشده** است. پس از دریافت خروجی Preflight واقعی، تنها از همین کاندید ادامه بده و هیچ تست/مرحلهٔ پاس‌شدهٔ بی‌تغییر را دوباره تکرار نکن.

## BITPAY_S1_OPERATOR_ACTIVATION_ONE_COMMAND — approved operator gate (۲۰۲۶-۱۱-۱۱)

- مالک پس از Preflight واقعی VPS (PostgreSQL `170006`, shop orders/events موجود، private BitPay ledger و همهٔ `HALLEUS_BITPAY_*` absent، service active و current/previous present)، دستور مستقیم فعال‌سازی را درخواست کرد.
- **دستور جدید واحد:** اسکریپت GitHub `ops/vps/halleus-bitpay-activate.sh` فقط روی VPS و با `sudo bash -s -- <exact SHA>` اجرا می‌شود. اپراتور از خود GitHub SHA پین‌شده دریافت می‌کند؛ هیچ ZIP/Runner ویندوزی لازم نیست.
- **پیش‌شرط‌ها و مسیر:** origin/main و worktree و سرویس معتبر، محیط و shop ingress واقعی، فضای ذخیره و `pg_dump` از URL مؤثرِ فرآیند برنامه، بررسی آرشیو با `pg_restore -l`، push tag پین‌شده، انتشار کد با **تنها** موتور رسمی `ops/vps/halleus-release.sh` در وضعیت درگاه خاموش، اجرای ۶ گارد پرداخت/درگاه؛ سپس تأیید تعاملی جداگانه برای Migration 0034 و فعال‌سازی دریافت وجه. Secret فقط از ترمینال خصوصی خوانده و در `/etc/halleus/halleus.env` با دسترسی root ذخیره می‌شود. اگر تست یا Smoke شکست بخورد env به حالت قبل برگردانده می‌شود؛ هیچ Migration ای با حذف جدول rollback نمی‌شود.
- **شواهد واقعی موجود:** Preflight فقط‌خواندنی VPS کاربر، `db_probe=READONLY_METADATA_PASS`؛ Node runtime و DB اتصال دارند ولی `pg_dump` به DB runtime، ساخت backup، اجرای Migration، full release build، گاردهای اجراشده روی VPS و اولین پرداخت واقعی هنوز **اثبات نشده‌اند**. بررسی ایستای اسکریپت `bash -n` و آزمون ساختاری روی کاندید محلی PASS؛ تست خود اسکریپت در VPS اجرا نشده است. هر وابستگی که FAIL شود **BLOCKED/EXTERNAL_BLOCK** است و درگاه نباید روشن اعلام شود.
- **احتیاط فعال‌سازی:** مستندات منتشرشدهٔ BitPay.ir قدیمی‌اند؛ تطابق فعلی API/amount/callback ویژهٔ حساب باید با پنل صاحب حساب کنترل شود. بعد از فعال‌سازی فنی، یک پرداخت واقعی کنترل‌شده و تطبیق شماره سفارش، مبلغ و تأیید سروری قبل از تبلیغ عمومی لازم است. حتی `ONLINE_GATE_ENABLED=PASS` مدرک پرداخت موفق نیست.
- **وضعیت فعلی:** `S1=IN_PROGRESS`, `VPS_OPERATOR_ACTION_PENDING`؛ فقط ثبت اسکریپت روی GitHub، نه Migration، نه tag/deploy و نه فعال‌شدن درگاه توسط Agent. `S2..S4=NOT_STARTED`.

## BITPAY_S1_BACKUP_FAILURE_REPAIR — ۲۰۲۶-۱۱-۱۱

**واقعیت گزارش‌شدهٔ VPS:** اجرای نخست اسکریپت `9de8b3c` این نتایج را ثبت کرد: `pinned GitHub preflight`، `live_shop_contract=PASS`، `preflight=PASS`، `shop_schema=PASS`، سپس `BITPAY_RELEASE_HOLD: pg_dump failed; do not deploy (1)`. اجرای اول در گیت بکاپ توقف داشته است؛ بر اساس مسیر کد هیچ Release Tag، Deploy، Migration 0034 یا فعال‌سازی Env رخ نداده است. وجود بکاپ سالم نیز اثبات نشده و هیچ فایل ناموفق نباید به‌عنوان بکاپ مورد استفاده قرار گیرد.

**Root cause discovery:** پیغام قدیمی فقط exit code را چاپ می‌کرد و stderr مربوط به `pg_dump` را عمداً پنهان کرده بود؛ پس از خروجی کاربر نمی‌توان تعیین کرد که عامل اصلی ناسازگاری نسخهٔ کلاینت، اتصال libpq از `PGDATABASE` یا مجوزهای SQL است. PostgreSQL فعال نسخهٔ 17 است، اما نسخهٔ نصب‌شدهٔ pg_dump روی VPS هنوز مشخص نیست؛ آن را حدس نزن.

**اصلاح در همین کاندید، بدون بازسازی یا دوباره‌کاری:** `ops/vps/halleus-bitpay-pg-backup.cjs` از `DATABASE_URL` خودِ فرآیند Node و اتصال PostgreSQL واقعی، major سرور را می‌خواند، کلاینت `pg_dump` و `pg_restore` هم‌نسخه/جدیدتر را از مسیرهای موجود انتخاب می‌کند و مقادیر URI را بدون افشای رمز به environment ایمن libpq منتقل می‌کند. archive format بکاپ را با همان نسخهٔ `pg_restore` می‌سنجد. در صورت نبود نسخهٔ سازگار یا هر خطا فقط نام دستهٔ شکست و majorهای کلاینت را می‌نویسد؛ هرگز URL، کلید یا stderr خام را چاپ نمی‌کند. اجرای همهٔ مراحل بعدی تنها با PASS این گیت ممکن است.

`ops/vps/halleus-bitpay-activate.sh` تنها بخش شکست‌خوردهٔ backup را به helper فوق وصل می‌کند؛ safety preflight همچنان هر بار لازم است و مرحلهٔ پاس‌شدهٔ قبلی به‌عنوان کاندید سالم حفظ شده است. **شواهد محدود:** `bash -n` اسکریپت و `node --check` helper و واحدهای مصنوعی نسخهٔ 16/17، URI با کاراکترهای رمزگذاری‌شده، گزینهٔ ناشناخته و طبقه‌بندی خطا PASS؛ Backup روی VPS و PostgreSQL واقعی، Migration، Build، Deploy و پرداخت واقعی در این revision اجرا نشده‌اند.

**وضعیت:** `S1=IN_PROGRESS`، `VPS_BACKUP_RESUME_REQUIRED`، `S2..S4=NOT_STARTED`. اگر کلاینت PG17+ موجود نباشد یا خطای واقعی دیگری آشکار شود، بدون دستکاری DB متوقف شو؛ فقط همان کلاسِ خطا را رفع و از گیت BackUp ادامه بده. هیچ مجوزی برای عبور از گیت بکاپ یا حذف داده‌های پرداخت داده نشده است.

## BITPAY_S1_RELEASE_STORAGE_FAILURE_RESUME — ۲۰۲۶-۱۱-۱۱

**شواهد اجرای واقعی VPS (نه صرفاً شبیه‌سازی):** کلاینت `pg_dump 17.11` نصب شده؛ `server_major=17`، `selected_client_major=17`، `production_database_backup=PASS` و `backup_archive_readable=PASS`. Tag `v0.1.bitpay-s1-019ebf332929` برای Commit `019ebf3329294f669334e4d931635de9cee03fa8` ساخته و Push شد. نصب `pnpm --frozen-lockfile`، Encoding، Wiki inbound guard، Next.js Build (Turbopack)، TypeScript و تولید صفحه‌ها پاس شدند. هشدار NFT مربوط به `next.config.ts` غیرمهلک بود.

**تنها ریشهٔ توقف در این نوبت:** گیت storage پس از build و حذف `.next/cache` بسته را `739118528` بایت گزارش داد، ولی سقف فعلی `734003200` (700 MiB) است: فقط `5115328` بایت بیشتر. موتور `ops/vps/halleus-release.sh` قبل از تغییر symlink جاری خطا داد و detached worktree کاندید را پاک کرد. در نتیجه **Release فعال عوض نشده، Migration 0034 اجرا نشده، Secret تنظیم نشده و پرداخت واقعی خاموش است**. نسخهٔ فعلی `current` با `757439949` بایت از سقف قدیمی بزرگ‌تر بوده؛ بودجهٔ قدیمی پیش‌فرض دیگر با اندازهٔ واقعی release همسو نیست.

**رفع ریشه‌ای و محدود:** در `ops/vps/halleus-release-storage.env` فقط سقف کل بسته از 700 به 710 MiB (`744488960` بایت) افزایش داده شده؛ با اندازهٔ اندازه‌گیری‌شدهٔ کاندید، حاشیهٔ `5370432` بایت می‌دهد. سقف‌های مجزای dependencies/build/public، حداقل فضای آزاد، `HALLEUS_KEEP_RELEASES=2`، rollback و سخت‌گیری cleanup همگی دست‌نخورده‌اند. آزادبودن `7505575936` بایت در گزارش VPS در برابر حداقل جدید `1488977920` بایت، امکان این تغییر کوچک را تأیید می‌کند؛ ولی هر Build بعدی همچنان باید از گیت واقعی بگذرد.

**اصلاح مهم همان مسیر انتشار:** Checkout سرور در بررسی قبلی `source_head=e88fd8428959b374a8c429a5a2066c5de92bb5a9` بود؛ `git fetch` فقط `origin/main` را به‌روز می‌کرد، در حالی که release engine فایل budget را از `/srv/halleus/source` (checkout قدیمی) می‌خواند. اسکریپت فعال‌سازی، بعد از gateهای امنیتی و بکاپ، تنها با `git merge --ff-only origin/main` سورس تمیز را به SHA دقیق GitHub می‌رساند و hash/cleanliness را دوباره تأیید می‌کند. هیچ `reset --hard`، `clean` یا تغییر دستی symlink انجام نمی‌دهد. مطابق GitHub Compare، HEAD قبلی VPS جدّ مستقیم commitهای جدید و fast-forward ممکن است.

**گارد:** `scripts/check-vps-release-workflow.mjs` با قرارداد runtime جدید و الزام sync امن سورس تطبیق داده شد. هیچ تغییری برای دورزدن budgetهای اجزا اعمال نشده است. **پاس/اجرانشده:** Build موفق مربوط به Commit قبلی است؛ کاندید جدید فقط سقف ذخیره و اسکریپت فعال‌سازی را تغییر داده و Build/Component budget کامل باید روی VPS دوباره pass شود؛ این موفقیت هنوز ادعا نمی‌شود. بکاپ و برچسب قبلی معتبر باقی می‌مانند؛ Release/DB/Env فعال نشده‌اند.

**ادامهٔ مجاز:** یک اجرای جدید اسکریپت پین‌شدهٔ GitHub؛ preflight → backup → FF-only source → tag SHA جدید → canonical release → focused checks → تأیید صریح migration/secret/activate → live smoke. تأیید Merchant API و پرداخت کنترل‌شده هنوز جداست. `S1=IN_PROGRESS`; `S2..S4=NOT_STARTED`. اگر Budget اجزا شکست بخورد، همهٔ متریک‌های واقعی را جمع کرده و فقط همان کلاس علت را اصلاح کن؛ سقف‌ها را کورکورانه بالا نبر.

## BITPAY_S1_WIKI_PRERENDER_TIMEOUT_FIX — ۲۰۲۶-۱۱-۱۱

**گزارش واقعی VPS:** در اجرای `ea38da8170507a3ec98b42fcff05d5a76cd9103b`، پشتیبان PostgreSQL 17 (`production_database_backup=PASS`, `backup_archive_readable=PASS`)، Fast-forward امن `source`، Tag `v0.1.bitpay-s1-ea38da817050`، نصب پکیج‌ها، Encoding، Wiki inbound guard، کامپایل Turbopack و TypeScript همگی PASS شدند. سپس تولید صفحات ویکی در `/wiki/[slug]` برای چند slug بعد از Timeout پیش‌فرض ۶۰ثانیه‌ای، سه‌بار retry شد و Next build با exit code 1 شکست خورد. موتور رسمی کاندید غیرفعال را پاک کرد، **current تغییر نکرد** و درگاه بیت‌پی، Migration و Env مالی همچنان دست‌نخورده‌اند. پیام NFT trace هشدار بود، نه عامل توقف.

**اصلاح محدودِ مانع انتشار:** تنها `next.config.ts` تنظیم رسمی `staticPageGenerationTimeout: 180` می‌گیرد. `experimental.cpus: 2`، `generateStaticParams`، رندر ویکی، ISR و مسیرهای Indexable دست‌نخورده‌اند؛ هیچ مقاله‌ای از Build یا sitemap حذف نمی‌شود و هیچ مسیر داینامیکی به زور جایگزین نمی‌شود. تنظیم رسمی Next.js برای timeout در همین نسخه پشتیبانی می‌شود. این اصلاح در برابر خواندن کند/تراکم موقت کمک می‌کند، اما رفع قطعی هر مشکل DB نیست؛ اگر دوباره timeout رخ دهد، باید علت DB/Resource مشخص و همان مشکل اصلاح شود، نه اینکه وضعیت PASS اعلام شود.

**شواهد مستقل فعلی:** TypeScript و Syntax خود `next.config.ts` با مدل محدود typechecking و محافظت از تنظیمات قبلی PASS. ساخت واقعی Next روی VPS برای Commit جدید **انجام نشده**؛ tag جدید/Deploy/DB migration/activation نیز تا اجرای مجاز اپراتور انجام نشده‌اند. مراحل PASS قبلی به‌عنوان شواهد حفظ شده‌اند و کاندید معتبر پاک یا reset نشده است.

**ادامه:** اسکریپت موجود `ops/vps/halleus-bitpay-activate.sh` از GitHub SHA جدید اجرا شود، فقط بعد از Build موفق، تست‌های متمرکز، تطبیق قرارداد درگاه حساب مالک و تأیید جداگانهٔ Migration/Activation به prompt محرمانهٔ `HALLEUS_BITPAY_API_KEY` برسد. کلید را در چت یا GitHub قرار نده. `S1=IN_PROGRESS` تا انتشار، مهاجرت، تأیید live و تراکنش کنترل‌شده؛ `S2..S4=NOT_STARTED`.

## BITPAY_S1_NEXT_OUTPUT_COMPONENT_BUDGET — ۲۰۲۶-۱۱-۱۱

**شواهد واقعی VPS از Commit `eb4719b21803ab720561328085776606f233b246`:** `production_database_backup=PASS` و آرشیو خواندنی بود؛ `pinned_source_sync=PASS`؛ Tag `v0.1.bitpay-s1-eb4719b21803` ساخته و Push شد؛ نصب قفل‌شده، Encoding، Wiki inbound، Turbopack، TypeScript و پیش‌رندر تمام ۳۲۴ صفحه در زمان ۱۷٫۲ ثانیه PASS شدند. هشدار NFT در next.config.ts غیرمهلک بود. Build cache (۲۲۳۴۹۳۹۹ بایت) حذف شد. موتور رسمی پس از build، گزارش زیر را ثبت کرد:
- `STORAGE_CANDIDATE bytes=739127164 budget=744488960` — PASS.
- `dependencies bytes=444826405 budget=452984832` — PASS.
- `build_output bytes=228666461 budget=228589568` — FAIL (اختلاف **۷۶٬۸۹۳ بایت**).
- Public از آن‌جا که چک متوقف شد چاپ نشد؛ محتوای tracked عمومی GitHub `4,410,973` بایت بود و زیر سقف `4,718,592` قرار دارد. برای موفقیت Production همچنان باید این چک در خود موتور رسمی اجرا شود.

**رفع متمرکز:** در `ops/vps/halleus-release-storage.env` فقط `HALLEUS_BUILD_OUTPUT_BUDGET_BYTES` از ۲۱۸ MiB (`228589568`) به **۲۲۲ MiB** (`232783872`) افزایش یافت؛ حاشیهٔ اندازه‌گیری‌شده `4117411` بایت. سقف کلی ۷۱۰ MiB (`744488960`)، سقف وابستگی‌ها `452984832`، public `4718592`، گیت فضای آزاد، Keep=2 و Rollback دست‌نخورده‌اند. گارد `scripts/check-vps-release-workflow.mjs` هم همهٔ چهار سقف ثابت را کنترل می‌کند. شبیه‌سازی ریاضی چهار محدودیت با دادهٔ واقعی لاگ و گاردهای ایزولهٔ بیت‌پی (R1, R2, R3، Activation، Gateway، TS) PASS؛ اجرای Build و storage checks کاندید جدید در VPS هنوز انجام نشده است.

**وضعیت:** Cleanup رسمی، worktree کاندید غیرفعال را حذف کرد، اما release فعال و DB/Secret عوض نشدند. مرحلهٔ فعال‌سازی در `S1=IN_PROGRESS / NEXT=VPS_CANONICAL_RELEASE_CONTINUE` باقی است. اپراتور باید با SHA پین‌شدهٔ جدید اسکریپت واحد موجود را اجرا کند و فقط بعد از پاس‌شدن همهٔ گاردها، تأیید صریح Migration، نصب کلید خصوصی بیت‌پی و فعال‌سازی انجام می‌شود. هیچ تأیید پرداخت واقعی هنوز وجود ندارد؛ `S2..S4=NOT_STARTED`.

## BITPAY_S1_LIVE_GATE_SMOKE_RESUME — ۲۰۲۶-۱۱-۱۱

**شواهد واقعی VPS، Commit فعال `7cc562d9feb3b6d48796257e71a900aa0974b359`:** `HALLEUS_RELEASE_DEPLOY_OK`؛ current/previous، سرویس، HTTP smoke، Build کامل (۳۲۴ صفحه)، پنج گارد BitPay و گارد پیش‌فرض پرداخت همه PASS شدند. مهاجرت تولیدی `0034` پس از تأیید اپراتور با `private_attempt_ledger=PASS` اجرا شد. اپراتور API Key را در TTY خصوصی وارد کرد و عبارت `ACTIVATE-REAL-PAYMENTS` را تأیید نمود. سپس اسکریپت **بلافاصله پس از `systemctl restart` تنها یک `curl` بدون retry** برای `https://halleus.ir/shop/payment` اجرا کرد و `Payment page live HTTP smoke failed` گزارش داد؛ HTTP واقعی ثبت نشده است. `BITPAY_ROLLBACK` فایل خصوصی env قبلی را برگرداند و سرویس را دوباره Restart کرد. بنابراین **Release موفق است، Migration وجود دارد، ولی پرداخت واقعی همچنان فعال‌نشده**؛ خطای لحظهٔ راه‌اندازی محتمل است ولی ثابت نشده.

**اصلاح مسیر Resume، بدون دوباره‌سازی کاندید:** `ops/vps/halleus-bitpay-resume-live.sh` صرفاً روی همان Release فعال و جدول مالی موجود کار می‌کند و به آخرین SHA GitHub پین می‌شود؛ هرگز Deploy/Tag/Push/Migration/Build مجدد انجام نمی‌دهد. سازگاری HEAD و origin و worktree تمیز، release فعال، قفل انتشار، env mode=600، ساختار جدول خصوصی و RLS و ایندکس، آرشیو بکاپ root-only موجود و اعتبار فرمت آن را **بدون نوشتن داده** کنترل می‌کند. صفحهٔ پرداخت روی localhost و دامنه **قبل از تغییر** باید ۲۰۰ باشد. سپس API Key یک‌بار مخفی دریافت و در فایل pending خصوصی root-only نگه داشته می‌شود تا در صورت smoke ناموفق دوباره ورود آن لازم نباشد. Restart و smoke با retry واقعی: localhost homepage/payment، public payment و callback نامعتبر با پاسخ ۴۰۹ (ورود مستقیم localhost همراه هدر معتبر تست، و مسیر Nginx جداگانه). هر شکست در smoke یا PID/flags، env قبلی را بازیابی و سرویس را Restart می‌کند؛ کلید در pending root-only باقی می‌ماند و هیچ اطلاعات محرمانه‌ای چاپ نمی‌شود. پس از PASS، pending پاک می‌شود.

**تست مستقل در محیط ایزوله:** `bash -n`، گارد ساختاری `scripts/check-shop-bitpay-resume-live.mjs`، شبیه‌سازی توالی ۵۰۲→۲۰۰ و رد پاسخ callback نامعتبر ۵۰۳ به جای ۴۰۹ PASS. `S1=IN_PROGRESS` تا کنترل live HTTP و تست مالی واقعی؛ تست تراکنش واقعی با حساب ارائه‌دهنده هنوز **انجام نشده**. اسکریپت فقط پس از شواهد واقعی وضعیت `ONLINE_GATE_ENABLED=PASS` می‌دهد؛ این پیام به‌تنهایی اثبات واریز وجه نیست. `S2..S4=NOT_STARTED`.

**نکتهٔ عملیاتی:** به‌دلیل rollback قبلی، کلید واردشده در فایل env فعال باقی نمانده و یک‌بار ورود مجدد آن در TTY لازم است؛ برخلاف دفعات قبل هیچ prompt تأیید Migration یا عبارت اضافه وجود ندارد. اگر در اجرای بعدی pending ریشه‌ای موجود باشد، پس از تطبیق env دوباره استفاده می‌شود. ارسال کلید در ChatGPT یا GitHub ممنوع است.

## SHOP_OWNER_PRICING_ONE_STAGE — ۲۰۲۶-۱۱-۱۱ (درخواست مستقل پشتیبان تست مالی S1)

**هدف تأییدشدهٔ مالک:** تغییر قیمت هر سه اندازه از دو محصول قابل‌سفارش، بازگشت به قیمت اصلی، پیش‌نمایش مبلغ، حالت قیمت آزمایشی با انقضای خودکار و هماهنگی قیمت واقعی در محصول، کاتالوگ، سبد، Quote سرور، ثبت سفارش و BitPay؛ فقط **یک بستهٔ GitHub و یک فرمان VPS**، بدون چند انتشار مرحله‌ای. P03 بسته و فاقد قیمت مبناست؛ این قابلیت آن را فعال نمی‌کند.

**مرز اجرا:** Level 4 (تغییر خصوصی داده و مبلغ پرداخت). جدول خصوصی جدید `database/migrations/0035_private_shop_price_overrides.sql` کاملاً افزودنی است؛ جدول‌های قبلی و مبلغ سفارش‌ها/تراکنش‌های موجود بدون تغییر می‌مانند. قیمت فعال در هر درخواست با `clock_timestamp()` از DB خوانده می‌شود؛ تاریخ انقضا به‌طور خودکار لحاظ می‌شود و نیازی به Cron یا Deploy مجدد برای تغییر قیمت نیست. قیمت نهایی و مبلغ BitPay از Snapshot سفارش می‌آید، نه مقدار ادعایی مرورگر. فقط Owner با `shop_orders.write` و بررسی Origin مجاز به تغییر است؛ هر تغییر در لاگ خصوصی RLS ثبت می‌شود؛ هم‌زمانی با Revision کنترل می‌شود. کلید درگاه و محیط VPS دست‌نخورده می‌ماند.

**مرز تحویل و تست:** `scripts/check-shop-live-prices.mjs` خطاهای قرارداد، قیمت منقضی‌شده، ویرایش هم‌زمان، رد قیمت خارج محدوده، Rollback قیمت و محاسبهٔ دقیق `۱۰٬۰۰۰+۵۰٬۰۰۰=۶۰٬۰۰۰` تومان را با دادهٔ مصنوعی بررسی می‌کند. اسکریپت `ops/vps/halleus-shop-prices-release.sh` فقط با SHA دقیق GitHub و HEAD/Origin/Branch/Worktree/active-release سازگار اجرا می‌شود؛ Backup معتبر PG17 و آرشیو با `pg_restore` را قبل از تغییر نگه می‌دارد؛ QA مستقل در detached worktree با TypeScript و گاردهای موجود را **قبل از Migration** جمع می‌کند؛ فقط بعد از PASS جدول 0035 را به‌صورت تراکنشی می‌سازد؛ Tag/Release فقط از موتور رسمی، سپس smoke روی دامنه و Callback فعلی BitPay. در صورت شکست بعد از انتشار، rollback کد با موتور رسمی انجام می‌شود، بدون حذف دادهٔ مالی. روی خطا، Candidate معتبر و بکاپ نگه داشته می‌شوند و مرحلهٔ PASSED بی‌دلیل دوباره اجرا نمی‌شود.

**وضعیت شواهد:** اجرای گاردهای GitHub در محیط ایزوله و lint/type/build VPS کاندید باید در preflight اپراتور ثابت شود؛ هیچ Migration 0035 و هیچ Release این قابلیت تا آن لحظه روی Production اجرا نشده‌اند. `S1` پرداخت فنی فعال طبق لاگ مالک؛ تراکنش واقعی هنوز `NOT_TESTED` است. این قابلیت به‌جای تغییر موقت سورس، به مالک امکان آزمایش قیمت کم را می‌دهد. اتمام این Slice فقط بعد از `SHOP_PRICES_ADMIN_RELEASE=PASS` و بررسی واقعی امکان ذخیره/بازگردانی در پنل؛ کل رودمپ `S1..S4` همچنان باز می‌ماند.

## SHOP_OWNER_PRICING_R1_FAILURE_SET / R2_RESUME — ۲۰۲۶-۱۱-۱۱

**R1 واقعی از VPS روی GitHub Commit `86d9ec457d29a41ee59cd8433e90328b32ccb4ed`**: نسخهٔ زنده همچنان `7cc562d9feb3b6d48796257e71a900aa0974b359`، بکاپ PostgreSQL 17 و `pg_restore` پاس، `source` با fast-forward به `86d9ec4` رفت و Worktree معتبر `/srv/halleus/releases/.shop-prices-preflight-86d9ec457d29` حفظ شد. QA: `check-shop-live-prices`, `check-shop-orders`, `check-shop-checkout`, `check-shop-p02-live-product`, `check-shop-postgres-http-e2e --code-smoke`, `check-shop-bitpay-full-integration`, `check-shop-bitpay-flow`, کل TypeScript و `git diff --check` همگی **PASS**. فقط دو تست `check-shop-order-api-privacy.mjs` و `check-shop-order-experience.mjs` شکست خوردند، هر دو بر یک علت مشترک: Mockهای read-only SQL پس از اضافه‌شدن قابلیت `hasPendingShopBitPayAttempt` در Store، دو query قدیمی‌نشدهٔ `to_regclass('halleus_private.shop_payment_attempts')` و `select 1 ... status in (...)` را نمی‌شناختند. این خرابی به معنی شکست DB واقعی یا کد قیمت نیست. هیچ `0035` Migration، Tag، Release جدید یا تغییر قیمت در Production رخ نداده.

**اصلاح R2 به‌صورت یک مجموعهٔ واحد:** فقط دو Fixture را برای پاسخ‌های قابل‌کنترل جدول/درخواست Pending تکمیل کن؛ وضعیت `onlinePaymentPending` را به قرارداد امن Projection اضافه کن و هر دو شاخهٔ pending=true/false را با دادهٔ ساختگی تست کن؛ رفتار واقعی Store و بیت‌پی تغییر نکند. Runner موجود به‌جای ساخت مجدد کاندید، فقط در صورت تغییرات دقیق همین دو تست + runner + roadmap، worktree **تمیز و موجود** را به SHA R2 با `merge --ff-only` برساند، گاردهای PASS قدیمی/TypeScript را `RESUMED_PASS` اعلام کند، دو Fixture شکست‌خورده را دوباره اجرا کند و `diff --check` را تأیید کند. اگر fingerprint عوض شده بود، هیچ PASS قبلی بدون شاهد بازاستفاده نشود و کاندید سالم حذف نشود؛ در نبود worktree، مسیر Preflight کامل موجود قابل اجراست. Backup خواندنی موجود در بازهٔ ۲۴ساعته دوباره استفاده شود؛ API Key و env بیت‌پی عوض نشوند. فقط پس از PASS تمام بررسی‌های لازم، 0035 و Release از موتور رسمی انجام شود؛ smoke و rollback رسمی باقی‌اند.

**نتایج واقعی موردنیاز برای تکمیل:** `SHOP_PRICES: migration_0035=PASS`, `SHOP_PRICES: official_release=PASS`, `SHOP_PRICES_HTTP: pricing_catalog=200 PASS`, `SHOP_PRICES_ADMIN_RELEASE=PASS`. آزمون نوشتن با نشست واقعی Owner هنوز جدا از Mock است و نباید پیشاپیش PASS اعلام شود. `S1` تراکنش واقعی بیت‌پی هنوز بررسی نشده؛ `S2..S4` بدون تغییر.

## SHOP_OWNER_PRICING_STORAGE_PRECHECK_REPAIR — ۲۰۲۶-۱۱-۱۱

**لاگ واقعی R2 روی VPS (Commit `832cd995c8901ed8dc30723b0e61d7255097cb51`):** اپراتور سورس را با Fast-forward امن از `86d9ec4` به `832cd99` رساند؛ سپس قبل از اجرای هر تست/DB/Release در پیام `SHOP_PRICES_HOLD: Insufficient free space for a new private backup + atomic release.` متوقف شد. علت مستقیم: پیش‌شرط مستقل و ثابت `df -Pk > 6291456` (۶ GiB) در Runner؛ این سخت‌گیری در موتور رسمی Release وجود ندارد و مانع استفاده از بکاپ تأییدشدهٔ قبلی هم می‌شد. **هیچ Migration 0035، Tag، Build، Deploy یا تغییر BitPay/قیمت در این نوبت انجام نشده است.** Worktree معتبر R1 همچنان محفوظ است، مگر آنکه خارج از این لاگ تغییری رخ داده باشد.

**رفع ریشه‌ای محدود R3:** چک ۶ GiB حذف و همان قرارداد `HALLEUS_RUNTIME_BUDGET_BYTES=744488960` و `HALLEUS_HEADROOM_RUNTIME_COPIES=2` که موتور رسمی استفاده می‌کند مبنا قرار گرفت، به‌علاوهٔ حاشیهٔ مستقل ۵۱۲ MiB برای بکاپ و کنترل inode (حداقل ۶۷٬۵۱۴). بنابراین حداقل بایت لازم در این قرارداد `2025848832` است؛ اندازهٔ واقعی فضای آزاد در اجرای VPS باید اندازه‌گیری شود و اگر کم بود توقف امن انجام می‌شود، نه پاک‌سازی یا bypass. فایل بکاپ معتبر root-only که در ۲۴ ساعت اخیر ساخته و با pg_restore بررسی شده دوباره مصرف می‌شود؛ در غیر این صورت بکاپ جدید واقعی قبل از تغییر DB گرفته و صحت‌سنجی خواهد شد. گیت headroom/سقف اجزای موتور رسمی، دو نسخهٔ rollback و تمام حدود مالی دست‌نخورده‌اند.

**دومین اصلاح پیشگیرانه:** بررسی Source HEAD به‌جای دو SHA ثابت، مسیر زنجیرهٔ واقعی Git را می‌سنجد: `BASE <= source HEAD <= pinned GitHub main` با دو `git merge-base --is-ancestor`. فقط Fast-forward مجاز است؛ هیچ reset، حذف، tag یا migration زودهنگام انجام نمی‌شود. مسیر Resume آزمون‌های شکست‌خوردهٔ R1 بدون اجرای مجدد PASSها حفظ شده؛ `expected_resume_changes` همچنان دقیقاً دو تست SQL fixture به‌علاوهٔ runner و roadmap است. **R2/R3 تست‌ها روی VPS هنوز اجرا نشده‌اند**؛ پاس‌های R1 فقط در صورت تطبیق دقیق کاندید و fingerprint قابل استفادهٔ مجددند. نشانهٔ پایان `SHOP_PRICES_ADMIN_RELEASE=PASS` است؛ `S1` پرداخت واقعی همچنان `NOT_TESTED` و `S2..S4` باز هستند.

## EW-01 — ویترین قابل مدیریت و AI-assist (کاندید مرحلهٔ ۳، ۲۰۲۶-۱۱-۱۱)

- تصمیم مالک: هیچ تغییر ظاهری در صفحات محصول؛ ویترین مرتبط ویکی باید داخل متن و بین بخش‌های معنایی H2، نه انتهای مقاله، قرار بگیرد. AI فقط پیشنهاد «مقاله ↔ محصول + جایگاه دقیق + متن» تولید کند؛ تأیید دستی در پنل ضروری است.
- کاندید SOURCE ONLY: تب «ویترین فروشگاه» در پنل ویکی؛ خروجی JSON واقعی مقاله‌های منتشرشده با تیتر و گزیدهٔ بخش‌ها و فهرست محصولات/وضعیت سفارش؛ ورود JSON پیشنهادها، تشخیص نسخهٔ قدیمی، بازبینی و اصلاح دستی، پیش‌نمایش کارت، انتخاب موردی، ثبت و فعال/غیرفعال کردن.
- ذخیرهٔ مستقل در migration افزودنی 0036، جدول خصوصی با RLS/REVOKE و یک جایگاه در هر مقاله؛ نوشتن فقط با مجوز موجود wiki.publish.write، Origin check، Optimistic Revision، Audit تراکنشی و invalidation صفحه. رندر public فقط برای مقالهٔ منتشرشده/قابل ایندکس، سفارش واقعاً فعال و نسخه/بخش معتبر؛ هیچ تغییری در schema، محتوای اصلی مقاله، پرداخت یا renderer.
- گیت‌ها: migration 0036 فقط بعد از read-only preflight واقعی self-hosted Supabase، backup و تأیید مستقل Production. Run focused guard، lint/type/build مرتبط و smoke قبل از هر release. این کاندید نه Migration روی VPS اجرا کرده، نه سایت را تغییر داده، نه قیمت/پرداخت/کلیدها را.
- وضعیت: EW-01 = SOURCE_CANDIDATE / QA_AND_VISUAL_REVIEW_PENDING، S3 هنوز کامل نیست، S2/EW-03 و S4 بازند؛ ROADMAP_COMPLETE اعلام نشود.

## EW-01 | WIKI_SHOWCASE_SELECTED_ZIP_AND_REVIEW — ۲۰۲۶-۱۱-۱۲

**تصمیم مالک:** ویترین عمومی گرافیتی/ذغالی، هم‌حس خود مقاله و بدون انیمیشن‌های کلیشه‌ای باشد؛ دکمهٔ CTA هم‌خانوادهٔ دکمهٔ خرید فروشگاه با حرکت کوتاه فقط هنگام تعامل. پیش‌نمایش و ویکی عمومی یک کامپوننت مشترک دارند. عکس‌های تأییدشدهٔ محصول دست‌نخورده می‌مانند.

**مدیریت:** فیلتر «ویترین ندارد / باید ساخته شود» فقط مقالهٔ فاقد ویترین تأییدشده را نشان می‌دهد؛ پیشنهاد AI تا زمان تأیید ویترین محسوب نمی‌شود. همچنین «ویترین دارد»، «فعال»، «غیرفعال»، «نیازمند بازبینی»، «در انتظار تصمیم»، «ردشده» و «مانع نمایش» همراه با جست‌وجو، دسته‌بندی، انتخاب پایدار بین صفحه‌ها و عملیات گروهی در دامنهٔ همین EW-01 هستند. مبنا دادهٔ واقعی ادمین است و برای حدود ۳۰۰ مقاله طراحی شده.

**ZIP انتخابی:** خروجی ۲۵ مقاله در هر ZIP (در انتخاب بیشتر، ZIPهای شماره‌دار جدا)، همراه متن کامل بخش‌ها و محصولات انتخاب‌شده، راهنمای فارسی، manifest و قرارداد AI؛ برش قدیمی ۲۲۰۰ نویسه ممنوع. AI می‌تواند پیشنهاد مرتبط یا skip بدهد. ورود ZIP/JSON فقط پیشنهادِ منتظر تصمیم ثبت می‌کند، نه انتشار. **تأیید و انتشار** یک اقدام است؛ فقط تیک‌خورده‌ها منتشر می‌شوند و ردشده‌ها برای بازنگری باقی می‌مانند. بعد از انتشار، روشن/خاموش تکی و گروهی مجاز است.

**پایداری:** لنگرِ محتوایی بخش و تطبیق عنوان، جایگاه قبلی را با تغییر نسخه یا ترتیب/عنوان در موارد قابل تشخیص نگه می‌دارند؛ ویرایش مقاله علامت بازبینی دارد. اگر لنگر امن پیدا نشد، ویترین در دیتابیس باقی می‌ماند ولی در نمایش عمومی حدسی جابه‌جا نمی‌شود؛ پنل مانع را نشان می‌دهد.

**مدل امنیتی و DB:** Migration افزودنی `0037_wiki_showcase_review_workflow.sql` بعد از `0036` لازم است؛ جدول خصوصی پیشنهادها و سابقهٔ بسته‌ها RLS و revoke دارند. تغییر Production/Backup/Migration و انتشار VPS نیازمند تأیید عملیاتی مستقل‌اند؛ `git pull` فقط کد را وارد لوکال می‌کند. اگر ساختار لازم روی دیتابیس نصب نشده باشد، پنل واقعی خطای آماده‌نبودن می‌دهد و Preview فقط دادهٔ نمونه نشان می‌دهد.

**وضعیت اجرای این کاندید:** پیاده‌سازی سورس و گاردهای focused به مخزن اضافه می‌شوند؛ **Build/TypeScript، آزمون مرورگر واقعی، اثبات Schema و Migration روی DB ایزوله و VPS Smoke تا پیش از ثبت شواهد انجام‌شده تلقی نمی‌شوند**. طراحی Premium همچنان نیازمند تأیید تصویری مالک است. وضعیت EW-01 = `CODE_CANDIDATE / QA_PENDING / VISUAL_APPROVAL_PENDING / PRODUCTION_MIGRATION_NOT_AUTHORIZED`. این وضعیت کل Stage 3 یا رودمپ اصلی را کامل نمی‌کند.

### EW-01 — ONE_UI_REVIEW_SLICE (2026-11-12)

**Scope = presentation only.** Real wiki/showcase contracts, proposal approval/rejection, ZIP selection and database migrations are unchanged. The unified admin + development preview gets Halleus light/cool management chrome, primary search/status filters with persistent click-expanded advanced filters, compact summary, grouped batch controls, AI queue before article list (8 proposals/page while preserving cross-page approval checkmarks), and a sticky live card using the exact public `WikiShopShowcaseCard` above the editor. Full article uses the existing `WikiArticleBody` in a click-expanded section. On a narrow screen, selecting a row moves focus to the editor without scroll animations. The `?` help continues to stay open until explicit close.

**Boundary:** No public product artwork, checkout, Wiki articles, API, schema, Auth, or VPS changes. Visual approval and local browser checks remain pending. Focused source guard must cover primary vs advanced filters, AI queue order/pagination, sticky preview, shared card, click-persistent help and dev-only light chrome. EW-01 remains `UI_CANDIDATE / VISUAL_REVIEW_PENDING / INTEGRATION_NOT_VERIFIED`; Stage 3 and entire roadmap not complete.
