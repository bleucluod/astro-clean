import { R3ApprovedVisibleCopy } from "@/components/r3-approved-visible-copy";
// HALLEUS_SITEWIDE_SEO_HOMEPAGE_REFRESH_R1
import type { Metadata } from "next";
import { buildPublicPageMetadata, siteConfig } from "@/lib/config/seo";
import { IntentPrefetchLink } from "@/components/IntentPrefetchLink";

import { HomepageLiveSky } from "@/components/HomepageLiveSky";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiIndex } from "@/lib/wiki/wiki-repository";
import { getPublicReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";

import styles from "./home.module.css";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadata({
  title: "هالیوس | آسترولوژی فارسی، چارت تولد، رابطه‌ها و آسمان امروز",
  description:
    "در هالیوس چارت تولدت را بساز، گزارش فارسی و شخصی‌ات را بخوان، چارت ازدواج و سیناستری دو نفر را برای تحلیل رابطه ببین و وضعیت واقعی آسمان امروز را دنبال کن.",
  canonical: "/",
});

const productPaths = [
  {
    number: "۰۱",
    title: "چارت تولد فارسی",
    description:
      "جایگاه سیاره‌ها، رایزینگ، خانه‌ها و جنبه‌ها را ببین و گزارش شخصی چارتت را بخوان.",
    href: "/chart",
    action: "ساخت چارت تولد",
  },
  {
    number: "۰۲",
    title: "چارت ازدواج و سیناستری",
    description:
      "دو چارت را کنار هم بگذار و کشش، گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و مسیرهای رشد رابطه را ببین.",
    href: "/compare",
    action: "ساخت چارت ازدواج",
  },
  {
    number: "۰۳",
    title: "آسمان امروز",
    description:
      "فاز ماه، جایگاه سیاره‌ها، حرکت‌های برگشتی و رویدادهای مهم آسمان امروز را ببین.",
    href: "/sky",
    action: "دیدن آسمان امروز",
  },
  {
    number: "۰۴",
    title: "ویکی هالیوس",
    description:
      "رایزینگ، خانه‌ها، جنبه‌ها، ترنزیت‌ها و بقیه مفاهیم آسترولوژی را ساده و فارسی یاد بگیر.",
    href: "/wiki",
    action: "یادگیری در ویکی",
  },
] as const;

const relationshipThemes = [
  "کشش",
  "گفت‌وگو",
  "امنیت عاطفی",
  "نزدیکی",
  "مرزها",
  "رشد",
] as const;

const trustItems = [
  {
    title: "محاسبه واقعی",
    text: "جایگاه‌ها و الگوهای چارت از موتور محاسبه هالیوس می‌آیند.",
  },
  {
    title: "مسیر پیش رو",
    text: "ترنزیت‌ها و حرکت‌های فعلی آسمان کمک می‌کنند دوره‌ها، فرصت‌ها و فشارهای پیش رو را در کنار چارت تولد ببینی.",
  },
  {
    title: "حریم خصوصی",
    text: "چارت ازدواج و سیناستری خصوصی می‌ماند و داده‌های شخصی تولد وارد آمار بازدید نمی‌شوند.",
  },
] as const;

const faqItems = [
  {
    question: "هالیوس چیست؟",
    answer: "هالیوس یک تجربهٔ فارسی برای ساخت چارت تولد، خواندن گزارش شخصی، مقایسهٔ دو چارت در سیناستری، دیدن آسمان امروز و یادگیری مفاهیم آسترولوژی است.",
  },
  {
    question: "آیا ساخت چارت رایگان است؟",
    answer: "در دوره‌هایی که دسترسی رایگان فعال است، ساخت چارت تولد و تحلیل رابطه بدون خرید انجام می‌شود. اگر وضعیت دسترسی تغییر کند، شرایط تازه را در خود ابزار می‌بینی.",
  },
  {
    question: "بدون ساعت دقیق تولد هم می‌توانم چارت بسازم؟",
    answer: "بله. تاریخ و شهر تولدت را وارد کن و مشخص کن ساعت دقیق را نمی‌دانی. جای بسیاری از سیاره‌ها و بعضی جنبه‌ها همچنان قابل بررسی‌اند، اما رایزینگ، خانه‌ها و بخش‌های حساس به زمان محدود می‌شوند.",
  },
  {
    question: "چارت ازدواج و سیناستری چه چیزی نشان می‌دهد؟",
    answer: "این تحلیل ارتباط دو چارت را از نظر کشش، گفت‌وگو، احساس امنیت، نزدیکی، مرزها و الگوهای تنش بررسی می‌کند. یک درصد سازگاری یا حکم قطعی دربارهٔ آیندهٔ رابطه ارائه نمی‌شود.",
  },
  {
    question: "هالیوس درباره مسیر پیش رو چه چیزی نشان می‌دهد؟",
    answer: "حرکت‌های فعلی سیاره‌ها و ترنزیت‌های مرتبط می‌توانند زمینهٔ زمانی بعضی الگوهای چارت را روشن‌تر کنند. این خوانش دربارهٔ یک دوره و موضوع‌های برجستهٔ آن حرف می‌زند؛ زمان وقوع رویداد شخصی را تضمین نمی‌کند.",
  },
] as const;

const learningSeeds = [
  { title: "شروع از چارت تولد", preferredSlug: "birth-chart-basics" },
  { title: "خورشید، ماه و رایزینگ", preferredSlug: "sun-moon-rising" },
  { title: "خانه‌ها و جنبه‌ها", preferredSlug: "major-aspects" },
  { title: "ساعت تولد و دقت چارت", preferredSlug: "why-birth-time-matters" },
  { title: "ترنزیت‌ها و آسمان امروز", preferredSlug: "astrology-transits-explained" },
] as const;

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const homeEntityGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: `${siteConfig.url}/`,
      name: "هالیوس",
      alternateName: "Halleus",
      inLanguage: "fa-IR",
      publisher: { "@id": `${siteConfig.url}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      url: `${siteConfig.url}/`,
      name: "هالیوس",
      alternateName: "Halleus",
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/halleus-logo/logo-horizontal-bilingual-final-20260804.png`,
      },
    },
  ],
};

