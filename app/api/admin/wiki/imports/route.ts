import { AdminAccessError, assertAdminUploadRequest, requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import type { WikiImportMode, WikiQueueReflowPolicy } from "@/lib/wiki/wiki-cms-types";
import { auditWikiFailure } from "@/lib/wiki/wiki-cms-service";
import {
  importValidatedWikiPackage,
  listWikiImportPackageSummaries,
  previewWikiQueueMergeImport,
} from "@/lib/wiki/wiki-import-service";
import { parseWikiPackageArchive } from "@/lib/wiki/wiki-package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const packages = await listWikiImportPackageSummaries();
    return noStoreJsonResponse({ ok: true, packages });
  } catch (error) {
    return adminErrorResponse(error, "Wiki import package list failed.");
  }
}

export async function POST(request: Request) {
  let actor;
  try {
    assertAdminUploadRequest(request);
    actor = await requireAdminCapability(request, "wiki.import.write");
    const form = await request.formData();
    const file = form.get("package");
    const modeValue = form.get("mode");
    const mode: WikiImportMode = modeValue === "review_first"
      ? "review_first"
      : modeValue === "merge_queue" ? "merge_queue" : "auto_schedule";
    if (mode !== "review_first" && !actor.capabilities.includes("wiki.publish.write")) {
      throw new AdminAccessError(403, "Scheduling also requires Wiki publisher permission.");
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
    if (mode === "merge_queue") {
      const policyValue = form.get("policy");
      const policy: WikiQueueReflowPolicy = policyValue === "priority" || policyValue === "balanced_clusters"
        ? policyValue
        : "preserve";
      const action = form.get("mergeAction");
      if (action === "preview") {
        const plan = await previewWikiQueueMergeImport({ package: parsed, policy });
        return noStoreJsonResponse({ ok: true, plan });
      }
      if (action !== "apply") throw new AdminAccessError(400, "A Wiki queue merge action is required.");
      const planToken = String(form.get("planToken") ?? "");
      const previewedAt = String(form.get("previewedAt") ?? "");
      const plan = await previewWikiQueueMergeImport({ package: parsed, policy, previewedAt });
      if (Date.parse(plan.expiresAt) < Date.now()) throw new AdminAccessError(409, "Wiki queue merge preview expired.");
      if (plan.planToken !== planToken) throw new AdminAccessError(409, "WIKI_SCHEDULING_PLAN_STALE");
      if (plan.queue.dependencyErrors.length || plan.queue.blackoutConflicts.length || plan.queue.horizonConflicts.length) {
        throw new AdminAccessError(409, "Wiki queue merge has unresolved conflicts.");
      }
      const result = await importValidatedWikiPackage({ actor, package: parsed, mode, mergePlan: plan });
      return noStoreJsonResponse({ ok: true, result }, 201);
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
