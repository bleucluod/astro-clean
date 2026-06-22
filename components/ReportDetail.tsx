"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { loadReports } from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

type ReportDetailProps = {
  reportId: string;
};

export function ReportDetail({ reportId }: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    function loadReport() {
      const savedReports = loadReports();
      const selectedReport =
        savedReports.find((item) => item.id === reportId) ?? null;

      setReport(selectedReport);
      setIsReady(true);
    }

    const timer = window.setTimeout(loadReport, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [reportId]);

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">در حال خواندن</span>
          <h1>در حال بارگذاری گزارش</h1>
          <p>گزارش ذخیره‌شده از مرورگر خوانده می‌شود.</p>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="grid">
        <EmptyState
          badge="گزارش پیدا نشد"
          title="این گزارش پیدا نشد"
          description="این گزارش ممکن است پاک شده باشد، یا در مرورگر دیگری ساخته شده باشد. چون MVP فعلاً backend ندارد، گزارش‌ها فقط در همین مرورگر ذخیره می‌شوند."
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Report Detail</span>

        <h1>جزئیات گزارش ذخیره‌شده</h1>

        <p>
          این صفحه گزارش را از localStorage همین مرورگر می‌خواند. در نسخه‌های
          بعدی، اگر backend و حساب کاربری اضافه شود، این نوع صفحه می‌تواند به
          لینک دائمی و قابل اشتراک تبدیل شود.
        </p>

        <div className="actions">
          <Link className="button secondary" href="/reports">
            بازگشت به گزارش‌ها
          </Link>

          <Link className="button secondary" href="/dashboard">
            رفتن به داشبورد
          </Link>

          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>
        </div>
      </div>

      <ReportCard report={report} />
    </section>
  );
}
