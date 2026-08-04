import type { Metadata } from "next";
import Link from "next/link";

import { HomepageLiveSky } from "@/components/HomepageLiveSky";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { HOME_REPORT_PREVIEW_LAYERS } from "@/lib/report-preview/homepage-report-preview";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog, type PublicWikiArticle } from "@/lib/wiki/wiki-repository";

import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هالیوس | آسترولوژی فارسی، چارت تولد و تحلیل رابطه",
  description:
    "در هالیوس چارت تولد فارسی بساز، دو چارت را برای تحلیل خصوصی رابطه کنار هم بگذار، وضعیت واقعی آسمان امروز را ببین و آسترولوژی را مرحله‌به‌مرحله یاد بگیر.",
  alternates: { canonical: "/" },
};

const PRODUCT_PATHS = [
  {
    title: "چارت تولد فارسی",
    description: "تاریخ، ساعت و شهر تولد را به چارت واقعی و یک خوانش فارسی قابل‌فهم تبدیل کن.",
    href: "/chart",
    label: "ساخت چارت تولد",
    featured: true,
  },
  {
    title: "تحلیل رابطه",
    description: "دو چارت را بدون نمره‌سازی کنار هم ببین؛ از پیوند و گفت‌وگو تا مرز، اصطکاک و ترمیم.",
    href: "/compare",
    label: "شروع تحلیل رابطه",
    featured: false,
  },
  {
    title: "آسمان امروز",
    description: "جایگاه واقعی سیاره‌ها، وضعیت ماه و رویدادهای معتبر روز را برای یک شهر ببین.",
    href: "/sky",
    label: "دیدن آسمان امروز",
    featured: false,
  },
  {
    title: "ویکی هالیوس",
    description: "مفاهیم چارت، خانه‌ها، جنبه‌ها و دقت دادهٔ تولد را قدم‌به‌قدم یاد بگیر.",
    href: "/wiki",
    label: "ورود به ویکی",
    featured: false,
  },
] as const;

const LEARNING_PATH_SLUGS = [
  "birth-chart-basics",
  "sun-moon-rising",
  "astrology-houses",
  "why-birth-time-matters",
  "why-birth-city-matters",
] as const;

function selectLearningPaths(articles: PublicWikiArticle[]) {
  const selected = LEARNING_PATH_SLUGS
    .map((slug) => articles.find((article) => article.slug === slug))
    .filter((article): article is PublicWikiArticle => Boolean(article));
  const selectedSlugs = new Set(selected.map((article) => article.slug));
  return [...selected, ...articles.filter((article) => !selectedSlugs.has(article.slug))].slice(0, 5);
}

