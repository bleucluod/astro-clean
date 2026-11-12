"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./wiki-shop-showcase.module.css";

type Product = { id: string; name: string; url: string; image: string | null; orderable: boolean };
type Article = {
  articleId: string; articleVersion: number; title: string; slug: string;
  sections: Array<{ index: number; title: string }>;
};
type Proposal = {
  articleId: string; articleVersion: number; productId: string;
  afterSectionIndex: number; sectionTitle: string;
  title: string; description: string; buttonLabel: string;
  expectedRevision?: number; enabled?: boolean;
};
type Configured = Proposal & {
  articleTitle: string; slug: string; currentArticleVersion: number;
  enabled: boolean; expectedRevision: number; stale: boolean;
};
type Review = {
  index: number; valid: boolean; error?: string; articleTitle?: string;
  slug?: string; item?: Proposal; existing?: boolean; orderable?: boolean;
};

// Visual-only demo fixture: never sent to or stored in any database.
const demoProducts: Product[] = [
  { id: "p01", name: "ماه آن روز", url: "/shop/moon-phase", image: "/shop-preview/p01/full-both.webp", orderable: true },
  { id: "p02", name: "آسمان تولد", url: "/shop/birth-sky-map", image: null, orderable: false },
];
const demoArticles: Article[] = [
  {
    articleId: "11111111-1111-4111-8111-111111111111",
    articleVersion: 1, title: "نمونهٔ آزمایشی: فاز ماه در روز تولد", slug: "demo-moon",
    sections: [
      { index: 0, title: "ماه در روز تولد چه شکلی است؟" },
      { index: 1, title: "چرا شکل ماه هر روز تغییر می‌کند؟" },
      { index: 2, title: "چطور تاریخ دلخواه را انتخاب کنیم؟" },
      { index: 3, title: "جمع‌بندی" },
    ],
  },
  {
    articleId: "22222222-2222-4222-8222-222222222222",
    articleVersion: 1, title: "نمونهٔ آزمایشی: نقشهٔ آسمان تولد", slug: "demo-sky",
    sections: [
      { index: 0, title: "آسمان تولد چیست؟" },
      { index: 1, title: "نقش ساعت و شهر تولد" },
      { index: 2, title: "صورت‌های فلکی در آسمان" },
      { index: 3, title: "سخن آخر" },
    ],
  },
];

