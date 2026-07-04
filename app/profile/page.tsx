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
          کاربر می‌تواند با ایمیل و رمز وارد شود. از v0.1.184 ذخیره گزارش روی account
          فقط برای گزارش تازه، با user id معتبر و local-preview fallback guard شده است.
        </p>

        <div className="actions">
          <Link className="button" href="/dashboard">
            رفتن به داشبورد
          </Link>

          <Link className="button secondary" href="/reports">
            آرشیو گزارش‌ها
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده
          </Link>
        </div>
      </div>

      <SupabaseAuthPanel />

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
          حالا ورود Supabase و ذخیره گزارش تازه به user id به‌صورت guard شده آماده‌اند.
          قدم بعدی این است که گزارش‌های local-preview با review و backup به حساب واقعی منتقل شوند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. انتخاب auth provider</strong>
            <span>مثلاً Auth.js، Supabase Auth یا Clerk.</span>
          </div>

          <div>
            <strong>۲. اتصال گزارش تازه به user</strong>
            <span>گزارش تازه با env کامل به user id وصل می‌شود، اما local-preview حذف نمی‌شود.</span>
          </div>

          <div>
            <strong>۳. migration از preview</strong>
            <span>گزارش‌های فعلی کاربر به اکانت منتقل می‌شوند.</span>
          </div>
        </div>
      </section>
    </section>
  );
}