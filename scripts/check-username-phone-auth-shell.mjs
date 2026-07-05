import fs from "node:fs";

const requiredFiles = [
  "components/SupabaseAuthPanel.tsx",
  "lib/auth/supabase-auth-driver.ts",
  "lib/auth/supabase-session-mapper.ts",
  "lib/auth/supabase-server-user.ts",
  "types/auth.ts",
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

const authPanel = read("components/SupabaseAuthPanel.tsx");
const authDriver = read("lib/auth/supabase-auth-driver.ts");
const sessionMapper = read("lib/auth/supabase-session-mapper.ts");
const serverUser = read("lib/auth/supabase-server-user.ts");
const typesAuth = read("types/auth.ts");
const docs = [
  read("docs/HALLEUS_PROJECT_CONTEXT.md"),
  read("docs/HALLEUS_IDEA_GARDEN.md"),
].join("\n");
const packageJson = JSON.parse(read("package.json"));

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

for (const token of [
  "username",
  "phone",
  "secondaryEmail",
  "cleanUsername",
  "cleanPhone",
  "auth_model: \"username_phone_password\"",
  "client.auth.signUp",
  "phone: normalizedPhone",
  "client.auth.signInWithPassword",
  "نام کاربری",
  "شماره موبایل",
  "ایمیل اختیاری",
  "موبایل یوزرنیم نیست",
  "ایمیل یوزرنیم نیست",
  "account report save path guard شده است",
  "migration واقعی هنوز خاموش است",
]) {
  mustContain("SupabaseAuthPanel", authPanel, token);
}

for (const token of [
  "phone?: string;",
  "username?: string;",
  "email?: string;",
]) {
  mustContain("types/auth", typesAuth, token);
}

for (const token of [
  "request.phone",
  "phone: request.phone",
  "email: request.email",
  "signInWithPassword",
]) {
  mustContain("supabase auth driver", authDriver, token);
}

for (const token of [
  "user.user_metadata",
  "username",
  "secondary_email",
  "displayName: username",
  'provider: user.phone ? "phone" : "email"',
  'source: user.phone ? "phone" : "email"',
]) {
  mustContain("session mapper", sessionMapper, token);
}

for (const token of [
  "metadata?.username",
  "displayName: getUserDisplayName",
]) {
  mustContain("server user", serverUser, token);
}

for (const token of [
  "username-first",
  "mobile-required",
  "email is optional/secondary",
  "mobile is not the username",
  "local-to-account migration is deferred",
]) {
  mustContain("docs", docs, token);
}

for (const token of [
  "ورود واقعی با ایمیل و رمز",
  "ایمیل معتبر و رمز",
]) {
  mustNotContain("SupabaseAuthPanel", authPanel, token);
}

if (packageJson.scripts?.["check:username-phone-auth-shell"] !== "node scripts/check-username-phone-auth-shell.mjs") {
  throw new Error("package.json missing check:username-phone-auth-shell script");
}

console.log("Username + mobile auth shell check passed.");
