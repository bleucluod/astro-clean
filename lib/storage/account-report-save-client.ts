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
    | "public-saved"
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

function createSafeAccountReportSaveMessage(message?: string) {
  const normalizedMessage = message?.trim() ?? "";
  const lowerMessage = normalizedMessage.toLowerCase();
  const looksLikeNetworkTimeout =
    lowerMessage.includes("connect_timeout") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("pooler") ||
    lowerMessage.includes("supabase") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network");

  if (looksLikeNetworkTimeout) {
    return "ذخیره آنلاین موقتاً پاسخ نداد؛ نسخه همین دستگاه استفاده شد.";
  }

  if (!normalizedMessage) {
    return "ذخیره آنلاین کامل نشد؛ نسخه همین دستگاه استفاده شد.";
  }

  if (
    lowerMessage.includes("not configured") ||
    lowerMessage.includes("disabled") ||
    lowerMessage.includes("missing")
  ) {
    return "ذخیره آنلاین در این محیط کامل فعال نیست؛ نسخه همین دستگاه استفاده شد.";
  }

  return "ذخیره آنلاین کامل نشد؛ نسخه همین دستگاه استفاده شد.";
}

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
  const accountSaveFlagEnabled = isPublicFlagEnabled(
    "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE",
  );
  const missingConfig = [...loginConfig.missingConfig];

  if (!accountSaveFlagEnabled) {
    missingConfig.push("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true");
  }

  return {
    enabled: true,
    canAttemptAccountReportSave:
      accountSaveFlagEnabled && loginConfig.canUseRealSupabaseLogin,
    missingConfig: [...new Set(missingConfig)],
  };
}

export async function saveGeneratedReportWithAccountFallback(
  report: AstrologyReport,
): Promise<AccountReportSaveResult> {
  const localRecord = await saveGeneratedReport(report);
  const config = getAccountReportSaveClientConfig();

  let accessToken: string | undefined;
  let authErrorMessage: string | undefined;
  const client = getSupabaseBrowserAuthClient();

  if (client && config.canAttemptAccountReportSave) {
    const { data, error } = await client.auth.getSession();

    accessToken = data.session?.access_token;
    authErrorMessage = error?.message;
  }

  if (client && config.canAttemptAccountReportSave && authErrorMessage && !accessToken) {
    return {
      localRecord,
      accountRecord: null,
      accountStatus: "account-skipped",
      accountMessage: createSafeAccountReportSaveMessage(authErrorMessage),
    };
  }

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch("/api/reports/account", {
      method: "POST",
      headers,
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
        accountStatus: accessToken ? "account-skipped" : "not-authenticated",
        accountMessage: createSafeAccountReportSaveMessage(
          payload?.error ?? authErrorMessage,
        ),
      };
    }

    return {
      localRecord,
      accountRecord: payload.reportRecord,
      accountStatus: accessToken ? "account-saved" : "public-saved",
      accountMessage: accessToken
        ? "گزارش در حساب ذخیره شد؛ وضعیت انتشار ثبت شد اما مسیر عمومی هنوز فعال نشده است."
        : "گزارش روی سرور ذخیره شد؛ وضعیت انتشار ثبت شد اما مسیر عمومی هنوز فعال نشده است.",
    };
  } catch (error) {
    return {
      localRecord,
      accountRecord: null,
      accountStatus: "account-skipped",
      accountMessage: createSafeAccountReportSaveMessage(
        error instanceof Error ? error.message : undefined,
      ),
    };
  }
}