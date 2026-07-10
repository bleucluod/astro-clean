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
  "app/reports/page.tsx",
  "components/ReportsList.tsx",
  "app/reports/[reportId]/page.tsx",
  "components/ReportDetail.tsx",
];

const forbiddenVisibleTokens = [
  "private/noindex",
  "public/noindex",
  "local/private",
  "private/account report",
  "Account read guard",
  "Account reports",
  "Beta database archive",
  "Beta database copy",
  "Beta database report archive",
  "local-preview",
  "خروجی کامل JSON",
  "وارد کردن JSON",
  "لینک عمومی گزارش آماده است",
  "لینک عمومی گزارش باز شد",
  "نسخه آزمایشی سرور",
  "نسخه اکانتی",
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
    trimmed.startsWith("type ") ||
    trimmed.startsWith("const ") ||
    trimmed.startsWith("function ") ||
    trimmed.startsWith("if (") ||
    trimmed.startsWith("return ") ||
    trimmed.startsWith("source:") ||
    trimmed.startsWith("visibility:") ||
    trimmed.includes("decodeReportRecords") ||
    trimmed.includes("createReportRecord") ||
    trimmed.includes("getSupabase") ||
    trimmed.includes("mapSupabase") ||
    trimmed.includes("createSupabaseUsernameBridgeEmail") ||
    trimmed.includes("summary.source") ||
    trimmed.includes("summary.visibility") ||
    trimmed.includes("reportSource") ||
    trimmed.includes("rawSource") ||
    trimmed.includes("?source=") ||
    trimmed.includes(".replace(") ||
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

const reportsPage = read("app/reports/page.tsx");
const reportsList = read("components/ReportsList.tsx");
const reportDetailPage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const dashboard = read("app/dashboard/page.tsx");
const profile = read("app/profile/page.tsx");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const appShell = read("components/AppShell.tsx");

assert(reportsPage.includes("reports-page-copy-detox-marker"), "Reports page copy detox marker is missing.");
assert(reportsList.includes("کتابخانه گزارش‌ها"), "Reports list still lacks clean library title.");
assert(reportsList.includes("دریافت فایل پشتیبان"), "Reports backup copy was not detoxed.");
assert(reportDetailPage.includes("گزارش آماده است."), "Report detail route still sends raw public-link message.");
assert(reportDetail.includes("دسترسی به این گزارش"), "Report detail privacy/access copy was not detoxed.");
assert(reportDetail.includes("لینک مستقیم"), "Report detail source badge was not humanized.");
assert(!reportDetail.includes('const reportsHref = reportSource === "account"'), "Report detail still routes back through raw account query.");
assert(dashboard.includes("dashboard-copy-detox-marker"), "Dashboard copy detox marker is missing.");
assert(profile.includes("profile-copy-detox-marker"), "Profile copy detox marker is missing.");
assert(authPanel.includes("account-ready-copy-detox-marker"), "Auth panel copy detox marker is missing.");
assert(!appShell.includes("فعلاً رایگان"), "Footer still uses temporary/defensive copy.");

console.log("User-facing copy detox reports/detail guard passed.");
