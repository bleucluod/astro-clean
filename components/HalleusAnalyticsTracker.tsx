"use client";

import { useEffect } from "react";
import {
  classifyAnalyticsSource, normalizeAnalyticsPath,
  type AnalyticsEventKind, type AnalyticsSource,
} from "@/lib/analytics/first-party";

const STORAGE = "halleus-first-party-session-v1";
const SESSION_MS = 30 * 60_000;
type Session = { id: string; source: AnalyticsSource; expires: number };

function storedSession(): Session | null {
  try {
    const text = window.localStorage.getItem(STORAGE);
    if (!text) return null;
    const saved = JSON.parse(text) as Partial<Session>;
    if (typeof saved.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(saved.id) ||
        typeof saved.expires !== "number" || saved.expires <= Date.now() ||
        !["direct", "google", "bing", "search", "instagram", "telegram", "social", "external"]
          .includes(String(saved.source))) return null;
    return saved as Session;
  } catch { return null; }
}
function getSession(): Session | null {
  try {
    const existing = storedSession();
    const fresh: Session = existing ?? {
      id: crypto.randomUUID(),
      source: classifyAnalyticsSource(document.referrer, window.location.hostname),
      expires: 0,
    };
    fresh.expires = Date.now() + SESSION_MS;
    window.localStorage.setItem(STORAGE, JSON.stringify(fresh));
    return fresh;
  } catch { return null; }
}
function emit(kind: AnalyticsEventKind, path: string, session: Session) {
  const body = JSON.stringify({ kind, path, sessionId: session.id, source: session.source });
  void fetch("/api/analytics/event", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body, keepalive: true, credentials: "omit", cache: "no-store",
  }).catch(() => { /* Metrics never interrupt navigation. */ });
}
function leave(clearSession: boolean) {
  const old = storedSession();
  if (old) emit("leave", "/", old);
  if (clearSession) {
    try { window.localStorage.removeItem(STORAGE); } catch { /* Unavailable storage. */ }
  }
}

export function HalleusAnalyticsTracker({ granted, pathname }: {
  granted: boolean; pathname: string | null;
}) {
  const path = normalizeAnalyticsPath(pathname);

  useEffect(() => {
    if (!granted || !path) {
      leave(!granted);
      return;
    }
    if (document.visibilityState !== "visible") return;
    const session = getSession();
    if (session) emit("page", path, session);
  }, [granted, path]);

  useEffect(() => {
    if (!granted || !path) return;

    const heartbeat = () => {
      if (document.visibilityState !== "visible") return;
      const session = getSession();
      if (session) emit("heartbeat", path, session);
    };
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const link = element?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      let destination: URL;
      try { destination = new URL(link.href); } catch { return; }
      if (destination.origin !== window.location.origin) return;
      const target = normalizeAnalyticsPath(destination.pathname);
      if (!target) return;
      const kind: AnalyticsEventKind | null =
        target === "/shop/checkout" && path.startsWith("/shop") ? "checkout_start" :
        target.startsWith("/shop") && !path.startsWith("/shop") ? "product_click" :
        target === "/chart" && path !== "/chart" ? "chart_start" : null;
      if (!kind) return;
      const session = getSession();
      if (session) emit(kind, path, session);
    };
    const timer = window.setInterval(heartbeat, 30_000);
    document.addEventListener("visibilitychange", heartbeat);
    document.addEventListener("click", onClick, true);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", heartbeat);
      document.removeEventListener("click", onClick, true);
    };
  }, [granted, path]);

  return null;
}
