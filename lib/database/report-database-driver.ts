import { getHalleusRuntimeEnv } from "@/lib/config/env";
import type { ReportDatabaseDriver } from "@/lib/database/database-driver";
import { createNotConfiguredDatabaseDriver } from "@/lib/database/not-configured-driver";
import { createPostgresReportDatabaseDriver } from "@/lib/database/postgres-report-database-driver";

export function getReportDatabaseDriver(): ReportDatabaseDriver {
  const { databaseUrl } = getHalleusRuntimeEnv();

  if (!databaseUrl) {
    return createNotConfiguredDatabaseDriver();
  }

  return createPostgresReportDatabaseDriver(databaseUrl);
}
