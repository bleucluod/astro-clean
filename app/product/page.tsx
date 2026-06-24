import Link from "next/link";
import { getProductSurfaceLinks } from "@/lib/product/product-surface";

const statusLabels = {
  live: "فعال",
  preview: "Preview",
  planned: "بعداً",
} as const;

export default function ProductPage() {
  const links = getProductSurfaceLinks();

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Halleus Product Map</span>

        <h1>نقشه محصول Halleus</h1>

        <p>
          این صفحه مسیرهای اصلی محصول را یک‌جا نشان می‌دهد: از ساخت گزارش و
          آرشیو تا پروفایل، پلن‌ها، حریم داده و نقشه راه. هدف این است که سطح
          محصول مثل یک سرویس واقعی و قابل رشد دیده شود، نه مجموعه‌ای از صفحه‌های
          جدا.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            شروع با ساخت گزارش
          </Link>

          <Link className="button secondary" href="/pricing">
            دیدن پلن‌ها
          </Link>
        </div>
      </div>

      <div className="feature-grid">
        {links.map((item) => (
          <article className="card feature-card-polished" key={item.href}>
            <span className="badge">{statusLabels[item.status]}</span>

            <h2>{item.label}</h2>

            <p>{item.description}</p>

            <Link className="button secondary" href={item.href}>
              باز کردن
            </Link>
          </article>
        ))}
      </div>

      <section className="card">
        <span className="badge">Product Principle</span>

        <h2>قاعده ادامه مسیر</h2>

        <p>
          هر بخش جدید باید طوری ساخته شود که بعداً دوباره از صفر بازنویسی نشود:
          اول contract، بعد implementation، بعد اتصال UI، بعد provider واقعی.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. Foundation</strong>
            <span>نوع‌ها، contractها، docs و checkerها.</span>
          </div>

          <div>
            <strong>۲. Preview implementation</strong>
            <span>نسخه امن local/preview بدون ریسک production.</span>
          </div>

          <div>
            <strong>۳. Provider implementation</strong>
            <span>اتصال واقعی دیتابیس، auth یا payment بعد از تصمیم نهایی.</span>
          </div>
        </div>
      </section>
    </section>
  );
}
