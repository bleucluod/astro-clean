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
  deleteAccountReport,
  getAccountReportReadClientConfig,
  listAccountReportSummaries,
  mutateAccountReport,
} from "@/lib/storage/account-report-read-client";
import type { AstrologyReport } from "@/types/astro";
import type { ReportRecord, ReportRecordSummary } from "@/types/storage";

type مرتب‌سازیMode = "newest" | "oldest";
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
  sortMode: مرتب‌سازیMode;
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
  sortMode: مرتب‌سازیMode,
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
  const [sortMode, setمرتب‌سازیMode] = useState<مرتب‌سازیMode>("newest");
  const [filterMode, setFilterMode] = useState<ReportFilterMode>("all");
  const [accountPage, setAccountPage] = useState(1);
  const [accountTotal, setAccountTotal] = useState(0);

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
      const result = await listAccountReportSummaries(accountPage);

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
      setAccountTotal(result.total);

      return;
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

  async function manageAccountReport(summary: ReportRecordSummary, action: "title" | "enable_sharing" | "revoke_sharing" | "delete") {
    try {
      if (action === "title") {
        const title = window.prompt("عنوان تازهٔ گزارش:", summary.title ?? summary.name ?? "");
        if (title === null) return;
        await mutateAccountReport({ reportId: summary.id, action, title });
      } else if (action === "delete") {
        if (!window.confirm("این گزارش حذف شود؟ پیوند اشتراک آن نیز فوراً از کار می‌افتد.")) return;
        await deleteAccountReport(summary.id);
      } else {
        const result = await mutateAccountReport({ reportId: summary.id, action });
        if (result.sharePath) {
          const url = new URL(result.sharePath, window.location.origin).toString();
          await navigator.clipboard?.writeText(url);
          setMessage("پیوند امن ساخته و کپی شد.");
        }
      }
      await refreshReports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "مدیریت گزارش انجام نشد.");
    }
  }

  // The source switch owns one refresh; request helpers intentionally remain local.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshReports();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportSource, accountPage]);

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

    setMessage("فایل پشتیبان همه گزارش‌ها آماده شد.");
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

    setMessage("فایل پشتیبان گزارش‌های نمایش‌داده‌شده آماده شد.");
  }

  if (!isReady) {
    return (
      <section className="card">
        <span className="badge">در حال آماده‌سازی</span>
        <h1>گزارش‌ها در حال خواندن هستند</h1>
        <p>هالیوس گزارش‌های ذخیره‌شده را آماده می‌کند تا دوباره به خوانش‌های قبلی برگردی.</p>
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
              "برای گزارش‌های حساب، وارد حساب شو و یک گزارش تازه بساز. گزارش‌های حساب برای برگشت ساده‌تر به خوانش‌های بعدی نگه داشته می‌شوند."
            }
            actionHref={accountReadConfig.canAttemptAccountReportRead ? "/chart" : "/profile"}
            actionLabel={accountReadConfig.canAttemptAccountReportRead ? "ساخت گزارش جدید" : "رفتن به حساب"}
          />

          {!accountReadConfig.canAttemptAccountReportRead ? (
            <div className="card">
              <span className="badge">گزارش‌های حساب</span>

              <h2>برای گزارش‌های حساب، وارد حساب شو</h2>

              <p>
                گزارش‌های حساب بعد از ورود در دسترس قرار می‌گیرند. گزارش‌هایی که روی همین دستگاه داری، جداگانه باقی می‌مانند.
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
          <span className="badge">گزارش‌های حساب</span>

          <h1>گزارش‌های وصل‌شده به حساب</h1>

          <p>
            اینجا گزارش‌هایی را می‌بینی که به حساب فعلی تو وصل هستند. برای ساخت گزارش تازه یا برگشت به خوانش‌های قبلی، از همین صفحه شروع کن.
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
                onChange={(event) => setمرتب‌سازیMode(event.target.value as مرتب‌سازیMode)}
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
              {databaseSummaries.length.toLocaleString("fa-IR")} گزارش حساب ·{" "}
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
              گزارش‌های این دستگاه
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
            <span className="badge">گزارش حساب</span>

            <h2>{summary.title ?? (summary.name ? `گزارش ${summary.name}` : "گزارش ذخیره‌شده در حساب")}</h2>

            <div className="birth-details"><span>{summary.reportType ?? "گزارش تولد"}</span><span>{summary.accessTier ?? "رایگان"}</span><span>{summary.visibility === "shared_by_link" ? "قابل مشاهده با پیوند" : "خصوصی"}</span></div>

            <p>
              ذخیره‌شده در {new Date(summary.createdAt).toLocaleDateString("fa-IR")} ·{" "}
              {summary.hasNote ? "یادداشت دارد" : "آماده خواندن"}
              {summary.favorite ? " · علاقه‌مندی" : ""}
            </p>

            <div className="actions">
              <Link
                className="button"
                href={`/reports/${summary.id}?source=account`}
              >
                باز کردن گزارش
              </Link>
              <button className="button secondary" type="button" onClick={() => void manageAccountReport(summary, "title")}>ویرایش عنوان</button>
              {summary.visibility === "shared_by_link" ? (
                <button className="button secondary" type="button" onClick={() => void manageAccountReport(summary, "revoke_sharing")}>لغو اشتراک</button>
              ) : (
                <button className="button secondary" type="button" onClick={() => void manageAccountReport(summary, "enable_sharing")}>ساخت پیوند امن</button>
              )}
              <button className="button secondary" type="button" onClick={() => void manageAccountReport(summary, "delete")}>حذف گزارش</button>
            </div>
          </article>
        ))}
        {accountTotal > 25 ? <nav className="actions" aria-label="صفحه‌بندی گزارش‌ها"><button className="button secondary" type="button" disabled={accountPage <= 1} onClick={() => setAccountPage((page) => Math.max(1, page - 1))}>صفحهٔ قبل</button><span>صفحهٔ {accountPage.toLocaleString("fa-IR")}</span><button className="button secondary" type="button" disabled={accountPage * 25 >= accountTotal} onClick={() => setAccountPage((page) => page + 1)}>صفحهٔ بعد</button></nav> : null}
      </section>
    );
  }

  if (isBetaDatabaseSource) {
    if (databaseSummaries.length === 0) {
      return (
        <EmptyState
          badge="بخش داخلی"
          title="گزارشی در این بخش پیدا نشد"
          description="برای گزارش‌های معمولی به کتابخانه گزارش‌ها برگرد."
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      );
    }

    return (
      <section className="grid">
        <div className="card">
          <span className="badge">بخش داخلی</span>

          <h1>گزارش‌های داخلی</h1>

          <p>
            این بخش برای بررسی داخلی نگه داشته شده است. برای تجربه معمولی، به کتابخانه گزارش‌ها برگرد.
          </p>

          <div className="reports-toolbar">
            <label className="field">
              <span>جستجو در گزارش‌ها</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="نام، شهر یا شناسه گزارش..."
              />
            </label>

            <label className="field">
              <span>مرتب‌سازی</span>
              <select
                value={sortMode}
                onChange={(event) => setمرتب‌سازیMode(event.target.value as مرتب‌سازیMode)}
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
              نمایش {visibleDatabaseSummaries.length.toLocaleString("fa-IR")} از {" "}
              {databaseSummaries.length.toLocaleString("fa-IR")} گزارش · {" "}
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
            <Link className="button" href="/reports">
              بازگشت به گزارش‌ها
            </Link>

            <Link className="button secondary" href="/chart">
              ساخت گزارش جدید
            </Link>
          </div>

          {message ? <p className="success-message">{message}</p> : null}
        </div>

        {visibleDatabaseSummaries.length === 0 ? (
          <div className="card">
            <span className="badge">بدون نتیجه</span>

            <h2>گزارشی با این جستجو پیدا نشد</h2>

            <p>پاک کردن جستجو or switch back to all beta DB reports.</p>

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

        {visibleDatabaseSummaries.map((summary) => (
          <article className="card" key={summary.id}>
            <span className="badge">گزارش داخلی</span>

            <h2>{summary.name ? `گزارش ${summary.name}` : "گزارش ذخیره‌شده"}</h2>

            <div className="birth-details">
              <span>{summary.birthDate}</span>
              <span>{summary.birthTime}</span>
              <span>
                {summary.birthCity}, {summary.birthCountry}
              </span>
            </div>

            <p>
              ذخیره‌شده در {new Date(summary.createdAt).toLocaleDateString("fa-IR")}
              {summary.hasNote ? " · یادداشت دارد" : ""}
              {summary.favorite ? " · علاقه‌مندی" : ""}
            </p>

            <div className="actions">
              <Link
                className="button"
                href={`/reports/${summary.id}?source=beta-db`}
              >
                باز کردن گزارش
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
        description="از ساخت گزارش تولد شروع کن؛ بعد همین‌جا می‌توانی دوباره به خوانش‌های قبلی برگردی."
        actionHref="/chart"
        actionLabel="ساخت اولین گزارش تولد"
      />
    );
  }

  return (
    <section className="grid">
      <div className="card">
        <span className="badge">گزارش‌های من</span>

        <h1>کتابخانه گزارش‌ها</h1>

        <p>
          اینجا برای برگشت سریع به خوانش‌های قبلی است. می‌توانی گزارش‌ها را جستجو کنی، ستاره‌دار کنی، یادداشت بگذاری یا یک گزارش تازه بسازی.
        </p>

        <div className="report-lifecycle-strip" aria-label="وضعیت گزارش‌ها">
          <span>روی همین دستگاه</span>
          <span>قابل جستجو و ستاره‌دار</span>
          <span>برگشت ساده به خوانش‌ها</span>
          <span>حریم گزارش‌ها</span>
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
              onChange={(event) => setمرتب‌سازیMode(event.target.value as مرتب‌سازیMode)}
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
            رفتن به پنل من
          </Link>


          <Link className="button secondary" href="/reports?source=account">
            گزارش‌های حساب
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
              دریافت فایل پشتیبان
            </button>

            <label className="button secondary reports-file-button">
              بازگردانی فایل پشتیبان
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
              دریافت متن گزارش‌ها
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={handleExportVisibleJson}
            >
              دریافت فایل گزارش‌های نمایش‌داده‌شده
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
