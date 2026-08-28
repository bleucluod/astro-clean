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
    "سلامت لینک‌های متن مقاله‌ها، مقصدهای خراب و فرصت‌های لینک‌سازی",
  fullScan: "اسکن کامل ویکی",
  rescan: "اسکن دوباره این مقاله",
  noScan: "هنوز اسکنی ثبت نشده است.",
  articles: "مقاله‌ها",
  findings: "ایرادها",
  suggestions: "پیشنهادها",
  outgoing: "لینک‌های خروجی",
  incoming: "لینک‌های ورودی",
  rules: "تنظیمات فنی اسکن",
  saveRules: "ذخیره نسخه جدید قواعد",
  back: "بازگشت به همه مقاله‌ها",
  edit: "ویرایش پیشنهاد",
  approve: "تایید",
  reject: "رد",
  apply: "اعمال در پیش‌نویس",
  rollback: "بازگردانی",
  readiness: "آمادگی ایندکس",
  readinessSubtitle:
    "این بخش می‌گوید کدام صفحه‌ها از نظر انتشار، سایت‌مپ و لینک‌های داخلی آماده‌اند؛ ادعای ایندکس گوگل نیست.",
  graph: "خروجی هوشمند لینک‌سازی",
  graphSubtitle:
    "فقط لینک‌های داخل متن مقاله حساب می‌شوند؛ لینک‌های منو، فوتر، مسیر دسته‌بندی، بخش دعوت به اقدام و پیشنهادهای پایین مقاله کنار گذاشته شده‌اند.",
  downloadGraph: "دانلود فایل داده",
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
  ["outgoingMin", "حداقل لینک خروجی"],
  ["outgoingMax", "حداکثر لینک خروجی"],
  ["incomingMin", "حداقل لینک ورودی"],
  ["incomingTarget", "هدف لینک ورودی"],
  ["incomingMax", "حداکثر لینک ورودی"],
  ["categoryLinkMax", "حداکثر لینک دسته‌بندی"],
  ["anchorMinChars", "حداقل طول متن لینک"],
  ["anchorMaxChars", "حداکثر طول متن لینک"],
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
  if (article.severity === "blocked") return "نیاز به اصلاح";
  if (article.severity === "warning") return "بررسی شود";
  return "سالم";
}

function readinessReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    "Body links point to unpublished or missing Wiki targets.":
      "در متن مقاله به صفحه‌ای لینک داده شده که هنوز منتشر نشده یا پیدا نمی‌شود.",
    "Article is not public-ready.":
      "مقاله هنوز برای نمایش عمومی آماده نیست.",
    "Article is excluded from sitemap.":
      "این صفحه داخل سایت‌مپ قرار نمی‌گیرد.",
    "Published row is not technically public-ready.":
      "مقاله منتشر شده، اما وضعیت فنی انتشار عمومی کامل نیست.",
    "Article has no incoming body links.":
      "هیچ مقاله‌ای از داخل متن به این صفحه لینک نداده است.",
    "Body links point to unavailable or invalid Wiki targets.":
      "در متن مقاله به مقصدی لینک داده شده که پیدا نمی‌شود، پیش‌نویس است یا قابل ایندکس نیست.",
    "Public article has no active inbound Wiki links yet.":
      "این صفحه منتشر است، اما هنوز از مقاله‌های منتشر دیگر لینک ورودی فعال ندارد.",
    "Public article has no active contextual outgoing Wiki links.":
      "این صفحه منتشر است، اما هنوز لینک خروجی متنی فعال ندارد.",
    "Some materialized links failed activation.":
      "بعضی لینک‌های ثبت‌شده فعال‌سازی ناموفق داشته‌اند.",
    "Some links were disabled after a publish or unpublish lifecycle change.":
      "بعضی لینک‌ها بعد از تغییر وضعیت انتشار غیرفعال شده‌اند.",
  };
  return labels[reason] ?? reason;
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
    noindex: "خارج از ایندکس",
    missing: "پیدا نشد",
  };
  return labels[edge.targetState];
}

