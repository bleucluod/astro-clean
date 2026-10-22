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

const r3CategoryCopy = {
  "aspects": {
    "heroTitle": "مسیر یادگیری جنبه‌ها و الگوهای چارت تولد",
    "heroIntro": [
      "جنبه‌ها رابطهٔ زاویه‌ای میان سیاره‌ها را نشان می‌دهند و کمک می‌کنند جایگاه‌ها را جدا از هم نخوانیم.",
      "از معنی خطوط داخل چارت شروع کن، بعد پنج جنبهٔ اصلی و اورب را بشناس و یاد بگیر چطور چند ارتباط سیاره‌ای به یک الگوی بزرگ‌تر تبدیل می‌شوند."
    ],
    "startTitle": "از پنج جنبهٔ اصلی شروع کن",
    "startText": "ابتدا پنج جنبهٔ اصلی را از هم تشخیص بده، سپس فاصلهٔ هر تماس تا زاویهٔ دقیق را با اورب بسنج و در آخر الگوهای مرتبط را در متن کل چارت بخوان.",
    "readingPath": [
      "پنج جنبهٔ اصلی و تفاوت نقش آن‌ها را بشناس.",
      "فاصلهٔ زاویه‌ای یا اورب هر جنبه را هنگام اولویت‌بندی در نظر بگیر.",
      "هیچ جنبه‌ای را جدا از سیاره‌ها و کل چارت حکم قطعی ندان."
    ]
  },
  "foundations": {
    "heroTitle": "آموزش آسترولوژی از صفر؛ مسیر یادگیری چارت تولد",
    "heroIntro": [
      "این مسیر برای زمانی است که می‌خواهی چارت تولد را از پایه بفهمی، نه اینکه میان اصطلاح‌های پراکنده گم شوی. اینجا اجزای اصلی چارت و تفاوت نقش هرکدام روشن می‌شود.",
      "بهتر است ابتدا ساختار کلی چارت را بشناسی، سپس روش خواندن و ترکیب سیاره، نشان و خانه را یاد بگیری؛ بعد می‌توانی سراغ دسته‌های تخصصی‌تر بروی."
    ],
    "startTitle": "از نقشهٔ کلی چارت شروع کن",
    "startText": "سه راهنمای زیر ستون‌های اصلی این مسیرند و برای خواندن مقاله‌های تخصصی‌تر پیش‌نیاز می‌سازند.",
    "readingPath": [
      "اول با اجزای چارت و داده‌های لازم آشنا شو.",
      "بعد ترتیب خواندن یک چارت کامل را یاد بگیر.",
      "در پایان فرق سیاره، نشان و خانه را در تفسیر تثبیت کن."
    ]
  }
} as const;

const r3FamousHeroTitle = "چارت تولد افراد مشهور؛ پروفایل‌های مستند و قابل‌اعتماد";
const r3FamousHeroIntro = ["چارت یک فرد مشهور وقتی جذاب‌تر می‌شود که بتوانی از پشتِ روایت زندگی او، داده‌های واقعی تولدش را ببینی. تاریخ تولد به ما می‌گوید سیاره‌ها در چه جایگاهی بوده‌اند؛ ساعت و محل تولد هم تعیین می‌کنند کدام خانه‌ها و محورهای چارت را می‌شود با دقت بررسی کرد. بدون این اطلاعات، حتی یک تفسیر خوش‌خوان هم ممکن است به نتیجه‌ای برسد که داده‌هایش پشتیبانی نمی‌کنند.","در مجموعهٔ چارت تولد افراد مشهور هالیوس سراغ ورزشکاران، خوانندگان، بازیگران، دانشمندان و چهره‌های تاریخی می‌روی. در هر پروفایل، اعتبار اطلاعات تولد باید کنار خودِ خوانش دیده شود؛ چون یک چارت با ساعت مستند را نمی‌شود با چارتی که فقط تاریخ تولدش معلوم است یکسان خواند. این تفاوت چیزی از جذابیت مقایسه کم نمی‌کند؛ کمک می‌کند بفهمی کدام بخش واقعاً به آن فرد تعلق دارد."] as const;
const r3FamousStartTitle = "از پروفایل‌هایی با دادهٔ تولد قوی شروع کن";
const r3FamousStartText = "برای شروع، می‌توانی پروفایل لیونل مسی و مرلین مونرو را در مجموعه دنبال کنی. مقایسهٔ این دو، پیش از هر تفسیر، یک سؤال مهم پیش می‌کشد: اطلاعات تولد هر کدام از کجا آمده و ساعت ثبت‌شده تا چه اندازه قابل اعتماد است؟ بعد از پاسخ‌دادن به همین سؤال می‌شود سراغ نشان‌ها، جنبه‌ها، رایزینگ و خانه‌ها رفت.";

