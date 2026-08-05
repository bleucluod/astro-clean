import type { Metadata } from "next";
import Link from "next/link";

import { HomepageLiveSky } from "@/components/HomepageLiveSky";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هالیوس | آسترولوژی فارسی، چارت تولد و تحلیل رابطه",
  description:
    "در هالیوس چارت تولد فارسی بساز، دو چارت را برای تحلیل خصوصی رابطه کنار هم بگذار، وضعیت واقعی آسمان امروز را ببین و آسترولوژی را مرحله‌به‌مرحله یاد بگیر.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

const productPaths = [
  {
    number: "۰۱",
    title: "چارت تولد فارسی",
    description:
      "تاریخ، ساعت و شهر تولدت را وارد کن تا خورشید، ماه، رایزینگ، خانه‌ها و جنبه‌ها محاسبه شوند و نتیجه را در یک گزارش فارسی ببینی.",
    href: "/chart",
    action: "ساخت چارت تولد",
    tone: "chart",
  },
  {
    number: "۰۲",
    title: "تحلیل رابطه",
    description:
      "دو چارت را برای دیدن الگوهای گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و اصطکاک کنار هم بگذار؛ بدون درصد سازگاری یا حکم قطعی.",
    href: "/compare",
    action: "شروع تحلیل خصوصی",
    tone: "compare",
  },
  {
    number: "۰۳",
    title: "آسمان امروز",
    description:
      "جایگاه ماه و سیاره‌ها، فاز ماه، حرکت‌های برگشتی و رویدادهای نزدیک روز را براساس داده محاسبه‌شده ببین.",
    href: "/sky",
    action: "دیدن وضعیت امروز",
    tone: "sky",
  },
  {
    number: "۰۴",
    title: "ویکی هالیوس",
    description:
      "مفاهیم چارت تولد، رایزینگ، خانه‌ها، جنبه‌ها، ساعت تولد و ترنزیت‌ها را روشن و فارسی یاد بگیر.",
    href: "/wiki",
    action: "ورود به ویکی",
    tone: "wiki",
  },
] as const;

const relationshipContexts = ["عاطفی", "دوستی", "خانواده", "کاری", "عمومی"] as const;
const relationshipThemes = [
  "گفت‌وگو",
  "امنیت عاطفی",
  "نزدیکی",
  "مرزها",
  "اصطکاک",
  "رشد",
] as const;

const trustItems = [
  {
    title: "محاسبه واقعی",
    text: "جایگاه‌ها از موتور محاسبه هالیوس می‌آیند؛ نه از حدس یا متن تولیدشده.",
  },
  {
    title: "انتشار روشن",
    text: "گزارش‌های مهمان و حساب رایگان به‌صورت پیش‌فرض عمومی‌اند؛ گزارش Premium خصوصی شروع می‌شود.",
  },
  {
    title: "رابطه همیشه خصوصی",
    text: "تحلیل رابطه لینک عمومی ندارد و استفاده از اطلاعات نفر دوم نیازمند اجازه اوست.",
  },
  {
    title: "داده شخصی خارج از آمار",
    text: "داده تولد یا متن گزارش نباید برای آمار بازدید ارسال شوند.",
  },
] as const;

