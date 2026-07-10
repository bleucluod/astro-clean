import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function lineLooksImplementationOnly(line) {
  const trimmed = line.trim();

  return (
    trimmed.length === 0 ||
    trimmed.startsWith("import ") ||
    trimmed.startsWith("from ") ||
    trimmed.startsWith("export default function ") ||
    trimmed.startsWith("export function ") ||
    trimmed.startsWith("export const metadata") ||
    trimmed.startsWith("type ") ||
    trimmed.startsWith("interface ") ||
    trimmed.startsWith("function ") ||
    trimmed.startsWith("if (") ||
    trimmed.startsWith("return ") ||
    trimmed.includes("className=") ||
    trimmed.includes("href=") ||
    trimmed.includes("id=") ||
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
    trimmed.includes("navigator.clipboard") ||
    trimmed.includes("getReportRepository") ||
    trimmed.includes("getPreviewSession") ||
    trimmed.includes("PersonalTransitReportDataBridge") ||
    trimmed.includes("personalTransitReportData") ||
    trimmed.includes("mobile_phone") ||
    trimmed.includes("auth_model") ||
    trimmed.includes("bridge_credential_kind") ||
    trimmed.includes("username_is_user_chosen") ||
    trimmed.includes("phone_is_not_username") ||
    trimmed.includes("email_is_secondary")
  );
}

function assertNoVisibleTokens(scopeName, files, tokens) {
  for (const file of files) {
    const lines = read(file).split("\n");

    for (const [index, line] of lines.entries()) {
      if (lineLooksImplementationOnly(line)) {
        continue;
      }

      for (const token of tokens) {
        assert(
          !line.includes(token),
          scopeName + " / " + file + ":L" + (index + 1) + " still exposes technical token: " + token,
        );
      }
    }
  }
}

function assertIncludes(file, token, message) {
  assert(read(file).includes(token), message);
}

function assertExcludes(file, token, message) {
  assert(!read(file).includes(token), message);
}

const previousBatchFiles = [
  "app/dashboard/page.tsx",
  "app/profile/page.tsx",
  "components/SupabaseAuthPanel.tsx",
  "components/AppShell.tsx",
  "app/reports/page.tsx",
  "components/ReportsList.tsx",
  "app/reports/[reportId]/page.tsx",
  "components/ReportDetail.tsx",
];

const pricingOrderFiles = [
  "app/pricing/page.tsx",
  "app/order/page.tsx",
  "components/ManualOrderRequestForm.tsx",
  "lib/billing/billing-plans.ts",
];

const previousForbiddenVisibleTokens = [
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
  "local preview",
  "Supabase Auth + Supabase/Postgres",
  "Account readiness",
  "Account Identity Snapshot",
  "Plan Entitlements",
  "Account Next Step",
  "Database storage",
  "User ID",
  "E.164",
];

const pricingOrderForbiddenVisibleTokens = [
  ...previousForbiddenVisibleTokens,
  "Payment:",
  "Backend:",
  "Storage:",
  "payment provider",
  "local preview",
  "mock",
  "client workflow",
];

assertNoVisibleTokens("previous copy detox", previousBatchFiles, previousForbiddenVisibleTokens);
assertNoVisibleTokens("pricing/order copy detox", pricingOrderFiles, pricingOrderForbiddenVisibleTokens);

assertIncludes("app/dashboard/page.tsx", "dashboard-copy-detox-marker", "Dashboard copy detox marker is missing.");
assertIncludes("app/profile/page.tsx", "profile-copy-detox-marker", "Profile copy detox marker is missing.");
assertIncludes("components/SupabaseAuthPanel.tsx", "account-ready-copy-detox-marker", "Auth panel copy detox marker is missing.");
assertExcludes("components/AppShell.tsx", "\u0641\u0639\u0644\u0627\u064B \u0631\u0627\u06CC\u06AF\u0627\u0646", "Footer still uses temporary/defensive copy.");

assertIncludes("app/reports/page.tsx", "reports-page-copy-detox-marker", "Reports page copy detox marker is missing.");
assertIncludes("components/ReportsList.tsx", "\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647 \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627", "Reports list still lacks clean library title.");
assertIncludes("components/ReportsList.tsx", "\u062F\u0631\u06CC\u0627\u0641\u062A \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646", "Reports backup copy was not detoxed.");
assertIncludes("components/ReportDetail.tsx", "\u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u0627\u06CC\u0646 \u06AF\u0632\u0627\u0631\u0634", "Report detail privacy/access copy was not detoxed.");
assertIncludes("components/ReportDetail.tsx", "\u0644\u06CC\u0646\u06A9 \u0645\u0633\u062A\u0642\u06CC\u0645", "Report detail source badge was not humanized.");
assertExcludes("components/ReportDetail.tsx", 'const reportsHref = reportSource === "account"', "Report detail still routes back through raw account query.");

assertIncludes("app/pricing/page.tsx", "pricing-copy-detox-marker", "Pricing copy detox marker is missing.");
assertIncludes("app/order/page.tsx", "order-copy-detox-marker", "Order copy detox marker is missing.");
assertIncludes("components/ManualOrderRequestForm.tsx", "manual-order-copy-detox-marker", "Manual order copy detox marker is missing.");
assertExcludes("app/pricing/page.tsx", "$", "Pricing page still displays dollar-style pricing.");
assertExcludes("lib/billing/billing-plans.ts", "Preview", "Billing plan visible copy still uses Preview.");
assertExcludes("lib/billing/billing-plans.ts", "Personal", "Billing plan visible copy still uses Personal.");
assertExcludes("lib/billing/billing-plans.ts", "Professional", "Billing plan visible copy still uses Professional.");
assertExcludes("lib/billing/billing-plans.ts", "local preview", "Billing plan visible copy still uses local preview.");
assertExcludes("lib/billing/billing-plans.ts", "mock", "Billing plan visible copy still uses mock.");
assertExcludes("lib/billing/billing-plans.ts", "client workflow", "Billing plan visible copy still uses client workflow.");

assertIncludes("app/page.tsx", "currentFocusItems", "Homepage current focus copy is missing.");
assertExcludes("app/page.tsx", "futureModules", "Homepage still exposes futureModules roadmap framing.");
assertExcludes("app/page.tsx", "future-modules", "Homepage still uses future-modules public section id.");
assertExcludes("app/page.tsx", "local preview", "Homepage still exposes local preview wording.");
assertIncludes("app/product/page.tsx", "product-copy-detox-marker", "Product page copy detox marker is missing.");
assertExcludes("app/product/page.tsx", "indexable", "Product page still exposes indexable wording.");
assertIncludes("app/privacy/page.tsx", "privacy-copy-detox-marker", "Privacy page copy detox marker is missing.");
assertExcludes("app/privacy/page.tsx", "indexable", "Privacy page still exposes indexable wording.");
assertExcludes("app/privacy/page.tsx", "private-first", "Privacy page still exposes private-first wording.");

console.log("User-facing copy detox guard passed.");
