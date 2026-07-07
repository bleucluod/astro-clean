"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { RealChartWheel } from "@/components/RealChartWheel";
import { ReportV3Experience } from "@/components/ReportV3Experience";
import { getReportRepository } from "@/lib/storage/report-repository";
import {
  getAccountReportRecord,
  getPublicReportRecord,
} from "@/lib/storage/account-report-read-client";
import {
  formatZodiacLabel,
  formatZodiacSign,
  normalizeLongitude,
  zodiacSignFromLongitude,
} from "@/lib/astrology/zodiac-labels";
import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportAspect,
  RealEngineReportCalculatedLunarNodes,
  RealEngineReportHouse,
  RealEngineReportLunarNodes,
  RealEngineReportPlacement,
} from "@/types/astro";

type ReportDetailProps = {
  reportId: string;
  reportSource?: ReportDetailSource;
  initialReport?: AstrologyReport | null;
  initialMessage?: string;
};

type ReportDetailSource = "local" | "beta-db" | "account" | "public";

type BetaDatabaseReadResponse = {
  ok?: boolean;
  error?: string;
  reportRecord?: {
    report?: AstrologyReport;
    note?: string | null;
    favorite?: boolean | null;
  };
};

type ReportReadingStats = {
  displayName: string;
  aspectCount: number;
  houseCount: number;
  placementCount: number;
  hasRealEngine: boolean;
};

type BirthDataItem = {
  label: string;
  value: string;
};

type PillarCard = {
  id: string;
  title: string;
  body: string;
  detail: string;
};

type MoonPhaseSummary = {
  title: string;
  angleLabel: string;
};

type AngleSummary = {
  id: string;
  title: string;
  position: string;
  house: string;
  meaning: string;
};

type LunarNodeSummary = {
  id: string;
  title: string;
  position: string;
  house: string;
  meaning: string;
};

type EnergySummary = {
  title: string;
  value: string;
};

const reportRepository = getReportRepository();
const isBetaDatabaseSaveUiEnabled =
  process.env.NEXT_PUBLIC_HALLEUS_ENABLE_BETA_DB_SAVE_UI === "true";

const PLANET_LABELS_FA: Record<string, string> = {
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

const HOUSE_FIELD_LABELS: Record<number, string> = {
  1: "بدن، تصویر بیرونی و شروع‌های شخصی",
  2: "ارزش، امنیت و منابع",
  3: "ذهن، یادگیری و ارتباط نزدیک",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و مراقبت",
  7: "رابطه یک‌به‌یک و شراکت",
  8: "اعتماد، صمیمیت عمیق و دگرگونی",
  9: "معنا، سفر و جهان‌بینی",
  10: "مسیر اجتماعی، مسئولیت و اثر بیرونی",
  11: "دوستی‌ها، جمع‌ها و آینده‌سازی",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const ANGLE_COPY: Record<string, { title: string; meaning: string }> = {
  asc: { title: "ASC / رایزینگ", meaning: "ورود به جهان و تصویر اولیه" },
  dsc: { title: "DSC / نقطه روبه‌رو", meaning: "رابطه و آینه‌های نزدیک" },
  mc: { title: "MC / میانه آسمان", meaning: "مسیر بیرونی و اثر اجتماعی" },
  ic: { title: "IC / ریشه آسمان", meaning: "ریشه درونی و خانه روان" },
};

const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat("fa-IR");

const MOON_PHASES = [
  { from: 337.5, to: 22.5, title: "ماه نو" },
  { from: 22.5, to: 67.5, title: "هلال افزاینده" },
  { from: 67.5, to: 112.5, title: "تربیع اول" },
  { from: 112.5, to: 157.5, title: "کوژماه افزاینده" },
  { from: 157.5, to: 202.5, title: "ماه کامل" },
  { from: 202.5, to: 247.5, title: "کوژماه کاهنده" },
  { from: 247.5, to: 292.5, title: "تربیع آخر" },
  { from: 292.5, to: 337.5, title: "هلال کاهنده" },
] as const;

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("halleus-data-changed"));
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function buildReportReadingStats(report: AstrologyReport): ReportReadingStats {
  const displayName = report.input.name?.trim() || "این گزارش";
  const realEngine = report.realEngine;

  return {
    displayName,
    aspectCount: realEngine?.aspects?.length ?? 0,
    houseCount: realEngine?.houses?.length ?? 0,
    placementCount: realEngine?.placements?.length ?? 0,
    hasRealEngine: Boolean(realEngine),
  };
}

function sanitizeReportVisibleCopy(report: AstrologyReport): AstrologyReport {
  return sanitizeVisibleReportValue(report) as AstrologyReport;
}

function sanitizeVisibleReportValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeVisibleReportText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeVisibleReportValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeVisibleReportValue(item),
      ]),
    );
  }

  return value;
}

