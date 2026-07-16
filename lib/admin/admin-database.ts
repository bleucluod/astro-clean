import postgres from "postgres";
import { getHalleusRuntimeEnv } from "@/lib/config/env";

let adminSql: ReturnType<typeof postgres> | null = null;

export function getAdminDatabase() {
  if (adminSql) {
    return adminSql;
  }

  const databaseUrl = getHalleusRuntimeEnv().databaseUrl;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the admin core.");
  }

  adminSql = postgres(databaseUrl, {
    max: 3,
    idle_timeout: 10,
    connect_timeout: 10,
    prepare: false,
  });

  return adminSql;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

export function asString(value: unknown) {
  return asNullableString(value) ?? "";
}

export function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function asBoolean(value: unknown) {
  return value === true || value === "true";
}
