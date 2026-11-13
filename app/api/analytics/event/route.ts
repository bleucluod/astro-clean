import { getAdminDatabase } from "@/lib/admin/admin-database";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import {
  analyticsArea, isAnalyticsSource, normalizeAnalyticsPath,
  type AnalyticsEventKind,
} from "@/lib/analytics/first-party";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set<AnalyticsEventKind>([
  "page", "resume", "heartbeat", "engagement", "scroll", "product_click", "internal_click",
  "chart_start", "chart_complete", "compare_start", "compare_complete", "checkout_start", "leave",
]);
const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const counters = new Map<string, number>();
let minuteBucket = -1;
let lastCleanupAt = 0;

function empty(status: number) {
  return new Response(null, { status, headers: NO_STORE });
}
function withinRateLimit(session: string, kind: AnalyticsEventKind) {
  const minute = Math.floor(Date.now() / 60_000);
  if (minute !== minuteBucket) {
    minuteBucket = minute;
    counters.clear();
  }
  const key = session + ":" + kind;
  const current = counters.get(key) ?? 0;
  const max = kind === "engagement" ? 6 : kind === "heartbeat" ? 5 :
    kind === "scroll" ? 6 : kind === "page" ? 25 : 20;
  if (current >= max || (counters.size >= 15000 && !counters.has(key))) return false;
  counters.set(key, current + 1);
  return true;
}
function allowedAction(kind: AnalyticsEventKind, path: string): boolean {
  if (kind === "chart_start" || kind === "chart_complete") return path === "/chart";
  if (kind === "compare_start" || kind === "compare_complete") return path === "/compare";
  if (kind === "checkout_start") return path === "/shop/checkout";
  if (kind === "internal_click") return path.startsWith("/wiki/");
  return true;
}
type Counts = {
  views: number; sessions: number; active: number; entrances: number;
  newVisits: number; returningVisits: number; campaignVisits: number;
  scroll50: number; scroll90: number; internal: number; product: number;
  chartStarts: number; chartComplete: number; compareStarts: number;
  compareComplete: number; checkout: number;
};
function zero(): Counts {
  return { views: 0, sessions: 0, active: 0, entrances: 0,
    newVisits: 0, returningVisits: 0, campaignVisits: 0,
    scroll50: 0, scroll90: 0, internal: 0, product: 0,
    chartStarts: 0, chartComplete: 0, compareStarts: 0,
    compareComplete: 0, checkout: 0 };
}

