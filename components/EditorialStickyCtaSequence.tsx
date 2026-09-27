"use client";

// HALLEUS_EDITORIAL_STICKY_CARD_LABEL_V1

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import styles from "@/app/wiki/wiki.module.css";
import {
  HALLEUS_STICKY_CTA_DISMISS_EVENT,
  HALLEUS_STICKY_CTA_DISMISS_KEY,
  type EditorialStickyCtaCampaign,
} from "@/lib/cta/editorial-sticky-cta";

const MOBILE_MEDIA_QUERY = "(max-width: 720px)";
const VISIBLE_DURATION_MS = 12_000;
const ENTER_DURATION_MS = 300;
const EXIT_DURATION_MS = 300;

type StickyPhase = "idle" | "entering" | "visible" | "exiting";

type EditorialStickyCtaSequenceProps = {
  campaign: EditorialStickyCtaCampaign;
  rootId: string;
  endId?: string;
  enabled?: boolean;
};

function hasPersistentDismissal() {
  try {
    return window.localStorage.getItem(HALLEUS_STICKY_CTA_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissal() {
  try {
    window.localStorage.setItem(HALLEUS_STICKY_CTA_DISMISS_KEY, "1");
  } catch {
    // Storage can be unavailable; the current sequence is still dismissed.
  }

  window.dispatchEvent(new Event(HALLEUS_STICKY_CTA_DISMISS_EVENT));
}

export function EditorialStickyCtaSequence({
  campaign,
  rootId,
  endId,
  enabled = true,
}: EditorialStickyCtaSequenceProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<StickyPhase>("idle");
  const [tabVisible, setTabVisible] = useState(true);
  const progressRef = useRef<HTMLSpanElement>(null);
  const dismissRef = useRef<() => void>(() => undefined);
  const pointerPausedRef = useRef(false);
  const touchPausedRef = useRef(false);
  const focusPausedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const mobileMedia = window.matchMedia(MOBILE_MEDIA_QUERY);
    const shown = new Set<number>();
    const body = document.body;
    let disposed = false;
    let phaseValue: StickyPhase = "idle";
    let globallyDismissed = hasPersistentDismissal();
    let endReached = false;
    let evaluationFrame = 0;
    let entranceFrame = 0;
    let enterTimer: number | null = null;
    let exitTimer: number | null = null;
    let countdownFrame = 0;
    let remainingMs = VISIBLE_DURATION_MS;
    let previousTick = 0;

    const setPhaseValue = (next: StickyPhase) => {
      phaseValue = next;
      setPhase(next);
    };

    const clearEnterTimer = () => {
      if (enterTimer === null) return;
      window.clearTimeout(enterTimer);
      enterTimer = null;
    };

    const clearExitTimer = () => {
      if (exitTimer === null) return;
      window.clearTimeout(exitTimer);
      exitTimer = null;
    };

    const cancelCountdown = () => {
      if (!countdownFrame) return;
      window.cancelAnimationFrame(countdownFrame);
      countdownFrame = 0;
    };

    const updateProgress = () => {
      const elapsedRatio = Math.max(
        0,
        Math.min(1, 1 - remainingMs / VISIBLE_DURATION_MS),
      );
      progressRef.current?.style.setProperty(
        "--wiki-cta-progress-angle",
        `${elapsedRatio}turn`,
      );
    };

    const syncChrome = () => {
      const active = ["entering", "visible", "exiting"].includes(phaseValue);
      if (active && mobileMedia.matches && document.visibilityState === "visible") {
        body.setAttribute("data-wiki-card-active", "true");
      } else {
        body.removeAttribute("data-wiki-card-active");
      }
    };

    const scheduleEvaluation = () => {
      if (disposed || evaluationFrame) return;
      evaluationFrame = window.requestAnimationFrame(() => {
        evaluationFrame = 0;
        evaluate();
      });
    };

    const finishExit = () => {
      if (disposed) return;
      clearEnterTimer();
      clearExitTimer();
      cancelCountdown();
      setActiveIndex(null);
      setPhaseValue("idle");
      body.removeAttribute("data-wiki-card-active");
      updateProgress();
      scheduleEvaluation();
    };

    const beginExit = (persist = false) => {
      if (!["entering", "visible"].includes(phaseValue)) return;

      if (persist) {
        globallyDismissed = true;
        persistDismissal();
      }

      clearEnterTimer();
      cancelCountdown();
      setPhaseValue("exiting");
      syncChrome();
      clearExitTimer();
      exitTimer = window.setTimeout(finishExit, EXIT_DURATION_MS);
    };

    dismissRef.current = () => beginExit(true);

    const countdownTick = (now: number) => {
      if (disposed || phaseValue !== "visible") return;

      const paused =
        pointerPausedRef.current ||
        touchPausedRef.current ||
        focusPausedRef.current ||
        document.visibilityState !== "visible" ||
        !mobileMedia.matches;
      const delta = Math.max(0, now - previousTick);
      previousTick = now;

      if (!paused) {
        remainingMs = Math.max(0, remainingMs - delta);
        updateProgress();
        if (remainingMs === 0) {
          beginExit(false);
          return;
        }
      }

      countdownFrame = window.requestAnimationFrame(countdownTick);
    };

    const startCountdown = () => {
      cancelCountdown();
      previousTick = performance.now();
      countdownFrame = window.requestAnimationFrame(countdownTick);
    };

    const reveal = (index: number) => {
      if (disposed || globallyDismissed || endReached || phaseValue !== "idle") {
        return;
      }

      shown.add(index);
      remainingMs = VISIBLE_DURATION_MS;
      setActiveIndex(index);
      setPhaseValue("entering");
      updateProgress();
      syncChrome();

      entranceFrame = window.requestAnimationFrame(() => {
        entranceFrame = 0;
        if (disposed || phaseValue !== "entering") return;
        setPhaseValue("visible");
        syncChrome();
        clearEnterTimer();
        enterTimer = window.setTimeout(() => {
          enterTimer = null;
          if (!disposed && phaseValue === "visible") startCountdown();
        }, ENTER_DURATION_MS);
      });
    };

    function evaluate() {
      if (disposed) return;

      const persistentDismissal = hasPersistentDismissal();
      if (globallyDismissed || persistentDismissal) {
        globallyDismissed = true;
        if (["entering", "visible"].includes(phaseValue)) beginExit(false);
        return;
      }

      setTabVisible(document.visibilityState === "visible");
      syncChrome();

      if (!mobileMedia.matches || document.visibilityState !== "visible") return;

      if (endId) {
        const endTarget = document.getElementById(endId);
        if (endTarget) {
          const rect = endTarget.getBoundingClientRect();
          const inView = rect.top < window.innerHeight && rect.bottom > 0;
          if (inView) body.setAttribute("data-wiki-end-cta-in-view", "true");
          else body.removeAttribute("data-wiki-end-cta-in-view");
          if (inView || rect.bottom <= 0) {
            endReached = true;
            if (["entering", "visible"].includes(phaseValue)) beginExit(false);
            return;
          }
        }
      }

      if (phaseValue !== "idle") return;

      const root = document.getElementById(rootId);
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const rootTop = rect.top + window.scrollY;
      const scrollableDistance = Math.max(root.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(
        1,
        Math.max(0, (window.scrollY - rootTop) / scrollableDistance),
      );

      let candidateIndex = -1;
      campaign.cards.forEach((card, index) => {
        if (!shown.has(index) && progress >= card.at) candidateIndex = index;
      });

      if (candidateIndex >= 0) reveal(candidateIndex);
    }

    const onVisibility = () => {
      setTabVisible(document.visibilityState === "visible");
      syncChrome();
      scheduleEvaluation();
    };
    const onMediaChange = () => {
      syncChrome();
      scheduleEvaluation();
    };
    const onGlobalDismiss = () => {
      globallyDismissed = true;
      if (["entering", "visible"].includes(phaseValue)) beginExit(false);
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === HALLEUS_STICKY_CTA_DISMISS_KEY &&
        event.newValue === "1"
      ) {
        onGlobalDismiss();
      }
    };

    window.addEventListener("scroll", scheduleEvaluation, { passive: true });
    window.addEventListener("resize", scheduleEvaluation);
    window.addEventListener("orientationchange", scheduleEvaluation);
    window.addEventListener("storage", onStorage);
    window.addEventListener(HALLEUS_STICKY_CTA_DISMISS_EVENT, onGlobalDismiss);
    document.addEventListener("visibilitychange", onVisibility);
    mobileMedia.addEventListener("change", onMediaChange);
    scheduleEvaluation();

    return () => {
      disposed = true;
      dismissRef.current = () => undefined;
      if (evaluationFrame) window.cancelAnimationFrame(evaluationFrame);
      if (entranceFrame) window.cancelAnimationFrame(entranceFrame);
      clearEnterTimer();
      clearExitTimer();
      cancelCountdown();
      window.removeEventListener("scroll", scheduleEvaluation);
      window.removeEventListener("resize", scheduleEvaluation);
      window.removeEventListener("orientationchange", scheduleEvaluation);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(HALLEUS_STICKY_CTA_DISMISS_EVENT, onGlobalDismiss);
      document.removeEventListener("visibilitychange", onVisibility);
      mobileMedia.removeEventListener("change", onMediaChange);
      body.removeAttribute("data-wiki-card-active");
      body.removeAttribute("data-wiki-end-cta-in-view");
    };
  }, [campaign, enabled, endId, rootId]);

  const activeCard = campaign.cards[activeIndex ?? 0];
  const interactive = phase === "visible" && tabVisible;
  const hidden = activeIndex === null || phase === "idle";

  return (
    <div
      aria-hidden={!interactive}
      className={styles.editorialMobileCta}
      data-exiting={phase === "exiting" ? "true" : "false"}
      data-halleus-editorial-sticky-cta="sequence-v1"
      data-state={phase}
      data-tab-visible={tabVisible ? "true" : "false"}
      hidden={hidden}
      onFocus={() => {
        focusPausedRef.current = true;
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          focusPausedRef.current = false;
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") pointerPausedRef.current = true;
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") pointerPausedRef.current = false;
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;
        const target = event.target;
        if (target instanceof Element && target.closest("a,button")) return;
        touchPausedRef.current = true;
        pointerPausedRef.current = true;
      }}
      onPointerUp={() => {
        touchPausedRef.current = false;
        pointerPausedRef.current = false;
      }}
      onPointerCancel={() => {
        touchPausedRef.current = false;
        pointerPausedRef.current = false;
      }}
    >
      <span
        aria-hidden="true"
        className={styles.editorialMobileCtaProgress}
        ref={progressRef}
      />

      <button
        aria-label="بستن پیشنهاد"
        className={styles.editorialMobileCtaDismiss}
        onClick={() => dismissRef.current()}
        tabIndex={interactive ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>

      <div aria-live="polite" className={styles.editorialMobileCtaText}>
        {activeCard.text}
      </div>

      <Link
        className={styles.editorialMobileCtaButton}
        href={campaign.href}
        tabIndex={interactive ? 0 : -1}
      >
        {activeCard.label ?? campaign.label}
      </Link>
    </div>
  );
}
