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
      <section className="grid core-surface-dashboard">
        <div className="card">
          <span className="badge">Dashboard</span>
          <h1>در حال آماده‌سازی پنل کاربری</h1>
          <p>گزارش‌های local و مسیر حساب آماده می‌شوند.</p>
        </div>
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
    </section>
    );
  }

  return (
    <section className="grid core-surface-dashboard account-ready-dashboard">
      <div className="card account-ready-dashboard-hero">
        <span className="badge">Halleus Dashboard</span>

        <h1>پنل کاربری Halleus</h1>

        <p>
          اینجا مرکز برگشت به گزارش‌ها و ورود به حساب است. گزارش‌های همین مرورگر
          و گزارش‌های حساب جدا دیده می‌شوند تا مالکیت گزارش روشن بماند؛ پیش‌فرض
          همچنان private/noindex است.
        </p>

        <div className="account-ready-status-strip" aria-label="وضعیت حساب و گزارش‌ها">
          <span>ورود: username + password</span>
          <span>ثبت‌نام: username + mobile + password</span>
          <span>گزارش حساب: private/noindex</span>
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

      <section className="card account-ready-lifecycle-card" aria-labelledby="beta-readiness-dashboard-title">
        <span className="badge">Account readiness</span>

        <h2 id="beta-readiness-dashboard-title">مسیر حساب بدون ثبت‌نام داخل چارت</h2>

        <p>
          این مرحله فقط راه ورود، ثبت‌نام و برگشت به گزارش‌های حساب را روشن می‌کند.
          ثبت‌نام inline داخل /chart، migration گزارش‌های قدیمی و پرداخت هنوز وارد این batch نمی‌شوند.
        </p>

        <div className="home-step-list" data-check="BETA_READINESS_DASHBOARD">
          <div>
            <strong>۱. گزارش local</strong>
            <span>از /chart گزارش بساز و مطمئن شو صفحه جزئیات از همین مرورگر باز می‌شود.</span>
          </div>

          <div>
            <strong>۲. حساب کاربری</strong>
            <span>از /profile یا همین پنل وارد شو؛ username برای ورود است و موبایل username نیست.</span>
          </div>

          <div>
            <strong>۳. گزارش‌های حساب</strong>
            <span>نسخه حساب را جدا از local در /reports?source=account ببین؛ همه‌چیز private/noindex می‌ماند.</span>
          </div>
        </div>
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
    </section>
      <section className="card account-ready-lifecycle-card">
        <span className="badge">از مرورگر تا اکانت</span>

        <h2>اول مالکیت حساب را روشن می‌کنیم؛ migration گزارش‌های قدیمی هنوز لازم نیست</h2>

        <p>
          حساب کاربری با username انتخابی، موبایل اجباری و رمز عبور تعریف شده است.
          هدف این کارت این است که کاربر بداند گزارش‌های local و account یکی نیستند
          و مسیر حساب برای گزارش‌های بعدی جدا و private/noindex می‌ماند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. الان</strong>
            <span>حساب برای ورود، مالکیت و برگشت به گزارش‌های بعدی توضیح داده می‌شود؛ inline signup داخل /chart نداریم.</span>
          </div>

          <div>
            <strong>۲. گزارش تازه</strong>
            <span>کاربر بعد از ورود از /chart گزارش تازه می‌سازد و اگر مسیر account آماده باشد نسخه حساب جدا دیده می‌شود.</span>
          </div>

          <div>
            <strong>۳. گزارش‌های حساب</strong>
            <span>گزارش‌های حساب در /reports?source=account خوانده می‌شوند؛ migration فعلاً deferred است.</span>
          </div>
        </div>
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
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
        <span className="badge">راهنمای حساب</span>

        <h2>حساب برای ذخیره و برگشت به گزارش‌های بعدی</h2>

        <p>
          این کارت مسیر حساب را کوتاه و روشن نگه می‌دارد: username انتخابی کاربر
          است، موبایل داده حساب است اما username نیست، و گزارش‌های account از
          مسیر private/noindex دیده می‌شوند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. ساخت حساب</strong>
            <span>در /profile یا همین پنل، با username + mobile + password ثبت‌نام کن؛ داخل /chart فرم ثبت‌نام اضافه نشده است.</span>
          </div>

          <div>
            <strong>۲. ساخت گزارش بعدی</strong>
            <span>از /chart یک گزارش تازه بساز؛ نسخه local باقی می‌ماند و مسیر account جدا بررسی می‌شود.</span>
          </div>

          <div>
            <strong>۳. خواندن account reports</strong>
            <span>بعد از ذخیره، لیست خصوصی را در /reports?source=account باز کن.</span>
          </div>
        </div>

        <div className="actions">
          <Link className="button secondary" href="/profile">
            ورود و ثبت‌نام
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/reports?source=account">
            دیدن گزارش‌های حساب
          </Link>
        </div>
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
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
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
    </section>

      <section className="card">
        <span className="badge">تصمیم ذخیره پایدار</span>

        <h2>مسیر بعدی: حساب پایدار، private by default</h2>

        <p>
          تصمیم فنی-محصولی این مرحله این است که حساب کاربری و گزارش‌های پایدار
          از مسیر Supabase Auth + Supabase/Postgres جلو بروند، اما public/indexable،
          پرداخت و migration گزارش‌های قدیمی هنوز خاموش‌اند.
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
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
    </section>

      <section className="card">
        <span className="badge">پیش‌پرواز مهاجرت</span>

        <h2>migration گزارش‌های قدیمی هنوز مرحله بعدی نیست</h2>

        <p>
          {describeAccountMigrationPreflight(migrationPreflight)} قبل از هر
          مهاجرت واقعی باید خروجی JSON بگیری و شمارش imported/skipped را تأیید کنی.
          فعلاً تمرکز روی گزارش‌های تازه و مسیر حساب است و local reports حذف نمی‌شوند.
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
            ساخت گزارش تازه بعد از ورود
          </Link>
        </div>
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
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
      <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
    </section>
    <span className="core-surface-dashboard-marker" aria-hidden="true" hidden />
    </section>
  );
}
