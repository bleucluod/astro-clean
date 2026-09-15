import type { Metadata } from "next";
import { buildPublicPageMetadata, siteConfig } from "@/lib/config/seo";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicWikiIndex } from "@/lib/wiki/wiki-repository";
import { getWikiCategoryR8Body } from "@/lib/wiki/wiki-category-r8-content";
import {
  buildPublicWikiCategoryViews,
  findPublicWikiCategoryView,
} from "@/lib/wiki/wiki-public-discovery";

import styles from "../../wiki.module.css";

type WikiCategoryPageProps = {
  params: Promise<{
    categoryId: string;
  }>;
};

export const dynamicParams = true;
export const revalidate = 300;

// HALLEUS_SITEWIDE_SEO_HOMEPAGE_REFRESH_R1
const RELATED_WIKI_CATEGORY_IDS: Record<string, readonly string[]> = {
  foundations: ["houses", "aspects"],
  houses: ["planets", "aspects"],
  aspects: ["planets", "houses"],
  transits: ["planets"],
  accuracy: ["foundations", "houses"],
  systems: ["foundations", "houses"],
  planets: ["aspects", "houses"],
};

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateStaticParams() {
  const { articles, categories } = await getPublicWikiIndex();

  return buildPublicWikiCategoryViews(articles, categories).map((view) => ({
    categoryId: view.category.id,
  }));
}

