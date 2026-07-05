"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserAuthClient, getSupabaseBrowserLoginConfig } from "@/lib/auth/supabase-browser-client";
import { getAccountReportSaveClientConfig } from "@/lib/storage/account-report-save-client";
import { getAccountReportReadClientConfig } from "@/lib/storage/account-report-read-client";
import { mapSupabaseSessionToHalleusSession } from "@/lib/auth/supabase-session-mapper";
import {
  createSupabaseUsernameBridgeEmail,
  validateAccountIdentityInput,
} from "@/lib/auth/account-identity-normalization";
import type { AuthSession } from "@/types/account";

type AuthMode = "sign-in" | "sign-up";

function formatUserLabel(session: AuthSession | null) {
  return session?.user.displayName || session?.user.email || session?.user.id || "کاربر واردشده";
}


export function SupabaseAuthPanel() {
  const config = useMemo(() => getSupabaseBrowserLoginConfig(), []);
  const accountSaveConfig = useMemo(() => getAccountReportSaveClientConfig(), []);
  const accountReadConfig = useMemo(() => getAccountReportReadClientConfig(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const realAccountFlowPublicReady =
    config.canUseRealSupabaseLogin &&
    accountSaveConfig.canAttemptAccountReportSave &&
    accountReadConfig.canAttemptAccountReportRead;
  const realAccountFlowPublicBlockers = [
    ...config.missingConfig,
    ...accountSaveConfig.missingConfig,
    ...accountReadConfig.missingConfig,
  ];

  useEffect(() => {
    const client = getSupabaseBrowserAuthClient();

    if (!client) {
      setIsReady(true);
      return;
    }

    const authClient = client;

    let mounted = true;

    async function loadSession() {
      const { data, error } = await authClient.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
      }

      setSession(mapSupabaseSessionToHalleusSession(data.session));
      setIsReady(true);
    }

    void loadSession();

    const { data } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(mapSupabaseSessionToHalleusSession(nextSession));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = getSupabaseBrowserAuthClient();

    if (!client) {
      setMessage("ورود Supabase هنوز config کامل ندارد.");
      return;
    }

    const identity = validateAccountIdentityInput({
      mode,
      username,
      phone,
      password,
    });
    const optionalEmail = secondaryEmail.trim();

    if (!identity.ok) {
      setMessage(identity.message);
      return;
    }

    const normalizedPhone = identity.normalizedPhone;
    const normalizedUsername = identity.normalizedUsername;
    const bridgeEmail = createSupabaseUsernameBridgeEmail(normalizedUsername);

    setIsBusy(true);
    setMessage("");

    try {
      const result =
        mode === "sign-up"
          ? await client.auth.signUp({
              email: bridgeEmail,
              password,
              options: {
                data: {
                  username: normalizedUsername,
                  phone: normalizedPhone,
                  mobile_phone: normalizedPhone,
                  secondary_email: optionalEmail || null,
                  auth_model: "username_password_bridge",
                  bridge_credential_kind: "private_username_email",
                  username_is_user_chosen: true,
                  phone_is_not_username: true,
                  email_is_secondary: true,
                },
              },
            })
          : await client.auth.signInWithPassword({
              email: bridgeEmail,
              password,
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setSession(mapSupabaseSessionToHalleusSession(result.data.session ?? null));
      setMessage(
        mode === "sign-up"
          ? result.data.session
            ? "ثبت‌نام و ورود انجام شد؛ حالا یک گزارش تست بساز و account save را بررسی کن."
            : "ثبت‌نام ثبت شد؛ اگر Email confirmation در Supabase روشن باشد، برای تست این پل username/password باید آن را در محیط تست خاموش کنی."
          : "ورود با نام کاربری و رمز انجام شد؛ حالا یک گزارش تست بساز و account save را بررسی کن.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSignOut() {
    const client = getSupabaseBrowserAuthClient();

    if (!client) {
      setMessage("ورود Supabase هنوز config کامل ندارد.");
      return;
    }

    setIsBusy(true);

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        setMessage(error.message);
        return;
      }

      setSession(null);
      setMessage("از حساب خارج شدی.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="card">
      <span className="badge">Username Password Account Bridge</span>

      <h2>ورود با نام کاربری و رمز</h2>

      <p>
        مدل حساب هالیوس از این نسخه با نام کاربری انتخابی و رمز وارد می‌شود. موبایل هنگام ثبت‌نام جمع‌آوری می‌شود، اما یوزرنیم نیست؛ ایمیل هم فقط secondary/optional می‌ماند.
      </p>

      <p className="file-hint">
        Supabase Auth پشت‌صحنه با یک credential خصوصی ساخته‌شده از username کار می‌کند؛ این credential ایمیل واقعی کاربر نیست و در UI نمایش داده نمی‌شود.
      </p>

      <div className="home-step-list" aria-label="Real Supabase Account Flow Test">
        <div>
          <strong>Real Supabase Account Flow Test</strong>
          <span>
            مسیر تست: signup با نام کاربری + موبایل + رمز → logout → login با نام کاربری + رمز → ساخت گزارش → account save → دیدن در /reports?source=account.
          </span>
        </div>

        <div>
          <strong>وضعیت public flags</strong>
          <span>
            {realAccountFlowPublicReady
              ? "login/save/read public flags آماده‌اند."
              : realAccountFlowPublicBlockers.join(" · ")}
          </span>
        </div>

        <div>
          <strong>server env خصوصی</strong>
          <span>
            DATABASE_URL، AUTH_SECRET و SUPABASE_SERVICE_ROLE_KEY باید فقط در .env.local/Render باشند و در UI مقدارشان نمایش داده نمی‌شود.
          </span>
        </div>

        <div>
          <strong>شناسه کاربر</strong>
          <span>username انتخابی کاربر است؛ login با username/password انجام می‌شود؛ موبایل جمع‌آوری می‌شود اما username نیست.</span>
        </div>
      </div>

      <div className="actions">
        <Link className="button secondary" href="/chart">
          تست ساخت گزارش
        </Link>

        <Link className="button secondary" href="/reports?source=account">
          تست account reports
        </Link>
      </div>

      {!config.canUseRealSupabaseLogin ? (
        <div className="home-step-list">
          <div>
            <strong>برای فعال‌سازی در محیط تست</strong>
            <span>{config.missingConfig.join(" · ")}</span>
          </div>

          <div>
            <strong>Flag</strong>
            <span>NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=true</span>
          </div>

          <div>
            <strong>Account save flag</strong>
            <span>NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true</span>
          </div>

          <div>
            <strong>مدل شناسه</strong>
            <span>نام کاربری انتخابی برای login است؛ موبایل یوزرنیم نیست و ایمیل اختیاری/ثانویه می‌ماند.</span>
          </div>
        </div>
      ) : null}

      {config.canUseRealSupabaseLogin && isReady && session ? (
        <>
          <div className="profile-grid">
            <div>
              <strong>وضعیت</strong>
              <span>وارد شده</span>
            </div>

            <div>
              <strong>نام کاربری</strong>
              <span>{formatUserLabel(session)}</span>
            </div>

            <div>
              <strong>User ID</strong>
              <span>{session.user.id}</span>
            </div>

            <div>
              <strong>Report save</strong>
              <span>
                {accountSaveConfig.canAttemptAccountReportSave
                  ? "account-save guarded + local-preview fallback"
                  : "local-preview"}
              </span>
            </div>
          </div>

          <div className="home-step-list" aria-label="Logged-in account next steps">
            <div>
              <strong>Logged-in account next steps</strong>
              <span>ساخت گزارش بعدی در /chart و دیدن account reports در /reports?source=account.</span>
            </div>

            <div>
              <strong>حریم</strong>
              <span>گزارش‌های account همچنان private/noindex هستند و local reports حذف نمی‌شوند.</span>
            </div>
          </div>
        </>
      ) : null}

      {config.canUseRealSupabaseLogin && isReady && !session ? (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>نام کاربری</span>
            <input
              autoComplete="username"
              dir="ltr"
              minLength={3}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="halleus-name"
              type="text"
              value={username}
            />
          </label>

          {mode === "sign-up" ? (
            <label className="field">
              <span>شماره موبایل</span>
              <input
                autoComplete="tel"
                dir="ltr"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+989121234567"
                title="شماره موبایل را با فرمت E.164 مثل +989121234567 وارد کن."
                type="tel"
                value={phone}
              />
            </label>
          ) : null}

          {mode === "sign-up" ? (
            <label className="field">
              <span>ایمیل اختیاری</span>
              <input
                autoComplete="email"
                dir="ltr"
                inputMode="email"
                onChange={(event) => setSecondaryEmail(event.target.value)}
                placeholder="برای ارتباط یا رسید، اختیاری"
                type="email"
                value={secondaryEmail}
              />
            </label>
          ) : null}

          <label className="field">
            <span>رمز عبور</span>
            <input
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              dir="ltr"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="حداقل ۶ کاراکتر"
              type="password"
              value={password}
            />
          </label>

          <p className="file-hint">
            در ورود فقط نام کاربری و رمز لازم است. موبایل هنگام ثبت‌نام با فرمت E.164 مثل +989121234567 گرفته می‌شود، اما username نیست.
          </p>

          <div className="actions">
            <button
              className="button"
              disabled={isBusy}
              type="submit"
            >
              {mode === "sign-up" ? "ثبت‌نام" : "ورود"}
            </button>

            <button
              className="button secondary"
              disabled={isBusy}
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              type="button"
            >
              {mode === "sign-in" ? "ساخت حساب جدید" : "قبلاً حساب دارم"}
            </button>
          </div>
        </form>
      ) : null}

      {config.canUseRealSupabaseLogin && isReady && session ? (
        <div className="actions">
          <button
            className="button secondary"
            disabled={isBusy}
            onClick={handleSignOut}
            type="button"
          >
            خروج از حساب
          </button>
        </div>
      ) : null}

      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}