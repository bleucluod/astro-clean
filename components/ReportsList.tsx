"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import styles from "@/app/reports/reports-page.module.css";
import { decodeReportRecords } from "@/lib/storage/report-record-migration";
import { createReportRecord } from "@/lib/storage/report-records";
import { getReportRepository } from "@/lib/storage/report-repository";
import {
  deleteAccountReport,
  getAccountReportReadClientConfig,
  listAccountReportSummaries,
  mutateAccountReport,
  type AccountReportReadStatus,
} from "@/lib/storage/account-report-read-client";
import {
  getReportReadingProgress,
  getReportReadingSectionLabel,
} from "@/lib/storage/report-journey-client";
import type { AstrologyReport } from "@/types/astro";
import type { ReportRecord, ReportRecordSummary } from "@/types/storage";

type SortMode = "newest" | "oldest";
type ReportFilterMode = "all" | "favorites" | "natal" | "comparison";
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

function downloadArchiveFile(fileName: string, data: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType });
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

function redactArchiveText(value: string, report: AstrologyReport) {
  const privateTokens = [
    report.input.name,
    report.input.birthDate,
    report.input.birthTime,
    report.input.birthCity,
    report.input.birthCountry,
  ]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item && item.length > 1));

  return privateTokens.reduce(
    (current, token) => current.split(token).join("—"),
    value,
  );
}

function createReportsArchiveText(reports: AstrologyReport[]) {
  return reports
    .map((report, index) =>
      [
        `# ${index + 1}`,
        "خلاصه امن گزارش هالیوس",
        "",
        redactArchiveText(report.summary, report),
        "",
        "نام، تاریخ، ساعت، شهر تولد، یادداشت شخصی و داده فنی خام حذف شده‌اند.",
      ].join("\n"),
    )
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
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    isRecord(value.input) &&
    isRecord(value.chart) &&
    typeof value.summary === "string" &&
    Array.isArray(value.interpretations) &&
    typeof value.safetyNote === "string"
  );
}

function extractReportsFromImportPayload(payload: unknown): AstrologyReport[] {
  if (Array.isArray(payload)) return payload.filter(isReportLike);
  if (isReportLike(payload)) return [payload];
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.reports)) return payload.reports.filter(isReportLike);
  if (isReportLike(payload.report)) return [payload.report];
  return [];
}

function createReportNotesMap(records: ReportRecord[]) {
  const notes: ReportNotesMap = {};

  for (const record of records) {
    const note = record.note?.trim();
    if (note) notes[record.id] = note;
  }

  return notes;
}

function reportMatchesSearch(
  report: AstrologyReport,
  reportNote: string,
  searchTerm: string,
) {
  if (!searchTerm) return true;
  return `${JSON.stringify(report)} ${reportNote}`.toLowerCase().includes(searchTerm);
}

