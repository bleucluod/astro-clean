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
    status: "فعال",
    title: "خورشید، ماه و طالع",
    description:
      "سه ستون اصلی گزارش کمک می‌کنند خودت را از زاویه هویت، نیاز احساسی و شیوه حضور ببینی.",
  },
  {
    status: "فعال",
    title: "خانه‌ها و میدان‌های زندگی",
    description:
      "گزارش نشان می‌دهد هر انرژی بیشتر در کدام بخش زندگی دیده می‌شود؛ رابطه، کار، ریشه، بدن یا مسیر رشد.",
  },
  {
    status: "فعال",
    title: "جنبه‌های سیاره‌ای",
    description:
      "رابطه‌های مهم میان سیاره‌ها به زبان ساده خوانده می‌شوند: کجا کشش داری، کجا حمایت، و کجا تمرین رشد.",
  },
  {
    status: "فعال",
    title: "ASC / DSC / MC / IC",
    description:
      "زاویه‌های اصلی چارت برای فهم حضور، رابطه، مسیر بیرونی و ریشه درونی در گزارش آمده‌اند.",
  },
  {
    status: "فعال",
    title: "برگشتی‌ها و دست‌های ماه",
    description:
      "گزارش وضعیت برگشتی‌ها و دست‌های ماه را با صداقت فنی و بدون ادعای True Node توضیح می‌دهد.",
  },
  {
    status: "در مسیر",
    title: "فاز ماه تولد",
    description:
      "فاز ماه امروز روی صفحه اصلی واقعی شده است؛ فاز ماه تولد بعداً با همین مرز صداقت وارد گزارش شخصی خواهد شد.",
  },
];

const howItWorks = [
  {
    title: "اطلاعات تولد را وارد کن",
    description:
      "تاریخ، ساعت و شهر تولد را وارد می‌کنی تا چارت تولدت بر اساس داده واقعی ساخته شود.",
  },
  {
    title: "گزارش فارسی را بخوان",
    description:
      "گزارش به جای فهرست خام، یک خوانش انسانی از الگوهای اصلی چارت به تو می‌دهد.",
  },
  {
    title: "نبض امروز را ببین",
    description:
      "در صفحه اصلی، ماه اکنون و فاز ماه هر روز با زمان و افق تهران تازه می‌شود.",
  },
  {
    title: "بعداً به گزارش برگرد",
    description:
      "گزارش‌ها در مسیر خصوصی نگه داشته می‌شوند تا بتوانی آرام‌تر بخوانی و دوباره مرور کنی.",
  },
];

