import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
  "payment-disabled",
  "local preview",
  "mock",
  "client workflow",
];

function lineLooksImplementationOnly(line) {
  const trimmed = line.trim();

  return (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("from ") ||
    trimmed.startsWith("export default function ") ||
    trimmed.startsWith("export function ") ||
    trimmed.startsWith("export const metadata") ||
    trimmed.startsWith("type ") ||
    trimmed.startsWith("function ") ||
    trimmed.startsWith("if (") ||
    trimmed.startsWith("return ") ||
    trimmed.includes("className=") ||
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

function assertNoVisibleTokens(file, tokens) {
  const text = read(file);
  const lines = text.split("\n");

  for (const [index, line] of lines.entries()) {
    if (lineLooksImplementationOnly(line)) {
      continue;
    }

    for (const token of tokens) {
      assert(
        !line.includes(token),
        `${file}:L${index + 1} still exposes technical token: ${token}`,
      );
    }
  }
}

for (const file of previousBatchFiles) {
  assertNoVisibleTokens(file, previousForbiddenVisibleTokens);
}

for (const file of pricingOrderFiles) {
  assertNoVisibleTokens(file, pricingOrderForbiddenVisibleTokens);
}

const dashboard = read("app/dashboard/page.tsx");
const profile = read("app/profile/page.tsx");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const appShell = read("components/AppShell.tsx");
const reportsPage = read("app/reports/page.tsx");
const reportsList = read("components/ReportsList.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const pricing = read("app/pricing/page.tsx");
const order = read("app/order/page.tsx");
const manualOrder = read("components/ManualOrderRequestForm.tsx");
const billingPlans = read("lib/billing/billing-plans.ts");
const home = read("app/page.tsx");
const product = read("app/product/page.tsx");
const privacy = read("app/privacy/page.tsx");

assert(dashboard.includes("dashboard-copy-detox-marker"), "Dashboard copy detox marker is missing.");
assert(profile.includes("profile-copy-detox-marker"), "Profile copy detox marker is missing.");
assert(authPanel.includes("account-ready-copy-detox-marker"), "Auth panel copy detox marker is missing.");
assert(!appShell.includes("\u0641\u0639\u0644\u0627\u064B \u0631\u0627\u06CC\u06AF\u0627\u0646"), "Footer still uses temporary/defensive copy.");
assert(reportsPage.includes("reports-page-copy-detox-marker"), "Reports page copy detox marker is missing.");
assert(reportsList.includes("\u06A9\u062A\u0627\u0628\u062E\u0627\u0646\u0647 \u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627"), "Reports list still lacks clean library title.");
assert(reportsList.includes("\u062F\u0631\u06CC\u0627\u0641\u062A \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646"), "Reports backup copy was not detoxed.");
assert(reportDetail.includes("\u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u0627\u06CC\u0646 \u06AF\u0632\u0627\u0631\u0634"), "Report detail privacy/access copy was not detoxed.");
assert(reportDetail.includes("\u0644\u06CC\u0646\u06A9 \u0645\u0633\u062A\u0642\u06CC\u0645"), "Report detail source badge was not humanized.");
assert(!reportDetail.includes('const reportsHref = reportSource === "account"'), "Report detail still routes back through raw account query.");

assert(pricing.includes("pricing-copy-detox-marker"), "Pricing copy detox marker is missing.");
assert(order.includes("order-copy-detox-marker"), "Order copy detox marker is missing.");
assert(manualOrder.includes("manual-order-copy-detox-marker"), "Manual order copy detox marker is missing.");

assert(!pricing.includes("$"), "Pricing page still displays dollar-style pricing.");
assert(!billingPlans.includes("Preview"), "Billing plan visible copy still uses Preview.");
assert(!billingPlans.includes("Personal"), "Billing plan visible copy still uses Personal.");
assert(!billingPlans.includes("Professional"), "Billing plan visible copy still uses Professional.");
assert(!billingPlans.includes("local preview"), "Billing plan visible copy still uses local preview.");
assert(!billingPlans.includes("mock"), "Billing plan visible copy still uses mock.");
assert(!billingPlans.includes("client workflow"), "Billing plan visible copy still uses client workflow.");

assert(home.includes("currentFocusItems"), "Homepage current focus copy is missing.");
assert(!home.includes("futureModules"), "Homepage still exposes futureModules roadmap framing.");
assert(!home.includes("future-modules"), "Homepage still uses future-modules public section id.");
assert(!home.includes("local preview"), "Homepage still exposes local preview wording.");
assert(!product.includes("indexable"), "Product page still exposes indexable wording.");
assert(product.includes("product-copy-detox-marker"), "Product page copy detox marker is missing.");
assert(!privacy.includes("indexable"), "Privacy page still exposes indexable wording.");
assert(!privacy.includes("private-first"), "Privacy page still exposes private-first wording.");
assert(privacy.includes("privacy-copy-detox-marker"), "Privacy page copy detox marker is missing.");

console.log("User-facing copy detox homepage/product/privacy guard passed.");
