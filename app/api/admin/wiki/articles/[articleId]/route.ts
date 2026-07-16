import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readOptionalString,
} from "@/lib/admin/admin-http";
import { getAdminWikiArticle, saveAdminWikiDraft } from "@/lib/wiki/wiki-cms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ articleId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const { articleId } = await context.params;
    const article = await getAdminWikiArticle(articleId);
    return noStoreJsonResponse({ ok: true, article });
  } catch (error) {
    return adminErrorResponse(error, "Wiki article read failed.");
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.draft.write");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    }
    const { articleId } = await context.params;
    const saved = await saveAdminWikiDraft({
      actor,
      articleId,
      snapshot: body.snapshot,
      autosave: body.autosave === true,
      reason: readOptionalString(body.reason, 1000),
    });
    return noStoreJsonResponse({ ok: true, ...saved });
  } catch (error) {
    return adminErrorResponse(error, "Wiki draft save failed.");
  }
}
