import {
  asNullableString,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import type { ComparisonRecord } from "@/types/comparison-product";
import type { ReportAccessTier } from "@/types/report-generation";
import {
  STORED_COMPARISON_REPORT_VERSION,
  type ComparisonReportRecord,
  type StoredComparisonReport,
  type StoredReportPublication,
} from "@/types/storage";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isComparisonRecordCandidate(
  value: unknown,
): value is ComparisonRecord {
  if (!isRecord(value)) return false;
  const privacy = isRecord(value.privacy) ? value.privacy : null;
  return (
    value.version === "comparison-product-v1" &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.chartAId === "string" &&
    typeof value.chartBId === "string" &&
    typeof value.chartALabel === "string" &&
    typeof value.chartBLabel === "string" &&
    typeof value.relationshipContext === "string" &&
    privacy?.visibility === "private" &&
    privacy?.indexingPolicy === "noindex" &&
    privacy?.rawBirthInputStored === false &&
    isRecord(value.report) &&
    isRecord(value.reading)
  );
}

export function buildStoredComparisonReport(
  comparison: ComparisonRecord,
): StoredComparisonReport {
  const title = `تحلیل رابطهٔ ${comparison.chartALabel} و ${comparison.chartBLabel}`;
  return {
    version: STORED_COMPARISON_REPORT_VERSION,
    id: comparison.id,
    createdAt: comparison.createdAt,
    reportType: "comparison",
    metadata: {
      reportType: "comparison",
      reportVersion: STORED_COMPARISON_REPORT_VERSION,
      indexingPolicy: "noindex",
    },
    title,
    relationshipContext: comparison.relationshipContext,
    chartAId: comparison.chartAId,
    chartBId: comparison.chartBId,
    chartALabel: comparison.chartALabel,
    chartBLabel: comparison.chartBLabel,
    comparison,
  };
}

export function isStoredComparisonReport(
  value: unknown,
): value is StoredComparisonReport {
  if (!isRecord(value)) return false;
  const metadata = isRecord(value.metadata) ? value.metadata : null;
  return (
    value.version === STORED_COMPARISON_REPORT_VERSION &&
    value.reportType === "comparison" &&
    metadata?.reportType === "comparison" &&
    metadata?.indexingPolicy === "noindex" &&
    isComparisonRecordCandidate(value.comparison)
  );
}

function storedPublication(accessTier: ReportAccessTier): StoredReportPublication {
  return {
    policyVersion: "1",
    ownerKind: "account",
    accessTier,
    publicationIntent: "default",
    publicationState: "private",
    publicationConsentState: "not-required",
    identityConsentState: "withheld",
  };
}

export async function saveComparisonAccountReport(input: {
  userId: string;
  comparison: ComparisonRecord;
  accessTier: ReportAccessTier;
}): Promise<ComparisonReportRecord> {
  const sql = getAdminDatabase();
  const stored = buildStoredComparisonReport(input.comparison);

  const rows = await sql`
    insert into public.halleus_reports (
      id,
      user_id,
      title,
      report_json,
      note,
      favorite,
      visibility,
      source,
      publication_owner_kind,
      access_tier,
      publication_intent,
      publication_state,
      publication_consent_state,
      identity_consent_state,
      publication_policy_version,
      share_enabled,
      share_token_hash,
      created_at,
      updated_at
    )
    values (
      ${input.comparison.id},
      ${input.userId}::uuid,
      ${stored.title},
      ${sql.json(stored)},
      null,
      false,
      'private',
      'account',
      'account',
      ${input.accessTier},
      'default',
      'private',
      'not-required',
      'withheld',
      '1',
      false,
      null,
      ${input.comparison.createdAt}::timestamptz,
      now()
    )
    on conflict (id) do update
    set report_json = excluded.report_json,
        title = excluded.title,
        visibility = 'private',
        source = 'account',
        publication_owner_kind = 'account',
        access_tier = excluded.access_tier,
        publication_intent = 'default',
        publication_state = 'private',
        publication_consent_state = 'not-required',
        identity_consent_state = 'withheld',
        publication_policy_version = '1',
        share_enabled = false,
        share_token_hash = null,
        updated_at = now()
    where public.halleus_reports.user_id = excluded.user_id
      and public.halleus_reports.deleted_at is null
    returning
      id,
      user_id,
      title,
      report_json,
      note,
      favorite,
      created_at::text,
      updated_at::text
  `;

  const row = asRecord(rows[0]);
  if (!row.id) {
    throw new Error("Comparison account save was rejected by ownership constraints.");
  }

  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    title: asString(row.title),
    report: row.report_json as StoredComparisonReport,
    input: {},
    note: asNullableString(row.note) ?? undefined,
    favorite: Boolean(row.favorite),
    visibility: "private",
    source: "account",
    publication: storedPublication(input.accessTier),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}
