import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { linkTelegramRewardChallenge } from "@/lib/telegram/telegram-reward-service";

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

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return json({ ok: false, error: "Telegram reward-link authorization failed." }, 401);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token : "";
    const result = await linkTelegramRewardChallenge({
      token,
      telegramUserId: body.telegramUserId,
    });
    return json({ ok: true, result });
  } catch {
    return json({ ok: false, error: "Telegram reward link failed." }, 500);
  }
}