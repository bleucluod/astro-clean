"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";

type RewardStatus = {
  state: "eligible" | "awaiting_telegram" | "linked" | "redeemed";
  rewardUsed: boolean;
  premiumActive: boolean;
  premiumEndsAt: string | null;
  channelUrl: string;
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  status?: RewardStatus;
  result?: {
    ok?: boolean;
    deepLink?: string;
    expiresAt?: string;
    premiumEndsAt?: string;
    status?: RewardStatus;
  };
};

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TelegramJoinRewardCard() {
  const [status, setStatus] = useState<RewardStatus | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const client = getSupabaseBrowserAuthClient();
      const session = client ? (await client.auth.getSession()).data.session : null;
      if (!active) return;
      setAuthReady(true);
      if (!session?.access_token) return;
      const response = await fetch("/api/account/telegram-reward", {
        cache: "no-store",
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const payload = (await response.json()) as ApiPayload;
      if (!active) return;
      if (response.ok && payload.status) setStatus(payload.status);
      else setError(payload.error || "وضعیت جایزه تلگرام دریافت نشد.");
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function token() {
    const client = getSupabaseBrowserAuthClient();
    const session = client ? (await client.auth.getSession()).data.session : null;
    return session?.access_token ?? null;
  }

  async function action(actionName: "start" | "redeem") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const accessToken = await token();
      if (!accessToken) {
        setError("اول وارد حساب هالیوس شو.");
        return;
      }
      const response = await fetch("/api/account/telegram-reward", {
        method: "POST",
        cache: "no-store",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: actionName }),
      });
      const payload = (await response.json()) as ApiPayload;
      const nextStatus = payload.result?.status ?? payload.status;
      if (nextStatus) setStatus(nextStatus);
      if (!response.ok || payload.ok !== true) {
        setError(payload.error || "عملیات جایزه تلگرام انجام نشد.");
        return;
      }
      if (actionName === "start" && payload.result?.deepLink) {
        setBotLink(payload.result.deepLink);
        setMessage("لینک اتصال آماده شد. بات را باز کن، Start را بزن، عضو کانال شو و بعد برگرد همین‌جا.");
      } else if (actionName === "redeem") {
        setMessage("یک روز Premium هالیوس فعال شد ✨");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) {
    return (
      <section className="card">
        <span className="badge">هدیه تلگرام</span>
        <p>در حال بررسی وضعیت جایزه…</p>
      </section>
    );
  }

  if (status?.rewardUsed) {
    return (
      <section className="card">
        <span className="badge">هدیه تلگرام</span>
        <h2>{status.premiumActive ? "Premium هدیه‌ات فعاله ✨" : "هدیه عضویت قبلاً استفاده شده"}</h2>
        <p>
          {status.premiumActive && status.premiumEndsAt
            ? `تا ${formatDateTime(status.premiumEndsAt)} Premium هستی.`
            : "این جایزه برای هر حساب هالیوس و هر حساب تلگرام فقط یک بار قابل دریافت است."}
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <span className="badge">هدیه تلگرام</span>
      <h2>عضو کانال هالیوس شو و ۱ روز Premium هدیه بگیر</h2>
      <p>
        جایزه فقط یک بار برای هر حساب هالیوس و هر حساب تلگرام فعال می‌شود.
        برای تأیید، تلگرامت را با بات وصل کن و عضو کانال باش.
      </p>

      {!status ? <p>برای دریافت هدیه، اول از بخش ورود همین صفحه وارد حسابت شو.</p> : null}

      {status ? (
        <div className="actions">
          <button className="button" type="button" disabled={busy} onClick={() => void action("start")}>
            ۱. ساخت لینک اتصال تلگرام
          </button>
          {botLink ? (
            <a className="button secondary" href={botLink} target="_blank" rel="noreferrer">
              ۲. باز کردن بات و زدن Start
            </a>
          ) : null}
          <a className="button secondary" href={status.channelUrl} target="_blank" rel="noreferrer">
            ۳. عضویت در کانال هالیوس
          </a>
          <button className="button" type="button" disabled={busy} onClick={() => void action("redeem")}>
            ۴. بررسی عضویت و فعال‌سازی هدیه
          </button>
        </div>
      ) : null}

      {message ? <p>{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}