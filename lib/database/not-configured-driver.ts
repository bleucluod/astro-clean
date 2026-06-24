import type {
  DatabaseHealthStatus,
  ReportDatabaseDriver,
} from "@/lib/database/database-driver";
import type { ReportRecord } from "@/types/storage";

function notConfigured(): DatabaseHealthStatus {
  return {
    ok: false,
    driver: "not-configured",
    checkedAt: new Date().toISOString(),
    message: "Database driver is not configured yet.",
  };
}

export function createNotConfiguredDatabaseDriver(): ReportDatabaseDriver {
  return {
    async healthCheck() {
      return notConfigured();
    },

    async listReportsByUser() {
      return [];
    },

    async getReportById() {
      return null;
    },

    async upsertReport(_userId: string, record: ReportRecord) {
      return record;
    },

    async deleteReport() {
      return;
    },
  };
}
