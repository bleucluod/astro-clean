import type { AstrologyReport } from "@/types/astro";

const reportsStorageKey = "astro-clean-reports";

export function loadReports(): AstrologyReport[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawReports = window.localStorage.getItem(reportsStorageKey);
    if (!rawReports) {
      return [];
    }

    return JSON.parse(rawReports) as AstrologyReport[];
  } catch {
    return [];
  }
}

export function saveReport(report: AstrologyReport): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentReports = loadReports();
  const nextReports = [
    report,
    ...currentReports.filter((item) => item.id !== report.id),
  ];

  window.localStorage.setItem(reportsStorageKey, JSON.stringify(nextReports));
}

export function deleteReport(reportId: string): AstrologyReport[] {
  if (typeof window === "undefined") {
    return [];
  }

  const nextReports = loadReports().filter((report) => report.id !== reportId);
  window.localStorage.setItem(reportsStorageKey, JSON.stringify(nextReports));

  return nextReports;
}

export function clearReports(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(reportsStorageKey);
}
