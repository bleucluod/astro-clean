"use client";

// HALLEUS_REPORT_CTA_SYNASTRY_AUTH_FINISH_R2_20260919

import { useEffect, useRef, useState } from "react";

import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
import {
  claimCurrentGuestReport,
  reconcileServerCanonicalReports,
  type CurrentGuestReportClaimResult,
} from "@/lib/account/server-canonical-report-migration-client";
import {
  getSupabaseBrowserAccessState,
  getSupabaseBrowserAuthClient,
} from "@/lib/auth/supabase-browser-client";

import styles from "./human-first-report.module.css";

const REVEAL_PROGRESS = 0.22;

type ReportAccountCtaProps = Readonly<{
  reportId: string;
  onClaimed?: (result: CurrentGuestReportClaimResult) => void;
}>;

export function ReportAccountCta({ reportId, onClaimed }: ReportAccountCtaProps) {
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);
  const eligibilityFrame = useRef<number | null>(null);
  const borderFrame = useRef<number | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const claimInFlight = useRef(false);

  async function finishClaim(accessToken: string) {
    if (claimInFlight.current) return;

    claimInFlight.current = true;
    setClaiming(true);
    setClaimError("");
    setPendingAccessToken(accessToken);

    try {
      const result = await claimCurrentGuestReport(accessToken, reportId);
      setAuthenticated(true);
      setAuthOpen(false);
      setDismissed(true);
      onClaimed?.(result);
      window.dispatchEvent(new Event("halleus-data-changed"));
      window.dispatchEvent(new Event("astro-clean-data-changed"));

      // The current report claim is already complete. Legacy browser records
      // are optional follow-up migration and must never delay this same-page flow.
      void reconcileServerCanonicalReports(accessToken).catch(() => undefined);
    } catch (error) {
      setClaimError(
        error instanceof Error
          ? error.message
          : "وصل‌کردن این چارت به حساب کامل نشد. دوباره تلاش کن.",
      );
    } finally {
      setClaiming(false);
      claimInFlight.current = false;
    }
  }

  useEffect(() => {
    let active = true;

    void getSupabaseBrowserAccessState().then((state) => {
      if (!active || state.kind !== "account") return;
      setPendingAccessToken(state.accessToken);
      void finishClaim(state.accessToken);
    });

    const client = getSupabaseBrowserAuthClient();
    const subscription = client?.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.access_token) {
        setAuthenticated(false);
        setPendingAccessToken(null);
        return;
      }

      setPendingAccessToken(session.access_token);
      void finishClaim(session.access_token);
    }).data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
    // The current report id is immutable for this mounted report detail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      '[data-report-product-reader="human-first-report-experience"]',
    );
    if (!root) return;

    // HALLEUS_REPORT_ACCOUNT_CTA_DIRECT_READER_PROGRESS_R14_20260919
    // Use the exact same geometry as ReportProductReader. Reading eligibility
    // is derived directly from the current scroll position, so it cannot lag
    // behind a dataset observer or another requestAnimationFrame listener.
    const update = () => {
      eligibilityFrame.current = null;

      const reportTop = root.getBoundingClientRect().top + window.scrollY;
      const reportScrollableDistance = Math.max(
        root.scrollHeight - window.innerHeight,
        1,
      );
      const progress = Math.min(
        1,
        Math.max(
          0,
          (window.scrollY - reportTop) / reportScrollableDistance,
        ),
      );

      setEligible(progress >= REVEAL_PROGRESS);
    };

    const schedule = () => {
      if (eligibilityFrame.current !== null) return;
      eligibilityFrame.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("pageshow", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);

      if (eligibilityFrame.current !== null) {
        window.cancelAnimationFrame(eligibilityFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const visible = eligible && !dismissed && !authenticated;

    if (!visible || reducedMotion.matches) {
      if (borderFrame.current !== null) {
        window.cancelAnimationFrame(borderFrame.current);
        borderFrame.current = null;
      }
      progressRef.current?.style.setProperty(
        "--wiki-cta-progress-angle",
        "0turn",
      );
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const turns = ((now - startedAt) / 4200) % 1;
      progressRef.current?.style.setProperty(
        "--wiki-cta-progress-angle",
        `${turns}turn`,
      );
      borderFrame.current = window.requestAnimationFrame(tick);
    };

    borderFrame.current = window.requestAnimationFrame(tick);
    return () => {
      if (borderFrame.current !== null) {
        window.cancelAnimationFrame(borderFrame.current);
        borderFrame.current = null;
      }
    };
  }, [authenticated, dismissed, eligible]);

  const visible = eligible && !dismissed && !authenticated;
  const state = visible ? "visible" : eligible ? "exiting" : "entering";

  return (
    <>
      <div
        aria-hidden={!visible}
        className={styles.reportAccountStickyCta}
        data-exiting={!visible && eligible ? "true" : "false"}
        data-state={state}
        data-tab-visible={visible ? "true" : "false"}
      >
        <span
          aria-hidden="true"
          className={styles.reportAccountStickyCtaProgress}
          ref={progressRef}
        />

        <button
          aria-label="بستن پیشنهاد"
          className={styles.reportAccountStickyCtaDismiss}
          onClick={() => setDismissed(true)}
          tabIndex={visible ? 0 : -1}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div aria-live="polite" className={styles.reportAccountStickyCtaText}>
          <strong className={styles.reportAccountStickyCtaTitle}>
            قصه‌ی یک رابطه، از کنار هم گذاشتن دو آسمان شروع می‌شود
          </strong>
          <p className={styles.reportAccountStickyCtaBody}>
            برای ساخت چارت سیناستری، اول این چارت را در حسابت نگه دار. بعد چارت
            نفر دوم را اضافه کن تا ببینی این دو آسمان کجا به هم نزدیک می‌شوند،
            کجا با هم اصطکاک دارند و چه چیزی بینشان شکل می‌گیرد.
          </p>
        </div>

        <button
          className={styles.reportAccountStickyCtaButton}
          onClick={() => {
            setClaimError("");
            setAuthOpen(true);
          }}
          tabIndex={visible ? 0 : -1}
          type="button"
        >
          ذخیره چارت و ساخت سیناستری
        </button>
      </div>

      {authOpen && !authenticated ? (
        <div
          className={styles.reportAccountAuthBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !claiming) {
              setAuthOpen(false);
            }
          }}
          role="presentation"
        >
          <section
            aria-label="ورود یا ساخت حساب هالیوس"
            className={styles.reportAccountAuthDialog}
          >
            <button
              aria-label="بستن"
              className={styles.reportAccountAuthClose}
              disabled={claiming}
              onClick={() => setAuthOpen(false)}
              type="button"
            >
              ×
            </button>

            {!pendingAccessToken ? (
              <SupabaseAuthPanel compact initialMode="sign-up" />
            ) : null}

            {claiming ? (
              <p className={styles.reportAccountClaimStatus} role="status">
                در حال ذخیره همین چارت در حسابت…
              </p>
            ) : null}

            {claimError ? (
              <div className={styles.reportAccountClaimError} role="alert">
                <p>{claimError}</p>
                {pendingAccessToken ? (
                  <button
                    className={styles.reportAccountClaimRetry}
                    onClick={() => void finishClaim(pendingAccessToken)}
                    type="button"
                  >
                    تلاش دوباره
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
