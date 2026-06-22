import type { Metadata } from "next";
import Link from "next/link";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export const metadata: Metadata = {
  title: "Astro Clean | چارت تولد و تحلیل نمادین فارسی",
  description:
    "Astro Clean یک پلتفرم فارسی برای ساخت چارت تولد، گزارش شخصی و تجربه نمادین آسترولوژی است.",
};

const mvpFeatures = [
  {
    title: "چارت تولد mock",
    description:
      "برای شروع سریع، خورشید، ماه و رایزینگ را با یک موتور mock می‌سازیم تا تجربه محصول قابل لمس شود.",
  },
  {
    title: "گزارش فارسی نرم",
    description:
      "متن‌ها قطعی و ترسناک نیستند؛ برای سرگرمی، خودشناسی و تأمل شخصی نوشته شده‌اند.",
  },
  {
    title: "ذخیره در مرورگر",
    description:
      "گزارش‌ها و پروفایل فعلاً در localStorage ذخیره می‌شوند؛ بدون دیتابیس و backend.",
  },
];

const demoSteps = [
  "اطلاعات تولد را وارد کن",
  "گزارش mock فارسی بساز",
  "گزارش را در Reports ببین",
  "آخرین گزارش را در Dashboard دنبال کن",
];

const futureAreas = [
  "چارت واقعی و Rule Engine",
  "داشبورد شخصی و Mood Tracking",
  "سازگاری رابطه و Couple Mode",
  "Astro Wiki و SEO کنترل‌شده",
];

export default function Home() {
  return (
    <section className="grid home-page">
      <div className="hero">
        <div>
          <span className="badge">نسخه MVP فارسی Astro Clean</span>

          <h1>چارت تولد و تحلیل نمادین، ساده و شخصی</h1>

          <p>
            Astro Clean یک تجربه فارسی برای ساخت چارت تولد، دریافت گزارش‌های
            شخصی و دنبال کردن مسیر خودشناسی نمادین است. این نسخه هنوز ساده است،
            اما از همین ابتدا حس یک محصول واقعی و قابل توسعه را دارد.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت اولین چارت
            </Link>

            <Link className="button secondary" href="/roadmap">
              دیدن نقشه راه
            </Link>
          </div>
        </div>

        <div className="card hero-card">
          <span className="badge">نمونه خروجی MVP</span>

          <h2>گزارش شخصی تو</h2>

          <p>
            خورشید، ماه و رایزینگ به شکل mock ساخته می‌شوند و بعد با چند قانون
            ساده، یک متن فارسی نرم و قابل خواندن نمایش داده می‌شود.
          </p>

          <div className="mini-card">
            <strong>هدف فعلی</strong>
            <span>محصول قابل دیدن، تمیز و دوست‌داشتنی</span>
          </div>
        </div>
      </div>

      <div className="card">
        <span className="section-label">مسیر دمو</span>

        <h2>در کمتر از یک دقیقه محصول را تست کن</h2>

        <div className="demo-flow">
          {demoSteps.map((step, index) => (
            <div className="demo-step" key={step}>
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            شروع دمو
          </Link>

          <Link className="button secondary" href="/admin">
            ریست داده‌های دمو
          </Link>
        </div>
      </div>

      <div>
        <span className="section-label">قابلیت‌های فعلی MVP</span>

        <div className="grid grid-3">
          {mvpFeatures.map((feature) => (
            <article className="card" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="section-label">چشم‌انداز آینده</span>

        <h2>کوچک شروع می‌کنیم، ولی مسیر را درست می‌چینیم</h2>

        <p>
          Astro Clean قرار نیست فقط یک فرم ساده بماند. بعد از پایدار شدن MVP،
          می‌توانیم مرحله‌به‌مرحله سراغ چارت واقعی، داشبورد، پروفایل اجتماعی،
          محتوای SEO، گیمیفیکیشن و AI Naturalization برویم.
        </p>

        <div className="tag-list">
          {futureAreas.map((area) => (
            <span key={area}>{area}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
