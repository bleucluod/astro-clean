import type { Metadata } from "next";
import Link from "next/link";
import { getProductSurfaceLinks } from "@/lib/product/product-surface";

export const metadata: Metadata = {
  title: "محصول Halleus | مسیر گزارش تولد فارسی",
  description:
    "Halleus مسیر ساخت گزارش تولد فارسی، نگهداری گزارش و درخواست نسخه کامل‌تر را در یک تجربه ساده و فارسی کنار هم می‌آورد.",
  alternates: {
    canonical: "/product",
  },
};

const statusLabels = {
  live: "فعال",
  preview: "در حال تکمیل",
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
          <span className="badge">مسیر محصول Halleus</span>
          <span className="badge paid-soft-badge">گزارش و سفارش کامل‌تر</span>

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
        <span className="section-label">آنچه کاربر دریافت می‌کند</span>

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
        <span className="section-label">مسیر سفارش دستی</span>

        <h2>پرداخت واقعی هنوز فعال نیست؛ سفارش اولیه دستی و شفاف است</h2>

        <p>
          این مسیر هنوز پرداخت آنلاین انجام نمی‌دهد. در عوض، کاربر اول گزارش
          نمونه و توضیح پلن‌ها را می‌بیند؛ بعد اگر خواست، با شناسه همان گزارش
          درخواست نسخه کامل‌تر را برای هماهنگی دستی آماده می‌کند.
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

        <h2>مسیرهای اصلی تجربه Halleus</h2>

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
        <span className="badge">اصل ادامه مسیر</span>

        <h2>ادامه محصول باید از ارزش گزارش شروع شود</h2>

        <p>
          اول باید گزارش اولیه، سفارش کامل‌تر و تجربه کاربر روشن بمانند. بعد از
          اینکه ارزش گزارش برای کاربر ثابت شد، حساب کاربری، ذخیره‌سازی ابری و
          پرداخت آنلاین با کمترین بازکاری اضافه می‌شوند.
        </p>
      </section>
    </section>
  );
}
