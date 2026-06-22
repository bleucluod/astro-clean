"use client";

import { useEffect, useState } from "react";
import { loadReports } from "@/lib/storage/reports-storage";
import { loadProfile } from "@/lib/storage/profile-storage";

type LocalDataStatus = {
  reportCount: number;
  hasProfileName: boolean;
  privacyMode: string;
};

export function LocalDataStatusCard() {
  const [status, setStatus] = useState<LocalDataStatus>({
    reportCount: 0,
    hasProfileName: false,
    privacyMode: "private",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const reports = loadReports();
      const profile = loadProfile();

      setStatus({
        reportCount: reports.length,
        hasProfileName: profile.displayName.trim().length > 0,
        privacyMode: profile.privacyMode,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="card">
      <span className="badge">Local Data</span>

      <h2>وضعیت داده‌های مرورگر</h2>

      <p>
        این کارت فقط داده‌های ذخیره‌شده روی همین مرورگر را نشان می‌دهد. در MVP
        فعلی هنوز دیتابیس یا حساب کاربری نداریم.
      </p>

      <div className="status-grid">
        <div className="mini-card">
          <strong>تعداد گزارش‌ها</strong>
          <span>{status.reportCount.toLocaleString("fa-IR")}</span>
        </div>

        <div className="mini-card">
          <strong>نام پروفایل</strong>
          <span>{status.hasProfileName ? "ثبت شده" : "خالی"}</span>
        </div>

        <div className="mini-card">
          <strong>حریم خصوصی</strong>
          <span>{status.privacyMode === "private" ? "خصوصی" : "عمومی"}</span>
        </div>

        <div className="mini-card">
          <strong>Backend</strong>
          <span>نداریم</span>
        </div>
      </div>
    </section>
  );
}
