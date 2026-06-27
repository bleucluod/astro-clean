import type { Metadata } from "next";
import Link from "next/link";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export const metadata: Metadata = {
  title: "Halleus | گزارش تولد فارسی و قابل سفارش",
  description:
    "Halleus چارت تولد را به یک گزارش فارسی، آرام و قابل مرور تبدیل می‌کند؛ از ساخت گزارش تا نگهداری و درخواست نسخه کامل‌تر.",
  alternates: {
    canonical: "/",
  },
};

const valueCards = [
  {
    title: "خواندن چارت به زبان خودت",
    description:
      "به‌جای جدول‌های خام یا متن‌های کلی، گزارش با لحن فارسی، آرام و قابل فهم نوشته می‌شود تا بتوانی برداشت شخصی‌ات را از آن نگه داری.",
  },
  {
    title: "گزارشی که فقط برای همان لحظه نیست",
    description:
      "گزارش ساخته‌شده ذخیره می‌شود؛ می‌توانی بعداً دوباره بخوانی، یادداشت اضافه کنی و از همان گزارش برای ادامه مسیر استفاده کنی.",
  },
  {
    title: "مسیر روشن برای گزارش کامل‌تر",
    description:
      "اگر گزارش اولیه برایت معنی‌دار بود، می‌توانی نسخه کامل‌تر را بر اساس همان اطلاعات و همان گزارش درخواست کنی.",
  },
];

const trustPillars = [
  "ورود تاریخ شمسی و شهر تولد",
  "گزارش ذخیره‌شده برای مرور دوباره",
  "لحن فارسی و غیرقطعی",
  "درخواست نسخه کامل‌تر با اطلاعات همین گزارش",
];

const flowSteps = [
  {
    title: "اطلاعات تولد را وارد کن",
    description:
      "تاریخ شمسی، ساعت و شهر تولد را ثبت می‌کنی و Halleus مسیر ساخت گزارش را برایت ساده نگه می‌دارد.",
  },
  {
    title: "گزارش فارسی را بخوان",
    description:
      "گزارش اولیه با تمرکز روی خودشناسی، الگوهای شخصی و نگاه غیرقطعی آماده می‌شود.",
  },
  {
    title: "برداشتت را نگه دار",
    description:
      "گزارش در مرورگر ذخیره می‌شود تا بعداً دوباره بازش کنی و یادداشت شخصی کنار آن بگذاری.",
  },
  {
    title: "اگر خواستی کامل‌ترش کن",
    description:
      "از همان گزارش می‌توانی برای درخواست نسخه کامل‌تر استفاده کنی؛ بدون شروع دوباره از صفر.",
  },
];

const audienceCards = [
  {
    title: "برای شروع خودشناسی",
    description:
      "وقتی می‌خواهی چارت تولدت را بدون اصطلاحات سنگین و بدون ادعای قطعی بخوانی.",
  },
  {
    title: "برای نگه داشتن یک تصویر شخصی",
    description:
      "وقتی دوست داری گزارش را مثل یک متن قابل برگشت ذخیره کنی، نه فقط یک نتیجه لحظه‌ای.",
  },
  {
    title: "برای سفارش خوانش کامل‌تر",
    description:
      "وقتی بعد از گزارش اولیه می‌خواهی نسخه کامل‌تر، منسجم‌تر و انسانی‌تر داشته باشی.",
  },
];

export default function Home() {
  return (
    <section className="grid home-page paid-mvp-landing">
      <div className="hero hero-polished paid-hero">
        <div>
          <span className="badge">Halleus برای چارت تولد فارسی</span>

          <h1>گزارش تولد فارسی، آرام، خواندنی و قابل سفارش</h1>

          <p>
            Halleus چارت تولد را به یک گزارش فارسی قابل مرور تبدیل می‌کند؛
            با تاریخ شمسی و شهر تولد شروع می‌کنی، گزارش را می‌خوانی، ذخیره
            می‌کنی و اگر خواستی نسخه کامل‌تر همان گزارش را درخواست می‌کنی.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت گزارش تولد
            </Link>

            <Link className="button secondary" href="/product">
              ببین Halleus چطور کار می‌کند
            </Link>

            <Link className="button secondary" href="/pricing">
              دیدن گزینه‌های گزارش کامل‌تر
            </Link>
          </div>
        </div>

        <div className="card hero-card polished-hero-card paid-hero-card">
          <span className="badge">مسیر اصلی محصول</span>

          <h2>از گزارش نمونه تا سفارش نسخه کامل‌تر</h2>

          <p>
            گزارش اولیه برای این است که با لحن، ساختار و برداشت‌های اصلی
            Halleus آشنا شوی. بعد از آن می‌توانی گزارش را نگه داری، یادداشت
            بنویسی یا درخواست نسخه کامل‌تر را از همان‌جا ادامه بدهی.
          </p>

          <div className="mini-card">
            <strong>گزارش تو یک نقطه شروع است</strong>
            <p>
              اول یک گزارش قابل خواندن می‌گیری؛ بعد اگر خواستی، همان گزارش
              مبنای خوانش کامل‌تر می‌شود.
            </p>
          </div>
        </div>
      </div>

      <div className="trust-strip paid-trust-strip">
        {trustPillars.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <section className="card paid-section">
        <span className="section-label">ارزش اصلی Halleus</span>

        <h2>یک گزارش تولد برای خواندن، نگه داشتن و برگشتن به خودت</h2>

        <div className="grid grid-3">
          {valueCards.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-section">
        <span className="section-label">چطور جلو می‌روی</span>

        <h2>مسیر کوتاه و روشن، بدون فرم‌های اضافه</h2>

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

      <section className="card paid-section">
        <span className="section-label">برای چه زمانی مناسب است؟</span>

        <h2>وقتی می‌خواهی چارت تولد را انسانی‌تر بخوانی</h2>

        <div className="grid grid-3">
          {audienceCards.map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card paid-manual-order home-next-card">
        <div>
          <span className="section-label">قدم بعدی</span>

          <h2>گزارش اولیه را بساز؛ بعد تصمیم بگیر کامل‌ترش می‌خواهی یا نه</h2>

          <p>
            لازم نیست از همان ابتدا سفارش کامل بدهی. اول گزارش اولیه را ببین،
            اگر به کارت آمد آن را ذخیره کن و بعد از روی همان گزارش برای نسخه
            کامل‌تر اقدام کن.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش تولد
          </Link>

          <Link className="button secondary" href="/pricing">
            مقایسه گزینه‌ها
          </Link>
        </div>
      </section>
    </section>
  );
}