function sanitizeVisibleReportText(value: string): string {
  return value
    .replace(/Mean North Node/g, "دست شمالی ماه با مدل میانگین")
    .replace(/Mean South Node/g, "دست جنوبی ماه با مدل میانگین")
    .replace(/Mean Lunar Node/g, "دست‌های ماه با مدل میانگین")
    .replace(/Mean Node/g, "دست‌های ماه با مدل میانگین")
    .replace(/True\/Osculating Node/g, "مدل نوسانی/واقعی دست‌های ماه")
    .replace(/Osculating Node/g, "مدل نوسانی دست‌های ماه")
    .replace(/True Node/g, "مدل واقعی دست‌های ماه")
    .replace(/Black Moon Lilith/g, "لیلیت")
    .replace(/Lilith/g, "لیلیت")
    .replace(/Whole Sign/g, "روش نشانه کامل")
    .replace(/snapshot/g, "داده ذخیره‌شده")
    .replace(/real engine/g, "چارت واقعی محاسبه‌شده")
    .replace(/Retrograde/g, "حرکت برگشتی")
    .replace(/retrograde/g, "حرکت برگشتی")
    .replace(/motion/g, "وضعیت حرکت")
    .replace(/aspect/g, "رابطه سیاره‌ای")
    .replace(/read-only/g, "فقط خواندنی")
    .replace(/noindex/g, "خارج از ایندکس")
    .replace(/indexable/g, "قابل ایندکس")
    .replace(/claim/g, "ادعا")
    .replace(/timezone/g, "منطقه زمانی")
    .replace(/فرمول دست‌های ماه با مدل میانگین/g, "مدل میانگین")
    .replace(/مخالفت دقیق با دست شمالی ماه با مدل میانگین/g, "مقابل دقیق دست شمالی ماه");
}

function formatPersianNumber(value: number) {
  return PERSIAN_NUMBER_FORMATTER.format(value);
}

