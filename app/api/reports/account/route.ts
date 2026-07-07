import { NextResponse } from "next/server";

import { getAccountReportSaveReadiness } from "@/lib/account/account-report-save-readiness";
import { getHalleusRuntimeEnv, hasDatabaseConfig } from "@/lib/config/env";
import { ensureAccountPersistenceUser } from "@/lib/database/account-persistence-user";
import { getSupabaseUserFromAuthorizationHeader } from "@/lib/auth/supabase-server-user";
import {
  getPublicServerStoredReport,
  getServerStoredReport,
  listServerReportSummaries,
  saveServerGeneratedReport,
} from "@/lib/storage/server-report-persistence";
import type { AstrologyReport } from "@/types/astro";

export const runtime = "nodejs";

const PUBLIC_REPORT_OWNER_USER_ID = "00000000-0000-4000-8000-000000000207";
const PUBLIC_REPORT_OWNER_EMAIL = "public-reports@halleus.local";
const PUBLIC_REPORT_OWNER_DISPLAY_NAME = "Halleus Public Reports";

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

function publicReportReadGuard(): AccountReportSaveGuard {
  const env = getHalleusRuntimeEnv();

  if (!hasDatabaseConfig() || !env.databaseUrl) {
    return {
      ok: false,
      status: 503,
      error: "Public report read path is not configured.",
      blockers: ["DATABASE_URL is missing."],
    };
  }

  return {
    ok: true,
    databaseUrl: env.databaseUrl,
  };
}

function publicReportWriteGuard(): AccountReportSaveGuard {
  const env = getHalleusRuntimeEnv();

  if (!hasDatabaseConfig() || !env.databaseUrl) {
    return {
      ok: false,
      status: 503,
      error: "Public report save path is not configured.",
      blockers: ["DATABASE_URL is missing."],
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
  const url = new URL(request.url);
  const reportId = readString(url.searchParams.get("reportId"));
  const authorizationHeader = request.headers.get("authorization");

  if (reportId && !authorizationHeader) {
    const guard = publicReportReadGuard();

    if (!guard.ok) {
      return errorResponse(guard.status, guard.error, guard.blockers);
    }

    try {
      const reportRecord = await getPublicServerStoredReport({ reportId });

      if (!reportRecord) {
        return errorResponse(404, "Public report was not found.");
      }

      return NextResponse.json({ ok: true, reportRecord });
    } catch (error) {
      return errorResponse(
        500,
        error instanceof Error
          ? error.message
          : "Public report read failed.",
      );
    }
  }

  const guard = accountReportSaveGuard();

  if (!guard.ok) {
    return errorResponse(guard.status, guard.error, guard.blockers);
  }

  try {
    const user = await readAuthenticatedAccountUser(request);

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
  const authorizationHeader = request.headers.get("authorization");

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  if (!isRecord(body)) {
    return errorResponse(400, "Request body must be a JSON object.");
  }

  const report = body.report;

  if (!isAstrologyReport(report)) {
    return errorResponse(400, "Request body must include a valid report.");
  }

  if (!authorizationHeader) {
    const guard = publicReportWriteGuard();

    if (!guard.ok) {
      return errorResponse(guard.status, guard.error, guard.blockers);
    }

    try {
      await ensureAccountPersistenceUser({
        databaseUrl: guard.databaseUrl,
        userId: PUBLIC_REPORT_OWNER_USER_ID,
        email: PUBLIC_REPORT_OWNER_EMAIL,
        displayName: PUBLIC_REPORT_OWNER_DISPLAY_NAME,
        provider: "email",
      });

      const reportRecord = await saveServerGeneratedReport({
        userId: PUBLIC_REPORT_OWNER_USER_ID,
        report,
      });

      return NextResponse.json({ ok: true, reportRecord });
    } catch (error) {
      return errorResponse(
        500,
        error instanceof Error
          ? error.message
          : "Public report persistence save failed.",
      );
    }
  }

  const guard = accountReportSaveGuard();

  if (!guard.ok) {
    return errorResponse(guard.status, guard.error, guard.blockers);
  }

  try {
    const user = await readAuthenticatedAccountUser(request);

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
