import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import { wikiShopProductCatalog } from "@/lib/wiki/wiki-shop-showcase";
import { isShowcaseSurface } from "@/lib/shop/shop-showcase-surfaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const headers = { "Cache-Control": "no-store" };
let bucketMinute = -1;
const requests = new Map<string, number>();
const empty = (status: number) => new Response(null, { status, headers });

/** Aggregate counters only. Never accept or store report IDs, visitors, or birth data. */
export async function POST(request: Request) {
  const expected = new URL(getHalleusRuntimeEnv().siteUrl).origin;
  if (request.headers.get("origin") !== expected ||
      (request.headers.get("sec-fetch-site") &&
       request.headers.get("sec-fetch-site") !== "same-origin")) return empty(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return empty(415);
  if (Number(request.headers.get("content-length") ?? 0) > 500) return empty(413);
  if (/(bot|crawler|spider|headless|preview)/i.test(request.headers.get("user-agent") ?? "")) return empty(204);
  let data: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 500) return empty(413);
    data = JSON.parse(raw);
  } catch { return empty(400); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return empty(400);
  const input = data as Record<string, unknown>;
  if (Object.keys(input).sort().join(",") !== "event,id,surface" ||
      typeof input.id !== "string" || !UUID.test(input.id) ||
      !isShowcaseSurface(input.surface) ||
      (input.event !== "impression" && input.event !== "click")) return empty(400);
  const minute = Math.floor(Date.now() / 60000);
  if (minute !== bucketMinute) { bucketMinute = minute; requests.clear(); }
  const key = input.id + ":" + input.event;
  const count = requests.get(key) ?? 0;
  if (count >= (input.event === "impression" ? 240 : 120) ||
      (requests.size >= 10000 && !requests.has(key))) return empty(429);
  requests.set(key, count + 1);
  const orderableProducts = wikiShopProductCatalog().filter(p => p.orderable).map(p => p.id);
  if (!orderableProducts.length) return empty(204);
  try {
    const sql = getAdminDatabase();
    const rows = await sql`insert into halleus_private.shop_showcase_daily_metrics as totals
      (showcase_id, product_id, day, impressions, clicks)
      select s.id, s.product_id, (now() at time zone 'UTC')::date,
        case when ${input.event} = 'impression' then 1 else 0 end,
        case when ${input.event} = 'click' then 1 else 0 end
      from halleus_private.shop_showcase_placements s
      where s.id = ${input.id}::uuid and s.surface = ${input.surface}
        and s.enabled = true and s.product_id = any(${orderableProducts}::text[])
      on conflict (showcase_id, product_id, day) do update
      set impressions = totals.impressions + excluded.impressions,
          clicks = totals.clicks + excluded.clicks returning showcase_id`;
    return empty(rows.length ? 204 : 404);
  } catch (error) {
    console.warn("SURFACE_SHOWCASE_METRICS_UNAVAILABLE", String((error as {code?: string}).code ?? "unknown"));
    return empty(503);
  }
}
