import { readFileSync } from "node:fs";

const checks = [];

function read(path) {
  return readFileSync(path, "utf8");
}

function requireIncludes(path, needle, reason) {
  const text = read(path);

  if (!text.includes(needle)) {
    checks.push(`Missing in ${path}: ${reason}`);
  }
}

function requireNotIncludes(path, needle, reason) {
  const text = read(path);

  if (text.includes(needle)) {
    checks.push(`Forbidden in ${path}: ${reason}`);
  }
}

requireIncludes(
  "lib/auth/account-identity-normalization.ts",
  "createSupabaseUsernameBridgeEmail",
  "username-to-private-Supabase bridge helper",
);
requireIncludes(
  "lib/auth/account-identity-normalization.ts",
  'mode === "sign-up" && !isValidAccountPhone',
  "phone validation only blocks signup, not username/password login",
);
requireIncludes(
  "lib/auth/account-identity-normalization.ts",
  "Supabase Auth uses a deterministic private bridge email derived from username only",
  "bridge rule documents that the credential is not a user email",
);

requireIncludes(
  "components/SupabaseAuthPanel.tsx",
  "Username Password Account Bridge",
  "auth panel announces the v0.1.192 account bridge",
);
requireIncludes(
  "components/SupabaseAuthPanel.tsx",
  "const bridgeEmail = createSupabaseUsernameBridgeEmail(normalizedUsername);",
  "auth panel creates the private bridge credential from username",
);
requireIncludes(
  "components/SupabaseAuthPanel.tsx",
  "email: bridgeEmail",
  "Supabase signup/login uses the bridge email internally",
);
requireIncludes(
  "components/SupabaseAuthPanel.tsx",
  "login با username/password",
  "user-facing copy says login is username/password",
);
requireNotIncludes(
  "components/SupabaseAuthPanel.tsx",
  "signInWithPassword({\n              phone:",
  "login must not require mobile as the Supabase credential",
);

requireIncludes(
  "lib/auth/supabase-auth-driver.ts",
  "mode: \"sign-in\"",
  "driver validates sign-in as username/password",
);
requireIncludes(
  "lib/auth/supabase-auth-driver.ts",
  "createSupabaseUsernameBridgeEmail(identity.normalizedUsername)",
  "driver signs in through the same username bridge",
);

requireIncludes(
  "lib/auth/supabase-session-mapper.ts",
  "isSupabaseUsernameBridgeEmail(user.email)",
  "browser session mapper hides the private bridge email",
);
requireIncludes(
  "lib/auth/supabase-server-user.ts",
  "getUserAccountEmail",
  "server user mapper avoids persisting the private bridge email as user email",
);

requireIncludes(
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "v0.1.192 Username Password Account Bridge",
  "project context records this account bridge batch",
);
requireIncludes(
  "docs/HALLEUS_IDEA_GARDEN.md",
  "v0.1.192 Idea Garden update — username/password account bridge",
  "Idea Garden records the product/auth bridge decision",
);

if (checks.length > 0) {
  console.error("Username/password account bridge check failed:");
  for (const check of checks) {
    console.error(`- ${check}`);
  }

  process.exit(1);
}

console.log("Username/password account bridge check passed.");