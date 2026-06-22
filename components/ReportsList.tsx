"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import {
  clearReports,
  deleteReport,
  loadReports,
} from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

export function ReportsList() {
  const [reports, setReports] = useState<AstrologyReport[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReports(loadReports());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function handleClearReports() {
    clearReports();
    setReports([]);
  }

  function handleDeleteReport(reportId: string) {
    const nextReports = deleteReport(reportId);
    setReports(nextReports);
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        badge="گزارش‌های ذخیره‌شده"
        title="هنوز گزارشی ذخیره نشده"
        description="اول یک چارت mock بساز تا گزارش فارسی تو اینجا ذخیره و نمایش داده شود. فعلاً همه چیز فقط در مرورگر همین دستگاه نگهداری می‌شود."
        actionHref="/chart"
        actionLabel="ساخت اولین گزارش"
        secondaryHref="/roadmap"
        secondaryLabel="دیدن مسیر آینده"
      />
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">گزارش‌های ذخیره‌شده</span>

        <h1>گزارش‌های شخصی تو</h1>

        <p>
          این گزارش‌ها فعلاً فقط در مرورگر همین دستگاه ذخیره شده‌اند. با پاک
          کردن داده‌های مرورگر، این اطلاعات هم حذف می‌شوند.
        </p>

        <button className="button secondary" onClick={handleClearReports}>
          پاک کردن همه گزارش‌ها
        </button>
      </div>

      {reports.map((report) => (
        <div className="report-wrapper" key={report.id}>
          <ReportCard report={report} />

          <button
            className="button danger"
            onClick={() => handleDeleteReport(report.id)}
          >
            حذف این گزارش
          </button>
        </div>
      ))}
    </section>
  );
}
