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
    title: "گزارش شخصی ذخیره‌شده",
    description:
      "گزارش‌ها در مرورگر ذخیره می‌شوند و می‌توانی بعداً دوباره آن‌ها را ببینی، جستجو کنی یا یادداشت اضافه کنی.",
  },
  {
    title: "آرشیو، علاقه‌مندی و یادداشت",
    description:
      "برای هر گزارش صفحه جزئیات، یادداشت شخصی، ستاره‌دار کردن و خروجی JSON تکی داریم.",
  },
  {
    title: "شفافیت داده",
    description:
      "این نسخه هنوز backend ندارد؛ داده‌ها فعلاً فقط روی مرورگر همین دستگاه ذخیره می‌شوند.",
  },
];

const demoSteps = [
  {
    title: "ساخت چارت mock",
    description: "اطلاعات تولد را وارد کن و یک گزارش نمادین فارسی بساز.",
  },
  {
    title: "رفتن به جزئیات گزارش",
    description: "بعد از ساخت، مستقیم وارد صفحه اختصاصی همان گزارش می‌شوی.",
  },
  {
    title: "یادداشت و علاقه‌مندی",
    description: "گزارش‌های مهم را ستاره‌دار کن و برایشان یادداشت بنویس.",
  },
  {
    title: "مدیریت داده محلی",
    description: "از Admin می‌توانی backup بگیری یا داده‌های دمو را پاک کنی.",
  },
];

const trustItems = [
  "تفسیر نمادین، نه پیش‌بینی قطعی",
  "بدون توصیه پزشکی، مالی یا حقوقی",
  "ذخیره محلی در مرورگر",
  "آماده برای فاز public profile در آینده",
];

const futureAreas = [
  "چارت واقعی و Rule Engine",
  "Public profile با consent",
  "SEO کنترل‌شده برای صفحات عمومی",
  "AI Naturalization در فاز جداگانه",
];

export default function Home() {
  return (
    <section className="grid home-page">
      <div className="hero hero-polished">
        <div>
          <span className="badge">نسخه local reports MVP</span>

          <h1>چارت تولد، گزارش شخصی و یادداشت‌های نمادین در یک فضای ساده</h1>

          <p>
            Astro Clean یک تجربه فارسی برای ساخت گزارش نمادین چارت تولد است.
            این نسخه روی گزارش‌های ذخیره‌شده، داشبورد شخصی، علاقه‌مندی‌ها،
            یادداشت‌ها و شفافیت داده تمرکز دارد.
          </p>

          <SafetyDisclaimer compact />

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت اولین گزارش
            </Link>

            <Link className="button secondary" href="/reports">
              دیدن گزارش‌ها
            </Link>

            <Link className="button secondary" href="/privacy">
              حریم داده
            </Link>
          </div>
        </div>

        <div className="card hero-card polished-hero-card">
          <span className="badge">دموی فعلی محصول</span>

          <h2>از فرم تولد تا صفحه گزارش</h2>

          <p>
            گزارش ساخته می‌شود، ذخیره می‌شود، مستقیم وارد صفحه جزئیات می‌شوی و
            می‌توانی برای آن یادداشت بنویسی یا خروجی JSON بگیری.
          </p>

          <div className="mini-card">
            <strong>وضعیت فعلی</strong>
            <span>Frontend MVP آماده دمو</span>
          </div>
        </div>
      </div>

      <div className="trust-strip">
        {trustItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="card">
        <span className="section-label">مسیر دمو</span>

        <h2>در کمتر از چند دقیقه مسیر اصلی محصول را تست کن</h2>

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
            شروع دمو
          </Link>

          <Link className="button secondary" href="/dashboard">
            دیدن داشبورد
          </Link>

          <Link className="button secondary" href="/admin">
            مدیریت داده‌های دمو
          </Link>
        </div>
      </div>

      <div>
        <span className="section-label">قابلیت‌های فعلی MVP</span>

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
          <span className="section-label">چشم‌انداز آینده</span>

          <h2>بعد از نسخه دمو، مسیر public و SEO را کنترل‌شده باز می‌کنیم</h2>

          <p>
            مرحله بعدی می‌تواند شامل public account، صفحات قابل ایندکس با رضایت
            کاربر، keyword generation کنترل‌شده و eventually موتور واقعی چارت
            باشد. اما این‌ها باید بعد از privacy، consent و کیفیت محتوا طراحی
            شوند.
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