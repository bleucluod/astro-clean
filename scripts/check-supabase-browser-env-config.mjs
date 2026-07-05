import { readFileSync } from "node:fs";

const browserConfigPath = "lib/auth/supabase-browser-client.ts";
const saveClientPath = "lib/storage/account-report-save-client.ts";
const readClientPath = "lib/storage/account-report-read-client.ts";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const browserConfig = read(browserConfigPath);
const saveClient = read(saveClientPath);
const readClient = read(readClientPath);

assert(
  browserConfig.includes("process.env.NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN"),
  "Supabase browser login flag must be read explicitly for Next public env inlining.",
);

assert(
  browserConfig.includes("process.env.NEXT_PUBLIC_SUPABASE_URL"),
  "Supabase browser URL must be read explicitly for Next public env inlining.",
);

assert(
  browserConfig.includes("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  "Supabase browser anon key must be read explicitly for Next public env inlining.",
);

for (const [path, source] of [
  [browserConfigPath, browserConfig],
  [saveClientPath, saveClient],
  [readClientPath, readClient],
]) {
  assert(
    !source.includes("process.env[name]"),
    `${path} must not use dynamic process.env[name] in client-side public env readers.`,
  );
}

for (const [path, source] of [
  [saveClientPath, saveClient],
  [readClientPath, readClient],
]) {
  assert(
    source.includes("process.env.NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE"),
    `${path} must read NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE explicitly.`,
  );

  assert(
    source.includes("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true"),
    `${path} must keep the account save flag blocker copy.`,
  );
}

console.log("Supabase browser env config check passed.");