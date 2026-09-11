import fs from "node:fs";

const requiredFiles = [
  "app/dashboard/page.tsx",
  "app/profile/layout.tsx",
  "app/profile/page.tsx",
  "app/profile/profile-page.module.css",
  "components/SupabaseAuthPanel.tsx",
  "components/TelegramJoinRewardCard.tsx",
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    failures.push(`Missing account UI file: ${file}`);
  }
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const dashboard = read("app/dashboard/page.tsx");
const profileLayout = read("app/profile/layout.tsx");
const profile = read("app/profile/page.tsx");
const profileCss = read("app/profile/profile-page.module.css");

for (const marker of [
  "listReportSummaries",
  "SupabaseAuthPanel",
  "dashboard-copy-detox-marker",
]) {
  if (!dashboard.includes(marker)) {
    failures.push(`Dashboard missing account UI marker: ${marker}`);
  }
}

for (const marker of [
  "index: false",
  "follow: false",
]) {
  if (!profileLayout.includes(marker)) {
    failures.push(`Profile layout missing noindex marker: ${marker}`);
  }
}

for (const marker of [
  "getAccountRepository",
  "listAccountReportSummaries",
  "listReportSummaries",
  "SupabaseAuthPanel",
  "TelegramJoinRewardCard",
  'from "./profile-page.module.css"',
  'data-halleus-profile="account-home-v2"',
  "profile-account-home-v2-marker",
  'href="/reports"',
  'href="/privacy"',
  'href="/dashboard"',
]) {
  if (!profile.includes(marker)) {
    failures.push(`Profile missing account-home marker: ${marker}`);
  }
}

for (const forbidden of [
  'className="grid"',
  'className="card"',
  "حریم گزارش‌ها</strong>",
  "<span>خصوصی</span>",
  "getPlanEntitlement",
]) {
  if (profile.includes(forbidden)) {
    failures.push(`Profile still contains legacy marker: ${forbidden}`);
  }
}

for (const marker of [
  ".page {",
  ".hero {",
  ".contentGrid {",
  ".authSurface",
  ".rewardSurface",
  ":global(.card)",
  ":global(.auth-mode-tabs)",
  "prefers-reduced-motion",
]) {
  if (!profileCss.includes(marker)) {
    failures.push(`Profile CSS missing product marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Account UI readiness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Account UI readiness check passed.");
console.log("- profile uses a dedicated account-home surface instead of legacy global card/grid shell");
console.log("- profile remains noindex/nofollow");
console.log("- auth, report access, Telegram reward, dashboard, and privacy entry points remain wired");
