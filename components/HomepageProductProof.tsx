import {
  HOME_REPORT_PREVIEW_LAYERS,
  HOME_REPORT_PREVIEW_SECTIONS,
} from "@/lib/report-preview/homepage-report-preview";

export function HomepageProductProof() {
  return (
    <section
      className="card paid-section home-section-card real-report-preview-shell"
      id="report-preview"
      aria-label="نمونه کوتاه گزارش هالیوس"
    >
      <div className="report-preview-showcase-grid">
        <div className="report-preview-excerpt-stack">
          {HOME_REPORT_PREVIEW_SECTIONS.slice(0, 1).map((section) => (
            <article className="report-preview-excerpt-card" key={section.title}>
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
            هالیوس جایگاه‌های چارت را فقط فهرست نمی‌کند؛ هر لایه را به زبان انسانی،
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
        </aside>
      </div>
    </section>
  );
}
