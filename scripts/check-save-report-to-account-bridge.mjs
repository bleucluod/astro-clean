import { readFileSync } from "node:fs";

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const need = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};
const forbid = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} still contains: ${marker}`);
};

const client = read("lib/storage/account-report-save-client.ts");
const ownerRoute = read("app/api/reports/owner/route.ts");
const guest = read("lib/auth/guest-report-session.ts");
const migration = read("lib/account/server-canonical-report-migration-client.ts");

for (const marker of [
  "HALLEUS_SERVER_CANONICAL_REPORT_SAVE_R1_20260919",
  'fetch("/api/reports/owner"',
  "ensureServerCanonicalReport",
]) need("server-canonical save client", client, marker);

forbid("server-canonical save client", client, "saveGeneratedReport(report)");

for (const marker of [
  'action === "claim_guest"',
  'action === "claim_legacy_report"',
  'publicationIntent: "unpublish"',
]) need("owner route", ownerRoute, marker);

for (const marker of [
  "createHmac",
  "timingSafeEqual",
  "httpOnly: true",
]) need("guest ownership", guest, marker);

for (const marker of [
  "HALLEUS_SERVER_CANONICAL_LEGACY_MIGRATION_R3_20260919",
  "await repository.deleteReport(record.id)",
]) need("legacy migration", migration, marker);

if (failures.length) {
  console.error("save-report-to-account-bridge check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("save-report-to-account-bridge check passed for server-canonical reports.");