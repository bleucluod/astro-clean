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
  evaluateOwnedReportPublicationMutation,
} = require("../lib/reports/report-access-contract.ts");

const read = (filePath) => readFileSync(filePath, "utf8");
const accountRoute = read("app/api/reports/account/route.ts");
const service = read("lib/reports/report-access-service.ts");
const adminService = read("lib/admin/admin-service.ts");
const reportPage = read("app/reports/[reportId]/page.tsx");
const sitemap = read("app/sitemap.ts");

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const freePublish = evaluateOwnedReportPublicationMutation({
  action: "publish",
  ownerKind: "account",
  tier: "free",
  identityConsentState: "withheld",
});
assert(freePublish.ok, "account free publish must be allowed");
assert(
  freePublish.ok &&
    freePublish.visibility === "public" &&
    freePublish.publicationIntent === "publish" &&
    freePublish.policy.publicationState === "public" &&
    freePublish.policy.publicationConsentState === "not-required",
  "account free publish must derive public/not-required state",
);

const freeUnpublish = evaluateOwnedReportPublicationMutation({
  action: "unpublish",
  ownerKind: "account",
  tier: "free",
  identityConsentState: "granted",
});
assert(freeUnpublish.ok, "account free unpublish must be allowed");
assert(
  freeUnpublish.ok &&
    freeUnpublish.visibility === "unpublished" &&
    freeUnpublish.policy.publicationState === "unpublished" &&
    freeUnpublish.policy.publicationConsentState === "not-required" &&
    !freeUnpublish.policy.identityPublic,
  "free unpublish must remove public and identity projection",
);

const premiumPublish = evaluateOwnedReportPublicationMutation({
  action: "publish",
  ownerKind: "account",
  tier: "premium",
  identityConsentState: "withheld",
});
assert(premiumPublish.ok, "explicit premium owner publish must be allowed");
assert(
  premiumPublish.ok &&
    premiumPublish.policy.publicationState === "public" &&
    premiumPublish.policy.publicationConsentState === "granted" &&
    premiumPublish.policy.identityConsentState === "withheld" &&
    !premiumPublish.policy.identityPublic,
  "premium publication action must grant publication consent without identity consent",
);

const premiumUnpublish = evaluateOwnedReportPublicationMutation({
  action: "unpublish",
  ownerKind: "account",
  tier: "premium",
  identityConsentState: "granted",
});
assert(premiumUnpublish.ok, "premium owner unpublish must be allowed");
assert(
  premiumUnpublish.ok &&
    premiumUnpublish.policy.publicationState === "unpublished" &&
    premiumUnpublish.policy.publicationConsentState === "withdrawn" &&
    !premiumUnpublish.policy.identityPublic,
  "premium unpublish must withdraw publication independently of identity consent",
);

const legacyPublish = evaluateOwnedReportPublicationMutation({
  action: "publish",
  ownerKind: "legacy",
  tier: "free",
  identityConsentState: "withheld",
});
assert(
  !legacyPublish.ok &&
    legacyPublish.code === "owner-kind-not-account" &&
    legacyPublish.policy.publicationState !== "public",
  "legacy reports must not be publishable through the account mutation",
);

const restrictedPublish = evaluateOwnedReportPublicationMutation({
  action: "publish",
  ownerKind: "account",
  tier: "premium",
  identityConsentState: "granted",
  adminRestricted: true,
});
assert(
  !restrictedPublish.ok &&
    restrictedPublish.code === "admin-restricted" &&
    restrictedPublish.policy.publicationState === "restricted",
  "admin restriction must override owner publication",
);

for (const marker of [
  'action === "publish"',
  'action === "unpublish"',
  "mutateOwnedReportPublication",
  "Report publication is restricted by an administrator.",
]) {
  assert(accountRoute.includes(marker), `account route is missing ${marker}`);
}

