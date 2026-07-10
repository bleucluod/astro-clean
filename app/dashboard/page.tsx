"use client";

import Link from "next/link";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
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
      const nextReports = await listReportSummaries();

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
      <section className="grid core-surface-dashboard">
        <div className="card">
          <span className="badge">پنل هالیوس</span>
          <h1>در حال آماده‌سازی پنل تو</h1>
          <p>گزارش‌ها و اطلاعات حساب تو آماده می‌شوند.</p>
        </div>
        <span className="dashboard-copy-detox-marker" aria-hidden="true" hidden />
      </section>
    );
  }

  return (
    <section className="grid core-surface-dashboard account-ready-dashboard">
      <div className="card account-ready-dashboard-hero">
        <span className="badge">پنل من</span>

        <h1>سلام، به پنل هالیوس خوش آمدی</h1>

        <p>
          اینجا می‌توانی به گزارش‌های ذخیره‌شده برگردی، گزارش تازه بسازی و مسیر
          حساب خودت را ساده‌تر دنبال کنی.
        </p>

        <div className="account-ready-status-strip" aria-label="خلاصه حساب و گزارش‌ها">
          <span>حساب: {session ? "آماده" : "قابل ساخت"}</span>
          <span>گزارش‌ها: خصوصی</span>
          <span>ذخیره‌شده‌ها: {stats.totalCount.toLocaleString("fa-IR")}</span>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/reports">
            گزارش‌های من
          </Link>

          <Link className="button secondary" href="/profile">
            پروفایل
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم خصوصی
          </Link>
        </div>
      </div>

      <div className="feature-grid">
        <article className="card feature-card-polished">
          <span className="badge">گزارش‌ها</span>
          <h2>{stats.totalCount.toLocaleString("fa-IR")}</h2>
          <p>گزارش‌هایی که برای برگشت دوباره ذخیره کرده‌ای.</p>
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
          <p>گزارش‌هایی که فقط برای خودت نگه داشته‌ای.</p>
        </article>
      </div>

      <SupabaseAuthPanel />

      <section className="card">
        <span className="badge">آخرین گزارش‌ها</span>

        <h2>آخرین فعالیت‌ها</h2>

        {latestReports.length === 0 ? (
          <>
            <p>
              هنوز گزارشی ذخیره نشده. از ساخت اولین گزارش شروع کن؛ بعد همین پنل
              نقطه برگشت تو می‌شود.
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

      <span className="dashboard-copy-detox-marker" aria-hidden="true" hidden />
    </section>
  );
}
