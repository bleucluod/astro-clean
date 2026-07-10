import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "محصول Halleus | گزارش تولد فارسی و خصوصی",
  description:
    "Halleus یک تجربه فارسی برای ساخت و خواندن گزارش تولد است؛ رایگان، خصوصی و متمرکز بر خودشناسی نمادین.",
  alternates: {
    canonical: "/product",
  },
};

const productValues = [
  {
    title: "چارت تولد واقعی‌تر",
    text: "هالیوس از داده تولد، زمان و شهر برای ساخت چارت و خواندن فارسی استفاده می‌کند؛ نه از متن‌های عمومی و یکسان برای همه.",
  },
  {
    title: "گزارش قابل خواندن",
    text: "خروجی فقط جدول سیاره‌ها نیست؛ نخ‌های اصلی، خانه‌ها، جنبه‌ها و دست‌های ماه در یک روایت آرام کنار هم می‌آیند.",
  },
  {
    title: "خصوصی در وضعیت فعلی",
    text: "گزارش‌ها فعلاً برای مرور شخصی ساخته می‌شوند و مسیر عمومی یا قابل پیدا شدن در گوگل بدون رضایت روشن کاربر فعال نیست.",
  },
] as const;

const flowSteps = [
  "تاریخ، ساعت و شهر تولد را وارد می‌کنی.",
  "هالیوس چارت را محاسبه و گزارش فارسی را آماده می‌کند.",
  "گزارش را می‌خوانی، ذخیره می‌کنی و بعداً از صفحه گزارش‌ها برمی‌گردی.",
] as const;

export default function ProductPage() {
  return (
    <section className="grid trust-page-shell product-trust-page product-copy-detox-marker">
      <div className="card trust-hero-card">
        <span className="badge">مسیر محصول Halleus</span>

        <h1>هالیوس چارت تولد را به یک خوانش فارسی، آرام و شخصی تبدیل می‌کند</h1>

        <p>
          هالیوس برای کسی ساخته شده که می‌خواهد از داده تولدش یک گزارش قابل
          خواندن بگیرد: نه فال روزانه، نه پیش‌بینی قطعی، نه صفحه آزمایشگاهی.
          تمرکز فعلی روی کیفیت گزارش، تجربه ساخت چارت و برگشت راحت به گزارش‌هاست.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش تولد
          </Link>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌های من
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده‌ها
          </Link>
        </div>
      </div>

      <section className="trust-principle-grid">
        {productValues.map((item) => (
          <article className="card trust-principle-card" key={item.title}>
            <span className="section-label">هالیوس چیست؟</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="card trust-flow-card">
        <span className="section-label">مسیر کاربر</span>
        <h2>از تولد تا گزارش، در سه قدم کوتاه</h2>

        <div className="home-step-list trust-step-list">
          {flowSteps.map((step, index) => (
            <div key={step}>
              <strong>{(index + 1).toLocaleString("fa-IR")}. قدم</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card trust-note-card">
        <span className="badge">مرز خوانش</span>
        <h2>زبان هالیوس نمادین و تأملی است</h2>
        <p>
          گزارش‌ها برای خودشناسی، سرگرمی جدی و نگاه نمادین به الگوهای چارت
          نوشته می‌شوند. تصمیم‌های پزشکی، مالی، حقوقی یا زندگی جدی باید بر پایه
          مشورت تخصصی و مسئولیت شخصی گرفته شوند.
        </p>
      </section>
    </section>
  );
}
