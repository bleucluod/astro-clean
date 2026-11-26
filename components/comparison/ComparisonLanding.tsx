import { R3ApprovedInlineParagraphs } from "@/components/r3-approved-visible-copy";
import Image from "next/image";


import { siteConfig } from "@/lib/config/seo";
import { getPublicReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";

import { ComparisonBuilderLink } from "./ComparisonBuilderLink";
import { ComparisonComposer } from "./ComparisonComposer";
import styles from "./comparison-landing.module.css";

const faqItems = [
  {
    question: "آیا چارت ازدواج هالیوس رایگان است؟",
    answer: "بله. در حال حاضر می‌توانی دو چارت را بدون هزینهٔ گزارش مقایسه کنی و خوانش رابطه را ببینی.",
  },
  {
    question: "محاسبه چارت سیناستری به چه اطلاعاتی نیاز دارد؟",
    answer: "تاریخ و شهر تولد هر دو نفر لازم است. اگر ساعت تولد را می‌دانی، آن را هم وارد کن تا جزئیات بیشتری قابل بررسی باشد. بعد از ساخت هر چارت تولد، آن را در همین صفحه انتخاب کن.",
  },
  {
    question: "سینستری و سیناستری با هم فرق دارند؟",
    answer: "نه. هر دو نام به یک روش اشاره دارند: مقایسهٔ جایگاه‌ها و ارتباط‌های نجومی دو چارت تولد.",
  },
  {
    question: "آیا چارت ازدواج می‌گوید با چه کسی ازدواج کنم؟",
    answer: "نه. گزارش می‌تواند به شناخت تفاوت‌ها و پیدا کردن موضوعی برای گفت‌وگو کمک کند. انتخاب همسر، آیندهٔ رابطه و رفتار واقعی هر فرد را نمی‌توان از روی چارت تعیین کرد.",
  },
  {
    question: "بدون ساعت تولد هم می‌شود چارت ساخت؟",
    answer: "بله. کافی است هنگام ساخت و انتخاب چارت مشخص کنی ساعت تولد را نمی‌دانی. گزارش فقط بر شواهد معتبر همان اطلاعات تکیه می‌کند و جزئیات وابسته به ساعت دقیق را قطعی نمی‌خواند.",
  },
  {
    question: "آیا این تحلیل فقط برای ازدواج است؟",
    answer: "نه. رابطهٔ عاطفی، دوستی، خانوادگی، کاری یا عمومی را انتخاب کن. خوانش متناسب با نوع رابطه ارائه می‌شود؛ مثلاً در رابطهٔ کاری، نزدیکی می‌تواند به معنای همکاری باشد، نه علاقهٔ عاشقانه.",
  },
] as const;

const relationshipAreas = [
  {
    title: "گفت‌وگو و درک متقابل",
    body: "یک نفر برای فهمیدن موضوع سؤال می‌پرسد و دیگری ممکن است آن را ایراد گرفتن بداند. این فصل به تفاوت قصد گوینده و برداشت شنونده می‌پردازد.",
  },
  {
    title: "امنیت عاطفی",
    body: "گاهی محبت ابراز می‌شود اما به شکلی نیست که طرف مقابل انتظار دارد. این فصل به نیازهای عاطفی هر نفر و شیوهٔ دریافت حمایت می‌پردازد.",
  },
  {
    title: "کشش و صمیمیت",
    body: "گاهی کشش از یک پیشنهاد ناگهانی شروع می‌شود و گاهی از آشنایی تدریجی. این فصل بررسی می‌کند چه چیزی میل به نزدیکی را بیدار می‌کند و ریتم دو نفر کجا با هم فرق دارد.",
  },
  {
    title: "مرزها و تعهد",
    body: "یک برنامهٔ مشترک ممکن است برای یک نفر قول باشد و برای دیگری پیشنهادی قابل تغییر. این فصل به توافق، مسئولیت و فضای شخصی می‌پردازد.",
  },
  {
    title: "اصطکاک و ترمیم",
    body: "بعد از شروع اختلاف، واکنش یکی چه پاسخی از دیگری برمی‌انگیزد؟ این فصل مسیر تشدید تنش و نقطه‌ای را بررسی می‌کند که تغییر یک واکنش می‌تواند به ترمیم کمک کند.",
  },
] as const;

const technicalExamples = [
  "سیاره‌های درگیر",
  "نوع جنبه",
  "فاصلهٔ زاویه‌ای",
  "اعتبار اطلاعات تولد",
] as const;

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// HALLEUS_SITEWIDE_SEO_HOMEPAGE_REFRESH_R1
export async function ComparisonLanding() {
  const accessPolicy = await getPublicReportAccessPolicy();
  const freeAllAccess = accessPolicy.monetizationMode === "FREE_ALL";
  const effectiveFaqItems = freeAllAccess
    ? faqItems
    : faqItems.filter(
        (item) => item.question !== "آیا چارت ازدواج هالیوس رایگان است؟",
      );
  const pageUrl = `${siteConfig.url}/compare`;
  const heroImageUrl = `${siteConfig.url}/halleus-synastry-chart-comparison.webp`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "چارت ازدواج آنلاین | مقایسه دو چارت تولد",
      description:
        "چارت ازدواج دو نفر؛ تحلیل رابطه، گفت‌وگو، کشش، امنیت عاطفی و جنبه‌های سیناستری، با توجه به اعتبار اطلاعات تولد.",
      url: pageUrl,
      inLanguage: "fa-IR",
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: heroImageUrl,
        width: 1448,
        height: 1086,
        caption: "نمونهٔ بصری چارت سیناستری دو نفر در هالیوس",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "چارت ازدواج و سیناستری هالیوس",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      url: pageUrl,
      image: heroImageUrl,
      description:
        "ابزار مقایسه دو چارت تولد برای تحلیل رابطه و ازدواج بدون درصد سازگاری یا حکم قطعی.",
      ...(freeAllAccess
        ? {
            isAccessibleForFree: true,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "IRR",
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "هالیوس", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "چارت ازدواج و سیناستری", item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: effectiveFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <div
      className={styles.page}
      id="compare-public-landing"
      data-editorial-source="reviewed-public-editorial-compare"
      data-halleus-compare-landing="roadmap-slice1"
    >
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ))}

      <section className={styles.hero} aria-labelledby="compare-page-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>مقایسه دو چارت تولد</span>
          <h1 id="compare-page-title">چارت ازدواج و سیناستری دو نفر</h1>
          <p>ممکن است کنار کسی که دوستش داری، بعضی کارها را به‌راحتی پیش ببری و در موقعیتی دیگر از واکنش او غافلگیر شوی. اگر فقط خصوصیات فردی هر کدام را بخوانی، بخش مهمی از داستان رابطه ناگفته می‌ماند: اینکه حضور هر نفر چه چیزی را در دیگری پررنگ می‌کند.</p>
          <p>تحلیل رابطه با چارت تولد در هالیوس یک گزارش فارسی دربارهٔ همین دو نفر است. پنج فصل آن به جنبه‌های متفاوت رابطه می‌پردازد؛ از نحوهٔ شنیدن حرف یکدیگر تا واکنش‌های دو نفر هنگام اختلاف.</p>
          {freeAllAccess ? <p><strong>ساخت چارت ازدواج رایگان</strong> در حال حاضر در دسترس است.</p> : <p>شرایط دسترسی به گزارش هنگام انتخاب دو چارت نمایش داده می‌شود.</p>}
          <div className={styles.heroActions}>
            <ComparisonBuilderLink className={styles.primaryButton}>
              چارت دو نفر را مقایسه کن
            </ComparisonBuilderLink>
          </div>
          <div className={styles.trustLine} aria-label="ویژگی‌های تحلیل رابطه">
            <span>بدون درصد سازگاری</span>
            <span>قابل استفاده با ساعت نامعلوم</span>
          </div>
        </div>

        <figure className={styles.heroMedia}>
          <Image
            alt="نمونهٔ چارت سیناستری دو نفر با ارتباط‌های میان سیاره‌ها در هالیوس"
            className={styles.heroImage}
            fill
            preload
            sizes="100vw"
            src="/halleus-synastry-chart-comparison.webp"
            unoptimized
          />
        </figure>
      </section>

      <section
        id="compare-builder"
        className={styles.builderShell}
        aria-label="سازنده چارت ازدواج و سیناستری"
        tabIndex={-1}
      >
        <h2 className={styles.builderTitle}>دو چارت را انتخاب کن</h2>
        <ComparisonComposer embedded />
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="دو چارت را انتخاب کن" />
      </section>

      <section className={styles.section} aria-labelledby="compare-what-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>شناخت روش</span>
          <h2 id="compare-what-title">چارت ازدواج چیست؟</h2>
        </div>
        <p>
          چارت زوجین یا سیناستری در آسترولوژی، مقایسهٔ دو نقشهٔ تولد است؛ نه نقشهٔ لحظهٔ ازدواج. در این روش به جای مقایسهٔ دو نشان خورشیدی، ارتباط میان سیاره‌ها و نقاط معتبر هر دو نفر بررسی می‌شود.
        </p>
        
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="چارت ازدواج چیست؟" />
      </section>

      <section className={styles.section} aria-labelledby="compare-output-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>داخل گزارش</span>
          <h2 id="compare-output-title">در تحلیل چارت ازدواج چه چیزهایی می‌بینید؟</h2>
        </div>
        <div className={styles.outputGrid}>
          {relationshipAreas.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <div className={styles.sectionAction} data-compare-cta="after-preview">
          <ComparisonBuilderLink className={styles.secondaryButton}>
            تحلیل رابطه‌ات را بساز
          </ComparisonBuilderLink>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="در تحلیل چارت ازدواج چه چیزهایی می‌بینید؟" />
      </section>

      <section className={styles.splitSection} aria-labelledby="compare-method-title">
        <div>
          <span className={styles.eyebrow}>روش محاسبه</span>
          <h2 id="compare-method-title">مقایسه دو چارت تولد چطور انجام می‌شود؟</h2>
          <p>
          هر چارت ابتدا با اطلاعات تولد همان فرد محاسبه می‌شود. پس از انتخاب دو چارت، هالیوس فاصلهٔ زاویه‌ای میان سیاره‌ها و نقاط معتبر هر دو نفر را بررسی می‌کند. برای هر تماس مشخص است کدام نقطه به کدام نفر تعلق دارد.
        </p>
          <p>
            در <strong>تفسیر سیناستری</strong> معنای یک زاویه به سیاره‌های درگیر وابسته است. دو زاویهٔ هم‌اندازه میان سیاره‌های متفاوت لزوماً معنای یکسانی ندارند.
          </p>
        </div>
        <div className={styles.methodCard}>
          <strong>تعداد جنبه‌ها به‌تنهایی تعیین‌کننده نیست.</strong>
          <p>ممکن است یک تماس برای فهم موضوعی مهم باشد، اما در فصل دیگری ارزش توضیحی چندانی نداشته باشد.</p>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="مقایسه دو چارت تولد چطور انجام می‌شود؟" />
      </section>

      <section className={styles.trustSection} aria-labelledby="compare-compatibility-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>بدون نمره‌سازی</span>
          <h2 id="compare-compatibility-title">آیا چارت ازدواج درصد سازگاری می‌دهد؟</h2>
          <p>
          نه. یک عدد نمی‌تواند نشان دهد که هماهنگی در کدام موضوع است و اختلاف در کدام موضوع. خوانش نمادین نجومی هم سنجهٔ علمی موفقیت رابطه نیست.
        </p>
          <p>
            در بررسی <strong>سازگاری چارت تولد</strong>، تفاوت لزوماً به معنای مشکل نیست؛ مهم است دو نفر در عمل با آن چه می‌کنند.
          </p>
        </div>
        <div className={styles.trustGrid}>
          <article>
            <strong>نقاط نزدیک‌کننده</strong>
            <p>چه چیزی در رابطه ارزش حفظ‌کردن دارد؟</p>
          </article>
          <article>
            <strong>تفاوت‌های تکرارشونده</strong>
            <p>کدام موقعیت به توافق روشن‌تری نیاز دارد؟</p>
          </article>
          <article>
            <strong>موضوع‌های گفت‌وگو</strong>
            <p>چه پرسشی می‌تواند برداشت دو نفر را روشن کند؟</p>
          </article>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="آیا چارت ازدواج درصد سازگاری می‌دهد؟" />
      </section>

      <section className={styles.section} aria-labelledby="compare-technical-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>برای جزئیات بیشتر</span>
          <h2 id="compare-technical-title">بخش فنی چارت سیناستری</h2>
          <p>
          در بخش فنی می‌توانی جنبه‌های سیناستری را جدا از روایت بررسی کنی. چرخ دوگانه چارت تولد جایگاه هر دو نقشه و تماس‌های مهم میان آن‌ها را به‌شکل بصری کنار هم قرار می‌دهد.
        </p>
        </div>
        <div className={styles.outputGrid}>
          {technicalExamples.map((item, index) => (
            <article key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="بخش فنی چارت سیناستری" />
      </section>

      <section className={styles.splitSection} aria-labelledby="compare-time-title">
        <div>
          <span className={styles.eyebrow}>وقتی ساعت دقیق نیست</span>
          <h2 id="compare-time-title">سیناستری بدون ساعت تولد</h2>
          <p>
          اگر ساعت تولد یکی از دو نفر نامعلوم است، گزارش همچنان می‌تواند بخشی از ارتباط‌ها را بررسی کند. رایزینگ و هم‌پوشانی خانه‌های وابسته به ساعت آن نفر محدود می‌شوند؛ جایگاه‌های حساس به زمان را هم نباید قطعی خواند.
        </p>
        </div>
        <div className={styles.methodCard}>
          <strong>ساعت نامعلوم را دقیق اعلام نکن.</strong>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="سیناستری بدون ساعت تولد" />
      </section>

      <section className={styles.splitSection} aria-labelledby="compare-name-title">
        <div>
          <span className={styles.eyebrow}>دو روش متفاوت</span>
          <h2 id="compare-name-title">فرق چارت ازدواج با طالع‌بینی ازدواج با اسم چیست؟</h2>
          <p>
          طالع‌بینی ازدواج با اسم دو طرف، ابجد یا اسم مادر، روشی متفاوت از سیناستری است. هالیوس برای محاسبهٔ سیناستری به اسم افراد امتیاز نمی‌دهد؛ مبنا، دو چارت تولد و ارتباط‌های میان آن‌هاست. حتی دو نفر با اسم یکسان می‌توانند چارت‌های تولد کاملاً متفاوتی داشته باشند.
        </p>
        </div>
        <div className={styles.methodCard}>
          <strong>نام‌ها برای تشخیص صاحب چارت به کار می‌روند.</strong>
          <p>در انتخاب چارت، تاریخ و شهر تولد را هم بررسی کن.</p>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="فرق چارت ازدواج با طالع‌بینی ازدواج با اسم چیست؟" />
      </section>

      <section className={styles.section} aria-labelledby="compare-faq-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>پرسش‌های رایج</span>
          <h2 id="compare-faq-title">سؤال‌های رایج درباره چارت ازدواج و سیناستری</h2>
        </div>
        <div className={styles.faqList}>
          {effectiveFaqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="compare-final-title">
        <div>
          <span className={styles.eyebrow}>یک رابطه، دو نگاه</span>
          <h2 id="compare-final-title">الگوهای میان دو چارت را واضح‌تر ببین</h2>
        </div>
        <ComparisonBuilderLink className={styles.primaryButton}>
          {freeAllAccess ? "ساخت چارت ازدواج رایگان" : "شروع مقایسهٔ دو چارت"}
        </ComparisonBuilderLink>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="الگوهای میان دو چارت را واضح‌تر ببین" />
      </section>
    </div>
  );
}
