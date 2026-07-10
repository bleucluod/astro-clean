import type { Metadata } from "next";
import Link from "next/link";
import { getPublicBillingPlans } from "@/lib/billing/billing-plans";

export const metadata: Metadata = {
  title: "پلن‌ها و گزارش کامل‌تر | Halleus",
  description:
    "گزینه‌های دریافت گزارش کامل‌تر هالیوس را ببین؛ از گزارش پایه رایگان تا درخواست نسخه کامل‌تر.",
  alternates: {
    canonical: "/pricing",
  },
};

function formatLimit(value: number | "unlimited") {
  return value === "unlimited" ? "نامحدود" : value.toLocaleString("fa-IR");
}

function formatPrice(value: number) {
  if (value === 0) {
    return "رایگان";
  }

  return "هماهنگی دستی";
}

export default function PricingPage() {
  const plans = getPublicBillingPlans();

  return (
    <section className="grid paid-mvp-pricing-shell pricing-copy-detox-marker">
      <div className="card paid-hero">
        <div>
          <span className="badge">پلن‌های هالیوس</span>
          <span className="badge paid-soft-badge">رایگان تا کامل‌تر</span>

          <h1>گزارش تولد را از نسخه پایه شروع کن</h1>

          <p>
            می‌توانی گزارش پایه را رایگان بسازی. اگر بعد از خواندن گزارش خواستی
            نسخه‌ای کامل‌تر و منسجم‌تر داشته باشی، درخواستت را به‌صورت دستی
            آماده می‌کنی تا درباره محدوده، زمان و هزینه هماهنگ شود.
          </p>

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت گزارش پایه
            </Link>

            <Link className="button secondary" href="/product">
              آشنایی با هالیوس
            </Link>

            <Link className="button secondary" href="/order">
              درخواست نسخه کامل‌تر
            </Link>
          </div>
        </div>
      </div>

      <div className="feature-grid paid-plan-grid">
        {plans.map((plan) => (
          <article
            className="card feature-card-polished paid-plan-card"
            key={plan.slug}
          >
            <span className="badge">{plan.name}</span>

            <h2>{formatPrice(plan.monthlyPrice)}</h2>

            <p>{plan.description}</p>

            <div className="tag-list">
              <span>
                گزارش‌های قابل نگهداری: {formatLimit(plan.limits.savedReports)}
              </span>
              <span>
                خروجی‌های قابل دریافت: {formatLimit(plan.limits.exportsPerMonth)}
              </span>
              <span>
                گزارش کامل‌تر: {formatLimit(plan.limits.advancedReports)}
              </span>
            </div>

            <ul className="feature-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <div className="actions">
              <Link className="button secondary" href="/order">
                درخواست این مسیر
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="card manual-order-flow">
        <span className="section-label">چطور شروع می‌شود؟</span>

        <h2>اول گزارش پایه، بعد درخواست نسخه کامل‌تر</h2>

        <p>
          بهترین مسیر این است که اول گزارش پایه‌ات را بسازی و بخوانی. اگر حس کردی
          به خوانشی عمیق‌تر، منسجم‌تر یا قابل ارائه نیاز داری، متن درخواستت را
          آماده می‌کنی و بعد جزئیات به‌صورت دستی هماهنگ می‌شود.
        </p>

        <div className="tag-list payment-disabled">
          <span>شروع: رایگان</span>
          <span>نسخه کامل‌تر: با هماهنگی</span>
          <span>تحویل: بعد از تأیید زمان و محدوده</span>
        </div>

        <div className="home-step-list">
          <div>
            <strong>۱. ساخت گزارش پایه</strong>
            <span>از صفحه ساخت گزارش شروع کن و خروجی اولیه را بخوان.</span>
          </div>

          <div>
            <strong>۲. انتخاب مسیر کامل‌تر</strong>
            <span>
              اگر به خوانش کامل‌تر نیاز داشتی، یکی از مسیرهای این صفحه را انتخاب
              کن.
            </span>
          </div>

          <div>
            <strong>۳. آماده‌سازی درخواست</strong>
            <span>
              متن سفارش را آماده کن تا درباره زمان، هزینه و محدوده هماهنگ شود.
            </span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">شفافیت قبل از سفارش</span>

        <h2>قبل از شروع، محدوده گزارش روشن می‌شود</h2>

        <p>
          نسخه کامل‌تر فقط وقتی شروع می‌شود که بدانیم چه نوع خوانشی می‌خواهی،
          چه مقدار جزئیات لازم داری و متن نهایی باید برای چه استفاده‌ای آماده شود.
        </p>

        <div className="home-step-list">
          <div>
            <strong>عمق خوانش</strong>
            <span>
              مشخص می‌کنی گزارش بیشتر برای شناخت شخصی، مرور رابطه یا تصمیم‌گیری
              آرام لازم است.
            </span>
          </div>

          <div>
            <strong>قالب تحویل</strong>
            <span>پیش از شروع، درباره شکل و محدوده متن نهایی توافق می‌شود.</span>
          </div>

          <div>
            <strong>حریم گزارش</strong>
            <span>
              گزارش تولد تو برای خودت می‌ماند مگر اینکه خودت خلافش را انتخاب کنی.
            </span>
          </div>
        </div>
      </section>
    </section>
  );
}
