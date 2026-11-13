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
  "page", "heartbeat", "product_click", "chart_start", "checkout_start", "leave",
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
    counters.clear();
    minuteBucket = minute;
  }
  const key = session + ":" + kind;
  const count = counters.get(key) ?? 0;
  const max = kind === "heartbeat" ? 4 : kind === "page" ? 25 : 20;
  if (count >= max || counters.size >= 10000) return false;
  counters.set(key, count + 1);
  return true;
}

/** No IP address, identity, full referrer, search query, or raw activity log is persisted. */
export async function POST(request: Request) {
  const expectedOrigin = new URL(getHalleusRuntimeEnv().siteUrl).origin;
  if (request.headers.get("origin") !== expectedOrigin ||
      (request.headers.get("sec-fetch-site") &&
       request.headers.get("sec-fetch-site") !== "same-origin")) return empty(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return empty(415);
  if (Number(request.headers.get("content-length") ?? 0) > 500) return empty(413);
  if (/(bot|crawler|spider|headless|preview|lighthouse)/i.test(request.headers.get("user-agent") ?? "")) return empty(204);

  let parsed: unknown;
  try {
    const text = await request.text();
    if (text.length > 500) return empty(413);
    parsed = JSON.parse(text);
  } catch { return empty(400); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return empty(400);
  const body = parsed as Record<string, unknown>;
  if (Object.keys(body).sort().join(",") !== "kind,path,sessionId,source" ||
      typeof body.sessionId !== "string" || !UUID.test(body.sessionId) ||
      !isAnalyticsSource(body.source) || !KINDS.has(body.kind as AnalyticsEventKind)) return empty(400);
  const path = normalizeAnalyticsPath(body.path);
  if (!path) return empty(400);
  const kind = body.kind as AnalyticsEventKind;
  const session = body.sessionId;
  const source = body.source;
  if (!withinRateLimit(session, kind)) return empty(429);

  try {
    const sql = getAdminDatabase();
    if (kind === "leave") {
      await sql`delete from halleus_private.analytics_live_sessions where session_id = ${session}::uuid`;
      return empty(204);
    }
    await sql.begin(async (tx) => {
      const live = await tx`
        insert into halleus_private.analytics_live_sessions
          (session_id, source, area, page_path, last_seen)
        values (${session}::uuid, ${source}, ${analyticsArea(path)}, ${path}, now())
        on conflict (session_id) do update
          set last_seen = now(), area = excluded.area, page_path = excluded.page_path
        returning source
      `;
      if (kind === "heartbeat") return;
      const originalSource = String(live[0]?.source ?? source);
      const day = await tx`select (now() at time zone 'Asia/Tehran')::date::text as day`;
      const currentDay = String(day[0]?.day);

      let newPage = false;
      let newSite = false;
      if (kind === "page") {
        const seenPage = await tx`
          insert into halleus_private.analytics_seen_daily(day, session_id, page_path)
          values (${currentDay}::date, ${session}::uuid, ${path})
          on conflict do nothing returning session_id
        `;
        const seenSite = await tx`
          insert into halleus_private.analytics_seen_daily(day, session_id, page_path)
          values (${currentDay}::date, ${session}::uuid, '@site')
          on conflict do nothing returning session_id
        `;
        newPage = seenPage.length > 0;
        newSite = seenSite.length > 0;
      }
      const views = kind === "page" ? 1 : 0;
      const productClicks = kind === "product_click" ? 1 : 0;
      const chartStarts = kind === "chart_start" ? 1 : 0;
      const checkoutStarts = kind === "checkout_start" ? 1 : 0;

      await tx`
        insert into halleus_private.analytics_daily as daily
          (day, page_path, source, views, sessions, product_clicks, chart_starts, checkout_starts)
        values (${currentDay}::date, ${path}, ${originalSource},
          ${views}, ${newPage ? 1 : 0}, ${productClicks}, ${chartStarts}, ${checkoutStarts})
        on conflict (day, page_path, source) do update
          set views = daily.views + excluded.views,
              sessions = daily.sessions + excluded.sessions,
              product_clicks = daily.product_clicks + excluded.product_clicks,
              chart_starts = daily.chart_starts + excluded.chart_starts,
              checkout_starts = daily.checkout_starts + excluded.checkout_starts
      `;
      await tx`
        insert into halleus_private.analytics_daily as daily
          (day, page_path, source, views, sessions, product_clicks, chart_starts, checkout_starts)
        values (${currentDay}::date, '@site', ${originalSource},
          ${views}, ${newSite ? 1 : 0}, ${productClicks}, ${chartStarts}, ${checkoutStarts})
        on conflict (day, page_path, source) do update
          set views = daily.views + excluded.views,
              sessions = daily.sessions + excluded.sessions,
              product_clicks = daily.product_clicks + excluded.product_clicks,
              chart_starts = daily.chart_starts + excluded.chart_starts,
              checkout_starts = daily.checkout_starts + excluded.checkout_starts
      `;
    });

    // Keep the only visit-level rows temporary. Retained history is aggregate-only.
    if (Date.now() - lastCleanupAt >= 60_000) {
      lastCleanupAt = Date.now();
      void Promise.all([
        sql`delete from halleus_private.analytics_live_sessions
              where last_seen < now() - interval '48 hours'`,
        sql`delete from halleus_private.analytics_seen_daily
              where day < ((now() at time zone 'Asia/Tehran')::date - 1)`,
      ]).catch(() => console.warn("ANALYTICS_TEMPORARY_CLEANUP_DEFERRED"));
    }
    return empty(204);
  } catch (error) {
    console.warn("ANALYTICS_STORE_UNAVAILABLE",
      String((error as { code?: string })?.code ?? "unknown"));
    return empty(503);
  }
}
