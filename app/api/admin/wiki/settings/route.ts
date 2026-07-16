import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import { getWikiScheduleSettings, updateWikiScheduleSettings } from "@/lib/wiki/wiki-cms-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    return noStoreJsonResponse({ ok: true, settings: await getWikiScheduleSettings() });
  } catch (error) {
    return adminErrorResponse(error, "Wiki schedule settings read failed.");
  }
}

export async function PUT(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.settings.write");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    }
    const settings = await updateWikiScheduleSettings({
      actor,
      settings: body.settings,
      reason: readRequiredString(body.reason, "reason", 1000),
    });
    return noStoreJsonResponse({ ok: true, settings });
  } catch (error) {
    return adminErrorResponse(error, "Wiki schedule settings update failed.");
  }
}
