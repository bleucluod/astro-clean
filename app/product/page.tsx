import Link from "next/link";
import { getProductSurfaceLinks } from "@/lib/product/product-surface";

const statusLabels = {
  live: "فعال",
  preview: "Preview",
  planned: "بعداً",
} as const;

const paidDeliverables = [
  "گزارش تولد فارسی با خلاصه، سه ستون اصلی و روابط مهم سیاره‌ها",
  "صفحه جزئیات قابل بازگشت و قابل کپی برای اشتراک‌گذاری",
  "آرشیو گزارش‌ها برای مرور، ستاره‌دار کردن و یادداشت شخصی",
  "مسیر سفارش دستی برای نسخه کامل، بدون فعال‌سازی پرداخت آنلاین",
];

const manualOrderSteps = [
  "کاربر گزارش رایگان/نمونه را در /chart می‌سازد.",
  "در /pricing پلن مناسب را می‌بیند.",
  "از /order متن سفارش دستی را آماده و کپی می‌کند.",
  "بعد از تأیید دستی، گزارش کامل‌تر می‌تواند در همین مسیر محصول تحویل شود.",
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

          <h1>محصول Halleus: گزارش تولد فارسی با مسیر سفارش دستی</h1>

          <p>
            این صفحه هنوز نقشه محصول را نگه می‌دارد، اما تمرکز نسخه فعلی روی
            یک پیشنهاد قابل فروش است: کاربر گزارش تولد فارسی می‌سازد، خروجی را
            می‌خواند و اگر نسخه کامل‌تر بخواهد، از مسیر قیمت‌گذاری و سفارش دستی
            جلو می‌رود.
          </p>

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت گزارش
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

        <h2>پرداخت واقعی هنوز فعال نیست؛ سفارش اولیه دستی است</h2>

        <p>
          این مسیر عمداً payment provider را فعال نمی‌کند. در عوض، محصول را برای
          تست فروش آماده می‌کند: توضیح روشن، پلن قابل فهم، CTA و تحویل دستی.
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
          provider اضافه می‌شوند. این ترتیب کمک می‌کند چیزی که می‌سازی دوباره
          از صفر بازنویسی نشود.
        </p>
      </section>
    </section>
  );
}