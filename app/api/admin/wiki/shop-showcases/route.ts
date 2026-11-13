import { revalidatePath } from "next/cache";
import {
  AdminAccessError, assertAdminMutationRequest, assertAdminUploadRequest, requireAdminCapability,
} from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readObject } from "@/lib/admin/admin-http";
import { saveWikiShopShowcaseBatch } from "@/lib/wiki/wiki-shop-showcase";
import { loadWikiShowcaseMetrics, parseShowcaseMetricsWindow } from "@/lib/wiki/wiki-showcase-metrics";
import { updatePublishedWikiShowcaseCopy } from "@/lib/wiki/wiki-showcase-copy-update";
import {
  buildWikiShowcaseSelectedZip, estimateWikiShowcaseSelectedZip, importWikiShowcaseProposalPackage,
  loadWikiShowcaseDashboard, loadWikiShowcaseArticle, rejectWikiShowcaseProposals,
  reopenWikiShowcaseProposals,
} from "@/lib/wiki/wiki-shop-showcase-workflow";
import { readWikiShowcaseZip } from "@/lib/wiki/wiki-showcase-zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const url = new URL(request.url);
    if (url.searchParams.get("mode") === "metrics") {
      const window = parseShowcaseMetricsWindow(url.searchParams.get("window"));
      return noStoreJsonResponse({ ok: true, ...(await loadWikiShowcaseMetrics(window)) });
    }
    if (url.searchParams.get("mode") === "article") {
      const articleId = url.searchParams.get("articleId") ?? "";
      return noStoreJsonResponse({ ok: true, article: await loadWikiShowcaseArticle(articleId) });
    }
    if (url.searchParams.get("mode") === "export") {
      return noStoreJsonResponse({ ok: false, error: "Use selected ZIP export" }, 410);
    }
    return noStoreJsonResponse({ ok: true, ...(await loadWikiShowcaseDashboard()) });
  } catch (error) {
    return adminErrorResponse(error, "Wiki shop showcase read failed; check migrations 0036, 0037 and 0038.");
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("multipart/form-data")) {
      assertAdminUploadRequest(request);
      const actor = await requireAdminCapability(request, "wiki.publish.write");
      const data = await request.formData();
      const uploaded = data.get("file");
      if (!(uploaded instanceof File) || uploaded.size > 8_000_000 ||
          !uploaded.name.toLowerCase().endsWith(".zip")) {
        return noStoreJsonResponse({ ok: false, error: "Invalid ZIP (8 MB maximum)" }, 400);
      }
      let entries: Map<string, string>;
      try {
        entries = readWikiShowcaseZip(new Uint8Array(await uploaded.arrayBuffer()));
      } catch (cause) {
        throw new AdminAccessError(400, cause instanceof Error ? cause.message : "Invalid ZIP");
      }
      const copyText = entries.get("copy-updates.json");
      if (copyText) {
        if (entries.size !== 1) throw new AdminAccessError(400, "Copy ZIP must contain copy-updates.json only");
        const copyMode = data.get("copyMode");
        if (copyMode !== "preview" && copyMode !== "apply") {
          throw new AdminAccessError(400, "Copy update requires preview or apply mode");
        }
        let copyParsed: unknown;
        try { copyParsed = JSON.parse(copyText); }
        catch { throw new AdminAccessError(400, "Invalid copy-updates.json"); }
        const outcome = await updatePublishedWikiShowcaseCopy(actor, copyParsed, copyMode === "apply");
        if (copyMode === "apply") {
          for (const slug of outcome.slugs) revalidatePath("/wiki/" + slug, "page");
        }
        return noStoreJsonResponse({ ok: true, ...outcome });
      }
      let parsed: unknown;
      try {
        const text = entries.get("proposals.json");
        if (!text) throw new Error("proposals.json missing in ZIP");
        parsed = JSON.parse(text);
      } catch (cause) {
        throw new AdminAccessError(400, cause instanceof Error ? cause.message : "Invalid ZIP");
      }
      return noStoreJsonResponse({ ok: true, ...(await importWikiShowcaseProposalPackage(actor, parsed)) });
    }

    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.publish.write");
    const body = readObject(await request.json());
    if (!body) return noStoreJsonResponse({ ok: false, error: "Invalid request body" }, 400);
    if (body.action === "estimate") {
      return noStoreJsonResponse({ ok: true, ...(await estimateWikiShowcaseSelectedZip(body)) });
    }
    if (body.action === "export_zip") {
      const archive = await buildWikiShowcaseSelectedZip(actor, body);
      return new Response(new Uint8Array(archive.bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="' + archive.filename + '"',
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (body.action === "import") {
      return noStoreJsonResponse({ ok: true, ...(await importWikiShowcaseProposalPackage(actor, body.package)) });
    }
    if (body.action === "reject" || body.action === "reopen") {
      const articleIds = body.action === "reject"
        ? await rejectWikiShowcaseProposals(actor, body.proposalIds)
        : await reopenWikiShowcaseProposals(actor, body.proposalIds);
      return noStoreJsonResponse({ ok: true, changedArticles: articleIds });
    }
    if (body.action === "publish" || body.action === "toggle") {
      if (body.action === "publish" && (!Array.isArray(body.items) ||
          body.items.some((item: unknown) => readObject(item)?.enabled !== true))) {
        return noStoreJsonResponse({ ok: false, error: "Published offers must be enabled" }, 400);
      }
      const slugs = await saveWikiShopShowcaseBatch(actor, body.items);
      for (const slug of slugs) revalidatePath("/wiki/" + slug, "page");
      return noStoreJsonResponse({ ok: true, changedCount: slugs.length, slugs });
    }
    return noStoreJsonResponse({ ok: false, error: "Unknown action" }, 400);
  } catch (error) {
    return adminErrorResponse(error, "Wiki shop showcase change failed.");
  }
}
