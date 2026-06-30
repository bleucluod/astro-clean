import fs from "node:fs";
import process from "node:process";
import postgres from "postgres";

const args = new Set(process.argv.slice(2));
const requireEnv = args.has("--require-env") || args.has("--check-db");
const checkDb = args.has("--check-db");

const requiredFiles = [
  "app/api/reports/beta/route.ts",
  "docs/BETA_API_VERIFICATION_RUNBOOK.md",
  "database/migrations/0001_initial_schema.sql",
  ".env.example",
];

const requiredMarkers = [
  ["app/api/reports/beta/route.ts", "betaPersistenceGuard"],
  ["app/api/reports/beta/route.ts", "saveServerGeneratedReport"],
  ["app/api/reports/beta/route.ts", "listServerReportSummaries"],
  ["docs/BETA_API_VERIFICATION_RUNBOOK.md", "HALLEUS_ENABLE_BETA_PERSISTENCE=true"],
  ["docs/BETA_API_VERIFICATION_RUNBOOK.md", "Invoke-RestMethod"],
  ["database/migrations/0001_initial_schema.sql", "halleus_reports"],
  [".env.example", "HALLEUS_ENABLE_BETA_PERSISTENCE=false"],
];

const checks = [];

function addCheck(name, ok, message = "") {
  checks.push({ name, ok, message });
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function hasEnv(name) {
  return Boolean(process.env[name]?.trim());
}

function isEnabled(name) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function printChecks() {
  for (const check of checks) {
    const status = check.ok ? "PASS" : "FAIL";
    console.log(`${status} ${check.name}${check.message ? ` - ${check.message}` : ""}`);
  }
}

function tableExists(value) {
  return typeof value === "string" && value.length > 0;
}

async function runDatabaseChecks() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    addCheck("db:skipped", false, "DATABASE_URL is missing; no database connection attempted");
    return;
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });

  try {
    await sql`select 1 as ok`;
    addCheck("db:connect", true, "connection ok; database URL was not printed");

    const rows = await sql`
      select
        to_regclass('public.halleus_users')::text as halleus_users,
        to_regclass('public.halleus_reports')::text as halleus_reports,
        to_regclass('public.halleus_birth_profiles')::text as halleus_birth_profiles
    `;

    const row = rows[0] ?? {};

    addCheck("db:table:halleus_users", tableExists(row.halleus_users));
    addCheck("db:table:halleus_reports", tableExists(row.halleus_reports));
    addCheck("db:table:halleus_birth_profiles", tableExists(row.halleus_birth_profiles));
  } catch (error) {
    addCheck(
      "db:connect",
      false,
      `connection/query failed without printing secrets${error?.code ? `; code=${error.code}` : ""}`,
    );
  } finally {
    await sql.end({ timeout: 1 });
  }
}

for (const file of requiredFiles) {
  addCheck(`file:${file}`, fs.existsSync(file));
}

for (const [file, marker] of requiredMarkers) {
  addCheck(`marker:${file}:${marker}`, readIfExists(file).includes(marker));
}

addCheck(
  "env:DATABASE_URL",
  hasEnv("DATABASE_URL"),
  hasEnv("DATABASE_URL") ? "present; value not printed" : "missing",
);

addCheck(
  "env:HALLEUS_ENABLE_BETA_PERSISTENCE",
  isEnabled("HALLEUS_ENABLE_BETA_PERSISTENCE"),
  isEnabled("HALLEUS_ENABLE_BETA_PERSISTENCE") ? "true" : "not true",
);

addCheck(
  "env:HALLEUS_BETA_PERSISTENCE_USER_ID",
  hasEnv("HALLEUS_BETA_PERSISTENCE_USER_ID"),
  hasEnv("HALLEUS_BETA_PERSISTENCE_USER_ID") ? "present; value not printed" : "missing",
);

if (checkDb) {
  await runDatabaseChecks();
}

printChecks();

const failed = checks.filter((check) => !check.ok);
const structureFailure = failed.some(
  (check) => check.name.startsWith("file:") || check.name.startsWith("marker:"),
);
const envFailure = failed.some((check) => check.name.startsWith("env:"));
const dbFailure = failed.some((check) => check.name.startsWith("db:"));

if (structureFailure || (requireEnv && envFailure) || dbFailure) {
  process.exit(1);
}

if (envFailure) {
  console.log("INFO beta env is not ready yet. Re-run with --require-env after local/staging env setup.");
} else {
  console.log("INFO beta env shape is ready. Use --check-db to verify the local/staging database tables.");
}
