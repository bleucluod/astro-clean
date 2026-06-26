import Link from "next/link";
import { getProductSurfaceLinks } from "@/lib/product/product-surface";

const statusLabels = {
  live: "فعال",
  preview: "Preview",
  planned: "بعداً",
} as const;

const paidDeliverables = [
  "گزارش تولد فارسی با خلاصه، سه ستون اصلی و روابط مهم سیاره‌ها",
  "صفحه جزئیات قابل بازگشت، قابل کپی و آماده برای سفارش نسخه کامل‌تر",
  "آرشیو گزارش‌ها برای مرور، ستاره‌دار کردن و یادداشت شخصی",
  "مسیر سفارش دستی که شناسه گزارش نمونه را همراه درخواست نگه می‌دارد",
];

const manualOrderSteps = [
  "کاربر گزارش نمونه را در /chart می‌سازد.",
  "در صفحه جزئیات گزارش، CTA سفارش نسخه کامل‌تر را می‌بیند.",
  "از /order متن سفارش دستی با شناسه همان گزارش آماده و کپی می‌شود.",
  "بعد از هماهنگی دستی، نسخه کامل‌تر می‌تواند بر اساس همان گزارش آماده شود.",
];

export default function ProductPage() {
  const links = getProductSurfaceLinks();
  const featuredLinks = links.filter((item) =>
    ["/chart", "/reports", "/pricing", "/order", "/privacy"].includes(
      item.href,
    ),
  );

  return (
    <section className="grid paid-mvp-product-shell">
      <div className="card paid-hero">
        <div>
          <span className="badge">Halleus Product Map</span>
          <span className="badge paid-soft-badge">Paid MVP Shell</span>

          <h1>Halleus یک مسیر ساده از گزارش تولد تا سفارش نسخه کامل‌تر است</h1>

          <p>
            کاربر ابتدا گزارش تولد فارسی می‌سازد و آن را در صفحه جزئیات می‌خواند.
            اگر نسخه کامل‌تر بخواهد، همان گزارش به فرم سفارش دستی وصل می‌شود تا
            درخواستش دقیق‌تر، قابل پیگیری‌تر و بدون ورود دوباره اطلاعات باشد.
          </p>

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت گزارش نمونه
            </Link>

            <Link className="button secondary" href="/pricing">
              دیدن پلن‌ها
            </Link>

            <Link className="button secondary" href="/order">
              شروع سفارش دستی
            </Link>
          </div>
        </div>
      </div>

      <section className="card paid-section">
        <span className="section-label">تحویل MVP</span>

        <h2>در این نسخه کاربر چه چیزی می‌گیرد؟</h2>

        <div className="paid-checklist">
          {paidDeliverables.map((item) => (
            <div key={item}>
              <strong>✓</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card manual-order-flow">
        <span className="section-label">Manual order flow</span>

        <h2>پرداخت واقعی هنوز فعال نیست؛ سفارش اولیه دستی و شفاف است</h2>

        <p>
          این مسیر عمداً payment provider را فعال نمی‌کند. در عوض، محصول را برای
          تست فروش آماده می‌کند: گزارش نمونه، توضیح روشن، پلن قابل فهم، CTA مرتبط
          با همان گزارش و تحویل دستی.
        </p>

        <div className="home-step-list">
          {manualOrderSteps.map((step, index) => (
            <div key={step}>
              <strong>{(index + 1).toLocaleString("fa-IR")}. مرحله</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="section-label">مسیرهای مهم محصول</span>

        <h2>لینک‌های زنده برای تست فروش</h2>

        <div className="feature-grid">
          {featuredLinks.map((item) => (
            <article className="mini-card paid-surface-link" key={item.href}>
              <span className="badge">{statusLabels[item.status]}</span>
              <strong>{item.label}</strong>
              <p>{item.description}</p>
              <Link className="button secondary" href={item.href}>
                باز کردن
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Product Principle</span>

        <h2>قاعده ادامه مسیر</h2>

        <p>
          اول ارزش محصول و flow فروش روشن می‌شود؛ بعد auth، database و payment
          provider اضافه می‌شوند. این ترتیب کمک می‌کند چیزی که ساخته می‌شود دوباره
          از صفر بازنویسی نشود.
        </p>
      </section>
    </section>
  );
}