export default async function Home() {
  const [catalogResult, skyResult, accessPolicyResult] = await Promise.allSettled([
    getPublicWikiIndex(),
    deliverSkyPublicSnapshot({}),
    getPublicReportAccessPolicy(),
  ]);
  const freeAllAccess =
    accessPolicyResult.status === "fulfilled" &&
    accessPolicyResult.value.monetizationMode === "FREE_ALL";
  const catalog =
    catalogResult.status === "fulfilled"
      ? catalogResult.value
      : { articles: [], categories: [] };
  const articles = sortPublicWikiArticlesNewestFirst(catalog.articles);
  const sky = skyResult.status === "fulfilled" ? skyResult.value : null;
  const categoryLabelById = new Map(
    catalog.categories.map((category) => [category.id, category.label]),
  );
  const effectiveFaqItems = freeAllAccess
    ? faqItems
    : faqItems.filter(
        (item) => item.question !== "آیا ساخت چارت رایگان است؟",
      );
  const learningPaths = learningSeeds.map((seed) => {
    const article = articles.find(
      (candidate) => candidate.slug === seed.preferredSlug,
    );
    return {
      title: seed.title,
      href: article ? `/wiki/${article.slug}` : "/wiki",
      articleTitle: article?.shortTitle ?? "ورود به ویکی هالیوس",
    };
  });

  return (
    <div
      className={styles.page}
      data-home-theme="halleus-soft-app"
      data-editorial-source="reviewed-public-editorial-home"
      data-product-surface="Halleus Home"
    >
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeEntityGraph) }}
        type="application/ld+json"
      />

      <section className={styles.hero} aria-labelledby="home-hero-title">
        <div className={styles.heroAtmosphere} aria-hidden="true">
          <span className={styles.heroHalo} />
          <span className={styles.heroOrbitOne} />
          <span className={styles.heroOrbitTwo} />
          <span className={styles.heroPlanet} />
          <span className={styles.heroHorizon} />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            هالیوس؛ آسترولوژی فارسی، شخصی و قابل‌فهم
          </span>
          <h1 id="home-hero-title">
            آسترولوژی فارسی؛ از چارت تولد تا رابطه‌ها و آسمان امروز
          </h1>
          <p className={styles.heroLead}>
            هر کسی یک نقشهٔ تولد مخصوص خودش دارد. روز، ساعت و شهر تولد تعیین می‌کنند سیاره‌ها در چه جایگاهی قرار گرفته‌اند، رایزینگ کجاست و کدام خانه‌ها در چارت برجسته‌اند. در هالیوس می‌توانی <IntentPrefetchLink href="/chart">چارت تولد فارسی</IntentPrefetchLink> خودت را بسازی و به‌جای کنار هم چیدن معنی چند نماد، ارتباط آن‌ها را در گزارشی شخصی بخوانی.
          </p>
          <p className={styles.heroLead}>
            آسترولوژی فارسی در هالیوس فقط به چارت شخصی ختم نمی‌شود. می‌توانی دو چارت را برای شناخت رابطه کنار هم بگذاری، آسمان روز را دنبال کنی یا مفاهیمی مثل جنبه، خانه و ترنزیت را در ویکی یاد بگیری. هر مسیر ابزار و کاربرد خودش را دارد؛ لازم نیست همهٔ این‌ها را در یک گزارش پیدا کنی.
          </p>

          <div className={styles.heroActions}>
            <IntentPrefetchLink className={styles.primaryButton} href="/chart">
              ساخت چارت تولد
              <span aria-hidden="true">←</span>
            </IntentPrefetchLink>
            <IntentPrefetchLink className={styles.secondaryButton} href="/compare">
              چارت ازدواج
            </IntentPrefetchLink>
          </div>

          <IntentPrefetchLink className={styles.heroTextLink} href="/product">
            دیدن نمونه گزارش
          </IntentPrefetchLink>

          <p className={styles.heroMicrocopy}>
            تاریخ شمسی یا میلادی؛ با ساعت دقیق یا بدون آن. اگر بخشی از چارت قابل
            اتکا نباشد، هالیوس همان‌جا می‌گوید.
          </p>
        </div>

        <div className={styles.heroSignal} aria-hidden="true">
          <span>هالیوس</span>
          <strong>محاسبه واقعی · خوانش فارسی</strong>
          <i />
        </div>
      </section>

      <section className={styles.pathsSection} aria-labelledby="paths-title">
        <header className={styles.sectionHeaderCentered}>
          <h2 id="paths-title">هالیوس را از اینجا شروع کن</h2>
          <p>
            برای دیدن چارت خودت، مقایسهٔ رابطه یا شناخت آسمان امروز لازم نیست از یک مسیر طولانی بگذری. از موضوعی شروع کن که همین حالا برایت مهم‌تر است.
          </p>
        </header>

        <div className={styles.pathFlow}>
          <article className={styles.pathPrimary}>
            <div className={styles.pathPrimaryCopy}>
              <small>نقطه شروع پیشنهادی</small>
              <h3>{productPaths[0].title}</h3>
              <p>{productPaths[0].description}</p>
              <IntentPrefetchLink href={productPaths[0].href}>
                {productPaths[0].action}
              </IntentPrefetchLink>
            </div>

            <div className={styles.chartInterface} aria-hidden="true">
              <div className={styles.chartInterfaceTop}>
                <span />
                <span />
                <span />
                <small>چارت تولد هالیوس</small>
              </div>
              <div className={styles.miniChartWheel}>
                <span>☉</span>
                <span>☽</span>
                <span>طالع</span>
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
              <article className={styles.pathCard} key={path.href}>
                <h3>{path.title}</h3>
                <p>{path.description}</p>
                <IntentPrefetchLink href={path.href}>
                  {path.action}
                </IntentPrefetchLink>
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
            گزارش تولد و چارت ازدواج دو خروجی متفاوت‌اند؛ هر دو بر داده واقعی،
            مرزهای روشن و زبان قابل‌فهم تکیه دارند.
          </p>
        </header>

        <div className={styles.productBento}>
          <HomepageProductProof />

          <article className={styles.relationshipPanel}>
            <div className={styles.relationshipHeader}>
              <span className={styles.productBadge}>چارت ازدواج و سیناستری</span>
              <span className={styles.privateBadge}>همیشه خصوصی</span>
            </div>
            <h3>چارت ازدواج و سیناستری؛ الگوی رابطه بین دو نفر</h3>
            <p>
              هالیوس دو چارت را کنار هم می‌گذارد تا کشش، گفت‌وگو، امنیت عاطفی،
              نزدیکی، مرزها، اصطکاک و مسیرهای رشد را ببینی.
            </p>
            <p>
              ترکیب این الگوها نشان می‌دهد کجاها رابطه روان‌تر پیش می‌رود، کجاها
              کشش بیشتری شکل می‌گیرد و کدام بخش‌ها به توجه بیشتری نیاز دارند.
            </p>

            <div
              className={styles.relationshipThemes}
              aria-label="موضوع‌های اصلی چارت ازدواج و سیناستری"
            >
              {relationshipThemes.map((theme) => (
                <div key={theme}>
                  <strong>{theme}</strong>
                </div>
              ))}
            </div>

            <IntentPrefetchLink className={styles.primaryButton} href="/compare">
              ساخت چارت ازدواج
              <span aria-hidden="true">←</span>
            </IntentPrefetchLink>
          </article>
        </div>
      </section>

      <HomeHowItWorks />

      <section className={styles.wikiSection} aria-labelledby="wiki-title">
        <header className={styles.sectionHeaderSplit}>
          <div>
            <h2 id="wiki-title">آسترولوژی را ساده و فارسی یاد بگیر</h2>
          </div>
          <p>
            دیدن چرخ چارت شروع خوبی است، اما شناخت چند مفهوم کلیدی خواندنش را بسیار آسان‌تر می‌کند. وقتی تفاوت خورشید، ماه و رایزینگ را بدانی، بهتر می‌فهمی چرا دو نفر با ماه تولد یکسان می‌توانند چارت‌های متفاوت داشته باشند. بعد نوبت خانه‌ها، جنبه‌ها، ساعت تولد و ترنزیت‌هاست.
          </p>
        </header>

        <div className={styles.wikiLayout}>
          <nav className={styles.learningPaths} aria-label="مسیرهای یادگیری ویکی">
            {learningPaths.map((path) => (
              <IntentPrefetchLink href={path.href} key={path.title}>
                <div>
                  <strong>{path.title}</strong>
                  <small>{path.articleTitle}</small>
                </div>
                <i aria-hidden="true">←</i>
              </IntentPrefetchLink>
            ))}
          </nav>

          <div className={styles.wikiRecent}>
            <span className={styles.productBadge}>تازه‌ترین مقاله‌ها</span>
            <div className={styles.wikiGrid}>
              {articles.slice(0, 4).map((article) => {
                const categoryLabel = categoryLabelById.get(article.categoryId);
                return (
                  <article className={styles.wikiCard} key={article.slug}>
                    {categoryLabel ? <span>{categoryLabel}</span> : null}
                    <h3>
                      <IntentPrefetchLink href={`/wiki/${article.slug}`}>
                        {article.shortTitle}
                      </IntentPrefetchLink>
                    </h3>
                    <p>{article.summary}</p>
                  </article>
                );
              })}
            </div>
            <IntentPrefetchLink className={styles.secondaryButton} href="/wiki">
              ورود به ویکی هالیوس
            </IntentPrefetchLink>
          </div>
        </div>
      </section>

      <R3ApprovedVisibleCopy page="home" />

      <section className={styles.trustSection} aria-labelledby="trust-title">
        <header className={styles.sectionHeaderCentered}>
          <h2 id="trust-title">محاسبه روشن، خوانش عمیق‌تر</h2>
          <p>
            هالیوس داده‌های چارت را محاسبه می‌کند و آن‌ها را برای شناخت الگوها،
            رابطه‌ها و دوره‌های پیش رو به یک خوانش فارسی و شخصی تبدیل می‌کند.
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

        <IntentPrefetchLink className={styles.textLink} href="/privacy">
          حریم خصوصی هالیوس
          <span aria-hidden="true">←</span>
        </IntentPrefetchLink>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-title">
        <div className={styles.faqMain}>
          <header>
            <h2 id="faq-title">قبل از شروع</h2>
          </header>

          <div className={styles.faqList}>
            {effectiveFaqItems.map((item, index) => (
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
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div className={styles.finalCtaOrbit} aria-hidden="true" />
        <span className={styles.sectionIndex}>شروع مسیر</span>
        <h2 id="final-cta-title">چارتت را ببین؛ از خودت شروع کن</h2>
        <p>چند دقیقه برای وارد کردن اطلاعات تولد کافی است.</p>
        <div className={styles.finalCtaActions}>
          <IntentPrefetchLink className={styles.primaryButton} href="/chart">
            ساخت چارت تولد
          </IntentPrefetchLink>
          <IntentPrefetchLink className={styles.secondaryButton} href="/compare">
            چارت ازدواج
          </IntentPrefetchLink>
        </div>
      </section>
    </div>
  );
}