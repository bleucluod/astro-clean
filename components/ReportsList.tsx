"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ReportCard } from "@/components/ReportCard";
import { createShareText } from "@/lib/astrology/share-text";
import { decodeReportRecords } from "@/lib/storage/report-record-migration";
import { createReportRecord } from "@/lib/storage/report-records";
import { getReportRepository } from "@/lib/storage/report-repository";
import {
  getAccountReportReadClientConfig,
  listAccountReportSummaries,
} from "@/lib/storage/account-report-read-client";
import type { AstrologyReport } from "@/types/astro";
import type { ReportRecord, ReportRecordSummary } from "@/types/storage";

type SortMode = "newest" | "oldest";
type ReportFilterMode = "all" | "favorites";
type ReportNotesMap = Record<string, string>;
type ReportsListSource = "local" | "beta-db" | "account";

type ReportsListProps = {
  reportSource?: ReportsListSource;
};

type BetaDatabaseListResponse = {
  ok?: boolean;
  error?: string;
  summaries?: ReportRecordSummary[];
};

type ReportsArchivePayload = {
  app: "halleus";
  type: "reports-archive";
  version: 2;
  exportedAt: string;
  filterMode: ReportFilterMode;
  sortMode: SortMode;
  searchTerm: string;
  reports: AstrologyReport[];
  notes: Record<string, string>;
  records: ReportRecord[];
};

