import type { Metadata } from "next";
import Link from "next/link";

import { ReportsList } from "@/components/ReportsList";

import styles from "./reports-page.module.css";

export const metadata: Metadata = {
  title: "گزارش‌های من | هالیوس",
  description:
    "گزارش‌های ذخیره‌شده در حساب هالیوس یا روی همین دستگاه را دوباره باز کن، جستجو کن و مدیریت کن.",
  alternates: {
    canonical: "/reports",
  },
  robots: {
    index: false,
    follow: false,
  },
};

type ReportsPageProps = {
  searchParams?: Promise<{
    source?: string | string[];
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawSource = Array.isArray(resolvedSearchParams.source)
    ? resolvedSearchParams.source[0]
    : resolvedSearchParams.source;
  const reportSource = rawSource === "local" ? "local" : "account";
  const isAccountSource = reportSource === "account";

  return (
    <div className={styles.page} data-reports-library="account-home-v1">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>کتابخانه شخصی</span>
          <h1>گزارش‌های من</h1>
          <p>
            گزارش‌هایی که به حسابت وصل شده‌اند یا روی همین دستگاه ذخیره شده‌اند،
            از اینجا دوباره در دسترس‌اند؛ بدون اینکه مسیر خواندن و مدیریتشان قاطی شود.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link className={styles.primaryAction} href="/chart">
            ساخت گزارش جدید
          </Link>
          <Link className={styles.secondaryAction} href="/privacy">
            حریم گزارش‌ها
          </Link>
        </div>
      </section>

      <nav className={styles.sourceSwitch} aria-label="محل نگهداری گزارش‌ها">
        <Link
          aria-current={isAccountSource ? "page" : undefined}
          className={isAccountSource ? styles.sourceLinkActive : styles.sourceLink}
          href="/reports"
        >
          <strong>گزارش‌های حساب</strong>
          <span>برای گزارش‌هایی که بعد از ورود به حساب ذخیره شده‌اند</span>
        </Link>
        <Link
          aria-current={!isAccountSource ? "page" : undefined}
          className={!isAccountSource ? styles.sourceLinkActive : styles.sourceLink}
          href="/reports?source=local"
        >
          <strong>گزارش‌های این دستگاه</strong>
          <span>برای گزارش‌هایی که فقط در همین مرورگر نگه داشته شده‌اند</span>
        </Link>
      </nav>

      <ReportsList reportSource={reportSource} />

      <aside className={styles.privacyNote}>
        <div>
          <strong>عمومی یا خصوصی بودن هر گزارش جداست.</strong>
          <p>
            وضعیت دسترسی را روی همان گزارش می‌بینی. تحلیل رابطه همیشه خصوصی می‌ماند و
            گزارش‌های تولد می‌توانند بسته به نوع و انتخاب تو وضعیت متفاوتی داشته باشند.
          </p>
        </div>
        <Link href="/privacy">جزئیات حریم خصوصی</Link>
      </aside>
    </div>
  );
}
