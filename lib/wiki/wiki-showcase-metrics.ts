import { asNumber, asString, getAdminDatabase } from "@/lib/admin/admin-database";

export type ShowcaseMetricsWindow = "7" | "30" | "all";
export type ShowcaseMetric = {
  showcaseId: string; productId: string; impressions: number; clicks: number;
};

export function parseShowcaseMetricsWindow(value: string | null): ShowcaseMetricsWindow {
  if (value === null || value === "7") return "7";
  if (value === "30" || value === "all") return value;
  throw new Error("Invalid showcase metrics window");
}

export async function loadWikiShowcaseMetrics(window: ShowcaseMetricsWindow) {
  const days = window === "all" ? 0 : Number(window);
  const sql = getAdminDatabase();
  try {
    const rows = await sql`
      select showcase_id::text, product_id,
        sum(impressions)::text as impressions, sum(clicks)::text as clicks
      from halleus_private.wiki_shop_showcase_daily_metrics
      where (${days}::integer = 0 or
        day >= ((now() at time zone 'UTC')::date - (${days}::integer - 1)))
      group by showcase_id, product_id
    `;
    const metrics: ShowcaseMetric[] = rows.map((row) => ({
      showcaseId: asString(row.showcase_id), productId: asString(row.product_id),
      impressions: asNumber(row.impressions), clicks: asNumber(row.clicks),
    }));
    const summary = metrics.reduce((total, row) => ({
      impressions: total.impressions + row.impressions,
      clicks: total.clicks + row.clicks,
    }), { impressions: 0, clicks: 0 });
    return { ready: true, window, summary, metrics };
  } catch (error) {
    // Only a missing migration is optional. All other failures must remain visible.
    if ((error as { code?: string })?.code === "42P01") {
      return { ready: false, window, summary: { impressions: 0, clicks: 0 },
        metrics: [] as ShowcaseMetric[] };
    }
    throw error;
  }
}
