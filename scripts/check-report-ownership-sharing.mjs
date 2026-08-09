import fs, { readFileSync } from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
  ];
  return candidates.find((option) => fs.existsSync(option)) ?? candidate;
}

Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const {
  createGeneratedReportVisibility,
  evaluateReportPublicationPolicy,
} = require("../lib/reports/report-access-contract.ts");

const read = (path) => readFileSync(path, "utf8");
const migration = read("database/migrations/0006_report_ownership_sharing.sql");
const contract = read("lib/reports/report-access-contract.ts");
const accountRoute = read("app/api/reports/account/route.ts");
const reportPage = read("app/reports/[reportId]/page.tsx");
const sharedRoute = read("app/api/reports/shared/[shareToken]/route.ts");
const sharedPage = read("app/reports/shared/[shareToken]/page.tsx");
const service = read("lib/reports/report-access-service.ts");
const serverPersistence = read("lib/storage/server-report-persistence.ts");
const adminWorkspace = read("components/admin/AdminReportsWorkspace.tsx");
const adminConsole = read("components/admin/AdminConsole.tsx");
const sitemap = read("app/sitemap.ts");

for (const marker of ["share_token_hash", "share_enabled", "restricted_at", "deleted_at", "visibility = 'private'"]) {
  if (!migration.includes(marker)) throw new Error(`Report migration is missing ${marker}.`);
}
if (!migration.includes("'public', 'shared_by_link'")) throw new Error("Report migration must preserve rollback compatibility with the previous release.");
for (const marker of ["randomBytes(32)", "sha256", "REPORT_SUMMARY_PAGE_SIZE = 25", "validateReportTitle"]) {
  if (!contract.includes(marker)) throw new Error(`Report access contract is missing ${marker}.`);
}
if (!accountRoute.includes("getPublicServerStoredReport")) throw new Error("Safe unauthenticated public report lookup is missing.");
if (!reportPage.includes('rawSource === "public"')) throw new Error("Public report source routing is missing.");
if (sitemap.includes("/reports")) throw new Error("Report routes must remain outside the sitemap.");
for (const marker of ["share_token_hash", "deleted_at is null", "listOwnedReportSummaries", "softDeleteOwnedReport", "getSharedReport"]) if (!service.includes(marker)) throw new Error(`Report service is missing ${marker}.`);
const summaryQuery = service.slice(service.indexOf("export async function listOwnedReportSummaries"), service.indexOf("export async function getOwnedReport"));
if (summaryQuery.includes("select id, title, report_json")) throw new Error("Report summary query must not select the full report payload.");
for (const forbidden of ["'{input,birthDate}'", "'{input,birthTime}'", "'{input,birthCity}'", "'{input,birthCountry}'"]) if (summaryQuery.includes(forbidden)) throw new Error(`Report summary query exposes ${forbidden}.`);
if (!sharedRoute.includes("noindex, nofollow") || !sharedPage.includes("index: false")) throw new Error("Shared reports must remain noindex.");
if (!service.includes("projectPrivateShareReport(report)")) throw new Error("Shared report service must apply the privacy-safe projection.");
for (const marker of ["projectPrivateShareReport", 'birthDate: ""', 'birthTime: ""', 'birthCity: ""', "personalTransitReportData: null"]) {
  if (!serverPersistence.includes(marker)) throw new Error(`Shared report privacy projection is missing ${marker}.`);
}
const adminReportsUseCanonicalPageSize =
  adminWorkspace.includes("limit=25") ||
  (adminWorkspace.includes("const PAGE_SIZE = 25;") &&
    adminWorkspace.includes("limit=${PAGE_SIZE}"));
if (!adminReportsUseCanonicalPageSize) {
  throw new Error("Admin report workspace is missing canonical 25-row pagination.");
}
for (const marker of ["update_title", "restrict_visibility", "soft_delete"]) {
  if (!adminWorkspace.includes(marker)) throw new Error(`Admin report workspace is missing ${marker}.`);
}
for (const marker of ["response.status === 401", "setReports([])", "setPrivateReport(null)"]) if (!adminConsole.includes(marker)) throw new Error(`Admin authentication cleanup is missing ${marker}.`);


