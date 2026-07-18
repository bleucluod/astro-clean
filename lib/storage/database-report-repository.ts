import { getReportDatabaseDriver } from "@/lib/database/report-database-driver";
import type { AstrologyReport } from "@/types/astro";
import type {
  ReportImportResult,
  ReportRecord,
  ReportRepository,
} from "@/types/storage";
import { createReportRecord } from "./report-records";

export type DatabaseReportRepositoryOptions = {
  userId: string;
};

function normalizeUserId(userId: string) {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error("Database report repository needs a user id.");
  }

  return normalizedUserId;
}

function nowIso() {
  return new Date().toISOString();
}

function createAccountReportRecord(
  userId: string,
  report: AstrologyReport,
): ReportRecord {
  return createReportRecord(report, {
    source: "account",
    userId,
    visibility: "private",
  });
}

function prepareImportedRecord(
  userId: string,
  record: ReportRecord,
): ReportRecord {
  return {
    ...record,
    userId,
    source: "account",
    visibility: "private",
    updatedAt: nowIso(),
  };
}

export function createDatabaseReportRepository(
  options: DatabaseReportRepositoryOptions,
): ReportRepository {
  const userId = normalizeUserId(options.userId);
  const driver = getReportDatabaseDriver();

  async function getExistingReport(reportId: string) {
    return driver.getReportById(userId, reportId);
  }

  return {
    async listReports() {
      return driver.listReportsByUser(userId);
    },

    async getReport(reportId: string) {
      return getExistingReport(reportId);
    },

    async saveReport(report: AstrologyReport) {
      return driver.upsertReport(userId, createAccountReportRecord(userId, report));
    },

    async deleteReport(reportId: string) {
      await driver.deleteReport(userId, reportId);
    },

    async clearReports() {
      const records = await driver.listReportsByUser(userId);

      for (const record of records) {
        await driver.deleteReport(userId, record.id);
      }
    },

    async setFavorite(reportId: string, favorite: boolean) {
      const record = await getExistingReport(reportId);

      if (!record) {
        return null;
      }

      return driver.upsertReport(userId, {
        ...record,
        favorite,
        updatedAt: nowIso(),
      });
    },

    async setNote(reportId: string, note: string) {
      const record = await getExistingReport(reportId);

      if (!record) {
        return null;
      }

      return driver.upsertReport(userId, {
        ...record,
        note: note.trim() || undefined,
        updatedAt: nowIso(),
      });
    },

    async exportReports() {
      return driver.listReportsByUser(userId);
    },

    async importReports(records: ReportRecord[]): Promise<ReportImportResult> {
      const existingIds = new Set(
        (await driver.listReportsByUser(userId)).map((record) => record.id),
      );
      let imported = 0;
      let skipped = 0;

      for (const record of records) {
        if (existingIds.has(record.id)) {
          skipped += 1;
          continue;
        }

        await driver.upsertReport(userId, prepareImportedRecord(userId, record));
        existingIds.add(record.id);
        imported += 1;
      }

      return {
        imported,
        skipped,
      };
    },
  };
}
