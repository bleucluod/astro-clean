"use client";

import {
  getSupabaseBrowserAccessState,
  getSupabaseBrowserLoginConfig,
} from "@/lib/auth/supabase-browser-client";
import { createReportRecord } from "@/lib/storage/report-records";
import type { AstrologyReport } from "@/types/astro";
import type { ReportRecord } from "@/types/storage";

export type AccountReportSaveClientConfig = {
  enabled: boolean;
  canAttemptAccountReportSave: boolean;
  missingConfig: string[];
};

export type AccountReportSaveResult = {
  localRecord: ReportRecord;
  localAvailable: false;
  accountRecord: ReportRecord | null;
  accountStatus:
    | "account-saved"
    | "guest-saved"
    | "account-disabled"
    | "not-authenticated"
    | "account-skipped";
  accountMessage: string;
};

type OwnerSaveResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: ReportRecord;
  ownerKind?: "account" | "guest";
  blockers?: string[];
};

function createSafeAccountReportSaveMessage(message?: string) {
  const normalized = message?.trim() ?? "";
  if (!normalized) {
    return "ذخیره گزارش روی هالیوس کامل نشد. دوباره تلاش کن.";
  }
  return "ذخیره گزارش روی هالیوس کامل نشد. اتصال را بررسی کن و دوباره تلاش کن.";
}

export function getAccountReportSaveClientConfig(): AccountReportSaveClientConfig {
  const loginConfig = getSupabaseBrowserLoginConfig();
  return {
    enabled: true,
    canAttemptAccountReportSave: loginConfig.canUseRealSupabaseLogin,
    missingConfig: loginConfig.missingConfig,
  };
}

export type AccountReportSaveOptions = {
  navigationGraceMs?: number;
};

async function readOptionalAccessToken() {
  const auth = await getSupabaseBrowserAccessState();

  if (auth.kind === "unavailable") {
    return {
      accessToken: undefined as string | undefined,
      error: auth.error,
    };
  }

  return {
    accessToken: auth.kind === "account" ? auth.accessToken : undefined,
    error: undefined as string | undefined,
  };
}

function ownerHeaders(accessToken?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function postOwnerReport(
  report: AstrologyReport,
): Promise<AccountReportSaveResult> {
  const localRecord = createReportRecord(report);
  const auth = await readOptionalAccessToken();

  if (auth.error && !auth.accessToken) {
    return {
      localRecord,
      localAvailable: false,
      accountRecord: null,
      accountStatus: "account-skipped",
      accountMessage: createSafeAccountReportSaveMessage(auth.error),
    };
  }

  try {
    const response = await fetch("/api/reports/owner", {
      method: "POST",
      headers: ownerHeaders(auth.accessToken),
      body: JSON.stringify({ report }),
    });
    const payload = (await response.json().catch(() => null)) as
      | OwnerSaveResponse
      | null;

    if (!response.ok || !payload?.ok || !payload.reportRecord) {
      return {
        localRecord,
        localAvailable: false,
        accountRecord: null,
        accountStatus: "account-skipped",
        accountMessage: createSafeAccountReportSaveMessage(payload?.error),
      };
    }

    const accountOwned = payload.ownerKind === "account";
    return {
      localRecord,
      localAvailable: false,
      accountRecord: payload.reportRecord,
      accountStatus: accountOwned ? "account-saved" : "guest-saved",
      accountMessage: accountOwned
        ? "گزارش در حساب هالیوس ذخیره شد."
        : "گزارش روی هالیوس ذخیره شد. با ساخت حساب می‌توانی آن را از دستگاه‌های دیگر هم داشته باشی.",
    };
  } catch (error) {
    return {
      localRecord,
      localAvailable: false,
      accountRecord: null,
      accountStatus: "account-skipped",
      accountMessage: createSafeAccountReportSaveMessage(
        error instanceof Error ? error.message : undefined,
      ),
    };
  }
}

export async function saveGeneratedReportWithAccountFallback(
  report: AstrologyReport,
  _options: AccountReportSaveOptions = {},
): Promise<AccountReportSaveResult> {
  // HALLEUS_SERVER_CANONICAL_REPORT_SAVE_R1_20260919
  // New reports are not written to browser localStorage. Navigation continues
  // only after Halleus acknowledges the canonical server record.
  return postOwnerReport(report);
}

export async function ensureServerCanonicalReport(
  report: AstrologyReport,
): Promise<ReportRecord | null> {
  const auth = await readOptionalAccessToken();
  if (auth.error && !auth.accessToken) return null;

  try {
    const response = await fetch("/api/reports/owner", {
      method: "POST",
      headers: ownerHeaders(auth.accessToken),
      body: JSON.stringify({
        action: "claim_legacy_report",
        report,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | OwnerSaveResponse
      | null;
    return response.ok && payload?.ok && payload.reportRecord
      ? payload.reportRecord
      : null;
  } catch {
    return null;
  }
}