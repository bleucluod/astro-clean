"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AdminAuditEventSummary,
  AdminCapability,
  AdminOverviewPayload,
  AdminPremiumRequestSummary,
  AdminReportSummary,
  AdminSessionPayload,
  AdminUserSummary,
} from "@/lib/admin/admin-types";
import type { WikiWorkspaceSection } from "./WikiAdminPanel";
import styles from "./admin-console.module.css";

const WikiAdminPanel = dynamic(
  () => import("./WikiAdminPanel").then((module) => module.WikiAdminPanel),
  {
    ssr: false,
    loading: () => <div className={styles.panelSkeleton}>ویکی در حال آماده‌شدن است…</div>,
  },
);

const TelegramAdminPanel = dynamic(
  () => import("./TelegramAdminPanel").then((module) => module.TelegramAdminPanel),
  {
    ssr: false,
    loading: () => <div className={styles.panelSkeleton}>پنل تلگرام در حال آماده‌شدن است…</div>,
  },
);

type TabId =
  | "overview"
  | "users"
  | "reports"
  | "premium"
  | "telegram"
  | "wiki"
  | "audit";

type JsonPayload = Record<string, unknown>;
type NavigationGroup = "main" | "content" | "operations";

const PAGE_SIZE = 25;

const tabs: {
  id: TabId;
  label: string;
  shortLabel: string;
  capability: AdminCapability;
  group: NavigationGroup;
}[] = [
  {
    id: "overview",
    label: "نمای کلی",
    shortLabel: "نمای کلی",
    capability: "dashboard.read",
    group: "main",
  },
  {
    id: "users",
    label: "کاربران",
    shortLabel: "کاربران",
    capability: "users.read",
    group: "main",
  },
  {
    id: "reports",
    label: "گزارش‌ها",
    shortLabel: "گزارش‌ها",
    capability: "reports.read",
    group: "main",
  },
  {
    id: "telegram",
    label: "تلگرام",
    shortLabel: "تلگرام",
    capability: "telegram.read",
    group: "content",
  },
  {
    id: "wiki",
    label: "ویکی",
    shortLabel: "ویکی",
    capability: "wiki.read",
    group: "content",
  },
  {
    id: "premium",
    label: "درخواست‌های پرمیوم",
    shortLabel: "پرمیوم",
    capability: "premium_requests.read",
    group: "operations",
  },
  {
    id: "audit",
    label: "لاگ ممیزی",
    shortLabel: "ممیزی",
    capability: "audit.read",
    group: "operations",
  },
];

const navGroups: { id: NavigationGroup; label: string }[] = [
  { id: "main", label: "اصلی" },
  { id: "content", label: "محتوا" },
  { id: "operations", label: "عملیات" },
];

const wikiSections: {
  id: WikiWorkspaceSection;
  label: string;
  capability: AdminCapability;
}[] = [
  { id: "articles", label: "مقاله‌ها", capability: "wiki.read" },
  { id: "queue", label: "صف انتشار", capability: "wiki.read" },
  { id: "new", label: "مقالهٔ تازه", capability: "wiki.draft.write" },
  { id: "import", label: "ورود بسته", capability: "wiki.import.write" },
  { id: "settings", label: "تنظیمات انتشار", capability: "wiki.read" },
  { id: "categories", label: "دسته‌ها", capability: "wiki.settings.write" },
  { id: "media", label: "رسانه‌ها", capability: "wiki.read" },
];

const premiumStatusLabels: Record<AdminPremiumRequestSummary["status"], string> = {
  new: "جدید",
  reviewing: "در بررسی",
  approved: "تأییدشده",
  preparing: "در حال آماده‌سازی",
  delivered: "تحویل‌شده",
  canceled: "لغوشده",
};

