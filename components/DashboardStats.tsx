type DashboardStatsProps = {
  reportCount: number;
  favoriteCount: number;
  noteCount: number;
  latestReportLabel: string;
};

export function DashboardStats({
  reportCount,
  favoriteCount,
  noteCount,
  latestReportLabel,
}: DashboardStatsProps) {
  return (
    <div className="status-grid">
      <div className="mini-card">
        <strong>گزارش‌ها</strong>
        <span>{reportCount.toLocaleString("fa-IR")}</span>
      </div>

      <div className="mini-card">
        <strong>علاقه‌مندی‌ها</strong>
        <span>{favoriteCount.toLocaleString("fa-IR")}</span>
      </div>

      <div className="mini-card">
        <strong>یادداشت‌ها</strong>
        <span>{noteCount.toLocaleString("fa-IR")}</span>
      </div>

      <div className="mini-card">
        <strong>آخرین گزارش</strong>
        <span>{latestReportLabel}</span>
      </div>
    </div>
  );
}
