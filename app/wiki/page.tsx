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

const WIKI_BASE_URL = "https://halleus.ir";

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

const wikiGuideParagraphs = [
  "ویکی هالیوس برای این ساخته شده که مفاهیم آسترولوژی را از حالت جمله‌های پراکنده و کلیشه‌ای بیرون بیاورد. اینجا هر مقاله قرار است یک بخش مشخص از زبان چارت را روشن کند: سیاره‌ها چه نقشی دارند، نشان‌ها چه سبکی به آن نقش می‌دهند، خانه‌ها موضوع را در کدام میدان زندگی نشان می‌دهند و جنبه‌ها چطور این بخش‌ها را به هم وصل می‌کنند.",
  "اگر تازه شروع کرده‌ای، بهتر است اول سراغ چارت تولد، خورشید و ماه و طالع، خانه‌ها و جنبه‌های اصلی بروی. بعد از آن می‌توانی وارد موضوع‌های دقیق‌تر شوی؛ مثل اهمیت ساعت تولد، تفاوت شهر تولد، سیستم‌های خانه‌بندی، آسترولوژی تروپیکال و سایدرئال یا معنی ترنزیت‌ها در خوانش روزانه.",
  "هدف این صفحه این نیست که فهرست بلند و خسته‌کننده‌ای از لینک‌ها بسازد. صفحهٔ اصلی ویکی نقش نقشهٔ راه دارد: مسیرهای اصلی را نشان می‌دهد، مقاله‌های بنیادی هر دسته را جلو می‌آورد و تازه‌ترین به‌روزرسانی‌ها را جدا نگه می‌دارد. برای دیدن راهنماهای کامل هر موضوع، وارد صفحهٔ همان دسته شو.",
  "خواندن ویکی زمانی مفیدتر می‌شود که هر مفهوم را بعداً در چارت واقعی خودت ببینی. به همین دلیل هالیوس تلاش می‌کند بین آموزش عمومی و گزارش شخصی فاصلهٔ روشنی نگه دارد: مقاله‌ها زبان و چارچوب می‌دهند، اما نتیجهٔ دقیق‌تر وقتی ساخته می‌شود که تاریخ، ساعت و شهر تولد هم وارد محاسبه شوند.",
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

const wikiFaqs = [
  {
    question: "برای یادگیری آسترولوژی از کجا شروع کنم؟",
    answer:
      "از مقالهٔ چارت تولد شروع کن، بعد خورشید و ماه و طالع، خانه‌ها، جنبه‌ها و دقت ساعت تولد را بخوان. این ترتیب کمک می‌کند قبل از رفتن سراغ جزئیات، ساختار کلی چارت را بفهمی.",
  },
  {
    question: "چارت تولد بدون ساعت دقیق قابل خواندن است؟",
    answer:
      "بخشی از چارت بدون ساعت دقیق هم قابل بررسی است، اما رایزینگ، خانه‌ها و بعضی نقاط حساس می‌توانند نامطمئن شوند. برای همین هالیوس بین دادهٔ دقیق، تقریبی و نامعلوم فرق می‌گذارد.",
  },
  {
    question: "فرق ویکی هالیوس با فال روزانه چیست؟",
    answer:
      "ویکی هالیوس متن آموزشی است و مفهوم‌ها را توضیح می‌دهد. فال روزانه معمولاً پیش‌بینی کلی می‌دهد، اما اینجا تمرکز روی یادگیری زبان چارت، مرزهای خوانش و استفادهٔ مسئولانه از آسترولوژی است.",
  },
] as const;

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

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
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ویکی آسترولوژی هالیوس",
    description:
      "راهنمای فارسی آسترولوژی، چارت تولد، خانه‌ها، سیاره‌ها، جنبه‌ها، ترنزیت‌ها و دقت ساعت و شهر تولد.",
    inLanguage: "fa-IR",
    url: `${WIKI_BASE_URL}/wiki`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: categoryViews.map((categoryView, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: categoryView.category.label,
        url: `${WIKI_BASE_URL}/wiki/category/${categoryView.category.id}`,
      })),
    },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "fa-IR",
    mainEntity: wikiFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className={styles.page} data-product-surface="Halleus Wiki">
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        type="application/ld+json"
      />

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

      <section className={styles.prosePanel} aria-labelledby="wiki-guide-title">
        <span className={styles.sectionKicker}>راهنمای مطالعه</span>
        <h2 id="wiki-guide-title">ویکی هالیوس را چطور بخوانیم؟</h2>
        {wikiGuideParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="wiki-start-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>از اینجا شروع کن</span>
            <h2 id="wiki-start-title">سه مسیر اصلی برای شروع مطالعه</h2>
          </div>
          <p>
            این صفحه نقشهٔ راه ویکی است: اول یکی از مسیرهای اصلی را انتخاب کن،
            بعد در صفحهٔ هر دسته، مقاله‌های همان موضوع را منظم‌تر دنبال کن.
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
            <h2 id="wiki-map-title">مسیرهای اصلی ویکی آسترولوژی</h2>
          </div>
          <p>
            هر دسته چند مقالهٔ پیشنهادی برای شروع دارد. برای دیدن فهرست کامل،
            روی عنوان همان دسته برو.
          </p>
        </div>

        <div className={styles.categoryHubGrid}>
          {categoryViews.map((categoryView) => {
            const pillarSlugs = new Set(
              categoryView.pillarArticles.map((article) => article.slug),
            );
            const previewArticles = [
              ...categoryView.pillarArticles,
              ...categoryView.articles.filter(
                (article) => !pillarSlugs.has(article.slug),
              ),
            ].slice(0, categoryArticlePreviewLimit);
            const remainingCount =
              categoryView.articles.length - previewArticles.length;

            return (
              <article className={styles.categoryHubCard} key={categoryView.category.id}>
                <div>
                  <div className={styles.articleTopline}>
                    <span className={styles.categoryPill}>
                      {categoryView.articles.length.toLocaleString("fa-IR")} مقاله
                    </span>
                  </div>
                  <h3>
                    <Link
                      className={styles.categoryTitleLink}
                      href={`/wiki/category/${categoryView.category.id}`}
                    >
                      {categoryView.category.label}
                    </Link>
                  </h3>
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
                  <span className={styles.categoryStatus}>
                    {remainingCount.toLocaleString("fa-IR")} مقالهٔ دیگر در این مسیر
                  </span>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="wiki-latest-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>به‌روزرسانی‌ها</span>
            <h2 id="wiki-latest-title">آخرین به‌روزرسانی‌های ویکی آسترولوژی</h2>
          </div>
          <p>
            مقاله‌هایی که اخیراً منتشر یا ویرایش شده‌اند اینجا می‌آیند تا
            مسیرهای تازهٔ مطالعه از صفحهٔ اصلی ویکی هم قابل دسترسی باشند.
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

      <section className={styles.section} aria-labelledby="wiki-faq-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>پرسش‌های رایج</span>
            <h2 id="wiki-faq-title">قبل از شروع مطالعه بدان</h2>
          </div>
        </div>
        <div className={styles.faqGrid}>
          {wikiFaqs.map((item) => (
            <article className={styles.faqCard} key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
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
