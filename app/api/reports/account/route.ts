import { NextResponse } from "next/server";

import { getAccountReportSaveReadiness } from "@/lib/account/account-report-save-readiness";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { ensureAccountPersistenceUser } from "@/lib/database/account-persistence-user";
import { getSupabaseUserFromAuthorizationHeader } from "@/lib/auth/supabase-server-user";
import {
  getServerStoredReport,
  listServerReportSummaries,
  saveServerGeneratedReport,
} from "@/lib/storage/server-report-persistence";
import type { AstrologyReport } from "@/types/astro";

export const runtime = "nodejs";

type AccountReportApiBody = Record<string, unknown>;

type AccountReportSaveGuard =
  | { ok: true; databaseUrl: string }
  | { ok: false; status: number; error: string; blockers: string[] };

function accountReportSaveGuard(): AccountReportSaveGuard {
  const env = getHalleusRuntimeEnv();
  const readiness = getAccountReportSaveReadiness();

  if (!readiness.canSaveToAccount || !env.databaseUrl) {
    return {
      ok: false,
      status: 503,
      error: "Account report save path is not configured.",
      blockers: readiness.blockers,
    };
  }

  return {
    ok: true,
    databaseUrl: env.databaseUrl,
  };
}

function errorResponse(status: number, error: string, blockers: string[] = []) {
  return NextResponse.json({ ok: false, error, blockers }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAstrologyReport(value: unknown): value is AstrologyReport {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    isRecord(value.input) &&
    isRecord(value.chart) &&
    typeof value.summary === "string" &&
    Array.isArray(value.interpretations) &&
    typeof value.safetyNote === "string"
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function readAuthenticatedAccountUser(request: Request) {
  const user = await getSupabaseUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );

  if (!user) {
    throw new Error("A verified Supabase bearer token is required.");
  }

  return user;
}

export async function GET(request: Request) {
  const guard = accountReportSaveGuard();

  if (!guard.ok) {
    return errorResponse(guard.status, guard.error, guard.blockers);
  }

  try {
    const user = await readAuthenticatedAccountUser(request);
    const url = new URL(request.url);
    const reportId = readString(url.searchParams.get("reportId"));

    if (reportId) {
      const reportRecord = await getServerStoredReport({
        userId: user.id,
        reportId,
      });

      if (!reportRecord) {
        return errorResponse(404, "Report was not found.");
      }

      return NextResponse.json({ ok: true, reportRecord });
    }

    const summaries = await listServerReportSummaries({ userId: user.id });

    return NextResponse.json({ ok: true, summaries });
  } catch (error) {
    return errorResponse(
      error instanceof Error && error.message.includes("bearer token") ? 401 : 500,
      error instanceof Error
        ? error.message
        : "Account report persistence read failed.",
    );
  }
}

export async function POST(request: Request) {
  const guard = accountReportSaveGuard();

  if (!guard.ok) {
    return errorResponse(guard.status, guard.error, guard.blockers);
  }

  try {
    const user = await readAuthenticatedAccountUser(request);
    const body = (await request.json()) as AccountReportApiBody;
    const report = body.report;

    if (!isAstrologyReport(report)) {
      return errorResponse(400, "Request body must include a valid report.");
    }

    await ensureAccountPersistenceUser({
      databaseUrl: guard.databaseUrl,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      provider: user.provider,
    });

    const reportRecord = await saveServerGeneratedReport({
      userId: user.id,
      report,
    });

    return NextResponse.json({ ok: true, reportRecord });
  } catch (error) {
    return errorResponse(
      error instanceof Error && error.message.includes("bearer token") ? 401 : 500,
      error instanceof Error
        ? error.message
        : "Account report persistence save failed.",
    );
  }
}
