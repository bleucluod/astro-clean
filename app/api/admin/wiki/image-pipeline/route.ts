import {
  AdminAccessError,
  assertAdminMutationRequest,
  assertAdminUploadRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  applyWikiImageReturnPackage,
  createWikiImageExport,
  getWikiArticleImageHistory,
  getWikiImagePipelineState,
  mutateWikiArticleImage,
  mutateWikiImageAsset,
  previewWikiImageReturnPackage,
  stageDirectWikiImage,
  stageExistingWikiAsset,
} from "@/lib/wiki/wiki-image-service";
import { revalidateWikiPublicPaths } from "@/lib/wiki/wiki-revalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readStableIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function mutationErrorResponse(
  error: unknown,
  input: {
    fallbackMessage: string;
    stage: string;
    correlationId: string;
    retrySafe: boolean;
  },
) {
  const status = error instanceof AdminAccessError ? error.status : 500;
  const message = error instanceof AdminAccessError ? error.message : input.fallbackMessage;
  if (!(error instanceof AdminAccessError)) {
    console.error(
      `[wiki-image-pipeline] correlation=${input.correlationId} stage=${input.stage}`,
      error,
    );
  }
  return noStoreJsonResponse(
    {
      ok: false,
      error: message,
      stage: input.stage,
      correlationId: input.correlationId,
      retrySafe: input.retrySafe,
    },
    status,
  );
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
  let stage = "request";
  let correlationId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  let retrySafe = true;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      stage = "upload_guard";
      assertAdminUploadRequest(request);
      const actor = await requireAdminCapability(request, "wiki.media.write");
      correlationId = actor.correlationId;
      const form = await request.formData();
      const action = String(form.get("action") ?? "");

      if (action === "direct_upload") {
        stage = "direct_upload";
        retrySafe = false;
        const directFile = form.get("file");
        if (!(directFile instanceof File)) {
          throw new AdminAccessError(400, "Direct image file is required.");
        }
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
      if (!(file instanceof File)) {
        throw new AdminAccessError(400, "Wiki image result package is required.");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());

      if (action === "preview_import") {
        stage = "preview_import";
        retrySafe = true;
        const preview = await previewWikiImageReturnPackage(bytes);
        return noStoreJsonResponse({ ok: true, preview });
      }

      if (action === "apply_import") {
        stage = "apply_import";
        retrySafe = false;
        const planToken = String(form.get("planToken") ?? "");
        const reason = String(form.get("reason") ?? "").trim();
        if (!planToken || !reason) {
          throw new AdminAccessError(400, "Preview token and reason are required.");
        }
        const state = await applyWikiImageReturnPackage(actor, bytes, planToken, reason);
        return noStoreJsonResponse({ ok: true, state });
      }

      throw new AdminAccessError(400, "Unsupported Wiki image upload action.");
    }

    stage = "mutation_guard";
    assertAdminMutationRequest(request);
    const actor = await requireAdminCapability(request, "wiki.media.write");
    correlationId = actor.correlationId;
    const body = readObject(await request.json());
    if (!body) throw new AdminAccessError(400, "Request body must be an object.");
    const action = readRequiredString(body.action, "action", 80);

    if (action === "select_asset") {
      stage = "select_asset";
      retrySafe = false;
      const result = await stageExistingWikiAsset(actor, {
        stableId: readRequiredString(body.stableId, "stableId", 180),
        assetId: readRequiredString(body.assetId, "assetId", 80),
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "asset_metadata" || action === "asset_archive") {
      stage = action;
      retrySafe = action === "asset_metadata";
      const result = await mutateWikiImageAsset(actor, {
        action: action === "asset_metadata" ? "metadata" : "archive",
        assetId: readRequiredString(body.assetId, "assetId", 80),
        altFa: typeof body.altFa === "string" ? body.altFa : undefined,
        reason: readRequiredString(body.reason, "reason", 1000),
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "export") {
      stage = "export_generate";
      retrySafe = false;
      const exported = await createWikiImageExport(actor, readStableIds(body.stableIds));
      stage = "export_response";
      const response = new Response(exported.bytes, {
        status: 200,
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${exported.filename}"`,
          "cache-control": "no-store",
          "x-halleus-image-batch-id": exported.batchId,
          "x-request-id": correlationId,
        },
      });
      return response;
    }

    if (["metadata", "approve", "reject", "retry", "detach"].includes(action)) {
      stage = `article_${action}`;
      retrySafe = action === "metadata";
      const result = await mutateWikiArticleImage(actor, {
        action: action as "metadata" | "approve" | "reject" | "retry" | "detach",
        stableId: readRequiredString(body.stableId, "stableId", 180),
        expectedRevision: Number(body.expectedRevision),
        reason: readRequiredString(body.reason, "reason", 1000),
        altFa: typeof body.altFa === "string" ? body.altFa : undefined,
        caption:
          body.caption === null || typeof body.caption === "string"
            ? body.caption
            : undefined,
        focalX: typeof body.focalX === "number" ? body.focalX : undefined,
        focalY: typeof body.focalY === "number" ? body.focalY : undefined,
        provenance:
          body.provenance &&
          typeof body.provenance === "object" &&
          !Array.isArray(body.provenance)
            ? (body.provenance as Record<string, unknown>)
            : undefined,
      });
      revalidateWikiPublicPaths([], { cachePolicy: "expire-now" });
      return noStoreJsonResponse({ ok: true, result });
    }

    throw new AdminAccessError(400, "Unsupported Wiki image action.");
  } catch (error) {
    return mutationErrorResponse(error, {
      fallbackMessage: "Wiki image pipeline mutation failed.",
      stage,
      correlationId,
      retrySafe,
    });
  }
}