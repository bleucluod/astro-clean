import fs from "node:fs";
import path from "node:path";

import {
  expectedWikiSeed,
  readWikiContentModule,
} from "./generate-wiki-storage-seed.mjs";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`missing required file: ${relativePath}`);
  }
}

function requireText(label, source, marker) {
  if (!source.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, source, marker) {
  if (source.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

function normalizeLineEndings(value) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

const requiredFiles = [
  "database/migrations/0003_wiki_storage.sql",
  "database/seeds/0001_wiki_content.sql",
  "lib/wiki/wiki-content.ts",
  "lib/wiki/wiki-cache.ts",
  "lib/wiki/wiki-repository.ts",
  "lib/wiki/wiki-revalidation.ts",
  "components/AppShell.tsx",
  "app/api/admin/wiki/articles/bulk-actions/route.ts",
  "app/api/admin/wiki/articles/[articleId]/actions/route.ts",
  "app/wiki/page.tsx",
  "app/wiki/[slug]/page.tsx",
  "app/sitemap.ts",
  "scripts/generate-wiki-storage-seed.mjs",
  "package.json",
];

for (const file of requiredFiles) {
  requireFile(file);
}

if (failures.length === 0) {
  const migration = read("database/migrations/0003_wiki_storage.sql");
  const seed = read("database/seeds/0001_wiki_content.sql");
  const repository = read("lib/wiki/wiki-repository.ts");
  const revalidation = read("lib/wiki/wiki-revalidation.ts");
  const appShell = read("components/AppShell.tsx");
  const bulkActionsRoute = read("app/api/admin/wiki/articles/bulk-actions/route.ts");
  const articleActionsRoute = read("app/api/admin/wiki/articles/[articleId]/actions/route.ts");
  const indexPage = read("app/wiki/page.tsx");
  const articlePage = read("app/wiki/[slug]/page.tsx");
  const sitemap = read("app/sitemap.ts");
  const packageJson = JSON.parse(read("package.json"));

  for (const table of [
    "wiki_categories",
    "wiki_articles",
    "wiki_article_revisions",
    "wiki_redirects",
  ]) {
    requireText("Wiki migration", migration, `public.${table}`);
    requireText("Wiki migration", migration, `alter table public.${table} enable row level security`);
    requireText("Wiki migration", migration, `revoke all on public.${table} from public, anon, authenticated`);
  }

  requireText("Wiki migration", migration, "wiki_article_revisions_no_update");
  requireText("Wiki migration", migration, "wiki_article_revisions_no_delete");
  requireText("Wiki migration", migration, "http_status = 308");
  requireText(
    "Wiki migration",
    migration,
    "HALLEUS_V01327_WIKI_STORAGE_MIGRATION=SUCCESS",
  );

  requireText("Wiki repository", repository, "from public.wiki_articles");
  requireText("Wiki repository", repository, "status = 'published'");
  requireText("Wiki repository", repository, "is_indexable = true");
  requireText("Wiki repository", repository, "published_at <= now()");
  requireText("Wiki repository", repository, "scheduled_for is null");
  requireText("Wiki repository", repository, "HALLEUS_WIKI_STORAGE_FALLBACK");
  requireText("Wiki repository", repository, 'source: "database"');
  requireText("Wiki repository", repository, 'source: "code-fallback"');
  requireText("Wiki repository", repository, "redirect.http_status = 308");
  requireText("Wiki repository persistent snapshot", repository, "unstable_cache");
  requireText("Wiki repository persistent snapshot", repository, "WIKI_PUBLIC_SNAPSHOT_CACHE_TAG");
  requireText("Wiki repository stale serving", repository, "HALLEUS_WIKI_STALE_SNAPSHOT_SERVED");
  requireText("Wiki repository client recovery", repository, "HALLEUS_WIKI_DATABASE_CLIENT_RESET");
  requireText("Wiki repository circuit breaker", repository, "WIKI_DATABASE_CIRCUIT_BREAKER_MS");
  requireText(
    "Wiki revalidation stale-while-revalidate",
    revalidation,
    'revalidateTag(WIKI_PUBLIC_SNAPSHOT_CACHE_TAG, "max")',
  );
  requireText(
    "Wiki revalidation immediate expiry",
    revalidation,
    "revalidateTag(WIKI_PUBLIC_SNAPSHOT_CACHE_TAG, { expire: 0 })",
  );
  requireText(
    "Wiki critical stale snapshot block",
    revalidation,
    "blockStaleWikiSnapshotServing()",
  );
  requireText(
    "Wiki bulk destructive invalidation",
    bulkActionsRoute,
    'revalidateWikiPublicPaths([], { cachePolicy: "expire-now" })',
  );
  requireText(
    "Wiki article destructive invalidation",
    articleActionsRoute,
    'action === "delete" ? { cachePolicy: "expire-now" } : undefined',
  );
  requireText("App shell Wiki isolation", appShell, "Promise.race");
  requireText("App shell Wiki isolation", appShell, "HALLEUS_WIKI_FOOTER_DEGRADED");
  requireText("App shell Wiki fallback", appShell, "FOOTER_WIKI_FALLBACK_ARTICLES");
  for (const slug of [
    "what-is-astrology",
    "birth-chart-basics",
    "how-to-read-birth-chart",
    "planets-in-birth-chart",
  ]) {
    requireText("App shell Wiki fallback", appShell, `slug: "${slug}"`);
  }

  requireText("Wiki index", indexPage, "getPublicWikiCatalog");
  forbidText("Wiki index", indexPage, 'from "@/lib/wiki/wiki-content"');
  requireText("Wiki article route", articlePage, "getPublicWikiArticleResolution");
  requireText("Wiki article route", articlePage, "listPublicWikiRouteSlugs");
  requireText("Wiki article route", articlePage, "permanentRedirect");
  forbidText("Wiki article route", articlePage, 'from "@/lib/wiki/wiki-content"');
  requireText("sitemap", sitemap, "listPublicWikiSitemapArticles");
  forbidText("sitemap", sitemap, 'from "@/lib/wiki/wiki-content"');

  if (
    packageJson.scripts?.["check:wiki-storage-public-read"] !==
    "node scripts/check-wiki-storage-public-read.mjs"
  ) {
    failures.push("package.json is missing the exact Wiki storage guard command");
  }
  if (
    !packageJson.scripts?.["check:project"]?.includes(
      "pnpm run check:wiki-storage-public-read",
    )
  ) {
    failures.push("check:project does not include the Wiki storage guard");
  }

  try {
    const content = await readWikiContentModule();
    if (content.wikiArticles.length !== 19) {
      failures.push(`expected 19 code-backed Wiki articles, found ${content.wikiArticles.length}`);
    }
    if (new Set(content.wikiArticles.map((article) => article.slug)).size !== 19) {
      failures.push("code-backed Wiki slugs are not unique");
    }

    const expectedSeed = await expectedWikiSeed();
    if (normalizeLineEndings(seed) !== normalizeLineEndings(expectedSeed)) {
      failures.push("generated SQL seed content is not synchronized with wiki-content.ts");
    }
  } catch (error) {
    failures.push(
      `Wiki seed parity evaluation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  requireText("Wiki seed", seed, "HALLEUS_V01327_WIKI_CONTENT_SEED=SUCCESS");
  requireText("Wiki seed", seed, "Initial parity seed from v0.1.326 code-backed Wiki");
  forbidText("Wiki seed", seed, "delete from public.wiki_articles");
}

if (failures.length > 0) {
  console.error("Wiki storage and public read check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wiki storage and public read check passed.");
console.log("- the generated seed is content-equal to all 19 code-backed articles across LF/CRLF checkouts");
console.log("- public Wiki routes and sitemap read through the database-first repository");
console.log("- draft, scheduled, future, and nonindex rows stay outside public reads");
console.log("- the observable code fallback activates only when database storage is unavailable");
console.log("- RLS, revoked client grants, append-only revisions, and permanent redirects are present");
