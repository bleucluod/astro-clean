"use client";

import Link from "next/link";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import { AccountProductAccessCard } from "@/components/monetization/ProductAccessCards";
import { useProductAccess } from "@/lib/monetization/product-access-client";
import styles from "./dashboard.module.css";
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
  // HALLEUS_FREE_ALL_DASHBOARD_BATCH1_R1
  const productAccess = useProductAccess();
  const configuredMonetizationVisible =
    (productAccess.status === "ready" || productAccess.status === "unauthenticated") &&
    productAccess.access.policy.monetizationMode === "CONFIGURED";
  const [session, setSession] = useState<AuthSession | null>(null);
  const [reports, setReports] = useState<ReportRecordSummary[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      const nextReports = await listReportSummaries();
      if (!isActive) return;
      setSession(getPreviewSession());
      setReports(nextReports);
      setIsReady(true);
    }

    void loadDashboard();
    const handleDataChange = () => { void loadDashboard(); };
    window.addEventListener("halleus-data-changed", handleDataChange);
    window.addEventListener("astro-clean-data-changed", handleDataChange);

    return () => {
      isActive = false;
      window.removeEventListener("halleus-data-changed", handleDataChange);
      window.removeEventListener("astro-clean-data-changed", handleDataChange);
    };
  }, []);

  const latestReport = reports[0] ?? null;
  const recentReports = useMemo(() => reports.slice(0, 5), [reports]);

  if (!isReady) {
    return (
      <main className={styles.page} data-halleus-personal-home="batch4-r1">
        <section className={styles.loadingCard}>
          <span className={styles.eyebrow}>خانه شخصی هالیوس</span>
          <h1>داریم فضای شخصی تو را آماده می‌کنیم</h1>
          <p>گزارش‌ها، اعتبارها و مسیرهای بعدی در حال آماده‌شدن‌اند.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page} data-halleus-personal-home="batch4-r1">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>خانه شخصی هالیوس</span>
          <h1>از همین‌جا ادامه بده</h1>
          <p>
            {session
              ? "حساب تو آماده است؛ گزارش‌های قبلی، اعتبارها و تحلیل رابطه را از یک جای ساده دنبال کن."
              : configuredMonetizationVisible
                ? "گزارش‌های این مرورگر را می‌بینی؛ برای استفاده از اعتبارهای خریداری‌شده وارد حساب هالیوس شو."
                : "گزارش‌های این مرورگر را می‌بینی؛ برای ادامه می‌توانی چارت یا تحلیل رابطه را باز کنی."}
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.primaryAction} href="/chart">ساخت چارت جدید</Link>
          <Link className={styles.secondaryAction} href="/compare">تحلیل رابطه</Link>
        </div>
      </section>

      <section className={styles.creditSection} aria-labelledby="dashboard-credit-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>اعتبارهای حساب</span>
            <h2 id="dashboard-credit-title">موجودی و دسترسی‌های تو</h2>
          </div>
          {configuredMonetizationVisible ? <Link href="/pricing">دیدن بسته‌های اعتبار</Link> : null}
        </div>
<AccountProductAccessCard />
      </section>

      <section className={styles.continueGrid}>
        <article className={styles.continueCard}>
          <span className={styles.eyebrow}>ادامه خواندن</span>
          {latestReport ? (
            <>
              <h2>{latestReport.name?.trim() || "آخرین گزارش تولد"}</h2>
              <p>
                {latestReport.birthCity ? latestReport.birthCity + " · " : ""}
                {formatDate(latestReport.createdAt)}
              </p>
              <Link className={styles.primaryAction} href={`/reports/${latestReport.id}`}>ادامه گزارش</Link>
            </>
          ) : (
            <>
              <h2>اولین گزارش خودت را بساز</h2>
              <p>بعد از ذخیرهٔ گزارش، سریع‌ترین مسیر برگشت به آن همین‌جا خواهد بود.</p>
              <Link className={styles.primaryAction} href="/chart">ساخت اولین گزارش</Link>
            </>
          )}
        </article>

        <article className={styles.nextCard}>
          <span className={styles.eyebrow}>گام بعدی</span>
          <h2>می‌خواهی چه کاری انجام بدهی؟</h2>
          <div className={styles.actionList}>
            <Link href="/chart"><strong>چارت تولد جدید</strong><span>ساخت یک گزارش تازه</span></Link>
            <Link href="/compare"><strong>تحلیل رابطه</strong><span>مقایسهٔ خصوصی دو چارت تولد</span></Link>
            {configuredMonetizationVisible ? (
              <Link href="/pricing"><strong>اعتبار بیشتر</strong><span>بسته‌های فعال هالیوس</span></Link>
            ) : null}
          </div>
        </article>
      </section>

      <section className={styles.recentSection} aria-labelledby="dashboard-recent-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>گزارش‌های اخیر</span>
            <h2 id="dashboard-recent-title">آخرین گزارش‌های ذخیره‌شده</h2>
          </div>
          <Link href="/reports">همه گزارش‌ها</Link>
        </div>
        {recentReports.length === 0 ? (
          <p className={styles.emptyCopy}>هنوز گزارشی ذخیره نشده است.</p>
        ) : (
          <div className={styles.reportList}>
            {recentReports.map((report) => (
              <Link className={styles.reportRow} href={`/reports/${report.id}`} key={report.id}>
                <span>
                  <strong>{report.name?.trim() || "گزارش بدون نام"}</strong>
                  <small>{report.birthCity || "گزارش تولد"}</small>
                </span>
                <time>{formatDate(report.createdAt)}</time>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.accountSection} aria-labelledby="dashboard-account-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>حساب و حریم خصوصی</span>
            <h2 id="dashboard-account-title">حساب هالیوس، بدون شلوغی فنی</h2>
          </div>
          <div className={styles.inlineLinks}>
            <Link href="/profile">پروفایل</Link>
            <Link href="/privacy">حریم خصوصی</Link>
          </div>
        </div>
        <SupabaseAuthPanel compact />
      </section>

      <span className="dashboard-copy-detox-marker" aria-hidden="true" hidden />
    </main>
  );
}
