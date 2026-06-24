import { hasDatabaseConfig } from "@/lib/config/env";
import type { ReportDatabaseDriver } from "@/lib/database/database-driver";
import { createNotConfiguredDatabaseDriver } from "@/lib/database/not-configured-driver";

export function getReportDatabaseDriver(): ReportDatabaseDriver {
  if (!hasDatabaseConfig()) {
    return createNotConfiguredDatabaseDriver();
  }

  return createNotConfiguredDatabaseDriver();
}
