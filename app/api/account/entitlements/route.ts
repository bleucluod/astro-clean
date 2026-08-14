import { NextResponse } from "next/server";
import {
  getSupabaseUserFromAuthorizationHeader,
  type VerifiedSupabaseAccountUser,
} from "@/lib/auth/supabase-server-user";
import {
  consumeRelationshipCredit,
  getAccountProductAccess,
  ProductCreditError,
  unlockReportWithCredit,
} from "@/lib/monetization/product-entitlement-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readOptionalUser(
  request: Request,
): Promise<VerifiedSupabaseAccountUser | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  return getSupabaseUserFromAuthorizationHeader(authorization);
}

// HALLEUS_CREDIT_ACCESS_ACCOUNT_API_R1
export async function GET(request: Request) {
  try {
    const user = await readOptionalUser(request);
    const url = new URL(request.url);
    const reportId = url.searchParams.get("reportId");
    const access = await getAccountProductAccess(
      user?.id ?? null,
      reportId,
    );
    return NextResponse.json(
      { ok: true, access },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Product access could not be read.",
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSupabaseUserFromAuthorizationHeader(
      request.headers.get("authorization"),
    );
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "A verified account session is required." },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const idempotencyKey =
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.slice(0, 160)
        : crypto.randomUUID();

    if (action === "unlock_report") {
      const reportId =
        typeof body.reportId === "string" ? body.reportId.slice(0, 220) : "";
      const result = await unlockReportWithCredit({
        userId: user.id,
        reportId,
        idempotencyKey,
      });
      return NextResponse.json(
        { ok: true, result },
        { headers: { "cache-control": "no-store" } },
      );
    }

    if (action === "consume_relationship") {
      const resultKey =
        typeof body.resultKey === "string"
          ? body.resultKey.slice(0, 220)
          : "";
      const result = await consumeRelationshipCredit({
        userId: user.id,
        resultKey,
        idempotencyKey,
      });
      return NextResponse.json(
        { ok: true, result },
        { headers: { "cache-control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unsupported product access action." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const status =
      error instanceof ProductCreditError
        ? error.code === "credit_required"
          ? 409
          : error.code === "report_not_owned"
            ? 404
            : 400
        : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Product access action failed.",
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
