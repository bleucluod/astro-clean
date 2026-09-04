// HALLEUS_REPORT_NATIVE_SITE_HEADER_REUSE_R8_20260904
// HALLEUS_REPORT_MANUAL_MOBILE_REVIEW_REFINEMENT_R3_20260904
// HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE6_HIERARCHY_RECONCILIATION_R3_20260904
// HALLEUS_REPORT_EDITORIAL_COHESION_SLICE_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_FINAL_VISUAL_LANGUAGE_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_FAILURESET_REPAIR_R7_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_WHOLE_REPORT_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE1_EXACT_ANGLE_FACT_CONTRACT_R4_20260902
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReportBirthChartWheel } from "@/components/ReportBirthChartWheel";
import { ReportV3Experience } from "@/components/ReportV3Experience";
import { ReportAdaptiveOverview } from "@/components/report/ReportAdaptiveNarrative";
import { buildLiveReportReadingContract } from "@/lib/report-output/live-report-reading-contract";
import { HUMAN_FIRST_REPORT_NAVIGATION } from "@/lib/report-output/human-first-report-reading";
import {
  buildPersonalTransitBehavioralInterpretation,
  selectPersonalTransitHighlights,
} from "@/src/lib/report-output/personal-transit-relevance";
import type {
  PersonalTransitReportDataBridge,
  PersonalTransitReportDataBridgeSelectedAspectSummary,
} from "@/src/lib/report-output/personal-transit-report-data-bridge";
import {
  getReportReadingProgress,
  saveReportReadingProgress,
  type ReportReadingSectionId,
} from "@/lib/storage/report-journey-client";
import type { AstrologyReport } from "@/types/astro";
import { FiveMinuteReportSummary } from "@/components/report/FiveMinuteReportSummary";
import { ReportTechnicalAppendix } from "@/components/report/ReportTechnicalAppendix";
import { useProductAccess } from "@/lib/monetization/product-access-client";
import type { ReportAccessPolicy } from "@/lib/monetization/access-policy";
import {
  formatReportNarrativeAspectGeometry,
} from "@/lib/astrology/report-aspect-display";
import {
  joinReportNarrativeSentences,
  realizeReportSurfaceText,
} from "@/lib/astrology/report-surface-language-planner";
import styles from "./human-first-report.module.css";

type ReportWithTransit = AstrologyReport & {
  engineData?: {
    personalTransitReportData?: PersonalTransitReportDataBridge | null;
  } | null;
};

const FLOW_SECTIONS = [
  { id: "report-summary", label: "چارت تولد" },
  { id: "report-full", label: "گزارش کامل چارت تولد" },
  { id: "report-sky", label: "آسمان و تو" },
  { id: "report-chart", label: "چارت و جزئیات" },
] as const;

const LEGACY_ADAPTIVE_COMPATIBILITY_RENDER = false;

const TRANSIT_BODY_LABELS: Record<string, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

const TRANSIT_SIGN_LABELS: Record<string, string> = {
  aries: "اریس",
  taurus: "تارس",
  gemini: "جمنای",
  cancer: "کنسر",
  leo: "لئو",
  virgo: "ویرگو",
  libra: "لیبرا",
  scorpio: "اسکورپیو",
  sagittarius: "سجتریس",
  capricorn: "کپریکورن",
  aquarius: "آکواریوس",
  pisces: "پایسیز",
};

function formatTransitMotionLabel(value: string) {
  if (value === "retrograde") return "پس‌رو";
  if (value === "stationary") return "ایستا";
  return "مستقیم";
}

const TRANSIT_BODY_SYMBOLS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
};

function formatTransitAstrologyLabel(
  aspect: Pick<
    PersonalTransitReportDataBridgeSelectedAspectSummary,
    | "transitBody"
    | "natalBody"
    | "aspect"
    | "exactAngle"
    | "separation"
    | "orb"
  >,
) {
  const transit =
    TRANSIT_BODY_LABELS[aspect.transitBody] ?? aspect.transitBody;
  const natal = TRANSIT_BODY_LABELS[aspect.natalBody] ?? aspect.natalBody;
  const transitSymbol = TRANSIT_BODY_SYMBOLS[aspect.transitBody] ?? "";
  const natalSymbol = TRANSIT_BODY_SYMBOLS[aspect.natalBody] ?? "";
  const geometry = formatReportNarrativeAspectGeometry({
    aspectId: aspect.aspect,
    referenceAngle: aspect.exactAngle,
    separation: aspect.separation,
    distanceFromExact: aspect.orb,
  });

  return `${transitSymbol} ${transit} ترنزیت · ${geometry} · ${natalSymbol} ${natal} تولد`;
}

