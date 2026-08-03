"use client";

import { useState, type ReactNode } from "react";
import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import {
  buildTechnicalAspectRows,
  type LiveReportReadingContract,
} from "@/lib/report-output/live-report-reading-contract";
import { humanizeVisibleText } from "@/lib/report-output/human-first-report-reading";
import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportAspect,
  RealEngineReportHouse,
  RealEngineReportPlacement,
} from "@/types/astro";
import styles from "./human-first-report.module.css";

type AstrologyTab =
  | "placements"
  | "houses"
  | "aspects"
  | "axes"
  | "context";

const ASTROLOGY_TABS: Array<{ id: AstrologyTab; label: string }> = [
  { id: "placements", label: "جایگاه‌ها" },
  { id: "houses", label: "خانه‌ها" },
  { id: "aspects", label: "رابطه‌های زاویه‌ای" },
  { id: "axes", label: "محورهای اصلی" },
  { id: "context", label: "مبنای خوانش" },
];

const HOUSE_FIELD_LABELS: Record<number, string> = {
  1: "بدن، تصویر بیرونی و شروع",
  2: "ارزش، امنیت و منابع",
  3: "ذهن، یادگیری و ارتباط",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و مراقبت",
  7: "رابطه و شراکت",
  8: "اعتماد، صمیمیت و دگرگونی",
  9: "معنا، سفر و جهان‌بینی",
  10: "مسیر اجتماعی و اثر بیرونی",
  11: "دوستی‌ها، جمع‌ها و آینده",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const ANGLE_LABELS: Record<string, string> = {
  asc: "ASC / رایزینگ",
  dsc: "DSC / نقطهٔ روبه‌رو",
  mc: "MC / میانهٔ آسمان",
  ic: "IC / ریشهٔ آسمان",
};

export function ReportTechnicalAppendix({
  report,
  contract,
}: {
  report: AstrologyReport;
  contract: LiveReportReadingContract;
}) {
  const [activeTab, setActiveTab] =
    useState<AstrologyTab>("placements");
  const chartData = report.realEngine;
  const placements = chartData?.placements ?? [];
  const houses = chartData?.houses ?? [];
  const aspects = chartData?.aspects ?? [];
  const angles = chartData?.angles ? Object.values(chartData.angles) : [];

  return (
    <section
      className={styles.technicalAppendix}
      data-report-technical-appendix="placements-houses-aspects-axes-method"
      data-human-first-technical-appendix="complete-astrology-details"
      aria-labelledby="report-astrology-details-title"
    >
      <details className={styles.technicalDisclosure}>
        <summary className={styles.technicalHeading}>
          <span className={styles.eyebrow}>جزئیات نجومی</span>
          <h2 id="report-astrology-details-title">
            همهٔ جایگاه‌ها و زاویه‌ها در یک نگاه
          </h2>
          <p>
            اینجا همهٔ جایگاه‌ها، خانه‌ها، محورهای اصلی، جنبه‌ها و اورب‌ها را یک‌جا می‌بینی.
          </p>
        </summary>

        <div className={styles.technicalContent}>
          <div
            className={styles.technicalTabs}
            role="tablist"
            aria-label="جزئیات کامل چارت"
          >
            {ASTROLOGY_TABS.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                data-active={activeTab === tab.id}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.technicalPanel} role="tabpanel">
            {activeTab === "placements" ? (
              <PlacementTable placements={placements} />
            ) : null}
            {activeTab === "houses" ? (
              <HouseTable
                hasReliableBirthTime={contract.hasReliableBirthTime}
                houses={houses}
                houseAvailability={chartData?.houseContext?.availability}
                houseSystem={chartData?.houseSystem}
              />
            ) : null}
            {activeTab === "aspects" ? (
              <AspectTable aspects={aspects} />
            ) : null}
            {activeTab === "axes" ? (
              <AxisTable
                angles={angles}
                hasReliableBirthTime={contract.hasReliableBirthTime}
              />
            ) : null}
            {activeTab === "context" ? (
              <ContextPanel contract={contract} report={report} />
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}

function PlacementTable({
  placements,
}: {
  placements: RealEngineReportPlacement[];
}) {
  if (placements.length === 0) {
    return (
      <EmptyTechnicalState>
        جایگاه نجومی قابل نمایش در این گزارش ثبت نشده است.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="placements">
      <div className={styles.dataHead}>
        <span>سیاره یا نقطه</span>
        <span>نشان و درجه</span>
        <span>خانه</span>
      </div>
      {placements.map((placement) => (
        <div className={styles.dataRow} key={placement.id}>
          <strong>{placement.label}</strong>
          <span>
            {formatZodiacLabel(placement.signId)}،{" "}
            {formatDegree(placement.degreeInSign)}
          </span>
          <span>
            {typeof placement.house === "number"
              ? `خانه ${formatPersianNumber(placement.house)}`
              : "وابسته به ساعت تولد نیست یا ثبت نشده"}
          </span>
        </div>
      ))}
    </div>
  );
}

function HouseTable({
  houses,
  hasReliableBirthTime,
  houseSystem,
  houseAvailability,
}: {
  houses: RealEngineReportHouse[];
  hasReliableBirthTime: boolean;
  houseSystem?: string;
  houseAvailability?: "ready" | "unavailable";
}) {
  if (!hasReliableBirthTime) {
    return (
      <EmptyTechnicalState>
        چون ساعت تولد دقیق نیست، درباره رایزینگ و خانه‌ها نتیجه‌گیری نشده؛
        بخش‌های مستقل از ساعت همچنان بررسی شده‌اند.
      </EmptyTechnicalState>
    );
  }

  if (houses.length !== 12) {
    return (
      <EmptyTechnicalState>
        {houseSystem === "placidus" && houseAvailability === "unavailable"
          ? "برای این موقعیت تولد، جدول کامل خانه‌های پلاسیدوس به دست نیامده و خانه‌ای جای آن حدس زده نشده است."
          : "جدول کامل دوازده خانه همراه این گزارش ثبت نشده است."}
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="houses">
      <div className={styles.dataHead}>
        <span>خانه</span>
        <span>شروع خانه</span>
        <span>میدان زندگی</span>
      </div>
      {houses.map((house) => (
        <div className={styles.dataRow} key={house.number}>
          <strong>خانه {formatPersianNumber(house.number)}</strong>
          <span>
            {formatZodiacLabel(house.signId)}،{" "}
            {formatDegree(house.degreeInSign)}
          </span>
          <span>
            {HOUSE_FIELD_LABELS[house.number] ?? "میدان ثبت‌شدهٔ چارت"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AspectTable({ aspects }: { aspects: RealEngineReportAspect[] }) {
  const rows = buildTechnicalAspectRows(aspects);

  if (rows.length === 0) {
    return (
      <EmptyTechnicalState>
        رابطهٔ زاویه‌ای اصلی برای نمایش در این گزارش ثبت نشده است.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="aspects">
      <div className={`${styles.dataHead} ${styles.aspectHead}`}>
        <span>دو نقطه</span>
        <span>نوع رابطه</span>
        <span>فاصلهٔ زاویه‌ای</span>
        <span>اورب</span>
      </div>
      {rows.map((row) => (
        <div
          className={`${styles.dataRow} ${styles.aspectRow}`}
          key={row.id}
        >
          <strong>{row.planets}</strong>
          <span>
            {row.type} ({formatDegree(row.exactAngle)})
          </span>
          <span>{formatDegree(row.separation)}</span>
          <span>{formatDegree(row.orb)}</span>
        </div>
      ))}
    </div>
  );
}

function AxisTable({
  angles,
  hasReliableBirthTime,
}: {
  angles: RealEngineReportAngle[];
  hasReliableBirthTime: boolean;
}) {
  if (!hasReliableBirthTime || angles.length === 0) {
    return (
      <EmptyTechnicalState>
        چون ساعت تولد دقیق نیست، رایزینگ و محورهای وابسته به زمان نمایش داده
        نمی‌شوند؛ جایگاه‌های مستقل از ساعت همچنان در دسترس‌اند.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="axes">
      <div className={styles.dataHead}>
        <span>محور</span>
        <span>نشان و درجه</span>
        <span>خانه</span>
      </div>
      {angles.map((angle) => (
        <div className={styles.dataRow} key={angle.id}>
          <strong>{ANGLE_LABELS[angle.id] ?? angle.label}</strong>
          <span>
            {formatZodiacLabel(angle.signId)}،{" "}
            {formatDegree(angle.degreeInSign)}
          </span>
          <span>
            {typeof angle.house === "number"
              ? `خانه ${formatPersianNumber(angle.house)}`
              : "ثبت نشده"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ContextPanel({
  report,
  contract,
}: {
  report: AstrologyReport;
  contract: LiveReportReadingContract;
}) {
  const chartData = report.realEngine;
  const readableLimitations = buildReadableLimitations(contract);

  return (
    <div className={styles.contextPanel}>
      <dl className={styles.contextFacts}>
        <div>
          <dt>نام انتخابی</dt>
          <dd>{report.input.name?.trim() || "ثبت نشده"}</dd>
        </div>
        <div>
          <dt>تاریخ تولد</dt>
          <dd>{report.input.birthDate || "ثبت نشده"}</dd>
        </div>
        <div>
          <dt>ساعت تولد</dt>
          <dd>
            {contract.hasReliableBirthTime
              ? report.input.birthTime
              : "دقیق نیست"}
          </dd>
        </div>
        <div>
          <dt>محل تولد</dt>
          <dd>
            {[report.input.birthCity, report.input.birthCountry]
              .filter(Boolean)
              .join("، ") || "ثبت نشده"}
          </dd>
        </div>
        <div>
          <dt>منطقه زمانی</dt>
          <dd>{report.input.birthTimezone || "همراه گزارش ثبت نشده"}</dd>
        </div>
        <div>
          <dt>خانه‌ها</dt>
          <dd>{formatHouseSystem(chartData?.houseSystem)}</dd>
        </div>
      </dl>

      {readableLimitations.length > 0 ? (
        <details className={styles.limitationsDisclosure}>
          <summary>حدود این خوانش</summary>
          <ul>
            {readableLimitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className={styles.evidenceList}>
        <h3>این خوانش از کجای چارت آمده است؟</h3>
        {contract.evidenceReferences.map((evidence) => (
          <div key={evidence.id}>
            <strong>{humanizeVisibleLabel(evidence.label)}</strong>
            <span>{humanizeVisibleLabel(evidence.detail)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTechnicalState({ children }: { children: ReactNode }) {
  return (
    <div className={styles.emptyTechnical} role="note">
      {children}
    </div>
  );
}

function buildReadableLimitations(
  contract: LiveReportReadingContract,
): string[] {
  const values = contract.hasReliableBirthTime
    ? []
    : [
        "چون ساعت تولد دقیق نیست، درباره رایزینگ و خانه‌ها نتیجه‌گیری نشده؛ بخش‌های مستقل از ساعت همچنان بررسی شده‌اند.",
      ];

  for (const limitation of contract.limitations) {
    const internalOnly =
      /\b(?:engine|runtime|snapshot|fixture|contract|ranking)\b|feature disabled|partial data|disabled/iu.test(
        limitation,
      );
    const human = humanizeLimitation(limitation)
      .replace(/^[:؛،\-\s]+/u, "")
      .replace(/[\s:؛،\-]+$/u, "")
      .trim();

    if (!human) continue;
    if (!contract.hasReliableBirthTime && /ساعت تولد|رایزینگ و خانه‌ها/u.test(human)) {
      continue;
    }
    if (internalOnly && human.length < 36) continue;
    values.push(human);
  }

  return [...new Set(values)];
}

function humanizeLimitation(value: string) {
  return humanizeVisibleLabel(value)
    .replace(
      /زاویه‌ها، حاکم چارت و خانه‌ها[^.؟!]*/gu,
      "رایزینگ و خانه‌ها در این خوانش وارد نتیجه‌گیری نشده‌اند",
    )
    .replace(
      /تعداد جایگاه‌های سیاره‌ای محدود[^.؟!]*/gu,
      "این خوانش فقط از جایگاه‌هایی استفاده کرده که همراه گزارش ثبت شده‌اند",
    );
}

function humanizeVisibleLabel(value: string) {
  return humanizeVisibleText(value)
    .replace(/legacy\s*\/\s*fallback/giu, "")
    .replace(/[\s\u00a0]+/gu, " ")
    .trim();
}

function formatDegree(value: number): string {
  return `${formatPersianNumber(value)}°`;
}

function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatHouseSystem(system: string | undefined): string {
  if (system === "placidus") return "پلاسیدوس";
  if (system === "whole-sign") return "نشانهٔ کامل";
  if (system === "equal-house") return "خانه‌های مساوی";
  return "همراه این گزارش مشخص نشده";
}
