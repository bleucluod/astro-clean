"use client";

import type { AstrologyReport } from "@/types/astro";
import { buildLiveReportReadingContract } from "@/lib/report-output/live-report-reading-contract";
import { buildHumanFirstBirthReading, humanizeVisibleText } from "@/lib/report-output/human-first-report-reading";
import type { HumanFirstReadingSectionId } from "@/types/human-first-reading";

export type ReportReadingSectionId = HumanFirstReadingSectionId;

export type LastStudyLocation = {
  cityId: string;
  cityName: string;
};

export type ReportReadingProgress = {
  sectionId: ReportReadingSectionId;
  updatedAt: string;
};

const LAST_STUDY_LOCATION_KEY = "halleus-last-study-location-v1";
const REPORT_READING_PROGRESS_KEY = "halleus-report-reading-progress-v1";

const REPORT_SECTION_LABELS: Record<ReportReadingSectionId, string> = {
  overview: "تو در چند خط",
  "primary-patterns": "سه الگوی اصلی",
  "strength-challenge": "نقطه قوت و چالش اصلی",
  "inner-world": "دنیای درونی",
  "mind-language": "فکر و بیان",
  relationships: "رابطه و مرزها",
  "drive-direction": "انگیزه و جهت",
  "friction-repair": "اصطکاک و برگشتن",
  "growth-path": "مسیر رشد",
  "deeper-layers": "لایه‌های عمیق‌تر",
  "chart-details": "جزئیات کامل نجومی",
};

const LEGACY_SECTION_MAP: Record<string, ReportReadingSectionId> = {
  overview: "overview",
  "inner-world": "inner-world",
  relationships: "relationships",
  "growth-path": "growth-path",
  "chart-details": "chart-details",
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadLastStudyLocation(): LastStudyLocation | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(LAST_STUDY_LOCATION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LastStudyLocation>;
    if (!value.cityId || !value.cityName) return null;
    return { cityId: value.cityId, cityName: value.cityName };
  } catch {
    return null;
  }
}

export function saveLastStudyLocation(location: LastStudyLocation) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(
      LAST_STUDY_LOCATION_KEY,
      JSON.stringify(location),
    );
  } catch {
    // Study-location convenience must never block report generation.
  }
}

function buildProgressKey(source: string, reportId: string) {
  return [source.trim() || "local", reportId.trim()].join(":");
}

function loadProgressMap(): Record<string, ReportReadingProgress> {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(REPORT_READING_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<
      string,
      { sectionId?: string; updatedAt?: string }
    >;
    const output: Record<string, ReportReadingProgress> = {};

    for (const [key, value] of Object.entries(parsed)) {
      const sectionId = normalizeSectionId(value.sectionId);
      if (!sectionId) continue;
      output[key] = {
        sectionId,
        updatedAt: value.updatedAt ?? new Date(0).toISOString(),
      };
    }

    return output;
  } catch {
    return {};
  }
}

function normalizeSectionId(value: string | undefined): ReportReadingSectionId | null {
  if (!value) return null;
  if (value in REPORT_SECTION_LABELS) return value as ReportReadingSectionId;
  return LEGACY_SECTION_MAP[value] ?? null;
}

export function getReportReadingProgress(
  source: string,
  reportId: string,
): ReportReadingProgress | null {
  if (!reportId.trim()) return null;
  return loadProgressMap()[buildProgressKey(source, reportId)] ?? null;
}

export function saveReportReadingProgress(
  source: string,
  reportId: string,
  sectionId: ReportReadingSectionId,
) {
  if (!canUseLocalStorage() || !reportId.trim()) return;

  try {
    const current = loadProgressMap();
    current[buildProgressKey(source, reportId)] = {
      sectionId,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      REPORT_READING_PROGRESS_KEY,
      JSON.stringify(current),
    );
  } catch {
    // Reading progress is optional and must not interrupt the report.
  }
}

export function clearReportReadingProgress(source: string, reportId: string) {
  if (!canUseLocalStorage() || !reportId.trim()) return;

  try {
    const current = loadProgressMap();
    delete current[buildProgressKey(source, reportId)];
    window.localStorage.setItem(
      REPORT_READING_PROGRESS_KEY,
      JSON.stringify(current),
    );
  } catch {
    // Deleting a report remains authoritative even if progress cleanup fails.
  }
}

function redactPrivateReportText(value: string, report: AstrologyReport) {
  const privateTokens = [
    report.input.name,
    report.input.birthDate,
    report.input.birthTime,
    report.input.birthCity,
    report.input.birthCountry,
  ]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item && item.length > 1));

  return privateTokens.reduce(
    (current, token) => current.split(token).join("—"),
    value,
  );
}

export function createPrivacySafeReportText(report: AstrologyReport) {
  const contract = buildLiveReportReadingContract(report);
  const reading = buildHumanFirstBirthReading(contract);
  const parts = [
    "خلاصه‌ای از چارت تو",
    "",
    ...reading.opening.slice(0, 2),
    "",
    "وقتی روی فرم خودتی",
    humanizeVisibleText(contract.primaryStrength.body),
    "",
    "وقتی فشار بالا می‌رود",
    humanizeVisibleText(contract.primaryChallenge.body),
    "",
    "یک جهت برای ادامه",
    reading.growthPath.practicalStep,
    "",
    "این متن یک برداشت نمادین برای خودشناسی است؛ نه پیش‌بینی قطعی یا توصیه پزشکی، حقوقی و مالی.",
  ];
  return redactPrivateReportText(parts.join("\n"), report);
}

export function downloadPrivacySafeReport(report: AstrologyReport) {
  const blob = new Blob([createPrivacySafeReportText(report)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "halleus-shareable-summary.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getReportReadingSectionLabel(
  sectionId: ReportReadingSectionId,
) {
  return REPORT_SECTION_LABELS[sectionId];
}
