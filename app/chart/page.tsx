import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ChartForm } from "@/components/ChartForm";
import { buildPublicPageMetadata } from "@/lib/config/seo";

import styles from "./chart-shell.module.css";

export const dynamic = "force-static";
export const revalidate = false;

const chartDescription =
  "چارت تولد رایگان فارسی خودت را با تاریخ شمسی، ساعت و شهر تولد بساز و رایزینگ، نشان ماه، خانه‌ها، جنبه‌ها و تفسیر شخصی را آنلاین ببین.";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "چارت تولد رایگان فارسی با تفسیر | هالیوس",
  description: chartDescription,
  canonical: "/chart",
  image: {
    url: "/halleus-chart-wheel-sample-polished-centered.webp",
    width: 1254,
    height: 1254,
    alt: "نمونه چارت تولد فارسی هالیوس با نمایش سیاره‌ها، خانه‌ها، رایزینگ و جنبه‌های اصلی",
  },
});

const chartStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://halleus.ir/chart#webpage",
      url: "https://halleus.ir/chart",
      name: "چارت تولد رایگان فارسی با تفسیر",
      description: chartDescription,
      inLanguage: "fa-IR",
      primaryImageOfPage: {
        "@id": "https://halleus.ir/chart#primaryimage",
      },
    },
    {
      "@type": "ImageObject",
      "@id": "https://halleus.ir/chart#primaryimage",
      url: "https://halleus.ir/halleus-chart-wheel-sample-polished-centered.webp",
      width: 1254,
      height: 1254,
      caption: "نمونه ناشناس‌شده از چارت تولد فارسی هالیوس",
    },
    {
      "@type": "WebApplication",
      "@id": "https://halleus.ir/chart#application",
      name: "چارت تولد هالیوس",
      url: "https://halleus.ir/chart",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      inLanguage: "fa-IR",
    },
  ],
};