const policyFailures = [];
const assertPolicy = (condition, message) => {
  if (!condition) policyFailures.push(message);
};

const guestFree = evaluateReportPublicationPolicy({ ownerKind: "guest", tier: "free" });
assertPolicy(guestFree.publicationState === "public", "guest free report must be public");
assertPolicy(guestFree.indexingPolicy === "indexable", "guest free report must be indexable");
assertPolicy(guestFree.sitemapEligible, "guest free report must be sitemap eligible");
assertPolicy(!guestFree.identityPublic, "free publication must not expose identity without identity consent");

const accountFree = evaluateReportPublicationPolicy({
  ownerKind: "account",
  tier: "free",
  identityConsentState: "granted",
});
assertPolicy(accountFree.publiclyReadable, "logged-in free report must be publicly readable");
assertPolicy(accountFree.identityPublic, "identity projection must require separate consent");

const premiumDefault = evaluateReportPublicationPolicy({ ownerKind: "account", tier: "premium" });
assertPolicy(premiumDefault.publicationState === "private", "premium report must be private by default");
assertPolicy(premiumDefault.indexingPolicy === "noindex", "private premium report must be noindex");

const premiumWithoutConsent = evaluateReportPublicationPolicy({
  ownerKind: "account",
  tier: "premium",
  publicationIntent: "publish",
  publicationConsentState: "pending",
  identityConsentState: "granted",
});
assertPolicy(premiumWithoutConsent.publicationState === "private", "premium publish intent without owner consent must remain private");
assertPolicy(!premiumWithoutConsent.identityPublic, "identity consent must not publish a private report");

const premiumPublished = evaluateReportPublicationPolicy({
  ownerKind: "account",
  tier: "premium",
  publicationIntent: "publish",
  publicationConsentState: "granted",
});
assertPolicy(premiumPublished.publicationState === "public", "explicit premium owner consent must allow publication");
assertPolicy(premiumPublished.indexingPolicy === "indexable", "published premium report must be indexable");
assertPolicy(!premiumPublished.identityPublic, "publication consent must not imply identity consent");

const restricted = evaluateReportPublicationPolicy({
  ownerKind: "account",
  tier: "premium",
  publicationIntent: "publish",
  publicationConsentState: "granted",
  identityConsentState: "granted",
  adminRestricted: true,
});
assertPolicy(restricted.publicationState === "restricted", "admin may restrict an existing publication");
assertPolicy(!restricted.publiclyReadable && !restricted.identityPublic, "admin restriction must remove public and identity projection");

const legacy = evaluateReportPublicationPolicy({
  ownerKind: "legacy",
  tier: "free",
  legacyRecord: true,
  identityConsentState: "granted",
});
assertPolicy(legacy.publicationState === "private", "legacy report must never auto-publish");
assertPolicy(!legacy.sitemapEligible, "legacy report must remain outside sitemap");

const unpublishedFree = evaluateReportPublicationPolicy({
  ownerKind: "account",
  tier: "free",
  publicationIntent: "unpublish",
  identityConsentState: "granted",
});
assertPolicy(unpublishedFree.publicationState === "unpublished", "free owner must be able to unpublish");
assertPolicy(unpublishedFree.indexingPolicy === "noindex", "unpublished report must be noindex");
assertPolicy(!unpublishedFree.identityPublic, "unpublished report must not expose identity");

const preview = createGeneratedReportVisibility({
  kind: "local-private-preview",
  nickname: null,
  ownerKind: "local",
  tier: "preview",
});
assertPolicy(preview.publicationPolicy.publicationState === "private", "local preview must remain private");
assertPolicy(preview.consent.copyVersion === "report-publication-policy-v1", "generated visibility must use versioned publication copy");

if (policyFailures.length > 0) {
  throw new Error(`Report publication policy failures:\n${policyFailures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log("Report ownership and sharing contract check passed.");
console.log("- canonical free/public and premium/private policy is behavior-tested");
console.log("- publication consent and identity consent remain independent");
console.log("- legacy, unpublished, and restricted reports remain non-public");
