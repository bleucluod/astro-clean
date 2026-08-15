import { AdminAccessError, assertAdminMutationRequest, assertAdminUploadRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readObject, readRequiredString } from "@/lib/admin/admin-http";
import {
  applyWikiImageReturnPackage,
  createWikiImageExport,
  getWikiArticleImageHistory,
  getWikiImagePipelineState,
  mutateWikiArticleImage,
  previewWikiImageReturnPackage,
  stageDirectWikiImage,
  stageExistingWikiAsset,
} from "@/lib/wiki/wiki-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readStableIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const url = new URL(request.url);
    const stableId = url.searchParams.get("stableId")?.trim() || undefined;
    const historyFor = url.searchParams.get("historyFor")?.trim() || undefined;
    const state = await getWikiImagePipelineState(stableId);
    const history = historyFor ? await getWikiArticleImageHistory(historyFor) : [];
    return noStoreJsonResponse({ ok: true, state, history });
  } catch (error) {
    return adminErrorResponse(error, "Wiki image pipeline read failed.");
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      assertAdminUploadRequest(request);
      const actor = await requireAdminCapability(request, "wiki.media.write");
      const form = await request.formData();
      const action = String(form.get("action") ?? "");
      if (action === "direct_upload") {
        const directFile = form.get("file");
        if (!(directFile instanceof File)) throw new AdminAccessError(400, "Direct image file is required.");
        const state = await stageDirectWikiImage(actor, {
          stableId: String(form.get("stableId") ?? "").trim(),
          originalName: directFile.name,
          mimeType: directFile.type,
          bytes: new Uint8Array(await directFile.arrayBuffer()),
          altFa: String(form.get("altFa") ?? "").trim(),
          reason: String(form.get("reason") ?? "").trim(),
        });
        return noStoreJsonResponse({ ok: true, state });
      }
      const file = form.get("package");
      if (!(file instanceof File)) throw new AdminAccessError(400, "Wiki image result package is required.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (action === "preview_import") {
        const preview = await previewWikiImageReturnPackage(bytes);
        return noStoreJsonResponse({ ok: true, preview });
      }
      if (action === "apply_import") {
        const planToken = String(form.get("planToken") ?? "");
        const reason = String(form.get("reason") ?? "").trim();
        if (!planToken || !reason) throw new AdminAccessError(400, "Preview token and reason are required.");
        const state = await applyWikiImageReturnPackage(actor, bytes, planToken, reason);
        return noStoreJsonResponse({ ok: true, state });
      }
      throw new AdminAccessError(400, "Unsupported Wiki image upload action.");
    }

    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.media.write");
    const body = readObject(await request.json());
    if (!body) throw new AdminAccessError(400, "Request body must be an object.");
    const action = readRequiredString(body.action, "action", 80);
    if (action === "select_asset") {
      const result = await stageExistingWikiAsset(actor, {
        stableId: readRequiredString(body.stableId, "stableId", 180),
        assetId: readRequiredString(body.assetId, "assetId", 80),
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }
    if (action === "export") {
      const exported = await createWikiImageExport(actor, readStableIds(body.stableIds));
      return new Response(exported.bytes, {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${exported.filename}"`,
          "cache-control": "no-store",
          "x-halleus-image-batch-id": exported.batchId,
        },
      });
    }
    if (["metadata", "approve", "reject", "retry", "detach"].includes(action)) {
      const result = await mutateWikiArticleImage(actor, {
        action: action as "metadata" | "approve" | "reject" | "retry" | "detach",
        stableId: readRequiredString(body.stableId, "stableId", 180),
        expectedRevision: Number(body.expectedRevision),
        reason: readRequiredString(body.reason, "reason", 1000),
        altFa: typeof body.altFa === "string" ? body.altFa : undefined,
        caption: body.caption === null || typeof body.caption === "string" ? body.caption : undefined,
        focalX: typeof body.focalX === "number" ? body.focalX : undefined,
        focalY: typeof body.focalY === "number" ? body.focalY : undefined,
        provenance: body.provenance && typeof body.provenance === "object" && !Array.isArray(body.provenance)
          ? body.provenance as Record<string, unknown>
          : undefined,
      });
      return noStoreJsonResponse({ ok: true, result });
    }
    throw new AdminAccessError(400, "Unsupported Wiki image action.");
  } catch (error) {
    return adminErrorResponse(error, "Wiki image pipeline mutation failed.");
  }
}