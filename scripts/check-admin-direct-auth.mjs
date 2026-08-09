import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = read(".env.example");
const runtimeEnv = read("lib/config/env.ts");
const adminAuth = read("lib/admin/admin-auth.ts");
const directAuth = read("lib/admin/admin-direct-auth.ts");
const loginRoute = read("app/api/admin/direct-session/route.ts");
const gate = read("components/admin/AdminDirectGate.tsx");
const consoleSource = read("components/admin/AdminConsole.tsx");
const reportsSource = read("components/admin/AdminReportsWorkspace.tsx");
const legacyAdmin = read("app/admin/page.tsx");
const legacyReports = read("app/admin/reports/page.tsx");
const legacyReportDetail = read("app/admin/reports/[reportId]/page.tsx");
const adminiPage = read("app/admini/page.tsx");
const adminiLayout = read("app/admini/layout.tsx");
const adminiReports = read("app/admini/reports/page.tsx");

for (const marker of [
  "HALLEUS_ADMIN_DIRECT_USERNAME=",
  "HALLEUS_ADMIN_DIRECT_PASSWORD_HASH=",
  "HALLEUS_ADMIN_DIRECT_SESSION_SECRET=",
]) {
  assert(env.includes(marker), "Direct admin env example missing: " + marker);
}

assert(
  !env.includes("NEXT_PUBLIC_HALLEUS_ADMIN_DIRECT"),
  "Direct admin credentials must stay server-only.",
);

for (const marker of [
  "adminDirectUsername",
  "adminDirectPasswordHash",
  "adminDirectSessionSecret",
]) {
  assert(runtimeEnv.includes(marker), "Runtime direct admin config missing: " + marker);
}

for (const marker of [
  "pbkdf2Sync",
  "timingSafeEqual",
  "createHmac",
  "DIRECT_TOKEN_TTL_SECONDS",
  "verifyDirectAdminAuthorizationHeader",
  "resolveOwnerUserId",
  'encodedHash.includes(":")',
]) {
  assert(directAuth.includes(marker), "Direct auth security marker missing: " + marker);
}

assert(
  adminAuth.includes("verifyDirectAdminAuthorizationHeader") &&
    adminAuth.includes("directSession.kind"),
  "Existing admin capability boundary does not accept direct signed sessions.",
);

for (const marker of [
  "MAX_FAILED_ATTEMPTS",
  "ATTEMPT_WINDOW_MS",
  "assertAdminMutationRequest",
  "نام کاربری یا رمز عبور ادمین درست نیست",
]) {
  assert(loginRoute.includes(marker), "Direct login route marker missing: " + marker);
}

assert(gate.includes("window.sessionStorage"), "Direct token must use sessionStorage.");
assert(!gate.includes("window.localStorage"), "Direct token must not use localStorage.");

assert(
  consoleSource.includes("HALLEUS_DIRECT_ADMINI_R16"),
  "AdminConsole is not wired to the direct gate.",
);
assert(
  !consoleSource.includes("getSupabaseBrowserAuthClient"),
  "AdminConsole still depends on Halleus/Supabase account bootstrap.",
);
assert(
  reportsSource.includes("HALLEUS_DIRECT_ADMINI_R16"),
  "AdminReportsWorkspace is not wired to direct token.",
);
assert(
  !reportsSource.includes("getSupabaseBrowserAuthClient"),
  "AdminReportsWorkspace still depends on Halleus/Supabase account bootstrap.",
);

assert(
  !consoleSource.includes('href={`/admin/reports/'),
  "AdminConsole still exposes legacy report-detail UI links.",
);
assert(
  !reportsSource.includes('href={`/admin/reports/'),
  "AdminReportsWorkspace still exposes legacy report-detail UI links.",
);
assert(
  consoleSource.includes("/admini/reports/"),
  "AdminConsole does not point report details to /admini.",
);
assert(
  reportsSource.includes("/admini/reports/"),
  "AdminReportsWorkspace does not point report details to /admini.",
);

assert(legacyAdmin.includes("notFound"), "Legacy /admin must be unavailable.");
assert(legacyReports.includes("notFound"), "Legacy /admin/reports must be unavailable.");
assert(
  legacyReportDetail.includes("notFound"),
  "Legacy /admin/reports/[reportId] must be unavailable.",
);

assert(adminiPage.includes("AdminDirectGate"), "/admini is not wired.");
assert(adminiReports.includes('mode="reports"'), "/admini/reports is not wired.");
assert(
  adminiLayout.includes("index: false") &&
    adminiLayout.includes("follow: false"),
  "/admini must remain noindex/nofollow.",
);

console.log("Direct /admini auth check passed.");
console.log("- dedicated username/password replaces account-first admin bootstrap");
console.log("- password remains server-only; browser stores only the signed session token");
console.log("- existing admin capability authorization remains the API boundary");
console.log("- legacy /admin UI is unavailable; report UI links use /admini");
console.log("HALLEUS_DIRECT_ADMINI_R16=PASS");


// HALLEUS_DIRECT_ADMINI_R17
assert(
  !consoleSource.includes("setSession(initialSession);\n    setLoading(false);"),
  "AdminConsole must not synchronize direct-session props through a state-setting effect.",
);
assert(
  !reportsSource.includes("setToken(accessToken);\n\n    void load"),
  "AdminReportsWorkspace must not set token state from its direct-session effect.",
);
console.log("HALLEUS_DIRECT_ADMINI_R17");


// HALLEUS_DIRECT_ADMINI_R18
assert(
  reportsSource.includes("Admin report data is external server state synchronized"),
  "AdminReportsWorkspace external-state effect must keep its lint-safe annotation.",
);
assert(
  gate.includes("Direct admin session is external sessionStorage/server state"),
  "AdminDirectGate external-session restore must keep its lint-safe annotation.",
);
console.log("HALLEUS_DIRECT_ADMINI_R18");
