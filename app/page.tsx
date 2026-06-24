import type { Metadata } from "next";
import Link from "next/link";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export const metadata: Metadata = {
  title: "Astro Clean | چارت تولد و گزارش نمادین فارسی",
  description:
    "Astro Clean یک فضای فارسی برای ساخت چارت تولد، دریافت گزارش نمادین، ذخیره گزارش‌ها و مرور مسیر شخصی است.",
};

const mvpFeatures = [
  {
    title: "گزارش تولد قابل نگهداری",
    description:
      "بعد از وارد کردن اطلاعات تولد، یک گزارش نمادین فارسی می‌سازی که می‌توانی ذخیره‌اش کنی، دوباره بخوانی و با یادداشت شخصی کامل‌ترش کنی.",
  },
  {
    title: "آرشیو شخصی گزارش‌ها",
    description:
      "گزارش‌هایت را جستجو کن، موارد مهم را ستاره‌دار کن، برایشان یادداشت بنویس و هر وقت خواستی خروجی بگیر.",
  },
  {
    title: "شفاف، آرام و بدون ادعای قطعی",
    description:
      "Astro Clean آسترولوژی را به عنوان زبان نمادین و خودشناسانه ارائه می‌کند؛ نه پیش‌بینی قطعی و نه توصیه تخصصی.",
  },
];

const demoSteps = [
  {
    title: "اطلاعات تولد را وارد کن",
    description: "نام، تاریخ، ساعت و شهر تولد را ثبت کن تا مسیر گزارش شروع شود.",
  },
  {
    title: "گزارش نمادین را بخوان",
    description: "خلاصه، نشانه‌های اصلی و برداشت‌های تفسیری را در یک صفحه مرتب ببین.",
  },
  {
    title: "گزارش‌های مهم را نگه دار",
    description: "گزارش‌ها را ستاره‌دار کن، روی آن‌ها یادداشت بگذار و بعداً برگرد.",
  },
  {
    title: "برای نسخه کامل آماده شو",
    description: "این نسخه پایه، مسیر موتور واقعی چارت، حساب کاربری و ذخیره امن‌تر را آماده می‌کند.",
  },
];

const trustItems = [
  "تجربه فارسی و ساده",
  "گزارش نمادین، نه حکم قطعی",
  "تمرکز روی privacy و کنترل داده",
  "آماده برای حساب کاربری و دیتابیس",
];

const futureAreas = [
  "موتور واقعی چارت تولد",
  "اکانت و ذخیره امن گزارش‌ها",
  "گزارش‌های عمیق‌تر و قابل اشتراک",
  "متن طبیعی‌تر با لایه هوشمند کنترل‌شده",
];

export default function Home() {
  return (
    <section className="grid home-page">
      <div className="hero hero-polished">
        <div>
          <span className="badge">Astro Clean Preview</span>

          <h1>چارت تولد فارسی، با گزارش‌هایی که می‌شود به آن‌ها برگشت</h1>

          <p>
            Astro Clean برای کسی ساخته شده که می‌خواهد چارت تولدش را به زبان
            فارسی، ساده و قابل نگهداری ببیند؛ گزارشی نمادین بسازد، آن را ذخیره
            کند، روی برداشت‌هایش یادداشت بگذارد و بعداً دوباره مرورش کند.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت گزارش تولد
            </Link>

            <Link className="button secondary" href="/reports">
              آرشیو گزارش‌ها
            </Link>

            <Link className="button secondary" href="/privacy">
              حریم داده
            </Link>
          </div>
        </div>

        <div className="card hero-card polished-hero-card">
          <span className="badge">مسیر اصلی محصول</span>

          <h2>از تولد تا گزارش قابل مرور</h2>

          <p>
            فرم تولد را پر می‌کنی، گزارش ساخته می‌شود، در آرشیو می‌ماند و هر
            بار می‌توانی با یادداشت، علاقه‌مندی و خروجی گرفتن به آن برگردی.
          </p>

          <div className="mini-card">
            <strong>وضعیت فعلی</strong>
            <span>نسخه نمایشی قابل استفاده برای تست مسیر محصول</span>
          </div>
        </div>
      </div>

      <div className="trust-strip">
        {trustItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="card">
        <span className="section-label">چطور کار می‌کند</span>

        <h2>یک مسیر کوتاه از اطلاعات تولد تا آرشیو شخصی</h2>

        <div className="demo-flow polished-demo-flow">
          {demoSteps.map((step, index) => (
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

          <Link className="button secondary" href="/dashboard">
            داشبورد من
          </Link>

          <Link className="button secondary" href="/admin">
            مدیریت داده‌ها
          </Link>
        </div>
      </div>

      <div>
        <span className="section-label">چیزی که الان می‌توانی تست کنی</span>

        <div className="grid grid-3">
          {mvpFeatures.map((feature) => (
            <article className="card feature-card-polished" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="card home-next-card">
        <div>
          <span className="section-label">مسیر بعدی محصول</span>

          <h2>این صفحه فقط دمو نیست؛ پایه نسخه حساب‌دار و دیتابیس‌دار است</h2>

          <p>
            امروز گزارش‌ها برای تست سریع در مرورگر می‌مانند، اما ساختار محصول
            برای مسیر جدی‌تر آماده می‌شود: شهر و زمان دقیق‌تر، موتور واقعی چارت،
            حساب کاربری، ذخیره امن گزارش‌ها و در نهایت گزارش‌های عمیق‌تر و
            قابل اشتراک.
          </p>
        </div>

        <div className="tag-list">
          {futureAreas.map((area) => (
            <span key={area}>{area}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
