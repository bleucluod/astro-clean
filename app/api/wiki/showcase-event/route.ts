import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import { isShopMvpActive, isShopP02OrderEnabled } from "@/lib/shop/shop-mvp-activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NO_STORE = { "Cache-Control": "no-store" };
let bucketMinute = -1;
const bucket = new Map<string, number>();

function empty(status: number) {
  return new Response(null, { status, headers: NO_STORE });
}
function allowEvent(id: string, kind: "impression" | "click"): boolean {
  const minute = Math.floor(Date.now() / 60_000);
  if (minute !== bucketMinute) {
    bucketMinute = minute;
    bucket.clear();
  }
  const key = id + ":" + kind;
  const current = bucket.get(key) ?? 0;
  const ceiling = kind === "impression" ? 240 : 120;
  if (current >= ceiling) return false;
  bucket.set(key, current + 1);
  return true;
}

/** No identifiers, referrers or user-agent values are persisted. Events are counts, not people. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(getHalleusRuntimeEnv().siteUrl).origin;
  if (origin !== expectedOrigin ||
    (request.headers.get("sec-fetch-site") &&
     request.headers.get("sec-fetch-site") !== "same-origin")) return empty(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return empty(415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 500) return empty(413);
  if (/(bot|crawler|spider|headless|preview)/i.test(request.headers.get("user-agent") ?? "")) {
    return empty(204);
  }
  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 500) return empty(413);
    payload = JSON.parse(raw);
  } catch { return empty(400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return empty(400);
  const body = payload as Record<string, unknown>;
  const { id, slug, event } = body;
  if (Object.keys(body).sort().join(",") !== "event,id,slug" ||
    typeof id !== "string" || !UUID.test(id) ||
    typeof slug !== "string" || !SLUG.test(slug) ||
    (event !== "impression" && event !== "click")) return empty(400);

  if (!allowEvent(id, event)) return empty(429);
  const p01 = isShopMvpActive();
  const p02 = isShopP02OrderEnabled();
  try {
    const sql = getAdminDatabase();
    const rows = await sql`
      insert into halleus_private.wiki_shop_showcase_daily_metrics as metric (
        showcase_id, product_id, day, impressions, clicks
      )
      select s.id, s.product_id, (now() at time zone 'UTC')::date,
        case when ${event} = 'impression' then 1 else 0 end,
        case when ${event} = 'click' then 1 else 0 end
      from halleus_private.wiki_shop_showcases s
      join public.wiki_articles a on a.id = s.article_id
      where s.id = ${id}::uuid and a.slug = ${slug} and s.enabled = true
        and a.status = 'published' and a.is_indexable = true
        and a.published_at is not null and a.published_at <= now()
        and a.scheduled_for is null and a.deleted_at is null
        and ((s.product_id = 'p01' and ${p01}::boolean)
          or (s.product_id = 'p02' and ${p02}::boolean))
      on conflict (showcase_id, product_id, day) do update
        set impressions = metric.impressions + excluded.impressions,
            clicks = metric.clicks + excluded.clicks
      returning showcase_id
    `;
    return empty(rows.length ? 204 : 404);
  } catch (error) {
    // The public Wiki and link navigation must still work if the metrics store is unavailable.
    console.warn("WIKI_SHOWCASE_METRICS_WRITE_UNAVAILABLE",
      String((error as { code?: string })?.code ?? "unknown"));
    return empty(503);
  }
}
