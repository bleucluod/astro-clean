"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import type {
  AdminAuditEventSummary,
  AdminCapability,
  AdminOverviewPayload,
  AdminPremiumRequestSummary,
  AdminReportSummary,
  AdminSessionPayload,
  AdminUserSummary,
} from "@/lib/admin/admin-types";
import styles from "./admin-console.module.css";
import {
  WikiAdminPanel,
  type WikiWorkspaceSection,
} from "./WikiAdminPanel";

type TabId = "overview" | "users" | "reports" | "premium" | "wiki" | "audit";

type JsonPayload = Record<string, unknown>;

const tabs: {
  id: TabId;
  label: string;
  capability: AdminCapability;
}[] = [
  { id: "overview", label: "نمای کلی", capability: "dashboard.read" },
  { id: "users", label: "کاربران", capability: "users.read" },
  { id: "reports", label: "گزارش‌ها", capability: "reports.read" },
  {
    id: "premium",
    label: "درخواست‌های پرمیوم",
    capability: "premium_requests.read",
  },
  { id: "wiki", label: "مدیریت ویکی", capability: "wiki.read" },
  { id: "audit", label: "لاگ ممیزی", capability: "audit.read" },
];

const wikiSections: {
  id: WikiWorkspaceSection;
  label: string;
  capability: AdminCapability;
}[] = [
  { id: "articles", label: "مقاله‌ها", capability: "wiki.read" },
  { id: "queue", label: "صف انتشار", capability: "wiki.read" },
  { id: "new", label: "مقالهٔ تازه", capability: "wiki.draft.write" },
  { id: "import", label: "ورود بستهٔ استاندارد ویکی", capability: "wiki.import.write" },
  { id: "settings", label: "تنظیمات انتشار خودکار", capability: "wiki.read" },
  { id: "categories", label: "دسته‌ها", capability: "wiki.settings.write" },
  { id: "media", label: "رسانه‌ها", capability: "wiki.read" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function hasCapability(
  session: AdminSessionPayload | null,
  capability: AdminCapability,
) {
  return session?.capabilities.includes(capability) ?? false;
}

export function AdminConsole() {
  const [token, setToken] = useState("");
  const [session, setSession] = useState<AdminSessionPayload | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [wikiSection, setWikiSection] = useState<WikiWorkspaceSection>("articles");
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<
    AdminPremiumRequestSummary[]
  >([]);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEventSummary[]>([]);
  const [search, setSearch] = useState("");
  const [privateReport, setPrivateReport] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!token) {
        throw new Error("نشست حساب پیدا نشد.");
      }
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${token}`);
      if (init?.body && !(init.body instanceof FormData)) {
        headers.set("content-type", "application/json");
      }

      const response = await fetch(path, {
        ...init,
        cache: "no-store",
        headers,
      });
      const payload = (await response.json()) as JsonPayload;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setSession(null);
          setToken("");
          setOverview(null);
          setUsers([]);
          setReports([]);
          setPremiumRequests([]);
          setAuditEvents([]);
          setPrivateReport(null);
        }
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "درخواست ادمین ناموفق بود.",
        );
      }
      return payload;
    },
    [token],
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);
      setError("");
      const client = getSupabaseBrowserAuthClient();
      if (!client) {
        if (active) {
          setError("ورود واقعی Supabase در این محیط فعال نیست.");
          setLoading(false);
        }
        return;
      }

      const { data, error: sessionError } = await client.auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      if (sessionError || !accessToken) {
        if (active) {
          setError("برای ورود به پنل، ابتدا از صفحه حساب وارد شو.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
          headers: { authorization: `Bearer ${accessToken}` },
        });
        const payload = (await response.json()) as JsonPayload;
        if (!response.ok) {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "دسترسی ادمین تأیید نشد.",
          );
        }
        const nextSession = payload.session as AdminSessionPayload;
        if (active) {
          setToken(accessToken);
          setSession(nextSession);
        }
      } catch (bootstrapError) {
        if (active) {
          setError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : "دسترسی ادمین تأیید نشد.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const availableTabs = useMemo(
    () => tabs.filter((tab) => hasCapability(session, tab.capability)),
    [session],
  );

  const loadTab = useCallback(async () => {
    if (!token || !session) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (activeTab === "overview") {
        const payload = await request("/api/admin/overview");
        setOverview(payload.overview as AdminOverviewPayload);
      } else if (activeTab === "users") {
        const payload = await request(
          `/api/admin/users?search=${encodeURIComponent(search)}&limit=100`,
        );
        setUsers(payload.users as AdminUserSummary[]);
      } else if (activeTab === "reports") {
        const payload = await request(
          `/api/admin/reports?search=${encodeURIComponent(search)}&limit=100`,
        );
        setReports(payload.reports as AdminReportSummary[]);
      } else if (activeTab === "premium") {
        const payload = await request("/api/admin/premium-requests?limit=100");
        setPremiumRequests(
          payload.requests as AdminPremiumRequestSummary[],
        );
      } else if (activeTab === "audit") {
        const payload = await request("/api/admin/audit?limit=100");
        setAuditEvents(payload.events as AdminAuditEventSummary[]);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "بارگذاری ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, request, search, session, token]);

  useEffect(() => {
    // Data loading is the external synchronization owned by this admin tab.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTab();
  }, [loadTab]);

  async function mutate(path: string, body: JsonPayload, success: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request(path, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setMessage(success);
      await loadTab();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "عملیات ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeUserStatus(user: AdminUserSummary) {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    const reason = window.prompt("دلیل این تغییر وضعیت را ثبت کن:");
    if (!reason?.trim()) {
      return;
    }
    await mutate(
      "/api/admin/users",
      {
        action: "set_status",
        userId: user.id,
        status: nextStatus,
        reason: reason.trim(),
      },
      "وضعیت حساب به‌روزرسانی شد.",
    );
  }

  async function addUserNote(userId: string) {
    const note = window.prompt("یادداشت داخلی پشتیبانی:");
    if (!note?.trim()) {
      return;
    }
    await mutate(
      "/api/admin/users",
      { action: "add_note", userId, note: note.trim() },
      "یادداشت داخلی ثبت شد.",
    );
  }

  async function restrictReport(reportId: string) {
    const reason = window.prompt("دلیل محدودکردن دسترسی این گزارش:");
    if (!reason?.trim()) {
      return;
    }
    await mutate(
      "/api/admin/reports",
      {
        action: "restrict_visibility",
        reportId,
        reason: reason.trim(),
      },
      "گزارش از حالت عمومی خارج شد.",
    );
  }

  async function inspectPrivateReport(reportId: string) {
    const reason = window.prompt(
      "مشاهده متن خصوصی یک اقدام audit‌شده است. دلیل دسترسی را وارد کن:",
    );
    if (!reason?.trim()) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await request(
        `/api/admin/reports/${encodeURIComponent(reportId)}/private-content`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      setPrivateReport(payload.content);
      setMessage("دسترسی خصوصی ثبت و audit شد.");
    } catch (inspectError) {
      setError(
        inspectError instanceof Error
          ? inspectError.message
          : "مشاهده گزارش ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updatePremium(
    item: AdminPremiumRequestSummary,
    status: AdminPremiumRequestSummary["status"],
  ) {
    const reason = window.prompt("دلیل تغییر وضعیت درخواست:");
    if (!reason?.trim()) {
      return;
    }
    await mutate(
      "/api/admin/premium-requests",
      {
        requestId: item.id,
        status,
        deliveryStatus:
          status === "delivered" ? "delivered" : item.deliveryStatus,
        internalNotes: item.internalNotes,
        agreedAmount: item.agreedAmount,
        dueDate: item.dueDate,
        linkedReportId: item.linkedReportId,
        reason: reason.trim(),
      },
      "درخواست پرمیوم به‌روزرسانی شد.",
    );
  }

  async function editPremium(item: AdminPremiumRequestSummary) {
    const internalNotes = window.prompt(
      "یادداشت داخلی:",
      item.internalNotes ?? "",
    );
    if (internalNotes === null) {
      return;
    }
    const agreedAmount = window.prompt(
      "مبلغ توافق‌شده (خالی یعنی تعیین‌نشده):",
      item.agreedAmount ?? "",
    );
    if (agreedAmount === null) {
      return;
    }
    const dueDate = window.prompt(
      "موعد تحویل با قالب YYYY-MM-DD (خالی یعنی تعیین‌نشده):",
      item.dueDate ?? "",
    );
    if (dueDate === null) {
      return;
    }
    const linkedReportId = window.prompt(
      "شناسه گزارش مرتبط (خالی یعنی بدون گزارش):",
      item.linkedReportId ?? "",
    );
    if (linkedReportId === null) {
      return;
    }
    const deliveryStatus = window.prompt(
      "وضعیت تحویل: not_started / preparing / ready / delivered / canceled",
      item.deliveryStatus,
    );
    if (deliveryStatus === null) {
      return;
    }
    const allowedDeliveryStatuses: AdminPremiumRequestSummary["deliveryStatus"][] =
      ["not_started", "preparing", "ready", "delivered", "canceled"];
    if (
      !allowedDeliveryStatuses.includes(
        deliveryStatus as AdminPremiumRequestSummary["deliveryStatus"],
      )
    ) {
      setError("وضعیت تحویل معتبر نیست.");
      return;
    }
    const reason = window.prompt("دلیل ثبت این تغییرات:");
    if (!reason?.trim()) {
      return;
    }

    await mutate(
      "/api/admin/premium-requests",
      {
        requestId: item.id,
        status: item.status,
        deliveryStatus,
        internalNotes: internalNotes.trim() || null,
        agreedAmount: agreedAmount.trim() || null,
        dueDate: dueDate.trim() || null,
        linkedReportId: linkedReportId.trim() || null,
        reason: reason.trim(),
      },
      "جزئیات درخواست پرمیوم به‌روزرسانی شد.",
    );
  }

  if (loading && !session) {
    return <div className={styles.state}>در حال بررسی دسترسی امن…</div>;
  }

  if (!session) {
    return (
      <div className={styles.denied}>
        <h1>دسترسی پنل تأیید نشد</h1>
        <p>{error || "این حساب عضویت فعال ادمین ندارد."}</p>
        <Link className="button" href="/profile">
          ورود از صفحه حساب
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.console}>
      <aside className={styles.sidebar}>
        <div>
          <span className={styles.eyebrow}>Halleus Admin</span>
          <h1>کنترل محصول</h1>
          <p>
            {session.displayName || session.userId}
            <br />
            نقش: {session.role}
          </p>
        </div>
        <nav className={styles.nav} aria-label="بخش‌های پنل">
          {availableTabs.map((tab) => (
            <div className={styles.navGroup} key={tab.id}>
              <button
                type="button"
                className={activeTab === tab.id ? styles.activeNav : undefined}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "wiki") setWikiSection("articles");
                }}
              >
                {tab.label}
              </button>
              {tab.id === "wiki" && activeTab === "wiki" ? (
                <div className={styles.subnav} aria-label="بخش‌های مدیریت ویکی">
                  {wikiSections.filter((item) => hasCapability(session, item.capability)).map((item) => (
                    <button
                      className={wikiSection === item.id ? styles.activeSubnav : undefined}
                      key={item.id}
                      type="button"
                      onClick={() => setWikiSection(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <Link href="/" className={styles.publicLink}>
          بازگشت به سایت
        </Link>
      </aside>

      <main className={`${styles.main} ${activeTab === "wiki" ? styles.wikiMain : ""}`}>
        <header
          className={`${styles.toolbar} ${activeTab === "wiki" ? styles.wikiToolbar : ""}`}
        >
          <div>
            <span className={styles.eyebrow}>server-protected</span>
            <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
          </div>
          {(activeTab === "users" || activeTab === "reports") && (
            <form
              className={styles.search}
              onSubmit={(event) => {
                event.preventDefault();
                void loadTab();
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی شناسه، نام یا ایمیل"
              />
              <button type="submit">جست‌وجو</button>
            </form>
          )}
          {activeTab !== "wiki" ? (
            <button type="button" onClick={() => void loadTab()}>
              تازه‌سازی
            </button>
          ) : null}
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}
        {message ? <p className={styles.success}>{message}</p> : null}
        {loading ? <p className={styles.loading}>در حال دریافت داده…</p> : null}

        {activeTab === "overview" && overview ? (
          <section className={styles.cards}>
            {[
              ["کاربران", overview.users],
              ["همه گزارش‌ها", overview.reports],
              ["گزارش عمومی", overview.publicReports],
              ["گزارش خصوصی", overview.privateReports],
              ["درخواست باز", overview.openPremiumRequests],
              ["رویداد audit در ۲۴ ساعت", overview.auditEvents24h],
            ].map(([label, value]) => (
              <article key={String(label)} className={styles.metric}>
                <span>{label}</span>
                <strong>{Number(value).toLocaleString("fa-IR")}</strong>
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === "users" ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>وضعیت / پلن</th>
                  <th>گزارش‌ها</th>
                  <th>آخرین ورود</th>
                  <th>یادداشت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.displayName || "بدون نام نمایشی"}</strong>
                      <small>{user.email || user.id}</small>
                    </td>
                    <td>
                      {user.status} / {user.plan}
                    </td>
                    <td>
                      {user.reportCount.toLocaleString("fa-IR")}
                      <small>{formatDate(user.lastReportAt)}</small>
                    </td>
                    <td>{formatDate(user.lastSignInAt)}</td>
                    <td>{user.latestNote || "—"}</td>
                    <td className={styles.actions}>
                      {hasCapability(session, "users.status.write") ? (
                        <button
                          type="button"
                          onClick={() => void changeUserStatus(user)}
                        >
                          {user.status === "suspended" ? "فعال‌سازی" : "تعلیق"}
                        </button>
                      ) : null}
                      {hasCapability(session, "users.notes.write") ? (
                        <button
                          type="button"
                          onClick={() => void addUserNote(user.id)}
                        >
                          یادداشت
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "reports" ? (
          <>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>گزارش</th>
                    <th>مالک</th>
                    <th>دسترسی</th>
                    <th>نسخه</th>
                    <th>رضایت انتشار</th>
                    <th>ساخته‌شده</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <strong>{report.id}</strong>
                        <small>{report.source}</small>
                      </td>
                      <td>{report.ownerUserId}</td>
                      <td>
                        {report.visibility} / {report.accessTier}
                        <small>
                          {report.indexable ? "indexable" : "noindex فعلی"}
                        </small>
                      </td>
                      <td>
                        {report.engineVersion || "—"}
                        <small>{report.reportVersion || "—"}</small>
                      </td>
                      <td>{report.publicationConsentState}</td>
                      <td>{formatDate(report.createdAt)}</td>
                      <td className={styles.actions}>
                        {report.visibility === "public" &&
                        hasCapability(
                          session,
                          "reports.visibility.restrict",
                        ) ? (
                          <button
                            type="button"
                            onClick={() => void restrictReport(report.id)}
                          >
                            خارج‌کردن از انتشار
                          </button>
                        ) : null}
                        {hasCapability(
                          session,
                          "reports.private_content.read",
                        ) ? (
                          <button
                            type="button"
                            onClick={() => void inspectPrivateReport(report.id)}
                          >
                            دسترسی audit‌شده
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {privateReport ? (
              <section className={styles.privateViewer}>
                <div className={styles.viewerHeader}>
                  <h3>محتوای خصوصی با دسترسی ثبت‌شده</h3>
                  <button type="button" onClick={() => setPrivateReport(null)}>
                    بستن
                  </button>
                </div>
                <pre>{JSON.stringify(privateReport, null, 2)}</pre>
              </section>
            ) : null}
          </>
        ) : null}

        {activeTab === "premium" ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>درخواست</th>
                  <th>راه ارتباطی</th>
                  <th>گزارش</th>
                  <th>انتشار</th>
                  <th>وضعیت</th>
                  <th>تحویل</th>
                  <th>جزئیات</th>
                  <th>ثبت‌شده</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {premiumRequests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.requestedProduct}</strong>
                      <small>#{item.id}</small>
                    </td>
                    <td>
                      {item.contactName}
                      <small>{item.contactValue}</small>
                    </td>
                    <td>{item.linkedReportId || "—"}</td>
                    <td>{item.publicationChoice}</td>
                    <td>
                      {hasCapability(session, "premium_requests.write") ? (
                        <select
                          value={item.status}
                          onChange={(event) =>
                            void updatePremium(
                              item,
                              event.target
                                .value as AdminPremiumRequestSummary["status"],
                            )
                          }
                        >
                          {[
                            "new",
                            "reviewing",
                            "approved",
                            "preparing",
                            "delivered",
                            "canceled",
                          ].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item.status
                      )}
                    </td>
                    <td>
                      {item.deliveryStatus}
                      <small>{item.dueDate || "بدون موعد"}</small>
                    </td>
                    <td>
                      <details>
                        <summary>نمایش</summary>
                        <p>{item.customerNotes || "بدون توضیح کاربر"}</p>
                        <small>
                          یادداشت داخلی: {item.internalNotes || "—"}
                          <br />
                          مبلغ: {item.agreedAmount || "—"}
                        </small>
                      </details>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td className={styles.actions}>
                      {hasCapability(session, "premium_requests.write") ? (
                        <button
                          type="button"
                          onClick={() => void editPremium(item)}
                        >
                          ویرایش جزئیات
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "audit" ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>زمان</th>
                  <th>عامل</th>
                  <th>عملیات</th>
                  <th>هدف</th>
                  <th>نتیجه</th>
                  <th>Correlation</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.createdAt)}</td>
                    <td>
                      {event.actorRole || "system"}
                      <small>{event.actorUserId || "—"}</small>
                    </td>
                    <td>
                      {event.action}
                      <small>{event.reason || "—"}</small>
                    </td>
                    <td>
                      {event.targetType}
                      <small>{event.targetId || "—"}</small>
                    </td>
                    <td>{event.success ? "موفق" : "ناموفق"}</td>
                    <td>{event.requestCorrelationId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "wiki" ? (
          <WikiAdminPanel
            activeSection={wikiSection}
            onSectionChange={setWikiSection}
            session={session}
            token={token}
          />
        ) : null}
      </main>
    </div>
  );
}
