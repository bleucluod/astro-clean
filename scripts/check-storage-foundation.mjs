import fs from "node:fs";

const requiredFiles = [
  "types/storage.ts",
  "lib/storage/report-records.ts",
  "lib/storage/local-report-repository.ts",
  "lib/storage/report-repository.ts",
  "lib/storage/database-report-repository.ts",
  "lib/storage/report-record-migration.ts",
  "lib/storage/report-write-service.ts",
  "lib/storage/report-query-service.ts",
  "lib/storage/storage-events.ts",
  "docs/STORAGE_ARCHITECTURE.md",
  "docs/STORAGE_ADAPTER_IMPLEMENTATION.md",
  "docs/DATABASE_SCHEMA_DRAFT.md",
];

const requiredContent = [
  ["types/storage.ts", "export type ReportRepository"],
  ["types/storage.ts", "export type ReportRecord"],
  ["lib/storage/local-report-repository.ts", "export const localReportRepository"],
  ["lib/storage/report-repository.ts", "export function getReportRepository"],
  ["lib/storage/report-write-service.ts", "export async function saveGeneratedReport"],
  ["lib/storage/storage-events.ts", "export function notifyHalleusDataChanged"],
  ["lib/storage/report-record-migration.ts", "export function encodeReportRecords"],
  ["components/ChartForm.tsx", "saveGeneratedReport"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing storage foundation file: ${file}`);
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

console.log(`Storage foundation check passed for ${requiredFiles.length} files.`);
