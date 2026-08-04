import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonComposer } from "@/components/comparison/ComparisonComposer";
import styles from "@/components/comparison/comparison.module.css";
import { selectPublicWikiArticlesByPreferredSlugs } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "چارت سیناستری آنلاین | مقایسه دو چارت تولد",
  description:
    "دو چارت تولد را در چارت سیناستری هالیوس کنار هم بگذار و گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و اصطکاک را در یک نتیجه خصوصی و بدون درصد سازگاری بررسی کن.",
  alternates: {
    canonical: "/compare",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const SYNASTRY_ARTICLE_SLUGS = [
  "synastry-explained",
  "birth-chart-and-relationships",
  "compatibility-beyond-sun-sign",
  "element-compatibility-in-astrology",
] as const;

export default async function ComparePage() {
  const catalog = await getPublicWikiCatalog();
  const relatedArticles = selectPublicWikiArticlesByPreferredSlugs(
    catalog.articles,
    SYNASTRY_ARTICLE_SLUGS,
  );

  return <>
    <ComparisonComposer />
    <div className={styles.product} data-compare-editorial-content="final-reviewed">
      <section className={styles.landingOverview} aria-labelledby="what-is-synastry-title">
        <span className={styles.eyebrow}>راهنمای استفاده</span>
        <h2 id="what-is-synastry-title">چارت سیناستری چیست؟</h2>
        <p>در سیناستری، جایگاه‌ها و جنبه‌های دو چارت با هم مقایسه می‌شوند. سؤال اصلی این نیست که «چند درصد سازگاریم؟»؛ مهم‌تر این است که هر نفر احساس، ارتباط، نزدیکی، استقلال و امنیت را چگونه تجربه می‌کند و تماس‌های دو چارت کجا همراهی یا فشار می‌سازند.</p>
        <p>این ابزار برای رابطهٔ عاطفی، دوستی، خانواده، همکاری کاری یا یک مقایسهٔ عمومی قابل استفاده است و فقط برای ازدواج طراحی نشده است.</p>
      </section>
      <section className={styles.landingBoundary} aria-labelledby="compare-does-not-title">
        <h2 id="compare-does-not-title">این ابزار چه چیزی را تضمین نمی‌کند؟</h2>
        <p>چارت سیناستری هالیوس درصد موفقیت، تاریخ ازدواج، احتمال خیانت یا تضمین ماندگاری رابطه نمی‌دهد. تماس هماهنگ به معنی رابطهٔ بی‌نیاز از تلاش نیست و تماس دشوار هم حکم شکست رابطه نیست. نتیجه برای تأمل و گفت‌وگوست؛ نه جایگزین درمان، مشاورهٔ تخصصی یا تصمیم‌گیری ایمنی.</p>
      </section>
      <section className={styles.landingOverview} aria-labelledby="compare-faq-title">
        <span className={styles.eyebrow}>پرسش‌های رایج</span><h2 id="compare-faq-title">دربارهٔ چارت سیناستری</h2>
        <div className={styles.landingDynamicsGrid}>
          <article><h3>آیا نتیجه عمومی می‌شود؟</h3><p>خیر. نتیجه همیشه خصوصی، خارج از نتایج جست‌وجو و بدون لینک عمومی است. فقط همین صفحهٔ معرفی و ساخت تحلیل عمومی است.</p></article>
          <article><h3>بدون ساعت تولد هم می‌توان شروع کرد؟</h3><p>بله. تماس‌های سیاره‌ای قابل اتکا بررسی می‌شوند، اما رایزینگ و هم‌پوشانی خانه‌ها برای چارت دارای ساعت نامعلوم کنار گذاشته می‌شوند.</p></article>
          <article><h3>چرا اجازهٔ نفر دوم لازم است؟</h3><p>چون خوانش از اطلاعات دو نفر استفاده می‌کند. تأیید اجازه کمک می‌کند استفاده از دادهٔ نفر دوم آگاهانه باشد، هرچند نتیجه همچنان خصوصی می‌ماند.</p></article>
          <article><h3>اطلاعات خام نفر دوم ذخیره می‌شود؟</h3><p>تاریخ، ساعت و شهر خام نفر دوم داخل نتیجهٔ مقایسه نگهداری نمی‌شوند؛ فقط داده‌های لازم برای خوانش استفاده می‌شوند.</p></article>
        </div>
        <div className={styles.landingLinks}><Link href="/chart">ساخت چارت تولد</Link><Link href="/privacy">حریم خصوصی تحلیل رابطه</Link></div>
      </section>
      {relatedArticles.length ? (
        <section className={styles.landingOverview} aria-labelledby="compare-learning-title">
          <span className={styles.eyebrow}>مسیر یادگیری</span>
          <h2 id="compare-learning-title">پیش از خواندن سینستری بیشتر بدان</h2>
          <p>فقط راهنماهایی که اکنون در ویکی هالیوس منتشر شده‌اند در این بخش نمایش داده می‌شوند.</p>
          <div className={styles.landingLinks}>
            {relatedArticles.map((article) => (
              <Link href={`/wiki/${article.slug}`} key={article.slug}>{article.shortTitle}</Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  </>;
}
