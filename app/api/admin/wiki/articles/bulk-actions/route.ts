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
import {
  readWikiPublicRevalidationStates,
  revalidateWikiPublicChange,
} from "@/lib/wiki/wiki-revalidation";

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

async function readStates(articleIds: readonly string[]) {
  return readWikiPublicRevalidationStates(articleIds);
}

function revalidateStates(
  before: Awaited<ReturnType<typeof readStates>>,
  after: Awaited<ReturnType<typeof readStates>>,
  extrasByArticleId: Map<string, readonly string[]> = new Map(),
) {
  for (let index = 0; index < before.length; index += 1) {
    const articleId = before[index]?.articleId ?? after[index]?.articleId ?? "";
    revalidateWikiPublicChange({
      before: before[index],
      after: after[index],
      extraArticleSlugs: extrasByArticleId.get(articleId) ?? [],
    });
  }
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
    const before = await readStates(articleIds);

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
      const after = await readStates(articleIds);
      revalidateStates(before, after);
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "publish") {
      const result = await publishAdminWikiDrafts({
        actor,
        articleIds,
        reason,
      });
      const after = await readStates(articleIds);
      const extras = new Map(
        result.published.map((article) => [
          article.articleId,
          article.activatedInboundSourceSlugs,
        ] as const),
      );
      revalidateStates(before, after, extras);
      return noStoreJsonResponse({ ok: true, result });
    }

    const result = await softDeleteAdminWikiArticles({
      actor,
      articleIds,
      reason,
    });
    const after = await readStates(articleIds);
    revalidateStates(before, after);
    return noStoreJsonResponse({ ok: true, result });
  } catch (error) {
    return adminErrorResponse(error, "Wiki bulk action failed.");
  }
}