"use client";

import { useEffect, useState } from "react";
import { loadFavoriteReportIds } from "@/lib/storage/favorite-reports-storage";
import { loadProfile } from "@/lib/storage/profile-storage";
import { loadReports } from "@/lib/storage/reports-storage";

type LocalDataStatus = {
  reportCount: number;
  favoriteCount: number;
  hasProfileName: boolean;
  privacyMode: string;
};

const initialStatus: LocalDataStatus = {
  reportCount: 0,
  favoriteCount: 0,
  hasProfileName: false,
  privacyMode: "private",
};

function readLocalDataStatus(): LocalDataStatus {
  const reports = loadReports();
  const favoriteReportIds = loadFavoriteReportIds();
  const profile = loadProfile();

  return {
    reportCount: reports.length,
    favoriteCount: reports.filter((report) => favoriteReportIds.includes(report.id)).length,
    hasProfileName: profile.displayName.trim().length > 0,
    privacyMode: profile.privacyMode,
  };
}

export function LocalDataStatusCard() {
  const [status, setStatus] = useState<LocalDataStatus>(initialStatus);

  useEffect(() => {
    function refreshStatus() {
      setStatus(readLocalDataStatus());
    }

    const timer = window.setTimeout(refreshStatus, 0);

    window.addEventListener("astro-clean-data-changed", refreshStatus);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("astro-clean-data-changed", refreshStatus);
    };
  }, []);

  return (
    <section className="card">
      <span className="badge">Local Data</span>

      <h2>وضعیت داده‌های محلی</h2>

      <p>
        این MVP هنوز backend ندارد. این کارت فقط وضعیت داده‌های ذخیره‌شده در
        مرورگر فعلی را نشان می‌دهد.
      </p>

      <div className="status-grid">
        <div className="mini-card">
          <strong>گزارش‌ها</strong>
          <span>{status.reportCount.toLocaleString("fa-IR")}</span>
        </div>

        <div className="mini-card">
          <strong>علاقه‌مندی‌ها</strong>
          <span>{status.favoriteCount.toLocaleString("fa-IR")}</span>
        </div>

        <div className="mini-card">
          <strong>پروفایل</strong>
          <span>{status.hasProfileName ? "تکمیل شده" : "پیش‌فرض"}</span>
        </div>

        <div className="mini-card">
          <strong>حریم خصوصی</strong>
          <span>{status.privacyMode}</span>
        </div>
      </div>
    </section>
  );
}
