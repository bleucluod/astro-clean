import { getSupabaseUserFromAuthorizationHeader } from "@/lib/auth/supabase-server-user";
import {
  adminRoleHasCapability,
  getAdminCapabilities,
} from "@/lib/admin/admin-capabilities";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import {
  ADMIN_ROLES,
  type AdminCapability,
  type AdminRole,
  type AdminSessionPayload,
} from "@/lib/admin/admin-types";

export class AdminAccessError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminAccessError";
    this.status = status;
  }
}

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole);
}

export type VerifiedAdminActor = AdminSessionPayload & {
  correlationId: string;
};

function readCorrelationId(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  if (supplied && supplied.length <= 160) {
    return supplied;
  }
  return crypto.randomUUID();
}

export async function requireAdminCapability(
  request: Request,
  capability: AdminCapability,
): Promise<VerifiedAdminActor> {
  let user;
  try {
    user = await getSupabaseUserFromAuthorizationHeader(
      request.headers.get("authorization"),
    );
  } catch {
    throw new AdminAccessError(401, "Admin authentication failed.");
  }

  if (!user) {
    throw new AdminAccessError(401, "A verified account session is required.");
  }

  const sql = getAdminDatabase();
  const rows = await sql`
    select role, status
    from halleus_private.admin_memberships
    where user_id = ${user.id}::uuid
    limit 1
  `;
  const membership = rows[0];

  if (!membership || !isAdminRole(membership.role)) {
    throw new AdminAccessError(403, "This account is not an admin member.");
  }

  if (membership.status !== "active") {
    throw new AdminAccessError(403, "This admin membership is not active.");
  }

  if (!adminRoleHasCapability(membership.role, capability)) {
    throw new AdminAccessError(403, "This admin role cannot perform that action.");
  }

  return {
    userId: user.id,
    displayName: user.displayName,
    role: membership.role,
    capabilities: getAdminCapabilities(membership.role),
    correlationId: readCorrelationId(request),
  };
}

export function assertAdminMutationRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new AdminAccessError(415, "Admin mutations require JSON.");
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new AdminAccessError(403, "Cross-origin admin mutation was rejected.");
  }
}