export function WikiShopShowcasePanel({ token, canWrite, demo = false }: {
  token: string; canWrite: boolean; demo?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [configured, setConfigured] = useState<Configured[]>([]);
  const [drafts, setDrafts] = useState<Proposal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [approved, setApproved] = useState<number[]>([]);
  const [publish, setPublish] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const demoStore = useRef<Configured[]>([]);

  const api = useCallback(async <T extends Record<string, unknown>>(
    path: string, options: RequestInit = {},
  ): Promise<T> => {
    if (demo) {
      // No fetch, real API call, authentication bypass or persistent mutation in demo mode.
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "GET" && path.includes("mode=export")) {
        return {
          ok: true,
          guide: {
            schemaVersion: 1,
            demoOnly: true,
            instructions: ["These articles and product availability are illustrative, not live data.",
              "Select a relevant product and place it between H2 sections, never after the last section.",
              "AI suggestions require manual review; this demo saves nothing to the server."],
            products: demoProducts,
            articles: demoArticles.map((article) => ({
              ...article, allowedAfterSectionIndexes: [1, 2],
              sections: article.sections.map((section) => ({
                afterSectionIndex: section.index, sectionTitle: section.title,
                text: "متن نمونه برای بررسی محل قرارگیری ویترین؛ این مقاله واقعی نیست.",
              })),
            })),
          },
        } as unknown as T;
      }
      if (method === "GET") {
        return { ok: true, products: demoProducts, articles: demoArticles,
          configured: demoStore.current } as unknown as T;
      }
      const body = JSON.parse(String(options.body ?? "{}")) as {
        action?: string; proposals?: Proposal[]; items?: Proposal[];
      };
      if (method === "POST" && body.action === "preview") {
        const reviews: Review[] = (body.proposals ?? []).map((item, index) => {
          const article = demoArticles.find((a) => a.articleId === item.articleId);
          const product = demoProducts.find((p) => p.id === item.productId);
          const valid = Boolean(article && product &&
            item.articleVersion === article.articleVersion &&
            item.afterSectionIndex > 0 &&
            item.afterSectionIndex < article.sections.length - 1 &&
            article.sections[item.afterSectionIndex].title === item.sectionTitle &&
            item.title?.trim() && item.description?.trim() && item.buttonLabel?.trim());
          const existing = demoStore.current.find((c) => c.articleId === item.articleId);
          return { index, valid, error: valid ? undefined : "مقاله، جایگاه یا متن نامعتبر است",
            articleTitle: article?.title, slug: article?.slug,
            existing: Boolean(existing), orderable: product?.orderable ?? false,
            item: valid ? { ...item, expectedRevision: existing?.expectedRevision ?? 0 } : undefined };
        });
        return { ok: true, reviews } as unknown as T;
      }
      if (method === "PUT" && body.action === "apply") {
        for (const item of body.items ?? []) {
          const article = demoArticles.find((a) => a.articleId === item.articleId);
          const product = demoProducts.find((p) => p.id === item.productId);
          if (!article || !product) throw new Error("Invalid demo selection");
          const old = demoStore.current.find((c) => c.articleId === item.articleId);
          const saved: Configured = {
            ...item, articleTitle: article.title, slug: article.slug,
            currentArticleVersion: article.articleVersion, stale: false,
            enabled: Boolean(item.enabled && product.orderable),
            expectedRevision: (old?.expectedRevision ?? 0) + 1,
          };
          demoStore.current = [...demoStore.current.filter((c) => c.articleId !== item.articleId), saved];
        }
        return { ok: true, updatedCount: (body.items ?? []).length } as unknown as T;
      }
      throw new Error("Unsupported demo request");
    }
    const response = await fetch(path, {
      ...options, cache: "no-store",
      headers: {
        authorization: "Bearer " + token,
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const body = await response.json() as Record<string, unknown>;
    if (!response.ok || body.ok !== true) {
      throw new Error(typeof body.error === "string" ? body.error : "درخواست پنل انجام نشد.");
    }
    return body as T;
  }, [token, demo]);

  const refresh = useCallback(async () => {
    const data = await api<{
      ok: true; products: Product[]; articles: Article[]; configured: Configured[];
    }>("/api/admin/wiki/shop-showcases");
    setProducts(data.products);
    setArticles(data.articles);
    setConfigured(data.configured);
  }, [api]);

  useEffect(() => {
    void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "بارگذاری ویترین انجام نشد."));
  }, [refresh]);

  const selectedProduct = (id: string) => products.find((p) => p.id === id);
  const selectedArticle = (id: string) => articles.find((a) => a.articleId === id);
  const availablePositions = (article?: Article) =>
    article?.sections.filter((section) =>
      section.index < article.sections.length - 1 &&
      (article.sections.length < 4 || section.index > 0)) ?? [];

  function updateDraft(index: number, change: Partial<Proposal>) {
    setDrafts((old) => old.map((item, i) => i === index ? { ...item, ...change } : item));
    setReviews([]);
    setApproved([]);
    setMessage("");
  }

  function addManual() {
    const article = articles.find((a) => availablePositions(a).length > 0);
    const firstSection = availablePositions(article)[0];
    const product = products.find((p) => p.orderable) ?? products[0];
    if (!article || !firstSection || !product) {
      setError("مقاله یا محصول مناسبی برای ویترین پیدا نشد.");
      return;
    }
    setDrafts((old) => [...old, {
      articleId: article.articleId, articleVersion: article.articleVersion,
      productId: product.id, afterSectionIndex: firstSection.index,
      sectionTitle: firstSection.title, title: product.name,
      description: "", buttonLabel: "مشاهدهٔ تابلو",
    }]);
    setReviews([]);
    setApproved([]);
  }

  async function downloadGuide() {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await api<{ ok: true; guide: unknown }>(
        "/api/admin/wiki/shop-showcases?mode=export",
      );
      const blob = new Blob([JSON.stringify(data.guide, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "halleus-wiki-shop-showcases-ai-guide.json";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("بستهٔ محصولات، مقاله‌ها و قوانین انتخاب جایگاه دانلود شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "دانلود انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function importProposals(file: File | null) {
    if (!file) return;
    setError(""); setMessage(""); setReviews([]); setApproved([]);
    try {
      if (file.size > 8_000_000 || !file.name.toLowerCase().endsWith(".json")) {
        throw new Error("فقط فایل JSON حداکثر ۸ مگابایت پذیرفته می‌شود.");
      }
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("فرمت بسته نامعتبر است.");
      }
      const packageObject = parsed as Record<string, unknown>;
      if (packageObject.schemaVersion !== 1 || !Array.isArray(packageObject.proposals) ||
        packageObject.proposals.length > 500) {
        throw new Error("بسته باید schemaVersion=1 و proposals معتبر داشته باشد.");
      }
      const safe = packageObject.proposals.map((raw): Proposal => {
        const p = raw && typeof raw === "object" && !Array.isArray(raw)
          ? raw as Record<string, unknown> : {};
        const value = (key: string) => typeof p[key] === "string" ? p[key] as string : "";
        return {
          articleId: value("articleId"),
          articleVersion: Number.isSafeInteger(p.articleVersion) ? p.articleVersion as number : 0,
          productId: value("productId"),
          afterSectionIndex: Number.isSafeInteger(p.afterSectionIndex) ? p.afterSectionIndex as number : -1,
          sectionTitle: value("sectionTitle"),
          title: value("title"),
          description: value("description"),
          buttonLabel: value("buttonLabel"),
          expectedRevision: 0,
          enabled: false,
        };
      });
      setDrafts(safe);
      setMessage("پیشنهادها خوانده شدند. قبل از ذخیره، بازبینی و انتخابشان کن.");
    } catch (cause) {
      setDrafts([]);
      setError(cause instanceof Error ? cause.message : "خواندن بسته ناموفق بود.");
    }
  }

  async function preview() {
    setBusy(true); setError(""); setMessage(""); setApproved([]);
    try {
      const result = await api<{ ok: true; reviews: Review[] }>(
        "/api/admin/wiki/shop-showcases", {
          method: "POST",
          body: JSON.stringify({ action: "preview", proposals: drafts }),
        },
      );
      setReviews(result.reviews);
      setDrafts((old) => old.map((item, i) => {
        const reviewed = result.reviews[i];
        return reviewed?.valid && reviewed.item ? { ...item, ...reviewed.item } : item;
      }));
      setMessage("بازبینی انجام شد. فقط موارد انتخاب‌شده در مرحلهٔ بعد ذخیره می‌شوند.");
    } catch (cause) {
      setReviews([]);
      setError(cause instanceof Error ? cause.message : "بازبینی ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function apply(items: Proposal[]) {
    if (!items.length) return;
    if (items.length > 100) {
      setError("در هر نوبت حداکثر ۱۰۰ ویترین را ذخیره کن.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      await api<{ ok: true; updatedCount: number }>(
        "/api/admin/wiki/shop-showcases", {
          method: "PUT",
          body: JSON.stringify({ action: "apply", items }),
        },
      );
      setMessage(items.length.toLocaleString("fa-IR") + " ویترین با موفقیت ذخیره شد.");
      setDrafts([]); setReviews([]); setApproved([]);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره ناموفق بود.");
      // A failed batch is atomic; keep every reviewed proposal for correction.
    } finally {
      setBusy(false);
    }
  }

  const selectedItems = reviews.filter((r) => r.valid && approved.includes(r.index) && r.item)
    .map((r) => ({
      ...r.item!,
      enabled: Boolean(publish[r.index]) && Boolean(r.orderable),
    }));

  return (
    <section className={styles.panel} dir="rtl">
      {demo ? <p className={styles.note} role="status"><strong>حالت پیش‌نمایش لوکال:</strong> مقاله‌ها و وضعیت فروش محصولات نمونه‌اند؛ ذخیره و فعال‌سازی فقط در حافظهٔ همین صفحه انجام می‌شود و هیچ تغییری روی سایت یا دیتابیس ندارد.</p> : null}
      <header className={styles.header}>
        <div>
          <h2>ویترین محصولات در مقالات ویکی</h2>
          <p>یک ویترین متناسب با محتوای مقاله؛ داخل بخش‌های اصلی، نه انتهای مقاله.</p>
        </div>
        <button type="button" onClick={() => void downloadGuide()} disabled={busy}>
          دریافت بسته برای AI
        </button>
      </header>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.success} role="status">{message}</p> : null}
      <div className={styles.summary}>
        <span>مقاله‌های منتشرشده: {articles.length.toLocaleString("fa-IR")}</span>
        <span>محصولات: {products.length.toLocaleString("fa-IR")}</span>
        <span>ویترین‌های ثبت‌شده: {configured.length.toLocaleString("fa-IR")}</span>
      </div>
      <p className={styles.note}>بستهٔ خروجی، عنوان و محتوای بخش‌ها، شناسه‌ها، محصولات و قوانین را دارد. AI باید فایل JSON با آرایهٔ proposals برگرداند؛ پیشنهادهایش به‌تنهایی منتشر نمی‌شوند.</p>
      {canWrite ? (
        <>
          <div className={styles.toolbar}>
            <label className={styles.file}>
              ورود فایل پیشنهادهای AI
              <input type="file" accept=".json,application/json"
                onChange={(event) => {
                  void importProposals(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }} />
            </label>
            <button type="button" onClick={addManual} disabled={busy}>+ افزودن دستی</button>
            <button type="button" onClick={() => void preview()} disabled={busy || !drafts.length}>
              بررسی پیشنهادها
            </button>
          </div>
          {drafts.length ? (
            <div className={styles.review}>
              <h3>بازبینی پیشنهادها ({drafts.length.toLocaleString("fa-IR")})</h3>
              <p className={styles.note}>انتخاب مقاله، محصول، موقعیت و متن قابل ویرایش است. پس از هر ویرایش، دوباره «بررسی پیشنهادها» را بزن.</p>
              {drafts.map((draft, index) => {
                const article = selectedArticle(draft.articleId);
                const product = selectedProduct(draft.productId);
                const review = reviews[index];
                return (
                  <div className={styles.item} key={index}>
                    <div className={styles.row}>
                      <strong>پیشنهاد {Number(index + 1).toLocaleString("fa-IR")}</strong>
                      {review ? <span className={review.valid ? styles.valid : styles.invalid}>
                        {review.valid ? "معتبر" : review.error}
                      </span> : <span>نیازمند بازبینی</span>}
                    </div>
                    <div className={styles.fields}>
                      <label>مقاله
                        <select value={draft.articleId} onChange={(event) => {
                          const next = selectedArticle(event.target.value);
                          const at = availablePositions(next)[0];
                          updateDraft(index, {
                            articleId: next?.articleId ?? event.target.value,
                            articleVersion: next?.articleVersion ?? 0,
                            afterSectionIndex: at?.index ?? 0, sectionTitle: at?.title ?? "",
                            expectedRevision: configured.find((c) => c.articleId === next?.articleId)?.expectedRevision ?? 0,
                          });
                        }}>
                          {!article ? <option value={draft.articleId}>{draft.articleId} (نامعتبر)</option> : null}
                          {articles.map((a) => <option key={a.articleId} value={a.articleId}>{a.title}</option>)}
                        </select>
                      </label>
                      <label>محصول
                        <select value={draft.productId} onChange={(event) => updateDraft(index, {
                          productId: event.target.value,
                          title: selectedProduct(event.target.value)?.name ?? draft.title,
                        })}>
                          {!product ? <option value={draft.productId}>{draft.productId} (نامعتبر)</option> : null}
                          {products.map((p) => <option key={p.id} value={p.id}>
                            {p.name}{p.orderable ? "" : " (فروش بسته)"}
                          </option>)}
                        </select>
                      </label>
                      <label>موقعیت میان مقاله
                        <select value={draft.afterSectionIndex} onChange={(event) => {
                          const afterSectionIndex = Number(event.target.value);
                          const sectionTitle = article?.sections[afterSectionIndex]?.title ?? "";
                          updateDraft(index, { afterSectionIndex, sectionTitle });
                        }}>
                          {!availablePositions(article).some((s) => s.index === draft.afterSectionIndex) ?
                            <option value={draft.afterSectionIndex}>جایگاه نامعتبر/قدیمی</option> : null}
                          {availablePositions(article).map((s) => <option key={s.index} value={s.index}>
                            بعد از: {s.title}
                          </option>)}
                        </select>
                      </label>
                      <label>عنوان کارت
                        <input maxLength={160} value={draft.title ?? ""}
                          onChange={(event) => updateDraft(index, { title: event.target.value })} />
                      </label>
                      <label className={styles.wide}>متن معرفی
                        <textarea maxLength={500} rows={2} value={draft.description ?? ""}
                          onChange={(event) => updateDraft(index, { description: event.target.value })} />
                      </label>
                      <label>متن لینک
                        <input maxLength={80} value={draft.buttonLabel ?? ""}
                          onChange={(event) => updateDraft(index, { buttonLabel: event.target.value })} />
                      </label>
                    </div>
                    <div className={styles.mock}>
                      {product?.image ? <Image src={product.image} width={96} height={120} alt="" /> : null}
                      <div><small>پیش‌نمایش ویترین · {article?.title ?? "مقاله نامعتبر"}</small>
                        <strong>{draft.title}</strong>
                        <p>{draft.description}</p>
                        <span>{draft.buttonLabel}</span>
                      </div>
                    </div>
                    {review?.valid ? (
                      <div className={styles.row}>
                        <label className={styles.check}><input type="checkbox" checked={approved.includes(index)}
                          onChange={(event) => setApproved((old) => event.target.checked
                            ? [...old, index] : old.filter((i) => i !== index))} /> تأیید و ذخیرهٔ این پیشنهاد</label>
                        <label className={styles.check}><input type="checkbox" disabled={!approved.includes(index) || !review.orderable}
                          checked={Boolean(publish[index]) && approved.includes(index) && Boolean(review.orderable)}
                          onChange={(event) => setPublish((old) => ({ ...old, [index]: event.target.checked }))} />
                          فعال‌سازی نمایش در سایت
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div className={styles.row}>
                <button disabled={busy || !selectedItems.length} type="button"
                  onClick={() => void apply(selectedItems)}>
                  ذخیرهٔ {selectedItems.length.toLocaleString("fa-IR")} پیشنهاد تأییدشده
                </button>
                <button type="button" disabled={busy} onClick={() => {
                  setDrafts([]); setReviews([]); setApproved([]);
                }}>بستن بسته</button>
              </div>
            </div>
          ) : null}
        </>
      ) : <p className={styles.note}>دسترسی انتشار برای ویرایش ویترین لازم است؛ خروجی برای AI فقط‌خواندنی است.</p>}

      <div className={styles.review}>
        <h3>ویترین‌های ثبت‌شده</h3>
        {!configured.length ? <p className={styles.note}>هنوز ویترینی ثبت نشده است.</p> : null}
        {configured.map((item) => (
          <div key={item.articleId} className={styles.rowCard}>
            <div>
              <strong>{item.articleTitle}</strong>
              <small>{selectedProduct(item.productId)?.name ?? item.productId} · بعد از «{item.sectionTitle}»</small>
              <small>{item.stale ? "نیازمند بازبینی پس از تغییر مقاله" :
                item.enabled ? "فعال" : "غیرفعال"}</small>
            </div>
            {canWrite ? <div className={styles.row}>
              <button type="button" disabled={busy} onClick={() => {
                const current = selectedArticle(item.articleId);
                const position = availablePositions(current)
                  .find((section) => section.index === item.afterSectionIndex && section.title === item.sectionTitle)
                  ?? availablePositions(current)[0];
                setDrafts([{ ...item,
                  articleVersion: current?.articleVersion ?? item.articleVersion,
                  afterSectionIndex: position?.index ?? item.afterSectionIndex,
                  sectionTitle: position?.title ?? item.sectionTitle,
                }]);
                setReviews([]); setApproved([]);
                setMessage("این ویترین برای ویرایش در بخش بازبینی باز شد.");
              }}>ویرایش</button>
              <button type="button" disabled={busy || (item.stale && !item.enabled)}
                onClick={() => void apply([{ ...item, enabled: !item.enabled }])}>
                {item.enabled ? "غیرفعال‌کردن" : "فعال‌کردن"}
              </button>
            </div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
