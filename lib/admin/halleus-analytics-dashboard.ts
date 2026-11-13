import { asNumber, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import type { VerifiedAdminActor } from "@/lib/admin/admin-auth";
import type { AnalyticsArea, AnalyticsSource } from "@/lib/analytics/first-party";
import { shiftAnalyticsDay, type AnalyticsWindow } from "@/lib/admin/halleus-analytics-range";

export type AnalyticsMetric = {
  views: number; sessions: number; seconds: number; entrances: number;
  newVisits: number; returningVisits: number; campaignVisits: number;
  productClicks: number; internalClicks: number; scroll50: number; scroll90: number;
  chartStarts: number; chartCompletions: number; compareStarts: number;
  compareCompletions: number; checkoutStarts: number;
};
export type AnalyticsDailyPoint = AnalyticsMetric & { day: string };
export type AnalyticsPageRow = AnalyticsMetric & { path: string; averageSeconds: number };
export type AnalyticsSourceRow = AnalyticsMetric & { source: AnalyticsSource };
export type AnalyticsAreaRow = { area: AnalyticsArea; count: number; views?: number; seconds?: number };
export type AnalyticsCommerce = {
  orders: number; verified: number; verifiedToman: number;
  products: Array<{ product: string; ordered: number; verified: number }>;
};
export type AnalyticsDashboard = {
  ready: boolean;
  window: AnalyticsWindow;
  online: {
    now: number; five: number; thirty: number;
    areas: AnalyticsAreaRow[]; pages: Array<{ path: string; count: number }>;
    minute: Array<{ minute: string; count: number }>;
  };
  totals: AnalyticsMetric;
  previous: AnalyticsMetric;
  daily: AnalyticsDailyPoint[];
  previousDaily: AnalyticsDailyPoint[];
  hourly: Array<{ hour: number; views: number; seconds: number; clicks: number }>;
  dayTotal: AnalyticsMetric;
  pages: AnalyticsPageRow[];
  dayPages: AnalyticsPageRow[];
  sources: AnalyticsSourceRow[];
  areas: AnalyticsAreaRow[];
  titles: Record<string, string>;
  showcase: null | { impressions: number; clicks: number };
  growth: { reports: number; registrations: number };
  commerce: AnalyticsCommerce | null;
};

function metric() : AnalyticsMetric {
  return { views: 0, sessions: 0, seconds: 0, entrances: 0,
    newVisits: 0, returningVisits: 0, campaignVisits: 0,
    productClicks: 0, internalClicks: 0, scroll50: 0, scroll90: 0,
    chartStarts: 0, chartCompletions: 0, compareStarts: 0,
    compareCompletions: 0, checkoutStarts: 0 };
}
function rowMetric(row: Record<string, unknown>): AnalyticsMetric {
  return {
    views: asNumber(row.views), sessions: asNumber(row.sessions),
    seconds: asNumber(row.active_seconds), entrances: asNumber(row.entrances),
    newVisits: asNumber(row.new_visits), returningVisits: asNumber(row.returning_visits),
    campaignVisits: asNumber(row.campaign_visits),
    productClicks: asNumber(row.product_clicks), internalClicks: asNumber(row.internal_clicks),
    scroll50: asNumber(row.scroll_50), scroll90: asNumber(row.scroll_90),
    chartStarts: asNumber(row.chart_starts), chartCompletions: asNumber(row.chart_completions),
    compareStarts: asNumber(row.compare_starts), compareCompletions: asNumber(row.compare_completions),
    checkoutStarts: asNumber(row.checkout_starts),
  };
}
function addMetric(a: AnalyticsMetric, b: AnalyticsMetric): AnalyticsMetric {
  return {
    views: a.views + b.views, sessions: a.sessions + b.sessions,
    seconds: a.seconds + b.seconds, entrances: a.entrances + b.entrances,
    newVisits: a.newVisits + b.newVisits,
    returningVisits: a.returningVisits + b.returningVisits,
    campaignVisits: a.campaignVisits + b.campaignVisits,
    productClicks: a.productClicks + b.productClicks,
    internalClicks: a.internalClicks + b.internalClicks,
    scroll50: a.scroll50 + b.scroll50, scroll90: a.scroll90 + b.scroll90,
    chartStarts: a.chartStarts + b.chartStarts,
    chartCompletions: a.chartCompletions + b.chartCompletions,
    compareStarts: a.compareStarts + b.compareStarts,
    compareCompletions: a.compareCompletions + b.compareCompletions,
    checkoutStarts: a.checkoutStarts + b.checkoutStarts,
  };
}
function pageRow(row: Record<string, unknown>): AnalyticsPageRow {
  const values = rowMetric(row);
  return { path: asString(row.page_path), ...values,
    averageSeconds: values.views ? Math.round(values.seconds / values.views) : 0 };
}
function clockText(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}
function empty(window: AnalyticsWindow): AnalyticsDashboard {
  return {
    ready: false, window, online: { now: 0, five: 0, thirty: 0, areas: [], pages: [], minute: [] },
    totals: metric(), previous: metric(), daily: [], previousDaily: [], hourly: [],
    dayTotal: metric(), pages: [], dayPages: [], sources: [], areas: [], titles: {},
    showcase: null, growth: { reports: 0, registrations: 0 }, commerce: null,
  };
}

export async function getHalleusAnalyticsDashboard(
  window: AnalyticsWindow, actor: VerifiedAdminActor,
): Promise<AnalyticsDashboard> {
  const sql = getAdminDatabase();
  const canShop = actor.role === "owner" && actor.capabilities.includes("shop_orders.read");
  const canWiki = actor.capabilities.includes("wiki.read");
  const from = window.from;
  const through = window.through;
  const previousFrom = window.previousFrom;
  const selectedDay = window.selectedDay;

  try {
    const [
      live, liveAreas, livePages, minuteRows, siteRows,
      pageRows, selectedPageRows, sourceRows, areaRows, hourlyRows,
      showcaseRows, ordersRows, productsRows, growthRows, wikiTitleRows,
    ] = await Promise.all([
      sql`
        select count(*) filter (where last_seen >= now() - interval '2 minutes')::int as online,
          count(*) filter (where last_seen >= now() - interval '5 minutes')::int as five,
          count(*) filter (where last_seen >= now() - interval '30 minutes')::int as thirty
        from halleus_private.analytics_live_sessions
      `,
      sql`
        select area, count(*)::int as count
        from halleus_private.analytics_live_sessions
        where last_seen >= now() - interval '2 minutes'
        group by area order by count desc
      `,
      sql`
        select page_path, count(*)::int as count
        from halleus_private.analytics_live_sessions
        where last_seen >= now() - interval '2 minutes'
        group by page_path order by count desc limit 12
      `,
      sql`
        select minute, count(*)::int as count
        from halleus_private.analytics_minute_presence
        where minute >= date_trunc('minute', now()) - interval '59 minutes'
        group by minute order by minute
      `,
      sql`
        select day::text as day, sum(views)::text as views,
          sum(sessions)::text as sessions, sum(active_seconds)::text as active_seconds,
          sum(entrances)::text as entrances,
          sum(new_visits)::text as new_visits,
          sum(returning_visits)::text as returning_visits,
          sum(campaign_visits)::text as campaign_visits, sum(product_clicks)::text as product_clicks,
          sum(internal_clicks)::text as internal_clicks,
          sum(scroll_50)::text as scroll_50, sum(scroll_90)::text as scroll_90,
          sum(chart_starts)::text as chart_starts,
          sum(chart_completions)::text as chart_completions,
          sum(compare_starts)::text as compare_starts,
          sum(compare_completions)::text as compare_completions,
          sum(checkout_starts)::text as checkout_starts
        from halleus_private.analytics_daily
        where page_path = '@site' and day between ${previousFrom}::date and ${through}::date
        group by day order by day
      `,
      sql`
        select page_path, sum(views)::text as views,
          sum(sessions)::text as sessions, sum(active_seconds)::text as active_seconds,
          sum(entrances)::text as entrances,
          sum(new_visits)::text as new_visits,
          sum(returning_visits)::text as returning_visits,
          sum(campaign_visits)::text as campaign_visits, sum(product_clicks)::text as product_clicks,
          sum(internal_clicks)::text as internal_clicks,
          sum(scroll_50)::text as scroll_50, sum(scroll_90)::text as scroll_90,
          sum(chart_starts)::text as chart_starts,
          sum(chart_completions)::text as chart_completions,
          sum(compare_starts)::text as compare_starts,
          sum(compare_completions)::text as compare_completions,
          sum(checkout_starts)::text as checkout_starts
        from halleus_private.analytics_daily
        where page_path <> '@site' and day between ${from}::date and ${through}::date
        group by page_path order by sum(views) desc, page_path
      `,
      sql`
        select page_path, sum(views)::text as views,
          sum(sessions)::text as sessions, sum(active_seconds)::text as active_seconds,
          sum(entrances)::text as entrances,
          sum(new_visits)::text as new_visits,
          sum(returning_visits)::text as returning_visits,
          sum(campaign_visits)::text as campaign_visits, sum(product_clicks)::text as product_clicks,
          sum(internal_clicks)::text as internal_clicks,
          sum(scroll_50)::text as scroll_50, sum(scroll_90)::text as scroll_90,
          sum(chart_starts)::text as chart_starts,
          sum(chart_completions)::text as chart_completions,
          sum(compare_starts)::text as compare_starts,
          sum(compare_completions)::text as compare_completions,
          sum(checkout_starts)::text as checkout_starts
        from halleus_private.analytics_daily
        where page_path <> '@site' and day = ${selectedDay}::date
        group by page_path order by sum(active_seconds) desc, page_path
      `,
      sql`
        select source, sum(views)::text as views,
          sum(sessions)::text as sessions, sum(active_seconds)::text as active_seconds,
          sum(entrances)::text as entrances,
          sum(new_visits)::text as new_visits,
          sum(returning_visits)::text as returning_visits,
          sum(campaign_visits)::text as campaign_visits, sum(product_clicks)::text as product_clicks,
          sum(internal_clicks)::text as internal_clicks,
          sum(scroll_50)::text as scroll_50, sum(scroll_90)::text as scroll_90,
          sum(chart_starts)::text as chart_starts,
          sum(chart_completions)::text as chart_completions,
          sum(compare_starts)::text as compare_starts,
          sum(compare_completions)::text as compare_completions,
          sum(checkout_starts)::text as checkout_starts
        from halleus_private.analytics_daily
        where page_path = '@site' and day between ${from}::date and ${through}::date
        group by source order by sum(views) desc
      `,
      sql`
        select
          case
            when page_path like '/wiki%' then 'wiki'
            when page_path like '/shop%' or page_path in ('/product','/order','/pricing') then 'shop'
            when page_path = '/chart' then 'chart'
            when page_path = '/compare' then 'compare'
            when page_path = '/sky' then 'sky'
            when page_path = '/' then 'home'
            else 'other'
          end as area,
          sum(views)::text as views, sum(active_seconds)::text as active_seconds
        from halleus_private.analytics_daily
        where page_path <> '@site' and day between ${from}::date and ${through}::date
        group by 1 order by sum(views) desc
      `,
      sql`
        select extract(hour from hour at time zone 'Asia/Tehran')::int as hour,
          sum(views)::text as views, sum(active_seconds)::text as active_seconds,
          sum(product_clicks)::text as product_clicks
        from halleus_private.analytics_hourly
        where (hour at time zone 'Asia/Tehran')::date = ${selectedDay}::date
        group by 1 order by 1
      `,
      canWiki ? sql`
        select coalesce(sum(impressions), 0)::text as impressions,
          coalesce(sum(clicks), 0)::text as clicks
        from halleus_private.wiki_shop_showcase_daily_metrics
        where day between ${from}::date and ${through}::date
      ` : Promise.resolve([]),
      canShop ? sql`
        select
          count(*) filter (where (created_at at time zone 'Asia/Tehran')::date
            between ${from}::date and ${through}::date)::int as orders,
          count(*) filter (where payment_verified_at is not null
            and status not in ('canceled','cancel_requested')
            and (payment_verified_at at time zone 'Asia/Tehran')::date
              between ${from}::date and ${through}::date)::int as verified,
          coalesce(sum(total_toman) filter (where payment_verified_at is not null
            and status not in ('canceled','cancel_requested')
            and (payment_verified_at at time zone 'Asia/Tehran')::date
              between ${from}::date and ${through}::date), 0)::text as verified_toman
        from halleus_private.shop_orders
        where created_at >= (${from}::date - interval '2 days')
          or payment_verified_at >= (${from}::date - interval '2 days')
      ` : Promise.resolve([]),
      canShop ? sql`
        select product_item.item->>'productId' as product,
          sum(coalesce((product_item.item->>'quantity')::int, 1)) filter
            (where (o.created_at at time zone 'Asia/Tehran')::date
              between ${from}::date and ${through}::date)::int as ordered,
          count(distinct o.id) filter (where o.payment_verified_at is not null
            and o.status not in ('canceled','cancel_requested')
            and (o.payment_verified_at at time zone 'Asia/Tehran')::date
              between ${from}::date and ${through}::date)::int as verified
        from halleus_private.shop_orders as o,
          lateral jsonb_array_elements(o.items) as product_item(item)
        where (o.created_at at time zone 'Asia/Tehran')::date
          between ${from}::date and ${through}::date
          or (o.payment_verified_at at time zone 'Asia/Tehran')::date
          between ${from}::date and ${through}::date
        group by 1 order by ordered desc
      ` : Promise.resolve([]),
      sql`
        select
          (select count(*)::int from public.halleus_reports
           where deleted_at is null and (created_at at time zone 'Asia/Tehran')::date
             between ${from}::date and ${through}::date) as reports,
          (select count(*)::int from public.halleus_users
           where (created_at at time zone 'Asia/Tehran')::date
             between ${from}::date and ${through}::date) as registrations
      `,
      sql`
        select slug, coalesce(nullif(short_title, ''), title) as label
        from public.wiki_articles
        where status = 'published' and deleted_at is null
      `,
    ]);

    const byDay = new Map(siteRows.map((row) => [asString(row.day), rowMetric(row)]));
    const daily: AnalyticsDailyPoint[] = [];
    const previousDaily: AnalyticsDailyPoint[] = [];
    let totals = metric();
    let previous = metric();
    for (let index = 0; index < window.days; index++) {
      const day = shiftAnalyticsDay(from, index);
      const values = byDay.get(day) ?? metric();
      daily.push({ day, ...values });
      const previousDay = shiftAnalyticsDay(window.previousFrom, index);
      const previousValue = byDay.get(previousDay) ?? metric();
      previousDaily.push({ day: previousDay, ...previousValue });
      totals = addMetric(totals, values);
      previous = addMetric(previous, previousValue);
    }
    const minuteByTime = new Map(minuteRows.map((row) => [clockText(row.minute), asNumber(row.count)]));
    const onlineMinute: Array<{ minute: string; count: number }> = [];
    const clockMinute = new Date();
    clockMinute.setUTCSeconds(0, 0);
    for (let index = 59; index >= 0; index--) {
      const minute = new Date(clockMinute.getTime() - index * 60000).toISOString();
      onlineMinute.push({ minute, count: minuteByTime.get(minute) ?? 0 });
    }

    const siteDay = byDay.get(selectedDay) ?? metric();
    return {
      ready: true, window,
      online: {
        now: asNumber(live[0]?.online), five: asNumber(live[0]?.five),
        thirty: asNumber(live[0]?.thirty),
        areas: liveAreas.map((row) => ({ area: asString(row.area) as AnalyticsArea,
          count: asNumber(row.count) })),
        pages: livePages.map((row) => ({ path: asString(row.page_path), count: asNumber(row.count) })),
        minute: onlineMinute,
      },
      totals, previous, daily, previousDaily, dayTotal: siteDay,
      hourly: hourlyRows.map((row) => ({ hour: asNumber(row.hour),
        views: asNumber(row.views), seconds: asNumber(row.active_seconds),
        clicks: asNumber(row.product_clicks) })),
      pages: pageRows.map(pageRow),
      dayPages: selectedPageRows.map(pageRow),
      sources: sourceRows.map((row) => ({ source: asString(row.source) as AnalyticsSource, ...rowMetric(row) })),
      titles: Object.fromEntries(wikiTitleRows.map((row) => ["/wiki/" + asString(row.slug), asString(row.label)])),
      areas: areaRows.map((row) => ({ area: asString(row.area) as AnalyticsArea,
        count: 0, views: asNumber(row.views), seconds: asNumber(row.active_seconds) })),
      showcase: canWiki ? { impressions: asNumber(showcaseRows[0]?.impressions),
        clicks: asNumber(showcaseRows[0]?.clicks) } : null,
      growth: { reports: asNumber(growthRows[0]?.reports),
        registrations: asNumber(growthRows[0]?.registrations) },
      commerce: canShop ? {
        orders: asNumber(ordersRows[0]?.orders),
        verified: asNumber(ordersRows[0]?.verified),
        verifiedToman: asNumber(ordersRows[0]?.verified_toman),
        products: productsRows.map((row) => ({ product: asString(row.product),
          ordered: asNumber(row.ordered), verified: asNumber(row.verified) })),
      } : null,
    };
  } catch (error) {
    if (["42P01", "42703"].includes(String((error as { code?: string })?.code ?? ""))) {
      return empty(window);
    }
    throw error;
  }
}

/** Read only one public page's aggregate timeline, never visitor-level activity. */
export async function getHalleusPageAnalytics(
  path: string, window: AnalyticsWindow, actor: VerifiedAdminActor,
) {
  const sql = getAdminDatabase();
  const [rows, sourceRows, showcaseRows] = await Promise.all([sql`
    select day::text as day,
      sum(views)::text as views, sum(sessions)::text as sessions,
      sum(active_seconds)::text as active_seconds,
      sum(entrances)::text as entrances,
          sum(new_visits)::text as new_visits,
          sum(returning_visits)::text as returning_visits,
          sum(campaign_visits)::text as campaign_visits, sum(product_clicks)::text as product_clicks,
      sum(internal_clicks)::text as internal_clicks,
      sum(scroll_50)::text as scroll_50, sum(scroll_90)::text as scroll_90,
      sum(chart_starts)::text as chart_starts,
      sum(chart_completions)::text as chart_completions,
      sum(compare_starts)::text as compare_starts,
      sum(compare_completions)::text as compare_completions,
      sum(checkout_starts)::text as checkout_starts
    from halleus_private.analytics_daily
    where page_path = ${path} and day between ${window.previousFrom}::date and ${window.through}::date
    group by day order by day
  `, sql`
    select source, sum(views)::text as views, sum(active_seconds)::text as active_seconds,
      sum(product_clicks)::text as product_clicks
    from halleus_private.analytics_daily
    where page_path = ${path} and day between ${window.from}::date and ${window.through}::date
    group by source order by sum(views) desc
  `, actor.capabilities.includes("wiki.read") && path.startsWith("/wiki/") ? sql`
    select coalesce(sum(m.impressions), 0)::text as impressions,
      coalesce(sum(m.clicks), 0)::text as clicks
    from halleus_private.wiki_shop_showcase_daily_metrics m
    join halleus_private.wiki_shop_showcases s on s.id = m.showcase_id
    join public.wiki_articles a on a.id = s.article_id
    where '/wiki/' || a.slug = ${path}
      and m.day between ${window.from}::date and ${window.through}::date
  ` : Promise.resolve([])]);
  const byDay = new Map(rows.map((row) => [asString(row.day), rowMetric(row)]));
  const series: AnalyticsDailyPoint[] = [];
  const previousDaily: AnalyticsDailyPoint[] = [];
  for (let i = 0; i < window.days; i++) {
    const day = shiftAnalyticsDay(window.from, i);
    const previousDay = shiftAnalyticsDay(window.previousFrom, i);
    series.push({ day, ...(byDay.get(day) ?? metric()) });
    previousDaily.push({ day: previousDay, ...(byDay.get(previousDay) ?? metric()) });
  }
  return { path, daily: series, previousDaily,
    sources: sourceRows.map((row) => ({ source: asString(row.source),
      views: asNumber(row.views), seconds: asNumber(row.active_seconds),
      clicks: asNumber(row.product_clicks) })),
    showcase: showcaseRows.length ? {
      impressions: asNumber(showcaseRows[0]?.impressions),
      clicks: asNumber(showcaseRows[0]?.clicks),
    } : null,
  };
}
