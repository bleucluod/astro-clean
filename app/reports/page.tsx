import type { Metadata } from "next";
import Link from "next/link";

import { ReportsList } from "@/components/ReportsList";

import styles from "./reports-page.module.css";

export const metadata: Metadata = {
  title: "گزارش‌های من | هالیوس",
  description:
    "گزارش‌های ذخیره‌شده در هالیوس را دوباره باز کن، جستجو کن و مدیریت کن.",
  alternates: {
    canonical: "/reports",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReportsPage() {
  return (
    <div className={styles.page} data-reports-library="server-canonical-v1">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>کتابخانه شخصی</span>
          <h1>گزارش‌های من</h1>
          <p>
            اینجا یک کتابخانه واحد از گزارش‌هایی است که هالیوس برای حساب فعلی یا
            نشست مهمان فعلی نگه می‌دارد.
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

      <ReportsList reportSource="account" />

      <aside className={styles.privacyNote}>
        <div>
          <strong>هر گزارش مالک مشخص خودش را دارد.</strong>
          <p>
            تحلیل رابطه همیشه خصوصی می‌ماند. گزارش‌های مهمان بعد از ورود یا
            ثبت‌نام به همان حساب منتقل می‌شوند.
          </p>
        </div>
        <Link href="/privacy">جزئیات حریم خصوصی</Link>
      </aside>
    </div>
  );
}