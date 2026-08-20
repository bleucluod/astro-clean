"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminSessionPayload } from "@/lib/admin/admin-types";
import type {
  WikiImageArticleRow,
  WikiImageBatchSummary,
  WikiImageLibraryAsset,
} from "@/lib/wiki/wiki-image-types";
import shellStyles from "./admin-console.module.css";
import styles from "./wiki-image-pipeline.module.css";

type Props = {
  token: string;
  session: AdminSessionPayload;
  compactStableId?: string;
};

type PipelineState = {
  styleSnapshotVersion: string;
  articles: WikiImageArticleRow[];
  reusableAssets: Array<{
    id: string;
    originalName: string;
    alt: string;
    variantCount: number;
  }>;
  libraryAssets: WikiImageLibraryAsset[];
  batches: WikiImageBatchSummary[];
};

type ImportPreview = {
  planToken: string;
  previews: Array<{
    stableId: string;
    slug: string;
    title: string;
    status: string;
    bytes?: number;
    altFaDraft?: string;
    warnings: string[];
  }>;
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  state?: PipelineState;
  preview?: ImportPreview;
  history?: unknown[];
  stage?: string;
  correlationId?: string;
  retrySafe?: boolean;
};

type PanelError = {
  message: string;
  stage?: string;
  correlationId?: string;
  retrySafe?: boolean;
};

type TabKey = "articles" | "library" | "batches";
type SortKey = "publish" | "priority" | "updated" | "title";

type PublishFilter = "all" | "published" | "scheduled" | "draft" | "archived";
type AssetFilter = "all" | "used" | "unused" | "incomplete" | "archived";

const MAX_BATCH = 5;

