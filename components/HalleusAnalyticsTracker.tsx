"use client";

import { useEffect } from "react";
import {
  classifyAnalyticsSource, HALLEUS_ANALYTICS_ACTION, normalizeAnalyticsPath,
  type AnalyticsActionKind, type AnalyticsEventKind, type AnalyticsSource,
} from "@/lib/analytics/first-party";

const STORAGE = "halleus-first-party-session-v1";
const KNOWN = "halleus-first-party-known-browser-v1";
const CONSENT_STORAGE = "halleus-analytics-consent-v1";
const SESSION_MS = 30 * 60_000;
const KNOWN_MS = 30 * 24 * 60 * 60_000;
const IDLE_MS = 90_000;
const TICK_MS = 15_000;
type Session = {
  id: string; source: AnalyticsSource; expires: number;
  visitor: "new" | "returning" | "unknown"; paid: boolean;
};
const actions: readonly AnalyticsActionKind[] = [
  "product_click", "internal_click", "chart_start", "chart_complete",
  "compare_start", "compare_complete", "checkout_start",
];

function storedSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<Session>;
    if (typeof session.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(session.id) ||
      typeof session.expires !== "number" || session.expires <= Date.now() ||
      !["direct", "google", "bing", "search", "instagram", "telegram", "social", "external"]
        .includes(String(session.source))) return null;
    return session as Session;
  } catch { return null; }
}
function getSession(): Session | null {
  try {
    const current = storedSession();
    const savedAt = Number(window.localStorage.getItem(KNOWN) ?? 0);
    const visitor = savedAt > 0 && Date.now() - savedAt < KNOWN_MS ? "returning" : "new";
    const campaignParams = new URLSearchParams(window.location.search);
    const medium = (campaignParams.get("utm_medium") ?? "").toLowerCase();
    const paid = campaignParams.has("gclid") || campaignParams.has("gbraid") ||
      ["cpc", "ppc", "paid", "paid_social", "display"].includes(medium);
    const session: Session = current ? {
      ...current, visitor: current.visitor ?? "unknown", paid: current.paid === true,
    } : {
      id: crypto.randomUUID(),
      source: classifyAnalyticsSource(document.referrer, window.location.hostname),
      expires: 0, visitor, paid,
    };
    if (!current) window.localStorage.setItem(KNOWN, String(Date.now()));
    session.expires = Date.now() + SESSION_MS;
    window.localStorage.setItem(STORAGE, JSON.stringify(session));
    return session;
  } catch { return null; }
}
function emit(kind: AnalyticsEventKind, path: string, extra?: { seconds?: number; depth?: number }) {
  try {
    const choice = window.localStorage.getItem(CONSENT_STORAGE);
    if (choice && (JSON.parse(choice) as { choice?: string }).choice === "denied") return;
  } catch { /* Match the existing in-memory opt-out fallback. */ }
  const session = getSession();
  if (!session) return;
  const body = JSON.stringify({
    kind, path, sessionId: session.id, source: session.source,
    ...(kind === "page" ? { visitor: session.visitor, paid: session.paid } : {}),
    ...extra,
  });
  void fetch("/api/analytics/event", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body, keepalive: true, credentials: "omit", cache: "no-store",
  }).catch(() => { /* Never interrupt navigation for statistics. */ });
}
function revokeSession() {
  const old = storedSession();
  if (old) {
    const body = JSON.stringify({
      kind: "leave", path: "/", sessionId: old.id, source: old.source,
    });
    void fetch("/api/analytics/event", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body, keepalive: true, credentials: "omit", cache: "no-store",
    }).catch(() => {});
  }
  try {
    window.localStorage.removeItem(STORAGE);
    window.localStorage.removeItem(KNOWN);
  } catch { /* Storage unavailable. */ }
}

/** Accounts, report contents, search queries and full referrers are never read or transmitted. */
export function HalleusAnalyticsTracker({ granted, pathname }: {
  granted: boolean; pathname: string | null;
}) {
  const path = normalizeAnalyticsPath(pathname);

  useEffect(() => {
    if (!granted) revokeSession();
  }, [granted]);

  useEffect(() => {
    if (!granted || !path) return;

    let lastTick = performance.now();
    let lastInteraction = lastTick;
    let previousVisible = document.visibilityState === "visible";
    let started = previousVisible;
    let pendingSeconds = 0;
    let maxScrollSent = 0;

    const active = () => { lastInteraction = performance.now(); };

    const flush = (closing = false) => {
      const now = performance.now();
      const elapsed = Math.max(0, Math.min(20, (now - lastTick) / 1000));
      if (previousVisible && now - lastInteraction <= IDLE_MS) {
        pendingSeconds += elapsed;
      }
      lastTick = now;
      previousVisible = !closing && document.visibilityState === "visible";
      const seconds = Math.min(20, Math.floor(pendingSeconds));
      if (seconds >= 1) {
        pendingSeconds -= seconds;
        emit("engagement", path, { seconds });
      }
    };

    const heartbeat = () => {
      if (document.visibilityState !== "visible") return;
      emit("heartbeat", path);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush(true);
      } else {
        previousVisible = true;
        lastTick = performance.now();
        lastInteraction = lastTick;
        emit(started ? "resume" : "page", path);
        started = true;
      }
    };
    const onScroll = () => {
      active();
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable < 120) return;
      const depth = Math.round(100 * window.scrollY / scrollable);
      const highest = [25, 50, 75, 90, 100].filter(value => value <= depth).pop() ?? 0;
      if (highest > maxScrollSent) {
        maxScrollSent = highest;
        emit("scroll", path, { depth: highest });
      }
    };
    const onClick = (event: MouseEvent) => {
      active();
      const element = event.target instanceof Element ? event.target : null;
      const link = element?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      let target: URL;
      try { target = new URL(link.href); } catch { return; }
      if (target.origin !== window.location.origin) return;
      const destination = normalizeAnalyticsPath(target.pathname);
      if (!destination || destination === path) return;
      if (destination.startsWith("/shop") && !path.startsWith("/shop")) {
        emit("product_click", path);
      } else if (path.startsWith("/wiki/") && destination.startsWith("/wiki/")) {
        emit("internal_click", path);
      }
    };
    const onAction = (event: Event) => {
      const kind = (event as CustomEvent<unknown>).detail;
      if (typeof kind === "string" && actions.includes(kind as AnalyticsActionKind)) {
        emit(kind as AnalyticsActionKind, path);
      }
    };
    if (previousVisible) emit("page", path);
    const interval = window.setInterval(() => {
      flush();
      heartbeat();
    }, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    const onPageHide = () => flush(true);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener(HALLEUS_ANALYTICS_ACTION, onAction);
    document.addEventListener("pointermove", active, { passive: true });
    document.addEventListener("keydown", active);
    document.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    return () => {
      flush(true);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener(HALLEUS_ANALYTICS_ACTION, onAction);
      document.removeEventListener("pointermove", active);
      document.removeEventListener("keydown", active);
      document.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
    };
  }, [granted, path]);

  return null;
}
