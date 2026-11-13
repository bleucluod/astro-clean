"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  AnalyticsDashboard, AnalyticsRange,
} from "@/lib/admin/halleus-analytics-dashboard";
import styles from "./halleus-analytics.module.css";

export type AnalyticsSection = "overview" | "traffic" | "content" | "sales";
type Metric = { label: string; value: number | string; note?: string };
const format = new Intl.NumberFormat("fa-IR");
const channelNames: Record<string, string> = {
  direct: "مستقیم", google: "گوگل", bing: "بینگ", search: "جست‌وجوگرهای دیگر",
  instagram: "اینستاگرام", telegram: "تلگرام", social: "شبکه‌های اجتماعی", external: "سایت‌های دیگر",
};
const areaNames: Record<string, string> = {
  home: "صفحهٔ اصلی", wiki: "ویکی", shop: "فروشگاه", chart: "چارت تولد",
  sky: "آسمان", compare: "تحلیل رابطه", other: "سایر صفحه‌ها",
};
function number(value: number | string) {
  return typeof value === "number" ? format.format(value) : value;
}
function displayPath(path: string) {
  if (path === "/") return "صفحهٔ اصلی";
  if (path === "/wiki") return "ویکی";
  if (path === "/shop") return "فروشگاه";
  if (path === "/chart") return "چارت تولد";
  if (path === "/sky") return "آسمان";
  if (path === "/compare") return "تحلیل رابطه";
  if (path.startsWith("/wiki/")) return "ویکی / " + path.split("/").pop()?.replaceAll("-", " ");
  if (path.startsWith("/shop/")) return "فروشگاه / " + path.split("/").pop()?.replaceAll("-", " ");
  return path;
}
function percent(part: number, total: number) {
  return total > 0 ? (100 * part / total).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + "٪" : "—";
}
function dateLabel(value: string) {
  const date = new Date(value + "T12:00:00Z");
  return new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", month: "short", day: "numeric" }).format(date);
}
function MetricCards({ items }: { items: Metric[] }) {
  return <div className={styles.metricGrid}>
    {items.map((item) => <article className={styles.metricCard} key={item.label}>
      <span>{item.label}</span>
      <strong>{number(item.value)}</strong>
      {item.note ? <small>{item.note}</small> : null}
    </article>)}
  </div>;
}
function BarList({ rows, total }: {
  rows: { key: string; label: string; value: number; sub?: string }[];
  total: number;
}) {
  return <div className={styles.barList}>
    {rows.length ? rows.map((row) => <div className={styles.barRow} key={row.key}>
      <div className={styles.barTop}>
        <span title={row.label}>{row.label}</span>
        <strong>{number(row.value)}</strong>
      </div>
      <div className={styles.barTrack} aria-hidden="true"><div style={{ width: (total > 0 ? Math.min(100, 100 * row.value / total) : 0) + "%" }} /></div>
      {row.sub ? <small>{row.sub}</small> : null}
    </div>) : <p className={styles.empty}>هنوز بازدیدی برای نمایش ثبت نشده.</p>}
  </div>;
}

