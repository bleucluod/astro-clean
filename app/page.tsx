import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { HomepageLiveSky } from "@/components/HomepageLiveSky";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { resolveHomepageSkyState } from "@/lib/homepage/homepage-live-sky-state";
import { HOME_REPORT_PREVIEW_LAYERS } from "@/lib/report-preview/homepage-report-preview";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { SKY_SIGN_LABELS } from "@/lib/sky-public/sky-public-labels";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هالیوس | آسترولوژی فارسی، چارت تولد و تحلیل رابطه",
  description: "در هالیوس چارت تولد فارسی بساز، دو چارت را برای تحلیل خصوصی رابطه کنار هم بگذار، وضعیت واقعی آسمان امروز را ببین و آسترولوژی را مرحله‌به‌مرحله یاد بگیر.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="9" r="2" />
      <circle cx="9" cy="18" r="2" />
      <path d="M7.6 8.4 16.2 8.2M16.7 10.7 10.4 16.2M7.6 8.9 8.6 16" />
    </svg>
  );
}

function IconRelation() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5c-4.6-3-7.5-5.9-7.5-9.4A3.6 3.6 0 0 1 12 8.7a3.6 3.6 0 0 1 7.5 2.4c0 3.5-2.9 6.4-7.5 9.4Z" />
    </svg>
  );
}

function IconSky() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 18h9a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8 10.2 4 4 0 0 0 8 18Z" />
      <path d="M15.5 8.2a3 3 0 1 1 3.3 4.2" />
    </svg>
  );
}

function IconWiki() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10.5 5.3 8.4 4.8 5.5 5v12c2.9-.2 5 .3 6.5 1.5 1.5-1.2 3.6-1.7 6.5-1.5V5c-2.9-.2-5 .3-6.5 1.5Z" />
      <path d="M12 6.5V18" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9" rx="2.2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

type QuickProduct = {
  href: string;
  title: string;
  text: string;
  cta: string;
  icon: ReactNode;
  featured?: boolean;
};

const quickProducts: QuickProduct[] = [
  {
    href: "/chart",
    title: "چارت تولد فارسی",
    text: "تاریخ، ساعت و شهر تولد را وارد کن تا خورشید، ماه، رایزینگ، خانه‌ها و جنبه‌ها محاسبه شوند و در یک گزارش فارسی و قابل‌مرور نمایش داده شوند.",
    cta: "ساخت چارت تولد",
    icon: <IconChart />,
    featured: true,
  },
  {
    href: "/compare",
    title: "تحلیل رابطه",
    text: "دو چارت را برای بررسی گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و اصطکاک کنار هم بگذار. نتیجه خصوصی است و درصد سازگاری یا حکم قطعی نمی‌سازد.",
    cta: "تحلیل رابطه با دو چارت",
    icon: <IconRelation />,
    featured: true,
  },
  {
    href: "/sky",
    title: "آسمان امروز",
    text: "جایگاه ماه و سیاره‌ها، فاز ماه، حرکت‌های برگشتی و رویدادهای نزدیک روز، براساس داده محاسبه‌شده.",
    cta: "دیدن آسمان امروز",
    icon: <IconSky />,
  },
  {
    href: "/wiki",
    title: "ویکی هالیوس",
    text: "مفاهیم چارت تولد، رایزینگ، خانه‌ها، جنبه‌ها، ساعت تولد و ترنزیت‌ها را روشن و فارسی یاد بگیر.",
    cta: "ورود به ویکی",
    icon: <IconWiki />,
  },
];

const relationshipContexts = [
  "رابطه عاطفی",
  "دوستی",
  "خانواده",
  "همکاری کاری",
  "مقایسه عمومی",
];

const relationshipThemes = [
  { title: "پیوند و نزدیکی", text: "نقطه‌هایی که دو نفر راحت‌تر به هم وصل می‌شوند." },
  { title: "گفت‌وگو", text: "سبک بیان، شنیدن و تفاوت زبان دو طرف." },
  { title: "امنیت عاطفی", text: "چه چیزی حس امنیت می‌سازد و چه چیزی آن را می‌لرزاند." },
  { title: "اصطکاک و مرزها", text: "محل‌های تنش و جایی که مرز روشن لازم است." },
  { title: "مسیر رشد", text: "تمرین‌هایی که رابطه را عمیق‌تر می‌کنند، بدون حکم قطعی." },
];