const r3FamousStartExtra = ["پروفایل کریستیانو رونالدو و مقالهٔ تاریخ تولد اعضای BTS هم برای دیدن تفاوتِ میزان اطلاعات مفیدند. دربارهٔ ساعت تولد رونالدو گزارش‌های یکسانی وجود ندارد و نباید یکی از آن‌ها را بی‌دلیل قطعی گرفت. برای اعضای BTS نیز تاریخ تولد و نشان خورشیدی را می‌شود بررسی کرد، اما نبودِ ساعت معتبر مجوز ساختن رایزینگ یا خانه‌های خیالی نیست.","**از اینجا شروع کن:** اول منبع تاریخ و ساعت را بخوان، بعد ببین کدام قسمت‌های چارت محاسبه‌شدنی‌اند و در پایان تفسیر را کنار زندگی واقعی فرد قرار بده. این ترتیب باعث می‌شود داستان مشهورشدن یک نفر را به هر قیمتی به چارتش تحمیل نکنی."] as const;

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
  "famous-birth-charts": ["foundations", "planets"],
};

function renderR3CategoryInline(text: string) {
  return text.split(/(\[[^\]]+\]\(https:\/\/halleus\.ir\/[^)]+\))/g).map((part, index) => {
    const match = /^\[([^\]]+)\]\(https:\/\/halleus\.ir(\/[^)]+)\)$/.exec(part);
    return match ? <Link key={index} href={match[2]}>{match[1]}</Link> : part.replaceAll("**", "");
  });
}

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
          <h1 className={styles.heroTitle}>{categoryId === "famous-birth-charts" ? r3FamousHeroTitle : (categoryId === "aspects" || categoryId === "foundations") ? r3CategoryCopy[categoryId].heroTitle : categoryView.content.h1}</h1>
          {(categoryId === "famous-birth-charts" ? r3FamousHeroIntro : (categoryId === "aspects" || categoryId === "foundations") ? r3CategoryCopy[categoryId].heroIntro : categoryView.content.intro).map((paragraph, index) => (
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

      {categoryView.content.heroImage ? (
        <figure className={styles.articleMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={categoryView.content.heroImage.alt}
            height={675}
            loading="eager"
            src={categoryView.content.heroImage.src}
            width={1200}
          />
        </figure>
      ) : null}

      <section className={styles.section} aria-labelledby="category-start-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>از اینجا شروع کن</span>
            <h2 id="category-start-title">{categoryId === "famous-birth-charts" ? r3FamousStartTitle : (categoryId === "aspects" || categoryId === "foundations") ? r3CategoryCopy[categoryId].startTitle : categoryView.content.startTitle}</h2>
          </div>
          <p>{(categoryId === "aspects" || categoryId === "foundations") ? r3CategoryCopy[categoryId].startText : categoryId === "famous-birth-charts" ? r3FamousStartText : categoryView.content.startText}</p>
          {categoryId === "famous-birth-charts" ? r3FamousStartExtra.map((paragraph) => <p key={paragraph}>{renderR3CategoryInline(paragraph)}</p>) : null}
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
          {((categoryId === "aspects" || categoryId === "foundations") ? r3CategoryCopy[categoryId].readingPath : categoryView.content.readingPath).map((step, index) => (
            <div className={styles.guideStep} key={step}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      {categoryView.content.bodyImage ? (
        <figure className={styles.articleMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={categoryView.content.bodyImage.alt}
            height={675}
            loading="lazy"
            src={categoryView.content.bodyImage.src}
            width={1200}
          />
        </figure>
      ) : null}

      {r8Body ? (
        <section className={styles.section} data-r8-category-body="true">
          {r8Body.sections.map((section) => (
            <section className={styles.bodySection} key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{renderR3CategoryInline(paragraph)}</p>
              ))}

              {section.subsections.map((subsection) => (
                <div key={subsection.title}>
                  <h3>{subsection.title}</h3>
                  {subsection.paragraphs.map((paragraph) => <p key={paragraph}>{renderR3CategoryInline(paragraph)}</p>)}
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