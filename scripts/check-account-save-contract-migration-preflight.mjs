import fs from "node:fs";

const requiredFiles = [
  "app/dashboard/page.tsx",
  "components/LocalDataBackupPanel.tsx",
  "lib/account/account-report-save-contract.ts",
  "lib/account/account-migration-preflight.ts",
  "lib/account/account-migration-review.ts",
  "lib/storage/persistent-report-repository.ts",
  "docs/ACCOUNT_REPORT_SAVE_CONTRACT.md",
  "docs/LOCAL_TO_ACCOUNT_MIGRATION.md",
  "docs/PERSISTENT_REPORTS_AUTH_DECISION.md",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "package.json",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(file, "utf8");

const dashboard = read("app/dashboard/page.tsx");
const backupPanel = read("components/LocalDataBackupPanel.tsx");
const saveContract = read("lib/account/account-report-save-contract.ts");
const migrationPreflight = read("lib/account/account-migration-preflight.ts");
const migrationReview = read("lib/account/account-migration-review.ts");
const persistentRepo = read("lib/storage/persistent-report-repository.ts");
const contractDoc = read("docs/ACCOUNT_REPORT_SAVE_CONTRACT.md");
const migrationDoc = read("docs/LOCAL_TO_ACCOUNT_MIGRATION.md");
const decisionDoc = read("docs/PERSISTENT_REPORTS_AUTH_DECISION.md");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
const packageJson = read("package.json");

const mustContain = (text, token, label) => {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
};

const mustNotContain = (text, token, label) => {
  if (text.includes(token)) {
    throw new Error(`${label} contains forbidden token: ${token}`);
  }
};

for (const token of [
  "AccountReportSaveContract",
  "activeSaveMode: \"local-preview\"",
  "futureSaveMode: \"account-storage\"",
  "canSaveToAccount: false",
  "assertAccountReportWritesStillDisabled",
  "Never delete browser-local reports until account import succeeds.",
]) {
  mustContain(saveContract, token, "account report save contract");
}

for (const token of [
  "AccountMigrationPreflight",
  "canStartAccountMigration: false",
  "requiresBackup: true",
  "requiresRealLogin: true",
  "Do not delete local-preview reports.",
  "describeAccountMigrationPreflight",
]) {
  mustContain(migrationPreflight, token, "migration preflight");
}

for (const token of [
  "AccountMigrationReviewModel",
  "canExecuteMigration: false",
  "requiresUserConfirmation: true",
  "Do not delete browser-local reports until account import succeeds.",
]) {
  mustContain(migrationReview, token, "migration review");
}

for (const token of [
  "getAccountReportSaveContract",
  "createAccountMigrationPreflight",
  "createAccountMigrationReviewModel",
  "LocalDataBackupPanel",
  "پیش‌پرواز مهاجرت",
  "مهاجرت به حساب هنوز غیرفعال است",
  "Can save to account",
  "Can execute",
  "گرفتن خروجی JSON از گزارش‌ها",
]) {
  mustContain(dashboard, token, "dashboard");
}

for (const token of [
  "Backup before migration",
  "خروجی امن داده‌های local-preview",
  "account import واقعی را اجرا نمی‌کند",
]) {
  mustContain(backupPanel, token, "local backup panel");
}

for (const token of [
  "activeSaveMode: local-preview",
  "futureSaveMode: account-storage",
  "canSaveToAccount: false",
  "Migration preflight UI",
  "This is a preflight surface only",
]) {
  mustContain(contractDoc, token, "contract doc");
}

for (const token of [
  "v0.1.182",
  "v0.1.183",
  "account report save contract",
  "migration preflight",
  "canSaveToAccount: false",
]) {
  mustContain(migrationDoc + decisionDoc + context + ideaGarden, token, "docs");
}

mustContain(persistentRepo, "canWriteAccountReports: false", "persistent repository prep");
mustContain(packageJson, '"@supabase/supabase-js"', "package.json");

for (const forbidden of [
  "canSaveToAccount: true",
  "canStartAccountMigration: true",
  "canWriteAccountReports: true",
  "delete local-preview reports after import",
]) {
  mustNotContain(saveContract + migrationPreflight + migrationReview + persistentRepo + dashboard, forbidden, "v0.1.183 account save/migration");
}

console.log("Account report save contract and migration preflight check passed.");
