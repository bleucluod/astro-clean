"use client";

import Link from "next/link";
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
          این صفحه هنوز login واقعی ندارد. فعلاً preview account فعال است تا
          ساختار محصول، storage و planها قبل از اتصال auth واقعی آماده شوند.
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

        <h2>قبل از login واقعی چه مانده؟</h2>

        <p>
          حالا مدل اکانت و entitlement داریم. قدم بعدی این است که auth provider
          انتخاب شود و بعد گزارش‌های local preview به user واقعی migrate شوند.
        </p>

        <div className="home-step-list">
          <div>
            <strong>۱. انتخاب auth provider</strong>
            <span>مثلاً Auth.js، Supabase Auth یا Clerk.</span>
          </div>

          <div>
            <strong>۲. اتصال reports به user</strong>
            <span>گزارش‌ها به جای مرورگر، به user id وصل می‌شوند.</span>
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
