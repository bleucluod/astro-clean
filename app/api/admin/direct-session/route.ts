import {
  AdminAccessError,
  assertAdminMutationRequest,
} from "@/lib/admin/admin-auth";
import {
  DirectAdminConfigurationError,
  DirectAdminCredentialError,
  authenticateDirectAdminCredentials,
} from "@/lib/admin/admin-direct-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;
const failures = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "local";
}

function currentAttemptState(key: string) {
  const now = Date.now();
  const state = failures.get(key);
  if (!state || state.resetAt <= now) {
    const next = { count: 0, resetAt: now + ATTEMPT_WINDOW_MS };
    failures.set(key, next);
    return next;
  }
  return state;
}

function registerFailure(key: string) {
  const state = currentAttemptState(key);
  state.count += 1;
  failures.set(key, state);
}

export async function POST(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const key = clientKey(request);
    const state = currentAttemptState(key);
    if (state.count >= MAX_FAILED_ATTEMPTS) {
      throw new AdminAccessError(
        429,
        "تلاش‌های ورود بیش از حد بوده است. حدود ۱۵ دقیقه بعد دوباره امتحان کن.",
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AdminAccessError(400, "درخواست ورود ادمین JSON معتبر نیست.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AdminAccessError(400, "اطلاعات ورود ادمین ناقص است.");
    }
    const record = body as Record<string, unknown>;
    const username =
      typeof record.username === "string" ? record.username.trim() : "";
    const password =
      typeof record.password === "string" ? record.password : "";

    try {
      const result = await authenticateDirectAdminCredentials({
        username,
        password,
      });
      failures.delete(key);
      return noStoreJsonResponse({
        ok: true,
        token: result.token,
        expiresAt: result.expiresAt,
        session: result.session,
      });
    } catch (error) {
      if (error instanceof DirectAdminCredentialError) {
        registerFailure(key);
        throw new AdminAccessError(
          401,
          "نام کاربری یا رمز عبور ادمین درست نیست.",
        );
      }
      if (error instanceof DirectAdminConfigurationError) {
        throw new AdminAccessError(
          503,
          `ورود مستقیم ادمین هنوز کامل تنظیم نشده است: ${error.message}`,
        );
      }
      if (error instanceof Error) {
        throw new AdminAccessError(
          503,
          `نام کاربری و رمز تأیید شد اما اتصال هویت owner ادمین کامل نشد: ${error.message} تنظیمات دیتابیس/هویت owner را بررسی کن؛ رمز عبور دوباره ساخته نشده است.`,
        );
      }
      throw error;
    }
  } catch (error) {
    return adminErrorResponse(error, "ورود مستقیم ادمین انجام نشد.");
  }
}
