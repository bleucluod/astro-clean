import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { HomepageProductProof } from "@/components/HomepageProductProof";
import { SkyPulseDateCard } from "@/components/SkyPulseDateCard";
import { wikiArticles, wikiCategories } from "@/lib/wiki/wiki-content";

import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "هالیوس | گزارش تولد فارسی و چارت تولد",
  description:
    "در هالیوس با تاریخ، ساعت و شهر تولد، چارت تولدت را بساز و گزارش تولد فارسی بگیر. آسمان امروز و ویکی آسترولوژی فارسی هم کنار گزارش تولد در دسترس‌اند.",
  alternates: {
    canonical: "/",
  },
};

const zodiacSymbols = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const productHighlights = [
  {
    icon: "✦",
    title: "گزارش تولد شخصی",
    description: "گزارش تولد فارسی بر پایهٔ چارت تولد واقعی؛ با خورشید، ماه، رایزینگ، خانه‌ها، جنبه‌ها و الگوهای برجستهٔ چارت.",
    href: "/chart",
    label: "ساخت چارت تولد",
  },
  {
    icon: "◐",
    title: "آسمان امروز",
    description: "حال‌وهوای عمومی آسمان امروز، ماه اکنون، فاز ماه و چند جنبهٔ مهم ترنزیت روزانهٔ تهران.",
    href: "#sky-pulse",
    label: "دیدن نبض امروز",
  },
  {
    icon: "◫",
    title: "ویکی هالیوس",
    description: `${wikiArticles.length.toLocaleString("fa-IR")} مقاله در ویکی آسترولوژی فارسی برای فهم چارت، رایزینگ، خانه‌ها و دقت داده‌های تولد.`,
    href: "/wiki",
    label: "ورود به ویکی",
  },
  {
    icon: "◇",
    title: "حریم خصوصی روشن",
    description: "گزارش شخصی بدون رضایت روشن تو عمومی و قابل ایندکس نمی‌شود.",
    href: "/privacy",
    label: "خواندن سیاست حریم",
  },
] as const;

const featuredWikiSlugs = new Set([
  "how-to-read-birth-chart",
  "birth-chart-basics",
  "why-birth-time-matters",
  "why-birth-city-matters",
  "what-is-rising-sign",
]);

const featuredWikiArticles = wikiArticles
  .filter((article) => featuredWikiSlugs.has(article.slug))
  .slice(0, 5);

