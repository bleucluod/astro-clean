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

          <h1 className={styles.title}>ساخت چارت تولد و گزارش تولد فارسی</h1>

          <p className={styles.lead}>
            تاریخ تولد، ساعت تولد و شهر تولد را وارد کن تا چارت تولدت ساخته
            شود. اگر ساعت دقیق را بدانی، رایزینگ، خانه‌ها و محورهای چارت با
            دقت بیشتری محاسبه می‌شوند. اگر هنوز بعضی داده‌ها را نمی‌دانی، قبل
            از ساخت گزارش می‌توانی راهنمای ساعت و شهر تولد را بخوانی.
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

      <section
        className={styles.discoveryBridge}
        data-chart-public-discovery="sky-wiki"
        aria-label="ادامه مسیر در هالیوس"
      >
        <div>
          <span className={styles.discoveryEyebrow}>ادامهٔ مسیر</span>
          <h2>گزارش تولد را کنار آسمان امروز و راهنماهای ویکی بخوان</h2>
          <p>
            بعد از ساخت چارت، می‌توانی وضعیت واقعی آسمان امروز را ببینی یا برای
            فهم بهتر سیاره‌ها، خانه‌ها و جنبه‌ها به ویکی هالیوس بروی.
          </p>
        </div>
        <div className={styles.discoveryActions}>
          <Link className={styles.discoveryPrimary} href="/sky">
            دیدن آسمان امروز
          </Link>
          <Link className={styles.discoverySecondary} href="/wiki">
            خواندن ویکی هالیوس
          </Link>
        </div>
      </section>
    </div>
  );
}
