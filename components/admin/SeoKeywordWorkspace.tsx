"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WikiLinkGraphArticle } from "@/lib/wiki/wiki-link-admin-types";
import type { SeoPage, SeoKeyword, SeoGscRow } from "@/lib/seo/seo-keyword-bank";
import { NEMAD_MONTHS } from "@/lib/shop/nemad-man-months";
import styles from "./seo-keywords.module.css";

type BankState = {
  pages: SeoPage[];
  targets: SeoKeyword[];
  queries: SeoGscRow[];
  productShowcases?: Record<string, number>;
};
type KeywordKind = SeoKeyword["kind"];
type CsvMetric = { query: string; clicks: number; impressions: number; ctr: number; position: number };

const EMPTY: BankState = { pages: [], targets: [], queries: [] };
const FALLBACK_PRODUCTS: SeoPage[] = [
  { key: "shop:/shop", path: "/shop", title: "فروشگاه هالیوس", type: "product", status: "indexable" },
  { key: "shop:/shop/moon-phase-print", path: "/shop/moon-phase-print", title: "ماه آن روز", type: "product", status: "indexable" },
  { key: "shop:/shop/birth-sky-map", path: "/shop/birth-sky-map", title: "آسمان تولد", type: "product", status: "indexable" },
  { key: "shop:/shop/milky-way-print", path: "/shop/milky-way-print", title: "شب ما", type: "product", status: "indexable" },
  ...NEMAD_MONTHS.map(({ slug, title }) => ({
    key: "shop:/shop/" + slug + "-sign", path: "/shop/" + slug + "-sign",
    title: "نماد من — " + title, type: "product" as const, status: "indexable",
  })),
];
const KINDS: { value: KeywordKind; label: string }[] = [
  { value: "primary", label: "اصلی" },
  { value: "secondary", label: "فرعی" },
  { value: "long_tail", label: "Long-tail" },
];

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹]/g, (char) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String("٠١٢٣٤٥٦٧٨٩".indexOf(char)));
}

function normalizePhrase(value: string) {
  return value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, " ").trim().toLocaleLowerCase("fa-IR");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  const head = text.split(/\r?\n/, 1)[0] ?? "";
  const separator = head.includes("\t") ? "\t" :
    head.split(";").length > head.split(",").length ? ";" : ",";
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("فایل CSV کوتیشن بسته‌نشده دارد.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvNumber(raw: string) {
  const input = normalizeDigits(raw).trim().replace(/[%٪]/g, "");
  const cleaned = input.replace(/[\u00a0\s]/g, "");
  // GSC exports decimal dot and comma. Both are accepted.
  const commaDecimals = !cleaned.includes(".") && /^[0-9]+,[0-9]{1,2}$/.test(cleaned);
  const value = Number(commaDecimals ? cleaned.replace(",", ".") : cleaned.replace(/,/g, ""));
  return Number.isFinite(value) ? value : NaN;
}

function csvQueryRows(text: string, selectedPath: string): CsvMetric[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV شامل ردیف داده نیست.");
  const header = rows[0].map((h) => normalizePhrase(h));
  const column = (names: string[]) => header.findIndex((h) => names.includes(h));
  const queryColumn = column(["top queries", "query", "queries", "جستجو", "عبارت جستجو", "کوئری"]);
  const clicksColumn = column(["clicks", "کلیک", "کلیک‌ها"]);
  const impressionsColumn = column(["impressions", "impression", "نمایش", "نمایش‌ها"]);
  const ctrColumn = column(["ctr", "میانگین ctr", "نرخ کلیک"]);
  const positionColumn = column(["position", "average position", "avg. position", "میانگین جایگاه", "رتبه"]);
  const pageColumn = column(["page", "pages", "top pages", "url", "صفحه"]);
  if ([queryColumn, clicksColumn, impressionsColumn, ctrColumn, positionColumn].some((i) => i < 0)) {
    throw new Error("CSV باید ستون‌های Query، Clicks، Impressions، CTR و Position داشته باشد؛ خروجی Queries را بگیر.");
  }
  const parsed: CsvMetric[] = [];
  for (const row of rows.slice(1)) {
    const query = (row[queryColumn] ?? "").trim();
    if (!query) continue;
    if (pageColumn >= 0) {
      const page = (row[pageColumn] ?? "").trim();
      let path = page;
      try {
        const url = new URL(page);
        if (url.hostname !== "halleus.ir" && url.hostname !== "www.halleus.ir") {
          throw new Error("خروجی متعلق به دامنهٔ هالیوس نیست.");
        }
        path = url.pathname;
      } catch (error) {
        if (error instanceof Error && error.message.includes("دامنه")) throw error;
      }
      if (path.replace(/\/$/, "") !== selectedPath) {
        throw new Error("CSV شامل صفحهٔ دیگری است؛ در GSC ابتدا همین صفحه را فیلتر کن.");
      }
    }
    const clicks = csvNumber(row[clicksColumn] ?? "");
    const impressions = csvNumber(row[impressionsColumn] ?? "");
    const rawCtr = row[ctrColumn] ?? "";
    const valueCtr = csvNumber(rawCtr);
    const ctr = /[%٪]/.test(rawCtr) || valueCtr > 1 ? valueCtr / 100 : valueCtr;
    const position = csvNumber(row[positionColumn] ?? "");
    if (query.length > 200 || !Number.isSafeInteger(clicks) ||
      !Number.isSafeInteger(impressions) || clicks < 0 || impressions < clicks ||
      !Number.isFinite(ctr) || ctr < 0 || ctr > 1 ||
      !Number.isFinite(position) || position < 0 || position > 10000) {
      throw new Error("مقادیر CSV برای کوئری «" + query.slice(0, 35) + "» معتبر نیست.");
    }
    parsed.push({ query, clicks, impressions, ctr, position });
  }
  if (!parsed.length || parsed.length > 1000) {
    throw new Error("خروجی باید بین ۱ تا ۱۰۰۰ کوئری معتبر داشته باشد.");
  }
  return parsed;
}

