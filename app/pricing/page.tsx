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
    <section className="grid">
      <div className="card">
        <span className="badge">Halleus Pricing</span>

        <h1>پلن‌ها و مسیر پرداخت</h1>

        <p>
          پرداخت واقعی هنوز فعال نیست. این صفحه ساختار پلن‌ها را نشان می‌دهد تا
          قبل از اتصال payment provider، مدل محصول و محدودیت‌ها روشن باشد.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            تست رایگان
          </Link>

          <Link className="button secondary" href="/profile">
            وضعیت اکانت
          </Link>
        </div>
      </div>

      <div className="feature-grid">
        {plans.map((plan) => (
          <article className="card feature-card-polished" key={plan.slug}>
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
          </article>
        ))}
      </div>

      <section className="card">
        <span className="badge">Payment Readiness</span>

        <h2>وضعیت پرداخت</h2>

        <p>
          پرداخت تا وقتی auth، database و کیفیت گزارش واقعی آماده نشوند فعال
          نمی‌شود.
        </p>

        <div className="tag-list">
          <span>Stage: {readiness.stage}</span>
          <span>Provider: {readiness.provider}</span>
          <span>Payments: {readiness.canEnablePayments ? "ready" : "blocked"}</span>
        </div>

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
