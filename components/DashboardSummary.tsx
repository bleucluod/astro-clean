"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { loadReports } from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

export function DashboardSummary() {
  const [latestReport, setLatestReport] = useState<AstrologyReport | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const reports = loadReports();
      setLatestReport(reports[0] ?? null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!latestReport) {
    return (
      <EmptyState
        badge="داشبورد شخصی"
        title="داشبورد تو آماده شروع است"
        description="هنوز گزارشی برای نمایش نداریم. اولین چارت mock را بساز تا داشبورد، آخرین گزارش تو را نشان بدهد."
        actionHref="/chart"
        actionLabel="ساخت اولین چارت"
        secondaryHref="/profile"
        secondaryLabel="تکمیل پروفایل"
      />
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
