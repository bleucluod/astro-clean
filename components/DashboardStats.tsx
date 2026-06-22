import type { AstrologyReport } from "@/types/astro";

type DashboardStatsProps = {
  reports: AstrologyReport[];
};

export function DashboardStats({ reports }: DashboardStatsProps) {
  const latestReport = reports[0];

  return (
    <section className="grid grid-3">
      <div className="mini-card stat-card">
        <strong>گزارش‌های ذخیره‌شده</strong>
        <span>{reports.length.toLocaleString("fa-IR")}</span>
      </div>

      <div className="mini-card stat-card">
        <strong>آخرین خورشید</strong>
        <span>{latestReport?.chart.sunSign.faName ?? "—"}</span>
      </div>

      <div className="mini-card stat-card">
        <strong>آخرین رایزینگ</strong>
        <span>{latestReport?.chart.risingSign.faName ?? "—"}</span>
      </div>
    </section>
  );
}
