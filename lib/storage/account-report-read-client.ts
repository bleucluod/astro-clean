"use client";

import {
  getSupabaseBrowserAccessState,
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

export type CurrentReportOwnerKind = "account" | "guest";

export type AccountReportListResult = {
  status: AccountReportReadStatus;
  summaries: ReportRecordSummary[];
  message: string;
  blockers: string[];
  page: number;
  total: number;
  ownerKind: CurrentReportOwnerKind;
};

export type AccountReportDetailResult = {
  status: AccountReportReadStatus;
  reportRecord: ReportRecord | null;
  message: string;
  blockers: string[];
  ownerKind: CurrentReportOwnerKind;
};

type OwnerListResponse = {
  ok?: boolean;
  error?: string;
  summaries?: ReportRecordSummary[];
  blockers?: string[];
  page?: number;
  total?: number;
  ownerKind?: CurrentReportOwnerKind;
};

type OwnerDetailResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: ReportRecord;
  blockers?: string[];
  ownerKind?: CurrentReportOwnerKind;
};

export function getAccountReportReadClientConfig(): AccountReportReadClientConfig {
  const login = getSupabaseBrowserLoginConfig();
  return {
    enabled: true,
    canAttemptAccountReportRead: true,
    missingConfig: login.missingConfig,
  };
}

async function readOptionalAccessToken() {
  const auth = await getSupabaseBrowserAccessState();
  if (auth.kind === "unavailable") {
    throw new Error(auth.error);
  }
  return auth.kind === "account" ? auth.accessToken : undefined;
}

function ownerHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export async function listAccountReportSummaries(
  page = 1,
): Promise<AccountReportListResult> {
  try {
    const accessToken = await readOptionalAccessToken();
    const response = await fetch(`/api/reports/owner?page=${page}`, {
      headers: ownerHeaders(accessToken),
    });
    const payload = (await response.json().catch(() => null)) as
      | OwnerListResponse
      | null;

    if (!response.ok || !payload?.ok || !Array.isArray(payload.summaries)) {
      return {
        status: "account-read-failed",
        summaries: [],
        message: payload?.error ?? "گزارش‌های هالیوس بارگذاری نشدند.",
        blockers: payload?.blockers ?? [],
        page,
        total: 0,
        ownerKind: payload?.ownerKind ?? "guest",
      };
    }

    return {
      status: "account-read-ready",
      summaries: payload.summaries,
      message: "گزارش‌های هالیوس بارگذاری شدند.",
      blockers: [],
      page: payload.page ?? page,
      total: payload.total ?? payload.summaries.length,
      ownerKind: payload.ownerKind ?? (accessToken ? "account" : "guest"),
    };
  } catch (error) {
    return {
      status: "account-read-failed",
      summaries: [],
      message:
        error instanceof Error ? error.message : "گزارش‌های هالیوس بارگذاری نشدند.",
      blockers: [],
      page,
      total: 0,
      ownerKind: "guest",
    };
  }
}

export async function getPublicReportRecord(
  reportId: string,
): Promise<AccountReportDetailResult> {
  const normalizedReportId = reportId.trim();
  if (!normalizedReportId) {
    return {
      status: "account-read-failed",
      reportRecord: null,
      message: "شناسه گزارش لازم است.",
      blockers: ["Missing report id."],
      ownerKind: "guest",
    };
  }

  try {
    const response = await fetch(
      `/api/reports/account?reportId=${encodeURIComponent(normalizedReportId)}`,
    );
    const payload = (await response.json().catch(() => null)) as
      | OwnerDetailResponse
      | null;
    if (!response.ok || !payload?.ok || !payload.reportRecord) {
      return {
        status: "account-read-failed",
        reportRecord: null,
        message: payload?.error ?? "گزارش عمومی پیدا نشد.",
        blockers: payload?.blockers ?? [],
        ownerKind: "guest",
      };
    }
    return {
      status: "account-read-ready",
      reportRecord: payload.reportRecord,
      message: "گزارش عمومی بارگذاری شد.",
      blockers: [],
      ownerKind: "guest",
    };
  } catch (error) {
    return {
      status: "account-read-failed",
      reportRecord: null,
      message: error instanceof Error ? error.message : "گزارش عمومی پیدا نشد.",
      blockers: [],
      ownerKind: "guest",
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
      message: "شناسه گزارش لازم است.",
      blockers: ["Missing report id."],
      ownerKind: "guest",
    };
  }

  try {
    const accessToken = await readOptionalAccessToken();
    const response = await fetch(
      `/api/reports/owner?reportId=${encodeURIComponent(normalizedReportId)}`,
      { headers: ownerHeaders(accessToken) },
    );
    const payload = (await response.json().catch(() => null)) as
      | OwnerDetailResponse
      | null;
    if (!response.ok || !payload?.ok || !payload.reportRecord) {
      return {
        status: "account-read-failed",
        reportRecord: null,
        message: payload?.error ?? "گزارش پیدا نشد.",
        blockers: payload?.blockers ?? [],
        ownerKind: payload?.ownerKind ?? (accessToken ? "account" : "guest"),
      };
    }
    return {
      status: "account-read-ready",
      reportRecord: payload.reportRecord,
      message: "گزارش بارگذاری شد.",
      blockers: [],
      ownerKind: payload.ownerKind ?? (accessToken ? "account" : "guest"),
    };
  } catch (error) {
    return {
      status: "account-read-failed",
      reportRecord: null,
      message: error instanceof Error ? error.message : "گزارش پیدا نشد.",
      blockers: [],
      ownerKind: "guest",
    };
  }
}

export async function mutateAccountReport(input: {
  reportId: string;
  action:
    | "title"
    | "favorite"
    | "note"
    | "enable_sharing"
    | "revoke_sharing";
  title?: string;
  favorite?: boolean;
  note?: string;
}) {
  const accessToken = await readOptionalAccessToken();
  const response = await fetch("/api/reports/owner", {
    method: "PATCH",
    headers: {
      ...ownerHeaders(accessToken),
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; sharePath?: string }
    | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? "مدیریت گزارش انجام نشد.");
  }
  return payload;
}

export async function deleteAccountReport(reportId: string) {
  const accessToken = await readOptionalAccessToken();
  const response = await fetch(
    `/api/reports/owner?reportId=${encodeURIComponent(reportId)}`,
    {
      method: "DELETE",
      headers: ownerHeaders(accessToken),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? "حذف گزارش انجام نشد.");
  }
}