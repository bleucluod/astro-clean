import { getAdminDatabase, asRecord, asString, asNullableString } from "@/lib/admin/admin-database";
import { createReportShareSecret, hashReportShareSecret, REPORT_SUMMARY_PAGE_SIZE, validateReportTitle } from "@/lib/reports/report-access-contract";

function reportTitle(row: Record<string, unknown>) {
  return asNullableString(row.title) ?? asNullableString(asRecord(row.report_json).title) ?? "گزارش ذخیره‌شده";
}

function summary(row: unknown) {
  const record = asRecord(row);
  return {
    id: asString(record.id),
    title: asString(record.title),
    name: asNullableString(record.name) ?? undefined,
    birthDate: "",
    birthTime: "",
    birthCity: "",
    birthCountry: "",
    reportType: asString(record.report_type) || "birth_chart",
    accessTier: asString(record.access_tier) || "free",
    status: "active" as const,
    createdAt: asString(record.created_at),
    updatedAt: asString(record.updated_at),
    favorite: Boolean(record.favorite),
    hasNote: Boolean(asNullableString(record.note)),
    visibility: asString(record.visibility),
    source: asString(record.source),
  };
}

export async function listOwnedReportSummaries(userId: string, page: number) {
  const sql = getAdminDatabase();
  const offset = (page - 1) * REPORT_SUMMARY_PAGE_SIZE;
  const rows = await sql`
    select id,
      coalesce(title, report_json #>> '{input,name}', 'گزارش ذخیره‌شده') as title,
      report_json #>> '{input,name}' as name,
      coalesce(report_json #>> '{metadata,reportType}', report_json ->> 'reportType', 'birth_chart') as report_type,
      coalesce(report_json #>> '{access,tier}', report_json ->> 'tier', 'free') as access_tier,
      note, favorite, visibility, source,
      created_at::text, updated_at::text,
      count(*) over()::int as total_count
    from public.halleus_reports
    where user_id = ${userId} and deleted_at is null
    order by created_at desc
    limit ${REPORT_SUMMARY_PAGE_SIZE} offset ${offset}
  `;
  return { summaries: rows.map(summary), page, pageSize: REPORT_SUMMARY_PAGE_SIZE, total: Number(rows[0]?.total_count ?? 0) };
}

export async function getOwnedReport(userId: string, reportId: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select id, user_id, title, report_json, note, favorite, visibility, source,
      created_at::text, updated_at::text
    from public.halleus_reports
    where id = ${reportId} and user_id = ${userId} and deleted_at is null
    limit 1
  `;
  const row = asRecord(rows[0]);
  if (!row.id) return null;
  return {
    id: asString(row.id), userId: asString(row.user_id), title: reportTitle(row), report: row.report_json,
    input: asRecord(row.report_json).input, note: asNullableString(row.note) ?? undefined,
    favorite: Boolean(row.favorite), visibility: asString(row.visibility), source: asString(row.source),
    createdAt: asString(row.created_at), updatedAt: asString(row.updated_at),
  };
}

export async function updateOwnedReportTitle(userId: string, reportId: string, value: unknown) {
  const sql = getAdminDatabase();
  const title = validateReportTitle(value);
  const rows = await sql`update public.halleus_reports set title = ${title}, updated_at = now() where id = ${reportId} and user_id = ${userId} and deleted_at is null returning id`;
  return rows.length > 0;
}

export async function enableOwnedReportSharing(userId: string, reportId: string) {
  const sql = getAdminDatabase();
  const secret = createReportShareSecret();
  const rows = await sql`update public.halleus_reports set visibility = 'shared_by_link', share_enabled = true, share_token_hash = ${secret.tokenHash}, restricted_at = null, restricted_by = null, restriction_reason = null, updated_at = now() where id = ${reportId} and user_id = ${userId} and deleted_at is null returning id`;
  return rows.length ? secret.token : null;
}

export async function revokeOwnedReportSharing(userId: string, reportId: string) {
  const sql = getAdminDatabase();
  const rows = await sql`update public.halleus_reports set visibility = 'unpublished', share_enabled = false, share_token_hash = null, updated_at = now() where id = ${reportId} and user_id = ${userId} and deleted_at is null returning id`;
  return rows.length > 0;
}

export async function softDeleteOwnedReport(userId: string, reportId: string) {
  const sql = getAdminDatabase();
  const rows = await sql`update public.halleus_reports set deleted_at = now(), deleted_by = ${userId}::uuid, delete_reason = 'Deleted by report owner.', visibility = 'unpublished', share_enabled = false, share_token_hash = null, updated_at = now() where id = ${reportId} and user_id = ${userId} and deleted_at is null returning id`;
  return rows.length > 0;
}

export async function getSharedReport(token: string) {
  const sql = getAdminDatabase();
  const tokenHash = hashReportShareSecret(token);
  const rows = await sql`select report_json from public.halleus_reports where share_token_hash = ${tokenHash} and share_enabled = true and visibility = 'shared_by_link' and restricted_at is null and deleted_at is null limit 1`;
  return rows[0]?.report_json ?? null;
}
