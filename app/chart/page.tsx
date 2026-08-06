import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ChartForm } from "@/components/ChartForm";
import {
  getFinalEditorialPage,
  type FinalEditorialBlock,
  type FinalEditorialSection,
} from "@/lib/public-content/final-editorial-content";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

import styles from "./chart-shell.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "چارت تولد رایگان فارسی با تفسیر | هالیوس",
  description:
    "تاریخ، ساعت و شهر تولدت را وارد کن تا چارت تولد رایگان فارسی و گزارش شخصی خورشید، ماه، طالع، خانه‌ها و جنبه‌ها را ببینی؛ با محدودیت روشن برای ساعت نامعلوم.",
  alternates: {
    canonical: "/chart",
  },
};

type WikiArticle = Awaited<
  ReturnType<typeof getPublicWikiCatalog>
>["articles"][number];

type ContextLink = {
  href: string;
  label: string;
};

const TECHNICAL_COPY =
  /\b(?:Known State|Unknown State|Empty State|Not Found State|Loading|Success|Local Fallback|General Error|Engine|CTA|Microcopy|Status)\b/i;

function humanizeText(text: string) {
  return text
    .replaceAll("رایزینگ", "طالع")
    .replaceAll("ترنزیت‌ها", "حرکت‌های آسمان امروز")
    .replaceAll("ترنزیت", "آسمان امروز")
    .replaceAll("نودهای ماه", "گره‌های ماه")
    .replaceAll("اورب", "فاصله زاویه‌ای")
    .replaceAll("Premium", "اشتراک ویژه")
    .replaceAll("موتور محاسباتی", "سامانه محاسبه")
    .replaceAll("موتور محاسبه", "سامانه محاسبه");
}

function hasUnresolvedPlaceholder(text: string) {
  return /\[[A-Z0-9_]+(?:_REQUIRED)?\]/.test(text);
}

function isTechnicalCopy(text: string) {
  return TECHNICAL_COPY.test(text);
}

function isRedundantLinkCopy(text: string) {
  const normalized = humanizeText(text).trim();

  return /(?:لینک|پیوند)(?:‌?ها)?\s*(?:چیست|هستند|مرتبط|[:：])/.test(
    normalized,
  );
}

function InlineText({ text }: { text: string }) {
  const normalizedText = humanizeText(text);
  const parts = normalizedText.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <span key={index}>{part.slice(1, -1)}</span>;
    }

    return part;
  });
}

function visibleBlocks(section: FinalEditorialSection) {
  return section.blocks.filter((block) => {
    if (!("text" in block)) return true;

    return (
      !hasUnresolvedPlaceholder(block.text) &&
      !isTechnicalCopy(block.text) &&
      !isRedundantLinkCopy(block.text)
    );
  });
}

function textFor(
  section: FinalEditorialSection,
  type: FinalEditorialBlock["type"],
) {
  const block = section.blocks.find(
    (item) => item.type === type && "text" in item,
  );

  return block && "text" in block ? humanizeText(block.text) : "";
}

function EditorialBlock({
  block,
}: {
  block: FinalEditorialBlock;
}) {
  if (
    "text" in block &&
    (hasUnresolvedPlaceholder(block.text) ||
      isTechnicalCopy(block.text) ||
      isRedundantLinkCopy(block.text))
  ) {
    return null;
  }

  if (block.type === "subheading") {
    return (
      <h4 className={styles.detailSubheading}>
        <InlineText text={block.text} />
      </h4>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p className={styles.detailParagraph}>
        <InlineText text={block.text} />
      </p>
    );
  }

  if (block.type === "note" || block.type === "fact") {
    return (
      <p className={styles.detailNote}>
        <InlineText text={block.text} />
      </p>
    );
  }

  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";

    return (
      <List className={styles.detailList}>
        {block.items
          .filter(
            (item) =>
              !hasUnresolvedPlaceholder(item) &&
              !isTechnicalCopy(item) &&
              !isRedundantLinkCopy(item),
          )
          .map((item) => (
            <li key={item}>
              <InlineText text={item} />
            </li>
          ))}
      </List>
    );
  }

  return null;
}

function findWikiArticle(
  articles: WikiArticle[],
  keywords: readonly string[],
) {
  return articles.find((article) => {
    const searchable =
      `${article.title} ${article.shortTitle} ${article.summary}`;

    return keywords.some((keyword) => searchable.includes(keyword));
  });
}