export async function generateMetadata({
  params,
}: WikiCategoryPageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const { articles, categories } = await getPublicWikiIndex();
  const categoryView = findPublicWikiCategoryView(
    categoryId,
    articles,
    categories,
  );

  if (!categoryView) {
    return {
      title: "دستهٔ ویکی پیدا نشد | هالیوس",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    ...buildPublicPageMetadata({
    title: categoryView.content.seoTitle,
    description: categoryView.content.metaDescription,
    canonical: `/wiki/category/${categoryView.category.id}`,
    }),
    robots: { index: true, follow: true },
  };
}

export default async function WikiCategoryPage({
  params,
}: WikiCategoryPageProps) {
  const { categoryId } = await params;
  const { articles, categories } = await getPublicWikiIndex();
  const categoryView = findPublicWikiCategoryView(
    categoryId,
    articles,
    categories,
  );

  if (!categoryView) {
    notFound();
  }

  const r8Body = getWikiCategoryR8Body(categoryId);
  const publicCategoryViews = buildPublicWikiCategoryViews(articles, categories);
  const publicCategoryById = new Map(
    publicCategoryViews.map((view) => [view.category.id, view.category]),
  );
  const relatedCategories = (RELATED_WIKI_CATEGORY_IDS[categoryId] ?? [])
    .flatMap((relatedId) => {
      const related = publicCategoryById.get(relatedId);
      return related ? [related] : [];
    })
    .slice(0, 3);
  const categoryUrl = `${siteConfig.url}/wiki/category/${categoryView.category.id}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${categoryUrl}#collectionpage`,
      url: categoryUrl,
      name: categoryView.content.h1,
      description: categoryView.content.metaDescription,
      inLanguage: "fa-IR",
      isPartOf: { "@id": `${siteConfig.url}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ویکی هالیوس",
          item: `${siteConfig.url}/wiki`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: categoryView.category.label,
          item: categoryUrl,
        },
      ],
    },
    ...(categoryView.pillarArticles.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "@id": `${categoryUrl}#start-here`,
            itemListElement: categoryView.pillarArticles.map((article, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: article.shortTitle,
              url: `${siteConfig.url}/wiki/${article.slug}`,
            })),
          },
        ]
      : []),
  ];

  return (
    <section
      className={styles.page}
      data-product-surface="Halleus Wiki Category"
    >
      {structuredData.map((schema, index) => (
        <script
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
          key={index}
          type="application/ld+json"
        />
      ))}

      <nav className={styles.breadcrumb} aria-label="مسیر دستهٔ ویکی">
        <Link href="/wiki">ویکی هالیوس</Link>
        <span aria-hidden="true">/</span>
        <span>{categoryView.category.label}</span>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>دستهٔ ویکی هالیوس</span>
          <h1 className={styles.heroTitle}>{categoryView.content.h1}</h1>
          {categoryView.content.intro.map((paragraph) => (
            <p className={styles.heroText} key={paragraph}>
              {paragraph}
            </p>
          ))}
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/chart">
              ساخت گزارش شخصی
            </Link>
            <Link className={styles.secondaryButton} href="/wiki">
              بازگشت به همهٔ مقاله‌ها
            </Link>
          </div>
        </div>
        <div className={styles.heroSummary}>
          <span>مقاله‌های منتشرشده</span>
          <strong>
            {categoryView.articles.length.toLocaleString("fa-IR")} مقاله
          </strong>
          <p>مقاله‌ها بر پایهٔ تازه‌ترین به‌روزرسانی مرتب شده‌اند.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="category-start-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>از اینجا شروع کن</span>
            <h2 id="category-start-title">{categoryView.content.startTitle}</h2>
          </div>
          <p>{categoryView.content.startText}</p>
        </div>

        <div className={styles.articleGrid}>
          {categoryView.pillarArticles.map((article, index) => (
            <article className={styles.articleCard} key={article.slug}>
              <div className={styles.articleTopline}>
                <span className={styles.categoryPill}>
                  گام {(index + 1).toLocaleString("fa-IR")}
                </span>

              </div>
              <h3>
                <Link
                  className={styles.articleTitleLink}
                  href={`/wiki/${article.slug}`}
                >
                  {article.shortTitle}
                </Link>
              </h3>
              <p>{article.summary}</p>
            </article>
          ))}
        </div>

        <div className={styles.guideGrid}>
          {categoryView.content.readingPath.map((step, index) => (
            <div className={styles.guideStep} key={step}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      {r8Body ? (
        <section className={styles.section} data-r8-category-body="true">
          {r8Body.sections.map((section) => (
            <section className={styles.bodySection} key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.subsections.map((subsection) => (
                <div key={subsection.title}>
                  <h3>{subsection.title}</h3>
                  {subsection.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              ))}
            </section>
          ))}
        </section>
      ) : null}

      {relatedCategories.length > 0 || categoryId === "transits" ? (
        <section className={styles.section} aria-labelledby="category-related-title">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>مسیرهای مرتبط</span>
              <h2 id="category-related-title">بعد از این دسته کجا برویم؟</h2>
            </div>
          </div>
          <div className={styles.guideGrid}>
            {relatedCategories.map((related) => (
              <div className={styles.guideStep} key={related.id}>
                <p>
                  <Link
                    className={styles.articleTitleLink}
                    href={`/wiki/category/${related.id}`}
                  >
                    {related.label}
                  </Link>
                </p>
              </div>
            ))}
            {categoryId === "transits" ? (
              <div className={styles.guideStep}>
                <p>
                  <Link className={styles.articleTitleLink} href="/sky">
                    آسمان امروز
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="category-articles-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>مسیر مطالعه</span>
            <h2 id="category-articles-title">
              همهٔ مقاله‌های {categoryView.category.label}
            </h2>
          </div>
          <p>
            عنوان هر مقاله را انتخاب کن؛ بعد از خواندن می‌توانی از لینک‌های
            مرتبط به مفاهیم نزدیک حرکت کنی.
          </p>
        </div>

        <div className={styles.articleGrid}>
          {categoryView.articles.map((article) => (
            <article className={styles.articleCard} key={article.slug}>
              <div className={styles.articleTopline}>
                <span className={styles.categoryPill}>
                  {categoryView.category.label}
                </span>

              </div>
              <h3>
                <Link
                  className={styles.articleTitleLink}
                  href={`/wiki/${article.slug}`}
                >
                  {article.shortTitle}
                </Link>
              </h3>
              <p>{article.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
