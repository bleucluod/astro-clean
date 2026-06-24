import Link from "next/link";
import { getChartEngineDriver } from "@/lib/chart-engine/chart-engine-factory";

export default function RealEnginePrototypePage() {
  const driver = getChartEngineDriver();
  const readiness = driver.getReadiness();

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Real Engine Prototype</span>

        <h1>نمونه اولیه موتور واقعی چارت</h1>

        <p>
          این صفحه وضعیت مسیر جدیدی را نشان می‌دهد که در صورت نصب astronomy-engine
          می‌تواند longitude واقعی خورشید، ماه و سیاره‌ها را وارد flow گزارش کند.
        </p>

        <div className="actions">
          <Link className="button" href="/engine/decision">
            تصمیم موتور واقعی
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت گزارش
          </Link>
        </div>
      </div>

      <section className="card">
        <span className="badge">Readiness</span>

        <h2>وضعیت نمونه اولیه</h2>

        <div className="tag-list">
          <span>Engine: {readiness.activeEngine}</span>
          <span>Stage: {readiness.stage}</span>
          <span>
            Replace mock: {readiness.canReplaceMockReports ? "ready" : "not yet"}
          </span>
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
