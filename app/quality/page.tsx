import Link from "next/link";
import { getReportQualityBlueprint } from "@/lib/report-quality/report-blueprint";

export default function QualityPage() {
  const blueprint = getReportQualityBlueprint();

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Report Quality</span>

        <h1>کیفیت گزارش‌های Halleus</h1>

        <p>
          قبل از جایگزینی mock report با موتور واقعی، باید کیفیت متن گزارش‌ها
          مشخص باشد: ساختار، لحن، مرزهای ایمنی و بخش‌های ضروری.
        </p>

        <div className="actions">
          <Link className="button" href="/engine">
            زیرساخت موتور
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت گزارش preview
          </Link>
        </div>
      </div>

      <section className="card">
        <span className="badge">Principle</span>

        <h2>اصل گزارش</h2>

        <p>{blueprint.reportPrinciple}</p>

        <div className="tag-list">
          <span>Language: {blueprint.tone.language}</span>
          <span>Tone: symbolic</span>
          <span>Advice: non-deterministic</span>
        </div>
      </section>

      <section className="card">
        <span className="badge">Required Sections</span>

        <h2>بخش‌های استاندارد گزارش</h2>

        <div className="home-step-list">
          {blueprint.sections.map((section, index) => (
            <div key={section.kind}>
              <strong>
                {(index + 1).toLocaleString("fa-IR")}. {section.title}
              </strong>
              <span>
                {section.purpose} · {section.minWords.toLocaleString("fa-IR")} تا{" "}
                {section.maxWords.toLocaleString("fa-IR")} کلمه
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Tone Rules</span>

        <h2>قواعد لحن</h2>

        <div className="home-step-list">
          {blueprint.tone.principles.map((principle) => (
            <div key={principle}>
              <strong>قاعده</strong>
              <span>{principle}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
