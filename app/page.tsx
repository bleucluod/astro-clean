import type { Metadata } from "next";
import Link from "next/link";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export const metadata: Metadata = {
  title: "Halleus | گزارش تولد فارسی و قابل سفارش",
  description:
    "Halleus یک تجربه فارسی برای ساخت گزارش تولد، خواندن چارت نمادین، ذخیره گزارش و آماده‌سازی سفارش دستی نسخه کامل است.",
};

const paidHighlights = [
  {
    title: "گزارش تولد آماده خواندن",
    description:
      "کاربر فقط تاریخ، ساعت و شهر تولد را وارد می‌کند؛ Halleus گزارش فارسی را می‌سازد، ذخیره می‌کند و به صفحه جزئیات می‌برد.",
  },
  {
    title: "متن فارسی نرم و قابل اشتراک",
    description:
      "گزارش به زبان انسانی نوشته می‌شود؛ با تأکید بر خودشناسی، نه پیش‌بینی قطعی یا توصیه تخصصی.",
  },
  {
    title: "آماده برای فروش دستی",
    description:
      "قبل از اتصال payment provider، مسیر محصول، قیمت‌گذاری و سفارش دستی شفاف می‌شود تا بتوانی با کاربر واقعی تست کنی.",
  },
];

const trustPillars = [
  "محاسبه پشت صحنه با real engine",
  "زبان فارسی و غیرقطعی",
  "ذخیره گزارش در مرورگر",
  "مسیر پرداخت هنوز دستی و شفاف",
];

const flowSteps = [
  {
    title: "اطلاعات تولد را وارد کن",
    description:
      "نام اختیاری، تاریخ، ساعت و شهر تولد را ثبت کن؛ فعلاً شهرهای ایران برای تجربه دقیق‌تر پشتیبانی می‌شوند.",
  },
  {
    title: "گزارش ساخته می‌شود",
    description:
      "فرم اصلی پشت صحنه real engine را صدا می‌زند و اگر پاسخ بگیرد، گزارش با جایگاه‌های واقعی‌تر ساخته می‌شود.",
  },
  {
    title: "جزئیات را بخوان و ذخیره کن",
    description:
      "گزارش در آرشیو می‌ماند، می‌توانی بعداً برگردی، یادداشت اضافه کنی و متن اشتراک‌گذاری را کپی کنی.",
  },
];

export default function Home() {
  return (
    <section className="grid home-page paid-mvp-landing">
      <div className="hero hero-polished paid-hero">
        <div>
          <span className="badge">Halleus Paid MVP Shell</span>

          <h1>گزارش تولد فارسی، آماده خواندن و قابل سفارش</h1>

          <p>
            Halleus برای کسی ساخته شده که می‌خواهد چارت تولدش را به زبان فارسی،
            آرام و قابل نگهداری بخواند. نسخه فعلی مسیر اصلی محصول را آماده کرده:
            ساخت گزارش، ذخیره، صفحه جزئیات و یک shell روشن برای فروش دستی نسخه کامل.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت گزارش تولد
            </Link>

            <Link className="button secondary" href="/pricing">
              دیدن پلن‌ها
            </Link>

            <Link className="button secondary" href="/product">
              مسیر محصول
            </Link>
          </div>
        </div>

        <div className="card hero-card polished-hero-card paid-hero-card">
          <span className="badge">نسخه قابل تست فروش</span>

          <h2>از فرم تولد تا سفارش دستی</h2>

          <p>
            پرداخت آنلاین هنوز فعال نیست؛ اما صفحه‌ها، پیام‌ها و CTAها طوری
            چیده شده‌اند که بتوانی ارزش محصول را توضیح بدهی، قیمت را نشان بدهی
            و سفارش‌های اولیه را دستی بگیری.
          </p>

          <div className="mini-card">
            <strong>مسیر اصلی</strong>
            <span>/chart → /reports/[reportId] → /pricing</span>
          </div>
        </div>
      </div>

      <div className="trust-strip paid-trust-strip">
        {trustPillars.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <section className="card paid-section">
        <span className="section-label">پیشنهاد فعلی محصول</span>

        <h2>یک گزارش تولد فارسی برای خواندن دوباره، نه فقط یک خروجی لحظه‌ای</h2>

        <div className="grid grid-3">
          {paidHighlights.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section">
        <span className="section-label">چطور کار می‌کند</span>

        <h2>مسیر کوتاه کاربر</h2>

        <div className="demo-flow polished-demo-flow">
          {flowSteps.map((step, index) => (
            <div className="demo-step" key={step.title}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            شروع ساخت گزارش
          </Link>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌های ذخیره‌شده
          </Link>
        </div>
      </section>

      <section className="card paid-manual-order">
        <div>
          <span className="section-label">فروش دستی قبل از پرداخت آنلاین</span>

          <h2>برای MVP، اول سفارش دستی؛ بعد payment provider</h2>

          <p>
            در این مرحله هدف این نیست که پرداخت آنلاین را زود وصل کنیم. هدف این
            است که پیشنهاد، پلن‌ها، اعتمادسازی و مسیر سفارش واضح باشند تا بعداً
            provider واقعی بدون بازنویسی محصول اضافه شود.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/pricing">
            بررسی پلن‌ها
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده
          </Link>
        </div>
      </section>
    </section>
  );
}
