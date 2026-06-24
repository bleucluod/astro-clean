import fs from "node:fs";

const requiredFiles = [
  "types/auth.ts",
  "lib/auth/auth-driver.ts",
  "lib/auth/preview-auth-driver.ts",
  "lib/auth/auth-driver-factory.ts",
  "lib/auth/auth-readiness.ts",
  "lib/account/local-to-account-migration.ts",
  "docs/AUTH_READINESS.md",
  "docs/LOCAL_TO_ACCOUNT_MIGRATION.md",
  "docs/AUTH_PROVIDER_DECISION_MATRIX.md",
];

const requiredContent = [
  ["types/auth.ts", "export type AuthDriver"],
  ["types/auth.ts", "export type AuthReadinessReport"],
  ["lib/auth/auth-driver-factory.ts", "getAuthDriver"],
  ["lib/auth/auth-readiness.ts", "AUTH_PROVIDER_OPTIONS"],
  ["lib/auth/auth-readiness.ts", "getAuthReadinessReport"],
  ["lib/account/local-to-account-migration.ts", "prepareRecordsForAccountMigration"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing auth readiness file: ${file}`);
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

console.log(`Auth readiness check passed for ${requiredFiles.length} files.`);
