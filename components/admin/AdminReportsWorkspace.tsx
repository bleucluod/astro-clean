"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  AdminReportCohortPayload,
  AdminReportFilters,
  AdminReportInsights,
  AdminReportSummary,
} from "@/lib/admin/admin-types";
import { AccessSalesPanel } from "@/components/admin/AccessSalesPanel";
import styles from "./admin-console.module.css";

const OPERATIONS_PAGE_SIZE = 25;
const OVERVIEW_PAGE_SIZE = 10;

const EMPTY_FILTERS: AdminReportFilters = {
  search: "",
  dateFrom: null,
  dateTo: null,
  birthCity: null,
  birthCountry: null,
  reportType: null,
  ownerKind: null,
  accessTier: null,
  visibility: null,
  source: null,
  birthYear: null,
  birthMonth: null,
};

type ReportsWorkspaceView = "overview" | "operations" | "access";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatBytes(value: number) {
  const bytes = Math.max(0, value);
  if (bytes < 1024) return `${bytes.toLocaleString("fa-IR")} B`;
  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} KB`;
  }
  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toLocaleString("fa-IR", {
      maximumFractionDigits: 1,
    })} MB`;
  }
  return `${(bytes / 1024 ** 3).toLocaleString("fa-IR", {
    maximumFractionDigits: 2,
  })} GB`;
}

function formatBirthLine(report: AdminReportSummary) {
  const date = report.birthDate ?? "—";
  const time =
    report.birthTimeAccuracy === "unknown"
      ? "ساعت نامشخص"
      : report.birthTime ?? "ساعت نامشخص";
  return `${date} · ${time}`;
}

function formatBirthPlace(report: AdminReportSummary) {
  return [report.birthCity, report.birthCountry].filter(Boolean).join("، ") || "—";
}

function reportTone(visibility: AdminReportSummary["visibility"]) {
  if (visibility === "public") return "positive";
  if (visibility === "restricted_by_admin") return "danger";
  return "neutral";
}

function buildQuery(
  filters: AdminReportFilters,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function breakdownLabel(key: string) {
  return key === "unknown" ? "نامشخص" : key;
}

function Breakdown({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; count: number }>;
}) {
  return (
    <article className={styles.reportInsightPanel}>
      <strong>{title}</strong>
      <div className={styles.reportBreakdownList}>
        {items.length ? (
          items.map((item) => (
            <div key={item.key}>
              <span>{breakdownLabel(item.key)}</span>
              <b>{item.count.toLocaleString("fa-IR")}</b>
            </div>
          ))
        ) : (
          <small>داده‌ای در این cohort نیست.</small>
        )}
      </div>
    </article>
  );
}

function Trend({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; count: number }>;
}) {
  return (
    <details className={styles.reportTrend}>
      <summary>{title}</summary>
      <div>
        {items.map((item) => (
          <span key={item.key}>
            <time>{item.key}</time>
            <strong>{item.count.toLocaleString("fa-IR")}</strong>
          </span>
        ))}
      </div>
    </details>
  );
}