export default async function Home() {
  const [wikiResult, skyResult] = await Promise.allSettled([
    getPublicWikiCatalog(),
    deliverSkyPublicSnapshot({}),
  ]);
  const catalog = wikiResult.status === "fulfilled" ? wikiResult.value : { articles: [], categories: [] };
  const wikiArticles = sortPublicWikiArticlesNewestFirst(catalog.articles);
  const learningPaths = selectLearningPaths(wikiArticles);
  const sky = skyResult.status === "fulfilled" ? skyResult.value : null;

  return (
    <main className={styles.page} data-home-theme="halleus-ecosystem" data-product-surface="Halleus Home">
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>هالیوس؛ تجربهٔ فارسی آسترولوژی</span>
          <h1 id="home-title">آسترولوژی فارسی برای شناخت چارت تولد، رابطه‌ها و آسمان امروز</h1>
          <p className={styles.heroLead}>هالیوس اطلاعات تولد را محاسبه می‌کند و نتیجه را به شکلی فارسی و قابل‌مرور نشان می‌دهد. چارت خودت را بساز، دو چارت را برای یک تحلیل خصوصی رابطه کنار هم بگذار، وضعیت واقعی ماه و سیاره‌های امروز را ببین یا مفاهیم آسترولوژی را در ویکی یاد بگیر.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link>
            <Link className={styles.secondaryButton} href="/compare">تحلیل رابطه</Link>
            <Link className={styles.textButton} href="#birth-report-showcase">دیدن نمونه گزارش</Link>
          </div>
          <p className={styles.heroMicrocopy}>تاریخ شمسی یا میلادی فرقی ندارد. اگر ساعت دقیق را نمی‌دانی، باز می‌توانی شروع کنی و محدودیت‌ها را در نتیجه ببینی.</p>
        </div>

        <aside className={styles.heroPreview} aria-label="پیش‌نمایش واقعی ساختار گزارش هالیوس">
          <div className={styles.previewChrome}><span /><span /><span /><strong>نمونهٔ ساختار گزارش</strong></div>
          <div className={styles.previewBody}>
            <span>خوانش چارت تولد</span>
            <h2>از جایگاه‌های محاسبه‌شده تا یک روایت قابل مرور</h2>
            <div className={styles.previewLayers}>
              {HOME_REPORT_PREVIEW_LAYERS.slice(0, 4).map((layer) => <p key={layer.label}><strong>{layer.label}</strong><span>{layer.description}</span></p>)}
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.quickStart} aria-labelledby="quick-start-title">
        <header className={styles.sectionHeading}><span>شروع سریع</span><h2 id="quick-start-title">امروز از کدام مسیر شروع می‌کنی؟</h2></header>
        <div className={styles.productGrid}>
          {PRODUCT_PATHS.map((product) => <article className={`${styles.productCard} ${product.featured ? styles.productCardFeatured : ""}`} key={product.href}>
            <h3>{product.title}</h3><p>{product.description}</p><Link href={product.href}>{product.label}</Link>
          </article>)}
        </div>
      </section>

      <HomepageLiveSky result={sky} />

      <section className={styles.showcase} id="birth-report-showcase" aria-labelledby="birth-showcase-title">
        <header className={styles.sectionHeading}><span>گزارش تولد</span><h2 id="birth-showcase-title">چارت تولد فقط یک جدول نیست</h2><p>گزارش با یک تصویر کلی شروع می‌شود و بعد خورشید، ماه، رایزینگ، خانه‌ها، جنبه‌ها و الگوهای برجسته را در فصل‌هایی مرتبط کنار هم می‌گذارد. اگر ساعت تولد نامعلوم باشد، محدودیت رایزینگ و خانه‌ها پنهان نمی‌شود.</p></header>
        <HomepageProductProof />
        <div className={styles.sectionActions}><Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link><Link className={styles.secondaryButton} href="/product">آشنایی با ساختار گزارش</Link></div>
      </section>

      <section className={`${styles.showcase} ${styles.relationshipShowcase}`} aria-labelledby="relationship-showcase-title">
        <div><span className={styles.eyebrow}>تحلیل رابطه</span><h2 id="relationship-showcase-title">دو چارت، بدون درصد سازگاری و نتیجه‌گیری قطعی</h2><p>خوانش رابطه نقاط پیوند و اصطکاک را در گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها، رشد و ترمیم بررسی می‌کند. نتیجه همیشه خصوصی می‌ماند و دادهٔ خام تولد در رکورد تحلیل ذخیره نمی‌شود.</p><Link className={styles.primaryButton} href="/compare">مقایسهٔ دو چارت</Link></div>
        <div className={styles.relationshipSignals}>{["نقاط پیوند", "گفت‌وگو", "امنیت عاطفی", "نزدیکی و استقلال", "مرز و تعهد", "اصطکاک و ترمیم", "جهت رشد"].map((item) => <span key={item}>{item}</span>)}</div>
      </section>

      <section className={styles.howItWorks} aria-labelledby="how-title">
        <header className={styles.sectionHeading}><span>روش هالیوس</span><h2 id="how-title">از دادهٔ ورودی تا یک تجربهٔ قابل‌فهم</h2></header>
        <ol><li><strong>دادهٔ درست</strong><span>تاریخ، ساعت و شهر تولد یا شهر امروز را انتخاب می‌کنی.</span></li><li><strong>محاسبهٔ واقعی</strong><span>جایگاه‌ها و رابطه‌های نجومی از موتور مشترک هالیوس می‌آیند.</span></li><li><strong>خوانش انسانی</strong><span>داده به زبان فارسی، محتاط و بدون پیش‌بینی قطعی توضیح داده می‌شود.</span></li></ol>
      </section>

      <section className={styles.wikiSection} aria-labelledby="learning-title">
        <header className={styles.sectionHeading}><span>مسیرهای یادگیری</span><h2 id="learning-title">از کجا خواندن ویکی را شروع کنی؟</h2><p>این مسیرها مستقیماً از مقاله‌های منتشرشدهٔ کاتالوگ هالیوس ساخته می‌شوند.</p></header>
        {learningPaths.length ? <div className={styles.learningGrid}>{learningPaths.map((article) => <article key={article.slug}><h3><Link href={`/wiki/${article.slug}`}>{article.shortTitle}</Link></h3><p>{article.summary}</p></article>)}</div> : <p className={styles.emptyState}>مقالهٔ منتشرشده‌ای برای نمایش در این بخش در دسترس نیست.</p>}
        <div className={styles.wikiFooter}><span>{wikiArticles.length.toLocaleString("fa-IR")} مقالهٔ منتشرشده</span><Link className={styles.secondaryButton} href="/wiki">مشاهدهٔ همهٔ مقاله‌ها</Link></div>
      </section>

      <section className={styles.trustStrip} aria-label="اعتماد و حریم خصوصی">
        {["محاسبهٔ واقعی", "سیاست انتشار روشن", "گزارش مهمان و رایگان عمومی و ایندکس‌پذیر", "نسخهٔ پریمیوم خصوصی از ابتدا", "تحلیل رابطه همیشه خصوصی", "بدون پیش‌بینی قطعی", "بدون ارسال دادهٔ حساس به سنجش بازدید"].map((item) => <span key={item}>{item}</span>)}
        <Link href="/privacy">جزئیات حریم خصوصی</Link>
      </section>

      <section className={styles.faq} aria-labelledby="faq-title">
        <header className={styles.sectionHeading}><span>پرسش‌های رایج</span><h2 id="faq-title">پیش از شروع</h2></header>
        <div className={styles.faqGrid}>
          <details><summary>آیا هالیوس آینده را قطعی پیش‌بینی می‌کند؟</summary><p>خیر. هالیوس از زبان نمادین برای مشاهده و تأمل استفاده می‌کند و جایگزین تصمیم شخصی یا نظر تخصصی نیست.</p></details>
          <details><summary>تحلیل رابطه عمومی می‌شود؟</summary><p>خیر. مسیر مقایسه و نتیجهٔ آن خصوصی و خارج از ایندکس موتورهای جست‌وجو است.</p></details>
          <details><summary>آسمان صفحهٔ اصلی واقعی است؟</summary><p>بله. خلاصه از همان منبع محاسباتی صفحهٔ آسمان می‌آید و در نبود داده، مقدار ساختگی نمایش داده نمی‌شود.</p></details>
          <details><summary>برای چارت دقیق چه داده‌ای لازم است؟</summary><p>تاریخ، ساعت و شهر تولد ورودی‌های اصلی‌اند. دقت ساعت تولد روی رایزینگ و خانه‌ها اثر دارد.</p></details>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title"><div><span className={styles.eyebrow}>آماده‌ای شروع کنی؟</span><h2 id="final-cta-title">اولین مسیرت را انتخاب کن</h2><p>با چارت تولد شروع کن یا اگر دو چارت آماده داری، سراغ خوانش خصوصی رابطه برو.</p></div><div className={styles.finalCtaActions}><Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link><Link className={styles.secondaryButton} href="/compare">تحلیل رابطه</Link></div></section>
    </main>
  );
}