function edgeListPreview(edges: WikiLinkGraphEdge[], direction: "out" | "in") {
  if (!edges.length) return <span className={styles.mutedInline}>-</span>;
  return (
    <details className={styles.linkGraphDetails}>
      <summary>نمایش {formatNumber(edges.length)} لینک</summary>
      <div className={styles.linkGraphList}>
        {edges.slice(0, 8).map((edge, index) => (
          <span key={`${edge.sourceStableId}-${edge.targetStableId}-${edge.anchor}-${index}`}>
            {direction === "out" ? graphTargetLabel(edge) : edge.sourceTitle}
            <small>{edge.anchor} · {graphTargetStateLabel(edge)}</small>
          </span>
        ))}
        {edges.length > 8 ? <small>+{formatNumber(edges.length - 8)} لینک دیگر</small> : null}
      </div>
    </details>
  );
}

function emitAdminNotice(detail: {
  tone?: "info" | "success" | "error";
  title: string;
  message?: string;
  durationMs?: number;
}) {
  window.dispatchEvent(new CustomEvent("halleus-admin-notification", { detail }));
}

function parseWikiAdminResponseError(status: number, text: string) {
  const cleanText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const suffix = cleanText ? ` جزئیات کوتاه: ${cleanText.slice(0, 140)}` : "";
  if (status === 401 || status === 403) {
    return `نشست ادمین معتبر نیست یا دسترسی این عملیات را نداری. صفحه را رفرش کن و دوباره وارد شو.${suffix}`;
  }
  return `پاسخ سرور قابل خواندن نبود. به جای JSON، صفحه HTML برگشت؛ معمولاً یعنی مسیر فنی این عملیات خطا داده یا نشست ادمین تمام شده است. کد HTTP: ${status}.${suffix}`;
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
  const [, setMessage] = useState("");
  const [, setError] = useState("");

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
      const contentType = response.headers.get("content-type") ?? "";
      let payload: Record<string, unknown> | null = null;
      if (contentType.includes("application/json")) {
        try {
          payload = (await response.json()) as Record<string, unknown>;
        } catch {
          throw new Error("پاسخ سرور JSON معتبر نبود. صفحه را رفرش کن؛ اگر تکرار شد باید مسیر فنی اسکن لینک‌ها بررسی شود.");
        }
      }
      if (!payload) {
        const text = await response.text();
        throw new Error(parseWikiAdminResponseError(response.status, text));
      }
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
        const nextError = loadError instanceof Error ? loadError.message : "بارگذاری ناموفق بود.";
        setError(nextError);
        emitAdminNotice({
          tone: "error",
          title: "بارگذاری لینک‌های ویکی ناموفق بود",
          message: nextError,
        });
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
        const nextError = loadError instanceof Error ? loadError.message : "بارگذاری ناموفق بود.";
        setError(nextError);
        emitAdminNotice({
          tone: "error",
          title: "بارگذاری لینک‌های ویکی ناموفق بود",
          message: nextError,
        });
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
    pending = "عملیات در حال انجام است…",
  ) {
    setLoading(true);
    setError("");
    setMessage("");
    emitAdminNotice({
      tone: "info",
      title: pending,
      message: "لطفاً همین صفحه را باز نگه دار؛ نتیجه همین‌جا اعلام می‌شود.",
      durationMs: 0,
    });
    try {
      await request("/api/admin/wiki/link-maintenance", {
        method: "POST",
        body: JSON.stringify({ action, ...body }),
      });
      setMessage(success);
      emitAdminNotice({ tone: "success", title: success });
      await load(selectedStableId);
    } catch (mutationError) {
      const nextError = mutationError instanceof Error ? mutationError.message : "عملیات ناموفق بود.";
      setError(nextError);
      emitAdminNotice({
        tone: "error",
        title: "عملیات انجام نشد",
        message: nextError,
      });
    } finally {
      setLoading(false);
    }
  }

  async function runScan(stableId?: string | null) {
    await mutate(
      "scan",
      stableId ? { stableId } : {},
      stableId
        ? "اسکن مقاله در صف ثبت شد و تا چند دقیقه بعد پردازش می‌شود."
        : "اسکن کامل در صف ثبت شد و تا چند دقیقه بعد پردازش می‌شود.",
      stableId ? "ثبت اسکن این مقاله" : "ثبت اسکن کامل ویکی",
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
  const graphActionSummary = state?.graph
    ? [
        state.graph.summary.unresolvedOutgoing > 0
          ? `${formatNumber(state.graph.summary.unresolvedOutgoing)} لینک در متن به مقصدی می‌رسد که باید اصلاح شود.`
          : "لینک‌های مقصددارِ متن مشکل فوری ندارند.",
        state.graph.summary.articlesWithoutIncoming > 0
          ? `${formatNumber(state.graph.summary.articlesWithoutIncoming)} مقاله هنوز لینک ورودی از متن مقاله‌های دیگر ندارد.`
          : "همه مقاله‌های این نما حداقل یک لینک ورودی متنی دارند.",
      ].join(" ")
    : "";
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

  async function downloadGraphExport() {
    if (!state?.graph) return;
    const exportPayload = {
      schema: "halleus_wiki_body_link_graph_v1",
      generatedAt: state.graph.generatedAt,
      scopeFa: "فقط لینک‌های داخل متن مقاله؛ منو، فوتر، مسیر دسته‌بندی، بخش دعوت به اقدام و لینک‌های پیشنهادی پایین مقاله حساب نشده‌اند.",
      filters: {
        query: graphQuery.trim(),
        status: graphStatusFilter,
        issue: graphIssueFilter,
        sort: graphSort,
      },
      summary: state.graph.summary,
      articles: graphArticles.map((article) => ({
        stableId: article.stableId,
        slug: article.slug,
        title: article.title,
        categoryId: article.categoryId,
        status: graphArticleStatusLabel(article),
        publicReady: article.publicReady,
        scheduledFor: article.scheduledFor,
        bodyOutgoingCount: article.bodyOutgoingCount,
        bodyIncomingCount: article.bodyIncomingCount,
        unresolvedOutgoingCount: article.unresolvedOutgoingCount,
        practicalIssue:
          article.unresolvedOutgoingCount > 0
            ? `${article.unresolvedOutgoingCount} مقصد لینک در متن باید اصلاح شود.`
            : article.bodyIncomingCount === 0
              ? "این مقاله هنوز لینک ورودی از متن مقاله‌های دیگر ندارد."
              : "از نظر لینک‌های متنی مشکل فوری ندارد.",
        outgoingBodyLinks: article.outgoingBodyLinks.map((edge) => ({
          anchor: edge.anchor,
          targetStableId: edge.targetStableId,
          targetTitle: edge.targetTitle,
          targetSlug: edge.targetSlug,
          targetState: graphTargetStateLabel(edge),
          href: edge.href,
        })),
        incomingBodyLinks: article.incomingBodyLinks.map((edge) => ({
          anchor: edge.anchor,
          sourceStableId: edge.sourceStableId,
          sourceTitle: edge.sourceTitle,
          sourceSlug: edge.sourceSlug,
        })),
      })),
    };
    const fileName = `halleus-wiki-link-graph-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("فایل JSON گراف لینک‌سازی دانلود شد.");
    emitAdminNotice({
      tone: "success",
      title: "فایل گراف لینک‌ها آماده شد",
      message: fileName,
    });
  }
  const kpiRows = state?.kpis
    ? [
        ["منتشر", state.kpis.liveArticleCount],
        ["داخل اسکن", state.kpis.managedArticleCount],
        ["سالم", state.kpis.fullyCompliant],
        ["کمبود لینک ورودی", state.kpis.underInlinked],
        ["خروجی خارج از بازه", state.kpis.outgoingOutsideRange],
        ["لینک اصلی ندارد", state.kpis.missingCoreLink],
        ["مشکل مسیر دسته‌بندی", state.kpis.breadcrumbIssue],
        ["مشکل مقصد لینک", state.kpis.internalTargetIssue],
        ["متن لینک خیلی کوتاه", state.kpis.oneWordViolation],
        ["تداخل متن لینک", state.kpis.anchorCollision],
        ["لینک به خودش", state.kpis.selfLink],
        ["لینک تکراری", state.kpis.duplicate],
      ]
    : [];

  return (
    <div className={styles.wikiWorkspace}>
      <section className={styles.wikiPanel}>
        <div className={styles.wikiPanelHeader}>
          <div>
            <h2>{FA.title}</h2>
            <p>{FA.subtitle}</p>
            <small>{FA.draftOnly}</small>
          </div>
          {canSettings ? (
            <button type="button" disabled={loading} onClick={() => void runScan(selectedStableId)}>
              {selectedStableId ? FA.rescan : FA.fullScan}
            </button>
          ) : null}
        </div>

        {state?.latestScan ? (
          <p>
            اسکن #{state.latestScan.id.slice(0, 8)} | {formatNumber(state.latestScan.edgeCount)} لینک |
            {" "}{formatNumber(state.latestScan.findingCount)} ایراد | {formatDate(state.latestScan.completedAt)}
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
            <span><strong>{formatNumber(indexabilityState.summary.publicReady)}</strong> آماده انتشار عمومی</span>
            <span><strong>{formatNumber(indexabilityState.summary.sitemapEligible)}</strong> داخل سایت‌مپ</span>
            <span><strong>{formatNumber(indexabilityState.summary.blocked)}</strong> نیازمند اصلاح</span>
            <span><strong>{formatNumber(indexabilityState.summary.warning)}</strong> قابل بررسی</span>
            <span><strong>{formatNumber(indexabilityState.summary.failedLinks)}</strong> لینک ناموفق</span>
            <span><strong>{formatNumber(indexabilityState.summary.disabledLinks)}</strong> لینک غیرفعال</span>
            <span><strong>{formatNumber(indexabilityState.summary.unresolvedInlineTargets)}</strong> مقصد نامعتبر</span>
          </div>
          {readinessArticles.length ? (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>مقاله</th><th>آدرس</th><th>وضعیت</th><th>لینک‌ها</th><th>دلیل</th>
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
                        خروجی {formatNumber(article.outgoing.active)} / ورودی {formatNumber(article.incoming.active)}
                      </td>
                      <td>{readinessReasonLabel(article.reasons[0] ?? "-")}</td>
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
            <button type="button" onClick={() => void downloadGraphExport()}>
              {FA.downloadGraph}
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
              placeholder="جستجو در عنوان، شناسه لاتین، متن لینک یا مقصد"
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
              <option value="noindex">مقصد خارج از ایندکس</option>
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
          <div className={styles.linkGraphActionSummary}>
            <strong>الان چه کار کنم؟</strong>
            <span>{graphActionSummary}</span>
          </div>
          <p className={styles.recordNote}>
            کار عملی: اول مقاله‌هایی را اصلاح کن که مقصد لینک‌شان پیدا نمی‌شود، منتشر نشده یا خارج
            از ایندکس است. بعد برای صفحه‌های بدون ورودی، از مقاله‌های مرتبط لینک متنی بساز. دکمه بالا
            همین نمای فیلترشده را به شکل فایل JSON برای استفاده در AI دانلود می‌کند.
          </p>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>مقاله</th>
                  <th>وضعیت</th>
                  <th>لینک‌های خروجی متن</th>
                  <th>لینک‌های ورودی متن</th>
                  <th>مشکل عملی</th>
                </tr>
              </thead>
              <tbody>
                {graphArticles.map((article) => (
                  <tr key={article.stableId} className={styles.compactGraphRow}>
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
                      <strong>{formatNumber(article.bodyOutgoingCount)} لینک خروجی</strong>
                      {edgeListPreview(article.outgoingBodyLinks, "out")}
                    </td>
                    <td>
                      <strong>{formatNumber(article.bodyIncomingCount)} لینک ورودی</strong>
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
              <span>ورودی: {formatNumber(state.detail.article.incoming)}</span>
              <span>خروجی: {formatNumber(state.detail.article.outgoing)}</span>
              <span>لینک اصلی: {state.detail.article.coreDestination ?? "-"}</span>
              <span>ایراد: {formatNumber(state.detail.article.findingCount)}</span>
            </div>
          </section>

          <section className={styles.wikiPanel}>
            <h3>{FA.outgoing}</h3>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr><th>نوع</th><th>مقصد</th><th>متن لینک</th><th>جای لینک</th></tr>
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
                  <tr><th>مبدأ</th><th>متن لینک</th><th>جای لینک</th></tr>
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
                  <th>مقاله</th><th>دسته</th><th>ورودی</th><th>خروجی</th>
                  <th>لینک اصلی</th><th>ایراد</th><th>وضعیت</th>
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
                        {article.compliant ? "سالم" : "بررسی شود"}
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
              <thead><tr><th>شدت</th><th>کد</th><th>مبدأ</th><th>مقصد</th></tr></thead>
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
          <p>ایرادی ثبت نشده است.</p>
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
          <p>پیشنهادی ثبت نشده است.</p>
        )}
      </section>
    </div>
  );
}