export function HalleusAnalyticsPanel({ token, activeSection }: {
  token: string; activeSection: AnalyticsSection;
}) {
  const [days, setDays] = useState<AnalyticsRange>(7);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const response = await fetch("/api/admin/analytics?days=" + days, {
          headers: { authorization: "Bearer " + token }, cache: "no-store",
        });
        const parsed = await response.json() as {
          ok: boolean; dashboard?: AnalyticsDashboard; error?: string;
        };
        if (!response.ok || !parsed.ok || !parsed.dashboard) {
          throw new Error(parsed.error ?? "دریافت آمار انجام نشد.");
        }
        if (alive) {
          setData(parsed.dashboard);
          setError("");
          setUpdatedAt(new Date().toISOString());
        }
      } catch {
        if (alive) setError("در دریافت آمار مشکلی پیش اومده. دوباره تلاش کن.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void read();
    const timer = window.setInterval(() => void read(), 30_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [days, token, revision]);

  const totals = data?.totals;
  const peak = useMemo(() => Math.max(1, ...((data?.daily ?? []).map((item) => item.views))), [data]);
  const daily = useMemo(() => (data?.daily ?? []).slice(-14), [data]);
  const commerce = data?.commerce ?? null;
  const showcase = data?.showcase ?? null;
  const shopViews = useMemo(() => (data?.pages ?? []).filter((p) =>
    p.path === "/shop" || p.path.startsWith("/shop/")).reduce((sum, p) => sum + p.views, 0), [data]);

  return <div dir="rtl" className={styles.workspace}>
    <header className={styles.top}>
      <div>
        <span className={styles.eyebrow}>رفت‌وآمد هالیوس</span>
        <h2>{activeSection === "overview" ? "هالیوس در یک نگاه" :
          activeSection === "traffic" ? "بازدید و افراد آنلاین" :
          activeSection === "content" ? "صفحه‌ها و محتوا" : "فروش و تعامل"}</h2>
        <p>{activeSection === "overview" ? "از حضور بازدیدکننده‌ها تا نتیجهٔ محتوا و فروش، همه در یک قاب." :
          activeSection === "traffic" ? "ببین چند نفر اینجا هستن و از چه راهی به هالیوس رسیدن." :
          activeSection === "content" ? "محتوایی که بیشتر دیده می‌شه و راه‌های رسیدن به محصولات." :
          "از علاقه به محصولات تا سفارش‌ها و پرداخت‌های تأییدشده."}</p>
      </div>
      <div className={styles.controls}>
        <div className={styles.ranges} aria-label="بازهٔ آمار">
          {([7, 30, 90] as const).map((item) => <button key={item} type="button"
            aria-pressed={days === item} onClick={() => { setDays(item); setLoading(true); }}>
            {number(item)} روز
          </button>)}
        </div>
        <button className={styles.refresh} type="button" disabled={loading}
          onClick={() => { setLoading(true); setRevision((r) => r + 1); }}>
          {loading ? "در حال تازه‌سازی…" : "تازه‌سازی"}
        </button>
      </div>
    </header>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {!data && loading ? <p className={styles.empty}>در حال آماده‌کردن آمار…</p> : null}
    {data && !data.ready ? <section className={styles.emptyCard}>
      <h3>آمار بازدید هنوز فعال نشده</h3>
      <p>پس از راه‌اندازی شمارنده، بازدیدها و افراد آنلاین همین‌جا دیده می‌شن.</p>
    </section> : null}
    {data?.ready ? <>
      {activeSection === "overview" || activeSection === "traffic" ? <section className={styles.liveSection}>
        <div className={styles.liveMain}>
          <div className={styles.liveTitle}><span className={styles.liveDot} />
            <span>آنلاین الان</span></div>
          <strong>{number(data.online.now)}</strong>
          <p>بازدیدکننده‌های فعال در حدود دو دقیقهٔ اخیر</p>
          <div className={styles.liveWindows}>
            <span>۵ دقیقهٔ اخیر <b>{number(data.online.five)}</b></span>
            <span>۳۰ دقیقهٔ اخیر <b>{number(data.online.thirty)}</b></span>
          </div>
        </div>
        <div className={styles.liveAreas}>
          <h3>الان کجا شلوغ‌تره؟</h3>
          {data.online.areas.length ? data.online.areas.map((row) =>
            <div key={row.area}><span>{areaNames[row.area] ?? "سایر صفحه‌ها"}</span>
              <strong>{number(row.count)}</strong></div>) :
            <p>فعلاً کسی در صفحه‌های قابل‌شمارش فعال نیست.</p>}
        </div>
      </section> : null}

      {activeSection === "overview" ? <>
        <MetricCards items={[
          { label: "بازدید صفحات", value: totals?.views ?? 0, note: "در بازهٔ انتخاب‌شده" },
          { label: "بازدیدهای جداگانه", value: totals?.sessions ?? 0, note: "یک نفر ممکنه چند بار شمرده بشه" },
          { label: "کلیک به محصولات", value: totals?.productClicks ?? 0 },
          { label: "شروع ساخت چارت", value: totals?.chartStarts ?? 0 },
          { label: "گزارش‌های ساخته‌شده", value: data.growth.reports },
          { label: "عضویت‌های جدید", value: data.growth.registrations },
          ...(commerce ? [
            { label: "سفارش ثبت‌شده", value: commerce.orders },
            { label: "پرداخت تأییدشده", value: commerce.verified },
          ] : []),
        ]}/>
        <section className={styles.panel}>
          <div className={styles.panelHeading}><h3>روند بازدید</h3><span>روزهای اخیر</span></div>
          <div className={styles.trendBars}>
            {daily.length ? daily.map((row) =>
              <div className={styles.trendItem} key={row.day} title={number(row.views) + " بازدید"}>
                <strong>{number(row.views)}</strong>
                <div className={styles.trendTrack}><span style={{ height: (row.views / peak * 100) + "%" }} /></div>
                <small>{dateLabel(row.day)}</small>
              </div>) : <p className={styles.empty}>آمار از زمان فعال‌شدن شمارنده نمایش داده می‌شه.</p>}
          </div>
        </section>
      </> : null}

      {activeSection === "traffic" ? <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}><h3>مسیر ورود بازدیدکننده‌ها</h3></div>
          <BarList total={totals?.views ?? 0}
            rows={data.sources.map((row) => ({
              key: row.source, label: channelNames[row.source] ?? "سایر",
              value: row.views, sub: number(row.sessions) + " بازدید جداگانه",
            }))} />
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHeading}><h3>صفحه‌های پربازدید در همین لحظه</h3></div>
          <BarList total={data.online.now}
            rows={data.online.pages.map((row) => ({
              key: row.path, label: displayPath(row.path), value: row.count,
            }))} />
        </section>
      </div> : null}

      {activeSection === "content" ? <>
        <MetricCards items={[
          { label: "بازدید صفحات", value: totals?.views ?? 0 },
          { label: "کلیک به محصولات", value: totals?.productClicks ?? 0 },
          { label: "شروع ساخت چارت", value: totals?.chartStarts ?? 0 },
          ...(showcase ? [{ label: "کلیک ویترین‌های ویکی", value: showcase.clicks }] : []),
        ]}/>
        <section className={styles.panel}>
          <div className={styles.panelHeading}><h3>پربازدیدترین صفحه‌ها</h3>
            <span>مرتب‌شده بر اساس بازدید</span></div>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th>صفحه</th><th>بازدید</th><th>بازدید جداگانه</th><th>کلیک محصول</th></tr></thead>
              <tbody>{data.pages.map((page) => <tr key={page.path}>
                <td><Link href={page.path} target="_blank" rel="noreferrer">{displayPath(page.path)}</Link>
                  <small>{page.path}</small></td>
                <td>{number(page.views)}</td><td>{number(page.sessions)}</td>
                <td>{number(page.productClicks)}</td>
              </tr>)}</tbody>
            </table>
            {!data.pages.length ? <p className={styles.empty}>هنوز صفحه‌ای در آمار ثبت نشده.</p> : null}
          </div>
        </section>
      </> : null}

      {activeSection === "sales" ? <>
        <MetricCards items={[
          { label: "بازدید صفحه‌های فروشگاه", value: shopViews },
          { label: "کلیک به محصولات", value: totals?.productClicks ?? 0 },
          { label: "شروع ثبت سفارش", value: totals?.checkoutStarts ?? 0 },
          ...(commerce ? [
            { label: "سفارش ثبت‌شده", value: commerce.orders },
            { label: "پرداخت تأییدشده", value: commerce.verified },
            { label: "فروش تأییدشده", value: number(commerce.verifiedToman) + " تومان" },
          ] : []),
        ]}/>
        {commerce ? <section className={styles.panel}>
          <div className={styles.panelHeading}><h3>از بازدید تا خرید</h3></div>
          <div className={styles.funnel}>
            {[
              { name: "بازدید صفحه‌های فروشگاه", value: shopViews },
              { name: "شروع ثبت سفارش", value: totals?.checkoutStarts ?? 0 },
              { name: "سفارش‌های ثبت‌شده", value: commerce.orders },
              { name: "پرداخت‌های تأییدشده", value: commerce.verified },
            ].map((step) => <div key={step.name}>
              <span>{step.name}</span><strong>{number(step.value)}</strong>
            </div>)}
          </div>
          <p className={styles.footnote}>این اعداد رویدادهای جداگانهٔ همین بازه هستن؛ مسیر خرید هر فرد به‌صورت شخصی ردیابی نمی‌شه.</p>
        </section> : <section className={styles.panel}><h3>عملکرد فروش</h3>
          <p className={styles.footnote}>خلاصهٔ سفارش‌ها برای مدیر فروشگاه نمایش داده می‌شه.</p>
        </section>}
        {showcase ? <section className={styles.panel}>
          <div className={styles.panelHeading}><h3>ویترین‌های داخل مقاله‌ها</h3></div>
          <MetricCards items={[
            { label: "نمایش ویترین‌ها", value: showcase.impressions },
            { label: "کلیک ویترین‌ها", value: showcase.clicks },
            { label: "نرخ کلیک ویترین‌ها", value: percent(showcase.clicks, showcase.impressions) },
          ]}/>
          <p className={styles.footnote}>برای جزئیات هر مقاله و محصول، بخش «ویترین‌ها» رو ببین.</p>
        </section> : null}
      </> : null}
      <p className={styles.footer}>
        {updatedAt ? "آخرین بروزرسانی: " + new Intl.DateTimeFormat("fa-IR", {
          timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit",
        }).format(new Date(updatedAt)) : ""}
        <span> · آمار به‌صورت خودکار تازه می‌شه. فقط بازدیدهای قابل‌شمارش در این گزارش هستن.</span>
      </p>
    </> : null}
  </div>;
}
