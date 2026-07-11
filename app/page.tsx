import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { HomepageProductProof } from "@/components/HomepageProductProof";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { SkyPulseDateCard } from "@/components/SkyPulseDateCard";
import { wikiArticles, wikiCategories } from "@/lib/wiki/wiki-content";

import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "هالیوس | گزارش تولد فارسی، آسمان امروز و ویکی آسترولوژی",
  description:
    "هالیوس چارت تولد را به گزارشی فارسی و قابل‌فهم تبدیل می‌کند، آسمان امروز را نشان می‌دهد و با ویکی فارسی به خواندن دقیق‌تر چارت کمک می‌کند.",
  alternates: {
    canonical: "/",
  },
};

const zodiacSymbols = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const productHighlights = [
  {
    icon: "✦",
    title: "گزارش تولد شخصی",
    description: "یک خوانش فارسی از خورشید، ماه، رایزینگ، خانه‌ها، جنبه‌ها و الگوهای برجستهٔ چارت.",
    href: "/chart",
    label: "ساخت گزارش",
  },
  {
    icon: "◐",
    title: "آسمان امروز",
    description: "نبض عمومی آسمان و ترنزیت روزانهٔ تهران، بر پایهٔ محاسبه و بدون پیش‌گویی قطعی.",
    href: "#sky-pulse",
    label: "دیدن نبض امروز",
  },
  {
    icon: "⌁",
    title: "ویکی هالیوس",
    description: `${wikiArticles.length.toLocaleString("fa-IR")} مقالهٔ فارسی برای فهم چارت، سیاره‌ها، خانه‌ها و دقت داده‌های تولد.`,
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

const trustItems = [
  {
    number: "۰۱",
    title: "دادهٔ واقعی تولد",
    text: "تاریخ، ساعت و شهر تولد مبنای محاسبه‌اند؛ نه جمله‌های تصادفی یا تست شخصیتی عمومی.",
  },
  {
    number: "۰۲",
    title: "خوانش ترکیبی",
    text: "گزارش فقط placementها را ردیف نمی‌کند و میان سیاره، نشان، خانه و جنبه ارتباط می‌سازد.",
  },
  {
    number: "۰۳",
    title: "زبان غیرقطعی",
    text: "هالیوس الگوها و امکان‌ها را توضیح می‌دهد؛ نه سرنوشت، تشخیص یا تصمیم قطعی زندگی.",
  },
] as const;

const featuredWikiSlugs = new Set([
  "how-to-read-birth-chart",
  "what-is-birth-chart-interpretation",
  "what-is-rising-sign",
  "what-is-moon-sign",
]);

const featuredWikiArticles = wikiArticles
  .filter((article) => featuredWikiSlugs.has(article.slug))
  .slice(0, 4);

export default function Home() {
  return (
    <div className={styles.page} data-home-theme="halleus-soft-app" data-product-surface="Halleus Home">
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>گزارش تولد فارسی، روشن و شخصی</span>
          <h1 id="home-title">نقشهٔ واقعی زندگی تو، بر اساس آسمان لحظهٔ تولد</h1>
          <p className={styles.heroLead}>
            هالیوس داده‌های واقعی چارت تولدت را به یک گزارش فارسی و انسانی تبدیل می‌کند؛ گزارشی برای دیدن الگوهای شخصی، نیازهای احساسی، رابطه‌ها و مسیر رشد.
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

      <section className={styles.splitSection} id="sky-pulse" aria-labelledby="sky-pulse-title">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>نبض آسمان امروز</span>
          <h2 id="sky-pulse-title">حال‌وهوای آسمان را ببین، بدون اینکه آن را سرنوشت بدانی</h2>
          <p>
            این بخش یک خوانش عمومی و رایگان از ماه اکنون، فاز ماه و جنبه‌های مهم ترنزیت روزانهٔ تهران است. برای خوانش شخصی، چارت تولد تو باید جداگانه محاسبه شود.
          </p>
          <Link className={styles.textLink} href="/chart">
            ساخت گزارش شخصی
            <span aria-hidden="true">←</span>
          </Link>
        </div>
        <div className={styles.embeddedCard}>
          <SkyPulseDateCard />
        </div>
      </section>

      <section className={styles.reportSection} id="sample-report" aria-labelledby="sample-report-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>نمونهٔ واقعی محصول</span>
            <h2 id="sample-report-title">گزارش هالیوس باید شبیه یک روایت منسجم خوانده شود</h2>
          </div>
          <p>
            از توضیح سه‌گانهٔ اصلی تا خانه‌ها، جنبه‌ها و جمع‌بندی؛ هر بخش باید به ساختار واقعی همان چارت وصل باشد.
          </p>
        </div>
        <div className={styles.productProofWrap}>
          <HomepageProductProof />
        </div>
      </section>

      <section className={styles.wikiSection} aria-labelledby="home-wiki-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>ویکی هالیوس</span>
            <h2 id="home-wiki-title">قبل و بعد از گزارش، منطق چارت را به زبان ساده یاد بگیر</h2>
          </div>
          <p>
            ویکی حالا بخشی واقعی از محصول است؛ با {wikiArticles.length.toLocaleString("fa-IR")} مقالهٔ فارسی و لینک‌های داخلی برای حرکت مرحله‌به‌مرحله میان مفاهیم.
          </p>
        </div>

        <div className={styles.wikiGrid}>
          {featuredWikiArticles.map((article) => {
            const category = wikiCategories.find((item) => item.id === article.categoryId);

            return (
              <article className={styles.wikiCard} key={article.slug}>
                <div className={styles.wikiCardTopline}>
                  <span>{category?.label ?? "ویکی هالیوس"}</span>
                  <small>{article.readingMinutes.toLocaleString("fa-IR")} دقیقه</small>
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
            <span>از مفاهیم پایه تا دقت ساعت و شهر تولد</span>
          </div>
          <Link className={styles.secondaryButton} href="/wiki">
            مشاهدهٔ همهٔ مقاله‌ها
          </Link>
        </div>
      </section>

      <section className={styles.trustSection} aria-labelledby="trust-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>دقت و اعتماد</span>
            <h2 id="trust-title">ظاهر تازه، بدون کم‌کردن از مرزهای فنی و اخلاقی</h2>
          </div>
          <p>طراحی جدید باید محصول را روشن‌تر کند، نه اینکه با آمار و قابلیت‌های ساختگی آن را بزرگ‌تر از واقعیت نشان دهد.</p>
        </div>
        <div className={styles.trustGrid}>
          {trustItems.map((item) => (
            <article className={styles.trustCard} key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div>
          <span className={styles.sectionKicker}>شروع از دادهٔ واقعی تو</span>
          <h2 id="final-cta-title">چارت تولدت را بساز و از یک خوانش پراکنده عبور کن</h2>
          <p>اطلاعات تولد را وارد کن، گزارش فارسی را ببین و بعد با کمک ویکی بخش‌های مختلف آن را دقیق‌تر بخوان.</p>
        </div>
        <div className={styles.finalCtaActions}>
          <Link className={styles.primaryButton} href="/chart">
            شروع ساخت گزارش
          </Link>
          <Link className={styles.secondaryButton} href="/reports">
            گزارش‌های من
          </Link>
        </div>
      </section>

      <div className={styles.disclaimerWrap}>
        <SafetyDisclaimer />
      </div>
    </div>
  );
}
