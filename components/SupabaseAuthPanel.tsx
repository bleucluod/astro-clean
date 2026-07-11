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

type SupabaseAuthPanelProps = Readonly<{
  compact?: boolean;
}>;

function formatUserLabel(session: AuthSession | null) {
  return session?.user.displayName || session?.user.email || "حساب هالیوس";
}

function describeAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "نام کاربری یا رمز درست نیست. دوباره با همان نام کاربری امتحان کن.";
  }

  if (/already registered|already exists|user already/i.test(message)) {
    return "این نام کاربری قبلاً گرفته شده. یک نام دیگر امتحان کن.";
  }

  if (/password/i.test(message)) {
    return "رمز عبور باید معتبر باشد؛ حداقل ۶ کاراکتر وارد کن.";
  }

  return message;
}

export function SupabaseAuthPanel({
  compact = false,
}: SupabaseAuthPanelProps) {
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

  const accountExperienceReady =
    config.canUseRealSupabaseLogin &&
    accountSaveConfig.canAttemptAccountReportSave &&
    accountReadConfig.canAttemptAccountReportRead;
  const isSignUp = mode === "sign-up";

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
      setMessage("ورود حساب در این محیط هنوز آماده نیست.");
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
        setMessage(describeAuthError(result.error.message));
        return;
      }

      setSession(mapSupabaseSessionToHalleusSession(result.data.session ?? null));
      setMessage(
        isSignUp
          ? result.data.session
            ? "حساب ساخته شد و وارد شدی. حالا می‌توانی گزارش تازه بسازی."
            : "ثبت‌نام ثبت شد. اگر لازم بود، چند لحظه بعد دوباره ورود را امتحان کن."
          : "وارد شدی. حالا می‌توانی گزارش تازه بسازی و راحت‌تر به آن برگردی.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSignOut() {
    const client = getSupabaseBrowserAuthClient();

    if (!client) {
      setMessage("ورود حساب در این محیط هنوز آماده نیست.");
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

  if (compact) {
    if (config.canUseRealSupabaseLogin && !isReady) {
      return (
        <section
          className="chart-account-compact is-loading"
          aria-label="حساب هالیوس"
        >
          <span className="chart-account-greeting">
            در حال بررسی حساب...
          </span>
        </section>
      );
    }

    if (config.canUseRealSupabaseLogin && session) {
      return (
        <section
          className="chart-account-compact is-signed-in"
          aria-label="حساب هالیوس"
        >
          <span className="chart-account-greeting">
            سلام، {formatUserLabel(session)}
          </span>
        </section>
      );
    }

    return (
      <section
        className="chart-account-compact"
        aria-labelledby="chart-account-save-note"
      >
        <p id="chart-account-save-note" className="chart-account-save-note">
          با ثبت‌نام، گزارش‌هایت برای همیشه در حسابت ذخیره می‌شوند.
        </p>

        <details className="chart-account-disclosure">
          <summary>ورود یا ثبت‌نام</summary>

          <div className="chart-account-disclosure-body">
            {!config.canUseRealSupabaseLogin ? (
              <p className="file-hint">
                ورود حساب در این محیط هنوز آماده نیست.
              </p>
            ) : null}

            {config.canUseRealSupabaseLogin && isReady && !session ? (
              <form
                className="form-grid chart-account-form"
                onSubmit={handleSubmit}
              >
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
                      title="شماره موبایل را با +98 وارد کن."
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
                      onChange={(event) =>
                        setSecondaryEmail(event.target.value)
                      }
                      placeholder="برای ارتباط یا رسید، اختیاری"
                      type="email"
                      value={secondaryEmail}
                    />
                  </label>
                ) : null}

                <label className="field">
                  <span>رمز عبور</span>
                  <input
                    autoComplete={
                      mode === "sign-up"
                        ? "new-password"
                        : "current-password"
                    }
                    dir="ltr"
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="حداقل ۶ کاراکتر"
                    type="password"
                    value={password}
                  />
                </label>

                <p className="file-hint">
                  {isSignUp
                    ? "برای ساخت حساب، نام کاربری یکتا، شماره موبایل و رمز لازم است. ایمیل اختیاری است."
                    : "برای ورود فقط نام کاربری و رمز لازم است."}
                </p>

                <div className="actions">
                  <button className="button" disabled={isBusy} type="submit">
                    {isSignUp ? "ساخت حساب و ورود" : "ورود به حساب"}
                  </button>

                  <button
                    className="button secondary"
                    disabled={isBusy}
                    onClick={() =>
                      setMode(mode === "sign-in" ? "sign-up" : "sign-in")
                    }
                    type="button"
                  >
                    {mode === "sign-in"
                      ? "حساب ندارم؛ ثبت‌نام"
                      : "قبلاً حساب دارم؛ ورود"}
                  </button>
                </div>
              </form>
            ) : null}

            {message ? (
              <p className="success-message">{message}</p>
            ) : null}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="card">
      <span className="badge">حساب هالیوس</span>

      <h2>برگشت امن‌تر به گزارش‌های بعدی</h2>

      <p>
        با حساب هالیوس می‌توانی گزارش‌های بعدی‌ات را امن‌تر نگه داری و راحت‌تر
        به آن‌ها برگردی.
      </p>

      <p className="file-hint">
        برای ثبت‌نام، نام کاربری، شماره موبایل و رمز عبور لازم است. موبایل برای
        اطلاعات حساب است و نام کاربری تو نیست.
      </p>

      <div className="actions">
        <Link className="button secondary" href="/chart">
          ساخت گزارش جدید
        </Link>

        <Link className="button secondary" href="/reports">
          دیدن گزارش‌ها
        </Link>
      </div>

      {!config.canUseRealSupabaseLogin ? (
        <p className="file-hint">
          ورود حساب در این محیط هنوز آماده نیست؛ با این حال می‌توانی گزارش پایه
          را بسازی و روی همین دستگاه نگه داری.
        </p>
      ) : null}

      {config.canUseRealSupabaseLogin && isReady && session ? (
        <>
          <div className="profile-grid">
            <div>
              <strong>وضعیت</strong>
              <span>وارد شده‌ای</span>
            </div>

            <div>
              <strong>نام حساب</strong>
              <span>{formatUserLabel(session)}</span>
            </div>

            <div>
              <strong>نگهداری گزارش‌ها</strong>
              <span>
                {accountSaveConfig.canAttemptAccountReportSave
                  ? "برای گزارش‌های بعدی آماده است"
                  : "روی همین دستگاه انجام می‌شود"}
              </span>
            </div>

            <div>
              <strong>خواندن گزارش‌ها</strong>
              <span>
                {accountReadConfig.canAttemptAccountReportRead
                  ? "از بخش گزارش‌ها در دسترس است"
                  : "از همین دستگاه در دسترس است"}
              </span>
            </div>
          </div>

          <div className="home-step-list" aria-label="گام‌های بعد از ورود">
            <div>
              <strong>قدم بعدی</strong>
              <span>یک گزارش تازه بساز و بعد از بخش گزارش‌ها دوباره به آن برگرد.</span>
            </div>

            <div>
              <strong>حریم</strong>
              <span>گزارش‌ها برای خودت نگه داشته می‌شوند.</span>
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
                title="شماره موبایل را با +98 وارد کن."
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
            {isSignUp
              ? "برای ساخت حساب، نام کاربری یکتا، شماره موبایل و رمز لازم است. ایمیل اختیاری است."
              : "برای ورود فقط نام کاربری و رمز لازم است."}
          </p>

          <div className="actions">
            <button
              className="button"
              disabled={isBusy}
              type="submit"
            >
              {isSignUp ? "ساخت حساب و ورود" : "ورود به حساب"}
            </button>

            <button
              className="button secondary"
              disabled={isBusy}
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              type="button"
            >
              {mode === "sign-in" ? "حساب ندارم؛ ثبت‌نام" : "قبلاً حساب دارم؛ ورود"}
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

      {accountExperienceReady ? (
        <span aria-hidden="true" hidden>
          account-ready-copy-detox-marker
        </span>
      ) : null}

      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}
