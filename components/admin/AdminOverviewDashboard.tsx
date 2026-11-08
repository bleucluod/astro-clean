"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { AdminOverviewPayload } from "@/lib/admin/admin-types";
import type { OverviewTrendPayload } from "@/lib/admin/admin-overview-trends";
import styles from "./admin-overview-dashboard.module.css";

type Group = OverviewTrendPayload["groups"][number];
type Step = "day" | "week" | "month";
type Metric = { key: string; label: string; unit?: "toman" };
type Nav = "users" | "orders" | "reports" | "premium" | "wiki" | "telegram" | "audit" | "seo";

const numbers = new Intl.NumberFormat("fa-IR");
const compact = new Intl.NumberFormat("fa-IR", { notation: "compact", maximumFractionDigits: 1 });
const persianDay = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "short", day: "numeric", timeZone: "Asia/Tehran" });
const persianMonth = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long", year: "numeric", timeZone: "Asia/Tehran" });
const persianMonthKey = new Intl.DateTimeFormat("en-US-u-ca-persian", { month: "2-digit", year: "numeric", timeZone: "Asia/Tehran" });
const groupNames: Record<Group, string> = {
  growth: "رشد هالیوس", reports: "گزارش‌ها", shop: "فروشگاه",
  wiki: "ویکی", telegram: "تلگرام", all: "نمای ترکیبی",
};
const reportMetrics: Metric[] = [
  { key: "reports", label: "کل گزارش‌ها" },
  { key: "natal", label: "چارت تولد و سایر" },
  { key: "comparison", label: "چارت مقایسه‌ای" },
  { key: "guest_reports", label: "گزارش مهمان" },
  { key: "account_reports", label: "گزارش حساب‌دار" },
  { key: "public_reports", label: "گزارش عمومی" },
  { key: "private_reports", label: "گزارش خصوصی" },
];
const shopCount: Metric[] = [
  { key: "orders", label: "سفارش ثبت‌شده" },
  { key: "declared", label: "واریز اعلام‌شده" },
  { key: "verified", label: "پرداخت تأییدشده" },
  { key: "shipped", label: "ارسال‌شده" },
];
const shopMoney: Metric[] = [
  { key: "verified_toman", label: "مبلغ پرداخت تأییدشده", unit: "toman" },
  { key: "booked_toman", label: "مبلغ سفارش‌های ثبت‌شده", unit: "toman" },
];
const wikiMetrics: Metric[] = [
  { key: "wiki_published", label: "مقالهٔ منتشرشده" },
  { key: "wiki_drafts", label: "پیش‌نویس موجود، برحسب ساخت" },
  { key: "wiki_scheduled", label: "مقالهٔ در صف، برحسب ساخت" },
  { key: "wiki_failed", label: "تلاش انتشار ناموفق" },
];
const telegramMetrics: Metric[] = [
  { key: "telegram_published", label: "پیام منتشرشده" },
  { key: "telegram_prepared", label: "پیام آماده/پیش‌نویس، برحسب ساخت" },
  { key: "telegram_failed", label: "ارسال ناموفق، برحسب تلاش" },
];
const metricSets: Record<Exclude<Group, "shop">, Metric[]> = {
  growth: [{ key: "reports", label: "گزارش‌ها" }, { key: "users", label: "کاربران جدید" }],
  reports: reportMetrics,
  wiki: wikiMetrics,
  telegram: telegramMetrics,
  all: [
    { key: "reports", label: "گزارش‌ها" },
    { key: "users", label: "کاربران جدید" },
    { key: "orders", label: "سفارش‌ها" },
    { key: "wiki_published", label: "مقاله‌ها" },
    { key: "telegram_published", label: "پیام‌های تلگرام" },
  ],
};
const palette = ["#397bd2", "#2994a6"];
const rangeOptions = [7, 30, 90, 365] as const;
const fallbackGroups: OverviewTrendPayload["groups"] = ["growth", "reports", "all"];
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function bucket(date: string, step: Step) {
  if (step === "day") return date;
  if (step === "week") {
    const weekday = new Date(date + "T12:00:00Z").getUTCDay();
    return addDays(date, -((weekday + 1) % 7)); // Saturday through Friday, Iran workweek.
  }
  // Group by actual Jalali months; Gregorian calendar months would mislead Persian users.
  const key = persianMonthKey.format(new Date(date + "T12:00:00Z"));
  let start = date;
  for (let i = 0; i < 31; i++) {
    const previous = addDays(start, -1);
    if (persianMonthKey.format(new Date(previous + "T12:00:00Z")) !== key) break;
    start = previous;
  }
  return start;
}
function periodLabel(date: string, step: Step) {
  const d = new Date(date + "T12:00:00Z");
  return step === "month" ? persianMonth.format(d) : persianDay.format(d);
}
function sum(dates: string[], values: Map<string, Record<string, number>>, key: string) {
  return dates.reduce((n, date) => n + (values.get(date)?.[key] ?? 0), 0);
}
function changeLabel(now: number, previous: number) {
  if (previous === 0) return now === 0 ? "بدون تغییر" : "جدید در این بازه";
  const percent = Math.round(((now - previous) / previous) * 100);
  return (percent > 0 ? "+" : "") + numbers.format(percent) + "٪ نسبت به دورهٔ قبل";
}
function fmt(value: number, unit?: string) {
  return numbers.format(Math.round(value)) + (unit === "toman" ? " تومان" : "");
}
function compressed(value: number) {
  return compact.format(Math.round(value));
}
function getAllowedMetrics(group: Group, can: OverviewTrendPayload["groups"], amount: boolean): Metric[] {
  if (group === "shop") return amount ? shopMoney : shopCount;
  if (group === "all") return metricSets.all.filter((metric) =>
    !((metric.key === "orders" && !can.includes("shop")) ||
      (metric.key === "wiki_published" && !can.includes("wiki")) ||
      (metric.key === "telegram_published" && !can.includes("telegram"))));
  return metricSets[group];
}

