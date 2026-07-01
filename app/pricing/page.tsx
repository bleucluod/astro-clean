import type { Metadata } from "next";
import Link from "next/link";
import { getPublicBillingPlans } from "@/lib/billing/billing-plans";

export const metadata: Metadata = {
  title: "پلن‌ها و گزارش کامل‌تر | Halleus",
  description:
    "گزینه‌های دریافت گزارش کامل‌تر Halleus را ببین؛ از گزارش اولیه تا مسیر سفارش نسخه عمیق‌تر و خواندنی‌تر.",
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

  return `$${value.toLocaleString("en-US")}`;
}

export default function PricingPage() {
  const plans = getPublicBillingPlans();

  return (
    <section className="grid paid-mvp-pricing-shell">
      <div className="card paid-hero">
        <div>
          <span className="badge">پلن‌های Halleus</span>
          <span className="badge paid-soft-badge">سفارش دستی و شفاف</span>

          <h1>پلن‌ها برای کامل‌تر کردن گزارش تولد Halleus</h1>

          <p>
            پرداخت آنلاین هنوز فعال نیست. این صفحه کمک می‌کند کاربر تفاوت پلن‌ها
            را بفهمد، گزارش نمونه‌اش را مبنا قرار بدهد و سفارش نسخه کامل‌تر را
            به‌صورت دستی و شفاف شروع کند.
          </p>

          <div className="actions">
            <Link className="button" href="/chart">
              ساخت گزارش نمونه
            </Link>

            <Link className="button secondary" href="/product">
              توضیح محصول
            </Link>

            <Link className="button secondary" href="/order">
              ثبت سفارش دستی
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
              <span>گزارش ذخیره‌شده: {formatLimit(plan.limits.savedReports)}</span>
              <span>خروجی ماهانه: {formatLimit(plan.limits.exportsPerMonth)}</span>
              <span>
                گزارش پیشرفته: {formatLimit(plan.limits.advancedReports)}
              </span>
            </div>

            <ul className="feature-list">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <div className="actions">
              <Link className="button secondary" href="/order">
                ثبت سفارش دستی
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="card manual-order-flow">
        <span className="section-label">مسیر سفارش دستی</span>

        <h2>سفارش و پرداخت فعلاً بیرون از سایت هماهنگ می‌شود</h2>

        <p>
          با وجود اینکه کیفیت گزارش کامل‌تر و مسیر تحویل به اندازه کافی روشن نشده،
          پرداخت آنلاین فعال نمی‌شود. کاربر فعلاً پلن را می‌بیند، متن سفارش را
          آماده می‌کند و هماهنگی پرداخت و تحویل خارج از سایت انجام می‌شود.
        </p>

        <div className="tag-list payment-disabled">
          <span>وضعیت: هماهنگی دستی</span>
          <span>پرداخت آنلاین فعلاً فعال نیست</span>
          <span>تحویل: بعد از تأیید زمان و هزینه</span>
        </div>

        <div className="home-step-list">
          <div>
            <strong>۱. ساخت نمونه</strong>
            <span>
              اول کاربر گزارش پایه را در /chart می‌سازد و ارزش محصول را می‌بیند.
            </span>
          </div>

          <div>
            <strong>۲. انتخاب پلن</strong>
            <span>
              پلن‌ها اینجا شفاف‌اند، اما پرداخت داخل سایت هنوز فعال نیست.
            </span>
          </div>

          <div>
            <strong>۳. ثبت سفارش دستی</strong>
            <span>
              کاربر از صفحه گزارش یا /order متن سفارش را با شناسه گزارش آماده می‌کند.
            </span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">آمادگی پرداخت آنلاین</span>

        <h2>قبل از اتصال پرداخت چه چیزهایی باید روشن شود؟</h2>

        <p>
          اتصال پرداخت وقتی معنی دارد که گزارش کامل‌تر، محدوده تحویل و نگهداری
          امن گزارش‌ها برای کاربر شفاف باشد.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. کیفیت گزارش کامل‌تر</strong>
            <span>محدوده، عمق و نمونه خروجی گزارش باید قابل توضیح باشد.</span>
          </div>

          <div>
            <strong>۲. حساب کاربری و نگهداری گزارش</strong>
            <span>کاربر باید بداند گزارش پرداختی کجا نگهداری می‌شود.</span>
          </div>

          <div>
            <strong>۳. روش پرداخت مناسب</strong>
            <span>روش پرداخت باید با مسیر کاربران فارسی‌زبان هماهنگ باشد.</span>
          </div>
        </div>
      </section>
    </section>
  );
}
