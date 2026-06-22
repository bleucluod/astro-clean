"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import {
  clearReports,
  deleteReport,
  loadReports,
} from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

type SortMode = "newest" | "oldest";

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function reportMatchesSearch(report: AstrologyReport, searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  const searchableText = JSON.stringify(report).toLowerCase();

  return searchableText.includes(searchTerm);
}

export function ReportsList() {
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const searchTerm = normalizeSearchText(searchInput);

  const visibleReports = useMemo(() => {
    const filteredReports = reports.filter((report) =>
      reportMatchesSearch(report, searchTerm),
    );

    if (sortMode === "oldest") {
      return [...filteredReports].reverse();
    }

    return filteredReports;
  }, [reports, searchTerm, sortMode]);

  function refreshReports() {
    setReports(loadReports());
    setIsReady(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(refreshReports, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function handleDeleteReport(reportId: string) {
    deleteReport(reportId);
    notifyLocalDataChanged();
    refreshReports();
    setMessage("گزارش انتخاب‌شده حذف شد.");
  }

  function handleClearReports() {
    clearReports();
    notifyLocalDataChanged();
    refreshReports();
    setSearchInput("");
    setMessage("همه گزارش‌ها پاک شدند.");
  }

  if (!isReady) {
    return (
      <section className="card">
        <span className="badge">در حال خواندن</span>
        <h1>گزارش‌ها در حال بارگذاری هستند</h1>
        <p>گزارش‌های ذخیره‌شده از مرورگر خوانده می‌شوند.</p>
      </section>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        badge="آرشیو خالی"
        title="هنوز گزارشی ذخیره نشده"
        description="از صفحه چارت شروع کن و اولین گزارش mock خودت را بساز."
        actionHref="/chart"
        actionLabel="ساخت اولین گزارش"
      />
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">گزارش‌های ذخیره‌شده</span>

        <h1>آرشیو گزارش‌های تو</h1>

        <p>
          این گزارش‌ها فعلاً فقط در مرورگر همین دستگاه ذخیره شده‌اند. می‌توانی
          در آن‌ها جستجو کنی، ترتیب نمایش را عوض کنی و وارد صفحه جزئیات هر
          گزارش شوی.
        </p>

        <div className="reports-toolbar">
          <label className="field">
            <span>جستجو در گزارش‌ها</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="نام، شهر، کشور، نشانه یا متن گزارش..."
            />
          </label>

          <label className="field">
            <span>مرتب‌سازی</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="newest">جدیدترین اول</option>
              <option value="oldest">قدیمی‌ترین اول</option>
            </select>
          </label>
        </div>

        <div className="reports-summary-row">
          <span>
            نمایش {visibleReports.length.toLocaleString("fa-IR")} از{" "}
            {reports.length.toLocaleString("fa-IR")} گزارش
          </span>

          {searchInput ? (
            <button
              className="text-button"
              type="button"
              onClick={() => setSearchInput("")}
            >
              پاک کردن جستجو
            </button>
          ) : null}
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <button
            className="button secondary"
            type="button"
            onClick={handleClearReports}
          >
            پاک کردن همه گزارش‌ها
          </button>
        </div>

        {message ? <p className="success-message">{message}</p> : null}
      </div>

      {visibleReports.length === 0 ? (
        <div className="card">
          <span className="badge">بدون نتیجه</span>

          <h2>گزارشی با این جستجو پیدا نشد</h2>

          <p>
            عبارت جستجو را کوتاه‌تر کن یا آن را پاک کن تا همه گزارش‌های ذخیره‌شده
            دوباره نمایش داده شوند.
          </p>

          <button
            className="button secondary"
            type="button"
            onClick={() => setSearchInput("")}
          >
            پاک کردن جستجو
          </button>
        </div>
      ) : null}

      {visibleReports.map((report) => (
        <article className="report-list-item" key={report.id}>
          <ReportCard report={report} />

          <div className="card report-actions-card">
            <div className="actions">
              <Link className="button" href={`/reports/${report.id}`}>
                دیدن جزئیات گزارش
              </Link>

              <button
                className="button secondary"
                type="button"
                onClick={() => handleDeleteReport(report.id)}
              >
                حذف این گزارش
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
