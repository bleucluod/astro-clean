import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { getHalleusRuntimeEnv } from "@/lib/config/env";

export const GUEST_REPORT_COOKIE_NAME = "halleus_guest_reports";

export const GUEST_REPORT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export type GuestReportSession = {
  userId: string;
  token: string;
};

function getGuestReportSecret() {
  const secret = getHalleusRuntimeEnv().authSecret?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for guest report ownership.");
  }
  return secret;
}

function signGuestUserId(userId: string) {
  return createHmac("sha256", getGuestReportSecret())
    .update(`halleus-report-owner:${userId}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function readCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join("="));
    } catch {
      return null;
    }
  }
  return null;
}

export function createGuestReportSession(): GuestReportSession {
  const userId = randomUUID();
  const signature = signGuestUserId(userId);
  return {
    userId,
    token: `${userId}.${signature}`,
  };
}

export function readGuestReportSession(
  request: Request,
): GuestReportSession | null {
  const token = readCookieValue(request, GUEST_REPORT_COOKIE_NAME);
  if (!token) return null;

  const separator = token.indexOf(".");
  if (separator <= 0) return null;

  const userId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    return null;
  }

  const expected = signGuestUserId(userId);
  if (!safeEqual(signature, expected)) return null;

  return { userId, token };
}