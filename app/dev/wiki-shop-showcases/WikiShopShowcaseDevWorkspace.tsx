"use client";

import { useCallback, useState } from "react";
import { WikiShopShowcasePanel, type WikiShopShowcaseDemoSelection } from "@/components/admin/WikiShopShowcasePanel";
import { WikiArticleBody } from "@/components/wiki/WikiArticleRender";
import type { WikiArticleSection } from "@/lib/wiki/wiki-content";
import type { PublicWikiShopShowcase } from "@/lib/wiki/wiki-shop-showcase";
import wikiStyles from "@/app/wiki/wiki.module.css";
import styles from "./dev-preview.module.css";

const demoMoonText = [
  [
    "هر تاریخ، شکل خاصی از ماه را در آسمان دارد. از هلالی باریک تا ماه کامل، بخش روشن ماه در طول ماه قمری تغییر می‌کند.",
    "این صفحه فقط برای مشاهدهٔ چیدمان ویترین طراحی شده و مقالهٔ منتشرشده نیست.",
  ],
  [
    "ماه به دور زمین می‌گردد و با تغییر زاویهٔ خورشید، زمین و ماه، مقدار متفاوتی از سطح روشن آن را می‌بینیم.",
    "در یک متن آموزشی، تصویر و توضیح علمی باید محور اصلی بمانند؛ پیشنهاد محصول می‌تواند بعد از توضیح مرتبط قرار بگیرد، بدون اینکه نتیجه‌گیری مقاله را قطع کند.",
  ],
  [
    "برای انتخاب تاریخ یک اثر شخصی، روزی را در نظر بگیر که برایت معنا دارد: تولد، سالگرد یا شروع یک خاطره.",
    "فاز ماه بر اساس همان تاریخ محاسبه می‌شود و تصویر تابلو را از یک طرح عمومی به یک یادگاری شخصی تبدیل می‌کند.",
  ],
  [
    "آنچه در تصویر می‌بینی شبیه‌سازی متن یک مقاله است. در سایت اصلی، ویترین فقط در جایگاه تأییدشده و برای محصول قابل سفارش نمایش داده می‌شود.",
  ],
];

const demoSkyText = [
  [
    "نقشهٔ آسمان، چیدمان ستاره‌ها در زمان و مکان مشخص را به تصویر می‌کشد. هر نقطه از زمین نمای متفاوتی از آسمان دارد.",
    "این متن نمونه است و از دیتابیس یا مقالهٔ واقعی خوانده نشده.",
  ],
  [
    "برای ساخت نقشهٔ یک لحظهٔ خاص، تاریخ، ساعت و شهر اطلاعات مهمی‌اند. تغییر زمان یا مکان، نمای آسمان را عوض می‌کند.",
    "یک ویترین مرتبط می‌تواند درست پس از این توضیح و قبل از ادامهٔ مقاله قرار بگیرد.",
  ],
  [
    "صورت‌های فلکی کمک می‌کنند الگوهای آشنای ستاره‌ای را در آسمان بشناسیم. خطوطشان قراردادهای تصویری‌اند، نه مرزهای فیزیکی.",
  ],
  [
    "در نسخهٔ واقعی، هر پیشنهاد فقط پس از تأیید مدیر و بررسی بازبودن فروش نمایش داده می‌شود.",
  ],
];

function demoSections(selection: WikiShopShowcaseDemoSelection): WikiArticleSection[] {
  const text = selection.article.slug === "demo-sky" ? demoSkyText : demoMoonText;
  return selection.article.sections.map((section, index) => ({
    title: section.title,
    paragraphs: text[index] ?? [],
  }));
}

