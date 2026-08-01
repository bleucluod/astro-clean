import { evaluateReportPublicationPolicy } from "@/lib/reports/report-access-contract";
import type { AstrologyReport } from "@/types/astro";
import type { ReportPublicationPolicyInput } from "@/types/report-generation";
import type {
  ReportRecord,
  ReportRecordSummary,
  ReportSource,
  ReportVisibility,
  StoredReportPublication,
} from "@/types/storage";

type CreateReportRecordOptions = {
  favorite?: boolean;
  note?: string;
  source?: ReportSource;
  userId?: string;
  visibility?: ReportVisibility;
  publication?: ReportPublicationPolicyInput;
};

export function createStoredReportPublication(
  input: ReportPublicationPolicyInput,
): StoredReportPublication {
  const policy = evaluateReportPublicationPolicy(input);

  return {
    policyVersion: policy.version,
    ownerKind: policy.ownerKind,
    accessTier: policy.tier,
    publicationIntent: input.publicationIntent ?? "default",
    publicationState: policy.publicationState,
    publicationConsentState: policy.publicationConsentState,
    identityConsentState: policy.identityConsentState,
  };
}

function legacyPublicationForRecord(
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

export function createReportRecord(
  report: AstrologyReport,
  options: CreateReportRecordOptions = {},
): ReportRecord {
  const timestamp = new Date().toISOString();
  const visibility = options.visibility ?? "private";
  const publication = options.publication
    ? createStoredReportPublication(options.publication)
    : createStoredReportPublication({
        ownerKind: "local",
        tier: "preview",
      });

  return {
    id: report.id,
    userId: options.userId,
    report,
    input: report.input,
    createdAt: report.createdAt || timestamp,
    updatedAt: timestamp,
    favorite: options.favorite ?? false,
    note: options.note,
    visibility,
    source: options.source ?? "local-preview",
    publication,
  };
}

export function summarizeReportRecord(
  record: ReportRecord,
): ReportRecordSummary {
  return {
    id: record.id,
    title: record.input.name ? `گزارش ${record.input.name}` : "گزارش ذخیره‌شده",
    accessTier: record.publication?.accessTier,
    publicationOwnerKind: record.publication?.ownerKind,
    publicationState: record.publication?.publicationState,
    publicationConsentState: record.publication?.publicationConsentState,
    identityConsentState: record.publication?.identityConsentState,
    publicationPolicyVersion: record.publication?.policyVersion,
    userId: record.userId,
    name: record.input.name,
    birthDate: record.input.birthDate,
    birthTime: record.input.birthTime,
    birthCity: record.input.birthCity,
    birthCountry: record.input.birthCountry,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    favorite: record.favorite,
    hasNote: Boolean(record.note?.trim()),
    visibility: record.visibility,
    source: record.source,
  };
}

export function isReportRecord(value: unknown): value is ReportRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ReportRecord>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.favorite === "boolean" &&
    typeof candidate.visibility === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.report === "object" &&
    candidate.report !== null &&
    typeof candidate.input === "object" &&
    candidate.input !== null
  );
}

export function normalizeReportRecords(value: unknown): ReportRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isReportRecord).map((record) => ({
    ...record,
    publication:
      record.publication ?? legacyPublicationForRecord(record.visibility),
  }));
}
