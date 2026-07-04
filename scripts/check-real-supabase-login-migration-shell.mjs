import fs from "node:fs";

const requiredFiles = [
  "package.json",
  "pnpm-lock.yaml",
  ".env.example",
  "components/SupabaseAuthPanel.tsx",
  "components/LocalDataBackupPanel.tsx",
  "app/profile/page.tsx",
  "app/dashboard/page.tsx",
  "lib/auth/supabase-browser-client.ts",
  "lib/auth/supabase-session-mapper.ts",
  "lib/auth/supabase-auth-driver.ts",
  "lib/auth/auth-driver-factory.ts",
  "lib/auth/auth-readiness.ts",
  "lib/account/account-migration-review.ts",
  "lib/account/account-report-save-contract.ts",
  "lib/account/account-migration-preflight.ts",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/PERSISTENT_REPORTS_AUTH_DECISION.md",
  "docs/LOCAL_TO_ACCOUNT_MIGRATION.md",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(file, "utf8");

const packageJson = read("package.json");
const lockfile = read("pnpm-lock.yaml");
const envExample = read(".env.example");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const backupPanel = read("components/LocalDataBackupPanel.tsx");
const profile = read("app/profile/page.tsx");
const dashboard = read("app/dashboard/page.tsx");
const browserClient = read("lib/auth/supabase-browser-client.ts");
const sessionMapper = read("lib/auth/supabase-session-mapper.ts");
const supabaseDriver = read("lib/auth/supabase-auth-driver.ts");
const authFactory = read("lib/auth/auth-driver-factory.ts");
const authReadiness = read("lib/auth/auth-readiness.ts");
const migrationReview = read("lib/account/account-migration-review.ts");
const saveContract = read("lib/account/account-report-save-contract.ts");
const migrationPreflight = read("lib/account/account-migration-preflight.ts");
const docs = [
  read("docs/HALLEUS_PROJECT_CONTEXT.md"),
  read("docs/HALLEUS_IDEA_GARDEN.md"),
  read("docs/PERSISTENT_REPORTS_AUTH_DECISION.md"),
  read("docs/LOCAL_TO_ACCOUNT_MIGRATION.md"),
].join("\n");

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

mustContain(packageJson, '"@supabase/supabase-js"', "package.json");
mustContain(lockfile, "@supabase/supabase-js", "pnpm-lock.yaml");

for (const token of [
  "NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=false",
  "NEXT_PUBLIC_SUPABASE_URL=",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
  "HALLEUS_ENABLE_ACCOUNT_STORAGE=false",
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=false",
]) {
  mustContain(envExample, token, ".env.example");
}

for (const token of [
  "createClient",
  "getSupabaseBrowserLoginConfig",
  "getSupabaseBrowserAuthClient",
  "persistSession: true",
]) {
  mustContain(browserClient, token, "browser client");
}

for (const token of [
  "signInWithPassword",
  "signUp",
  "signOut",
  "onAuthStateChange",
  "NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN",
  "account report save path guard شده است",
  "migration واقعی هنوز خاموش است",
]) {
  mustContain(authPanel, token, "auth panel");
}

for (const token of [
  "mapSupabaseSessionToHalleusSession",
  'provider: "email"',
  'status: "active"',
]) {
  mustContain(sessionMapper, token, "session mapper");
}

for (const token of [
  "signInWithPassword",
  "createSupabaseAuthDriver",
  "createSupabaseAuthDriverStub",
]) {
  mustContain(supabaseDriver, token, "supabase auth driver");
}

for (const token of [
  "getPreparedSupabaseAuthDriver",
  "canUseRealSupabaseLogin",
  "return createPreviewAuthDriver();",
]) {
  mustContain(authFactory, token, "auth factory");
}

for (const token of [
  "canEnableRealLogin: canUseRealSupabaseLogin()",
  "Keep account report writes disabled until migration review is implemented.",
]) {
  mustContain(authReadiness, token, "auth readiness");
}

for (const token of [
  "SupabaseAuthPanel",
  "shell ورود واقعی Supabase",
  "ذخیره گزارش روی account",
]) {
  mustContain(profile, token, "profile page");
}

for (const token of [
  "SupabaseAuthPanel",
  "LocalDataBackupPanel",
  "createAccountMigrationReviewModel",
  "migration هنوز فعال نشده",
  "Would import",
  "Can execute",
]) {
  mustContain(dashboard, token, "dashboard");
}

for (const token of [
  "Backup before migration",
  "account import واقعی را اجرا نمی‌کند",
]) {
  mustContain(backupPanel, token, "backup panel");
}

for (const token of [
  "AccountMigrationReviewModel",
  "canExecuteMigration: false",
  "requiresBackup: true",
]) {
  mustContain(migrationReview, token, "migration review");
}

for (const token of [
  "canSaveToAccount: boolean",
  "canStartAccountMigration: false",
]) {
  mustContain(saveContract + migrationPreflight, token, "save/migration guard");
}

for (const token of [
  "v0.1.183",
  "real Supabase login shell",
  "migration review shell",
  "account report writes remain disabled",
]) {
  mustContain(docs, token, "docs");
}

for (const forbidden of [
  "canStartAccountMigration: true",
  "canExecuteMigration: true",
  "canWriteAccountReports: true",
  "public/indexable reports are enabled",
]) {
  mustNotContain(envExample + authPanel + dashboard + saveContract + migrationPreflight + migrationReview + docs, forbidden, "v0.1.183 guards");
}

console.log("Real Supabase login and migration review shell check passed.");