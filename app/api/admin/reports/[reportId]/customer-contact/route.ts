import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readObject, readRequiredString } from "@/lib/admin/admin-http";
import { getAdminReportCustomerContact } from "@/lib/admin/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ reportId: string }> }) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "users.contact.read");
    const body = readObject(await request.json());
    if (!body) return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    const reason = readRequiredString(body.reason, "reason", 1000);
    const { reportId } = await context.params;
    return noStoreJsonResponse({ ok: true, contact: await getAdminReportCustomerContact({ actor, reportId, reason }) });
  } catch (error) { return adminErrorResponse(error); }
}
