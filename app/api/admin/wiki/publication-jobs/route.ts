import { requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readLimit } from "@/lib/admin/admin-http";
import { listAdminWikiPublicationJobs } from "@/lib/wiki/wiki-cms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HALLEUS_WIKI_JOB_API_R44
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const url = new URL(request.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const result = await listAdminWikiPublicationJobs({
      limit: readLimit(url.searchParams.get("limit"), 25),
      page,
    });
    return noStoreJsonResponse({ ok: true, ...result });
  } catch (error) {
    return adminErrorResponse(error, "Wiki publication job list failed.");
  }
}
