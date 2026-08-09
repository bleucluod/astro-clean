"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { AdminSessionPayload } from "@/lib/admin/admin-types";
import { AdminConsole } from "./AdminConsole";
import { AdminReportsWorkspace } from "./AdminReportsWorkspace";
import styles from "./admin-console.module.css";

const STORAGE_KEY = "halleus.admini.direct-session.v1";

type GateMode = "console" | "reports";

type DirectLoginPayload = {
  token?: string;
  session?: AdminSessionPayload;
  error?: string;
};

function readStoredToken() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeToken(token: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // In-memory state still keeps the current session usable.
  }
}

function clearStoredToken() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else to clear.
  }
}

export function AdminDirectGate({
  mode = "console",
  reportId,
}: {
  mode?: GateMode;
  reportId?: string;
}) {
  const [token, setToken] = useState("");
  const [session, setSession] = useState<AdminSessionPayload | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function signOut() {
    clearStoredToken();
    setToken("");
    setSession(null);
    setPassword("");
    setError("");
  }

  useEffect(() => {
    let active = true;

    async function restore() {
      const stored = readStoredToken();
      if (!stored) {
        if (active) setLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
          headers: { authorization: `Bearer ${stored}` },
        });
        const payload = (await response.json()) as {
          session?: AdminSessionPayload;
          error?: string;
        };
        if (!response.ok || !payload.session) {
          clearStoredToken();
          throw new Error(
            payload.error || "نشست قبلی ادمین منقضی شده است؛ دوباره وارد شو.",
          );
        }
        if (active) {
          setToken(stored);
          setSession(payload.session);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "نشست قبلی ادمین قابل بازیابی نبود.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    // Direct admin session is external sessionStorage/server state restored on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void restore();
    return () => {
      active = false;
    };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/direct-session", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as DirectLoginPayload;
      if (!response.ok || !payload.token || !payload.session) {
        throw new Error(payload.error || "ورود ادمین انجام نشد.");
      }
      storeToken(payload.token);
      setToken(payload.token);
      setSession(payload.session);
      setPassword("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "ورود ادمین انجام نشد.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading && !session) {
    return (
      <div className={styles.adminDirectLoginShell}>
        <div className={styles.adminDirectLoginCard}>در حال بررسی نشست ادمین…</div>
      </div>
    );
  }

  if (!token || !session) {
    return (
      <div className={styles.adminDirectLoginShell}>
        <form className={styles.adminDirectLoginCard} onSubmit={login}>
          <span className={styles.eyebrow}>Halleus Admin</span>
          <h1>ورود مستقیم به پنل</h1>
          <p>این ورود از حساب کاربری هالیوس جداست.</p>
          {error ? <p className={styles.error}>{error}</p> : null}
          <label>
            نام کاربری
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label>
            رمز عبور
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className={styles.primaryAction} type="submit" disabled={loading}>
            {loading ? "در حال ورود…" : "ورود به پنل"}
          </button>
        </form>
      </div>
    );
  }

  if (mode === "reports") {
    return <AdminReportsWorkspace reportId={reportId} accessToken={token} />;
  }

  return (
    <AdminConsole
      accessToken={token}
      initialSession={session}
      onSignOut={signOut}
    />
  );
}
