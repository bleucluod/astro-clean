import type { AstrologyReport } from "@/types/astro";

const reportsStorageKey = "astro-clean-reports";

function isQuotaExceededError(error: unknown) {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    ((error as { name?: unknown }).name === "QuotaExceededError" ||
      (error as { name?: unknown }).name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function persistReportsWithQuotaRecovery(reports: AstrologyReport[]) {
  const pendingReports = [...reports];
  let lastQuotaError: unknown = null;

  while (pendingReports.length > 0) {
    try {
      window.localStorage.setItem(
        reportsStorageKey,
        JSON.stringify(pendingReports),
      );
      return;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        throw error;
      }

      lastQuotaError = error;
      pendingReports.pop();
    }
  }

  throw (
    lastQuotaError ??
    new Error("Local report storage is unavailable on this device.")
  );
}

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

  persistReportsWithQuotaRecovery(nextReports);
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
