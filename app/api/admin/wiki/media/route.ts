import { createHash } from "node:crypto";

import { AdminAccessError, assertAdminUploadRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import { listWikiMedia, storeWikiMedia } from "@/lib/wiki/wiki-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectMime(name: string, bytes: Uint8Array) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png") && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png" as const;
  }
  if ((lower.endsWith(".jpg") || lower.endsWith(".jpeg")) && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    return "image/jpeg" as const;
  }
  if (lower.endsWith(".webp") && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") {
    return "image/webp" as const;
  }
  throw new AdminAccessError(400, "Only signature-verified PNG, JPEG, and WebP files are accepted.");
}

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    return noStoreJsonResponse({ ok: true, assets: await listWikiMedia() });
  } catch (error) {
    return adminErrorResponse(error, "Wiki media list failed.");
  }
}

export async function POST(request: Request) {
  try {
    assertAdminUploadRequest(request);
    const actor = await requireAdminCapability(request, "wiki.media.write");
    const form = await request.formData();
    const file = form.get("file");
    const alt = String(form.get("alt") ?? "").trim();
    if (!(file instanceof File) || !alt) {
      throw new AdminAccessError(400, "Wiki media file and alt text are required.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storeWikiMedia(actor, {
      originalName: file.name,
      alt,
      bytes,
      mimeType: detectMime(file.name, bytes),
      contentHash: createHash("sha256").update(bytes).digest("hex"),
    });
    await recordAdminAuditEvent({
      actor,
      action: "admin.wiki.media_uploaded",
      targetType: "wiki_asset",
      targetId: stored.id,
      afterSummary: { storagePath: stored.storagePath, reused: stored.reused },
      reason: "Wiki media upload",
      success: true,
    });
    return noStoreJsonResponse({ ok: true, asset: stored }, 201);
  } catch (error) {
    return adminErrorResponse(error, "Wiki media upload failed.");
  }
}
