"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminSessionPayload } from "@/lib/admin/admin-types";
import type { WikiImageArticleRow } from "@/lib/wiki/wiki-image-types";
import styles from "./admin-console.module.css";

type Props = { token: string; session: AdminSessionPayload; compactStableId?: string };
type PipelineState = {
  styleSnapshotVersion: string;
  articles: WikiImageArticleRow[];
  reusableAssets: Array<{ id: string; originalName: string; alt: string; variantCount: number }>;
  batches: Array<{ id: string; batchNumber: string; status: string; articleCount: number; attemptCount: number; createdAt: string }>;
};
type ImportPreview = {
  planToken: string;
  previews: Array<{ stableId: string; slug: string; title: string; status: string; bytes?: number; altFaDraft?: string; warnings: string[] }>;
};

function formatBytes(value: number) {
  return value < 1024 ? `${value.toLocaleString("fa-IR")} B` : `${(value / 1024).toFixed(1)} KB`;
}

function stateLabel(value: string) {
  return ({ NO_IMAGE: "بدون تصویر", DRAFT_IMAGE: "پیش‌نویس تصویر", READY: "آماده", NEEDS_RETRY: "نیازمند تلاش دوباره", REJECTED: "ردشده" } as Record<string, string>)[value] ?? value;
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string; state?: PipelineState; preview?: ImportPreview; history?: unknown[] } | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
  return payload;
}

