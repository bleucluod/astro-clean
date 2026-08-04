import fs from "node:fs";

const requiredFiles = [
  ".env.example",
  "package.json",
  "lib/config/env.ts",
  "lib/account/account-report-save-readiness.ts",
  "lib/account/account-report-save-contract.ts",
  "lib/auth/supabase-server-user.ts",
  "lib/auth/supabase-browser-client.ts",
  "lib/database/account-persistence-user.ts",
  "lib/storage/account-report-save-client.ts",
  "lib/storage/server-report-persistence.ts",
  "lib/storage/database-report-repository.ts",
  "app/api/reports/account/route.ts",
  "components/ChartForm.tsx",
  "components/SupabaseAuthPanel.tsx",
  "app/dashboard/page.tsx",
  "app/profile/page.tsx",
  "docs/ACCOUNT_REPORT_SAVE_CONTRACT.md",
  "docs/LOCAL_TO_ACCOUNT_MIGRATION.md",
  "docs/PERSISTENT_REPORTS_AUTH_DECISION.md",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(file, "utf8");

const envExample = read(".env.example");
const packageJson = read("package.json");
const envConfig = read("lib/config/env.ts");
const readiness = read("lib/account/account-report-save-readiness.ts");
const saveContract = read("lib/account/account-report-save-contract.ts");
const serverUser = read("lib/auth/supabase-server-user.ts");
const accountUser = read("lib/database/account-persistence-user.ts");
const accountClient = read("lib/storage/account-report-save-client.ts");
const accountRoute = read("app/api/reports/account/route.ts");
const chartForm = read("components/ChartForm.tsx");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const dashboard = read("app/dashboard/page.tsx");
const profile = read("app/profile/page.tsx");
const docs = [
  read("docs/ACCOUNT_REPORT_SAVE_CONTRACT.md"),
  read("docs/LOCAL_TO_ACCOUNT_MIGRATION.md"),
  read("docs/PERSISTENT_REPORTS_AUTH_DECISION.md"),
  read("docs/HALLEUS_PROJECT_CONTEXT.md"),
  read("docs/HALLEUS_IDEA_GARDEN.md"),
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

for (const token of [
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=false",
  "HALLEUS_ENABLE_ACCOUNT_STORAGE=false",
  "SUPABASE_SERVICE_ROLE_KEY=",
]) {
  mustContain(envExample, token, ".env.example");
}

for (const token of [
  "accountReportSaveEnabled",
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE",
  "canUseAccountReportSavePath",
  "hasSupabaseServerConfig",
]) {
  mustContain(envConfig, token, "env config");
}

for (const token of [
  "AccountReportSaveReadiness",
  "getAccountReportSaveReadiness",
  "account-save-enabled",
  "local-preview-with-account-copy",
  "New account report saves require a verified Supabase bearer token.",
  "Local-to-account migration execution remains disabled.",
]) {
  mustContain(readiness, token, "account save readiness");
}

for (const token of [
  "getAccountReportSaveReadiness",
  "canSaveToAccount: boolean",
  "accountSaveReadiness",
  "assertAccountReportSavePathReady",
  "Never delete browser-local reports until account import succeeds.",
]) {
  mustContain(saveContract, token, "account save contract");
}

for (const token of [
  "getSupabaseUserFromAuthorizationHeader",
  "client.auth.getUser(token)",
  "persistSession: false",
]) {
  mustContain(serverUser, token, "Supabase server user verifier");
}

for (const token of [
  "ensureAccountPersistenceUser",
  "insert into halleus_users",
  "on conflict (id) do update",
  'provider?: "email" | "phone"',
  'provider = "email"',
  "normalizedProvider",
]) {
  mustContain(accountUser, token, "account persistence user");
}

for (const token of [
  "saveGeneratedReportWithAccountFallback",
  "getAccountReportSaveClientConfig",
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE",
  "Authorization: `Bearer ${accessToken}`",
  "/api/reports/account",
  "local-preview fallback",
]) {
  mustContain(accountClient, token, "account save client");
}

for (const token of [
  "accountReportSaveGuard",
  "getAccountReportSaveReadiness",
  "getSupabaseUserFromAuthorizationHeader",
  "ensureAccountPersistenceUser",
  "saveServerGeneratedReport",
  "listServerReportSummaries",
  "user.id",
]) {
  mustContain(accountRoute, token, "account report route");
}

for (const token of [
  "saveGeneratedReportWithAccountFallback",
  "accountStatus === \"account-saved\"",
  "گزارش خصوصی در حساب ذخیره شد",
  "local-preview",
  "router.push(`/reports/${saveResult.localRecord.id}`)",
]) {
  mustContain(chartForm, token, "ChartForm");
}

for (const token of [
  "getAccountReportSaveClientConfig",
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true",
  "account-save guarded + local-preview fallback",
  "migration واقعی هنوز خاموش است",
]) {
  mustContain(authPanel, token, "SupabaseAuthPanel");
}

for (const token of [
  "accountSaveContract.accountSaveReadiness.stage",
  "تست ذخیره گزارش تازه",
  "migration هنوز فعال نشده",
]) {
  mustContain(dashboard, token, "dashboard");
}

for (const token of [
  "v0.1.184",
  "user-owned account report save path",
  "private/noindex",
  "migration still disabled",
]) {
  mustContain(docs, token, "docs");
}

mustContain(packageJson, "\"check:user-owned-account-save-path\"", "package.json");

for (const forbidden of [
  "public/indexable reports are enabled",
  "localStorage.clear()",
  "canExecuteMigration: true",
]) {
  mustNotContain(accountRoute + accountClient + chartForm + dashboard + docs, forbidden, "v0.1.184 account save path");
}

console.log("User-owned account report save path check passed.");