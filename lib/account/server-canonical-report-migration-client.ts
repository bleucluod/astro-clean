"use client";

// HALLEUS_REPORT_CTA_CLAIM_PROFILE_FINISH_R2_20260919

import {
  loadPrivateComparisons,
} from "@/lib/comparison/comparison-storage";
import { getReportRepository } from "@/lib/storage/report-repository";

export type ServerCanonicalReconcileResult = {
  guestClaimed: number;
  localReportsMigrated: number;
  localComparisonsMigrated: number;
  preservedForRetry: number;
};

function ownerHeaders(accessToken?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export type CurrentGuestReportClaimResult = {
  claimed: number;
  reportId: string;
  profileSync: {
    ok: boolean;
    birthDate: string | null;
    initializedFromReport: boolean;
    preservedExisting: boolean;
    error: string | null;
  } | null;
};

// HALLEUS_REPORT_CTA_CURRENT_GUEST_CLAIM_CLIENT_R1_20260919
export async function claimCurrentGuestReport(
  accessToken: string,
  reportId: string,
): Promise<CurrentGuestReportClaimResult> {
  if (!accessToken.trim() || !reportId.trim()) {
    throw new Error("برای ذخیره این چارت، ورود معتبر و شناسه گزارش لازم است.");
  }

  const response = await fetch("/api/reports/owner", {
    method: "POST",
    headers: ownerHeaders(accessToken),
    body: JSON.stringify({
      action: "claim_guest",
      reportId,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        error?: string;
        claimed?: number;
        ownerKind?: string;
        currentReportId?: string | null;
        profileSync?: CurrentGuestReportClaimResult["profileSync"];
      }
    | null;

  if (
    !response.ok ||
    payload?.ok !== true ||
    payload.ownerKind !== "account" ||
    payload.currentReportId !== reportId
  ) {
    throw new Error(
      payload?.error ?? "وصل‌کردن این چارت به حساب کامل نشد. دوباره تلاش کن.",
    );
  }

  return {
    claimed: payload.claimed ?? 0,
    reportId,
    profileSync: payload.profileSync ?? null,
  };
}

async function postOwner(
  accessToken: string | undefined,
  body: Record<string, unknown>,
) {
  const response = await fetch("/api/reports/owner", {
    method: "POST",
    headers: ownerHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; claimed?: number }
    | null;
  return {
    ok: response.ok && payload?.ok === true,
    claimed: payload?.claimed ?? 0,
  };
}

async function patchOwner(
  accessToken: string | undefined,
  body: Record<string, unknown>,
) {
  const response = await fetch("/api/reports/owner", {
    method: "PATCH",
    headers: ownerHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean }
    | null;
  return response.ok && payload?.ok === true;
}

export async function reconcileServerCanonicalReports(
  accessToken?: string,
): Promise<ServerCanonicalReconcileResult> {
  // HALLEUS_SERVER_CANONICAL_LEGACY_MIGRATION_R3_20260919
  // Local browser records are migration/recovery input, not source of truth.
  // Natal local copies are removed one-by-one only after server ownership and
  // metadata preservation succeed. Comparison local copies may remain as a
  // non-canonical UI cache; all new comparison reads prefer the server.
  let guestClaimed = 0;
  let localReportsMigrated = 0;
  let localComparisonsMigrated = 0;
  let preservedForRetry = 0;

  if (accessToken) {
    const guestClaim = await postOwner(accessToken, { action: "claim_guest" });
    if (guestClaim.ok) guestClaimed = guestClaim.claimed;
  }

  const repository = getReportRepository();
  const localRecords = await repository.listReports();

  for (const record of localRecords) {
    const claim = await postOwner(accessToken, {
      action: "claim_legacy_report",
      report: record.report,
    });
    if (!claim.ok) {
      preservedForRetry += 1;
      continue;
    }

    let metadataOk = true;
    if (record.favorite) {
      metadataOk =
        (await patchOwner(accessToken, {
          reportId: record.id,
          action: "favorite",
          favorite: true,
        })) && metadataOk;
    }
    if (record.note?.trim()) {
      metadataOk =
        (await patchOwner(accessToken, {
          reportId: record.id,
          action: "note",
          note: record.note,
        })) && metadataOk;
    }

    if (!metadataOk) {
      preservedForRetry += 1;
      continue;
    }

    await repository.deleteReport(record.id);
    localReportsMigrated += 1;
  }

  for (const comparison of loadPrivateComparisons()) {
    const claim = await postOwner(accessToken, {
      action: "claim_legacy_comparison",
      comparison,
    });
    if (claim.ok) {
      localComparisonsMigrated += 1;
    } else {
      preservedForRetry += 1;
    }
  }

  return {
    guestClaimed,
    localReportsMigrated,
    localComparisonsMigrated,
    preservedForRetry,
  };
}
