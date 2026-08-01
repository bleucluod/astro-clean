import { getAdminDatabase, asRecord, asString, asNullableString } from "@/lib/admin/admin-database";
import {
  createReportShareSecret,
  evaluateOwnedReportPublicationMutation,
  hashReportShareSecret,
  REPORT_SUMMARY_PAGE_SIZE,
  type ReportPublicationMutationAction,
  validateReportTitle,
} from "@/lib/reports/report-access-contract";
import type { StoredReportPublication } from "@/types/storage";

function reportTitle(row: Record<string, unknown>) {
  return asNullableString(row.title) ?? asNullableString(asRecord(row.report_json).title) ?? "گزارش ذخیره‌شده";
}

function storedPublication(row: Record<string, unknown>): StoredReportPublication {
  const ownerKind = asString(row.publication_owner_kind);
  const accessTier = asString(row.access_tier);
  const publicationIntent = asString(row.publication_intent);
  const publicationState = asString(row.publication_state);
  const publicationConsentState = asString(row.publication_consent_state);
  const identityConsentState = asString(row.identity_consent_state);

  return {
    policyVersion: "1",
    ownerKind: ["local", "guest", "account", "legacy"].includes(ownerKind)
      ? ownerKind as StoredReportPublication["ownerKind"]
      : "legacy",
    accessTier: ["preview", "free", "premium"].includes(accessTier)
      ? accessTier as StoredReportPublication["accessTier"]
      : "free",
    publicationIntent: ["default", "publish", "unpublish"].includes(publicationIntent)
      ? publicationIntent as StoredReportPublication["publicationIntent"]
      : "default",
    publicationState: ["private", "public", "unpublished", "restricted"].includes(publicationState)
      ? publicationState as StoredReportPublication["publicationState"]
      : "private",
    publicationConsentState: ["not-required", "pending", "granted", "withdrawn"].includes(publicationConsentState)
      ? publicationConsentState as StoredReportPublication["publicationConsentState"]
      : "pending",
    identityConsentState: identityConsentState === "granted" ? "granted" : "withheld",
  };
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
    publicationOwnerKind: storedPublication(record).ownerKind,
    publicationState: storedPublication(record).publicationState,
    publicationConsentState: storedPublication(record).publicationConsentState,
    identityConsentState: storedPublication(record).identityConsentState,
    publicationPolicyVersion: storedPublication(record).policyVersion,
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
      publication_owner_kind, access_tier, publication_intent,
      publication_state, publication_consent_state,
      identity_consent_state, publication_policy_version,
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
      publication_owner_kind, access_tier, publication_intent,
      publication_state, publication_consent_state,
      identity_consent_state, publication_policy_version,
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
    publication: storedPublication(row),
    createdAt: asString(row.created_at), updatedAt: asString(row.updated_at),
  };
}

export type OwnedReportPublicationMutationResult =
  | {
      ok: true;
      visibility: "public" | "unpublished";
      publication: StoredReportPublication;
    }
  | {
      ok: false;
      code:
        | "not-found"
        | "admin-restricted"
        | "owner-kind-not-account"
        | "policy-rejected";
    };

export async function mutateOwnedReportPublication(
  userId: string,
  reportId: string,
  action: ReportPublicationMutationAction,
): Promise<OwnedReportPublicationMutationResult> {
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const rows = await tx`
      select id, visibility, restricted_at,
        publication_owner_kind, access_tier,
        publication_intent, publication_state,
        publication_consent_state, identity_consent_state,
        publication_policy_version
      from public.halleus_reports
      where id = ${reportId}
        and user_id = ${userId}
        and deleted_at is null
      for update
    `;
    const row = asRecord(rows[0]);

    if (!row.id) {
      return { ok: false, code: "not-found" };
    }

    const publication = storedPublication(row);
    const decision = evaluateOwnedReportPublicationMutation({
      action,
      ownerKind: publication.ownerKind,
      tier: publication.accessTier,
      identityConsentState: publication.identityConsentState,
      adminRestricted:
        Boolean(row.restricted_at) ||
        asString(row.visibility) === "restricted_by_admin",
    });

    if (!decision.ok) {
      return { ok: false, code: decision.code };
    }

    const updatedRows = await tx`
      update public.halleus_reports
      set visibility = ${decision.visibility},
          publication_intent = ${decision.publicationIntent},
          publication_state = ${decision.policy.publicationState},
          publication_consent_state =
            ${decision.policy.publicationConsentState},
          publication_policy_version = ${decision.policy.version},
          share_enabled = false,
          share_token_hash = null,
          updated_at = now()
      where id = ${reportId}
        and user_id = ${userId}
        and deleted_at is null
        and restricted_at is null
        and visibility <> 'restricted_by_admin'
      returning visibility,
        publication_owner_kind, access_tier,
        publication_intent, publication_state,
        publication_consent_state, identity_consent_state,
        publication_policy_version
    `;

    if (!updatedRows.length) {
      return { ok: false, code: "admin-restricted" };
    }

    const updated = asRecord(updatedRows[0]);

    return {
      ok: true,
      visibility:
        asString(updated.visibility) === "public"
          ? "public"
          : "unpublished",
      publication: storedPublication(updated),
    };
  });
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
  const rows = await sql`update public.halleus_reports set visibility = 'private', share_enabled = false, share_token_hash = null, updated_at = now() where id = ${reportId} and user_id = ${userId} and deleted_at is null returning id`;
  return rows.length > 0;
}

export async function softDeleteOwnedReport(userId: string, reportId: string) {
  const sql = getAdminDatabase();
  const rows = await sql`update public.halleus_reports set deleted_at = now(), deleted_by = ${userId}::uuid, delete_reason = 'Deleted by report owner.', visibility = 'unpublished', publication_intent = 'unpublish', publication_state = 'unpublished', publication_consent_state = case when access_tier = 'premium' then 'withdrawn' else 'not-required' end, share_enabled = false, share_token_hash = null, updated_at = now() where id = ${reportId} and user_id = ${userId} and deleted_at is null returning id`;
  return rows.length > 0;
}

export async function getSharedReport(token: string) {
  const sql = getAdminDatabase();
  const tokenHash = hashReportShareSecret(token);
  const rows = await sql`select report_json from public.halleus_reports where share_token_hash = ${tokenHash} and share_enabled = true and visibility = 'shared_by_link' and restricted_at is null and deleted_at is null limit 1`;
  return rows[0]?.report_json ?? null;
}
