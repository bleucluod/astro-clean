import fs from "node:fs";

const requiredFiles = [
  "lib/config/env.ts",
  "lib/database/database-driver.ts",
  "lib/database/report-row-mapper.ts",
  "lib/database/not-configured-driver.ts",
  "lib/database/postgres-report-database-driver.ts",
  "lib/database/report-database-driver.ts",
  "lib/storage/database-report-repository.ts",
  "lib/storage/server-report-persistence.ts",
  "database/migrations/0001_initial_schema.sql",
  "database/seeds/dev_seed.sql",
  ".env.example",
  "docs/DATABASE_READINESS.md",
  "docs/DATABASE_MIGRATION_RUNBOOK.md",
];

const requiredContent = [
  ["lib/config/env.ts", "getHalleusRuntimeEnv"],
  ["lib/config/env.ts", "DATABASE_URL"],
  ["lib/database/database-driver.ts", "ReportDatabaseDriver"],
  ["lib/database/report-row-mapper.ts", "toDatabaseReportRow"],
  ["lib/database/report-row-mapper.ts", "fromDatabaseReportRow"],
  ["lib/database/postgres-report-database-driver.ts", "createPostgresReportDatabaseDriver"],
  ["lib/database/postgres-report-database-driver.ts", "sql.json"],
  ["lib/storage/database-report-repository.ts", "createDatabaseReportRepository"],
  ["lib/storage/database-report-repository.ts", "driver.upsertReport"],
  ["lib/storage/server-report-persistence.ts", "saveServerGeneratedReport"],
  ["lib/storage/server-report-persistence.ts", "createServerReportPersistenceRepository"],
  ["database/migrations/0001_initial_schema.sql", "halleus_reports"],
  ["database/migrations/0001_initial_schema.sql", "halleus_birth_profiles"],
  [".env.example", "NEXT_PUBLIC_HALLEUS_SITE_URL=https://halleus.ir"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing database foundation file: ${file}`);
    failed = true;
  }
}

for (const [file, marker] of requiredContent) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");

  if (!text.includes(marker)) {
    console.error(`Missing marker in ${file}: ${marker}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Database readiness check passed for ${requiredFiles.length} files.`);
