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

Module._resolveFilename = function resolveHalleusAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(
    this,
    request,
    parent,
    isMain,
    options,
  );
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
  createReportRecord,
  normalizeReportRecords,
} = require("../lib/storage/report-records.ts");
const {
  fromDatabaseReportRow,
  toDatabaseReportRow,
} = require("../lib/database/report-row-mapper.ts");

const migration = readFileSync(
  "database/migrations/0009_report_publication_persistence.sql",
  "utf8",
);
const driver = readFileSync(
  "lib/database/postgres-report-database-driver.ts",
  "utf8",
);
const accountRoute = readFileSync("app/api/reports/account/route.ts", "utf8");
const betaRoute = readFileSync("app/api/reports/beta/route.ts", "utf8");
const accessService = readFileSync(
  "lib/reports/report-access-service.ts",
  "utf8",
);
const saveClient = readFileSync(
  "lib/storage/account-report-save-client.ts",
  "utf8",
);

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const marker of [
  "publication_owner_kind",
  "access_tier",
  "publication_intent",
  "publication_state",
  "publication_consent_state",
  "identity_consent_state",
  "publication_policy_version",
  "publication_owner_kind = 'legacy'",
  "publication_state <> 'public'",
  "access_tier = 'premium'",
  "publication_consent_state = 'granted'",
  "halleus_reports_publication_state_idx",
]) {
  assert(migration.includes(marker), `migration is missing ${marker}`);
}

assert(
  !/set[\s\S]{0,300}visibility\s*=\s*'public'/u.test(migration),
  "migration must not activate public access visibility",
);

for (const marker of [
  "publication_owner_kind",
  "access_tier",
  "publication_intent",
  "publication_state",
  "publication_consent_state",
  "identity_consent_state",
  "publication_policy_version",
  "and visibility = 'public'",
  "and publication_state = 'public'",
  "and restricted_at is null",
  "and deleted_at is null",
]) {
  assert(driver.includes(marker), `database driver is missing ${marker}`);
}

for (const marker of [
  'ownerKind: "guest"',
  'ownerKind: "account"',
  'tier: "free"',
  'identityConsentState: "withheld"',
]) {
  assert(accountRoute.includes(marker), `account route is missing ${marker}`);
}
assert(
  !accountRoute.includes("body.publication") &&
    !accountRoute.includes("body.accessTier") &&
    !accountRoute.includes("body.reportTier"),
  "account save must not trust publication or tier fields from the client",
);
assert(
  betaRoute.includes('ownerKind: "legacy"') &&
    betaRoute.includes("legacyRecord: true"),
  "beta save must remain legacy/private",
);

for (const marker of [
  "publication_owner_kind",
  "publication_state",
  "publication_consent_state",
  "identity_consent_state",
  "storedPublication",
  "visibility = 'private'",
  "publication_intent = 'unpublish'",
  "publication_state = 'unpublished'",
]) {
  assert(
    accessService.includes(marker),
    `owned report service is missing ${marker}`,
  );
}

assert(
  !saveClient.includes("public/noindex"),
  "save copy must not claim that the public route is already active",
);
assert(
  saveClient.includes("مسیر عمومی هنوز فعال نشده است"),
  "save copy must state the current route-activation boundary",
);

const sampleReport = {
  id: "publication-policy-fixture",
  createdAt: "2026-08-01T00:00:00.000Z",
  input: {
    birthDate: "2000-01-01",
    birthTime: "12:00",
    birthCity: "Tehran",
    birthCountry: "Iran",
  },
  chart: {
    sunSign: {
      key: "capricorn",
      faName: "جدی",
      enName: "Capricorn",
      element: "زمین",
      quality: "کاردینال",
    },
    moonSign: {
      key: "aries",
      faName: "حمل",
      enName: "Aries",
      element: "آتش",
      quality: "کاردینال",
    },
    risingSign: {
      key: "libra",
      faName: "میزان",
      enName: "Libra",
      element: "هوا",
      quality: "کاردینال",
    },
  },
  summary: "fixture",
  interpretations: [],
  safetyNote: "fixture",
};

const guest = createReportRecord(sampleReport, {
  source: "account",
  userId: "guest-owner",
  visibility: "private",
  publication: {
    ownerKind: "guest",
    tier: "free",
    identityConsentState: "withheld",
  },
});
assert(
  guest.publication?.publicationState === "public",
  "guest free save must persist the canonical public policy state",
);
assert(
  guest.visibility === "private",
  "public access visibility must remain inactive in Batch A2a",
);
assert(
  guest.publication?.publicationConsentState === "not-required",
  "guest free save must persist not-required publication consent",
);

const account = createReportRecord(sampleReport, {
  source: "account",
  userId: "account-owner",
  visibility: "private",
  publication: {
    ownerKind: "account",
    tier: "free",
    identityConsentState: "withheld",
  },
});
assert(
  account.publication?.publicationState === "public",
  "logged-in free save must persist the canonical public policy state",
);

const premium = createReportRecord(sampleReport, {
  source: "account",
  userId: "premium-owner",
  visibility: "private",
  publication: {
    ownerKind: "account",
    tier: "premium",
  },
});
assert(
  premium.publication?.publicationState === "private",
  "premium save must remain private by default",
);

const row = toDatabaseReportRow("account-owner", account);
assert(
  row.publication_owner_kind === "account" &&
    row.access_tier === "free" &&
    row.publication_state === "public" &&
    row.identity_consent_state === "withheld",
  "database row must persist all publication policy fields",
);
const roundTrip = fromDatabaseReportRow(row);
assert(
  roundTrip.publication?.ownerKind === "account" &&
    roundTrip.publication?.publicationState === "public" &&
    roundTrip.publication?.identityConsentState === "withheld",
  "database row mapper must round-trip publication policy fields",
);

const normalizedLegacy = normalizeReportRecords([
  {
    ...account,
    publication: undefined,
    visibility: "shared_by_link",
  },
])[0];
assert(
  normalizedLegacy.publication?.ownerKind === "legacy" &&
    normalizedLegacy.publication?.publicationState === "private",
  "legacy local records must never auto-publish during normalization",
);

if (failures.length > 0) {
  throw new Error(
    `Report publication persistence failures:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}

console.log("Report publication persistence check passed.");
console.log("- server saves persist canonical policy fields without trusting client tier");
console.log("- legacy and beta records remain private");
console.log("- database round-trip preserves publication and identity consent");
console.log("- public access activation remains deferred");
