"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import type { AdminReportSummary } from "@/lib/admin/admin-types";
import styles from "./admin-console.module.css";

export function AdminReportsWorkspace({ reportId }: { reportId?: string }) {
  const [token, setToken] = useState("");
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [search, setSearch] = useState(reportId ?? "");
  const [error, setError] = useState("");
  const [contact, setContact] = useState<{ displayName?: string | null; email?: string | null; phone?: string | null } | null>(null);
  const [page, setPage] = useState(1);

  async function load(accessToken: string, term = search, requestedPage = page) {
    const response = await fetch(`/api/admin/reports?limit=25&page=${requestedPage}&search=${encodeURIComponent(term)}`, { cache: "no-store", headers: { authorization: `Bearer ${accessToken}` } });
    const payload = await response.json() as { reports?: AdminReportSummary[]; error?: string };
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) { setReports([]); setToken(""); setContact(null); }
      throw new Error(payload.error ?? "دریافت گزارش‌ها انجام نشد.");
    }
    setReports(payload.reports ?? []);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const client = getSupabaseBrowserAuthClient();
        const { data } = client ? await client.auth.getSession() : { data: { session: null } };
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error("برای مدیریت گزارش‌ها وارد حساب مدیر شوید.");
        if (!active) return;
        setToken(accessToken);
        await load(accessToken, reportId ?? "");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "دسترسی مدیر تأیید نشد.");
      }
    })();
    return () => { active = false; };
    // Initial authenticated load is intentionally scoped to this route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function mutate(report: AdminReportSummary, action: "restrict_visibility" | "update_title" | "soft_delete") {
    const reason = window.prompt("دلیل این اقدام را ثبت کن:");
    if (!reason?.trim()) return;
    const title = action === "update_title" ? window.prompt("عنوان تازه:", report.title) : null;
    if (action === "update_title" && title === null) return;
    const response = await fetch("/api/admin/reports", { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-halleus-admin-origin": window.location.origin }, body: JSON.stringify({ action, reportId: report.id, reason: reason.trim(), title }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { if (response.status === 401 || response.status === 403) { setReports([]); setToken(""); setContact(null); } setError(payload.error ?? "اقدام مدیریتی انجام نشد."); return; }
    await load(token);
  }

  async function readContact(report: AdminReportSummary) {
    const reason = window.prompt("دلیل مشاهدهٔ اطلاعات تماس را ثبت کن:");
    if (!reason?.trim()) return;
    const response = await fetch(`/api/admin/reports/${encodeURIComponent(report.id)}/customer-contact`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ reason: reason.trim() }) });
    const payload = await response.json() as { contact?: typeof contact; error?: string };
    if (!response.ok) { if (response.status === 401 || response.status === 403) { setReports([]); setToken(""); setContact(null); } setError(payload.error ?? "اطلاعات تماس دریافت نشد."); return; }
    setContact(payload.contact ?? null);
  }

  return <section className={styles.main}>
    <header className={styles.toolbar}><div><h1>{reportId ? "جزئیات گزارش" : "مدیریت گزارش‌ها"}</h1><p>فهرست سبک، بدون بارگیری محتوای خصوصی</p></div><Link className="button secondary" href="/admin">بازگشت به پنل</Link></header>
    {error ? <p className={styles.error}>{error}</p> : null}
    {contact ? <p className={styles.success}>نام: {contact.displayName ?? "—"} · تلفن: {contact.phone ?? "—"} · ایمیل: {contact.email ?? "—"}</p> : null}
    {reportId && reports[0] ? <button type="button" onClick={() => void readContact(reports[0])}>مشاهدهٔ ثبت‌شدهٔ اطلاعات تماس</button> : null}
    {!reportId ? <form className={styles.search} onSubmit={(event) => { event.preventDefault(); void load(token); }}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="عنوان یا نام کاربر"/><button type="submit">جست‌وجو</button></form> : null}
    <div className={styles.tableWrap}><table><thead><tr><th>عنوان</th><th>کاربر</th><th>دسترسی</th><th>تاریخ</th><th>عملیات</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><strong>{report.title}</strong><small>{report.source}</small></td><td>{report.ownerDisplayName ?? "بدون نام نمایشی"}</td><td>{report.visibility}</td><td>{new Date(report.createdAt).toLocaleDateString("fa-IR")}</td><td className={styles.actions}><Link className="button secondary" href={`/admin/reports/${report.id}`}>جزئیات</Link><button type="button" onClick={() => void mutate(report, "update_title")}>ویرایش عنوان</button><button type="button" onClick={() => void mutate(report, "restrict_visibility")}>محدودسازی</button><button type="button" onClick={() => void mutate(report, "soft_delete")}>حذف نرم</button></td></tr>)}</tbody></table></div>
    {!reportId ? <nav className={styles.actions} aria-label="صفحه‌بندی گزارش‌های مدیر"><button type="button" disabled={page <= 1} onClick={() => { const next = Math.max(1, page - 1); setPage(next); void load(token, search, next); }}>صفحهٔ قبل</button><span>صفحهٔ {page.toLocaleString("fa-IR")}</span><button type="button" disabled={reports.length < 25} onClick={() => { const next = page + 1; setPage(next); void load(token, search, next); }}>صفحهٔ بعد</button></nav> : null}
  </section>;
}
