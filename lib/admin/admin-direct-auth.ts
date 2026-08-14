import {
  createHash,
  createHmac,
  pbkdf2Sync,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { getAdminCapabilities } from "@/lib/admin/admin-capabilities";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import type { AdminSessionPayload } from "@/lib/admin/admin-types";
import { getHalleusRuntimeEnv } from "@/lib/config/env";

export const HALLEUS_DIRECT_ADMINI_R14 = "HALLEUS_DIRECT_ADMINI_R14";
const DIRECT_TOKEN_PREFIX = "hal-admin-v1";
const DIRECT_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_SCHEME = "pbkdf2-sha256";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class DirectAdminConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectAdminConfigurationError";
  }
}

export class DirectAdminCredentialError extends Error {
  constructor() {
    super("Direct admin credentials are invalid.");
    this.name = "DirectAdminCredentialError";
  }
}

type DirectTokenPayload = {
  version: 1;
  userId: string;
  displayName: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type DirectAdminActor = AdminSessionPayload & {
  correlationId: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function constantTimeTextEqual(left: string, right: string) {
  return timingSafeEqual(sha256(left), sha256(right));
}

function requireDirectConfig() {
  const env = getHalleusRuntimeEnv();
  if (
    !env.adminDirectUsername ||
    !env.adminDirectPasswordHash ||
    !env.adminDirectSessionSecret
  ) {
    throw new DirectAdminConfigurationError(
      "Direct admin login is not configured.",
    );
  }
  if (env.adminDirectSessionSecret.length < 32) {
    throw new DirectAdminConfigurationError(
      "Direct admin session secret is too short.",
    );
  }
  return env;
}

function verifyPassword(password: string, encodedHash: string) {
  const delimiter = encodedHash.includes(":") ? ":" : "$";
  const parts = encodedHash.split(delimiter);
  if (parts.length !== 4 || parts[0] !== PASSWORD_SCHEME) {
    throw new DirectAdminConfigurationError(
      "Direct admin password hash format is invalid.",
    );
  }
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 200_000 || iterations > 1_000_000) {
    throw new DirectAdminConfigurationError(
      "Direct admin password hash iterations are invalid.",
    );
  }
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2], "base64url");
    expected = Buffer.from(parts[3], "base64url");
  } catch {
    throw new DirectAdminConfigurationError(
      "Direct admin password hash encoding is invalid.",
    );
  }
  if (salt.length < 12 || expected.length !== 32) {
    throw new DirectAdminConfigurationError(
      "Direct admin password hash payload is invalid.",
    );
  }
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
  return timingSafeEqual(actual, expected);
}

async function resolveOwnerUserId(configuredUserId?: string) {
  if (configuredUserId) {
    if (!UUID_PATTERN.test(configuredUserId)) {
      throw new DirectAdminConfigurationError(
        "HALLEUS_ADMIN_DIRECT_USER_ID must be a UUID.",
      );
    }
    return configuredUserId;
  }

  const sql = getAdminDatabase();
  const rows = await sql`
    select user_id::text
    from halleus_private.admin_memberships
    where role = 'owner' and status = 'active'
    limit 2
  `;

  if (rows.length === 1 && typeof rows[0]?.user_id === "string") {
    return rows[0].user_id;
  }
  if (rows.length === 0) {
    throw new DirectAdminConfigurationError(
      "No active owner exists for direct admin audit identity.",
    );
  }
  throw new DirectAdminConfigurationError(
    "More than one active owner exists; configure HALLEUS_ADMIN_DIRECT_USER_ID.",
  );
}

function signPayload(payloadPart: string, secret: string) {
  return createHmac("sha256", secret).update(payloadPart, "utf8").digest("base64url");
}

function encodePayload(payload: DirectTokenPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): DirectTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as
      Partial<DirectTokenPayload>;
    if (
      parsed.version !== 1 ||
      typeof parsed.userId !== "string" ||
      !UUID_PATTERN.test(parsed.userId) ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.nonce !== "string"
    ) {
      return null;
    }
    return parsed as DirectTokenPayload;
  } catch {
    return null;
  }
}

export async function authenticateDirectAdminCredentials(input: {
  username: string;
  password: string;
}) {
  const env = requireDirectConfig();
  if (
    input.username.length < 1 ||
    input.username.length > 64 ||
    input.password.length < 1 ||
    input.password.length > 512
  ) {
    throw new DirectAdminCredentialError();
  }

  const usernameMatches = constantTimeTextEqual(
    input.username,
    env.adminDirectUsername!,
  );
  const passwordMatches = verifyPassword(
    input.password,
    env.adminDirectPasswordHash!,
  );
  if (!usernameMatches || !passwordMatches) {
    throw new DirectAdminCredentialError();
  }

  const userId = await resolveOwnerUserId(env.adminDirectUserId);
  const now = Math.floor(Date.now() / 1000);
  const payload: DirectTokenPayload = {
    version: 1,
    userId,
    displayName: input.username,
    issuedAt: now,
    expiresAt: now + DIRECT_TOKEN_TTL_SECONDS,
    nonce: randomUUID(),
  };
  const payloadPart = encodePayload(payload);
  const signature = signPayload(payloadPart, env.adminDirectSessionSecret!);
  const token = `${DIRECT_TOKEN_PREFIX}.${payloadPart}.${signature}`;
  const session: AdminSessionPayload = {
    userId,
    displayName: input.username,
    role: "owner",
    capabilities: getAdminCapabilities("owner"),
  };
  return { token, session, expiresAt: payload.expiresAt };
}

export function verifyDirectAdminAuthorizationHeader(
  authorizationHeader: string | null,
):
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "valid"; actor: DirectAdminActor } {
  const value = authorizationHeader?.trim() ?? "";
  if (!value.toLowerCase().startsWith("bearer ")) {
    return { kind: "none" };
  }
  const token = value.slice("bearer ".length).trim();
  if (!token.startsWith(`${DIRECT_TOKEN_PREFIX}.`)) {
    return { kind: "none" };
  }

  const env = getHalleusRuntimeEnv();
  if (!env.adminDirectSessionSecret || env.adminDirectSessionSecret.length < 32) {
    return { kind: "invalid" };
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== DIRECT_TOKEN_PREFIX) {
    return { kind: "invalid" };
  }
  const expectedSignature = signPayload(parts[1], env.adminDirectSessionSecret);
  const suppliedSignature = Buffer.from(parts[2], "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    suppliedSignature.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedSignature, expectedBuffer)
  ) {
    return { kind: "invalid" };
  }

  const payload = decodePayload(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (
    !payload ||
    payload.expiresAt <= now ||
    payload.issuedAt > now + 60 ||
    payload.expiresAt - payload.issuedAt > DIRECT_TOKEN_TTL_SECONDS + 60
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "valid",
    actor: {
      userId: payload.userId,
      displayName: payload.displayName,
      role: "owner",
      capabilities: getAdminCapabilities("owner"),
      correlationId: randomUUID(),
    },
  };
}