export function WikiImagePipelinePanel({ token, session, compactStableId }: Props) {
  const [state, setState] = useState<PipelineState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [assetChoice, setAssetChoice] = useState("");
  const canMedia = session.capabilities.includes("wiki.media.write");

  const load = useCallback(async () => {
    const query = compactStableId ? `?stableId=${encodeURIComponent(compactStableId)}&historyFor=${encodeURIComponent(compactStableId)}` : "";
    const response = await fetch(`/api/admin/wiki/image-pipeline${query}`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
    const payload = await readJson(response);
    setState(payload.state ?? null);
    setHistory(Array.isArray(payload.history) ? payload.history as Array<Record<string, unknown>> : []);
  }, [compactStableId, token]);

  useEffect(() => {
    let active = true;
    const query = compactStableId ? `?stableId=${encodeURIComponent(compactStableId)}&historyFor=${encodeURIComponent(compactStableId)}` : "";
    void fetch(`/api/admin/wiki/image-pipeline${query}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    })
      .then(readJson)
      .then((payload) => {
        if (!active) return;
        setState(payload.state ?? null);
        setHistory(Array.isArray(payload.history) ? payload.history as Array<Record<string, unknown>> : []);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "خواندن تصاویر ویکی ناموفق بود.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [compactStableId, token]);

  const sourceRows = state?.articles ?? [];
  const rows = compactStableId
    ? sourceRows
    : statusFilter === "all"
      ? sourceRows
      : sourceRows.filter((row) => row.state === statusFilter);

  async function exportBatch() {
    if (!canMedia || selected.length > 5) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ action: "export", stableIds: selected }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "Halleus-Wiki-Image-Batch.zip";
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = href; link.download = filename; link.click(); URL.revokeObjectURL(href);
      setMessage("بستهٔ حداکثر ۵ مقاله آماده شد؛ هر تصویر باید مستقل تولید شود.");
      setSelected([]);
      await load();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "ساخت بستهٔ تصویر ناموفق بود.");
    } finally { setLoading(false); }
  }

  async function chooseResult(file: File | null) {
    setImportPreview(null); setResultFile(null); setError(""); setMessage("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip") || file.size > 400_000) {
      setError("بستهٔ نتیجه باید ZIP و حداکثر ۴۰۰ کیلوبایت باشد."); return;
    }
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (signature[0] !== 0x50 || signature[1] !== 0x4b) { setError("امضای فایل ZIP معتبر نیست."); return; }
    setResultFile(file);
  }

  async function previewResult() {
    if (!resultFile) return;
    setLoading(true); setError("");
    try {
      const form = new FormData(); form.set("action", "preview_import"); form.set("package", resultFile);
      const response = await fetch("/api/admin/wiki/image-pipeline", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
      const payload = await readJson(response);
      setImportPreview(payload.preview ?? null);
      setMessage("پیش‌نمایش اعتبارسنجی آماده است؛ هنوز هیچ تصویر به مقاله وصل نشده.");
    } catch (previewError) { setError(previewError instanceof Error ? previewError.message : "اعتبارسنجی بسته ناموفق بود."); }
    finally { setLoading(false); }
  }

  async function applyResult() {
    if (!resultFile || !importPreview) return;
    const reason = window.prompt("دلیل ورود این بستهٔ تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true); setError("");
    try {
      const form = new FormData(); form.set("action", "apply_import"); form.set("package", resultFile);
      form.set("planToken", importPreview.planToken); form.set("reason", reason.trim());
      const response = await fetch("/api/admin/wiki/image-pipeline", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
      await readJson(response);
      setMessage("تصاویر معتبر فقط به حالت پیش‌نویس تصویر وارد شدند؛ برای نمایش عمومی باید جداگانه تأیید شوند.");
      setImportPreview(null); setResultFile(null); await load();
    } catch (applyError) { setError(applyError instanceof Error ? applyError.message : "ورود بسته ناموفق بود."); }
    finally { setLoading(false); }
  }

  async function selectAsset(stableId: string) {
    if (!assetChoice || !canMedia) return;
    const reason = window.prompt("دلیل انتخاب این asset را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ action: "select_asset", stableId, assetId: assetChoice, reason: reason.trim() }),
      });
      await readJson(response); setMessage("Asset به حالت پیش‌نویس تصویر متصل شد."); await load();
    } catch (assetError) { setError(assetError instanceof Error ? assetError.message : "انتخاب asset ناموفق بود."); }
    finally { setLoading(false); }
  }

  async function directUpload(stableId: string, file: File | null) {
    if (!file || !canMedia) return;
    const altFa = window.prompt("متن جایگزین فارسی تصویر:");
    if (!altFa?.trim()) return;
    const reason = window.prompt("دلیل آپلود مستقیم تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    setLoading(true); setError("");
    try {
      const form = new FormData();
      form.set("action", "direct_upload"); form.set("file", file); form.set("stableId", stableId);
      form.set("altFa", altFa.trim()); form.set("reason", reason.trim());
      const response = await fetch("/api/admin/wiki/image-pipeline", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
      await readJson(response); setMessage("تصویر مستقیم به WebPهای استاندارد تبدیل و فقط به حالت پیش‌نویس وارد شد."); await load();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "آپلود مستقیم تصویر ناموفق بود."); }
    finally { setLoading(false); }
  }

  async function mutate(row: WikiImageArticleRow, action: "metadata" | "approve" | "reject" | "retry" | "detach") {
    if (!row.revision) return;
    const reason = window.prompt("دلیل این تغییر تصویر را ثبت کن:");
    if (!reason?.trim()) return;
    let altFa = row.altFa ?? "";
    let caption = row.caption ?? "";
    let focalX = row.focalX ?? 0.5;
    let focalY = row.focalY ?? 0.5;
    if (action === "metadata") {
      const nextAlt = window.prompt("متن جایگزین فارسی:", altFa); if (nextAlt === null) return; altFa = nextAlt;
      const nextCaption = window.prompt("کپشن اختیاری:", caption); if (nextCaption === null) return; caption = nextCaption;
      const focal = window.prompt("نقطهٔ کانونی x,y بین 0 و 1:", `${focalX},${focalY}`); if (focal === null) return;
      const [x, y] = focal.split(",").map(Number); if (!Number.isFinite(x) || !Number.isFinite(y)) { setError("نقطهٔ کانونی معتبر نیست."); return; }
      focalX = x; focalY = y;
    }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/wiki/image-pipeline", {
        method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ action, stableId: row.stableId, expectedRevision: row.revision, reason: reason.trim(), altFa, caption, focalX, focalY }),
      });
      await readJson(response); setMessage("وضعیت تصویر به‌روزرسانی شد."); await load();
    } catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "تغییر تصویر ناموفق بود."); }
    finally { setLoading(false); }
  }

  if (loading && !state) return <div className={styles.panelSkeleton}>در حال خواندن خط تصاویر ویکی…</div>;

  if (compactStableId) {
    const row = rows[0];
    return (
      <section className={styles.wikiEditorGroup} data-wiki-image-editor="true">
        <h4>تصویر مقاله</h4>
        {!row || row.state === "NO_IMAGE" ? <p>این مقاله تصویر اختصاصی ندارد؛ انتشار بدون تصویر معتبر است.</p> : (
          <>
            {row.imageUrl ? (<>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={row.altFa ?? ""} loading="lazy" src={row.imageUrl} width="480" height="270" />
            </>) : null}
            <p>{stateLabel(row.state)} · {row.altState === "reviewed" ? "alt بازبینی‌شده" : "alt نیازمند بازبینی"}</p>
            <div className={styles.wikiActions}>
              <button type="button" onClick={() => void mutate(row, "metadata")}>ویرایش alt / focal</button>
              {row.state !== "READY" ? <button type="button" onClick={() => void mutate(row, "approve")}>تأیید برای نمایش عمومی</button> : null}
              <button type="button" onClick={() => void mutate(row, "retry")}>نیازمند تلاش دوباره</button>
              <button type="button" onClick={() => void mutate(row, "detach")}>جداکردن تصویر</button>
            </div>
          </>
        )}
        {canMedia ? <>
          <label>انتخاب asset آماده<select value={assetChoice} onChange={(event) => setAssetChoice(event.target.value)}><option value="">انتخاب…</option>{(state?.reusableAssets ?? []).map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName}</option>)}</select></label>
          <button type="button" disabled={!assetChoice} onClick={() => void selectAsset(compactStableId)}>اتصال asset به پیش‌نویس</button>
          <label>آپلود مستقیم تصویر<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void directUpload(compactStableId, event.target.files?.[0] ?? null)} /></label>
        </> : null}
        {history.length ? <details><summary>تاریخچهٔ تصویر</summary>{history.slice(0, 10).map((entry, index) => <p key={String(entry.id ?? index)}>{String(entry.action ?? "")} · rev {String(entry.revision ?? "")} · {String(entry.reason ?? "")}</p>)}</details> : null}
        {error ? <p className={styles.inlineError}>{error}</p> : null}
      </section>
    );
  }

  return (
    <section className={styles.wikiPanel} data-wiki-image-pipeline="true">
      <div className={styles.wikiPanelHeader}>
        <div><h3>خط تولید تصویر ویکی</h3><p>تصویر مستقل از متن و لینک مقاله؛ نبود تصویر مانع انتشار نیست.</p></div>
        <span>{state?.styleSnapshotVersion}</span>
      </div>
      {message ? <p>{message}</p> : null}{error ? <p className={styles.inlineError}>{error}</p> : null}
      <div className={styles.wikiSelectionActions}>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">همه وضعیت‌ها</option><option value="NO_IMAGE">بدون تصویر</option><option value="DRAFT_IMAGE">پیش‌نویس</option><option value="READY">آماده</option><option value="NEEDS_RETRY">نیازمند تلاش دوباره</option><option value="REJECTED">ردشده</option>
        </select>
        {canMedia ? <button type="button" disabled={loading || selected.length > 5} onClick={() => void exportBatch()}>خروجی بستهٔ AI ({selected.length ? selected.length.toLocaleString("fa-IR") : "خودکار"})</button> : null}
      </div>
      {canMedia ? (
        <div className={styles.wikiInlineForm}>
          <input type="file" accept=".zip,application/zip" onChange={(event) => void chooseResult(event.target.files?.[0] ?? null)} />
          <button type="button" disabled={!resultFile || loading} onClick={() => void previewResult()}>اعتبارسنجی نتیجه</button>
          <button type="button" disabled={!importPreview || loading} onClick={() => void applyResult()}>ورود به حالت پیش‌نویس</button>
        </div>
      ) : null}
      {importPreview ? <div>{importPreview.previews.map((item) => <p key={item.stableId}>{item.title} · {item.status}{item.bytes ? ` · ${formatBytes(item.bytes)}` : ""}</p>)}</div> : null}
      <div className={styles.mediaGrid}>
        {rows.map((row) => (
          <article key={row.stableId}>
            {row.imageUrl ? (<>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={row.altFa ?? ""} loading="lazy" src={row.imageUrl} width="480" height="270" />
            </>) : null}
            <strong>{row.title}</strong><small>{row.slug} · {stateLabel(row.state)}</small>
            {row.variants.length ? <small>{row.variants.map((variant) => `${variant.width}×${variant.height} ${formatBytes(variant.byteSize)}`).join(" · ")}</small> : null}
            {row.state !== "READY" ? <label><input type="checkbox" checked={selected.includes(row.stableId)} disabled={!canMedia || (!selected.includes(row.stableId) && selected.length >= 5)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, row.stableId] : items.filter((item) => item !== row.stableId))} /> انتخاب برای batch</label> : null}
            {row.revision && canMedia ? <div className={styles.wikiActions}>
              <button type="button" onClick={() => void mutate(row, "metadata")}>ویرایش</button>
              {row.state !== "READY" ? <button type="button" onClick={() => void mutate(row, "approve")}>تأیید</button> : null}
              <button type="button" onClick={() => void mutate(row, "reject")}>رد</button>
              <button type="button" onClick={() => void mutate(row, "retry")}>تلاش دوباره</button>
              <button type="button" onClick={() => void mutate(row, "detach")}>جداکردن</button>
            </div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}