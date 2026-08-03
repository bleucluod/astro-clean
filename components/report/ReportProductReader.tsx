"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import {
  ReportReadingNavigation,
  type ReportReaderMode,
} from "@/components/report/ReportReadingNavigation";
import { ReportTechnicalAppendix } from "@/components/report/ReportTechnicalAppendix";
import styles from "./human-first-report.module.css";

type ReportWithTransit = AstrologyReport & {
  engineData?: {
    personalTransitReportData?: PersonalTransitReportDataBridge | null;
  } | null;
};

export function ReportProductReader({ report }: { report: AstrologyReport }) {
  const contract = useMemo(() => buildLiveReportReadingContract(report), [report]);
  const transitData = useMemo(
    () => (report as ReportWithTransit).engineData?.personalTransitReportData ?? null,
    [report],
  );
  const initialProgress = getReportReadingProgress("reader", report.id);
  const [mode, setMode] = useState<ReportReaderMode>("natal");
  const [activeSection, setActiveSection] = useState<ReportReadingSectionId>(
    initialProgress?.sectionId ?? "overview",
  );

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      const progress = getReportReadingProgress("reader", report.id);
      setActiveSection(progress?.sectionId ?? "overview");
    });
    return () => window.cancelAnimationFrame(restoreFrame);
  }, [report.id]);

  useEffect(() => {
    if (mode !== "natal") return;
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
  }, [mode, report.id]);

  function navigateTo(sectionId: ReportReadingSectionId) {
    setMode("natal");
    setActiveSection(sectionId);
    saveReportReadingProgress("reader", report.id, sectionId);
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <section className={styles.reader} data-report-product-reader="human-first-report-experience">
      <div className={styles.desktopModeSwitch} role="tablist" aria-label="بخش‌های اصلی گزارش">
        <ModeButton active={mode === "natal"} onClick={() => setMode("natal")}>گزارش تولد</ModeButton>
        <ModeButton active={mode === "transit"} disabled={!transitData} onClick={() => setMode("transit")}>آسمان و تو</ModeButton>
        <ModeButton active={mode === "technical"} onClick={() => setMode("technical")}>چارت و جزئیات</ModeButton>
      </div>

      {mode !== "natal" ? (
        <ReportReadingNavigation
          activeSection={activeSection}
          hasTransit={Boolean(transitData)}
          mode={mode}
          navigation={HUMAN_FIRST_REPORT_NAVIGATION}
          onModeChange={setMode}
          onNavigate={navigateTo}
        />
      ) : null}

      {mode === "natal" ? (
        <div className={styles.readerLayout}>
          <ReportReadingNavigation
            activeSection={activeSection}
            hasTransit={Boolean(transitData)}
            mode={mode}
            navigation={HUMAN_FIRST_REPORT_NAVIGATION}
            onModeChange={setMode}
            onNavigate={navigateTo}
            showDesktop
          />
          <div className={styles.readingColumn}>
            <p className={styles.readingTimeLine}>
              زمان تقریبی مطالعه: {contract.readingTime.natalMinutes.toLocaleString("fa-IR")} دقیقه
            </p>
            <ReportV3Experience report={report} readingContract={contract} />
          </div>
        </div>
      ) : null}

      {mode === "transit" ? (
        <HumanTransitReading data={transitData} />
      ) : null}

      {mode === "technical" ? (
        <section className={styles.chartDetails} id="chart-details">
          <div className={styles.chartHeading}>
            <p className={styles.eyebrow}>چارت و جزئیات</p>
            <h1>تمام داده‌های نجومی این گزارش</h1>
            <p>چرخ، جایگاه‌ها، خانه‌ها، محورهای اصلی، جنبه‌ها و اورب‌ها در این بخش یک‌جا در دسترس‌اند.</p>
          </div>
          {transitData ? <StoredMomentDetails data={transitData} /> : null}
          <div className={styles.wheelShell}><ReportBirthChartWheel report={report} /></div>
          <ReportTechnicalAppendix contract={contract} report={report} />
        </section>
      ) : null}
    </section>
  );
}

function ModeButton({ active, disabled = false, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button aria-selected={active} data-active={active} disabled={disabled} onClick={onClick} role="tab" type="button">{children}</button>;
}

function HumanTransitReading({ data }: { data: PersonalTransitReportDataBridge | null }) {
  if (!data) {
    return <section className={styles.transitView}><div className={styles.emptyTechnical}>این بخش همراه گزارش فعلی ساخته نشده است.</div></section>;
  }
  const dateLabel = formatTransitLocalDate(data.transitLocalDate);
  const today = isTransitDateToday(data.transitLocalDate, data.location.currentResidenceTimezone);
  const aspects = getVisibleTransitAspects(data).slice(0, 3);
  const missingResidence = data.status === "missing-current-residence";

  return (
    <section className={styles.transitView} data-report-reader-mode="stored-transit">
      <div className={styles.sectionHeading}>
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
            <article className={styles.transitPattern} key={aspect.id}>
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
