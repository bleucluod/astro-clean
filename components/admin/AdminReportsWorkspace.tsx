"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminReportSummary } from "@/lib/admin/admin-types";
import styles from "./admin-console.module.css";

const PAGE_SIZE = 25;

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatBirthLine(report: AdminReportSummary) {
  const date = report.birthDate ?? "—";
  const time = report.birthTimeAccuracy === "unknown"
    ? "ساعت نامشخص"
    : report.birthTime ?? "ساعت نامشخص";
  return `${date} · ${time}`;
}

function formatBirthPlace(report: AdminReportSummary) {
  return [report.birthCity, report.birthCountry].filter(Boolean).join("، ") || "—";
}

// HALLEUS_REPORT_SUBJECT_HELPERS_R44
function reportTone(visibility: AdminReportSummary["visibility"]) {
  if (visibility === "public") return "positive";
  if (visibility === "restricted_by_admin") return "danger";
  return "neutral";
}

export function AdminReportsWorkspace({
  reportId,
  accessToken,
}: {
  reportId?: string;
  accessToken: string;
}) {
  // HALLEUS_DIRECT_ADMINI_R16
  const [token, setToken] = useState(accessToken);
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [search, setSearch] = useState(reportId ?? "");
  const [error, setError] = useState("");
  const [contact, setContact] = useState<{
    displayName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(accessToken: string, term = search, requestedPage = page) {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reports?limit=25&page=${requestedPage}&search=${encodeURIComponent(term)}`,
        {
          cache: "no-store",
          headers: { authorization: `Bearer ${accessToken}` },
        },
      );
      const payload = (await response.json()) as {
        reports?: AdminReportSummary[];
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setReports([]);
          setToken("");
          setContact(null);
        }
        throw new Error(payload.error ?? "دریافت گزارش‌ها انجام نشد.");
      }
      setReports(payload.reports ?? []);
      setError("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    // Admin report data is external server state synchronized on route/token change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(accessToken, reportId ?? "", 1).catch((cause) => {
      if (active) {
        setError(
          cause instanceof Error
            ? cause.message
            : "دسترسی مدیر تأیید نشد.",
        );
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
    // Initial direct-admin load is intentionally scoped to this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, reportId]);

  async function mutate(
    report: AdminReportSummary,
    action: "restrict_visibility" | "update_title" | "soft_delete",
  ) {
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
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        setReports([]);
        setToken("");
        setContact(null);
      }
      setError(payload.error ?? "اقدام مدیریتی انجام نشد.");
      return;
    }
    await load(token, reportId ?? search, page);
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
    const payload = (await response.json()) as {
      contact?: typeof contact;
      error?: string;
    };
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        setReports([]);
        setToken("");
        setContact(null);
      }
      setError(payload.error ?? "اطلاعات تماس دریافت نشد.");
      return;
    }
    setContact(payload.contact ?? null);
  }

  const detail = reportId ? reports[0] : null;

  return (
    <section className={styles.standaloneAdminPage}>
      <header className={styles.standaloneToolbar}>
        <div>
          <span className={styles.eyebrow}>Halleus Admin</span>
          <h1>{reportId ? "جزئیات گزارش" : "مدیریت گزارش‌ها"}</h1>
          <p>
            {reportId
              ? "اطلاعات مدیریتی گزارش؛ دسترسی به دادهٔ خصوصی فقط با ثبت دلیل انجام می‌شود."
              : "فهرست سبک و صفحه‌بندی‌شده، بدون بارگیری محتوای خصوصی گزارش‌ها."}
          </p>
        </div>
        <Link className={styles.backLink} href="/admini?tab=reports">
          بازگشت به پنل
        </Link>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}
      {contact ? (
        <div className={styles.contactCard}>
          <strong>{contact.displayName ?? "بدون نام"}</strong>
          <span>تلفن: {contact.phone ?? "—"}</span>
          <span>ایمیل: {contact.email ?? "—"}</span>
        </div>
      ) : null}
      {loading ? <div className={styles.loadingBar}>در حال دریافت داده…</div> : null}

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
              {/* HALLEUS_REPORT_DETAIL_SUBJECT_R44 */}
              <div><span>سوژه گزارش</span><strong>{detail.subjectName ?? "—"}</strong></div>
              <div><span>تولد</span><strong>{formatBirthLine(detail)}</strong></div>
              <div><span>محل تولد</span><strong>{formatBirthPlace(detail)}</strong></div>
              <div><span>نوع مالک</span><strong>{detail.ownerKind}</strong></div>
              <div><span>پلن</span><strong>{detail.accessTier}</strong></div>
              <div><span>منبع</span><strong>{detail.source}</strong></div>
              <div><span>نسخه موتور</span><strong>{detail.engineVersion || "—"}</strong></div>
              <div><span>نسخه گزارش</span><strong>{detail.reportVersion || "—"}</strong></div>
              <div><span>رضایت انتشار</span><strong>{detail.publicationConsentState}</strong></div>
              <div><span>ساخته‌شده</span><strong>{formatDate(detail.createdAt)}</strong></div>
            </div>
            <div className={styles.recordActions}>
              <button type="button" onClick={() => void readContact(detail)}>
                مشاهدهٔ ثبت‌شدهٔ اطلاعات تماس
              </button>
              <button type="button" onClick={() => void mutate(detail, "update_title")}>
                ویرایش عنوان
              </button>
              <button type="button" onClick={() => void mutate(detail, "restrict_visibility")}>
                محدودسازی
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                onClick={() => void mutate(detail, "soft_delete")}
              >
                حذف نرم
              </button>
            </div>
          </article>
        ) : !loading ? (
          <div className={styles.emptyState}>گزارش پیدا نشد.</div>
        ) : null
      ) : (
        <>
          <form
            className={styles.standaloneSearch}
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              void load(token, search, 1);
            }}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="عنوان، شناسه، نام سوژه، شهر تولد یا نام کاربر"
            />
            <button type="submit">جست‌وجو</button>
          </form>

          {reports.length ? (
            <>
              <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
                <table>
                  <thead>
                    <tr>
                      {/* HALLEUS_REPORT_TABLE_R44 */}
                      <th>سوژه</th>
                      <th>تولد</th>
                      <th>شهر تولد</th>
                      <th>صاحب حساب</th>
                      <th>دسترسی</th>
                      <th>تاریخ</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        {/* HALLEUS_REPORT_TABLE_ROW_R44 */}
                        <td><strong>{report.subjectName ?? "—"}</strong><small>{report.title} · {report.source}</small></td>
                        <td>{formatBirthLine(report)}</td>
                        <td>{formatBirthPlace(report)}</td>
                        <td>{report.ownerDisplayName ?? "بدون نام نمایشی"}<small>{report.ownerUserId || report.ownerKind}</small></td>
                        <td><span className={styles.statusPill} data-tone={reportTone(report.visibility)}>{report.visibility}</span><small>{report.accessTier}</small></td>
                        <td>{formatDate(report.createdAt)}</td>
                        <td>
                          <details className={styles.actionMenu}>
                            <summary>عملیات</summary>
                            <div>
                              <Link href={`/admini/reports/${report.id}`}>جزئیات</Link>
                              <button type="button" onClick={() => void mutate(report, "update_title")}>ویرایش عنوان</button>
                              <button type="button" onClick={() => void mutate(report, "restrict_visibility")}>محدودسازی</button>
                              <button className={styles.dangerButton} type="button" onClick={() => void mutate(report, "soft_delete")}>حذف نرم</button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`${styles.mobileCards} ${styles.mobileOnly}`}>
                {reports.map((report) => (
                  <article className={styles.mobileRecord} key={report.id}>
                    <div className={styles.recordHeader}>
                      <div>{/* HALLEUS_REPORT_MOBILE_R44 */}<strong>{report.subjectName ?? report.title}</strong><small>{formatBirthLine(report)} · {formatBirthPlace(report)}</small><small>{(report.ownerDisplayName ?? report.ownerUserId) || report.ownerKind}</small></div>
                      <span className={styles.statusPill} data-tone={reportTone(report.visibility)}>{report.visibility}</span>
                    </div>
                    <div className={styles.recordMeta}>
                      <span>پلن: {report.accessTier}</span>
                      <span>{formatDate(report.createdAt)}</span>
                    </div>
                    <div className={styles.recordActions}>
                      <Link href={`/admini/reports/${report.id}`}>جزئیات</Link>
                      <button type="button" onClick={() => void mutate(report, "update_title")}>ویرایش</button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : !loading ? (
            <div className={styles.emptyState}>گزارشی پیدا نشد.</div>
          ) : null}

          <nav className={styles.paginator} aria-label="صفحه‌بندی گزارش‌ها">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                void load(token, search, next);
              }}
            >
              صفحهٔ قبل
            </button>
            <span>صفحهٔ {page.toLocaleString("fa-IR")}</span>
            <button
              type="button"
              disabled={reports.length < PAGE_SIZE}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                void load(token, search, next);
              }}
            >
              صفحهٔ بعد
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
