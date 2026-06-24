"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPreviewSession } from "@/lib/account/preview-session";
import { listReportSummaries } from "@/lib/storage/report-query-service";
import type { AuthSession } from "@/types/account";
import type { ReportRecordSummary } from "@/types/storage";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [reports, setReports] = useState<ReportRecordSummary[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      const [nextReports] = await Promise.all([listReportSummaries()]);

      if (!isActive) {
        return;
      }

      setSession(getPreviewSession());
      setReports(nextReports);
      setIsReady(true);
    }

    void loadDashboard();

    const handleDataChange = () => {
      void loadDashboard();
    };

    window.addEventListener("halleus-data-changed", handleDataChange);
    window.addEventListener("astro-clean-data-changed", handleDataChange);

    return () => {
      isActive = false;
      window.removeEventListener("halleus-data-changed", handleDataChange);
      window.removeEventListener("astro-clean-data-changed", handleDataChange);
    };
  }, []);

  const stats = useMemo(() => {
    const favoriteCount = reports.filter((report) => report.favorite).length;
    const noteCount = reports.filter((report) => report.hasNote).length;
    const privateCount = reports.filter(
      (report) => report.visibility === "private",
    ).length;

    return {
      favoriteCount,
      noteCount,
      privateCount,
      totalCount: reports.length,
    };
  }, [reports]);

  const latestReports = useMemo(() => reports.slice(0, 5), [reports]);

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">Dashboard</span>
          <h1>در حال آماده‌سازی داشبورد</h1>
          <p>گزارش‌ها و وضعیت preview account خوانده می‌شوند.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Halleus Dashboard</span>

        <h1>داشبورد Halleus</h1>

        <p>
          این داشبورد فعلاً با preview account و local storage کار می‌کند، اما
          ساختارش برای اتصال به حساب کاربری و دیتابیس آماده شده است.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/reports">
            رفتن به آرشیو
          </Link>

          <Link className="button secondary" href="/profile">
            وضعیت اکانت
          </Link>
        </div>
      </div>

      <div className="card">
        <span className="badge">وضعیت ذخیره‌سازی</span>

        <h2>مسیر فعلی محصول</h2>

        <p>
          Driver فعال هنوز local-preview است. یعنی داده‌ها روی همین مرورگر
          ذخیره می‌شوند، ولی مسیر repository برای دیتابیس آماده شده است.
        </p>

        <div className="tag-list">
          <span>Storage: local-preview</span>
          <span>Account: preview</span>
          <span>Plan: {session?.user.plan ?? "preview"}</span>
        </div>
      </div>

      <div className="feature-grid">
        <article className="card feature-card-polished">
          <span className="badge">گزارش‌ها</span>
          <h2>{stats.totalCount.toLocaleString("fa-IR")}</h2>
          <p>گزارش ذخیره‌شده در preview account این مرورگر.</p>
        </article>

        <article className="card feature-card-polished">
          <span className="badge">علاقه‌مندی‌ها</span>
          <h2>{stats.favoriteCount.toLocaleString("fa-IR")}</h2>
          <p>گزارش‌هایی که برای مرور دوباره ستاره‌دار شده‌اند.</p>
        </article>

        <article className="card feature-card-polished">
          <span className="badge">یادداشت‌ها</span>
          <h2>{stats.noteCount.toLocaleString("fa-IR")}</h2>
          <p>گزارش‌هایی که یادداشت شخصی دارند.</p>
        </article>

        <article className="card feature-card-polished">
          <span className="badge">حریم</span>
          <h2>{stats.privateCount.toLocaleString("fa-IR")}</h2>
          <p>گزارش‌های private در مدل ذخیره‌سازی فعلی.</p>
        </article>
      </div>

      <section className="card">
        <span className="badge">آخرین گزارش‌ها</span>

        <h2>آخرین فعالیت‌ها</h2>

        {latestReports.length === 0 ? (
          <>
            <p>
              هنوز گزارشی در این مرورگر ذخیره نشده. از ساخت اولین گزارش شروع
              کن.
            </p>

            <Link className="button" href="/chart">
              ساخت اولین گزارش
            </Link>
          </>
        ) : (
          <div className="report-preview-list">
            {latestReports.map((report) => (
              <Link
                className="report-preview-row"
                href={`/reports/${report.id}`}
                key={report.id}
              >
                <span>
                  {report.name?.trim() || "گزارش بدون نام"} ·{" "}
                  {report.birthCity}
                </span>
                <small>{formatDate(report.createdAt)}</small>
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
