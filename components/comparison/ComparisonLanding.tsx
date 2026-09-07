import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/lib/config/seo";

import { ComparisonBuilderLink } from "./ComparisonBuilderLink";
import { ComparisonComposer } from "./ComparisonComposer";
import styles from "./comparison-landing.module.css";

const faqItems = [
  {
    question: "آیا چارت ازدواج هالیوس رایگان است؟",
    answer:
      "بله. فعلاً می‌توانید چارت ازدواج رایگان دو نفر را در هالیوس بسازید و تحلیل رابطه را ببینید.",
  },
  {
    question: "محاسبه چارت سیناستری به چه اطلاعاتی نیاز دارد؟",
    answer:
      "تاریخ تولد هر دو نفر لازم است. اگر ساعت و محل تولد را هم بدانید، آن‌ها را وارد کنید تا بخش‌های وابسته به این اطلاعات نیز قابل محاسبه باشند.",
  },
  {
    question: "سینستری و سیناستری با هم فرق دارند؟",
    answer:
      "نه. «سینستری» و «سیناستری» دو شیوهٔ نوشتن Synastry در فارسی هستند و هر دو به مقایسه چارت تولد دو نفر اشاره می‌کنند.",
  },
  {
    question: "آیا چارت ازدواج می‌گوید با چه کسی ازدواج کنم؟",
    answer:
      "نه. تحلیل چارت ازدواج برای شناخت الگوهای یک رابطه است، نه انتخاب همسر یا پیش‌بینی قطعی آیندهٔ رابطه.",
  },
  {
    question: "بدون ساعت تولد هم می‌شود چارت ساخت؟",
    answer:
      "بله. ساعت تولد را «نامشخص» انتخاب کنید. هالیوس بخش‌هایی را تحلیل می‌کند که بدون ساعت دقیق هم قابل محاسبه‌اند.",
  },
  {
    question: "آیا این تحلیل فقط برای ازدواج است؟",
    answer:
      "تمرکز اصلی روی روابط عاطفی و چارت زوجین است، اما بسیاری از الگوهای ارتباطی برای شناخت یک رابطهٔ نزدیک هم قابل استفاده‌اند.",
  },
] as const;

