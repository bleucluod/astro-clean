import { NextResponse } from "next/server";

import { getAccountProfileSnapshot, updateAccountProfile } from "@/lib/account/account-profile-service";
import { getSupabaseUserFromAuthorizationHeader } from "@/lib/auth/supabase-server-user";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { ensureAccountPersistenceUser } from "@/lib/database/account-persistence-user";
import { findHalleusCityById } from "@/lib/locations/cities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function requireAccount(request: Request) {
  const user = await getSupabaseUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!user) throw new Error("AUTH_REQUIRED");
  const databaseUrl = getHalleusRuntimeEnv().databaseUrl;
  if (!databaseUrl) throw new Error("DATABASE_REQUIRED");
  await ensureAccountPersistenceUser({
    databaseUrl,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    provider: user.provider,
  });
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await requireAccount(request);
    const profile = await getAccountProfileSnapshot(user.id);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return errorResponse(401, "ورود به حساب برای خواندن پروفایل لازم است.");
    }
    return errorResponse(503, "پروفایل حساب فعلاً در دسترس نیست.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAccount(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return errorResponse(400, "دادهٔ پروفایل معتبر نیست.");
    }

    const update: Parameters<typeof updateAccountProfile>[1] = {};
    if (typeof body.birthDate === "string") {
      const birthDate = body.birthDate.trim();
      if (!validIsoDate(birthDate)) {
        return errorResponse(400, "تاریخ تولد معتبر نیست.");
      }
      update.birthDate = birthDate;
    }

    if (typeof body.residenceCityId === "string") {
      const city = findHalleusCityById(body.residenceCityId);
      if (!city) return errorResponse(400, "شهر محل سکونت معتبر نیست.");
      update.residence = {
        city: city.faName,
        country: city.countryFaName,
        cityId: city.id,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone,
      };
    }

    if (!update.birthDate && !update.residence) {
      return errorResponse(400, "حداقل یک تغییر پروفایل لازم است.");
    }

    const profile = await updateAccountProfile(user.id, update);
    if (!profile) return errorResponse(404, "حساب پیدا نشد.");
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return errorResponse(401, "ورود به حساب برای ویرایش پروفایل لازم است.");
    }
    return errorResponse(503, "ذخیرهٔ پروفایل فعلاً در دسترس نیست.");
  }
}