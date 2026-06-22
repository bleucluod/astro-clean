import type { AstrologyReport } from "@/types/astro";
import {
  clearFavoriteReportIds,
  loadFavoriteReportIds,
  saveFavoriteReportIds,
} from "@/lib/storage/favorite-reports-storage";
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

export function restoreLocalDataBackup(value: unknown): RestoreResult {
  if (!isLocalDataBackup(value)) {
    return {
      ok: false,
      message: "فایل انتخاب‌شده با فرمت بکاپ Astro Clean سازگار نیست.",
    };
  }

  clearReports();
  clearFavoriteReportIds();

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

  return {
    ok: true,
    message: `بکاپ با موفقیت وارد شد. تعداد گزارش‌ها: ${value.reports.length.toLocaleString(
      "fa-IR",
    )}`,
  };
}
