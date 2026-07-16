import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminCapability(request, "dashboard.read");
    return noStoreJsonResponse({
      ok: true,
      session: {
        userId: actor.userId,
        displayName: actor.displayName,
        role: actor.role,
        capabilities: actor.capabilities,
      },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