const reportRepository = getReportRepository();

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
  return `halleus-reports-${new Date().toISOString().slice(0, 10)}.${extension}`;
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
  favoriteReportIds: string[],
  filterMode: ReportFilterMode,
  sortMode: SortMode,
  searchTerm: string,
): ReportsArchivePayload {
  return {
    app: "halleus",
    type: "reports-archive",
    version: 2,
    exportedAt: new Date().toISOString(),
    filterMode,
    sortMode,
    searchTerm,
    reports,
    notes: createReportsNotesSubset(reports, reportNotes),
    records: reports.map((report) =>
      createReportRecord(report, {
        favorite: favoriteReportIds.includes(report.id),
        note: reportNotes[report.id],
        source: "local-preview",
        visibility: "public",
      }),
    ),
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
  window.dispatchEvent(new Event("halleus-data-changed"));
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

function createReportNotesMap(records: ReportRecord[]) {
  const notes: ReportNotesMap = {};

  for (const record of records) {
    const note = record.note?.trim();

    if (note) {
      notes[record.id] = note;
    }
  }

  return notes;
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

function databaseSummaryMatchesSearch(
  summary: ReportRecordSummary,
  searchTerm: string,
) {
  if (!searchTerm) {
    return true;
  }

  const searchableText = [
    summary.id,
    summary.name ?? "",
    summary.birthDate,
    summary.birthTime,
    summary.birthCity,
    summary.birthCountry,
    summary.visibility,
    summary.source,
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchTerm);
}

export function ReportsList({ reportSource = "local" }: ReportsListProps) {
  const [reports, setReports] = useState<AstrologyReport[]>([]);
  const [databaseSummaries, setDatabaseSummaries] = useState<ReportRecordSummary[]>([]);
  const [favoriteReportIds, setFavoriteReportIds] = useState<string[]>([]);
  const [reportNotes, setReportNotes] = useState<ReportNotesMap>({});
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterMode, setFilterMode] = useState<ReportFilterMode>("all");

  const searchTerm = normalizeSearchText(searchInput);
  const isBetaDatabaseSource = reportSource === "beta-db";
  const isAccountSource = reportSource === "account";
  const isRemoteSummarySource = isBetaDatabaseSource || isAccountSource;
  const accountReadConfig = useMemo(() => getAccountReportReadClientConfig(), []);

  const favoriteCount = isRemoteSummarySource
    ? databaseSummaries.filter((summary) => summary.favorite).length
    : reports.filter((report) => favoriteReportIds.includes(report.id)).length;

  const notesCount = isRemoteSummarySource
    ? databaseSummaries.filter((summary) => summary.hasNote).length
    : reports.filter((report) => reportNotes[report.id]).length;

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

  const visibleDatabaseSummaries = useMemo(() => {
    const filteredSummaries = databaseSummaries.filter((summary) => {
      const matchesFavoriteFilter = filterMode === "all" || summary.favorite;

      return matchesFavoriteFilter && databaseSummaryMatchesSearch(summary, searchTerm);
    });

    return [...filteredSummaries].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [databaseSummaries, filterMode, searchTerm, sortMode]);

  async function refreshReports() {
    if (isAccountSource) {
      const result = await listAccountReportSummaries();

      setDatabaseSummaries(result.summaries);
      setReports([]);
      setFavoriteReportIds(
        result.summaries
          .filter((summary) => summary.favorite)
          .map((summary) => summary.id),
      );
      setReportNotes({});
      setIsReady(true);
      setMessage(result.message);

      return;
    }

    if (isAccountSource) {
    if (databaseSummaries.length === 0) {
      return (
        <section className="grid">
          <EmptyState
            badge="گزارش‌های حساب"
            title="هنوز گزارشی در حساب پیدا نشد"
            description={
              message ||
              "برای دیدن گزارش‌های حساب، وارد حساب شو و یک گزارش تازه بساز. گزارش‌های جدید فعلاً public/noindex ذخیره می‌شوند."
            }
            actionHref={accountReadConfig.canAttemptAccountReportRead ? "/chart" : "/profile"}
            actionLabel={accountReadConfig.canAttemptAccountReportRead ? "ساخت گزارش جدید" : "رفتن به حساب"}
          />

          {!accountReadConfig.canAttemptAccountReportRead ? (
            <div className="card">
              <span className="badge">Account read guard</span>

              <h2>خواندن گزارش‌های حساب هنوز کامل فعال نیست</h2>

              <p>
                برای account reports UI باید login و account report save/read flagها فعال باشند. این مسیر migration اجرا نمی‌کند و local reports را حذف نمی‌کند.
              </p>

              {accountReadConfig.missingConfig.length > 0 ? (
                <ul>
                  {accountReadConfig.missingConfig.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      );
    }

    return (
      <section className="grid">
        <div className="card">
          <span className="badge">Account reports</span>

          <h1>گزارش‌های ذخیره‌شده در حساب</h1>

          <p>
            این نما گزارش‌هایی را نشان می‌دهد که با حساب واردشده ذخیره شده‌اند. گزارش‌های جدید فعلاً public/noindex هستند؛ migration و حذف گزارش‌های local در این نسخه انجام نمی‌شود.
          </p>

          <div className="reports-toolbar">
            <label className="field">
              <span>جستجو در گزارش‌های حساب</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="نام، شهر، کشور یا شناسه گزارش..."
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
              همه گزارش‌های حساب
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
              نمایش {visibleDatabaseSummaries.length.toLocaleString("fa-IR")} از{" "}
              {databaseSummaries.length.toLocaleString("fa-IR")} گزارش اکانتی ·{" "}
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

            <Link className="button secondary" href="/reports">
              گزارش‌های local-preview
            </Link>

            <Link className="button secondary" href="/profile">
              حساب کاربری
            </Link>
          </div>

          {message ? <p className="success-message">{message}</p> : null}
        </div>

        {visibleDatabaseSummaries.length === 0 ? (
          <div className="card">
            <span className="badge">بدون نتیجه</span>

            <h2>گزارشی با این جستجو پیدا نشد</h2>

            <p>جستجو را پاک کن یا فیلتر علاقه‌مندی‌ها را بردار.</p>

            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setSearchInput("");
                setFilterMode("all");
              }}
            >
              نمایش همه گزارش‌های حساب
            </button>
          </div>
        ) : null}

        {visibleDatabaseSummaries.map((summary) => (
          <article className="card" key={summary.id}>
            <span className="badge">Account copy</span>

            <h2>{summary.name ? `گزارش ${summary.name}` : "گزارش ذخیره‌شده در حساب"}</h2>

            <div className="birth-details">
              <span>{summary.birthDate}</span>
              <span>{summary.birthTime}</span>
              <span>
                {summary.birthCity}, {summary.birthCountry}
              </span>
            </div>

            <p>
              ذخیره‌شده در {new Date(summary.createdAt).toLocaleDateString("fa-IR")} ·{" "}
              {summary.visibility} · {summary.source}
              {summary.hasNote ? " · یادداشت دارد" : ""}
              {summary.favorite ? " · علاقه‌مندی" : ""}
            </p>

            <div className="actions">
              <Link
                className="button"
                href={`/reports/${summary.id}?source=account`}
              >
                باز کردن گزارش اکانتی
              </Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  if (isBetaDatabaseSource) {
      const response = await fetch("/api/reports/beta");
      const payload = (await response.json().catch(() => null)) as
        | BetaDatabaseListResponse
        | null;

      if (!response.ok || !payload?.ok || !Array.isArray(payload.summaries)) {
        setDatabaseSummaries([]);
        setReports([]);
        setFavoriteReportIds([]);
        setReportNotes({});
        setIsReady(true);
        setMessage(payload?.error ?? "آرشیو دیتابیس بتا بارگذاری نشد.");
        return;
      }

      setDatabaseSummaries(payload.summaries);
      setReports([]);
      setFavoriteReportIds(
        payload.summaries
          .filter((summary) => summary.favorite)
          .map((summary) => summary.id),
      );
      setReportNotes({});
      setMessage(`تعداد ${payload.summaries.length.toLocaleString("fa-IR")} گزارش دیتابیس بتا خوانده شد.`);
      setIsReady(true);
      return;
    }

    setDatabaseSummaries([]);
    const records = await reportRepository.listReports();

    setReports(records.map((record) => record.report));
    setFavoriteReportIds(
      records.filter((record) => record.favorite).map((record) => record.id),
    );
    setReportNotes(createReportNotesMap(records));
    setIsReady(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshReports();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [reportSource]);

  async function handleToggleFavorite(reportId: string) {
    const shouldBeFavorite = !favoriteReportIds.includes(reportId);

    await reportRepository.setFavorite(reportId, shouldBeFavorite);
    await refreshReports();
    notifyLocalDataChanged();
    setMessage(
      shouldBeFavorite
        ? "گزارش ستاره‌دار شد."
        : "گزارش از علاقه‌مندی‌ها حذف شد.",
    );
  }

  async function handleDeleteReport(reportId: string) {
    await reportRepository.deleteReport(reportId);

    notifyLocalDataChanged();
    await refreshReports();
    setMessage("گزارش انتخاب‌شده حذف شد.");
  }

  async function handleClearReports() {
    await reportRepository.clearReports();
    notifyLocalDataChanged();
    await refreshReports();
    setSearchInput("");
    setFilterMode("all");
    setMessage("همه گزارش‌ها و علاقه‌مندی‌ها پاک شدند.");
  }

  function handleExportAllJson() {
    if (reports.length === 0) {
      setMessage("گزارشی برای خروجی گرفتن وجود ندارد.");
      return;
    }

    downloadArchiveFile(
      createArchiveFileName("json"),
      JSON.stringify(
        createReportsArchivePayload(
          reports,
          reportNotes,
          favoriteReportIds,
          "all",
          sortMode,
          "",
        ),
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );

    setMessage("خروجی کامل JSON آماده شد.");
  }

  async function handleImportReports(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const payload = JSON.parse(await file.text()) as unknown;
      let importedRecords = decodeReportRecords(payload);

      if (importedRecords.length === 0) {
        importedRecords = extractReportsFromImportPayload(payload).map((report) =>
          createReportRecord(report, {
            source: "local-preview",
            visibility: "public",
          }),
        );
      }

      if (importedRecords.length === 0) {
        setMessage("فایل انتخاب‌شده گزارشی قابل خواندن نداشت.");
        return;
      }

      const result = await reportRepository.importReports(importedRecords);

      notifyLocalDataChanged();
      await refreshReports();

      setMessage(
        result.imported > 0
          ? `تعداد ${result.imported.toLocaleString("fa-IR")} گزارش وارد شد.`
          : "گزارش تازه‌ای برای وارد کردن پیدا نشد.",
      );
    } catch {
      setMessage("وارد کردن فایل انجام نشد.");
    }
  }

  function handleExportVisibleText() {
    if (visibleReports.length === 0) {
      setMessage("گزارشی برای خروجی گرفتن وجود ندارد.");
      return;
    }

    downloadArchiveFile(
      createArchiveFileName("txt"),
      createReportsArchiveText(visibleReports, reportNotes),
      "text/plain;charset=utf-8",
    );

    setMessage("خروجی متنی گزارش‌های نمایش‌داده‌شده آماده شد.");
  }

  function handleExportVisibleJson() {
    if (visibleReports.length === 0) {
      setMessage("گزارشی برای خروجی گرفتن وجود ندارد.");
      return;
    }

    downloadArchiveFile(
      createArchiveFileName("json"),
      JSON.stringify(
        createReportsArchivePayload(
          visibleReports,
          reportNotes,
          favoriteReportIds,
          filterMode,
          sortMode,
          searchTerm,
        ),
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );

    setMessage("خروجی JSON گزارش‌های نمایش‌داده‌شده آماده شد.");
  }

  if (!isReady) {
    return (
      <section className="card">
        <span className="badge">در حال آماده‌سازی</span>
        <h1>گزارش‌ها در حال خواندن هستند</h1>
        <p>هالیوس گزارش‌های public/noindex ذخیره‌شده روی همین دستگاه را پیدا می‌کند.</p>
      </section>
    );
  }

  if (isAccountSource) {
    if (databaseSummaries.length === 0) {
      return (
        <section className="grid">
          <EmptyState
            badge="گزارش‌های حساب"
            title="هنوز گزارشی در حساب پیدا نشد"
            description={
              message ||
              "برای دیدن گزارش‌های حساب، وارد حساب شو و یک گزارش تازه بساز. گزارش‌های جدید فعلاً public/noindex ذخیره می‌شوند."
            }
            actionHref={accountReadConfig.canAttemptAccountReportRead ? "/chart" : "/profile"}
            actionLabel={accountReadConfig.canAttemptAccountReportRead ? "ساخت گزارش جدید" : "رفتن به حساب"}
          />

          {!accountReadConfig.canAttemptAccountReportRead ? (
            <div className="card">
              <span className="badge">Account read guard</span>

              <h2>خواندن گزارش‌های حساب هنوز کامل فعال نیست</h2>

              <p>
                برای account reports UI باید login و account report save/read flagها فعال باشند. این مسیر migration اجرا نمی‌کند و local reports را حذف نمی‌کند.
              </p>

              {accountReadConfig.missingConfig.length > 0 ? (
                <ul>
                  {accountReadConfig.missingConfig.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      );
    }

    return (
      <section className="grid">
        <div className="card">
          <span className="badge">Account reports</span>

          <h1>گزارش‌های ذخیره‌شده در حساب</h1>

          <p>
            این نما گزارش‌هایی را نشان می‌دهد که با حساب واردشده ذخیره شده‌اند. گزارش‌های جدید فعلاً public/noindex هستند؛ migration و حذف گزارش‌های local در این نسخه انجام نمی‌شود.
          </p>

          <div className="reports-toolbar">
            <label className="field">
              <span>جستجو در گزارش‌های حساب</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="نام، شهر، کشور یا شناسه گزارش..."
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
              همه گزارش‌های حساب
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
              نمایش {visibleDatabaseSummaries.length.toLocaleString("fa-IR")} از{" "}
              {databaseSummaries.length.toLocaleString("fa-IR")} گزارش اکانتی ·{" "}
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

            <Link className="button secondary" href="/reports">
              گزارش‌های local-preview
            </Link>

            <Link className="button secondary" href="/profile">
              حساب کاربری
            </Link>
          </div>

          {message ? <p className="success-message">{message}</p> : null}
        </div>

        {visibleDatabaseSummaries.length === 0 ? (
          <div className="card">
            <span className="badge">بدون نتیجه</span>

            <h2>گزارشی با این جستجو پیدا نشد</h2>

            <p>جستجو را پاک کن یا فیلتر علاقه‌مندی‌ها را بردار.</p>

            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setSearchInput("");
                setFilterMode("all");
              }}
            >
              نمایش همه گزارش‌های حساب
            </button>
          </div>
        ) : null}

        {visibleDatabaseSummaries.map((summary) => (
          <article className="card" key={summary.id}>
            <span className="badge">Account copy</span>

            <h2>{summary.name ? `گزارش ${summary.name}` : "گزارش ذخیره‌شده در حساب"}</h2>

            <div className="birth-details">
              <span>{summary.birthDate}</span>
              <span>{summary.birthTime}</span>
              <span>
                {summary.birthCity}, {summary.birthCountry}
              </span>
            </div>

            <p>
              ذخیره‌شده در {new Date(summary.createdAt).toLocaleDateString("fa-IR")} ·{" "}
              {summary.visibility} · {summary.source}
              {summary.hasNote ? " · یادداشت دارد" : ""}
              {summary.favorite ? " · علاقه‌مندی" : ""}
            </p>

            <div className="actions">
              <Link
                className="button"
                href={`/reports/${summary.id}?source=account`}
              >
                باز کردن گزارش اکانتی
              </Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  if (isBetaDatabaseSource) {
    if (databaseSummaries.length === 0) {
      return (
        <EmptyState
          badge="Beta database archive"
          title="No beta database reports found"
          description="Save a beta database copy from a report detail page, then return to this guarded archive."
          actionHref="/reports"
          actionLabel="Back to local reports"
        />
      );
    }

    return (
      <section className="grid">
        <div className="card">
          <span className="badge">Beta database archive</span>

          <h1>Beta database report archive</h1>

          <p>
            This guarded view reads saved beta database summaries. Open a report
            to load the full saved copy from the database.
          </p>

          <div className="reports-toolbar">
            <label className="field">
              <span>Search beta database summaries</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Name, city, country, report id..."
              />
            </label>

            <label className="field">
              <span>Sort</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          <div className="filter-tabs">
            <button
              className={filterMode === "all" ? "filter-tab active" : "filter-tab"}
              type="button"
              onClick={() => setFilterMode("all")}
            >
              All beta DB reports
            </button>

            <button
              className={
                filterMode === "favorites" ? "filter-tab active" : "filter-tab"
              }
              type="button"
              onClick={() => setFilterMode("favorites")}
            >
              Favorites ({favoriteCount.toLocaleString("en-US")})
            </button>
          </div>

          <div className="reports-summary-row">
            <span>
              Showing {visibleDatabaseSummaries.length.toLocaleString("en-US")} of {" "}
              {databaseSummaries.length.toLocaleString("en-US")} beta DB reports ? {" "}
              {notesCount.toLocaleString("en-US")} note(s)
            </span>

            {searchInput ? (
              <button
                className="text-button"
                type="button"
                onClick={() => setSearchInput("")}
              >
                Clear search
              </button>
            ) : null}
          </div>

          <div className="actions">
            <Link className="button" href="/reports">
              Back to local reports
            </Link>

            <Link className="button secondary" href="/chart">
              Create new report
            </Link>
          </div>

          {message ? <p className="success-message">{message}</p> : null}
        </div>

        {visibleDatabaseSummaries.length === 0 ? (
          <div className="card">
            <span className="badge">No results</span>

            <h2>No beta database report matched this filter</h2>

            <p>Clear search or switch back to all beta DB reports.</p>

            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setSearchInput("");
                setFilterMode("all");
              }}
            >
              Show all beta DB reports
            </button>
          </div>
        ) : null}

        {visibleDatabaseSummaries.map((summary) => (
          <article className="card" key={summary.id}>
            <span className="badge">Beta database copy</span>

            <h2>{summary.name ? `Report for ${summary.name}` : "Saved beta database report"}</h2>

            <div className="birth-details">
              <span>{summary.birthDate}</span>
              <span>{summary.birthTime}</span>
              <span>
                {summary.birthCity}, {summary.birthCountry}
              </span>
            </div>

            <p>
              Saved {new Date(summary.createdAt).toLocaleDateString("fa-IR")} ? {" "}
              {summary.visibility} ? {summary.source}
              {summary.hasNote ? " ? note" : ""}
              {summary.favorite ? " ? favorite" : ""}
            </p>

            <div className="actions">
              <Link
                className="button"
                href={`/reports/${summary.id}?source=beta-db`}
              >
                Open beta database report
              </Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        badge="شروع آرام"
        title="هنوز گزارشی ذخیره نشده"
        description="از ساخت گزارش تولد شروع کن؛ هالیوس گزارش را فعلاً public/noindex ذخیره می‌کند و بعد همین گزارش در پنل کاربری دیده می‌شود."
        actionHref="/chart"
        actionLabel="ساخت اولین گزارش تولد"
      />
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">گزارش‌های public/noindex</span>

        <h1>گزارش‌های تو</h1>

        <p>
          اینجا برای برگشت سریع به خوانش‌های قبلی است. گزارش‌ها فعلاً روی همین
          دستگاه می‌مانند، اما همین کتابخانه پایه پنل کاربری و ذخیره پایدار
          بعدی خواهد بود.
        </p>

        <div className="report-lifecycle-strip" aria-label="وضعیت گزارش‌ها">
          <span>public/noindex تا تصمیم بعدی</span>
          <span>قابل جستجو و ستاره‌دار</span>
          <span>آماده خروجی گرفتن</span>
          <span>آماده اتصال به حساب کاربری</span>
        </div>

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

          <Link className="button secondary" href="/dashboard">
            رفتن به پنل کاربری
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
              خروجی کامل JSON
            </button>

            <label className="button secondary reports-file-button">
              وارد کردن JSON
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
              خروجی متنی نمایش‌داده‌شده
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={handleExportVisibleJson}
            >
              خروجی JSON نمایش‌داده‌شده
            </button>
          </div>
        </div>

        {message ? <p className="success-message">{message}</p> : null}
      </div>

      {visibleReports.length === 0 ? (
        <div className="card">
          <span className="badge">بدون نتیجه</span>

          <h2>گزارشی با این جستجو پیدا نشد</h2>

          <p>
            عبارت جستجو را کوتاه‌تر کن، فیلتر علاقه‌مندی‌ها را بردار، یا از
            ساخت گزارش جدید شروع کن.
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
