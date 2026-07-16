import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import { createAdminWikiCategory, listWikiCategories } from "@/lib/wiki/wiki-cms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    return noStoreJsonResponse({ ok: true, categories: await listWikiCategories() });
  } catch (error) {
    return adminErrorResponse(error, "Wiki category list failed.");
  }
}

export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.settings.write");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    }
    const category = await createAdminWikiCategory({
      actor,
      category: body.category,
      reason: readRequiredString(body.reason, "reason", 1000),
    });
    return noStoreJsonResponse({ ok: true, category }, 201);
  } catch (error) {
    return adminErrorResponse(error, "Wiki category creation failed.");
  }
}
