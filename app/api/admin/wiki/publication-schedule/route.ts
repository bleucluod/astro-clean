import {
  AdminAccessError,
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
  applyAdminWikiBulkSchedule,
  previewAdminWikiBulkSchedule,
} from "@/lib/wiki/wiki-cms-service";
import { WIKI_BULK_SCHEDULE_MAX_ARTICLES } from "@/lib/wiki/wiki-bulk-scheduling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readArticleIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new AdminAccessError(400, "articleIds must be an array.");
  }

  const articleIds = value.map((entry) =>
    typeof entry === "string" ? entry.trim() : "",
  );
  if (
    articleIds.length < 1 ||
    articleIds.length > WIKI_BULK_SCHEDULE_MAX_ARTICLES ||
    articleIds.some((articleId) => !UUID_PATTERN.test(articleId)) ||
    new Set(articleIds).size !== articleIds.length
  ) {
    throw new AdminAccessError(400, "articleIds are invalid.");
  }

  return articleIds;
}

export async function POST(request: Request) {
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

    const action = readRequiredString(body.action, "action", 30);
    const articleIds = readArticleIds(body.articleIds);

    if (action === "preview") {
      const plan = await previewAdminWikiBulkSchedule({ articleIds });
      return noStoreJsonResponse({ ok: true, plan });
    }

    if (action === "apply") {
      const result = await applyAdminWikiBulkSchedule({
        actor,
        articleIds,
        planToken: readRequiredString(body.planToken, "planToken", 100),
        previewedAt: readRequiredString(body.previewedAt, "previewedAt", 80),
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    return noStoreJsonResponse(
      { ok: false, error: "Unsupported Wiki bulk schedule action." },
      400,
    );
  } catch (error) {
    return adminErrorResponse(error, "Wiki bulk scheduling failed.");
  }
}
