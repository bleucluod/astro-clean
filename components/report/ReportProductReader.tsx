"use client";

import { useEffect, useMemo, useState } from "react";
import { ReportBirthChartWheel } from "@/components/ReportBirthChartWheel";
import { ReportV3Experience } from "@/components/ReportV3Experience";
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
import styles from "./human-first-report.module.css";

type ReportWithTransit = AstrologyReport & {
  engineData?: {
    personalTransitReportData?: PersonalTransitReportDataBridge | null;
  } | null;
};

const FLOW_SECTIONS = [
  { id: "report-summary", label: "خلاصهٔ چارت" },
  { id: "report-full", label: "گزارش کامل چارت تولد" },
  { id: "report-sky", label: "آسمان و تو" },
  { id: "report-chart", label: "چارت و جزئیات" },
] as const;

const LEGACY_ADAPTIVE_COMPATIBILITY_RENDER = false;

export function ReportProductReader({ report, storedAccessTier = null, initialAccessPolicy }: { report: AstrologyReport; storedAccessTier?: string | null; initialAccessPolicy?: ReportAccessPolicy }) {
  const productAccess = useProductAccess(report.id);
  // HALLEUS_FREE_ALL_BIRTH_REPORT_BATCH1_R1
  const accessPolicy =
    productAccess.status === "loading" && initialAccessPolicy
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
    "report-summary",
  );
  const activeSectionLabel = useMemo(
    () =>
      HUMAN_FIRST_REPORT_NAVIGATION.find((item) => item.id === activeSection)?.label ??
      "امضای چارت",
    [activeSection],
  );

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
    >
      <div aria-hidden="true" className={styles.ambientLogo} data-report-ambient-logo="parallax" />
      <details
        className={styles.journeyNavigator}
        data-report-journey-navigator
      >
        <summary>
          <span>فهرست گزارش</span>
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

      <div className={styles.reportFlow}>
        <section
          className={styles.flowSection}
          data-report-flow-section="summary"
          id="report-summary"
        >
          {LEGACY_ADAPTIVE_COMPATIBILITY_RENDER ? (
<FiveMinuteReportSummary
            contract={contract}
            onOpenFullReport={navigateTo}
          />
          ) : null}
        </section>

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
          <HumanTransitReading data={transitData} />
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
                چرخ، جایگاه‌ها، خانه‌ها، محورهای اصلی، جنبه‌ها و اورب‌ها در این بخش یک‌جا در دسترس‌اند.
              </p>
            </div>
            {transitData ? <StoredMomentDetails data={transitData} /> : null}
            <div className={styles.wheelShell} data-screenshot-ready>
              <ReportBirthChartWheel report={report} />
            </div>
            {technicalAppendixVisible ? (
              <ReportTechnicalAppendix contract={contract} report={report} />
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function HumanTransitReading({ data }: { data: PersonalTransitReportDataBridge | null }) {
  if (!data) {
    return (
      <section className={styles.transitView}>
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
  const aspects = getVisibleTransitAspects(data).slice(0, 3);
  const missingResidence = data.status === "missing-current-residence";

  return (
    <section className={styles.transitView} data-report-reader-mode="stored-transit">
      <div className={styles.sectionHeading} data-screenshot-ready>
        <p className={styles.eyebrow}>آسمان و تو</p>
        <h1>{today ? "امروز کدام بخش‌های تو پررنگ‌ترند؟" : `در ${dateLabel} کدام بخش‌های تو پررنگ‌تر بود؟`}</h1>
        <p>
          {today
            ? "آسمان امروز را کنار چارت تولدت گذاشته‌ایم تا ببینی این روزها کدام بخش‌های تو بیشتر به حرکت، توجه یا تغییر دعوت می‌شوند."
            : `این تصویر در ${dateLabel} همراه گزارش ثبت شده است و با بازکردن دوباره تازه نمی‌شود؛ همیشه تصویر همان زمان را نگه می‌دارد.`}
        </p>
      </div>

      {missingResidence ? (
        <div className={styles.emptyTechnical}>
          برای ساختن این بخش، محل زندگی فعلی لازم است. گزارش تولد بدون آن همچنان کامل است.
        </div>
      ) : aspects.length > 0 ? (
        <div className={styles.transitPatternList}>
          {aspects.map((aspect, index) => (
            <article className={styles.transitPattern} data-screenshot-ready key={aspect.id}>
              <span className={styles.patternNumber}>{(index + 1).toLocaleString("fa-IR")}</span>
              <div>
                <h2>{aspect.interpretation.theme}</h2>
                <p>{aspect.interpretation.attention}</p>
                <div className={styles.transitMoment}>
                  <strong>ممکن است چطور خودش را نشان دهد؟</strong>
                  <p>{aspect.interpretation.scenario}</p>
                </div>
                <div className={styles.transitBalance}>
                  <p><strong>وقتی خوب استفاده می‌شود</strong>{aspect.interpretation.helpful}</p>
                  <p><strong>وقتی سخت می‌شود</strong>{aspect.interpretation.friction}</p>
                </div>
                <div className={styles.practiceLine}>
                  <strong>یک حرکت کوچک</strong>
                  <p>{aspect.interpretation.action}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyTechnical}>
          در این تصویر، تماس نزدیک و پررنگی انتخاب نشد. این یعنی لازم نیست برای این لحظه معنای مصنوعی بسازیم.
        </div>
      )}
    </section>
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

function getVisibleTransitAspects(data: PersonalTransitReportDataBridge): PersonalTransitReportDataBridgeSelectedAspectSummary[] {
  if (Array.isArray(data.visibleAspectHighlights)) return data.visibleAspectHighlights.slice(0, 3);
  return selectPersonalTransitHighlights(data.aspectHighlights, { audienceMode: data.audienceMode ?? "adult", maxVisible: 3 }).map((aspect) => ({
    ...aspect,
    relevanceScore: 0,
    interpretation: buildPersonalTransitBehavioralInterpretation(aspect, data.audienceMode ?? "adult"),
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
