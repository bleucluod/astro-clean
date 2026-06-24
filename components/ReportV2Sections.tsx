import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
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

function getSectionIntro(kind: string) {
  switch (kind) {
    case "overview":
      return "شروع گزارش";
    case "identity":
      return "خودشناسی";
    case "emotional-pattern":
      return "احساسات";
    case "relationships":
      return "رابطه";
    case "career":
      return "کار و رشد";
    case "growth":
      return "رشد";
    case "reflection-prompts":
      return "پرسش";
    case "disclaimer":
      return "ایمنی";
    default:
      return "بخش";
  }
}

export function ReportV2Sections({ report }: ReportV2SectionsProps) {
  if (!report || typeof report !== "object") {
    return null;
  }

  const enhancedReport = enhanceReportOutputV2(report as Record<string, unknown>);
  const sectionedReport = enhancedReport as ReportWithSections;
  const sections = sectionedReport.interpretationSections ?? [];

  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <span className="badge">Report Output V2</span>

      <h2>گزارش بخش‌بندی‌شده</h2>

      <p>
        این نسخه خروجی را به بخش‌های روشن تقسیم می‌کند تا گزارش قابل خواندن‌تر،
        قابل exportتر و آماده اتصال به موتور واقعی چارت باشد.
      </p>

      <div className="tag-list">
        <span>Version: {sectionedReport.outputVersion ?? "v2-sectioned-preview"}</span>
        <span>Quality score: {sectionedReport.outputQuality?.score ?? "preview"}</span>
        <span>Sections: {sections.length.toLocaleString("fa-IR")}</span>
      </div>

      {sectionedReport.outputQuality?.warnings &&
      sectionedReport.outputQuality.warnings.length > 0 ? (
        <div className="report-preview-list">
          {sectionedReport.outputQuality.warnings.map((warning) => (
            <div className="report-preview-row" key={warning}>
              <span>یادداشت کیفیت</span>
              <small>{warning}</small>
            </div>
          ))}
        </div>
      ) : null}

      <div className="home-step-list">
        {sections.map((section, index) => (
          <div key={section.id}>
            <strong>
              {(index + 1).toLocaleString("fa-IR")}. {section.title}
            </strong>
            <span>
              {getSectionIntro(section.kind)} · {section.body}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
