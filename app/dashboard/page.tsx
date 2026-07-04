"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { persistentReportsDecision } from "@/lib/account/persistent-report-decision";
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
          <h1>در حال آماده‌سازی پنل کاربری</h1>
          <p>گزارش‌ها و وضعیت preview account خوانده می‌شوند.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid account-ready-dashboard">
      <div className="card account-ready-dashboard-hero">
        <span className="badge">Halleus Dashboard</span>

        <h1>پنل کاربری Halleus</h1>

        <p>
          اینجا مرکز برگشت به گزارش‌هاست. در این نسخه گزارش‌ها هنوز روی همین
          مرورگر ذخیره می‌شوند، اما مسیر محصول برای حساب کاربری واقعی و ذخیره
          پایدار آماده شده است.
        </p>

        <div className="account-ready-status-strip" aria-label="وضعیت حساب و گزارش‌ها">
          <span>فعلاً: local-preview</span>
          <span>پیش‌فرض: خصوصی و noindex</span>
          <span>بعدی: اتصال به حساب کاربری</span>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/reports">
            کتابخانه گزارش‌ها
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده‌ها
          </Link>
        </div>
      </div>

      <section className="card account-ready-lifecycle-card">
        <span className="badge">از مرورگر تا اکانت</span>

        <h2>حساب کاربری واقعی هنوز فعال نشده</h2>

        <p>
          این پنل عمداً ادعای login یا دیتابیس فعال نمی‌کند. کار فعلی این است
          که تجربه کاربر شبیه پنل واقعی شود و بعد در مرحله بعد گزارش‌ها از
          مرورگر به حساب کاربری منتقل شوند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. الان</strong>
            <span>گزارش‌ها خصوصی‌اند و در همین مرورگر نگه داشته می‌شوند.</span>
          </div>

          <div>
            <strong>۲. قدم بعد</strong>
            <span>انتخاب auth و ذخیره پایدار برای user واقعی.</span>
          </div>

          <div>
            <strong>۳. مهاجرت</strong>
            <span>گزارش‌های local-preview به حساب کاربر منتقل می‌شوند.</span>
          </div>
        </div>
      </section>

      <div className="feature-grid">
        <article className="card feature-card-polished">
          <span className="badge">گزارش‌ها</span>
          <h2>{stats.totalCount.toLocaleString("fa-IR")}</h2>
          <p>گزارش ذخیره‌شده در کتابخانه خصوصی همین مرورگر.</p>
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
        <span className="badge">اکانت preview</span>

        <h2>وضعیت ذخیره‌سازی فعلی</h2>

        <div className="profile-grid">
          <div>
            <strong>Storage</strong>
            <span>local-preview</span>
          </div>

          <div>
            <strong>Account</strong>
            <span>{session?.user.status ?? "preview"}</span>
          </div>

          <div>
            <strong>Plan</strong>
            <span>{session?.user.plan ?? "preview"}</span>
          </div>

          <div>
            <strong>Visibility</strong>
            <span>private / noindex</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">تصمیم ذخیره پایدار</span>

        <h2>مسیر بعدی: Supabase-first</h2>

        <p>
          تصمیم فنی-محصولی این مرحله این است که حساب کاربری و گزارش‌های پایدار
          از مسیر Supabase Auth + Supabase/Postgres جلو بروند؛ اما هنوز login
          واقعی یا database write فعال نشده است؛ وضعیت این تصمیم فعلاً selected-not-enabled است.
        </p>

        <div className="profile-grid">
          <div>
            <strong>Auth</strong>
            <span>{persistentReportsDecision.authProvider}</span>
          </div>

          <div>
            <strong>Storage</strong>
            <span>{persistentReportsDecision.storageProvider}</span>
          </div>

          <div>
            <strong>Stage</strong>
            <span>{persistentReportsDecision.stage}</span>
          </div>

          <div>
            <strong>Default</strong>
            <span>{persistentReportsDecision.defaultVisibility} / {persistentReportsDecision.indexingPolicy}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">آخرین گزارش‌ها</span>

        <h2>آخرین فعالیت‌ها</h2>

        {latestReports.length === 0 ? (
          <>
            <p>
              هنوز گزارشی در این مرورگر ذخیره نشده. از ساخت اولین گزارش شروع
              کن؛ بعد همین پنل نقطه برگشت تو می‌شود.
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
