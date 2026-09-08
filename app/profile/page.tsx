"use client";

import Link from "next/link";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import { TelegramJoinRewardCard } from "@/components/TelegramJoinRewardCard";
import { useEffect, useState } from "react";
import { getAccountRepository } from "@/lib/account/account-repository";
import { listReportSummaries } from "@/lib/storage/report-query-service";
import { listAccountReportSummaries } from "@/lib/storage/account-report-read-client";
import type { AuthSession } from "@/types/account";

const accountRepository = getAccountRepository();

function formatProfileName(session: AuthSession | null) {
  return session?.user.displayName || session?.user.email || "هنوز وارد نشده‌ای";
}

export default function ProfilePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [reportTotal, setReportTotal] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      const nextSession = await accountRepository.getCurrentSession();
      const localReports = await listReportSummaries();
      let nextTotal = localReports.length;

      if (nextSession) {
        const accountReports = await listAccountReportSummaries(1);
        if (accountReports.status === "account-read-ready") {
          nextTotal = accountReports.total;
        }
      }

      if (!isActive) {
        return;
      }

      setSession(nextSession);
      setReportTotal(nextTotal);
      setIsReady(true);
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  if (!isReady) {
    return (
      <section className="grid">
        <div className="card">
          <span className="badge">پروفایل</span>
          <h1>در حال آماده‌سازی پروفایل</h1>
          <p>اطلاعات حساب و گزارش‌های تو آماده می‌شود.</p>
        </div>
        <span className="profile-copy-detox-marker" aria-hidden="true" hidden />
      </section>
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">پروفایل هالیوس</span>

        <h1>حساب و اطلاعات من</h1>

        <p>
          اینجا می‌توانی وضعیت ورود، اطلاعات اصلی حساب و مسیر برگشت به گزارش‌هایت
          را ببینی.
        </p>

        <div className="actions">
          <Link className="button" href="/dashboard">
            رفتن به پنل
          </Link>

          <Link className="button secondary" href="/reports">
            گزارش‌های من
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم خصوصی
          </Link>
        </div>
      </div>

      <SupabaseAuthPanel />

      <TelegramJoinRewardCard />

      <section className="card">
        <span className="badge">وضعیت حساب</span>

        <h2>اطلاعات اصلی</h2>

        <div className="profile-grid">
          <div>
            <strong>وضعیت ورود</strong>
            <span>{session ? "وارد شده‌ای" : "هنوز وارد نشده‌ای"}</span>
          </div>

          <div>
            <strong>نام حساب</strong>
            <span>{formatProfileName(session)}</span>
          </div>

          <div>
            <strong>گزارش‌های ذخیره‌شده</strong>
            <span>{reportTotal.toLocaleString("fa-IR")}</span>
          </div>

          <div>
            <strong>حریم گزارش‌ها</strong>
            <span>خصوصی</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">گزارش‌های من</span>

        <h2>برگشت سریع به خوانش‌ها</h2>

        <p>
          هر گزارشی که ذخیره شود، از بخش گزارش‌ها دوباره در دسترس است. برای ساخت
          گزارش تازه هم می‌توانی از صفحه ساخت گزارش شروع کنی.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌ها
          </Link>
        </div>
      </section>

      <span className="profile-copy-detox-marker" aria-hidden="true" hidden />
    </section>
  );
}