export default function Home() {
  return (
    <div className={styles.page} data-home-theme="halleus-soft-app" data-product-surface="Halleus Home">
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>گزارش تولد فارسی بر پایهٔ چارت تولد واقعی</span>
          <h1 id="home-title">
            <span className={styles.heroTitleLine}>تو حاصل لحظه‌ای هستی که</span>
            <span className={styles.heroTitleLine}>
              آسمان و زمین با هم داستانی نو نوشتند.
            </span>
          </h1>
          <p className={styles.heroLead}>
            هالیوس با تاریخ، ساعت و شهر تولد، چارت تولدت را محاسبه می‌کند و آن را به یک گزارش فارسی، انسانی و قابل‌فهم تبدیل می‌کند؛ گزارشی برای دیدن الگوهای شخصی، نیازهای احساسی، رابطه‌ها و مسیر رشد.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/chart">
              ساخت چارت تولد
              <span aria-hidden="true">←</span>
            </Link>
            <Link className={styles.secondaryButton} href="#sample-report">
              مشاهدهٔ نمونهٔ گزارش
            </Link>
          </div>
          <div className={styles.heroMeta} aria-label="ویژگی‌های اصلی هالیوس">
            <span>محاسبه با تاریخ، ساعت و شهر تولد</span>
            <span>گزارش خصوصی</span>
            <span>فارسی و قابل‌فهم</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="نمای نمادین چرخ چارت تولد">
          <div className={styles.visualBadge}>
            <span>چارت تولد</span>
            <strong>۱۲ خانه، ۱۰ سیاره، یک روایت شخصی</strong>
          </div>
          <div className={styles.chartWheel} aria-hidden="true">
            <div className={styles.outerOrbit} />
            <div className={styles.middleOrbit} />
            <div className={styles.innerOrbit} />
            {zodiacSymbols.map((symbol, index) => {
              const angle = index * 30;
              const symbolStyle = {
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-142px) rotate(${-angle}deg)`,
              } as CSSProperties;

              return (
                <span className={styles.zodiacSymbol} key={symbol} style={symbolStyle}>
                  {symbol}
                </span>
              );
            })}
            <span className={`${styles.aspectLine} ${styles.aspectLineOne}`} />
            <span className={`${styles.aspectLine} ${styles.aspectLineTwo}`} />
            <span className={`${styles.aspectLine} ${styles.aspectLineThree}`} />
            <span className={`${styles.aspectLine} ${styles.aspectLineFour}`} />
            <div className={styles.chartCore}>
              <span>هالیوس</span>
              <small>خوانش فارسی چارت</small>
            </div>
          </div>
          <div className={styles.visualNote}>
            <span className={styles.visualNoteIcon}>⌁</span>
            <div>
              <strong>محاسبهٔ واقعی و قابل پیگیری</strong>
              <p>جایگاه‌ها، خانه‌ها و جنبه‌ها از دادهٔ تولد ساخته می‌شوند.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.highlightGrid} aria-label="امکانات اصلی هالیوس">
        {productHighlights.map((item) => (
          <article className={styles.highlightCard} key={item.title}>
            <span className={styles.highlightIcon} aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <Link href={item.href}>{item.label}</Link>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.splitSection} id="sky-pulse" aria-labelledby="home-sky-pulse-title">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>آسمان امروز</span>
          <h2 id="home-sky-pulse-title">نبض آسمان امروز؛ حال‌وهوای عمومی آسمان</h2>
          <p>
            هر روز یک خوانش عمومی از ماه اکنون، فاز ماه و چند جنبهٔ مهم ترنزیت روزانهٔ تهران. این بخش برای دیدن حال‌وهوای آسمان است؛ برای خوانش شخصی، چارت تولد خودت را جداگانه بساز.
          </p>
          <Link className={styles.textLink} href="/chart">
            ساخت چارت تولد شخصی
            <span aria-hidden="true">←</span>
          </Link>
        </div>
        <div className={styles.embeddedCard}>
          <SkyPulseDateCard />
        </div>
      </section>

      <section className={styles.reportSection} id="sample-report" aria-labelledby="sample-report-title">
        <div className={styles.productProofWrap}>
          <div className={styles.productProofHeading}>
            <span className={styles.sectionKicker}>نمونهٔ واقعی محصول</span>
            <h2 id="sample-report-title">یک بخش کوتاه از گزارش تولد هالیوس</h2>
          </div>
          <HomepageProductProof />
        </div>
      </section>

      <section className={styles.wikiSection} aria-labelledby="home-wiki-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>ویکی هالیوس</span>
            <h2 id="home-wiki-title">قبل و بعد از ساخت گزارش، منطق چارت را یاد بگیر</h2>
          </div>
          <p>
            ویکی هالیوس مجموعه‌ای از {wikiArticles.length.toLocaleString("fa-IR")} مقالهٔ فارسی دربارهٔ چارت تولد، رایزینگ، نشان ماه، خانه‌ها، جنبه‌ها و اهمیت ساعت و شهر تولد است؛ تا قبل از ساخت گزارش بدانی چه داده‌ای وارد می‌کنی و بعد از گزارش هم بتوانی بخش‌هایش را بهتر بخوانی.
          </p>
        </div>

        <div className={styles.wikiGrid}>
          {featuredWikiArticles.map((article) => {
            const category = wikiCategories.find((item) => item.id === article.categoryId);

            return (
              <article className={styles.wikiCard} key={article.slug}>
                <div className={styles.wikiCardTopline}>
                  <span>{category?.label ?? "ویکی هالیوس"}</span>
                </div>
                <h3>{article.shortTitle}</h3>
                <p>{article.summary}</p>
                <Link href={`/wiki/${article.slug}`}>
                  خواندن مقاله
                  <span aria-hidden="true">←</span>
                </Link>
              </article>
            );
          })}
        </div>

        <div className={styles.wikiFooter}>
          <div>
            <strong>{wikiArticles.length.toLocaleString("fa-IR")} مقالهٔ منتشرشده</strong>
            <span>از مفاهیم پایه تا دقت داده‌های تولد</span>
          </div>
          <Link className={styles.secondaryButton} href="/wiki">
            مشاهدهٔ همهٔ مقاله‌ها
          </Link>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div>
          <span className={styles.sectionKicker}>شروع از دادهٔ واقعی تو</span>
          <h2 id="final-cta-title">چارت تولدت را بساز و از یک خوانش پراکنده عبور کن</h2>
          <p>اطلاعات تولد را وارد کن، گزارش فارسی را ببین و بعد با کمک ویکی بخش‌های مختلف آن را دقیق‌تر بخوان.</p>
        </div>
        <div className={styles.finalCtaActions}>
          <Link className={styles.secondaryButton} href="/chart">
            ساخت چارت تولد
          </Link>
        </div>
      </section>
    </div>
  );
}
