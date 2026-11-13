import { asNumber, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import type { VerifiedAdminActor } from "@/lib/admin/admin-auth";
import type { AnalyticsArea, AnalyticsSource } from "@/lib/analytics/first-party";

export type AnalyticsRange = 7 | 30 | 90;
export type AnalyticsDailyPoint = {
  day: string; views: number; sessions: number;
  productClicks: number; chartStarts: number; checkoutStarts: number;
};
export type AnalyticsPageRow = {
  path: string; views: number; sessions: number; productClicks: number;
};
export type AnalyticsSourceRow = { source: AnalyticsSource; views: number; sessions: number };
export type AnalyticsAreaRow = { area: AnalyticsArea; count: number };
export type AnalyticsDashboard = {
  ready: boolean;
  days: AnalyticsRange;
  online: { now: number; five: number; thirty: number; areas: AnalyticsAreaRow[]; pages: { path: string; count: number }[] };
  totals: { views: number; sessions: number; productClicks: number; chartStarts: number; checkoutStarts: number };
  daily: AnalyticsDailyPoint[];
  pages: AnalyticsPageRow[];
  sources: AnalyticsSourceRow[];
  showcase: null | { impressions: number; clicks: number };
  growth: { reports: number; registrations: number };
  commerce: null | { orders: number; verified: number; verifiedToman: number };
};

function number(row: Record<string, unknown>, key: string) {
  return asNumber(row[key]);
}
export async function getHalleusAnalyticsDashboard(
  days: AnalyticsRange, actor: VerifiedAdminActor,
): Promise<AnalyticsDashboard> {
  const sql = getAdminDatabase();
  const canCommerce = actor.role === "owner" && actor.capabilities.includes("shop_orders.read");
  const canShowcase = actor.capabilities.includes("wiki.read");
  const empty: AnalyticsDashboard = {
    ready: false, days,
    online: { now: 0, five: 0, thirty: 0, areas: [], pages: [] },
    totals: { views: 0, sessions: 0, productClicks: 0, chartStarts: 0, checkoutStarts: 0 },
    daily: [], pages: [], sources: [], showcase: null,
    growth: { reports: 0, registrations: 0 }, commerce: null,
  };

  try {
    const [live, areas, livePages, daily, pages, sources, showcase, commerce, growth] = await Promise.all([
      sql`
        select count(*) filter (where last_seen >= now() - interval '2 minutes')::int as now,
          count(*) filter (where last_seen >= now() - interval '5 minutes')::int as five,
          count(*) filter (where last_seen >= now() - interval '30 minutes')::int as thirty
        from halleus_private.analytics_live_sessions
      `,
      sql`
        select area, count(*)::int as count from halleus_private.analytics_live_sessions
        where last_seen >= now() - interval '2 minutes'
        group by area order by count desc
      `,
      sql`
        select page_path, count(*)::int as count from halleus_private.analytics_live_sessions
        where last_seen >= now() - interval '2 minutes'
        group by page_path order by count desc limit 8
      `,
      sql`
        select day::text, sum(views)::text as views, sum(sessions)::text as sessions,
          sum(product_clicks)::text as product_clicks, sum(chart_starts)::text as chart_starts,
          sum(checkout_starts)::text as checkout_starts
        from halleus_private.analytics_daily
        where page_path = '@site'
          and day >= ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))
        group by day order by day
      `,
      sql`
        select page_path, sum(views)::text as views, sum(sessions)::text as sessions,
          sum(product_clicks)::text as product_clicks
        from halleus_private.analytics_daily
        where page_path <> '@site'
          and day >= ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))
        group by page_path order by sum(views) desc, page_path asc limit 35
      `,
      sql`
        select source, sum(views)::text as views, sum(sessions)::text as sessions
        from halleus_private.analytics_daily
        where page_path = '@site'
          and day >= ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))
        group by source order by sum(views) desc
      `,
      canShowcase ? sql`
        select coalesce(sum(impressions),0)::text as impressions,
          coalesce(sum(clicks),0)::text as clicks
        from halleus_private.wiki_shop_showcase_daily_metrics
        where day >= ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))
      ` : Promise.resolve([]),
      canCommerce ? sql`
        select
          (select count(*)::int from halleus_private.shop_orders
           where (created_at at time zone 'Asia/Tehran')::date >=
             ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))) as orders,
          (select count(*)::int from halleus_private.shop_orders
           where payment_verified_at is not null
             and status not in ('canceled','cancel_requested')
             and (payment_verified_at at time zone 'Asia/Tehran')::date >=
               ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))) as verified,
          (select coalesce(sum(total_toman),0)::text from halleus_private.shop_orders
           where payment_verified_at is not null
             and status not in ('canceled','cancel_requested')
             and (payment_verified_at at time zone 'Asia/Tehran')::date >=
               ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))) as verified_toman
      ` : Promise.resolve([]),
      sql`
        select
          (select count(*)::int from public.halleus_reports
            where deleted_at is null and
              (created_at at time zone 'Asia/Tehran')::date >=
                ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))) as reports,
          (select count(*)::int from public.halleus_users
            where (created_at at time zone 'Asia/Tehran')::date >=
              ((now() at time zone 'Asia/Tehran')::date - (${days}::int - 1))) as registrations
      `,
    ]);

    const series: AnalyticsDailyPoint[] = daily.map((row) => ({
      day: asString(row.day), views: number(row, "views"), sessions: number(row, "sessions"),
      productClicks: number(row, "product_clicks"), chartStarts: number(row, "chart_starts"),
      checkoutStarts: number(row, "checkout_starts"),
    }));
    const totals = series.reduce((sum, point) => ({
      views: sum.views + point.views, sessions: sum.sessions + point.sessions,
      productClicks: sum.productClicks + point.productClicks,
      chartStarts: sum.chartStarts + point.chartStarts,
      checkoutStarts: sum.checkoutStarts + point.checkoutStarts,
    }), empty.totals);
    return {
      ready: true, days,
      online: {
        now: number(live[0] ?? {}, "now"), five: number(live[0] ?? {}, "five"),
        thirty: number(live[0] ?? {}, "thirty"),
        areas: areas.map((row) => ({ area: asString(row.area) as AnalyticsArea, count: number(row, "count") })),
        pages: livePages.map((row) => ({ path: asString(row.page_path), count: number(row, "count") })),
      },
      totals, daily: series,
      pages: pages.map((row) => ({
        path: asString(row.page_path), views: number(row, "views"),
        sessions: number(row, "sessions"), productClicks: number(row, "product_clicks"),
      })),
      sources: sources.map((row) => ({
        source: asString(row.source) as AnalyticsSource,
        views: number(row, "views"), sessions: number(row, "sessions"),
      })),
      showcase: canShowcase ? {
        impressions: number(showcase[0] ?? {}, "impressions"),
        clicks: number(showcase[0] ?? {}, "clicks"),
      } : null,
      growth: {
        reports: number(growth[0] ?? {}, "reports"),
        registrations: number(growth[0] ?? {}, "registrations"),
      },
      commerce: canCommerce ? {
        orders: number(commerce[0] ?? {}, "orders"),
        verified: number(commerce[0] ?? {}, "verified"),
        verifiedToman: number(commerce[0] ?? {}, "verified_toman"),
      } : null,
    };
  } catch (error) {
    // A pulled application must remain safe before migration approval.
    if ((error as { code?: string })?.code === "42P01") return empty;
    throw error;
  }
}
