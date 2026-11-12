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
    "گاهی دیدن ماهِ روز تولد، خاطره‌ای رو زنده می‌کنه که سال‌ها گذشته؛ اما تصویر ماه در هر تاریخ یکسان نیست.",
  ],
  [
    "ماه به دور زمین می‌گردد و با تغییر زاویهٔ خورشید، زمین و ماه، مقدار متفاوتی از سطح روشن آن را می‌بینیم.",
    "به همین دلیل دو تاریخ نزدیک هم می‌تونن دو تصویر متفاوت از ماه داشته باشن؛ یکی هلال، یکی روشن‌تر و پُرتر.",
  ],
  [
    "برای انتخاب تاریخ یک اثر شخصی، روزی را در نظر بگیر که برایت معنا دارد: تولد، سالگرد یا شروع یک خاطره.",
    "فاز ماه بر اساس همان تاریخ محاسبه می‌شود و تصویر تابلو را از یک طرح عمومی به یک یادگاری شخصی تبدیل می‌کند.",
  ],
  [
    "وقتی تاریخ مشخصه، می‌شه فاز ماهِ همون روز رو حساب کرد و تصویری از اون لحظه داشت؛ تصویری که برای هر کسی می‌تونه داستان خودش رو داشته باشه.",
  ],
];

const demoSkyText = [
  [
    "نقشهٔ آسمان، چیدمان ستاره‌ها در زمان و مکان مشخص را به تصویر می‌کشد. هر نقطه از زمین نمای متفاوتی از آسمان دارد.",
    "هر نقطه از آسمان، وقتی به یک خاطره گره بخوره، معنی تازه‌ای پیدا می‌کنه.",
  ],
  [
    "برای ساخت نقشهٔ یک لحظهٔ خاص، تاریخ، ساعت و شهر اطلاعات مهمی‌اند. تغییر زمان یا مکان، نمای آسمان را عوض می‌کند.",
    "مثلاً دو نفر که یک روز به دنیا اومدن، اما شهر تولدشون فرق داره، ممکنه منظرهٔ یکسانی از ستاره‌ها ندیده باشن.",
  ],
  [
    "صورت‌های فلکی کمک می‌کنند الگوهای آشنای ستاره‌ای را در آسمان بشناسیم. خطوطشان قراردادهای تصویری‌اند، نه مرزهای فیزیکی.",
  ],
  [
    "یک نقشهٔ خوب از آسمان، هم جای ستاره‌ها رو نشان می‌ده و هم می‌ذاره با نگاه اول، حس اون شب رو به یاد بیاری.",
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
        <h1>پیش‌نمایش ویترین</h1>
        <a href="#showcase-article-preview" className={styles.jumpLink}>دیدن کارت در مقاله ↓</a>
      </header>

      <div className={styles.columns}>
        <div className={styles.editor}>
          <WikiShopShowcasePanel token="" canWrite demo onDemoPreviewChange={onSelectionChange} />
        </div>

        <aside id="showcase-article-preview" className={styles.preview} aria-label="پیش‌نمایش ویترین داخل مقاله">
          <div className={styles.previewHeading}>
            <h2>نمای مقاله</h2>
            <span className={styles.previewStatus}>{selection?.saved ? "ذخیره‌شده" : "در حال ویرایش"}</span>
          </div>

          {selection ? (
            <div className={styles.articleCanvas}>
              <div className={wikiStyles.page} style={{ paddingTop: 0, width: "100%" }}>
                <article className={styles.article}>
                  <header className={styles.articleHeading}>
                    <span>ویکی هالیوس</span>
                    <h2>{selection.article.title}</h2>
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
            <p className={styles.empty}>یک پیشنهاد رو انتخاب کن تا اینجا ببینیش.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
