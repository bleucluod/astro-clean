import { assertAdminMutationRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  publishAdminWikiDraft,
  rollbackAdminWikiRevision,
  setAdminWikiArticleDeleted,
  unpublishAdminWikiArticle,
} from "@/lib/wiki/wiki-cms-service";
import { submitWikiIndexNowUrlsBestEffort } from "@/lib/wiki/wiki-indexnow";
import { revalidateWikiPublicPaths } from "@/lib/wiki/wiki-revalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ articleId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertAdminMutationRequest(request);
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    }
    const action = readRequiredString(body.action, "action", 40);
    const reason = readRequiredString(body.reason, "reason", 1000);
    const { articleId } = await context.params;
    if (action === "publish" || action === "schedule") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      const result = await publishAdminWikiDraft({
        actor,
        articleId,
        reason,
        publishAt: action === "schedule" ? readRequiredString(body.publishAt, "publishAt", 80) : null,
      });
      if (result.mode === "published") {
        const publicDiscoverySlugs = [
          result.slug,
          result.previousSlug,
          ...result.activatedInboundSourceSlugs,
        ];
        revalidateWikiPublicPaths(publicDiscoverySlugs);
        const discovery = await submitWikiIndexNowUrlsBestEffort(
          [...publicDiscoverySlugs, "/wiki", "/sitemap.xml"],
          "admin-wiki-publish",
        );
        return noStoreJsonResponse({ ok: true, result, discovery });
      }
      return noStoreJsonResponse({ ok: true, result });
    }
    if (action === "unpublish") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      const result = await unpublishAdminWikiArticle({ actor, articleId, reason });
      revalidateWikiPublicPaths([result.slug, ...result.inboundSourceSlugs], {
        cachePolicy: "expire-now",
      });
      const discovery = await submitWikiIndexNowUrlsBestEffort(
        [result.slug, ...result.inboundSourceSlugs, "/wiki", "/sitemap.xml"],
        "admin-wiki-unpublish",
      );
      return noStoreJsonResponse({ ok: true, result, discovery });
    }
    if (action === "rollback") {
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      const revisionNumber = Number(body.revisionNumber);
      if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
        return noStoreJsonResponse({ ok: false, error: "revisionNumber is invalid." }, 400);
      }
      const result = await rollbackAdminWikiRevision({ actor, articleId, revisionNumber, reason });
      revalidateWikiPublicPaths([result.slug, result.previousSlug]);
      const discovery = await submitWikiIndexNowUrlsBestEffort(
        [result.slug, result.previousSlug, "/wiki", "/sitemap.xml"],
        "admin-wiki-rollback",
      );
      return noStoreJsonResponse({ ok: true, result, discovery });
    }
    if (action === "delete" || action === "restore") {
      const actor = await requireAdminCapability(
        request,
        action === "delete" ? "wiki.publish.write" : "wiki.draft.write",
      );
      await setAdminWikiArticleDeleted({ actor, articleId, deleted: action === "delete", reason });
      revalidateWikiPublicPaths(
        [],
        action === "delete" ? { cachePolicy: "expire-now" } : undefined,
      );
      return noStoreJsonResponse({ ok: true });
    }
    return noStoreJsonResponse({ ok: false, error: "Unsupported Wiki action." }, 400);
  } catch (error) {
    return adminErrorResponse(error, "Wiki article action failed.");
  }
}
