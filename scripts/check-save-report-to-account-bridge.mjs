import { readFileSync } from "node:fs";

function fail(message) {
  console.error(`save-report-to-account-bridge check failed: ${message}`);
  process.exit(1);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function expectIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing.`);
  }
}

function expectOrder(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    fail(`${label} is not in the expected order.`);
  }
}

const client = read("lib/storage/account-report-save-client.ts");
const accountRoute = read("app/api/reports/account/route.ts");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const garden = read("docs/HALLEUS_IDEA_GARDEN.md");

expectOrder(
  client,
  "const localRecord = await saveGeneratedReport(report);",
  'fetch("/api/reports/account"',
  "local-first report save before account/server fetch",
);

expectIncludes(
  client,
  "headers.Authorization = `Bearer ${accessToken}`;",
  "authenticated account save bearer token",
);

expectIncludes(
  client,
  "client && config.canAttemptAccountReportSave && authErrorMessage && !accessToken",
  "auth error account-save skip guard",
);

expectIncludes(
  client,
  'accountStatus: "account-skipped"',
  "local fallback account-skipped status",
);

expectIncludes(
  accountRoute,
  'return errorResponse(400, "Request body must be valid JSON.");',
  "malformed JSON guard",
);

expectIncludes(
  accountRoute,
  'return errorResponse(400, "Request body must be a JSON object.");',
  "JSON object guard",
);

expectIncludes(
  accountRoute,
  "userId: user.id",
  "user-owned account save/read path",
);

expectIncludes(
  context,
  "v0.1.222 — Save Report To Account Bridge",
  "project context v0.1.222 milestone note",
);

expectIncludes(
  context,
  "GetRelativePath",
  "project context GetRelativePath failure ledger entry",
);

expectIncludes(
  context,
  "lib/storage/account-report-save-client.ts",
  "project context SHA guard failure ledger entry",
);

expectIncludes(
  garden,
  "v0.1.222 Idea Garden update — account save bridge hardening",
  "Idea Garden v0.1.222 decision",
);

expectIncludes(
  garden,
  "Payment remains paused",
  "Idea Garden payment paused boundary",
);

console.log("save-report-to-account-bridge check passed.");