function demoOffer(selection: WikiShopShowcaseDemoSelection): PublicWikiShopShowcase | null {
  if (!selection.product.orderable || !selection.product.image) return null;
  const { placement, product } = selection;
  const section = selection.article.sections[placement.afterSectionIndex];
  if (!section || section.title !== placement.sectionTitle ||
      placement.afterSectionIndex < 1 ||
      placement.afterSectionIndex >= selection.article.sections.length - 1) return null;
  if (!placement.title.trim() || !placement.description.trim() ||
      !placement.buttonLabel.trim()) return null;
  return {
    productId: product.id as PublicWikiShopShowcase["productId"],
    afterSectionIndex: placement.afterSectionIndex,
    sectionTitle: placement.sectionTitle,
    title: placement.title,
    description: placement.description,
    buttonLabel: placement.buttonLabel,
    url: product.url,
    image: product.image,
    imageAlt: product.name,
  };
}

export function WikiShopShowcaseDevWorkspace() {
  const [selection, setSelection] = useState<WikiShopShowcaseDemoSelection | null>(null);
  const onSelectionChange = useCallback((next: WikiShopShowcaseDemoSelection | null) => {
    setSelection(next);
  }, []);

  return (
    <div id="wiki-shop-showcases-dev" className={styles.page} dir="rtl">
      <header className={styles.heading}>
        <div>
          <span className={styles.kicker}>آزمایش رابط کاربری · فقط توسعه</span>
          <h1>ویترین محصولات ویکی</h1>
          <p>سمت مدیریت، متن و جایگاه را ویرایش کن؛ نتیجه را با همان کارت واقعی، میان بخش‌های مقاله ببین.</p>
        </div>
        <div className={styles.headingActions}>
          <a href="#showcase-article-preview" className={styles.jumpLink}>دیدن ویترین در مقاله ↓</a>
          <span className={styles.status}>دادهٔ نمونه · بدون اتصال دیتابیس</span>
        </div>
      </header>

      <div className={styles.columns}>
        <div className={styles.editor}>
          <WikiShopShowcasePanel token="" canWrite demo onDemoPreviewChange={onSelectionChange} />
        </div>

        <aside id="showcase-article-preview" className={styles.preview} aria-label="پیش‌نمایش ویترین داخل مقاله">
          <div className={styles.previewHeading}>
            <div>
              <span className={styles.kicker}>نمای خواننده</span>
              <h2>ویترین در متن مقاله</h2>
              <p>پیش‌نمایش زندهٔ همین انتخاب، با رندرر اصلی ویکی</p>
            </div>
            <span className={styles.previewStatus}>{selection?.saved ? "ذخیره‌شده در حافظه" : "پیشنهاد در حال ویرایش"}</span>
          </div>

          {selection ? (
            <div className={styles.articleCanvas}>
              <div className={wikiStyles.page} style={{ paddingTop: 0, width: "100%" }}>
                <article className={styles.article}>
                  <header className={styles.articleHeading}>
                    <span>ویکی هالیوس · مقالهٔ آزمایشی</span>
                    <h2>{selection.article.title}</h2>
                    <p>بررسی محل قرارگیری یک محصول مرتبط بدون تغییر متن واقعی مقاله یا انتشار عمومی.</p>
                  </header>
                  {!selection.product.orderable ? (
                    <p className={styles.closedProduct}>فروش «{selection.product.name}» فعلاً بسته است؛ کارت خرید در مقاله نشان داده نمی‌شود.</p>
                  ) : null}
                  <WikiArticleBody
                    sections={demoSections(selection)}
                    contextLinks={[]}
                    sources={[]}
                    targets={{}}
                    showcase={demoOffer(selection)}
                  />
                </article>
              </div>
            </div>
          ) : (
            <p className={styles.empty}>برای دیدن جایگاه، یک پیشنهاد را در فرم مدیریت انتخاب کن.</p>
          )}
          <p className={styles.disclaimer}>این فقط شبیه‌سازی تصویری است؛ تأیید و ذخیرهٔ نمونه‌ها سایت واقعی را تغییر نمی‌دهد.</p>
        </aside>
      </div>
    </div>
  );
}
