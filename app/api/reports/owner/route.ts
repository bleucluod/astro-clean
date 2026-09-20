import { NextResponse } from "next/server";

// HALLEUS_REPORT_OWNER_CLAIM_PROFILE_FINISH_R3_20260919

import {
  getAccountProfileSnapshot,
  initializeAccountProfileFromBirthInput,
} from "@/lib/account/account-profile-service";
import {
  createGuestReportSession,
  GUEST_REPORT_COOKIE_NAME,
  GUEST_REPORT_COOKIE_OPTIONS,
  readGuestReportSession,
  type GuestReportSession,
} from "@/lib/auth/guest-report-session";
import { getSupabaseUserFromAuthorizationHeader } from "@/lib/auth/supabase-server-user";
import { getHalleusRuntimeEnv, hasDatabaseConfig } from "@/lib/config/env";
import {
  buildStoredComparisonReport,
  isComparisonRecordCandidate,
  isStoredComparisonReport,
  saveComparisonAccountReport,
  saveGuestComparisonReport,
} from "@/lib/comparison/comparison-account-persistence";
import { ensureAccountPersistenceUser } from "@/lib/database/account-persistence-user";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import { readReportPage } from "@/lib/reports/report-access-contract";
import {
  enableOwnedReportSharing,
  getOwnedReport,
  listOwnedReportSummaries,
  revokeOwnedReportSharing,
  softDeleteOwnedReport,
  updateOwnedReportFavorite,
  updateOwnedReportNote,
  updateOwnedReportTitle,
} from "@/lib/reports/report-access-service";
import { saveServerGeneratedReport } from "@/lib/storage/server-report-persistence";
import { getEffectiveTelegramRewardAccessTier } from "@/lib/telegram/telegram-reward-service";
import type { AstrologyReport } from "@/types/astro";
import type { ComparisonRecord } from "@/types/comparison-product";
import type { ReportAccessTier } from "@/types/report-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_PUBLIC_REPORT_OWNER_USER_ID =
  "00000000-0000-4000-8000-000000000207";

type OwnerActor = {
  userId: string;
  ownerKind: "account" | "guest";
  accessTier: ReportAccessTier;
  guestSession?: GuestReportSession;
  createdGuestSession: boolean;
};

