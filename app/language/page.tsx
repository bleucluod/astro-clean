import Link from "next/link";
import { convertControlledFinglishToPersian } from "@/lib/language/finglish-to-persian";
import { getLanguageReadinessReport } from "@/lib/language/language-readiness";
import { getPersianCopyRegistry } from "@/lib/language/persian-product-copy";

const sampleFinglish = "gozaresh namadin chart engine download copy";

export default function LanguagePage() {
  const readiness = getLanguageReadinessReport();
  const registry = getPersianCopyRegistry();
  const convertedSample = convertControlledFinglishToPersian(sampleFinglish);

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Persian Language System</span>

        <h1>زبان محصول Halleus</h1>

        <p>
          این بخش برای یک‌دست‌کردن فارسی محصول، کنترل متن‌های کاربرپسند و آماده‌سازی
          مسیر Finglish به فارسی ساخته شده است.
        </p>

        <div className="actions">
          <Link className="button" href="/reports">
            دیدن گزارش‌ها
          </Link>

          <Link className="button secondary" href="/product">
            سطح محصول
          </Link>
        </div>
      </div>

      <section className="card">
        <span className="badge">Readiness</span>

        <h2>وضعیت فارسی‌سازی</h2>

        <div className="tag-list">
          <span>Locale: {readiness.locale}</span>
          <span>Copy registry: {readiness.copyRegistryReady ? "ready" : "needs work"}</span>
          <span>Finglish converter: {readiness.finglishConverterReady ? "ready" : "needs work"}</span>
          <span>UI safety: {readiness.uiSafetyReady ? "ready" : "blocked"}</span>
        </div>

        <div className="home-step-list">
          {readiness.nextSteps.map((step, index) => (
            <div key={step}>
              <strong>{(index + 1).toLocaleString("fa-IR")}. قدم بعدی</strong>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Finglish Sample</span>

        <h2>نمونه تبدیل کنترل‌شده</h2>

        <div className="report-preview-list">
          <div className="report-preview-row">
            <span>ورودی</span>
            <small>{sampleFinglish}</small>
          </div>

          <div className="report-preview-row">
            <span>خروجی</span>
            <small>{convertedSample}</small>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">Copy Registry</span>

        <h2>نمونه متن‌های مرکزی</h2>

        <div className="home-step-list">
          {registry.map((entry) => (
            <div key={entry.key}>
              <strong>{entry.value}</strong>
              <span>{entry.description}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
