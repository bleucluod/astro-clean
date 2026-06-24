import Link from "next/link";
import { getChartEngineFixtures } from "@/lib/chart-engine/chart-engine-fixtures";
import { getChartEngineReadinessReport } from "@/lib/chart-engine/chart-engine-readiness";

export default function EnginePage() {
  const readiness = getChartEngineReadinessReport();
  const fixtures = getChartEngineFixtures();

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Halleus Engine</span>

        <h1>زیرساخت موتور چارت</h1>

        <p>
          گزارش‌های فعلی هنوز preview/mock هستند. این صفحه نشان می‌دهد مسیر
          جایگزینی mock با موتور محاسبه واقعی چطور آماده شده است.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش preview
          </Link>

          <Link className="button secondary" href="/product">
            نقشه محصول
          </Link>
        </div>
      </div>

      <section className="card">
        <span className="badge">Readiness</span>

        <h2>وضعیت موتور</h2>

        <div className="tag-list">
          <span>Engine: {readiness.activeEngine}</span>
          <span>Stage: {readiness.stage}</span>
          <span>
            Replace mock: {readiness.canReplaceMockReports ? "ready" : "blocked"}
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

      <section className="card">
        <span className="badge">Blockers</span>

        <h2>چرا هنوز mock را عوض نمی‌کنیم؟</h2>

        <div className="home-step-list">
          {readiness.blockers.map((blocker) => (
            <div key={blocker}>
              <strong>مانع</strong>
              <span>{blocker}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Fixtures</span>

        <h2>نمونه‌های تست آینده</h2>

        <p>
          این fixtureها برای تست deterministic موتور واقعی نگه داشته می‌شوند.
        </p>

        <div className="report-preview-list">
          {fixtures.map((fixture) => (
            <div className="report-preview-row" key={`${fixture.birthCity}-${fixture.birthDate}`}>
              <span>
                {fixture.name} · {fixture.birthCity}
              </span>
              <small>
                {fixture.birthDate} · {fixture.birthTime}
              </small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
