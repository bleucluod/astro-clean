"use client";

import { getSupabaseBrowserAuthClient, getSupabaseBrowserLoginConfig } from "@/lib/auth/supabase-browser-client";
import { saveGeneratedReport } from "@/lib/storage/report-write-service";
import type { AstrologyReport } from "@/types/astro";
import type { ReportRecord } from "@/types/storage";

export type AccountReportSaveClientConfig = {
  enabled: boolean;
  canAttemptAccountReportSave: boolean;
  missingConfig: string[];
};

export type AccountReportSaveResult = {
  localRecord: ReportRecord;
  accountRecord: ReportRecord | null;
  accountStatus:
    | "account-saved"
    | "account-disabled"
    | "not-authenticated"
    | "account-skipped";
  accountMessage: string;
};

type AccountReportSaveResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: ReportRecord;
  blockers?: string[];
};

const accountReportSavePublicEnv = {
  NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE:
    process.env.NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE,
} as const;

type AccountReportSavePublicEnvName = keyof typeof accountReportSavePublicEnv;

function getPublicEnv(name: AccountReportSavePublicEnvName) {
  const value = accountReportSavePublicEnv[name]?.trim();

  return value ? value : undefined;
}

function isPublicFlagEnabled(name: AccountReportSavePublicEnvName) {
  return getPublicEnv(name)?.toLowerCase() === "true";
}

export function getAccountReportSaveClientConfig(): AccountReportSaveClientConfig {
  const loginConfig = getSupabaseBrowserLoginConfig();
  const enabled = isPublicFlagEnabled("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE");
  const missingConfig = [...loginConfig.missingConfig];

  if (!enabled) {
    missingConfig.push("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true");
  }

  return {
    enabled,
    canAttemptAccountReportSave: enabled && loginConfig.canUseRealSupabaseLogin,
    missingConfig: [...new Set(missingConfig)],
  };
}

export async function saveGeneratedReportWithAccountFallback(
  report: AstrologyReport,
): Promise<AccountReportSaveResult> {
  const localRecord = await saveGeneratedReport(report);
  const config = getAccountReportSaveClientConfig();

  if (!config.canAttemptAccountReportSave) {
    return {
      localRecord,
      accountRecord: null,
      accountStatus: "account-disabled",
      accountMessage: "Account report save is disabled; local-preview fallback was used.",
    };
  }

  const client = getSupabaseBrowserAuthClient();

  if (!client) {
    return {
      localRecord,
      accountRecord: null,
      accountStatus: "account-disabled",
      accountMessage: "Supabase login client is not configured; local-preview fallback was used.",
    };
  }

  const { data, error } = await client.auth.getSession();
  const accessToken = data.session?.access_token;

  if (error || !accessToken) {
    return {
      localRecord,
      accountRecord: null,
      accountStatus: "not-authenticated",
      accountMessage: error?.message ?? "User is not signed in; local-preview fallback was used.",
    };
  }

  try {
    const response = await fetch("/api/reports/account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        report: localRecord.report,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | AccountReportSaveResponse
      | null;

    if (!response.ok || !payload?.ok || !payload.reportRecord) {
      return {
        localRecord,
        accountRecord: null,
        accountStatus: "account-skipped",
        accountMessage:
          payload?.error ?? "Account report save did not complete; local-preview fallback was used.",
      };
    }

    return {
      localRecord,
      accountRecord: payload.reportRecord,
      accountStatus: "account-saved",
      accountMessage: "Report was saved to the signed-in account and kept in local-preview fallback.",
    };
  } catch (error) {
    return {
      localRecord,
      accountRecord: null,
      accountStatus: "account-skipped",
      accountMessage:
        error instanceof Error
          ? error.message
          : "Account report save failed; local-preview fallback was used.",
    };
  }
}