function errorResponse(status: number, error: string, blockers: string[] = []) {
  return NextResponse.json({ ok: false, error, blockers }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isAstrologyReport(value: unknown): value is AstrologyReport {
  if (!isRecord(value)) return false;
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

// HALLEUS_OWNER_PRIVATE_PARITY_R16_20260920
type OwnerPrivateReportWithTransit = AstrologyReport & {
  engineData?: {
    personalTransitReportData?: {
      status?: unknown;
    } | null;
  } | null;
};

function normalizeOwnerPrivateText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOwnerPrivateTransit(report: AstrologyReport) {
  const transit =
    (report as OwnerPrivateReportWithTransit).engineData
      ?.personalTransitReportData ?? null;
  return {
    present: Boolean(transit),
    status:
      transit && typeof transit.status === "string" ? transit.status : null,
  };
}

function assertOwnerPrivateReportParity(
  expected: AstrologyReport,
  stored: AstrologyReport,
) {
  if (
    normalizeOwnerPrivateText(expected.input.name) !==
    normalizeOwnerPrivateText(stored.input.name)
  ) {
    throw new Error(
      "Owner report integrity check failed: name was not preserved.",
    );
  }

  if (
    normalizeOwnerPrivateText(expected.input.currentResidenceCity) !==
    normalizeOwnerPrivateText(stored.input.currentResidenceCity)
  ) {
    throw new Error(
      "Owner report integrity check failed: current residence was not preserved.",
    );
  }

  const expectedTransit = readOwnerPrivateTransit(expected);
  const storedTransit = readOwnerPrivateTransit(stored);

  if (expectedTransit.present !== storedTransit.present) {
    throw new Error(
      "Owner report integrity check failed: personal transit availability was not preserved.",
    );
  }

  if (
    expectedTransit.present &&
    expectedTransit.status !== storedTransit.status
  ) {
    throw new Error(
      "Owner report integrity check failed: personal transit status was not preserved.",
    );
  }
}

function storageGuard() {
  const env = getHalleusRuntimeEnv();
  if (!hasDatabaseConfig() || !env.databaseUrl) {
    return {
      ok: false as const,
      status: 503,
      error: "Report storage is not configured.",
      blockers: ["DATABASE_URL is missing."],
    };
  }
  return { ok: true as const, databaseUrl: env.databaseUrl };
}

function attachGuestCookie(response: NextResponse, actor: OwnerActor) {
  if (actor.createdGuestSession && actor.guestSession) {
    response.cookies.set(
      GUEST_REPORT_COOKIE_NAME,
      actor.guestSession.token,
      GUEST_REPORT_COOKIE_OPTIONS,
    );
  }
  return response;
}

async function resolveOwnerActor(
  request: Request,
  options: { createGuest: boolean },
): Promise<OwnerActor | null> {
  const guard = storageGuard();
  if (!guard.ok) throw new Error(guard.error);

  const authorizationHeader = request.headers.get("authorization");
  if (authorizationHeader) {
    const user = await getSupabaseUserFromAuthorizationHeader(authorizationHeader);
    if (!user) {
      throw new Error("A verified Supabase bearer token is required.");
    }

    await ensureAccountPersistenceUser({
      databaseUrl: guard.databaseUrl,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      provider: user.provider,
    });

    return {
      userId: user.id,
      ownerKind: "account",
      accessTier: await getEffectiveTelegramRewardAccessTier(user.id),
      createdGuestSession: false,
    };
  }

  const existingGuest = readGuestReportSession(request);
  if (existingGuest) {
    return {
      userId: existingGuest.userId,
      ownerKind: "guest",
      accessTier: "free",
      guestSession: existingGuest,
      createdGuestSession: false,
    };
  }

  if (!options.createGuest) return null;

  const guestSession = createGuestReportSession();
  await ensureAccountPersistenceUser({
    databaseUrl: guard.databaseUrl,
    userId: guestSession.userId,
    displayName: "Halleus Guest",
    provider: "email",
  });

  return {
    userId: guestSession.userId,
    ownerKind: "guest",
    accessTier: "free",
    guestSession,
    createdGuestSession: true,
  };
}

async function claimGuestRows(accountUserId: string, guestUserId: string) {
  if (accountUserId === guestUserId) return 0;
  const sql = getAdminDatabase();
  const rows = await sql`
    update public.halleus_reports
    set user_id = ${accountUserId},
        source = 'account',
        publication_owner_kind = 'account',
        updated_at = now()
    where user_id = ${guestUserId}
      and deleted_at is null
    returning id
  `;
  return rows.length;
}

// HALLEUS_REPORT_CTA_CURRENT_GUEST_CLAIM_R1_20260919
async function getClaimableCurrentNatalReport(input: {
  accountUserId: string;
  guestUserId?: string;
  reportId: string;
}) {
  const sql = getAdminDatabase();
  const guestUserId = input.guestUserId ?? input.accountUserId;
  const rows = await sql`
    select user_id::text as user_id, report_json
    from public.halleus_reports
    where id = ${input.reportId}
      and (
        user_id = ${input.accountUserId}
        or user_id = ${guestUserId}
      )
      and deleted_at is null
    limit 1
  `;
  if (rows.length === 0) return null;
  const report = (rows[0] as { report_json?: unknown }).report_json;
  return isAstrologyReport(report) ? report : null;
}

async function syncAccountBirthDateFromReport(
  accountUserId: string,
  report: AstrologyReport,
) {
  try {
    const before = await getAccountProfileSnapshot(accountUserId);
    await initializeAccountProfileFromBirthInput(accountUserId, report.input);
    const after = await getAccountProfileSnapshot(accountUserId);
    const birthDate = after?.birthDate ?? null;
    return {
      ok: Boolean(birthDate),
      birthDate,
      initializedFromReport:
        !before?.birthDate && birthDate === report.input.birthDate,
      preservedExisting:
        Boolean(before?.birthDate) && birthDate === before?.birthDate,
      error: birthDate ? null : "Account birth date could not be read after claim.",
    };
  } catch (error) {
    return {
      ok: false,
      birthDate: null,
      initializedFromReport: false,
      preservedExisting: false,
      error:
        error instanceof Error
          ? error.message
          : "Account birth date sync failed after claim.",
    };
  }
}

async function hardenNatalPrivacy(userId: string, reportId: string) {
  const sql = getAdminDatabase();
  await sql`
    update public.halleus_reports
    set visibility = 'unpublished',
        publication_intent = 'unpublish',
        publication_state = 'unpublished',
        identity_consent_state = 'withheld',
        updated_at = now()
    where id = ${reportId}
      and user_id = ${userId}
      and deleted_at is null
  `;
}

async function claimLegacyNatalForOwner(
  actor: OwnerActor,
  report: AstrologyReport,
) {
  const sql = getAdminDatabase();
  const existingRows = await sql`
    select id, user_id
    from public.halleus_reports
    where id = ${report.id}
      and deleted_at is null
    limit 1
  `;

  if (existingRows.length === 0) {
    return saveServerGeneratedReport({
      userId: actor.userId,
      report,
      publication: {
        ownerKind: actor.ownerKind,
        tier: actor.accessTier,
        publicationIntent: "unpublish",
        identityConsentState: "withheld",
      },
    });
  }

  const existing = existingRows[0] as { user_id?: string };

  if (String(existing.user_id ?? "") === actor.userId) {
    await hardenNatalPrivacy(actor.userId, report.id);
    const owned = await getOwnedReport(actor.userId, report.id);
    if (!owned) throw new Error("Existing report could not be reopened.");
    return owned;
  }

  if (String(existing.user_id ?? "") !== LEGACY_PUBLIC_REPORT_OWNER_USER_ID) {
    throw new Error("Legacy report ownership conflicts with another owner.");
  }

  const movedRows = await sql`
    update public.halleus_reports
    set user_id = ${actor.userId},
        source = 'account',
        visibility = 'unpublished',
        publication_owner_kind = ${actor.ownerKind},
        publication_intent = 'unpublish',
        publication_state = 'unpublished',
        identity_consent_state = 'withheld',
        updated_at = now()
    where id = ${report.id}
      and user_id = ${LEGACY_PUBLIC_REPORT_OWNER_USER_ID}
      and deleted_at is null
      and report_json = ${sql.json(report)}::jsonb
    returning id
  `;

  if (movedRows.length === 0) {
    throw new Error("Legacy report proof did not match the stored report.");
  }

  const owned = await getOwnedReport(actor.userId, report.id);
  if (!owned) throw new Error("Claimed legacy report could not be reopened.");
  return owned;
}

async function claimLegacyComparisonForOwner(
  actor: OwnerActor,
  comparison: ComparisonRecord,
) {
  const sql = getAdminDatabase();
  const stored = buildStoredComparisonReport(comparison);
  const existingRows = await sql`
    select id, user_id
    from public.halleus_reports
    where id = ${comparison.id}
      and deleted_at is null
    limit 1
  `;

  if (existingRows.length === 0) {
    return actor.ownerKind === "account"
      ? saveComparisonAccountReport({
          userId: actor.userId,
          comparison,
          accessTier: actor.accessTier,
        })
      : saveGuestComparisonReport({
          userId: actor.userId,
          comparison,
        });
  }

  const existing = existingRows[0] as { user_id?: string };

  if (String(existing.user_id ?? "") === actor.userId) {
    const owned = await getOwnedReport(actor.userId, comparison.id);
    if (!owned) throw new Error("Existing comparison could not be reopened.");
    return owned;
  }

  if (String(existing.user_id ?? "") !== LEGACY_PUBLIC_REPORT_OWNER_USER_ID) {
    throw new Error("Legacy comparison ownership conflicts with another owner.");
  }

  const movedRows = await sql`
    update public.halleus_reports
    set user_id = ${actor.userId},
        source = 'account',
        publication_owner_kind = ${actor.ownerKind},
        updated_at = now()
    where id = ${comparison.id}
      and user_id = ${LEGACY_PUBLIC_REPORT_OWNER_USER_ID}
      and deleted_at is null
      and report_json = ${sql.json(stored)}::jsonb
    returning id
  `;

  if (movedRows.length === 0) {
    throw new Error("Legacy comparison proof did not match the stored comparison.");
  }

  await sql`
    update public.halleus_reports
    set user_id = ${actor.userId},
        source = 'account',
        visibility = 'unpublished',
        publication_owner_kind = ${actor.ownerKind},
        publication_intent = 'unpublish',
        publication_state = 'unpublished',
        identity_consent_state = 'withheld',
        updated_at = now()
    where user_id = ${LEGACY_PUBLIC_REPORT_OWNER_USER_ID}
      and deleted_at is null
      and (
        id = ${comparison.chartAId}
        or id = ${comparison.chartBId}
      )
  `;

  const owned = await getOwnedReport(actor.userId, comparison.id);
  if (!owned) throw new Error("Claimed legacy comparison could not be reopened.");
  return owned;
}

export async function GET(request: Request) {
  const guard = storageGuard();
  if (!guard.ok) return errorResponse(guard.status, guard.error, guard.blockers);

  const url = new URL(request.url);
  const reportId = readString(url.searchParams.get("reportId"));

  try {
    const actor = await resolveOwnerActor(request, { createGuest: false });
    if (!actor) {
      if (reportId) return errorResponse(404, "Report was not found.");
      return NextResponse.json({
        ok: true,
        summaries: [],
        page: readReportPage(url.searchParams.get("page")),
        pageSize: 25,
        total: 0,
        ownerKind: "guest",
      });
    }

    if (reportId) {
      const reportRecord = await getOwnedReport(actor.userId, reportId);
      if (!reportRecord) return errorResponse(404, "Report was not found.");
      return NextResponse.json({
        ok: true,
        reportRecord,
        ownerKind: actor.ownerKind,
      });
    }

    const result = await listOwnedReportSummaries(
      actor.userId,
      readReportPage(url.searchParams.get("page")),
    );
    return NextResponse.json({
      ok: true,
      ...result,
      ownerKind: actor.ownerKind,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error && error.message.includes("bearer token") ? 401 : 500,
      error instanceof Error ? error.message : "Report read failed.",
    );
  }
}

export async function POST(request: Request) {
  const guard = storageGuard();
  if (!guard.ok) return errorResponse(guard.status, guard.error, guard.blockers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }
  if (!isRecord(body)) {
    return errorResponse(400, "Request body must be a JSON object.");
  }

  const action = readString(body.action);

  try {
    if (action === "claim_guest") {
      const authorizationHeader = request.headers.get("authorization");
      if (!authorizationHeader) {
        return errorResponse(401, "Sign in before claiming guest reports.");
      }
      const accountActor = await resolveOwnerActor(request, { createGuest: false });
      if (!accountActor || accountActor.ownerKind !== "account") {
        return errorResponse(401, "A verified account is required.");
      }

      const guest = readGuestReportSession(request);
      const currentReportId = readString(body.reportId);
      const currentReport = currentReportId
        ? await getClaimableCurrentNatalReport({
            accountUserId: accountActor.userId,
            guestUserId: guest?.userId,
            reportId: currentReportId,
          })
        : null;

      if (currentReportId && !currentReport) {
        return errorResponse(409, "Current guest report could not be verified for claim.");
      }

      const claimed = guest
        ? await claimGuestRows(accountActor.userId, guest.userId)
        : 0;

      const currentReportRecord = currentReportId
        ? await getOwnedReport(accountActor.userId, currentReportId)
        : null;
      if (currentReportId && !currentReportRecord) {
        throw new Error("Claimed current report could not be reopened from the account.");
      }

      const profileSync = currentReport
        ? await syncAccountBirthDateFromReport(accountActor.userId, currentReport)
        : null;

      const response = NextResponse.json({
        ok: true,
        claimed,
        ownerKind: "account",
        currentReportId: currentReportRecord?.id ?? currentReportId ?? null,
        reportRecord: currentReportRecord,
        profileSync,
      });
      if (guest) {
        response.cookies.set(GUEST_REPORT_COOKIE_NAME, "", {
          ...GUEST_REPORT_COOKIE_OPTIONS,
          maxAge: 0,
        });
      }
      return response;
    }

    if (action === "claim_legacy_report") {
      const report = body.report;
      if (!isAstrologyReport(report)) {
        return errorResponse(400, "A valid report is required.");
      }
      const actor = await resolveOwnerActor(request, { createGuest: true });
      if (!actor) return errorResponse(500, "Report owner could not be resolved.");
      const reportRecord = await claimLegacyNatalForOwner(actor, report);
      return attachGuestCookie(
        NextResponse.json({
          ok: true,
          reportRecord,
          ownerKind: actor.ownerKind,
        }),
        actor,
      );
    }

    if (action === "claim_legacy_comparison") {
      const comparison = body.comparison;
      if (!isComparisonRecordCandidate(comparison)) {
        return errorResponse(400, "A valid comparison is required.");
      }
      const actor = await resolveOwnerActor(request, { createGuest: true });
      if (!actor) return errorResponse(500, "Report owner could not be resolved.");
      const reportRecord = await claimLegacyComparisonForOwner(
        actor,
        comparison,
      );
      return attachGuestCookie(
        NextResponse.json({
          ok: true,
          reportRecord,
          ownerKind: actor.ownerKind,
        }),
        actor,
      );
    }

    const actor = await resolveOwnerActor(request, { createGuest: true });
    if (!actor) return errorResponse(500, "Report owner could not be resolved.");

    const comparison = body.comparison;
    if (isComparisonRecordCandidate(comparison)) {
      const reportRecord =
        actor.ownerKind === "account"
          ? await saveComparisonAccountReport({
              userId: actor.userId,
              comparison,
              accessTier: actor.accessTier,
            })
          : await saveGuestComparisonReport({
              userId: actor.userId,
              comparison,
            });

      return attachGuestCookie(
        NextResponse.json({
          ok: true,
          reportRecord,
          ownerKind: actor.ownerKind,
          persistence:
            actor.ownerKind === "account" ? "account-private" : "guest-private",
        }),
        actor,
      );
    }

    const report = body.report;
    if (!isAstrologyReport(report)) {
      return errorResponse(400, "Request body must include a valid report.");
    }

    if (actor.ownerKind === "account") {
      try {
        await initializeAccountProfileFromBirthInput(actor.userId, report.input);
      } catch {
        // Profile defaults are best-effort and never block a valid report save.
      }
    }

    const reportRecord = await saveServerGeneratedReport({
      userId: actor.userId,
      report,
      publication: {
        ownerKind: actor.ownerKind,
        tier: actor.accessTier,
        publicationIntent: "unpublish",
        identityConsentState: "withheld",
      },
    });

    assertOwnerPrivateReportParity(report, reportRecord.report);

    return attachGuestCookie(
      NextResponse.json({
        ok: true,
        reportRecord,
        ownerKind: actor.ownerKind,
      }),
      actor,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Report persistence failed.";
    const status =
      message.includes("bearer token") || message.includes("verified account")
        ? 401
        : message.includes("ownership conflicts") ||
            message.includes("proof did not match")
          ? 409
          : 500;
    return errorResponse(status, message);
  }
}

export async function PATCH(request: Request) {
  const guard = storageGuard();
  if (!guard.ok) return errorResponse(guard.status, guard.error, guard.blockers);

  try {
    const actor = await resolveOwnerActor(request, { createGuest: false });
    if (!actor) return errorResponse(401, "A current report owner is required.");

    const body = await request.json();
    if (!isRecord(body)) {
      return errorResponse(400, "Request body must be an object.");
    }
    const reportId = readString(body.reportId);
    const action = readString(body.action);
    if (!reportId || !action) {
      return errorResponse(400, "Report id and action are required.");
    }

    if (action === "title") {
      return NextResponse.json({
        ok: await updateOwnedReportTitle(actor.userId, reportId, body.title),
      });
    }
    if (action === "favorite") {
      if (typeof body.favorite !== "boolean") {
        return errorResponse(400, "Favorite must be a boolean.");
      }
      return NextResponse.json({
        ok: await updateOwnedReportFavorite(
          actor.userId,
          reportId,
          body.favorite,
        ),
      });
    }
    if (action === "note") {
      if (typeof body.note !== "string" || body.note.length > 4000) {
        return errorResponse(400, "Report note is invalid or too long.");
      }
      return NextResponse.json({
        ok: await updateOwnedReportNote(actor.userId, reportId, body.note),
      });
    }

    if (actor.ownerKind !== "account") {
      return errorResponse(403, "Sign in before changing report sharing.");
    }

    const owned = await getOwnedReport(actor.userId, reportId);
    if (!owned) return errorResponse(404, "Report was not found.");
    if (isStoredComparisonReport(owned.report)) {
      return errorResponse(
        409,
        "Comparison reports are private and cannot be shared.",
      );
    }

    if (action === "enable_sharing") {
      const shareToken = await enableOwnedReportSharing(actor.userId, reportId);
      return shareToken
        ? NextResponse.json({
            ok: true,
            sharePath: `/reports/shared/${shareToken}`,
          })
        : errorResponse(404, "Report was not found.");
    }

    if (action === "revoke_sharing") {
      return NextResponse.json({
        ok: await revokeOwnedReportSharing(actor.userId, reportId),
      });
    }

    return errorResponse(400, "Report action is invalid.");
  } catch (error) {
    return errorResponse(
      error instanceof Error && error.message.includes("bearer token") ? 401 : 500,
      error instanceof Error ? error.message : "Report update failed.",
    );
  }
}

export async function DELETE(request: Request) {
  const guard = storageGuard();
  if (!guard.ok) return errorResponse(guard.status, guard.error, guard.blockers);

  try {
    const actor = await resolveOwnerActor(request, { createGuest: false });
    if (!actor) return errorResponse(401, "A current report owner is required.");
    const reportId = readString(new URL(request.url).searchParams.get("reportId"));
    if (!reportId) return errorResponse(400, "Report id is required.");
    return NextResponse.json({
      ok: await softDeleteOwnedReport(actor.userId, reportId),
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error && error.message.includes("bearer token") ? 401 : 500,
      error instanceof Error ? error.message : "Report deletion failed.",
    );
  }
}
