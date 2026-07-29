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
  permanentlyDeleteAdminWikiArticles,
  publishAdminWikiDrafts,
  softDeleteAdminWikiArticles,
} from "@/lib/wiki/wiki-cms-service";
import { revalidateWikiPublicPaths } from "@/lib/wiki/wiki-revalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BULK_ARTICLES = 100;
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
    articleIds.length > MAX_BULK_ARTICLES ||
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
    if (action !== "delete" && action !== "publish" && action !== "permanent_delete") {
      return noStoreJsonResponse(
        { ok: false, error: "Unsupported Wiki bulk action." },
        400,
      );
    }

    const articleIds = readArticleIds(body.articleIds);
    const reason = readRequiredString(body.reason, "reason", 1000);
    if (action === "permanent_delete") {
      const confirmation = readRequiredString(
        body.confirmation,
        "confirmation",
        100,
      );
      const result = await permanentlyDeleteAdminWikiArticles({
        actor,
        articleIds,
        confirmation,
        reason,
      });
      revalidateWikiPublicPaths();
      return noStoreJsonResponse({ ok: true, result });
    }
    if (action === "publish") {
      const result = await publishAdminWikiDrafts({
        actor,
        articleIds,
        reason,
      });
      revalidateWikiPublicPaths(
        result.published.flatMap((article) => [
          article.slug,
          article.previousSlug,
        ]),
      );
      return noStoreJsonResponse({ ok: true, result });
    }

    const result = await softDeleteAdminWikiArticles({
      actor,
      articleIds,
      reason,
    });
    revalidateWikiPublicPaths();
    return noStoreJsonResponse({ ok: true, result });
  } catch (error) {
    return adminErrorResponse(error, "Wiki bulk action failed.");
  }
}