function wikiLink(
  articles: WikiArticle[],
  label: string,
  keywords: readonly string[],
): ContextLink {
  const article = findWikiArticle(articles, keywords);

  return {
    label,
    href: article ? `/wiki/${article.slug}` : "/wiki",
  };
}

function linksForSection(
  sectionId: string,
  articles: WikiArticle[],
): ContextLink[] {
  if (sectionId === "report-output-summary") {
    return [
      {
        label: "داخل گزارش چه می‌بینی؟",
        href: "/product",
      },
      wikiLink(articles, "طالع چیست؟", ["رایزینگ", "طالع"]),
      wikiLink(articles, "خانه‌های چارت تولد", ["خانه"]),
      wikiLink(articles, "جنبه‌های اصلی چارت", ["جنبه"]),
    ];
  }

  if (sectionId === "unknown-time-explainer") {
    return [
      wikiLink(
        articles,
        "چارت تولد بدون ساعت دقیق",
        ["بدون ساعت", "ساعت نامعلوم"],
      ),
      wikiLink(
        articles,
        "چرا ساعت تولد مهم است؟",
        ["ساعت تولد", "زمان تولد"],
      ),
    ];
  }

  if (sectionId === "birth-city-explainer") {
    return [
      wikiLink(
        articles,
        "چرا شهر تولد نتیجه را تغییر می‌دهد؟",
        ["شهر تولد", "محل تولد"],
      ),
    ];
  }

  if (sectionId === "chart-vs-horoscope") {
    return [
      wikiLink(
        articles,
        "چارت تولد چیست؟",
        ["چارت تولد چیست", "چارت تولد"],
      ),
    ];
  }

  if (sectionId === "optional-transit-reading") {
    return [
      {
        label: "دیدن آسمان امروز",
        href: "/sky",
      },
    ];
  }

  if (sectionId === "account-save") {
    return [
      {
        label: "گزارش‌های من",
        href: "/reports",
      },
    ];
  }

  if (sectionId === "publication-summary") {
    return [
      {
        label: "قواعد حریم خصوصی هالیوس",
        href: "/privacy",
      },
    ];
  }

  if (sectionId === "chart-faq") {
    return [
      {
        label: "راهنمای کامل در ویکی هالیوس",
        href: "/wiki",
      },
    ];
  }

  return [];
}

function supportSectionTitle(sectionId: string) {
  const titles: Record<string, string> = {
    "report-output-summary": "در تفسیر چارت تولد چه می‌بینی؟",
    "unknown-time-explainer":
      "آیا بدون ساعت دقیق تولد می‌توان چارت تولد ساخت؟",
    "birth-city-explainer":
      "چرا شهر تولد در محاسبه چارت اهمیت دارد؟",
    "optional-transit-reading":
      "آسمان امروز چه تفاوتی با چارت تولد دارد؟",
    "account-save": "چطور گزارش چارت تولد را ذخیره کنیم؟",
    "publication-summary":
      "اطلاعات تولد در نسخه عمومی چگونه محافظت می‌شوند؟",
    "chart-vs-horoscope":
      "تفاوت چارت تولد با فال روزانه چیست؟",
    "chart-faq":
      "چارت تولد رایگان فارسی هالیوس چگونه ساخته می‌شود؟",
  };

  return titles[sectionId] ?? "راهنمای چارت تولد";
}

function SectionLinks({
  links,
}: {
  links: ContextLink[];
}) {
  const uniqueLinks = Array.from(
    new Map(links.map((link) => [link.href, link])).values(),
  );

  if (uniqueLinks.length === 0) return null;

  return (
    <div className={styles.contextLinks}>
      {uniqueLinks.map((link) => (
        <Link href={link.href} key={`${link.href}-${link.label}`}>
          {link.label}
          <span aria-hidden="true">←</span>
        </Link>
      ))}
    </div>
  );
}

