import {
  requireAdminCapability,
  type VerifiedAdminActor,
} from "@/lib/admin/admin-auth";
import { adminErrorResponse } from "@/lib/admin/admin-http";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import {
  auditSafeReportFilters,
  getAdminReportCsvCohort,
  readAdminReportFilters,
} from "@/lib/admin/admin-report-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvFilename() {
  return `halleus-reports-cohort-${new Date().toISOString().slice(0, 10)}.csv`;
}

// HALLEUS_REPORT_FILTER_AWARE_CSV_R1
export async function GET(request: Request) {
  let actor: VerifiedAdminActor | null = null;
  try {
    actor = await requireAdminCapability(request, "reports.export");
    const url = new URL(request.url);
    const filters = readAdminReportFilters(url.searchParams);
    const result = await getAdminReportCsvCohort(filters);

    await recordAdminAuditEvent({
      actor,
      action: "admin.reports.cohort_exported",
      targetType: "report_cohort",
      afterSummary: {
        filters: auditSafeReportFilters(filters),
        rowCount: result.rowCount,
      },
      reason: "Filter-aware reports CSV export.",
      success: true,
    });

    return new Response(result.csv, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${csvFilename()}"`,
        "x-content-type-options": "nosniff",
        "x-halleus-cohort-rows": String(result.rowCount),
      },
    });
  } catch (error) {
    if (actor) {
      try {
        await recordAdminAuditEvent({
          actor,
          action: "admin.reports.cohort_export_failed",
          targetType: "report_cohort",
          afterSummary: {
            error:
              error instanceof Error
                ? error.message.slice(0, 300)
                : "Unknown export failure.",
          },
          reason: "Filter-aware reports CSV export failed.",
          success: false,
        });
      } catch {
        // Preserve the primary export failure.
      }
    }
    return adminErrorResponse(error, "Reports CSV export failed.");
  }
}
