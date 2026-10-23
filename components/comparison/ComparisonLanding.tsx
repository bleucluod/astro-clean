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
    answer: "بله. فعلاً می‌توانی چارت ازدواج رایگان دو نفر را در هالیوس بسازی و تحلیل رابطه را ببینی. این وضعیت به شرایط فعلی دسترسی محصول مربوط است.",
  },
  {
    question: "محاسبه چارت سیناستری به چه اطلاعاتی نیاز دارد؟",
    answer: "تاریخ تولد هر دو نفر لازم است. ساعت و شهر تولد، اگر دقیق باشند، بخش‌های بیشتری از چارت را قابل محاسبه می‌کنند. در این صفحه دو چارت ازپیش‌ساخته‌شده را انتخاب می‌کنی؛ اگر هنوز چارت نداری، ابتدا چارت تولد بساز.",
  },
  {
    question: "سینستری و سیناستری با هم فرق دارند؟",
    answer: "نه. «سینستری» و «سیناستری» دو شیوهٔ نوشتن Synastry در فارسی هستند و به یک روش اشاره می‌کنند: مقایسهٔ دو چارت تولد. تفاوت نتیجه از داده‌ها و ارتباط‌های واقعی میان دو چارت می‌آید، نه از شیوهٔ نوشتن نام این روش.",
  },
  {
    question: "آیا چارت ازدواج می‌گوید با چه کسی ازدواج کنم؟",
    answer: "نه. تفسیر چارت ازدواج الگوهای یک رابطه را روشن می‌کند، اما دربارهٔ انتخاب همسر یا موفقیت حتمی رابطه حکم نمی‌دهد. شناخت و رضایت دو نفر، رفتار روزمره و تصمیم‌های واقعی همچنان تعیین‌کننده‌اند.",
  },
  {
    question: "بدون ساعت تولد هم می‌شود چارت ساخت؟",
    answer: "بله. هنگام ساخت چارت، نامعلوم‌بودن ساعت را مشخص کن. در انتخاب‌گر مقایسه نیز ساعت غیرقطعی را دقیق تأیید نکن؛ بخش‌هایی مثل رایزینگ و هم‌پوشانی خانه‌ها از خوانش کنار می‌روند، اما سایر ارتباط‌های قابل اتکا بررسی می‌شوند.",
  },
  {
    question: "آیا این تحلیل فقط برای ازدواج است؟",
    answer: "خیر. تمرکز اصلی صفحه روی رابطهٔ عاطفی و زوجین است، اما در سازنده می‌توانی نوع رابطه را برای دوستی، خانواده، همکاری یا حالت عمومی هم مشخص کنی. نوع رابطه کمک می‌کند توضیح‌های تحلیلی به زمینهٔ واقعی نزدیک‌تر باشند.",
  },
] as const;

const relationshipAreas = [
  {
    title: "گفت‌وگو و درک متقابل",
    body: "چطور با هم حرف می‌زنید، منظور یکدیگر را می‌فهمید و در زمان اختلاف واکنش نشان می‌دهید؟ مثلاً ممکن است یکی برای فکرکردن سکوت بخواهد و دیگری همان سکوت را نشانهٔ فاصله ببیند. خوانش رابطه کمک می‌کند این تفاوت را از بی‌علاقگی جدا کنید و دربارهٔ آن واضح‌تر حرف بزنید.",
  },
  {
    title: "امنیت عاطفی",
    body: "هر نفر چگونه با احساسات دیگری روبه‌رو می‌شود؟ نیاز به توجه، اطمینان، خلوت یا پاسخ‌گرفتن ممکن است برای دو نفر ریتم متفاوتی داشته باشد. در چارت عاطفی رایگان هالیوس، این نیازها کنار کشش و شیوهٔ گفت‌وگو بررسی می‌شوند؛ نمی‌شود میزان عشق دو نفر را با یک عدد از چارت استخراج کرد.",
  },
  {
    title: "کشش و صمیمیت",
    body: "جذابیت، هیجان و میل به نزدیک‌شدن همیشه هم‌معنی آسودگی نیستند. بعضی ارتباط‌ها هم کشش می‌سازند و هم حساسیت. تفسیر نشان می‌دهد کجا صمیمیت راحت‌تر شکل می‌گیرد و کجا هر دو نفر لازم است خواسته‌هایشان را روشن‌تر بیان کنند.",
  },
  {
    title: "مرزها و تعهد",
    body: "آزادی شخصی، مسئولیت، ثبات و فاصلهٔ مناسب در رابطه برای همه معنای یکسانی ندارند. وقتی یکی سریع‌تر به تعریف رابطه می‌رسد و دیگری زمان بیشتری می‌خواهد، موضوع فقط «خوب یا بد بودن سازگاری» نیست؛ مسئله توافق دربارهٔ مرزها و انتظارهاست.",
  },
  {
    title: "اصطکاک و ترمیم",
    body: "در اختلاف‌ها چه الگوهایی تکرار می‌شوند و برگشتن به گفت‌وگو چه زمانی سخت‌تر است؟ یک نفر ممکن است بحث را بلافاصله باز کند و دیگری بعد از آرام‌شدن آمادهٔ حرف‌زدن باشد. بررسی این بخش به جای پیشگویی پایان رابطه، پرسش‌های کاربردی برای ترمیم و همکاری می‌دهد.",
  },
] as const;

