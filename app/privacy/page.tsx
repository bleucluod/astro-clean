import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsPreferencesLink } from "@/components/AnalyticsConsent";

export const metadata: Metadata = {
  title: "حریم خصوصی هالیوس | انتشار، حذف و ایندکس گزارش‌ها",
  description: "قواعد عمومی یا خصوصی بودن گزارش تولد، نمایش نام، حذف گزارش، تحلیل رابطه، سفارش و Analytics را در حریم خصوصی هالیوس روشن و یک‌جا بخوان.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const publicationRules = [
  ["گزارش مهمان و حساب رایگان", "به‌صورت پیش‌فرض عمومی‌اند و می‌توانند توسط موتورهای جست‌وجو پیدا شوند. این موضوع پیش از ذخیره باید روشن به کاربر گفته شود."],
  ["گزارش پریمیوم", "به‌صورت پیش‌فرض خصوصی و خارج از نتایج جست‌وجو است. عمومی‌شدن فقط با انتخاب صریح صاحب گزارش انجام می‌شود؛ سفارش یا پرداخت جای این انتخاب را نمی‌گیرد."],
  ["نمایش نام", "نمایش نام، نیک‌نیم یا هویت انتخابی جدا از انتشار است. یک گزارش می‌تواند عمومی باشد و همچنان بدون نام نمایش داده شود."],
  ["تحلیل رابطه", "همیشه خصوصی است، لینک عمومی ندارد و وارد نتایج جست‌وجو نمی‌شود. رضایت نفر دوم فقط اجازهٔ استفاده از داده برای همان خوانش خصوصی است."],
] as const;

const dataUses = [
  ["ساخت گزارش تولد", "تاریخ، ساعت یا وضعیت نامعلوم آن، شهر تولد، نام اختیاری، دادهٔ محاسبه‌شدهٔ چارت و بخش‌های گزارش."],
  ["خوانش آسمان امروز کنار چارت", "محل زندگی فعلی فقط برای محاسبهٔ زمانی همین خوانش استفاده می‌شود و جای شهر تولد را نمی‌گیرد."],
  ["تحلیل رابطه", "دو چارت محاسبه‌شده، نوع رابطه، دقت ساعت و تأیید اجازهٔ نفر دوم استفاده می‌شوند. دادهٔ خام تولد نفر دوم در رکورد مقایسه نگهداری نمی‌شود و مقایسه روی همان دستگاه می‌ماند."],
  ["درخواست نسخهٔ کامل‌تر", "نام، راه ارتباطی، محصول درخواستی، شناسه گزارش، توضیحات و انتخاب انتشار در صف خصوصی درخواست‌ها ثبت می‌شوند؛ بدون تغییر خودکار وضعیت انتشار."],
] as const;

