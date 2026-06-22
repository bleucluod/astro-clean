"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardStats } from "@/components/DashboardStats";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { loadFavoriteReportIds } from "@/lib/storage/favorite-reports-storage";
import { loadReportNotes } from "@/lib/storage/report-notes-storage";
import { loadReports } from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

type DashboardData = {
  reports: AstrologyReport[];
  favoriteReportIds: string[];
  reportNotes: Record<string, string>;
};

const initialDashboardData: DashboardData = {
  reports: [],
  favoriteReportIds: [],
  reportNotes: {},
};

function readDashboardData(): DashboardData {
  return {
    reports: loadReports(),
    favoriteReportIds: loadFavoriteReportIds(),
    reportNotes: loadReportNotes(),
  };
}

function getReportLabel(report: AstrologyReport, index: number) {
  const shortId = report.id.slice(0, 8);

  return `گزارش ${index.toLocaleString("fa-IR")} · ${shortId}`;
}

export function DashboardSummary() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialDashboardData);
  const [isReady, setIsReady] = useState(false);

  const { reports, favoriteReportIds, reportNotes } = dashboardData;

  const latestReport = reports[0] ?? null;

  const favoriteReports = useMemo(
    () => reports.filter((report) => favoriteReportIds.includes(report.id)),
    [favoriteReportIds, reports],
  );

  const recentReports = reports.slice(0, 3);

  const noteCount = reports.filter((report) => reportNotes[report.id]).length;

  useEffect(() => {
    function refreshDashboard() {
      setDashboardData(readDashboardData());
      setIsReady(true);
    }

    const timer = window.setTimeout(refreshDashboard, 0);

    window.addEventListener("astro-clean-data-changed", refreshDashboard);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("astro-clean-data-changed", refreshDashboard);
    };
  }, []);

  if (!isReady) {
    return (
      <section className="card">
        <span className="badge">در حال خواندن</span>
        <h1>داشبورد در حال بارگذاری است</h1>
        <p>اطلاعات ذخیره‌شده از مرورگر خوانده می‌شود.</p>
      </section>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        badge="داشبورد خالی"
        title="هنوز داده‌ای برای داشبورد نداری"
        description="اولین چارت mock را بساز تا داشبورد با گزارش، آمار، علاقه‌مندی‌ها و یادداشت‌ها فعال شود."
        actionHref="/chart"
        actionLabel="ساخت اولین چارت"
      />
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Dashboard</span>

        <h1>مرکز کنترل شخصی Astro Clean</h1>

        <p>
          این داشبورد خلاصه‌ای از گزارش‌های ذخیره‌شده، علاقه‌مندی‌ها و
          یادداشت‌های شخصی تو را نشان می‌دهد. همه داده‌ها فعلاً فقط در مرورگر
          همین دستگاه ذخیره شده‌اند.
        </p>

        <DashboardStats
          reportCount={reports.length}
          favoriteCount={favoriteReports.length}
          noteCount={noteCount}
          latestReportLabel={latestReport ? "گزارش اخیر آماده است" : "—"}
        />

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/reports">
            دیدن همه گزارش‌ها
          </Link>

          <Link className="button secondary" href="/admin">
            مدیریت داده‌های محلی
          </Link>
        </div>
      </div>

      {latestReport ? (
        <div className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <span className="section-label">آخرین گزارش</span>
              <h2>جدیدترین تحلیل ذخیره‌شده</h2>
            </div>

            <Link className="text-button" href={`/reports/${latestReport.id}`}>
              جزئیات گزارش
            </Link>
          </div>

          <ReportCard report={latestReport} />
        </div>
      ) : null}

      <div className="grid grid-2">
        <section className="card">
          <span className="badge">Recent</span>

          <h2>گزارش‌های اخیر</h2>

          <p>سه گزارش آخر برای دسترسی سریع.</p>

          <div className="link-list">
            {recentReports.map((report, index) => (
              <Link href={`/reports/${report.id}`} key={report.id}>
                <strong>{getReportLabel(report, index + 1)}</strong>
                <span>
                  {reportNotes[report.id] ? "یادداشت دارد" : "بدون یادداشت"}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <span className="badge">Favorites</span>

          <h2>علاقه‌مندی‌ها</h2>

          {favoriteReports.length > 0 ? (
            <div className="link-list">
              {favoriteReports.slice(0, 3).map((report, index) => (
                <Link href={`/reports/${report.id}`} key={report.id}>
                  <strong>{getReportLabel(report, index + 1)}</strong>
                  <span>
                    {reportNotes[report.id] ? "یادداشت دارد" : "بدون یادداشت"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p>
              هنوز گزارشی را ستاره‌دار نکرده‌ای. از صفحه Reports می‌توانی
              گزارش‌های مهم را به علاقه‌مندی‌ها اضافه کنی.
            </p>
          )}

          <div className="actions">
            <Link className="button secondary" href="/reports">
              رفتن به گزارش‌ها
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}