import { AdminAccessError, assertAdminUploadRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import type { WikiImportMode } from "@/lib/wiki/wiki-cms-types";
import { auditWikiFailure } from "@/lib/wiki/wiki-cms-service";
import { importValidatedWikiPackage } from "@/lib/wiki/wiki-import-service";
import { parseWikiPackageArchive } from "@/lib/wiki/wiki-package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let actor;
  try {
    assertAdminUploadRequest(request);
    actor = await requireAdminCapability(request, "wiki.import.write");
    const form = await request.formData();
    const file = form.get("package");
    const modeValue = form.get("mode");
    const mode: WikiImportMode = modeValue === "review_first" ? "review_first" : "auto_schedule";
    if (mode === "auto_schedule" && !actor.capabilities.includes("wiki.publish.write")) {
      throw new AdminAccessError(403, "Automatic scheduling also requires Wiki publisher permission.");
    }
    if (!(file instanceof File)) {
      throw new AdminAccessError(400, "A Wiki package ZIP is required.");
    }
    let parsed;
    try {
      parsed = parseWikiPackageArchive(file.name, new Uint8Array(await file.arrayBuffer()));
    } catch (error) {
      throw new AdminAccessError(400, error instanceof Error ? error.message : "Wiki package validation failed.");
    }
    const result = await importValidatedWikiPackage({ actor, package: parsed, mode });
    return noStoreJsonResponse({ ok: true, result }, 201);
  } catch (error) {
    if (actor) {
      await auditWikiFailure({
        actor,
        action: "admin.wiki.package_import_failed",
        targetType: "wiki_import_package",
        reason: "Wiki package upload",
        error,
      });
    }
    return adminErrorResponse(error, "Wiki package import failed.");
  }
}