const relationshipAreas = [
  {
    title: "گفت‌وگو و درک متقابل",
    body: "چطور با هم حرف می‌زنید، منظور یکدیگر را می‌فهمید و در زمان اختلاف واکنش نشان می‌دهید.",
  },
  {
    title: "امنیت عاطفی",
    body: "هر نفر چگونه با نیازها و احساسات دیگری روبه‌رو می‌شود و چه چیزهایی می‌توانند احساس آرامش، نزدیکی یا فاصله ایجاد کنند.",
  },
  {
    title: "کشش و صمیمیت",
    body: "الگوهایی که به جذابیت، هیجان و میل به نزدیک شدن مربوط‌اند؛ همراه با تنش‌هایی که ممکن است در همین بخش شکل بگیرند.",
  },
  {
    title: "مرزها و تعهد",
    body: "موضوعاتی مثل مسئولیت، آزادی شخصی، ثبات، فاصله و شیوه‌ای که دو نفر تعهد را تجربه می‌کنند.",
  },
  {
    title: "اصطکاک و ترمیم",
    body: "تنش‌ها معمولاً کجا شکل می‌گیرند و چه الگوهایی می‌توانند برگشتن به گفت‌وگو و نزدیک شدن دوباره را سخت‌تر یا آسان‌تر کنند.",
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

export function ComparisonLanding() {
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
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <div
      className={styles.page}
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
          <p>
            رابطه فقط این نیست که «به هم می‌خوریم یا نه». ممکن است بین دو نفر کشش زیادی وجود داشته باشد اما گفت‌وگو سخت باشد؛ یا رابطه آرام‌تر شروع شود ولی امنیت عاطفی و ثبات بیشتری داشته باشد.
          </p>
          <p>
            در هالیوس می‌توانید با <strong>مقایسه دو چارت تولد</strong> ببینید میان شما در ارتباط، احساسات، کشش، صمیمیت، مرزها و تعهد چه الگوهایی شکل می‌گیرد.
          </p>
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
      </section>

      <section className={styles.section} aria-labelledby="compare-what-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>شناخت روش</span>
          <h2 id="compare-what-title">چارت ازدواج چیست؟</h2>
        </div>
        <p>
          در آسترولوژی، یکی از روش‌های رایج برای بررسی رابطه این است که چارت تولد دو نفر را در کنار هم قرار دهیم و ارتباط میان سیاره‌ها و نقاط مهم آن‌ها را بررسی کنیم.
        </p>
        <p>
          به این روش <strong>سیناستری</strong> یا <strong>چارت سیناستری</strong> گفته می‌شود.
        </p>
        <p>
          برای مثال، ممکن است بعضی ارتباط‌ها با احساس نزدیکی و درک عاطفی همراه باشند و بعضی دیگر اختلاف در شیوهٔ حرف زدن، واکنش نشان دادن یا نزدیک شدن را برجسته کنند.
        </p>
        <p>
          به همین دلیل هالیوس رابطه را با یک برچسب «خوب» یا «بد» خلاصه نمی‌کند. هدف <strong>تحلیل رابطه با چارت تولد</strong> این است که الگوهای مهم میان دو نفر واضح‌تر شوند.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="compare-output-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>داخل گزارش</span>
          <h2 id="compare-output-title">در تحلیل چارت ازدواج چه چیزهایی می‌بینید؟</h2>
          <p>
            گزارش هالیوس ارتباط‌های مهم میان دو چارت را پیدا می‌کند و آن‌ها را در چند موضوع اصلی توضیح می‌دهد.
          </p>
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
      </section>

      <section className={styles.splitSection} aria-labelledby="compare-method-title">
        <div>
          <span className={styles.eyebrow}>روش محاسبه</span>
          <h2 id="compare-method-title">مقایسه دو چارت تولد چطور انجام می‌شود؟</h2>
          <p>
            ابتدا چارت تولد هر دو نفر بر اساس اطلاعات واردشده محاسبه می‌شود. سپس ارتباط سیاره‌ها و نقاط مهم یک چارت با چارت نفر دیگر بررسی می‌شود.
          </p>
          <p>
            در <strong>تفسیر سیناستری</strong> فقط وجود یک زاویه مهم نیست؛ اینکه چه سیاره‌هایی درگیرند، نوع ارتباط چیست و آن الگو بیشتر به کدام بخش رابطه مربوط می‌شود هم اهمیت دارد.
          </p>
        </div>
        <div className={styles.methodCard}>
          <strong>هالیوس نتیجه را به یک نمرهٔ کلی تبدیل نمی‌کند.</strong>
          <p>اطلاعات به شکل الگوهای قابل‌خواندن دربارهٔ رابطه ارائه می‌شوند.</p>
        </div>
      </section>

      <section className={styles.trustSection} aria-labelledby="compare-compatibility-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>بدون نمره‌سازی</span>
          <h2 id="compare-compatibility-title">آیا چارت ازدواج درصد سازگاری می‌دهد؟</h2>
          <p>
            نه. رابطه را نمی‌شود به یک درصد واحد تبدیل کرد. ممکن است دو نفر در کشش و صمیمیت هماهنگی زیادی داشته باشند ولی در امنیت عاطفی یا گفت‌وگو با تفاوت‌های جدی روبه‌رو شوند. در یک رابطهٔ دیگر ممکن است هیجان کمتر باشد اما ثبات و همکاری بیشتر دیده شود.
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
      </section>

      <section className={styles.section} aria-labelledby="compare-technical-title">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>برای جزئیات بیشتر</span>
          <h2 id="compare-technical-title">بخش فنی چارت سیناستری</h2>
          <p>
            اگر بخواهید جزئیات بیشتری ببینید، بخش فنی گزارش <strong>جنبه‌های سیناستری</strong> مهم میان دو نفر را هم نشان می‌دهد.
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
        <p>
          برای هر ارتباط مشخص است کدام سیاره متعلق به کدام نفر است. همچنین در <strong>چرخ دوگانه چارت تولد</strong> می‌توانید هر دو چارت و ارتباط‌های مهم میان آن‌ها را به شکل بصری ببینید.
        </p>
        <p>
          این بخش برای کسانی است که می‌خواهند علاوه بر متن گزارش، ساختار فنی چارت را هم بررسی کنند.
        </p>
      </section>

      <section className={styles.splitSection} aria-labelledby="compare-time-title">
        <div>
          <span className={styles.eyebrow}>وقتی ساعت دقیق نیست</span>
          <h2 id="compare-time-title">سیناستری بدون ساعت تولد</h2>
          <p>
            اگر ساعت تولد یکی از دو نفر را نمی‌دانید، باز هم می‌توانید <strong>سیناستری بدون ساعت تولد</strong> بسازید.
          </p>
          <p>
            هالیوس ساعت نامشخص را با یک ساعت ساختگی جایگزین نمی‌کند. در عوض فقط از اطلاعاتی استفاده می‌شود که با داده‌های موجود قابل محاسبه‌اند.
          </p>
        </div>
        <div className={styles.methodCard}>
          <strong>ساعت دقیق جزئیات بیشتری باز می‌کند.</strong>
          <p>بعضی بخش‌های چارت به ساعت دقیق تولد وابسته‌اند؛ اگر ساعت را می‌دانید آن را وارد کنید.</p>
        </div>
      </section>

      <section className={styles.splitSection} aria-labelledby="compare-name-title">
        <div>
          <span className={styles.eyebrow}>دو روش متفاوت</span>
          <h2 id="compare-name-title">فرق چارت ازدواج با طالع‌بینی ازدواج با اسم چیست؟</h2>
          <p>
            عبارت <strong>طالع بینی ازدواج</strong> برای روش‌های متفاوتی استفاده می‌شود. بعضی از آن‌ها سازگاری را با اسم دو نفر، ابجد، اسم مادر یا ماه تولد بررسی می‌کنند.
          </p>
          <p>
            این روش با چیزی که در هالیوس انجام می‌شود یکی نیست. در هالیوس، نتیجه بر اساس اسم افراد ساخته نمی‌شود؛ تاریخ تولد و در صورت وجود ساعت و محل تولد هر دو نفر گرفته می‌شود، دو چارت تولد محاسبه می‌شوند و سپس ارتباط میان آن‌ها بررسی می‌شود.
          </p>
        </div>
        <div className={styles.methodCard}>
          <strong>طالع بینی ازدواج با اسم دو طرف یک روش متفاوت است.</strong>
          <p>سیناستری بر اساس ساختار دو چارت تولد و ارتباط میان آن‌ها انجام می‌شود.</p>
        </div>
      </section>

      <section className={styles.learningSection} aria-labelledby="compare-learning-title">
        <div>
          <span className={styles.eyebrow}>برای فهم بیشتر</span>
          <h2 id="compare-learning-title">اصطلاحات چارت را در ویکی هالیوس دنبال کنید</h2>
          <p>اگر قبل یا بعد از تحلیل به توضیح مفاهیم پایه نیاز داشتید، بخش آموزشی هالیوس جدا از ابزار در دسترس است.</p>
        </div>
        <div className={styles.linkGrid}>
          <Link href="/wiki">مطالعه در ویکی هالیوس</Link>
          <Link href="/chart">ساخت چارت تولد</Link>
        </div>
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
          <p>
            بعضی الگوها در یک رابطه بارها تکرار می‌شوند. با <strong>مقایسه دو چارت تولد</strong> می‌توانید آن‌ها را واضح‌تر ببینید؛ نه برای اینکه چارت دربارهٔ آیندهٔ رابطه تصمیم بگیرد، بلکه برای اینکه رابطه را بهتر بشناسید.
          </p>
        </div>
        <ComparisonBuilderLink className={styles.primaryButton}>
          ساخت چارت ازدواج رایگان
        </ComparisonBuilderLink>
      </section>
    </div>
  );
}
