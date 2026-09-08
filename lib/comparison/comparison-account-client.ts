"use client";

import {
  getSupabaseBrowserAuthClient,
  getSupabaseBrowserLoginConfig,
} from "@/lib/auth/supabase-browser-client";
import {
  deleteAccountReport,
  getAccountReportRecord,
  mutateAccountReport,
} from "@/lib/storage/account-report-read-client";
import { getAccountReportSaveClientConfig } from "@/lib/storage/account-report-save-client";
import type { ComparisonRecord } from "@/types/comparison-product";
import type { StoredComparisonReport } from "@/types/storage";

export type ComparisonAccountStatus =
  | "saved"
  | "not-authenticated"
  | "disabled"
  | "failed"
  | "in-progress";

export type ComparisonAccountSaveResult = {
  status: ComparisonAccountStatus;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStoredComparison(value: unknown): StoredComparisonReport | null {
  if (!isRecord(value)) return null;
  if (value.version !== "stored-comparison-v1") return null;
  if (value.reportType !== "comparison") return null;
  if (!isRecord(value.comparison)) return null;
  return value as StoredComparisonReport;
}

async function readAccessToken() {
  const login = getSupabaseBrowserLoginConfig();
  const save = getAccountReportSaveClientConfig();
  if (!login.canUseRealSupabaseLogin || !save.canAttemptAccountReportSave) {
    return { status: "disabled" as const, accessToken: null };
  }
  const client = getSupabaseBrowserAuthClient();
  if (!client) return { status: "disabled" as const, accessToken: null };
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) {
    return { status: "not-authenticated" as const, accessToken: null };
  }
  return { status: "ready" as const, accessToken: data.session.access_token };
}

export async function saveComparisonToAccount(
  comparison: ComparisonRecord,
  options: { navigationGraceMs?: number } = {},
): Promise<ComparisonAccountSaveResult> {
  const auth = await readAccessToken();
  if (auth.status === "disabled") {
    return { status: "disabled", message: "ذخیره در حساب در این محیط فعال نیست." };
  }
  if (auth.status === "not-authenticated" || !auth.accessToken) {
    return { status: "not-authenticated", message: "برای ذخیره در حساب وارد شو." };
  }

  const remote = (async (): Promise<ComparisonAccountSaveResult> => {
    try {
      const response = await fetch("/api/reports/account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comparison }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !payload?.ok) {
        return {
          status: "failed",
          message: payload?.error ?? "ذخیره در حساب کامل نشد.",
        };
      }
      return {
        status: "saved",
        message: "این مقایسه در حساب خصوصی تو ذخیره شد.",
      };
    } catch {
      return {
        status: "failed",
        message: "ذخیره در حساب موقتاً در دسترس نیست.",
      };
    }
  })();

  const grace = Math.max(0, options.navigationGraceMs ?? 1200);
  if (grace === 0) return remote;

  const race = await Promise.race([
    remote,
    new Promise<ComparisonAccountSaveResult>((resolve) => {
      window.setTimeout(
        () =>
          resolve({
            status: "in-progress",
            message: "ذخیره آنلاین در پس‌زمینه ادامه دارد.",
          }),
        grace,
      );
    }),
  ]);
  if (race.status === "in-progress") void remote.catch(() => undefined);
  return race;
}

export async function getAccountComparisonRecord(reportId: string): Promise<{
  status: ComparisonAccountStatus;
  comparison: ComparisonRecord | null;
  favorite: boolean;
  note: string;
}> {
  const detail = await getAccountReportRecord(reportId);
  if (detail.status === "not-authenticated") {
    return {
      status: "not-authenticated",
      comparison: null,
      favorite: false,
      note: "",
    };
  }
  if (detail.status === "account-read-disabled") {
    return { status: "disabled", comparison: null, favorite: false, note: "" };
  }
  if (detail.status !== "account-read-ready" || !detail.reportRecord) {
    return { status: "failed", comparison: null, favorite: false, note: "" };
  }

  const record = detail.reportRecord as unknown as {
    report?: unknown;
    favorite?: boolean;
    note?: string;
  };
  const stored = readStoredComparison(record.report);
  if (!stored) {
    return { status: "failed", comparison: null, favorite: false, note: "" };
  }

  return {
    status: "saved",
    comparison: stored.comparison,
    favorite: Boolean(record.favorite),
    note: typeof record.note === "string" ? record.note : "",
  };
}

export async function setComparisonFavorite(
  reportId: string,
  favorite: boolean,
) {
  await mutateAccountReport({ reportId, action: "favorite", favorite });
}

export async function setComparisonNote(reportId: string, note: string) {
  await mutateAccountReport({ reportId, action: "note", note });
}

export async function deleteComparisonFromAccount(reportId: string) {
  await deleteAccountReport(reportId);
}
