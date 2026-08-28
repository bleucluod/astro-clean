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
import {
  applyWikiLinkSuggestion,
  decideWikiLinkSuggestion,
  editWikiLinkSuggestion,
  getWikiLinkAdminState,
  rollbackWikiLinkSuggestion,
  saveWikiLinkRules,
} from "@/lib/wiki/wiki-link-admin-service";
import { enqueueWikiLinkScanTriggerBestEffort } from "@/lib/wiki/wiki-link-admin-trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const url = new URL(request.url);
    const stableId = url.searchParams.get("stableId")?.trim() || null;
    const state = await getWikiLinkAdminState(stableId);
    return noStoreJsonResponse({ ok: true, state });
  } catch (error) {
    return adminErrorResponse(error, "Wiki link maintenance read failed.");
  }
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
    const action = readRequiredString(body.action, "action", 80);

    if (action === "scan") {
      await requireAdminCapability(request, "wiki.settings.write");
      const stableId =
        typeof body.stableId === "string" && body.stableId.trim()
          ? body.stableId.trim()
          : null;
      const result = await enqueueWikiLinkScanTriggerBestEffort({
        triggerKind: stableId ? "manual_article" : "manual_full",
        articleStableId: stableId,
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "save_rules") {
      const actor = await requireAdminCapability(request, "wiki.settings.write");
      const reason = readRequiredString(body.reason, "reason", 1000);
      const result = await saveWikiLinkRules({
        actor,
        rules: body.rules,
        reason,
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "edit_suggestion") {
      const actor = await requireAdminCapability(request, "wiki.draft.write");
      const result = await editWikiLinkSuggestion({
        actor,
        suggestionId: readRequiredString(body.suggestionId, "suggestionId", 80),
        proposedAnchor: readRequiredString(body.proposedAnchor, "proposedAnchor", 120),
        proposedParagraph: readRequiredString(
          body.proposedParagraph,
          "proposedParagraph",
          5000,
        ),
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "approve_suggestion" || action === "reject_suggestion") {
      const capability =
        action === "approve_suggestion" ? "wiki.publish.write" : "wiki.draft.write";
      const actor = await requireAdminCapability(request, capability);
      const result = await decideWikiLinkSuggestion({
        actor,
        suggestionId: readRequiredString(body.suggestionId, "suggestionId", 80),
        decision: action === "approve_suggestion" ? "approved" : "rejected",
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "apply_suggestion") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      const result = await applyWikiLinkSuggestion({
        actor,
        suggestionId: readRequiredString(body.suggestionId, "suggestionId", 80),
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "rollback_suggestion") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      const result = await rollbackWikiLinkSuggestion({
        actor,
        suggestionId: readRequiredString(body.suggestionId, "suggestionId", 80),
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    return noStoreJsonResponse(
      { ok: false, error: "Unknown Wiki link maintenance action." },
      400,
    );
  } catch (error) {
    return adminErrorResponse(error, "Wiki link maintenance mutation failed.");
  }
}
