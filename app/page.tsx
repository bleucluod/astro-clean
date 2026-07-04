import type { Metadata } from "next";
import Link from "next/link";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { SkyPulseDateCard } from "@/components/SkyPulseDateCard";

export const metadata: Metadata = {
  title: "Halleus | گزارش تولد فارسی و نبض آسمان",
  description:
    "Halleus چارت تولد را به یک گزارش فارسی، انسانی و قابل مرور تبدیل می‌کند؛ فعلاً رایگان، خصوصی و در حال آماده‌سازی برای تجربه عمومی بهتر.",
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
    status: "آماده‌سازی",
    title: "فاز ماه تولد",
    description:
      "جای این لایه در زبان محصول مشخص است، اما فقط وقتی وارد گزارش می‌شود که محاسبه واقعی و قابل اعتماد داشته باشیم.",
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
    title: "بعداً به آن برگرد",
    description:
      "گزارش‌ها فعلاً در مسیر خصوصی و آزمایشی نگه داشته می‌شوند تا بتوانی آرام‌تر بخوانی و مرور کنی.",
  },
  {
    title: "وقتی آماده شد، عمومی یا پولی را جدا انتخاب می‌کنیم",
    description:
      "هالیوس فعلاً رایگان و no-index می‌ماند؛ انتشار عمومی، SEO و مدل پولی بعد از آماده شدن محصول بررسی می‌شوند.",
  },
];

const trustCards = [
  {
    title: "محاسبه واقعی، نه متن تصادفی",
    description:
      "گزارش از داده تولد و خروجی چارت ساخته می‌شود. اگر ساعت یا شهر تولد دقیق نباشد، بعضی بخش‌ها با احتیاط خوانده می‌شوند.",
  },
  {
    title: "خودشناسی، نه حکم قطعی",
    description:
      "هالیوس برای تأمل و زبان نمادین است؛ پیشگویی قطعی، تشخیص پزشکی/روانی یا دستور تصمیم‌گیری نیست.",
  },
  {
    title: "خصوصی و بدون ایندکس عمومی",
    description:
      "در این مرحله گزارش‌ها برای انتشار عمومی ساخته نشده‌اند. هر مدل public/indexable بعداً باید با رضایت روشن کاربر طراحی شود.",
  },
];

const futureModules = [
  {
    title: "نبض آسمان / Sky Pulse",
    description:
      "کارت زنده امروز از تاریخ و ریتم تقویم شروع می‌شود و بعداً فقط با منبع واقعی به ترنزیت‌های مهم وصل خواهد شد.",
  },
  {
    title: "فاز ماه و ریتم ماه",
    description:
      "فاز ماه امروز و فاز ماه تولد در نقشه آینده هستند؛ بدون محاسبه واقعی، فقط جایگاهشان در محصول نشان داده می‌شود.",
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
      "نه. هالیوس از چارت تولد و زبان نمادین آسترولوژی برای خودشناسی استفاده می‌کند. Sky Pulse هم فعلاً یک کارت سبک روزانه است، نه پیشگویی قطعی.",
  },
  {
    question: "آیا گزارش من عمومی یا قابل ایندکس می‌شود؟",
    answer:
      "نه در وضعیت فعلی. سایت هنوز no-index است و گزارش‌ها برای مسیر خصوصی/آزمایشی ساخته می‌شوند. هر انتشار عمومی بعداً باید با رضایت روشن طراحی شود.",
  },
  {
    question: "اگر ساعت تولدم دقیق نباشد چه؟",
    answer:
      "بخش‌هایی مثل طالع، خانه‌ها و زاویه‌ها به ساعت و شهر تولد حساس‌اند. گزارش باید این محدودیت را صادقانه نشان دهد.",
  },
  {
    question: "آیا هالیوس رایگان است؟",
    answer:
      "فعلاً بله. تمرکز الان روی کیفیت گزارش، تجربه خواندن و صفحه‌های اصلی محصول است؛ نه پرداخت، SEO یا عمومی‌سازی.",
  },
];

