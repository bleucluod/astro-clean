import fs from "node:fs";

const requiredFiles = [
  ".env.example",
  "app/dashboard/page.tsx",
  "lib/account/persistent-report-decision.ts",
  "lib/auth/auth-readiness.ts",
  "docs/PERSISTENT_REPORTS_AUTH_DECISION.md",
  "docs/AUTH_DB_DECISION_NOTES.md",
  "docs/AUTH_PROVIDER_DECISION_MATRIX.md",
  "docs/AUTH_READINESS.md",
  "docs/LOCAL_TO_ACCOUNT_MIGRATION.md",
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
const dashboard = read("app/dashboard/page.tsx");
const decision = read("lib/account/persistent-report-decision.ts");
const authReadiness = read("lib/auth/auth-readiness.ts");
const decisionDoc = read("docs/PERSISTENT_REPORTS_AUTH_DECISION.md");
const authDbNotes = read("docs/AUTH_DB_DECISION_NOTES.md");
const authMatrix = read("docs/AUTH_PROVIDER_DECISION_MATRIX.md");
const authDoc = read("docs/AUTH_READINESS.md");
const migrationDoc = read("docs/LOCAL_TO_ACCOUNT_MIGRATION.md");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

const mustContain = (text, token, label) => {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
};

const mustNotContain = (text, token, label) => {
  if (text.includes(token)) {
    throw new Error(`${label} still contains stale token: ${token}`);
  }
};

for (const token of [
  "PersistentReportsDecision",
  'authProvider: "supabase"',
  'storageProvider: "supabase-postgres"',
  'stage: "selected-not-enabled"',
  'activeStorageMode: "local-preview"',
  "migrationRules",
]) {
  mustContain(decision, token, "persistent reports decision");
}

for (const token of [
  'provider: "supabase"',
  'status: "selected"',
  'stage: blockers.length === 0 ? "staging" : "provider-selected"',
  "Configure the Supabase/Postgres database URL outside Git.",
]) {
  mustContain(authReadiness, token, "auth readiness");
}

for (const token of [
  "NEXT_PUBLIC_SUPABASE_URL=",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
  "SUPABASE_SERVICE_ROLE_KEY=",
]) {
  mustContain(envExample, token, ".env.example");
}

for (const token of [
  "persistentReportsDecision",
  "Supabase-first",
  "selected-not-enabled",
  "local-preview",
  "private / noindex",
]) {
  mustContain(dashboard, token, "dashboard decision card");
}

for (const token of [
  "Supabase-first",
  "selected-not-enabled",
  "local-preview",
  "private / noindex",
  "Do not delete browser-local reports until account import succeeds.",
]) {
  mustContain(decisionDoc, token, "decision doc");
}

for (const token of [
  "Supabase Auth + Supabase/Postgres",
  "selected",
  "v0.1.180",
]) {
  mustContain(authDbNotes + authMatrix + authDoc + migrationDoc, token, "decision docs");
}

mustContain(context, "v0.1.180", "project context");
mustContain(ideaGarden, "v0.1.180", "idea garden");

for (const stale of [
  "real login is active",
  "production database writes are enabled",
  "public reports are enabled",
]) {
  mustNotContain(decisionDoc + dashboard, stale, "decision copy");
}

console.log("Persistent reports/auth decision check passed.");
