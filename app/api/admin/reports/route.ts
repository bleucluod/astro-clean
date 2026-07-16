import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  noStoreJsonResponse,
  adminErrorResponse,
  readLimit,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  listAdminReports,
  restrictAdminReportVisibility,
} from "@/lib/admin/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "reports.read");
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 160);
    const reports = await listAdminReports(
      search,
      readLimit(url.searchParams.get("limit")),
    );
    return noStoreJsonResponse({ ok: true, reports });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(
      request,
      "reports.visibility.restrict",
    );
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
      400,
    );
    }

    const action = readRequiredString(body.action, "action", 80);
    if (action !== "restrict_visibility") {
      return noStoreJsonResponse(
        { ok: false, error: "Admin cannot force-publish a report." },
      400,
    );
    }

    const reportId = readRequiredString(body.reportId, "reportId", 200);
    const reason = readRequiredString(body.reason, "reason", 1000);
    await restrictAdminReportVisibility({ actor, reportId, reason });
    return noStoreJsonResponse({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
