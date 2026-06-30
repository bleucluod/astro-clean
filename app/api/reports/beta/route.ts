import { NextResponse } from "next/server";

import { getHalleusRuntimeEnv } from "@/lib/config/env";
import {
  getServerStoredReport,
  listServerReportSummaries,
  saveServerGeneratedReport,
} from "@/lib/storage/server-report-persistence";
import type { AstrologyReport } from "@/types/astro";

export const runtime = "nodejs";

type BetaApiBody = Record<string, unknown>;

type BetaPersistenceGuard =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

function betaPersistenceGuard(): BetaPersistenceGuard {
  const env = getHalleusRuntimeEnv();

  if (!env.databaseUrl) {
    return {
      ok: false,
      status: 503,
      error: "Database persistence is not configured.",
    };
  }

  if (!env.betaPersistenceEnabled) {
    return {
      ok: false,
      status: 404,
      error: "Beta report persistence route is disabled.",
    };
  }

  if (!env.betaPersistenceUserId) {
    return {
      ok: false,
      status: 503,
      error: "Beta persistence user is not configured.",
    };
  }

  return { ok: true, userId: env.betaPersistenceUserId };
}

function errorResponse(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
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

export async function GET(request: Request) {
  const guard = betaPersistenceGuard();

  if (!guard.ok) {
    return errorResponse(guard.status, guard.error);
  }

  const url = new URL(request.url);
  const reportId = readString(url.searchParams.get("reportId"));

  try {
    if (reportId) {
      const reportRecord = await getServerStoredReport({
        userId: guard.userId,
        reportId,
      });

      if (!reportRecord) {
        return errorResponse(404, "Report was not found.");
      }

      return NextResponse.json({ ok: true, reportRecord });
    }

    const summaries = await listServerReportSummaries({ userId: guard.userId });

    return NextResponse.json({ ok: true, summaries });
  } catch (error) {
    return errorResponse(
      500,
      error instanceof Error
        ? error.message
        : "Server report persistence read failed.",
    );
  }
}

export async function POST(request: Request) {
  const guard = betaPersistenceGuard();

  if (!guard.ok) {
    return errorResponse(guard.status, guard.error);
  }

  try {
    const body = (await request.json()) as BetaApiBody;
    const report = body.report;

    if (!isAstrologyReport(report)) {
      return errorResponse(400, "Request body must include a valid report.");
    }

    const reportRecord = await saveServerGeneratedReport({
      userId: guard.userId,
      report,
    });

    return NextResponse.json({ ok: true, reportRecord });
  } catch (error) {
    return errorResponse(
      500,
      error instanceof Error
        ? error.message
        : "Server report persistence save failed.",
    );
  }
}
