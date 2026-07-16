import type {
  AdminCapability,
  AdminRole,
} from "@/lib/admin/admin-types";

const ROLE_CAPABILITIES: Record<AdminRole, readonly AdminCapability[]> = {
  owner: [
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
  ],
  admin: [
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
  ],
  editor: ["dashboard.read"],
  support: [
    "dashboard.read",
    "users.read",
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
    "premium_requests.read",
    "audit.read",
  ],
};

export function getAdminCapabilities(role: AdminRole) {
  return [...ROLE_CAPABILITIES[role]];
}

export function adminRoleHasCapability(
  role: AdminRole,
  capability: AdminCapability,
) {
  return ROLE_CAPABILITIES[role].includes(capability);
}
