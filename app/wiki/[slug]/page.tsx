import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRelatedWikiArticles,
  getWikiArticle,
  getWikiCategory,
  wikiArticles,
} from "@/lib/wiki/wiki-content";
import styles from "../wiki.module.css";

type WikiArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const WIKI_BASE_URL = "https://halleus.ir";

export const dynamicParams = false;

export function generateStaticParams() {
  return wikiArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: WikiArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getWikiArticle(slug);

  if (!article) {
    return {
      title: "مقاله پیدا نشد | ویکی هالیوس",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: article.seoTitle ?? `${article.title} | ویکی هالیوس`,
    description: article.metaDescription ?? article.summary,
    alternates: {
      canonical: `/wiki/${article.slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function WikiArticlePage({ params }: WikiArticlePageProps) {
  const { slug } = await params;
  const article = getWikiArticle(slug);

  if (!article) {
    notFound();
  }

  const category = getWikiCategory(article.categoryId);
  const relatedArticles = getRelatedWikiArticles(article);
  const articleUrl = `${WIKI_BASE_URL}/wiki/${article.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription ?? article.summary,
    inLanguage: "fa-IR",
    mainEntityOfPage: articleUrl,
    author: {
      "@type": "Organization",
      name: "Halleus",
      url: WIKI_BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Halleus",
      url: WIKI_BASE_URL,
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ویکی هالیوس",
        item: `${WIKI_BASE_URL}/wiki`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category?.label ?? "مقاله",
        item: articleUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: articleUrl,
      },
    ],
  };
  const callToAction = article.callToAction ?? {
    title: "تعریف وقتی واقعی می‌شود که به چارت شخصی وصل شود",
    text: "گزارش هالیوس جایگاه‌ها، خانه‌ها و جنبه‌های واقعی چارت را کنار هم می‌گذارد تا فقط با یک تعریف عمومی روبه‌رو نباشی.",
    label: "ساخت گزارش تولد",
    href: "/chart",
  };

  return (
    <section className={`${styles.page} ${styles.articlePage}`}>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />

      <nav className={styles.breadcrumb} aria-label="مسیر مقاله">
        <Link href="/wiki">ویکی هالیوس</Link>
        <span aria-hidden="true">/</span>
        <span>{category?.label}</span>
      </nav>

      <article className={styles.articleLayout}>
        <div className={styles.articleMain}>
          <header className={styles.articleHero}>
            <div className={styles.articleTopline}>
              <span className={styles.categoryPill}>{category?.label}</span>
              <span className={styles.articleMeta}>
                زمان مطالعه: {article.readingMinutes.toLocaleString("fa-IR")} دقیقه
              </span>
            </div>
            <h1>{article.title}</h1>
            <p>{article.intro}</p>
          </header>

          <section className={styles.keyPoints} aria-labelledby="key-points-title">
            <span className={styles.sectionKicker}>خلاصهٔ مقاله</span>
            <h2 id="key-points-title">سه نکته‌ای که باید با خودت ببری</h2>
            <ul>
              {article.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <div className={styles.articleBody}>
            {article.sections.map((section) => (
              <section className={styles.bodySection} key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className={styles.bodyList}>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {article.contextLinks?.length ? (
              <section className={styles.bodySection} aria-labelledby="article-links-title">
                <h2 id="article-links-title">برای ادامه بخوان</h2>
                <div className={styles.sideLinks}>
                  {article.contextLinks.map((link) => (
                    <Link href={link.href} key={`${link.href}-${link.label}`}>
                      <span>{link.label}</span>
                      <span aria-hidden="true">←</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {article.sources?.length ? (
              <section className={styles.bodySection} aria-labelledby="article-sources-title">
                <h2 id="article-sources-title">منابع و مطالعهٔ بیشتر</h2>
                <ul className={styles.bodyList}>
                  {article.sources.map((source) => (
                    <li key={source}>{source}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        <aside className={styles.articleAside}>
          <div className={styles.stickyAside}>
            <section className={styles.sideCard}>
              <span className={styles.sectionKicker}>در چارت خودت ببین</span>
              <h2>{callToAction.title}</h2>
              <p>{callToAction.text}</p>
              <Link className={styles.primaryButton} href={callToAction.href}>
                {callToAction.label}
              </Link>
            </section>

            <section className={styles.sideCard}>
              <span className={styles.sectionKicker}>مقاله‌های مرتبط</span>
              <div className={styles.sideLinks}>
                {relatedArticles.map((relatedArticle) => (
                  <Link href={`/wiki/${relatedArticle.slug}`} key={relatedArticle.slug}>
                    <span>{relatedArticle.shortTitle}</span>
                    <span aria-hidden="true">←</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </article>

      <section className={styles.relatedSection} aria-labelledby="related-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>ادامهٔ مسیر</span>
            <h2 id="related-title">حالا این مفهوم‌ها را کنار هم بگذار</h2>
          </div>
          <Link className={styles.articleLink} href="/wiki">
            بازگشت به همهٔ مقاله‌ها
            <span aria-hidden="true">←</span>
          </Link>
        </div>
        <div className={styles.relatedGrid}>
          {relatedArticles.map((relatedArticle) => (
            <Link
              className={styles.relatedCard}
              href={`/wiki/${relatedArticle.slug}`}
              key={relatedArticle.slug}
            >
              <span>{relatedArticle.shortTitle}</span>
              <p>{relatedArticle.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.safetyCard}>
        <div>
          <span className={styles.sectionKicker}>یادآوری</span>
          <h2>یک مقاله، حکم کامل دربارهٔ یک انسان نیست</h2>
          <p>
            جایگاه‌ها باید در بافت کل چارت خوانده شوند. این متن آموزشی و نمادین
            است و برای پیش‌بینی قطعی یا تصمیم‌های پزشکی، حقوقی و مالی نوشته نشده.
          </p>
        </div>
        <Link className={styles.secondaryButton} href="/wiki">
          نقشهٔ کامل ویکی
        </Link>
      </section>
    </section>
  );
}
