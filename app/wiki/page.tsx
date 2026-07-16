import type { Metadata } from "next";
import Link from "next/link";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";
import styles from "./wiki.module.css";

export const metadata: Metadata = {
  title: "ویکی آسترولوژی هالیوس | راهنمای فارسی چارت تولد",
  description:
    "راهنمای فارسی آسترولوژی، چارت تولد، زودیاک تروپیکال و سایدرئال، جیوتیش، خانه‌ها، جنبه‌ها و دقت ساعت و شهر تولد.",
  alternates: {
    canonical: "/wiki",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const readingSteps = [
  {
    number: "۱",
    title: "از پایه شروع کن",
    text: "اول بفهم هر لایهٔ چارت چه سؤال متفاوتی را جواب می‌دهد.",
  },
  {
    number: "۲",
    title: "میان مقاله‌ها حرکت کن",
    text: "لینک‌های مرتبط کمک می‌کنند مفهوم‌ها را جدا و پراکنده نبینی.",
  },
  {
    number: "۳",
    title: "در چارت خودت ببین",
    text: "بعد از یادگیری مفهوم، جایگاه واقعی آن را در گزارش شخصی بررسی کن.",
  },
] as const;

export default async function WikiPage() {
  const { articles: wikiArticles, categories: wikiCategories } =
    await getPublicWikiCatalog();

  return (
    <section className={styles.page} data-product-surface="Halleus Wiki">
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>ویکی هالیوس</span>
          <h1 className={styles.heroTitle}>
            آسترولوژی را روشن، فارسی و بدون جمله‌های مبهم یاد بگیر
          </h1>
          <p className={styles.heroText}>
            این ویکی برای فهمیدن منطق چارت تولد ساخته شده است: هر سیاره چه
            نقشی دارد، خانه‌ها کدام میدان زندگی را نشان می‌دهند، جنبه‌ها
            چگونه بخش‌های مختلف چارت را به هم وصل می‌کنند و دقت ساعت و شهر
            تولد کدام بخش‌های گزارش را قابل اتکا می‌کند. تفاوت مکاتب و
            زودیاک‌های تروپیکال، سایدرئال و ودیک نیز جدا و روشن توضیح داده می‌شود.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/wiki/birth-chart-basics">
              از چارت تولد شروع کن
            </Link>
            <Link className={styles.secondaryButton} href="/chart">
              ساخت گزارش شخصی
            </Link>
          </div>
        </div>
        <div className={styles.heroSummary}>
          <span>شروع مجموعه</span>
          <strong>{wikiArticles.length.toLocaleString("fa-IR")} مقالهٔ پایه</strong>
          <p>مقاله‌های به‌هم‌پیوسته برای یادگیری مفاهیم و سنجیدن دقت داده‌های تولد.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="wiki-start-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>از اینجا شروع کن</span>
            <h2 id="wiki-start-title">از مفاهیم پایه تا دقت ساعت و شهر تولد</h2>
          </div>
          <p>
            از تعریف آسترولوژی و چارت تولد شروع کن، بعد به دقت داده و تفاوت
            تروپیکال، سایدرئال و جیوتیش برس. مقاله‌ها روی یک زبان مشترک و
            لینک‌های داخلی به‌هم‌پیوسته ساخته شده‌اند.
          </p>
        </div>

        <div className={styles.articleGrid}>
          {wikiArticles.map((article) => {
            const category = wikiCategories.find(
              (item) => item.id === article.categoryId,
            );

            return (
              <article className={styles.articleCard} key={article.slug}>
                <div className={styles.articleTopline}>
                  <span className={styles.categoryPill}>{category?.label}</span>
                  <span className={styles.articleMeta}>
                    {article.readingMinutes.toLocaleString("fa-IR")} دقیقه
                  </span>
                </div>
                <h3>{article.shortTitle}</h3>
                <p>{article.summary}</p>
                <Link className={styles.articleLink} href={`/wiki/${article.slug}`}>
                  خواندن مقاله
                  <span aria-hidden="true">←</span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="wiki-map-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>نقشهٔ ویکی</span>
            <h2 id="wiki-map-title">مجموعه‌ای که مرحله‌به‌مرحله رشد می‌کند</h2>
          </div>
          <p>
            مقاله‌های بنیادی، کلاستر دقت داده و راهنمای مکاتب اصلی منتشر
            شده‌اند؛ دسته‌های بعدی پس از بررسی کیفیت اضافه می‌شوند.
          </p>
        </div>

        <div className={styles.categoryGrid}>
          {wikiCategories.map((category) => {
            const articleCount = wikiArticles.filter(
              (article) => article.categoryId === category.id,
            ).length;

            return (
              <div className={styles.categoryCard} key={category.id}>
                <div>
                  <h3>{category.label}</h3>
                  <p>{category.description}</p>
                </div>
                <span className={styles.categoryStatus}>
                  {articleCount > 0
                    ? `${articleCount.toLocaleString("fa-IR")} مقاله`
                    : "در صف ساخت"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="wiki-use-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>روش استفاده</span>
            <h2 id="wiki-use-title">از تعریف ساده تا مشاهده در چارت خودت</h2>
          </div>
        </div>
        <div className={styles.guideGrid}>
          {readingSteps.map((step) => (
            <div className={styles.guideStep} key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.safetyCard}>
        <div>
          <span className={styles.sectionKicker}>مرز خوانش</span>
          <h2>زبان ویکی نمادین و تفسیری است</h2>
          <p>
            این مقاله‌ها برای یادگیری سنت آسترولوژی و خودشناسی نمادین نوشته
            شده‌اند. آن‌ها جای تشخیص پزشکی، مشاورهٔ حقوقی یا مالی و تصمیم قطعی
            زندگی را نمی‌گیرند.
          </p>
        </div>
        <Link className={styles.secondaryButton} href="/product">
          هالیوس چگونه کار می‌کند؟
        </Link>
      </section>
    </section>
  );
}
