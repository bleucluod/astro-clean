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
  applyAdminWikiQueueBulkReorder,
  previewAdminWikiQueueBulkReorder,
  previewAdminWikiQueuePositionMove,
  previewAdminWikiQueueReflow,
  applyAdminWikiQueueReflow,
  previewAdminWikiQueueReflowUndo,
  applyAdminWikiQueueReflowUndo,
  previewAdminWikiPriorityRebalance,
  applyAdminWikiPriorityRebalance,
} from "@/lib/wiki/wiki-cms-service";
import type { WikiQueueReflowPolicy } from "@/lib/wiki/wiki-cms-types";

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

function readStableIds(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw new AdminAccessError(400, "stableIds must contain between 1 and 100 values.");
  }
  const stableIds = value.map((entry) => typeof entry === "string" ? entry.trim() : "");
  if (stableIds.some((stableId) => !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(stableId))) {
    throw new AdminAccessError(400, "stableIds are invalid.");
  }
  return stableIds;
}

function readReflowPolicy(value: unknown): WikiQueueReflowPolicy {
  if (value === "preserve" || value === "priority" || value === "balanced_clusters") return value;
  throw new AdminAccessError(400, "policy is invalid.");
}

export async function POST(request: Request) {
  // HALLEUS_WIKI_QUEUE_ACTION_LOG_R51
  let actionForLog = "unknown";
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
    actionForLog = action;
    // HALLEUS_WIKI_PRIORITY_REBALANCE_ROUTE_R55
    if (action === "preview_priority_rebalance") {
      await requireAdminCapability(request, "wiki.read");
      return noStoreJsonResponse({
        ok: true,
        plan: await previewAdminWikiPriorityRebalance(),
      });
    }
    if (action === "apply_priority_rebalance") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      return noStoreJsonResponse({
        ok: true,
        plan: await applyAdminWikiPriorityRebalance({
          actor,
          planToken: readRequiredString(body.planToken, "planToken", 100),
          previewedAt: readRequiredString(body.previewedAt, "previewedAt", 100),
          reason: readRequiredString(body.reason, "reason", 1000),
        }),
      });
    }

    if (action === "preview_reflow") {
      await requireAdminCapability(request, "wiki.read");
      return noStoreJsonResponse({ ok: true, plan: await previewAdminWikiQueueReflow({ policy: readReflowPolicy(body.policy) }) });
    }
    if (action === "apply_reflow") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      return noStoreJsonResponse({ ok: true, plan: await applyAdminWikiQueueReflow({
        actor,
        policy: readReflowPolicy(body.policy),
        planToken: readRequiredString(body.planToken, "planToken", 100),
        previewedAt: readRequiredString(body.previewedAt, "previewedAt", 100),
        reason: readRequiredString(body.reason, "reason", 1000),
      }) });
    }
    if (action === "preview_reflow_undo") {
      await requireAdminCapability(request, "wiki.read");
      return noStoreJsonResponse({ ok: true, plan: await previewAdminWikiQueueReflowUndo() });
    }
    if (action === "apply_reflow_undo") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      return noStoreJsonResponse({ ok: true, plan: await applyAdminWikiQueueReflowUndo({
        actor,
        sourcePlanToken: readRequiredString(body.sourcePlanToken, "sourcePlanToken", 100),
        planToken: readRequiredString(body.planToken, "planToken", 100),
        previewedAt: readRequiredString(body.previewedAt, "previewedAt", 100),
        reason: readRequiredString(body.reason, "reason", 1000),
      }) });
    }
    if (action === "preview_bulk") {
      await requireAdminCapability(request, "wiki.read");
      return noStoreJsonResponse({ ok: true, plan: await previewAdminWikiQueueBulkReorder({ requestedStableIds: readStableIds(body.stableIds) }) });
    }
    if (action === "apply_bulk") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      return noStoreJsonResponse({ ok: true, plan: await applyAdminWikiQueueBulkReorder({ actor, requestedStableIds: readStableIds(body.stableIds), planToken: readRequiredString(body.planToken, "planToken", 100), previewedAt: readRequiredString(body.previewedAt, "previewedAt", 100), reason: readRequiredString(body.reason, "reason", 1000) }) });
    }
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
    console.error("HALLEUS_WIKI_QUEUE_ACTION_FAILED", {
      action: actionForLog,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return adminErrorResponse(error, "Wiki queue action failed.");
  }
}
