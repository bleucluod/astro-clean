import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { getWikiIndexabilityObservabilityState } from "@/lib/wiki/wiki-indexability-observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const state = await getWikiIndexabilityObservabilityState();
    return noStoreJsonResponse({ ok: true, state });
  } catch (error) {
    return adminErrorResponse(error, "Wiki indexability observability read failed.");
  }
}
