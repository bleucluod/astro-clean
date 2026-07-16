import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { getAdminOverview } from "@/lib/admin/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "dashboard.read");
    return noStoreJsonResponse({ ok: true, overview: await getAdminOverview() });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
