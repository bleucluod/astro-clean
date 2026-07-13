import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsPreferencesLink } from "@/components/AnalyticsConsent";

export const metadata: Metadata = {
  title: "حریم داده و گزارش‌ها | Halleus",
  description:
    "در Halleus داده تولد برای ساخت چارت و گزارش فارسی استفاده می‌شود؛ گزارش‌ها فعلاً خصوصی و روی همین دستگاه می‌مانند.",
  alternates: {
    canonical: "/privacy",
  },
};

const privacyPoints = [
  {
    title: "داده تولد برای محاسبه چارت است",
    text: "تاریخ، ساعت و شهر تولد برای ساخت چارت و گزارش استفاده می‌شوند؛ هدف فعلی ساخت خوانش شخصی و قابل برگشت است.",
  },
  {
    title: "گزارش‌ها فعلاً خصوصی‌اند",
    text: "گزارش‌های ساخته‌شده در مرورگر همین دستگاه نگه داشته می‌شوند و به‌عنوان صفحه عمومی یا قابل پیدا شدن در گوگل منتشر نمی‌شوند.",
  },
  {
    title: "انتشار عمومی فقط با رضایت روشن",
    text: "اگر روزی گزارش عمومی، لینک قابل اشتراک یا نسخه قابل پیدا شدن در گوگل اضافه شود، باید با انتخاب آگاهانه، نام نمایشی و امکان برگشت همراه باشد.",
  },
  {
    title: "آمار بازدید صفحه‌های عمومی",
    text: "هالیوس برای بهترشدن محصول، آمار صفحه‌های عمومی و اطلاعات فنی متعارف مرورگر را به‌صورت پیش‌فرض اندازه می‌گیرد؛ مسیرهای گزارش و دادهٔ تولد، محتوای گزارش، نام، شماره، ایمیل و شناسه‌های خصوصی به Google Analytics ارسال نمی‌شوند و این آمار هر زمان قابل غیرفعال‌کردن است.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="grid trust-page-shell privacy-trust-page privacy-copy-detox-marker">
      <div className="card trust-hero-card">
        <span className="badge">حریم داده و گزارش‌ها</span>

        <h1>داده تولد تو برای ساخت گزارش استفاده می‌شود، نه برای انتشار عمومی</h1>

        <p>
          هالیوس در وضعیت فعلی حریم‌محور است. یعنی گزارش تولد برای خواندن
          شخصی ساخته می‌شود، روی همین دستگاه می‌ماند و بدون رضایت روشن به صفحه
          عمومی یا قابل پیدا شدن در گوگل تبدیل نمی‌شود.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش تولد
          </Link>

          <Link className="button secondary" href="/reports">
            بازگشت به گزارش‌ها
          </Link>
        </div>
      </div>

      <section className="trust-principle-grid">
        {privacyPoints.map((item) => (
          <article className="card trust-principle-card" key={item.title}>
            <span className="section-label">اصل حریم داده</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="card trust-note-card privacy-copy-detox-marker">
        <span className="section-label">آمار بازدید</span>
        <h2>آمار بازدید عمومی هر زمان قابل غیرفعال‌کردن است</h2>
        <p>
          هالیوس Google Analytics را به‌صورت پیش‌فرض فقط روی صفحه‌های عمومی
          فعال می‌کند. کد هالیوس فقط page view مسیر عمومی را بدون query، hash
          یا شناسه‌های خصوصی می‌فرستد؛ گزارش‌ها و مسیرهای داخلی خارج از
          Analytics می‌مانند. از دکمهٔ زیر می‌توانی آمار را غیرفعال یا دوباره
          فعال کنی.
        </p>

        <div className="actions">
          <AnalyticsPreferencesLink
            className="button secondary"
            label="تنظیم آمار بازدید"
          />
        </div>
      </section>

      <section className="card trust-note-card privacy-copy-detox-marker">
        <span className="section-label">نگهداری گزارش‌ها</span>
        <h2>گزارش تو تا وقتی خودت انتخاب نکنی عمومی نمی‌شود</h2>
        <p>
          اگر گزارش را فقط روی همین دستگاه نگه داری، پاک شدن مرورگر یا داده‌های
          محلی می‌تواند باعث از دست رفتن آن شود. برای همین مسیر دریافت فایل
          پشتیبان در صفحه گزارش‌ها حفظ شده است.
        </p>

        <div className="tag-list trust-tag-list">
          <span>گزارش فعلی: خصوصی</span>
          <span>انتشار عمومی: با انتخاب روشن</span>
          <span>پیدا شدن در گوگل: فعال نیست</span>
          <span>حساب کاربری: اختیاری</span>
        </div>
      </section>
    </section>
  );
}
