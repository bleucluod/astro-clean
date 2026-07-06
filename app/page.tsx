import type { Metadata } from "next";
import Link from "next/link";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { SkyPulseDateCard } from "@/components/SkyPulseDateCard";

export const metadata: Metadata = {
  title: "Halleus | گزارش تولد فارسی و نبض آسمان",
  description:
    "Halleus چارت تولد را به یک گزارش فارسی، انسانی و قابل مرور تبدیل می‌کند و نبض امروز را با ماه اکنون و فاز ماه نشان می‌دهد.",
  alternates: {
    canonical: "/",
  },
};

const reportFeatureCards = [
  {
    icon: "☉☾",
    status: "فعال",
    title: "خورشید، ماه و طالع",
    description:
      "سه ستون اصلی گزارش کمک می‌کنند خودت را از زاویه هویت، نیاز احساسی و شیوه حضور ببینی.",
  },
  {
    icon: "⌂",
    status: "فعال",
    title: "خانه‌ها و میدان‌های زندگی",
    description:
      "گزارش نشان می‌دهد هر انرژی بیشتر در کدام بخش زندگی دیده می‌شود؛ رابطه، کار، ریشه، بدن یا مسیر رشد.",
  },
  {
    icon: "◇",
    status: "فعال",
    title: "جنبه‌های سیاره‌ای",
    description:
      "رابطه‌های مهم میان سیاره‌ها به زبان ساده خوانده می‌شوند: کجا کشش داری، کجا حمایت، و کجا تمرین رشد.",
  },
  {
    icon: "✧",
    status: "فعال",
    title: "ASC / DSC / MC / IC",
    description:
      "زاویه‌های اصلی چارت برای فهم حضور، رابطه، مسیر بیرونی و ریشه درونی در گزارش آمده‌اند.",
  },
  {
    icon: "↺",
    status: "فعال",
    title: "برگشتی‌ها و دست‌های ماه",
    description:
      "گزارش وضعیت برگشتی‌ها و دست‌های ماه را با صداقت فنی و بدون ادعای مدل‌های محاسبه‌نشده توضیح می‌دهد.",
  },
  {
    icon: "◐",
    status: "در مسیر",
    title: "فاز ماه تولد",
    description:
      "فاز ماه امروز روی صفحه اصلی واقعی شده است؛ فاز ماه تولد بعداً با همین مرز صداقت وارد گزارش شخصی خواهد شد.",
  },
];

const howItWorks = [
  {
    icon: "✎",
    title: "اطلاعات تولد را وارد کن",
    description:
      "تاریخ، ساعت و شهر تولد را وارد می‌کنی تا چارت تولدت بر اساس داده واقعی ساخته شود.",
  },
  {
    icon: "▣",
    title: "گزارش فارسی را بخوان",
    description:
      "گزارش به جای فهرست خام، یک خوانش انسانی از الگوهای اصلی چارت به تو می‌دهد.",
  },
  {
    icon: "◐",
    title: "نبض امروز را ببین",
    description:
      "در صفحه اصلی، ماه اکنون و فاز ماه هر روز با زمان و افق تهران تازه می‌شود.",
  },
  {
    icon: "↶",
    title: "بعداً به گزارش برگرد",
    description:
      "گزارش‌ها در مسیر خصوصی نگه داشته می‌شوند تا بتوانی آرام‌تر بخوانی و دوباره مرور کنی.",
  },
];

const trustCards = [
  {
    icon: "◇",
    title: "محاسبه واقعی، نه متن تصادفی",
    description:
      "گزارش از داده تولد و خروجی چارت ساخته می‌شود. اگر ساعت یا شهر تولد دقیق نباشد، بعضی بخش‌ها با احتیاط خوانده می‌شوند.",
  },
  {
    icon: "⚖",
    title: "زبان نمادین، نه حکم قطعی",
    description:
      "هالیوس برای تأمل و خودشناسی است؛ جایگزین مشورت تخصصی یا تصمیم‌گیری جدی نمی‌شود.",
  },
  {
    icon: "⌁",
    title: "خصوصی تا زمان رضایت روشن",
    description:
      "در وضعیت فعلی گزارش‌ها عمومی و قابل ایندکس نیستند. هر مدل انتشار عمومی بعداً باید با رضایت روشن کاربر طراحی شود.",
  },
];

