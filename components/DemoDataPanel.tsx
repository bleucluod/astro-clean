"use client";

import { useState } from "react";
import { clearReports } from "@/lib/storage/reports-storage";
import {
  defaultProfile,
  saveProfile,
} from "@/lib/storage/profile-storage";

export function DemoDataPanel() {
  const [message, setMessage] = useState("");

  function handleClearReports() {
    clearReports();
    setMessage("گزارش‌های ذخیره‌شده از مرورگر پاک شدند.");
  }

  function handleResetProfile() {
    saveProfile(defaultProfile);
    setMessage("پروفایل دمو به حالت اولیه برگشت.");
  }

  function handleResetAllDemoData() {
    clearReports();
    saveProfile(defaultProfile);
    setMessage("همه داده‌های دمو پاک یا ریست شدند.");
  }

  return (
    <section className="card">
      <span className="badge">Demo Data</span>

      <h2>مدیریت داده‌های تستی مرورگر</h2>

      <p>
        چون MVP فعلاً backend و دیتابیس ندارد، گزارش‌ها و پروفایل در مرورگر همین
        دستگاه ذخیره می‌شوند. این بخش کمک می‌کند هنگام تست محصول، داده‌های دمو
        را سریع پاک یا ریست کنی.
      </p>

      <div className="actions">
        <button className="button secondary" onClick={handleClearReports}>
          پاک کردن گزارش‌ها
        </button>

        <button className="button secondary" onClick={handleResetProfile}>
          ریست پروفایل
        </button>

        <button className="button" onClick={handleResetAllDemoData}>
          ریست همه داده‌های دمو
        </button>
      </div>

      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}
