import type { AstrologyReport, BirthInput } from "@/types/astro";
import type {
  ReportAccessTier,
  ReportIdentityConsentState,
  ReportPublicationConsentState,
  ReportPublicationIntent,
  ReportPublicationOwnerKind,
  ReportPublicationState,
} from "@/types/report-generation";

export type HalleusStorageDriver = "local" | "database";

export type ReportVisibility = "private" | "public" | "shared_by_link" | "unpublished" | "restricted_by_admin";

export type ReportSource = "local-preview" | "account";

export type StoredReportPublication = {
  policyVersion: "1";
  ownerKind: ReportPublicationOwnerKind;
  accessTier: ReportAccessTier;
  publicationIntent: ReportPublicationIntent;
  publicationState: ReportPublicationState;
  publicationConsentState: ReportPublicationConsentState;
  identityConsentState: ReportIdentityConsentState;
};

export type ReportRecord = {
  id: string;
  userId?: string;
  report: AstrologyReport;
  input: BirthInput;
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  note?: string;
  visibility: ReportVisibility;
  source: ReportSource;
  publication?: StoredReportPublication;
};

export type ReportRecordSummary = {
  id: string;
  title?: string;
  reportType?: string;
  accessTier?: string;
  publicationOwnerKind?: ReportPublicationOwnerKind;
  publicationState?: ReportPublicationState;
  publicationConsentState?: ReportPublicationConsentState;
  identityConsentState?: ReportIdentityConsentState;
  publicationPolicyVersion?: "1";
  status?: "active" | "deleted";
  userId?: string;
  name?: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthCountry: string;
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  hasNote: boolean;
  visibility: ReportVisibility;
  source: ReportSource;
};

export type ReportImportResult = {
  imported: number;
  skipped: number;
};

export type ReportRepository = {
  listReports(): Promise<ReportRecord[]>;
  getReport(reportId: string): Promise<ReportRecord | null>;
  saveReport(report: AstrologyReport): Promise<ReportRecord>;
  deleteReport(reportId: string): Promise<void>;
  clearReports(): Promise<void>;
  setFavorite(reportId: string, favorite: boolean): Promise<ReportRecord | null>;
  setNote(reportId: string, note: string): Promise<ReportRecord | null>;
  exportReports(): Promise<ReportRecord[]>;
  importReports(records: ReportRecord[]): Promise<ReportImportResult>;
};

export type UserAccountRecord = {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
};

export type DatabaseReportRow = {
  id: string;
  user_id: string;
  report_json: AstrologyReport;
  note: string | null;
  favorite: boolean;
  visibility: ReportVisibility;
  publication_owner_kind: ReportPublicationOwnerKind;
  access_tier: ReportAccessTier;
  publication_intent: ReportPublicationIntent;
  publication_state: ReportPublicationState;
  publication_consent_state: ReportPublicationConsentState;
  identity_consent_state: ReportIdentityConsentState;
  publication_policy_version: "1";
  created_at: string;
  updated_at: string;
};
