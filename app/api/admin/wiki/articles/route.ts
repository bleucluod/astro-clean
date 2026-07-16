import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readLimit,
  readObject,
} from "@/lib/admin/admin-http";
import {
  listAdminWikiArticles,
  listWikiCategories,
  saveAdminWikiDraft,
} from "@/lib/wiki/wiki-cms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const url = new URL(request.url);
    const [articles, categories] = await Promise.all([
      listAdminWikiArticles({
        search: url.searchParams.get("search")?.trim() ?? "",
        status: url.searchParams.get("status"),
        limit: readLimit(url.searchParams.get("limit"), 100),
      }),
      listWikiCategories(),
    ]);
    return noStoreJsonResponse({ ok: true, articles, categories });
  } catch (error) {
    return adminErrorResponse(error, "Wiki article list failed.");
  }
}

export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.draft.write");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    }
    const saved = await saveAdminWikiDraft({
      actor,
      snapshot: body.snapshot,
      autosave: false,
      reason: "Create Wiki draft",
    });
    return noStoreJsonResponse({ ok: true, ...saved }, 201);
  } catch (error) {
    return adminErrorResponse(error, "Wiki draft creation failed.");
  }
}
