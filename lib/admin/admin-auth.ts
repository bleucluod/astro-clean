import { isTrustedAdminRequestOrigin } from "@/lib/admin/admin-origin";
import { getSupabaseUserFromAuthorizationHeader } from "@/lib/auth/supabase-server-user";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import {
  adminRoleHasCapability,
  getAdminCapabilities,
} from "@/lib/admin/admin-capabilities";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import {
  ADMIN_ROLES,
  ADMIN_CAPABILITIES,
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
    select
      membership.role,
      membership.status,
      coalesce(
        jsonb_agg(grant_row.capability) filter (where grant_row.is_granted = true),
        '[]'::jsonb
      ) as explicit_grants
    from halleus_private.admin_memberships as membership
    left join halleus_private.admin_capability_grants as grant_row
      on grant_row.user_id = membership.user_id
    where membership.user_id = ${user.id}::uuid
    group by membership.role, membership.status
    limit 1
  `;
  const membership = rows[0];

  if (!membership || !isAdminRole(membership.role)) {
    throw new AdminAccessError(403, "This account is not an admin member.");
  }

  if (membership.status !== "active") {
    throw new AdminAccessError(403, "This admin membership is not active.");
  }

  const explicitGrants = Array.isArray(membership.explicit_grants)
    ? membership.explicit_grants.filter(
        (item): item is AdminCapability =>
          typeof item === "string" && ADMIN_CAPABILITIES.includes(item as AdminCapability),
      )
    : [];

  if (!adminRoleHasCapability(membership.role, capability, explicitGrants)) {
    throw new AdminAccessError(403, "This admin role cannot perform that action.");
  }

  return {
    userId: user.id,
    displayName: user.displayName,
    role: membership.role,
    capabilities: getAdminCapabilities(membership.role, explicitGrants),
    correlationId: readCorrelationId(request),
  };
}

function assertTrustedAdminRequestOrigin(
  request: Request,
  errorMessage: string,
) {
  if (
    !isTrustedAdminRequestOrigin(
      request,
      getHalleusRuntimeEnv().siteUrl,
    )
  ) {
    throw new AdminAccessError(403, errorMessage);
  }
}

export function assertAdminMutationRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new AdminAccessError(415, "Admin mutations require JSON.");
  }

  assertTrustedAdminRequestOrigin(
    request,
    "Cross-origin admin mutation was rejected.",
  );
}

export function assertAdminUploadRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw new AdminAccessError(415, "Admin uploads require multipart form data.");
  }

  assertTrustedAdminRequestOrigin(
    request,
    "Cross-origin admin upload was rejected.",
  );
}
