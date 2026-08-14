"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_REPORT_ACCESS_POLICY } from "@/lib/monetization/access-policy";
import { DEFAULT_PRODUCT_PACKAGES } from "@/lib/monetization/product-catalog";
import type { AccountProductAccess } from "@/lib/monetization/product-access-contract";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";

const EMPTY_ACCESS: AccountProductAccess = {
  authenticated: false,
  balances: { fullReport: 0, relationship: 0 },
  reportUnlocked: false,
  policy: DEFAULT_REPORT_ACCESS_POLICY,
  activePackages: DEFAULT_PRODUCT_PACKAGES
    .filter((item) => item.active)
    .map((item) => ({ ...item })),
};

export type ProductAccessState = {
  status: "loading" | "ready" | "unauthenticated" | "unavailable";
  access: AccountProductAccess;
  refresh: () => Promise<void>;
  unlockReport: (reportId: string) => Promise<{ ok: boolean; error?: string }>;
  consumeRelationship: (
    resultKey: string,
  ) => Promise<{ ok: boolean; error?: string }>;
};

export function useProductAccess(
  reportId: string | null = null,
): ProductAccessState {
  const [state, setState] = useState<{
    status: ProductAccessState["status"];
    access: AccountProductAccess;
  }>({
    status: "loading",
    access: EMPTY_ACCESS,
  });

  const load = useCallback(async () => {
    const authClient = getSupabaseBrowserAuthClient();
    let token: string | undefined;
    if (authClient) {
      const sessionResult = await authClient.auth.getSession();
      token = sessionResult.data.session?.access_token;
    }

    try {
      const params = new URLSearchParams();
      if (reportId) params.set("reportId", reportId);
      const response = await fetch(
        `/api/account/entitlements${params.size ? `?${params.toString()}` : ""}`,
        {
          cache: "no-store",
          headers: token
            ? { authorization: `Bearer ${token}` }
            : undefined,
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        access?: AccountProductAccess;
      };
      if (!response.ok || !payload.ok || !payload.access) {
        setState({ status: "unavailable", access: EMPTY_ACCESS });
        return;
      }
      setState({
        status: token ? "ready" : "unauthenticated",
        access: payload.access,
      });
    } catch {
      setState({ status: "unavailable", access: EMPTY_ACCESS });
    }
  }, [reportId]);

  useEffect(() => {
    let active = true;
    const authClient = getSupabaseBrowserAuthClient();
    const run = () => {
      if (active) void load();
    };
    const timer = window.setTimeout(run, 0);
    const subscription = authClient?.auth.onAuthStateChange(() => {
      window.setTimeout(run, 0);
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription?.data.subscription.unsubscribe();
    };
  }, [load]);

  const post = useCallback(
    async (
      body: Record<string, unknown>,
    ): Promise<{ ok: boolean; error?: string }> => {
      const authClient = getSupabaseBrowserAuthClient();
      const session = authClient
        ? await authClient.auth.getSession()
        : null;
      const token = session?.data.session?.access_token;
      if (!token) {
        return {
          ok: false,
          error: "برای استفاده از اعتبار، وارد حساب هالیوس شو.",
        };
      }
      try {
        const response = await fetch("/api/account/entitlements", {
          method: "POST",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
        };
        if (!response.ok || !payload.ok) {
          return {
            ok: false,
            error: payload.error ?? "عملیات اعتبار انجام نشد.",
          };
        }
        await load();
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "ارتباط با سرویس اعتبار انجام نشد.",
        };
      }
    },
    [load],
  );

  return {
    ...state,
    refresh: load,
    unlockReport: (nextReportId) =>
      post({
        action: "unlock_report",
        reportId: nextReportId,
        idempotencyKey: `report:${nextReportId}`,
      }),
    consumeRelationship: (resultKey) =>
      post({
        action: "consume_relationship",
        resultKey,
        idempotencyKey: `relationship:${resultKey}`,
      }),
  };
}

export const useProductEntitlements = useProductAccess;
