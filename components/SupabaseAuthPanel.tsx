"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserAuthClient, getSupabaseBrowserLoginConfig } from "@/lib/auth/supabase-browser-client";
import { mapSupabaseSessionToHalleusSession } from "@/lib/auth/supabase-session-mapper";
import type { AuthSession } from "@/types/account";

type AuthMode = "sign-in" | "sign-up";

function formatUserLabel(session: AuthSession | null) {
  return session?.user.email || session?.user.id || "کاربر واردشده";
}

export function SupabaseAuthPanel() {
  const config = useMemo(() => getSupabaseBrowserLoginConfig(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState("");
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

    if (!email.trim() || password.length < 6) {
      setMessage("ایمیل معتبر و رمز حداقل ۶ کاراکتری وارد کن.");
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const result =
        mode === "sign-up"
          ? await client.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/profile`,
              },
            })
          : await client.auth.signInWithPassword({
              email: email.trim(),
              password,
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setSession(mapSupabaseSessionToHalleusSession(result.data.session ?? null));
      setMessage(
        mode === "sign-up"
          ? "ثبت‌نام انجام شد. اگر تأیید ایمیل در Supabase فعال باشد، ایمیل را بررسی کن."
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
      <span className="badge">Supabase Login</span>

      <h2>ورود واقعی با ایمیل و رمز</h2>

      <p>
        این بخش login واقعی Supabase را به‌صورت guard شده اضافه می‌کند. ذخیره
        گزارش روی account و migration واقعی هنوز خاموش است.
      </p>

      <p className="file-hint">
        ذخیره گزارش روی account و migration واقعی هنوز خاموش است.
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
            <strong>حفاظت داده</strong>
            <span>تا قبل از migration واقعی، گزارش‌ها همچنان local-preview می‌مانند.</span>
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
            <strong>ایمیل</strong>
            <span>{formatUserLabel(session)}</span>
          </div>

          <div>
            <strong>User ID</strong>
            <span>{session.user.id}</span>
          </div>

          <div>
            <strong>Report save</strong>
            <span>local-preview</span>
          </div>
        </div>
      ) : null}

      {config.canUseRealSupabaseLogin && isReady && !session ? (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>ایمیل</span>
            <input
              autoComplete="email"
              dir="ltr"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

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
