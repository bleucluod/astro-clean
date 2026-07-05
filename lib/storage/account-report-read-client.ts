"use client";

import {
  getSupabaseBrowserAuthClient,
  getSupabaseBrowserLoginConfig,
} from "@/lib/auth/supabase-browser-client";
import type { ReportRecord, ReportRecordSummary } from "@/types/storage";

export type AccountReportReadClientConfig = {
  enabled: boolean;
  canAttemptAccountReportRead: boolean;
  missingConfig: string[];
};

export type AccountReportReadStatus =
  | "account-read-ready"
  | "account-read-disabled"
  | "not-authenticated"
  | "account-read-failed";

export type AccountReportListResult = {
  status: AccountReportReadStatus;
  summaries: ReportRecordSummary[];
  message: string;
  blockers: string[];
};

export type AccountReportDetailResult = {
  status: AccountReportReadStatus;
  reportRecord: ReportRecord | null;
  message: string;
  blockers: string[];
};

type AccountReportListResponse = {
  ok?: boolean;
  error?: string;
  summaries?: ReportRecordSummary[];
  blockers?: string[];
};

type AccountReportDetailResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: ReportRecord;
  blockers?: string[];
};

type AccountReportAccessTokenResult =
  | { ok: true; accessToken: string }
  | {
      ok: false;
      status: Exclude<AccountReportReadStatus, "account-read-ready">;
      message: string;
      blockers: string[];
    };

function getPublicEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function isPublicFlagEnabled(name: string) {
  return getPublicEnv(name)?.toLowerCase() === "true";
}

export function getAccountReportReadClientConfig(): AccountReportReadClientConfig {
  const loginConfig = getSupabaseBrowserLoginConfig();
  const enabled = isPublicFlagEnabled("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE");
  const missingConfig = [...loginConfig.missingConfig];

  if (!enabled) {
    missingConfig.push("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true");
  }

  return {
    enabled,
    canAttemptAccountReportRead: enabled && loginConfig.canUseRealSupabaseLogin,
    missingConfig: [...new Set(missingConfig)],
  };
}

async function readAccountAccessToken(): Promise<AccountReportAccessTokenResult> {
  const config = getAccountReportReadClientConfig();

  if (!config.canAttemptAccountReportRead) {
    return {
      ok: false,
      status: "account-read-disabled",
      message: "Account report reading is disabled; use local-preview reports.",
      blockers: config.missingConfig,
    };
  }

  const client = getSupabaseBrowserAuthClient();

  if (!client) {
    return {
      ok: false,
      status: "account-read-disabled",
      message: "Supabase login client is not configured; use local-preview reports.",
      blockers: ["Supabase browser client is not available."],
    };
  }

  const { data, error } = await client.auth.getSession();
  const accessToken = data.session?.access_token;

  if (error || !accessToken) {
    return {
      ok: false,
      status: "not-authenticated",
      message: error?.message ?? "Sign in before reading account reports.",
      blockers: ["A signed-in Supabase session is required."],
    };
  }

  return {
    ok: true,
    accessToken,
  };
}

function createAuthHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function listAccountReportSummaries(): Promise<AccountReportListResult> {
  const tokenResult = await readAccountAccessToken();

  if (!tokenResult.ok) {
    return {
      status: tokenResult.status,
      summaries: [],
      message: tokenResult.message,
      blockers: tokenResult.blockers,
    };
  }

  try {
    const response = await fetch("/api/reports/account", {
      headers: createAuthHeaders(tokenResult.accessToken),
    });
    const payload = (await response.json().catch(() => null)) as
      | AccountReportListResponse
      | null;

    if (!response.ok || !payload?.ok || !Array.isArray(payload.summaries)) {
      return {
        status: "account-read-failed",
        summaries: [],
        message:
          payload?.error ?? "Account report summaries could not be loaded.",
        blockers: payload?.blockers ?? [],
      };
    }

    return {
      status: "account-read-ready",
      summaries: payload.summaries,
      message: "Account report summaries loaded.",
      blockers: [],
    };
  } catch (error) {
    return {
      status: "account-read-failed",
      summaries: [],
      message:
        error instanceof Error
          ? error.message
          : "Account report summaries could not be loaded.",
      blockers: [],
    };
  }
}

export async function getAccountReportRecord(
  reportId: string,
): Promise<AccountReportDetailResult> {
  const normalizedReportId = reportId.trim();

  if (!normalizedReportId) {
    return {
      status: "account-read-failed",
      reportRecord: null,
      message: "A report id is required before reading an account report.",
      blockers: ["Missing report id."],
    };
  }

  const tokenResult = await readAccountAccessToken();

  if (!tokenResult.ok) {
    return {
      status: tokenResult.status,
      reportRecord: null,
      message: tokenResult.message,
      blockers: tokenResult.blockers,
    };
  }

  try {
    const response = await fetch(
      `/api/reports/account?reportId=${encodeURIComponent(normalizedReportId)}`,
      {
        headers: createAuthHeaders(tokenResult.accessToken),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | AccountReportDetailResponse
      | null;

    if (!response.ok || !payload?.ok || !payload.reportRecord) {
      return {
        status: "account-read-failed",
        reportRecord: null,
        message: payload?.error ?? "Account report could not be loaded.",
        blockers: payload?.blockers ?? [],
      };
    }

    return {
      status: "account-read-ready",
      reportRecord: payload.reportRecord,
      message: "Account report loaded.",
      blockers: [],
    };
  } catch (error) {
    return {
      status: "account-read-failed",
      reportRecord: null,
      message:
        error instanceof Error
          ? error.message
          : "Account report could not be loaded.",
      blockers: [],
    };
  }
}
