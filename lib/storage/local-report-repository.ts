import {
  clearFavoriteReportIds,
  loadFavoriteReportIds,
  toggleFavoriteReportId,
} from "@/lib/storage/favorite-reports-storage";
import {
  clearReportNotes,
  deleteReportNote,
  loadReportNotes,
  saveReportNote,
} from "@/lib/storage/report-notes-storage";
import {
  clearReports,
  deleteReport,
  loadReports,
  saveReport,
} from "@/lib/storage/reports-storage";
import type { AstrologyReport } from "@/types/astro";
import type {
  ReportImportResult,
  ReportRecord,
  ReportRepository,
} from "@/types/storage";
import { createReportRecord } from "./report-records";

function isFavorite(reportId: string) {
  return loadFavoriteReportIds().includes(reportId);
}

function createLocalReportRecord(report: AstrologyReport): ReportRecord {
  return createReportRecord(report, {
    favorite: isFavorite(report.id),
    note: loadReportNotes()[report.id],
    source: "local-preview",
    visibility: "private",
  });
}

function findLocalReport(reportId: string) {
  return loadReports().find((report) => report.id === reportId) ?? null;
}

export const localReportRepository: ReportRepository = {
  async listReports() {
    return loadReports().map(createLocalReportRecord);
  },

  async getReport(reportId: string) {
    const report = findLocalReport(reportId);

    return report ? createLocalReportRecord(report) : null;
  },

  async saveReport(report: AstrologyReport) {
    saveReport(report);

    return createLocalReportRecord(report);
  },

  async deleteReport(reportId: string) {
    deleteReport(reportId);
    deleteReportNote(reportId);

    if (isFavorite(reportId)) {
      toggleFavoriteReportId(reportId);
    }
  },

  async clearReports() {
    clearReports();
    clearFavoriteReportIds();
    clearReportNotes();
  },

  async setFavorite(reportId: string, favorite: boolean) {
    const currentlyFavorite = isFavorite(reportId);

    if (favorite !== currentlyFavorite) {
      toggleFavoriteReportId(reportId);
    }

    return this.getReport(reportId);
  },

  async setNote(reportId: string, note: string) {
    saveReportNote(reportId, note);

    return this.getReport(reportId);
  },

  async exportReports() {
    return this.listReports();
  },

  async importReports(records: ReportRecord[]): Promise<ReportImportResult> {
    const existingIds = new Set(loadReports().map((report) => report.id));
    let imported = 0;
    let skipped = 0;

    for (const record of records) {
      if (existingIds.has(record.id)) {
        skipped += 1;
        continue;
      }

      saveReport(record.report);

      if (record.favorite) {
        toggleFavoriteReportId(record.id);
      }

      if (record.note) {
        saveReportNote(record.id, record.note);
      }

      existingIds.add(record.id);
      imported += 1;
    }

    return {
      imported,
      skipped,
    };
  },
};
