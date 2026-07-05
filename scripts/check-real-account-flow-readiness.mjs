import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function mustContain(label, text, token) {
  if (!text.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
}

function mustNotContain(label, text, token) {
  if (text.includes(token)) {
    throw new Error(`${label} must not contain forbidden token: ${token}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
const envExample = read(".env.example");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const profile = read("app/profile/page.tsx");
const dashboard = read("app/dashboard/page.tsx");
const runbook = read("docs/REAL_ACCOUNT_FLOW_TEST_RUNBOOK.md");
const contextDoc = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const token of [
  "getAccountReportReadClientConfig",
  "Real Supabase Account Flow Test",
  "signup با نام کاربری + موبایل",
  "/reports?source=account",
  "DATABASE_URL",
  "AUTH_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "username انتخابی کاربر است",
  "موبایل جمع‌آوری می‌شود اما username نیست",
  "email فقط secondary/optional است",
]) {
  mustContain("SupabaseAuthPanel", authPanel, token);
}

for (const token of [
  "shell ورود واقعی Supabase",
  "نام کاربری انتخابی، موبایل و رمز",
  "ذخیره گزارش روی account",
  "/reports?source=account",
  "migration گزارش‌های local فعلاً deferred",
]) {
  mustContain("profile page", profile, token);
}

for (const token of [
  "username + mobile + password",
  "migration هنوز فعال نشده",
  "فعلاً اولویت ندارد",
  "/reports?source=account",
  "migration فعلاً deferred",
]) {
  mustContain("dashboard page", dashboard, token);
}

for (const token of [
  "Real Account Flow Test Runbook",
  "Username is chosen by the user",
  "Mobile phone is collected",
  "mobile is not the username",
  "Email is optional/secondary",
  "NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=true",
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true",
  "HALLEUS_ENABLE_ACCOUNT_STORAGE=true",
  "DATABASE_URL=...",
  "AUTH_SECRET=...",
  "SUPABASE_SERVICE_ROLE_KEY=...",
  "/reports?source=account",
  "No migration executes",
  "No local report deletion happens",
]) {
  mustContain("runbook", runbook, token);
}

for (const token of [
  "Real Supabase account flow local test",
  "Username is user-chosen",
  "mobile is collected but is not the username",
]) {
  mustContain(".env.example", envExample, token);
}

for (const token of [
  "v0.1.188 Real Supabase Account Flow Test Readiness",
  "docs/REAL_ACCOUNT_FLOW_TEST_RUNBOOK.md",
  "username + mobile signup",
]) {
  mustContain("docs", `${contextDoc}\n${ideaGarden}`, token);
}

mustContain(
  "package.json",
  packageJson.scripts?.["check:real-account-flow-readiness"] ?? "",
  "scripts/check-real-account-flow-readiness.mjs",
);

for (const forbidden of [
  "canExecuteMigration: true",
  "canStartAccountMigration: true",
  "public/indexable reports are enabled",
]) {
  mustNotContain(
    "real account flow readiness surface",
    `${authPanel}\n${profile}\n${dashboard}\n${runbook}\n${contextDoc}\n${ideaGarden}`,
    forbidden,
  );
}

console.log("Real account flow readiness check passed.");