const howItWorks = [
  { title: "اطلاعات لازم را وارد کن", text: "تاریخ، ساعت و شهر تولد را بنویس یا مشخص کن که ساعت دقیق را نمی‌دانی." },
  { title: "موتور هالیوس محاسبه می‌کند", text: "جایگاه‌ها، خانه‌ها، جنبه‌ها و داده‌های لازم از همان اطلاعات ساخته می‌شوند." },
  { title: "نتیجه فارسی و قابل‌فهم را بخوان", text: "گزارش تولد، تحلیل رابطه یا آسمان امروز را مرحله‌به‌مرحله مرور کن." },
];

const learningPaths: { title: string; text: string; slugs: string[] }[] = [
  { title: "شروع از چارت تولد", text: "نقشهٔ تولد و چهار لایهٔ اصلی خواندن آن.", slugs: ["birth-chart-basics", "how-to-read-birth-chart"] },
  { title: "خورشید، ماه و رایزینگ", text: "سه ستون معروف چارت و تفاوت‌شان.", slugs: ["sun-moon-rising", "what-is-rising-sign", "what-is-moon-sign"] },
  { title: "خانه‌ها و جنبه‌ها", text: "میدان‌های زندگی و رابطهٔ زاویه‌ای سیاره‌ها.", slugs: ["astrology-houses", "major-aspects"] },
  { title: "ساعت و شهر تولد", text: "چرا دقت داده روی رایزینگ و خانه‌ها اثر می‌گذارد.", slugs: ["why-birth-time-matters", "why-birth-city-matters"] },
  { title: "ترنزیت‌ها و آسمان امروز", text: "مقایسهٔ آسمان امروز با چارت تولد، با مرز روشن.", slugs: [] },
];

const faqItems = [
  { q: "هالیوس چیست؟", a: "هالیوس یک تجربه فارسی برای ساخت چارت تولد، خواندن گزارش شخصی، تحلیل خصوصی رابطه، دیدن آسمان امروز و یادگیری مفاهیم آسترولوژی است." },
  { q: "چارت تولد چگونه محاسبه می‌شود؟", a: "با تاریخ، ساعت و شهر تولد، جایگاه خورشید، ماه، رایزینگ، خانه‌ها و جنبه‌ها محاسبه می‌شوند و نتیجه در یک گزارش فارسی و قابل‌مرور نمایش داده می‌شود." },
  { q: "آیا ساخت چارت رایگان است؟", a: "ساخت چارت و دیدن گزارش پایه رایگان است. گزارش Premium لایه‌های بیشتری دارد و به‌صورت خصوصی شروع می‌شود." },
  { q: "بدون ساعت دقیق تولد چه می‌شود؟", a: "می‌توانی شروع کنی، اما رایزینگ، خانه‌ها و محورهای اصلی قابل اتکای کامل نیستند و ممکن است جایگاه ماه هم به ساعت حساس باشد. این محدودیت داخل نتیجه پنهان نمی‌شود." },
  { q: "تحلیل رابطه چه فرقی با درصد سازگاری دارد؟", a: "هیچ درصدی نمایش داده نمی‌شود. تحلیل روی گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و اصطکاک تمرکز دارد و رابطه را «خوب» یا «بد» اعلام نمی‌کند." },
  { q: "آسمان امروز از کجا می‌آید؟", a: "از داده محاسبه‌شدهٔ جایگاه‌ها، فاز ماه، جنبه‌ها و خط زمانی روز. این صفحه فال روزانه نیست و رویدادهای روز را به‌طور قطعی اعلام نمی‌کند." },
  { q: "گزارش‌ها عمومی‌اند یا خصوصی؟", a: "گزارش مهمان و رایگان به‌صورت پیش‌فرض عمومی است و می‌تواند در نتایج جست‌وجو دیده شود. گزارش Premium خصوصی شروع می‌شود و تحلیل رابطه همیشه خصوصی است." },
];

