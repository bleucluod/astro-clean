"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { createShareText } from "@/lib/astrology/share-text";
import {
  clearFavoriteReportIds,
  loadFavoriteReportIds,
  toggleFavoriteReportId,
} from "@/lib/storage/favorite-reports-storage";
import {
  deleteReportNote,
  loadReportNotes,
  type ReportNotesMap,
} from "@/lib/storage/report-notes-storage";
import {
  clearReports,
  deleteReport,
  loadReports,
  saveReport,
} from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";

type SortMode = "newest" | "oldest";
type ReportFilterMode = "all" | "favorites";

type ReportsArchivePayload = {
  app: "astro-clean";
  type: "reports-archive";
  version: 1;
  exportedAt: string;
  filterMode: ReportFilterMode;
  sortMode: SortMode;
  searchTerm: string;
  reports: AstrologyReport[];
  notes: Record<string, string>;
};

function downloadArchiveFile(
  fileName: string,
  data: string,
  mimeType: string,
) {
  const blob = new Blob([data], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function createArchiveFileName(extension: "json" | "txt") {
  return `astro-clean-reports-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function createReportsNotesSubset(
  reports: AstrologyReport[],
  reportNotes: ReportNotesMap,
) {
  return Object.fromEntries(
    reports
      .map((report) => [report.id, reportNotes[report.id]?.trim() ?? ""])
      .filter(([, note]) => note),
  );
}

function createReportsArchivePayload(
  reports: AstrologyReport[],
  reportNotes: ReportNotesMap,
  filterMode: ReportFilterMode,
  sortMode: SortMode,
  searchTerm: string,
): ReportsArchivePayload {
  return {
    app: "astro-clean",
    type: "reports-archive",
    version: 1,
    exportedAt: new Date().toISOString(),
    filterMode,
    sortMode,
    searchTerm,
    reports,
    notes: createReportsNotesSubset(reports, reportNotes),
  };
}

function createReportsArchiveText(
  reports: AstrologyReport[],
  reportNotes: ReportNotesMap,
) {
  return reports
    .map((report, index) => {
      const lines = [
        `# ${index + 1}`,
        createShareText(report),
      ];

      const note = reportNotes[report.id]?.trim();

      if (note) {
        lines.push("", "Note:", note);
      }

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReportLike(value: unknown): value is AstrologyReport {
  if (!isRecord(value)) {
    return false;
  }

  const input = value.input;
  const chart = value.chart;

  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    isRecord(input) &&
    isRecord(chart) &&
    typeof value.summary === "string" &&
    Array.isArray(value.interpretations) &&
    typeof value.safetyNote === "string"
  );
}

function extractReportsFromImportPayload(payload: unknown): AstrologyReport[] {
  if (Array.isArray(payload)) {
    return payload.filter(isReportLike);
  }

  if (isReportLike(payload)) {
    return [payload];
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.reports)) {
    return payload.reports.filter(isReportLike);
  }

  if (isReportLike(payload.report)) {
    return [payload.report];
  }

  return [];
}

function reportMatchesSearch(
  report: AstrologyReport,
  reportNote: string,
  searchTerm: string,
) {
  if (!searchTerm) {
    return true;
  }

  const searchableText = `${JSON.stringify(report)} ${reportNote}`.toLowerCase();

  return searchableText.includes(searchTerm);
}

