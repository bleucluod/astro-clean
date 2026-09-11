"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import { TelegramJoinRewardCard } from "@/components/TelegramJoinRewardCard";
import { getAccountRepository } from "@/lib/account/account-repository";
import { listAccountReportSummaries } from "@/lib/storage/account-report-read-client";
import { listReportSummaries } from "@/lib/storage/report-query-service";
import type { AuthSession } from "@/types/account";

import styles from "./profile-page.module.css";

const accountRepository = getAccountRepository();

function formatProfileName(session: AuthSession | null) {
  return session?.user.displayName?.trim() || "حساب هالیوس";
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
      <div className={styles.page} data-halleus-profile="account-home-v2">
        <section className={styles.loadingPanel} aria-live="polite">
          <span className={styles.eyebrow}>حساب هالیوس</span>
          <h1>داریم اطلاعات حسابت را آماده می‌کنیم</h1>
          <p>وضعیت ورود و گزارش‌های ذخیره‌شده در حال بررسی‌اند.</p>
        </section>
      </div>
    );
  }

  const signedIn = Boolean(session);

  return (
    <div className={styles.page} data-halleus-profile="account-home-v2">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>فضای شخصی هالیوس</span>
          <h1>{signedIn ? `سلام ${formatProfileName(session)}؛ اینجا فضای شخصی توست` : "حساب هالیوس؛ برای برگشت راحت‌تر به گزارش‌ها"}</h1>
          <p>
            {signedIn
              ? "از این صفحه می‌توانی وضعیت حسابت را ببینی، به گزارش‌ها برگردی و تنظیمات مرتبط با حساب و حریم خصوصی را پیدا کنی."
              : "بدون حساب هم می‌توانی از هالیوس استفاده کنی. اگر حساب بسازی، گزارش‌های متصل به حسابت را راحت‌تر پیدا می‌کنی و لازم نیست فقط به همین مرورگر وابسته باشی."}
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/reports">
              گزارش‌های من
            </Link>
            <Link className={styles.secondaryAction} href="/chart">
              ساخت چارت جدید
            </Link>
            <Link className={styles.textAction} href="/privacy">
              حریم خصوصی
            </Link>
          </div>
        </div>

        <div className={styles.summaryGrid} aria-label="خلاصه حساب">
          <article className={styles.summaryCard}>
            <span>وضعیت ورود</span>
            <strong>{signedIn ? "وارد شده‌ای" : "مهمان"}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>گزارش‌های در دسترس</span>
            <strong>{reportTotal.toLocaleString("fa-IR")}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>محل اصلی دسترسی</span>
            <strong>{signedIn ? "حساب هالیوس" : "همین دستگاه"}</strong>
          </article>
        </div>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.primaryColumn}>
          <div className={styles.sectionIntro}>
            <span className={styles.eyebrow}>ورود و حساب</span>
            <h2>حسابت را از همین‌جا مدیریت کن</h2>
            <p>ورود، ثبت‌نام و خروج از حساب در همین بخش انجام می‌شود.</p>
          </div>
          <div className={styles.authSurface}>
            <SupabaseAuthPanel />
          </div>
        </div>

        <aside className={styles.sideColumn} aria-label="دسترسی‌های حساب">
          <section className={styles.infoPanel}>
            <span className={styles.eyebrow}>دسترسی سریع</span>
            <h2>از کجا ادامه بدهی؟</h2>
            <div className={styles.linkList}>
              <Link href="/dashboard">
                <strong>پنل من</strong>
                <span>آخرین گزارش‌ها و مسیرهای بعدی</span>
              </Link>
              <Link href="/reports">
                <strong>گزارش‌های من</strong>
                <span>گزارش‌های حساب یا همین دستگاه</span>
              </Link>
              <Link href="/compare">
                <strong>تحلیل رابطه</strong>
                <span>مقایسه خصوصی دو چارت تولد</span>
              </Link>
            </div>
          </section>

          <section className={styles.infoPanel}>
            <span className={styles.eyebrow}>حریم گزارش‌ها</span>
            <h2>عمومی یا خصوصی بودن، برای همه گزارش‌ها یکسان نیست</h2>
            <p>
              وضعیت انتشار هر گزارش به نوع گزارش و انتخاب‌های مربوط به انتشار آن بستگی دارد. تحلیل رابطه خصوصی می‌ماند و مسیر عمومی انتشار ندارد.
            </p>
            <Link className={styles.inlineLink} href="/privacy">
              جزئیات حریم خصوصی هالیوس
            </Link>
          </section>
        </aside>
      </section>

      <section className={styles.rewardSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>هدیه تلگرام</span>
          <h2>اگر خواستی، هدیه عضویت را هم از همین حساب بگیر</h2>
          <p>اتصال تلگرام اختیاری است و فقط برای بررسی عضویت و فعال‌کردن همان هدیه استفاده می‌شود.</p>
        </div>
        <div className={styles.rewardSurface}>
          <TelegramJoinRewardCard />
        </div>
      </section>

      <span className="profile-account-home-v2-marker" aria-hidden="true" hidden />
    </div>
  );
}
