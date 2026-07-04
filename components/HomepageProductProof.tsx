import Link from "next/link";
import {
  HOME_REPORT_PREVIEW_LAYERS,
  HOME_REPORT_PREVIEW_SECTIONS,
  HOME_REPORT_PREVIEW_TRUST,
} from "@/lib/report-preview/homepage-report-preview";

export function HomepageProductProof() {
  return (
    <section
      className="card paid-section home-section-card real-report-preview-shell"
      id="report-preview"
      aria-labelledby="homepage-product-proof-title"
    >
      <div className="home-section-heading report-preview-heading">
        <span className="section-label">نمونه کوتاه گزارش</span>

        <h2 id="homepage-product-proof-title">
          قبل از ساخت گزارش، یک بریده واقعی از جنس خوانش هالیوس ببین
        </h2>

        <p>
          این بخش نمونه عمومی گزارش است؛ برای نشان دادن ساختار و لحن محصول. گزارش
          شخصی تو بعد از ورود اطلاعات تولد، از چارت محاسبه‌شده خودت ساخته می‌شود.
          وقتی هالیوس آماده‌تر شد، نمونه کامل جداگانه هم می‌تواند به مسیر عمومی اضافه شود.
        </p>
      </div>

      <div className="report-preview-showcase-grid">
        <div className="report-preview-excerpt-stack">
          {HOME_REPORT_PREVIEW_SECTIONS.map((section, index) => (
            <article className="report-preview-excerpt-card" key={section.title}>
              <div className="report-preview-card-head">
                <span className="report-preview-index">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>
                <span className="badge">{section.eyebrow}</span>
              </div>

              <h3>{section.title}</h3>
              <p>{section.body}</p>

              <div className="report-preview-evidence">
                <strong>ردپای محاسبه</strong>
                <span>{section.evidence}</span>
              </div>

              <blockquote>{section.reflection}</blockquote>
            </article>
          ))}
        </div>

        <aside className="report-preview-meta-card" aria-label="ساختار نمونه گزارش">
          <span className="section-label">در گزارش کامل چه می‌آید؟</span>

          <h3>یک گزارش، چند لایه خوانش</h3>

          <p>
            هالیوس placementها را فقط فهرست نمی‌کند؛ هر لایه را به زبان انسانی،
            با مرز روشن میان نماد، مشاهده و تصمیم شخصی روایت می‌کند.
          </p>

          <div className="report-preview-layer-list">
            {HOME_REPORT_PREVIEW_LAYERS.map((layer) => (
              <div className="report-preview-layer" key={layer.label}>
                <strong>{layer.label}</strong>
                <span>{layer.description}</span>
              </div>
            ))}
          </div>

          <div className="actions report-preview-actions">
            <Link className="button" href="/chart">
              گزارش خودم را بساز
            </Link>
            <Link className="button secondary" href="/reports">
              گزارش‌های من
            </Link>
          </div>
        </aside>
      </div>

      <div className="report-preview-trust-row">
        {HOME_REPORT_PREVIEW_TRUST.map((item) => (
          <article className="mini-card paid-value-card report-preview-trust-card" key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
