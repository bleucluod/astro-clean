import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const batchFiles = [
  "app/dashboard/page.tsx",
  "app/profile/page.tsx",
  "components/SupabaseAuthPanel.tsx",
  "components/AppShell.tsx",
];

const forbiddenVisibleTokens = [
  "local-preview",
  "local/private",
  "private/noindex",
  "public/noindex",
  "public/indexable",
  "indexable",
  "beta-db",
  "guarded",
  "Feature gate",
  "Readiness",
  "Account read guard",
  "Beta database archive",
  "account-save guarded + local-preview fallback",
  "NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN",
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE",
  "/reports?source=account",
  "Supabase Auth + Supabase/Postgres",
  "Account readiness",
  "Account Identity Snapshot",
  "Plan Entitlements",
  "Account Next Step",
  "Database storage",
  "User ID",
  "E.164",
];

function lineLooksImplementationOnly(line) {
  const trimmed = line.trim();

  return (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("from ") ||
    trimmed.startsWith("export default function ") ||
    trimmed.startsWith("export function ") ||
    trimmed.startsWith("const config =") ||
    trimmed.startsWith("const accountSaveConfig =") ||
    trimmed.startsWith("const accountReadConfig =") ||
    trimmed.includes("getSupabase") ||
    trimmed.includes("mapSupabase") ||
    trimmed.includes("createSupabaseUsernameBridgeEmail") ||
    trimmed.includes("mobile_phone") ||
    trimmed.includes("auth_model") ||
    trimmed.includes("bridge_credential_kind") ||
    trimmed.includes("username_is_user_chosen") ||
    trimmed.includes("phone_is_not_username") ||
    trimmed.includes("email_is_secondary")
  );
}

for (const file of batchFiles) {
  const text = read(file);
  const lines = text.split("\n");

  for (const [index, line] of lines.entries()) {
    if (lineLooksImplementationOnly(line)) {
      continue;
    }

    for (const token of forbiddenVisibleTokens) {
      assert(
        !line.includes(token),
        `${file}:L${index + 1} still exposes technical token: ${token}`,
      );
    }
  }
}

const dashboard = read("app/dashboard/page.tsx");
const profile = read("app/profile/page.tsx");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const appShell = read("components/AppShell.tsx");

assert(dashboard.includes("dashboard-copy-detox-marker"), "Dashboard copy detox marker is missing.");
assert(profile.includes("profile-copy-detox-marker"), "Profile copy detox marker is missing.");
assert(authPanel.includes("account-ready-copy-detox-marker"), "Auth panel copy detox marker is missing.");
assert(!dashboard.includes("persistentReportsDecision"), "Dashboard still imports/displays persistent report decision status.");
assert(!dashboard.includes("createAccountMigrationPreflight"), "Dashboard still imports migration preflight.");
assert(!dashboard.includes("LocalDataBackupPanel"), "Dashboard still foregrounds backup/admin panel.");
assert(!profile.includes("getPlanEntitlement"), "Profile still imports plan entitlement/status UI.");
assert(!profile.includes("session?.source"), "Profile still displays provider/source.");
assert(!authPanel.includes("realAccountFlowPublicBlockers"), "Auth panel still exposes blocker/status flow model.");
assert(!authPanel.includes("session.user.id}"), "Auth panel still displays raw user id.");
assert(!authPanel.includes('href="/reports?source=account"'), "Auth panel still links to raw account query route.");
assert(!appShell.includes("فعلاً رایگان"), "Footer still uses temporary/defensive copy.");

console.log("User-facing copy detox dashboard/profile guard passed.");