const trustItems = [
  { title: "محاسبه واقعی", text: "جایگاه‌ها، خانه‌ها و جنبه‌ها از داده محاسبه‌شده می‌آیند، نه متن آماده." },
  { title: "سیاست انتشار روشن", text: "پیش از انتشار می‌دانی گزارش عمومی است یا خصوصی." },
  { title: "پریمیوم خصوصی به‌صورت پیش‌فرض", text: "گزارش Premium خصوصی شروع می‌شود و فقط با انتخاب روشن صاحب آن عمومی می‌شود." },
  { title: "تحلیل رابطه، همیشه خصوصی", text: "تحلیل رابطه همیشه خصوصی می‌ماند و استفاده از چارت نفر دوم نیازمند اجازهٔ اوست." },
  { title: "بدون حکم قطعی", text: "هالیوس درصد سازگاری نمی‌سازد و آیندهٔ قطعی اعلام نمی‌کند." },
  { title: "بدون ارسال داده به Analytics", text: "داده تولد یا متن گزارش نباید برای آمار بازدید ارسال شوند." },
];

export default async function Home() {
  const [catalogResult, skyResult] = await Promise.allSettled([
    getPublicWikiCatalog(),
    deliverSkyPublicSnapshot({}),
  ]);
  const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : { articles: [], categories: [] };
  const articles = sortPublicWikiArticlesNewestFirst(catalog.articles);
  const sky = skyResult.status === "fulfilled" ? skyResult.value : null;

  const slugSet = new Set(articles.map((article) => article.slug));
  const categoryLabels = new Map(catalog.categories.map((category) => [category.id, category.label]));
  const pathHref = (slugs: string[]) => {
    const match = slugs.find((slug) => slugSet.has(slug));
    return match ? `/wiki/${match}` : "/wiki";
  };
  const featuredArticles = articles.slice(0, 4);

  const heroSkyState = resolveHomepageSkyState(sky);
  const heroSky = heroSkyState.status !== "unavailable" ? heroSkyState.result : null;
  const heroMoon = heroSky?.snapshot.planetaryStates.find((item) => item.body === "moon") ?? null;
  const heroSkyLine = heroSky
    ? heroMoon
      ? `${heroSky.city.faName} · ماه در ${SKY_SIGN_LABELS[heroMoon.sign]}`
      : `${heroSky.city.faName} · وضعیت امروز`
    : "وضعیت آسمان همین حالا در صفحهٔ آسمان امروز محاسبه می‌شود.";

  return (
    <div className={styles.page} data-home-theme="halleus-soft-app" data-product-surface="Halleus Home">
      {/* 1. Hero */}
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>هالیوس؛ تجربه فارسی آسترولوژی</span>
          <h1 className={styles.heroTitle} id="home-hero-title">
            چارت تولد فارسی، تحلیل رابطه و آسمان امروز
          </h1>
          <p className={styles.heroLead}>
            هالیوس اطلاعات تولد را محاسبه می‌کند و نتیجه را در یک تجربه فارسی، روشن و قابل‌مرور نشان می‌دهد؛
            از گزارش شخصی چارت تا تحلیل خصوصی رابطه و وضعیت واقعی آسمان امروز.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link>
            <Link className={styles.secondaryButton} href="/compare">تحلیل رابطه</Link>
            <Link className={styles.textLink} href="/product">دیدن نمونه گزارش</Link>
          </div>
          <p className={styles.heroMicro}>
            تاریخ شمسی یا میلادی فرقی ندارد. ساعت دقیق را هم نمی‌دانی؟ باز می‌توانی شروع کنی و محدودیت‌ها را در نتیجه ببینی.
          </p>
        </div>

        <div className={styles.heroPanel} aria-hidden="true">
          <article className={`${styles.heroCard} ${styles.heroCardReport}`}>
            <span className={styles.heroCardKicker}>گزارش چارت تولد</span>
            <strong className={styles.heroCardTitle}>یک گزارش، چند لایه خوانش</strong>
            <ul className={styles.heroLayerList}>
              {HOME_REPORT_PREVIEW_LAYERS.slice(0, 3).map((layer) => (
                <li key={layer.label}>{layer.label}</li>
              ))}
            </ul>
          </article>

          <article className={`${styles.heroCard} ${styles.heroCardSky}`}>
            <span className={styles.heroCardKicker}>آسمان امروز</span>
            <strong className={styles.heroCardTitle}>خلاصهٔ زندهٔ آسمان</strong>
            <p className={styles.heroCardText}>{heroSkyLine}</p>
          </article>

          <article className={`${styles.heroCard} ${styles.heroCardRelation}`}>
            <span className={styles.heroPrivate}><IconLock /> خصوصی</span>
            <strong className={styles.heroCardTitle}>تحلیل رابطه</strong>
            <p className={styles.heroCardText}>دو چارت، بدون درصد سازگاری و بدون حکم قطعی.</p>
          </article>

          <div className={styles.heroTrust}>
            <span><IconCheck /> محاسبهٔ واقعی</span>
            <span><IconCheck /> بدون حکم قطعی</span>
          </div>
        </div>
      </section>

      {/* 2. Quick Start */}
      <section className={styles.quickStart} aria-labelledby="home-quick-title">
        <header className={styles.sectionHead}>
          <span className={styles.sectionKicker}>چهار مسیر محصول</span>
          <h2 className={styles.sectionTitle} id="home-quick-title">امروز از کدام مسیر شروع می‌کنی؟</h2>
          <p className={styles.sectionLead}>هر مسیر یک محصول واقعی هالیوس است؛ از همان‌جا که برایت مهم‌تر است شروع کن.</p>
        </header>
        <div className={styles.quickGrid}>
          {quickProducts.map((product) => (
            <article
              key={product.href}
              className={`${styles.quickCard} ${product.featured ? styles.quickCardFeatured : ""}`}
            >
              <span className={styles.quickIcon}>{product.icon}</span>
              <h3 className={styles.quickTitle}>{product.title}</h3>
              <p className={styles.quickText}>{product.text}</p>
              <Link className={styles.quickCta} href={product.href}>{product.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Live Sky Today */}
      <section className={styles.liveSkySection} aria-labelledby="home-live-sky-heading">
        <header className={styles.sectionHead}>
          <span className={styles.sectionKicker}>داده زنده</span>
          <h2 className={styles.sectionTitle} id="home-live-sky-heading">آسمان امروز در یک نگاه</h2>
          <p className={styles.sectionLead}>خلاصه‌ای از داده معتبر امروز؛ جزئیات کامل در صفحهٔ آسمان امروز است.</p>
        </header>
        <HomepageLiveSky result={sky} />
      </section>

      {/* 4. Birth Report showcase */}
      <section className={styles.reportSection} id="sample-report" aria-labelledby="home-report-heading">
        <header className={styles.sectionHead}>
          <span className={styles.sectionKicker}>گزارش چارت تولد</span>
          <h2 className={styles.sectionTitle} id="home-report-heading">چارت تولد فقط یک جدول نیست</h2>
          <p className={styles.sectionLead}>
            گزارش با یک تصویر کلی شروع می‌شود و بعد خورشید، ماه، رایزینگ، خانه‌ها، جنبه‌ها و الگوهای برجسته را
            در فصل‌هایی مرتبط کنار هم می‌گذارد. اگر ساعت تولد نامعلوم باشد، محدودیت رایزینگ و خانه‌ها پنهان نمی‌شود.
          </p>
        </header>
        <div className={styles.productProofWrap}>
          <HomepageProductProof />
        </div>
        <div className={styles.reportActions}>
          <Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link>
          <Link className={styles.secondaryButton} href="/product">داخل گزارش چه می‌بینی؟</Link>
        </div>
      </section>

      {/* 5. Relationship Analysis showcase */}
      <section className={styles.relationSection} aria-labelledby="home-relation-heading">
        <div className={styles.relationIntro}>
          <span className={styles.sectionKicker}>تحلیل رابطه</span>
          <h2 className={styles.sectionTitle} id="home-relation-heading">
            دو چارت را کنار هم بگذار؛ رابطه را بدون حکم قطعی بخوان
          </h2>
          <p className={styles.sectionLead}>
            تحلیل رابطه نشان می‌دهد دو نفر گفت‌وگو، امنیت، نزدیکی، فاصله و مرزها را چگونه تجربه می‌کنند.
            این خوانش برای زمینه‌های مختلف قابل استفاده است و نتیجه همیشه خصوصی می‌ماند.
          </p>
          <div className={styles.relationContexts}>
            {relationshipContexts.map((context) => (
              <span key={context} className={styles.contextChip}>{context}</span>
            ))}
          </div>
          <p className={styles.relationPrivate}>
            <IconLock /> استفاده از چارت نفر دوم نیازمند اجازهٔ اوست و نتیجه بدون درصد سازگاری ارائه می‌شود.
          </p>
          <Link className={styles.primaryButton} href="/compare">تحلیل رابطه با دو چارت</Link>
        </div>
        <ul className={styles.relationThemes}>
          {relationshipThemes.map((theme) => (
            <li key={theme.title} className={styles.themeItem}>
              <strong>{theme.title}</strong>
              <span>{theme.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. How Halleus Works */}
      <section className={styles.howSection} aria-labelledby="home-how-heading">
        <header className={styles.sectionHead}>
          <span className={styles.sectionKicker}>سه گام ساده</span>
          <h2 className={styles.sectionTitle} id="home-how-heading">هالیوس چگونه کار می‌کند؟</h2>
        </header>
        <ol className={styles.howGrid}>
          {howItWorks.map((step, index) => (
            <li key={step.title} className={styles.howStep}>
              <span className={styles.stepNumber}>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
              <strong>{step.title}</strong>
              <span className={styles.howText}>{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 7. Wiki learning paths + real articles */}
      <section className={styles.wikiSection} aria-labelledby="home-wiki-heading">
        <header className={styles.sectionHead}>
          <span className={styles.sectionKicker}>ویکی هالیوس</span>
          <h2 className={styles.sectionTitle} id="home-wiki-heading">آسترولوژی را فارسی و مرحله‌به‌مرحله یاد بگیر</h2>
          <p className={styles.sectionLead}>از سؤال ساده خودت شروع کن و به مقالهٔ درست برس.</p>
        </header>

        <div className={styles.pathList}>
          {learningPaths.map((path) => (
            <Link key={path.title} className={styles.pathCard} href={pathHref(path.slugs)}>
              <strong>{path.title}</strong>
              <span>{path.text}</span>
            </Link>
          ))}
        </div>

        {featuredArticles.length ? (
          <div className={styles.featuredBlock}>
            <div className={styles.featuredHead}>
              <h3>مقاله‌های تازهٔ ویکی</h3>
              <Link className={styles.textLink} href="/wiki">ورود به ویکی هالیوس</Link>
            </div>
            <div className={styles.featuredGrid}>
              {featuredArticles.map((article) => (
                <article key={article.slug} className={styles.featuredCard}>
                  {categoryLabels.has(article.categoryId) ? (
                    <span className={styles.featuredTag}>{categoryLabels.get(article.categoryId)}</span>
                  ) : null}
                  <h4><Link href={`/wiki/${article.slug}`}>{article.shortTitle}</Link></h4>
                  <p>{article.summary}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* 8. Trust & Privacy strip */}
      <section className={styles.trustSection} aria-labelledby="home-trust-heading">
        <header className={styles.sectionHead}>
          <span className={styles.sectionKicker}>اعتماد و حریم خصوصی</span>
          <h2 className={styles.sectionTitle} id="home-trust-heading">محاسبه روشن، انتشار روشن</h2>
        </header>
        <div className={styles.trustGrid}>
          {trustItems.map((item) => (
            <article key={item.title} className={styles.trustCard}>
              <span className={styles.trustIcon}><IconCheck /></span>
              <strong>{item.title}</strong>
              <span className={styles.trustText}>{item.text}</span>
            </article>
          ))}
        </div>
        <Link className={styles.textLink} href="/privacy">حریم خصوصی هالیوس</Link>
      </section>

      {/* 9. FAQ */}
      <section className={styles.faqSection} aria-labelledby="home-faq-heading">
        <header className={styles.sectionHead}>
          <span className={styles.sectionKicker}>سؤال‌های رایج</span>
          <h2 className={styles.sectionTitle} id="home-faq-heading">قبل از شروع، این‌ها را بدان</h2>
        </header>
        <div className={styles.faqList}>
          {faqItems.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary className={styles.faqSummary}>{item.q}</summary>
              <p className={styles.faqAnswer}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 10. Final CTA */}
      <section className={styles.finalCta} aria-labelledby="home-final-heading">
        <div>
          <h2 className={styles.sectionTitle} id="home-final-heading">از داده واقعی تولدت شروع کن</h2>
          <p className={styles.sectionLead}>چارت خودت را بساز یا دو چارت را برای یک خوانش خصوصی رابطه کنار هم بگذار.</p>
        </div>
        <div className={styles.finalCtaActions}>
          <Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link>
          <Link className={styles.secondaryButton} href="/compare">تحلیل رابطه</Link>
        </div>
      </section>
    </div>
  );
}
