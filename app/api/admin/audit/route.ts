import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readLimit, readPage } from "@/lib/admin/admin-http";
import { listAdminAuditEvents } from "@/lib/admin/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "audit.read");
    const url = new URL(request.url);
    const events = await listAdminAuditEvents(
      readLimit(url.searchParams.get("limit")),
      readPage(url.searchParams.get("page")),
    );
    return noStoreJsonResponse({ ok: true, events });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
