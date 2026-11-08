import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { getAdminOverviewTrends, type OverviewTrendRange } from "@/lib/admin/admin-overview-trends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aggregated admin-only metrics; no raw reports, customers, or personal content. */
export async function GET(request: Request) {
  try {
    const actor = await requireAdminCapability(request, "dashboard.read");
    const url = new URL(request.url);
    const raw = url.searchParams.get("days") ?? "30";
    if (!["7", "30", "90", "365"].includes(raw) || Array.from(url.searchParams.keys()).some((key) => key !== "days")) {
      return noStoreJsonResponse({ ok: false, error: "بازهٔ زمانی نامعتبر است." }, 400);
    }
    const trends = await getAdminOverviewTrends(Number(raw) as OverviewTrendRange, actor);
    return noStoreJsonResponse({ ok: true, trends });
  } catch (error) {
    return adminErrorResponse(error, "آمار نمای کلی دریافت نشد.");
  }
}
