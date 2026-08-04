"use client";

import { useState } from "react";
import { clearFavoriteReportIds } from "@/lib/storage/favorite-reports-storage";
import { defaultProfile, saveProfile } from "@/lib/storage/profile-storage";
import { clearReportNotes } from "@/lib/storage/report-notes-storage";
import { clearReports } from "@/lib/storage/reports-storage";

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

export function DemoDataPanel() {
  const [message, setMessage] = useState("");

  function handleClearReports() {
    clearReports();
    clearFavoriteReportIds();
    clearReportNotes();
    notifyLocalDataChanged();
    setMessage("همه گزارش‌ها، علاقه‌مندی‌ها و یادداشت‌ها پاک شدند.");
  }

  function handleResetProfile() {
    saveProfile(defaultProfile);
    notifyLocalDataChanged();
    setMessage("پروفایل به حالت پیش‌فرض برگشت.");
  }

  function handleResetAll() {
    clearReports();
    clearFavoriteReportIds();
    clearReportNotes();
    saveProfile(defaultProfile);
    notifyLocalDataChanged();
    setMessage("همه داده‌های دمو پاک شدند.");
  }

  return (
    <section className="card">
      <span className="badge">Demo Controls</span>

      <h2>کنترل داده‌های دمو</h2>

      <p>
        این بخش فقط برای تست MVP است. چون فعلاً دیتابیس نداریم، داده‌ها در
        مرورگر ذخیره می‌شوند و می‌توانی آن‌ها را سریع پاک کنی.
      </p>

      <div className="actions">
        <button className="button secondary" type="button" onClick={handleClearReports}>
          پاک کردن گزارش‌ها
        </button>

        <button className="button secondary" type="button" onClick={handleResetProfile}>
          ریست پروفایل
        </button>

        <button className="button" type="button" onClick={handleResetAll}>
          ریست همه داده‌های دمو
        </button>
      </div>

      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}
