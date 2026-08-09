import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Admin UX consolidation check failed: ${message}`);
    process.exit(1);
  }
}

const consoleSource = read("components/admin/AdminConsole.tsx");
const telegramSource = read("components/admin/TelegramAdminPanel.tsx");
const reportsSource = read("components/admin/AdminReportsWorkspace.tsx");
const wikiSource = read("components/admin/WikiAdminPanel.tsx");
const cssSource = read("components/admin/admin-console.module.css");
const adminCss = read("app/admin/admin.css");
const adminPage = read("app/admini/page.tsx");
const adminHttp = read("lib/admin/admin-http.ts");
const adminService = read("lib/admin/admin-service.ts");
const usersRoute = read("app/api/admin/users/route.ts");
const premiumRoute = read("app/api/admin/premium-requests/route.ts");
const auditRoute = read("app/api/admin/audit/route.ts");

assert(consoleSource.includes('const PAGE_SIZE = 25;'), "main admin lists must use 25-row pages");
assert(!consoleSource.includes("limit=100"), "main admin must not fetch 100 rows at once");
assert(consoleSource.includes('dynamic('), "Wiki and Telegram workspaces must lazy-load");
assert(consoleSource.includes('useSearchParams'), "admin navigation must be URL-addressable");
assert(consoleSource.includes('params.set("tab", tab)'), "admin tab must persist in URL");
assert(consoleSource.includes('className={styles.mobileBar}'), "mobile admin bar is missing");
assert(consoleSource.includes('styles.wikiToolbar'), "Wiki toolbar compatibility marker is missing");
assert(consoleSource.includes('className={styles.drawerBackdrop}'), "mobile drawer boundary is missing");
assert(consoleSource.includes('styles.mobileCards'), "mobile card lists are missing");
assert(consoleSource.includes('styles.actionMenu'), "compact row actions are missing");
assert(consoleSource.includes('styles.quickActions'), "overview quick actions are missing");

assert(telegramSource.includes('telegramStatusStrip'), "Telegram cockpit status strip is missing");
assert(telegramSource.includes('filePicker'), "Telegram custom file picker is missing");
assert(telegramSource.includes('سلامت سیستم انتشار'), "Telegram system-health disclosure is missing");
assert(!telegramSource.includes('Choose File'), "native English file-picker copy leaked into Telegram source");
assert(telegramSource.includes('دانلود Smart Transit Pack'), "Slice 2 Telegram compatibility marker is missing");

assert(reportsSource.includes('const PAGE_SIZE = 25;'), "standalone reports must stay paginated");
assert(reportsSource.includes('limit=25'), "standalone reports must preserve the canonical 25-row request marker");
assert(reportsSource.includes('styles.mobileCards'), "standalone reports need mobile cards");
assert(reportsSource.includes('/admini?tab=reports'), "standalone report route must return to unified admin reports tab");

assert(wikiSource.includes('styles.wikiAdvanced'), "Wiki advanced settings must be collapsible");
assert(wikiSource.includes('تنظیمات پیشرفتهٔ مقاله'), "Wiki advanced settings summary is missing");
assert(wikiSource.indexOf('Markdown و بخش‌ها') < wikiSource.indexOf('تنظیمات پیشرفتهٔ مقاله'), "Wiki daily writing fields must appear before advanced metadata");

assert(cssSource.includes('Admin UX Consolidation 2026-08-09'), "Admin UX CSS marker is missing");
assert(cssSource.includes('.sidebarOpen'), "mobile drawer CSS is missing");
assert(cssSource.includes('.desktopOnly'), "desktop/mobile visibility contract is missing");
assert(cssSource.includes('.publicationQueueTable td:nth-child(2)::before'), "Wiki queue mobile card labels are missing");
assert(cssSource.includes('.telegramActionGrid'), "Telegram action layout CSS is missing");

assert(adminCss.includes('body:has(.halleus-admin-root) > div > header:first-child'), "public site header is not isolated from admin");
assert(adminPage.includes('<Suspense'), "useSearchParams admin shell must be wrapped in Suspense");

assert(adminHttp.includes('export function readPage('), "shared admin page parser is missing");
for (const [label, source] of [
  ["users route", usersRoute],
  ["premium route", premiumRoute],
  ["audit route", auditRoute],
]) {
  assert(source.includes('readPage('), `${label} does not pass a page`);
}
assert(adminService.includes('export async function listAdminUsers(\n  search: string,\n  limit: number,\n  page = 1,'), "user pagination service is missing");
assert(adminService.includes('export async function listPremiumRequests(\n  limit: number,\n  page = 1,'), "premium pagination service is missing");
assert(adminService.includes('export async function listAdminAuditEvents(\n  limit: number,\n  page = 1,'), "audit pagination service is missing");

console.log("Admin UX consolidation check passed.");
console.log("- admin chrome is isolated from the public site shell");
console.log("- desktop keeps compact tables while mobile uses drawer navigation and record cards");
console.log("- tabs are deep-linkable and browser navigation friendly");
console.log("- Wiki and Telegram are lazy-loaded instead of inflating the initial admin bundle");
console.log("- users, reports, premium requests, and audit events use 25-row pages");
console.log("- Telegram is a focused publishing cockpit with custom upload and health disclosure");
console.log("- Wiki daily writing fields stay visible while technical metadata is collapsible");
console.log("HALLEUS_ADMIN_UX_CONSOLIDATION_20260809");