const futureModules = [
  {
    title: "نبض آسمان دقیق‌تر",
    description:
      "نسخه امروز با ماه و فاز ماه شروع شده است؛ ترنزیت‌های روز و موقعیت کاربر در مراحل بعدی و با منبع قابل اعتماد اضافه می‌شوند.",
  },
  {
    title: "فاز ماه تولد در گزارش",
    description:
      "بعد از تثبیت محاسبه روزانه، فاز ماه تولد می‌تواند کنار ماه تولد و ریتم احساسی وارد گزارش شخصی شود.",
  },
  {
    title: "کتابخانه محتوای فارسی",
    description:
      "بعد از تثبیت مسیر گزارش و preview محصول، محتوای آموزشی فارسی و wiki می‌تواند آرام‌تر و با کیفیت وارد مسیر شود.",
  },
];

const faqItems = [
  {
    question: "آیا هالیوس فال روزانه است؟",
    answer:
      "نه. هالیوس از چارت تولد و زبان نمادین آسترولوژی برای خودشناسی استفاده می‌کند. نبض امروز هم یک خوانش کوتاه از ماه اکنون و فاز ماه است، نه پیش‌بینی قطعی.",
  },
  {
    question: "نبض آسمان امروز بر اساس کجاست؟",
    answer:
      "فعلاً با زمان و افق تهران تنظیم می‌شود. انتخاب شهرهای دیگر بعداً بر اساس موقعیت کاربر اضافه خواهد شد.",
  },
  {
    question: "آیا گزارش من عمومی یا قابل ایندکس می‌شود؟",
    answer:
      "نه در وضعیت فعلی. گزارش‌ها برای مسیر خصوصی ساخته می‌شوند و هر انتشار عمومی بعداً باید با رضایت روشن طراحی شود.",
  },
  {
    question: "اگر ساعت تولدم دقیق نباشد چه؟",
    answer:
      "بخش‌هایی مثل طالع، خانه‌ها و زاویه‌ها به ساعت و شهر تولد حساس‌اند. گزارش باید این محدودیت را صادقانه نشان دهد.",
  },
];

const sampleReportCards = [
  { icon: "☉", label: "سه تن اصلی چارت" },
  { icon: "⌂", label: "میدان زندگی" },
  { icon: "☌", label: "گفت‌وگوی درونی" },
  { icon: "▤", label: "جمع‌بندی" },
];

