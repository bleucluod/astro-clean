import { NextResponse } from "next/server";
import { AdminAccessError } from "@/lib/admin/admin-auth";

export function noStoreJsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store",
    },
  });
}

export function adminErrorResponse(
  error: unknown,
  fallbackMessage = "Admin request failed.",
) {
  if (error instanceof AdminAccessError) {
    return noStoreJsonResponse(
      { ok: false, error: error.message },
      error.status,
    );
  }

  return noStoreJsonResponse(
    {
      ok: false,
      error: fallbackMessage,
    },
    500,
  );
}

export function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readRequiredString(
  value: unknown,
  field: string,
  maxLength: number,
) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new AdminAccessError(400, `${field} is required.`);
  }
  if (text.length > maxLength) {
    throw new AdminAccessError(400, `${field} is too long.`);
  }
  return text;
}

export function readOptionalString(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return null;
  }
  if (text.length > maxLength) {
    throw new AdminAccessError(400, "A request field is too long.");
  }
  return text;
}

export function readLimit(value: string | null, fallback = 50) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 1), 100);
}
