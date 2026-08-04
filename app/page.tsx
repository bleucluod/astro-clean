import type { Metadata } from "next";
import Link from "next/link";

import { HomepageLiveSky } from "@/components/HomepageLiveSky";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { resolveHomepageSkyState } from "@/lib/homepage/homepage-live-sky-state";
import {
  HOME_REPORT_PREVIEW_LAYERS,
  HOME_REPORT_PREVIEW_SECTIONS,
} from "@/lib/report-preview/homepage-report-preview";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هالیوس | چارت تولد فارسی، تحلیل رابطه و آسمان امروز",
  description:
    "هالیوس فضای کار فارسی آسترولوژی است: چارت تولد بساز، دو چارت را به‌صورت خصوصی برای تحلیل رابطه کنار هم بگذار، آسمان امروز را با داده واقعی ببین و مفاهیم را مرحله‌به‌مرحله یاد بگیر.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

const faNumber = (value: number) => new Intl.NumberFormat("fa-IR").format(value);

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="9" r="2" />
      <circle cx="9" cy="18" r="2" />
      <path d="M7.6 8.4 16.2 8.2M16.7 10.7 10.4 16.2M7.6 8.9 8.6 16" />
    </svg>
  );
}

function IconRelation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5c-4.6-3-7.5-5.9-7.5-9.4A3.6 3.6 0 0 1 12 8.7a3.6 3.6 0 0 1 7.5 2.4c0 3.5-2.9 6.4-7.5 9.4Z" />
    </svg>
  );
}

function IconSky() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 18h9a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8 10.2 4 4 0 0 0 8 18Z" />
      <path d="M15.5 8.2a3 3 0 1 1 3.3 4.2" />
    </svg>
  );
}

function IconWiki() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10.5 5.3 8.4 4.8 5.5 5v12c2.9-.2 5 .3 6.5 1.5 1.5-1.2 3.6-1.7 6.5-1.5V5c-2.9-.2-5 .3-6.5 1.5Z" />
      <path d="M12 6.5V18" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9" rx="2.2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.5 6 7.5 12l6 6" />
      <path d="M17 12H8" />
    </svg>
  );
}

const productNav = [
  { href: "/chart", label: "چارت تولد", hint: "ساخت و خواندن گزارش", icon: <IconChart /> },
  { href: "/compare", label: "تحلیل رابطه", hint: "دو چارت، تحلیل خصوصی", icon: <IconRelation /> },
  { href: "/sky", label: "آسمان امروز", hint: "داده واقعی امروز", icon: <IconSky /> },
  { href: "/wiki", label: "ویکی هالیوس", hint: "یادگیری مرحله‌به‌مرحله", icon: <IconWiki /> },
];

const relationshipContexts = ["رابطه عاطفی", "دوستی", "خانواده", "همکاری کاری", "مقایسه عمومی"];

const relationshipThemes = [
  { title: "پیوند و نزدیکی", text: "جایی که دو نفر راحت‌تر وصل می‌شوند." },
  { title: "گفت‌وگو", text: "سبک بیان، شنیدن و تفاوت زبان." },
  { title: "امنیت عاطفی", text: "چه چیزی حس امنیت می‌سازد یا می‌لرزاند." },
  { title: "اصطکاک و مرزها", text: "محل‌های تنش و مرز روشن." },
  { title: "مسیر رشد", text: "تمرین‌های تعمیق رابطه، بدون حکم قطعی." },
];

const skyModules = [
  { label: "خلاصهٔ امروز", hint: "جایگاه ماه، فاز و روشنایی" },
  { label: "خط زمان رویدادها", hint: "ورود به برج، ایست و تغییر جهت" },
  { label: "جنبه‌های امروز", hint: "زاویه‌های فعال میان سیاره‌ها" },
  { label: "سیارات برگشتی", hint: "حرکت‌های برگشتی روز" },
];