for (const forbidden of [
  "body.accessTier",
  "body.reportTier",
  "body.publicationConsentState",
  "body.identityConsentState",
]) {
  assert(
    !accountRoute.includes(forbidden),
    `account publication mutation must not trust ${forbidden}`,
  );
}

for (const marker of [
  "sql.begin",
  "for update",
  "user_id = ${userId}",
  "deleted_at is null",
  "restricted_at is null",
  "visibility <> 'restricted_by_admin'",
  "share_enabled = false",
  "share_token_hash = null",
  "evaluateOwnedReportPublicationMutation",
]) {
  assert(service.includes(marker), `publication service is missing ${marker}`);
}

assert(
  accountRoute.includes("if (reportId && !authorizationHeader)"),
  "unauthenticated report-id reads must remain blocked in this batch",
);
assert(
  reportPage.includes("index: false") && reportPage.includes("follow: false"),
  "report detail route must remain noindex",
);
assert(
  !sitemap.includes("/reports"),
  "report routes must remain outside the sitemap",
);

for (const marker of [
  "publication_state = 'restricted'",
  "publication_intent = 'unpublish'",
  "publication_state = 'unpublished'",
]) {
  assert(
    adminService.includes(marker),
    `admin mutation state is missing ${marker}`,
  );
}

if (failures.length > 0) {
  throw new Error(
    `Report publication mutation failures:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}

async function runDatabaseIntegration() {
  const databaseUrl =
    process.env.HALLEUS_PUBLICATION_MUTATION_DATABASE_URL?.trim();

  if (!databaseUrl) {
    return;
  }

  const postgres = require("postgres");
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  const originalLoad = Module._load;
  Module._load = function loadWithAdminDatabaseMock(
    request,
    parent,
    isMain,
  ) {
    if (request === "@/lib/admin/admin-database") {
      return {
        getAdminDatabase: () => sql,
        asRecord: (value) =>
          value && typeof value === "object" && !Array.isArray(value)
            ? value
            : {},
        asString: (value) => (typeof value === "string" ? value : ""),
        asNullableString: (value) =>
          typeof value === "string" && value.trim() ? value : null,
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    await sql.unsafe(`
      drop table if exists public.halleus_reports;
      create table public.halleus_reports (
        id text primary key,
        user_id text not null,
        report_json jsonb not null default '{}'::jsonb,
        note text,
        favorite boolean not null default false,
        visibility text not null default 'private',
        source text not null default 'account',
        title text,
        share_token_hash text,
        share_enabled boolean not null default false,
        restricted_at timestamptz,
        restricted_by uuid,
        restriction_reason text,
        deleted_at timestamptz,
        deleted_by uuid,
        delete_reason text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    const migration = read(
      "database/migrations/0009_report_publication_persistence.sql",
    );
    await sql.unsafe(migration);

    await sql`
      insert into public.halleus_reports (
        id,
        user_id,
        visibility,
        publication_owner_kind,
        access_tier,
        publication_intent,
        publication_state,
        publication_consent_state,
        identity_consent_state,
        publication_policy_version,
        share_enabled,
        share_token_hash
      )
      values
        (
          'free-account',
          'owner-a',
          'shared_by_link',
          'account',
          'free',
          'default',
          'public',
          'not-required',
          'withheld',
          '1',
          true,
          'free-token'
        ),
        (
          'premium-account',
          'owner-b',
          'private',
          'account',
          'premium',
          'default',
          'private',
          'pending',
          'withheld',
          '1',
          false,
          null
        ),
        (
          'legacy-account',
          'owner-a',
          'private',
          'legacy',
          'free',
          'default',
          'private',
          'pending',
          'withheld',
          '1',
          false,
          null
        ),
        (
          'restricted-account',
          'owner-a',
          'restricted_by_admin',
          'account',
          'free',
          'publish',
          'restricted',
          'not-required',
          'withheld',
          '1',
          false,
          null
        )
    `;

    const {
      mutateOwnedReportPublication,
    } = require("../lib/reports/report-access-service.ts");

    const freePublished = await mutateOwnedReportPublication(
      "owner-a",
      "free-account",
      "publish",
    );
    assert(
      freePublished.ok &&
        freePublished.visibility === "public" &&
        freePublished.publication.publicationState === "public",
      "database free publish transition failed",
    );

    const [freePublishedRow] = await sql`
      select visibility, share_enabled, share_token_hash,
        publication_intent, publication_state,
        publication_consent_state
      from public.halleus_reports
      where id = 'free-account'
    `;
    assert(
      freePublishedRow.visibility === "public" &&
        freePublishedRow.share_enabled === false &&
        freePublishedRow.share_token_hash === null &&
        freePublishedRow.publication_intent === "publish" &&
        freePublishedRow.publication_state === "public" &&
        freePublishedRow.publication_consent_state === "not-required",
      "database free publish must atomically revoke link sharing",
    );

    const freeUnpublished = await mutateOwnedReportPublication(
      "owner-a",
      "free-account",
      "unpublish",
    );
    assert(
      freeUnpublished.ok &&
        freeUnpublished.visibility === "unpublished" &&
        freeUnpublished.publication.publicationState === "unpublished",
      "database free unpublish transition failed",
    );

    const wrongOwner = await mutateOwnedReportPublication(
      "owner-a",
      "premium-account",
      "publish",
    );
    assert(
      !wrongOwner.ok && wrongOwner.code === "not-found",
      "wrong owner must receive the same not-found result as a missing report",
    );

    const premiumPublished = await mutateOwnedReportPublication(
      "owner-b",
      "premium-account",
      "publish",
    );
    assert(
      premiumPublished.ok &&
        premiumPublished.publication.publicationState === "public" &&
        premiumPublished.publication.publicationConsentState === "granted" &&
        premiumPublished.publication.identityConsentState === "withheld",
      "database premium publish transition failed",
    );

    const premiumUnpublished = await mutateOwnedReportPublication(
      "owner-b",
      "premium-account",
      "unpublish",
    );
    assert(
      premiumUnpublished.ok &&
        premiumUnpublished.publication.publicationState === "unpublished" &&
        premiumUnpublished.publication.publicationConsentState === "withdrawn",
      "database premium unpublish transition failed",
    );

    const legacyDenied = await mutateOwnedReportPublication(
      "owner-a",
      "legacy-account",
      "publish",
    );
    assert(
      !legacyDenied.ok &&
        legacyDenied.code === "owner-kind-not-account",
      "database legacy publication must be denied",
    );

    const restrictedDenied = await mutateOwnedReportPublication(
      "owner-a",
      "restricted-account",
      "publish",
    );
    assert(
      !restrictedDenied.ok &&
        restrictedDenied.code === "admin-restricted",
      "database admin restriction must override owner publication",
    );

    const [restrictedRow] = await sql`
      select visibility, publication_state
      from public.halleus_reports
      where id = 'restricted-account'
    `;
    assert(
      restrictedRow.visibility === "restricted_by_admin" &&
        restrictedRow.publication_state === "restricted",
      "restricted report state must remain unchanged",
    );
  } finally {
    Module._load = originalLoad;
    await sql.end({ timeout: 5 });
  }
}

await runDatabaseIntegration();

if (failures.length > 0) {
  throw new Error(
    `Report publication mutation integration failures:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}

console.log("Report publication mutation check passed.");
console.log("- owner-only publish/unpublish derives tier and consent on the server");
console.log("- premium publication consent remains separate from identity consent");
console.log("- legacy and admin-restricted reports cannot be published");
console.log("- unpublish and publish transitions revoke stale share tokens atomically");
console.log(
  process.env.HALLEUS_PUBLICATION_MUTATION_DATABASE_URL
    ? "- disposable PostgreSQL transaction behavior passed"
    : "- database integration skipped because no test URL was supplied",
);
