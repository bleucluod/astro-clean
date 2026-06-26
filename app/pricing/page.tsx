import Link from "next/link";
import { getPublicBillingPlans } from "@/lib/billing/billing-plans";
import { getBillingReadinessReport } from "@/lib/billing/billing-readiness";

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
  const readiness = getBillingReadinessReport();

  return (
    <section className="grid paid-mvp-pricing-shell">
      <div className="card paid-hero">
        <div>
          <span className="badge">Halleus Pricing</span>
          <span className="badge paid-soft-badge">Manual order MVP</span>

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
        <span className="section-label">Manual order flow</span>

        <h2>برای MVP، سفارش و پرداخت بیرون از سایت تأیید می‌شود</h2>

        <p>
          تا وقتی auth، database و کیفیت گزارش کامل‌تر آماده نشده‌اند، payment
          provider فعال نمی‌شود. کاربر فعلاً پلن را می‌بیند، متن سفارش را آماده
          می‌کند و هماهنگی پرداخت و تحویل خارج از سایت انجام می‌شود.
        </p>

        <div className="tag-list payment-disabled">
          <span>Stage: {readiness.stage}</span>
          <span>Provider: {readiness.provider}</span>
          <span>
            Payments: {readiness.canEnablePayments ? "ready" : "blocked"}
          </span>
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
        <span className="badge">Payment Readiness</span>

        <h2>وضعیت اتصال پرداخت</h2>

        <p>
          این بخش هنوز از billing readiness فعلی استفاده می‌کند تا روشن باشد چه
          چیزهایی قبل از فعال‌سازی پرداخت آنلاین باید آماده شوند.
        </p>

        <div className="home-step-list">
          {readiness.recommendedNextSteps.map((step, index) => (
            <div key={step}>
              <strong>{(index + 1).toLocaleString("fa-IR")}. قدم بعدی</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
