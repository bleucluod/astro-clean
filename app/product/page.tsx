import type { Metadata } from "next";
import Link from "next/link";

import { HomepageProductProof } from "@/components/HomepageProductProof";

export const metadata: Metadata = {
  title: "تفسیر چارت تولد فارسی | داخل گزارش هالیوس چیست؟",
  description: "ببین گزارش چارت تولد هالیوس چگونه تصویر کلی، خورشید، ماه، رایزینگ، خانه‌ها، جنبه‌ها و الگوهای برجسته را در یک تفسیر فارسی و قابل‌مرور کنار هم قرار می‌دهد.",
  alternates: { canonical: "/product" },
  robots: { index: true, follow: true },
};

const principles = [
  ["محاسبه قبل از تفسیر", "متن از دادهٔ همان چارت ساخته می‌شود. اگر محاسبه ناقص باشد یا بخشی در دسترس نباشد، این محدودیت از کاربر پنهان نمی‌ماند."],
  ["ارتباط میان بخش‌ها", "خورشید، ماه، رایزینگ، خانه‌ها و جنبه‌ها جدا توضیح داده می‌شوند، اما جمع‌بندی رابطهٔ میان آن‌ها را هم نشان می‌دهد."],
  ["محدودیت روشن", "اگر ساعت تولد نامعلوم باشد، رایزینگ، خانه‌ها و محورهای وابسته به زمان با لحن قطعی نمایش داده نمی‌شوند."],
] as const;

const layers = [
  ["خورشید، ماه و رایزینگ", "هویت، نیازهای درونی و شیوهٔ ورود به محیط در کنار هم خوانده می‌شوند؛ نه به‌عنوان سه برچسب جدا."],
  ["خانه‌ها", "خانه‌ها نشان می‌دهند هر جایگاه در کدام میدان زندگی فعال‌تر است. این لایه به ساعت تولد قابل اتکا وابسته است."],
  ["جنبه‌ها", "رابطهٔ میان سیاره‌ها با زبان حمایت، کشش یا تمرین رشد توضیح داده می‌شود؛ بدون تبدیل یک جنبه به حکم قطعی."],
  ["عناصر و کیفیت‌ها", "تکرار عناصر و کیفیت‌ها ریتم کلی چارت و الگوهای پرتکرار حرکت، ثبات، سازگاری، احساس یا ذهن را روشن می‌کند."],
  ["نودها و حرکت برگشتی", "این داده‌ها در زمینهٔ کل چارت خوانده می‌شوند و به‌تنهایی حکم سرنوشت یا گذشتهٔ قطعی نمی‌دهند."],
] as const;