export default function PrivacyPage() {
  return <main className="grid trust-page-shell privacy-trust-page" data-product-surface="Halleus Privacy">
    <section className="card trust-hero-card"><span className="badge">حریم خصوصی هالیوس</span><h1>حریم خصوصی هالیوس؛ قبل از ذخیره بدان چه چیزی عمومی می‌شود</h1><p>گزارش مهمان و حساب رایگان به‌صورت پیش‌فرض عمومی‌اند و ممکن است در نتایج جست‌وجو دیده شوند. گزارش پریمیوم خصوصی شروع می‌شود و فقط با انتخاب صریح صاحب گزارش عمومی خواهد شد. انتشار گزارش و نمایش هویت دو انتخاب جدا هستند و تحلیل رابطه همیشه خصوصی می‌ماند.</p><div className="actions"><Link className="button" href="/chart">ساخت گزارش تولد</Link><Link className="button secondary" href="/compare">تحلیل خصوصی رابطه</Link></div></section>

    <section className="trust-principle-grid" aria-label="خلاصه قواعد انتشار">{publicationRules.map(([title, text]) => <article className="card trust-principle-card" key={title}><span className="section-label">قانون انتشار</span><h2>{title}</h2><p>{text}</p></article>)}</section>

    <section className="card"><span className="section-label">داده‌های مورد استفاده</span><h2>چه اطلاعاتی استفاده می‌شوند؟</h2><div className="home-step-list">{dataUses.map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}</div></section>

    <section className="card trust-note-card"><span className="section-label">گزارش عمومی</span><h2>عمومی‌بودن دقیقاً چه معنایی دارد؟</h2><p>گزارش عمومی از مسیر عمومی سایت قابل خواندن است و ممکن است موتورهای جست‌وجو آن را نمایش دهند. عمومی‌بودن نباید نام واقعی، اطلاعات تماس، همهٔ جزئیات خام تولد، اطلاعات حساب یا یادداشت‌های خصوصی را خودکار آشکار کند.</p><div className="tag-list"><span>هویت: انتخاب جداگانه</span><span>اطلاعات تماس: غیرعمومی</span><span>دادهٔ لازم گزارش: حداقلی</span></div></section>

    <section className="card trust-note-card"><span className="section-label">دسترسی و جست‌وجو</span><h2>خصوصی‌بودن با دیده‌نشدن در جست‌وجو چه فرقی دارد؟</h2><p>خصوصی‌بودن مشخص می‌کند چه کسی صفحه را باز می‌کند؛ دستور منع ایندکس از موتور جست‌وجو می‌خواهد صفحه را در نتایج نشان ندهد. گزارش پریمیوم در حالت پیش‌فرض هر دو محافظت را دارد. تحلیل رابطه حتی با رضایت دو نفر به صفحهٔ عمومی تبدیل نمی‌شود.</p></section>

    <section className="card trust-note-card"><span className="section-label">محلی یا حساب</span><h2>ذخیره روی دستگاه و ذخیره در حساب</h2><p>نسخهٔ محلی روی همان مرورگر می‌ماند و پاک‌کردن دادهٔ مرورگر یا تغییر دستگاه می‌تواند آن را از دسترس خارج کند. رابط باید روشن کند کدام نسخه در حساب ذخیره شده و کدام فقط روی همین دستگاه است.</p></section>

    <section className="card trust-note-card"><span className="section-label">حذف</span><h2>چگونه گزارش را حذف کنم؟</h2><p>گزارش ذخیره‌شده را از صفحهٔ گزارش‌ها حذف کن. حذف گزارش حساب باید لینک اشتراک همان گزارش را نیز از کار بیندازد. دادهٔ محلی از همان دستگاه پاک می‌شود و ممکن است قابل بازگرداندن نباشد.</p><div className="actions"><Link className="button secondary" href="/reports">مدیریت و حذف گزارش‌ها</Link></div></section>

    <section className="card trust-note-card"><span className="section-label">کنترل پریمیوم</span><h2>انتشار گزارش پریمیوم را چه زمانی می‌توان تغییر داد؟</h2><p>پریمیوم خصوصی شروع می‌شود. عمومی‌کردن فقط با انتخاب صریح صاحب گزارش ممکن است و انتشار با نمایش نام دو انتخاب جدا هستند. ثبت سفارش یا انتخاب محصول پولی هیچ‌کدام این وضعیت را خودکار تغییر نمی‌دهند.</p></section>

    <section className="card trust-note-card"><span className="section-label">آمار بازدید</span><h2>دادهٔ حساس به آمار بازدید فرستاده نمی‌شود</h2><p>آمار بازدید فقط برای صفحه‌های عمومی استفاده می‌شود و اجازهٔ آن از انتشار جداست. متن گزارش یا تحلیل رابطه، تاریخ و ساعت و شهر تولد، نام و اطلاعات تماس، شناسهٔ گزارش و مسیر خصوصی مقایسه ارسال نمی‌شوند.</p><div className="actions"><AnalyticsPreferencesLink className="button secondary" label="تنظیم آمار بازدید هالیوس" /></div></section>

    <section className="card trust-note-card"><span className="section-label">سفارش</span><h2>سفارش و خرید، رضایت انتشار نیست</h2><p>فرم سفارش انتخاب انتشار جداگانه دارد. حتی انتخاب عمومی جای اجازهٔ جداگانه برای نمایش نام را نمی‌گیرد و اطلاعات تماس فقط برای پیگیری همان درخواست استفاده می‌شوند.</p></section>

    <section className="card"><span className="section-label">پرسش‌های رایج</span><h2>دربارهٔ حریم خصوصی هالیوس</h2><div className="home-faq-list">
      <details><summary>گزارش رایگان من عمومی می‌شود؟</summary><p>بله. مهمان و حساب رایگان عمومی شروع می‌شوند و ممکن است در نتایج جست‌وجو دیده شوند؛ نمایش نام همچنان انتخابی جداست.</p></details>
      <details><summary>گزارش پریمیوم خصوصی است؟</summary><p>بله. خصوصی و خارج از نتایج جست‌وجو شروع می‌شود و فقط صاحب گزارش می‌تواند آن را عمومی کند.</p></details>
      <details><summary>تحلیل رابطه قابل اشتراک عمومی است؟</summary><p>خیر. نتیجه همیشه خصوصی، خارج از نتایج جست‌وجو و بدون لینک عمومی است؛ فقط صفحهٔ معرفی مقایسه عمومی است.</p></details>
      <details><summary>آمار بازدید اطلاعات تولدم را دریافت می‌کند؟</summary><p>خیر. متن گزارش، دادهٔ تولد، هویت، اطلاعات تماس و شناسهٔ گزارش ارسال نمی‌شوند.</p></details>
      <details><summary>خرید گزارش آن را عمومی می‌کند؟</summary><p>خیر. خرید، پرداخت یا ثبت سفارش رضایت انتشار نیست.</p></details>
      <details><summary>گزارش را کجا حذف کنم؟</summary><p>از صفحهٔ گزارش‌ها. حذف گزارش حساب باید لینک اشتراک آن را باطل کند.</p></details>
    </div></section>

    <section className="card"><h2>انتخاب‌هایت را پیش از ذخیره بررسی کن</h2><p>عمومی یا خصوصی بودن گزارش، نمایش نام و اجازهٔ آمار بازدید سه انتخاب جدا هستند.</p><div className="actions"><Link className="button" href="/chart">ساخت گزارش تولد</Link><Link className="button secondary" href="/product">آشنایی با گزارش</Link><Link className="button secondary" href="/compare">تحلیل خصوصی رابطه</Link></div></section>
  </main>;
}
