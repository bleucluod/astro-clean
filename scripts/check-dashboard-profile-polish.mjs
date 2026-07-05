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
const dashboard = read("app/dashboard/page.tsx");
const profile = read("app/profile/page.tsx");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const runbook = read("docs/REAL_ACCOUNT_FLOW_TEST_RUNBOOK.md");
const contextDoc = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const token of [
  "Account Flow Cockpit",
  "تست سریع اکانت واقعی",
  "username انتخابی کاربر است",
  "موبایل داده اجباری مشتری است اما username نیست",
  "/reports?source=account",
  "تست ورود و ثبت‌نام",
]) {
  mustContain("dashboard", dashboard, token);
}

for (const token of [
  "Account Identity Snapshot",
  "قانون شناسه و اطلاعات مشتری",
  "username شناسه انتخابی کاربر است",
  "موبایل برای ارتباط و تست account flow نگه داشته می‌شود",
  "ایمیل optional/secondary",
  "/reports?source=account",
]) {
  mustContain("profile", profile, token);
}

for (const token of [
  "Logged-in account next steps",
  "ساخت گزارش بعدی",
  "دیدن account reports",
  "گزارش‌های account همچنان private/noindex هستند",
]) {
  mustContain("SupabaseAuthPanel", authPanel, token);
}

for (const token of [
  "v0.1.189 dashboard/profile polish checklist",
  "Account Identity Snapshot",
  "Account Flow Cockpit",
  "mobile is not the username",
]) {
  mustContain("runbook", runbook, token);
}

for (const token of [
  "v0.1.189 Account Dashboard/Profile Polish",
  "v0.1.189 account dashboard/profile polish",
  "mobile is collected but is not the username",
]) {
  mustContain("docs", `${contextDoc}\n${ideaGarden}`, token);
}

mustContain(
  "package.json",
  packageJson.scripts?.["check:dashboard-profile-polish"] ?? "",
  "scripts/check-dashboard-profile-polish.mjs",
);

for (const forbidden of [
  "canExecuteMigration: true",
  "canStartAccountMigration: true",
  "public/indexable reports are enabled",
]) {
  mustNotContain(
    "dashboard/profile polish surface",
    `${dashboard}\n${profile}\n${authPanel}\n${runbook}\n${contextDoc}\n${ideaGarden}`,
    forbidden,
  );
}

console.log("Account dashboard/profile polish check passed.");
