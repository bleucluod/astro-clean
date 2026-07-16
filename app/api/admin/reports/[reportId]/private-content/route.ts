import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import { getAdminPrivateReportContent } from "@/lib/admin/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ reportId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(
      request,
      "reports.private_content.read",
    );
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
        400,
      );
    }

    const { reportId } = await context.params;
    const reason = readRequiredString(body.reason, "reason", 1000);
    const content = await getAdminPrivateReportContent({
      actor,
      reportId,
      reason,
    });
    return noStoreJsonResponse({ ok: true, content });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
