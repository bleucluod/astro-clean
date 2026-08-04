import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "گزارش پایه و گزینه‌های نسخه کامل‌تر | هالیوس",
  description: "گزارش پایه هالیوس را رایگان شروع کن و در صورت نیاز، گزینه‌های نسخه کامل‌تر را ببین. زمان، هزینه، محدوده و قالب تحویل پیش از شروع جداگانه تأیید می‌شوند.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

const confirmationItems = ["نام واقعی مسیر", "مبلغ و واحد پول", "یک‌باره یا دوره‌ای بودن پرداخت", "زمان تقریبی پاسخ و تحویل", "قالب تحویل", "روش پرداخت", "شرایط لغو یا بازگشت وجه", "محدودهٔ دقیق خروجی"] as const;

export default function PricingPage() {
  return <main className="grid paid-mvp-pricing-shell" data-product-surface="Halleus Pricing">
    <section className="card paid-hero"><span className="badge">گزارش پایه و مسیر کامل‌تر</span><h1>اول گزارش پایه را ببین؛ بعد برای نسخه کامل‌تر تصمیم بگیر</h1><p>نسخهٔ پایه را رایگان بساز و ببین کدام بخش‌ها برایت مهم‌ترند. اگر به توضیح عمیق‌تر یا منسجم‌تر نیاز داشتی، درخواستت را ثبت کن تا محدوده، زمان، قالب تحویل و هزینه پیش از شروع روشن شوند.</p><div className="actions"><Link className="button" href="/chart">ساخت گزارش پایه</Link><Link className="button secondary" href="/product">داخل گزارش را ببین</Link><Link className="button secondary" href="/order">ثبت درخواست نسخه کامل‌تر</Link></div></section>

    <section className="feature-grid paid-plan-grid" aria-label="گزینه‌های فعلی گزارش">
      <article className="card feature-card-polished paid-plan-card"><span className="badge">گزارش پایه</span><h2>رایگان</h2><p>برای شروع و دیدن ساختار اصلی چارت و گزارش فارسی.</p><div className="actions"><Link className="button" href="/chart">ساخت گزارش پایه</Link></div></article>
      <article className="card feature-card-polished paid-plan-card"><span className="badge">نسخهٔ کامل‌تر</span><h2>هماهنگی دستی</h2><p>نام، قیمت، زمان و قالب تحویل هنوز به‌صورت عمومی و قطعی اعلام نشده‌اند. درخواست ابتدا بررسی می‌شود و هیچ خرید یا پرداخت خودکاری انجام نمی‌شود.</p><div className="actions"><Link className="button secondary" href="/order">ثبت درخواست این مسیر</Link></div></article>
    </section>

    <section className="card manual-order-flow"><span className="section-label">روند نسخهٔ کامل‌تر</span><h2>چهار قدم تا شروع شفاف</h2><div className="home-step-list"><div><strong>۱. گزارش پایه را بساز</strong><span>ابتدا چارت و گزارش اولیه را ببین.</span></div><div><strong>۲. نیازت را مشخص کن</strong><span>بگو کدام بخش‌ها برایت مهم‌ترند.</span></div><div><strong>۳. درخواست را ثبت کن</strong><span>شناسه گزارش و راه ارتباطی را وارد کن.</span></div><div><strong>۴. جزئیات را تأیید کن</strong><span>محدوده، زمان، هزینه و قالب پیش از شروع هماهنگ می‌شوند.</span></div></div><p>ثبت درخواست به معنی خرید، پرداخت یا شروع خودکار نیست.</p></section>

    <section className="card"><span className="badge">شفافیت پیش از شروع</span><h2>چه چیزهایی باید جداگانه تأیید شوند؟</h2><ul className="feature-list">{confirmationItems.map((item) => <li key={item}>{item}</li>)}</ul><p>تا زمانی که این موارد تصمیم واقعی و قابل اتکا ندارند، هالیوس وعدهٔ خرید فوری یا تحویل مشخص نمی‌دهد.</p></section>

    <section className="card trust-note-card"><span className="section-label">حریم خصوصی</span><h2>خرید یا سفارش، رضایت انتشار نیست</h2><p>گزارش پریمیوم خصوصی شروع می‌شود. ثبت درخواست، پرداخت یا انتخاب گزینهٔ پولی وضعیت انتشار را خودکار تغییر نمی‌دهد و نمایش نام نیز انتخابی جداست.</p><Link className="button secondary" href="/privacy">حریم خصوصی گزارش پریمیوم</Link></section>

    <section className="card"><span className="section-label">پرسش‌های رایج</span><h2>پیش از ثبت درخواست</h2><div className="home-faq-list"><details><summary>آیا گزارش پایه رایگان است؟</summary><p>بله. مسیر پایه برای شروع رایگان است.</p></details><details><summary>قیمت نسخه کامل‌تر چقدر است؟</summary><p>فقط مبلغ واقعی و تأییدشده منتشر می‌شود. تا قبل از آن، وضعیت هماهنگی دستی نمایش داده می‌شود.</p></details><details><summary>آیا ثبت درخواست به معنی پرداخت است؟</summary><p>خیر. زمان، هزینه و محدوده پیش از شروع تأیید می‌شوند.</p></details><details><summary>گزارش پولی عمومی می‌شود؟</summary><p>خیر. خصوصی شروع می‌شود و انتشار فقط با انتخاب صریح صاحب گزارش انجام می‌شود.</p></details></div></section>

    <section className="card"><h2>اول گزارش را ببین، بعد مسیر بعدی را انتخاب کن</h2><div className="actions"><Link className="button" href="/chart">ساخت گزارش پایه</Link><Link className="button secondary" href="/order">ثبت درخواست نسخه کامل‌تر</Link></div></section>
  </main>;
}
