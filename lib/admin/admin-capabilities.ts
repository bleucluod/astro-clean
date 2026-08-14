import type {
  AdminCapability,
  AdminRole,
} from "@/lib/admin/admin-types";

const ROLE_CAPABILITIES: Record<AdminRole, readonly AdminCapability[]> = {
  owner: [
    "dashboard.read",
    "users.read",
    "users.contact.read",
    "users.status.write",
    "users.notes.write",
    "reports.read",
    "reports.export",
    "reports.visibility.restrict",
    "reports.title.write",
    "reports.delete",
    "reports.private_content.read",
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
  ],
  admin: [
    "dashboard.read",
    "users.read",
    "users.contact.read",
    "users.status.write",
    "users.notes.write",
    "reports.read",
    "reports.export",
    "reports.visibility.restrict",
    "reports.title.write",
    "reports.delete",
    "reports.private_content.read",
    "premium_requests.read",
    "premium_requests.write",
    "audit.read",
    "telegram.read",
    "telegram.import.write",
    "telegram.operations.write",
    "wiki.read",
    "wiki.draft.write",
    "wiki.import.write",
    "wiki.publish.write",
    "wiki.settings.write",
    "wiki.media.write",
  ],
  editor: [
    "dashboard.read",
    "wiki.read",
    "wiki.draft.write",
    "wiki.import.write",
    "wiki.media.write",
  ],
  publisher: [
    "dashboard.read",
    "telegram.read",
    "telegram.operations.write",
    "wiki.read",
    "wiki.publish.write",
  ],
  support: [
    "dashboard.read",
    "users.read",
    "users.contact.read",
    "users.notes.write",
    "reports.read",
    "reports.visibility.restrict",
    "premium_requests.read",
    "premium_requests.write",
  ],
  analyst: [
    "dashboard.read",
    "users.read",
    "reports.read",
    "reports.export",
    "premium_requests.read",
    "audit.read",
    "wiki.read",
  ],
};

export function getAdminCapabilities(
  role: AdminRole,
  explicitGrants: readonly AdminCapability[] = [],
) {
  return [...new Set([...ROLE_CAPABILITIES[role], ...explicitGrants])];
}

export function adminRoleHasCapability(
  role: AdminRole,
  capability: AdminCapability,
  explicitGrants: readonly AdminCapability[] = [],
) {
  return ROLE_CAPABILITIES[role].includes(capability) || explicitGrants.includes(capability);
}
