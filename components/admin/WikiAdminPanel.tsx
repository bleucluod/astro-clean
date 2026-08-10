"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AdminSessionPayload,
} from "@/lib/admin/admin-types";
import { readAdminJsonResponse } from "@/lib/admin/admin-client-response";
import type {
  WikiArticleAdminSummary,
  WikiArticleSnapshot,
  WikiBulkSchedulePlan,
  WikiImportResult,
  WikiImportPackageSummary,
  WikiImportPreviewPlan,
  WikiRevisionSummary,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";
import {
  buildWikiPublicationQueue,
  getWikiPublicationQueueDate,
  getWikiPublicationQueuePositions,
  summarizeWikiPublicationQueue,
} from "@/lib/wiki/wiki-publication-queue";
import {
  getWikiPublishJobOperationAvailability,
  getWikiPublishJobStateFromArticle,
  WIKI_PUBLISH_JOB_MAX_ATTEMPTS,
  type WikiPublishJobOperation,
} from "@/lib/wiki/wiki-queue-operations";
import type {
  WikiPriorityRebalancePlan,
  WikiQueueBulkReorderPlan,
  WikiQueuePositionPlan,
} from "@/lib/wiki/wiki-queue-priority";
import type {
  WikiQueueReflowPlan,
  WikiQueueReflowUndoPlan,
} from "@/lib/wiki/wiki-queue-reflow";
import type { WikiQueueReflowPolicy } from "@/lib/wiki/wiki-cms-types";
import type { WikiImportMergePlan } from "@/lib/wiki/wiki-import-merge";
import styles from "./admin-console.module.css";

type Props = {
  token: string;
  session: AdminSessionPayload;
  activeSection: WikiWorkspaceSection;
  onSectionChange: (section: WikiWorkspaceSection) => void;
};

export type WikiWorkspaceSection =
  | "articles"
  | "queue"
  | "new"
  | "import"
  | "settings"
  | "categories"
  | "media";

type Category = { id: string; label: string; description: string };
type MediaAsset = {
  id: string;
  url: string;
  originalName: string;
  byteSize: number;
  alt: string;
  deletedAt: string | null;
  referenceCount: number;
  orphan: boolean;
};

type ArticleDetail = {
  articleId: string;
  current: WikiArticleSnapshot;
  draft: WikiArticleSnapshot | null;
  status: string;
  deletedAt: string | null;
  revisions: WikiRevisionSummary[];
  categories: Category[];
};

const weekdayOptions = [
  { value: 6, label: "شنبه" },
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
];

function emptySnapshot(categoryId = "foundations"): WikiArticleSnapshot {
  return {
    stableId: "",
    slug: "",
    title: "",
    shortTitle: "",
    seoTitle: null,
    metaDescription: "",
    categoryId,
    tags: [],
    summary: "",
    intro: "",
    readingMinutes: 5,
    publicationPriority: 0,
    contentCluster: "foundations",
    articleRole: "support",
    relatedArticleIds: [],
    indexable: true,
    bodyMarkdown: "مقدمهٔ مقاله\n\n## بخش نخست\n\nمتن بخش نخست",
    keyPoints: [],
    sections: [],
    contextLinks: [],
    sources: [],
    callToAction: null,
    contentVersion: 1,
  };
}

const WIKI_ADMIN_TIMEZONE = "Asia/Tehran";
// HALLEUS_WIKI_ADMIN_TEHRAN_R44
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: WIKI_ADMIN_TIMEZONE,
  }).format(new Date(value));
}

function readZonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIKI_ADMIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function formatTehranDateTimeInput(value: string) {
  const parts = readZonedParts(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function parseTehranDateTimeInput(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const localUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let candidate = new Date(localUtc);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = readZonedParts(candidate);
    const representedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    candidate = new Date(candidate.getTime() + (localUtc - representedUtc));
  }
  const parts = readZonedParts(candidate);
  if (
    parts.year !== year || parts.month !== month || parts.day !== day ||
    parts.hour !== hour || parts.minute !== minute
  ) {
    return null;
  }
  return candidate.toISOString();
}

function formatPublishJobStatus(value: string | null) {
  const labels: Record<string, string> = {
    queued: "در صف",
    running: "در حال انتشار",
    retry: "در انتظار تلاش دوباره",
    failed: "ناموفق",
    published: "منتشرشده",
    canceled: "لغوشده",
  };
  return value ? (labels[value] ?? value) : "در انتظار job";
}

function changedFields(left: WikiArticleSnapshot, right: WikiArticleSnapshot) {
  return Object.keys(left).filter((key) =>
    JSON.stringify(left[key as keyof WikiArticleSnapshot]) !==
    JSON.stringify(right[key as keyof WikiArticleSnapshot]),
  );
}

function formatImportError(importError: string) {
  if (importError === "Package v1 supports paragraphs, H2 headings, bullets, images, and stable article links only.") {
    return "ساختار متن خارج از قرارداد بسته است؛ فقط پاراگراف، تیتر H2، فهرست نقطه‌ای، تصویر اعلام‌شده و لینک پایدار مقاله مجاز است. نقل‌قول با >، فهرست شماره‌دار، code block، لینک معمولی Markdown و bold/italic را حذف کن.";
  }
  if (importError.startsWith("Unknown Wiki category:")) {
    return `دستهٔ مقاله در ویکی وجود ندارد: ${importError.slice("Unknown Wiki category:".length).trim()}`;
  }
  if (importError === "Requested slug belongs to a different stable article ID.") {
    return "این slug قبلاً برای مقاله‌ای با شناسهٔ پایدار دیگر رزرو شده است.";
  }
  if (importError === "Imported article version is not newer than the stored version.") {
    return "نسخهٔ بسته باید از نسخهٔ ذخیره‌شدهٔ همین مقاله بزرگ‌تر باشد.";
  }
  if (importError.startsWith("Missing or quarantined dependencies:")) {
    return `مقالهٔ مرتبط پیدا نشد یا قرنطینه شده است: ${importError.slice("Missing or quarantined dependencies:".length).trim()}`;
  }
  if (importError === "Raw HTML and unsafe URL protocols are not allowed in Wiki Markdown.") {
    return "HTML خام یا آدرس ناامن در متن مقاله مجاز نیست.";
  }
  return importError;
}

export function WikiAdminPanel({ token, session, activeSection, onSectionChange }: Props) {
  const [articles, setArticles] = useState<WikiArticleAdminSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [draft, setDraft] = useState<WikiArticleSnapshot>(() => emptySnapshot());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [settings, setSettings] = useState<WikiScheduleSettings | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blackoutDate, setBlackoutDate] = useState("");
  const [categoryDraft, setCategoryDraft] = useState({ id: "", label: "", description: "" });
  const [importResult, setImportResult] = useState<WikiImportResult | null>(null);
  const [importPackages, setImportPackages] = useState<WikiImportPackageSummary[]>([]);
  const [importMergePlan, setImportMergePlan] = useState<WikiImportMergePlan | null>(null);
  // HALLEUS_WIKI_IMPORT_PREVIEW_UI_R62
  const [importPreviewPlan, setImportPreviewPlan] = useState<WikiImportPreviewPlan | null>(null);
  const [articlePage, setArticlePage] = useState(1);
  const [articlePageSize, setArticlePageSize] = useState(25);
  const [articleTotal, setArticleTotal] = useState(0);
  const [articleTotalPages, setArticleTotalPages] = useState(1);
  const selectionScope = `${activeSection}:${status}:${search}:${articlePage}:${articlePageSize}`;
  const [articleSelection, setArticleSelection] = useState<{
    scope: string;
    ids: string[];
  }>({ scope: selectionScope, ids: [] });
  const selectedArticleIds = useMemo(
    () =>
      articleSelection.scope === selectionScope ? articleSelection.ids : [],
    [articleSelection, selectionScope],
  );
  const [bulkSchedulePlan, setBulkSchedulePlan] = useState<WikiBulkSchedulePlan | null>(null);
  const [queuePositionDrafts, setQueuePositionDrafts] = useState<Record<string, string>>({});
  const [queuePositionPlan, setQueuePositionPlan] = useState<WikiQueuePositionPlan | null>(null);
  const [queueBulkOrder, setQueueBulkOrder] = useState("");
  const [queueBulkPlan, setQueueBulkPlan] = useState<WikiQueueBulkReorderPlan | null>(null);
  const [queueReflowPolicy, setQueueReflowPolicy] = useState<WikiQueueReflowPolicy>("preserve");
  const [queueReflowPlan, setQueueReflowPlan] = useState<WikiQueueReflowPlan | null>(null);
  const [queueUndoPlan, setQueueUndoPlan] = useState<WikiQueueReflowUndoPlan | null>(null);
  // HALLEUS_WIKI_PRIORITY_REBALANCE_UI_R55
  const [queuePriorityRebalancePlan, setQueuePriorityRebalancePlan] =
    useState<WikiPriorityRebalancePlan | null>(null);
  // HALLEUS_WIKI_REFLOW_PROGRESS_R51
  const [queueProgressStartedAt, setQueueProgressStartedAt] = useState<number | null>(null);
  const [queueProgressElapsedSeconds, setQueueProgressElapsedSeconds] = useState(0);
  const [queueProgressLabel, setQueueProgressLabel] = useState("");

  useEffect(() => {
    if (queueProgressStartedAt === null) return;
    const timer = window.setInterval(() => {
      setQueueProgressElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - queueProgressStartedAt) / 1000)),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [queueProgressStartedAt]);

  function beginQueueProgress(label: string) {
    setQueueProgressLabel(label);
    setQueueProgressElapsedSeconds(0);
    setQueueProgressStartedAt(Date.now());
  }

  function endQueueProgress() {
    setQueueProgressStartedAt(null);
  }

  const canDraft = session.capabilities.includes("wiki.draft.write");
  const canPublish = session.capabilities.includes("wiki.publish.write");
  const canPermanentlyDelete = session.role === "owner";
  const canImport = session.capabilities.includes("wiki.import.write");
  const canSettings = session.capabilities.includes("wiki.settings.write");
  const canMedia = session.capabilities.includes("wiki.media.write");
  const publicationQueue = useMemo(
    () => buildWikiPublicationQueue(articles),
    [articles],
  );
  const queuePositions = useMemo(
    () => getWikiPublicationQueuePositions(publicationQueue),
    [publicationQueue],
  );
  const positionedQueueSize = publicationQueue.find((article) => article.publishQueueSize)?.publishQueueSize ?? queuePositions.size; // HALLEUS_WIKI_GLOBAL_QUEUE_SIZE_R44
  const publicationQueueSummary = useMemo(
    () =>
      summarizeWikiPublicationQueue(
        publicationQueue,
        settings?.publishingPaused ?? false,
      ),
    [publicationQueue, settings?.publishingPaused],
  );
  const bulkEligibleArticles = useMemo(
    () =>
      articles.filter(
        (article) =>
          !article.deletedAt &&
          article.hasDraft &&
          ["draft", "published"].includes(article.status) &&
          !["queued", "running", "retry", "failed"].includes(
            article.publishJobStatus ?? "",
          ),
      ),
    [articles],
  );
  const bulkEligibleIds = useMemo(
    () => new Set(bulkEligibleArticles.map((article) => article.id)),
    [bulkEligibleArticles],
  );
  const visibleSelectableArticles = useMemo(
    () =>
      (activeSection === "queue" ? publicationQueue : articles).filter(
        (article) =>
          article.publishJobStatus !== "running" &&
          (!article.deletedAt ||
            (activeSection === "articles" &&
              status === "deleted" &&
              canPermanentlyDelete)),
      ),
    [
      activeSection,
      articles,
      canPermanentlyDelete,
      publicationQueue,
      status,
    ],
  );
  const permanentlyDeletableArticles = useMemo(
    () =>
      articles.filter(
        (article) => article.status === "archived" && Boolean(article.deletedAt),
      ),
    [articles],
  );
  const permanentlyDeletableIds = useMemo(
    () => new Set(permanentlyDeletableArticles.map((article) => article.id)),
    [permanentlyDeletableArticles],
  );
  const selectedPermanentlyDeletableIds = useMemo(
    () =>
      selectedArticleIds.filter((articleId) =>
        permanentlyDeletableIds.has(articleId),
      ),
    [permanentlyDeletableIds, selectedArticleIds],
  );
  const visibleSelectableIds = useMemo(
    () => new Set(visibleSelectableArticles.map((article) => article.id)),
    [visibleSelectableArticles],
  );
  const selectedVisibleIds = useMemo(
    () =>
      selectedArticleIds.filter((articleId) =>
        visibleSelectableIds.has(articleId),
      ),
    [selectedArticleIds, visibleSelectableIds],
  );
  const selectedBulkEligibleIds = useMemo(
    () =>
      selectedVisibleIds.filter((articleId) => bulkEligibleIds.has(articleId)),
    [bulkEligibleIds, selectedVisibleIds],
  );
  const allVisibleSelected =
    visibleSelectableArticles.length > 0 &&
    selectedVisibleIds.length === visibleSelectableArticles.length;
  const selectedCanBeScheduled =
    activeSection === "articles" &&
    selectedVisibleIds.length > 0 &&
    selectedVisibleIds.length === selectedBulkEligibleIds.length;

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (init?.body && !(init.body instanceof FormData)) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(path, { ...init, headers, cache: "no-store" });
    return readAdminJsonResponse(response);
  }, [token]);

  // HALLEUS_WIKI_QUEUE_API_R44
  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const queueView = activeSection === "queue";
      const payload = queueView
        ? await request(`/api/admin/wiki/publication-jobs?limit=${articlePageSize}&page=${articlePage}`)
        : await request(`/api/admin/wiki/articles?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&limit=${articlePageSize}&page=${articlePage}`);
      setArticles(payload.articles as WikiArticleAdminSummary[]);
      if (Array.isArray(payload.categories)) {
        setCategories(payload.categories as Category[]);
      }
      setArticleTotal(Number(payload.total ?? 0));
      setArticleTotalPages(Number(payload.totalPages ?? 1));
      setQueuePositionDrafts({});
      setQueuePositionPlan(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "بارگذاری ویکی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [activeSection, articlePage, articlePageSize, request, search, status]);

  const loadImportPackages = useCallback(async () => {
    const payload = await request("/api/admin/wiki/imports");
    setImportPackages(payload.packages as WikiImportPackageSummary[]);
  }, [request]);

  const loadSettingsAndMedia = useCallback(async () => {
    try {
      const [settingsPayload, mediaPayload] = await Promise.all([
        request("/api/admin/wiki/settings"),
        request("/api/admin/wiki/media"),
      ]);
      setSettings(settingsPayload.settings as WikiScheduleSettings);
      setAssets(mediaPayload.assets as MediaAsset[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تنظیمات ویکی بارگذاری نشد.");
    }
  }, [request]);

  useEffect(() => {
    // Initial API reads synchronize the protected CMS with server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList();
    void loadSettingsAndMedia();
  }, [loadList, loadSettingsAndMedia]);

  useEffect(() => {
    if (activeSection !== "import" || !canImport) return;
    // The protected import workspace reads its current server state when opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadImportPackages().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "وضعیت بسته‌های ورود بارگذاری نشد.");
    });
  }, [activeSection, canImport, loadImportPackages]);

  useEffect(() => {
    // HALLEUS_WIKI_SECTION_PAGE_RESET_R44
    // A changed filter or workspace starts a new server-paginated result set.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArticlePage(1);
  }, [activeSection, search, status]);

  useEffect(() => {
    if (activeSection === "new") {
      // A fresh editor must not inherit the last opened article.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      setDraft(emptySnapshot(categories[0]?.id));
      setDirty(false);
      setPreview(false);
    } else if (activeSection !== "articles") {
      setDetail(null);
    }
  }, [activeSection, categories]);

  const openArticle = useCallback(async (articleId: string) => {
    setLoading(true);
    setError("");
    try {
      const payload = await request(`/api/admin/wiki/articles/${encodeURIComponent(articleId)}`);
      const next = payload.article as ArticleDetail;
      setDetail(next);
      setDraft(next.draft ?? next.current);
      setCategories(next.categories);
      setDirty(false);
      setPreview(false);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "مقاله باز نشد.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  const updateDraft = useCallback(<K extends keyof WikiArticleSnapshot>(key: K, value: WikiArticleSnapshot[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }, []);

  const saveDraft = useCallback(async (autosave = false) => {
    if (!canDraft || (!detail && autosave)) return;
    const path = detail
      ? `/api/admin/wiki/articles/${encodeURIComponent(detail.articleId)}`
      : "/api/admin/wiki/articles";
    const method = detail ? "PATCH" : "POST";
    const payload = await request(path, {
      method,
      body: JSON.stringify({ snapshot: draft, autosave, reason: autosave ? null : "ذخیره از ویرایشگر ویکی" }),
    });
    const articleId = String(payload.articleId ?? detail?.articleId ?? "");
    if (!detail && articleId) {
      await openArticle(articleId);
    }
    setDirty(false);
    if (!autosave) {
      setMessage("پیش‌نویس ذخیره شد.");
      await loadList();
    }
  }, [canDraft, detail, draft, loadList, openArticle, request]);

  useEffect(() => {
    if (!dirty || !detail || !canDraft) return;
    const timer = window.setTimeout(() => {
      void saveDraft(true).catch((autosaveError) => {
        setError(autosaveError instanceof Error ? autosaveError.message : "ذخیره خودکار ناموفق بود.");
      });
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [canDraft, detail, dirty, saveDraft]);

  async function action(name: string, extra: Record<string, unknown> = {}) {
    if (!detail) return;
    const reason = window.prompt("دلیل این عملیات را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    try {
      await request(`/api/admin/wiki/articles/${encodeURIComponent(detail.articleId)}/actions`, {
        method: "POST",
        body: JSON.stringify({ action: name, reason: reason.trim(), ...extra }),
      });
      setMessage("عملیات ویکی ثبت شد.");
      await openArticle(detail.articleId);
      await loadList();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "عملیات ویکی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  function updateArticleSelection(articleId: string, selected: boolean) {
    setArticleSelection((current) => {
      const currentIds = current.scope === selectionScope ? current.ids : [];
      return {
        scope: selectionScope,
        ids: selected
          ? [...new Set([...currentIds, articleId])]
          : currentIds.filter((currentId) => currentId !== articleId),
      };
    });
    setBulkSchedulePlan(null);
  }

  function toggleAllVisibleArticles() {
    setArticleSelection({
      scope: selectionScope,
      ids: allVisibleSelected
        ? []
        : visibleSelectableArticles.map((article) => article.id),
    });
    setBulkSchedulePlan(null);
  }

  async function deleteSelectedArticles() {
    if (!selectedVisibleIds.length || !canPublish) return;
    if (
      !window.confirm(
        `حذف نرم ${selectedVisibleIds.length.toLocaleString("fa-IR")} مقاله انجام شود؟`,
      )
    ) {
      return;
    }
    const reason = window.prompt("دلیل حذف گروهی مقاله‌ها را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request("/api/admin/wiki/articles/bulk-actions", {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          articleIds: selectedVisibleIds,
          reason: reason.trim(),
        }),
      });
      setArticleSelection({ scope: selectionScope, ids: [] });
      setBulkSchedulePlan(null);
      setMessage("مقاله‌های انتخاب‌شده به‌صورت نرم حذف شدند.");
      await loadList();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "حذف گروهی مقاله‌ها ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function permanentlyDeleteSelectedArticles() {
    const articleIds = selectedPermanentlyDeletableIds;
    if (!articleIds.length || !canPermanentlyDelete) return;
    const confirmationPhrase = `DELETE ${articleIds.length} ARCHIVED`;
    const confirmation = window.prompt(
      `این عملیات قابل بازیابی نیست و همهٔ تاریخچه و وابستگی‌های ذخیره‌شده را حذف می‌کند.\nبرای تأیید دقیقاً بنویس:\n${confirmationPhrase}`,
    );
    if (confirmation !== confirmationPhrase) return;
    const reason = window.prompt("دلیل حذف دائمی گروهی را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request("/api/admin/wiki/articles/bulk-actions", {
        method: "POST",
        body: JSON.stringify({
          action: "permanent_delete",
          articleIds,
          confirmation,
          reason: reason.trim(),
        }),
      });
      setArticleSelection({ scope: selectionScope, ids: [] });
      setMessage("مقاله‌های حذف‌شده برای همیشه پاک شدند.");
      await loadList();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "حذف دائمی گروهی ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function publishAllOpenEdits() {
    const articleIds = bulkEligibleArticles
      .filter((article) => article.status === "published")
      .map((article) => article.id);
    if (!articleIds.length || !canPublish) return;
    if (
      !window.confirm(
        `نسخهٔ باز ${articleIds.length.toLocaleString("fa-IR")} مقالهٔ منتشرشده اکنون منتشر شود؟`,
      )
    ) {
      return;
    }
    const reason = window.prompt("دلیل انتشار گروهی ویرایش‌ها را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request("/api/admin/wiki/articles/bulk-actions", {
        method: "POST",
        body: JSON.stringify({
          action: "publish",
          articleIds,
          reason: reason.trim(),
        }),
      });
      setArticleSelection({ scope: selectionScope, ids: [] });
      setBulkSchedulePlan(null);
      setMessage(
        `نسخهٔ باز ${articleIds.length.toLocaleString("fa-IR")} مقاله منتشر شد.`,
      );
      await loadList();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "انتشار گروهی ویرایش‌ها ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function previewBulkSchedule() {
    if (!selectedBulkEligibleIds.length) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = await request("/api/admin/wiki/publication-schedule", {
        method: "POST",
        body: JSON.stringify({
          action: "preview",
          articleIds: selectedBulkEligibleIds,
        }),
      });
      setBulkSchedulePlan(payload.plan as WikiBulkSchedulePlan);
    } catch (previewError) {
      setBulkSchedulePlan(null);
      setError(
        previewError instanceof Error
          ? previewError.message
          : "پیش‌نمایش زمان‌بندی گروهی ساخته نشد.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function applyBulkSchedule() {
    if (!bulkSchedulePlan) return;
    const reason = window.prompt("دلیل زمان‌بندی گروهی را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    try {
      await request("/api/admin/wiki/publication-schedule", {
        method: "POST",
        body: JSON.stringify({
          action: "apply",
          articleIds: selectedBulkEligibleIds,
          planToken: bulkSchedulePlan.planToken,
          previewedAt: bulkSchedulePlan.previewedAt,
          reason: reason.trim(),
        }),
      });
      setArticleSelection({ scope: selectionScope, ids: [] });
      setBulkSchedulePlan(null);
      setMessage("زمان‌بندی گروهی با موفقیت ثبت شد.");
      await loadList();
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : "اعمال زمان‌بندی گروهی ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function mutateQueueJob(
    article: WikiArticleAdminSummary,
    operation: WikiPublishJobOperation,
  ) {
    if (!canPublish) return;
    const job = getWikiPublishJobStateFromArticle(article);
    if (!job) {
      setError("اطلاعات job کامل نیست؛ صف را تازه‌سازی کن.");
      return;
    }

    let publishAt: string | null = null;
    if (operation === "reschedule") {
      const requested = window.prompt(
        "زمان جدید را به وقت تهران با قالب YYYY-MM-DDTHH:mm وارد کن:",
        formatTehranDateTimeInput(job.runAt),
      );
      if (!requested?.trim()) return;
      const parsed = parseTehranDateTimeInput(requested.trim());
      if (!parsed) {
        setError("زمان جدید به وقت تهران معتبر نیست.");
        return;
      }
      publishAt = parsed; // HALLEUS_WIKI_RESCHEDULE_TEHRAN_R44
    }
    if (
      operation === "cancel" &&
      !window.confirm("این نوبت انتشار لغو و متن آن به پیش‌نویس برگردانده شود؟")
    ) {
      return;
    }
    if (
      operation === "retry" &&
      !window.confirm("این job ناموفق در نخستین زمان معتبر دوباره وارد صف شود؟")
    ) {
      return;
    }

    const reason = window.prompt("دلیل این عملیات صف را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request(
        `/api/admin/wiki/publication-jobs/${encodeURIComponent(job.id)}`,
        {
          method: "POST",
          body: JSON.stringify({
            action: operation,
            expectedUpdatedAt: job.updatedAt,
            publishAt,
            reason: reason.trim(),
          }),
        },
      );
      setMessage(
        operation === "reschedule"
          ? "زمان انتشار به‌روزرسانی شد."
          : operation === "cancel"
            ? "نوبت انتشار لغو و پیش‌نویس بازیابی شد."
            : "job در نخستین زمان معتبر برای تلاش دوباره قرار گرفت.",
      );
      setQueuePositionPlan(null);
      await loadList();
    } catch (queueError) {
      await loadList();
      setError(
        queueError instanceof Error
          ? queueError.message
          : "عملیات صف انتشار ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function previewQueuePositionMove(
    article: WikiArticleAdminSummary,
    targetPosition: number,
  ) {
    const job = getWikiPublishJobStateFromArticle(article);
    const availability = job
      ? getWikiPublishJobOperationAvailability(job)
      : null;
    if (!job || !availability?.canReorder) {
      setError("این job در وضعیت فعلی قابل جابه‌جایی نیست.");
      return;
    }
    if (
      !Number.isInteger(targetPosition) ||
      targetPosition < 1 ||
      targetPosition > positionedQueueSize
    ) {
      setError(
        `جایگاه باید عددی بین ۱ و ${positionedQueueSize.toLocaleString("fa-IR")} باشد.`,
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = await request("/api/admin/wiki/publication-priority", {
        method: "POST",
        body: JSON.stringify({
          action: "preview_move",
          targetJobId: job.id,
          targetPosition,
          expectedUpdatedAt: job.updatedAt,
        }),
      });
      setQueuePositionPlan(payload.plan as WikiQueuePositionPlan);
    } catch (previewError) {
      await loadList();
      setQueuePositionPlan(null);
      setError(
        previewError instanceof Error
          ? previewError.message
          : "پیش‌نمایش تغییر جایگاه ساخته نشد.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function applyQueuePositionMove() {
    if (!queuePositionPlan || !canPublish) return;
    const reason = window.prompt("دلیل تغییر جایگاه صف را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request("/api/admin/wiki/publication-priority", {
        method: "POST",
        body: JSON.stringify({
          action: "apply_move",
          targetJobId: queuePositionPlan.targetJobId,
          targetPosition: queuePositionPlan.requestedPosition,
          expectedUpdatedAt: queuePositionPlan.targetUpdatedAt,
          planToken: queuePositionPlan.planToken,
          previewedAt: queuePositionPlan.previewedAt,
          reason: reason.trim(),
        }),
      });
      setQueuePositionDrafts({});
      setQueuePositionPlan(null);
      setMessage("جایگاه مقاله و زمان‌های صف با موفقیت به‌روزرسانی شدند.");
      await loadList();
    } catch (applyError) {
      await loadList();
      setQueuePositionPlan(null);
      setError(
        applyError instanceof Error
          ? applyError.message
          : "تغییر جایگاه صف ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function previewQueueBulkReorder() {
    const stableIds = queueBulkOrder.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    setLoading(true); setError(""); setMessage("");
    try {
      const payload = await request("/api/admin/wiki/publication-priority", { method: "POST", body: JSON.stringify({ action: "preview_bulk", stableIds }) });
      setQueueBulkPlan(payload.plan as WikiQueueBulkReorderPlan);
    } catch (previewError) {
      setQueueBulkPlan(null);
      setError(previewError instanceof Error ? previewError.message : "پیش‌نمایش بازچینی گروهی ساخته نشد.");
    } finally { setLoading(false); }
  }

  async function applyQueueBulkReorder() {
    if (!queueBulkPlan || !canPublish) return;
    const reason = window.prompt("دلیل بازچینی گروهی صف را ثبت کن:");
    if (!reason?.trim()) return;
    const stableIds = queueBulkOrder.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    setLoading(true); setError(""); setMessage("");
    try {
      await request("/api/admin/wiki/publication-priority", { method: "POST", body: JSON.stringify({ action: "apply_bulk", stableIds, planToken: queueBulkPlan.planToken, previewedAt: queueBulkPlan.previewedAt, reason: reason.trim() }) });
      setQueueBulkPlan(null); setMessage("بازچینی گروهی صف با موفقیت انجام شد."); await loadList();
    } catch (applyError) {
      setQueueBulkPlan(null); await loadList(); setError(applyError instanceof Error ? applyError.message : "بازچینی گروهی صف ناموفق بود.");
    } finally { setLoading(false); }
  }

  async function previewQueuePriorityRebalance() {
    beginQueueProgress("در حال محاسبهٔ تعادل اولویت‌های صف");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = await request("/api/admin/wiki/publication-priority", {
        method: "POST",
        body: JSON.stringify({ action: "preview_priority_rebalance" }),
      });
      setQueuePriorityRebalancePlan(payload.plan as WikiPriorityRebalancePlan);
    } catch (previewError) {
      setQueuePriorityRebalancePlan(null);
      setError(
        previewError instanceof Error
          ? previewError.message
          : "پیش‌نمایش متعادل‌سازی اولویت‌ها ساخته نشد.",
      );
    } finally {
      endQueueProgress();
      setLoading(false);
    }
  }

  async function applyQueuePriorityRebalance() {
    if (!queuePriorityRebalancePlan || !canPublish) return;
    const reason = window.prompt("دلیل متعادل‌سازی اولویت‌های صف را ثبت کن:");
    if (!reason?.trim()) return;
    beginQueueProgress("در حال اعمال تعادل اولویت‌های صف");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await request("/api/admin/wiki/publication-priority", {
        method: "POST",
        body: JSON.stringify({
          action: "apply_priority_rebalance",
          planToken: queuePriorityRebalancePlan.planToken,
          previewedAt: queuePriorityRebalancePlan.previewedAt,
          reason: reason.trim(),
        }),
      });
      setQueuePriorityRebalancePlan(null);
      setQueueReflowPlan(null);
      setQueueUndoPlan(null);
      setMessage(
        "اولویت‌های صف بدون تغییر زمان‌ها یا ترتیب اولویت، دوباره در بازهٔ مفید پخش شدند.",
      );
      await loadList();
    } catch (applyError) {
      setQueuePriorityRebalancePlan(null);
      await loadList();
      setError(
        applyError instanceof Error
          ? applyError.message
          : "متعادل‌سازی اولویت‌های صف ناموفق بود.",
      );
    } finally {
      endQueueProgress();
      setLoading(false);
    }
  }

  async function previewQueueReflow() {
    beginQueueProgress("در حال ساخت پیش‌نمایش بازچینی کامل صف");
    setLoading(true); setError(""); setMessage(""); setQueueUndoPlan(null);
    try {
      const payload = await request("/api/admin/wiki/publication-priority", {
        method: "POST",
        body: JSON.stringify({ action: "preview_reflow", policy: queueReflowPolicy }),
      });
      setQueueReflowPlan(payload.plan as WikiQueueReflowPlan);
    } catch (previewError) {
      setQueueReflowPlan(null);
      setError(previewError instanceof Error ? previewError.message : "پیش‌نمایش بازچینی کامل صف ساخته نشد.");
    } finally { endQueueProgress(); setLoading(false); }
  }

  async function applyQueueReflow() {
    if (!queueReflowPlan || !canPublish) return;
    if (queueReflowPlan.dependencyErrors.length || queueReflowPlan.blackoutConflicts.length || queueReflowPlan.horizonConflicts.length) {
      setError("تعارض‌های پیش‌نمایش باید پیش از اعمال برطرف شوند."); return;
    }
    const reason = window.prompt("دلیل بازچینی کامل صف را ثبت کن:");
    if (!reason?.trim()) return;
    beginQueueProgress("در حال اعمال بازچینی کامل صف");
    setLoading(true); setError(""); setMessage("");
    try {
      await request("/api/admin/wiki/publication-priority", {
        method: "POST",
        body: JSON.stringify({ action: "apply_reflow", policy: queueReflowPlan.policy,
          planToken: queueReflowPlan.planToken, previewedAt: queueReflowPlan.previewedAt,
          reason: reason.trim() }),
      });
      setQueueReflowPlan(null); setMessage("برنامهٔ آیندهٔ انتشار با موفقیت بازچینی شد."); await loadList();
    } catch (applyError) {
      setQueueReflowPlan(null); await loadList();
      setError(applyError instanceof Error ? applyError.message : "بازچینی کامل صف ناموفق بود.");
    } finally { endQueueProgress(); setLoading(false); }
  }

  async function previewQueueReflowUndo() {
    beginQueueProgress("در حال ساخت پیش‌نمایش بازگردانی صف");
    setLoading(true); setError(""); setMessage(""); setQueueReflowPlan(null);
    try {
      const payload = await request("/api/admin/wiki/publication-priority", {
        method: "POST", body: JSON.stringify({ action: "preview_reflow_undo" }),
      });
      setQueueUndoPlan(payload.plan as WikiQueueReflowUndoPlan);
    } catch (previewError) {
      setQueueUndoPlan(null);
      setError(previewError instanceof Error ? previewError.message : "پیش‌نمایش بازگردانی ساخته نشد.");
    } finally { endQueueProgress(); setLoading(false); }
  }

  async function applyQueueReflowUndo() {
    if (!queueUndoPlan || !canPublish || queueUndoPlan.conflicts.length) return;
    const reason = window.prompt("دلیل بازگردانی آخرین برنامه را ثبت کن:");
    if (!reason?.trim()) return;
    beginQueueProgress("در حال بازگردانی آخرین برنامهٔ صف");
    setLoading(true); setError(""); setMessage("");
    try {
      await request("/api/admin/wiki/publication-priority", {
        method: "POST",
        body: JSON.stringify({ action: "apply_reflow_undo",
          sourcePlanToken: queueUndoPlan.sourcePlanToken, planToken: queueUndoPlan.planToken,
          previewedAt: queueUndoPlan.previewedAt, reason: reason.trim() }),
      });
      setQueueUndoPlan(null); setMessage("آخرین برنامهٔ صف با موفقیت بازگردانده شد."); await loadList();
    } catch (applyError) {
      setQueueUndoPlan(null); await loadList();
      setError(applyError instanceof Error ? applyError.message : "بازگردانی صف ناموفق بود.");
    } finally { endQueueProgress(); setLoading(false); }
  }

  async function importPackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const mode = String(form.get("mode") ?? "auto_schedule");
    const mergeMode = mode === "merge_queue";
    if (mergeMode) {
      form.set("mergeAction", importMergePlan ? "apply" : "preview");
      if (importMergePlan) {
        form.set("planToken", importMergePlan.planToken);
        form.set("previewedAt", importMergePlan.previewedAt);
      }
    } else {
      form.set("importAction", importPreviewPlan ? "apply" : "preview");
      if (importPreviewPlan) {
        form.set("planToken", importPreviewPlan.planToken);
        form.set("previewedAt", importPreviewPlan.previewedAt);
      }
    }
    setLoading(true);
    setError("");
    setMessage("");
    setImportResult(null);
    try {
      const payload = await request("/api/admin/wiki/imports", {
        method: "POST",
        body: form,
      });
      if (mergeMode && !importMergePlan) {
        setImportMergePlan(payload.plan as WikiImportMergePlan);
        setImportPreviewPlan(null);
        setMessage(
          "پیش‌نمایش ادغام آماده است؛ تا زمان تأیید هیچ مقاله یا کار انتشاری ساخته نشده است.",
        );
        return;
      }
      if (!mergeMode && !importPreviewPlan) {
        setImportPreviewPlan(payload.plan as WikiImportPreviewPlan);
        setImportMergePlan(null);
        setMessage(
          "پیش‌نمایش ورود آماده است؛ تا زمان تأیید هیچ مقاله، رسانه یا نوبت انتشاری ساخته نشده است.",
        );
        return;
      }
      const result = payload.result as WikiImportResult;
      setImportResult(result);
      if (result.quarantinedCount > 0) {
        setMessage("");
        setError(
          `${result.importedCount.toLocaleString("fa-IR")} مقاله وارد شد و ${result.quarantinedCount.toLocaleString("fa-IR")} مقاله نیاز به اصلاح دارد. دلیل هر مورد پایین فرم آمده است.`,
        );
      } else {
        setMessage(`${result.importedCount.toLocaleString("fa-IR")} مقاله با موفقیت وارد شد.`);
      }
      formElement.reset();
      setImportMergePlan(null);
      setImportPreviewPlan(null);
      await loadList();
      await loadImportPackages();
    } catch (importError) {
      if (mergeMode) setImportMergePlan(null);
      else setImportPreviewPlan(null);
      setError(importError instanceof Error ? importError.message : "ورود بسته ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    const reason = window.prompt("دلیل تغییر تنظیمات انتشار:");
    if (!reason?.trim()) return;
    try {
      await request("/api/admin/wiki/settings", {
        method: "PUT",
        body: JSON.stringify({ settings, reason: reason.trim() }),
      });
      setMessage("تنظیمات انتشار ذخیره شد.");
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "تنظیمات ذخیره نشد.");
    }
  }

  async function uploadMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await request("/api/admin/wiki/media", { method: "POST", body: form });
      setMessage("رسانه ذخیره شد.");
      formElement.reset();
      await loadSettingsAndMedia();
    } catch (mediaError) {
      setError(mediaError instanceof Error ? mediaError.message : "آپلود رسانه ناموفق بود.");
    }
  }

  async function downloadLiveContentGuide() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/wiki/content-guide", {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "ساخت راهنمای به‌روز ناموفق بود.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "halleus-wiki-content-guide-live.md";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("راهنمای به‌روز تولید محتوا دانلود شد.");
    } catch (guideError) {
      setError(guideError instanceof Error ? guideError.message : "دانلود راهنمای به‌روز ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMedia(asset: MediaAsset) {
    const reason = window.prompt("دلیل حذف رسانهٔ بدون استفاده:");
    if (!reason?.trim()) return;
    try {
      await request(`/api/admin/wiki/media/${encodeURIComponent(asset.id)}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setMessage("رسانهٔ بدون استفاده حذف شد.");
      await loadSettingsAndMedia();
    } catch (mediaError) {
      setError(mediaError instanceof Error ? mediaError.message : "حذف رسانه ناموفق بود.");
    }
  }

  function setDailyCapacity(value: number) {
    if (!settings) return;
    const maxArticlesPerDay = Math.min(12, Math.max(1, value));
    const recommendedInterval = maxArticlesPerDay === 1
      ? settings.minimumIntervalHours
      : Math.max(1, Math.floor(10 / (maxArticlesPerDay - 1)));
    setSettings({
      ...settings,
      maxArticlesPerDay,
      articlesPerWeek: maxArticlesPerDay * settings.allowedWeekdays.length,
      minimumIntervalHours: Math.min(settings.minimumIntervalHours, recommendedInterval),
    });
  }

  function toggleWeekday(value: number) {
    if (!settings) return;
    const included = settings.allowedWeekdays.includes(value);
    const allowedWeekdays = included
      ? settings.allowedWeekdays.filter((day) => day !== value)
      : [...settings.allowedWeekdays, value];
    if (!allowedWeekdays.length) {
      setError("حداقل یک روز انتشار باید انتخاب شود.");
      return;
    }
    setSettings({
      ...settings,
      allowedWeekdays,
      articlesPerWeek: settings.maxArticlesPerDay * allowedWeekdays.length,
    });
  }

  function addBlackoutDate() {
    if (!settings || !blackoutDate || settings.blackoutDates.includes(blackoutDate)) return;
    setSettings({ ...settings, blackoutDates: [...settings.blackoutDates, blackoutDate].sort() });
    setBlackoutDate("");
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = window.prompt("دلیل ساخت این دسته را ثبت کن:");
    if (!reason?.trim()) return;
    try {
      await request("/api/admin/wiki/categories", {
        method: "POST",
        body: JSON.stringify({ category: categoryDraft, reason: reason.trim() }),
      });
      setMessage("دستهٔ تازه ساخته شد.");
      setCategoryDraft({ id: "", label: "", description: "" });
      await loadList();
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : "ساخت دسته ناموفق بود.");
    }
  }

  const markdownPreview = useMemo(() =>
    draft.bodyMarkdown.split("\n").filter(Boolean).slice(0, 80),
  [draft.bodyMarkdown]);

  return (
    <div className={styles.wikiWorkspace}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}
      {loading ? (
        queueProgressStartedAt !== null ? (
          <div className={styles.loading} role="status" aria-live="polite">
            <p>{queueProgressLabel}</p>
            <progress aria-label={queueProgressLabel} style={{ width: "100%" }} />
            <small>
              زمان سپری‌شده: {queueProgressElapsedSeconds.toLocaleString("fa-IR")} ثانیه
              {queueProgressElapsedSeconds >= 60
                ? " · اتصال پایگاه داده کندتر از معمول است؛ درخواست هنوز در انتظار پاسخ است."
                : ""}
            </small>
          </div>
        ) : (
          <p className={styles.loading}>در حال انجام…</p>
        )
      ) : null}

      {activeSection === "articles" && !detail ? (
      <section className={styles.wikiPanel}>
        <div className={styles.wikiCollectionHeader}>
          <div className={styles.wikiSearchStack}>
            <form
              className={styles.wikiSearchForm}
              onSubmit={(event) => {
                event.preventDefault();
                void loadList();
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی عنوان، slug یا stable ID"
              />
              <button type="submit">جست‌وجو</button>
            </form>
            <div className={styles.wikiStatusTabs} role="tablist" aria-label="وضعیت مقاله‌ها">
              {[
                ["all", "همه"],
                ["draft", "پیش‌نویس"],
                ["scheduled", "زمان‌بندی‌شده"],
                ["published", "منتشرشده"],
                ["archived", "آرشیو"],
                ["deleted", "حذف‌شده"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={status === value}
                  className={status === value ? styles.activeStatusTab : undefined}
                  onClick={() => setStatus(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.wikiSelectionActions}>
            <button
              type="button"
              onClick={toggleAllVisibleArticles}
              disabled={!visibleSelectableArticles.length}
            >
              {allVisibleSelected ? "لغو انتخاب همه" : "انتخاب همه"}
            </button>
            <span>{selectedVisibleIds.length.toLocaleString("fa-IR")} انتخاب شده</span>
            {canPublish ? (
              <>
                <button
                  type="button"
                  onClick={() => void publishAllOpenEdits()}
                  disabled={
                    !bulkEligibleArticles.some(
                      (article) => article.status === "published",
                    )
                  }
                >
                  انتشار همهٔ ویرایش‌های باز
                </button>
                {status !== "deleted" ? (
                  <button
                    className={styles.dangerButton}
                    type="button"
                    onClick={() => void deleteSelectedArticles()}
                    disabled={!selectedVisibleIds.length}
                  >
                    حذف انتخاب‌شده‌ها
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void previewBulkSchedule()}
                  disabled={!selectedCanBeScheduled}
                  title={
                    selectedVisibleIds.length > 0 && !selectedCanBeScheduled
                      ? "برای زمان‌بندی، همهٔ انتخاب‌ها باید پیش‌نویس ذخیره‌شده و بدون job باز باشند."
                      : undefined
                  }
                >
                  پیش‌نمایش زمان‌بندی
                </button>
              </>
            ) : null}
            {canPermanentlyDelete && status === "deleted" ? (
              <button
                className={styles.dangerButton}
                type="button"
                onClick={() => void permanentlyDeleteSelectedArticles()}
                disabled={!selectedPermanentlyDeletableIds.length}
                title="فقط مقاله‌های حذف نرم‌شده و Archive قابل حذف دائمی هستند."
              >
                حذف دائمی آرشیوشده‌ها
              </button>
            ) : null}
          </div>
        </div>

        {bulkSchedulePlan ? (
          <div className={styles.bulkSchedulePreview}>
            <div className={styles.wikiPanelHeader}>
              <div>
                <strong>پیش‌نمایش برنامه</strong>
                <p>
                  این پیش‌نمایش تا {formatDate(bulkSchedulePlan.expiresAt)} معتبر است.
                </p>
              </div>
              <button type="button" onClick={() => void applyBulkSchedule()}>
                اعمال همین برنامه
              </button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.bulkScheduleTable}>
                <thead>
                  <tr>
                    <th>ترتیب</th>
                    <th>مقاله</th>
                    <th>نقش</th>
                    <th>اولویت</th>
                    <th>زمان انتشار</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkSchedulePlan.items.map((item, index) => (
                    <tr key={item.articleId}>
                      <td>{(index + 1).toLocaleString("fa-IR")}</td>
                      <td>
                        <strong>{item.title}</strong>
                        <small>{item.slug}</small>
                      </td>
                      <td>{item.articleRole === "pillar" ? "ستون اصلی" : "پشتیبان"}</td>
                      <td>{item.publicationPriority.toLocaleString("fa-IR")}</td>
                      <td>{formatDate(item.publishAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className={styles.wikiArticleList}>
          {articles.map((article) => {
            const selected = selectedVisibleIds.includes(article.id);
            return (
              <article key={article.id} className={styles.wikiArticleListItem}>
                {canPublish && !article.deletedAt && article.publishJobStatus !== "running" ? (
                  <label className={styles.articleSelectionCheckbox}>
                    <input
                      type="checkbox"
                      aria-label={`انتخاب ${article.title}`}
                      checked={selected}
                      onChange={(event) =>
                        updateArticleSelection(article.id, event.target.checked)
                      }
                    />
                  </label>
                ) : null}
                <button
                  className={styles.wikiArticleOpenButton}
                  type="button"
                  onClick={() => void openArticle(article.id)}
                >
                  <strong>{article.title}</strong>
                  <span>{article.slug} · {article.status}{article.hasDraft ? " · پیش‌نویس باز" : ""}</span>
                  <small>{article.pendingPublishAt ? `انتشار: ${formatDate(article.pendingPublishAt)} · ${article.publishJobStatus}` : `ویرایش: ${formatDate(article.updatedAt)}`}</small>
                  {article.publishJobError ? <small className={styles.inlineError}>{article.publishJobError}</small> : null}
                </button>
              </article>
            );
          })}
        </div>
        <div className={styles.wikiPagination} aria-label="صفحه‌بندی مقاله‌ها">
          <span>
            {articleTotal
              ? `${(((articlePage - 1) * articlePageSize) + 1).toLocaleString("fa-IR")} تا ${Math.min(articlePage * articlePageSize, articleTotal).toLocaleString("fa-IR")} از ${articleTotal.toLocaleString("fa-IR")} مقاله`
              : "مقاله‌ای پیدا نشد"}
          </span>
          <label>
            تعداد در صفحه
            <select
              value={articlePageSize}
              onChange={(event) => {
                setArticlePageSize(Number(event.target.value));
                setArticlePage(1);
              }}
            >
              {[25, 50, 100].map((value) => <option key={value} value={value}>{value.toLocaleString("fa-IR")}</option>)}
            </select>
          </label>
          <button type="button" disabled={articlePage <= 1} onClick={() => setArticlePage((value) => Math.max(1, value - 1))}>
            صفحهٔ قبل
          </button>
          <span>صفحهٔ {articlePage.toLocaleString("fa-IR")} از {articleTotalPages.toLocaleString("fa-IR")}</span>
          <button type="button" disabled={articlePage >= articleTotalPages} onClick={() => setArticlePage((value) => Math.min(articleTotalPages, value + 1))}>
            صفحهٔ بعد
          </button>
        </div>
      </section>
      ) : null}


      {activeSection === "queue" ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiCollectionHeader}>
            <div className={styles.wikiQueueHeaderCopy}>
              <h3>صف انتشار</h3>
              <p>جایگاه ۱ یعنی انتشار بعدی. مقاله را به اول صف ببر، یک پله جابه‌جا کن یا شمارهٔ جایگاه را مستقیم وارد کن.</p>
            </div>
            <div className={styles.wikiSelectionActions}>
              {/* HALLEUS_WIKI_QUEUE_SAFE_ACTIONS_R44 */}
              <button type="button" onClick={() => void loadList()}>تازه‌سازی صف</button>
              <span>صف از jobهای واقعی انتشار خوانده می‌شود.</span>
            </div>
          </div>

          {publicationQueueSummary.publishingPaused ? (
            <p className={styles.queuePaused}>انتشار خودکار متوقف است؛ ترتیب صف حفظ شده اما publisher مقاله‌ای را جلو نمی‌برد.</p>
          ) : null}

          <div className={styles.publicationQueueSummary}>
            <article>
              <span>کل صف</span>
              <strong>{publicationQueueSummary.total.toLocaleString("fa-IR")}</strong>
            </article>
            <article>
              <span>نوبت بعدی</span>
              <strong>{formatDate(publicationQueueSummary.nextPublishAt)}</strong>
            </article>
            <article>
              <span>در حال اجرا / تلاش دوباره</span>
              <strong>{(publicationQueueSummary.running + publicationQueueSummary.retrying).toLocaleString("fa-IR")}</strong>
            </article>
            <article>
              <span>خطادار</span>
              <strong>{publicationQueueSummary.failed.toLocaleString("fa-IR")}</strong>
            </article>
          </div>

          {canPublish ? (
            <section className={styles.queuePositionPreview} data-queue-reflow="global">
              <strong>بازچینی کامل برنامهٔ آینده</strong>
              <p>تغییر تنظیمات به‌تنهایی صف را جابه‌جا نمی‌کند. ابتدا سیاست را انتخاب و پیش‌نمایش را بررسی کن.</p>
              <label>
                سیاست چیدمان
                <select value={queueReflowPolicy} onChange={(event) => {
                  setQueueReflowPolicy(event.target.value as WikiQueueReflowPolicy);
                  setQueueReflowPlan(null);
                }} disabled={loading}>
                  <option value="preserve">حفظ ترتیب فعلی صف</option>
                  <option value="priority">ادغام بر پایهٔ اولویت انتشار</option>
                  <option value="balanced_clusters">پخش متعادل خوشه‌های موضوعی</option>
                </select>
              </label>
              <div className={styles.wikiSelectionActions}>
                <button type="button" onClick={() => void previewQueueReflow()} disabled={loading}>
                  پیش‌نمایش بازچینی کامل
                </button>
                <button type="button" onClick={() => void previewQueueReflowUndo()} disabled={loading}>
                  پیش‌نمایش بازگردانی آخرین برنامه
                </button>
              </div>
              {queueReflowPlan ? (
                <div className={styles.queuePositionPreviewItems}>
                  <article><strong>ظرفیت روزانه</strong><span>{queueReflowPlan.previousDailyCapacity.toLocaleString("fa-IR")} ← {queueReflowPlan.nextDailyCapacity.toLocaleString("fa-IR")}</span></article>
                  <article><strong>کل کارهای آینده</strong><span>{queueReflowPlan.totalFutureJobs.toLocaleString("fa-IR")}</span></article>
                  <article><strong>اولین نوبت</strong><span>{formatDate(queueReflowPlan.firstRunAt)}</span></article>
                  <article><strong>آخرین نوبت فعلی</strong><span>{formatDate(queueReflowPlan.previousLastRunAt)}</span></article>
                  <article><strong>آخرین نوبت جدید</strong><span>{formatDate(queueReflowPlan.nextLastRunAt)}</span></article>
                  <article><strong>جابه‌جا / بدون تغییر</strong><span>{queueReflowPlan.movedCount.toLocaleString("fa-IR")} / {queueReflowPlan.unchangedCount.toLocaleString("fa-IR")}</span></article>
                  <article><strong>قفل‌شده</strong><span>{queueReflowPlan.lockedJobs.length.toLocaleString("fa-IR")}</span></article>
                  {[...queueReflowPlan.dependencyErrors, ...queueReflowPlan.blackoutConflicts, ...queueReflowPlan.horizonConflicts].map((conflict) => (
                    <p className={styles.queuePaused} key={conflict}>{conflict}</p>
                  ))}
                  <button type="button" onClick={() => void applyQueueReflow()} disabled={loading || Boolean(queueReflowPlan.dependencyErrors.length + queueReflowPlan.blackoutConflicts.length + queueReflowPlan.horizonConflicts.length)}>
                    اعمال بازچینی کامل
                  </button>
                </div>
              ) : null}
              {queueUndoPlan ? (
                <div className={styles.queuePositionPreviewItems}>
                  <article><strong>قابل بازگردانی</strong><span>{queueUndoPlan.restorableCount.toLocaleString("fa-IR")}</span></article>
                  <article><strong>کنار گذاشته‌شده</strong><span>{queueUndoPlan.skippedCount.toLocaleString("fa-IR")}</span></article>
                  {queueUndoPlan.conflicts.map((conflict) => <p className={styles.queuePaused} key={conflict}>{conflict}</p>)}
                  <button type="button" onClick={() => void applyQueueReflowUndo()} disabled={loading || Boolean(queueUndoPlan.conflicts.length)}>
                    تأیید و بازگردانی برنامه
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {canPublish ? (
            <section
              className={styles.queuePositionPreview}
              data-priority-rebalance="semantic"
            >
              <strong>متعادل‌سازی اولویت‌ها</strong>
              <p>
                {/* HALLEUS_WIKI_PRIORITY_HEADROOM_UI_R57 */}
                ترتیب معنایی اولویت‌ها و زمان‌های انتشار تغییر نمی‌کند؛ فقط عددهای
                اولویت دوباره با فاصله پخش می‌شوند. برای صف‌های معمول، بازهٔ جدید
                ۱۵۰ تا ۲۸۰ است تا اولویت‌های ۲۸۱ تا ۳۰۰ برای مقاله‌های مهم‌تر آینده
                خالی بماند.
              </p>
              <button
                type="button"
                onClick={() => void previewQueuePriorityRebalance()}
                disabled={loading}
              >
                پیش‌نمایش تعادل اولویت‌ها
              </button>
              {queuePriorityRebalancePlan ? (
                <div className={styles.queuePositionPreviewItems}>
                  <article>
                    <strong>بازهٔ فعلی</strong>
                    <span>
                      {queuePriorityRebalancePlan.currentMinPriority.toLocaleString("fa-IR")}
                      {" تا "}
                      {queuePriorityRebalancePlan.currentMaxPriority.toLocaleString("fa-IR")}
                    </span>
                  </article>
                  <article>
                    <strong>بازهٔ پیشنهادی</strong>
                    <span>
                      {queuePriorityRebalancePlan.nextMinPriority.toLocaleString("fa-IR")}
                      {" تا "}
                      {queuePriorityRebalancePlan.nextMaxPriority.toLocaleString("fa-IR")}
                    </span>
                  </article>
                  <article>
                    <strong>تعداد اولویت‌ها</strong>
                    <span>{queuePriorityRebalancePlan.itemCount.toLocaleString("fa-IR")}</span>
                  </article>
                  <article>
                    <strong>تغییر / بدون تغییر</strong>
                    <span>
                      {queuePriorityRebalancePlan.changedCount.toLocaleString("fa-IR")}
                      {" / "}
                      {queuePriorityRebalancePlan.unchangedCount.toLocaleString("fa-IR")}
                    </span>
                  </article>
                  <article>
                    <strong>ترتیب اولویت‌ها</strong>
                    <span>بدون تغییر</span>
                  </article>
                  <article>
                    <strong>زمان‌های صف</strong>
                    <span>بدون تغییر</span>
                  </article>
                  <details>
                    <summary>دیدن عددهای قبل و بعد</summary>
                    <div className={styles.queuePositionPreviewItems}>
                      {queuePriorityRebalancePlan.items.map((item) => (
                        <article key={item.jobId}>
                          <strong>{item.title}</strong>
                          <span>
                            {item.currentPriority.toLocaleString("fa-IR")}
                            {" ← "}
                            {item.nextPriority.toLocaleString("fa-IR")}
                          </span>
                        </article>
                      ))}
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={() => void applyQueuePriorityRebalance()}
                    disabled={loading}
                  >
                    اعمال تعادل اولویت‌ها
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {canPublish ? (
            <section className={styles.queuePositionPreview}>
              <strong>بازچینی گروهی صف</strong>
              <textarea
                value={queueBulkOrder}
                onChange={(event) => { setQueueBulkOrder(event.target.value); setQueueBulkPlan(null); }}
                placeholder="شناسهٔ هر مقاله را در یک خط و به ترتیب دلخواه وارد کن"
                rows={8}
                disabled={loading}
              />
              <button type="button" onClick={() => void previewQueueBulkReorder()} disabled={loading || !queueBulkOrder.trim()}>
                پیش‌نمایش بازچینی گروهی
              </button>
              {queueBulkPlan ? (
                <div className={styles.queuePositionPreviewItems}>
                  <span>ترتیب {queueBulkPlan.dependencyAdjustmentCount.toLocaleString("fa-IR")} مقاله برای حفظ وابستگی‌ها اصلاح شد.</span>
                  <button type="button" onClick={() => void applyQueueBulkReorder()} disabled={loading}>اعمال بازچینی گروهی</button>
                  {queueBulkPlan.items.filter((item) => item.dependencyAdjusted).map((item) => (
                    <article key={item.jobId}><strong>{item.title}</strong><span>ردیف درخواستی {item.requestedPosition.toLocaleString("fa-IR")} ← ردیف نهایی {item.nextPosition.toLocaleString("fa-IR")}</span></article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {queuePositionPlan ? (
            <div className={styles.queuePositionPreview}>
              <div>
                <div>
                  <strong>پیش‌نمایش تغییر جایگاه</strong>
                  <span>
                    جایگاه {queuePositionPlan.items.find((item) => item.jobId === queuePositionPlan.targetJobId)?.currentPosition.toLocaleString("fa-IR")}
                    {" ← "}
                    {queuePositionPlan.appliedPosition.toLocaleString("fa-IR")}
                    {queuePositionPlan.constrained
                      ? "؛ به نزدیک‌ترین جایگاه معتبر با رعایت وابستگی‌ها منتقل می‌شود."
                      : "؛ زمان‌های انتشار هماهنگ با این جابه‌جایی تغییر می‌کنند."}
                  </span>
                </div>
                {canPublish ? (
                  <button
                    type="button"
                    onClick={() => void applyQueuePositionMove()}
                    disabled={loading}
                  >
                    اعمال تغییر جایگاه
                  </button>
                ) : null}
              </div>
              <div className={styles.queuePositionPreviewItems}>
                {queuePositionPlan.items
                  .filter((item) => item.moved)
                  .map((item) => (
                    <article key={item.jobId}>
                      <strong>{item.title}</strong>
                      <span>
                        جایگاه {item.currentPosition.toLocaleString("fa-IR")}
                        {" ← "}
                        {item.nextPosition.toLocaleString("fa-IR")}
                        {" · "}
                        {formatDate(item.currentRunAt)}
                        {" ← "}
                        {formatDate(item.nextRunAt)}
                      </span>
                    </article>
                  ))}
              </div>
            </div>
          ) : null}

          {publicationQueue.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.publicationQueueTable}>
                <thead>
                  <tr>
                    <th className={styles.queueSelectionColumn}>
                      <input
                        type="checkbox"
                        aria-label="انتخاب همهٔ صف"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisibleArticles}
                      />
                    </th>
                    <th>مقاله</th>
                    <th>زمان انتشار</th>
                    <th>وضعیت job</th>
                    <th>تلاش / قفل</th>
                    <th>جایگاه صف</th>
                    <th>آخرین خطا</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {publicationQueue.map((article) => {
                    const job = getWikiPublishJobStateFromArticle(article);
                    const availability = job
                      ? getWikiPublishJobOperationAvailability(job)
                      : null;
                    const queuePosition = article.publishQueuePosition ?? queuePositions.get(article.publishJobId ?? article.id) ?? null; // HALLEUS_WIKI_JOB_POSITION_LOOKUP_R44
                    return (
                      <tr key={article.publishJobId ?? article.id}>{/* HALLEUS_WIKI_JOB_ROW_KEY_R44 */}
                        <td className={styles.queueSelectionColumn}>
                          {article.publishJobStatus !== "running" ? (
                            <input
                              type="checkbox"
                              aria-label={`انتخاب ${article.title}`}
                              checked={selectedVisibleIds.includes(article.id)}
                              onChange={(event) =>
                                updateArticleSelection(article.id, event.target.checked)
                              }
                            />
                          ) : "—"}
                        </td>
                        <td>
                          <strong>{article.title}</strong>
                          <small>{article.slug} · {article.contentCluster ?? "بدون خوشه"}</small>
                        </td>
                        <td>{formatDate(getWikiPublicationQueueDate(article))}</td>
                        <td>
                          <span className={styles.queueStatus} data-status={article.publishJobStatus ?? "scheduled"}>
                            {formatPublishJobStatus(article.publishJobStatus)}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {(article.publishJobAttemptCount ?? 0).toLocaleString("fa-IR")}
                            {" / "}
                            {WIKI_PUBLISH_JOB_MAX_ATTEMPTS.toLocaleString("fa-IR")}
                          </strong>
                          <small className={styles.queueLockNote}>
                            {article.publishJobLockedAt
                              ? `قفل از ${formatDate(article.publishJobLockedAt)}`
                              : "بدون قفل فعال"}
                          </small>
                        </td>
                        <td>
                          {article.publishJobStatus === "running" ? (
                            <span className={styles.queuePositionState}>در حال انتشار</span>
                          ) : article.publishJobStatus === "failed" ? (
                            <span className={styles.queuePositionState}>خارج از صف</span>
                          ) : availability?.canReorder && queuePosition ? (
                            <div className={styles.queuePositionEditor}>
                              <div className={styles.queuePositionInput}>
                                <input
                                  type="number"
                                  min={1}
                                  max={positionedQueueSize}
                                  step={1}
                                  aria-label={`جایگاه صف ${article.title}`}
                                  value={
                                    queuePositionDrafts[article.id] ??
                                    String(queuePosition)
                                  }
                                  disabled={loading}
                                  onChange={(event) => {
                                    setQueuePositionDrafts((current) => ({
                                      ...current,
                                      [article.id]: event.target.value,
                                    }));
                                    setQueuePositionPlan(null);
                                  }}
                                />
                                <span>از {positionedQueueSize.toLocaleString("fa-IR")}</span>
                                <button
                                  type="button"
                                  disabled={
                                    loading ||
                                    !Number.isInteger(
                                      Number(
                                        queuePositionDrafts[article.id] ??
                                          queuePosition,
                                      ),
                                    ) ||
                                    Number(
                                      queuePositionDrafts[article.id] ??
                                        queuePosition,
                                    ) < 1 ||
                                    Number(
                                      queuePositionDrafts[article.id] ??
                                        queuePosition,
                                    ) > positionedQueueSize ||
                                    Number(
                                      queuePositionDrafts[article.id] ??
                                        queuePosition,
                                    ) === queuePosition
                                  }
                                  onClick={() =>
                                    void previewQueuePositionMove(
                                      article,
                                      Number(
                                        queuePositionDrafts[article.id] ??
                                          queuePosition,
                                      ),
                                    )
                                  }
                                >
                                  جابه‌جا
                                </button>
                              </div>
                              <div className={styles.queuePositionButtons}>
                                <button
                                  type="button"
                                  disabled={loading || queuePosition === 1}
                                  onClick={() =>
                                    void previewQueuePositionMove(article, 1)
                                  }
                                >
                                  اول صف
                                </button>
                                <button
                                  type="button"
                                  aria-label={`یک جایگاه بالاتر برای ${article.title}`}
                                  disabled={loading || queuePosition === 1}
                                  onClick={() =>
                                    void previewQueuePositionMove(
                                      article,
                                      Math.max(1, queuePosition - 1),
                                    )
                                  }
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  aria-label={`یک جایگاه پایین‌تر برای ${article.title}`}
                                  disabled={
                                    loading ||
                                    queuePosition === positionedQueueSize
                                  }
                                  onClick={() =>
                                    void previewQueuePositionMove(
                                      article,
                                      Math.min(
                                        positionedQueueSize,
                                        queuePosition + 1,
                                      ),
                                    )
                                  }
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{article.publishJobError ? <span className={styles.inlineError}>{article.publishJobError}</span> : "—"}</td>
                        <td>
                          <div className={styles.queueJobActions}>
                            <button type="button" onClick={() => {
                              onSectionChange("articles");
                              void openArticle(article.id);
                            }}>
                              باز کردن مقاله
                            </button>
                            {job && availability?.canReschedule ? (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => void mutateQueueJob(article, "reschedule")}
                              >
                                تغییر زمان
                              </button>
                            ) : null}
                            {job && availability?.canCancel ? (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => void mutateQueueJob(article, "cancel")}
                              >
                                لغو نوبت
                              </button>
                            ) : null}
                            {job && availability?.canRetry ? (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => void mutateQueueJob(article, "retry")}
                              >
                                تلاش دوباره
                              </button>
                            ) : null}
                            {availability?.locked ? (
                              <small className={styles.queueLockNote}>
                                job در حال اجراست و قابل تغییر نیست.
                              </small>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.queueEmpty}>هیچ مقاله‌ای در صف انتشار نیست.</p>
          )}
          <div className={styles.wikiPagination} aria-label="صفحه‌بندی صف انتشار">
            {/* HALLEUS_WIKI_QUEUE_PAGINATION_R44 */}
            <span>
              {articleTotal
                ? `${(((articlePage - 1) * articlePageSize) + 1).toLocaleString("fa-IR")} تا ${Math.min(articlePage * articlePageSize, articleTotal).toLocaleString("fa-IR")} از ${articleTotal.toLocaleString("fa-IR")} job`
                : "job فعالی پیدا نشد"}
            </span>
            <label>
              تعداد در صفحه
              <select
                value={articlePageSize}
                onChange={(event) => {
                  setArticlePageSize(Number(event.target.value));
                  setArticlePage(1);
                }}
              >
                {[25, 50, 100].map((value) => <option key={value} value={value}>{value.toLocaleString("fa-IR")}</option>)}
              </select>
            </label>
            <button type="button" disabled={articlePage <= 1} onClick={() => setArticlePage((value) => Math.max(1, value - 1))}>
              صفحهٔ قبل
            </button>
            <span>صفحهٔ {articlePage.toLocaleString("fa-IR")} از {articleTotalPages.toLocaleString("fa-IR")}</span>
            <button type="button" disabled={articlePage >= articleTotalPages} onClick={() => setArticlePage((value) => Math.min(articleTotalPages, value + 1))}>
              صفحهٔ بعد
            </button>
          </div>
        </section>
      ) : null}

      {((activeSection === "articles" && detail) || (activeSection === "new" && canDraft)) ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>{detail ? "ویرایش مقاله" : "مقالهٔ تازه"}</h3>
              <p>{detail ? (dirty ? "تغییر ذخیره‌نشده؛ ذخیرهٔ خودکار فعال است." : "همه تغییرها ذخیره شده‌اند.") : (dirty ? "مقالهٔ تازه هنوز ذخیره نشده است." : "برای ساخت مقاله، پیش‌نویس را ذخیره کن.")}</p> {/* HALLEUS_WIKI_NEW_AUTOSAVE_COPY_R44 */}
            </div>
            <div className={styles.wikiActions}>
              {detail ? (
                <button type="button" onClick={() => {
                  setDetail(null);
                  onSectionChange("articles");
                }}>
                  بازگشت به مقاله‌ها
                </button>
              ) : null}
              <button type="button" onClick={() => setPreview((value) => !value)}>{preview ? "بازگشت به ویرایش" : "پیش‌نمایش"}</button>
            </div>
          </div>

          {preview ? (
            <article className={styles.wikiPreview}>
              <span>{categories.find((item) => item.id === draft.categoryId)?.label}</span>
              <h2>{draft.title || "عنوان مقاله"}</h2>
              <p>{draft.intro || draft.summary}</p>
              {markdownPreview.map((line, index) => line.startsWith("## ")
                ? <h3 key={`${line}-${index}`}>{line.slice(3)}</h3>
                : <p key={`${line}-${index}`}>{line.replace(/^- /, "• ")}</p>)}
            </article>
          ) : (
            <div className={styles.wikiEditor}>
              <label className={styles.wideField}>عنوان<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
              <label>دسته<select value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>عنوان کوتاه<input value={draft.shortTitle} onChange={(event) => updateDraft("shortTitle", event.target.value)} /></label>
              <label className={styles.wideField}>خلاصه<textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} /></label>
              <label className={styles.wideField}>مقدمه<textarea value={draft.intro} onChange={(event) => updateDraft("intro", event.target.value)} /></label>
              <label className={styles.wideField}>Markdown و بخش‌ها<textarea className={styles.markdownEditor} value={draft.bodyMarkdown} onChange={(event) => updateDraft("bodyMarkdown", event.target.value)} /></label>
              <label className={`${styles.toggleCard} ${styles.wideField}`}>
                <span>
                  <strong>نمایش در نتایج جست‌وجو</strong>
                  <small>پس از انتشار، این مقاله اجازهٔ ایندکس‌شدن داشته باشد.</small>
                </span>
                <input type="checkbox" checked={draft.indexable} onChange={(event) => updateDraft("indexable", event.target.checked)} />
              </label>

              <details className={`${styles.wikiAdvanced} ${styles.wideField}`}>
                <summary>تنظیمات پیشرفتهٔ مقاله</summary>
                <div className={styles.wikiAdvancedGrid}>
                  <label>شناسهٔ پایدار<input disabled={Boolean(detail)} value={draft.stableId} onChange={(event) => updateDraft("stableId", event.target.value)} /></label>
                  <label>Slug<input value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} /></label>
                  <label>نقش<select value={draft.articleRole} onChange={(event) => updateDraft("articleRole", event.target.value as "pillar" | "support")}><option value="pillar">Pillar</option><option value="support">Support</option></select></label>
                  <label>خوشه<input value={draft.contentCluster} onChange={(event) => updateDraft("contentCluster", event.target.value)} /></label>
                  <label>نسخه<input min="1" type="number" value={draft.contentVersion} onChange={(event) => updateDraft("contentVersion", Number(event.target.value))} /></label>
                  <label>اولویت ۰ تا ۳۰۰<input min="0" max="300" step="10" type="number" value={draft.publicationPriority} onChange={(event) => updateDraft("publicationPriority", Number(event.target.value))} /></label>
                  <label>زمان مطالعه<input min="1" type="number" value={draft.readingMinutes} onChange={(event) => updateDraft("readingMinutes", Number(event.target.value))} /></label>
                  <label className={styles.wideField}>SEO title<input value={draft.seoTitle ?? ""} onChange={(event) => updateDraft("seoTitle", event.target.value || null)} /></label>
                  <label className={styles.wideField}>Meta description<textarea value={draft.metaDescription} onChange={(event) => updateDraft("metaDescription", event.target.value)} /></label>
                  <label className={styles.wideField}>برچسب‌ها؛ جداشده با ویرگول<input value={draft.tags.join(", ")} onChange={(event) => updateDraft("tags", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
                  <label className={styles.wideField}>شناسهٔ مقاله‌های مرتبط؛ جداشده با ویرگول<input value={draft.relatedArticleIds.join(", ")} onChange={(event) => updateDraft("relatedArticleIds", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
                  <label className={styles.wideField}>منابع؛ هر خط «عنوان|https://…»<textarea value={draft.sources.map((source) => typeof source === "string" ? source : `${source.label}|${source.href}`).join("\n")} onChange={(event) => updateDraft("sources", event.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
                    const separator = line.indexOf("|");
                    return separator > 0 ? { label: line.slice(0, separator).trim(), href: line.slice(separator + 1).trim() } : line;
                  }))} /></label>
                  <label className={styles.wideField}>لینک‌های ادامه؛ هر خط «عنوان|/مسیر»<textarea value={draft.contextLinks.map((link) => `${link.label}|${link.href}`).join("\n")} onChange={(event) => updateDraft("contextLinks", event.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
                    const [label, ...href] = line.split("|");
                    return { label: label.trim(), href: href.join("|").trim() };
                  }))} /></label>
                  <label>عنوان CTA<input value={draft.callToAction?.title ?? ""} onChange={(event) => updateDraft("callToAction", { title: event.target.value, text: draft.callToAction?.text ?? "", label: draft.callToAction?.label ?? "", href: draft.callToAction?.href ?? "/chart" })} /></label>
                  <label>متن دکمهٔ CTA<input value={draft.callToAction?.label ?? ""} onChange={(event) => updateDraft("callToAction", { title: draft.callToAction?.title ?? "", text: draft.callToAction?.text ?? "", label: event.target.value, href: draft.callToAction?.href ?? "/chart" })} /></label>
                  <label className={styles.wideField}>توضیح CTA<textarea value={draft.callToAction?.text ?? ""} onChange={(event) => updateDraft("callToAction", { title: draft.callToAction?.title ?? "", text: event.target.value, label: draft.callToAction?.label ?? "", href: draft.callToAction?.href ?? "/chart" })} /></label>
                  <label className={styles.wideField}>مسیر CTA<input value={draft.callToAction?.href ?? ""} onChange={(event) => updateDraft("callToAction", event.target.value ? { title: draft.callToAction?.title ?? "", text: draft.callToAction?.text ?? "", label: draft.callToAction?.label ?? "", href: event.target.value } : null)} /></label>
                </div>
              </details>
            </div>
          )}

          <div className={styles.wikiActions}>
            {canDraft ? <button type="button" onClick={() => void saveDraft(false)}>ذخیرهٔ پیش‌نویس</button> : null}
            {detail && canPublish ? <button type="button" onClick={() => void action("publish")}>انتشار اکنون</button> : null}
            {detail && canPublish ? <button type="button" onClick={() => {
              const value = window.prompt("زمان انتشار را به وقت تهران با قالب YYYY-MM-DDTHH:mm وارد کن:");
              if (!value) return;
              const publishAt = parseTehranDateTimeInput(value);
              if (!publishAt) {
                setError("زمان انتشار به وقت تهران معتبر نیست.");
                return;
              }
              void action("schedule", { publishAt }); // HALLEUS_WIKI_SCHEDULE_TEHRAN_R44
            }}>زمان‌بندی</button> : null}
            {detail && detail.status === "published" && canPublish ? <button type="button" onClick={() => void action("unpublish")}>خارج‌کردن از انتشار</button> : null}
            {detail && ((detail.deletedAt && canDraft) || (!detail.deletedAt && canPublish)) ? <button type="button" onClick={() => void action(detail.deletedAt ? "restore" : "delete")}>{detail.deletedAt ? "بازیابی" : "حذف نرم"}</button> : null}
          </div>

          {detail?.revisions.length ? (
            <div className={styles.revisions}>
              <h4>نسخه‌ها، مقایسه و بازگشت</h4>
              {detail.revisions.map((revision) => (
                <details key={revision.revisionNumber}>
                  <summary>نسخه {revision.revisionNumber.toLocaleString("fa-IR")} · {revision.status} · {formatDate(revision.createdAt)}</summary>
                  <p>فیلدهای متفاوت با ویرایش فعلی: {changedFields(revision.snapshot, draft).join("، ") || "بدون تفاوت"}</p>
                  <pre>{JSON.stringify(revision.snapshot, null, 2)}</pre>
                  {canPublish ? <button type="button" onClick={() => void action("rollback", { revisionNumber: revision.revisionNumber })}>بازگشت به این نسخه</button> : null}
                </details>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeSection === "import" && canImport ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>ورود بستهٔ استاندارد ویکی</h3>
              <p>بستهٔ ZIP را طبق الگوی هالیوس بساز، اعتبارسنجی کن و بعد وارد ویکی کن.</p>
            </div>
            <button
              className={styles.downloadLink}
              disabled={loading}
              type="button"
              onClick={() => void downloadLiveContentGuide()}
            >
              دانلود راهنمای به‌روز تولید محتوا
            </button>
          </div>
          <p className={styles.fieldHint}>این فایل هنگام دانلود ساخته می‌شود و علاوه بر قرارداد کامل بسته، دسته‌های فعلی، مقاله‌های منتشرشدهٔ قابل لینک و همهٔ شناسه‌ها و slugهای رزروشده را دارد.</p>
          <form className={styles.wikiInlineForm} onSubmit={(event) => void importPackage(event)}>
            <input accept=".zip,application/zip" name="package" required type="file" onChange={() => { setImportMergePlan(null); setImportPreviewPlan(null); }} />
            <select defaultValue={canPublish ? "auto_schedule" : "review_first"} name="mode" onChange={() => { setImportMergePlan(null); setImportPreviewPlan(null); }}>
              <option disabled={!canPublish} value="auto_schedule">زمان‌بندی خودکار</option>
              <option value="review_first">ابتدا بازبینی</option>
              <option disabled={!canPublish} value="merge_queue">ورود و ادغام با صف فعلی</option>
            </select>
            <select defaultValue="preserve" name="policy" onChange={() => { setImportMergePlan(null); setImportPreviewPlan(null); }}>
              <option value="preserve">حفظ ترتیب فعلی و افزودن تازه‌ها</option>
              <option value="priority">ادغام بر پایهٔ اولویت انتشار</option>
              <option value="balanced_clusters">پخش متعادل خوشه‌ها</option>
            </select>
            <button type="submit">
              {importMergePlan
                ? "تأیید و اعمال ادغام"
                : importPreviewPlan
                  ? "تأیید و اعمال ورود"
                  : "اعتبارسنجی و پیش‌نمایش"}
            </button>
          </form>
          {importMergePlan ? (
            <div className={styles.importResult} data-wiki-import-merge-preview="true">
              <strong>پیش‌نمایش ورود و ادغام با صف فعلی</strong>
              <p>{importMergePlan.validArticleCount.toLocaleString("fa-IR")} مقالهٔ معتبر و {importMergePlan.quarantinedArticleCount.toLocaleString("fa-IR")} مقالهٔ قرنطینه‌شده.</p>
              <p>پایان فعلی صف: {formatDate(importMergePlan.queue.previousLastRunAt)} · پایان جدید: {formatDate(importMergePlan.queue.nextLastRunAt)}</p>
              <p>{importMergePlan.queue.movedCount.toLocaleString("fa-IR")} کار جابه‌جا می‌شود و {importMergePlan.queue.lockedJobs.length.toLocaleString("fa-IR")} کار قفل‌شده دست‌نخورده می‌ماند.</p>
              {[...importMergePlan.queue.dependencyErrors, ...importMergePlan.queue.blackoutConflicts, ...importMergePlan.queue.horizonConflicts].map((conflict) => (
                <p className={styles.queuePaused} key={conflict}>{conflict}</p>
              ))}
              <p>برای اعمال، همان فایل و تنظیمات را نگه دار و دکمهٔ تأیید را بزن. هر تغییر در بسته یا صف، پیش‌نمایش را نامعتبر می‌کند.</p>
            </div>
          ) : null}
          {importPreviewPlan ? (
            <div className={styles.importResult} data-wiki-import-preview="true">
              <strong>پیش‌نمایش ورود بسته</strong>
              <p>
                {importPreviewPlan.validArticleCount.toLocaleString("fa-IR")} مقالهٔ معتبر · {importPreviewPlan.quarantinedArticleCount.toLocaleString("fa-IR")} قرنطینه · {importPreviewPlan.assetCount.toLocaleString("fa-IR")} رسانه
              </p>
              <p>
                {importPreviewPlan.createCount.toLocaleString("fa-IR")} مقالهٔ تازه و {importPreviewPlan.updateCount.toLocaleString("fa-IR")} نسخهٔ جدید برای مقالهٔ موجود.
              </p>
              <p>
                حالت اعمال: {importPreviewPlan.mode === "auto_schedule" ? "ساخت پیش‌نویس و زمان‌بندی خودکار" : "فقط ساخت/به‌روزرسانی پیش‌نویس برای بازبینی"}.
              </p>
              {importPreviewPlan.mode === "auto_schedule" ? (
                <p>
                  اولین نوبت: {formatDate(importPreviewPlan.firstScheduledFor)} · آخرین نوبت: {formatDate(importPreviewPlan.lastScheduledFor)}
                </p>
              ) : null}
              <p>
                این مرحله فقط پیش‌نمایش است. تا زدن «تأیید و اعمال ورود» هیچ مقاله، رسانه یا job انتشاری ساخته نمی‌شود.
              </p>
              <details>
                <summary>دیدن نتیجهٔ برنامه‌ریزی برای مقاله‌ها</summary>
                {importPreviewPlan.items.map((item) => (
                  <article className={styles.importItem} key={`${item.stableId}-${item.resultStatus}`}>
                    <div>
                      <strong>{item.title}</strong>
                      <code dir="ltr">{item.stableId}</code>
                      <span>
                        {item.resultStatus === "quarantined"
                          ? "قرنطینه"
                          : item.resultStatus === "scheduled"
                            ? `زمان‌بندی: ${formatDate(item.scheduledFor)}`
                            : "پیش‌نویس برای بازبینی"}
                      </span>
                    </div>
                    {item.errors.length ? (
                      <ul>
                        {item.errors.map((itemError) => (
                          <li key={itemError}>{formatImportError(itemError)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </details>
            </div>
          ) : null}
          {importResult ? (
            <div className={styles.importResult}>
              <strong>نتیجهٔ بررسی بسته</strong>
              <p>
                {importResult.importedCount.toLocaleString("fa-IR")} مقاله وارد شد؛ {importResult.quarantinedCount.toLocaleString("fa-IR")} مورد نیاز به اصلاح دارد.
              </p>
              {importResult.items.map((item) => (
                <article className={styles.importItem} key={`${item.stableId}-${item.status}`}>
                  <div>
                    <code dir="ltr">{item.stableId}</code>
                    <span>{item.status === "quarantined" ? "قرنطینه شد" : item.status === "scheduled" ? "زمان‌بندی شد" : "به‌صورت پیش‌نویس وارد شد"}</span>
                  </div>
                  {item.errors.length ? (
                    <ul>
                      {item.errors.map((itemError) => <li key={itemError}>{formatImportError(itemError)}</li>)}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
          <div className={styles.importResult}>
            <strong>وضعیت واقعی بسته‌های اخیر</strong>
            <p>وضعیت هنگام ورود از وضعیت فعلی مقاله‌ها جدا نمایش داده می‌شود.</p>
            {importPackages.map((item) => {
              const allPublished =
                item.articleCount > 0 &&
                item.current.published === item.articleCount &&
                item.current.missing === 0 &&
                item.current.deleted === 0 &&
                item.current.openDrafts === 0;
              return (
                <article className={styles.importItem} key={item.packageId}>
                  <div>
                    <strong>{item.packageName}</strong>
                    <span>ورود تاریخی: {item.importedCount.toLocaleString("fa-IR")} واردشده · {item.quarantinedCount.toLocaleString("fa-IR")} قرنطینه</span>
                    <span>
                      وضعیت فعلی: {item.current.published.toLocaleString("fa-IR")} منتشرشده · {item.current.scheduled.toLocaleString("fa-IR")} زمان‌بندی · {item.current.draft.toLocaleString("fa-IR")} پیش‌نویس · {item.current.archived.toLocaleString("fa-IR")} آرشیو
                    </span>
                    <span>
                      {item.current.missing.toLocaleString("fa-IR")} مفقود · {item.current.deleted.toLocaleString("fa-IR")} حذف‌شده · {item.current.openDrafts.toLocaleString("fa-IR")} ویرایش باز
                    </span>
                    {allPublished ? <strong>همهٔ {item.articleCount.toLocaleString("fa-IR")} مقاله منتشر شده‌اند؛ اقدام انتشار دوباره لازم نیست.</strong> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeSection === "settings" && settings ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>تنظیمات انتشار خودکار</h3>
              <p>ظرفیت روزانه، روزهای انتشار و توقف‌های تقویم را بدون واردکردن کد تنظیم کن.</p>
            </div>
            <strong className={styles.scheduleSummary}>
              تا {settings.articlesPerWeek.toLocaleString("fa-IR")} مقاله در هفته
            </strong>
          </div>

          <div className={styles.scheduleGrid}>
            <label>
              حداکثر مقاله در هر روز
              <input min="1" max="12" type="number" value={settings.maxArticlesPerDay} onChange={(event) => setDailyCapacity(Number(event.target.value))} />
              <small>برای نمونه، عدد ۵ یعنی در هر روز انتخاب‌شده حداکثر پنج مقاله منتشر شود.</small>
            </label>
            <label>
              ساعت شروع انتشار
              <input type="time" value={settings.publishTime} onChange={(event) => setSettings({ ...settings, publishTime: event.target.value })} />
              <small>ساعت اولین مقاله بر پایهٔ زمان تهران.</small>
            </label>
            <label>
              فاصلهٔ انتشارها
              <select value={settings.minimumIntervalHours} onChange={(event) => setSettings({ ...settings, minimumIntervalHours: Number(event.target.value) })}>
                {[1, 2, 3, 4, 6, 8, 12, 24].map((hours) => <option key={hours} value={hours}>{hours.toLocaleString("fa-IR")} ساعت</option>)}
              </select>
              <small>فاصلهٔ حداقل میان مقاله‌های یک روز.</small>
            </label>
            <label>
              برنامه‌ریزی تا چه مدت جلوتر؟
              <select value={settings.maxHorizonDays} onChange={(event) => setSettings({ ...settings, maxHorizonDays: Number(event.target.value) })}>
                <option value="30">یک ماه آینده</option>
                <option value="90">سه ماه آینده</option>
                <option value="180">شش ماه آینده</option>
                <option value="365">یک سال آینده</option>
              </select>
              <small>سامانه برای یافتن نوبت خالی، فقط تا این بازه جلو می‌رود.</small>
            </label>
          </div>

          <div className={styles.scheduleBlock}>
            <strong>روزهای انتشار</strong>
            <p className={styles.fieldHint}>روزهایی را انتخاب کن که انتشار خودکار در آن‌ها مجاز است.</p>
            <div className={styles.weekdayPicker}>
              {weekdayOptions.map((option) => (
                <label className={styles.weekdayOption} key={option.value}>
                  <input type="checkbox" checked={settings.allowedWeekdays.includes(option.value)} onChange={() => toggleWeekday(option.value)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.scheduleBlock}>
            <strong>روزهای بدون انتشار</strong>
            <p className={styles.fieldHint}>تعطیلی یا روز خاصی را انتخاب کن تا هیچ مقاله‌ای در آن تاریخ منتشر نشود.</p>
            <div className={styles.blackoutEditor}>
              <input type="date" value={blackoutDate} onChange={(event) => setBlackoutDate(event.target.value)} />
              <button type="button" onClick={addBlackoutDate}>افزودن تاریخ</button>
            </div>
            <div className={styles.blackoutList}>
              {settings.blackoutDates.length ? settings.blackoutDates.map((date) => (
                <button className={styles.blackoutChip} key={date} type="button" onClick={() => setSettings({ ...settings, blackoutDates: settings.blackoutDates.filter((item) => item !== date) })}>
                  {date} <span aria-hidden="true">×</span>
                </button>
              )) : <small>فعلاً روز توقفی ثبت نشده است.</small>}
            </div>
          </div>

          <div className={styles.toggleGrid}>
            <label className={styles.toggleCard}>
              <span>
                <strong>اول مقاله‌های پایه</strong>
                <small>مقالهٔ Pillar پیش از مقاله‌های وابستهٔ Support منتشر شود.</small>
              </span>
              <input type="checkbox" checked={settings.pillarBeforeSupport} onChange={(event) => setSettings({ ...settings, pillarBeforeSupport: event.target.checked })} />
            </label>
            <label className={styles.toggleCard}>
              <span>
                <strong>توقف موقت انتشار خودکار</strong>
                <small>صف انتشار حفظ می‌شود، اما ناشر خودکار چیزی منتشر نمی‌کند.</small>
              </span>
              <input type="checkbox" checked={settings.publishingPaused} onChange={(event) => setSettings({ ...settings, publishingPaused: event.target.checked })} />
            </label>
          </div>
          {canSettings ? <button type="button" onClick={() => void saveSettings()}>ذخیرهٔ تنظیمات</button> : null}
        </section>
      ) : null}

      {activeSection === "categories" ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>دسته‌های ویکی</h3>
              <p>دسته‌های موجود را ببین و برای مقاله‌های آینده دستهٔ تازه بساز.</p>
            </div>
          </div>
          {canSettings ? (
            <form className={styles.categoryForm} onSubmit={(event) => void createCategory(event)}>
              <label>شناسهٔ لاتین<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={categoryDraft.id} onChange={(event) => setCategoryDraft({ ...categoryDraft, id: event.target.value })} placeholder="مثلاً relationships" /></label>
              <label>نام فارسی<input required value={categoryDraft.label} onChange={(event) => setCategoryDraft({ ...categoryDraft, label: event.target.value })} placeholder="مثلاً رابطه‌ها" /></label>
              <label className={styles.wideField}>توضیح کوتاه<textarea required value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} /></label>
              <button type="submit">ساخت دسته</button>
            </form>
          ) : null}
          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <article key={category.id}>
                <strong>{category.label}</strong>
                <code>{category.id}</code>
                <p>{category.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeSection === "media" ? (
      <section className={styles.wikiPanel}>
        <h3>رسانه‌ها</h3>
        {canMedia ? (
          <form className={styles.wikiInlineForm} onSubmit={(event) => void uploadMedia(event)}>
            <input accept="image/png,image/jpeg,image/webp" name="file" required type="file" />
            <input name="alt" placeholder="متن جایگزین تصویر" required />
            <button type="submit">آپلود امن</button>
          </form>
        ) : null}
        <div className={styles.mediaGrid}>
          {assets.filter((asset) => !asset.deletedAt).map((asset) => (
            <article key={asset.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={asset.alt} loading="lazy" src={asset.url} />
              <strong>{asset.originalName}</strong>
              <small>{asset.alt} · {asset.byteSize.toLocaleString("fa-IR")} بایت · {asset.orphan ? "بدون استفاده" : `${asset.referenceCount.toLocaleString("fa-IR")} ارجاع`}</small>
              {canMedia && asset.orphan ? <button type="button" onClick={() => void deleteMedia(asset)}>حذف رسانهٔ بدون استفاده</button> : null}
            </article>
          ))}
        </div>
      </section>
      ) : null}
    </div>
  );
}