const howItWorks = [
  { title: "اطلاعات تولد را وارد کن", text: "تاریخ، ساعت و شهر تولد؛ ساعت نامعلوم هم پذیرفته می‌شود." },
  { title: "موتور هالیوس محاسبه می‌کند", text: "جایگاه‌ها، خانه‌ها و جنبه‌ها از همان داده ساخته می‌شوند." },
  { title: "نتیجهٔ فارسی را بخوان", text: "گزارش، تحلیل رابطه یا آسمان امروز را مرور کن." },
];

const learningPaths: { title: string; slugs: string[] }[] = [
  { title: "شروع از چارت تولد", slugs: ["birth-chart-basics", "how-to-read-birth-chart"] },
  { title: "خورشید، ماه و رایزینگ", slugs: ["sun-moon-rising", "what-is-rising-sign", "what-is-moon-sign"] },
  { title: "خانه‌ها و جنبه‌ها", slugs: ["astrology-houses", "major-aspects"] },
  { title: "ساعت و شهر تولد", slugs: ["why-birth-time-matters", "why-birth-city-matters"] },
];

const assurance = [
  { title: "محاسبهٔ واقعی", text: "جایگاه‌ها و جنبه‌ها از داده می‌آیند، نه متن آماده." },
  { title: "انتشار روشن", text: "پیش از انتشار می‌دانی گزارش عمومی است یا خصوصی." },
  { title: "پریمیوم خصوصی", text: "گزارش Premium خصوصی شروع می‌شود." },
  { title: "رابطه، همیشه خصوصی", text: "تحلیل رابطه خصوصی می‌ماند و به اجازهٔ نفر دوم نیاز دارد." },
  { title: "بدون حکم قطعی", text: "درصد سازگاری و آیندهٔ قطعی ساخته نمی‌شود." },
  { title: "بدون ارسال به Analytics", text: "داده تولد یا متن گزارش برای آمار بازدید ارسال نمی‌شود." },
];