export function ReportsList() {
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const [favoriteReportIds, setFavoriteReportIds] = useState<string[]>([]);
  const [reportNotes, setReportNotes] = useState<ReportNotesMap>({});
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterMode, setFilterMode] = useState<ReportFilterMode>("all");

  const searchTerm = normalizeSearchText(searchInput);

  const favoriteCount = reports.filter((report) =>
    favoriteReportIds.includes(report.id),
  ).length;

  const notesCount = reports.filter((report) => reportNotes[report.id]).length;

  const visibleReports = useMemo(() => {
    const filteredReports = reports.filter((report) => {
      const matchesFavoriteFilter =
        filterMode === "all" || favoriteReportIds.includes(report.id);

      return (
        matchesFavoriteFilter &&
        reportMatchesSearch(report, reportNotes[report.id] ?? "", searchTerm)
      );
    });

    if (sortMode === "oldest") {
      return [...filteredReports].reverse();
    }

    return filteredReports;
  }, [favoriteReportIds, filterMode, reportNotes, reports, searchTerm, sortMode]);

  function refreshReports() {
    setReports(loadReports());
    setFavoriteReportIds(loadFavoriteReportIds());
    setReportNotes(loadReportNotes());
    setIsReady(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(refreshReports, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function handleToggleFavorite(reportId: string) {
    const isNowFavorite = toggleFavoriteReportId(reportId);
    refreshReports();
    notifyLocalDataChanged();
    setMessage(isNowFavorite ? "گزارش ستاره‌دار شد." : "گزارش از علاقه‌مندی‌ها حذف شد.");
  }

  function handleDeleteReport(reportId: string) {
    deleteReport(reportId);
    deleteReportNote(reportId);

    if (favoriteReportIds.includes(reportId)) {
      toggleFavoriteReportId(reportId);
    }

    notifyLocalDataChanged();
    refreshReports();
    setMessage("گزارش انتخاب‌شده حذف شد.");
  }

  function handleClearReports() {
    clearReports();
    clearFavoriteReportIds();
    notifyLocalDataChanged();
    refreshReports();
    setSearchInput("");
    setFilterMode("all");
    setMessage("همه گزارش‌ها و علاقه‌مندی‌ها پاک شدند.");
  }

  function handleExportAllJson() {
    if (reports.length === 0) {
      setMessage("No reports to export.");
      return;
    }

    downloadArchiveFile(
      createArchiveFileName("json"),
      JSON.stringify(
        createReportsArchivePayload(
          reports,
          reportNotes,
          "all",
          sortMode,
          "",
        ),
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );

    setMessage("Full JSON export created.");
  }

  async function handleImportReports(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const importedReports = extractReportsFromImportPayload(payload);

      if (importedReports.length === 0) {
        setMessage("No valid reports found.");
        return;
      }

      const existingIds = new Set(loadReports().map((report) => report.id));
      let importedCount = 0;

      for (const report of importedReports) {
        if (existingIds.has(report.id)) {
          continue;
        }

        saveReport(report);
        existingIds.add(report.id);
        importedCount += 1;
      }

      notifyLocalDataChanged();
      refreshReports();

      setMessage(
        importedCount > 0
          ? `Imported ${importedCount.toLocaleString("en-US")} report(s).`
          : "No new reports imported.",
      );
    } catch {
      setMessage("Import failed.");
    }
  }

  function handleExportVisibleText() {
    if (visibleReports.length === 0) {
      setMessage("No reports to export.");
      return;
    }

    downloadArchiveFile(
      createArchiveFileName("txt"),
      createReportsArchiveText(visibleReports, reportNotes),
      "text/plain;charset=utf-8",
    );

    setMessage("TXT export created.");
  }

  function handleExportVisibleJson() {
    if (visibleReports.length === 0) {
      setMessage("No reports to export.");
      return;
    }

    downloadArchiveFile(
      createArchiveFileName("json"),
      JSON.stringify(
        createReportsArchivePayload(
          visibleReports,
          reportNotes,
          filterMode,
          sortMode,
          searchTerm,
        ),
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );

    setMessage("JSON export created.");
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
          جستجو کنی، ترتیب نمایش را عوض کنی، گزارش‌های مهم را ستاره‌دار کنی و
          برای هر گزارش یادداشت شخصی بنویسی.
        </p>

        <div className="reports-toolbar">
          <label className="field">
            <span>جستجو در گزارش‌ها و یادداشت‌ها</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="نام، شهر، کشور، نشانه، متن گزارش یا یادداشت..."
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

        <div className="filter-tabs">
          <button
            className={filterMode === "all" ? "filter-tab active" : "filter-tab"}
            type="button"
            onClick={() => setFilterMode("all")}
          >
            همه گزارش‌ها
          </button>

          <button
            className={
              filterMode === "favorites" ? "filter-tab active" : "filter-tab"
            }
            type="button"
            onClick={() => setFilterMode("favorites")}
          >
            علاقه‌مندی‌ها ({favoriteCount.toLocaleString("fa-IR")})
          </button>
        </div>

        <div className="reports-summary-row">
          <span>
            نمایش {visibleReports.length.toLocaleString("fa-IR")} از{" "}
            {reports.length.toLocaleString("fa-IR")} گزارش ·{" "}
            {notesCount.toLocaleString("fa-IR")} یادداشت
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

          <div className="reports-backup-actions">
            <button
              className="button secondary"
              type="button"
              onClick={handleExportAllJson}
            >
              Export all JSON
            </button>

            <label className="button secondary reports-file-button">
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportReports}
              />
            </label>
          </div>

          <div className="reports-export-actions">
            <button
              className="button secondary"
              type="button"
              onClick={handleExportVisibleText}
            >
              Export visible TXT
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={handleExportVisibleJson}
            >
              Export visible JSON
            </button>
          </div>
        </div>

        {message ? <p className="success-message">{message}</p> : null}
      </div>

      {visibleReports.length === 0 ? (
        <div className="card">
          <span className="badge">بدون نتیجه</span>

          <h2>گزارشی با این فیلتر پیدا نشد</h2>

          <p>
            عبارت جستجو را کوتاه‌تر کن، فیلتر علاقه‌مندی‌ها را بردار، یا یک
            گزارش را ستاره‌دار کن.
          </p>

          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setSearchInput("");
              setFilterMode("all");
            }}
          >
            نمایش همه گزارش‌ها
          </button>
        </div>
      ) : null}

      {visibleReports.map((report) => {
        const isFavorite = favoriteReportIds.includes(report.id);
        const hasNote = Boolean(reportNotes[report.id]);

        return (
          <article className="report-list-item" key={report.id}>
            <ReportCard report={report} />

            <div className="card report-actions-card">
              {hasNote ? (
                <p className="report-note-preview">
                  یادداشت: {reportNotes[report.id]}
                </p>
              ) : null}

              <div className="actions">
                <Link className="button" href={`/reports/${report.id}`}>
                  دیدن جزئیات گزارش
                </Link>

                <button
                  className="button secondary"
                  type="button"
                  onClick={() => handleToggleFavorite(report.id)}
                >
                  {isFavorite ? "حذف از علاقه‌مندی‌ها" : "ستاره‌دار کردن"}
                </button>

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
        );
      })}
    </section>
  );
}
