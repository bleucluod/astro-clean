import { AdminAccessError, requireAdminCapability } from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse, readLimit } from "@/lib/admin/admin-http";
import { listAdminWikiPublicationJobs } from "@/lib/wiki/wiki-cms-service";
import type {
  WikiPublicationJobStatusFilter,
  WikiPublicationJobView,
} from "@/lib/wiki/wiki-cms-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIEWS: WikiPublicationJobView[] = [
  "active",
  "failed",
  "published",
  "canceled",
];

const STATUSES: WikiPublicationJobStatusFilter[] = [
  "all",
  "queued",
  "running",
  "retry",
  "failed",
  "published",
  "canceled",
];

function readDate(value: string | null, field: string) {
  const normalized = value?.trim() || null;
  if (normalized && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AdminAccessError(400, `${field} must use YYYY-MM-DD.`);
  }
  return normalized;
}

function readPackageId(value: string | null) {
  const normalized = value?.trim() || null;
  if (
    normalized &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new AdminAccessError(400, "Wiki package ID is invalid.");
  }
  return normalized;
}

// HALLEUS_WIKI_PUBLICATION_CONTROL_API_R1
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "wiki.read");
    const url = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
    );
    const rawView = url.searchParams.get("view") ?? "active";
    const rawStatus = url.searchParams.get("status") ?? "all";
    const view = VIEWS.includes(rawView as WikiPublicationJobView)
      ? (rawView as WikiPublicationJobView)
      : "active";
    const status = STATUSES.includes(rawStatus as WikiPublicationJobStatusFilter)
      ? (rawStatus as WikiPublicationJobStatusFilter)
      : "all";

    const result = await listAdminWikiPublicationJobs({
      limit: readLimit(url.searchParams.get("limit"), 25),
      page,
      view,
      status,
      packageId: readPackageId(url.searchParams.get("packageId")),
      dateFrom: readDate(url.searchParams.get("dateFrom"), "dateFrom"),
      dateTo: readDate(url.searchParams.get("dateTo"), "dateTo"),
    });
    return noStoreJsonResponse({ ok: true, ...result });
  } catch (error) {
    return adminErrorResponse(error, "Wiki publication job list failed.");
  }
}
