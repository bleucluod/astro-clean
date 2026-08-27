"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminSessionPayload } from "@/lib/admin/admin-types";
import type {
  WikiIndexabilityArticleStatus,
  WikiIndexabilityObservabilityState,
} from "@/lib/wiki/wiki-indexability-observability-types";
import type {
  WikiLinkAdminState,
  WikiLinkGraphArticle,
  WikiLinkGraphEdge,
  WikiLinkAdminSuggestion,
  WikiLinkScanRules,
} from "@/lib/wiki/wiki-link-admin-types";
import styles from "./admin-console.module.css";

const FA = {
  title: "نگهداری لینک‌های داخلی",
  subtitle:
    "اسکن، گراف، ایرادها و پیشنهادها بدون انتشار خودکار",
  fullScan: "اسکن کامل ویکی",
  rescan: "اسکن دوباره این مقاله",
  noScan: "هنوز اسکنی ثبت نشده است.",
  articles: "مقاله‌ها",
  findings: "ایرادها",
  suggestions: "پیشنهادها",
  outgoing: "لینک‌های خروجی",
  incoming: "لینک‌های ورودی",
  rules: "قواعد اسکن",
  saveRules: "ذخیره نسخه جدید قواعد",
  back: "بازگشت به همه مقاله‌ها",
  edit: "ویرایش پیشنهاد",
  approve: "تایید",
  reject: "رد",
  apply: "اعمال در پیش‌نویس",
  rollback: "بازگردانی",
  readiness: "آمادگی ایندکس",
  readinessSubtitle:
    "وضعیت فنی انتشار، sitemap و لینک‌های materialized؛ این بخش ادعای ایندکس گوگل نیست.",
  graph: "خروجی هوشمند لینک‌سازی",
  graphSubtitle:
    "نقشه body-only: لینک‌های متن مقاله حساب می‌شوند؛ هدر، فوتر، breadcrumb، CTA و related حساب نمی‌شوند.",
  copyGraph: "کپی JSON برای AI",
  draftOnly:
    "اعمال پیشنهاد فقط پیش‌نویس می‌سازد؛ هیچ انتشار خودکاری انجام نمی‌شود.",
};

type GraphStatusFilter = "all" | "published" | "scheduled" | "draft";
type GraphIssueFilter =
  | "all"
  | "problem"
  | "missing"
  | "unpublished"
  | "noindex"
  | "noIncoming";
type GraphSort =
  | "problem"
  | "title"
  | "outgoingDesc"
  | "incomingAsc"
  | "scheduled";

type Props = {
  token: string;
  session: AdminSessionPayload;
};

const NUMERIC_RULE_FIELDS = [
  ["outgoingMin", "Outgoing min"],
  ["outgoingMax", "Outgoing max"],
  ["incomingMin", "Incoming min"],
  ["incomingTarget", "Incoming target"],
  ["incomingMax", "Incoming max"],
  ["categoryLinkMax", "Category max"],
  ["anchorMinChars", "Anchor min"],
  ["anchorMaxChars", "Anchor max"],
] as const satisfies readonly [
  keyof Pick<
    WikiLinkScanRules,
    | "outgoingMin"
    | "outgoingMax"
    | "incomingMin"
    | "incomingTarget"
    | "incomingMax"
    | "categoryLinkMax"
    | "anchorMinChars"
    | "anchorMaxChars"
  >,
  string,
][];

// HALLEUS_WIKI_OUTGOING_MIN_OPTIONAL
const emptyRules: WikiLinkScanRules = {
  outgoingMin: 0,
  outgoingMax: 0,
  // HALLEUS_WIKI_INCOMING_MIN_OPTIONAL_TARGET3
  incomingMin: 0,
  incomingTarget: 3,
  incomingMax: 0,
  breadcrumbRequired: true,
  categoryLinkMax: 1,
  coreMax: 0,
  coreRoutes: ["/", "/chart", "/compare", "/sky", "/wiki"],
  anchorMinChars: 3,
  anchorMaxChars: 120,
  oneWordCoreAllowlist: ["هالیوس"],
  excludedStableIds: [],
  prohibitSelf: true,
  prohibitDuplicate: true,
  prohibitUnpublishedTargets: true,
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    suggested: "پیشنهادشده",
    edited: "ویرایش‌شده",
    approved: "تاییدشده",
    rejected: "ردشده",
    conflict: "تعارض",
    applied: "اعمال‌شده",
    verified: "تایید نهایی",
    rolled_back: "بازگردانده‌شده",
  };
  return labels[value] ?? value;
}

