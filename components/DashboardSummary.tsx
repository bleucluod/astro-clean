"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReportCard } from "@/components/ReportCard";
import { loadReports } from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

export function DashboardSummary() {
  const [latestReport, setLatestReport] = useState<AstrologyReport | null>(null);

  useEffect(() => {
    const reports = loadReports();
    setLatestReport(reports[0] ?? null);
  }, []);

  if (!latestReport) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">داشبورد شخصی</span>

          <h1>هنوز گزارشی برای نمایش نداریم</h1>

          <p>
            داشبورد بعداً مرکز تجربه شخصی تو می‌شود. فعلاً برای دیدن خروجی،
            ابتدا یک چارت mock بساز.
          </p>

          <Link className="button" href="/chart">
            ساخت اولین چارت
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">داشبورد شخصی</span>

        <h1>آخرین گزارش تو</h1>

        <p>
          این نسخه فقط آخرین گزارش ذخیره‌شده در مرورگر را نشان می‌دهد. در آینده
          اینجا Mood Tracking، گزارش‌های روزانه، Saved Charts و پیشنهادهای شخصی
          اضافه می‌شوند.
        </p>

        <Link className="button secondary" href="/reports">
          دیدن همه گزارش‌ها
        </Link>
      </div>

      <ReportCard report={latestReport} />
    </section>
  );
}