function SupportGroup({
  open = false,
  sections,
  title,
  articles,
}: {
  open?: boolean;
  sections: FinalEditorialSection[];
  title: string;
  articles: WikiArticle[];
}) {
  return (
    <details className={styles.supportGroup} open={open}>
      <summary>
        <span>{title}</span>
        <span aria-hidden="true">＋</span>
      </summary>

      <div className={styles.supportGroupBody}>
        {sections.map((section) => {
          const blocks = visibleBlocks(section).filter(
            (block) =>
              block.type !== "h2" &&
              block.type !== "eyebrow" &&
              block.type !== "action",
          );

          return (
            <article
              className={styles.supportSection}
              data-section-id={section.id}
              key={section.id}
            >
              <h3>{supportSectionTitle(section.id)}</h3>

              <div className={styles.supportSectionCopy}>
                {blocks.map((block, index) => (
                  <EditorialBlock
                    block={block}
                    key={`${section.id}-${block.type}-${index}`}
                  />
                ))}
              </div>

              <SectionLinks
                links={linksForSection(section.id, articles)}
              />
            </article>
          );
        })}
      </div>
    </details>
  );
}

export default async function ChartPage() {
  const page = getFinalEditorialPage("chart");
  const sectionById = new Map(
    page.sections.map((section) => [section.id, section]),
  );
  const heroSection = sectionById.get("chart-hero") ?? page.sections[0];

  let wikiArticles: WikiArticle[] = [];

  try {
    const catalog = await getPublicWikiCatalog();
    wikiArticles = sortPublicWikiArticlesNewestFirst(catalog.articles);
  } catch {
    wikiArticles = [];
  }

  const heroParagraphs = heroSection.blocks.filter(
    (
      block,
    ): block is FinalEditorialBlock & {
      type: "paragraph";
      text: string;
    } =>
      block.type === "paragraph" &&
      !hasUnresolvedPlaceholder(block.text) &&
      !isTechnicalCopy(block.text),
  );

  const supportGroups = [
    {
      title: "تفسیر چارت تولد",
      ids: ["report-output-summary"],
    },
    {
      title: "ساعت و شهر تولد در محاسبه چارت",
      ids: ["unknown-time-explainer", "birth-city-explainer"],
    },
    {
      title: "ذخیره گزارش و حریم خصوصی",
      ids: [
        "optional-transit-reading",
        "account-save",
        "publication-summary",
      ],
    },
    {
      title: "پرسش‌های رایج درباره چارت تولد",
      ids: ["chart-vs-horoscope", "chart-faq"],
    },
  ].map((group) => ({
    ...group,
    sections: group.ids
      .map((id) => sectionById.get(id))
      .filter(
        (section): section is FinalEditorialSection =>
          section !== undefined,
      ),
  }));

  const finalCta = sectionById.get("final-cta");

  return (
    <main
      className={styles.page}
      data-editorial-source="reviewed-public-editorial-chart"
      data-motion-system="halleus-chart-refinement-v2"
    >
      <section className={styles.hero} aria-labelledby="chart-page-title">
        <div className={styles.heroAtmosphere} aria-hidden="true">
          <span className={styles.heroOrbitOuter} />
          <span className={styles.heroOrbitInner} />
          <span className={styles.heroStarA}>✦</span>
          <span className={styles.heroStarB}>✧</span>
        </div>

        <div className={styles.heroCopy}>
          <span className={styles.heroKicker}>
            ساخت گزارش شخصی تولد
          </span>

          <h1 className={styles.heroTitle} id="chart-page-title">
            چارت تولد رایگان فارسی
          </h1>

          {heroParagraphs.map((block) => (
            <p className={styles.heroLead} key={block.text}>
              <InlineText text={block.text} />
            </p>
          ))}

          <div className={styles.heroActions}>
            <Link
              className={`${styles.heroPrimary} ${styles.discoveryPrimary}`}
              href="#chart-birth-data-form"
            >
              شروع ساخت گزارش
              <span aria-hidden="true">↓</span>
            </Link>

            <Link
              className={styles.heroSecondary}
              href="#chart-page-faq"
            >
              پرسش‌های رایج
            </Link>
          </div>

          <div className={styles.heroTrustRow}>
            <span>نام، تاریخ، ساعت و شهر</span>
            <span>ساعت ۲۴ ساعته</span>
            <span>نسخه پایه رایگان</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroPlanet}>
            <Image
              alt=""
              height={1400}
              priority
              src="/halleus-logo/symbol-transparent-white.png"
              width={1400}
            />
            <span className={styles.heroPlanetRing} />
          </div>
        </div>
      </section>

      <section
        className={styles.reportStrip}
        aria-label="ساختار اصلی گزارش"
      >
        <div className={styles.reportStripIntro}>
          <span className={styles.sectionEyebrow}>تفسیر چارت تولد</span>
          <strong>در گزارش شخصی تو چه چیزهایی بررسی می‌شود؟</strong>
        </div>

        <div className={styles.reportStripItems}>
          <article>
            <span>۰۱</span>
            <div>
              <strong>تصویر کلی چارت</strong>
              <small>الگوهای اصلی و موضوع‌های پررنگ نقشه تولد</small>
            </div>
          </article>
          <article>
            <span>۰۲</span>
            <div>
              <strong>خورشید، ماه و طالع</strong>
              <small>هویت، نیازهای درونی و شیوه حضور در جهان</small>
            </div>
          </article>
          <article>
            <span>۰۳</span>
            <div>
              <strong>خانه‌ها و جنبه‌ها</strong>
              <small>حوزه‌های زندگی و رابطه میان بخش‌های چارت</small>
            </div>
          </article>
        </div>

        <Link className={styles.reportStripPrivacy} href="/privacy">
          نام و جزئیات تولد در نسخه عمومی پنهان می‌مانند
          <span aria-hidden="true">←</span>
        </Link>
      </section>

      <section
        className={styles.workspace}
        aria-labelledby="birth-data-heading"
      >
        <div className={styles.formPanel}>
          <div className={styles.formPanelHeading}>
            <span className={styles.sectionEyebrow}>
              محاسبه چارت تولد
            </span>
            <h2 id="birth-data-heading">ساخت چارت تولد آنلاین</h2>
            <p>
              نام، تاریخ تولد، ساعت تولد و شهر تولدت را وارد کن تا
              نقشه تولد شخصی و تفسیر فارسی چارت آماده شود. اگر ساعت
              دقیق را ندانی، محدودیت طالع و خانه‌ها روشن توضیح داده
              می‌شود.
            </p>
          </div>

          <ChartForm />

          <details className={styles.formGuide}>
            <summary>
              <span>راهنمای کوتاه تکمیل فرم</span>
              <span aria-hidden="true">＋</span>
            </summary>

            <ul>
              <li>
                تاریخ تولد را با تقویم شمسی یا میلادی وارد کن.
              </li>
              <li>
                ساعت با قالب ۲۴ ساعته و در دو بخش ساعت و دقیقه
                انتخاب می‌شود.
              </li>
              <li>
                شهر را از پیشنهادهای هالیوس انتخاب کن تا منطقه
                زمانی درست به کار برود.
              </li>
            </ul>
          </details>
        </div>
      </section>

      <section className={styles.education} id="chart-page-faq">
        <div className={styles.educationHeading}>
          <span className={styles.sectionEyebrow}>
            راهنمای چارت تولد
          </span>
          <h2>پرسش‌های رایج درباره محاسبه و تفسیر چارت تولد</h2>
          <p>
            پاسخ روشن پرسش‌های مربوط به ساعت تولد، شهر تولد، طالع،
            خانه‌ها، ذخیره گزارش و تفاوت چارت تولد با فال روزانه را
            اینجا می‌خوانی.
          </p>
        </div>

        <div className={styles.supportStack}>
          {supportGroups.map((group) => (
            <SupportGroup
              articles={wikiArticles}
              key={group.title}
              sections={group.sections}
              title={group.title}
            />
          ))}
        </div>
      </section>

      {finalCta ? (
        <section className={styles.finalCta}>
          <span className={styles.sectionEyebrow}>ساخت گزارش</span>
          <h2>
            {textFor(finalCta, "h2") ||
              "آماده‌ای گزارش خودت را بسازی؟"}
          </h2>
          <p>
            نام، تاریخ، ساعت و شهر تولدت را وارد کن تا محاسبه چارت
            تولد رایگان فارسی شروع شود.
          </p>
          <Link
            className={`${styles.heroPrimary} ${styles.discoveryPrimary}`}
            href="#chart-birth-data-form"
          >
            رفتن به فرم ساخت گزارش
            <span aria-hidden="true">↑</span>
          </Link>
        </section>
      ) : null}
    </main>
  );
}