function formatDate(value: string | null) {
  if (!value) return "—";
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

function readPage(value: string | null) {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function badgeTone(value: string) {
  if (["active", "public", "published", "delivered", "success"].includes(value)) {
    return "positive";
  }
  if (["failed", "suspended", "restricted_by_admin", "canceled"].includes(value)) {
    return "danger";
  }
  if (["new", "reviewing", "preparing", "retry"].includes(value)) {
    return "attention";
  }
  return "neutral";
}

function Paginator({
  page,
  itemCount,
  onPage,
}: {
  page: number;
  itemCount: number;
  onPage: (page: number) => void;
}) {
  if (page === 1 && itemCount < PAGE_SIZE) return null;
  return (
    <nav className={styles.paginator} aria-label="صفحه‌بندی">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        صفحهٔ قبل
      </button>
      <span>صفحهٔ {page.toLocaleString("fa-IR")}</span>
      <button
        type="button"
        disabled={itemCount < PAGE_SIZE}
        onClick={() => onPage(page + 1)}
      >
        صفحهٔ بعد
      </button>
    </nav>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className={styles.emptyState}>{children}</div>;
}

export function AdminConsole({
  accessToken,
  initialSession,
  onSignOut,
}: {
  accessToken: string;
  initialSession: AdminSessionPayload;
  onSignOut: () => void;
}) {
  // HALLEUS_DIRECT_ADMINI_R16
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(accessToken);
  const [session, setSession] = useState<AdminSessionPayload | null>(initialSession);
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<AdminPremiumRequestSummary[]>([]);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEventSummary[]>([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [privateReport, setPrivateReport] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const availableTabs = useMemo(
    () => tabs.filter((tab) => hasCapability(session, tab.capability)),
    [session],
  );

  const requestedTab = searchParams.get("tab") as TabId | null;
  const activeTab =
    availableTabs.find((tab) => tab.id === requestedTab)?.id ??
    availableTabs[0]?.id ??
    "overview";

  const availableWikiSections = useMemo(
    () => wikiSections.filter((item) => hasCapability(session, item.capability)),
    [session],
  );
  const requestedWikiSection = searchParams.get("section") as WikiWorkspaceSection | null;
  const wikiSection =
    availableWikiSections.find((item) => item.id === requestedWikiSection)?.id ??
    availableWikiSections[0]?.id ??
    "articles";
  const page = readPage(searchParams.get("page"));
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);

  const navigate = useCallback(
    (tab: TabId, options?: { section?: WikiWorkspaceSection; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      if (tab === "wiki") {
        params.set("section", options?.section ?? "articles");
      } else {
        params.delete("section");
      }
      const nextPage = options?.page ?? 1;
      if (nextPage > 1) params.set("page", String(nextPage));
      else params.delete("page");
      router.push(`/admini?${params.toString()}`, { scroll: false });
      setDrawerOpen(false);
    },
    [router, searchParams],
  );

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!token) throw new Error("نشست حساب پیدا نشد.");
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

  const loadTab = useCallback(async () => {
    if (!token || !session || activeTab === "telegram" || activeTab === "wiki") {
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
          `/api/admin/users?search=${encodeURIComponent(searchApplied)}&limit=${PAGE_SIZE}&page=${page}`,
        );
        setUsers(payload.users as AdminUserSummary[]);
      } else if (activeTab === "reports") {
        const payload = await request(
          `/api/admin/reports?search=${encodeURIComponent(searchApplied)}&limit=${PAGE_SIZE}&page=${page}`,
        );
        setReports(payload.reports as AdminReportSummary[]);
      } else if (activeTab === "premium") {
        const payload = await request(
          `/api/admin/premium-requests?limit=${PAGE_SIZE}&page=${page}`,
        );
        setPremiumRequests(payload.requests as AdminPremiumRequestSummary[]);
      } else if (activeTab === "audit") {
        const payload = await request(`/api/admin/audit?limit=${PAGE_SIZE}&page=${page}`);
        setAuditEvents(payload.events as AdminAuditEventSummary[]);
      }
      setLastUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "بارگذاری ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, request, searchApplied, session, token]);

  useEffect(() => {
    // Data loading is the external synchronization owned by the active admin workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTab();
  }, [loadTab]);

  function selectTab(tab: TabId) {
    setSearchDraft("");
    setSearchApplied("");
    navigate(tab);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchApplied(searchDraft.trim());
    navigate(activeTab, { page: 1 });
  }

  async function mutate(path: string, body: JsonPayload, success: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request(path, { method: "PATCH", body: JSON.stringify(body) });
      setMessage(success);
      await loadTab();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "عملیات ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function changeUserStatus(user: AdminUserSummary) {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    const reason = window.prompt("دلیل این تغییر وضعیت را ثبت کن:");
    if (!reason?.trim()) return;
    await mutate(
      "/api/admin/users",
      { action: "set_status", userId: user.id, status: nextStatus, reason: reason.trim() },
      "وضعیت حساب به‌روزرسانی شد.",
    );
  }

  async function addUserNote(userId: string) {
    const note = window.prompt("یادداشت داخلی پشتیبانی:");
    if (!note?.trim()) return;
    await mutate(
      "/api/admin/users",
      { action: "add_note", userId, note: note.trim() },
      "یادداشت داخلی ثبت شد.",
    );
  }

  async function restrictReport(reportId: string) {
    const reason = window.prompt("دلیل محدودکردن دسترسی این گزارش:");
    if (!reason?.trim()) return;
    await mutate(
      "/api/admin/reports",
      { action: "restrict_visibility", reportId, reason: reason.trim() },
      "گزارش از حالت عمومی خارج شد.",
    );
  }

  async function updateReportTitle(report: AdminReportSummary) {
    const title = window.prompt("عنوان تازهٔ گزارش:", report.title);
    if (title === null) return;
    const reason = window.prompt("دلیل تغییر عنوان را ثبت کن:");
    if (!reason?.trim()) return;
    await mutate(
      "/api/admin/reports",
      { action: "update_title", reportId: report.id, title, reason: reason.trim() },
      "عنوان گزارش به‌روزرسانی شد.",
    );
  }

  async function deleteReport(reportId: string) {
    const reason = window.prompt("دلیل حذف نرم گزارش را ثبت کن:");
    if (!reason?.trim()) return;
    await mutate(
      "/api/admin/reports",
      { action: "soft_delete", reportId, reason: reason.trim() },
      "گزارش به‌صورت نرم حذف شد.",
    );
  }

  async function inspectPrivateReport(reportId: string) {
    const reason = window.prompt(
      "مشاهده متن خصوصی یک اقدام audit‌شده است. دلیل دسترسی را وارد کن:",
    );
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    try {
      const payload = await request(
        `/api/admin/reports/${encodeURIComponent(reportId)}/private-content`,
        { method: "POST", body: JSON.stringify({ reason: reason.trim() }) },
      );
      setPrivateReport(payload.content);
      setMessage("دسترسی خصوصی ثبت و audit شد.");
    } catch (inspectError) {
      setError(
        inspectError instanceof Error ? inspectError.message : "مشاهده گزارش ناموفق بود.",
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
    if (!reason?.trim()) return;
    await mutate(
      "/api/admin/premium-requests",
      {
        requestId: item.id,
        status,
        deliveryStatus: status === "delivered" ? "delivered" : item.deliveryStatus,
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
    const internalNotes = window.prompt("یادداشت داخلی:", item.internalNotes ?? "");
    if (internalNotes === null) return;
    const agreedAmount = window.prompt(
      "مبلغ توافق‌شده (خالی یعنی تعیین‌نشده):",
      item.agreedAmount ?? "",
    );
    if (agreedAmount === null) return;
    const dueDate = window.prompt(
      "موعد تحویل با قالب YYYY-MM-DD (خالی یعنی تعیین‌نشده):",
      item.dueDate ?? "",
    );
    if (dueDate === null) return;
    const linkedReportId = window.prompt(
      "شناسه گزارش مرتبط (خالی یعنی بدون گزارش):",
      item.linkedReportId ?? "",
    );
    if (linkedReportId === null) return;
    const deliveryStatus = window.prompt(
      "وضعیت تحویل: not_started / preparing / ready / delivered / canceled",
      item.deliveryStatus,
    );
    if (deliveryStatus === null) return;
    const allowedDeliveryStatuses: AdminPremiumRequestSummary["deliveryStatus"][] = [
      "not_started",
      "preparing",
      "ready",
      "delivered",
      "canceled",
    ];
    if (!allowedDeliveryStatuses.includes(deliveryStatus as AdminPremiumRequestSummary["deliveryStatus"])) {
      setError("وضعیت تحویل معتبر نیست.");
      return;
    }
    const reason = window.prompt("دلیل ثبت این تغییرات:");
    if (!reason?.trim()) return;
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
        <button className="button" type="button" onClick={onSignOut}>
          ورود دوباره
        </button>
      </div>
    );
  }

  const paginationCount =
    activeTab === "users"
      ? users.length
      : activeTab === "reports"
        ? reports.length
        : activeTab === "premium"
          ? premiumRequests.length
          : activeTab === "audit"
            ? auditEvents.length
            : 0;

  return (
    <div className={styles.console}>
      <header className={styles.mobileBar}>
        <button
          className={styles.menuButton}
          type="button"
          aria-label="باز کردن منوی مدیریت"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div>
          <small>Halleus Admin</small>
          <strong>{activeTabConfig?.shortLabel ?? "مدیریت"}</strong>
        </div>
        <Link href="/" aria-label="بازگشت به سایت">
          سایت
        </Link>
      </header>

      {drawerOpen ? (
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label="بستن منوی مدیریت"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <div>
            <span className={styles.eyebrow}>Halleus Admin</span>
            <h1>کنترل محصول</h1>
            <p>
              {session.displayName || session.userId}
              <br />
              نقش: {session.role}
            </p>
          </div>
          <button
            className={styles.drawerClose}
            type="button"
            aria-label="بستن منو"
            onClick={() => setDrawerOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className={styles.nav} aria-label="بخش‌های پنل">
          {navGroups.map((group) => {
            const groupTabs = availableTabs.filter((tab) => tab.group === group.id);
            if (!groupTabs.length) return null;
            return (
              <section className={styles.navSection} key={group.id}>
                <span className={styles.navSectionLabel}>{group.label}</span>
                {groupTabs.map((tab) => (
                  <div className={styles.navGroup} key={tab.id}>
                    <button
                      type="button"
                      className={activeTab === tab.id ? styles.activeNav : undefined}
                      onClick={() => selectTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                    {tab.id === "wiki" && activeTab === "wiki" ? (
                      <div className={styles.subnav} aria-label="بخش‌های مدیریت ویکی">
                        {availableWikiSections.map((item) => (
                          <button
                            className={wikiSection === item.id ? styles.activeSubnav : undefined}
                            key={item.id}
                            type="button"
                            onClick={() => navigate("wiki", { section: item.id })}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>
            );
          })}
        </nav>
        <button
          type="button"
          className={styles.publicLink}
          onClick={onSignOut}
        >
          خروج از ادمین
        </button>
        <Link href="/" className={styles.publicLink}>
          بازگشت به سایت
        </Link>
      </aside>

      <main className={`${styles.main} ${activeTab === "wiki" ? styles.wikiMain : ""}`}>
        <header className={`${styles.toolbar} ${activeTab === "wiki" ? styles.wikiToolbar : ""}`}>
          <div className={styles.toolbarTitle}>
            <span className={styles.eyebrow}>پنل خصوصی هالیوس</span>
            <h2>{activeTabConfig?.label}</h2>
            {lastUpdatedAt && activeTab !== "telegram" && activeTab !== "wiki" ? (
              <small>آخرین بروزرسانی: {formatDate(lastUpdatedAt)}</small>
            ) : null}
          </div>

          <div className={styles.toolbarActions}>
            {(activeTab === "users" || activeTab === "reports") ? (
              <form className={styles.search} onSubmit={submitSearch}>
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="جست‌وجوی شناسه، نام یا ایمیل"
                />
                <button type="submit">جست‌وجو</button>
              </form>
            ) : null}
            {activeTab !== "wiki" && activeTab !== "telegram" ? (
              <button type="button" onClick={() => void loadTab()} disabled={loading}>
                تازه‌سازی
              </button>
            ) : null}
          </div>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}
        {message ? <p className={styles.success}>{message}</p> : null}
        {loading && activeTab !== "wiki" && activeTab !== "telegram" ? (
          <div className={styles.loadingBar}>در حال دریافت داده…</div>
        ) : null}

        {activeTab === "overview" && overview ? (
          <div className={styles.overviewStack}>
            <section className={styles.metricGrid}>
              {[
                ["کاربران", overview.users],
                ["همه گزارش‌ها", overview.reports],
                ["گزارش عمومی", overview.publicReports],
                ["گزارش خصوصی", overview.privateReports],
                ["درخواست باز", overview.openPremiumRequests],
                ["رویداد ممیزی ۲۴ ساعت", overview.auditEvents24h],
              ].map(([label, value]) => (
                <article key={String(label)} className={styles.metricCompact}>
                  <span>{label}</span>
                  <strong>{Number(value).toLocaleString("fa-IR")}</strong>
                </article>
              ))}
            </section>

            <section className={styles.attentionPanel}>
              <div>
                <span className={styles.eyebrow}>نیازمند توجه</span>
                <h3>کارهایی که احتمالاً الان مهم‌ترند</h3>
              </div>
              <div className={styles.attentionItems}>
                <button type="button" onClick={() => selectTab("premium")}>
                  <strong>{overview.openPremiumRequests.toLocaleString("fa-IR")}</strong>
                  <span>درخواست پرمیوم باز</span>
                </button>
                <button type="button" onClick={() => selectTab("audit")}>
                  <strong>{overview.auditEvents24h.toLocaleString("fa-IR")}</strong>
                  <span>رویداد ممیزی در ۲۴ ساعت</span>
                </button>
              </div>
            </section>

            <section className={styles.quickActions}>
              <button type="button" onClick={() => selectTab("telegram")}>
                <strong>تلگرام</strong>
                <span>صف، پوشش و ورود Content Pack</span>
              </button>
              <button type="button" onClick={() => navigate("wiki", { section: "queue" })}>
                <strong>صف ویکی</strong>
                <span>انتشارهای آینده و وضعیت jobها</span>
              </button>
              <button type="button" onClick={() => navigate("wiki", { section: "new" })}>
                <strong>مقاله تازه</strong>
                <span>ورود سریع به ویرایشگر</span>
              </button>
              <button type="button" onClick={() => selectTab("reports")}>
                <strong>گزارش‌ها</strong>
                <span>جست‌وجو و مدیریت دسترسی</span>
              </button>
            </section>
          </div>
        ) : null}

        {activeTab === "users" ? (
          <>
            {users.length ? (
              <>
                <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
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
                            <span className={styles.statusPill} data-tone={badgeTone(user.status)}>
                              {user.status}
                            </span>
                            <small>{user.plan}</small>
                          </td>
                          <td>
                            {user.reportCount.toLocaleString("fa-IR")}
                            <small>{formatDate(user.lastReportAt)}</small>
                          </td>
                          <td>{formatDate(user.lastSignInAt)}</td>
                          <td>{user.latestNote || "—"}</td>
                          <td>
                            <details className={styles.actionMenu}>
                              <summary>عملیات</summary>
                              <div>
                                {hasCapability(session, "users.status.write") ? (
                                  <button type="button" onClick={() => void changeUserStatus(user)}>
                                    {user.status === "suspended" ? "فعال‌سازی" : "تعلیق"}
                                  </button>
                                ) : null}
                                {hasCapability(session, "users.notes.write") ? (
                                  <button type="button" onClick={() => void addUserNote(user.id)}>
                                    یادداشت
                                  </button>
                                ) : null}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={`${styles.mobileCards} ${styles.mobileOnly}`}>
                  {users.map((user) => (
                    <article className={styles.mobileRecord} key={user.id}>
                      <div className={styles.recordHeader}>
                        <div>
                          <strong>{user.displayName || "بدون نام نمایشی"}</strong>
                          <small>{user.email || user.id}</small>
                        </div>
                        <span className={styles.statusPill} data-tone={badgeTone(user.status)}>
                          {user.status}
                        </span>
                      </div>
                      <div className={styles.recordMeta}>
                        <span>پلن: {user.plan}</span>
                        <span>گزارش: {user.reportCount.toLocaleString("fa-IR")}</span>
                        <span>آخرین ورود: {formatDate(user.lastSignInAt)}</span>
                      </div>
                      {user.latestNote ? <p className={styles.recordNote}>{user.latestNote}</p> : null}
                      <div className={styles.recordActions}>
                        {hasCapability(session, "users.status.write") ? (
                          <button type="button" onClick={() => void changeUserStatus(user)}>
                            {user.status === "suspended" ? "فعال‌سازی" : "تعلیق"}
                          </button>
                        ) : null}
                        {hasCapability(session, "users.notes.write") ? (
                          <button type="button" onClick={() => void addUserNote(user.id)}>
                            یادداشت
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState>کاربری در این صفحه پیدا نشد.</EmptyState>
            )}
          </>
        ) : null}

        {activeTab === "reports" ? (
          <>
            {reports.length ? (
              <>
                <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
                  <table>
                    <thead>
                      <tr>
                        <th>عنوان</th>
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
                          <td><strong>{report.title}</strong><small>{report.source}</small></td>
                          <td>{report.ownerDisplayName || report.ownerUserId}</td>
                          <td>
                            <span className={styles.statusPill} data-tone={badgeTone(report.visibility)}>
                              {report.visibility}
                            </span>
                            <small>{report.accessTier}</small>
                          </td>
                          <td>{report.engineVersion || "—"}<small>{report.reportVersion || "—"}</small></td>
                          <td>{report.publicationConsentState}</td>
                          <td>{formatDate(report.createdAt)}</td>
                          <td>
                            <details className={styles.actionMenu}>
                              <summary>عملیات</summary>
                              <div>
                                <Link href={`/admini/reports/${report.id}`}>جزئیات</Link>
                                {hasCapability(session, "reports.title.write") ? (
                                  <button type="button" onClick={() => void updateReportTitle(report)}>ویرایش عنوان</button>
                                ) : null}
                                {report.visibility !== "restricted_by_admin" && hasCapability(session, "reports.visibility.restrict") ? (
                                  <button type="button" onClick={() => void restrictReport(report.id)}>محدودسازی</button>
                                ) : null}
                                {hasCapability(session, "reports.private_content.read") ? (
                                  <button type="button" onClick={() => void inspectPrivateReport(report.id)}>دسترسی audit‌شده</button>
                                ) : null}
                                {hasCapability(session, "reports.delete") ? (
                                  <button className={styles.dangerButton} type="button" onClick={() => void deleteReport(report.id)}>حذف نرم</button>
                                ) : null}
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
                        <div>
                          <strong>{report.title}</strong>
                          <small>{report.ownerDisplayName || report.ownerUserId}</small>
                        </div>
                        <span className={styles.statusPill} data-tone={badgeTone(report.visibility)}>
                          {report.visibility}
                        </span>
                      </div>
                      <div className={styles.recordMeta}>
                        <span>پلن: {report.accessTier}</span>
                        <span>ساخته‌شده: {formatDate(report.createdAt)}</span>
                        <span>رضایت: {report.publicationConsentState}</span>
                      </div>
                      <div className={styles.recordActions}>
                        <Link href={`/admini/reports/${report.id}`}>جزئیات</Link>
                        {hasCapability(session, "reports.title.write") ? (
                          <button type="button" onClick={() => void updateReportTitle(report)}>ویرایش</button>
                        ) : null}
                        {report.visibility !== "restricted_by_admin" && hasCapability(session, "reports.visibility.restrict") ? (
                          <button type="button" onClick={() => void restrictReport(report.id)}>محدودسازی</button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState>گزارشی در این صفحه پیدا نشد.</EmptyState>
            )}
            {privateReport ? (
              <section className={styles.privateViewer}>
                <div className={styles.viewerHeader}>
                  <h3>محتوای خصوصی با دسترسی ثبت‌شده</h3>
                  <button type="button" onClick={() => setPrivateReport(null)}>بستن</button>
                </div>
                <pre>{JSON.stringify(privateReport, null, 2)}</pre>
              </section>
            ) : null}
          </>
        ) : null}

        {activeTab === "premium" ? (
          <>
            {premiumRequests.length ? (
              <>
                <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
                  <table>
                    <thead>
                      <tr>
                        <th>درخواست</th>
                        <th>راه ارتباطی</th>
                        <th>انتشار</th>
                        <th>وضعیت</th>
                        <th>تحویل</th>
                        <th>ثبت‌شده</th>
                        <th>عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {premiumRequests.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.requestedProduct}</strong><small>#{item.id}</small></td>
                          <td>{item.contactName}<small>{item.contactValue}</small></td>
                          <td>{item.publicationChoice}</td>
                          <td>
                            {hasCapability(session, "premium_requests.write") ? (
                              <select
                                value={item.status}
                                onChange={(event) => void updatePremium(item, event.target.value as AdminPremiumRequestSummary["status"])}
                              >
                                {Object.entries(premiumStatusLabels).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            ) : (
                              premiumStatusLabels[item.status]
                            )}
                          </td>
                          <td>{item.deliveryStatus}<small>{item.dueDate || "بدون موعد"}</small></td>
                          <td>{formatDate(item.createdAt)}</td>
                          <td>
                            <details className={styles.actionMenu}>
                              <summary>جزئیات</summary>
                              <div>
                                <p>{item.customerNotes || "بدون توضیح کاربر"}</p>
                                <small>یادداشت داخلی: {item.internalNotes || "—"}</small>
                                <small>مبلغ: {item.agreedAmount || "—"}</small>
                                {hasCapability(session, "premium_requests.write") ? (
                                  <button type="button" onClick={() => void editPremium(item)}>ویرایش جزئیات</button>
                                ) : null}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={`${styles.mobileCards} ${styles.mobileOnly}`}>
                  {premiumRequests.map((item) => (
                    <article className={styles.mobileRecord} key={item.id}>
                      <div className={styles.recordHeader}>
                        <div><strong>{item.requestedProduct}</strong><small>{item.contactName} · {item.contactValue}</small></div>
                        <span className={styles.statusPill} data-tone={badgeTone(item.status)}>{premiumStatusLabels[item.status]}</span>
                      </div>
                      <div className={styles.recordMeta}>
                        <span>تحویل: {item.deliveryStatus}</span>
                        <span>موعد: {item.dueDate || "ندارد"}</span>
                        <span>ثبت: {formatDate(item.createdAt)}</span>
                      </div>
                      <details className={styles.recordDetails}>
                        <summary>توضیحات درخواست</summary>
                        <p>{item.customerNotes || "بدون توضیح کاربر"}</p>
                        <small>یادداشت داخلی: {item.internalNotes || "—"}</small>
                      </details>
                      {hasCapability(session, "premium_requests.write") ? (
                        <div className={styles.recordActions}>
                          <button type="button" onClick={() => void editPremium(item)}>ویرایش جزئیات</button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState>درخواست پرمیومی در این صفحه نیست.</EmptyState>
            )}
          </>
        ) : null}

        {activeTab === "audit" ? (
          <>
            {auditEvents.length ? (
              <>
                <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
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
                          <td>{event.actorRole || "system"}<small>{event.actorUserId || "—"}</small></td>
                          <td>{event.action}<small>{event.reason || "—"}</small></td>
                          <td>{event.targetType}<small>{event.targetId || "—"}</small></td>
                          <td><span className={styles.statusPill} data-tone={event.success ? "positive" : "danger"}>{event.success ? "موفق" : "ناموفق"}</span></td>
                          <td><small>{event.requestCorrelationId}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={`${styles.mobileCards} ${styles.mobileOnly}`}>
                  {auditEvents.map((event) => (
                    <article className={styles.mobileRecord} key={event.id}>
                      <div className={styles.recordHeader}>
                        <div><strong>{event.action}</strong><small>{formatDate(event.createdAt)}</small></div>
                        <span className={styles.statusPill} data-tone={event.success ? "positive" : "danger"}>{event.success ? "موفق" : "ناموفق"}</span>
                      </div>
                      <div className={styles.recordMeta}>
                        <span>عامل: {event.actorRole || "system"}</span>
                        <span>هدف: {event.targetType}</span>
                      </div>
                      {event.reason ? <p className={styles.recordNote}>{event.reason}</p> : null}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState>رویداد ممیزی در این صفحه نیست.</EmptyState>
            )}
          </>
        ) : null}

        {activeTab === "telegram" ? <TelegramAdminPanel token={token} /> : null}

        {activeTab === "wiki" ? (
          <WikiAdminPanel
            activeSection={wikiSection}
            onSectionChange={(section) => navigate("wiki", { section })}
            session={session}
            token={token}
          />
        ) : null}

        {["users", "reports", "premium", "audit"].includes(activeTab) ? (
          <Paginator
            page={page}
            itemCount={paginationCount}
            onPage={(nextPage) => navigate(activeTab, { page: nextPage })}
          />
        ) : null}
      </main>
    </div>
  );
}