export default function ChartPage() {
  return (
    <div
      className={styles.page}
      data-chart-seo-landing="transactional-birth-chart"
      data-editorial-source="gsc-mizfa-reviewed-20260911"
    >
      <section className={styles.hero} aria-labelledby="chart-page-title">
        <div className={styles.heroAtmosphere} aria-hidden="true">
          <span className={styles.heroOrbitOuter} />
          <span className={styles.heroOrbitInner} />
          <span className={styles.heroStarA}>✦</span>
          <span className={styles.heroStarB}>✧</span>
        </div>

        <div className={styles.heroCopy}>
          <span className={styles.heroKicker}>ساخت آنلاین نقشه تولد شخصی</span>

          <h1 className={styles.heroTitle} id="chart-page-title">
            چارت تولد رایگان فارسی
          </h1>

          <p className={styles.heroLead}>
            تاریخ، ساعت و شهر تولدت را وارد کن تا چارت تولد شخصی تو محاسبه شود. هالیوس جایگاه خورشید، ماه، سیاره‌ها، رایزینگ، خانه‌ها و جنبه‌های اصلی را روی چرخ چارت نشان می‌دهد و نتیجه را به زبان فارسی توضیح می‌دهد.
          </p>
          <p className={styles.heroLead}>
            ساخت نسخهٔ پایه رایگان است. اگر ساعت دقیق تولدت را ندانی هم می‌توانی ادامه بدهی؛ فقط بخش‌هایی که به زمان دقیق وابسته‌اند، مانند رایزینگ و خانه‌ها، با محدودیت روشن نمایش داده می‌شوند.
          </p>

          <div className={styles.heroActions}>
            <Link
              className={`${styles.heroPrimary} ${styles.discoveryPrimary}`}
              href="#chart-birth-data-form"
            >
              ساخت چارت تولد رایگان
              <span aria-hidden="true">↓</span>
            </Link>
            <Link className={styles.heroSecondary} href="#chart-report-details">
              داخل گزارش چه می‌بینم؟
            </Link>
          </div>

          <div className={styles.heroTrustRow}>
            <span>تاریخ شمسی یا میلادی</span>
            <span>محاسبه با ساعت و شهر تولد</span>
            <span>گزارش پایهٔ رایگان</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroPlanet}>
            <Image
              alt=""
              height={1400}
              priority
              src="/halleus-logo/symbol-transparent-white.png"
              width={1400}
            />
            <span className={styles.heroPlanetRing} />
          </div>
        </div>
      </section>

      <section className={styles.workspace} aria-labelledby="birth-data-heading">
        <div className={styles.formPanel}>
          <div className={styles.formPanelHeading}>
            <span className={styles.sectionEyebrow}>محاسبه چارت تولد</span>
            <h2 id="birth-data-heading">ساخت چارت تولد آنلاین با تاریخ شمسی</h2>
            <p>
              نام، تاریخ تولد، ساعت تولد و شهر تولدت را وارد کن. تاریخ را می‌توانی با تقویم شمسی یا میلادی انتخاب کنی. انتخاب درست ساعت و شهر کمک می‌کند رایزینگ، محورهای اصلی و خانه‌های چارت دقیق‌تر محاسبه شوند.
            </p>
          </div>

          <ChartForm />

          <details className={styles.formGuide}>
            <summary>
              <span>راهنمای کوتاه تکمیل فرم</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <p className={styles.detailParagraph}>
              تاریخ تولد را با تقویم شمسی یا میلادی وارد کن. ساعت را با قالب ۲۴ ساعته انتخاب کن و شهر را از پیشنهادهای هالیوس بردار تا منطقهٔ زمانی درست اعمال شود. اگر ساعت دقیق را نمی‌دانی، گزینهٔ «ساعت تولدم را نمی‌دانم» را فعال کن و نتیجه را با محدودیت‌های توضیح‌داده‌شده بخوان.
            </p>
          </details>
        </div>

        <aside className={styles.previewPanel} aria-labelledby="chart-sample-title">
          <h2 id="chart-sample-title">نمونهٔ چرخ چارت تولد در هالیوس</h2>
          <figure className={styles.sampleFigure}>
            <Image
              alt="نمونه چارت تولد فارسی هالیوس با نمایش سیاره‌ها، خانه‌ها، رایزینگ و جنبه‌های اصلی"
              className={styles.sampleImage}
              height={1254}
              loading="lazy"
              sizes="(max-width: 760px) calc(100vw - 36px), 360px"
              src="/halleus-chart-wheel-sample-polished-centered.webp"
              width={1254}
            />
            <figcaption className={styles.sampleCaption}>
              نمونه ناشناس‌شده از چارت تولد فارسی هالیوس؛ جایگاه سیاره‌ها، خانه‌ها، محورهای اصلی و جنبه‌های برجسته روی یک چرخ نمایش داده شده‌اند.
            </figcaption>
          </figure>
        </aside>
      </section>

      <section className={styles.reportStrip} aria-label="خلاصهٔ خروجی گزارش">
        <div className={styles.reportStripIntro}>
          <span className={styles.sectionEyebrow}>تفسیر چارت تولد</span>
          <strong>از چرخ چارت تا تفسیر فارسی شخصی</strong>
        </div>

        <div className={styles.reportStripItems}>
          <article>
            <span>۰۱</span>
            <div>
              <strong>نقشهٔ واقعی آسمان تولد</strong>
              <small>جایگاه سیاره‌ها، محورهای اصلی و خانه‌ها بر پایهٔ اطلاعات تولد تو محاسبه می‌شود.</small>
            </div>
          </article>
          <article>
            <span>۰۲</span>
            <div>
              <strong>روابط مهم در چارت</strong>
              <small>جنبه‌های برجسته و الگوهای مهم برای ساختن یک تصویر یکپارچه بررسی می‌شوند.</small>
            </div>
          </article>
          <article>
            <span>۰۳</span>
            <div>
              <strong>توضیح فارسی و قابل خواندن</strong>
              <small>نتیجه فقط فهرست نمادها نیست؛ بخش‌های اصلی چارت با زبان روشن توضیح داده می‌شوند.</small>
            </div>
          </article>
        </div>
      </section>

      <section
        className={styles.education}
        data-chart-section="report-details"
        id="chart-report-details"
      >
        <div className={styles.educationHeading}>
          <span className={styles.sectionEyebrow}>خروجی گزارش</span>
          <h2>در تفسیر چارت تولد رایگان چه می‌بینی؟</h2>
          <p>
            گزارش هالیوس قرار نیست فقط نام برج‌ها را کنار هم بچیند. سامانه ابتدا داده‌های چارت را محاسبه می‌کند و بعد بخش‌های مرتبط را کنار هم می‌گذارد تا تصویری منسجم‌تر از الگوهای پررنگ نقشهٔ تولد ارائه شود. عمق بعضی بخش‌ها به کامل‌بودن اطلاعات تولد و در دسترس‌بودن دادهٔ معتبر بستگی دارد.
          </p>
        </div>

        <div className={styles.supportStack}>
          <article className={styles.supportSection}>
            <h3>خورشید، ماه و رایزینگ</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                خورشید به هویت آگاهانه و جهت کلی ابراز خود مربوط است؛ ماه نیازهای هیجانی و شیوهٔ واکنش درونی را روشن می‌کند؛ و رایزینگ، وقتی ساعت تولد دقیق باشد، زاویهٔ ورود تو به محیط و تصویری را نشان می‌دهد که در برخورد نخست دیده می‌شود. گزارش این سه بخش را جدا و سپس در ارتباط با یکدیگر می‌خواند.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>سیاره‌ها در نشان‌ها و خانه‌ها</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                گزارش جایگاه سیاره‌های اصلی از خورشید و ماه تا عطارد، زهره، مریخ، مشتری، زحل، اورانوس، نپتون و پلوتو را بررسی می‌کند. نشان هر سیاره دربارهٔ سبک بیان آن نیرو توضیح می‌دهد و خانه، در صورت داشتن ساعت معتبر، حوزه‌ای از زندگی را مشخص می‌کند که آن موضوع در آن برجسته‌تر می‌شود.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>خانه‌ها و محورهای اصلی چارت</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                با ساعت و شهر تولد معتبر، دوازده خانه و محورهای صعودی، نزولی، میانهٔ آسمان و پایین آسمان محاسبه می‌شوند. گزارش به‌جای توضیح یکسان همهٔ خانه‌ها، روی خانه‌های پررنگ‌تر و ارتباط آن‌ها با سیاره‌ها تمرکز می‌کند. سهم‌السعاده و ورتکس نیز فقط وقتی ساعت تولد قابل اتکا باشد می‌توانند در بخش تکمیلی نمایش داده شوند.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>جنبه‌ها، فاصله‌ها و الگوهای برجسته</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                زاویه‌های مهم میان سیاره‌ها با فاصلهٔ مجاز محاسبه می‌شوند. هم‌نشینی، مقابله، تربیع، تثلیث و تسدیس می‌توانند تنش‌ها، همکاری‌ها یا مسیرهای تکرارشونده را نشان دهند. هالیوس جنبه‌های برجسته را در بافت کل چارت توضیح می‌دهد؛ نه اینکه هر زاویه را جدا و قطعی تفسیر کند.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>گره‌های ماه، حرکت برگشتی و نقاط تکمیلی</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                در گزارش، گره‌های ماه و حرکت برگشتی سیاره‌ها بر پایهٔ دادهٔ محاسباتی نمایش داده می‌شوند. نقاط تکمیلی فقط زمانی وارد خوانش می‌شوند که دادهٔ معتبر و ارتباط معناداری با ساختار چارت داشته باشند؛ بنابراین قرار نیست هر نماد فرعی بدون دلیل به متن اضافه شود.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>کایران و نقاط پیشرفته</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                اگر دادهٔ معتبر کایران در زمان محاسبه آماده باشد، جایگاه آن می‌تواند در چرخ و بخش تکمیلی گزارش دیده شود. نقاط پیشرفته‌ای مانند سرس، پالاس، جونو، وستا، اریس، فولوس و نسوس فقط در حالت پیشرفته و بر اساس میزان اهمیتشان نمایش داده می‌شوند و جزو خروجی تضمینی هر گزارش نیستند. لیلیت تنها زمانی وارد روایت می‌شود که دادهٔ آن برای خروجی گزارش تأیید شده باشد؛ در غیر این صورت فقط محدودیت فنی آن ثبت می‌شود. از میان ستاره‌های ثابت نیز حداکثر دو موردِ واقعاً مرتبط و با هم‌نشینی نزدیک انتخاب می‌شوند.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>بخش فنی و امکان بررسی محاسبه</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                گزارش علاوه بر توضیح فارسی، داده‌های قابل بررسی مانند درجه‌ها، خانه‌ها، جنبه‌های منتخب و محدودیت‌های محاسبه را نگه می‌دارد. هدف این است که معلوم باشد هر نتیجه از کدام بخش چارت آمده و کدام قسمت به ساعت دقیق تولد وابسته بوده است.
              </p>
              <p className={styles.detailNote}>
                این گزارش یک ابزار خودشناسی نمادین است و جای تشخیص پزشکی، روان‌شناختی، حقوقی یا تصمیم‌گیری قطعی دربارهٔ آینده را نمی‌گیرد.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.education} data-chart-section="calculation">
        <div className={styles.educationHeading}>
          <span className={styles.sectionEyebrow}>روش محاسبه</span>
          <h2>چارت تولد چگونه محاسبه می‌شود؟</h2>
        </div>
        <div className={styles.supportStack}>
          <article className={styles.supportSection}>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                برای محاسبه چارت تولد رایگان، تاریخ و زمان تولد به یک لحظهٔ دقیق تبدیل می‌شود و شهر تولد برای تعیین منطقهٔ زمانی و مختصات جغرافیایی به کار می‌رود. سپس جایگاه اجرام، محورهای چارت، خانه‌ها و زاویه‌های مهم محاسبه می‌شوند. نتیجه روی چرخ چارت قرار می‌گیرد و داده‌های مرتبط برای ساخت تفسیر فارسی انتخاب می‌شوند.
              </p>
              <p className={styles.detailParagraph}>
                تاریخ شمسی فقط یک روش ورود راحت‌تر برای کاربر فارسی‌زبان است؛ سامانه آن را پیش از محاسبه به تاریخ مناسب تبدیل می‌کند. به همین دلیل، واردکردن درست روز، ماه، سال، ساعت و شهر مهم‌تر از انتخاب نوع تقویم است. برای دریافت چارت تولد دقیق‌تر، ساعت ثبت‌شده در مدارک یا اطلاع خانواده را وارد کن و شهر را از فهرست پیشنهادها انتخاب کن.
              </p>
              <p className={styles.detailParagraph}>
                هالیوس میان محاسبه و تفسیر تفاوت می‌گذارد: درجه‌ها و جایگاه‌ها دادهٔ فنی‌اند، اما توضیح فارسی یک خوانش نمادین از رابطهٔ میان همان داده‌هاست. این جداسازی کمک می‌کند نتیجه شفاف‌تر باشد و ادعاهای کلی جای دادهٔ واقعی چارت را نگیرند.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.education} data-chart-section="unknown-time">
        <div className={styles.educationHeading}>
          <span className={styles.sectionEyebrow}>ساعت تولد نامعلوم</span>
          <h2>چارت تولد بدون ساعت دقیق چه چیزی نشان می‌دهد؟</h2>
        </div>
        <div className={styles.supportStack}>
          <article className={styles.supportSection}>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                اگر ساعت تولدت را نمی‌دانی، هنوز می‌توانی جایگاه بسیاری از سیاره‌ها در نشان‌ها و بخش‌هایی از روابط میان آن‌ها را ببینی. با این حال، رایزینگ، محورهای اصلی و خانه‌ها مستقیماً به زمان و مکان وابسته‌اند و نباید با دقت کاذب گزارش شوند.
              </p>
              <p className={styles.detailParagraph}>
                در این حالت، هالیوس محاسبه را متوقف نمی‌کند؛ زمان جایگزین را فقط برای ساخت خروجی فنی به کار می‌برد و محدودیت آن را آشکارا اعلام می‌کند. بخش‌های حساس به ساعت باید با برچسب محدودیت دیده شوند و متن گزارش نباید آن‌ها را قطعی معرفی کند. اگر بعداً ساعت معتبرتری پیدا کردی، بهتر است چارت را دوباره بسازی تا خانه‌ها و رایزینگ به‌روز شوند.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.education} data-chart-section="personal-report">
        <div className={styles.educationHeading}>
          <span className={styles.sectionEyebrow}>گزارش شخصی</span>
          <h2>چرا گزارش هالیوس عمومی و تکراری نیست؟</h2>
        </div>
        <div className={styles.supportStack}>
          <article className={styles.supportSection}>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                دو نفر ممکن است نشان خورشیدی یکسانی داشته باشند، اما ترکیب ماه، رایزینگ، خانه‌ها، جنبه‌ها و درجه‌های سیاره‌ای آن‌ها متفاوت باشد. به همین دلیل، یک متن عمومی دربارهٔ برج تولد نمی‌تواند جای تفسیر چارت شخصی را بگیرد.
              </p>
              <p className={styles.detailParagraph}>
                هالیوس ابتدا موضوع‌های مهم‌تر چارت را انتخاب می‌کند، سپس جایگاه‌ها و جنبه‌های مرتبط را در کنار هم می‌خواند. اگر داده‌ای برای یک نقطهٔ پیشرفته معتبر نباشد یا اهمیت کافی نداشته باشد، آن بخش به‌زور وارد گزارش نمی‌شود. نتیجه باید قابل ردیابی به داده‌های همان چارت باشد، نه مجموعه‌ای از جمله‌های ثابت که برای همه تکرار می‌شوند.
              </p>
              <p className={styles.detailParagraph}>
                همچنین اطلاعات نام، تاریخ، ساعت و شهر تولد برای ساخت گزارش استفاده می‌شوند. نسخهٔ عمومی نباید نام یا جزئیات شناسایی‌کننده را نمایش دهد و کاربر باید پیش از ذخیرهٔ حسابی بداند کدام اطلاعات نگهداری می‌شوند.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.education} data-chart-section="faq">
        <div className={styles.educationHeading}>
          <span className={styles.sectionEyebrow}>پرسش‌های رایج</span>
          <h2>پرسش‌های رایج درباره چارت تولد آنلاین</h2>
        </div>
        <div className={styles.supportStack}>
          <details className={styles.supportGroup} open>
            <summary>
              <span>آیا ساخت چارت تولد در هالیوس رایگان است؟</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>
                بله. ساخت نسخهٔ پایهٔ چارت تولد و مشاهدهٔ گزارش فارسی اولیه در همین صفحه رایگان است.
              </p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary>
              <span>برای ساخت چارت تولد چه اطلاعاتی لازم است؟</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>
                تاریخ تولد، ساعت تولد و شهر تولد داده‌های اصلی محاسبه‌اند. نام برای شخصی‌سازی نمایش گزارش استفاده می‌شود. تاریخ را می‌توانی شمسی یا میلادی وارد کنی.
              </p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary>
              <span>اگر ساعت تولدم را ندانم چه می‌شود؟</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>
                می‌توانی چارت را بسازی، اما رایزینگ، خانه‌ها و محورهای اصلی به ساعت دقیق وابسته‌اند. هالیوس این محدودیت را در نتیجه مشخص می‌کند و نباید آن بخش‌ها را قطعی بخوانی.
              </p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary>
              <span>چرا شهر تولد در محاسبه چارت مهم است؟</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>
                شهر تولد برای تعیین مختصات و منطقهٔ زمانی لحظهٔ تولد لازم است. این داده می‌تواند روی رایزینگ، خانه‌ها و محورهای چارت اثر بگذارد.
              </p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary>
              <span>آیا تفسیر چارت تولد رایگان شامل کایران است؟</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>
                کایران فقط وقتی نمایش داده می‌شود که دادهٔ معتبر آن در زمان محاسبه در دسترس باشد. نمایش آن و سایر نقاط پیشرفته در همهٔ گزارش‌ها تضمین‌شده نیست و به اعتبار داده و اهمیت آن در چارت بستگی دارد.
              </p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary>
              <span>چارت تولد با فال روزانه چه تفاوتی دارد؟</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>
                چارت تولد بر اساس تاریخ، زمان و مکان تولد یک فرد محاسبه می‌شود و ساختار پایهٔ آن ثابت است. فال روزانه معمولاً متن عمومی‌تری است و جای نقشهٔ شخصی تولد را نمی‌گیرد.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section className={styles.education} data-chart-section="resources">
        <div className={styles.educationHeading}>
          <span className={styles.sectionEyebrow}>راهنمای تکمیلی</span>
          <h2>راهنمای تکمیلی و حریم خصوصی</h2>
          <p>
            اگر ساعت تولدت نامعلوم است یا می‌خواهی دربارهٔ نحوهٔ پیدا کردن آن بیشتر بدانی، فقط از راهنماهای زیر استفاده کن. جزئیات نگهداری و نمایش اطلاعات تولد نیز در صفحهٔ حریم خصوصی توضیح داده شده است.
          </p>
        </div>
        <div className={styles.contextLinks}>
          <Link data-chart-content-link="allowed" href="/privacy">
            حریم خصوصی و نگهداری اطلاعات تولد
            <span aria-hidden="true">←</span>
          </Link>
          <Link
            data-chart-content-link="allowed"
            href="/wiki/birth-chart-without-birth-time"
          >
            راهنمای چارت تولد بدون ساعت تولد
            <span aria-hidden="true">←</span>
          </Link>
          <Link
            data-chart-content-link="allowed"
            href="/wiki/find-exact-birth-time"
          >
            چگونه ساعت تولد خود را پیدا کنیم؟
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </section>

      <section className={styles.finalCta}>
        <span className={styles.sectionEyebrow}>ساخت گزارش</span>
        <h2>چارت تولد شخصی خودت را بساز</h2>
        <p>
          تاریخ، ساعت و شهر تولدت را وارد کن تا چرخ چارت و تفسیر فارسی شخصی تو آماده شود. اگر ساعت دقیق را ندانی، هالیوس محدودیت نتیجه را همان‌جا توضیح می‌دهد.
        </p>
        <Link
          className={`${styles.heroPrimary} ${styles.discoveryPrimary}`}
          href="#chart-birth-data-form"
        >
          شروع ساخت چارت تولد
          <span aria-hidden="true">↑</span>
        </Link>
      </section>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(chartStructuredData) }}
        type="application/ld+json"
      />
    </div>
  );
}
