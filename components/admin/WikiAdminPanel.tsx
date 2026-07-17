"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AdminSessionPayload,
} from "@/lib/admin/admin-types";
import type {
  WikiArticleAdminSummary,
  WikiArticleSnapshot,
  WikiImportResult,
  WikiRevisionSummary,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";
import {
  buildWikiPublicationQueue,
  getWikiPublicationQueueDate,
  summarizeWikiPublicationQueue,
} from "@/lib/wiki/wiki-publication-queue";
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatPublishJobStatus(value: string | null) {
  const labels: Record<string, string> = {
    queued: "در صف",
    running: "در حال انتشار",
    retry: "در انتظار تلاش دوباره",
    failed: "ناموفق",
    published: "منتشرشده",
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

  const canDraft = session.capabilities.includes("wiki.draft.write");
  const canPublish = session.capabilities.includes("wiki.publish.write");
  const canImport = session.capabilities.includes("wiki.import.write");
  const canSettings = session.capabilities.includes("wiki.settings.write");
  const canMedia = session.capabilities.includes("wiki.media.write");
  const publicationQueue = useMemo(
    () => buildWikiPublicationQueue(articles),
    [articles],
  );
  const publicationQueueSummary = useMemo(
    () =>
      summarizeWikiPublicationQueue(
        publicationQueue,
        settings?.publishingPaused ?? false,
      ),
    [publicationQueue, settings?.publishingPaused],
  );

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (init?.body && !(init.body instanceof FormData)) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(path, { ...init, headers, cache: "no-store" });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : "درخواست ویکی ناموفق بود.");
    }
    return payload;
  }, [token]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const queueView = activeSection === "queue";
      const payload = await request(`/api/admin/wiki/articles?search=${encodeURIComponent(queueView ? "" : search)}&status=${encodeURIComponent(queueView ? "all" : status)}&limit=100`);
      setArticles(payload.articles as WikiArticleAdminSummary[]);
      setCategories(payload.categories as Category[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "بارگذاری ویکی ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [activeSection, request, search, status]);

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

  async function importPackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setLoading(true);
    setError("");
    setImportResult(null);
    try {
      const payload = await request("/api/admin/wiki/imports", { method: "POST", body: form });
      const result = payload.result as WikiImportResult;
      setImportResult(result);
      if (result.quarantinedCount > 0) {
        setMessage("");
        setError(`${result.importedCount.toLocaleString("fa-IR")} مقاله وارد شد و ${result.quarantinedCount.toLocaleString("fa-IR")} مقاله نیاز به اصلاح دارد. دلیل هر مورد پایین فرم آمده است.`);
      } else {
        setMessage(`${result.importedCount.toLocaleString("fa-IR")} مقاله با موفقیت وارد شد.`);
      }
      formElement.reset();
      await loadList();
    } catch (importError) {
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
      {loading ? <p className={styles.loading}>در حال انجام…</p> : null}

      {activeSection === "articles" && !detail ? (
      <section className={styles.wikiPanel}>
        <div className={styles.wikiPanelHeader}>
          <div>
            <h3>مقاله‌ها</h3>
            <p>پیش‌نویس، زمان‌بندی، انتشار و تاریخچهٔ نسخه‌ها</p>
          </div>
        </div>
        <form className={styles.wikiFilters} onSubmit={(event) => { event.preventDefault(); void loadList(); }}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی عنوان، slug یا stable ID" />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="draft">پیش‌نویس</option>
            <option value="scheduled">زمان‌بندی‌شده</option>
            <option value="published">منتشرشده</option>
            <option value="archived">آرشیو</option>
          </select>
          <button type="submit">جست‌وجو</button>
        </form>
        <div className={styles.wikiArticleList}>
          {articles.map((article) => (
            <button key={article.id} type="button" onClick={() => void openArticle(article.id)}>
              <strong>{article.title}</strong>
              <span>{article.slug} · {article.status}{article.hasDraft ? " · پیش‌نویس باز" : ""}</span>
              <small>{article.pendingPublishAt ? `انتشار: ${formatDate(article.pendingPublishAt)} · ${article.publishJobStatus}` : `ویرایش: ${formatDate(article.updatedAt)}`}</small>
              {article.publishJobError ? <small className={styles.inlineError}>{article.publishJobError}</small> : null}
            </button>
          ))}
        </div>
      </section>
      ) : null}


      {activeSection === "queue" ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>صف انتشار</h3>
              <p>نمای خواندنی jobهای زمان‌بندی‌شده؛ تغییر برنامه از این بخش ممکن نیست.</p>
            </div>
            <button type="button" onClick={() => void loadList()}>تازه‌سازی صف</button>
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

          {publicationQueue.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.publicationQueueTable}>
                <thead>
                  <tr>
                    <th>مقاله</th>
                    <th>زمان انتشار</th>
                    <th>وضعیت job</th>
                    <th>اولویت</th>
                    <th>آخرین خطا</th>
                    <th>دسترسی</th>
                  </tr>
                </thead>
                <tbody>
                  {publicationQueue.map((article) => (
                    <tr key={article.id}>
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
                      <td>{article.publicationPriority.toLocaleString("fa-IR")}</td>
                      <td>{article.publishJobError ? <span className={styles.inlineError}>{article.publishJobError}</span> : "—"}</td>
                      <td>
                        <button type="button" onClick={() => {
                          onSectionChange("articles");
                          void openArticle(article.id);
                        }}>
                          باز کردن مقاله
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.queueEmpty}>هیچ مقاله‌ای در صف انتشار نیست.</p>
          )}
        </section>
      ) : null}

      {((activeSection === "articles" && detail) || (activeSection === "new" && canDraft)) ? (
        <section className={styles.wikiPanel}>
          <div className={styles.wikiPanelHeader}>
            <div>
              <h3>{detail ? "ویرایش مقاله" : "مقالهٔ تازه"}</h3>
              <p>{dirty ? "تغییر ذخیره‌نشده؛ ذخیرهٔ خودکار فعال است." : "همه تغییرها ذخیره شده‌اند."}</p>
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
              <label>شناسهٔ پایدار<input disabled={Boolean(detail)} value={draft.stableId} onChange={(event) => updateDraft("stableId", event.target.value)} /></label>
              <label>Slug<input value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} /></label>
              <label className={styles.wideField}>عنوان<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
              <label>عنوان کوتاه<input value={draft.shortTitle} onChange={(event) => updateDraft("shortTitle", event.target.value)} /></label>
              <label>دسته<select value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>نقش<select value={draft.articleRole} onChange={(event) => updateDraft("articleRole", event.target.value as "pillar" | "support")}><option value="pillar">Pillar</option><option value="support">Support</option></select></label>
              <label>خوشه<input value={draft.contentCluster} onChange={(event) => updateDraft("contentCluster", event.target.value)} /></label>
              <label>نسخه<input min="1" type="number" value={draft.contentVersion} onChange={(event) => updateDraft("contentVersion", Number(event.target.value))} /></label>
              <label>اولویت<input type="number" value={draft.publicationPriority} onChange={(event) => updateDraft("publicationPriority", Number(event.target.value))} /></label>
              <label>زمان مطالعه<input min="1" type="number" value={draft.readingMinutes} onChange={(event) => updateDraft("readingMinutes", Number(event.target.value))} /></label>
              <label className={styles.wideField}>SEO title<input value={draft.seoTitle ?? ""} onChange={(event) => updateDraft("seoTitle", event.target.value || null)} /></label>
              <label className={styles.wideField}>Meta description<textarea value={draft.metaDescription} onChange={(event) => updateDraft("metaDescription", event.target.value)} /></label>
              <label className={styles.wideField}>خلاصه<textarea value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} /></label>
              <label className={styles.wideField}>مقدمه<textarea value={draft.intro} onChange={(event) => updateDraft("intro", event.target.value)} /></label>
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
              <label className={styles.wideField}>Markdown و بخش‌ها<textarea className={styles.markdownEditor} value={draft.bodyMarkdown} onChange={(event) => updateDraft("bodyMarkdown", event.target.value)} /></label>
              <label className={`${styles.toggleCard} ${styles.wideField}`}>
                <span>
                  <strong>نمایش در نتایج جست‌وجو</strong>
                  <small>پس از انتشار، این مقاله اجازهٔ ایندکس‌شدن داشته باشد.</small>
                </span>
                <input type="checkbox" checked={draft.indexable} onChange={(event) => updateDraft("indexable", event.target.checked)} />
              </label>
            </div>
          )}

          <div className={styles.wikiActions}>
            {canDraft ? <button type="button" onClick={() => void saveDraft(false)}>ذخیرهٔ پیش‌نویس</button> : null}
            {detail && canPublish ? <button type="button" onClick={() => void action("publish")}>انتشار اکنون</button> : null}
            {detail && canPublish ? <button type="button" onClick={() => {
              const value = window.prompt("زمان انتشار با قالب ISO یا تاریخ قابل‌خواندن مرورگر:");
              if (!value) return;
              const date = new Date(value);
              if (!Number.isFinite(date.getTime())) {
                setError("زمان انتشار معتبر نیست.");
                return;
              }
              void action("schedule", { publishAt: date.toISOString() });
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
            <input accept=".zip,application/zip" name="package" required type="file" />
            <select defaultValue={canPublish ? "auto_schedule" : "review_first"} name="mode"><option disabled={!canPublish} value="auto_schedule">زمان‌بندی خودکار</option><option value="review_first">ابتدا بازبینی</option></select>
            <button type="submit">اعتبارسنجی و ورود</button>
          </form>
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