function formatNumber(value: number) {
  return value.toLocaleString("fa-IR");
}

function readinessLabel(article: WikiIndexabilityArticleStatus) {
  if (article.severity === "blocked") return "BLOCKED";
  if (article.severity === "warning") return "WATCH";
  return "OK";
}

function graphArticleStatus(article: WikiLinkGraphArticle) {
  if (article.publicReady) return "published";
  const scheduledAt = article.scheduledFor ? Date.parse(article.scheduledFor) : Number.NaN;
  if (article.status === "scheduled" || (Number.isFinite(scheduledAt) && scheduledAt > Date.now())) {
    return "scheduled";
  }
  return "draft";
}

function graphArticleStatusLabel(article: WikiLinkGraphArticle) {
  const status = graphArticleStatus(article);
  if (status === "published") return "منتشر";
  if (status === "scheduled") return "زمان‌بندی";
  return "پیش‌نویس";
}

function graphTargetLabel(edge: WikiLinkGraphEdge) {
  if (edge.targetTitle) return edge.targetTitle;
  return edge.targetStableId;
}

function graphTargetStateLabel(edge: WikiLinkGraphEdge) {
  const labels: Record<WikiLinkGraphEdge["targetState"], string> = {
    published: "منتشر",
    scheduled: "زمان‌بندی",
    draft: "پیش‌نویس",
    noindex: "noindex",
    missing: "پیدا نشد",
  };
  return labels[edge.targetState];
}

function edgeListPreview(edges: WikiLinkGraphEdge[], direction: "out" | "in") {
  if (!edges.length) return <span className={styles.mutedInline}>-</span>;
  return (
    <div className={styles.linkGraphList}>
      {edges.slice(0, 5).map((edge, index) => (
        <span key={`${edge.sourceStableId}-${edge.targetStableId}-${edge.anchor}-${index}`}>
          {direction === "out" ? graphTargetLabel(edge) : edge.sourceTitle}
          <small>{edge.anchor} · {graphTargetStateLabel(edge)}</small>
        </span>
      ))}
      {edges.length > 5 ? <small>+{formatNumber(edges.length - 5)} لینک دیگر</small> : null}
    </div>
  );
}

