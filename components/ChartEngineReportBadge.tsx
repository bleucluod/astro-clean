import type { ChartEngineResult } from "@/types/chart-engine";

type ReportWithChartEngine = {
  chartEngineIntegrationVersion?: string;
  chartEngineResult?: ChartEngineResult;
};

type ChartEngineReportBadgeProps = {
  report: unknown;
};

export function ChartEngineReportBadge({ report }: ChartEngineReportBadgeProps) {
  if (!report || typeof report !== "object") {
    return null;
  }

  const reportWithEngine = report as ReportWithChartEngine;
  const result = reportWithEngine.chartEngineResult;

  if (!result) {
    return null;
  }

  return (
    <section className="card">
      <span className="badge">Chart Engine Path</span>

      <h2>مسیر موتور چارت</h2>

      <p>
        این گزارش از مسیر جدید موتور چارت عبور کرده است. در این نسخه، placementها
        هنوز fixture و آزمایشی هستند، اما flow ذخیره‌سازی و نمایش گزارش به engine
        متصل شده است.
      </p>

      <div className="tag-list">
        <span>Engine: {result.engine}</span>
        <span>Stage: {result.stage}</span>
        <span>
          Placements: {result.placements.length.toLocaleString("fa-IR")}
        </span>
        <span>Version: {reportWithEngine.chartEngineIntegrationVersion ?? "v1"}</span>
      </div>

      {result.warnings.length > 0 ? (
        <div className="report-preview-list">
          {result.warnings.map((warning) => (
            <div className="report-preview-row" key={warning}>
              <span>یادداشت موتور</span>
              <small>{warning}</small>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
