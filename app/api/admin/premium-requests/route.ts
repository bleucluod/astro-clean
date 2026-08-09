import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  noStoreJsonResponse,
  adminErrorResponse,
  readLimit,
  readPage,
  readObject,
  readOptionalString,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  listPremiumRequests,
  updatePremiumRequest,
} from "@/lib/admin/admin-service";
import type { AdminPremiumRequestSummary } from "@/lib/admin/admin-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = [
  "new",
  "reviewing",
  "approved",
  "preparing",
  "delivered",
  "canceled",
] as const;

const deliveryStatuses = [
  "not_started",
  "preparing",
  "ready",
  "delivered",
  "canceled",
] as const;

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "premium_requests.read");
    const url = new URL(request.url);
    const requests = await listPremiumRequests(
      readLimit(url.searchParams.get("limit")),
      readPage(url.searchParams.get("page")),
    );
    return noStoreJsonResponse({ ok: true, requests });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(
      request,
      "premium_requests.write",
    );
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
      400,
    );
    }

    const requestId = readRequiredString(body.requestId, "requestId", 40);
    const status = readRequiredString(body.status, "status", 30);
    const deliveryStatus = readRequiredString(
      body.deliveryStatus,
      "deliveryStatus",
      30,
    );

    if (!statuses.includes(status as (typeof statuses)[number])) {
      return noStoreJsonResponse(
        { ok: false, error: "Unsupported premium request status." },
      400,
    );
    }
    if (
      !deliveryStatuses.includes(
        deliveryStatus as (typeof deliveryStatuses)[number],
      )
    ) {
      return noStoreJsonResponse(
        { ok: false, error: "Unsupported delivery status." },
      400,
    );
    }

    await updatePremiumRequest({
      actor,
      requestId,
      status: status as AdminPremiumRequestSummary["status"],
      deliveryStatus:
        deliveryStatus as AdminPremiumRequestSummary["deliveryStatus"],
      internalNotes: readOptionalString(body.internalNotes, 4000),
      agreedAmount: readOptionalString(body.agreedAmount, 80),
      dueDate: readOptionalString(body.dueDate, 30),
      linkedReportId: readOptionalString(body.linkedReportId, 200),
      reason: readRequiredString(body.reason, "reason", 1000),
    });

    return noStoreJsonResponse({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
