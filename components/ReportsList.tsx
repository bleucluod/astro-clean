"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import {
  clearReports,
  deleteReport,
  loadReports,
} from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

export function ReportsList() {
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");

  function refreshReports() {
    setReports(loadReports());
    setIsReady(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(refreshReports, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function handleDeleteReport(reportId: string) {
    deleteReport(reportId);
    notifyLocalDataChanged();
    refreshReports();
    setMessage("گزارش انتخاب‌شده حذف شد.");
  }

  function handleClearReports() {
    clearReports();
    notifyLocalDataChanged();
    refreshReports();
    setMessage("همه گزارش‌ها پاک شدند.");
  }

  if (!isReady) {
    return (
      <section className="card">
        <span className="badge">در حال خواندن</span>
        <h1>گزارش‌ها در حال بارگذاری هستند</h1>
        <p>گزارش‌های ذخیره‌شده از مرورگر خوانده می‌شوند.</p>
      </section>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        badge="آرشیو خالی"
        title="هنوز گزارشی ذخیره نشده"
        description="از صفحه چارت شروع کن و اولین گزارش mock خودت را بساز."
        actionHref="/chart"
        actionLabel="ساخت اولین گزارش"
      />
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">گزارش‌های ذخیره‌شده</span>

        <h1>آرشیو گزارش‌های تو</h1>

        <p>
          این گزارش‌ها فعلاً فقط در مرورگر همین دستگاه ذخیره شده‌اند. هر گزارش
          حالا یک صفحه جزئیات داخلی هم دارد.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <button
            className="button secondary"
            type="button"
            onClick={handleClearReports}
          >
            پاک کردن همه گزارش‌ها
          </button>
        </div>

        {message ? <p className="success-message">{message}</p> : null}
      </div>

      {reports.map((report) => (
        <article className="report-list-item" key={report.id}>
          <ReportCard report={report} />

          <div className="card report-actions-card">
            <div className="actions">
              <Link className="button" href={`/reports/${report.id}`}>
                دیدن جزئیات گزارش
              </Link>

              <button
                className="button secondary"
                type="button"
                onClick={() => handleDeleteReport(report.id)}
              >
                حذف این گزارش
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
