import Link from "next/link";
import { getRealChartEngineDecision } from "@/lib/chart-engine/real-chart-engine-decision";

function getStatusLabel(status: string) {
  switch (status) {
    case "recommended-for-mvp":
      return "پیشنهاد MVP";
    case "blocked-by-license":
      return "نیازمند تصمیم لایسنس";
    case "blocked-by-dependency":
      return "وابسته به سرویس بیرونی";
    case "future-option":
      return "گزینه آینده";
    default:
      return status;
  }
}

export default function EngineDecisionPage() {
  const decision = getRealChartEngineDecision();
  const selected = decision.options.find((option) => option.id === decision.selectedOption);

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Real Chart Engine Decision</span>

        <h1>تصمیم مسیر موتور واقعی چارت</h1>

        <p>
          این صفحه مشخص می‌کند بعد از fixture engine، کدام مسیر برای تبدیل موتور
          چارت به محاسبه واقعی مناسب‌تر است.
        </p>

        <div className="actions">
          <Link className="button" href="/engine">
            وضعیت موتور
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت گزارش
          </Link>
        </div>
      </div>

      {selected ? (
        <section className="card">
          <span className="badge">Selected Path</span>

          <h2>{selected.label}</h2>

          <p>{decision.rationale}</p>

          <div className="tag-list">
            <span>{getStatusLabel(selected.status)}</span>
            <span>{decision.decisionDate}</span>
          </div>
        </section>
      ) : null}

      <section className="card">
        <span className="badge">Options</span>

        <h2>گزینه‌ها</h2>

        <div className="home-step-list">
          {decision.options.map((option) => (
            <div key={option.id}>
              <strong>
                {option.label} · {getStatusLabel(option.status)}
              </strong>
              <span>{option.summary}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Implementation Steps</span>

        <h2>قدم‌های بعدی</h2>

        <div className="home-step-list">
          {decision.implementationSteps.map((step, index) => (
            <div key={step}>
              <strong>{(index + 1).toLocaleString("fa-IR")}. قدم</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