export default function Home() {
  return (
    <section className="homepage-redesign" data-page="home">
      <section className="home-app-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <span className="home-brand-kicker">هالیوس</span>

          <h1 id="home-hero-title">هالیوس؛ تولد تو فقط یک تاریخ نیست</h1>

          <p className="hero-lede">
            چارت تولدت را به زبان فارسی بخوان؛ گزارشی برای دیدن الگوهای شخصی،
            رابطه‌ها، مسیر رشد و ریتم درونی‌ات. کنار آن، نبض امروز هم با ماه
            اکنون و فاز ماه تازه می‌شود.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions home-hero-actions">
            <Link className="button home-primary-cta" href="/chart">
              <span aria-hidden="true">✦</span>
              گزارش تولدم را بساز
            </Link>

            <Link className="button secondary" href="#report-preview">
              <span aria-hidden="true">▣</span>
              نمونه خوانش
            </Link>
          </div>
        </div>

        <div className="home-hero-visual" aria-label="نمای آسمان امروز">
          <div className="home-sky-illustration" aria-hidden="true">
            <span className="home-crescent">☾</span>
            <span className="home-star home-star-one">✦</span>
            <span className="home-star home-star-two">✧</span>
            <span className="home-orbit home-orbit-one" />
            <span className="home-orbit home-orbit-two" />
            <span className="home-sun-core" />
            <span className="home-zodiac-sign home-zodiac-a">♓</span>
            <span className="home-zodiac-sign home-zodiac-b">♊</span>
            <span className="home-zodiac-sign home-zodiac-c">♌</span>
            <span className="home-zodiac-sign home-zodiac-d">♎</span>
            <span className="home-zodiac-sign home-zodiac-e">♐</span>
          </div>

          <div className="home-hero-pulse">
            <SkyPulseDateCard />
          </div>
        </div>
      </section>

      <section className="home-section home-what-section" aria-labelledby="what-is-halleus">
        <div className="home-section-heading">
          <div>
            <span className="section-label">هالیوس چیست؟</span>
            <h2 id="what-is-halleus">یک خوانش فارسی از چارت تولد، برای خودشناسی</h2>
          </div>

          <p>
            هالیوس چارت تولدت را به یک گزارش فارسی و قابل خواندن تبدیل می‌کند؛
            گزارشی که به جای حکم دادن، کمک می‌کند الگوهای تکرارشونده، نیازهای
            احساسی، میدان‌های زندگی و مسیر رشدت را با زبان نمادین ببینی.
          </p>
        </div>

        <div className="home-feature-strip" aria-label="لایه‌های اصلی گزارش">
          {reportFeatureCards.map((item) => (
            <article className="home-icon-tile" key={item.title}>
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.title}</strong>
              <small>{item.status}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-steps-section" aria-labelledby="how-it-works">
        <div className="home-section-heading compact">
          <div>
            <span className="section-label">مسیر استفاده</span>
            <h2 id="how-it-works">از تولد تا گزارش، با یک مسیر روشن</h2>
          </div>
        </div>

        <div className="home-step-timeline">
          {howItWorks.map((step, index) => (
            <article className="home-step-card" key={step.title}>
              <span className="home-step-number">{(index + 1).toLocaleString("fa-IR")}</span>
              <span className="home-step-icon" aria-hidden="true">
                {step.icon}
              </span>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <HomepageProductProof />

      <section className="home-section home-report-layers" aria-labelledby="report-features">
        <div className="home-section-heading">
          <div>
            <span className="section-label">در گزارش کامل چه می‌آید؟</span>
            <h2 id="report-features">یک گزارش، چند لایه خوانش</h2>
          </div>

          <p>
            هر بخش گزارش از داده تولد شروع می‌شود و بعد به زبان انسانی‌تر برای
            تأمل و خودشناسی روایت می‌شود.
          </p>
        </div>

        <div className="home-layer-grid">
          {reportFeatureCards.map((item) => (
            <article className="home-layer-card" key={item.title}>
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-two-column-row">
        <section className="home-section home-trust-card" aria-labelledby="trust-privacy">
          <div className="home-section-heading compact">
            <div>
              <span className="section-label">اعتماد و حریم خصوصی</span>
              <h2 id="trust-privacy">هالیوس باید قابل اعتماد بماند</h2>
            </div>
          </div>

          <div className="home-trust-list">
            {trustCards.map((item) => (
              <article className="home-trust-item" key={item.title}>
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section home-path-card" aria-labelledby="future-modules">
          <div className="home-section-heading compact">
            <div>
              <span className="section-label">در مسیر</span>
              <h2 id="future-modules">قابلیت‌های بعدی آرام و واقعی اضافه می‌شوند</h2>
            </div>
          </div>

          <div className="home-path-list">
            {futureModules.map((item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="home-section home-sample-mini" aria-label="نمونه کوتاه گزارش">
        <div className="home-sample-actions">
          <Link className="button home-primary-cta" href="/chart">
            گزارش خودم را بساز
          </Link>
          <Link className="button secondary" href="/reports">
            گزارش‌های من
          </Link>
        </div>

        <div>
          <span className="section-label">نمونه کوتاه گزارش</span>
          <p>قبل از ساخت گزارش، یک بریده واقعی از جنس خوانش هالیوس ببین.</p>
        </div>

        <div className="home-sample-grid">
          {sampleReportCards.map((item) => (
            <span key={item.label}>
              <b aria-hidden="true">{item.icon}</b>
              {item.label}
            </span>
          ))}
        </div>
      </section>

      <section className="home-section home-faq-section" aria-labelledby="home-faq">
        <div className="home-section-heading compact">
          <div>
            <span className="section-label">پرسش‌های کوتاه</span>
            <h2 id="home-faq">قبل از ساخت گزارش، این چند نکته را بدان</h2>
          </div>
        </div>

        <div className="home-faq-list">
          {faqItems.map((item, index) => (
            <details className="home-faq-item" key={item.question} open={index === 0}>
              <summary>
                <span>{item.question}</span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="home-final-cta" aria-labelledby="home-final-cta">
        <div>
          <span className="section-label">شروع آرام</span>
          <h2 id="home-final-cta">قبل از گزارش تولدت را بساز؛ بعد آرام‌تر بخوان</h2>
          <p>
            هالیوس قرار نیست تو را به پرداخت، انتشار عمومی یا تصمیم فوری هل بدهد.
            فعلاً بهترین قدم این است که گزارش تولدت را بسازی و ببینی زبان هالیوس
            چقدر با تو ارتباط می‌گیرد.
          </p>
        </div>

        <div className="actions">
          <Link className="button home-primary-cta" href="/chart">
            گزارش تولدم را بساز
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم خصوصی را بخوان
          </Link>
        </div>
      </section>
    </section>
  );
}