const technicalExamples = [
  "ماه یک نفر با زهره نفر دیگر",
  "خورشید با ماه",
  "عطارد با زحل",
  "مریخ با زهره",
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
      name: "چارت ازدواج آنلاین رایگان | مقایسه دو چارت تولد",
      description:
        "چارت ازدواج دو نفر را رایگان بسازید؛ مقایسه دو چارت تولد، تحلیل رابطه، کشش، امنیت عاطفی و جنبه‌های سیناستری، حتی بدون ساعت دقیق تولد.",
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
          <p>دو نفر می‌توانند از همان دیدار اول کشش زیادی به هم داشته باشند، اما هنگام اختلاف انگار به دو زبان متفاوت حرف بزنند. گاهی هم رابطه آرام پیش می‌رود، ولی اعتماد و امنیت عاطفی‌اش عمیق‌تر می‌شود. چارت ازدواج به‌جای چسباندن یک برچسب «سازگار» یا «ناسازگار» به دو نفر، همین تفاوت‌های مشخص را کنار هم می‌گذارد.</p>
          <p>در هالیوس، چارت ازدواج آنلاین از مقایسهٔ دو چارت تولد ساخته می‌شود: جایگاه سیاره‌ها، ارتباط میان آن‌ها و موضوع‌هایی مثل گفت‌وگو، احساسات، کشش، مرزها و تعهد. نتیجه دربارهٔ تجربهٔ یک رابطه حرف می‌زند، نه اینکه به‌جای آدم‌ها برای ازدواج تصمیم بگیرد. فعلاً می‌توانی چارت ازدواج رایگان را همین‌جا بسازی؛ فقط باید چارت تولد هر دو نفر را از قبل داشته باشی.</p>
          <p><strong>ساخت چارت ازدواج در هالیوس فعلاً رایگان است.</strong></p>
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
        <ComparisonComposer embedded />
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="دو چارت را انتخاب کن" />
      </section>

      <section className={styles.section} aria-labelledby="compare-what-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>شناخت روش</span>
          <h2 id="compare-what-title">چارت ازدواج چیست؟</h2>
        </div>
        <p>
          در آسترولوژی، وقتی جایگاه‌های یک چارت تولد با جایگاه‌های چارت نفر دیگر مقایسه می‌شوند، به این روش «سیناستری» می‌گویند. چارت سیناستری نقشهٔ تازه‌ای از زمان ازدواج نیست؛ ارتباط میان دو نقشهٔ تولد است. هر فرد ترکیب خودش را دارد و جنبه‌های میان دو نفر نشان می‌دهند کدام نیازها و شیوه‌های رفتاری در تماس با هم قرار می‌گیرند.
        </p>
        <p>
          به این روش <strong>سیناستری</strong> یا <strong>چارت سیناستری</strong> گفته می‌شود.
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
            اطلاعات تولد دو نفر را وارد کن
          </ComparisonBuilderLink>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="در تحلیل چارت ازدواج چه چیزهایی می‌بینی؟" />
      </section>

      <section className={styles.splitSection} aria-labelledby="compare-method-title">
        <div>
          <span className={styles.eyebrow}>روش محاسبه</span>
          <h2 id="compare-method-title">مقایسه دو چارت تولد چطور انجام می‌شود؟</h2>
          <p>
          ابتدا هر چارت تولد با اطلاعات ثبت‌شدهٔ همان فرد محاسبه شده است. وقتی دو چارت را در سازنده انتخاب می‌کنی، هالیوس ارتباط سیاره‌های یکی با سیاره‌ها و نقاط مهم دیگری را بررسی می‌کند. یک جنبه می‌تواند میان ماهِ نفر اول و زهرهٔ نفر دوم باشد یا میان عطاردِ یکی و زحلِ دیگری. هویت دو نفر در خوانش فنی حفظ می‌شود؛ ارتباط‌ها بی‌نام و یک‌طرفه نیستند.
        </p>
          <p>
            در <strong>تفسیر سیناستری</strong> فقط وجود یک زاویه مهم نیست؛ اینکه چه سیاره‌هایی درگیرند، نوع ارتباط چیست و آن الگو بیشتر به کدام بخش رابطه مربوط می‌شود هم اهمیت دارد.
          </p>
        </div>
        <div className={styles.methodCard}>
          <strong>هالیوس نتیجه را به یک نمرهٔ کلی تبدیل نمی‌کند.</strong>
          <p>اطلاعات به شکل الگوهای قابل‌خواندن دربارهٔ رابطه ارائه می‌شوند.</p>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="مقایسه دو چارت تولد چطور انجام می‌شود؟" />
      </section>

      <section className={styles.trustSection} aria-labelledby="compare-compatibility-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>بدون نمره‌سازی</span>
          <h2 id="compare-compatibility-title">آیا چارت ازدواج درصد سازگاری می‌دهد؟</h2>
          <p>
          نه. رابطه را نمی‌شود با یک عدد خلاصه کرد. ممکن است دو نفر کشش زیادی داشته باشند ولی در امنیت عاطفی و گفت‌وگو چالش‌های مداوم تجربه کنند. دو نفر دیگر ممکن است در شروع کم‌هیجان‌تر باشند، اما دربارهٔ مرزها و مسئولیت‌ها هماهنگی بیشتری پیدا کنند.
        </p>
          <p>
            <strong>سازگاری چارت تولد</strong> در هالیوس یک حکم نهایی دربارهٔ رابطه نیست؛ مجموعه‌ای از الگوهاست که باید در کنار هم دیده شوند.
          </p>
        </div>
        <div className={styles.trustGrid}>
          <article>
            <strong>نقاط نزدیک‌کننده</strong>
            <p>چه الگوهایی دو نفر را به هم نزدیک می‌کنند.</p>
          </article>
          <article>
            <strong>تفاوت‌های تکرارشونده</strong>
            <p>چه تفاوت‌هایی احتمالاً بیشتر خودشان را نشان می‌دهند.</p>
          </article>
          <article>
            <strong>موضوع‌های گفت‌وگو</strong>
            <p>چه موضوعاتی ارزش گفت‌وگوی بیشتری دارند.</p>
          </article>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="آیا چارت ازدواج درصد سازگاری می‌دهد؟" />
      </section>

      <section className={styles.section} aria-labelledby="compare-technical-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>برای جزئیات بیشتر</span>
          <h2 id="compare-technical-title">بخش فنی چارت سیناستری</h2>
          <p>
          در کنار توضیح فارسی، جنبه‌های سیناستری هم قابل بررسی‌اند. برای هر ارتباط مشخص می‌شود کدام سیاره مربوط به کدام نفر است. چرخ دوگانه چارت تولد جایگاه هر دو نقشه و تماس‌های مهم میان آن‌ها را به‌شکل بصری کنار هم قرار می‌دهد.
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
          اگر ساعت تولد یکی از شما نامعلوم است، هنوز بخش‌هایی از سیناستری قابل بررسی‌اند. جای بسیاری از سیاره‌ها و ارتباط‌های میان آن‌ها بدون ساعت دقیق هم به دست می‌آیند؛ اما رایزینگ، محورهای حساس و هم‌پوشانی خانه‌های دو نفر به زمان دقیق وابسته‌اند.
        </p>
        </div>
        <div className={styles.methodCard}>
          <strong>ساعت دقیق جزئیات بیشتری باز می‌کند.</strong>
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
          <strong>طالع بینی ازدواج با اسم دو طرف یک روش متفاوت است.</strong>
          <p>سیناستری بر اساس ساختار دو چارت تولد و ارتباط میان آن‌ها انجام می‌شود.</p>
        </div>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="فرق چارت ازدواج با طالع‌بینی ازدواج با اسم چیست؟" />
      </section>

      <section className={styles.section} aria-labelledby="compare-faq-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>پرسش‌های رایج</span>
          <h2 id="compare-faq-title">سؤال‌های رایج درباره چارت ازدواج و سیناستری</h2>
        </div>
        <div className={styles.faqList}>
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="compare-final-title">
        <div>
          <span className={styles.eyebrow}>رابطه‌تان را از زاویهٔ دیگری ببینید</span>
          <h2 id="compare-final-title">الگوهای میان دو چارت را واضح‌تر ببینید</h2>
        </div>
        <ComparisonBuilderLink className={styles.primaryButton}>
          ساخت چارت ازدواج رایگان
        </ComparisonBuilderLink>
              <R3ApprovedInlineParagraphs page="compare" sectionTitle="الگوهای میان دو چارت را واضح‌تر ببین" />
      </section>
    </div>
  );
}
