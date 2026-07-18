import {
  AdminAccessError,
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readOptionalString,
  readRequiredString,
} from "@/lib/admin/admin-http";
import { mutateAdminWikiPublishJob } from "@/lib/wiki/wiki-cms-service";
import type { WikiPublishJobOperation } from "@/lib/wiki/wiki-queue-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ jobId: string }> };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set<WikiPublishJobOperation>([
  "reschedule",
  "cancel",
  "retry",
]);

export async function POST(request: Request, context: Context) {
  try {
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.publish.write");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
        400,
      );
    }

    const { jobId } = await context.params;
    if (!UUID_PATTERN.test(jobId)) {
      throw new AdminAccessError(400, "jobId is invalid.");
    }

    const action = readRequiredString(body.action, "action", 30) as WikiPublishJobOperation;
    if (!ACTIONS.has(action)) {
      throw new AdminAccessError(400, "Unsupported Wiki publish job action.");
    }

    const result = await mutateAdminWikiPublishJob({
      actor,
      jobId,
      action,
      expectedUpdatedAt: readRequiredString(
        body.expectedUpdatedAt,
        "expectedUpdatedAt",
        100,
      ),
      publishAt: readOptionalString(body.publishAt, 100),
      reason: readRequiredString(body.reason, "reason", 1000),
    });

    return noStoreJsonResponse({ ok: true, result });
  } catch (error) {
    return adminErrorResponse(error, "Wiki publish job action failed.");
  }
}
