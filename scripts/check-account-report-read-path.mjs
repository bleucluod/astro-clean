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

const route = read("app/api/reports/account/route.ts");
const readClient = read("lib/storage/account-report-read-client.ts");
const packageJson = JSON.parse(read("package.json"));
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

for (const token of [
  "export async function GET(request: Request)",
  "readAuthenticatedAccountUser(request)",
  "listServerReportSummaries({ userId: user.id })",
  "getServerStoredReport({",
  "reportId,",
  "Report was not found.",
]) {
  mustContain("account reports API", route, token);
}

for (const token of [
  "getAccountReportReadClientConfig",
  "listAccountReportSummaries",
  "getAccountReportRecord",
  "NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE",
  "getSupabaseBrowserAuthClient",
  "client.auth.getSession()",
  "Authorization: `Bearer ${accessToken}`",
  'fetch("/api/reports/account"',
  "reportId=${encodeURIComponent(normalizedReportId)}",
  "account-read-ready",
  "not-authenticated",
  "Account report reading is disabled; use local-preview reports.",
]) {
  mustContain("account report read client", readClient, token);
}

for (const token of [
  "migration execution",
  "delete browser-local reports",
  "public/indexable reports",
  "SEO launch",
  "payment",
]) {
  mustContain("v0.1.185 project context", projectContext, token);
}

mustContain(
  "Idea Garden",
  ideaGarden,
  "account report read foundation",
);

mustNotContain("account report read client", readClient, "\\u06");
// Do not scan this check file for the literal unicode-escape guard token; it must contain the token used to validate the client file.

if (
  packageJson.scripts?.["check:account-report-read-path"] !==
  "node scripts/check-account-report-read-path.mjs"
) {
  throw new Error("package.json missing check:account-report-read-path script.");
}

console.log("Account report read path check passed.");
