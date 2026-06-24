import type { ReportOutputSection } from "@/types/report-output";

type ReportWithSections = {
  outputVersion?: string;
  interpretationSections?: ReportOutputSection[];
  outputQuality?: {
    score?: number;
    warnings?: string[];
  };
};

type ReportV2SectionsProps = {
  report: unknown;
};

export function ReportV2Sections({ report }: ReportV2SectionsProps) {
  if (!report || typeof report !== "object") {
    return null;
  }

  const sectionedReport = report as ReportWithSections;
  const sections = sectionedReport.interpretationSections ?? [];

  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <span className="badge">Report Output V2</span>

      <h2>گزارش بخش‌بندی‌شده</h2>

      <p>
        این خروجی هنوز preview است، اما ساختار گزارش از اینجا به بعد
        module-based و آماده اتصال به موتور واقعی چارت است.
      </p>

      <div className="tag-list">
        <span>Version: {sectionedReport.outputVersion ?? "v2-sectioned-preview"}</span>
        <span>Quality score: {sectionedReport.outputQuality?.score ?? "preview"}</span>
      </div>

      <div className="home-step-list">
        {sections.map((section, index) => (
          <div key={section.id}>
            <strong>
              {(index + 1).toLocaleString("fa-IR")}. {section.title}
            </strong>
            <span>{section.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
