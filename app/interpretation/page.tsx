import Link from "next/link";
import { getInterpretationDriver } from "@/lib/interpretation/interpretation-factory";
import { getInterpretationModuleBlueprints } from "@/lib/interpretation/interpretation-modules";
import { getSampleInterpretationPreview } from "@/lib/interpretation/sample-interpretation";

export default async function InterpretationPage() {
  const driver = getInterpretationDriver();
  const readiness = driver.getReadiness();
  const blueprints = getInterpretationModuleBlueprints();
  const sample = await getSampleInterpretationPreview();

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Interpretation Pipeline</span>

        <h1>زیرساخت تفسیر گزارش</h1>

        <p>
          بعد از موتور چارت و quality gate، این مرحله مسیر ترکیب گزارش را آماده
          می‌کند: هر گزارش کامل باید از moduleهای مشخص ساخته شود، نه متن پراکنده
          و بی‌قاعده.
        </p>

        <div className="actions">
          <Link className="button" href="/quality">
            کیفیت گزارش
          </Link>

          <Link className="button secondary" href="/engine">
            موتور چارت
          </Link>
        </div>
      </div>

      <section className="card">
        <span className="badge">Readiness</span>

        <h2>وضعیت pipeline</h2>

        <div className="tag-list">
          <span>Driver: {readiness.activeDriver}</span>
          <span>Stage: {readiness.stage}</span>
          <span>
            Production report:{" "}
            {readiness.canComposeProductionReport ? "ready" : "blocked"}
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
        <span className="badge">Modules</span>

        <h2>ماژول‌های تفسیر</h2>

        <div className="home-step-list">
          {blueprints.map((module, index) => (
            <div key={module.id}>
              <strong>
                {(index + 1).toLocaleString("fa-IR")}. {module.title}
              </strong>
              <span>{module.purpose}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Sample Preview</span>

        <h2>نمونه خروجی moduleها</h2>

        <div className="report-preview-list">
          {sample.sections.slice(0, 5).map((section) => (
            <div className="report-preview-row" key={section.id}>
              <span>{section.title}</span>
              <small>{section.kind}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
