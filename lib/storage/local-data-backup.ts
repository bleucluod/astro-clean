import type { AstrologyReport } from "@/types/astro";
import {
  clearFavoriteReportIds,
  loadFavoriteReportIds,
  saveFavoriteReportIds,
} from "@/lib/storage/favorite-reports-storage";
import {
  clearReportNotes,
  loadReportNotes,
  saveReportNotes,
  type ReportNotesMap,
} from "@/lib/storage/report-notes-storage";
import { clearReports, loadReports, saveReport } from "@/lib/storage/reports-storage";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
} from "@/lib/storage/profile-storage";

export type LocalDataBackup = {
  app: "astro-clean";
  version: 1;
  exportedAt: string;
  profile: typeof defaultProfile;
  reports: AstrologyReport[];
  favoriteReportIds: string[];
  reportNotes: ReportNotesMap;
};

export type RestoreResult = {
  ok: boolean;
  message: string;
};

export function createLocalDataBackup(): LocalDataBackup {
  return {
    app: "astro-clean",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: loadProfile(),
    reports: loadReports(),
    favoriteReportIds: loadFavoriteReportIds(),
    reportNotes: loadReportNotes(),
  };
}

function isLocalDataBackup(value: unknown): value is LocalDataBackup {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LocalDataBackup>;

  return (
    candidate.app === "astro-clean" &&
    candidate.version === 1 &&
    Array.isArray(candidate.reports) &&
    typeof candidate.profile === "object" &&
    candidate.profile !== null
  );
}

function cleanReportNotes(value: unknown): ReportNotesMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const notes = value as Record<string, unknown>;
  const cleanNotes: ReportNotesMap = {};

  for (const [reportId, note] of Object.entries(notes)) {
    if (typeof note === "string") {
      cleanNotes[reportId] = note;
    }
  }

  return cleanNotes;
}

export function restoreLocalDataBackup(value: unknown): RestoreResult {
  if (!isLocalDataBackup(value)) {
    return {
      ok: false,
      message: "فایل انتخاب‌شده با فرمت بکاپ Halleus سازگار نیست.",
    };
  }

  clearReports();
  clearFavoriteReportIds();
  clearReportNotes();

  for (const report of [...value.reports].reverse()) {
    saveReport(report);
  }

  saveProfile({
    ...defaultProfile,
    ...value.profile,
  });

  saveFavoriteReportIds(
    Array.isArray(value.favoriteReportIds) ? value.favoriteReportIds : [],
  );

  saveReportNotes(cleanReportNotes(value.reportNotes));

  return {
    ok: true,
    message: `بکاپ با موفقیت وارد شد. تعداد گزارش‌ها: ${value.reports.length.toLocaleString(
      "fa-IR",
    )}`,
  };
}
