import type { Metadata } from "next";
import Link from "next/link";

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
    text: "گزارش‌های ساخته‌شده در مرورگر همین دستگاه نگه داشته می‌شوند و به‌عنوان صفحه عمومی یا indexable منتشر نمی‌شوند.",
  },
  {
    title: "انتشار عمومی فقط با رضایت روشن",
    text: "اگر روزی گزارش عمومی، لینک قابل اشتراک یا نسخه indexable اضافه شود، باید با انتخاب آگاهانه، نام نمایشی و امکان برگشت همراه باشد.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="grid trust-page-shell privacy-trust-page">
      <div className="card trust-hero-card">
        <span className="badge">حریم داده و گزارش‌ها</span>

        <h1>داده تولد تو برای ساخت گزارش استفاده می‌شود، نه برای انتشار عمومی</h1>

        <p>
          هالیوس در وضعیت فعلی private-first است. یعنی گزارش تولد برای خواندن
          شخصی ساخته می‌شود، روی همین دستگاه می‌ماند و بدون رضایت روشن به صفحه
          عمومی یا قابل ایندکس تبدیل نمی‌شود.
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

      <section className="card trust-note-card">
        <span className="section-label">وضعیت فعلی</span>
        <h2>ذخیره‌سازی فعلاً محلی است</h2>
        <p>
          تا وقتی حساب کاربری و ذخیره‌سازی ابری فعال نشده، گزارش‌ها و یادداشت‌ها
          در مرورگر همین دستگاه می‌مانند. اگر مرورگر یا داده‌های محلی پاک شوند،
          ممکن است گزارش‌ها از دست بروند؛ برای همین مسیر خروجی گرفتن گزارش‌ها در
          صفحه گزارش‌ها حفظ شده است.
        </p>

        <div className="tag-list trust-tag-list">
          <span>گزارش فعلی: خصوصی</span>
          <span>انتشار عمومی: فعال نیست</span>
          <span>ایندکس گوگل: فعال نیست</span>
          <span>حساب کاربری: بعداً</span>
        </div>
      </section>
    </section>
  );
}
