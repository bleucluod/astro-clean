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
  "users.status.write",
  "users.notes.write",
  "reports.read",
  "reports.visibility.restrict",
  "reports.private_content.read",
  "premium_requests.read",
  "premium_requests.write",
  "audit.read",
  "memberships.manage",
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
  ownerUserId: string;
  visibility: "public" | "private";
  source: string;
  accessTier: string;
  engineVersion: string | null;
  reportVersion: string | null;
  publicationConsentState: string;
  indexable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminPremiumRequestSummary = {
  id: string;
  userId: string | null;
  contactName: string;
  contactValue: string;
  requestedProduct: string;
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
