"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type {
  AnalyticsDashboard, AnalyticsDailyPoint, AnalyticsPageRow,
} from "@/lib/admin/halleus-analytics-dashboard";
import styles from "./halleus-analytics.module.css";

export type AnalyticsSection = "overview" | "live" | "traffic" | "content" | "time" | "sales" | "tools";
type ChartKey = "views" | "sessions" | "seconds" | "productClicks";
type SortKey = "seconds" | "averageSeconds" | "views" | "sessions" | "scroll90";
type PageDetail = {
  path: string; daily: AnalyticsDailyPoint[]; previousDaily: AnalyticsDailyPoint[];
  sources: Array<{ source: string; views: number; seconds: number; clicks: number }>;
  showcase: null | { impressions: number; clicks: number };
};
const number = new Intl.NumberFormat("fa-IR");
const labelDate = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian", month: "short", day: "numeric", timeZone: "Asia/Tehran",
});
const longDate = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran",
});
const timeStamp = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit",
});
const ranges = [1, 7, 30, 90] as const;
const areaNames: Record<string, string> = {
  home: "صفحهٔ اصلی", wiki: "ویکی", shop: "فروشگاه", chart: "چارت تولد",
  sky: "آسمان", compare: "تحلیل رابطه", other: "صفحات دیگر",
};
const sourceNames: Record<string, string> = {
  direct: "مستقیم", google: "گوگل", bing: "بینگ", search: "جست‌وجوگرهای دیگر",
  instagram: "اینستاگرام", telegram: "تلگرام", social: "شبکه‌های اجتماعی", external: "سایت‌های دیگر",
};
const colors = ["#6798bd", "#92b5d0", "#a5bbc9", "#577a9c", "#b8d1e2", "#829fb8", "#c5d6e2", "#d8e4ed"];
const chartLabels: Record<ChartKey, string> = {
  views: "بازدید صفحات", sessions: "بازدیدهای جداگانه",
  seconds: "زمان حضور فعال", productClicks: "کلیک به محصولات",
};
const sectionCopy: Record<AnalyticsSection, { title: string; description: string }> = {
  overview: { title: "نبض هالیوس", description: "روندها، رشد و بخش‌های اثرگذار سایت در یک نگاه." },
  live: { title: "هالیوس همین حالا", description: "رفت‌وآمد زنده و تغییر فعالیت بازدیدکننده‌ها در طول یک ساعت." },
  traffic: { title: "بازدید و ورودی‌ها", description: "بازدیدکننده‌ها از کجا میان و اول کدوم صفحه رو می‌بینن؟" },
  content: { title: "عملکرد محتوا", description: "مقاله‌ها و صفحات محصول چقدر دیده می‌شن و چقدر مخاطب رو همراه می‌کنن؟" },
  time: { title: "زمان حضور در صفحات", description: "زمان فعال روی هر صفحه و مجموع زمانی که یک روز در هالیوس گذرونده شده." },
  sales: { title: "فروش و مسیر خرید", description: "از علاقه به محصولات تا سفارش‌ها و پرداخت‌های واقعی." },
  tools: { title: "ابزارها و تجربه‌ها", description: "شروع و تکمیل چارت، تحلیل رابطه و استفاده از آسمان امروز." },
};