function formatBytes(value: number) {
  return value < 1024
    ? `${value.toLocaleString("fa-IR")} B`
    : `${(value / 1024).toFixed(1)} KB`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function imageStateLabel(value: string) {
  return (
    {
      NO_IMAGE: "بدون تصویر",
      DRAFT_IMAGE: "پیش‌نویس تصویر",
      READY: "آماده",
      NEEDS_RETRY: "نیازمند تلاش دوباره",
      REJECTED: "ردشده",
    } as Record<string, string>
  )[value] ?? value;
}

function articleStatusLabel(value: string) {
  return (
    {
      published: "منتشرشده",
      scheduled: "زمان‌بندی‌شده",
      draft: "پیش‌نویس",
      archived: "آرشیوشده",
    } as Record<string, string>
  )[value] ?? value;
}

function batchStatusLabel(value: string) {
  return (
    {
      exported: "خروجی گرفته شده",
      returned: "نتیجه برگشته",
      completed: "تکمیل‌شده",
      needs_retry: "نیازمند تلاش دوباره",
    } as Record<string, string>
  )[value] ?? value;
}

class PipelineRequestError extends Error {
  readonly stage?: string;
  readonly correlationId?: string;
  readonly retrySafe?: boolean;

  constructor(payload: ApiPayload | null, fallback: string) {
    super(payload?.error ?? fallback);
    this.name = "PipelineRequestError";
    this.stage = payload?.stage;
    this.correlationId = payload?.correlationId;
    this.retrySafe = payload?.retrySafe;
  }
}

async function readJson(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiPayload | null;
  if (!response.ok || !payload?.ok) {
    throw new PipelineRequestError(payload, `HTTP ${response.status}`);
  }
  return payload;
}

function normalizeError(error: unknown, fallback: string): PanelError {
  if (error instanceof PipelineRequestError) {
    return {
      message: error.message,
      stage: error.stage,
      correlationId: error.correlationId,
      retrySafe: error.retrySafe,
    };
  }
  return {
    message: error instanceof Error ? error.message : fallback,
  };
}

function matchesSearch(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = values.filter(Boolean).join(" ").toLocaleLowerCase("fa-IR");
  return haystack.includes(query.toLocaleLowerCase("fa-IR"));
}

function isActionState(row: WikiImageArticleRow) {
  return row.state === "NO_IMAGE" || row.state === "DRAFT_IMAGE" || row.state === "NEEDS_RETRY";
}

function imageStateClass(value: string) {
  if (value === "READY") return styles.statusReady;
  if (value === "DRAFT_IMAGE") return styles.statusDraft;
  if (value === "NEEDS_RETRY" || value === "REJECTED") return styles.statusDanger;
  return styles.statusMuted;
}

function ErrorBanner({ error }: { error: PanelError }) {
  return (
    <div className={styles.errorBanner} role="alert">
      <strong>{error.message}</strong>
      <div className={styles.errorMeta}>
        {error.stage ? <span>مرحله: {error.stage}</span> : null}
        {error.correlationId ? <span>شناسه پیگیری: {error.correlationId}</span> : null}
        {typeof error.retrySafe === "boolean" ? (
          <span>{error.retrySafe ? "تلاش دوباره امن است." : "قبل از تلاش دوباره، تاریخچه Batch را بررسی کن."}</span>
        ) : null}
      </div>
    </div>
  );
}

export function WikiImagePipelinePanel({ token, session, compactStableId }: Props) {
  const [state, setState] = useState<PipelineState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("articles");
  const [statusFilter, setStatusFilter] = useState("NO_IMAGE");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("publish");
  const [search, setSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<PanelError | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [assetChoice, setAssetChoice] = useState("");
  const [assetTarget, setAssetTarget] = useState<Record<string, string>>({});
  const [assetAltDrafts, setAssetAltDrafts] = useState<Record<string, string>>({});
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  const canMedia = session.capabilities.includes("wiki.media.write");

  const load = useCallback(async () => {
    const query = compactStableId
      ? `?stableId=${encodeURIComponent(compactStableId)}&historyFor=${encodeURIComponent(compactStableId)}`
      : "";
    const response = await fetch(`/api/admin/wiki/image-pipeline${query}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    });
    const payload = await readJson(response);
    setState(payload.state ?? null);
    setHistory(Array.isArray(payload.history) ? (payload.history as Array<Record<string, unknown>>) : []);
  }, [compactStableId, token]);

  useEffect(() => {
    let active = true;
    const query = compactStableId
      ? `?stableId=${encodeURIComponent(compactStableId)}&historyFor=${encodeURIComponent(compactStableId)}`
      : "";
    void fetch(`/api/admin/wiki/image-pipeline${query}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    })
      .then(readJson)
      .then((payload) => {
        if (!active) return;
        setState(payload.state ?? null);
        setHistory(Array.isArray(payload.history) ? (payload.history as Array<Record<string, unknown>>) : []);
      })
      .catch((loadError) => {
        if (active) setError(normalizeError(loadError, "خواندن تصاویر ویکی ناموفق بود."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [compactStableId, token]);

  const sourceRows = useMemo(() => state?.articles ?? [], [state?.articles]);

  const categories = useMemo(() => {
    const byId = new Map<string, string>();
    sourceRows.forEach((row) => {
      if (row.categoryId) byId.set(row.categoryId, row.categoryLabel || row.categoryId);
    });
    return [...byId.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fa"));
  }, [sourceRows]);

  const counters = useMemo(() => {
    const counts = {
      NO_IMAGE: 0,
      DRAFT_IMAGE: 0,
      READY: 0,
      NEEDS_RETRY: 0,
      REJECTED: 0,
    };
    sourceRows.forEach((row) => {
      if (row.state in counts) counts[row.state as keyof typeof counts] += 1;
    });
    return counts;
  }, [sourceRows]);

  const rows = useMemo(() => {
    const filtered = sourceRows.filter((row) => {
      if (compactStableId && row.stableId !== compactStableId) return false;
      if (statusFilter === "action" && !isActionState(row)) return false;
      if (statusFilter !== "all" && statusFilter !== "action" && row.state !== statusFilter) return false;
      if (categoryFilter !== "all" && row.categoryId !== categoryFilter) return false;
      if (publishFilter !== "all" && row.status !== publishFilter) return false;
      return matchesSearch([row.title, row.slug, row.stableId, row.categoryLabel], search.trim());
    });

    return filtered.sort((left, right) => {
      if (sortKey === "title") return left.title.localeCompare(right.title, "fa");
      if (sortKey === "priority") return right.publicationPriority - left.publicationPriority;
      if (sortKey === "updated") {
        return (Date.parse(right.updatedAt ?? "") || 0) - (Date.parse(left.updatedAt ?? "") || 0);
      }
      const leftTime = left.publishAt ? Date.parse(left.publishAt) : Number.POSITIVE_INFINITY;
      const rightTime = right.publishAt ? Date.parse(right.publishAt) : Number.POSITIVE_INFINITY;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return right.publicationPriority - left.publicationPriority;
    });
  }, [categoryFilter, compactStableId, publishFilter, search, sortKey, sourceRows, statusFilter]);

  const selectableRows = rows.filter((row) => row.state !== "READY");
  const filteredAssets = useMemo(() => {
    const assets = state?.libraryAssets ?? [];
    return assets.filter((asset) => {
      if (assetFilter === "used" && (asset.usageCount < 1 || asset.deletedAt)) return false;
      if (assetFilter === "unused" && (asset.usageCount > 0 || asset.deletedAt)) return false;
      if (assetFilter === "incomplete" && (asset.variantCount === 3 || asset.deletedAt)) return false;
      if (assetFilter === "archived" && !asset.deletedAt) return false;
      if (assetFilter === "all" && asset.deletedAt) return false;
      return matchesSearch([asset.originalName, asset.alt, asset.storagePath, ...asset.usedBy.map((item) => item.title)], assetSearch.trim());
    });
  }, [assetFilter, assetSearch, state?.libraryAssets]);

  function selectNextBatch() {
    const next = selectableRows
      .map((row) => row.stableId)
      .filter((stableId) => !selected.includes(stableId))
      .slice(0, Math.max(0, MAX_BATCH - selected.length));
    setSelected((current) => [...current, ...next].slice(0, MAX_BATCH));
  }

  function selectFilteredBatch() {
    setSelected(selectableRows.slice(0, MAX_BATCH).map((row) => row.stableId));
  }

  async function exportBatch() {
    if (!canMedia || selected.length < 1 || selected.length > MAX_BATCH) return;
    setLoading(true);
    setError(null);
    setMessage("");
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "export", stableIds: selected }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiPayload | null;
        throw new PipelineRequestError(payload, `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "Halleus-Wiki-Image-Batch.zip";
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(href);
      setMessage("بسته AI آماده شد. هر تصویر باید مستقل تولید شود.");
      setSelected([]);
      await load();
    } catch (exportError) {
      setError(normalizeError(exportError, "ساخت بسته تصویر ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function chooseResult(file: File | null) {
    setImportPreview(null);
    setResultFile(null);
    setError(null);
    setMessage("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip") || file.size > 400_000) {
      setError({ message: "بسته نتیجه باید ZIP و حداکثر ۴۰۰ کیلوبایت باشد." });
      return;
    }
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
      setError({ message: "امضای فایل ZIP معتبر نیست." });
      return;
    }
    setResultFile(file);
  }

  async function previewResult() {
    if (!resultFile) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("action", "preview_import");
      form.set("package", resultFile);
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = await readJson(response);
      setImportPreview(payload.preview ?? null);
      setMessage("اعتبارسنجی کامل شد؛ هنوز هیچ تصویر به مقاله وصل نشده است.");
    } catch (previewError) {
      setError(normalizeError(previewError, "اعتبارسنجی بسته ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function applyResult() {
    if (!resultFile || !importPreview) return;
    const reason = window.prompt("دلیل ورود این بسته تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("action", "apply_import");
      form.set("package", resultFile);
      form.set("planToken", importPreview.planToken);
      form.set("reason", reason.trim());
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      await readJson(response);
      setMessage("تصاویر معتبر وارد حالت پیش‌نویس شدند و هنوز نمایش عمومی ندارند.");
      setImportPreview(null);
      setResultFile(null);
      await load();
    } catch (applyError) {
      setError(normalizeError(applyError, "ورود بسته ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function selectAsset(stableId: string, selectedAssetId = assetChoice) {
    if (!selectedAssetId || !canMedia) return;
    const reason = window.prompt("دلیل اتصال این تصویر به مقاله را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "select_asset",
          stableId,
          assetId: selectedAssetId,
          reason: reason.trim(),
        }),
      });
      await readJson(response);
      setMessage("تصویر به حالت پیش‌نویس مقاله متصل شد.");
      await load();
    } catch (assetError) {
      setError(normalizeError(assetError, "انتخاب تصویر ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function directUpload(stableId: string, file: File | null) {
    if (!file || !canMedia) return;
    const altFa = window.prompt("متن جایگزین فارسی تصویر:");
    if (!altFa?.trim()) return;
    const reason = window.prompt("دلیل آپلود مستقیم تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("action", "direct_upload");
      form.set("file", file);
      form.set("stableId", stableId);
      form.set("altFa", altFa.trim());
      form.set("reason", reason.trim());
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      await readJson(response);
      setMessage("تصویر مستقیم به WebPهای استاندارد تبدیل و وارد پیش‌نویس شد.");
      await load();
    } catch (uploadError) {
      setError(normalizeError(uploadError, "آپلود مستقیم تصویر ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function mutate(
    row: WikiImageArticleRow,
    action: "metadata" | "approve" | "reject" | "retry" | "detach",
  ) {
    if (!row.revision) return;
    const reason = window.prompt("دلیل این تغییر تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    let altFa = row.altFa ?? "";
    let caption = row.caption ?? "";
    let focalX = row.focalX ?? 0.5;
    let focalY = row.focalY ?? 0.5;
    if (action === "metadata") {
      const nextAlt = window.prompt("متن جایگزین فارسی:", altFa);
      if (nextAlt === null) return;
      altFa = nextAlt;
      const nextCaption = window.prompt("کپشن اختیاری:", caption);
      if (nextCaption === null) return;
      caption = nextCaption;
      const focal = window.prompt("نقطه کانونی x,y بین 0 و 1:", `${focalX},${focalY}`);
      if (focal === null) return;
      const [x, y] = focal.split(",").map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        setError({ message: "نقطه کانونی معتبر نیست." });
        return;
      }
      focalX = x;
      focalY = y;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action,
          stableId: row.stableId,
          expectedRevision: row.revision,
          reason: reason.trim(),
          altFa,
          caption,
          focalX,
          focalY,
        }),
      });
      await readJson(response);
      setMessage("وضعیت تصویر به‌روزرسانی شد.");
      await load();
    } catch (mutationError) {
      setError(normalizeError(mutationError, "تغییر تصویر ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function updateAssetMetadata(asset: WikiImageLibraryAsset) {
    if (!canMedia || asset.deletedAt) return;
    const altFa = (assetAltDrafts[asset.id] ?? asset.alt).trim();
    if (!altFa) {
      setError({ message: "alt فارسی تصویر نمی‌تواند خالی باشد." });
      return;
    }
    const reason = window.prompt("دلیل ویرایش metadata تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "asset_metadata",
          assetId: asset.id,
          altFa,
          reason: reason.trim(),
        }),
      });
      await readJson(response);
      setMessage("metadata تصویر به‌روزرسانی شد.");
      await load();
    } catch (assetError) {
      setError(normalizeError(assetError, "ویرایش metadata تصویر ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function archiveAsset(asset: WikiImageLibraryAsset) {
    if (!canMedia || asset.deletedAt || asset.usageCount > 0) return;
    const confirmed = window.confirm(`تصویر «${asset.originalName}» آرشیو شود؟ فایل فیزیکی حذف نمی‌شود.`);
    if (!confirmed) return;
    const reason = window.prompt("دلیل آرشیو تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "asset_archive",
          assetId: asset.id,
          reason: reason.trim(),
        }),
      });
      await readJson(response);
      setMessage("تصویر بدون حذف فایل فیزیکی آرشیو شد.");
      setExpandedAssetId(null);
      await load();
    } catch (assetError) {
      setError(normalizeError(assetError, "آرشیو تصویر ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  if (loading && !state) {
    return <div className={shellStyles.panelSkeleton}>در حال خواندن خط تصاویر ویکی…</div>;
  }

  if (compactStableId) {
    const row = rows[0] ?? sourceRows[0];
    return (
      <section className={shellStyles.wikiEditorGroup} data-wiki-image-editor="true">
        <h4>تصویر مقاله</h4>
        {!row || row.state === "NO_IMAGE" ? (
          <p>این مقاله تصویر اختصاصی ندارد؛ انتشار بدون تصویر معتبر است.</p>
        ) : (
          <>
            {row.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={row.altFa ?? ""} loading="lazy" src={row.imageUrl} width="480" height="270" />
            ) : null}
            <p>
              {imageStateLabel(row.state)} · {row.altState === "reviewed" ? "alt بازبینی‌شده" : "alt نیازمند بازبینی"}
            </p>
            <div className={shellStyles.wikiActions}>
              <button type="button" onClick={() => void mutate(row, "metadata")}>ویرایش alt / focal</button>
              {row.state !== "READY" ? (
                <button type="button" onClick={() => void mutate(row, "approve")}>تأیید برای نمایش عمومی</button>
              ) : null}
              <button type="button" onClick={() => void mutate(row, "retry")}>نیازمند تلاش دوباره</button>
              <button type="button" onClick={() => void mutate(row, "detach")}>جداکردن تصویر</button>
            </div>
          </>
        )}
        {canMedia ? (
          <>
            <label>
              انتخاب asset آماده
              <select value={assetChoice} onChange={(event) => setAssetChoice(event.target.value)}>
                <option value="">انتخاب…</option>
                {(state?.reusableAssets ?? []).map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.originalName}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={!assetChoice} onClick={() => void selectAsset(compactStableId)}>
              اتصال asset به پیش‌نویس
            </button>
            <label>
              آپلود مستقیم تصویر
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void directUpload(compactStableId, event.target.files?.[0] ?? null)}
              />
            </label>
          </>
        ) : null}
        {history.length ? (
          <details>
            <summary>تاریخچهٔ تصویر</summary>
            {history.slice(0, 10).map((entry, index) => (
              <p key={String(entry.id ?? index)}>
                {String(entry.action ?? "")} · rev {String(entry.revision ?? "")} · {String(entry.reason ?? "")}
              </p>
            ))}
          </details>
        ) : null}
        {error ? <ErrorBanner error={error} /> : null}
      </section>
    );
  }

  const attachableArticles = sourceRows.filter((row) => row.state !== "READY");

  return (
    <section className={styles.pipeline} data-wiki-image-pipeline="true" data-halleus-wiki-image-operations-r1="true">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Wiki media operations</p>
          <h3>خط تولید تصویر ویکی</h3>
          <p className={styles.subtle}>تولید، بازبینی و مدیریت تصویر مستقل از متن مقاله و لینک‌های داخلی.</p>
        </div>
        <span className={styles.snapshot}>{state?.styleSnapshotVersion}</span>
      </header>

      <div className={styles.counterStrip} aria-label="خلاصه وضعیت تصاویر">
        <button type="button" onClick={() => { setActiveTab("articles"); setStatusFilter("NO_IMAGE"); }}>
          <strong>{counters.NO_IMAGE.toLocaleString("fa-IR")}</strong><span>بدون تصویر</span>
        </button>
        <button type="button" onClick={() => { setActiveTab("articles"); setStatusFilter("DRAFT_IMAGE"); }}>
          <strong>{counters.DRAFT_IMAGE.toLocaleString("fa-IR")}</strong><span>پیش‌نویس</span>
        </button>
        <button type="button" onClick={() => { setActiveTab("articles"); setStatusFilter("NEEDS_RETRY"); }}>
          <strong>{counters.NEEDS_RETRY.toLocaleString("fa-IR")}</strong><span>نیازمند اقدام</span>
        </button>
        <button type="button" onClick={() => { setActiveTab("articles"); setStatusFilter("READY"); }}>
          <strong>{counters.READY.toLocaleString("fa-IR")}</strong><span>آماده</span>
        </button>
      </div>

      <nav className={styles.tabs} aria-label="بخش‌های مدیریت تصویر">
        <button className={activeTab === "articles" ? styles.activeTab : ""} type="button" onClick={() => setActiveTab("articles")}>مقاله‌ها</button>
        <button className={activeTab === "library" ? styles.activeTab : ""} type="button" onClick={() => setActiveTab("library")}>کتابخانه تصاویر</button>
        <button className={activeTab === "batches" ? styles.activeTab : ""} type="button" onClick={() => setActiveTab("batches")}>تاریخچه Batchها</button>
      </nav>

      {message ? <div className={styles.successBanner}>{message}</div> : null}
      {error ? <ErrorBanner error={error} /> : null}

      {activeTab === "articles" ? (
        <div className={styles.tabPanel}>
          <div className={styles.toolbar}>
            <label className={styles.searchField}>
              <span>جستجو</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="عنوان، slug یا دسته…" />
            </label>
            <label>
              <span>دسته‌بندی</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">همه دسته‌ها</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </label>
            <label>
              <span>وضعیت تصویر</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="action">نیازمند اقدام من</option>
                <option value="NO_IMAGE">بدون تصویر</option>
                <option value="DRAFT_IMAGE">پیش‌نویس</option>
                <option value="NEEDS_RETRY">نیازمند تلاش دوباره</option>
                <option value="REJECTED">ردشده</option>
                <option value="READY">آماده</option>
                <option value="all">همه وضعیت‌ها</option>
              </select>
            </label>
            <label>
              <span>انتشار</span>
              <select value={publishFilter} onChange={(event) => setPublishFilter(event.target.value as PublishFilter)}>
                <option value="all">همه</option>
                <option value="published">منتشرشده</option>
                <option value="scheduled">زمان‌بندی‌شده</option>
                <option value="draft">پیش‌نویس</option>
                <option value="archived">آرشیوشده</option>
              </select>
            </label>
            <label>
              <span>مرتب‌سازی</span>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="publish">نزدیک‌ترین زمان انتشار</option>
                <option value="priority">اولویت انتشار</option>
                <option value="updated">آخرین تغییر</option>
                <option value="title">عنوان</option>
              </select>
            </label>
          </div>

          <div className={styles.bulkBar} data-wiki-image-bulk-selection="true">
            <div>
              <strong>{selected.length.toLocaleString("fa-IR")} از {MAX_BATCH.toLocaleString("fa-IR")} انتخاب شده</strong>
              <span>{rows.length.toLocaleString("fa-IR")} نتیجه در فیلتر فعلی</span>
            </div>
            <div className={styles.bulkActions}>
              <button type="button" onClick={selectFilteredBatch} disabled={!selectableRows.length}>انتخاب ۵ مورد اول این فیلتر</button>
              <button type="button" onClick={selectNextBatch} disabled={selected.length >= MAX_BATCH || !selectableRows.length}>انتخاب موارد بعدی</button>
              <button type="button" onClick={() => setSelected([])} disabled={!selected.length}>لغو انتخاب</button>
              {canMedia ? (
                <button className={styles.primaryButton} type="button" disabled={loading || selected.length < 1 || selected.length > MAX_BATCH} onClick={() => void exportBatch()}>
                  خروجی بسته AI ({selected.length.toLocaleString("fa-IR")})
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.columnHeader} aria-hidden="true">
            <span>انتخاب</span><span>مقاله</span><span>انتشار</span><span>تصویر</span><span>اقدام</span>
          </div>

          <div className={styles.rowList}>
            {rows.map((row) => {
              const checked = selected.includes(row.stableId);
              const selectionDisabled = !canMedia || row.state === "READY" || (!checked && selected.length >= MAX_BATCH);
              return (
                <article className={styles.articleRow} key={row.stableId}>
                  <div className={styles.checkCell}>
                    {row.state !== "READY" ? (
                      <input
                        aria-label={`انتخاب ${row.title}`}
                        type="checkbox"
                        checked={checked}
                        disabled={selectionDisabled}
                        onChange={(event) => setSelected((items) => event.target.checked ? [...items, row.stableId].slice(0, MAX_BATCH) : items.filter((item) => item !== row.stableId))}
                      />
                    ) : <span>—</span>}
                  </div>
                  <div className={styles.articleIdentity}>
                    <div className={styles.thumb}>
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" loading="lazy" src={row.imageUrl} width="96" height="54" />
                      ) : <span>بدون تصویر</span>}
                    </div>
                    <div>
                      <strong>{row.title}</strong>
                      <small>{row.categoryLabel || row.categoryId} · /{row.slug}</small>
                    </div>
                  </div>
                  <div className={styles.publishCell}>
                    <span className={styles.statusPill}>{articleStatusLabel(row.status)}</span>
                    <small>{row.publishAt ? formatDateTime(row.publishAt) : `اولویت ${row.publicationPriority.toLocaleString("fa-IR")}`}</small>
                  </div>
                  <div className={styles.imageCell}>
                    <span className={`${styles.statusPill} ${imageStateClass(row.state)}`}>{imageStateLabel(row.state)}</span>
                    <small>{row.altState === "reviewed" ? "alt بازبینی‌شده" : row.altFa ? "alt پیش‌نویس" : "بدون alt"}</small>
                  </div>
                  <div className={styles.rowActions}>
                    {row.revision && row.state !== "READY" && canMedia ? <button type="button" onClick={() => void mutate(row, "approve")}>تأیید</button> : null}
                    {canMedia ? (
                      <label className={styles.uploadButton}>
                        آپلود
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void directUpload(row.stableId, event.target.files?.[0] ?? null)} />
                      </label>
                    ) : null}
                    {row.revision && canMedia ? (
                      <details className={styles.moreMenu}>
                        <summary>بیشتر</summary>
                        <div>
                          <button type="button" onClick={() => void mutate(row, "metadata")}>ویرایش metadata</button>
                          <button type="button" onClick={() => void mutate(row, "retry")}>تلاش دوباره</button>
                          <button type="button" onClick={() => void mutate(row, "reject")}>رد</button>
                          <button type="button" onClick={() => void mutate(row, "detach")}>جداکردن</button>
                        </div>
                      </details>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!rows.length ? <div className={styles.emptyState}>موردی با این فیلتر پیدا نشد.</div> : null}
          </div>

          <section className={styles.importPanel} data-wiki-image-import-flow="three-step">
            <div className={styles.sectionHeading}>
              <div><h4>ورود نتیجه AI</h4><p>اول ZIP را انتخاب کن، بعد اعتبارسنجی، و در نهایت ورود به پیش‌نویس.</p></div>
              <span>۳ مرحله</span>
            </div>
            <div className={styles.importSteps}>
              <label className={styles.fileDrop}>
                <strong>۱. انتخاب ZIP</strong>
                <span>{resultFile ? `${resultFile.name} · ${formatBytes(resultFile.size)}` : "فایل نتیجه تا ۴۰۰ کیلوبایت"}</span>
                <input type="file" accept=".zip,application/zip" onChange={(event) => void chooseResult(event.target.files?.[0] ?? null)} />
              </label>
              <button type="button" disabled={!resultFile || loading} onClick={() => void previewResult()}><strong>۲.</strong> اعتبارسنجی نتیجه</button>
              <button className={styles.primaryButton} type="button" disabled={!importPreview || loading} onClick={() => void applyResult()}><strong>۳.</strong> ورود به حالت پیش‌نویس</button>
            </div>
            {importPreview ? (
              <div className={styles.previewSummary}>
                <strong>نتیجه اعتبارسنجی</strong>
                <span>{importPreview.previews.filter((item) => item.status === "READY").length.toLocaleString("fa-IR")} آماده</span>
                <span>{importPreview.previews.filter((item) => item.status === "NEEDS_RETRY").length.toLocaleString("fa-IR")} نیازمند تلاش دوباره</span>
                {importPreview.previews.map((item) => (
                  <p key={item.stableId}>{item.title} · {item.status}{item.bytes ? ` · ${formatBytes(item.bytes)}` : ""}</p>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeTab === "library" ? (
        <div className={styles.tabPanel} data-wiki-image-library="true">
          <div className={styles.toolbar}>
            <label className={styles.searchField}>
              <span>جستجو در کتابخانه</span>
              <input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="نام فایل، alt یا مقاله…" />
            </label>
            <label>
              <span>فیلتر</span>
              <select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value as AssetFilter)}>
                <option value="all">تصاویر فعال</option>
                <option value="used">در حال استفاده</option>
                <option value="unused">بلااستفاده</option>
                <option value="incomplete">variant ناقص</option>
                <option value="archived">آرشیوشده</option>
              </select>
            </label>
          </div>

          <div className={styles.assetList}>
            {filteredAssets.map((asset) => {
              const expanded = expandedAssetId === asset.id;
              const target = assetTarget[asset.id] ?? "";
              return (
                <article className={`${styles.assetRow} ${asset.deletedAt ? styles.archivedRow : ""}`} key={asset.id}>
                  <div className={styles.assetSummary}>
                    <div className={styles.assetThumb}>
                      {asset.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.imageUrl} alt="" loading="lazy" width="128" height="72" />
                      ) : <span>بدون preview</span>}
                    </div>
                    <div className={styles.assetName}>
                      <strong>{asset.originalName}</strong>
                      <small>{asset.alt}</small>
                    </div>
                    <div className={styles.assetMetric}>
                      <strong>{asset.usageCount.toLocaleString("fa-IR")}</strong>
                      <span>استفاده</span>
                    </div>
                    <div className={styles.assetMetric}>
                      <strong>{asset.variantCount.toLocaleString("fa-IR")}/۳</strong>
                      <span>variant</span>
                    </div>
                    <div className={styles.assetMetric}>
                      <strong>{formatBytes(asset.byteSize)}</strong>
                      <span>{asset.mimeType}</span>
                    </div>
                    <button type="button" onClick={() => setExpandedAssetId(expanded ? null : asset.id)}>{expanded ? "بستن" : "مدیریت"}</button>
                  </div>
                  {expanded ? (
                    <div className={styles.assetDetails}>
                      <div>
                        <h5>محل استفاده</h5>
                        {asset.usedBy.length ? asset.usedBy.map((usage) => <p key={`${asset.id}-${usage.stableId}`}>{usage.title} · {imageStateLabel(usage.state)}</p>) : <p>به کاور اختصاصی مقاله‌ای وصل نیست.</p>}
                        {asset.bodyReferenceCount > 0 ? <p>{asset.bodyReferenceCount.toLocaleString("fa-IR")} ارجاع داخل متن/پیش‌نویس</p> : null}
                      </div>
                      <div>
                        <h5>variantها</h5>
                        <p>{asset.variants.length ? asset.variants.map((variant) => `${variant.width}×${variant.height} · ${formatBytes(variant.byteSize)}`).join(" | ") : "variant ثبت نشده"}</p>
                        <p className={styles.pathText}>{asset.storagePath}</p>
                      </div>
                      {!asset.deletedAt && canMedia ? (
                        <div className={styles.assetControls}>
                          <label>
                            alt تصویر
                            <input value={assetAltDrafts[asset.id] ?? asset.alt} onChange={(event) => setAssetAltDrafts((current) => ({ ...current, [asset.id]: event.target.value }))} />
                          </label>
                          <button type="button" onClick={() => void updateAssetMetadata(asset)}>ذخیره metadata</button>
                          <label>
                            اتصال به مقاله
                            <select value={target} onChange={(event) => setAssetTarget((current) => ({ ...current, [asset.id]: event.target.value }))}>
                              <option value="">انتخاب مقاله…</option>
                              {attachableArticles.map((articleRow) => <option key={articleRow.stableId} value={articleRow.stableId}>{articleRow.title}</option>)}
                            </select>
                          </label>
                          <button type="button" disabled={!target || asset.variantCount !== 3} onClick={() => void selectAsset(target, asset.id)}>اتصال به پیش‌نویس</button>
                          <button className={styles.dangerButton} type="button" disabled={asset.usageCount > 0} title={asset.usageCount > 0 ? "اول همه استفاده‌ها را جدا کن." : "فایل فیزیکی حذف نمی‌شود."} onClick={() => void archiveAsset(asset)}>آرشیو امن</button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {!filteredAssets.length ? <div className={styles.emptyState}>تصویری با این فیلتر وجود ندارد.</div> : null}
          </div>
        </div>
      ) : null}

      {activeTab === "batches" ? (
        <div className={styles.tabPanel} data-wiki-image-batch-history="true">
          <div className={styles.sectionHeading}>
            <div><h4>تاریخچه Batchها</h4><p>خروجی‌های AI، وضعیت برگشت و اعضای هر بسته.</p></div>
            <span>{(state?.batches.length ?? 0).toLocaleString("fa-IR")} مورد اخیر</span>
          </div>
          <div className={styles.batchList}>
            {(state?.batches ?? []).map((batch) => (
              <details className={styles.batchRow} key={batch.id}>
                <summary>
                  <strong>Batch #{batch.batchNumber}</strong>
                  <span className={styles.statusPill}>{batchStatusLabel(batch.status)}</span>
                  <span>{batch.articleCount.toLocaleString("fa-IR")} مقاله</span>
                  <span>{batch.attemptCount.toLocaleString("fa-IR")} تلاش</span>
                  <time>{formatDateTime(batch.createdAt)}</time>
                </summary>
                <div className={styles.batchItems}>
                  {batch.items.map((item) => (
                    <p key={item.stableId}><strong>{item.title}</strong><span>/{item.slug}</span><span>{item.status}</span><span>{item.attemptCount.toLocaleString("fa-IR")} تلاش</span></p>
                  ))}
                </div>
              </details>
            ))}
            {!(state?.batches.length) ? <div className={styles.emptyState}>هنوز Batch ثبت‌شده‌ای وجود ندارد.</div> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}