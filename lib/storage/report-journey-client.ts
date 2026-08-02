"use client";

import type { AstrologyReport } from "@/types/astro";

export type ReportReadingSectionId =
  | "overview"
  | "inner-world"
  | "relationships"
  | "growth-path"
  | "chart-details";

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
  overview: "تصویر کلی",
  "inner-world": "دنیای درونی",
  relationships: "رابطه‌ها",
  "growth-path": "مسیر رشد",
  "chart-details": "جزئیات چارت",
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
    return JSON.parse(raw) as Record<string, ReportReadingProgress>;
  } catch {
    return {};
  }
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
  return [
    "خلاصه امن گزارش هالیوس",
    "",
    redactPrivateReportText(report.summary, report),
    "",
    "این خروجی شامل نام، تاریخ تولد، ساعت تولد، شهر تولد، یادداشت شخصی یا داده فنی خام نیست.",
  ].join("\n");
}

export function downloadPrivacySafeReport(report: AstrologyReport) {
  const payload = {
    app: "halleus",
    type: "privacy-safe-report-summary",
    version: 1,
    exportedAt: new Date().toISOString(),
    title: "خلاصه امن گزارش چارت تولد",
    summary: redactPrivateReportText(report.summary, report),
    safetyNote: redactPrivateReportText(report.safetyNote, report),
    excludes: [
      "name",
      "birthDate",
      "birthTime",
      "birthCity",
      "personalNote",
      "rawEngineData",
    ],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "halleus-safe-summary.json";
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
