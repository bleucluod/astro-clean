import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { generateTelegramMvpQueue } from "@/lib/telegram/telegram-service";

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
    const body = (await request.json().catch(() => ({}))) as { mode?: unknown };
    const initialStatus = body.mode === "ready" ? "ready" : "draft";
    const result = await generateTelegramMvpQueue({ initialStatus });
    return NextResponse.json(
      {
        ok: true,
        initialStatus,
        engineBackedGenerated: result.engineBackedGenerated,
        fallbackUsed: result.fallbackUsed,
        items: result.queued.map((item) => ({
          id: item.id,
          contentClass: item.contentClass,
          contentType: item.contentType,
          status: item.status,
          scheduledFor: item.scheduledFor,
          previewText: item.payload.text,
        })),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Telegram content generation failed." },
      { status: 500, headers: { "cache-control": "private, no-store" } },
    );
  }
}