function num(value: number) { return number.format(value); }
function time(seconds: number) {
  if (seconds < 60) return num(Math.round(seconds)) + " ثانیه";
  if (seconds < 3600) return num(Math.floor(seconds / 60)) + " دقیقه و " +
    num(Math.floor(seconds % 60)) + " ثانیه";
  const hours = Math.floor(seconds / 3600);
  return num(hours) + " ساعت و " + num(Math.floor((seconds % 3600) / 60)) + " دقیقه";
}
function date(value: string, full = false) {
  return (full ? longDate : labelDate).format(new Date(value + "T12:00:00Z"));
}
function percent(part: number, total: number) {
  return total ? (part * 100 / total).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + "٪" : "—";
}
function delta(current: number, previous: number) {
  if (!previous) return current ? "آغاز ثبت در این بازه" : "بدون تغییر";
  const change = ((current - previous) / previous * 100);
  return (change > 0 ? "+" : "") +
    change.toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + "٪ نسبت به دورهٔ قبل";
}
function pathName(path: string, titles?: Record<string, string>): string {
  if (titles?.[path]) return titles[path];
  if (path === "/") return "صفحهٔ اصلی";
  const names: Record<string, string> = {
    "/wiki": "ویکی", "/shop": "فروشگاه", "/chart": "چارت تولد",
    "/compare": "تحلیل رابطه", "/sky": "آسمان امروز",
    "/shop/birth-sky-map": "تابلوی آسمان تولد",
    "/shop/milky-way-print": "تابلوی راه شیری",
    "/shop/moon-phase-print": "تابلوی ماه",
    "/shop/checkout": "ثبت سفارش", "/shop/cart": "سبد خرید",
    "/shop/payment": "پرداخت", "/product": "محصولات",
  };
  if (names[path]) return names[path];
  if (path.startsWith("/wiki/")) return path.split("/").pop()?.replaceAll("-", " ") ?? path;
  return path;
}
function sumPages(pages: AnalyticsPageRow[], prefix: string) {
  return pages.filter(p => p.path.startsWith(prefix)).reduce((total, p) => total + p.views, 0);
}
function valueFor(point: AnalyticsDailyPoint, metric: ChartKey) {
  return metric === "seconds" ? point.seconds / 60 : point[metric];
}
function pathSvg(values: number[], width: number, height: number, maximum: number) {
  const x = (i: number) => 22 + i * (width - 44) / Math.max(1, values.length - 1);
  const y = (v: number) => 18 + (height - 38) * (1 - v / Math.max(1, maximum));
  return values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
}
function MetricCard({ title, value, note, change, series }: {
  title: string; value: string; note?: string; change?: string; series?: number[];
}) {
  const max = Math.max(1, ...(series ?? []));
  return <div className={styles.metricCard}>
    <div className={styles.metricTop}><span>{title}</span><i aria-hidden="true" /></div>
    <strong>{value}</strong>
    {series && series.length > 1 ? <svg className={styles.sparkline} viewBox="0 0 140 40"
      role="img" aria-label={"روند " + title} preserveAspectRatio="none">
      <path d={pathSvg(series, 140, 40, max)} fill="none" stroke="#80a9c9" strokeWidth="2.5" />
    </svg> : <div className={styles.sparklineSpace} />}
    <div className={styles.metricNote}>{change ?? note ?? "در بازهٔ انتخاب‌شده"}</div>
  </div>;
}
function Panel({ title, extra, children, className = "" }: {
  title: string; extra?: string; children: ReactNode; className?: string;
}) {
  return <section className={[styles.panel, className].filter(Boolean).join(" ")}>
    <header className={styles.panelHeader}>
      <h3>{title}</h3>{extra ? <span>{extra}</span> : null}
    </header>
    {children}
  </section>;
}
function TrendChart({ current, previous, metric, onMetric }: {
  current: AnalyticsDailyPoint[]; previous?: AnalyticsDailyPoint[];
  metric: ChartKey; onMetric?: (key: ChartKey) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 820; const h = 235;
  const values = current.map(p => valueFor(p, metric));
  const comparison = previous?.map(p => valueFor(p, metric)) ?? [];
  const maximum = Math.max(1, ...values, ...comparison);
  const index = hover === null ? null : Math.min(Math.max(hover, 0), current.length - 1);
  const point = index === null ? null : current[index];
  const xFor = (i: number) => 22 + i * (w - 44) / Math.max(1, current.length - 1);
  const yFor = (v: number) => 18 + (h - 38) * (1 - v / maximum);
  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!current.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const relative = (event.clientX - bounds.left) / Math.max(1, bounds.width);
    setHover(Math.round(Math.max(0, Math.min(1, relative)) * (current.length - 1)));
  };
  return <div className={styles.trendWrap}>
    {onMetric ? <div className={styles.chartModes}>
      {(Object.keys(chartLabels) as ChartKey[]).map(key =>
        <button type="button" key={key} aria-pressed={metric === key}
          onClick={() => { onMetric(key); setHover(null); }}>{chartLabels[key]}</button>)}
    </div> : null}
    {point ? <div className={styles.chartTooltip}>
      <b>{date(point.day, true)}</b>
      <span>{metric === "seconds" ? time(point.seconds) : num(valueFor(point, metric))} · {chartLabels[metric]}</span>
      {comparison.length ? <small>دورهٔ قبل: {metric === "seconds" ?
        time((previous?.[index ?? 0]?.seconds ?? 0)) :
        num(comparison[index ?? 0] ?? 0)}</small> : null}
    </div> : null}
    {current.length ? <>
      <svg className={styles.trend} viewBox={"0 0 " + w + " " + h} preserveAspectRatio="none"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        aria-label={"نمودار " + chartLabels[metric]} role="img">
        {[0, 1, 2, 3, 4].map(i => <line key={i} x1="20" x2={w - 20}
          y1={20 + i * (h - 40) / 4} y2={20 + i * (h - 40) / 4}
          stroke="#e4edf5" strokeWidth="1" />)}
        {comparison.length > 1 ? <path d={pathSvg(comparison, w, h, maximum)}
          stroke="#b7c6d3" strokeDasharray="6 7" strokeWidth="2.5" fill="none" /> : null}
        {current.length > 1 ? <path d={pathSvg(values, w, h, maximum)}
          stroke="#6399c5" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {values.map((value, i) => (current.length === 1 || i === index) ?
          <circle key={i} cx={xFor(i)} cy={yFor(value)} r={i === index ? 6 : 4}
            fill="#6399c5" stroke="white" strokeWidth="2" /> : null)}
        {index !== null ? <line x1={xFor(index)} x2={xFor(index)}
          y1="15" y2={h - 15} stroke="#9ebbd1" strokeDasharray="4 5" /> : null}
      </svg>
      <div className={styles.xLabels}>
        {[0, Math.floor((current.length - 1) / 2), current.length - 1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(i => <span key={i}>{date(current[i].day)}</span>)}
      </div>
      {comparison.length ? <div className={styles.legend}>
        <span><i className={styles.legendCurrent} /> بازهٔ انتخابی</span>
        <span><i className={styles.legendPrevious} /> بازهٔ قبل</span>
      </div> : null}
    </> : <p className={styles.empty}>هنوز داده‌ای برای این نمودار ثبت نشده.</p>}
  </div>;
}
function ActivityBars({ values, formatLabel }: {
  values: Array<{ label: string; value: number; detail?: string }>;
  formatLabel?: (value: number) => string;
}) {
  const maximum = Math.max(1, ...values.map(v => v.value));
  return <div className={styles.activityList}>
    {values.length ? values.map((item, i) =>
      <div className={styles.activityRow} key={i}>
        <div className={styles.activityHead}><span title={item.label}>{item.label}</span>
          <strong>{formatLabel ? formatLabel(item.value) : num(item.value)}</strong></div>
        <div className={styles.activityTrack}><span
          style={{ width: (100 * item.value / maximum) + "%" }} /></div>
        {item.detail ? <small>{item.detail}</small> : null}
      </div>) : <p className={styles.empty}>هنوز اطلاعاتی برای نمایش ثبت نشده.</p>}
  </div>;
}
function MiniBars({ data, mode = "minute" }: {
  data: Array<{ value: number; label: string }>; mode?: "minute" | "hour";
}) {
  const maximum = Math.max(1, ...data.map(p => p.value));
  return <div className={styles.barsWrap}>
    <div className={styles.minuteBars}>
      {data.map((point, i) => <div className={styles.barSlot}
        title={point.label + " · " + num(point.value)} key={i}>
        <span style={{ height: Math.max(point.value ? 4 : 1, 100 * point.value / maximum) + "%" }} />
      </div>)}
    </div>
    <div className={styles.barLabels}>
      {mode === "minute" ? <><span>۶۰ دقیقه پیش</span><span>۳۰ دقیقه پیش</span><span>اکنون</span></> :
        <><span>۰۰:۰۰</span><span>۱۲:۰۰</span><span>۲۳:۰۰</span></>}
    </div>
  </div>;
}
function Donut({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const sum = rows.reduce((total, row) => total + row.value, 0);
  let position = 0;
  const segments = rows.filter(r => r.value > 0).map((row, index) => {
    const start = position; position += row.value / Math.max(1, sum) * 100;
    return colors[index % colors.length] + " " + start + "% " + position + "%";
  });
  const background = segments.length ? "conic-gradient(" + segments.join(",") + ")" :
    "conic-gradient(#e4edf5 0% 100%)";
  return <div className={styles.donutLayout}>
    <div className={styles.donut} style={{ background }}>
      <span><strong>{num(sum)}</strong><small>بازدید ثبت‌شده</small></span>
    </div>
    <div className={styles.donutLegend}>
      {rows.length ? rows.map((row, i) => <div key={row.label}>
        <i style={{ background: colors[i % colors.length] }} />
        <span>{row.label}</span><b>{percent(row.value, sum)}</b>
      </div>) : <p className={styles.empty}>هنوز بازدیدی ثبت نشده.</p>}
    </div>
  </div>;
}
function PageTable({ rows, onDetail, showDaily = false, titles }: {
  rows: AnalyticsPageRow[]; onDetail: (path: string) => void; showDaily?: boolean;
  titles?: Record<string, string>;
}) {
  const [sort, setSort] = useState<SortKey>(showDaily ? "seconds" : "views");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => rows.filter(row =>
    !filter || row.path.toLowerCase().includes(filter.toLowerCase()) ||
    pathName(row.path, titles).toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => b[sort] - a[sort] || a.path.localeCompare(b.path)), [rows, sort, filter, titles]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(Math.min(page, pageCount - 1) * pageSize,
    (Math.min(page, pageCount - 1) + 1) * pageSize);
  return <div className={styles.pageTable}>
    <div className={styles.tableControls}>
      <label className={styles.searchLabel}>جست‌وجوی صفحه
        <input type="search" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}
          placeholder="نام مقاله یا نشانی صفحه" />
      </label>
      <label className={styles.sortLabel}>مرتب‌سازی
        <select value={sort} onChange={e => { setSort(e.target.value as SortKey); setPage(0); }}>
          <option value="seconds">بیشترین زمان حضور</option>
          <option value="averageSeconds">میانگین حضور</option>
          <option value="views">بیشترین بازدید</option>
          <option value="sessions">بیشترین بازدید جداگانه</option>
          <option value="scroll90">رسیدن به انتهای صفحه</option>
        </select>
      </label>
    </div>
    <div className={styles.tableScroll}>
      <table>
        <thead><tr><th>صفحه</th><th>بازدید</th><th>میانگین حضور</th>
          <th>مجموع زمان</th><th>عمق ۹۰٪</th><th>جزئیات</th></tr></thead>
        <tbody>{visible.map(row => <tr key={row.path}>
          <td className={styles.pageCell}>
            <Link href={row.path} target="_blank" rel="noreferrer">{pathName(row.path, titles)}</Link>
            <small dir="ltr">{row.path}</small>
          </td>
          <td>{num(row.views)}</td>
          <td>{time(row.averageSeconds)}</td>
          <td>{time(row.seconds)}</td>
          <td>{num(row.scroll90)}</td>
          <td><button className={styles.textButton} onClick={() => onDetail(row.path)}
            type="button">بررسی صفحه</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!filtered.length ? <p className={styles.empty}>برای این انتخاب، صفحه‌ای با بازدید ثبت‌شده پیدا نشد.</p> : null}
    <div className={styles.tableFooter}>
      <span>{num(filtered.length)} صفحه · نمایش {num(visible.length)} مورد</span>
      {pageCount > 1 ? <div>
        <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>قبلی</button>
        <span>{num(Math.min(page, pageCount - 1) + 1)} از {num(pageCount)}</span>
        <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>بعدی</button>
      </div> : null}
    </div>
  </div>;
}

export function HalleusAnalyticsPanel({ token, activeSection }: {
  token: string; activeSection: AnalyticsSection;
}) {
  const [query, setQuery] = useState("days=7");
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customThrough, setCustomThrough] = useState("");
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [metric, setMetric] = useState<ChartKey>("views");
  const [detailPath, setDetailPath] = useState<string | null>(null);
  const [detail, setDetail] = useState<PageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const read = async () => {
      try {
        const response = await fetch("/api/admin/analytics?" + query, {
          headers: { authorization: "Bearer " + token }, cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json() as { ok?: boolean; dashboard?: AnalyticsDashboard };
        if (!response.ok || !body.ok || !body.dashboard) throw Error("Unable to fetch");
        if (alive) { setData(body.dashboard); setError(""); setUpdatedAt(new Date().toISOString()); }
      } catch {
        if (alive) setError("در دریافت آمار مشکلی پیش اومده. دوباره تازه‌سازی کن.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), 20_000);
    return () => { alive = false; controller.abort(); window.clearInterval(timer); };
  }, [token, query, revision]);

  useEffect(() => {
    if (!detailPath) return;
    let alive = true;
    const controller = new AbortController();
    const params = new URLSearchParams(query);
    params.set("page", detailPath);
    void fetch("/api/admin/analytics?" + params.toString(), {
      headers: { authorization: "Bearer " + token }, cache: "no-store", signal: controller.signal,
    }).then(async response => {
      const body = await response.json() as { ok?: boolean; page?: PageDetail };
      if (!response.ok || !body.ok || !body.page) throw Error("Unable to fetch");
      if (alive) setDetail(body.page);
    }).catch(() => { if (alive) setDetailError("جزئیات صفحه دریافت نشد."); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [detailPath, query, token]);

  const current = data?.totals;
  const previous = data?.previous;
  const sources = useMemo(() => data?.sources.map(row => ({
    label: sourceNames[row.source] ?? "سایر", value: row.views,
  })) ?? [], [data]);
  const topContent = useMemo(() => data?.pages.filter(row => row.path.startsWith("/wiki/"))
    .sort((a, b) => b.seconds - a.seconds).slice(0, 8) ?? [], [data]);
  const maxLive = data?.online.now ?? 0;
  const selected = sectionCopy[activeSection];
  const periodLabel = data ? date(data.window.from, true) +
    (data.window.from === data.window.through ? "" : " تا " + date(data.window.through, true)) : "—";

  function preset(days: number) {
    setQuery("days=" + days);
    setRevision(n => n + 1);
    setLoading(true);
    setData(null);
    setCustomOpen(false);
    setDetailPath(null);
  }
  function applyCustom() {
    if (!customFrom || !customThrough || customFrom > customThrough) {
      setError("بازهٔ زمانی رو درست انتخاب کن.");
      return;
    }
    const params = new URLSearchParams({ from: customFrom, through: customThrough });
    setQuery(params.toString());
    setData(null);
    setLoading(true);
    setDetailPath(null);
    setCustomOpen(false);
  }
  function openDetail(path: string) {
    setDetailPath(path);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
  }
  function changeDay(day: string) {
    const params = new URLSearchParams(query);
    params.set("day", day);
    setQuery(params.toString());
    setLoading(true);
    setDetailPath(null);
  }

  return <div className={styles.workspace} dir="rtl">
    <div className={styles.heading}>
      <div className={styles.headingCopy}>
        <span className={styles.overline}><i /> آمار اختصاصی هالیوس</span>
        <h2>{selected.title}</h2>
        <p>{selected.description}</p>
      </div>
      <div className={styles.liveStatus}>
        <span className={styles.liveDot}/><span>آمار زنده</span>
        {updatedAt ? <small>به‌روزرسانی {timeStamp.format(new Date(updatedAt))}</small> : null}
      </div>
    </div>

    <div className={styles.toolbar}>
      <div className={styles.ranges} aria-label="بازهٔ آمار">
        {ranges.map(days => <button type="button" key={days}
          aria-pressed={data?.window.preset === days || query === "days=" + days}
          onClick={() => preset(days)}>{days === 1 ? "امروز" : num(days) + " روز"}</button>)}
        <button type="button" aria-pressed={customOpen || (data?.window.preset === null)}
          onClick={() => { setCustomOpen(v => !v); setCustomFrom(data?.window.from ?? "");
            setCustomThrough(data?.window.through ?? ""); }}>بازهٔ دلخواه</button>
      </div>
      <div className={styles.rangeRight}>
        <span className={styles.dateText}>{periodLabel}</span>
        <button type="button" className={styles.refresh} disabled={loading}
          onClick={() => { setRevision(n => n + 1); setLoading(true); }}>⟳ تازه‌سازی</button>
      </div>
    </div>
    {customOpen ? <div className={styles.customRange}>
      <label>از روز<input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></label>
      <label>تا روز<input type="date" value={customThrough} onChange={e => setCustomThrough(e.target.value)} /></label>
      <button type="button" onClick={applyCustom}>نمایش آمار</button>
      <small>بازهٔ دلخواه تا ۹۰ روز</small>
    </div> : null}

    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {!data && loading ? <div className={styles.loading}>در حال دریافت آمار هالیوس…</div> : null}
    {data && !data.ready ? <div className={styles.emptyCard}>
      <h3>ثبت آمار جدید هنوز آماده نیست</h3>
      <p>داده‌های بازدید و حضور پس از فعال‌سازی در همین قسمت ظاهر می‌شن.</p>
    </div> : null}

    {data?.ready ? <>
      {activeSection === "overview" ? <>
        <div className={styles.kpiGrid}>
          <MetricCard title="بازدید صفحات" value={num(current?.views ?? 0)}
            change={delta(current?.views ?? 0, previous?.views ?? 0)}
            series={data.daily.map(v => v.views)} />
          <MetricCard title="زمان حضور فعال" value={time(current?.seconds ?? 0)}
            change={delta(current?.seconds ?? 0, previous?.seconds ?? 0)}
            series={data.daily.map(v => v.seconds)} />
          <MetricCard title="بازدیدهای جداگانه" value={num(current?.sessions ?? 0)}
            change={delta(current?.sessions ?? 0, previous?.sessions ?? 0)}
            series={data.daily.map(v => v.sessions)} />
          <MetricCard title="افراد آنلاین" value={num(maxLive)}
            note={"۵ دقیقهٔ اخیر: " + num(data.online.five)} />
        </div>
        <Panel title="روند عملکرد هالیوس" extra="مقایسه با بازهٔ قبل">
          <TrendChart current={data.daily} previous={data.previousDaily}
            metric={metric} onMetric={setMetric} />
        </Panel>
        <div className={styles.twoColumns}>
          <Panel title="بازدید از کجا میاد؟" extra="کانال‌های ورودی">
            <Donut rows={sources} />
          </Panel>
          <Panel title="بیشترین توجه به صفحه‌ها" extra="بر اساس زمان حضور">
            <ActivityBars values={data.pages.slice().sort((a,b) => b.seconds - a.seconds)
              .slice(0,6).map(p => ({ label: pathName(p.path, data.titles), value: p.seconds,
                detail: num(p.views) + " بازدید" }))} formatLabel={time} />
          </Panel>
        </div>
        <div className={styles.kpiGrid}>
          <MetricCard title="کلیک محصولات" value={num(current?.productClicks ?? 0)}
            change={delta(current?.productClicks ?? 0, previous?.productClicks ?? 0)} />
          <MetricCard title="شروع ساخت چارت" value={num(current?.chartStarts ?? 0)}
            change={delta(current?.chartStarts ?? 0, previous?.chartStarts ?? 0)} />
          <MetricCard title="گزارش‌های ساخته‌شده" value={num(data.growth.reports)} />
          {data.commerce ? <MetricCard title="فروش تأییدشده"
            value={num(data.commerce.verifiedToman) + " تومان"} /> :
            <MetricCard title="عضویت‌های جدید" value={num(data.growth.registrations)} />}
        </div>
      </> : null}

      {activeSection === "live" ? <>
        <div className={styles.liveLayout}>
          <div className={styles.liveHero}>
            <span><i className={styles.liveDot} /> آنلاین همین حالا</span>
            <strong>{num(data.online.now)}</strong>
            <p>بازدیدکننده‌های فعال در حدود ۲ دقیقهٔ اخیر</p>
            <div className={styles.liveStats}>
              <div><b>{num(data.online.five)}</b><span>۵ دقیقهٔ اخیر</span></div>
              <div><b>{num(data.online.thirty)}</b><span>۳۰ دقیقهٔ اخیر</span></div>
            </div>
          </div>
          <Panel title="فعالیت در یک ساعت اخیر" extra="تعداد نشست‌های فعال در هر دقیقه">
            <MiniBars data={data.online.minute.map(row => ({
              label: timeStamp.format(new Date(row.minute)), value: row.count,
            }))}/>
          </Panel>
        </div>
        <div className={styles.twoColumns}>
          <Panel title="آنلاین‌ها در کدام بخش‌اند؟">
            <ActivityBars values={data.online.areas.map(row => ({
              label: areaNames[row.area] ?? "سایر صفحه‌ها", value: row.count,
            }))} />
          </Panel>
          <Panel title="صفحات فعال در همین لحظه">
            <ActivityBars values={data.online.pages.map(row => ({
              label: pathName(row.path, data.titles), value: row.count,
            }))}/>
          </Panel>
        </div>
      </> : null}

      {activeSection === "traffic" ? <>
        <div className={styles.kpiGrid}>
          <MetricCard title="بازدید" value={num(current?.views ?? 0)}
            change={delta(current?.views ?? 0, previous?.views ?? 0)} />
          <MetricCard title="بازدیدهای جداگانه" value={num(current?.sessions ?? 0)}
            change={delta(current?.sessions ?? 0, previous?.sessions ?? 0)} />
          <MetricCard title="ورود به سایت" value={num(current?.entrances ?? 0)}
            note="اولین صفحهٔ هر بازدید" />
          <MetricCard title="میانگین زمان حضور" value={time(current?.sessions ?
            Math.round(current.seconds / current.sessions) : 0)} />
          <MetricCard title="بازدید از مرورگرهای تازه" value={num(current?.newVisits ?? 0)}
            note="بر اساس سابقهٔ همین مرورگر" />
          <MetricCard title="بازدید از مرورگرهای بازگشتی" value={num(current?.returningVisits ?? 0)}
            note="شمارش تقریبی بازگشت به سایت" />
          <MetricCard title="ورود از کمپین‌های تبلیغاتی" value={num(current?.campaignVisits ?? 0)}
            note="ورودی‌های دارای نشانگر شناخته‌شدهٔ تبلیغ" />
        </div>
        <div className={styles.twoColumns}>
          <Panel title="منابع ورود" extra="سهم از بازدیدها">
            <Donut rows={sources}/>
            <div className={styles.chartFootnote}>
              ورودی‌های تبلیغاتی فقط با نشانگرهای شناخته‌شدهٔ لینک قابل تشخیص هستن.
            </div>
          </Panel>
          <Panel title="صفحه‌های ورودی برتر" extra="شروع بازدید از این صفحه‌ها">
            <ActivityBars values={data.pages.slice().sort((a,b) => b.entrances - a.entrances)
              .filter(row => row.entrances > 0).slice(0,10)
              .map(row => ({ label: pathName(row.path, data.titles), value: row.entrances }))}/>
          </Panel>
        </div>
        <Panel title="روند جذب بازدیدکننده‌ها" extra="بازدید و فعالیت در روزهای مختلف">
          <TrendChart current={data.daily} previous={data.previousDaily}
            metric={metric} onMetric={setMetric}/>
        </Panel>
      </> : null}

      {activeSection === "content" ? <>
        <div className={styles.kpiGrid}>
          <MetricCard title="بازدید ویکی" value={num(sumPages(data.pages, "/wiki"))}/>
          <MetricCard title="زمان حضور در ویکی" value={time(data.pages.filter(p => p.path.startsWith("/wiki"))
            .reduce((sum,p) => sum + p.seconds, 0))}/>
          <MetricCard title="کلیک لینک‌های داخلی" value={num(current?.internalClicks ?? 0)}/>
          <MetricCard title="کلیک ویترین‌های ویکی" value={num(data.showcase?.clicks ?? 0)}/>
        </div>
        <div className={styles.twoColumns}>
          <Panel title="مقاله‌هایی که مخاطب رو نگه می‌دارن" extra="مجموع زمان مطالعهٔ فعال">
            <ActivityBars values={topContent.map(row => ({
              label: pathName(row.path, data.titles), value: row.seconds,
              detail: num(row.views) + " بازدید · میانگین " + time(row.averageSeconds),
            }))} formatLabel={time} />
          </Panel>
          <Panel title="تعامل با محتوا">
            <ActivityBars values={[
              { label: "رسیدن به نیمهٔ صفحه", value: current?.scroll50 ?? 0 },
              { label: "رسیدن به ۹۰٪ صفحه", value: current?.scroll90 ?? 0 },
              { label: "کلیک لینک‌های داخلی ویکی", value: current?.internalClicks ?? 0 },
              { label: "کلیک به محصولات", value: current?.productClicks ?? 0 },
            ]}/>
          </Panel>
        </div>
        <Panel title="صفحه‌ها و عملکردشون" extra={num(data.pages.length) + " صفحه در این بازه"}>
          <PageTable rows={data.pages} titles={data.titles} onDetail={openDetail}/>
        </Panel>
      </> : null}

      {activeSection === "time" ? <>
        <div className={styles.dayHeader}>
          <div><strong>گزارش روزانهٔ حضور</strong>
            <span>روز موردنظر رو انتخاب کن تا زمان تک‌تک صفحه‌ها دیده بشه.</span></div>
          <label>انتخاب روز
            <input type="date" min={data.window.from} max={data.window.through}
              value={data.window.selectedDay} onChange={e => changeDay(e.target.value)} />
          </label>
        </div>
        <div className={styles.kpiGrid}>
          <MetricCard title="مجموع زمان حضور فعال" value={time(data.dayTotal.seconds)}
            note="جمع زمان حضور تمام بازدیدها در این روز" />
          <MetricCard title="میانگین هر بازدید صفحه" value={time(data.dayTotal.views ?
            Math.round(data.dayTotal.seconds / data.dayTotal.views) : 0)} />
          <MetricCard title="میانگین هر بازدید سایت" value={time(data.dayTotal.sessions ?
            Math.round(data.dayTotal.seconds / data.dayTotal.sessions) : 0)} />
          <MetricCard title="صفحات بازدیدشده" value={num(data.dayPages.filter(p => p.views > 0).length)}
            note="صفحه‌هایی با بازدید ثبت‌شده" />
        </div>
        <Panel title="چه ساعتی بیشتر در هالیوس موندن؟" extra={date(data.window.selectedDay, true)}>
          <MiniBars mode="hour" data={Array.from({length:24}, (_,hour) => ({
            label: num(hour) + ":۰۰",
            value: data.hourly.find(row => row.hour === hour)?.seconds ?? 0,
          }))}/>
          <div className={styles.chartFootnote}>ارتفاع ستون‌ها بر اساس مجموع زمان حضور فعال در هر ساعت است.</div>
        </Panel>
        <Panel title="زمان حضور در تمام صفحات این روز"
          extra={num(data.dayPages.length) + " صفحه با فعالیت ثبت‌شده"}>
          <PageTable rows={data.dayPages} titles={data.titles} showDaily onDetail={openDetail}/>
        </Panel>
        <div className={styles.note}>
          زمان حضور فقط وقتی شمرده می‌شه که صفحه قابل‌مشاهده باشه و نشانه‌ای از فعالیت وجود داشته باشه.
          این زمان، برآورد حضور فعاله و به‌معنای خوانده‌شدن کامل متن نیست.
        </div>
      </> : null}

      {activeSection === "sales" ? <>
        <div className={styles.kpiGrid}>
          <MetricCard title="بازدید صفحات فروشگاه" value={num(sumPages(data.pages, "/shop"))}/>
          <MetricCard title="کلیک به محصولات" value={num(current?.productClicks ?? 0)}
            change={delta(current?.productClicks ?? 0, previous?.productClicks ?? 0)}/>
          <MetricCard title="بررسی سفارش" value={num(current?.checkoutStarts ?? 0)}
            note="رسیدن به مرحلهٔ بررسی مبلغ و ارسال"/>
          {data.commerce ? <MetricCard title="فروش تأییدشده"
            value={num(data.commerce.verifiedToman) + " تومان"} /> :
            <MetricCard title="نمایش ویترین‌ها" value={num(data.showcase?.impressions ?? 0)}/>}
        </div>
        <div className={styles.twoColumns}>
          <Panel title="مراحل ارتباط با فروشگاه" extra="رویدادهای مستقل در بازهٔ انتخابی">
            <div className={styles.journey}>
              {[
                { label: "بازدید فروشگاه", value: sumPages(data.pages, "/shop") },
                { label: "کلیک به محصولات", value: current?.productClicks ?? 0 },
                { label: "بررسی سفارش", value: current?.checkoutStarts ?? 0 },
                ...(data.commerce ? [
                  { label: "سفارش ثبت‌شده", value: data.commerce.orders },
                  { label: "پرداخت تأییدشده", value: data.commerce.verified },
                ] : []),
              ].map((step,i) => <div key={step.label}>
                <span className={styles.stepNumber}>{num(i + 1)}</span>
                <span>{step.label}</span><strong>{num(step.value)}</strong>
              </div>)}
            </div>
            <div className={styles.chartFootnote}>این اعداد رویدادهای جداگانه هستن؛ برای محاسبهٔ نرخ تبدیل شخصی به هم وصل نمی‌شن.</div>
          </Panel>
          <Panel title="ویترین‌های مقاله‌ها" extra="از نمایش تا کلیک">
            {data.showcase ? <>
              <div className={styles.showcaseStats}>
                <div><span>نمایش‌ها</span><strong>{num(data.showcase.impressions)}</strong></div>
                <div><span>کلیک‌ها</span><strong>{num(data.showcase.clicks)}</strong></div>
                <div><span>نرخ کلیک</span><strong>{percent(data.showcase.clicks, data.showcase.impressions)}</strong></div>
              </div>
              <p className={styles.chartFootnote}>برای آمار هر ویترین، بخش «ویترین‌ها» رو باز کن.</p>
            </> : <p className={styles.empty}>آمار ویترین‌ها برای نقش فعلی نمایش داده نمی‌شه.</p>}
          </Panel>
        </div>
        {data.commerce ? <Panel title="محصولات در سفارش‌ها" extra="آمار واقعی فروشگاه">
          <div className={styles.productGrid}>
            {data.commerce.products.length ? data.commerce.products.map(row => <div key={row.product}>
              <span>{({p01:"تابلوی آسمان تولد",p02:"تابلوی راه شیری",p03:"تابلوی ماه"} as Record<string,string>)[row.product] ?? "محصول " + row.product}</span>
              <strong>{num(row.ordered)} عدد سفارش داده‌شده</strong>
              <small>{num(row.verified)} سفارش با پرداخت تأییدشده</small>
            </div>) : <p className={styles.empty}>سفارشی برای این بازه ثبت نشده.</p>}
          </div>
        </Panel> : null}
      </> : null}

      {activeSection === "tools" ? <>
        <div className={styles.kpiGrid}>
          <MetricCard title="شروع ساخت چارت" value={num(current?.chartStarts ?? 0)}/>
          <MetricCard title="چارت تکمیل‌شده" value={num(current?.chartCompletions ?? 0)}/>
          <MetricCard title="شروع تحلیل رابطه" value={num(current?.compareStarts ?? 0)}/>
          <MetricCard title="تحلیل رابطهٔ تکمیل‌شده" value={num(current?.compareCompletions ?? 0)}/>
        </div>
        <div className={styles.twoColumns}>
          <Panel title="مسیر ساخت چارت" extra="شروع و تکمیل واقعی">
            <ActivityBars values={[
              { label: "شروع ساخت چارت", value: current?.chartStarts ?? 0 },
              { label: "ساخت موفق", value: current?.chartCompletions ?? 0 },
              { label: "بازدید صفحهٔ چارت", value: data.pages.find(p => p.path === "/chart")?.views ?? 0 },
            ]}/>
          </Panel>
          <Panel title="تحلیل رابطه و آسمان">
            <ActivityBars values={[
              { label: "شروع تحلیل رابطه", value: current?.compareStarts ?? 0 },
              { label: "تحلیل تکمیل‌شده", value: current?.compareCompletions ?? 0 },
              { label: "بازدید آسمان امروز", value: data.pages.find(p => p.path === "/sky")?.views ?? 0 },
            ]}/>
          </Panel>
        </div>
        <Panel title="تعامل با ابزارهای هالیوس">
          <TrendChart current={data.daily} previous={data.previousDaily}
            metric={metric} onMetric={setMetric}/>
        </Panel>
      </> : null}

      {detailPath ? <section className={styles.detailPane} aria-labelledby="page-detail-title">
        <div className={styles.detailHeader}>
          <div><span>جزئیات صفحه</span><h3 id="page-detail-title">{pathName(detailPath, data.titles)}</h3>
            <small dir="ltr">{detailPath}</small></div>
          <button type="button" onClick={() => setDetailPath(null)}>بستن ×</button>
        </div>
        {detailLoading ? <p className={styles.empty}>در حال دریافت جزئیات…</p> : null}
        {detailError ? <p className={styles.error}>{detailError}</p> : null}
        {detail ? <>
          <div className={styles.detailFacts}>
            <span>بازدید: <b>{num(detail.daily.reduce((t,v) => t + v.views,0))}</b></span>
            <span>زمان حضور: <b>{time(detail.daily.reduce((t,v) => t + v.seconds,0))}</b></span>
            <span>کلیک محصول: <b>{num(detail.daily.reduce((t,v) => t + v.productClicks,0))}</b></span>
          </div>
          <TrendChart current={detail.daily} previous={detail.previousDaily} metric="seconds"/>
          <div className={styles.twoColumns}>
            <Panel title="بازدید از کجا رسیده؟">
              <ActivityBars values={detail.sources.map(row => ({
                label: sourceNames[row.source] ?? "سایر",
                value: row.views, detail: "زمان حضور: " + time(row.seconds),
              }))}/>
            </Panel>
            <Panel title="کلیک محصولات و ویترین‌های این صفحه">
              <div className={styles.showcaseStats}>
                <div><span>کلیک به محصولات</span><strong>{num(detail.sources.reduce((n,row) => n + row.clicks, 0))}</strong></div>
                {detail.showcase ? <>
                  <div><span>نمایش ویترین‌ها</span><strong>{num(detail.showcase.impressions)}</strong></div>
                  <div><span>کلیک ویترین‌ها</span><strong>{num(detail.showcase.clicks)}</strong></div>
                </> : null}
              </div>
            </Panel>
          </div>
          <Link href={detailPath} target="_blank">بازکردن صفحه</Link>
        </> : null}
      </section> : null}

      <p className={styles.footer}>
        آمار بازدید و حضور از زمان فعال‌شدن شمارنده‌ها ثبت می‌شه.
        داده‌های حضور فعال برآوردی هستن و شامل بازدیدهای خارج از شمارش یا بدون اجازهٔ آمارگیری نیستن.
      </p>
    </> : null}
  </div>;
}
