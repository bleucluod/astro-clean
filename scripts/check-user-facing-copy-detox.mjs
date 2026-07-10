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
  "User ID",
  "E.164",
];

function lineLooksImplementationOnly(line) {
  const trimmed = line.trim();

  return (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("from ") ||
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

const authPanel = read("components/SupabaseAuthPanel.tsx");
const appShell = read("components/AppShell.tsx");

assert(authPanel.includes("account-ready-copy-detox-marker"), "Auth panel copy detox marker is missing.");
assert(!authPanel.includes("realAccountFlowPublicBlockers"), "Auth panel still exposes blocker/status flow model.");
assert(!authPanel.includes("session.user.id}</span>"), "Auth panel still displays raw user id.");
assert(!authPanel.includes('href="/reports?source=account"'), "Auth panel still links to raw account query route.");
assert(!appShell.includes("فعلاً رایگان"), "Footer still uses temporary/defensive copy.");
assert(appShell.includes("footer-note"), "Footer note structure missing.");

console.log("User-facing copy detox account-shell guard passed.");
