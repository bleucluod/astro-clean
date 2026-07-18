import {
  AdminAccessError,
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  applyAdminWikiQueuePositionMove,
  previewAdminWikiQueuePositionMove,
} from "@/lib/wiki/wiki-cms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readTargetPosition(value: unknown) {
  const position = Number(value);
  if (!Number.isInteger(position) || position < 1 || position > 100) {
    throw new AdminAccessError(
      400,
      "targetPosition must be an integer between 1 and 100.",
    );
  }
  return position;
}

export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
        400,
      );
    }
    const action = readRequiredString(body.action, "action", 30);
    const targetJobId = readRequiredString(body.targetJobId, "targetJobId", 80);
    if (!UUID_PATTERN.test(targetJobId)) {
      throw new AdminAccessError(400, "targetJobId is invalid.");
    }
    const targetPosition = readTargetPosition(body.targetPosition);
    const expectedUpdatedAt = readRequiredString(
      body.expectedUpdatedAt,
      "expectedUpdatedAt",
      100,
    );

    if (action === "preview_move") {
      await requireAdminCapability(request, "wiki.read");
      const plan = await previewAdminWikiQueuePositionMove({
        targetJobId,
        targetPosition,
        expectedUpdatedAt,
      });
      return noStoreJsonResponse({ ok: true, plan });
    }
    if (action === "apply_move") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      const plan = await applyAdminWikiQueuePositionMove({
        actor,
        targetJobId,
        targetPosition,
        expectedUpdatedAt,
        planToken: readRequiredString(body.planToken, "planToken", 100),
        previewedAt: readRequiredString(body.previewedAt, "previewedAt", 100),
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, plan });
    }
    return noStoreJsonResponse(
      { ok: false, error: "Unsupported Wiki queue position action." },
      400,
    );
  } catch (error) {
    return adminErrorResponse(error, "Wiki queue position action failed.");
  }
}
