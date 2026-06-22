"use client";

import { useEffect, useState } from "react";
import { ReportCard } from "@/components/ReportCard";
import {
  clearReports,
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

  if (reports.length === 0) {
    return (
      <div className="card">
        <span className="badge">گزارش‌های ذخیره‌شده</span>

        <h1>هنوز گزارشی ذخیره نشده</h1>

        <p>
          اول از صفحه ساخت چارت یک گزارش mock بساز. بعد اینجا لیست گزارش‌های
          ذخیره‌شده در مرورگر نمایش داده می‌شود.
        </p>
      </div>
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
          پاک کردن گزارش‌های ذخیره‌شده
        </button>
      </div>

      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </section>
  );
}