export default function Home() {
  return (
    <section className="grid home-page homepage-product-shell">
      <div className="hero hero-polished paid-hero">
        <div>
          <span className="badge">هالیوس برای چارت تولد فارسی</span>

          <h1>هالیوس؛ تولد تو فقط یک تاریخ نیست</h1>

          <p>
            چارت تولدت را به زبان فارسی بخوان؛ گزارشی برای دیدن الگوهای شخصی،
            رابطه‌ها، مسیر رشد و ریتم درونی‌ات. فعلاً رایگان، خصوصی و در حال
            کامل‌تر شدن.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions">
            <Link className="button" href="/chart">
              گزارش تولدم را بساز
            </Link>

            <Link className="button secondary" href="#report-preview">
              نمونه گزارش را ببین
            </Link>

            <Link className="button secondary" href="#sky-pulse">
              نبض آسمان امروز
            </Link>
          </div>
        </div>

        <div className="card hero-card polished-hero-card paid-hero-card">
          <span className="badge">محصول زنده، بدون ادعای قطعی</span>

          <h2>اول گزارش تولد؛ بعد نبض آسمان و لایه‌های آینده</h2>

          <p>
            مسیر اصلی هالیوس از گزارش تولد شروع می‌شود. Sky Pulse، فاز ماه و
            محتوای فارسی هم در همین معماری جا دارند، اما بدون ترنزیت جعلی یا
            وعده‌ای که هنوز آماده نیست.
          </p>

          <div className="mini-card">
            <strong>الان چه چیزی آماده‌تر است؟</strong>
            <p>
              گزارش تولد فارسی، صفحه خواندن گزارش، ذخیره محلی و مسیر خصوصی تست
              محصول. SEO، پرداخت و گزارش عمومی فعلاً عقب‌ترند.
            </p>
          </div>
        </div>
      </div>

      <div className="trust-strip paid-trust-strip" aria-label="وضعیت فعلی محصول">
        <span>فعلاً رایگان</span>
        <span>خصوصی و no-index</span>
        <span>گزارش بر پایه چارت واقعی</span>
        <span>بدون ترنزیت جعلی</span>
      </div>

      <section className="card paid-section" aria-labelledby="what-is-halleus">
        <span className="section-label">هالیوس چیست؟</span>

        <h2 id="what-is-halleus">یک خوانش فارسی از چارت تولد، برای خودشناسی</h2>

        <p>
          هالیوس چارت تولدت را به یک گزارش فارسی و قابل خواندن تبدیل می‌کند؛
          گزارشی که به جای حکم دادن، کمک می‌کند الگوهای تکرارشونده، نیازهای
          احساسی، میدان‌های زندگی و مسیر رشدت را با زبان نمادین ببینی.
        </p>
      </section>

      <section className="card paid-section" aria-labelledby="report-features">
        <span className="section-label">در گزارش چه می‌بینی؟</span>

        <h2 id="report-features">گزارش از چند لایه ساخته می‌شود، نه از یک متن کلی</h2>

        <div className="grid grid-3">
          {reportFeatureCards.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <span className="badge">{item.status}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section" aria-labelledby="how-it-works">
        <span className="section-label">مسیر استفاده</span>

        <h2 id="how-it-works">از تولد تا گزارش، بدون مسیر شلوغ</h2>

        <div className="demo-flow polished-demo-flow">
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

      <SkyPulseDateCard />

      <section className="card paid-section" aria-labelledby="moon-phase-home">
        <span className="section-label">ماه اکنون و فاز ماه</span>

        <h2 id="moon-phase-home">جای فاز ماه از همین حالا در محصول مشخص است</h2>

        <p>
          فاز ماه امروز و فاز ماه تولد هر دو برای هالیوس مهم‌اند، اما تا وقتی
          محاسبه واقعی و قابل اعتماد نداریم، آن‌ها را به عنوان نتیجه فعال نشان
          نمی‌دهیم. این بخش فقط slot آینده را آماده می‌کند.
        </p>

        <div className="grid grid-3">
          <article className="mini-card paid-value-card">
            <span className="badge">آینده نزدیک</span>
            <strong>فاز ماه امروز</strong>
            <p>برای homepage و بازگشت روزانه؛ فقط بعد از اتصال به محاسبه واقعی ماه.</p>
          </article>

          <article className="mini-card paid-value-card">
            <span className="badge">گزارش تولد</span>
            <strong>فاز ماه تولد</strong>
            <p>برای اضافه شدن به گزارش شخصی، کنار ماه تولد و ریتم احساسی کاربر.</p>
          </article>

          <article className="mini-card paid-value-card">
            <span className="badge">مرز صداقت</span>
            <strong>بدون نمایش جعلی</strong>
            <p>تا وقتی داده واقعی نداریم، متن فاز ماه فقط وعده آماده‌سازی است، نه نتیجه فعال.</p>
          </article>
        </div>
      </section>

      <section className="card paid-section" aria-labelledby="trust-privacy">
        <span className="section-label">اعتماد و حریم خصوصی</span>

        <h2 id="trust-privacy">هالیوس باید قابل اعتماد بماند، حتی وقتی شاعرانه حرف می‌زند</h2>

        <div className="grid grid-3">
          {trustCards.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section" aria-labelledby="future-modules">
        <span className="section-label">جایگاه‌های بعدی</span>

        <h2 id="future-modules">معماری صفحه اصلی برای رشد بعدی آماده می‌ماند</h2>

        <div className="grid grid-3">
          {futureModules.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section" aria-labelledby="home-faq">
        <span className="section-label">پرسش‌های کوتاه</span>

        <h2 id="home-faq">قبل از ساخت گزارش، این چند نکته را بدان</h2>

        <div className="home-step-list">
          {faqItems.map((item) => (
            <div key={item.question}>
              <strong>{item.question}</strong>
              <span>{item.answer}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card paid-manual-order home-next-card">
        <div>
          <span className="section-label">شروع آرام</span>

          <h2>اول گزارش تولدت را بساز؛ بعد آرام‌تر بخوان</h2>

          <p>
            هالیوس قرار نیست تو را به پرداخت، انتشار عمومی یا تصمیم فوری هل بدهد.
            فعلاً بهترین قدم این است که گزارش تولدت را بسازی و ببینی زبان محصول
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