function databaseSummaryMatchesSearch(
  summary: ReportRecordSummary,
  searchTerm: string,
) {
  if (!searchTerm) return true;

  return [
    summary.id,
    summary.title ?? "",
    summary.name ?? "",
    summary.birthDate,
    summary.birthTime,
    summary.birthCity,
    summary.birthCountry,
    summary.visibility,
    summary.source,
    summary.reportType ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(searchTerm);
}

function summaryMatchesFilter(
  summary: ReportRecordSummary,
  filterMode: ReportFilterMode,
) {
  if (filterMode === "favorites") return summary.favorite;
  if (filterMode === "comparison") return summary.reportType === "comparison";
  if (filterMode === "natal") return summary.reportType !== "comparison";
  return true;
}

function localMatchesFilter(
  reportId: string,
  favoriteReportIds: string[],
  filterMode: ReportFilterMode,
) {
  if (filterMode === "favorites") return favoriteReportIds.includes(reportId);
  if (filterMode === "comparison") return false;
  return true;
}

function reportTypeLabel(summary: ReportRecordSummary) {
  return summary.reportType === "comparison" ? "تحلیل رابطه" : "گزارش تولد";
}

function reportHref(summary: ReportRecordSummary) {
  return summary.reportType === "comparison"
    ? `/compare/${summary.id}`
    : `/reports/${summary.id}?source=account`;
}

function accessTierLabel(accessTier?: string) {
  if (accessTier === "premium") return "Premium";
  if (accessTier === "preview") return "پیش‌نمایش";
  return "رایگان";
}

function visibilityLabel(summary: ReportRecordSummary) {
  if (summary.reportType === "comparison") return "خصوصی";

  switch (summary.visibility) {
    case "public":
      return "عمومی";
    case "shared_by_link":
      return "لینک امن فعال";
    case "unpublished":
      return "از حالت عمومی خارج شده";
    case "restricted_by_admin":
      return "محدود";
    default:
      return "خصوصی";
  }
}

function visibilityClass(summary: ReportRecordSummary) {
  if (summary.reportType === "comparison" || summary.visibility === "private") {
    return styles.statusPrivate;
  }
  if (summary.visibility === "public") return styles.statusPublic;
  if (summary.visibility === "shared_by_link") return styles.statusShared;
  return styles.statusMuted;
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function LibraryEmptyState({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className={styles.emptyState}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.emptyActions}>
        <Link className={styles.primaryAction} href={actionHref}>
          {actionLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link className={styles.secondaryAction} href={secondaryHref}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
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
  const [accountPage, setAccountPage] = useState(1);
  const [accountTotal, setAccountTotal] = useState(0);
  const [accountStatus, setAccountStatus] = useState<AccountReportReadStatus | null>(null);

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
  const natalCount = databaseSummaries.filter(
    (summary) => summary.reportType !== "comparison",
  ).length;
  const comparisonCount = databaseSummaries.filter(
    (summary) => summary.reportType === "comparison",
  ).length;

  const visibleReports = useMemo(() => {
    const filteredReports = reports.filter(
      (report) =>
        localMatchesFilter(report.id, favoriteReportIds, filterMode) &&
        reportMatchesSearch(report, reportNotes[report.id] ?? "", searchTerm),
    );

    return sortMode === "oldest" ? [...filteredReports].reverse() : filteredReports;
  }, [favoriteReportIds, filterMode, reportNotes, reports, searchTerm, sortMode]);

  const visibleDatabaseSummaries = useMemo(() => {
    const filteredSummaries = databaseSummaries.filter(
      (summary) =>
        summaryMatchesFilter(summary, filterMode) &&
        databaseSummaryMatchesSearch(summary, searchTerm),
    );

    return [...filteredSummaries].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [databaseSummaries, filterMode, searchTerm, sortMode]);

  async function refreshReports() {
    if (isAccountSource) {
      const result = await listAccountReportSummaries(accountPage);

      setAccountStatus(result.status);
      setDatabaseSummaries(result.summaries);
      setReports([]);
      setFavoriteReportIds(
        result.summaries.filter((summary) => summary.favorite).map((summary) => summary.id),
      );
      setReportNotes({});
      setIsReady(true);
      setMessage(result.status === "account-read-ready" ? "" : result.message);
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
        payload.summaries.filter((summary) => summary.favorite).map((summary) => summary.id),
      );
      setReportNotes({});
      setMessage("");
      setIsReady(true);
      return;
    }

    setAccountStatus(null);
    setDatabaseSummaries([]);
    const records = await reportRepository.listReports();

    setReports(records.map((record) => record.report));
    setFavoriteReportIds(
      records.filter((record) => record.favorite).map((record) => record.id),
    );
    setReportNotes(createReportNotesMap(records));
    setMessage("");
    setIsReady(true);
  }

  async function manageAccountReport(
    summary: ReportRecordSummary,
    action: "title" | "favorite" | "enable_sharing" | "revoke_sharing" | "delete",
  ) {
    try {
      let nextMessage = "";

      if (action === "title") {
        const title = window.prompt(
          "عنوان تازهٔ گزارش:",
          summary.title ?? summary.name ?? "",
        );
        if (title === null) return;
        await mutateAccountReport({ reportId: summary.id, action, title });
        nextMessage = "عنوان گزارش به‌روزرسانی شد.";
      } else if (action === "favorite") {
        await mutateAccountReport({
          reportId: summary.id,
          action,
          favorite: !summary.favorite,
        });
        nextMessage = summary.favorite
          ? "گزارش از علاقه‌مندی‌ها حذف شد."
          : "گزارش به علاقه‌مندی‌ها اضافه شد.";
      } else if (action === "delete") {
        if (!window.confirm("این گزارش حذف شود؟ اگر لینک اشتراک داشته باشد، همان لینک هم از کار می‌افتد.")) {
          return;
        }
        await deleteAccountReport(summary.id);
        nextMessage = "گزارش حذف شد.";
      } else {
        const result = await mutateAccountReport({ reportId: summary.id, action });
        if (result.sharePath) {
          const url = new URL(result.sharePath, window.location.origin).toString();
          await navigator.clipboard?.writeText(url);
          nextMessage = "لینک امن ساخته و کپی شد.";
        } else {
          nextMessage = "لینک امن غیرفعال شد.";
        }
      }

      await refreshReports();
      setMessage(nextMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "مدیریت گزارش انجام نشد.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilterMode("all");
      setSearchInput("");
      void refreshReports();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportSource, accountPage]);

  async function handleToggleFavorite(reportId: string) {
    const shouldBeFavorite = !favoriteReportIds.includes(reportId);
    await reportRepository.setFavorite(reportId, shouldBeFavorite);
    await refreshReports();
    notifyLocalDataChanged();
    setMessage(
      shouldBeFavorite
        ? "گزارش به علاقه‌مندی‌ها اضافه شد."
        : "گزارش از علاقه‌مندی‌ها حذف شد.",
    );
  }

  async function handleEditLocalNote(reportId: string) {
    const currentNote = reportNotes[reportId] ?? "";
    const nextNote = window.prompt("یادداشت شخصی برای این گزارش:", currentNote);
    if (nextNote === null) return;

    await reportRepository.setNote(reportId, nextNote.trim());
    await refreshReports();
    notifyLocalDataChanged();
    setMessage(nextNote.trim() ? "یادداشت ذخیره شد." : "یادداشت این گزارش پاک شد.");
  }

  async function handleDeleteReport(reportId: string) {
    if (!window.confirm("این گزارش از همین دستگاه حذف شود؟")) return;

    await reportRepository.deleteReport(reportId);
    notifyLocalDataChanged();
    await refreshReports();
    setMessage("گزارش از این دستگاه حذف شد.");
  }

  async function handleClearReports() {
    if (!window.confirm("همهٔ گزارش‌های ذخیره‌شده روی این دستگاه پاک شوند؟")) return;

    await reportRepository.clearReports();
    notifyLocalDataChanged();
    await refreshReports();
    setSearchInput("");
    setFilterMode("all");
    setMessage("همهٔ گزارش‌های این دستگاه پاک شدند.");
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
    setMessage("فایل پشتیبان همهٔ گزارش‌های این دستگاه آماده شد.");
  }

  async function handleImportReports(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

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
          ? `${result.imported.toLocaleString("fa-IR")} گزارش وارد شد.`
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
      createReportsArchiveText(visibleReports),
      "text/plain;charset=utf-8",
    );
    setMessage("متن امن گزارش‌های نمایش‌داده‌شده آماده شد.");
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
    setMessage("پشتیبان خصوصی گزارش‌های نمایش‌داده‌شده آماده شد.");
  }

  if (!isReady) {
    return (
      <section className={styles.loadingState} aria-live="polite">
        <span className={styles.eyebrow}>گزارش‌های من</span>
        <h2>داریم کتابخانه‌ات را آماده می‌کنیم</h2>
        <p>گزارش‌های ذخیره‌شده در حال خواندن‌اند.</p>
      </section>
    );
  }

  if (isAccountSource) {
    if (databaseSummaries.length === 0) {
      const needsAccount =
        !accountReadConfig.canAttemptAccountReportRead || accountStatus === "not-authenticated";
      const loadFailed = accountStatus === "account-read-failed";

      return (
        <LibraryEmptyState
          eyebrow="گزارش‌های حساب"
          title={
            needsAccount
              ? "برای دیدن گزارش‌های حسابت وارد شو"
              : loadFailed
                ? "گزارش‌های حساب بارگذاری نشد"
                : "هنوز گزارشی در حسابت نیست"
          }
          description={
            needsAccount
              ? "بعد از ورود، گزارش‌هایی که به حسابت وصل شده‌اند از همین‌جا در دسترس خواهند بود. گزارش‌های این دستگاه هم جداگانه باقی می‌مانند."
              : loadFailed
                ? "ارتباط با گزارش‌های حساب در این لحظه برقرار نشد. می‌توانی گزارش‌های همین دستگاه را ببینی یا بعداً دوباره برگردی."
                : "اولین گزارش را بساز؛ بعد از ذخیره، سریع‌ترین مسیر برگشت به آن همین صفحه است."
          }
          actionHref={needsAccount ? "/profile" : loadFailed ? "/reports?source=local" : "/chart"}
          actionLabel={needsAccount ? "ورود به حساب" : loadFailed ? "گزارش‌های این دستگاه" : "ساخت اولین گزارش"}
          secondaryHref={needsAccount ? "/reports?source=local" : undefined}
          secondaryLabel={needsAccount ? "گزارش‌های این دستگاه" : undefined}
        />
      );
    }

    return (
      <section className={styles.library} aria-labelledby="account-reports-title">
        <div className={styles.libraryHeader}>
          <div>
            <span className={styles.eyebrow}>گزارش‌های حساب</span>
            <h2 id="account-reports-title">گزارش‌های وصل‌شده به حسابت</h2>
            <p>جستجو کن، فیلتر کن و از همان جایی که لازم داری ادامه بده.</p>
          </div>
          <span className={styles.totalCount}>{accountTotal.toLocaleString("fa-IR")} گزارش</span>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.field}>
            <span>جستجو</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="عنوان، نام، شهر یا شناسه گزارش..."
            />
          </label>
          <label className={styles.field}>
            <span>مرتب‌سازی</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="newest">جدیدترین اول</option>
              <option value="oldest">قدیمی‌ترین اول</option>
            </select>
          </label>
        </div>

        <div className={styles.filterRow} aria-label="فیلتر گزارش‌های حساب">
          <button className={filterMode === "all" ? styles.filterButtonActive : styles.filterButton} type="button" onClick={() => setFilterMode("all")}>همه</button>
          <button className={filterMode === "favorites" ? styles.filterButtonActive : styles.filterButton} type="button" onClick={() => setFilterMode("favorites")}>علاقه‌مندی‌ها ({favoriteCount.toLocaleString("fa-IR")})</button>
          <button className={filterMode === "natal" ? styles.filterButtonActive : styles.filterButton} type="button" onClick={() => setFilterMode("natal")}>گزارش تولد ({natalCount.toLocaleString("fa-IR")})</button>
          <button className={filterMode === "comparison" ? styles.filterButtonActive : styles.filterButton} type="button" onClick={() => setFilterMode("comparison")}>تحلیل رابطه ({comparisonCount.toLocaleString("fa-IR")})</button>
        </div>

        <div className={styles.summaryRow}>
          <span>{visibleDatabaseSummaries.length.toLocaleString("fa-IR")} گزارش در این نما</span>
          {searchInput ? <button className={styles.clearButton} type="button" onClick={() => setSearchInput("")}>پاک کردن جستجو</button> : null}
        </div>

        {message ? <p className={styles.notice} role="status">{message}</p> : null}

        {visibleDatabaseSummaries.length === 0 ? (
          <LibraryEmptyState
            eyebrow="بدون نتیجه"
            title="گزارشی با این فیلتر پیدا نشد"
            description="جستجو را پاک کن یا یکی از فیلترهای دیگر را انتخاب کن."
            actionHref="/reports"
            actionLabel="نمایش همهٔ گزارش‌های حساب"
          />
        ) : (
          <div className={styles.cardsGrid}>
            {visibleDatabaseSummaries.map((summary) => {
              const isComparison = summary.reportType === "comparison";

              return (
                <article className={styles.reportCard} key={summary.id}>
                  <header className={styles.cardTop}>
                    <div>
                      <span className={styles.cardKicker}>{reportTypeLabel(summary)}</span>
                      <h3>{summary.title ?? (summary.name ? `گزارش ${summary.name}` : isComparison ? "تحلیل رابطه" : "گزارش ذخیره‌شده")}</h3>
                    </div>
                    <time>{formatCreatedAt(summary.createdAt)}</time>
                  </header>

                  <div className={styles.metaRow}>
                    <span className={styles.metaPill}>{accessTierLabel(summary.accessTier)}</span>
                    <span className={`${styles.statusPill} ${visibilityClass(summary)}`}>{visibilityLabel(summary)}</span>
                    {summary.favorite ? <span className={styles.metaPill}>علاقه‌مندی</span> : null}
                    {summary.hasNote ? <span className={styles.metaPill}>یادداشت دارد</span> : null}
                  </div>

                  <p className={styles.cardContext}>
                    {isComparison
                      ? "تحلیل رابطه برای همین حساب ذخیره شده و مسیر عمومی اشتراک‌گذاری ندارد."
                      : summary.birthCity
                        ? `گزارش تولد مرتبط با ${summary.birthCity}`
                        : "گزارش تولد ذخیره‌شده در حساب"}
                  </p>

                  <footer className={styles.cardFooter}>
                    <Link className={styles.openAction} href={reportHref(summary)} prefetch={false}>
                      {isComparison ? "باز کردن تحلیل" : "باز کردن گزارش"}
                    </Link>
                    <details className={styles.actionMenu}>
                      <summary aria-label="مدیریت گزارش">⋯ <span>مدیریت</span></summary>
                      <div className={styles.actionMenuPanel}>
                        <button type="button" onClick={() => void manageAccountReport(summary, "favorite")}>{summary.favorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}</button>
                        <button type="button" onClick={() => void manageAccountReport(summary, "title")}>ویرایش عنوان</button>
                        {!isComparison ? (
                          summary.visibility === "shared_by_link" ? (
                            <button type="button" onClick={() => void manageAccountReport(summary, "revoke_sharing")}>غیرفعال‌کردن لینک امن</button>
                          ) : (
                            <button type="button" onClick={() => void manageAccountReport(summary, "enable_sharing")}>ساخت لینک امن</button>
                          )
                        ) : null}
                        <button className={styles.menuDanger} type="button" onClick={() => void manageAccountReport(summary, "delete")}>حذف گزارش</button>
                      </div>
                    </details>
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {accountTotal > 25 ? (
          <nav className={styles.pagination} aria-label="صفحه‌بندی گزارش‌های حساب">
            <button type="button" disabled={accountPage <= 1} onClick={() => setAccountPage((page) => Math.max(1, page - 1))}>صفحهٔ قبل</button>
            <span>صفحهٔ {accountPage.toLocaleString("fa-IR")}</span>
            <button type="button" disabled={accountPage * 25 >= accountTotal} onClick={() => setAccountPage((page) => page + 1)}>صفحهٔ بعد</button>
          </nav>
        ) : null}
      </section>
    );
  }

  if (isBetaDatabaseSource) {
    if (databaseSummaries.length === 0) {
      return (
        <LibraryEmptyState
          eyebrow="بخش داخلی"
          title="گزارشی در این بخش پیدا نشد"
          description="برای گزارش‌های معمولی به کتابخانه گزارش‌ها برگرد."
          actionHref="/reports"
          actionLabel="بازگشت به گزارش‌ها"
        />
      );
    }

    return (
      <section className={styles.library} aria-labelledby="internal-reports-title">
        <div className={styles.libraryHeader}>
          <div>
            <span className={styles.eyebrow}>بخش داخلی</span>
            <h2 id="internal-reports-title">گزارش‌های داخلی</h2>
          </div>
        </div>
        <div className={styles.cardsGrid}>
          {visibleDatabaseSummaries.map((summary) => (
            <article className={styles.reportCard} key={summary.id}>
              <header className={styles.cardTop}>
                <div><span className={styles.cardKicker}>گزارش داخلی</span><h3>{summary.name ? `گزارش ${summary.name}` : "گزارش ذخیره‌شده"}</h3></div>
                <time>{formatCreatedAt(summary.createdAt)}</time>
              </header>
              <Link className={styles.openAction} href={`/reports/${summary.id}?source=beta-db`}>باز کردن گزارش</Link>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (reports.length === 0) {
    return (
      <LibraryEmptyState
        eyebrow="گزارش‌های این دستگاه"
        title="هنوز گزارشی روی این دستگاه ذخیره نشده"
        description="از ساخت گزارش تولد شروع کن؛ بعد همین‌جا می‌توانی دوباره به خوانش قبلی برگردی."
        actionHref="/chart"
        actionLabel="ساخت اولین گزارش"
        secondaryHref="/reports"
        secondaryLabel="گزارش‌های حساب"
      />
    );
  }

  return (
    <section className={styles.library} aria-labelledby="local-reports-title">
      <div className={styles.libraryHeader}>
        <div>
          <span className={styles.eyebrow}>روی همین دستگاه</span>
          <h2 id="local-reports-title">گزارش‌های این دستگاه</h2>
          <p>این گزارش‌ها در همین مرورگر نگه داشته شده‌اند و از گزارش‌های حساب جدا هستند.</p>
        </div>
        <span className={styles.totalCount}>{reports.length.toLocaleString("fa-IR")} گزارش</span>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>جستجو در گزارش‌ها و یادداشت‌ها</span>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="نام، شهر، متن گزارش یا یادداشت..." />
        </label>
        <label className={styles.field}>
          <span>مرتب‌سازی</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="newest">جدیدترین اول</option>
            <option value="oldest">قدیمی‌ترین اول</option>
          </select>
        </label>
      </div>

      <div className={styles.filterRow} aria-label="فیلتر گزارش‌های این دستگاه">
        <button className={filterMode === "all" ? styles.filterButtonActive : styles.filterButton} type="button" onClick={() => setFilterMode("all")}>همه</button>
        <button className={filterMode === "favorites" ? styles.filterButtonActive : styles.filterButton} type="button" onClick={() => setFilterMode("favorites")}>علاقه‌مندی‌ها ({favoriteCount.toLocaleString("fa-IR")})</button>
      </div>

      <div className={styles.summaryRow}>
        <span>{visibleReports.length.toLocaleString("fa-IR")} گزارش در این نما · {notesCount.toLocaleString("fa-IR")} یادداشت</span>
        {searchInput ? <button className={styles.clearButton} type="button" onClick={() => setSearchInput("")}>پاک کردن جستجو</button> : null}
      </div>

      {message ? <p className={styles.notice} role="status">{message}</p> : null}

      {visibleReports.length === 0 ? (
        <LibraryEmptyState
          eyebrow="بدون نتیجه"
          title="گزارشی با این فیلتر پیدا نشد"
          description="جستجو را پاک کن یا فیلتر علاقه‌مندی‌ها را بردار."
          actionHref="/reports?source=local"
          actionLabel="نمایش همهٔ گزارش‌های این دستگاه"
        />
      ) : (
        <div className={styles.cardsGrid}>
          {visibleReports.map((report) => {
            const isFavorite = favoriteReportIds.includes(report.id);
            const hasNote = Boolean(reportNotes[report.id]);
            const progress = getReportReadingProgress("local", report.id);
            const title = report.input.name?.trim()
              ? `گزارش چارت تولد ${report.input.name.trim()}`
              : "گزارش چارت تولد";

            return (
              <article className={styles.reportCard} key={report.id}>
                <header className={styles.cardTop}>
                  <div>
                    <span className={styles.cardKicker}>{report.realEngine ? "گزارش محاسبه‌شده" : "گزارش ذخیره‌شده"}</span>
                    <h3>{title}</h3>
                  </div>
                  <time>{formatCreatedAt(report.createdAt)}</time>
                </header>

                <p className={styles.cardSummary}>{report.summary}</p>

                <div className={styles.metaRow}>
                  <span className={`${styles.statusPill} ${styles.statusDevice}`}>روی همین دستگاه</span>
                  {report.input.birthCity ? <span className={styles.metaPill}>{report.input.birthCity}</span> : null}
                  {isFavorite ? <span className={styles.metaPill}>علاقه‌مندی</span> : null}
                  {hasNote ? <span className={styles.metaPill}>یادداشت دارد</span> : null}
                  {progress ? <span className={styles.metaPill}>ادامه از {getReportReadingSectionLabel(progress.sectionId)}</span> : null}
                </div>

                {hasNote ? <p className={styles.notePreview}>یادداشت: {reportNotes[report.id]}</p> : null}

                <footer className={styles.cardFooter}>
                  <Link className={styles.openAction} href={`/reports/${report.id}`}>
                    {progress ? "ادامه مطالعه" : "باز کردن گزارش"}
                  </Link>
                  <details className={styles.actionMenu}>
                    <summary aria-label="مدیریت گزارش">⋯ <span>مدیریت</span></summary>
                    <div className={styles.actionMenuPanel}>
                      <button type="button" onClick={() => void handleToggleFavorite(report.id)}>{isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}</button>
                      <button type="button" onClick={() => void handleEditLocalNote(report.id)}>{hasNote ? "ویرایش یادداشت" : "افزودن یادداشت"}</button>
                      <button className={styles.menuDanger} type="button" onClick={() => void handleDeleteReport(report.id)}>حذف از این دستگاه</button>
                    </div>
                  </details>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <details className={styles.dataTools}>
        <summary>پشتیبان و مدیریت داده‌های این دستگاه</summary>
        <div className={styles.dataToolsBody}>
          <p>از گزارش‌های محلی نسخه پشتیبان بگیر، فایل قبلی را برگردان یا یک خروجی متنی بدون اطلاعات تولد بساز.</p>
          <div className={styles.dataToolsGrid}>
            <button type="button" onClick={handleExportAllJson}>دریافت فایل پشتیبان</button>
            <label className={styles.fileButton}>بازگردانی فایل پشتیبان<input className={styles.hiddenFileInput} type="file" accept="application/json,.json" onChange={handleImportReports} /></label>
            <button type="button" onClick={handleExportVisibleText}>متن امن بدون اطلاعات تولد</button>
            <button type="button" onClick={handleExportVisibleJson}>پشتیبان گزارش‌های نمایش‌داده‌شده</button>
            <button className={styles.dangerButton} type="button" onClick={() => void handleClearReports()}>پاک کردن همهٔ گزارش‌های این دستگاه</button>
          </div>
        </div>
      </details>
    </section>
  );
}
