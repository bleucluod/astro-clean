import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/config/seo";
import Link from "next/link";
import { WikiArticleBody, WikiInlineText, WikiKeyPoints } from "@/components/wiki/WikiArticleRender";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getPublicWikiArticleResolution,
  listPublicWikiRouteSlugs,
} from "@/lib/wiki/wiki-repository";
import styles from "../wiki.module.css";
import { WikiStickyCta } from "./WikiStickyCta";

type WikiArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const WIKI_BASE_URL = "https://halleus.ir";
const WIKI_ARTICLE_CONTENT_ID = "wiki-article-content";
const WIKI_INLINE_CTA_ID = "wiki-article-inline-cta";

export const dynamicParams = true;
export const revalidate = 300;

export async function generateStaticParams() {
  const routeSlugs = await listPublicWikiRouteSlugs();

  return routeSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: WikiArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolution = await getPublicWikiArticleResolution(slug);

  if (resolution.kind === "redirect") {
    return {
      alternates: {
        canonical: `/wiki/${resolution.targetSlug}`,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  if (resolution.kind === "missing") {
    return {
      title: "مقاله پیدا نشد | ویکی هالیوس",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { article } = resolution;

  return buildPublicPageMetadata({
    title: article.seoTitle ?? `${article.title} | ویکی هالیوس`,
    description: article.metaDescription ?? article.summary,
    canonical: `/wiki/${article.slug}`,
    type: "article",
    image: article.image
      ? { url: article.image.url, width: article.image.width, height: article.image.height, alt: article.image.alt }
      : undefined,
  });
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function WikiArticlePage({ params }: WikiArticlePageProps) {
  const { slug } = await params;
  const resolution = await getPublicWikiArticleResolution(slug);

  if (resolution.kind === "redirect") {
    permanentRedirect(`/wiki/${resolution.targetSlug}`);
  }

  if (resolution.kind === "missing") {
    notFound();
  }

  const {
    article,
    categories,
    clusterArticles,
    relatedArticles,
    internalLinkTargets,
  } = resolution;
  const category =
    categories.find((item) => item.id === article.categoryId) ?? null;
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
    ...(article.image
      ? { image: { "@type": "ImageObject", url: article.image.url, width: article.image.width, height: article.image.height } }
      : {}),
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
        item: category
          ? `${WIKI_BASE_URL}/wiki/category/${category.id}`
          : `${WIKI_BASE_URL}/wiki`,
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
        {category ? (
          <Link href={`/wiki/category/${category.id}`}>{category.label}</Link>
        ) : (
          <span>مقاله</span>
        )}
      </nav>

      <article className={styles.articleLayout}>
        <div className={styles.articleMain} id={WIKI_ARTICLE_CONTENT_ID}>
          <header className={styles.articleHero}>
            <div className={styles.articleTopline}>
              {category ? (
                <Link
                  className={styles.categoryPill}
                  href={`/wiki/category/${category.id}`}
                >
                  {category.label}
                </Link>
              ) : null}
              <span className={styles.articleMeta}>
                زمان مطالعه: {article.readingMinutes.toLocaleString("fa-IR")} دقیقه
              </span>
            </div>
            <h1>{article.title}</h1>
            <p><WikiInlineText text={article.intro} targets={internalLinkTargets} /></p>
          </header>

          {article.image ? (
            <figure className={styles.articleCover}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={article.image.alt}
                height={article.image.height}
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 720px) 100vw, (max-width: 1100px) 72vw, 760px"
                src={article.image.url}
                srcSet={article.image.srcSet}
                style={{ objectPosition: `${article.image.focalX * 100}% ${article.image.focalY * 100}%` }}
                width={article.image.width}
              />
              {article.image.caption ? <figcaption>{article.image.caption}</figcaption> : null}
            </figure>
          ) : null}

          <WikiKeyPoints keyPoints={article.keyPoints} targets={internalLinkTargets} />

          {clusterArticles.length ? (
            <section
              className={styles.bodySection}
              aria-labelledby="house-cluster-title"
            >
              <span className={styles.sectionKicker}>راهنمای ساختاری خانه‌ها</span>
              <h2 id="house-cluster-title">خانه‌های دوازده‌گانه را به‌ترتیب بخوان</h2>
              <p>
                هر خانه میدان متفاوتی از تجربه را نشان می‌دهد. برای دیدن تفاوت
                موضوع‌ها، از خانهٔ اول شروع کن یا مستقیم سراغ خانه‌ای برو که در
                چارتت برجسته است.
              </p>
              <div className={styles.sideLinks}>
                {clusterArticles.map((clusterArticle) => (
                  <Link
                    href={`/wiki/${clusterArticle.slug}`}
                    key={clusterArticle.slug}
                  >
                    <span>{clusterArticle.shortTitle}</span>
                    <span aria-hidden="true">←</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <WikiArticleBody
            sections={article.sections}
            contextLinks={article.contextLinks ?? []}
            sources={article.sources ?? []}
            targets={internalLinkTargets}
          />
        </div>

        <aside className={styles.articleAside}>
          <div className={styles.stickyAside}>
            <section className={styles.sideCard} id={WIKI_INLINE_CTA_ID}>
              <span className={styles.sectionKicker}>در چارت خودت ببین</span>
              <h2>{callToAction.title}</h2>
              <p>{callToAction.text}</p>
              <Link
                className={`${styles.primaryButton} ${styles.wikiArticleCta}`}
                href={callToAction.href}
              >
                {callToAction.label}
              </Link>
            </section>

          </div>
        </aside>
      </article>

      <WikiStickyCta
        callToAction={callToAction}
        contentRootId={WIKI_ARTICLE_CONTENT_ID}
        inlineCtaId={WIKI_INLINE_CTA_ID}
      />

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
