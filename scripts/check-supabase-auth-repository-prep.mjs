import fs from "node:fs";

const requiredFiles = [
  ".env.example",
  "lib/config/env.ts",
  "lib/auth/auth-driver-factory.ts",
  "lib/auth/supabase-auth-driver.ts",
  "lib/auth/auth-readiness.ts",
  "lib/storage/persistent-report-repository.ts",
  "lib/account/persistent-report-decision.ts",
  "docs/PERSISTENT_REPORTS_AUTH_DECISION.md",
  "docs/AUTH_READINESS.md",
  "docs/STORAGE_ADAPTER_IMPLEMENTATION.md",
  "docs/STORAGE_ARCHITECTURE.md",
  "docs/LOCAL_TO_ACCOUNT_MIGRATION.md",
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

const envExample = read(".env.example");
const envConfig = read("lib/config/env.ts");
const authFactory = read("lib/auth/auth-driver-factory.ts");
const supabaseStub = read("lib/auth/supabase-auth-driver.ts");
const authReadiness = read("lib/auth/auth-readiness.ts");
const repoPrep = read("lib/storage/persistent-report-repository.ts");
const decision = read("lib/account/persistent-report-decision.ts");
const decisionDoc = read("docs/PERSISTENT_REPORTS_AUTH_DECISION.md");
const authDoc = read("docs/AUTH_READINESS.md");
const storageAdapter = read("docs/STORAGE_ADAPTER_IMPLEMENTATION.md");
const storageArchitecture = read("docs/STORAGE_ARCHITECTURE.md");
const migrationDoc = read("docs/LOCAL_TO_ACCOUNT_MIGRATION.md");
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
  "HALLEUS_ENABLE_SUPABASE_AUTH_STUB=false",
  "HALLEUS_ENABLE_ACCOUNT_STORAGE=false",
  "NEXT_PUBLIC_SUPABASE_URL=",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
]) {
  mustContain(envExample, token, ".env.example");
}

for (const token of [
  "supabaseAuthStubEnabled",
  "accountStorageEnabled",
  "hasSupabasePublicConfig",
  "hasSupabaseServerConfig",
  "canUseSupabaseAuthStub",
  "canUseAccountStorage",
]) {
  mustContain(envConfig, token, "env config");
}

for (const token of [
  "createSupabaseAuthDriverStub",
  "getPreparedSupabaseAuthDriverStub",
  "canUseSupabaseAuthStub",
  "return createPreviewAuthDriver();",
]) {
  mustContain(authFactory, token, "auth driver factory");
}

for (const token of [
  "SupabaseAuthDriverStubReadiness",
  "stage: \"stub-only\"",
  "canCreateRealSession: false",
  "real login is not enabled yet",
  "return getPreviewSession();",
]) {
  mustContain(supabaseStub, token, "Supabase auth driver stub");
}

for (const token of [
  "hasSupabasePublicConfig",
  "hasSupabaseServerConfig",
  "canEnableRealLogin: false",
  "Use the Supabase auth driver stub for contract wiring only.",
  'stage: blockers.length === 0 ? "staging" : "provider-selected"',
]) {
  mustContain(authReadiness, token, "auth readiness");
}

for (const token of [
  "PersistentReportRepositoryPrep",
  "activeRepositoryMode: persistentReportsDecision.activeStorageMode",
  "preparedRepositoryMode: \"account-storage\"",
  "canWriteAccountReports: false",
  "assertAccountStorageStillDisabled",
]) {
  mustContain(repoPrep, token, "persistent repository prep");
}

for (const token of [
  "selected-not-enabled",
  "supabase-postgres",
  "local-preview",
]) {
  mustContain(decision, token, "persistent reports decision");
}

for (const token of [
  "v0.1.181",
  "Supabase auth driver stub",
  "persistent report repository prep",
  "HALLEUS_ENABLE_SUPABASE_AUTH_STUB=false",
  "HALLEUS_ENABLE_ACCOUNT_STORAGE=false",
]) {
  mustContain(decisionDoc + authDoc + storageAdapter + storageArchitecture + migrationDoc, token, "docs");
}

mustContain(context, "v0.1.181", "project context");
mustContain(ideaGarden, "v0.1.181", "idea garden");

for (const stale of [
  "@supabase/supabase-js",
  "createClient(",
  "canEnableRealLogin: true",
  "canWriteAccountReports: true",
]) {
  mustNotContain(packageJson + supabaseStub + repoPrep + authReadiness, stale, "v0.1.181 prep");
}

console.log("Supabase auth stub and persistent repository prep check passed.");
