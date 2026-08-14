import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  noStoreJsonResponse,
  adminErrorResponse,
  readLimit,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  restrictAdminReportVisibility,
  softDeleteAdminReport,
  updateAdminReportTitle,
} from "@/lib/admin/admin-service";
import {
  getAdminReportCohort,
  readAdminReportFilters,
} from "@/lib/admin/admin-report-intelligence";
import { readReportPage } from "@/lib/reports/report-access-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HALLEUS_REPORTS_INTELLIGENCE_API_R1
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "reports.read");
    const url = new URL(request.url);
    const filters = readAdminReportFilters(url.searchParams);
    const cohort = await getAdminReportCohort({
      filters,
      page: readReportPage(url.searchParams.get("page")),
      pageSize: readLimit(url.searchParams.get("limit")),
    });
    return noStoreJsonResponse({ ok: true, ...cohort });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
        400,
      );
    }

    const action = readRequiredString(body.action, "action", 80);
    if (!["restrict_visibility", "update_title", "soft_delete"].includes(action)) {
      return noStoreJsonResponse(
        { ok: false, error: "Admin cannot force-publish a report." },
        400,
      );
    }

    const reportId = readRequiredString(body.reportId, "reportId", 200);
    const reason = readRequiredString(body.reason, "reason", 1000);
    if (action === "restrict_visibility") {
      const actor = await requireAdminCapability(request, "reports.visibility.restrict");
      await restrictAdminReportVisibility({ actor, reportId, reason });
    } else if (action === "update_title") {
      const actor = await requireAdminCapability(request, "reports.title.write");
      await updateAdminReportTitle({ actor, reportId, title: body.title, reason });
    } else {
      const actor = await requireAdminCapability(request, "reports.delete");
      await softDeleteAdminReport({ actor, reportId, reason });
    }
    return noStoreJsonResponse({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
