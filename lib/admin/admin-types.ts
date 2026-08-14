import type { HalleusPackageCode } from "@/lib/monetization/product-catalog";

export const ADMIN_ROLES = [
  "owner",
  "admin",
  "editor",
  "publisher",
  "support",
  "analyst",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_CAPABILITIES = [
  "dashboard.read",
  "users.read",
  "users.contact.read",
  "users.status.write",
  "users.notes.write",
  "reports.read",
  "reports.visibility.restrict",
  "reports.title.write",
  "reports.delete",
  "reports.private_content.read",
  "reports.export",
  "premium_requests.read",
  "premium_requests.write",
  "audit.read",
  "memberships.manage",
  "telegram.read",
  "telegram.import.write",
  "telegram.operations.write",
  "wiki.read",
  "wiki.draft.write",
  "wiki.import.write",
  "wiki.publish.write",
  "wiki.settings.write",
  "wiki.media.write",
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

export type AdminSessionPayload = {
  userId: string;
  displayName?: string;
  role: AdminRole;
  capabilities: AdminCapability[];
};

export type AdminOverviewPayload = {
  users: number;
  reports: number;
  publicReports: number;
  privateReports: number;
  openPremiumRequests: number;
  auditEvents24h: number;
};

export type AdminUserSummary = {
  id: string;
  email: string | null;
  displayName: string | null;
  status: string;
  plan: string;
  reportCount: number;
  lastReportAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  latestNote: string | null;
};

export type AdminReportSummary = {
  id: string;
  title: string;
  ownerUserId: string;
  ownerDisplayName: string | null;
  // HALLEUS_REPORT_SUBJECT_FIELDS_R44
  subjectName: string | null;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeAccuracy: "known" | "unknown" | null;
  birthCity: string | null;
  birthCountry: string | null;
  ownerKind: string;
  accountPlan: string | null;
  reportType: string;
  birthYear: string | null;
  birthMonth: string | null;
  publicationState: string;
  identityConsentState: string;
  shareEnabled: boolean;
  storageBytes: number;
  reportJsonBytes: number;
  visibility: "public" | "private" | "shared_by_link" | "unpublished" | "restricted_by_admin" | "unknown";
  source: string;
  accessTier: string;
  engineVersion: string | null;
  reportVersion: string | null;
  publicationConsentState: string;
  indexable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminReportFilters = {
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
  birthCity: string | null;
  birthCountry: string | null;
  reportType: string | null;
  ownerKind: string | null;
  accessTier: string | null;
  visibility: string | null;
  source: string | null;
  birthYear: string | null;
  birthMonth: string | null;
};

export type AdminReportBreakdownItem = {
  key: string;
  count: number;
};

export type AdminReportTrendPoint = {
  key: string;
  count: number;
};

export type AdminReportInsights = {
  volume: {
    today: number;
    last7Days: number;
    last30Days: number;
    total: number;
  };
  uniqueCreators: number;
  storage: {
    rowCount: number;
    totalBytes: number;
    averageBytes: number;
    largestBytes: number;
    medianBytes: number;
    reportJsonTotalBytes: number;
    reportJsonAverageBytes: number;
  };
  accountFrequency: {
    accountCount: number;
    averageReportsPerAccount: number;
    oneReportAccounts: number;
    multiReportAccounts: number;
  };
  byReportType: AdminReportBreakdownItem[];
  byAccessTier: AdminReportBreakdownItem[];
  byOwnerKind: AdminReportBreakdownItem[];
  topBirthCities: AdminReportBreakdownItem[];
  topBirthCountries: AdminReportBreakdownItem[];
  birthYears: AdminReportBreakdownItem[];
  birthMonths: AdminReportBreakdownItem[];
  trends: {
    daily: AdminReportTrendPoint[];
    weekly: AdminReportTrendPoint[];
    monthly: AdminReportTrendPoint[];
  };
};

export type AdminReportFilterOptions = {
  birthCities: string[];
  birthCountries: string[];
  reportTypes: string[];
  ownerKinds: string[];
  accessTiers: string[];
  visibilities: string[];
  sources: string[];
  birthYears: string[];
};

export type AdminReportCohortPayload = {
  reports: AdminReportSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: AdminReportFilters;
  options: AdminReportFilterOptions;
  insights: AdminReportInsights;
};

export type AdminPremiumRequestSummary = {
  id: string;
  userId: string | null;
  contactName: string;
  contactValue: string;
  requestedProduct: string;
  productCode: HalleusPackageCode | null;
  linkedReportId: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  status: "new" | "reviewing" | "approved" | "preparing" | "delivered" | "canceled";
  agreedAmount: string | null;
  dueDate: string | null;
  deliveryStatus: "not_started" | "preparing" | "ready" | "delivered" | "canceled";
  publicationChoice: "not_requested" | "private" | "public_with_consent";
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditEventSummary = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  success: boolean;
  requestCorrelationId: string;
  createdAt: string;
};