const faqItems = [
  {
    question: "هالیوس چیست؟",
    answer:
      "هالیوس یک تجربه فارسی برای ساخت چارت تولد، خواندن گزارش شخصی، تحلیل خصوصی رابطه، دیدن آسمان امروز و یادگیری مفاهیم آسترولوژی است.",
  },
  {
    question: "چارت تولد چگونه محاسبه می‌شود؟",
    answer:
      "تاریخ، ساعت و شهر تولد برای محاسبه جایگاه خورشید، ماه، سیاره‌ها، رایزینگ، خانه‌ها و جنبه‌ها استفاده می‌شوند. هرجا اطلاعات کافی نباشد، محدودیت نتیجه باید روشن نمایش داده شود.",
  },
  {
    question: "آیا ساخت چارت رایگان است؟",
    answer:
      "نسخه پایه چارت تولد رایگان است. مسیرهای عمیق‌تر و امکانات Premium می‌توانند قواعد دسترسی جداگانه داشته باشند.",
  },
  {
    question: "بدون ساعت دقیق تولد چه می‌شود؟",
    answer:
      "هنوز می‌توانی بخشی از چارت را ببینی، اما رایزینگ، خانه‌ها و محورهای اصلی قابل اتکای کامل نیستند و ممکن است جایگاه ماه نیز به ساعت حساس باشد.",
  },
  {
    question: "تحلیل رابطه چه فرقی با درصد سازگاری دارد؟",
    answer:
      "هالیوس درصد موفقیت نمی‌دهد و رابطه را خوب یا بد اعلام نمی‌کند. تحلیل روی گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها، اصطکاک و مسیرهای رشد تمرکز دارد.",
  },
  {
    question: "آسمان امروز از کجا می‌آید؟",
    answer:
      "صفحه آسمان از همان منبع محاسبه معتبر هالیوس استفاده می‌کند. داده ناقص یا قدیمی با برچسب امروز و عدد ساختگی جایگزین نمی‌شود.",
  },
  {
    question: "گزارش‌ها عمومی‌اند یا خصوصی؟",
    answer:
      "گزارش مهمان و حساب رایگان به‌صورت پیش‌فرض عمومی است. گزارش Premium خصوصی شروع می‌شود و تحلیل رابطه همیشه خصوصی می‌ماند. نمایش نام نیز انتخابی جداگانه می‌خواهد.",
  },
] as const;

