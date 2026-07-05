"use client";

import Link from "next/link";
import { LocalDataBackupPanel } from "@/components/LocalDataBackupPanel";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import { useEffect, useMemo, useState } from "react";
import {
  createAccountMigrationPreflight,
  describeAccountMigrationPreflight,
} from "@/lib/account/account-migration-preflight";
import { getAccountReportSaveContract } from "@/lib/account/account-report-save-contract";
import { createAccountMigrationReviewModel } from "@/lib/account/account-migration-review";
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

  const accountSaveContract = useMemo(
    () => getAccountReportSaveContract(session ?? undefined, reports.length),
    [reports.length, session],
  );
  const migrationPreflight = useMemo(
    () => createAccountMigrationPreflight(reports),
    [reports],
  );
  const migrationReview = useMemo(
    () => createAccountMigrationReviewModel(migrationPreflight),
    [migrationPreflight],
  );
  const latestReports = useMemo(() => reports.slice(0, 5), [reports]);

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">Dashboard</span>
          <h1>در حال آماده‌سازی پنل کاربری</h1>
          <p>گزارش‌های local و مسیر حساب آماده می‌شوند.</p>
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
          اینجا مرکز برگشت به گزارش‌ها، ورود به حساب و ادامه مسیر شخصی توست.
          گزارش‌های همین مرورگر و گزارش‌های account جدا دیده می‌شوند؛ پیش‌فرض
          همه‌چیز همچنان خصوصی و noindex است.
        </p>

        <div className="account-ready-status-strip" aria-label="وضعیت حساب و گزارش‌ها">
          <span>اکانت واقعی: smoke test پاس شده</span>
          <span>پیش‌فرض: خصوصی و noindex</span>
          <span>ورود: username + password</span>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/reports">
            کتابخانه local
          </Link>

          <Link className="button secondary" href="/reports?source=account">
            گزارش‌های account
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده‌ها
          </Link>
        </div>
      </div>

      <section className="card account-ready-lifecycle-card">
        <span className="badge">از مرورگر تا اکانت</span>

        <h2>مسیر ذخیره حساب آماده است؛ migration گزارش‌های قدیمی هنوز لازم نیست</h2>

        <p>
          حساب کاربری واقعی با username انتخابی و موبایل تست شده است. گزارش تازه
          با login معتبر و env کامل به user id ذخیره می‌شود و local-preview همچنان
          fallback امن می‌ماند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. الان</strong>
            <span>گزارش‌های جدید می‌توانند در account ذخیره شوند؛ گزارش‌های local هم حذف نمی‌شوند.</span>
          </div>

          <div>
            <strong>۲. ذخیره گزارش تازه</strong>
            <span>بعد از ورود، گزارش تازه به حساب وصل می‌شود و در account reports دیده می‌شود.</span>
          </div>

          <div>
            <strong>۳. account reports</strong>
            <span>بعد از ساخت گزارش، نسخه account را در /reports?source=account ببین؛ migration فعلاً deferred است.</span>
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

      <SupabaseAuthPanel />

      <section className="card">
        <span className="badge">Account Flow Cockpit</span>

        <h2>تست سریع اکانت واقعی</h2>

        <p>
          این کارت مسیر واقعی حساب را کوتاه و روشن نگه می‌دارد: username انتخابی کاربر است،
          موبایل داده اجباری مشتری است اما username نیست، و گزارش‌های account
          از مسیر private/noindex دیده می‌شوند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. ساخت حساب</strong>
            <span>در /profile یا همین پنل، با username + mobile + password ثبت‌نام کن.</span>
          </div>

          <div>
            <strong>۲. ساخت و ذخیره گزارش</strong>
            <span>از /chart یک گزارش تازه بساز؛ account copy کنار نسخه local ذخیره می‌شود.</span>
          </div>

          <div>
            <strong>۳. خواندن account reports</strong>
            <span>بعد از ذخیره، لیست خصوصی را در /reports?source=account باز کن.</span>
          </div>
        </div>

        <div className="actions">
          <Link className="button secondary" href="/profile">
            تست ورود و ثبت‌نام
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت گزارش تست
          </Link>

          <Link className="button secondary" href="/reports?source=account">
            دیدن account reports
          </Link>
        </div>
      </section>

      <section className="card">
        <span className="badge">وضعیت ذخیره‌سازی</span>

        <h2>local و account کنار هم</h2>

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

        <h2>مسیر بعدی: Supabase-first، ولی private by default</h2>

        <p>
          تصمیم فنی-محصولی این مرحله این است که حساب کاربری و گزارش‌های پایدار
          از مسیر Supabase Auth + Supabase/Postgres جلو بروند. database write فقط
          برای مسیر account report save و با env کامل فعال است؛ public/indexable و migration هنوز خاموش‌اند.
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
        <span className="badge">پیش‌پرواز مهاجرت</span>

        <h2>migration گزارش‌های قدیمی هنوز مرحله بعدی نیست</h2>

        <p>
          {describeAccountMigrationPreflight(migrationPreflight)} قبل از هر
          مهاجرت واقعی باید خروجی JSON بگیری و شمارش imported/skipped را تأیید کنی.
          فعلاً گزارش تازه از مسیر account ذخیره می‌شود و local reports حذف نمی‌شوند.
        </p>

        <div className="profile-grid">
          <div>
            <strong>Active save</strong>
            <span>{accountSaveContract.activeSaveMode}</span>
          </div>

          <div>
            <strong>Future save</strong>
            <span>{accountSaveContract.futureSaveMode}</span>
          </div>

          <div>
            <strong>Can save to account</strong>
            <span>{String(accountSaveContract.canSaveToAccount)}</span>
          </div>

          <div>
            <strong>Account save path</strong>
            <span>{accountSaveContract.accountSaveReadiness.stage}</span>
          </div>

          <div>
            <strong>Migration</strong>
            <span>{migrationPreflight.stage}</span>
          </div>
        </div>

        <div className="profile-grid">
          <div>
            <strong>Local reports</strong>
            <span>{migrationPreflight.localReportCount.toLocaleString("fa-IR")}</span>
          </div>

          <div>
            <strong>Migratable</strong>
            <span>{migrationPreflight.migratableCount.toLocaleString("fa-IR")}</span>
          </div>

          <div>
            <strong>Notes</strong>
            <span>{migrationPreflight.noteCount.toLocaleString("fa-IR")}</span>
          </div>

          <div>
            <strong>Favorites</strong>
            <span>{migrationPreflight.favoriteCount.toLocaleString("fa-IR")}</span>
          </div>
        </div>

        <div className="profile-grid">
          <div>
            <strong>Review status</strong>
            <span>{migrationReview.status}</span>
          </div>

          <div>
            <strong>Would import</strong>
            <span>{migrationReview.wouldImportCount.toLocaleString("fa-IR")}</span>
          </div>

          <div>
            <strong>Would skip</strong>
            <span>{migrationReview.wouldSkipCount.toLocaleString("fa-IR")}</span>
          </div>

          <div>
            <strong>Can execute</strong>
            <span>{String(migrationReview.canExecuteMigration)}</span>
          </div>
        </div>

        <div className="actions">
          <Link className="button secondary" href="/reports">
            گرفتن خروجی JSON از گزارش‌ها
          </Link>

          <button className="button secondary" type="button" disabled>
            مهاجرت به حساب هنوز غیرفعال است
          </button>

          <Link className="button secondary" href="/chart">
            تست ذخیره گزارش تازه
          </Link>
        </div>
      </section>
      <LocalDataBackupPanel />

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