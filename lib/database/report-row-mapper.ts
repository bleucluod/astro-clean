import type { AstrologyReport } from "@/types/astro";
import type {
  DatabaseReportRow,
  ReportRecord,
  ReportVisibility,
  StoredReportPublication,
} from "@/types/storage";

function legacyPublicationForVisibility(
  visibility: ReportVisibility,
): StoredReportPublication {
  return {
    policyVersion: "1",
    ownerKind: "legacy",
    accessTier: "free",
    publicationIntent:
      visibility === "unpublished" ? "unpublish" : "default",
    publicationState:
      visibility === "restricted_by_admin"
        ? "restricted"
        : visibility === "unpublished"
          ? "unpublished"
          : "private",
    publicationConsentState: "pending",
    identityConsentState: "withheld",
  };
}

export function toDatabaseReportRow(
  userId: string,
  record: ReportRecord,
): DatabaseReportRow {
  const publication =
    record.publication ?? legacyPublicationForVisibility(record.visibility);

  return {
    id: record.id,
    user_id: userId,
    report_json: record.report,
    note: record.note?.trim() || null,
    favorite: record.favorite,
    visibility: record.visibility,
    publication_owner_kind: publication.ownerKind,
    access_tier: publication.accessTier,
    publication_intent: publication.publicationIntent,
    publication_state: publication.publicationState,
    publication_consent_state: publication.publicationConsentState,
    identity_consent_state: publication.identityConsentState,
    publication_policy_version: publication.policyVersion,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export function fromDatabaseReportRow(row: DatabaseReportRow): ReportRecord {
  const report = row.report_json as AstrologyReport;

  return {
    id: row.id,
    userId: row.user_id,
    report,
    input: report.input,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    favorite: row.favorite,
    note: row.note ?? undefined,
    visibility: row.visibility,
    source: "account",
    publication: {
      policyVersion: row.publication_policy_version,
      ownerKind: row.publication_owner_kind,
      accessTier: row.access_tier,
      publicationIntent: row.publication_intent,
      publicationState: row.publication_state,
      publicationConsentState: row.publication_consent_state,
      identityConsentState: row.identity_consent_state,
    },
  };
}