export function ReportProductReader({ report, storedAccessTier = null, initialAccessPolicy }: { report: AstrologyReport; storedAccessTier?: string | null; initialAccessPolicy?: ReportAccessPolicy }) {
  const productAccess = useProductAccess(report.id);
  // HALLEUS_FREE_ALL_BIRTH_REPORT_BATCH1_R1
  // HALLEUS_FREE_ALL_SERVER_SEED_STICKY_20260815
  const accessPolicy =
    initialAccessPolicy &&
    (productAccess.status === "loading" || productAccess.status === "unavailable")
      ? initialAccessPolicy
      : productAccess.access.policy;
  const freeAllAccess = accessPolicy.monetizationMode === "FREE_ALL";
  const premiumBirthUnlocked =
    freeAllAccess ||
    storedAccessTier === "premium" ||
    productAccess.access.reportUnlocked;
  const technicalAppendixVisible =
    premiumBirthUnlocked || accessPolicy.technical.appendix === "free";
  const contract = useMemo(() => buildLiveReportReadingContract(report), [report]);
  const transitData = useMemo(
    () => (report as ReportWithTransit).engineData?.personalTransitReportData ?? null,
    [report],
  );
  const initialProgress = getReportReadingProgress("reader", report.id);
  const [activeSection, setActiveSection] = useState<ReportReadingSectionId>(
    initialProgress?.sectionId ?? "overview",
  );
  const [activeFlowSection, setActiveFlowSection] = useState<(typeof FLOW_SECTIONS)[number]["id"]>(
    "report-full",
  );
  const [mobileChapterSheetOpen, setMobileChapterSheetOpen] = useState(false);
  const mobileChapterDialogRef = useRef<HTMLDialogElement>(null);
  const mobileChapterTriggerRef = useRef<HTMLButtonElement>(null);
  const activeSectionLabel = useMemo(
    () =>
      HUMAN_FIRST_REPORT_NAVIGATION.find((item) => item.id === activeSection)?.label ??
      "امضای چارت",
    [activeSection],
  );
  const activeChapterIndex = Math.max(
    0,
    HUMAN_FIRST_REPORT_NAVIGATION.findIndex((item) => item.id === activeSection),
  );

  // HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE4_BOTTOM_SHEET_R1_20260903
  // HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE4_FAILURESET_R2_20260903
  useEffect(() => {
    const dialog = mobileChapterDialogRef.current;
    if (!dialog) return;

    if (!mobileChapterSheetOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    const trigger = mobileChapterTriggerRef.current;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousOverscrollBehavior = body.style.overscrollBehavior;

    body.dataset.halleusReportChapterSheet = "open";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    if (!dialog.open) dialog.showModal();

    const focusFrame = window.requestAnimationFrame(() => {
      dialog
        .querySelector<HTMLButtonElement>('button[data-active="true"]')
        ?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (dialog.open) dialog.close();
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousOverscrollBehavior;
      delete body.dataset.halleusReportChapterSheet;
      trigger?.focus({ preventScroll: true });
    };
  }, [mobileChapterSheetOpen]);

  // HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE1_20260903
  useEffect(() => {
    const body = document.body;
    const rootElement = document.querySelector<HTMLElement>(
      '[data-report-product-reader="human-first-report-experience"]',
    );
    const reportHeader = rootElement?.querySelector<HTMLElement>(
      '[data-report-mobile-header="editorial-v1"]',
    );
    const progressFill = rootElement?.querySelector<HTMLElement>(
      '[data-report-reading-progress-fill="editorial-v1"]',
    );
    if (!rootElement) return;

    let frame = 0;
    let lastScrollY = window.scrollY;
    let accumulatedDistance = 0;
    let activeDirection: "up" | "down" | null = null;
    const hideThreshold = 6;

    const setHeaderVisibility = (visible: boolean) => {
      if (!reportHeader) return;
      reportHeader.dataset.reportHeaderVisibility = visible ? "visible" : "hidden";
    };

    const syncReportChrome = () => {
      frame = 0;
      body.dataset.halleusReportReading = "true";

      const reportTop = rootElement.getBoundingClientRect().top + window.scrollY;
      const reportScrollableDistance = Math.max(
        rootElement.scrollHeight - window.innerHeight,
        1,
      );
      const reportScrollProgress = Math.min(
        1,
        Math.max(0, (window.scrollY - reportTop) / reportScrollableDistance),
      );

      body.dataset.halleusReportBackToTop =
        reportScrollProgress >= 0.35 ? "true" : "false";
      rootElement.dataset.reportScrollProgress = reportScrollProgress.toFixed(4);
      if (progressFill) {
        progressFill.style.transform = "scaleX(" + reportScrollProgress.toFixed(4) + ")";
      }

      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      if (currentScrollY < reportTop + 96) {
        setHeaderVisibility(true);
        accumulatedDistance = 0;
        activeDirection = null;
      } else if (scrollDelta !== 0) {
        const direction = scrollDelta > 0 ? "down" : "up";
        if (activeDirection !== direction) {
          activeDirection = direction;
          accumulatedDistance = Math.abs(scrollDelta);
        } else {
          accumulatedDistance += Math.abs(scrollDelta);
        }
        if (accumulatedDistance >= hideThreshold) {
          setHeaderVisibility(direction === "up");
          accumulatedDistance = 0;
        }
      }

      lastScrollY = currentScrollY;
    };

    const scheduleSync = () => {
      if (frame === 0) frame = window.requestAnimationFrame(syncReportChrome);
    };

    setHeaderVisibility(true);
    syncReportChrome();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);
    window.addEventListener("pageshow", scheduleSync);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      window.removeEventListener("pageshow", scheduleSync);
      delete body.dataset.halleusReportReading;
      delete body.dataset.halleusReportBackToTop;
      delete rootElement.dataset.reportScrollProgress;
      progressFill?.style.removeProperty("transform");
    };
  }, []);

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      const progress = getReportReadingProgress("reader", report.id);
      setActiveSection(progress?.sectionId ?? "overview");
    });
    return () => window.cancelAnimationFrame(restoreFrame);
  }, [report.id]);

  useEffect(() => {
    const flowSections = FLOW_SECTIONS
      .map((item) => document.getElementById(item.id))
      .filter((item): item is HTMLElement => item !== null);
    if (flowSections.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        setActiveFlowSection(
          visible.target.id as (typeof FLOW_SECTIONS)[number]["id"],
        );
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.08, 0.24, 0.5] },
    );
    flowSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = HUMAN_FIRST_REPORT_NAVIGATION
      .map((item) => document.getElementById(item.id))
      .filter((item): item is HTMLElement => item !== null);
    if (sections.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const sectionId = visible.target.id as ReportReadingSectionId;
        setActiveSection(sectionId);
        saveReportReadingProgress("reader", report.id, sectionId);
      },
      { rootMargin: "-20% 0px -62% 0px", threshold: [0.08, 0.24, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [report.id]);

  useEffect(() => {
    const rootElement = document.querySelector<HTMLElement>(
      '[data-report-product-reader="human-first-report-experience"]',
    );
    if (!rootElement) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateAmbientLogo = () => {
      frame = 0;
      if (reducedMotion.matches) {
        rootElement.style.setProperty("--halleus-ambient-rotate", "0deg");
        return;
      }

      const rotationDegrees = window.scrollY * 0.045;
      rootElement.style.setProperty("--halleus-ambient-rotate", rotationDegrees.toFixed(2) + "deg");
    }; // HALLEUS_REPORT_AMBIENT_BACKGROUND_NEUTRAL_HEADINGS_FINAL_QA_R16_20260808

    const scheduleAmbientLogo = () => {
      if (frame === 0) frame = window.requestAnimationFrame(updateAmbientLogo);
    };

    updateAmbientLogo();
    window.addEventListener("scroll", scheduleAmbientLogo, { passive: true });
    window.addEventListener("resize", scheduleAmbientLogo);
    reducedMotion.addEventListener?.("change", scheduleAmbientLogo);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleAmbientLogo);
      window.removeEventListener("resize", scheduleAmbientLogo);
      reducedMotion.removeEventListener?.("change", scheduleAmbientLogo);
      rootElement.style.removeProperty("--halleus-ambient-y");
      rootElement.style.removeProperty("--halleus-ambient-rotate");
    };
  }, []); // HALLEUS_REPORT_AMBIENT_LOGO_PARALLAX_BATCH2_20260808

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
    );
  }

  function closeJourneyNavigator() {
    document
      .querySelector<HTMLDetailsElement>("[data-report-journey-navigator]")
      ?.removeAttribute("open");
  }

  function navigateTo(sectionId: ReportReadingSectionId) {
    setActiveFlowSection("report-full");
    setActiveSection(sectionId);
    saveReportReadingProgress("reader", report.id, sectionId);
    setMobileChapterSheetOpen(false);
    closeJourneyNavigator();
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function scrollToFlowSection(sectionId: (typeof FLOW_SECTIONS)[number]["id"]) {
    setActiveFlowSection(sectionId);
    closeJourneyNavigator();
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  // HALLEUS_REPORT_CHARTWHEEL_HERO_ROADMAP_POLISH_20260830
  function scrollToReportTarget(targetId: string) {
    const flowTarget = FLOW_SECTIONS.find((section) => section.id === targetId);
    if (flowTarget) {
      scrollToFlowSection(flowTarget.id);
      return;
    }

    if (targetId === "report-chart-wheel") {
      setActiveFlowSection("report-summary");
      closeJourneyNavigator();
      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      });
      return;
    }

    const readingTarget = HUMAN_FIRST_REPORT_NAVIGATION.find(
      (item) => item.id === targetId,
    );
    if (readingTarget) {
      navigateTo(readingTarget.id as ReportReadingSectionId);
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <section
      className={styles.reader}
      data-report-product-reader="human-first-report-experience"
      data-report-product-flow="continuous"
      data-report-reading-position={activeSection}
      data-report-reading-motion="batch8"
      data-editorial-report-batch1="screenshot-native"
      data-editorial-report-batch2="motion-polish"
      data-report-adaptive-depth="20260808"
      data-adaptive-compatibility-suppressed="FiveMinuteReportSummary"
      data-effective-monetization-mode={accessPolicy.monetizationMode}
      data-report-app-like-mobile="20260903"
      data-report-editorial-mobile="slice1-20260903"
    >

      <div aria-hidden="true" className={styles.ambientLogo} data-report-ambient-logo="parallax" />


      {(report.realEngine?.placements?.length ?? 0) > 0 ? (
        <ReportAdaptiveOverview
          accessMode={premiumBirthUnlocked ? "premium" : "free"}
          accessPolicy={accessPolicy}
          onNavigate={scrollToReportTarget}
          report={report}
          afterOpening={
            <section
              className={styles.flowSection}
              data-report-flow-section="summary"
              id="report-summary"
              data-report-narrative-layer="chart-after-opening"
            >
              <div className={styles.chartDetails} data-screenshot-ready>
                <div className={styles.chartHeading}>
                  <p className={styles.eyebrow}>چارت تولد</p>
                  <h1>{report.input.name?.trim() ? `چارت تولد ${report.input.name.trim()}` : "چارت تولد"}</h1>
                  <p>
                    {report.input.name?.trim()
                      ? `اینجا می‌توانی ببینی داستان ${report.input.name.trim()} از کجای آسمان شروع شده است.`
                      : "این همان نقشه‌ای است که خوانش گزارش از آن شروع می‌شود."}
                  </p>
                </div>
                <div className={styles.wheelShell} id="report-chart-wheel">
                  <ReportBirthChartWheel report={report} />
                </div>
              </div>
              {LEGACY_ADAPTIVE_COMPATIBILITY_RENDER ? (
                <FiveMinuteReportSummary
                  contract={contract}
                  onOpenFullReport={navigateTo}
                />
              ) : null}
            </section>
          }
        />
      ) : null}

      <details
        className={styles.journeyNavigator}
        data-report-journey-navigator
      >
        <summary>
          <span>بخش‌ها</span>
          <strong>
            {activeFlowSection === "report-full"
              ? activeSectionLabel
              : FLOW_SECTIONS.find((item) => item.id === activeFlowSection)?.label}
          </strong>
        </summary>
        <div className={styles.journeyNavigatorPanel}>
          <div className={styles.journeyMacroLinks}>
            {FLOW_SECTIONS.map((section) => (
              <button
                data-active={section.id === activeFlowSection}
                key={section.id}
                onClick={() => scrollToFlowSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className={styles.journeyChapterLinks}>
            <span>فصل‌های گزارش کامل</span>
            <nav aria-label="فصل‌های نجومی گزارش کامل">
              {HUMAN_FIRST_REPORT_NAVIGATION.map((item, index) => (
                <button
                  data-active={item.id === activeSection}
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  type="button"
                >
                  <span>{(index + 1).toLocaleString("fa-IR")}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </details>

      <div
        className={styles.mobileChapterNavigator}
        data-report-mobile-chapter-navigator="slice4-20260903"
      >
        <button
          aria-controls="report-mobile-chapter-sheet"
          aria-expanded={mobileChapterSheetOpen}
          aria-haspopup="dialog"
          className={styles.mobileChapterTrigger}
          data-report-mobile-chapter-trigger="slice4-20260903"
          onClick={() => setMobileChapterSheetOpen(true)}
          ref={mobileChapterTriggerRef}
          type="button"
        >
          <span>
            {(activeChapterIndex + 1).toLocaleString("fa-IR")} از{" "}
            {HUMAN_FIRST_REPORT_NAVIGATION.length.toLocaleString("fa-IR")} ·{" "}
            {activeSectionLabel}
          </span>
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="16"
          >
            <path d="m7 9 5 5 5-5" />
          </svg>
        </button>

        <dialog
          aria-labelledby="report-mobile-chapter-sheet-title"
          aria-modal="true"
          className={styles.mobileChapterDialog}
          data-report-mobile-chapter-dialog="slice4-20260903"
          id="report-mobile-chapter-sheet"
          onCancel={(event) => {
            event.preventDefault();
            setMobileChapterSheetOpen(false);
          }}
          onClose={() => setMobileChapterSheetOpen(false)}
          ref={mobileChapterDialogRef}
        >
          <div className={styles.mobileChapterSheet}>
            <div aria-hidden="true" className={styles.mobileChapterSheetHandle} />
            <header className={styles.mobileChapterSheetHeader}>
              <div>
                <h2 id="report-mobile-chapter-sheet-title">بخش‌های گزارش</h2>
                <p>
                  {(activeChapterIndex + 1).toLocaleString("fa-IR")} از{" "}
                  {HUMAN_FIRST_REPORT_NAVIGATION.length.toLocaleString("fa-IR")}
                </p>
              </div>
              <button
                aria-label="بستن بخش‌های گزارش"
                className={styles.mobileChapterSheetClose}
                onClick={() => setMobileChapterSheetOpen(false)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                  width="18"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>
            <nav
              aria-label="بخش‌های گزارش"
              className={styles.mobileChapterSheetList}
            >
              {HUMAN_FIRST_REPORT_NAVIGATION.map((item, index) => (
                <button
                  data-active={item.id === activeSection}
                  data-report-chapter-id={item.id}
                  data-report-chapter-index={index}
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={styles.mobileChapterActiveMarker}
                  />
                  <span className={styles.mobileChapterNumber}>
                    {(index + 1).toLocaleString("fa-IR")}
                  </span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </nav>
          </div>
        </dialog>
      </div>

      <div className={styles.reportFlow}>
<section
          className={styles.flowSection}
          data-report-flow-section="full-report"
          id="report-full"
        >
          {LEGACY_ADAPTIVE_COMPATIBILITY_RENDER ? (
<header className={styles.flowSectionHeader} data-screenshot-ready>
            <p className={styles.eyebrow}>گزارش کامل چارت تولد</p>
            <h1>فصل‌های نجومی چارت تو</h1>
            <p>
              از امضای کلی چارت تا سیاره‌های شخصی، جنبه‌ها، گره‌های ماه و سنتز کل چارت؛
              هر فصل اول تجربهٔ انسانی را می‌گوید و بعد شواهد نجومی را در اختیار تو می‌گذارد.
            </p>
            <span>
              زمان تقریبی مطالعه: {contract.readingTime.natalMinutes.toLocaleString("fa-IR")} دقیقه
            </span>
          </header>
      ) : null}

          <div className={styles.fullReportStage}>
            <div className={styles.fullReportNarrative}>
              <ReportV3Experience
                accessMode={premiumBirthUnlocked ? "premium" : "free"}
                accessPolicy={accessPolicy}
                fullReportCredits={productAccess.access.balances.fullReport}
                onUnlockFullReport={() => productAccess.unlockReport(report.id)}
                renderAdaptiveOverview={false}
                report={report}
                readingContract={contract}
              />
            </div>
            <aside
              aria-label="چارت تولد همراه فصل‌های گزارش"
              className={styles.reportChartRail}
            >
              <div className={styles.reportChartRailSticky}>
                <span className={styles.reportChartRailLabel}>چارت زندهٔ فصل</span>
              </div>
            </aside>
          </div>
        </section>

        <section
          className={styles.flowSection}
          data-report-flow-section="sky"
          id="report-sky"
        >
          {/* HALLEUS_FREE_ALL_TRANSIT_FALLBACK_GUARD_COMPAT_20260815 */}
          {freeAllAccess ? (
            <HumanTransitReading data={transitData} exhaustive={freeAllAccess} />
          ) : (
            <HumanTransitReading data={transitData} />
          )}
        </section>



        <section
          className={styles.flowSection}
          data-report-flow-section="technical"
          id="report-chart"
        >
          <div className={styles.chartDetails} id="chart-details">
            <div className={styles.chartHeading} data-screenshot-ready>
              <p className={styles.eyebrow}>چارت و جزئیات نجومی</p>
              <h1>تمام داده‌های نجومی این گزارش</h1>
              <p>
                جایگاه‌ها، خانه‌ها، محورهای اصلی، جنبه‌ها، اورب‌ها و روش محاسبه در این بخش یک‌جا در دسترس‌اند.
              </p>
            </div>
            {transitData ? <StoredMomentDetails data={transitData} /> : null}
            {/* HALLEUS_FREE_ALL_TECHNICAL_APPENDIX_EXHAUSTIVE_R4_20260815 */}
            {technicalAppendixVisible ? (
              <ReportTechnicalAppendix
                contract={contract}
                exhaustive={freeAllAccess}
                report={report}
              />
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function cleanTransitNarrativeSurface(value: string): string {
  return value
    .replace(/^[^.؟!؛]*با زاویهٔ واقعی [^.؟!؛]+(?:رسیده|رسیده است)[؛.!؟]\s*/u, "")
    .replace(/^از نظر روایی،\s*/u, "")
    .replace(/^اینجا مسئله فقط حضور دو سیاره نیست:\s*/u, "")
    .replace(/در نتیجه نحوهٔ پاسخ [^.؟!]+ اهمیت پیدا می‌کند[.؟!]?/gu, "")
    .replace(/برای فهمیدن این تماس در زندگی روزمره،\s*/gu, "")
    .replace(/\s+در حوزهٔ [^؛.!؟]+[؛.]?/gu, ". ")
    .replace(/در چنین وضعی\s*/gu, "")
    .replace(/\s+([،؛.!؟])/gu, "$1")
    .replace(/([؛،])\s*([؛،])/gu, "$1")
    .replace(/؛\s*\./gu, ".")
    .replace(/\.\s*\./gu, ".")
    .replace(/([^.!؟])\s+(اصطکاک میان|میان دو نیرو|دو قطب روبه‌روی)/gu, "$1. $2")
    .replace(/[؛،]+\s*$/u, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

const TRANSIT_EDITORIAL_REWRITES: ReadonlyArray<readonly [string, string]> = [
  ["بدن فرصت پیدا کند علامتش را بدهد و بعد انتخاب انجام شود", "اول به واکنش بدن فرصت بده و بعد تصمیم بگیر"],
  ["موضوع با زبان دقیق و قابل بررسی بیان شود", "موضوع را دقیق و قابل بررسی بیان کن"],
  ["انرژی به اقدام روشن و اندازه‌دار تبدیل شود", "انرژی را به یک اقدام روشن و اندازه‌دار تبدیل کن"],
  ["خواست واقعی پیش از سازگار شدن با نگاه بیرونی نام برده شود", "پیش از سازگار شدن با نگاه بیرونی، خواست واقعی‌ات را نام ببر"],
  ["احساس حاضر و نیاز اصلی دو چیز جدا دیده شوند", "احساس لحظه‌ای را از نیاز اصلی جدا ببین"],
  ["موج احساس با خواستهٔ اصلی یکی گرفته نشود", "موج احساس را با خواستهٔ اصلی یکی نگیر"],
];

function naturalizeTransitDirective(value: string): string {
  let text = value;
  for (const [source, replacement] of TRANSIT_EDITORIAL_REWRITES) {
    text = text.replace(source, replacement);
  }
  return text;
}

function normalizeTransitToken(value: string): string {
  return value.replace(/[،؛.!؟:]+$/gu, "");
}

function sharedTransitPrefixLength(primary: string, secondary: string): number {
  const primaryTokens = primary.split(/\s+/u).filter(Boolean);
  const secondaryTokens = secondary.split(/\s+/u).filter(Boolean);
  let best = 0;

  for (let start = 0; start < primaryTokens.length; start += 1) {
    let matched = 0;
    while (
      start + matched < primaryTokens.length &&
      matched < secondaryTokens.length &&
      normalizeTransitToken(primaryTokens[start + matched]) ===
        normalizeTransitToken(secondaryTokens[matched])
    ) {
      matched += 1;
    }
    if (matched > best) best = matched;
  }

  return best;
}

function stripSharedTransitLead(primary: string, secondary: string): string {
  let result = secondary;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const secondaryTokens = result.split(/\s+/u).filter(Boolean);
    const shared = sharedTransitPrefixLength(primary, result);
    if (shared < 5 || shared >= secondaryTokens.length) break;

    const remainder = secondaryTokens
      .slice(shared)
      .join(" ")
      .replace(/^(?:و|اما)\s+/u, "")
      .replace(/^[،؛.\s]+/u, "")
      .trim();

    if (!remainder || remainder === result) break;
    result = remainder;
  }

  return result;
}

function compactTransitNarrativeUnit(value: string, limit = 1): string {
  const fragments = cleanTransitNarrativeSurface(value)
    .split(/(?<=[.؟!؛])\s+/u)
    .map((part) => part.trim().replace(/؛$/u, "."))
    .filter(Boolean);
  if (fragments.length <= limit) return fragments.join(" ");
  return fragments.slice(0, limit).join(" ");
}

const TRANSIT_REPEATED_PHRASE_VARIANTS: ReadonlyArray<{
  source: string;
  variants: readonly string[];
}> = [
  {
    source: "اول نیاز اصلی روشن شود و بعد پاسخ بیرونی بیاید",
    variants: [
      "اول نیاز اصلی روشن شود و بعد پاسخ بیرونی بیاید",
      "پاسخ بیرونی بعد از روشن شدن نیاز اصلی شکل بگیرد",
      "قبل از واکنش بیرونی، نیاز اصلی اسم پیدا کند",
    ],
  },
  {
    source: "نشانهٔ عملی‌تری از یک پیش‌بینی کلی است",
    variants: [
      "نشانهٔ عملی‌تری از یک پیش‌بینی کلی است",
      "برای خواندن این تماس از یک پیش‌بینی کلی قابل‌اتکاتر است",
      "به‌جای پیش‌بینی کلی، سرنخ روزمرهٔ روشن‌تری می‌دهد",
    ],
  },
  {
    source: "نیاز به اثبات خود یا واکنش به نگاه دیگران جای انتخاب واقعی را بگیرد",
    variants: [
      "نیاز به اثبات خود یا واکنش به نگاه دیگران جای انتخاب واقعی را بگیرد",
      "اثبات خود یا واکنش به نگاه دیگران انتخاب واقعی را عقب بزند",
      "نگاه بیرونی بیشتر از خواست واقعی جهت تصمیم را تعیین کند",
    ],
  },
];

function diversifyTransitRepeatedPhrases(value: string, sequenceIndex: number): string {
  let text = value;
  for (const entry of TRANSIT_REPEATED_PHRASE_VARIANTS) {
    if (!text.includes(entry.source)) continue;
    const replacement =
      entry.variants[sequenceIndex % entry.variants.length] ?? entry.source;
    text = text.replace(entry.source, replacement);
  }
  return text;
}

function surfaceTransitText(
  data: PersonalTransitReportDataBridge,
  aspect: PersonalTransitReportDataBridgeSelectedAspectSummary,
  purpose: "thesis" | "scene" | "strength" | "friction" | "development",
  text: string,
  index: number,
): string {
  return naturalizeTransitDirective(
    diversifyTransitRepeatedPhrases(
      cleanTransitNarrativeSurface(
        realizeReportSurfaceText(text, {
          reportKey: `${data.transitLocalDate ?? "stored"}:${data.location.currentResidenceTimezone ?? "unknown"}`,
          semanticKey: `transit:${aspect.transitBody}:${aspect.aspect}:${aspect.natalBody}:${purpose}`,
          purpose,
          sequenceIndex: index,
          presentation: "direct",
        }).text,
      ),
      index,
    ),
  );
}

// HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE5_TRANSIT_AST_R4_20260903
// HALLEUS_REPORT_MOBILE_EDITORIAL_REDESIGN_SLICE5_LOWER_REPORT_LAYER_R1_20260903
function HumanTransitReading({
  data,
  exhaustive = false,
}: {
  data: PersonalTransitReportDataBridge | null;
  exhaustive?: boolean;
}) {
  if (!data) {
    return (
      <section className={styles.transitView} data-report-current-sky-layer="slice5-20260903">
        <div className={styles.sectionHeading} data-screenshot-ready>
          <p className={styles.eyebrow}>آسمان و تو</p>
          <h1>این گزارش تصویر ترنزیت ذخیره‌شده ندارد</h1>
          <p>گزارش تولد کامل است؛ این بخش فقط وقتی نمایش تحلیلی دارد که دادهٔ ترنزیت همراه همان گزارش ثبت شده باشد.</p>
        </div>
      </section>
    );
  }
  const dateLabel = formatTransitLocalDate(data.transitLocalDate);
  const today = isTransitDateToday(data.transitLocalDate, data.location.currentResidenceTimezone);
  // HALLEUS_FREE_ALL_ALL_TRANSIT_ASPECTS_20260815
  const aspects = getVisibleTransitAspects(data, 6);
  const selectedAspectIds = new Set(aspects.map((aspect) => aspect.id));
  const remainingAspects = exhaustive
    ? data.aspectHighlights.filter((aspect) => !selectedAspectIds.has(aspect.id))
    : [];
  const missingResidence = data.status === "missing-current-residence";

  return (
    <section className={styles.transitView} data-report-reader-mode="stored-transit" data-report-current-sky-layer="slice5-20260903">
      <div className={styles.sectionHeading} data-screenshot-ready>
        <p className={styles.eyebrow}>آسمان و تو</p>
        <h1>{today ? "امروز کدام بخش‌های تو پررنگ‌ترند؟" : `در ${dateLabel} کدام بخش‌های تو پررنگ‌تر بود؟`}</h1>
        <p>
          {today
            ? "آسمان امروز را کنار چارت تولدت گذاشته‌ایم تا فقط تماس‌هایی را ببینی که الان بیشترین وزن را دارند؛ متن هر کارت کوتاه می‌ماند و جزئیات هندسی جدا زیر آن می‌آید."
            : `این تصویر در ${dateLabel} همراه گزارش ثبت شده است و با بازکردن دوباره تازه نمی‌شود؛ همیشه تصویر همان زمان را نگه می‌دارد.`}
        </p>
      </div>

      {missingResidence ? (
        <div className={styles.emptyTechnical}>
          برای ساختن این بخش، محل زندگی فعلی لازم است. گزارش تولد بدون آن همچنان کامل است.
        </div>
      ) : aspects.length > 0 ? (
        <>
          <div className={styles.transitPatternList}>
            {aspects.map((aspect, index) => {
              const thesis = compactTransitNarrativeUnit(
                surfaceTransitText(
                  data,
                  aspect,
                  "thesis",
                  aspect.interpretation.attention,
                  index,
                ),
                2,
              );
              const scene = compactTransitNarrativeUnit(
                surfaceTransitText(
                  data,
                  aspect,
                  "scene",
                  aspect.interpretation.scenario,
                  index,
                ),
                1,
              );
              const strength = compactTransitNarrativeUnit(
                stripSharedTransitLead(
                  thesis,
                  surfaceTransitText(
                    data,
                    aspect,
                    "strength",
                    aspect.interpretation.helpful,
                    index,
                  ),
                ),
                1,
              );
              const friction = compactTransitNarrativeUnit(
                surfaceTransitText(
                  data,
                  aspect,
                  "friction",
                  aspect.interpretation.friction,
                  index,
                ),
                1,
              );
              const development = compactTransitNarrativeUnit(
                surfaceTransitText(
                  data,
                  aspect,
                  "development",
                  aspect.interpretation.action,
                  index,
                ),
                1,
              );
              return (
                <article className={styles.transitPattern} data-screenshot-ready key={aspect.id}>
                  <span className={styles.patternNumber}>{(index + 1).toLocaleString("fa-IR")}</span>
                  <div>

                    <h2>{aspect.interpretation.theme}</h2>
                    <p data-report-inline-transit data-report-transit-narrative-attention="before-technical">
                      {joinReportNarrativeSentences([thesis, scene])}
                    </p>
                    <p
                      className={styles.transitTechnicalLine}
                      data-report-transit-technical-line="after-narrative"
                    >
                      {formatTransitAstrologyLabel(aspect)}
                    </p>
                    <p>
                      {joinReportNarrativeSentences([
                        strength,
                        friction,
                        development,
                      ])}
                    </p>
                    <p className={styles.readingMetadata} data-report-inline-evidence>
                      {aspect.interpretation.technicalDetail}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
          {remainingAspects.length > 0 ? (
            <details className={styles.readingMetadata} data-all-active-transits>
              <summary>
                همهٔ ترنزیت‌های فعال ({data.aspectHighlights.length.toLocaleString("fa-IR")})
              </summary>
              <dl>
                {remainingAspects.map((aspect) => (
                  <div key={`remaining-${aspect.id}`}>
                    <dt>{formatTransitAstrologyLabel(aspect)}</dt>
                    <dd>
                      {buildPersonalTransitBehavioralInterpretation(
                        aspect,
                        data.audienceMode ?? "adult",
                      ).technicalDetail}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </>
      ) : (
        <div className={styles.emptyTechnical}>
          در این تصویر، تماس نزدیک و پررنگی انتخاب نشد. این یعنی لازم نیست برای این لحظه معنای مصنوعی بسازیم.
        </div>
      )}
      {exhaustive ? <PersonalTransitEngineInventory data={data} /> : null}
    </section>
  );
}

function PersonalTransitEngineInventory({
  data,
}: {
  data: PersonalTransitReportDataBridge;
}) {
  const natalBodies = data.bodies?.natal ?? [];
  const transitBodies = data.bodies?.transit ?? [];
  if (natalBodies.length === 0 && transitBodies.length === 0) return null;

  return (
    <details
      className={styles.readingMetadata}
      data-personal-transit-engine-inventory="all"
    >
      <summary>{"تمام جایگاه‌های محاسبه‌شده ترنزیت"}</summary>
      {[
        { id: "natal", label: "بدنه‌های تولد", bodies: natalBodies },
        { id: "transit", label: "بدنه‌های ترنزیت", bodies: transitBodies },
      ].map((group) => (
        <div key={group.id}>
          <strong>{group.label}</strong>
          <dl>
            {group.bodies.map((body) => (
              <div key={group.id + "-" + body.id}>
                <dt>{TRANSIT_BODY_LABELS[body.id] ?? body.label}</dt>
                <dd>
                  {TRANSIT_SIGN_LABELS[body.signId] ?? body.signId}{" · درجه "}
                  {body.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}
                  {"° · طول دایره‌البروجی "}
                  {body.longitude.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}
                  {"° · حرکت "}{formatTransitMotionLabel(body.motion.status)}{" · سرعت روزانه "}
                  {body.motion.arcDegreesPerDay.toLocaleString("fa-IR", { maximumFractionDigits: 4 })}
                  {"° · بازهٔ نمونه "}
                  {body.motion.sampleWindowHours.toLocaleString("fa-IR")}{" ساعت"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </details>
  );
}

function StoredMomentDetails({ data }: { data: PersonalTransitReportDataBridge }) {
  return (
    <details className={styles.readingMetadata}>
      <summary>اطلاعات این خوانش</summary>
      <dl>
        <div><dt>محل تولد</dt><dd>{data.location.birthPlaceName ?? "ثبت نشده"}</dd></div>
        <div><dt>محل زندگی هنگام ساخت گزارش</dt><dd>{data.location.currentResidencePlaceName ?? "ثبت نشده"}</dd></div>
        <div><dt>زمان ثبت</dt><dd>{formatTransitMoment(data.transitLocalDate, data.sampleLocalTime)}</dd></div>
      </dl>
    </details>
  );
}

function getVisibleTransitAspects(
  data: PersonalTransitReportDataBridge,
  maxVisible = 6,
): PersonalTransitReportDataBridgeSelectedAspectSummary[] {
  if (Array.isArray(data.visibleAspectHighlights)) {
    const stored = data.visibleAspectHighlights.slice(0, maxVisible);
    if (stored.length >= Math.min(maxVisible, data.aspectHighlights.length)) {
      return stored;
    }
  }

  return selectPersonalTransitHighlights(data.aspectHighlights, {
    audienceMode: data.audienceMode ?? "adult",
    maxVisible,
  }).map((aspect) => ({
    ...aspect,
    relevanceScore: 0,
    interpretation: buildPersonalTransitBehavioralInterpretation(
      aspect,
      data.audienceMode ?? "adult",
    ),
  }));
}

function isTransitDateToday(localDate: string | null | undefined, timeZone: string | null | undefined) {
  if (!localDate) return false;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timeZone || undefined }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}` === localDate;
  } catch {
    return false;
  }
}

function formatTransitMoment(localDate: string | null | undefined, sampleLocalTime: string | null | undefined) {
  const date = formatTransitLocalDate(localDate);
  return sampleLocalTime ? `${date}، ساعت ${sampleLocalTime.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])}` : date;
}

function formatTransitLocalDate(localDate: string | null | undefined) {
  if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return "زمان ساخت گزارش";
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}