export function AdminOverviewDashboard({
  accessToken, overview, onNavigate,
}: {
  accessToken: string;
  overview: AdminOverviewPayload;
  onNavigate: (tab: Nav, section?: "articles" | "queue" | "overview" | "operations") => void;
}) {
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const [step, setStep] = useState<Step>("day");
  const [group, setGroup] = useState<Group>("growth");
  const [amount, setAmount] = useState(false);
  const [enabled, setEnabled] = useState(["reports", "users"]);
  const [payload, setPayload] = useState<OverviewTrendPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    void Promise.resolve().then(() => {
      if (active) { setLoading(true); setError(""); setPayload(null); }
    });
    void fetch("/api/admin/overview/trends?days=" + days, {
      signal: abort.signal, cache: "no-store", headers: { authorization: "Bearer " + accessToken },
    }).then(async (res) => {
      const body = await res.json() as { trends?: OverviewTrendPayload; error?: string };
      if (!res.ok || !body.trends) throw new Error(body.error || "آمار نمودار دریافت نشد.");
      if (active) setPayload(body.trends);
    }).catch((cause: unknown) => {
      if (active && !abort.signal.aborted) setError(cause instanceof Error ? cause.message : "اتصال به آمار برقرار نشد.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; abort.abort(); };
  }, [accessToken, days, revision]);

  const available = payload?.groups ?? fallbackGroups;
  const activeGroup = available.includes(group) ? group : "growth";
  const options = useMemo(() => getAllowedMetrics(activeGroup, available as OverviewTrendPayload["groups"], amount), [activeGroup, available, amount]);
  const selected = options.filter((m) => enabled.includes(m.key)).slice(0, 2);
  const lines = selected.length ? selected : options.slice(0, 2);

  const prepared = useMemo(() => {
    if (!payload) return null;
    const values = new Map(payload.daily.map((r) => [r.date, r.values]));
    const previousDates = Array.from({ length: days }, (_, i) => addDays(payload.from, i));
    const currentDates = Array.from({ length: days }, (_, i) => addDays(payload.from, days + i));
    const aggregates = new Map<string, Record<string, number>>();
    for (const date of currentDates) {
      const label = bucket(date, step);
      const record = aggregates.get(label) ?? {};
      for (const [key, value] of Object.entries(values.get(date) ?? {})) {
        record[key] = (record[key] ?? 0) + value;
      }
      aggregates.set(label, record);
    }
    const points = Array.from(aggregates, ([date, metrics]) => ({ date, metrics }));
    const totals = (key: string) => ({
      current: sum(currentDates, values, key),
      previous: sum(previousDates, values, key),
    });
    return { points, totals, currentDates };
  }, [days, payload, step]);

  const cardData = prepared ? [
    { title: "گزارش‌های ساخته‌شده", key: "reports", unit: undefined, tab: "reports" as const },
    { title: "کاربران جدید", key: "users", unit: undefined, tab: "users" as const },
    ...(payload?.snapshot.shop ? [
      { title: "سفارش‌های ثبت‌شده", key: "orders", unit: undefined, tab: "orders" as const },
      { title: "فروش تأییدشده", key: "verified_toman", unit: "toman", tab: "orders" as const },
    ] : [
      { title: "گزارش‌های عمومی", key: "public_reports", unit: undefined, tab: "reports" as const },
      { title: "گزارش‌های خصوصی", key: "private_reports", unit: undefined, tab: "reports" as const },
    ]),
  ] : [];
  const alerts = payload ? [
    ...(payload.snapshot.shop ? [
      { label: "واریز منتظر بررسی", count: payload.snapshot.shop.transferDeclared, tab: "orders" as const },
      { label: "پرداخت تأییدشده، منتظر آماده‌سازی", count: payload.snapshot.shop.readyForArtwork, tab: "orders" as const },
      { label: "در حال آماده‌سازی برای ارسال", count: payload.snapshot.shop.preparing, tab: "orders" as const },
      { label: "درخواست لغو سفارش", count: payload.snapshot.shop.cancellationRequested, tab: "orders" as const },
    ] : []),
    { label: "درخواست پرمیوم باز", count: overview.openPremiumRequests, tab: "premium" as const },
    ...(payload.snapshot.wiki ? [{ label: "انتشار ناموفق ویکی", count: payload.snapshot.wiki.failedJobs, tab: "wiki" as const }] : []),
    ...(payload.snapshot.telegram ? [
      { label: "پیام تلگرام ناموفق", count: payload.snapshot.telegram.failed, tab: "telegram" as const },
      { label: "تحویل نامشخص تلگرام", count: payload.snapshot.telegram.uncertain, tab: "telegram" as const },
    ] : []),
  ].filter((alert) => alert.count > 0) : [];

  const chart = prepared?.points ?? [];
  const W = 900, H = 300, left = 56, right = 52, top = 32, bottom = 43;
  const plotW = W - left - right, plotH = H - top - bottom;
  const maxFor = (key: string) => Math.max(1, ...chart.map((p) => p.metrics[key] ?? 0));
  const maxFirst = lines[0] ? maxFor(lines[0].key) : 1;
  const maxSecond = lines[1] ? maxFor(lines[1].key) : maxFirst;
  const twoAxes = lines.length === 2 && (maxFirst > 4 * maxSecond || maxSecond > 4 * maxFirst);
  const commonMax = Math.max(maxFirst, maxSecond, 1);
  const yMax = (index: number) => (twoAxes ? (index === 0 ? maxFirst : maxSecond) : commonMax) * 1.15;
  const xAt = (index: number) => left + (chart.length > 1 ? (plotW * index) / (chart.length - 1) : plotW / 2);
  const yAt = (value: number, seriesIndex: number) => top + plotH * (1 - value / yMax(seriesIndex));
  const pathFor = (metric: Metric, index: number) => chart.map((p, j) =>
    (j ? "L " : "M ") + xAt(j).toFixed(2) + " " + yAt(p.metrics[metric.key] ?? 0, index).toFixed(2)).join(" ");
  const hover = hovered === null || !chart.length ? null : chart[Math.min(hovered, chart.length - 1)];

  function switchGroup(value: Group) {
    setGroup(value); setHovered(null);
    if (value === "growth" || value === "all") setEnabled(["reports", "users"]);
    else if (value === "shop") setEnabled(amount ? ["verified_toman"] : ["orders", "verified"]);
    else if (value === "reports") setEnabled(["reports", "comparison"]);
    else if (value === "wiki") setEnabled(["wiki_published", "wiki_drafts"]);
    else setEnabled(["telegram_published", "telegram_prepared"]);
  }
  function toggle(key: string) {
    setHovered(null);
    setEnabled((current) => current.includes(key) ? current.filter((x) => x !== key) :
      current.length >= 2 ? [current[1], key] : [...current, key]);
  }
  function changeAmount(next: boolean) {
    setAmount(next); setEnabled(next ? ["verified_toman", "booked_toman"] : ["orders", "verified"]);
  }
  function onChartMouse(event: MouseEvent<SVGSVGElement>) {
    if (!chart.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const x = Math.max(0, Math.min(1, (ratio * W - left) / plotW));
    setHovered(Math.round(x * (chart.length - 1)));
  }

  return (
    <div className={styles.dashboard} dir="rtl">
      <section className={styles.topSection} aria-labelledby="overview-growth-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>HALLEUS / GROWTH</span>
            <h3 id="overview-growth-title">عملکرد هالیوس</h3>
            <p>مقایسهٔ بازهٔ انتخابی با بازهٔ قبلی، بر مبنای روز تهران</p>
          </div>
          <button type="button" className={styles.refresh} onClick={() => setRevision((n) => n + 1)} disabled={loading}>{loading ? "در حال دریافت…" : "تازه‌سازی آمار"}</button>
        </div>
        <div className={styles.periodControls}>
          <div className={styles.segment} aria-label="بازهٔ زمانی">
            {rangeOptions.map((range) => <button key={range} type="button" aria-pressed={days === range} onClick={() => {
              setDays(range); setStep(range === 365 ? "month" : range === 90 ? "week" : "day"); setHovered(null);
            }}>{range === 365 ? "۱۲ ماه" : numbers.format(range) + " روز"}</button>)}
          </div>
          <div className={styles.segment} aria-label="تجمیع نمودار">
            {(["day", "week", "month"] as const).map((value) => <button key={value} type="button" aria-pressed={step === value} onClick={() => { setStep(value); setHovered(null); }}>{value === "day" ? "روزانه" : value === "week" ? "هفتگی" : "ماهانه"}</button>)}
          </div>
        </div>

        <div className={styles.kpiGrid}>
          {cardData.map((card) => {
            const current = prepared?.totals(card.key) ?? { current: 0, previous: 0 };
            return <button type="button" className={styles.kpi} key={card.key} onClick={() => onNavigate(card.tab)}>
              <span>{card.title}</span>
              <strong>{fmt(current.current, card.unit)}</strong>
              <small data-trend={current.current > current.previous ? "up" : current.current < current.previous ? "down" : "flat"}>{changeLabel(current.current, current.previous)}</small>
            </button>;
          })}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {!payload && loading ? <div className={styles.loading} role="status">در حال جمع‌آوری آمار تجمیعی…</div> : null}
      </section>

      {prepared && payload ? <section className={styles.chartSection} aria-labelledby="overview-chart-heading">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>TRENDS</span>
            <h3 id="overview-chart-heading">روند فعالیت</h3>
            <p>تا دو شاخص را هم‌زمان انتخاب کن. جزئیات هر نقطه با حرکت موس روی نمودار دیده می‌شود.</p>
          </div>
          {activeGroup === "reports" ? <div className={styles.miniStats}>
            <span>گزارش به‌ازای کاربر جدید: <b>{prepared.totals("users").current ? (prepared.totals("reports").current / prepared.totals("users").current).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "—"}</b></span>
            <span>سهم مهمان از گزارش‌ها: <b>{prepared.totals("reports").current ? numbers.format(Math.round(prepared.totals("guest_reports").current * 100 / prepared.totals("reports").current)) + "٪" : "—"}</b></span>
          </div> : null}
        </div>
        <div className={styles.groupScroller} role="group" aria-label="دستهٔ نمودار">
          {payload.groups.map((g) => <button type="button" key={g} aria-pressed={activeGroup === g} onClick={() => switchGroup(g)}>{groupNames[g]}</button>)}
        </div>
        {activeGroup === "shop" ? <div className={styles.amountMode}>
          <span>نوع شاخص فروشگاه</span>
          <div className={styles.segment}>
            <button type="button" aria-pressed={!amount} onClick={() => changeAmount(false)}>تعداد</button>
            <button type="button" aria-pressed={amount} onClick={() => changeAmount(true)}>مبلغ (تومان)</button>
          </div>
        </div> : null}
        <div className={styles.metricPicker}>
          {options.map((metric) => {
            const checked = lines.some((l) => l.key === metric.key);
            const selectedIndex = lines.findIndex((l) => l.key === metric.key);
            return <button key={metric.key} type="button" aria-pressed={checked} onClick={() => toggle(metric.key)}>
              <span className={styles.seriesDot} style={{ background: checked ? palette[selectedIndex] : "#b8c5d2" }}/>
              <span>{metric.label}</span>
              <span aria-hidden="true">{checked ? "✓" : "+"}</span>
            </button>;
          })}
        </div>
        <div className={styles.chartArea}>
          {twoAxes ? <p className={styles.axisNote}>مقیاس دو شاخص مستقل است؛ محور چپ آبی و محور راست فیروزه‌ای.</p> : null}
          <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="نمودار خطی عملکرد هالیوس" onMouseMove={onChartMouse} onMouseLeave={() => setHovered(null)}>
            {[0, 1, 2, 3, 4].map((n) => {
              const y = top + (plotH * n) / 4;
              return <g key={n}>
                <line x1={left} y1={y} x2={W - right} y2={y} stroke="#e2eaf1" strokeWidth="1"/>
                <text x={left - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#5d7287">{compressed(yMax(0) * (1 - n / 4))}</text>
                {twoAxes ? <text x={W - right + 8} y={y + 4} textAnchor="start" fontSize="12" fill="#348d9c">{compressed(yMax(1) * (1 - n / 4))}</text> : null}
              </g>;
            })}
            {[0, .25, .5, .75, 1].map((pct) => {
              const index = Math.round((chart.length - 1) * pct);
              return <text key={pct} x={xAt(index)} y={H - 10} fontSize="12" fill="#61758a" textAnchor="middle">{chart[index] ? periodLabel(chart[index].date, step) : ""}</text>;
            })}
            {lines.map((metric, i) => <path key={metric.key} d={pathFor(metric, i)} fill="none" stroke={palette[i]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
            {payload.markers.map((marker) => {
              const groupDate = bucket(marker.date, step);
              const index = chart.findIndex((point) => point.date === groupDate);
              return index === -1 ? null : <g key={marker.date}>
                <line x1={xAt(index)} y1={top} x2={xAt(index)} y2={top + plotH} stroke="#7c91a3" strokeWidth="1" strokeDasharray="4 5"/>
                <circle cx={xAt(index)} cy={top + plotH + 10} r="6" fill="#7c91a3"/>
                <title>{marker.label}</title>
              </g>;
            })}
            {hover && hovered !== null ? <g>
              <line x1={xAt(hovered)} y1={top} x2={xAt(hovered)} y2={top + plotH} stroke="#91a5b6" strokeDasharray="3 4"/>
              {lines.map((metric, i) => <circle key={metric.key} cx={xAt(hovered)} cy={yAt(hover.metrics[metric.key] ?? 0, i)} r="5" fill={palette[i]} stroke="white" strokeWidth="2"/>)}
            </g> : null}
          </svg>
          {hover && hovered !== null ? <div className={styles.tooltip} style={{ left: Math.max(15, Math.min(85, 100 * xAt(hovered) / W)) + "%" }}>
            <strong>{periodLabel(hover.date, step)}</strong>
            {lines.map((metric, i) => <span key={metric.key}><i style={{ background: palette[i] }} />{metric.label}: <b>{fmt(hover.metrics[metric.key] ?? 0, metric.unit)}</b></span>)}
          </div> : null}
        </div>
        <div className={styles.chartFoot}>
          <span>بازهٔ قبلی با همین تعداد روز مقایسه می‌شود؛ روزهای بدون رویداد صفر هستند.</span>
          <label>نقطهٔ انتخابی
            <input type="range" min={0} max={Math.max(0, chart.length - 1)} value={hovered ?? Math.max(0, chart.length - 1)} onChange={(event) => setHovered(Number(event.target.value))} aria-label="مشاهدهٔ نقطهٔ نمودار با صفحه‌کلید یا لمس"/>
          </label>
        </div>
      </section> : null}

      <div className={styles.bottomGrid}>
        <section className={styles.actionPanel}>
          <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>ACTION CENTER</span><h3>نیازمند رسیدگی</h3><p>فقط کارهایی که واقعاً اقدام می‌خواهند.</p></div></div>
          {payload && alerts.length === 0 ? <p className={styles.allClear}>فعلاً موردی نیازمند رسیدگی نیست.</p> : null}
          {alerts.map((alert) => <button className={styles.actionRow} type="button" key={alert.label} onClick={() => onNavigate(alert.tab, alert.tab === "wiki" ? "queue" : alert.tab === "telegram" ? "operations" : undefined)}>
            <strong>{fmt(alert.count)}</strong><span>{alert.label}</span><span aria-hidden="true">←</span>
          </button>)}
          <button type="button" className={styles.subtleLink} onClick={() => onNavigate("audit")}>مشاهدهٔ رویدادهای ممیزی ۲۴ ساعت: {fmt(overview.auditEvents24h)} ←</button>
        </section>
        <section className={styles.contentPanel}>
          <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>CONTENT & OPERATIONS</span><h3>محتوا و انتشار</h3><p>خلاصهٔ وضعیت ویکی و تلگرام؛ جزئیات در پنل‌های تخصصی.</p></div></div>
          {payload?.snapshot.wiki ? <button className={styles.contentRow} type="button" onClick={() => onNavigate("wiki", "articles")}>
            <strong>ویکی</strong>
            <span>{fmt(payload.snapshot.wiki.published)} منتشر · {fmt(payload.snapshot.wiki.scheduled)} زمان‌بندی · {fmt(payload.snapshot.wiki.draft)} پیش‌نویس</span><span>←</span>
          </button> : null}
          {payload?.snapshot.telegram ? <button className={styles.contentRow} type="button" onClick={() => onNavigate("telegram", "overview")}>
            <strong>تلگرام</strong>
            <span>{fmt(payload.snapshot.telegram.futureScheduled)} آمادهٔ آینده · {fmt(payload.snapshot.telegram.published)} منتشر</span><span>←</span>
          </button> : null}
          <button className={styles.contentRow} type="button" onClick={() => onNavigate("seo", "overview")}>
            <strong>SEO و Search Console</strong>
            <span>بررسی لینک‌ها و شاخص‌های ایندکس؛ دادهٔ Search Console فقط پس از واردکردن CSV به‌روز می‌شود.</span><span>←</span>
          </button>
          <p className={styles.dataNote}>نمودار گزارش‌ها فقط گزارش‌های حذف‌نشده را می‌شمارد. فروش تأییدشده، مجموع سفارش‌های دارای تأیید پرداخت و لغونشده است؛ جایگزین حسابداری و تسویهٔ بانکی نیست.</p>
        </section>
      </div>
    </div>
  );
}