const trustCards = [
  {
    title: "محاسبه واقعی، نه متن تصادفی",
    description:
      "گزارش از داده تولد و خروجی چارت ساخته می‌شود. اگر ساعت یا شهر تولد دقیق نباشد، بعضی بخش‌ها با احتیاط خوانده می‌شوند.",
  },
  {
    title: "زبان نمادین، نه حکم قطعی",
    description:
      "هالیوس برای تأمل و خودشناسی است؛ جایگزین مشورت تخصصی یا تصمیم‌گیری جدی نمی‌شود.",
  },
  {
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
    title: "نمونه گزارش و محتوای فارسی",
    description:
      "بعد از قوی‌تر شدن گزارش، نمونه گزارش و محتوای آموزشی فارسی می‌توانند مسیر ورود کاربران تازه را بهتر کنند.",
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

export default function Home() {
  return (
    <section className="grid home-page homepage-product-shell">
      <div className="hero hero-polished paid-hero homepage-hero">
        <div className="homepage-hero-copy">
          <div className="hero-eyebrow-row">
            <span className="badge">هالیوس برای چارت تولد فارسی</span>
            <span className="live-pill">نبض ماه امروز فعال است</span>
          </div>

          <h1>هالیوس؛ تولد تو فقط یک تاریخ نیست</h1>

          <p className="hero-lede">
            چارت تولدت را به زبان فارسی بخوان؛ گزارشی برای دیدن الگوهای شخصی،
            رابطه‌ها، مسیر رشد و ریتم درونی‌ات. کنار آن، نبض امروز هم با ماه
            اکنون و فاز ماه تازه می‌شود.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions home-hero-actions">
            <Link className="button" href="/chart">
              گزارش تولدم را بساز
            </Link>

            <Link className="button secondary" href="#sky-pulse">
              نبض آسمان امروز
            </Link>

            <Link className="button secondary" href="#report-preview">
              نمونه خوانش
            </Link>
          </div>
        </div>

        <div className="card hero-card polished-hero-card paid-hero-card homepage-hero-card">
          <span className="badge">امروز با ماه شروع کن</span>

          <h2>گزارش تولد برای شناخت عمیق‌تر؛ نبض ماه برای برگشت روزانه</h2>

          <p>
            مسیر اصلی هالیوس گزارش تولد است. کارت روزانه فقط یک درِ آرام برای
            برگشتن به محصول است: تاریخ امروز، ماه اکنون، فاز ماه و یک تمرین کوتاه.
          </p>

          <div className="home-kpi-row" aria-label="وضعیت فعال هالیوس">
            <span>
              <strong>واقعی</strong>
              محاسبه چارت
            </span>
            <span>
              <strong>زنده</strong>
              نبض ماه
            </span>
            <span>
              <strong>خصوصی</strong>
              مسیر گزارش
            </span>
          </div>
        </div>
      </div>

      <div className="trust-strip paid-trust-strip home-status-strip" aria-label="وضعیت فعلی محصول">
        <span>فعلاً رایگان</span>
        <span>مسیر خصوصی گزارش</span>
        <span>گزارش بر پایه چارت واقعی</span>
        <span>ماه امروز با افق تهران</span>
      </div>

      <SkyPulseDateCard />

      <section className="card paid-section home-section-card" aria-labelledby="what-is-halleus">
        <div className="home-section-heading">
          <span className="section-label">هالیوس چیست؟</span>

          <h2 id="what-is-halleus">یک خوانش فارسی از چارت تولد، برای خودشناسی</h2>
        </div>

        <p>
          هالیوس چارت تولدت را به یک گزارش فارسی و قابل خواندن تبدیل می‌کند؛
          گزارشی که به جای حکم دادن، کمک می‌کند الگوهای تکرارشونده، نیازهای
          احساسی، میدان‌های زندگی و مسیر رشدت را با زبان نمادین ببینی.
        </p>
      </section>

      <section className="card paid-section home-section-card" aria-labelledby="report-features">
        <div className="home-section-heading">
          <span className="section-label">در گزارش چه می‌بینی؟</span>

          <h2 id="report-features">گزارش از چند لایه ساخته می‌شود، نه از یک متن کلی</h2>
        </div>

        <div className="grid grid-3 home-feature-grid">
          {reportFeatureCards.map((item) => (
            <article className="mini-card paid-value-card feature-card-polished" key={item.title}>
              <span className="badge">{item.status}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section home-section-card" aria-labelledby="how-it-works">
        <div className="home-section-heading">
          <span className="section-label">مسیر استفاده</span>

          <h2 id="how-it-works">از تولد تا گزارش، با یک مسیر روشن</h2>
        </div>

        <div className="demo-flow polished-demo-flow home-step-flow">
          {howItWorks.map((step, index) => (
            <div className="demo-step" key={step.title}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            شروع ساخت گزارش
          </Link>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌های ذخیره‌شده
          </Link>
        </div>
      </section>

      <HomepageProductProof />

      <section className="card paid-section home-section-card" aria-labelledby="trust-privacy">
        <div className="home-section-heading">
          <span className="section-label">اعتماد و حریم خصوصی</span>

          <h2 id="trust-privacy">هالیوس باید قابل اعتماد بماند، حتی وقتی شاعرانه حرف می‌زند</h2>
        </div>

        <div className="grid grid-3 home-feature-grid">
          {trustCards.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section home-section-card" aria-labelledby="future-modules">
        <div className="home-section-heading">
          <span className="section-label">در مسیر</span>

          <h2 id="future-modules">قابلیت‌های بعدی آرام و واقعی اضافه می‌شوند</h2>
        </div>

        <div className="grid grid-3 home-feature-grid">
          {futureModules.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section home-faq-section home-section-card" aria-labelledby="home-faq">
        <div className="home-section-heading">
          <span className="section-label">پرسش‌های کوتاه</span>

          <h2 id="home-faq">قبل از ساخت گزارش، این چند نکته را بدان</h2>
        </div>

        <div className="home-faq-list">
          {faqItems.map((item, index) => (
            <details className="home-faq-item" key={item.question} open={index === 0}>
              <summary>
                <span>{item.question}</span>
                <span aria-hidden="true">+</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="card paid-manual-order home-next-card">
        <div>
          <span className="section-label">شروع آرام</span>

          <h2>اول گزارش تولدت را بساز؛ بعد آرام‌تر بخوان</h2>

          <p>
            هالیوس قرار نیست تو را به پرداخت، انتشار عمومی یا تصمیم فوری هل بدهد.
            فعلاً بهترین قدم این است که گزارش تولدت را بسازی و ببینی زبان هالیوس
            چقدر با تو ارتباط می‌گیرد.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
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