export function SeoKeywordWorkspace({
  token, canWrite, graphArticles,
}: {
  token: string;
  canWrite: boolean;
  graphArticles: readonly WikiLinkGraphArticle[];
}) {
  const [data, setData] = useState<BankState>(EMPTY);
  const [selectedKey, setSelectedKey] = useState("");
  const [scope, setScope] = useState<"all" | "wiki" | "product">("all");
  const [filter, setFilter] = useState("");
  const [phrase, setPhrase] = useState("");
  const [kind, setKind] = useState<KeywordKind>("long_tail");
  const [editing, setEditing] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("authorization", "Bearer " + token);
    if (init?.body) headers.set("content-type", "application/json");
    const response = await fetch(path, { ...init, cache: "no-store", headers });
    let payload: Record<string, unknown>;
    try { payload = await response.json() as Record<string, unknown>; }
    catch { throw new Error("پاسخ معتبر از سرور دریافت نشد."); }
    if (!response.ok || payload.ok !== true) {
      throw new Error(typeof payload.error === "string" ? payload.error : "درخواست ناموفق بود.");
    }
    return payload;
  }, [token]);

  const load = useCallback(async (pageKey: string) => {
    setLoading(true);
    try {
      const path = "/api/admin/seo/keywords" +
        (pageKey ? "?pageKey=" + encodeURIComponent(pageKey) : "");
      const payload = await request(path);
      const next = payload.state as BankState;
      setData(next);
      setConnected(true);
      setError("");
      if (!pageKey && next.pages.length) setSelectedKey(next.pages[0].key);
    } catch (cause) {
      setConnected(false);
      const fallback: SeoPage[] = [
        ...graphArticles.map((article): SeoPage => ({
          key: "wiki:" + article.stableId,
          path: "/wiki/" + article.slug,
          title: article.title,
          type: "wiki",
          status: article.publicReady ? "indexable" : article.status,
        })),
        ...FALLBACK_PRODUCTS,
      ];
      setData((current) => current.pages.length ? current : {
        pages: fallback, targets: [], queries: [],
      });
      if (!pageKey && fallback.length) setSelectedKey(fallback[0].key);
      setError((cause instanceof Error ? cause.message : "خطای دریافت داده‌ها") +
        " — پیش‌نمایش صفحات فعال است؛ برای ذخیره، اتصال دیتابیس و مهاجرت 0044 لازم است.");
    } finally {
      setLoading(false);
    }
  }, [request, graphArticles]);

  useEffect(() => {
    // Load the private SEO ledger whenever selection changes.
    void load(selectedKey);
  }, [load, selectedKey]);

  const selectedPage = data.pages.find((page) => page.key === selectedKey);
  const targets = data.targets.filter((target) => target.pageKey === selectedKey);
  const graph = selectedPage?.type === "wiki"
    ? graphArticles.find((article) => "wiki:" + article.stableId === selectedKey)
    : null;
  const pages = useMemo(() => data.pages.filter((page) =>
    (scope === "all" || page.type === scope) &&
    (page.title + " " + page.path).toLocaleLowerCase("fa-IR").includes(filter.toLocaleLowerCase("fa-IR"))
  ), [data.pages, scope, filter]);

  const overlaps = useMemo(() => {
    const owners = new Map<string, SeoKeyword[]>();
    for (const target of data.targets) {
      const entries = owners.get(target.phraseKey) ?? [];
      entries.push(target);
      owners.set(target.phraseKey, entries);
    }
    return data.targets
      .filter((target) => target.pageKey === selectedKey)
      .flatMap((target) => {
        const other = (owners.get(target.phraseKey) ?? []).filter((row) => row.pageKey !== selectedKey);
        return other.map((row) => ({
          phrase: target.phrase,
          page: data.pages.find((page) => page.key === row.pageKey)?.title ?? row.pageKey,
          critical: row.kind === "primary" && target.kind === "primary",
        }));
      });
  }, [data.pages, data.targets, selectedKey]);

  async function submit(action: string, values: Record<string, unknown>, message: string) {
    if (!selectedKey || !canWrite || !connected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await request("/api/admin/seo/keywords", {
        method: "POST",
        body: JSON.stringify({ action, pageKey: selectedKey, ...values }),
      });
      await load(selectedKey);
      setNotice(message);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره ناموفق بود.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveKeyword() {
    if (!phrase.trim()) { setError("کلیدواژه را وارد کن."); return; }
    const done = await submit("save_keyword", {
      phrase, kind, originalPhrase: editing,
    }, "کلیدواژه ذخیره شد.");
    if (done) { setPhrase(""); setEditing(null); setKind("long_tail"); }
  }

  async function removeKeyword(value: string) {
    if (!window.confirm("کلیدواژهٔ «" + value + "» حذف شود؟")) return;
    const done = await submit("remove_keyword", { phrase: value }, "کلیدواژه حذف شد.");
    if (done && editing && normalizePhrase(editing) === normalizePhrase(value)) {
      setPhrase(""); setEditing(null);
    }
  }

  async function importCsv(file: File | null) {
    if (!file || !selectedPage || !canWrite || !connected) return;
    setError(""); setNotice("");
    if (!periodStart || !periodEnd || periodStart > periodEnd) {
      setError("بازهٔ شروع و پایان گزارش را درست مشخص کن.");
      return;
    }
    if (file.size > 350000) {
      setError("فایل CSV باید کمتر از ۳۵۰ کیلوبایت باشد.");
      return;
    }
    try {
      const rows = csvQueryRows(await file.text(), selectedPage.path);
      if (!window.confirm(
        "برای «" + selectedPage.title + "» تعداد " + rows.length +
        " کوئری ثبت شود؟ داده‌های همان بازهٔ زمانی جایگزین می‌شوند."
      )) return;
      await submit("import_gsc", {
        periodStart, periodEnd, sourceName: file.name, rows,
      }, rows.length + " کوئری GSC همراه بازهٔ زمانی ذخیره شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "CSV قابل خواندن نیست.");
    }
  }

  return <section className={styles.workspace}>
    <header className={styles.heading}>
      <div>
        <small>بانک دائمی کلیدواژه‌های هالیوس</small>
        <h2>نقشهٔ کلیدواژه‌ها</h2>
        <p>هر صفحه مالک کلیدواژه‌های خودش است؛ کوئری‌های GSC فقط دادهٔ مشاهده‌شده‌اند، نه هدف خودکار.</p>
      </div>
      <button type="button" disabled={loading} onClick={() => void load(selectedKey)}>به‌روزرسانی</button>
    </header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {!connected ? <p className={styles.muted}>نمایش اولیهٔ صفحات بدون ذخیره‌سازی است؛ ابتدا مهاجرت دیتابیس محیط localhost را اعمال کن.</p> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    <div className={styles.layout}>
      <aside className={styles.pageList}>
        <div className={styles.filters}>
          <label>نمایش
            <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
              <option value="all">همه</option><option value="wiki">مقاله‌های ویکی</option>
              <option value="product">محصولات و فروشگاه</option>
            </select>
          </label>
          <label>جست‌وجوی صفحه
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="نام یا آدرس صفحه" />
          </label>
        </div>
        <div className={styles.pages}>
          {pages.map((page) => {
            const count = data.targets.filter((target) => target.pageKey === page.key).length;
            return <button type="button" key={page.key}
              aria-pressed={page.key === selectedKey}
              className={page.key === selectedKey ? styles.selected : undefined}
              onClick={() => { setSelectedKey(page.key); setEditing(null); setPhrase(""); }}>
              <strong>{page.title}</strong>
              <small>{page.path}</small>
              <span>{page.type === "wiki" ? "ویکی" : "محصول"} · {count} کلیدواژه</span>
            </button>;
          })}
        </div>
      </aside>
      <div className={styles.editor}>
        {selectedPage ? <>
          <section className={styles.card}>
            <div className={styles.sectionTitle}>
              <div>
                <small>{selectedPage.type === "wiki" ? "مقالهٔ ویکی" : "فروشگاه"}</small>
                <h3>{selectedPage.title}</h3>
                <code dir="ltr">{selectedPage.path}</code>
              </div>
              <a href={selectedPage.path} target="_blank" rel="noopener noreferrer">نمایش صفحه</a>
            </div>
            {selectedPage.type === "wiki" && graph ? <p className={styles.info}>
              {graph.bodyIncomingCount} لینک ورودی زنده · هدف پیشنهادی: ۳ لینک واقعاً مرتبط
              {graph.bodyIncomingCount < 3 ? " (کمبود پیشنهادی، نه خطای انتشار)" : ""}
            </p> : <p className={styles.info}>
              {data.productShowcases?.[selectedKey] ?? 0} مقالهٔ منتشر با ویترین محصول فعالِ ثبت‌شده ·
              لینک‌های متنی مستقل در این عدد نیستند. فقط از مقاله‌های واقعاً مرتبط لینک بده؛
              ناوبری و مسیر خرید حفظ می‌شوند.
            </p>}
            {overlaps.length ? <div className={styles.warning}>
              <strong>تداخل احتمالی کلیدواژه</strong>
              {overlaps.map((item, i) => <p key={i}>
                «{item.phrase}» در «{item.page}» هم ثبت شده
                {item.critical ? " — هر دو به‌عنوان اصلی!" : " — قصد جست‌وجو را بررسی کن."}
              </p>)}
            </div> : null}
            <h4>کلیدواژه‌های هدف</h4>
            <div className={styles.targets}>
              {targets.length ? targets.map((target) => <div key={target.phraseKey} className={styles.keywordRow}>
                <span><strong>{target.phrase}</strong><small>{KINDS.find((entry) => entry.value === target.kind)?.label}</small></span>
                {canWrite && connected ? <div>
                  <button type="button" onClick={() => { setPhrase(target.phrase); setKind(target.kind); setEditing(target.phrase); }}>ویرایش</button>
                  <button type="button" disabled={busy} onClick={() => void removeKeyword(target.phrase)}>حذف</button>
                </div> : null}
              </div>) : <p className={styles.muted}>هنوز کلیدواژه‌ای برای این صفحه ثبت نشده.</p>}
            </div>
            {canWrite && connected ? <div className={styles.form}>
              <label>عبارت
                <input value={phrase} maxLength={200} onChange={(event) => setPhrase(event.target.value)} placeholder="مثلاً کادو برای متولد مهر" />
              </label>
              <label>نوع
                <select value={kind} onChange={(event) => setKind(event.target.value as KeywordKind)}>
                  {KINDS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                </select>
              </label>
              <button type="button" disabled={busy || !phrase.trim()} onClick={() => void saveKeyword()}>
                {editing ? "ذخیرهٔ ویرایش" : "افزودن"}
              </button>
              {editing ? <button type="button" onClick={() => { setEditing(null); setPhrase(""); }}>انصراف</button> : null}
            </div> : null}
          </section>
          <section className={styles.card}>
            <h3>کوئری‌های مشاهده‌شده در Search Console</h3>
            <p className={styles.muted}>بدون API و OAuth: در GSC ابتدا همین صفحه را فیلتر کن، سپس Performance ← Queries ← Export CSV. بازهٔ تاریخ همان گزارش را وارد کن.</p>
            {canWrite && connected ? <div className={styles.importForm}>
              <label>از تاریخ
                <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </label>
              <label>تا تاریخ
                <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
              </label>
              <label className={styles.fileInput}>فایل Queries.csv
                <input type="file" accept=".csv,text/csv" disabled={busy}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    event.currentTarget.value = "";
                    void importCsv(file);
                  }} />
              </label>
            </div> : null}
            <p className={styles.muted}>هر بار یک صفحه و یک بازه؛ بارگذاری دوبارهٔ همان بازه جایگزین دادهٔ قبلی می‌شود. این اعداد با کلیدواژهٔ هدف ادغام نمی‌شوند.</p>
            {data.queries.length ? <div className={styles.tableWrap}><table>
              <thead><tr><th>Query</th><th>کلیک</th><th>نمایش</th><th>CTR</th><th>رتبه</th><th>بازه</th></tr></thead>
              <tbody>{data.queries.map((row, i) => <tr key={row.query + row.periodStart + i}>
                <td><strong>{row.query}</strong><small>{row.sourceName}</small></td>
                <td>{row.clicks.toLocaleString("fa-IR")}</td>
                <td>{row.impressions.toLocaleString("fa-IR")}</td>
                <td>{(row.ctr * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪</td>
                <td>{row.position.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</td>
                <td>{row.periodStart} تا {row.periodEnd}</td>
              </tr>)}</tbody>
            </table></div> : <p className={styles.muted}>{loading ? "در حال دریافت…" : "هنوز دادهٔ کوئری ثبت نشده."}</p>}
          </section>
        </> : <section className={styles.card}><p>{loading ? "در حال دریافت صفحات…" : "صفحه‌ای انتخاب نشده."}</p></section>}
      </div>
    </div>
  </section>;
}
