"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserAuthClient, getSupabaseBrowserLoginConfig } from "@/lib/auth/supabase-browser-client";
import { getAccountReportSaveClientConfig } from "@/lib/storage/account-report-save-client";
import { mapSupabaseSessionToHalleusSession } from "@/lib/auth/supabase-session-mapper";
import type { AuthSession } from "@/types/account";

type AuthMode = "sign-in" | "sign-up";

function formatUserLabel(session: AuthSession | null) {
  return session?.user.displayName || session?.user.email || session?.user.id || "کاربر واردشده";
}

function cleanUsername(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function cleanPhone(value: string) {
  return value.trim().replace(/[\s-]/g, "");
}

export function SupabaseAuthPanel() {
  const config = useMemo(() => getSupabaseBrowserLoginConfig(), []);
  const accountSaveConfig = useMemo(() => getAccountReportSaveClientConfig(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isReady, setIsReady] = useState(false);

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

    const normalizedPhone = cleanPhone(phone);
    const normalizedUsername = cleanUsername(username);
    const optionalEmail = secondaryEmail.trim();

    if (!normalizedPhone || password.length < 6) {
      setMessage("شماره موبایل و رمز حداقل ۶ کاراکتری وارد کن.");
      return;
    }

    if (mode === "sign-up" && normalizedUsername.length < 3) {
      setMessage("نام کاربری انتخابی باید حداقل ۳ کاراکتر باشد.");
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const result =
        mode === "sign-up"
          ? await client.auth.signUp({
              phone: normalizedPhone,
              password,
              options: {
                data: {
                  username: normalizedUsername,
                  phone: normalizedPhone,
                  secondary_email: optionalEmail || null,
                  auth_model: "username_phone_password",
                },
              },
            })
          : await client.auth.signInWithPassword({
              phone: normalizedPhone,
              password,
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setSession(mapSupabaseSessionToHalleusSession(result.data.session ?? null));
      setMessage(
        mode === "sign-up"
          ? "ثبت‌نام انجام شد. اگر تأیید موبایل در Supabase فعال باشد، کد یا پیامک را بررسی کن."
          : "ورود انجام شد.",
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
      <span className="badge">Username + Mobile Auth</span>

      <h2>حساب با نام کاربری، موبایل و رمز</h2>

      <p>
        مدل حساب هالیوس از این نسخه email-as-username نیست. نام کاربری را خود کاربر انتخاب می‌کند؛ موبایل برای ارتباط و ورود guard شده جمع‌آوری می‌شود و یوزرنیم نیست.
      </p>

      <p className="file-hint">
        مسیر v0.1.184: account report save path guard شده است؛ گزارش‌ها private/noindex می‌مانند و migration واقعی هنوز خاموش است.
      </p>

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
            <span>نام کاربری انتخابی برای نمایش است؛ موبایل یوزرنیم نیست و ایمیل اختیاری/ثانویه می‌ماند.</span>
          </div>
        </div>
      ) : null}

      {config.canUseRealSupabaseLogin && isReady && session ? (
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
      ) : null}

      {config.canUseRealSupabaseLogin && isReady && !session ? (
        <form className="form-grid" onSubmit={handleSubmit}>
          {mode === "sign-up" ? (
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
          ) : null}

          <label className="field">
            <span>شماره موبایل</span>
            <input
              autoComplete="tel"
              dir="ltr"
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+989121234567"
              type="tel"
              value={phone}
            />
          </label>

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
            موبایل برای ورود/ارتباط استفاده می‌شود، اما نام کاربری همان شناسه انتخابی کاربر است؛ ایمیل یوزرنیم نیست.
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