export default async function Home() {
  const [catalogResult, skyResult] = await Promise.allSettled([
    getPublicWikiCatalog(),
    deliverSkyPublicSnapshot({}),
  ]);
  const catalog =
    catalogResult.status === "fulfilled"
      ? catalogResult.value
      : { articles: [], categories: [] };
  const articles = sortPublicWikiArticlesNewestFirst(catalog.articles);
  const sky = skyResult.status === "fulfilled" ? skyResult.value : null;

  const usedWikiSlugs = new Set<string>();
  const learningSeeds = [
    { title: "شروع از چارت تولد", keywords: ["چارت تولد", "چارت"] },
    { title: "خورشید، ماه و رایزینگ", keywords: ["خورشید", "ماه", "رایزینگ", "طالع"] },
    { title: "خانه‌ها و جنبه‌ها", keywords: ["خانه", "جنبه"] },
    { title: "ساعت و شهر تولد", keywords: ["ساعت تولد", "شهر تولد", "زمان تولد"] },
    { title: "ترنزیت‌ها و آسمان امروز", keywords: ["ترنزیت", "آسمان امروز", "سیاره"] },
  ];
  const learningPaths = learningSeeds.map((seed) => {
    const article =
      articles.find(
        (candidate) =>
          !usedWikiSlugs.has(candidate.slug) &&
          seed.keywords.some((keyword) =>
            `${candidate.title} ${candidate.shortTitle} ${candidate.summary}`.includes(keyword),
          ),
      ) ?? articles.find((candidate) => !usedWikiSlugs.has(candidate.slug));

    if (article) usedWikiSlugs.add(article.slug);

    return {
      title: seed.title,
      href: article ? `/wiki/${article.slug}` : "/wiki",
      articleTitle: article?.shortTitle ?? "ورود به مسیر آموزشی ویکی",
    };
  });

  return (
    <div
      className={styles.page}
      data-home-theme="halleus-soft-app"
      data-editorial-source="reviewed-public-editorial-home"
      data-product-surface="Halleus Home"
    >
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <div className={styles.heroAtmosphere} aria-hidden="true">
          <span className={styles.heroHalo} />
          <span className={styles.heroOrbitOne} />
          <span className={styles.heroOrbitTwo} />
          <span className={styles.heroPlanet} />
          <span className={styles.heroHorizon} />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>هالیوس؛ تجربه فارسی آسترولوژی</span>
          <h1 id="home-hero-title">
            آسترولوژی فارسی برای شناخت چارت تولد، رابطه‌ها و آسمان امروز
          </h1>
          <p className={styles.heroLead}>
            هالیوس اطلاعات تولد را محاسبه می‌کند و نتیجه را به شکلی فارسی و
            قابل‌مرور نشان می‌دهد. از چارت تولد و تحلیل خصوصی رابطه تا وضعیت
            واقعی آسمان امروز و آموزش مرحله‌به‌مرحله آسترولوژی.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/chart">
              ساخت چارت تولد
              <span aria-hidden="true">←</span>
            </Link>
            <Link className={styles.secondaryButton} href="/compare">
              تحلیل رابطه
            </Link>
          </div>

          <Link className={styles.heroTextLink} href="/product">
            دیدن نمونه گزارش
          </Link>

          <p className={styles.heroMicrocopy}>
            تاریخ شمسی یا میلادی فرقی ندارد. ساعت دقیق را هم نمی‌دانی؟ باز
            می‌توانی شروع کنی و محدودیت‌ها را در نتیجه ببینی.
          </p>
        </div>

        <div className={styles.heroSignal} aria-hidden="true">
          <span>موتور محاسبه هالیوس</span>
          <strong>داده واقعی، خوانش فارسی</strong>
          <i />
        </div>
      </section>

      <section className={styles.pathsSection} aria-labelledby="paths-title">
        <header className={styles.sectionHeaderCentered}>
          <h2 id="paths-title">از یک نقطه شروع کن؛ مسیرها به هم وصل‌اند</h2>
          <p>
            هالیوس یک مجموعه صفحه جدا از هم نیست. چارت تولد، تحلیل رابطه، آسمان
            امروز و ویکی چهار مسیر یک تجربه مشترک‌اند.
          </p>
        </header>

        <div className={styles.pathFlow}>
          <article className={styles.pathPrimary}>
            <div className={styles.pathPrimaryCopy}>
              <small>نقطه شروع پیشنهادی</small>
              <h3>{productPaths[0].title}</h3>
              <p>{productPaths[0].description}</p>
              <Link href={productPaths[0].href}>{productPaths[0].action}</Link>
            </div>

            <div className={styles.chartInterface} aria-hidden="true">
              <div className={styles.chartInterfaceTop}>
                <span />
                <span />
                <span />
                <small>birth-chart.halleus</small>
              </div>
              <div className={styles.miniChartWheel}>
                <span>☉</span>
                <span>☽</span>
                <span>ASC</span>
                <i />
              </div>
              <div className={styles.chartInterfaceLines}>
                <span />
                <span />
                <span />
              </div>
            </div>
          </article>

          <div className={styles.pathConnector} aria-hidden="true">
            <span />
          </div>

          <div className={styles.pathSecondaryGrid}>
            {productPaths.slice(1).map((path) => (
              <article
                className={styles.pathCard}
                key={path.href}
              >
                <h3>{path.title}</h3>
                <p>{path.description}</p>
                <Link href={path.href}>{path.action}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <HomepageLiveSky result={sky} />

      <section className={styles.productsSection} aria-labelledby="products-title">
        <header className={styles.sectionHeaderSplit}>
          <div>
            <h2 id="products-title">از داده خام تا روایتی که می‌شود خواند</h2>
          </div>
          <p>
            گزارش تولد و تحلیل رابطه دو خروجی متفاوت‌اند؛ هر دو بر داده واقعی،
            مرزهای روشن و زبان قابل‌فهم تکیه دارند.
          </p>
        </header>

        <div className={styles.productBento}>
          <HomepageProductProof />

          <article className={styles.relationshipPanel}>
            <div className={styles.relationshipHeader}>
              <span className={styles.productBadge}>تحلیل رابطه</span>
              <span className={styles.privateBadge}>همیشه خصوصی</span>
            </div>
            <h3>دو چارت را کنار هم بگذار؛ رابطه را بدون حکم قطعی بخوان</h3>
            <p>
              تحلیل رابطه هالیوس نشان می‌دهد دو نفر گفت‌وگو، امنیت، نزدیکی،
              فاصله و مرزها را چگونه تجربه می‌کنند.
            </p>

            <div className={styles.relationshipContexts} aria-label="نوع رابطه">
              {relationshipContexts.map((context) => (
                <span key={context}>{context}</span>
              ))}
            </div>

            <div className={styles.relationshipThemes}>
              {relationshipThemes.map((theme) => (
                <div key={theme}>
                  <strong>{theme}</strong>
                </div>
              ))}
            </div>

            <div className={styles.relationshipBoundary}>
              <strong>مرز خوانش</strong>
              <p>
                نتیجه درصد موفقیت نمی‌دهد، رابطه را خوب یا بد اعلام نمی‌کند و
                استفاده از اطلاعات نفر دوم نیازمند اجازه اوست.
              </p>
            </div>

            <Link className={styles.primaryButton} href="/compare">
              شروع تحلیل خصوصی رابطه
              <span aria-hidden="true">←</span>
            </Link>
          </article>
        </div>
      </section>

      <HomeHowItWorks />

      <section className={styles.wikiSection} aria-labelledby="wiki-title">
        <header className={styles.sectionHeaderSplit}>
          <div>
            <h2 id="wiki-title">آسترولوژی را فارسی و مرحله‌به‌مرحله یاد بگیر</h2>
          </div>
          <p>
            مسیرهای آموزشی از Catalog واقعی ویکی ساخته می‌شوند؛ عنوان یا URL
            حدسی به صفحه اضافه نمی‌شود.
          </p>
        </header>

        <div className={styles.wikiLayout}>
          <nav className={styles.learningPaths} aria-label="مسیرهای یادگیری ویکی">
            {learningPaths.map((path) => (
              <Link href={path.href} key={path.title}>
                <div>
                  <strong>{path.title}</strong>
                  <small>{path.articleTitle}</small>
                </div>
                <i aria-hidden="true">←</i>
              </Link>
            ))}
          </nav>

          <div className={styles.wikiRecent}>
            <span className={styles.productBadge}>تازه‌ترین مقاله‌ها</span>
            <div className={styles.wikiGrid}>
              {articles.slice(0, 4).map((article) => (
                <article className={styles.wikiCard} key={article.slug}>
                  <span>{article.categoryId}</span>
                  <h3>
                    <Link href={`/wiki/${article.slug}`}>{article.shortTitle}</Link>
                  </h3>
                  <p>{article.summary}</p>
                </article>
              ))}
            </div>
            <Link className={styles.secondaryButton} href="/wiki">
              ورود به ویکی هالیوس
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.trustSection} aria-labelledby="trust-title">
        <header className={styles.sectionHeaderCentered}>
          <h2 id="trust-title">محاسبه روشن، انتشار روشن</h2>
          <p>
            هالیوس ابزار پیش‌گویی قطعی نیست. داده محاسبه می‌شود، محدودیت‌ها دیده
            می‌شوند و انتخاب‌های انتشار از هم جدا می‌مانند.
          </p>
        </header>

        <div className={styles.trustGrid}>
          {trustItems.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <Link className={styles.textLink} href="/privacy">
          خواندن حریم خصوصی هالیوس
          <span aria-hidden="true">←</span>
        </Link>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-title">
        <div className={styles.faqMain}>
          <header>
            <h2 id="faq-title">قبل از شروع، پاسخ سؤال‌های اصلی را ببین</h2>
          </header>

          <div className={styles.faqList}>
            {faqItems.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>
                  <span>{item.question}</span>
                  <i aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <aside className={styles.faqTrustPanel}>
          <span className={styles.statusDot}>وضعیت هالیوس</span>
          <h3>داده واقعی، مرز روشن، استفاده مسئولانه</h3>
          <ul>
            <li>منبع محاسبه مشخص</li>
            <li>محدودیت ساعت نامعلوم</li>
            <li>تحلیل رابطه خصوصی</li>
            <li>بدون پیش‌بینی قطعی</li>
          </ul>
          <Link className={styles.primaryButton} href="/privacy">
            بررسی حریم خصوصی
          </Link>
        </aside>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div className={styles.finalCtaOrbit} aria-hidden="true" />
        <span className={styles.sectionIndex}>شروع مسیر</span>
        <h2 id="final-cta-title">از کدام مسیر شروع می‌کنی؟</h2>
        <p>یک انتخاب کافی است؛ بقیه مسیرها هر وقت لازم شوند کنار تو می‌مانند.</p>
        <div className={styles.finalCtaActions}>
          <Link className={styles.primaryButton} href="/chart">
            ساخت چارت تولد
          </Link>
          <Link className={styles.secondaryButton} href="/compare">
            تحلیل رابطه
          </Link>
          <Link className={styles.secondaryButton} href="/sky">
            دیدن آسمان امروز
          </Link>
          <Link className={styles.secondaryButton} href="/wiki">
            یادگیری در ویکی
          </Link>
        </div>
      </section>
    </div>
  );
}
