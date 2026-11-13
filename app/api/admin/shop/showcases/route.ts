import { requireAdminCapability, assertAdminMutationRequest } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readObject } from "@/lib/admin/admin-http";
import { readSurfaceShowcaseDashboard, reviewSurfaceProposal, saveSurfacePlacement } from "@/lib/shop/shop-showcase-surfaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    return noStoreJsonResponse({ ok: true, ...await readSurfaceShowcaseDashboard() });
  } catch (error) { return adminErrorResponse(error, "ویترین‌های گزارش دریافت نشد."); }
}
export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.publish.write");
    const input = readObject(await request.json());
    if (!input) return noStoreJsonResponse({ ok: false, error: "درخواست نامعتبر است." }, 400);
    if (input.action === "save") {
      return noStoreJsonResponse({ ok: true, ...await saveSurfacePlacement(actor, input.placement) });
    }
    if (input.action === "publish" || input.action === "reject") {
      return noStoreJsonResponse({ ok: true,
        ...await reviewSurfaceProposal(actor, input.id, input.action, input.draft) });
    }
    return noStoreJsonResponse({ ok: false, error: "عملیات نامعتبر است." }, 400);
  } catch (error) { return adminErrorResponse(error, "ذخیرهٔ ویترین انجام نشد."); }
}