export default function ProductPage() {
  return <main className="grid trust-page-shell product-trust-page" data-product-surface="Halleus Product">
    <section className="card trust-hero-card">
      <span className="badge">تفسیر چارت تولد فارسی</span>
      <h1>گزارش چارت تولد هالیوس چه چیزهایی را تحلیل می‌کند؟</h1>
      <p>گزارش هالیوس فقط فهرستی از سیاره‌ها یا چند جملهٔ جدا از هم نیست. جایگاه‌ها، خانه‌ها و جنبه‌ها کنار هم قرار می‌گیرند تا الگوهای تکرارشونده را راحت‌تر ببینی و میان فصل‌های مختلف گم نشوی.</p>
      <div className="actions"><Link className="button" href="/chart">ساخت چارت تولد</Link><Link className="button secondary" href="/pricing">گزینه‌های گزارش کامل‌تر</Link></div>
    </section>

    <section className="trust-principle-grid" aria-label="اصول گزارش هالیوس">
      {principles.map(([title, text]) => <article className="card trust-principle-card" key={title}><span className="section-label">اصل گزارش</span><h2>{title}</h2><p>{text}</p></article>)}
    </section>

    <section className="card">
      <span className="section-label">نمونهٔ واقعی محصول</span><h2>اول تصویر کلی، بعد جزئیات</h2>
      <p>گزارش با نمایی کلی از موضوع‌های تکرارشونده و نیازهای همراه یا در کشمکش شروع می‌شود. این تصویر اولیه کمک می‌کند فصل‌های بعدی را جدا و پراکنده نخوانی.</p>
      <HomepageProductProof />
    </section>

    <section className="feature-grid">
      {layers.map(([title, text]) => <article className="card feature-card-polished" key={title}><span className="section-label">لایهٔ گزارش</span><h2>{title}</h2><p>{text}</p></article>)}
    </section>

    <section className="card trust-flow-card">
      <span className="section-label">جمع‌بندی و شواهد</span><h2>الگوهای برجسته چگونه ساخته می‌شوند؟</h2>
      <p>وقتی چند جایگاه، خانه یا جنبه به یک موضوع مشترک اشاره کنند، گزارش آن‌ها را در یک جمع‌بندی کنار هم می‌گذارد. هر الگوی برجسته باید به شواهد چارت متصل باشد و در صورت محدودیت داده با زبان محتاط نمایش داده شود.</p>
      <div className="tag-list"><span>نشان و درجه</span><span>خانه</span><span>نوع جنبه و اورب</span><span>وضعیت محاسبه</span></div>
    </section>

    <section className="card trust-note-card">
      <span className="badge">ساعت تولد نامعلوم</span><h2>کدام لایه‌ها محدود می‌شوند؟</h2>
      <p>بخشی از جایگاه‌ها و جنبه‌ها ممکن است همچنان قابل بررسی باشند، اما رایزینگ، خانه‌ها و محورهای اصلی به زمان دقیق وابسته‌اند. ماه نیز در بعضی روزها به ساعت حساس است. ساعت مرجع فنی هرگز به‌عنوان ساعت واقعی تولد نمایش داده نمی‌شود.</p>
    </section>

    <section className="card trust-flow-card">
      <span className="section-label">مسیر خواندن</span><h2>گزارش را چگونه بخوانم؟</h2>
      <ol><li>از تصویر کلی شروع کن.</li><li>خورشید، ماه و رایزینگ را کنار هم بخوان.</li><li>خانه‌ها و جنبه‌های پرتکرار را بررسی کن.</li><li>به فصل مرتبط با سؤال فعلی‌ات برو.</li><li>در صورت نیاز، جزئیات فنی و مقاله‌های ویکی را باز کن.</li></ol>
    </section>

    <section className="card trust-note-card">
      <span className="badge">مرز تفسیر</span><h2>خوانش نمادین، نه نسخه برای تصمیم‌های مهم</h2>
      <p>گزارش هالیوس برای خودشناسی و تأمل است؛ نه تشخیص پزشکی، مشاورهٔ حقوقی یا مالی، ارزیابی سلامت روان یا پیش‌بینی حتمی آینده.</p>
    </section>

    <section className="card">
      <span className="section-label">مسیرهای بعدی</span><h2>بعد از گزارش کدام مسیر مناسب است؟</h2>
      <div className="actions"><Link className="button" href="/chart">چارت تولدت را بساز</Link><Link className="button secondary" href="/compare">شروع تحلیل رابطه</Link><Link className="button secondary" href="/sky">دیدن آسمان امروز</Link><Link className="button secondary" href="/pricing">گزینه‌های گزارش کامل‌تر</Link></div>
    </section>

    <section className="card"><span className="section-label">پرسش‌های رایج</span><h2>دربارهٔ گزارش هالیوس</h2>
      <div className="faq-list">
        <details><summary>آیا گزارش فقط معنی سیاره‌هاست؟</summary><p>خیر. جایگاه‌ها، خانه‌ها، جنبه‌ها و الگوهای تکرارشونده در یک ساختار مرتبط کنار هم خوانده می‌شوند.</p></details>
        <details><summary>بدون ساعت دقیق هم گزارش ساخته می‌شود؟</summary><p>بله، با محدودیت روشن. رایزینگ و خانه‌ها قابل اتکای کامل نیستند و بخش‌های وابسته حذف یا علامت‌گذاری می‌شوند.</p></details>
        <details><summary>آیا گزارش آینده را پیش‌بینی می‌کند؟</summary><p>خیر. گزارش الگوهای نمادین چارت را توضیح می‌دهد و حکم قطعی دربارهٔ آینده نمی‌دهد.</p></details>
        <details><summary>گزارش من عمومی است؟</summary><p>گزارش مهمان و رایگان عمومی شروع می‌شود. گزارش پریمیوم خصوصی است و فقط با انتخاب صریح صاحب گزارش عمومی می‌شود؛ نمایش نام کنترل جداگانه دارد.</p></details>
      </div>
    </section>
  </main>;
}
