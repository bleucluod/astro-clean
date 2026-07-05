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
const authPanel = read("components/SupabaseAuthPanel.tsx");
const profile = read("app/profile/page.tsx");
const dashboard = read("app/dashboard/page.tsx");
const reportsPage = read("app/reports/page.tsx");
const contextDoc = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const token of [
  "ورود و ثبت‌نام در هالیوس",
  "حساب ندارم؛ ثبت‌نام",
  "قبلاً حساب دارم؛ ورود",
  "برای ورود فقط نام کاربری و رمز لازم است",
  "موبایل داده اجباری مشتری است اما username نیست",
  "describeAuthError",
]) {
  mustContain("SupabaseAuthPanel", authPanel, token);
}

for (const token of [
  "پروفایل حساب هالیوس",
  "username شناسه انتخابی کاربر است",
  "ایمیل optional/secondary",
  "flow واقعی اکانت",
  "/reports?source=account",
]) {
  mustContain("profile page", profile, token);
}

for (const token of [
  "اکانت واقعی: smoke test پاس شده",
  "ورود: username + password",
  "تست سریع اکانت واقعی",
  "local و account کنار هم",
  "migration گزارش‌های قدیمی هنوز مرحله بعدی نیست",
]) {
  mustContain("dashboard page", dashboard, token);
}

for (const token of [
  "isAccountSource",
  "گزارش‌های خصوصی ذخیره‌شده در حساب",
  "دیدن گزارش‌های account",
  "private/noindex",
]) {
  mustContain("reports page", reportsPage, token);
}

for (const token of [
  "v0.1.194 Account UX Polish",
  "account/profile/dashboard polish after real account smoke test",
]) {
  mustContain("docs", `${contextDoc}\n${ideaGarden}`, token);
}

mustContain(
  "package.json",
  packageJson.scripts?.["check:account-ux-polish"] ?? "",
  "scripts/check-account-ux-polish.mjs",
);

for (const forbidden of [
  "SUPABASE_SERVICE_ROLE_KEY=",
  "DATABASE_URL=",
  "localStorage.removeItem",
  "public/indexable reports are enabled",
]) {
  mustNotContain(
    "account ux polish surface",
    `${authPanel}\n${profile}\n${dashboard}\n${reportsPage}`,
    forbidden,
  );
}

console.log("Account UX polish check passed.");
