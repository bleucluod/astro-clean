"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WikiShopShowcaseCard } from "@/components/wiki/WikiShopShowcaseCard";
import {
  SHOWCASE_SURFACES, SHOWCASE_SURFACE_SLOTS, SHOWCASE_SURFACE_LABELS,
  type ShowcaseSurface, type SurfacePlacement, type SurfaceProposal, type SurfaceOffer,
} from "@/lib/shop/shop-showcase-contract";
import styles from "./shop-showcase-surfaces.module.css";

type Product = { id: string; name: string; url: string; image: string | null; orderable: boolean };
type Dashboard = {
  ok: boolean; ready: boolean; products: Product[];
  placements: SurfacePlacement[]; proposals: SurfaceProposal[];
  metrics: Array<{ showcaseId: string; impressions: number; clicks: number }>;
};
type Draft = Omit<SurfacePlacement, "id" | "expectedRevision"> &
  { id?: string; expectedRevision: number };
const empty: Dashboard = { ok: true, ready: false, products: [], placements: [],
  proposals: [], metrics: [] };
const numeral = (n: number) => n.toLocaleString("fa-IR");
function message(error: unknown) { return error instanceof Error ? error.message : "خطای ناشناخته"; }

export function ShopShowcaseSurfacesPanel({ token, canWrite, onOpenAi }: {
  token: string; canWrite: boolean; onOpenAi: () => void;
}) {
  const [data, setData] = useState<Dashboard>(empty);
  const [surface, setSurface] = useState<ShowcaseSurface>("natal");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [proposal, setProposal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/shop/showcases", {
      cache: "no-store", headers: { authorization: "Bearer " + token },
    });
    const body = await response.json() as Dashboard & { error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "ویترین‌ها دریافت نشد.");
    setData(body);
  }, [token]);
  useEffect(() => { void refresh().catch(e => setError(message(e))); }, [refresh]);

  const listings = useMemo(() => data.placements.filter(p => p.surface === surface), [data, surface]);
  const proposals = useMemo(() => data.proposals.filter(p => p.surface === surface), [data, surface]);
  const metric = useMemo(() => new Map(data.metrics.map(r => [r.showcaseId, r])), [data.metrics]);
  const currentProduct = data.products.find(p => p.id === draft?.productId);
  const preview: SurfaceOffer | null = draft && currentProduct?.image ? {
    id: draft.id ?? "00000000-0000-4000-8000-000000000000",
    surface: draft.surface, slot: draft.slot, productId: draft.productId,
    title: draft.title || currentProduct.name,
    description: draft.description || "توضیح اختصاصی این محصول در این مقصد",
    buttonLabel: draft.buttonLabel || "دیدن محصول",
    url: currentProduct.url, image: currentProduct.image, imageAlt: currentProduct.name,
  } : null;
  function selectSlot(nextSurface: ShowcaseSurface, slot: string) {
    const row = data.placements.find(p => p.surface === nextSurface && p.slot === slot);
    setSurface(nextSurface);
    setProposal(null);
    setDraft(row ? { ...row } : {
      surface: nextSurface, slot,
      productId: data.products.find(p => p.orderable)?.id ?? "",
      title: "", description: "", buttonLabel: "دیدن محصول",
      enabled: true, expectedRevision: 0,
    });
    setError(""); setNotice("");
  }
  function selectProposal(next: SurfaceProposal) {
    setSurface(next.surface);
    setProposal(next.id);
    setDraft({ surface: next.surface, slot: next.slot, productId: next.productId,
      title: next.title, description: next.description, buttonLabel: next.buttonLabel,
      enabled: true, expectedRevision: 0 });
    setError(""); setNotice("");
  }
  async function send(body: unknown) {
    const response = await fetch("/api/admin/shop/showcases", {
      method: "POST", headers: { authorization: "Bearer " + token,
        "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json() as { ok: boolean; error?: string };
    if (!response.ok || !payload.ok) throw new Error(payload.error ?? "ثبت انجام نشد.");
  }
  async function action(kind: "save" | "publish" | "reject") {
    if (!canWrite || !draft || busy) return;
    if (kind !== "save" && !proposal) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (kind === "save") await send({ action: "save", placement: draft });
      else await send({ action: kind, id: proposal, ...(kind === "publish" ? { draft } : {}) });
      setDraft(null); setProposal(null);
      await refresh();
      setNotice(kind === "save" ? "ویترین ذخیره شد." : kind === "publish" ?
        "پیشنهاد بررسی و منتشر شد." : "پیشنهاد رد شد.");
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  const slots = SHOWCASE_SURFACE_SLOTS[surface];
  return <section className={styles.root} dir="rtl" aria-label="ویترین‌های گزارش و آسمان">
    <header className={styles.header}>
      <div><small>ویترین‌های چندصفحه‌ای</small><h3>گزارش تولد، سینستری و آسمان</h3>
        <p>در هر صفحه چند ویترین مستقل با محصول و متن اختصاصی؛ اطلاعات شخصی وارد این بخش نمی‌شود.</p>
      </div>
      <button type="button" onClick={() => void refresh().catch(e => setError(message(e)))}>تازه‌سازی</button>
    </header>
    {!data.ready ? <p className={styles.notice}>نمایش و مدیریت این بخش بعد از اجرای Migration شمارهٔ ۰۰۴۲ روی دیتابیس فعال می‌شود. ویترین‌های ویکی دست‌نخورده‌اند.</p> : null}
    {notice ? <p className={styles.success} role="status">{notice}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={styles.tabs} role="group" aria-label="انتخاب مقصد">
      {SHOWCASE_SURFACES.map(item => <button type="button" key={item}
        aria-pressed={surface === item} onClick={() => { setSurface(item); setDraft(null); setProposal(null); }}>
        {SHOWCASE_SURFACE_LABELS[item]}
        <small>{numeral(data.placements.filter(p => p.surface === item && p.enabled).length)} فعال</small>
      </button>)}
    </div>
    <div className={styles.layout}>
      <div className={styles.slots}>
        <h4>جایگاه‌های {SHOWCASE_SURFACE_LABELS[surface]}</h4>
        <p>چند محصول در جایگاه‌های جدا؛ هیچ جایگاهی به‌طور خودکار تکرار نمی‌شود.</p>
        {slots.map(item => {
          const placed = listings.find(p => p.slot === item.id);
          const stat = placed ? metric.get(placed.id) : null;
          return <div className={styles.slot} key={item.id}>
            <div><strong>{item.label}</strong><small>تقریباً {numeral(item.percent)}٪ از تجربهٔ خواندن</small></div>
            {placed ? <p>{placed.title} · {data.products.find(p => p.id === placed.productId)?.name ?? placed.productId} · {placed.enabled ? "فعال" : "خاموش"}</p> :
              <p>این جایگاه فعلاً ویترین ندارد.</p>}
            {stat ? <small>{numeral(stat.impressions)} نمایش · {numeral(stat.clicks)} کلیک · {stat.impressions ? (100 * stat.clicks / stat.impressions).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "۰"}٪ CTR در ۳۰ روز</small> : null}
            <button type="button" disabled={!data.ready} onClick={() => selectSlot(surface,item.id)}>
              {placed ? "بازبینی و ویرایش" : "ساخت ویترین"}
            </button>
          </div>;
        })}
        <h4>پیشنهادهای AI منتظر تأیید</h4>
        {proposals.map(item => <div className={styles.slot} key={item.id}>
          <strong>{item.title}</strong><p>{item.slot} · {item.productId}</p>
          <button type="button" onClick={() => selectProposal(item)}>بازبینی پیشنهاد</button>
        </div>)}
        {!proposals.length ? <p>پیشنهاد جدیدی در انتظار نیست.</p> : null}
        <button type="button" className={styles.secondary} onClick={onOpenAi}>
          دریافت بستهٔ AI مشترک با ویکی
        </button>
      </div>
      <div className={styles.editor}>
        <h4>{proposal ? "بازبینی پیشنهاد AI" : draft?.id ? "ویرایش ویترین" : draft ? "ویترین جدید" : "پیش‌نمایش ویترین"}</h4>
        {draft ? <>
          <label>مقصد <strong>{SHOWCASE_SURFACE_LABELS[draft.surface]}</strong></label>
          <label>جایگاه <select value={draft.slot}
            onChange={e => setDraft(old => old && { ...old, slot: e.target.value })}>
            {SHOWCASE_SURFACE_SLOTS[draft.surface].map(item =>
              <option value={item.id} key={item.id}>{item.label} ({numeral(item.percent)}٪)</option>)}
          </select></label>
          <label>محصول <select value={draft.productId}
            onChange={e => setDraft(old => old && { ...old, productId: e.target.value })}>
            {data.products.map(item => <option value={item.id} key={item.id}>
              {item.name}{item.orderable ? "" : " · فروش غیرفعال"}
            </option>)}
          </select></label>
          <label>عنوان <input maxLength={160} value={draft.title}
            onChange={e => setDraft(old => old && { ...old, title: e.target.value })} /></label>
          <label>معرفی محصول <textarea rows={4} maxLength={500} value={draft.description}
            onChange={e => setDraft(old => old && { ...old, description: e.target.value })} /></label>
          <label>متن دکمه <input maxLength={80} value={draft.buttonLabel}
            onChange={e => setDraft(old => old && { ...old, buttonLabel: e.target.value })} /></label>
          {!proposal ? <label className={styles.check}><input type="checkbox" checked={draft.enabled}
            onChange={e => setDraft(old => old && { ...old, enabled: e.target.checked })} />فعال باشد</label> : null}
          <div className={styles.preview}>
            {preview ? <WikiShopShowcaseCard offer={preview} /> : <p>محصول یا تصویر معتبر انتخاب نشده.</p>}
          </div>
          {!currentProduct?.orderable ? <p className={styles.notice}>فروش این محصول هنوز فعال نیست و انتشار آن مجاز نیست.</p> : null}
          <div className={styles.actions}>
            {proposal ? <>
              <button type="button" disabled={!canWrite || busy || !currentProduct?.orderable}
                onClick={() => void action("publish")}>تأیید و انتشار</button>
              <button type="button" disabled={!canWrite || busy} className={styles.secondary}
                onClick={() => void action("reject")}>رد پیشنهاد</button>
            </> : <button type="button" disabled={!canWrite || busy ||
              (draft.enabled && !currentProduct?.orderable)}
              onClick={() => void action("save")}>ذخیرهٔ ویترین</button>}
            <button type="button" className={styles.secondary} onClick={() => { setDraft(null); setProposal(null); }}>انصراف</button>
          </div>
        </> : <p>یکی از جایگاه‌ها یا پیشنهادهای AI را انتخاب کن تا کارت را ویرایش و پیش‌نمایش کنی.</p>}
      </div>
    </div>
  </section>;
}