// HALLEUS_REPORT_COHORT_EXPLORER_R1
// HALLEUS_PREDEPLOY_REPORTS_DAILY_IA_R1
export function AdminReportsWorkspace({
  reportId,
  accessToken,
  canExport = false,
  canDelete = false,
  canManageAccess = false,
  embedded = false,
}: {
  reportId?: string;
  accessToken: string;
  canExport?: boolean;
  canDelete?: boolean;
  canManageAccess?: boolean;
  embedded?: boolean;
}) {
  const [token, setToken] = useState(accessToken);
  const [view, setView] = useState<ReportsWorkspaceView>("overview");
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [draftFilters, setDraftFilters] = useState<AdminReportFilters>(() => ({
    ...EMPTY_FILTERS,
    search: reportId ?? "",
  }));
  const [activeFilters, setActiveFilters] = useState<AdminReportFilters>(() => ({
    ...EMPTY_FILTERS,
    search: reportId ?? "",
  }));
  const [payload, setPayload] = useState<AdminReportCohortPayload | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState<{
    displayName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const effectiveFilters = reportId
    ? activeFilters
    : view === "overview"
      ? EMPTY_FILTERS
      : activeFilters;
  const pageSize =
    reportId || view === "operations"
      ? OPERATIONS_PAGE_SIZE
      : OVERVIEW_PAGE_SIZE;
  const effectivePage = reportId || view === "operations" ? page : 1;
  const query = useMemo(
    () => buildQuery(effectiveFilters, effectivePage, pageSize),
    [effectiveFilters, effectivePage, pageSize],
  );

  async function load(accessToken: string, requestedQuery = query) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports?${requestedQuery}`, {
        cache: "no-store",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const next = (await response.json()) as AdminReportCohortPayload & {
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setReports([]);
          setToken("");
          setContact(null);
        }
        throw new Error(next.error ?? "دریافت گزارش‌ها انجام نشد.");
      }
      setReports(next.reports ?? []);
      setPayload(next);
      setError("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void load(accessToken, query).catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "دسترسی مدیر تأیید نشد.",
          );
          setLoading(false);
        }
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // Query is the complete server cohort contract for this view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, query]);

  async function mutate(
    report: AdminReportSummary,
    action: "restrict_visibility" | "update_title" | "soft_delete",
  ) {
    if (
      action === "soft_delete" &&
      !window.confirm(
        `گزارش «${report.subjectName ?? report.title}» از فهرست فعال حذف شود؟ این اقدام audit می‌شود.`,
      )
    ) {
      return;
    }
    const reason = window.prompt("دلیل این اقدام را ثبت کن:");
    if (!reason?.trim()) return;
    const title =
      action === "update_title" ? window.prompt("عنوان تازه:", report.title) : null;
    if (action === "update_title" && title === null) return;
    const response = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-halleus-admin-origin": window.location.origin,
      },
      body: JSON.stringify({
        action,
        reportId: report.id,
        reason: reason.trim(),
        title,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "اقدام مدیریتی انجام نشد.");
      return;
    }
    setMessage(action === "soft_delete" ? "گزارش از فهرست فعال حذف شد." : "تغییر ذخیره شد.");
    await load(token);
  }

  async function readContact(report: AdminReportSummary) {
    const reason = window.prompt("دلیل مشاهدهٔ اطلاعات تماس را ثبت کن:");
    if (!reason?.trim()) return;
    const response = await fetch(
      `/api/admin/reports/${encodeURIComponent(report.id)}/customer-contact`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ reason: reason.trim() }),
      },
    );
    const result = (await response.json()) as {
      contact?: typeof contact;
      error?: string;
    };
    if (!response.ok) {
      setError(result.error ?? "اطلاعات تماس دریافت نشد.");
      return;
    }
    setContact(result.contact ?? null);
  }

  async function exportActiveCohort() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const exportQuery = buildQuery(activeFilters, 1, OPERATIONS_PAGE_SIZE);
      const response = await fetch(`/api/admin/reports/export?${exportQuery}`, {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        const result = contentType.includes("application/json")
          ? ((await response.json()) as { error?: string })
          : {};
        throw new Error(result.error ?? "خروجی CSV ساخته نشد.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = /filename="([^"]+)"/.exec(disposition);
      const filename =
        filenameMatch?.[1] ??
        `halleus-reports-cohort-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(
        `CSV دقیق cohort فعال آماده شد؛ ${Number(
          response.headers.get("x-halleus-cohort-rows") ?? payload?.total ?? 0,
        ).toLocaleString("fa-IR")} ردیف.`,
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "خروجی CSV ساخته نشد.",
      );
    } finally {
      setLoading(false);
    }
  }

  const detail = reportId ? reports[0] : null;
  const insights: AdminReportInsights | null = payload?.insights ?? null;

  function updateFilter<K extends keyof AdminReportFilters>(
    key: K,
    value: AdminReportFilters[K],
  ) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPage(1);
    setActiveFilters({ ...draftFilters });
  }

  function clearFilters() {
    const next = { ...EMPTY_FILTERS };
    setDraftFilters(next);
    setActiveFilters(next);
    setPage(1);
  }

  function switchView(next: ReportsWorkspaceView) {
    setView(next);
    setPage(1);
    setError("");
    setMessage("");
  }

  return (
    <section className={embedded ? styles.reportEmbeddedWorkspace : styles.standaloneAdminPage}>
      {!embedded ? (
        <header className={styles.standaloneToolbar}>
          <div>
            <span className={styles.eyebrow}>Halleus Admin</span>
            <h1>{reportId ? "جزئیات گزارش" : "گزارش‌ها"}</h1>
            <p>
              {reportId
                ? "دادهٔ مدیریتی گزارش؛ اطلاعات خصوصی فقط با ثبت دلیل."
                : "نمای روزمره کوتاه است؛ تحلیل و خروجی در عملیات قرار دارد."}
            </p>
          </div>
          <Link className={styles.backLink} href="/admini?tab=reports">
            بازگشت به پنل
          </Link>
        </header>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}
      {loading ? <div className={styles.loadingBar}>در حال دریافت داده…</div> : null}

      {contact ? (
        <div className={styles.contactCard}>
          <strong>{contact.displayName ?? "بدون نام"}</strong>
          <span>تلفن: {contact.phone ?? "—"}</span>
          <span>ایمیل: {contact.email ?? "—"}</span>
        </div>
      ) : null}

      {reportId ? (
        detail ? (
          <article className={styles.reportDetailCard}>
            <div className={styles.recordHeader}>
              <div>
                <strong>{detail.title}</strong>
                <small>{detail.ownerDisplayName || detail.ownerUserId}</small>
              </div>
              <span className={styles.statusPill} data-tone={reportTone(detail.visibility)}>
                {detail.visibility}
              </span>
            </div>
            <div className={styles.detailGrid}>
              <div><span>نوع گزارش</span><strong>{detail.reportType}</strong></div>
              <div><span>سوژه</span><strong>{detail.subjectName ?? "—"}</strong></div>
              <div><span>تولد</span><strong>{formatBirthLine(detail)}</strong></div>
              <div><span>محل تولد</span><strong>{formatBirthPlace(detail)}</strong></div>
              <div><span>نوع مالک</span><strong>{detail.ownerKind}</strong></div>
              <div><span>پلن حساب</span><strong>{detail.accountPlan ?? "—"}</strong></div>
              <div><span>دسترسی</span><strong>{detail.accessTier}</strong></div>
              <div><span>منبع</span><strong>{detail.source}</strong></div>
              <div><span>Publication</span><strong>{detail.publicationState}</strong></div>
              <div><span>رضایت انتشار</span><strong>{detail.publicationConsentState}</strong></div>
              <div><span>رضایت هویت</span><strong>{detail.identityConsentState}</strong></div>
              <div><span>حجم row</span><strong>{formatBytes(detail.storageBytes)}</strong></div>
              <div><span>حجم report JSON</span><strong>{formatBytes(detail.reportJsonBytes)}</strong></div>
              <div><span>ساخته‌شده</span><strong>{formatDate(detail.createdAt)}</strong></div>
            </div>
            <div className={styles.recordActions}>
              <button type="button" onClick={() => void readContact(detail)}>مشاهدهٔ ثبت‌شدهٔ اطلاعات تماس</button>
              <button type="button" onClick={() => void mutate(detail, "update_title")}>ویرایش عنوان</button>
              <button type="button" onClick={() => void mutate(detail, "restrict_visibility")}>محدودسازی</button>
              {canDelete ? (
                <button className={styles.dangerButton} type="button" onClick={() => void mutate(detail, "soft_delete")}>
                  حذف گزارش
                </button>
              ) : null}
            </div>
          </article>
        ) : !loading ? (
          <div className={styles.emptyState}>گزارش پیدا نشد.</div>
        ) : null
      ) : (
        <>
          <nav className={styles.adminWorkspaceTabs} aria-label="بخش‌های گزارش‌ها">
            <button
              type="button"
              data-active={view === "overview"}
              onClick={() => switchView("overview")}
            >
              نمای کلی
            </button>
            <button
              type="button"
              data-active={view === "operations"}
              onClick={() => switchView("operations")}
            >
              عملیات
            </button>
            {canManageAccess ? (
              <button
                type="button"
                data-active={view === "access"}
                onClick={() => switchView("access")}
              >
                دسترسی و فروش
              </button>
            ) : null}
          </nav>

          {view === "access" && canManageAccess ? (
            <AccessSalesPanel accessToken={token} />
          ) : view === "overview" ? (
            <div className={styles.reportDailyOverview}>
              <section className={styles.reportOverviewHero}>
                <div>
                  <span className={styles.eyebrow}>نمای روزمره</span>
                  <h3>گزارش‌ها</h3>
                  <p>آخرین گزارش‌ها و عملیات ضروری؛ تحلیل‌های سنگین در تب عملیات‌اند.</p>
                </div>
                <strong>{(payload?.total ?? 0).toLocaleString("fa-IR")}</strong>
                <span>گزارش فعال</span>
              </section>

              <section className={styles.reportRecentSection}>
                <div className={styles.reportSectionHeading}>
                  <div>
                    <h3>۱۰ گزارش آخر</h3>
                    <p>برای جزئیات یا پاک‌کردن گزارش‌های تستی از همین فهرست استفاده کن.</p>
                  </div>
                  <button type="button" onClick={() => void load(token)} disabled={loading}>
                    تازه‌سازی
                  </button>
                </div>

                {reports.length ? (
                  <div className={styles.reportRecentList}>
                    {reports.slice(0, 10).map((report) => (
                      <article className={styles.reportRecentRow} key={report.id}>
                        <div className={styles.reportRecentMain}>
                          <strong>{report.subjectName ?? report.title}</strong>
                          <small>{report.reportType} · {formatDate(report.createdAt)}</small>
                        </div>
                        <div className={styles.reportRecentMeta}>
                          <span>{report.ownerDisplayName || report.ownerUserId || "مهمان"}</span>
                          <span>{report.ownerKind}</span>
                          <span>{report.accessTier}</span>
                          <span>{report.visibility}</span>
                          {report.birthCity ? <span>{report.birthCity}</span> : null}
                        </div>
                        <div className={styles.reportRecentActions}>
                          <Link href={`/admini/reports/${report.id}`}>جزئیات</Link>
                          {canDelete ? (
                            <button
                              className={styles.dangerButton}
                              type="button"
                              onClick={() => void mutate(report, "soft_delete")}
                            >
                              حذف
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : !loading ? (
                  <div className={styles.emptyState}>گزارشی پیدا نشد.</div>
                ) : null}
              </section>
            </div>
          ) : (
            <div className={styles.reportOperationsWorkspace}>
              <section className={styles.reportStorageSummary}>
                <div className={styles.reportSectionHeading}>
                  <div>
                    <span className={styles.eyebrow}>Storage واقعی PostgreSQL</span>
                    <h3>حجم گزارش‌ها</h3>
                    <p>این اعداد از اندازهٔ واقعی rowها می‌آیند؛ هزینهٔ پولی حدس زده نمی‌شود.</p>
                  </div>
                </div>
                {insights ? (
                  <div className={styles.reportStorageGrid}>
                    <article><span>کل cohort</span><strong>{formatBytes(insights.storage.totalBytes)}</strong></article>
                    <article><span>میانگین هر گزارش</span><strong>{formatBytes(insights.storage.averageBytes)}</strong></article>
                    <article><span>میانه</span><strong>{formatBytes(insights.storage.medianBytes)}</strong></article>
                    <article><span>بزرگ‌ترین گزارش</span><strong>{formatBytes(insights.storage.largestBytes)}</strong></article>
                    <article><span>جمع report JSON</span><strong>{formatBytes(insights.storage.reportJsonTotalBytes)}</strong></article>
                    <article><span>تعداد row</span><strong>{insights.storage.rowCount.toLocaleString("fa-IR")}</strong></article>
                  </div>
                ) : null}
              </section>

              <details className={styles.reportCanonicalAccordion}>
                <summary>
                  <div>
                    <span className={styles.eyebrow}>Cohort Explorer</span>
                    <strong>گزارش‌ها بر اساس دادهٔ canonical</strong>
                    <small>
                      cohort فعال: {(payload?.total ?? 0).toLocaleString("fa-IR")} گزارش
                    </small>
                  </div>
                  <span>بازکردن ابزارهای تحلیل</span>
                </summary>

                <div className={styles.reportCanonicalBody}>
                  <section className={styles.reportCohortHeader}>
                    <p>
                      مقدارهای legacy ناقص «نامشخص» می‌مانند و حدس زده نمی‌شوند.
                    </p>
                    {canExport ? (
                      <button type="button" disabled={loading} onClick={() => void exportActiveCohort()}>
                        Export CSV همین cohort
                      </button>
                    ) : null}
                  </section>

                  <form
                    className={styles.reportFilterGrid}
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyFilters();
                    }}
                  >
                    <label className={styles.reportFilterWide}>
                      جست‌وجو
                      <input
                        value={draftFilters.search}
                        onChange={(event) => updateFilter("search", event.target.value)}
                        placeholder="شناسه، عنوان، سوژه، صاحب حساب، شهر یا کشور"
                      />
                    </label>
                    <label>نوع گزارش<select value={draftFilters.reportType ?? ""} onChange={(event) => updateFilter("reportType", event.target.value || null)}><option value="">همه</option>{payload?.options.reportTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label>Guest / Account<select value={draftFilters.ownerKind ?? ""} onChange={(event) => updateFilter("ownerKind", event.target.value || null)}><option value="">همه</option>{payload?.options.ownerKinds.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label>Free / Premium<select value={draftFilters.accessTier ?? ""} onChange={(event) => updateFilter("accessTier", event.target.value || null)}><option value="">همه</option>{payload?.options.accessTiers.map((value) => <option key={value}>{value}</option>)}</select></label>
                    <label>از تاریخ<input type="date" value={draftFilters.dateFrom ?? ""} onChange={(event) => updateFilter("dateFrom", event.target.value || null)} /></label>
                    <label>تا تاریخ<input type="date" value={draftFilters.dateTo ?? ""} onChange={(event) => updateFilter("dateTo", event.target.value || null)} /></label>

                    <details className={styles.reportMoreFilters}>
                      <summary>فیلترهای بیشتر</summary>
                      <div>
                        <label>Visibility<select value={draftFilters.visibility ?? ""} onChange={(event) => updateFilter("visibility", event.target.value || null)}><option value="">همه</option>{payload?.options.visibilities.map((value) => <option key={value}>{value}</option>)}</select></label>
                        <label>Source<select value={draftFilters.source ?? ""} onChange={(event) => updateFilter("source", event.target.value || null)}><option value="">همه</option>{payload?.options.sources.map((value) => <option key={value}>{value}</option>)}</select></label>
                        <label>شهر تولد<select value={draftFilters.birthCity ?? ""} onChange={(event) => updateFilter("birthCity", event.target.value || null)}><option value="">همه</option>{payload?.options.birthCities.map((value) => <option key={value}>{value}</option>)}</select></label>
                        <label>کشور تولد<select value={draftFilters.birthCountry ?? ""} onChange={(event) => updateFilter("birthCountry", event.target.value || null)}><option value="">همه</option>{payload?.options.birthCountries.map((value) => <option key={value}>{value}</option>)}</select></label>
                        <label>سال تولد<select value={draftFilters.birthYear ?? ""} onChange={(event) => updateFilter("birthYear", event.target.value || null)}><option value="">همه</option>{payload?.options.birthYears.map((value) => <option key={value}>{value}</option>)}</select></label>
                        <label>ماه تولد<select value={draftFilters.birthMonth ?? ""} onChange={(event) => updateFilter("birthMonth", event.target.value || null)}><option value="">همه</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => <option key={value}>{value}</option>)}</select></label>
                      </div>
                    </details>

                    <div className={styles.reportFilterActions}>
                      <button type="submit">اعمال فیلترها</button>
                      <button type="button" onClick={clearFilters}>پاک‌کردن</button>
                    </div>
                  </form>

                  {insights ? (
                    <>
                      <section className={styles.reportMetricGrid}>
                        <article><span>امروز</span><strong>{insights.volume.today.toLocaleString("fa-IR")}</strong></article>
                        <article><span>۷ روز</span><strong>{insights.volume.last7Days.toLocaleString("fa-IR")}</strong></article>
                        <article><span>۳۰ روز</span><strong>{insights.volume.last30Days.toLocaleString("fa-IR")}</strong></article>
                        <article><span>کل cohort</span><strong>{insights.volume.total.toLocaleString("fa-IR")}</strong></article>
                        <article><span>سازندهٔ یکتا</span><strong>{insights.uniqueCreators.toLocaleString("fa-IR")}</strong></article>
                        <article><span>میانگین گزارش / حساب</span><strong>{insights.accountFrequency.averageReportsPerAccount.toLocaleString("fa-IR")}</strong></article>
                        <article><span>حساب تک‌گزارشی</span><strong>{insights.accountFrequency.oneReportAccounts.toLocaleString("fa-IR")}</strong></article>
                        <article><span>حساب چندگزارشی</span><strong>{insights.accountFrequency.multiReportAccounts.toLocaleString("fa-IR")}</strong></article>
                      </section>

                      <section className={styles.reportInsightsGrid}>
                        <Breakdown title="نوع گزارش" items={insights.byReportType} />
                        <Breakdown title="Free / Premium" items={insights.byAccessTier} />
                        <Breakdown title="Guest / Account" items={insights.byOwnerKind} />
                        <Breakdown title="شهرهای تولد" items={insights.topBirthCities} />
                        <Breakdown title="کشورهای تولد" items={insights.topBirthCountries} />
                        <Breakdown title="ماه تولد" items={insights.birthMonths} />
                      </section>

                      <section className={styles.reportTrendGrid}>
                        <Trend title="روند روزانه · ۳۰ نقطهٔ آخر" items={insights.trends.daily} />
                        <Trend title="روند هفتگی · ۱۲ هفتهٔ آخر" items={insights.trends.weekly} />
                        <Trend title="روند ماهانه · ۱۲ ماه آخر" items={insights.trends.monthly} />
                        <details className={styles.reportTrend}>
                          <summary>توزیع سال تولد</summary>
                          <div>
                            {insights.birthYears.map((item) => (
                              <span key={item.key}><time>{item.key}</time><strong>{item.count.toLocaleString("fa-IR")}</strong></span>
                            ))}
                          </div>
                        </details>
                      </section>
                    </>
                  ) : null}

                  {reports.length ? (
                    <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
                      <table>
                        <thead>
                          <tr>
                            <th>نوع / سوژه</th>
                            <th>تولد</th>
                            <th>محل تولد</th>
                            <th>مالک</th>
                            <th>Tier / Visibility</th>
                            <th>حجم</th>
                            <th>تاریخ</th>
                            <th>عملیات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((report) => (
                            <tr key={report.id}>
                              <td><strong>{report.subjectName ?? "—"}</strong><small>{report.reportType} · {report.title}</small></td>
                              <td>{formatBirthLine(report)}</td>
                              <td>{formatBirthPlace(report)}</td>
                              <td>{(report.ownerDisplayName ?? report.ownerUserId) || "—"}<small>{report.ownerKind} · {report.accountPlan ?? "—"}</small></td>
                              <td><span className={styles.statusPill} data-tone={reportTone(report.visibility)}>{report.visibility}</span><small>{report.accessTier}</small></td>
                              <td>{formatBytes(report.storageBytes)}<small>JSON {formatBytes(report.reportJsonBytes)}</small></td>
                              <td>{formatDate(report.createdAt)}</td>
                              <td><Link href={`/admini/reports/${report.id}`}>جزئیات</Link></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : !loading ? (
                    <div className={styles.emptyState}>در cohort فعال گزارشی نیست.</div>
                  ) : null}

                  <nav className={styles.paginator} aria-label="صفحه‌بندی cohort گزارش‌ها">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>صفحهٔ قبل</button>
                    <span>صفحهٔ {page.toLocaleString("fa-IR")} از {(payload?.totalPages ?? 1).toLocaleString("fa-IR")}</span>
                    <button type="button" disabled={page >= (payload?.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)}>صفحهٔ بعد</button>
                  </nav>
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </section>
  );
}
