import type { AstrologyReport } from "@/types/astro";

type ReportCardProps = {
  report: AstrologyReport;
};

export function ReportCard({ report }: ReportCardProps) {
  return (
    <article className="card report-card">
      <div className="report-header">
        <div>
          <span className="badge">گزارش نمادین</span>
          <h2>
            {report.input.name
              ? `گزارش ${report.input.name}`
              : "گزارش چارت تولد"}
          </h2>
        </div>

        <span className="pill">
          {new Date(report.createdAt).toLocaleDateString("fa-IR")}
        </span>
      </div>

      <div className="grid grid-3">
        <div className="mini-card">
          <strong>خورشید</strong>
          <span>{report.chart.sunSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>ماه</strong>
          <span>{report.chart.moonSign.faName}</span>
        </div>

        <div className="mini-card">
          <strong>رایزینگ</strong>
          <span>{report.chart.risingSign.faName}</span>
        </div>
      </div>

      <p>{report.summary}</p>

      <div className="report-list">
        {report.interpretations.map((item) => (
          <p key={item}>• {item}</p>
        ))}
      </div>

      <p className="notice">{report.safetyNote}</p>
    </article>
  );
}
