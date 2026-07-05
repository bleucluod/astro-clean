"use client";

import Link from "next/link";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import { useEffect, useMemo, useState } from "react";
import { getAccountRepository } from "@/lib/account/account-repository";
import { getPlanEntitlement } from "@/lib/account/entitlements";
import { listReportSummaries } from "@/lib/storage/report-query-service";
import type { AuthSession } from "@/types/account";
import type { ReportRecordSummary } from "@/types/storage";

const accountRepository = getAccountRepository();

export default function ProfilePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [reports, setReports] = useState<ReportRecordSummary[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      const [nextSession, nextReports] = await Promise.all([
        accountRepository.getCurrentSession(),
        listReportSummaries(),
      ]);

      if (!isActive) {
        return;
      }

      setSession(nextSession);
      setReports(nextReports);
      setIsReady(true);
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const entitlement = useMemo(() => {
    return getPlanEntitlement(session?.user.plan ?? "preview");
  }, [session?.user.plan]);

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">Profile</span>
          <h1>در حال آماده‌سازی پروفایل</h1>
          <p>وضعیت preview account خوانده می‌شود.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Halleus Profile</span>

        <h1>پروفایل و وضعیت اکانت</h1>

        <p>
          این صفحه shell ورود واقعی Supabase را دارد؛ اگر env آماده باشد،
          کاربر با نام کاربری انتخابی، موبایل و رمز وارد می‌شود. ایمیل secondary/optional است و
          ذخیره گزارش روی account فقط برای گزارش تازه، با user id معتبر و local-preview fallback guard شده است.
        </p>

        <div className="actions">
          <Link className="button" href="/dashboard">
            رفتن به داشبورد
          </Link>

          <Link className="button secondary" href="/reports">
            آرشیو local
          </Link>

          <Link className="button secondary" href="/reports?source=account">
            گزارش‌های account
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده
          </Link>
        </div>
      </div>

      <SupabaseAuthPanel />

      <section className="card">
        <span className="badge">Account Identity Snapshot</span>

        <h2>قانون شناسه و اطلاعات مشتری</h2>

        <p>
          برای تست اکانت واقعی، username شناسه انتخابی کاربر است؛ موبایل برای ارتباط و تست account flow نگه داشته می‌شود و username نیست؛ ایمیل optional/secondary می‌ماند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>Username</strong>
            <span>شناسه نمایشی و قابل انتخاب کاربر؛ از موبایل یا ایمیل ساخته نمی‌شود.</span>
          </div>

          <div>
            <strong>Mobile</strong>
            <span>داده ضروری مشتری و ورود guard شده؛ موبایل یوزرنیم نیست.</span>
          </div>

          <div>
            <strong>Account reports</strong>
            <span>بعد از ساخت گزارش تازه، نسخه account در /reports?source=account دیده می‌شود.</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">Preview Account</span>

        <h2>اکانت فعلی</h2>

        <div className="profile-grid">
          <div>
            <strong>وضعیت</strong>
            <span>{session?.user.status ?? "preview"}</span>
          </div>

          <div>
            <strong>پلن</strong>
            <span>{session?.user.plan ?? "preview"}</span>
          </div>

          <div>
            <strong>Provider</strong>
            <span>{session?.source ?? "local-preview"}</span>
          </div>

          <div>
            <strong>گزارش‌های ذخیره‌شده</strong>
            <span>{reports.length.toLocaleString("fa-IR")}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">Plan Entitlements</span>

        <h2>دسترسی‌های پلن فعلی</h2>

        <div className="tag-list">
          <span>
            ذخیره گزارش:{" "}
            {entitlement.maxSavedReports === "unlimited"
              ? "نامحدود"
              : entitlement.maxSavedReports.toLocaleString("fa-IR")}
          </span>
          <span>Export: {entitlement.canExportReports ? "فعال" : "غیرفعال"}</span>
          <span>Import: {entitlement.canImportReports ? "فعال" : "غیرفعال"}</span>
          <span>
            Database storage:{" "}
            {entitlement.canUseDatabaseStorage ? "آماده" : "بعداً"}
          </span>
          <span>
            Advanced interpretations:{" "}
            {entitlement.canUseAdvancedInterpretations ? "فعال" : "بعداً"}
          </span>
        </div>
      </section>

      <section className="card">
        <span className="badge">Next Account Phase</span>

        <h2>بعد از login واقعی چه مانده؟</h2>

        <p>
          حالا ورود Supabase، ذخیره گزارش تازه به user id و خواندن گزارش‌های account به‌صورت guard شده آماده‌اند.
          قدم نزدیک بعدی تست واقعی flow است؛ migration گزارش‌های local فعلاً deferred و غیرضروری است.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. مدل auth فعلی</strong>
            <span>Supabase با username انتخابی، موبایل و رمز؛ ایمیل یوزرنیم نیست.</span>
          </div>

          <div>
            <strong>۲. اتصال گزارش تازه به user</strong>
            <span>گزارش تازه با env کامل به user id وصل می‌شود، اما local-preview حذف نمی‌شود.</span>
          </div>

          <div>
            <strong>۳. تست واقعی اکانت</strong>
            <span>signup → login → ساخت گزارش → ذخیره account → دیدن در /reports?source=account.</span>
          </div>
        </div>
      </section>
    </section>
  );
}