const faqItems = [
  { q: "چارت تولد چگونه محاسبه می‌شود؟", a: "با تاریخ، ساعت و شهر تولد، جایگاه خورشید، ماه، رایزینگ، خانه‌ها و جنبه‌ها محاسبه می‌شوند و در یک گزارش فارسی و قابل‌مرور نمایش داده می‌شوند." },
  { q: "بدون ساعت دقیق تولد چه می‌شود؟", a: "می‌توانی شروع کنی، اما رایزینگ، خانه‌ها و محورهای اصلی قابل اتکای کامل نیستند و این محدودیت داخل نتیجه پنهان نمی‌شود." },
  { q: "تحلیل رابطه چه فرقی با درصد سازگاری دارد؟", a: "هیچ درصدی نمایش داده نمی‌شود. تحلیل روی گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و اصطکاک تمرکز دارد و رابطه را «خوب» یا «بد» اعلام نمی‌کند." },
  { q: "آسمان امروز از کجا می‌آید؟", a: "از داده محاسبه‌شدهٔ جایگاه‌ها، فاز ماه، جنبه‌ها و خط زمان روز. این صفحه فال روزانه نیست." },
  { q: "گزارش‌ها عمومی‌اند یا خصوصی؟", a: "گزارش رایگان به‌صورت پیش‌فرض عمومی است؛ گزارش Premium خصوصی شروع می‌شود و تحلیل رابطه همیشه خصوصی است." },
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
  const featuredArticles = articles.slice(0, 3);

  const skyState = resolveHomepageSkyState(sky);
  const skyChip =
    skyState.status === "ready"
      ? { text: "دادهٔ امروز آماده", tone: "ready" }
      : skyState.status === "partial"
        ? { text: "بخشی از داده آماده", tone: "partial" }
        : skyState.status === "stale"
          ? { text: "آخرین دادهٔ معتبر", tone: "stale" }
          : { text: "فعلاً در دسترس نیست", tone: "unavailable" };
  const skyCity = skyState.status !== "unavailable" ? skyState.result.city.faName : null;

  return (
    <div className={styles.page} data-home-theme="halleus-soft-app" data-product-surface="Halleus Home">
      {/* ============ APP WORKSPACE (first screen) ============ */}
      <section className={styles.workspaceGrid} aria-label="فضای کار هالیوس">
        {/* PRIMARY (right in RTL) */}
        <div className={styles.primary}>
          <span className={styles.appTag}>
            <span className={styles.appDot} aria-hidden="true" />
            هالیوس · فضای کار آسترولوژی فارسی
          </span>
          <h1 className={styles.title}>چارت تولد، رابطه و آسمان امروز در یک فضای کار</h1>
          <p className={styles.lead}>
            اطلاعات تولد را وارد کن و نتیجهٔ محاسبه‌شده را روشن و فارسی بخوان.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link>
            <Link className={styles.ghostButton} href="/compare">تحلیل رابطه</Link>
            <Link className={styles.quietLink} href="/product">دیدن نمونه گزارش</Link>
          </div>

          <nav className={styles.switcher} aria-label="مسیرهای محصول">
            {productNav.map((item) => (
              <Link key={item.href} className={styles.switchRow} href={item.href}>
                <span className={styles.switchIcon}>{item.icon}</span>
                <span className={styles.switchText}>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                <span className={styles.switchArrow} aria-hidden="true"><IconArrow /></span>
              </Link>
            ))}
          </nav>
        </div>

        {/* WORKSPACE (center) — CSS-only tabbed product preview */}
        <div className={styles.workspace} role="group" aria-label="پیش‌نمایش محصول">
          <input className={`${styles.tabInput} ${styles.tabReport}`} type="radio" name="hp-workspace" id="hp-tab-report" defaultChecked />
          <input className={`${styles.tabInput} ${styles.tabRelation}`} type="radio" name="hp-workspace" id="hp-tab-relation" />
          <input className={`${styles.tabInput} ${styles.tabSky}`} type="radio" name="hp-workspace" id="hp-tab-sky" />

          <div className={styles.workspaceBar}>
            <div className={styles.segmented}>
              <label className={styles.seg} htmlFor="hp-tab-report">گزارش تولد</label>
              <label className={styles.seg} htmlFor="hp-tab-relation">تحلیل رابطه</label>
              <label className={styles.seg} htmlFor="hp-tab-sky">آسمان امروز</label>
            </div>
            <span className={styles.workspaceHint}>پیش‌نمایش زنده</span>
          </div>

          <div className={styles.panels}>
            {/* Report preview */}
            <div className={`${styles.panel} ${styles.panelReport}`}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.panelKicker}>گزارش چارت تولد</span>
                  <h2 className={styles.panelTitle}>ساختار خواندن گزارش</h2>
                </div>
                <span className={`${styles.stateTag} ${styles.stateNeutral}`}>پیش‌فرض عمومی · Premium خصوصی</span>
              </div>

              <ol className={styles.navRows}>
                {HOME_REPORT_PREVIEW_SECTIONS.map((section, index) => (
                  <li key={section.title} className={styles.navRow}>
                    <span className={styles.rowIndex}>{faNumber(index + 1)}</span>
                    <span className={styles.rowText}>{section.title}</span>
                    <span className={styles.rowMeta}>فصل</span>
                  </li>
                ))}
              </ol>

              <div className={styles.layerBlock}>
                <span className={styles.blockLabel}>لایه‌های خوانش</span>
                <div className={styles.layerList}>
                  {HOME_REPORT_PREVIEW_LAYERS.map((layer) => (
                    <div key={layer.label} className={styles.layerItem}>
                      <span className={styles.layerDot} aria-hidden="true" />
                      <strong>{layer.label}</strong>
                      <small>{layer.description}</small>
                    </div>
                  ))}
                </div>
              </div>

              <details className={styles.sampleDetails}>
                <summary className={styles.sampleSummary}>
                  دیدن نمونهٔ واقعی یک فصل گزارش
                  <span aria-hidden="true">+</span>
                </summary>
                <div className={styles.sampleBody}>
                  <HomepageProductProof />
                </div>
              </details>

              <div className={styles.panelActions}>
                <Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link>
                <Link className={styles.quietLink} href="/product">داخل گزارش چه می‌بینی؟</Link>
              </div>
            </div>

            {/* Relationship preview */}
            <div className={`${styles.panel} ${styles.panelRelation}`}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.panelKicker}>تحلیل رابطه</span>
                  <h2 className={styles.panelTitle}>دو چارت، بدون حکم قطعی</h2>
                </div>
                <span className={`${styles.stateTag} ${styles.statePrivate}`}><IconLock /> خصوصی</span>
              </div>

              <div className={styles.chipRow}>
                {relationshipContexts.map((context) => (
                  <span key={context} className={styles.chip}>{context}</span>
                ))}
              </div>

              <ul className={styles.themeRows}>
                {relationshipThemes.map((theme) => (
                  <li key={theme.title} className={styles.themeRow}>
                    <strong>{theme.title}</strong>
                    <span>{theme.text}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.privateNote}>
                <IconLock /> بدون درصد سازگاری. استفاده از چارت نفر دوم به اجازهٔ او نیاز دارد.
              </p>

              <div className={styles.panelActions}>
                <Link className={styles.primaryButton} href="/compare">تحلیل رابطه با دو چارت</Link>
              </div>
            </div>

            {/* Sky preview */}
            <div className={`${styles.panel} ${styles.panelSky}`}>
              <div className={styles.panelHead}>
                <div>
                  <span className={styles.panelKicker}>آسمان امروز</span>
                  <h2 className={styles.panelTitle}>پیش‌نمایش صفحهٔ آسمان{skyCity ? ` · ${skyCity}` : ""}</h2>
                </div>
                <span className={`${styles.stateTag} ${styles[`state_${skyChip.tone}`] ?? ""}`}>{skyChip.text}</span>
              </div>

              <ul className={styles.navRows}>
                {skyModules.map((module) => (
                  <li key={module.label} className={styles.navRow}>
                    <span className={styles.rowText}>
                      <strong>{module.label}</strong>
                      <small className={styles.rowSub}>{module.hint}</small>
                    </span>
                    <span className={styles.rowMeta} aria-hidden="true"><IconArrow /></span>
                  </li>
                ))}
              </ul>

              <p className={styles.privateNote}>
                این صفحه فال روزانه نیست و رویداد روز را به‌طور قطعی اعلام نمی‌کند.
              </p>

              <div className={styles.panelActions}>
                <Link className={styles.primaryButton} href="/sky">دیدن آسمان کامل</Link>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE RAIL (left) */}
        <aside className={styles.rail} aria-label="داده زنده و وضعیت">
          <HomepageLiveSky result={sky} />

          <div className={styles.statusPanel}>
            <span className={styles.blockLabel}>وضعیت و حریم خصوصی</span>
            <ul className={styles.statusList}>
              <li><span className={styles.statusIcon}><IconCheck /></span> محاسبهٔ واقعی، بدون متن آماده</li>
              <li><span className={styles.statusIcon}><IconLock /></span> تحلیل رابطه همیشه خصوصی</li>
              <li><span className={styles.statusIcon}><IconLock /></span> Premium خصوصی به‌صورت پیش‌فرض</li>
            </ul>
            <Link className={styles.quietLink} href="/privacy">سیاست حریم خصوصی</Link>
          </div>
        </aside>
      </section>

      {/* ============ HOW IT WORKS (connected flow) ============ */}
      <section className={styles.flowSection} aria-labelledby="home-flow-title">
        <div className={styles.rowHead}>
          <h2 className={styles.rowTitle} id="home-flow-title">سه گام تا نتیجه</h2>
        </div>
        <ol className={styles.flow}>
          {howItWorks.map((step, index) => (
            <li key={step.title} className={styles.flowStep}>
              <span className={styles.flowIndex}>{faNumber(index + 1)}</span>
              <strong>{step.title}</strong>
              <span className={styles.flowText}>{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ============ LEARNING PATHS (compact nav list) ============ */}
      <section className={styles.pathsSection} aria-labelledby="home-paths-title">
        <div className={styles.rowHead}>
          <h2 className={styles.rowTitle} id="home-paths-title">مسیرهای یادگیری در ویکی</h2>
          <Link className={styles.quietLink} href="/wiki">ورود به ویکی هالیوس</Link>
        </div>
        <div className={styles.pathsGrid}>
          <ul className={styles.pathList}>
            {learningPaths.map((path) => (
              <li key={path.title}>
                <Link className={styles.pathRow} href={pathHref(path.slugs)}>
                  <span>{path.title}</span>
                  <span className={styles.pathArrow} aria-hidden="true"><IconArrow /></span>
                </Link>
              </li>
            ))}
          </ul>
          {featuredArticles.length ? (
            <ul className={styles.recentList}>
              {featuredArticles.map((article) => (
                <li key={article.slug}>
                  <Link className={styles.recentRow} href={`/wiki/${article.slug}`}>
                    {categoryLabels.has(article.categoryId) ? (
                      <span className={styles.recentTag}>{categoryLabels.get(article.categoryId)}</span>
                    ) : null}
                    <span className={styles.recentTitle}>{article.shortTitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* ============ ASSURANCE (small status rows) ============ */}
      <section className={styles.assuranceSection} aria-labelledby="home-assurance-title">
        <div className={styles.rowHead}>
          <h2 className={styles.rowTitle} id="home-assurance-title">محاسبهٔ روشن، انتشار روشن</h2>
          <Link className={styles.quietLink} href="/privacy">حریم خصوصی</Link>
        </div>
        <ul className={styles.assuranceGrid}>
          {assurance.map((item) => (
            <li key={item.title} className={styles.assuranceRow}>
              <span className={styles.assuranceIcon}><IconCheck /></span>
              <span className={styles.assuranceText}>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ============ FAQ ============ */}
      <section className={styles.faqSection} aria-labelledby="home-faq-title">
        <div className={styles.rowHead}>
          <h2 className={styles.rowTitle} id="home-faq-title">سؤال‌های رایج</h2>
        </div>
        <div className={styles.faqList}>
          {faqItems.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary className={styles.faqSummary}>
                {item.q}
                <span aria-hidden="true">+</span>
              </summary>
              <p className={styles.faqAnswer}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ FINAL ACTION ============ */}
      <section className={styles.finalCta} aria-labelledby="home-final-title">
        <div>
          <h2 className={styles.finalTitle} id="home-final-title">آمادهٔ شروعی؟</h2>
          <p className={styles.finalText}>یک چارت بساز یا دو چارت را برای تحلیل خصوصی رابطه کنار هم بگذار.</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/chart">ساخت چارت تولد</Link>
          <Link className={styles.ghostButton} href="/compare">تحلیل رابطه</Link>
        </div>
      </section>

      {/* ============ MOBILE ACTION DOCK (homepage-only) ============ */}
      <nav className={styles.dock} aria-label="میان‌بر محصول‌ها">
        <div className={styles.dockNav}>
          <Link className={styles.dockItem} href="/chart"><span className={styles.dockIcon}><IconChart /></span>چارت</Link>
          <Link className={styles.dockItem} href="/compare"><span className={styles.dockIcon}><IconRelation /></span>رابطه</Link>
          <Link className={styles.dockItem} href="/sky"><span className={styles.dockIcon}><IconSky /></span>آسمان</Link>
          <Link className={styles.dockItem} href="/wiki"><span className={styles.dockIcon}><IconWiki /></span>یادگیری</Link>
        </div>
      </nav>
    </div>
  );
}
