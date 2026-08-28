import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertIncludes(label, content, needle) {
  if (!content.includes(needle)) {
    throw new Error(`${label} must include ${needle}`);
  }
}

function assertExcludes(label, content, needle) {
  if (content.includes(needle)) {
    throw new Error(`${label} must not include ${needle}`);
  }
}

const env = read("lib/config/env.ts");
const envExample = read(".env.example");
const keyRoute = read("app/indexnow-key.txt/route.ts");
const service = read("lib/wiki/wiki-indexnow.ts");
const logMigration = read("database/migrations/0030_wiki_indexnow_submission_log.sql");
const adminActions = read("app/api/admin/wiki/articles/[articleId]/actions/route.ts");
const scheduledPublisher = read("app/api/internal/wiki/publish-due/route.ts");
const packageJson = read("package.json");
const impact = read("config/halleus-check-impact.json");

assertIncludes("runtime env", env, "indexNowKey?: string");
assertIncludes("runtime env", env, 'getOptionalEnv("HALLEUS_INDEXNOW_KEY")');
assertIncludes("env example", envExample, "HALLEUS_INDEXNOW_KEY=");

assertIncludes("IndexNow key route", keyRoute, "indexNowKey");
assertIncludes("IndexNow key route", keyRoute, "IndexNow is not configured.");
assertIncludes("IndexNow key route", keyRoute, '"content-type": "text/plain; charset=utf-8"');
assertIncludes("IndexNow key route", keyRoute, '"cache-control": "public, max-age=300"');

assertIncludes("IndexNow service", service, "submitWikiIndexNowUrlsBestEffort");
assertIncludes("IndexNow service", service, "https://api.indexnow.org/indexnow");
assertIncludes("IndexNow service", service, "/indexnow-key.txt");
assertIncludes("IndexNow service", service, "AbortController");
assertIncludes("IndexNow service", service, "indexnow-not-configured");
assertIncludes("IndexNow service", service, "recordWikiIndexNowSubmissionBestEffort");
assertIncludes("IndexNow service", service, "wiki_indexnow_submissions");
assertExcludes("IndexNow service", service, "indexing.googleapis.com");
assertExcludes("IndexNow service", service, "searchconsole.googleapis.com");

assertIncludes("IndexNow log migration", logMigration, "wiki_indexnow_submissions");
assertIncludes("IndexNow log migration", logMigration, "submitted_urls");
assertIncludes("IndexNow log migration", logMigration, "status_code");

assertIncludes("admin Wiki actions", adminActions, "submitWikiIndexNowUrlsBestEffort");
assertIncludes("admin Wiki actions", adminActions, "admin-wiki-publish");
assertIncludes("admin Wiki actions", adminActions, "admin-wiki-unpublish");
assertIncludes("admin Wiki actions", adminActions, "admin-wiki-rollback");

assertIncludes("scheduled Wiki publisher", scheduledPublisher, "submitWikiIndexNowUrlsBestEffort");
assertIncludes("scheduled Wiki publisher", scheduledPublisher, "scheduled-wiki-publish");

assertIncludes("package scripts", packageJson, '"check:wiki-indexnow-discovery"');
assertIncludes("impact registry", impact, "check:wiki-indexnow-discovery");
assertIncludes("impact registry", impact, "lib/wiki/wiki-indexnow.ts");
assertIncludes("impact registry", impact, "app/indexnow-key.txt/route.ts");

console.log("Wiki IndexNow discovery contract OK");
