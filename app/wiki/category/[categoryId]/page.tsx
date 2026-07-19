import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";
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

export async function generateStaticParams() {
  const { articles, categories } = await getPublicWikiCatalog();

  return buildPublicWikiCategoryViews(articles, categories).map((view) => ({
    categoryId: view.category.id,
  }));
}

export async function generateMetadata({
  params,
}: WikiCategoryPageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const { articles, categories } = await getPublicWikiCatalog();
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
    title: `${categoryView.category.label} | ویکی هالیوس`,
    description: categoryView.category.description,
    alternates: {
      canonical: `/wiki/category/${categoryView.category.id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function WikiCategoryPage({
  params,
}: WikiCategoryPageProps) {
  const { categoryId } = await params;
  const { articles, categories } = await getPublicWikiCatalog();
  const categoryView = findPublicWikiCategoryView(
    categoryId,
    articles,
    categories,
  );

  if (!categoryView) {
    notFound();
  }

  return (
    <section
      className={styles.page}
      data-product-surface="Halleus Wiki Category"
    >
      <nav className={styles.breadcrumb} aria-label="مسیر دستهٔ ویکی">
        <Link href="/wiki">ویکی هالیوس</Link>
        <span aria-hidden="true">/</span>
        <span>{categoryView.category.label}</span>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>دستهٔ ویکی هالیوس</span>
          <h1 className={styles.heroTitle}>{categoryView.category.label}</h1>
          <p className={styles.heroText}>{categoryView.category.description}</p>
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

      <section className={styles.section} aria-labelledby="category-articles-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>مسیر مطالعه</span>
            <h2 id="category-articles-title">
              تازه‌ترین مقاله‌های {categoryView.category.label}
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
                <span className={styles.articleMeta}>
                  {article.readingMinutes.toLocaleString("fa-IR")} دقیقه
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
