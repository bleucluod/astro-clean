import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import { deleteWikiMedia } from "@/lib/wiki/wiki-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ assetId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.media.write");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    }
    const { assetId } = await context.params;
    await deleteWikiMedia(actor, assetId, readRequiredString(body.reason, "reason", 1000));
    return noStoreJsonResponse({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, "Wiki media deletion failed.");
  }
}