function formatDegree(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}°`;
}

function formatList(items: string[]) {
  return items.filter(Boolean).join("، ");
}

function parseBirthDateParts(value: string | undefined) {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/u);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseBirthTimeParts(value: string | undefined) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})$/u);

  if (!match) {
    return { hour: 0, minute: 0, isKnown: false };
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    isKnown: true,
  };
}

function formatBirthDatePersian(report: AstrologyReport) {
  const parts = parseBirthDateParts(report.input.birthDate);

  if (!parts) {
    return "نامشخص";
  }

  return new Date(parts.year, parts.month - 1, parts.day).toLocaleDateString("fa-IR-u-ca-persian");
}

function buildBirthMoment(report: AstrologyReport) {
  const parts = parseBirthDateParts(report.input.birthDate);

  if (!parts) {
    return null;
  }

  if (report.realEngine?.utcIso) {
    const utcDate = new Date(report.realEngine.utcIso);

    if (!Number.isNaN(utcDate.getTime())) {
      return utcDate;
    }
  }

  const time = parseBirthTimeParts(report.input.birthTime);
  const date = new Date(parts.year, parts.month - 1, parts.day, time.hour, time.minute, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

function diffCalendarParts(from: Date, to: Date) {
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(totalHours / 24);
  const years = Math.floor(totalDays / 365.2425);
  const daysAfterYears = totalDays - Math.floor(years * 365.2425);
  const months = Math.floor(daysAfterYears / 30.436875);
  const days = Math.floor(daysAfterYears - months * 30.436875);
  const hours = totalHours - totalDays * 24;

  return { years, months, days, hours };
}

function formatDurationParts(parts: { years: number; months: number; days: number; hours: number }, fallback: string) {
  const items: string[] = [];

  if (parts.years > 0) {
    items.push(`${formatPersianNumber(parts.years)} سال`);
  }

  if (parts.months > 0) {
    items.push(`${formatPersianNumber(parts.months)} ماه`);
  }

  if (parts.days > 0) {
    items.push(`${formatPersianNumber(parts.days)} روز`);
  }

  if (parts.hours > 0 && items.length < 3) {
    items.push(`${formatPersianNumber(parts.hours)} ساعت`);
  }

  return items.length > 0 ? items.join(" و ") : fallback;
}

function getNextBirthdayDate(now: Date, report: AstrologyReport) {
  const parts = parseBirthDateParts(report.input.birthDate);

  if (!parts) {
    return null;
  }

  const time = parseBirthTimeParts(report.input.birthTime);
  let candidate = new Date(now.getFullYear(), parts.month - 1, parts.day, time.hour, time.minute, 0, 0);

  if (candidate.getTime() < now.getTime()) {
    candidate = new Date(now.getFullYear() + 1, parts.month - 1, parts.day, time.hour, time.minute, 0, 0);
  }

  return candidate;
}

function buildBirthDataItems(report: AstrologyReport): BirthDataItem[] {
  const now = new Date();
  const birthMoment = buildBirthMoment(report);
  const nextBirthday = getNextBirthdayDate(now, report);
  const birthTime = parseBirthTimeParts(report.input.birthTime);
  const place = formatList([report.input.birthCity, report.input.birthCountry]);

  return [
    { label: "تاریخ شمسی", value: formatBirthDatePersian(report) },
    { label: "تاریخ میلادی", value: report.input.birthDate || "نامشخص" },
    { label: "ساعت تولد", value: birthTime.isKnown ? report.input.birthTime : "نامعلوم" },
    { label: "وضعیت ساعت", value: birthTime.isKnown ? "ساعت دقیق/ثبت‌شده" : "ساعت نامعلوم" },
    { label: "محل تولد", value: place || "نامشخص" },
    {
      label: "سن دقیق",
      value: birthMoment ? formatDurationParts(diffCalendarParts(birthMoment, now), "کمتر از یک ساعت") : "در دسترس نیست",
    },
    {
      label: "تا تولد بعدی",
      value: nextBirthday ? formatDurationParts(diffCalendarParts(now, nextBirthday), "تولد امروز است") : "در دسترس نیست",
    },
  ];
}

function findPlacement(report: AstrologyReport, id: string): RealEngineReportPlacement | undefined {
  return report.realEngine?.placements.find((placement) => placement.id === id);
}

function formatPlacement(placement: RealEngineReportPlacement | undefined, fallbackLabel: string, fallbackSign: string) {
  if (!placement) {
    return {
      body: `${fallbackLabel} در ${fallbackSign}`,
      detail: "درجه در گزارش واقعی موجود نیست",
    };
  }

  return {
    body: `${fallbackLabel} در ${formatZodiacLabel(placement.signId)}`,
    detail: `درجه ${formatDegree(placement.degreeInSign)}`,
  };
}

function buildMoonPhase(report: AstrologyReport): MoonPhaseSummary | null {
  const sun = findPlacement(report, "sun");
  const moon = findPlacement(report, "moon");

  if (!sun || !moon) {
    return null;
  }

  const phaseAngle = normalizeLongitude(moon.longitude - sun.longitude);
  const phase = MOON_PHASES.find((item) => {
    if (item.from > item.to) {
      return phaseAngle >= item.from || phaseAngle < item.to;
    }

    return phaseAngle >= item.from && phaseAngle < item.to;
  });

  if (!phase) {
    return null;
  }

  return {
    title: phase.title,
    angleLabel: `زاویه ماه با خورشید: ${formatDegree(phaseAngle)}`,
  };
}

function buildPillars(report: AstrologyReport): PillarCard[] {
  const sun = formatPlacement(
    findPlacement(report, "sun"),
    "خورشید",
    formatZodiacSign(report.chart.sunSign),
  );
  const moon = formatPlacement(
    findPlacement(report, "moon"),
    "ماه",
    formatZodiacSign(report.chart.moonSign),
  );
  const risingSign = report.realEngine
    ? zodiacSignFromLongitude(report.realEngine.ascendantLongitude)
    : report.chart.risingSign.key;
  const risingDegree = report.realEngine
    ? normalizeLongitude(report.realEngine.ascendantLongitude) % 30
    : null;
  const moonPhase = buildMoonPhase(report);

  return [
    { id: "sun", title: "هویت و مسیر رشد", body: sun.body, detail: sun.detail },
    { id: "moon", title: "نیاز احساسی", body: moon.body, detail: moon.detail },
    {
      id: "rising",
      title: "ورود به جهان",
      body: `رایزینگ در ${formatZodiacLabel(risingSign)}`,
      detail: risingDegree === null ? "درجه در گزارش واقعی موجود نیست" : `درجه ${formatDegree(risingDegree)}`,
    },
    {
      id: "moon-phase",
      title: "فاز ماه تولد",
      body: moonPhase?.title ?? "در دسترس نیست",
      detail: moonPhase?.angleLabel ?? "زاویه ماه با خورشید در داده فعلی موجود نیست",
    },
  ];
}

function getRetrogradePlanetIds(report: AstrologyReport) {
  const retrogrades = report.realEngine?.retrogrades;

  if (retrogrades?.status !== "calculated" || !Array.isArray(retrogrades.planetIds)) {
    return [];
  }

  return retrogrades.planetIds.filter((planetId) => typeof planetId === "string" && planetId.trim());
}

function isReportAngle(angle: RealEngineReportAngle | undefined): angle is RealEngineReportAngle {
  return Boolean(angle);
}

function buildAngleRows(report: AstrologyReport): AngleSummary[] {
  const angles = report.realEngine?.angles;

  if (!angles) {
    return [];
  }

  return [angles.asc, angles.dsc, angles.mc, angles.ic]
    .filter(isReportAngle)
    .map((angle) => ({
      id: angle.id,
      title: ANGLE_COPY[angle.id]?.title ?? angle.label,
      position: `${formatZodiacLabel(angle.signId)}، درجه ${formatDegree(angle.degreeInSign)}`,
      house: typeof angle.house === "number" ? `خانه ${formatPersianNumber(angle.house)}` : "خانه ثبت نشده",
      meaning: ANGLE_COPY[angle.id]?.meaning ?? "محور اصلی چارت",
    }));
}

function isCalculatedLunarNodes(
  lunarNodes: RealEngineReportLunarNodes | undefined,
): lunarNodes is RealEngineReportCalculatedLunarNodes {
  return Boolean(
    lunarNodes &&
      lunarNodes.status === "calculated" &&
      "northNode" in lunarNodes &&
      "southNode" in lunarNodes &&
      lunarNodes.nodeType === "mean",
  );
}

function buildLunarNodeRows(report: AstrologyReport): LunarNodeSummary[] {
  const lunarNodes = report.realEngine?.lunarNodes;

  if (!isCalculatedLunarNodes(lunarNodes)) {
    return [];
  }

  return [lunarNodes.northNode, lunarNodes.southNode].map((node) => ({
    id: node.id,
    title: node.id === "north-node" ? "دست شمالی ماه" : "دست جنوبی ماه",
    position: `${formatZodiacLabel(node.signId)}، درجه ${formatDegree(node.degreeInSign)}`,
    house: typeof node.house === "number" ? `خانه ${formatPersianNumber(node.house)}` : "خانه ثبت نشده",
    meaning:
      node.id === "north-node"
        ? "مدل میانگین؛ جهت تمرین تازه و مسیر رشد."
        : "از دست شمالی + ۱۸۰° به دست آمده؛ الگوی آشنا و نقطه برگشت.",
  }));
}

function buildEnergyRows(placements: RealEngineReportPlacement[]): EnergySummary[] {
  const counts = new Map<string, number>();

  for (const placement of placements) {
    const sign = formatZodiacLabel(placement.signId);
    counts.set(sign, (counts.get(sign) ?? 0) + 1);
  }

  const strongestSigns = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([sign, count]) => `${sign} ${formatPersianNumber(count)}`);

  return [
    {
      title: "تأکید نشانه‌ها",
      value: strongestSigns.length > 0 ? strongestSigns.join("، ") : "در داده فعلی در دسترس نیست",
    },
    {
      title: "تعداد جایگاه‌ها",
      value: `${formatPersianNumber(placements.length)} جایگاه محاسبه‌شده`,
    },
    {
      title: "ریتم خوانش",
      value: "این خلاصه برای جهت‌گیری است؛ متن اصلی جای تفسیر انسانی را نگه می‌دارد.",
    },
  ];
}

function getSourceBadge(reportSource: ReportDetailSource) {
  if (reportSource === "public") {
    return "public / noindex";
  }

  if (reportSource === "account") {
    return "خصوصی / حساب";
  }

  if (reportSource === "beta-db") {
    return "نسخه آزمایشی سرور";
  }

  return "محلی / مرورگر";
}

function getReportTitle(report: AstrologyReport) {
  return report.input.name?.trim()
    ? `گزارش چارت تولد ${report.input.name.trim()}`
    : "گزارش چارت تولد";
}

function getPublicLinkMessage(reportSource: ReportDetailSource, message: string) {
  if (reportSource === "public") {
    return "این گزارش public/noindex است؛ هرکسی که لینک مستقیم را داشته باشد می‌تواند گزارش را ببیند، اما یادداشت‌های شخصی در لینک عمومی نمایش داده نمی‌شوند.";
  }

  if (reportSource === "account") {
    return message || "این نسخه از حساب فعلی خوانده شده است؛ گزارش حساب private/noindex می‌ماند و یادداشت‌های شخصی اینجا فقط خواندنی است.";
  }

  if (reportSource === "beta-db") {
    return message || "این نسخه از آرشیو آزمایشی سرور خوانده شده است.";
  }

  return message || "نسخه همین مرورگر باز شد؛ برای گزارش‌های بعدی می‌توانی وارد حساب شوی تا مسیر برگشت جدا داشته باشی.";
}

export function ReportDetail({
  reportId,
  reportSource = "local",
  initialReport = null,
  initialMessage = "",
}: ReportDetailProps) {
  const [report, setReport] = useState<AstrologyReport | null>(() =>
    initialReport ? sanitizeReportVisibleCopy(initialReport) : null,
  );
  const [note, setNote] = useState("");
  const [isReady, setIsReady] = useState(() => Boolean(initialReport));
  const [message, setMessage] = useState(initialMessage);
  const [activeSection, setActiveSection] = useState("final-reading");

  useEffect(() => {
    let isActive = true;

    async function loadReport() {
      if (reportSource === "public" && initialReport) {
        setReport(sanitizeReportVisibleCopy(initialReport));
        setNote("");
        setMessage(initialMessage || `لینک عمومی گزارش آماده است: ${reportId}`);
        setIsReady(true);
        return;
      }

      if (reportSource === "public") {
        const result = await getPublicReportRecord(reportId);

        if (!isActive) {
          return;
        }

        if (result.status === "account-read-ready" && result.reportRecord?.report) {
          setReport(sanitizeReportVisibleCopy(result.reportRecord.report));
          setNote("");
          setMessage(`لینک عمومی گزارش باز شد: ${reportId}`);
          setIsReady(true);
          return;
        }

        const selectedRecord = await reportRepository.getReport(reportId);

        if (!isActive) {
          return;
        }

        setReport(selectedRecord?.report ? sanitizeReportVisibleCopy(selectedRecord.report) : null);
        setNote(selectedRecord?.note ?? "");
        setMessage(
          selectedRecord?.report
            ? "نسخه همین مرورگر باز شد؛ لینک عمومی سرور برای این گزارش پیدا نشد."
            : result.message,
        );
        setIsReady(true);
        return;
      }

      if (reportSource === "account") {
        const result = await getAccountReportRecord(reportId);

        if (!isActive) {
          return;
        }

        if (result.status !== "account-read-ready" || !result.reportRecord?.report) {
          setReport(null);
          setNote("");
          setMessage(result.message);
          setIsReady(true);
          return;
        }

        setReport(sanitizeReportVisibleCopy(result.reportRecord.report));
        setNote(result.reportRecord.note ?? "");
        setMessage(`نسخه اکانتی گزارش باز شد: ${reportId}`);
        setIsReady(true);
        return;
      }

      if (reportSource === "beta-db") {
        if (!isBetaDatabaseSaveUiEnabled) {
          throw new Error("خواندن نسخه آزمایشی سرور غیرفعال است.");
        }

        const response = await fetch(
          `/api/reports/beta?reportId=${encodeURIComponent(reportId)}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | BetaDatabaseReadResponse
          | null;

        if (!response.ok || !payload?.ok || !payload.reportRecord?.report) {
          throw new Error(payload?.error ?? "گزارش آزمایشی سرور پیدا نشد.");
        }

        if (!isActive) {
          return;
        }

        setReport(sanitizeReportVisibleCopy(payload.reportRecord.report));
        setNote(payload.reportRecord.note ?? "");
        setMessage(`گزارش آزمایشی سرور باز شد: ${reportId}`);
        setIsReady(true);
        return;
      }

      const selectedRecord = await reportRepository.getReport(reportId);

      if (!isActive) {
        return;
      }

      setReport(selectedRecord?.report ? sanitizeReportVisibleCopy(selectedRecord.report) : null);
      setNote(selectedRecord?.note ?? "");
      setIsReady(true);
    }

    void loadReport();

    return () => {
      isActive = false;
    };
  }, [initialMessage, initialReport, reportId, reportSource]);

  async function handleSaveNote() {
    if (reportSource === "account" || reportSource === "public") {
      setMessage("یادداشت گزارش‌های عمومی/اکانتی فعلاً فقط خواندنی است؛ یادداشت‌های شخصی در لینک عمومی نمایش داده نمی‌شوند.");
      return;
    }

    const updatedRecord = await reportRepository.setNote(reportId, note);

    if (updatedRecord) {
      setNote(updatedRecord.note ?? "");
    }

    notifyLocalDataChanged();
    setMessage(note.trim() ? "یادداشت ذخیره شد." : "یادداشت پاک شد.");
  }

  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const birthDataItems = useMemo(() => (report ? buildBirthDataItems(report) : []), [report]);
  const pillars = useMemo(() => (report ? buildPillars(report) : []), [report]);
  const stats = useMemo(() => (report ? buildReportReadingStats(report) : null), [report]);
  const placements = report?.realEngine?.placements ?? [];
  const aspects = report?.realEngine?.aspects ?? [];
  const houses = report?.realEngine?.houses ?? [];
  const angles = report ? buildAngleRows(report) : [];
  const lunarNodes = report ? buildLunarNodeRows(report) : [];
  const energyRows = buildEnergyRows(placements);
  const retrogradePlanetIds = report ? getRetrogradePlanetIds(report) : [];
  const isReadOnlyReportSource = reportSource === "account" || reportSource === "public";
  const reportsHref = reportSource === "account" ? "/reports?source=account" : "/reports";

  if (!isReady) {
    return (
      <section className="grid report-detail-reader-page">
        <div className="report-detail-skeleton-card" aria-hidden="true" />
        <div className="report-detail-skeleton-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="grid report-detail-reader-page">
        <EmptyState
          badge="گزارش پیدا نشد"
          title="این گزارش پیدا نشد"
          description={
            message ||
            "این گزارش ممکن است پاک شده باشد، در حساب فعلی نباشد، یا روی مرورگر/دستگاه دیگری ساخته شده باشد."
          }
          actionHref={reportsHref}
          actionLabel="بازگشت به گزارش‌ها"
        />
      </section>
    );
  }

  return (
    <section className="grid report-detail-reader-page">
      <div className="report-detail-back-row">
        <Link className="button secondary" href={reportsHref}>
          بازگشت به گزارش‌ها
        </Link>
      </div>

      <section className="card report-detail-hero-simple" aria-labelledby="report-detail-title">
        <article className="report-detail-birth-card">
          <span className="section-label">اطلاعات تولد</span>
          <div className="report-detail-key-value-list">
            {birthDataItems.map((item) => (
              <div className="report-detail-key-value" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <div className="report-detail-hero-copy-simple">
          <div className="report-detail-badge-row">
            <span className="badge">گزارش محاسبه‌شده هالیوس</span>
            <span className="pill">{getSourceBadge(reportSource)}</span>
          </div>
          <h1 id="report-detail-title">{getReportTitle(report)}</h1>
          <p>
            این کارت فقط جهت‌گیری اولیه می‌دهد: سه ستون اصلی، چرخ چارت و یک پشتوانه بسته برای داده‌های دقیق. روایت اصلی را بالا بخوان و جزئیات فنی را هر زمان خواستی ببین.
          </p>
        </div>

        <article className="report-detail-chart-card" id="chart-wheel">
          <span className="section-label">چرخ چارت</span>
          {report.realEngine ? (
            <div className="report-detail-chart-frame report-detail-chart-frame-hero">
              <RealChartWheel
                placements={placements}
                ascendantLongitude={report.realEngine.ascendantLongitude}
                houses={report.realEngine.houses}
                angles={report.realEngine.angles}
                aspects={aspects.slice(0, 8)}
                retrogradePlanetIds={retrogradePlanetIds}
                houseSystem={report.realEngine.houseSystem}
              />
            </div>
          ) : (
            <div className="report-detail-chart-placeholder">
              چرخ چارت برای این گزارش کامل در دسترس نیست.
            </div>
          )}
        </article>
      </section>

      <nav className="report-detail-section-chips" aria-label="دسترسی سریع بخش‌های گزارش">
        {[
          ["final-reading", "روایت اصلی"],
          ["core-pillars", "سه ستون اصلی"],
          ["chart-wheel", "چرخ چارت"],
          ["technical-tables", "جدول‌ها"],
          ["technical-details", "جزئیات"],
          ["personal-note", "یادداشت"],
        ].map(([id, label]) => (
          <button
            className={activeSection === id ? "active" : ""}
            key={id}
            onClick={() => scrollToSection(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="report-detail-main-reader-grid">
        <div className="report-final-reading-anchor report-detail-narrative-card" id="final-reading">
          <ReportV3Experience report={report} />
        </div>

        <section className="card report-detail-pillars-card" id="core-pillars">
          <span className="section-label">سه ستون اصلی</span>
          <h2>سه ستون اصلی و فاز ماه تولد</h2>
          <div className="report-detail-pillars-grid">
            {pillars.map((pillar) => (
              <article className="mini-card report-detail-pillar-card" key={pillar.id}>
                <span>{pillar.title}</span>
                <strong>{pillar.body}</strong>
                <p>{pillar.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="report-detail-quick-card-grid" aria-label="گام‌های سریع بعد از روایت">
        <article className="card report-detail-quick-card" id="technical-tables">
          <span className="section-label">جدول‌ها</span>
          <h2>دسترسی سریع به جدول‌ها و داده‌های فنی</h2>
          <p>
            جایگاه‌ها، خانه‌ها، محورها، دست‌های ماه، روابط سیاره‌ای و پشتوانه محاسبه اینجا جمع شده‌اند.
          </p>
          <button className="button secondary" type="button" onClick={() => scrollToSection("technical-details")}>
            مشاهده همه بخش‌ها
          </button>
        </article>

        <article className="card report-detail-quick-card report-detail-note-card" id="personal-note">
          <span className="section-label">یادداشت شخصی</span>
          <h2>یادداشت شخصی</h2>
          {reportSource === "public" ? (
            <p>یادداشت‌های شخصی در لینک عمومی نمایش داده نمی‌شوند.</p>
          ) : (
            <>
              <label className="field">
                <span>متن یادداشت</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="مثلاً: این هفته فقط به نیاز ماه خودم توجه کنم..."
                  rows={5}
                  disabled={isReadOnlyReportSource}
                />
              </label>
              <div className="actions">
                <button className="button" type="button" onClick={handleSaveNote} disabled={isReadOnlyReportSource}>
                  {isReadOnlyReportSource ? "فقط خواندنی" : "ذخیره"}
                </button>
                <button className="button secondary" type="button" onClick={() => setNote("")} disabled={isReadOnlyReportSource}>
                  پاک کردن
                </button>
              </div>
            </>
          )}
          {message ? <p className="success-message">{message}</p> : null}
        </article>

        <article className="card report-detail-quick-card">
          <span className="section-label">لینک عمومی</span>
          <h2>لینک عمومی</h2>
          <span className="pill">{getSourceBadge(reportSource)}</span>
          <p>{getPublicLinkMessage(reportSource, message)}</p>
          {reportSource === "public" ? (
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                setMessage("لینک گزارش کپی شد.");
              }}
            >
              کپی لینک
            </button>
          ) : null}
        </article>
      </section>

      <section className="card report-detail-technical-sections" id="technical-details">
        <div className="report-section-heading">
          <span className="section-label">پشتوانه</span>
          <h2>جزئیات فنی و پشتوانه محاسبه</h2>
          <p>
            این بخش برای شفافیت است. اگر فقط می‌خواهی گزارش را مثل یک روایت بخوانی، لازم نیست همه داده‌های فنی را دنبال کنی.
          </p>
        </div>

        {report.realEngine ? (
          <div className="report-detail-technical-stack">
            <article className="report-detail-technical-card">
              <h3>چرخ چارت</h3>
              <div className="report-detail-chart-frame report-detail-chart-frame-wide">
                <RealChartWheel
                  placements={placements}
                  ascendantLongitude={report.realEngine.ascendantLongitude}
                  houses={report.realEngine.houses}
                  angles={report.realEngine.angles}
                  aspects={aspects.slice(0, 8)}
                  retrogradePlanetIds={retrogradePlanetIds}
                  houseSystem={report.realEngine.houseSystem}
                />
              </div>
            </article>

            <article className="report-detail-technical-card">
              <h3>پشتوانه محاسبه و داده‌های دقیق</h3>
              <div className="report-detail-key-value-list report-detail-key-value-list-compact">
                <div className="report-detail-key-value"><span>شهر محاسبه</span><strong>{report.realEngine.cityLabel}</strong></div>
                <div className="report-detail-key-value"><span>زمان مرجع</span><strong>{report.realEngine.utcIso}</strong></div>
                <div className="report-detail-key-value"><span>روش خانه‌ها</span><strong>{report.realEngine.houseSystem ?? "در حال تکمیل"}</strong></div>
                <div className="report-detail-key-value"><span>جایگاه‌ها</span><strong>{formatPersianNumber(placements.length)}</strong></div>
                <div className="report-detail-key-value"><span>خانه‌ها</span><strong>{formatPersianNumber(houses.length)}</strong></div>
                <div className="report-detail-key-value"><span>روابط سیاره‌ای</span><strong>{formatPersianNumber(aspects.length)}</strong></div>
              </div>
            </article>

            <article className="report-detail-technical-card">
              <h3>جایگاه‌ها در خانه‌ها</h3>
              <div className="report-detail-card-list">
                {placements.map((placement) => (
                  <div className="report-detail-data-row" key={placement.id}>
                    <strong>{PLANET_LABELS_FA[placement.id] ?? placement.label}</strong>
                    <span>{formatZodiacLabel(placement.signId)}، درجه {formatDegree(placement.degreeInSign)}</span>
                    <span>{typeof placement.house === "number" ? `خانه ${formatPersianNumber(placement.house)}` : "خانه ثبت نشده"}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="report-detail-technical-card">
              <h3>۱۲ خانه</h3>
              <div className="report-detail-card-list report-detail-card-list-2">
                {houses.map((house: RealEngineReportHouse) => (
                  <div className="report-detail-data-row" key={house.number}>
                    <strong>خانه {formatPersianNumber(house.number)}</strong>
                    <span>{formatZodiacLabel(house.signId)}، درجه {formatDegree(house.degreeInSign)}</span>
                    <span>{HOUSE_FIELD_LABELS[house.number] ?? "معنای این خانه در حال تکمیل است"}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="report-detail-technical-card">
              <h3>محورهای اصلی</h3>
              <div className="report-detail-card-list report-detail-card-list-2">
                {angles.map((angle) => (
                  <div className="report-detail-data-row" key={angle.id}>
                    <strong>{angle.title}</strong>
                    <span>{angle.position}</span>
                    <span>{angle.house}</span>
                    <span>{angle.meaning}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="report-detail-technical-card">
              <h3>دست‌های ماه با مدل میانگین</h3>
              <div className="report-detail-card-list report-detail-card-list-2">
                {lunarNodes.length > 0 ? (
                  lunarNodes.map((node) => (
                    <div className="report-detail-data-row" key={node.id}>
                      <strong>{node.title}</strong>
                      <span>{node.position}</span>
                      <span>{node.house}</span>
                      <span>{node.meaning}</span>
                    </div>
                  ))
                ) : (
                  <div className="report-detail-data-row">
                    <strong>دست‌های ماه</strong>
                    <span>داده محاسبه‌شده دست‌های ماه در این گزارش موجود نیست.</span>
                  </div>
                )}
              </div>
            </article>

            <article className="report-detail-technical-card">
              <h3>حرکت برگشتی و انرژی کلی چارت</h3>
              <div className="report-detail-card-list report-detail-card-list-2">
                <div className="report-detail-data-row">
                  <strong>حرکت برگشتی</strong>
                  <span>
                    {retrogradePlanetIds.length > 0
                      ? `سیاره‌های برگشتی: ${formatList(retrogradePlanetIds.map((planetId) => PLANET_LABELS_FA[planetId] ?? planetId))}`
                      : "برای سیاره‌های محاسبه‌شده حرکت برگشتی برجسته‌ای ثبت نشده است."}
                  </span>
                </div>
                {energyRows.map((item) => (
                  <div className="report-detail-data-row" key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="report-detail-technical-card">
              <h3>روابط مهم بین سیاره‌ها</h3>
              <div className="report-detail-card-list">
                {aspects.slice(0, 10).map((aspect: RealEngineReportAspect) => (
                  <div className="report-detail-data-row" key={aspect.id}>
                    <strong>{aspect.firstPlanetLabel} {aspect.glyph} {aspect.secondPlanetLabel}</strong>
                    <span>{aspect.aspectLabel} · زاویه الگو {formatDegree(aspect.angle)} · زاویه واقعی {formatDegree(aspect.separation)} · اورب {formatDegree(aspect.orb)}</span>
                    <p>{aspect.narrative}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : (
          <div className="report-detail-chart-placeholder">
            چرخ چارت برای این گزارش کامل در دسترس نیست؛ روایت همچنان نمایش داده می‌شود.
          </div>
        )}
      </section>

      <section className="card report-detail-next-actions">
        <div>
          <span className="section-label">ادامه مسیر</span>
          <h2>بعد از این گزارش</h2>
          <p>اگر خواستی مقایسه کنی، یک گزارش تازه بساز. برای اینکه گزارش‌های بعدی فقط به همین مرورگر وابسته نباشند، از مسیر حساب وارد شو و بعد گزارش‌های حساب را جدا ببین.</p>
        </div>
        <div className="actions">
          <Link className="button" href="/chart">ساخت گزارش تازه</Link>
          <Link className="button secondary" href={reportsHref}>بازگشت به گزارش‌ها</Link>
          <Link className="button secondary" href="/profile">ورود یا ثبت‌نام برای گزارش‌های بعدی</Link>
          <Link className="button secondary" href="/dashboard">پنل کاربری</Link>
        </div>
      </section>
    </section>
  );
}
