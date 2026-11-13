import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { normalizeAnalyticsPath } from "@/lib/analytics/first-party";
import { parseAnalyticsWindow } from "@/lib/admin/halleus-analytics-range";
import { getHalleusAnalyticsDashboard, getHalleusPageAnalytics } from "@/lib/admin/halleus-analytics-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminCapability(request, "dashboard.read");
    const params = new URL(request.url).searchParams;
    if (params.getAll("page").length > 1) {
      return noStoreJsonResponse({ ok: false, error: "درخواست نامعتبر است." }, 400);
    }
    const requestedPage = params.get("page");
    const rangeParams = new URLSearchParams(params);
    rangeParams.delete("page");
    const window = parseAnalyticsWindow(rangeParams);
    if (!window) {
      return noStoreJsonResponse({ ok: false, error: "بازهٔ زمانی نامعتبر است." }, 400);
    }
    if (requestedPage !== null) {
      const path = normalizeAnalyticsPath(requestedPage);
      if (!path) return noStoreJsonResponse({ ok: false, error: "صفحهٔ نامعتبر است." }, 400);
      const page = await getHalleusPageAnalytics(path, window, actor);
      return noStoreJsonResponse({ ok: true, page });
    }
    const dashboard = await getHalleusAnalyticsDashboard(window, actor);
    return noStoreJsonResponse({ ok: true, dashboard });
  } catch (error) {
    return adminErrorResponse(error, "آمار هالیوس دریافت نشد.");
  }
}