export function WikiLinkAdminPanel({ token, session }: Props) {
  const [state, setState] = useState<WikiLinkAdminState | null>(null);
  const [indexabilityState, setIndexabilityState] =
    useState<WikiIndexabilityObservabilityState | null>(null);
  const [selectedStableId, setSelectedStableId] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<WikiLinkScanRules>(emptyRules);
  const [graphQuery, setGraphQuery] = useState("");
  const [graphStatusFilter, setGraphStatusFilter] =
    useState<GraphStatusFilter>("all");
  const [graphIssueFilter, setGraphIssueFilter] =
    useState<GraphIssueFilter>("problem");
  const [graphSort, setGraphSort] = useState<GraphSort>("problem");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canDraft = session.capabilities.includes("wiki.draft.write");
  const canPublish = session.capabilities.includes("wiki.publish.write");
  const canSettings = session.capabilities.includes("wiki.settings.write");

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${token}`);
      if (init?.body) headers.set("content-type", "application/json");
      const response = await fetch(path, {
        ...init,
        cache: "no-store",
        headers,
      });
      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Wiki link maintenance request failed.",
        );
      }
      return payload;
    },
    [token],
  );

  const load = useCallback(
    async (stableId?: string | null) => {
      setLoading(true);
      setError("");
      try {
        const query = stableId ? `?stableId=${encodeURIComponent(stableId)}` : "";
        const [payload, indexabilityPayload] = await Promise.all([
          request(`/api/admin/wiki/link-maintenance${query}`),
          request("/api/admin/wiki/indexability"),
        ]);
        const next = payload.state as WikiLinkAdminState;
        setState(next);
        setIndexabilityState(
          indexabilityPayload.state as WikiIndexabilityObservabilityState,
        );
        setRuleDraft(next.rules);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Load failed.");
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  useEffect(() => {
    let cancelled = false;
    const query = selectedStableId
      ? `?stableId=${encodeURIComponent(selectedStableId)}`
      : "";

    void Promise.all([
      request(`/api/admin/wiki/link-maintenance${query}`),
      request("/api/admin/wiki/indexability"),
    ])
      .then(([payload, indexabilityPayload]) => {
        if (cancelled) return;
        const next = payload.state as WikiLinkAdminState;
        setState(next);
        setIndexabilityState(
          indexabilityPayload.state as WikiIndexabilityObservabilityState,
        );
        setRuleDraft(next.rules);
        setError("");
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Load failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [request, selectedStableId]);

  async function mutate(
    action: string,
    body: Record<string, unknown>,
    success: string,
  ) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request("/api/admin/wiki/link-maintenance", {
        method: "POST",
        body: JSON.stringify({ action, ...body }),
      });
      setMessage(success);
      await load(selectedStableId);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Mutation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runScan(stableId?: string | null) {
    await mutate(
      "scan",
      stableId ? { stableId } : {},
      stableId
        ? "اسکن مقاله ثبت شد."
        : "اسکن کامل ثبت شد.",
    );
  }

  async function suggestionAction(
    suggestion: WikiLinkAdminSuggestion,
    action: "approve_suggestion" | "reject_suggestion" | "apply_suggestion" | "rollback_suggestion",
  ) {
    const reason = window.prompt(
      "دلیل این تصمیم را ثبت کن:",
    );
    if (!reason?.trim()) return;
    await mutate(
      action,
      { suggestionId: suggestion.id, reason: reason.trim() },
      "وضعیت پیشنهاد به‌روز شد.",
    );
  }

  async function editSuggestion(suggestion: WikiLinkAdminSuggestion) {
    const proposedAnchor = window.prompt(
      "انکر پیشنهادی:",
      suggestion.proposedAnchor,
    );
    if (!proposedAnchor?.trim()) return;
    const defaultParagraph = suggestion.proposedParagraph.replace(
      `|${suggestion.proposedAnchor}]]`,
      `|${proposedAnchor.trim()}]]`,
    );
    const proposedParagraph = window.prompt(
      "پاراگراف نهایی:",
      defaultParagraph,
    );
    if (!proposedParagraph?.trim()) return;
    const reason = window.prompt(
      "دلیل ویرایش:",
    );
    if (!reason?.trim()) return;
    await mutate(
      "edit_suggestion",
      {
        suggestionId: suggestion.id,
        proposedAnchor: proposedAnchor.trim(),
        proposedParagraph: proposedParagraph.trim(),
        reason: reason.trim(),
      },
      "پیشنهاد ویرایش شد.",
    );
  }

  async function saveRules() {
    const reason = window.prompt(
      "دلیل ثبت نسخه جدید قواعد:",
    );
    if (!reason?.trim()) return;
    await mutate(
      "save_rules",
      { rules: ruleDraft, reason: reason.trim() },
      "نسخه جدید قواعد فعال شد.",
    );
  }

  const suggestions = state?.detail?.suggestions ?? state?.suggestions ?? [];
  const readinessArticles =
    indexabilityState?.articles.filter((article) => article.severity !== "ok").slice(0, 8) ?? [];
  const graphArticles = useMemo(() => {
    const normalizedQuery = graphQuery.trim().toLowerCase();
    const articles = [...(state?.graph.articles ?? [])].filter((article) => {
      if (graphStatusFilter !== "all" && graphArticleStatus(article) !== graphStatusFilter) {
        return false;
      }
      if (
        graphIssueFilter === "problem" &&
        article.unresolvedOutgoingCount === 0 &&
        article.bodyIncomingCount > 0
      ) {
        return false;
      }
      if (
        graphIssueFilter === "missing" &&
        !article.outgoingBodyLinks.some((edge) => edge.targetState === "missing")
      ) {
        return false;
      }
      if (
        graphIssueFilter === "unpublished" &&
        !article.outgoingBodyLinks.some(
          (edge) => edge.targetState === "scheduled" || edge.targetState === "draft",
        )
      ) {
        return false;
      }
      if (
        graphIssueFilter === "noindex" &&
        !article.outgoingBodyLinks.some((edge) => edge.targetState === "noindex")
      ) {
        return false;
      }
      if (graphIssueFilter === "noIncoming" && article.bodyIncomingCount > 0) {
        return false;
      }
      if (!normalizedQuery) return true;
      const haystack = [
        article.title,
        article.slug,
        article.stableId,
        article.categoryId,
        ...article.outgoingBodyLinks.flatMap((edge) => [
          edge.anchor,
          edge.targetStableId,
          edge.targetTitle ?? "",
          edge.targetSlug ?? "",
        ]),
        ...article.incomingBodyLinks.flatMap((edge) => [
          edge.anchor,
          edge.sourceStableId,
          edge.sourceTitle,
          edge.sourceSlug,
        ]),
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    articles.sort((left, right) => {
      if (graphSort === "title") return left.title.localeCompare(right.title, "fa");
      if (graphSort === "outgoingDesc") {
        return right.bodyOutgoingCount - left.bodyOutgoingCount ||
          left.title.localeCompare(right.title, "fa");
      }
      if (graphSort === "incomingAsc") {
        return left.bodyIncomingCount - right.bodyIncomingCount ||
          left.title.localeCompare(right.title, "fa");
      }
      if (graphSort === "scheduled") {
        return (Date.parse(left.scheduledFor ?? "") || Number.MAX_SAFE_INTEGER) -
          (Date.parse(right.scheduledFor ?? "") || Number.MAX_SAFE_INTEGER) ||
          left.title.localeCompare(right.title, "fa");
      }
      return right.unresolvedOutgoingCount - left.unresolvedOutgoingCount ||
        left.bodyIncomingCount - right.bodyIncomingCount ||
        left.title.localeCompare(right.title, "fa");
    });
    return articles;
  }, [graphIssueFilter, graphQuery, graphSort, graphStatusFilter, state?.graph.articles]);

  async function copyGraphExport() {
    if (!state?.graph) return;
    const exportPayload = {
      generatedAt: state.graph.generatedAt,
      scope: state.graph.scope,
      notes: state.graph.notes,
      filters: {
        query: graphQuery.trim(),
        status: graphStatusFilter,
        issue: graphIssueFilter,
        sort: graphSort,
      },
      summary: state.graph.summary,
      articles: graphArticles,
    };
    await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setMessage("خروجی JSON گراف لینک‌سازی کپی شد.");
  }
  const kpiRows = state?.kpis
    ? [
        ["Live", state.kpis.liveArticleCount],
        ["Managed", state.kpis.managedArticleCount],
        ["Compliant", state.kpis.fullyCompliant],
        ["Under incoming target", state.kpis.underInlinked],
        ["Outgoing outside 3-5", state.kpis.outgoingOutsideRange],
        ["Missing core", state.kpis.missingCoreLink],
        ["Breadcrumb", state.kpis.breadcrumbIssue],
        ["Target issues", state.kpis.internalTargetIssue],
        ["One-word", state.kpis.oneWordViolation],
        ["Anchor collision", state.kpis.anchorCollision],
        ["Self", state.kpis.selfLink],
        ["Duplicate", state.kpis.duplicate],
      ]
    : [];

  return (
    <div className={styles.wikiWorkspace}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}
      {loading ? <p className={styles.loading}>...</p> : null}

      <section className={styles.wikiPanel}>
        <div className={styles.wikiPanelHeader}>
          <div>
            <h2>{FA.title}</h2>
            <p>{FA.subtitle}</p>
            <small>{FA.draftOnly}</small>
          </div>
          {canSettings ? (
            <button type="button" onClick={() => void runScan(selectedStableId)}>
              {selectedStableId ? FA.rescan : FA.fullScan}
            </button>
          ) : null}
        </div>

        {state?.latestScan ? (
          <p>
            Scan #{state.latestScan.id.slice(0, 8)} | {state.latestScan.edgeCount} edges |
            {" "}{state.latestScan.findingCount} findings | {formatDate(state.latestScan.completedAt)}
          </p>
        ) : (
          <p>{FA.noScan}</p>
        )}

        {kpiRows.length ? (
          <div className={styles.recordMeta}>
            {kpiRows.map(([label, value]) => (
              <span key={String(label)}>
                <strong>{Number(value).toLocaleString("fa-IR")}</strong> {label}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {indexabilityState ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>{FA.readiness}</h3>
              <p>{FA.readinessSubtitle}</p>
            </div>
            <small>{formatDate(indexabilityState.generatedAt)}</small>
          </div>
          <div className={styles.recordMeta}>
            <span><strong>{formatNumber(indexabilityState.summary.publicReady)}</strong> public-ready</span>
            <span><strong>{formatNumber(indexabilityState.summary.sitemapEligible)}</strong> sitemap</span>
            <span><strong>{formatNumber(indexabilityState.summary.blocked)}</strong> blocked</span>
            <span><strong>{formatNumber(indexabilityState.summary.warning)}</strong> watch</span>
            <span><strong>{formatNumber(indexabilityState.summary.failedLinks)}</strong> failed links</span>
            <span><strong>{formatNumber(indexabilityState.summary.disabledLinks)}</strong> disabled links</span>
            <span><strong>{formatNumber(indexabilityState.summary.unresolvedInlineTargets)}</strong> unresolved targets</span>
          </div>
          {readinessArticles.length ? (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Article</th><th>Path</th><th>State</th><th>Links</th><th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {readinessArticles.map((article) => (
                    <tr key={article.stableId}>
                      <td>
                        <strong>{article.title}</strong>
                        <small>{article.stableId}</small>
                      </td>
                      <td>{article.expectedPath}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          data-tone={article.severity === "blocked" ? "danger" : "attention"}
                        >
                          {readinessLabel(article)}
                        </span>
                      </td>
                      <td>
                        out {article.outgoing.active} / in {article.incoming.active}
                      </td>
                      <td>{article.reasons[0] ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>همه مقاله‌های قابل انتشار از نظر readiness فعلی سالم‌اند.</p>
          )}
        </section>
      ) : null}

      {state?.graph ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>{FA.graph}</h3>
              <p>{FA.graphSubtitle}</p>
              <small>آخرین خوانش زنده: {formatDate(state.graph.generatedAt)}</small>
            </div>
            <button type="button" onClick={() => void copyGraphExport()}>
              {FA.copyGraph}
            </button>
          </div>
          <div className={styles.recordMeta}>
            <span><strong>{formatNumber(state.graph.summary.totalArticles)}</strong> کل مقاله‌ها</span>
            <span><strong>{formatNumber(state.graph.summary.published)}</strong> منتشر</span>
            <span><strong>{formatNumber(state.graph.summary.scheduled)}</strong> زمان‌بندی</span>
            <span><strong>{formatNumber(state.graph.summary.draft)}</strong> پیش‌نویس</span>
            <span><strong>{formatNumber(state.graph.summary.bodyEdges)}</strong> لینک داخل متن</span>
            <span><strong>{formatNumber(state.graph.summary.unresolvedOutgoing)}</strong> مقصد نیازمند بررسی</span>
            <span><strong>{formatNumber(state.graph.summary.articlesWithoutIncoming)}</strong> بدون ورودی متنی</span>
          </div>
          <div className={styles.wikiFilters}>
            <input
              type="search"
              value={graphQuery}
              onChange={(event) => setGraphQuery(event.target.value)}
              placeholder="جستجو در عنوان، slug، anchor یا مقصد لینک"
            />
            <select
              value={graphStatusFilter}
              onChange={(event) => setGraphStatusFilter(event.target.value as GraphStatusFilter)}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="published">منتشرشده</option>
              <option value="scheduled">زمان‌بندی‌شده</option>
              <option value="draft">پیش‌نویس</option>
            </select>
            <select
              value={graphIssueFilter}
              onChange={(event) => setGraphIssueFilter(event.target.value as GraphIssueFilter)}
            >
              <option value="all">همه مقاله‌ها</option>
              <option value="problem">نیازمند کار</option>
              <option value="missing">مقصد پیدا نمی‌شود</option>
              <option value="unpublished">مقصد منتشر نشده</option>
              <option value="noindex">مقصد noindex</option>
              <option value="noIncoming">بدون لینک ورودی متنی</option>
            </select>
            <select
              value={graphSort}
              onChange={(event) => setGraphSort(event.target.value as GraphSort)}
            >
              <option value="problem">اول مشکل‌دارها</option>
              <option value="incomingAsc">ورودی کمتر اول</option>
              <option value="outgoingDesc">خروجی بیشتر اول</option>
              <option value="scheduled">زمان‌بندی نزدیک‌تر</option>
              <option value="title">عنوان</option>
            </select>
          </div>
          <p className={styles.recordNote}>
            کار عملی: مقاله‌هایی که «مقصد نیازمند بررسی» دارند را اصلاح کن؛ برای مقاله‌های بدون
            ورودی متنی، از مقاله‌های مرتبط بهشان لینک بده. دکمه JSON همین جدول فیلترشده را برای
            استفاده در AI کپی می‌کند.
          </p>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>مقاله</th>
                  <th>وضعیت</th>
                  <th>به کجا لینک داده؟</th>
                  <th>از کجا لینک گرفته؟</th>
                  <th>مشکل عملی</th>
                </tr>
              </thead>
              <tbody>
                {graphArticles.map((article) => (
                  <tr key={article.stableId}>
                    <td>
                      <strong>{article.title}</strong>
                      <small>{article.stableId}</small>
                    </td>
                    <td>
                      <span
                        className={styles.statusPill}
                        data-tone={article.publicReady ? "positive" : "attention"}
                      >
                        {graphArticleStatusLabel(article)}
                      </span>
                      <small>{article.scheduledFor ? formatDate(article.scheduledFor) : article.slug}</small>
                    </td>
                    <td>
                      <strong>{formatNumber(article.bodyOutgoingCount)} خروجی متنی</strong>
                      {edgeListPreview(article.outgoingBodyLinks, "out")}
                    </td>
                    <td>
                      <strong>{formatNumber(article.bodyIncomingCount)} ورودی متنی</strong>
                      {edgeListPreview(article.incomingBodyLinks, "in")}
                    </td>
                    <td>
                      {article.unresolvedOutgoingCount > 0 ? (
                        <span className={styles.statusPill} data-tone="danger">
                          {formatNumber(article.unresolvedOutgoingCount)} مقصد اصلاح شود
                        </span>
                      ) : article.bodyIncomingCount === 0 ? (
                        <span className={styles.statusPill} data-tone="attention">
                          لینک ورودی بساز
                        </span>
                      ) : (
                        <span className={styles.statusPill} data-tone="positive">
                          آماده
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canSettings && state ? (
        <details className={styles.wikiPanel}>
          <summary>{FA.rules} v{state.rules.version}</summary>
          <div className={styles.wikiSearchForm}>
            {NUMERIC_RULE_FIELDS.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  value={ruleDraft[key]}
                  onChange={(event) =>
                    setRuleDraft((current) => ({
                      ...current,
                      [key]: Number(event.target.value),
                    }))
                  }
                />
              </label>
            ))}
            <button type="button" onClick={() => void saveRules()}>
              {FA.saveRules}
            </button>
          </div>
        </details>
      ) : null}

      {selectedStableId && state?.detail ? (
        <>
          <section className={styles.wikiPanel}>
            <div className={styles.wikiPanelHeader}>
              <div>
                <h3>{state.detail.article.title}</h3>
                <small>{state.detail.article.slug}</small>
              </div>
              <button type="button" onClick={() => { setLoading(true); setSelectedStableId(null); }}>
                {FA.back}
              </button>
            </div>
            <div className={styles.recordMeta}>
              <span>Incoming: {state.detail.article.incoming}</span>
              <span>Outgoing: {state.detail.article.outgoing}</span>
              <span>Core: {state.detail.article.coreDestination ?? "-"}</span>
              <span>Findings: {state.detail.article.findingCount}</span>
            </div>
          </section>

          <section className={styles.wikiPanel}>
            <h3>{FA.outgoing}</h3>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr><th>Type</th><th>Target</th><th>Anchor</th><th>Placement</th></tr>
                </thead>
                <tbody>
                  {state.detail.outgoing.map((edge, index) => (
                    <tr key={`${edge.kind}-${edge.href}-${index}`}>
                      <td>{edge.kind}</td>
                      <td>{edge.targetStableId ?? edge.href}</td>
                      <td>{edge.anchor}</td>
                      <td>{edge.placement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.wikiPanel}>
            <h3>{FA.incoming}</h3>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr><th>Source</th><th>Anchor</th><th>Placement</th></tr>
                </thead>
                <tbody>
                  {state.detail.incoming.map((edge, index) => (
                    <tr key={`${edge.sourceStableId}-${index}`}>
                      <td>{edge.sourceStableId}</td>
                      <td>{edge.anchor}</td>
                      <td>{edge.placement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className={styles.wikiPanel}>
          <h3>{FA.articles}</h3>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Article</th><th>Category</th><th>Incoming</th><th>Outgoing</th>
                  <th>Core</th><th>Findings</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(state?.articles ?? []).map((article) => (
                  <tr key={article.stableId}>
                    <td>
                      <button type="button" onClick={() => { setLoading(true); setSelectedStableId(article.stableId); }}>
                        {article.title}
                      </button>
                      <small>{article.slug}</small>
                    </td>
                    <td>{article.categoryId}</td>
                    <td>{article.incoming}</td>
                    <td>{article.outgoing}</td>
                    <td>{article.coreDestination ?? "-"}</td>
                    <td>{article.findingCount}</td>
                    <td>
                      <span className={styles.statusPill} data-tone={article.compliant ? "positive" : "attention"}>
                        {article.compliant ? "PASS" : "REVIEW"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={styles.wikiPanel}>
        <h3>{FA.findings}</h3>
        {(state?.detail?.findings ?? state?.findings ?? []).length ? (
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Severity</th><th>Code</th><th>Source</th><th>Target</th></tr></thead>
              <tbody>
                {(state?.detail?.findings ?? state?.findings ?? []).map((item, index) => (
                  <tr key={`${item.sourceStableId}-${item.code}-${index}`}>
                    <td>{item.severity}</td>
                    <td>{item.code}</td>
                    <td>{item.sourceStableId}</td>
                    <td>{item.targetStableId ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>-</p>
        )}
      </section>

      <section className={styles.wikiPanel}>
        <h3>{FA.suggestions}</h3>
        {suggestions.length ? (
          suggestions.map((suggestion) => (
            <article key={suggestion.id} className={styles.mobileRecord}>
              <div className={styles.recordHeader}>
                <div>
                  <strong>{suggestion.sourceStableId} -&gt; {suggestion.targetStableId}</strong>
                  <small>{suggestion.placement} | {Math.round(suggestion.confidence * 100)}%</small>
                </div>
                <span className={styles.statusPill}>{statusLabel(suggestion.status)}</span>
              </div>
              <p>{suggestion.currentParagraph}</p>
              <pre>{suggestion.proposedParagraph}</pre>
              <div className={styles.recordActions}>
                {canDraft && ["suggested", "edited"].includes(suggestion.status) ? (
                  <button type="button" onClick={() => void editSuggestion(suggestion)}>
                    {FA.edit}
                  </button>
                ) : null}
                {canPublish && ["suggested", "edited"].includes(suggestion.status) ? (
                  <button
                    type="button"
                    onClick={() => void suggestionAction(suggestion, "approve_suggestion")}
                  >
                    {FA.approve}
                  </button>
                ) : null}
                {canDraft && ["suggested", "edited", "approved"].includes(suggestion.status) ? (
                  <button
                    type="button"
                    onClick={() => void suggestionAction(suggestion, "reject_suggestion")}
                  >
                    {FA.reject}
                  </button>
                ) : null}
                {canPublish && suggestion.status === "approved" ? (
                  <button
                    type="button"
                    onClick={() => void suggestionAction(suggestion, "apply_suggestion")}
                  >
                    {FA.apply}
                  </button>
                ) : null}
                {canPublish && ["applied", "verified"].includes(suggestion.status) ? (
                  <button
                    type="button"
                    onClick={() => void suggestionAction(suggestion, "rollback_suggestion")}
                  >
                    {FA.rollback}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p>-</p>
        )}
      </section>
    </div>
  );
}
