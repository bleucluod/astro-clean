import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(label, text, marker) {
  if (!text.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

const migration = read("database/migrations/0002_secure_admin_core.sql");
requireText("migration", migration, "create schema if not exists halleus_private");
requireText("migration", migration, "admin_memberships");
requireText("migration", migration, "admin_audit_events");
requireText("migration", migration, "premium_requests");
requireText("migration", migration, "enable row level security");
requireText("migration", migration, "revoke all on schema halleus_private from anon");
requireText("migration", migration, "admin_audit_events is append-only");

const auditTableStart = migration.indexOf(
  "create table if not exists halleus_private.admin_audit_events",
);
const auditTableEnd = migration.indexOf(
  "create index if not exists admin_audit_events_created_idx",
);
const auditTable = migration.slice(auditTableStart, auditTableEnd);
forbidText(
  "append-only audit actor retention",
  auditTable,
  "actor_user_id uuid references auth.users",
);

const notesTableStart = migration.indexOf(
  "create table if not exists halleus_private.admin_notes",
);
const notesTableEnd = migration.indexOf(
  "create index if not exists admin_notes_target_idx",
);
const notesTable = migration.slice(notesTableStart, notesTableEnd);
forbidText(
  "retained admin-note actor",
  notesTable,
  "created_by uuid not null references auth.users",
);

const bootstrap = read("database/admin-owner-bootstrap.sql");
requireText("bootstrap", bootstrap, "REPLACE_WITH_SUPABASE_USER_UUID");
requireText("bootstrap", bootstrap, "admin.owner_bootstrap");
requireText("bootstrap", bootstrap, "begin;");
requireText("bootstrap", bootstrap, "commit;");

const auth = read("lib/admin/admin-auth.ts");
requireText("admin auth", auth, "getSupabaseUserFromAuthorizationHeader");
requireText("admin auth", auth, "halleus_private.admin_memberships");
requireText("admin auth", auth, "adminRoleHasCapability");
forbidText("admin auth", auth, "user_metadata");
forbidText("admin auth", auth, "searchParams");

const capabilities = read("lib/admin/admin-capabilities.ts");
requireText("role matrix", capabilities, 'analyst: [');
requireText("role matrix", capabilities, '"audit.read"');
forbidText(
  "analyst role",
  capabilities.slice(
    capabilities.indexOf("analyst:"),
    capabilities.indexOf("};", capabilities.indexOf("analyst:")),
  ),
  ".write",
);

const reportRoute = read("app/api/admin/reports/route.ts");
requireText(
  "report route",
  reportRoute,
  '"reports.visibility.restrict"',
);
requireText("report route", reportRoute, "Admin cannot force-publish a report");
forbidText("report route", reportRoute, 'visibility: "public"');

const privateRoute = read(
  "app/api/admin/reports/[reportId]/private-content/route.ts",
);
requireText(
  "private content route",
  privateRoute,
  '"reports.private_content.read"',
);
requireText("private content route", privateRoute, "export async function POST");
requireText("private content route", privateRoute, "assertAdminMutationRequest");
requireText("private content route", privateRoute, "reason");
forbidText("private content route", privateRoute, "searchParams");

const service = read("lib/admin/admin-service.ts");
requireText(
  "admin service",
  service,
  "admin.report.private_content_viewed",
);
requireText("admin service", service, "success: false");
requireText("admin service", service, "setSupabaseAccountSuspended");
requireText("admin service", service, "visibility = 'restricted_by_admin'");
requireText("admin service", service, "share_enabled = false");
requireText("admin service", service, "share_token_hash = null");

const adminPage = read("app/admin/page.tsx");
requireText("admin page", adminPage, "AdminConsole");
for (const legacy of [
  "DemoDataPanel",
  "DeploymentStatusCard",
  "FeatureFlagList",
  "LocalDataBackupPanel",
  "LocalDataStatusCard",
  "MvpStatusCard",
]) {
  forbidText("admin page", adminPage, legacy);
}

const adminLayout = read("app/admin/layout.tsx");
requireText("admin layout", adminLayout, "index: false");
requireText("admin layout", adminLayout, "follow: false");

const adminCss = read("app/admin/admin.css");
requireText("admin shell css", adminCss, ".site-header");
requireText("admin shell css", adminCss, ".site-footer");
requireText("admin shell css", adminCss, "#main-content");
forbidText(
  "admin shell css",
  adminCss,
  "body:has(.halleus-admin-root) header",
);

for (const routePath of [
  "app/api/admin/session/route.ts",
  "app/api/admin/overview/route.ts",
  "app/api/admin/users/route.ts",
  "app/api/admin/reports/route.ts",
  "app/api/admin/reports/[reportId]/private-content/route.ts",
  "app/api/admin/premium-requests/route.ts",
  "app/api/admin/audit/route.ts",
]) {
  const route = read(routePath);
  requireText(routePath, route, 'dynamic = "force-dynamic"');
  requireText(routePath, route, "noStoreJsonResponse");
}

const client = read("components/admin/AdminConsole.tsx");
forbidText("admin client", client, "SUPABASE_SERVICE_ROLE_KEY");
forbidText("admin client", client, "DATABASE_URL");
requireText("admin client", client, "/api/admin/session");
requireText("admin client", client, "editPremium");
requireText("admin client", client, "deliveryStatus");

const premiumRoute = read("app/api/premium-requests/route.ts");
requireText("premium intake", premiumRoute, "createPremiumRequest");
requireText("premium intake", premiumRoute, "publicationChoice");

const orderPage = read("app/order/page.tsx");
requireText("order page", orderPage, "PremiumRequestForm");
requireText("order page", orderPage, "رضایت انتشار نیست");

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["check:secure-admin-core"] !==
  "node scripts/check-secure-admin-core.mjs"
) {
  failures.push("package.json is missing check:secure-admin-core");
}

if (failures.length > 0) {
  console.error("Secure admin core check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Secure admin core check passed.");
console.log("- database-backed role authorization and append-only audit are present");
console.log("- admin APIs enforce capabilities and never force-publish reports");
console.log("- private report access is explicit and audit-covered");
console.log("- premium requests persist with publication choice kept separate");
console.log("- legacy localStorage admin panels are absent from the live admin page");
