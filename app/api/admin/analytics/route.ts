import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import {
  getHalleusAnalyticsDashboard, type AnalyticsRange,
} from "@/lib/admin/halleus-analytics-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminCapability(request, "dashboard.read");
    const params = new URL(request.url).searchParams;
    const days = params.get("days") ?? "7";
    if (!["7", "30", "90"].includes(days) ||
        Array.from(params.keys()).some((key) => key !== "days")) {
      return noStoreJsonResponse({ ok: false, error: "بازهٔ زمانی نامعتبر است." }, 400);
    }
    const dashboard = await getHalleusAnalyticsDashboard(Number(days) as AnalyticsRange, actor);
    return noStoreJsonResponse({ ok: true, dashboard });
  } catch (error) {
    return adminErrorResponse(error, "آمار هالیوس دریافت نشد.");
  }
}
