import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/config/seo";
import Link from "next/link";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";
import {
  buildPublicWikiCategoryViews,
  sortPublicWikiArticlesNewestFirst,
} from "@/lib/wiki/wiki-public-discovery";
import styles from "./wiki.module.css";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadata({
  title: "ویکی آسترولوژی هالیوس | راهنمای فارسی چارت تولد",
  description: "راهنمای فارسی آسترولوژی، چارت تولد، زودیاک تروپیکال و سایدرئال، جیوتیش، خانه‌ها، جنبه‌ها و دقت ساعت و شهر تولد.",
  canonical: "/wiki",
});

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

const starterPaths = [
  {
    title: "چارت تولد را بفهم",
    text: "برای شروع، اول معنی چارت تولد، نقش سیاره‌ها و تفاوت خانه‌ها را روشن کن.",
    href: "/wiki/birth-chart-basics",
    linkLabel: "شروع از چارت تولد",
  },
  {
    title: "دقت ساعت و شهر را بسنج",
    text: "اگر ساعت یا شهر تولد دقیق نباشد، بعضی بخش‌های چارت باید با احتیاط خوانده شوند.",
    href: "/wiki/category/accuracy",
    linkLabel: "مسیر دقت داده‌ها",
  },
  {
    title: "خانه‌ها و زاویه‌ها را دنبال کن",
    text: "خانه‌ها نشان می‌دهند هر موضوع بیشتر در کدام میدان زندگی دیده می‌شود.",
    href: "/wiki/category/houses",
    linkLabel: "مسیر خانه‌های چارت",
  },
] as const;

export default async function WikiPage() {
  const { articles: catalogArticles, categories: wikiCategories } =
    await getPublicWikiCatalog();
  const wikiArticles = sortPublicWikiArticlesNewestFirst(catalogArticles);
  const categoryViews = buildPublicWikiCategoryViews(
    wikiArticles,
    wikiCategories,
  );
  const latestArticles = wikiArticles.slice(0, 12);
  const categoryArticlePreviewLimit = 5;

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
          <strong>{wikiArticles.length.toLocaleString("fa-IR")} مقالهٔ منتشرشده</strong>
          <p>مقاله‌های زنده و به‌هم‌پیوسته برای یادگیری مفاهیم و سنجیدن دقت داده‌های تولد.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="wiki-start-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>از اینجا شروع کن</span>
            <h2 id="wiki-start-title">سه مسیر اصلی برای شروع مطالعه</h2>
          </div>
          <p>
            این صفحه نقش نقشهٔ راه دارد: اول مسیرهای اصلی را انتخاب کن، بعد
            از صفحهٔ هر دسته به همهٔ مقاله‌های همان موضوع برس.
          </p>
        </div>

        <div className={styles.pathGrid}>
          {starterPaths.map((path) => (
            <Link className={styles.pathCard} href={path.href} key={path.href}>
              <span className={styles.categoryPill}>{path.linkLabel}</span>
              <h3>{path.title}</h3>
              <p>{path.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="wiki-map-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>نقشهٔ ویکی</span>
            <h2 id="wiki-map-title">مجموعه‌ای که مرحله‌به‌مرحله رشد می‌کند</h2>
          </div>
          <p>
            هر دسته صفحهٔ مستقل خودش را دارد تا مقاله‌های جدید سریع‌تر از
            مسیر داخلی کشف شوند، بدون اینکه صفحهٔ اصلی ویکی شلوغ شود.
          </p>
        </div>

        <div className={styles.categoryHubGrid}>
          {categoryViews.map((categoryView) => {
            const previewArticles = categoryView.articles.slice(
              0,
              categoryArticlePreviewLimit,
            );
            const remainingCount =
              categoryView.articles.length - previewArticles.length;

            return (
              <article className={styles.categoryHubCard} key={categoryView.category.id}>
                <div>
                  <div className={styles.articleTopline}>
                    <span className={styles.categoryPill}>
                      {categoryView.articles.length.toLocaleString("fa-IR")} مقاله
                    </span>
                    <Link
                      className={styles.articleLink}
                      href={`/wiki/category/${categoryView.category.id}`}
                    >
                      همهٔ مقاله‌ها
                      <span aria-hidden="true">←</span>
                    </Link>
                  </div>
                  <h3>{categoryView.category.label}</h3>
                  <p>{categoryView.category.description}</p>
                </div>
                <ul className={styles.compactLinkList}>
                  {previewArticles.map((article) => (
                    <li key={article.slug}>
                      <Link href={`/wiki/${article.slug}`}>{article.shortTitle}</Link>
                    </li>
                  ))}
                </ul>
                {remainingCount > 0 ? (
                  <Link
                    className={styles.categoryStatus}
                    href={`/wiki/category/${categoryView.category.id}`}
                  >
                    {remainingCount.toLocaleString("fa-IR")} مقالهٔ دیگر در این دسته
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="wiki-latest-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>تازه منتشر شده‌ها</span>
            <h2 id="wiki-latest-title">آخرین مقاله‌هایی که باید سریع‌تر دیده شوند</h2>
          </div>
          <p>
            این بخش کمک می‌کند مقاله‌های تازه از صفحهٔ اصلی ویکی هم لینک
            مستقیم بگیرند، اما صفحه همچنان خلوت و قابل اسکن بماند.
          </p>
        </div>

        <div className={styles.compactArticleGrid}>
          {latestArticles.map((article) => {
            const category = wikiCategories.find(
              (item) => item.id === article.categoryId,
            );

            return (
              <Link
                className={styles.compactArticleLink}
                href={`/wiki/${article.slug}`}
                key={article.slug}
              >
                <span>{category?.label ?? "ویکی هالیوس"}</span>
                <strong>{article.shortTitle}</strong>
                <small>{article.readingMinutes.toLocaleString("fa-IR")} دقیقه</small>
              </Link>
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
