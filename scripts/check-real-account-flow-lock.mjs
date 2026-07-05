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
const identity = read("lib/auth/account-identity-normalization.ts");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const serverUser = read("lib/auth/supabase-server-user.ts");
const persistenceUser = read("lib/database/account-persistence-user.ts");
const accountRoute = read("app/api/reports/account/route.ts");
const runbook = read("docs/REAL_ACCOUNT_FLOW_TEST_RUNBOOK.md");
const contextDoc = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const token of [
  "normalizeAccountUsername",
  "normalizeAccountPhone",
  "validateAccountIdentityInput",
  "E164_PHONE_PATTERN",
  "Username is user-chosen",
  "Mobile phone is collected in E.164 format",
  "Email is optional/secondary",
]) {
  mustContain("account identity normalization", identity, token);
}

for (const token of [
  "validateAccountIdentityInput",
  "phone_is_not_username",
  "username_is_user_chosen",
  "mobile_phone",
  "+989121234567",
  "phone confirmation",
  "حالا یک گزارش تست بساز",
]) {
  mustContain("SupabaseAuthPanel", authPanel, token);
}

for (const token of [
  "phone?: string",
  "provider: \"email\" | \"phone\"",
  "phone: data.user.phone",
  "provider: data.user.phone ? \"phone\" : \"email\"",
]) {
  mustContain("server user verifier", serverUser, token);
}

for (const token of [
  "provider?: \"email\" | \"phone\"",
  "normalizedProvider",
  "provider = excluded.provider",
]) {
  mustContain("account persistence user", persistenceUser, token);
}

mustContain("account route", accountRoute, "provider: user.provider");

for (const token of [
  "v0.1.190 real account flow lock checklist",
  "E.164 format",
  "username_is_user_chosen",
  "phone_is_not_username",
  "pending-confirmation message",
  "provider as `phone`",
]) {
  mustContain("runbook", runbook, token);
}

for (const token of [
  "v0.1.190 Real Account Flow Lock",
  "E.164 mobile validation",
  "v0.1.190 real account flow lock",
  "Mobile must not become the username",
]) {
  mustContain("docs", `${contextDoc}\n${ideaGarden}`, token);
}

mustContain(
  "package.json",
  packageJson.scripts?.["check:real-account-flow-lock"] ?? "",
  "scripts/check-real-account-flow-lock.mjs",
);

for (const forbidden of [
  "provider = 'email'",
  "mobile is the username",
  "phone is the username",
  "canExecuteMigration: true",
  "canStartAccountMigration: true",
  "public/indexable reports are enabled",
]) {
  mustNotContain(
    "real account flow lock surface",
    `${identity}\n${authPanel}\n${serverUser}\n${persistenceUser}\n${accountRoute}\n${runbook}\n${contextDoc}\n${ideaGarden}`,
    forbidden,
  );
}

console.log("Real account flow lock check passed.");