/** Private, coarse aggregated analytics; no IP, account, full referrer or raw report content. */
export async function POST(request: Request) {
  const expectedOrigin = new URL(getHalleusRuntimeEnv().siteUrl).origin;
  if (request.headers.get("origin") !== expectedOrigin ||
    (request.headers.get("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")) return empty(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return empty(415);
  if (Number(request.headers.get("content-length") ?? 0) > 500) return empty(413);
  if (/(bot|crawler|spider|headless|preview|lighthouse)/i.test(request.headers.get("user-agent") ?? "")) return empty(204);

  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 500) return empty(413);
    payload = JSON.parse(raw);
  } catch { return empty(400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return empty(400);
  const body = payload as Record<string, unknown>;
  if (typeof body.kind !== "string" || !KINDS.has(body.kind as AnalyticsEventKind)) return empty(400);
  const kind = body.kind as AnalyticsEventKind;
  const expectedKeys = kind === "engagement" ? "kind,path,seconds,sessionId,source" :
    kind === "scroll" ? "depth,kind,path,sessionId,source" :
    kind === "page" ? "kind,paid,path,sessionId,source,visitor" :
    "kind,path,sessionId,source";
  if (Object.keys(body).sort().join(",") !== expectedKeys ||
    typeof body.sessionId !== "string" || !UUID.test(body.sessionId) ||
    !isAnalyticsSource(body.source)) return empty(400);
  if (kind === "page" &&
    (typeof body.paid !== "boolean" ||
     !["new", "returning", "unknown"].includes(String(body.visitor)))) return empty(400);
  if (kind === "engagement" &&
    (typeof body.seconds !== "number" || !Number.isInteger(body.seconds) ||
     body.seconds < 1 || body.seconds > 20)) return empty(400);
  if (kind === "scroll" && (typeof body.depth !== "number" ||
    ![25, 50, 75, 90, 100].includes(body.depth))) return empty(400);
  const path = normalizeAnalyticsPath(body.path);
  if (!path || !allowedAction(kind, path)) return empty(400);
  if (!withinRateLimit(body.sessionId, kind)) return empty(429);

  const session = body.sessionId;
  const source = body.source;
  const area = analyticsArea(path);
  try {
    const sql = getAdminDatabase();
    if (kind === "leave") {
      await sql.begin(async (tx) => {
        await tx`delete from halleus_private.analytics_live_sessions
          where session_id = ${session}::uuid`;
        await tx`delete from halleus_private.analytics_minute_presence
          where session_id = ${session}::uuid`;
        await tx`delete from halleus_private.analytics_page_progress
          where session_id = ${session}::uuid`;
        await tx`delete from halleus_private.analytics_seen_daily
          where session_id = ${session}::uuid`;
      });
      return empty(204);
    }

    await sql.begin(async (tx) => {
      let live;
      if (kind === "page" || kind === "resume") {
        live = await tx`
          insert into halleus_private.analytics_live_sessions as live
            (session_id, source, area, page_path, last_seen, last_engagement_at, visitor_kind, campaign)
          values (${session}::uuid, ${source}, ${area}, ${path}, now(), now(),
            ${kind === "page" ? String(body.visitor) : "unknown"},
            ${kind === "page" ? Boolean(body.paid) : false})
          on conflict (session_id) do update
            set last_seen = now(), area = excluded.area,
                page_path = excluded.page_path,
                last_engagement_at = case
                  when live.page_path <> excluded.page_path then now()
                  else live.last_engagement_at end
          returning source, page_path, last_engagement_at, visitor_kind, campaign
        `;
      } else {
        live = await tx`
          select source, page_path, last_engagement_at, visitor_kind, campaign
          from halleus_private.analytics_live_sessions
          where session_id = ${session}::uuid
            and last_seen >= now() - interval '3 minutes'
          for update
        `;
        if (!live.length || live[0].page_path !== path) return;
        await tx`
          update halleus_private.analytics_live_sessions
          set last_seen = now() where session_id = ${session}::uuid
        `;
      }
      if (!live.length) return;
      const originalSource = String(live[0].source);
      const originalArea = analyticsArea(path);
      const [clock] = await tx`
        select (now() at time zone 'Asia/Tehran')::date::text as day
      `;
      const day = String(clock.day);

      if (kind === "page" || kind === "resume" || kind === "heartbeat" || kind === "engagement") {
        await tx`
          insert into halleus_private.analytics_minute_presence (minute, session_id, area)
          values (date_trunc('minute', now()), ${session}::uuid, ${originalArea})
          on conflict (minute, session_id) do update set area = excluded.area
        `;
      }
      if (kind === "heartbeat" || kind === "resume") return;

      const page = zero();
      const site = zero();
      if (kind === "page") {
        const seenPage = await tx`
          insert into halleus_private.analytics_seen_daily (day, session_id, page_path)
          values (${day}::date, ${session}::uuid, ${path})
          on conflict do nothing returning session_id
        `;
        const seenSite = await tx`
          insert into halleus_private.analytics_seen_daily (day, session_id, page_path)
          values (${day}::date, ${session}::uuid, '@site')
          on conflict do nothing returning session_id
        `;
        page.views = site.views = 1;
        page.sessions = seenPage.length ? 1 : 0;
        site.sessions = seenSite.length ? 1 : 0;
        page.entrances = seenSite.length ? 1 : 0;
        site.entrances = page.entrances;
        page.newVisits = site.newVisits = seenSite.length && live[0].visitor_kind === "new" ? 1 : 0;
        page.returningVisits = site.returningVisits =
          seenSite.length && live[0].visitor_kind === "returning" ? 1 : 0;
        page.campaignVisits = site.campaignVisits = seenSite.length && live[0].campaign ? 1 : 0;
      }
      if (kind === "engagement") {
        const since = Math.floor(
          (Date.now() - new Date(String(live[0].last_engagement_at)).getTime()) / 1000,
        );
        const seconds = Math.max(0, Math.min(20, Number(body.seconds), since));
        await tx`
          update halleus_private.analytics_live_sessions
          set last_engagement_at = now()
          where session_id = ${session}::uuid
        `;
        page.active = site.active = seconds;
      }
      if (kind === "scroll") {
        await tx`
          insert into halleus_private.analytics_page_progress
            (day, session_id, page_path, max_scroll)
          values (${day}::date, ${session}::uuid, ${path}, 0)
          on conflict do nothing
        `;
        const [previous] = await tx`
          select max_scroll from halleus_private.analytics_page_progress
          where day = ${day}::date and session_id = ${session}::uuid
            and page_path = ${path}
          for update
        `;
        const oldDepth = Number(previous.max_scroll);
        const newDepth = Number(body.depth);
        if (newDepth <= oldDepth) return;
        await tx`
          update halleus_private.analytics_page_progress
          set max_scroll = ${newDepth}
          where day = ${day}::date and session_id = ${session}::uuid
            and page_path = ${path}
        `;
        page.scroll50 = site.scroll50 = oldDepth < 50 && newDepth >= 50 ? 1 : 0;
        page.scroll90 = site.scroll90 = oldDepth < 90 && newDepth >= 90 ? 1 : 0;
      }
      if (kind === "product_click") page.product = site.product = 1;
      if (kind === "internal_click") page.internal = site.internal = 1;
      if (kind === "chart_start") page.chartStarts = site.chartStarts = 1;
      if (kind === "chart_complete") page.chartComplete = site.chartComplete = 1;
      if (kind === "compare_start") page.compareStarts = site.compareStarts = 1;
      if (kind === "compare_complete") page.compareComplete = site.compareComplete = 1;
      if (kind === "checkout_start") page.checkout = site.checkout = 1;

      // Both page and site totals represent the same event, not two traffic events.
      for (const [aggregatePath, c] of [[path, page], ["@site", site]] as const) {
        await tx`
          insert into halleus_private.analytics_daily as d
            (day, page_path, source, views, sessions, active_seconds, entrances,
             new_visits, returning_visits, campaign_visits,
             scroll_50, scroll_90, internal_clicks, product_clicks,
             chart_starts, chart_completions, compare_starts, compare_completions,
             checkout_starts)
          values (${day}::date, ${aggregatePath}, ${originalSource},
            ${c.views}, ${c.sessions}, ${c.active}, ${c.entrances},
            ${c.newVisits}, ${c.returningVisits}, ${c.campaignVisits},
            ${c.scroll50}, ${c.scroll90}, ${c.internal}, ${c.product},
            ${c.chartStarts}, ${c.chartComplete}, ${c.compareStarts},
            ${c.compareComplete}, ${c.checkout})
          on conflict (day, page_path, source) do update set
            views = d.views + excluded.views,
            sessions = d.sessions + excluded.sessions,
            active_seconds = d.active_seconds + excluded.active_seconds,
            entrances = d.entrances + excluded.entrances,
            new_visits = d.new_visits + excluded.new_visits,
            returning_visits = d.returning_visits + excluded.returning_visits,
            campaign_visits = d.campaign_visits + excluded.campaign_visits,
            scroll_50 = d.scroll_50 + excluded.scroll_50,
            scroll_90 = d.scroll_90 + excluded.scroll_90,
            internal_clicks = d.internal_clicks + excluded.internal_clicks,
            product_clicks = d.product_clicks + excluded.product_clicks,
            chart_starts = d.chart_starts + excluded.chart_starts,
            chart_completions = d.chart_completions + excluded.chart_completions,
            compare_starts = d.compare_starts + excluded.compare_starts,
            compare_completions = d.compare_completions + excluded.compare_completions,
            checkout_starts = d.checkout_starts + excluded.checkout_starts
        `;
      }
      if (page.views || page.active || page.product) {
        await tx`
          insert into halleus_private.analytics_hourly as h
            (hour, area, views, active_seconds, product_clicks)
          values (date_trunc('hour', now()), ${area},
            ${page.views}, ${page.active}, ${page.product})
          on conflict (hour, area) do update set
            views = h.views + excluded.views,
            active_seconds = h.active_seconds + excluded.active_seconds,
            product_clicks = h.product_clicks + excluded.product_clicks
        `;
      }
    });

    if (Date.now() - lastCleanupAt >= 300_000) {
      lastCleanupAt = Date.now();
      void Promise.all([
        sql`delete from halleus_private.analytics_live_sessions
              where last_seen < now() - interval '48 hours'`,
        sql`delete from halleus_private.analytics_seen_daily
              where day < ((now() at time zone 'Asia/Tehran')::date - 1)`,
        sql`delete from halleus_private.analytics_page_progress
              where day < ((now() at time zone 'Asia/Tehran')::date - 1)`,
        sql`delete from halleus_private.analytics_minute_presence
              where minute < now() - interval '48 hours'`,
      ]).catch(() => console.warn("ANALYTICS_TEMPORARY_CLEANUP_DEFERRED"));
    }
    return empty(204);
  } catch (error) {
    console.warn("ANALYTICS_AGGREGATE_UNAVAILABLE",
      String((error as { code?: string })?.code ?? "unknown"));
    return empty(503);
  }
}
