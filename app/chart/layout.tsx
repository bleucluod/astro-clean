import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./chart-shell.module.css";

type ChartLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function ChartLayout({ children }: ChartLayoutProps) {
  return (
    <div
      className={styles.page}
      data-chart-visual-shell="homepage-aligned"
      data-chart-seo-landing="transactional-birth-chart"
      data-product-surface="Halleus Chart"
    >
      <header className={styles.intro} aria-label="شروع ساخت گزارش تولد">
        <div className={styles.introGlow} aria-hidden="true" />

        <div className={styles.introCopy}>
          <span className={styles.eyebrow}>چارت تولد رایگان هالیوس</span>

          <h1 className={styles.title}>چارت تولد رایگان فارسی؛ محاسبه و گزارش شخصی</h1>

          <p className={styles.lead}>
            تاریخ، ساعت و شهر تولدت را وارد کن تا چارت مخصوص همان لحظه محاسبه
            شود و نتیجه را در یک گزارش فارسی ببینی. نسخهٔ پایه رایگان است و
            تاریخ شمسی و میلادی پشتیبانی می‌شوند. هرجا اطلاعات کافی نباشد،
            محدودیت نتیجه روشن نمایش داده می‌شود.
          </p>

          <p className={styles.guideLinks}>
            پیش از شروع:
            <Link href="/wiki/why-birth-time-matters">
              چرا ساعت تولد مهم است؟
            </Link>
            <Link href="/wiki/why-birth-city-matters">
              چرا شهر تولد مهم است؟
            </Link>
          </p>

        </div>

        <div className={styles.visual} aria-hidden="true">
          <span className={styles.orbitOuter} />
          <span className={styles.orbitInner} />
          <span className={styles.sun} />
          <span className={styles.moon}>☾</span>
          <span className={styles.starA}>✦</span>
          <span className={styles.starB}>✧</span>
          <span className={styles.signA}>♓</span>
          <span className={styles.signB}>♌</span>
          <span className={styles.signC}>♎</span>
        </div>
      </header>

      <div className={styles.formStage}>{children}</div>

      <section
        className={styles.education}
        data-chart-seo-education="wiki-guides"
        aria-label="راهنمای ساخت و خواندن چارت تولد"
      >
        <article className={styles.educationCard}>
          <h2>برای ساخت چارت تولد چه چیزهایی لازم است؟</h2>
          <p>
            تاریخ تولد جایگاه کلی سیاره‌ها را مشخص می‌کند. ساعت تولد برای
            رایزینگ، خانه‌ها و محورهای اصلی مهم است. شهر تولد هم افق محلی،
            منطقه زمانی و مختصات جغرافیایی را وارد محاسبه می‌کند.
          </p>
          <div className={styles.educationLinks}>
            <Link href="/wiki/birth-chart-basics">چارت تولد چیست؟</Link>
            <Link href="/wiki/why-birth-time-matters">
              چرا ساعت تولد مهم است؟
            </Link>
            <Link href="/wiki/why-birth-city-matters">
              چرا شهر تولد مهم است؟
            </Link>
          </div>
        </article>

        <article className={styles.educationCard}>
          <h2>اگر ساعت تولدم را ندانم چه می‌شود؟</h2>
          <p>
            بدون ساعت تولد هنوز بخشی از جایگاه‌های سیاره‌ای قابل بررسی است،
            اما رایزینگ، خانه‌ها و محورهای چارت قابل اتکا نیستند. اگر ساعت دقیق
            را نداری، اول این راهنما را بخوان.
          </p>
          <div className={styles.educationLinks}>
            <Link href="/wiki/birth-chart-without-birth-time">
              راهنمای چارت تولد بدون ساعت دقیق
            </Link>
          </div>
        </article>

        <article className={styles.educationCard}>
          <h2>بعد از ساخت گزارش چه می‌بینی؟</h2>
          <p>
            گزارش تولد هالیوس فقط یک جدول خام نیست. بعد از ساخت چارت، جایگاه‌های
            اصلی، رایزینگ، خانه‌ها، جنبه‌ها و چند لایه توضیح فارسی کنار هم قرار
            می‌گیرند تا چارت را قابل خواندن‌تر کنند.
          </p>
          <div className={styles.educationLinks}>
            <Link href="/wiki/what-is-rising-sign">
              رایزینگ یا طالع چیست؟
            </Link>
            <Link href="/wiki/what-is-moon-sign">نشان ماه چیست؟</Link>
            <Link href="/wiki/astrology-houses">خانه‌های چارت تولد</Link>
            <Link href="/wiki/major-aspects">جنبه‌های اصلی چارت</Link>
          </div>
        </article>
      </section>

      <section className={styles.education} aria-label="محدودیت‌ها و انتشار گزارش">
        <article className={styles.educationCard}>
          <h2>چارت تولد با فال ماه تولد یکی نیست</h2>
          <p>فال ماه تولد معمولاً فقط نشان خورشیدی را مبنا می‌گیرد. چارت تولد، ماه، سیاره‌ها، رایزینگ، خانه‌ها و جنبه‌ها را با زمان و محل تولد محاسبه می‌کند. این محاسبهٔ شخصی به معنی پیش‌بینی قطعی یا جایگزینی تصمیم پزشکی، مالی یا حقوقی نیست.</p>
          <div className={styles.educationLinks}><Link href="/wiki/birth-chart-basics">چارت تولد چیست؟</Link></div>
        </article>
        <article className={styles.educationCard}>
          <h2>گزارش من عمومی است یا خصوصی؟</h2>
          <p>گزارش مهمان و حساب رایگان به‌صورت پیش‌فرض عمومی است و ممکن است در نتایج جست‌وجو دیده شود. گزارش پریمیوم خصوصی شروع می‌شود و فقط با انتخاب صریح صاحب گزارش عمومی خواهد شد. نمایش نام انتخابی جدا از انتشار است.</p>
          <div className={styles.educationLinks}><Link href="/privacy">قواعد حریم خصوصی هالیوس</Link></div>
        </article>
        <article className={styles.educationCard}>
          <h2>بعد از ساخت چارت چه کار کنم؟</h2>
          <p>ابتدا تصویر کلی، خورشید، ماه و رایزینگ را بخوان؛ سپس خانه‌ها و جنبه‌های پررنگ را بررسی کن. برای مقایسه با نفر دیگر می‌توانی وارد تحلیل خصوصی رابطه شوی.</p>
          <div className={styles.educationLinks}><Link href="/product">داخل گزارش چارت تولد چیست؟</Link><Link href="/compare">دو چارت را کنار هم بگذار</Link></div>
        </article>
      </section>

      <section
        className={styles.discoveryBridge}
        data-chart-public-discovery="sky-wiki"
        aria-label="ادامه مسیر در هالیوس"
      >
        <div>
          <span className={styles.discoveryEyebrow}>ادامهٔ مسیر</span>
          <h2>بعد از گزارش، مسیر مناسب خودت را ادامه بده</h2>
          <p>
            ساختار گزارش را دقیق‌تر بشناس، دو چارت را برای خوانش خصوصی رابطه
            کنار هم بگذار، وضعیت واقعی آسمان امروز را ببین یا قواعد انتشار را
            پیش از ذخیره مرور کن.
          </p>
        </div>
        <div className={styles.discoveryActions}>
          <Link className={styles.discoveryPrimary} href="/sky">
            دیدن آسمان امروز
          </Link>
          <Link className={styles.discoverySecondary} href="/wiki">
            خواندن ویکی هالیوس
          </Link>
          <Link className={styles.discoverySecondary} href="/product">
            داخل گزارش چه می‌بینی؟
          </Link>
          <Link className={styles.discoverySecondary} href="/compare">
            تحلیل رابطه با دو چارت
          </Link>
          <Link className={styles.discoverySecondary} href="/privacy">
            قواعد انتشار و حریم خصوصی
          </Link>
        </div>
      </section>
    </div>
  );
}
