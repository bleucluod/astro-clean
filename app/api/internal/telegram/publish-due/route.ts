import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { processDueTelegramQueue } from "@/lib/telegram/telegram-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = getHalleusRuntimeEnv().telegramPublisherSecret;
  const supplied = request.headers.get("x-halleus-telegram-publisher-secret") ?? "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Telegram publisher authorization failed." },
      { status: 401, headers: { "cache-control": "private, no-store" } },
    );
  }

  try {
    const result = await processDueTelegramQueue(10);
    return NextResponse.json(
      { ok: true, result },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Telegram publish-due run failed." },
      { status: 500, headers: { "cache-control": "private, no-store" } },
    );
  }
}