import type { Metadata } from "next";
import Link from "next/link";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export const metadata: Metadata = {
  title: "Halleus | گزارش تولد فارسی و قابل سفارش",
  description:
    "Halleus تجربه‌ای فارسی برای ساخت گزارش تولد، ذخیره گزارش و سفارش دستی نسخه کامل‌تر است.",
};

const paidHighlights = [
  {
    title: "گزارشی که می‌شود دوباره خواند",
    description:
      "کاربر فقط تاریخ، ساعت و شهر تولد را وارد می‌کند؛ Halleus گزارش فارسی را می‌سازد، ذخیره می‌کند و خواندن دوباره‌اش را ساده نگه می‌دارد.",
  },
  {
    title: "لحن انسانی، نرم و غیرقطعی",
    description:
      "متن گزارش برای خودشناسی نوشته می‌شود؛ نه برای پیش‌بینی قطعی، قضاوت کردن یا جایگزین کردن تصمیم تخصصی.",
  },
  {
    title: "مسیر روشن برای نسخه کامل‌تر",
    description:
      "بعد از ساخت گزارش نمونه، کاربر می‌تواند همان گزارش را به سفارش دستی وصل کند و نسخه کامل‌تر را بدون وارد کردن دوباره اطلاعات درخواست بدهد.",
  },
];

const trustPillars = [
  "محاسبه پشت صحنه با real engine",
  "لحن فارسی و غیرقطعی",
  "ذخیره گزارش در مرورگر",
  "سفارش فعلاً دستی و شفاف",
];

const flowSteps = [
  {
    title: "اطلاعات تولد را وارد کن",
    description:
      "نام اختیاری، تاریخ شمسی، ساعت و شهر تولد را ثبت کن؛ Halleus پشت صحنه تاریخ را برای محاسبه به فرمت لازم تبدیل می‌کند.",
  },
  {
    title: "گزارش نمونه ساخته می‌شود",
    description:
      "فرم اصلی real engine را صدا می‌زند و گزارش ذخیره‌شده‌ای می‌سازد که می‌توانی همان لحظه بخوانی یا بعداً دوباره بازش کنی.",
  },
  {
    title: "اگر خواستی، کامل‌ترش کن",
    description:
      "از صفحه جزئیات گزارش یا قیمت‌گذاری، شناسه همان گزارش به سفارش دستی منتقل می‌شود تا ادامه مسیر روشن بماند.",
  },
];

export default function Home() {
  return (
    <section className="grid home-page paid-mvp-landing">
      <div className="hero hero-polished paid-hero">
        <div>
          <span className="badge">Halleus Paid MVP Shell</span>

          <h1>گزارش تولد فارسی، آرام، خواندنی و قابل سفارش</h1>

          <p>
            Halleus برای کسی ساخته شده که می‌خواهد چارت تولدش را به زبان فارسی،
            ساده و انسانی بخواند. نسخه فعلی مسیر اصلی محصول را کامل‌تر کرده:
            ساخت گزارش، ذخیره، صفحه جزئیات و سفارش دستی نسخه کامل‌تر همان گزارش.
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
              آشنایی با محصول
            </Link>
          </div>
        </div>

        <div className="card hero-card polished-hero-card paid-hero-card">
          <span className="badge">نسخه قابل تست فروش</span>

          <h2>از گزارش نمونه تا سفارش نسخه کامل‌تر</h2>

          <p>
            پرداخت آنلاین هنوز فعال نیست؛ اما مسیر کاربر روشن است. گزارش نمونه
            ساخته می‌شود، در صفحه جزئیات دیده می‌شود و اگر کاربر نسخه کامل‌تر
            بخواهد، همان گزارش به فرم سفارش دستی وصل می‌شود.
          </p>

          <div className="mini-card">
            <strong>مسیر اصلی</strong>
            <span>/chart → /reports/[reportId] → /order</span>
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

        <h2>یک گزارش تولد فارسی برای نگه داشتن، فکر کردن و کامل‌تر کردن</h2>

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

          <h2>اول ارزش محصول را با سفارش دستی بسنجیم</h2>

          <p>
            فعلاً هدف این نیست که پرداخت آنلاین را زود وصل کنیم. هدف این است که
            پیشنهاد محصول، پلن‌ها و مسیر سفارش آن‌قدر واضح باشند که بتوانی با
            کاربر واقعی تست کنی و بعد payment provider را با ریسک کمتر اضافه کنی.
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
