import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
} from "@/lib/admin/admin-http";
import { getAdminWikiPreview } from "@/lib/wiki/wiki-cms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    await requireAdminCapability(request, "wiki.read");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
        400,
      );
    }
    return noStoreJsonResponse({
      ok: true,
      preview: await getAdminWikiPreview(body.snapshot),
    });
  } catch (error) {
    return adminErrorResponse(error, "Wiki preview failed.");
  }
}
