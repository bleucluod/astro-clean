import { NextResponse } from "next/server";

import { getSupabaseUserFromAuthorizationHeader } from "@/lib/auth/supabase-server-user";
import {
  createTelegramJoinRewardChallenge,
  getTelegramJoinRewardStatus,
  redeemTelegramJoinReward,
} from "@/lib/telegram/telegram-reward-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

async function requireUser(request: Request) {
  const user = await getSupabaseUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const status = await getTelegramJoinRewardStatus(user.id);
    return json({ ok: true, status });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error && error.message === "AUTH_REQUIRED" ? "ورود به حساب لازم است." : "وضعیت جایزه تلگرام دریافت نشد." },
      error instanceof Error && error.message === "AUTH_REQUIRED" ? 401 : 500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "start") {
      const result = await createTelegramJoinRewardChallenge(user.id);
      return json({ ok: result.ok, result }, result.ok ? 200 : 409);
    }

    if (action === "redeem") {
      const result = await redeemTelegramJoinReward(user.id);
      if (result.ok) return json({ ok: true, result });
      const messages: Record<string, string> = {
        "account-already-redeemed": "این حساب قبلاً جایزهٔ عضویت تلگرام را گرفته است.",
        "telegram-already-redeemed": "این حساب تلگرام قبلاً برای دریافت جایزه استفاده شده است.",
        "telegram-not-linked": "اول تلگرامت را از طریق بات هالیوس به حسابت وصل کن.",
        "not-a-channel-member": "عضویتت در کانال هالیوس هنوز تأیید نشد.",
      };
      return json({ ok: false, error: messages[result.code], result }, 409);
    }

    return json({ ok: false, error: "عملیات جایزه تلگرام معتبر نیست." }, 400);
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error && error.message === "AUTH_REQUIRED" ? "ورود به حساب لازم است." : "عملیات جایزه تلگرام انجام نشد." },
      error instanceof Error && error.message === "AUTH_REQUIRED" ? 401 : 500,
    );
  }
}