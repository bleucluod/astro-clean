import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsPreferencesLink } from "@/components/AnalyticsConsent";

export const metadata: Metadata = {
  title: "حریم داده، انتشار و ایندکس گزارش‌ها | هالیوس",
  description:
    "قواعد روشن هالیوس برای گزارش‌های مهمان، رایگان و پریمیوم؛ انتشار عمومی، noindex، نمایش نام و تحلیل خصوصی رابطه.",
  alternates: {
    canonical: "/privacy",
  },
};

const publicationRules = [
  {
    title: "گزارش مهمان و حساب رایگان",
    text: "گزارش تولدی که بدون ورود یا با حساب رایگان ساخته می‌شود، به‌صورت پیش‌فرض عمومی و قابل ایندکس است. پیش از ذخیره، این وضعیت باید در رابط کاربری روشن باشد.",
  },
  {
    title: "پریمیوم: خصوصی و noindex به‌صورت پیش‌فرض",
    text: "گزارش ساخته‌شده با اشتراک پریمیوم از ابتدا خصوصی و خارج از نتایج جست‌وجو است. عمومی‌کردن آن فقط با انتخاب صریح صاحب گزارش انجام می‌شود.",
  },
  {
    title: "نمایش نام، رضایتی جدا از انتشار است",
    text: "عمومی‌بودن گزارش به معنی نمایش نام یا اطلاعات شناسایی نیست. نام نمایشی و هر جزئیات هویتی فقط با انتخاب جداگانهٔ کاربر نشان داده می‌شود.",
  },
  {
    title: "تحلیل رابطه همیشه خصوصی و noindex است",
    text: "تحلیل رابطه از اطلاعات دو نفر استفاده می‌کند؛ بنابراین لینک عمومی و ایندکس جست‌وجو ندارد و فقط در مسیر خصوصی محصول خوانده می‌شود.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="grid trust-page-shell privacy-trust-page privacy-copy-detox-marker">
      <div className="card trust-hero-card">
        <span className="badge">حریم داده و انتشار</span>

        <h1>قبل از ذخیره می‌دانی گزارش عمومی است یا خصوصی</h1>

        <p>
          هالیوس یک قانون واحد را به همهٔ گزارش‌ها تحمیل نمی‌کند. وضعیت انتشار
          به نوع استفاده بستگی دارد: مهمان و رایگان عمومی و قابل ایندکس‌اند؛
          پریمیوم خصوصی و noindex شروع می‌شود؛ و نمایش نام همیشه انتخابی جداست.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش تولد
          </Link>

          <Link className="button secondary" href="/compare">
            تحلیل خصوصی رابطه
          </Link>
        </div>
      </div>

      <section
        className="trust-principle-grid"
        aria-label="قواعد انتشار گزارش‌ها"
      >
        {publicationRules.map((item) => (
          <article className="card trust-principle-card" key={item.title}>
            <span className="section-label">قانون انتشار</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="card trust-note-card privacy-copy-detox-marker">
        <span className="section-label">کنترل در دست صاحب گزارش</span>
        <h2>انتشار گزارش و نمایش هویت دو تصمیم جدا هستند</h2>
        <p>
          کاربر پریمیوم می‌تواند گزارش خصوصی خود را عمومی کند و بعداً وضعیتش
          را تغییر دهد. اجازهٔ نمایش نام یا اطلاعات شناسایی جداگانه گرفته
          می‌شود؛ بنابراین یک گزارش عمومی می‌تواند بدون نام باقی بماند.
        </p>

        <div className="tag-list trust-tag-list">
          <span>مهمان و رایگان: public / indexable</span>
          <span>پریمیوم: private / noindex</span>
          <span>انتشار پریمیوم: با انتخاب صریح</span>
          <span>نمایش نام: رضایت جداگانه</span>
        </div>
      </section>

      <section className="card trust-note-card privacy-copy-detox-marker">
        <span className="section-label">نگهداری و دسترسی</span>
        <h2>نسخهٔ محلی جای حساب و لینک ذخیره‌شده را نمی‌گیرد</h2>
        <p>
          ممکن است برای ادامهٔ خواندن، نسخه‌ای روی همین مرورگر نگه داشته شود.
          پاک‌کردن داده‌های مرورگر می‌تواند نسخهٔ محلی را از بین ببرد؛ وضعیت
          انتشار گزارش ذخیره‌شده بر اساس همان قواعد مهمان، رایگان و پریمیوم
          تعیین می‌شود.
        </p>
      </section>

      <section className="card trust-note-card privacy-copy-detox-marker">
        <span className="section-label">آمار بازدید</span>
        <h2>آمار بازدید صفحه‌های عمومی هر زمان قابل غیرفعال‌کردن است</h2>
        <p>
          Google Analytics به‌صورت پیش‌فرض فقط روی صفحه‌های عمومی فعال است.
          محتوای گزارش، دادهٔ تولد، نام، ایمیل و مسیرهای خصوصی تحلیل رابطه به
          آن فرستاده نمی‌شوند. این انتخاب هر زمان قابل تغییر است.
        </p>

        <div className="actions">
          <AnalyticsPreferencesLink
            className="button secondary"
            label="تنظیم آمار بازدید"
          />
        </div>
      </section>
    </section>
  );
}
