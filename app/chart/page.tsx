import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ChartForm } from "@/components/ChartForm";
import { buildPublicPageMetadata } from "@/lib/config/seo";
import { getPublicReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";

import styles from "./chart-shell.module.css";

export const dynamic = "force-static";
export const revalidate = 300;

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

// HALLEUS_SITEWIDE_SEO_HOMEPAGE_REFRESH_R1
function buildChartStructuredData(freeAllAccess: boolean) {
  return {
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
      caption: "نمونه‌ای از چارت تولد هالیوس",
    },
    {
      "@type": "WebApplication",
      "@id": "https://halleus.ir/chart#application",
      name: "چارت تولد هالیوس",
      url: "https://halleus.ir/chart",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      ...(freeAllAccess
        ? {
            isAccessibleForFree: true,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "IRR",
            },
          }
        : {}),
      inLanguage: "fa-IR",
    },
  ],
  };
}

export default async function ChartPage() {
  const accessPolicy = await getPublicReportAccessPolicy();
  const chartStructuredData = buildChartStructuredData(
    accessPolicy.monetizationMode === "FREE_ALL",
  );

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
            تاریخ، ساعت و شهر تولدت را وارد کن تا چارت تولد شخصی تو محاسبه شود. هالیوس جایگاه خورشید، ماه، سیاره‌ها، رایزینگ، خانه‌ها و جنبه‌های اصلی را روی چرخ چارت نشان می‌دهد و نتیجه را به زبان فارسی توضیح می‌دهد. این چارت تولد رایگان فارسی نقطهٔ شروع شناخت نقشهٔ شخصی آسمان در لحظهٔ تولد توست؛ نه چند جملهٔ آماده دربارهٔ ماه تولدت.
          </p>
          <p className={styles.heroLead}>
            ساخت نسخهٔ پایه رایگان است. اگر ساعت دقیق تولدت را ندانی هم می‌توانی چارتت را بسازی؛ فقط رایزینگ و خانه‌ها بدون ساعت دقیق قابل اتکای کامل نیستند. همین مرز روشن میان دادهٔ قطعی و بخش‌های وابسته به ساعت، خواندن نتیجه را دقیق‌تر می‌کند.
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
            نام، تاریخ تولد، ساعت تولد و شهر تولدت را وارد کن. تاریخ را می‌توانی با تقویم شمسی یا میلادی انتخاب کنی. انتخاب درست ساعت و شهر کمک می‌کند رایزینگ، محورهای اصلی و خانه‌های چارت دقیق‌تر محاسبه شوند. برای محاسبه چارت تولد رایگان نیازی نیست جای سیاره‌ها را خودت حساب کنی؛ ابزار آن‌ها را بر پایهٔ اطلاعاتی که می‌دهی مشخص می‌کند.
          </p>
          </div>

          <ChartForm />

          <details className={styles.formGuide}>
            <summary>
              <span>راهنمای کوتاه تکمیل فرم</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <p className={styles.detailParagraph}>
              تاریخ تولد را با تقویم شمسی یا میلادی وارد کن. ساعت را با قالب ۲۴ ساعته انتخاب کن و شهر را از پیشنهادهای هالیوس بردار تا منطقهٔ زمانی درست اعمال شود. اگر ساعت دقیق را نداری، گزینهٔ «ساعت تولدم را نمی‌دانم» را بزن؛ در گزارش مشخص می‌کنیم کدام بخش‌ها به ساعت دقیق وابسته‌اند.
            </p>
          </details>
        </div>
      </section>

      <section className={styles.reportStrip} aria-label="خلاصهٔ خروجی گزارش">
        <div className={styles.reportStripIntro}>
          <span className={styles.sectionEyebrow}>تفسیر چارت تولد</span>
          <strong>از چرخ چارت تا تفسیر شخصی</strong>
        </div>

        <div className={styles.reportStripItems}>
          <article>
            <span>۰۱</span>
            <div>
              <strong>نقشهٔ آسمان در لحظهٔ تولد</strong>
              <small>جای سیاره‌ها، خانه‌ها و محورهای اصلی با اطلاعات تولدت محاسبه می‌شود.</small>
            </div>
          </article>
          <article>
            <span>۰۲</span>
            <div>
              <strong>زاویه‌های مهم بین سیاره‌ها</strong>
              <small>جنبه‌های اصلی بررسی می‌شوند تا الگوهای پررنگ چارت راحت‌تر دیده شوند.</small>
            </div>
          </article>
          <article>
            <span>۰۳</span>
            <div>
              <strong>تفسیر فارسی</strong>
              <small>نتیجه فقط فهرست نمادها نیست؛ مهم‌ترین بخش‌های چارتت به زبان روشن توضیح داده می‌شوند.</small>
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
            در گزارش فقط اسم برج‌ها را نمی‌بینی. هالیوس اول چارت را محاسبه می‌کند و بعد مهم‌ترین جایگاه‌ها و جنبه‌ها را کنار هم می‌گذارد تا توضیحی متناسب با همان چارت بسازد. اگر اطلاعات تولد کامل نباشد یا دادهٔ قابل اتکایی برای بخشی نداشته باشیم، همان‌جا روشن می‌کنیم. تحلیل چارت تولد وقتی ارزش پیدا می‌کند که پشت هر برداشت، بخشی مشخص از نقشه دیده شود. اینجا تفسیر چارت تولد از خود جایگاه‌ها شروع می‌شود و بعد سراغ ارتباطشان می‌رود.
          </p>
        </div>

                <div className={styles.reportSample} aria-labelledby="chart-sample-title">
          <div className={styles.reportSampleCopy}>
            <span className={styles.reportSampleEyebrow}>نمونه خروجی</span>
            <h3 id="chart-sample-title">نمونه‌ای از چارت تولد هالیوس</h3>
            <p>
              این تصویر فقط برای این است که قبل از ساخت گزارش، شکل چرخ چارت و جای اطلاعات اصلی را ببینی. عکس نمونه، چارت روز تولد تو نیست؛ چارت شخصی‌ات با اطلاعات خودت ساخته می‌شود.
            </p>
          </div>

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
              اطلاعات شخصی این نمونه حذف شده؛ اینجا می‌توانی شکل چرخ چارت، خانه‌ها، سیاره‌ها و جنبه‌های اصلی را ببینی.
            </figcaption>
          </figure>
        </div>

        <div className={styles.supportStack}>
          <article className={styles.supportSection}>
            <h3>خورشید، ماه و رایزینگ</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                خورشید بیشتر به هویت و شیوه‌ای که خودت را نشان می‌دهی مربوط است؛ ماه از نیازهای احساسی و واکنش‌های درونی حرف می‌زند؛ و رایزینگ، اگر ساعت تولدت دقیق باشد، بیشتر به نحوهٔ ورودت به موقعیت‌ها و تصویری که در برخورد اول از تو دیده می‌شود مربوط است. گزارش این سه را جدا نمی‌بیند و ارتباطشان را هم در نظر می‌گیرد.
              </p>
              <p className={styles.detailParagraph}>
                برای مثال، خورشیدی که میل به پیش‌رفتن را برجسته می‌کند ممکن است کنار ماهی قرار بگیرد که به امنیت و زمان بیشتری نیاز دارد. در چارت خوانی تولد، همین گفت‌وگوی میان جایگاه‌ها از یک برچسب سادهٔ شخصیتی مهم‌تر است.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>سیاره‌ها در نشان‌ها و خانه‌ها</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                در گزارش، جای سیاره‌های اصلی از خورشید و ماه تا عطارد، زهره، مریخ، مشتری، زحل، اورانوس، نپتون و پلوتو بررسی می‌شود. نشان هر سیاره کمک می‌کند بفهمیم آن بخش از چارت چطور خودش را نشان می‌دهد؛ خانه هم، اگر ساعت تولد دقیق باشد، می‌گوید این موضوع بیشتر در کدام حوزهٔ زندگی دیده می‌شود.
              </p>
              <p className={styles.detailParagraph}>
                مثلاً اگر از خودت می‌پرسی «جایگاه زحل در چارت تولد من کجاست»، اول نشان و درجهٔ زحل را در چرخ پیدا کن؛ بعد، اگر ساعت تولدت دقیق است، خانهٔ آن را ببین و در پایان سراغ جنبه‌های زحل برو. بررسی چارت تولد با این ترتیب، تصویر روشن‌تری از مسئولیت، مرزبندی و فشارهای نمادین به دست می‌دهد تا معنی‌کردن یک سیاره به‌تنهایی.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>خانه‌ها و محورهای اصلی چارت</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                اگر ساعت و شهر تولدت دقیق باشد، دوازده خانه و محورهای اصلی چارت محاسبه می‌شوند. به‌جای اینکه همهٔ خانه‌ها یکسان توضیح داده شوند، گزارش بیشتر روی خانه‌هایی می‌ایستد که در چارتت مهم‌ترند و با سیاره‌ها ارتباط پررنگ‌تری دارند. سهم‌السعاده و ورتکس هم فقط وقتی ساعت تولد قابل اتکا باشد در بخش‌های تکمیلی دیده می‌شوند.
              </p>
              <p className={styles.detailParagraph}>
                رایزینگ از افق شرقی لحظهٔ تولد به دست می‌آید. برای محاسبه رایزینگ تولد باید زمان و مکان درست داشته باشی؛ نام ماه تولد به‌تنهایی جای آن را نمی‌گیرد. این تفاوت به‌خصوص وقتی مهم می‌شود که کسی محاسبه رایزینگ ماه تولد را فقط بر اساس نام برج انجام می‌دهد: نتیجهٔ دقیق، وابسته به ساعت واقعی است.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>جنبه‌ها، فاصله‌ها و الگوهای برجسته</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                زاویه‌های مهم میان سیاره‌ها با فاصلهٔ مجاز خودشان محاسبه می‌شوند. هم‌نشینی، مقابله، تربیع، تثلیث و تسدیس می‌توانند بخش‌هایی از کشمکش، هماهنگی یا الگوهای تکرارشوندهٔ چارت را نشان دهند. هالیوس هر جنبه را جدا و قطعی معنی نمی‌کند؛ آن را کنار بقیهٔ چارت می‌خواند. خطوط میان سیاره‌ها به‌تنهایی حکم نمی‌دهند؛ رابطهٔ هر زاویه با بقیهٔ نقشه مهم است.
              </p>
              <p className={styles.detailParagraph}>
                در آنالیز چارت تولد، صرف دیدن خط قرمز یا آبی کافی نیست. باید بدانی کدام دو سیاره درگیرند، زاویه چقدر به حالت دقیق نزدیک است و آن ارتباط در کنار باقی جایگاه‌ها چه معنایی پیدا می‌کند. گاهی همان بخشی که تنش می‌سازد، نیروی حرکت و تغییر را هم آشکار می‌کند.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>گره‌های ماه، حرکت برگشتی و نقاط تکمیلی</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                گره‌های ماه و حرکت برگشتی سیاره‌ها مستقیماً از محاسبهٔ چارت می‌آیند. نقاط تکمیلی فقط وقتی اضافه می‌شوند که اطلاعات قابل اتکایی داشته باشند و واقعاً در چارت مهم باشند؛ قرار نیست هر نماد فرعی صرفاً برای طولانی‌تر شدن گزارش وارد متن شود.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>کایران و نقاط پیشرفته</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                اگر دادهٔ کایران قابل اتکا باشد، جای آن در چرخ یا بخش تکمیلی گزارش دیده می‌شود. نقاطی مثل سرس، پالاس، جونو، وستا، اریس، فولوس و نسوس فقط در حالت پیشرفته و وقتی واقعاً در چارت مهم باشند نمایش داده می‌شوند. لیلیت هم فقط وقتی در تفسیر می‌آید که دادهٔ آن قابل اتکا باشد. از ستاره‌های ثابت نیز حداکثر دو مورد با هم‌نشینی نزدیک و ارتباط روشن انتخاب می‌شوند.
              </p>
              <p className={styles.detailParagraph}>
                این جزئیات وعدهٔ حضور همهٔ نقاط در همهٔ گزارش‌ها نیست. اول جایگاه‌های اصلی خوانده می‌شوند؛ بعد اگر داده و ارتباط معتبر باشد، لایهٔ تکمیلی به همان نقشه اضافه می‌شود.
              </p>
            </div>
          </article>
          <article className={styles.supportSection}>
            <h3>جزئیات فنی چارت</h3>
            <div className={styles.supportSectionCopy}>
              <p className={styles.detailParagraph}>
                کنار توضیح فارسی، درجه‌ها، خانه‌ها و جنبه‌های اصلی هم نگه داشته می‌شوند تا اگر خواستی بتوانی ببینی هر بخش از تفسیر از کجای چارت آمده است. جاهایی که به ساعت دقیق تولد وابسته‌اند هم مشخص می‌شوند.
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
            برای محاسبه چارت تولد، تاریخ، ساعت و شهر تولدت را وارد کن. بعد از ثبت همین اطلاعات، برای دریافت چارت تولد رایگان به مرحلهٔ دیگری نیاز نداری و چرخ چارت همراه با تفسیر فارسی بخش‌های اصلی نمایش داده می‌شود.
          </p>
              <p className={styles.detailParagraph}>
                هالیوس تاریخ، ساعت و شهر تولد را به یک لحظه و مکان مشخص تبدیل می‌کند. بعد جای سیاره‌ها، محورهای اصلی، خانه‌ها و زاویه‌های مهم محاسبه می‌شوند و روی چرخ چارت قرار می‌گیرند. از همین اطلاعات برای نوشتن تفسیر فارسی استفاده می‌شود. این مرحله، پایهٔ ترسیم چارت تولد است؛ خوانش نمادین پس از آن آغاز می‌شود.
              </p>
              <p className={styles.detailParagraph}>
                فرقی نمی‌کند تاریخ را شمسی وارد کنی یا میلادی؛ هالیوس آن را برای محاسبه به فرمت لازم تبدیل می‌کند. چیزی که بیشتر اهمیت دارد درست‌بودن روز، ماه، سال، ساعت و شهر تولد است. اگر ساعت ثبت‌شده در مدارک یا اطلاعات مطمئن خانواده را داری، همان را وارد کن و شهر را از پیشنهادها انتخاب کن.
              </p>
              <p className={styles.detailParagraph}>
                در هالیوس، محاسبه و تفسیر یکی نیستند. درجه‌ها و جایگاه‌ها بخش فنی چارت‌اند؛ متن فارسی برداشتی نمادین از ارتباط بین همان داده‌هاست. این مرز کمک می‌کند دادهٔ چارت با ادعاهای کلی قاطی نشود.
              </p>
            
              <p className={styles.detailParagraph}>
                چارت تاریخ تولد بر یک روز و مکان مشخص تکیه می‌کند؛ چارت ماه تولد، اگر فقط از نام ماه ساخته شود، چنین دقتی ندارد. دو نفر که هر دو در یک ماه به دنیا آمده‌اند ممکن است نشان ماه، رایزینگ، خانه‌ها و جنبه‌های متفاوتی داشته باشند. به همین دلیل چارت تولد دقیق را با همان روز، ساعت و شهر می‌سازیم، نه با حدس از روی اسم برج.
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
            اگر ساعت تولدت را نمی‌دانی، هنوز می‌توانی جای خیلی از سیاره‌ها در نشان‌ها و بسیاری از جنبه‌ها را ببینی. اما رایزینگ، خانه‌ها و محورهای اصلی به ساعت دقیق وابسته‌اند و بدون آن نباید قطعی خوانده شوند. چارت تولد بدون ساعت تولد یعنی نقشه را با بخش‌های قابل‌اتکاتر شروع کنی و محدودیتِ بخش‌های وابسته به ساعت را بشناسی.
          </p>
              <p className={styles.detailParagraph}>
                هالیوس در این حالت هم اجازه می‌دهد چارتت را بسازی، اما در گزارش مشخص می‌کند کدام بخش‌ها به ساعت دقیق وابسته‌اند. اگر بعداً ساعت مطمئن‌تری پیدا کردی، چارت را دوباره بساز تا رایزینگ و خانه‌ها هم به‌روز شوند.
              </p>
            
              <p className={styles.detailParagraph}>
                محاسبه رایزینگ انلاین یا بررسی طالع بینی ساعت تولد بدون زمان معتبر، جواب دقیق نمی‌دهد. حتی اختلاف ساعت می‌تواند مرز خانه‌ها را جابه‌جا کند. وقتی دادهٔ بهتر پیدا کردی، می‌توانی دوباره همان فرایند را انجام بدهی و جایگاه‌های وابسته به ساعت را با اطمینان بیشتری بخوانی.
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
                هالیوس گزارش را از داده‌های همان چارت می‌سازد. اگر یک نقطهٔ پیشرفته دادهٔ قابل اتکایی نداشته باشد یا در چارتت برجسته نباشد، وارد متن نمی‌شود. هدف این است که گزارش واقعاً برای همان چارت نوشته شده باشد، نه اینکه مجموعه‌ای از جمله‌های ثابت برای همه تکرار شود.
              </p>
              <p className={styles.detailParagraph}>
                نام، تاریخ، ساعت و شهر تولد برای ساخت گزارش استفاده می‌شوند. اگر گزارشت عمومی باشد، اطلاعات شخصی‌ات نباید در نسخهٔ عمومی دیده شوند. جزئیات نگهداری اطلاعات هم در صفحهٔ حریم خصوصی توضیح داده شده است.
              </p>
            
              <p className={styles.detailParagraph}>
                برای شناخت رابطهٔ دو نفر، همین چارت شخصی نقطهٔ شروع است؛ اما تحلیل پیوندها موضوع متفاوتی است. در بخش <Link href="/compare">محاسبه چارت ازدواج رایگان</Link>، دو چارت تولد کنار هم قرار می‌گیرند تا تفاوت‌ها و ارتباط‌های میان آن‌ها بررسی شود. یک چارت دربارهٔ ساختار نمادین فرد حرف می‌زند؛ مقایسهٔ دو چارت دربارهٔ الگوهای رابطه.
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
                بله. ساخت نسخهٔ پایهٔ چارت و دیدن تفسیر فارسی اولیه در همین صفحه رایگان است. تفسیر چارت تولد رایگان از جایگاه‌های واقعی نقشه آغاز می‌شود و توضیح می‌دهد هر بخش چه نقشی در خوانش کلی دارد. چارت رایگان تولد در اینجا به معنی محاسبهٔ نقشه از اطلاعات خودت است، نه یک فال عمومی بر اساس نام ماه.
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
                تاریخ تولد، ساعت تولد و شهر تولد برای محاسبه لازم‌اند. نام فقط برای شخصی‌تر شدن نمایش گزارش استفاده می‌شود و تاریخ را می‌توانی شمسی یا میلادی وارد کنی. اگر ساعت را نداری، گزینهٔ مخصوص آن را انتخاب کن.
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
                می‌توانی چارتت را بسازی، اما رایزینگ، خانه‌ها و محورهای اصلی بدون ساعت دقیق قابل اتکای کامل نیستند. هالیوس این محدودیت را در گزارش مشخص می‌کند.
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
                شهر تولد برای پیدا کردن مختصات و منطقهٔ زمانی درست لازم است؛ همین دو مورد روی رایزینگ، خانه‌ها و محورهای چارت اثر می‌گذارند.
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
                کایران فقط وقتی نمایش داده می‌شود که دادهٔ قابل اتکایی برای آن داشته باشیم. نقاط پیشرفته هم در همهٔ گزارش‌ها نمی‌آیند و فقط وقتی مهم باشند وارد خروجی می‌شوند.
              </p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary>
              <span>چارت شخصی با فال امروز چه تفاوتی دارد؟</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>
                چارت تولد هوروسکوپ فارسی، وقتی منظور نقشهٔ شخصی زمان تولد است، با پیش‌بینی روزانه تفاوت دارد. در طالع بینی آنلاین گاهی فقط چند جملهٔ عمومی دربارهٔ امروز می‌بینی؛ اما اینجا موضوع، ساخت چارت شخصی توست. فال آسترولوژی رایگان، فال استرولوژی رایگان و فال آسترولوژی آنلاین معمولاً با وضعیت عمومی روز یا یک ماه سروکار دارند؛ برای دیدن داده‌های محاسبه‌شدهٔ امروز و تفاوت آن با نقشهٔ تولدت، <Link href="/sky">چارت آسترولوژی امروز</Link> را ببین. آن صفحه آسمان فعلی را نشان می‌دهد؛ این صفحه آسمان لحظهٔ تولد تو را.
              </p>
            </div>
          </details>
                  <details className={styles.supportGroup}>
            <summary><span>چگونه چارت تولد خود را پیدا کنیم؟</span><span aria-hidden="true">＋</span></summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>اینکه چگونه چارت تولد خود را پیدا کنیم، از مشخص‌کردن تاریخ، ساعتِ در دسترس و شهر تولد شروع می‌شود. این سه داده را در فرم همین صفحه ثبت کن. این سایت چارت تولد، نقشه و تفسیر فارسی را کنار هم نشان می‌دهد؛ برای دیدن نتیجه لازم نیست سیاره‌ها را دستی روی دایره رسم کنی. چارت تولد آنلاین در مرورگر آماده می‌شود و اگر هدف تو بررسی چارت تولد رایگان باشد، می‌توانی از خود تصویر شروع کنی و بعد توضیح‌ها را دنبال کنی.</p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary><span>آیا برای ساخت چارت به نصب برنامه نیاز دارم؟</span><span aria-hidden="true">＋</span></summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>چارت تولد انلاین و چارت تولد رایگان انلاین فقط دو شیوهٔ نوشتن «آنلاین» هستند؛ در هالیوس ابزار داخل مرورگر کار می‌کند و نیازی به نصب برنامهٔ جدا نداری. هنگام دریافت چارت تولد، همان اطلاعات تولد تعیین‌کننده‌اند، نه شکل نوشتن اسم ابزار. اگر چارت تولد آنلاین رایگان می‌خواهی، همین فرم نقطهٔ شروع است.</p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary><span>چرا خواندن چارت به فارسی مهم است؟</span><span aria-hidden="true">＋</span></summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>چارت تولد فارسی یعنی نقشه‌ای که نام جایگاه‌ها و توضیح‌هایش را به فارسی می‌خوانی. این همان تجربه‌ای است که گاهی چارت فارسی یا فارسی چارت نامیده می‌شود؛ خود موقعیت‌های نجومی با تغییر زبان عوض نمی‌شوند. اگر هدفت آسترولوژی فارسی چارت تولد است، اول دادهٔ تولد را درست وارد کن، بعد توضیح هر بخش را کنار جایگاه اصلی‌اش ببین.</p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary><span>چارت شخصی با خصوصیات عمومی ماه تولد چه فرقی دارد؟</span><span aria-hidden="true">＋</span></summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>در آسترولوژی چارت تولد رایگان، جای خورشید، ماه، سیاره‌ها، خانه‌ها و جنبه‌ها از اطلاعات تولد خودت محاسبه می‌شوند. یک چارت ماه تولد رایگان که فقط از نام ماه استفاده کند، نمی‌تواند رایزینگ و خانه‌های دقیق تو را مشخص کند. چارت تولد آسترولوژی فارسی را به همین دلیل باید از داده‌های شخصی ساخت، نه چند صفت ثابت برای متولدهای یک ماه.</p>
            </div>
          </details>
          <details className={styles.supportGroup}>
            <summary><span>آیا تفسیر چارت تولد انلاین همان یک فال آماده است؟</span><span aria-hidden="true">＋</span></summary>
            <div className={styles.supportGroupBody}>
              <p className={styles.detailParagraph}>نه. تفسیر چارت تولد انلاین از جایگاه‌های محاسبه‌شدهٔ چارت تو شروع می‌شود و ارتباطشان را کنار هم می‌خواند. این شیوه با فال عمومی ماه تولد فرق دارد، چون حتی میان دو متولد یک روز نیز ساعت و مکان می‌توانند بخش‌هایی از نقشه را تغییر دهند.</p>
            </div>
          </details>
        </div>
      </section>

      <section className={styles.finalCta}>
        <span className={styles.sectionEyebrow}>ساخت گزارش</span>
        <h2>چارت تولد شخصی خودت را بساز</h2>
        <p>
            تاریخ، ساعت و شهر تولدت را وارد کن تا چرخ چارت و تفسیر فارسی شخصی‌ات آماده شود. اگر ساعت دقیق را نداری، در گزارش مشخص می‌کنیم کدام بخش‌ها به آن وابسته‌اند. با ساخت چارت تولد، از جایگاه‌های اصلی شروع می‌کنی و قدم‌به‌قدم الگوهایی را می‌بینی که این نقشه را از یک تعبیر کلی متمایز می‌کنند.
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
