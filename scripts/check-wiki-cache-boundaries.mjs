import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const repository = read("lib/wiki/wiki-repository.ts");
const cache = read("lib/wiki/wiki-cache.ts");
const revalidation = read("lib/wiki/wiki-revalidation.ts");
const imagePipeline = read("app/api/admin/wiki/image-pipeline/route.ts");
const policy = read("lib/monetization/product-entitlement-service.ts");
const appShell = read("components/AppShell.tsx");
const packageJson = JSON.parse(read("package.json"));
const impactRegistry = JSON.parse(read("config/halleus-check-impact.json"));

for (const marker of [
  "getPublicWikiIndex",
  "getPublicWikiArticleBySlug",
  "getPublicWikiArticleResolution",
  "getLatestPublicWikiFooterArticles",
  'select slug, category_id, title, short_title, summary,',
  'where slug = ${slug}',
  'where image.article_id = ${articleId}::uuid',
  "order by updated_at desc, slug asc",
  "limit 4",
  '[\"halleus-wiki-index-v2\"]',
  '[\"halleus-wiki-article-v2\", slug]',
  '[\"halleus-wiki-article-body-v2\", slug]',
]) {
  assert.ok(repository.includes(marker), `Wiki repository missing cache-boundary marker: ${marker}`);
}

for (const forbidden of [
  "getPublicWikiCatalog",
  "WikiStorageSnapshot",
  "readDatabaseSnapshot",
  "loadWikiStorageSnapshot",
  "WIKI_PUBLIC_SNAPSHOT_CACHE_TAG",
]) {
  assert.ok(!repository.includes(forbidden), `Legacy full Wiki snapshot contract remains: ${forbidden}`);
}

const indexRead = repository.slice(
  repository.indexOf("async function readDatabaseIndex"),
  repository.indexOf("async function readDatabaseArticleBySlug"),
);
for (const forbidden of [
  "intro",
  "key_points",
  "sections",
  "context_links",
  "sources",
  "call_to_action",
  "wiki_asset_variants",
]) {
  assert.ok(!indexRead.includes(forbidden), `Wiki index projection contains heavy field: ${forbidden}`);
}

const singleArticleRead = repository.slice(
  repository.indexOf("async function readDatabaseArticleBySlug"),
  repository.indexOf("async function readCategoryById"),
);
assert.ok(singleArticleRead.includes("limit 1"), "Single Wiki article query is not bounded to one row.");
assert.ok(singleArticleRead.includes("readReadyWikiImage"), "Single Wiki article query does not load only its image.");

const resolutionRead = repository.slice(
  repository.indexOf("async function readDatabaseResolution"),
  repository.indexOf("const WIKI_DATABASE_READ_MAX_ATTEMPTS"),
);
assert.ok(!resolutionRead.includes("getPublicWikiIndex"), "Article resolution must not depend on the global Wiki index.");
assert.ok(resolutionRead.includes("readManualRelatedArticles"), "Manual related projection is missing.");
assert.ok(resolutionRead.includes("readBacklinkArticles"), "Backlink projection is missing.");
assert.ok(resolutionRead.includes("readInlineTargets"), "Inline target projection is missing.");
assert.ok(resolutionRead.includes("readClusterArticles"), "House-cluster targeted projection is missing.");

for (const marker of [
  '"halleus-wiki-index-v2"',
  '"halleus-wiki-article-v2:"',
  '"halleus-wiki-footer-v2"',
]) {
  assert.ok(cache.includes(marker), `Wiki cache tags missing: ${marker}`);
}

for (const forbidden of [
  'revalidatePath("/", "layout")',
  'revalidatePath("/wiki/[slug]", "page")',
  'revalidatePath("/wiki/category/[categoryId]", "page")',
  "WIKI_PUBLIC_FOOTER_CACHE_TAG",
]) {
  assert.ok(!revalidation.includes(forbidden), `Forbidden global/wildcard Wiki invalidation remains: ${forbidden}`);
}
for (const marker of [
  "revalidateWikiPublicChange",
  "readWikiPublicRevalidationState",
  "readWikiPublicRevalidationStateByStableId",
  "wikiPublicArticleCacheTag(slug)",
  "WIKI_PUBLIC_INDEX_CACHE_TAG",
  'revalidatePath("/", "page")',
  'revalidatePath("/chart", "page")',
  'revalidatePath("/sitemap.xml")',
]) {
  assert.ok(revalidation.includes(marker), `Targeted Wiki revalidation marker missing: ${marker}`);
}

for (const marker of [
  "readWikiPublicRevalidationStateByStableId",
  "revalidateWikiPublicChange({ before: publicState, after: publicState })",
]) {
  assert.ok(imagePipeline.includes(marker), `Image pipeline missing targeted revalidation marker: ${marker}`);
}
assert.ok(!imagePipeline.includes("revalidateWikiPublicPaths"), "Image pipeline still imports the removed global Wiki invalidation API.");

assert.ok(!appShell.includes("getLatestPublicWikiFooterArticles"), "Footer must not query latest Wiki articles after eNamad replaces the third column.");
assert.ok(!appShell.includes("getPublicWikiIndex"), "Footer must not depend on the Wiki index.");
assert.ok(!appShell.includes("HALLEUS_WIKI_FOOTER_DEGRADED"), "Removed footer Wiki reader must not leave its degradation marker in AppShell.");
assert.ok(!appShell.includes("Promise.race"), "Removed footer Wiki reader must not leave its timeout race in AppShell.");

for (const marker of [
  'REPORT_ACCESS_POLICY_PUBLIC_CACHE_TAG = "halleus-report-access-policy-v1"',
  "getPublicReportAccessPolicy",
  "unstable_cache",
  "revalidate: 300",
  "state.storage !== \"database\"",
  "revalidateTag(REPORT_ACCESS_POLICY_PUBLIC_CACHE_TAG, { expire: 0 })",
]) {
  assert.ok(policy.includes(marker), `Public access-policy cache marker missing: ${marker}`);
}
const publicPolicyAccessor = policy.slice(
  policy.indexOf("export async function getPublicReportAccessPolicy"),
  policy.indexOf("export async function getProductPackages"),
);
for (const forbidden of ["userId", "readBalances", "report_unlocks", "credit_ledger", "getProductPackages"] ) {
  assert.ok(!publicPolicyAccessor.includes(forbidden), `Public policy cache leaks user/transactional concern: ${forbidden}`);
}
const packagesSlice = policy.slice(
  policy.indexOf("export async function getProductPackages"),
  policy.indexOf("export async function getProductPackageByCode"),
);
assert.ok(!packagesSlice.includes("unstable_cache"), "Product packages must not gain a new Data Cache in this remediation.");

const cachedPublicPages = ["app/page.tsx", "app/chart/page.tsx", "app/product/page.tsx", "app/pricing/page.tsx"];
for (const path of cachedPublicPages) {
  const source = read(path);
  assert.ok(source.includes("export const revalidate = 300;"), `${path} is missing five-minute revalidation.`);
  assert.ok(!source.includes('export const dynamic = "force-dynamic";'), `${path} remains force-dynamic.`);
}
for (const path of ["app/sky/page.tsx", "app/order/page.tsx"]) {
  assert.ok(read(path).includes('export const dynamic = "force-dynamic";'), `${path} must remain dynamic.`);
}
for (const path of ["app/page.tsx", "app/product/page.tsx", "app/pricing/page.tsx", "app/order/page.tsx"]) {
  assert.ok(read(path).includes("getPublicReportAccessPolicy"), `${path} does not use the public policy accessor.`);
  assert.ok(!read(path).includes("getReportAccessPolicy"), `${path} still uses the transactional policy accessor.`);
}

const publicConsumerPaths = [
  "app/page.tsx",
  "app/chart/page.tsx",
  "app/sky/page.tsx",
  "app/wiki/page.tsx",
  "app/wiki/category/[categoryId]/page.tsx",
  "app/wiki/[slug]/page.tsx",
  "components/AppShell.tsx",
  "app/sitemap.ts",
];
for (const path of publicConsumerPaths) {
  assert.ok(!read(path).includes("getPublicWikiCatalog"), `${path} still references getPublicWikiCatalog.`);
}

const BASELINE_PUBLIC_ARTICLE_COUNT = 195;
const fixture = {
  categories: Array.from({ length: 7 }, (_, index) => ({
    id: `category-${index}`,
    label: "Ø¯Ø³ØªÙ‡Ù” Ù†Ù…ÙˆÙ†Ù‡",
    description: "ØªÙˆØ¶ÛŒØ­ Ú©ÙˆØªØ§Ù‡ Ø¯Ø³ØªÙ‡ Ø¨Ø±Ø§ÛŒ Ø³Ù†Ø¬Ø´ payload ÙÙ‡Ø±Ø³Øª Ø³Ø¨Ú©",
  })),
  articles: Array.from({ length: BASELINE_PUBLIC_ARTICLE_COUNT }, (_, index) => ({
    slug: `baseline-article-${index}`,
    categoryId: `category-${index % 7}`,
    title: `Ø¹Ù†ÙˆØ§Ù† Ù…Ù‚Ø§Ù„Ù‡Ù” Ù†Ù…ÙˆÙ†Ù‡ ${index}`,
    shortTitle: `Ø¹Ù†ÙˆØ§Ù† Ú©ÙˆØªØ§Ù‡ ${index}`,
    summary: "Ø®Ù„Ø§ØµÙ‡Ù” Ø¹Ù…ÙˆÙ…ÛŒ Ø³Ø¨Ú© Ø¨Ø±Ø§ÛŒ Ø³Ù†Ø¬Ø´ Ø§Ù†Ø¯Ø§Ø²Ù‡Ù” payload Ùˆ Ø§Ø·Ù…ÛŒÙ†Ø§Ù† Ø§Ø² Ø§ÛŒÙ†Ú©Ù‡ Ù…Ø­ØªÙˆØ§ÛŒ Ø³Ù†Ú¯ÛŒÙ† ÙˆØ§Ø±Ø¯ index Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.",
    readingMinutes: 8,
    updatedAt: "2026-09-10T00:00:00.000Z",
  })),
};
const indexBytes = Buffer.byteLength(JSON.stringify(fixture), "utf8");
assert.ok(indexBytes <= 512 * 1024, `Baseline-size Wiki index fixture exceeds 512KiB: ${indexBytes}`);
for (const heavy of ["intro", "keyPoints", "sections", "contextLinks", "sources", "callToAction", "image"]) {
  assert.ok(!fixture.articles.some((article) => Object.hasOwn(article, heavy)), `Fixture unexpectedly contains heavy field: ${heavy}`);
}

const articleFixture = {
  stableId: "baseline-article",
  slug: "baseline-article",
  title: "Ø¹Ù†ÙˆØ§Ù†",
  shortTitle: "Ú©ÙˆØªØ§Ù‡",
  categoryId: "foundations",
  summary: "Ø®Ù„Ø§ØµÙ‡",
  intro: "Ù…Ù‚Ø¯Ù…Ù‡",
  readingMinutes: 10,
  keyPoints: Array.from({ length: 20 }, () => "Ù†Ú©ØªÙ‡Ù” Ù†Ù…ÙˆÙ†Ù‡"),
  sections: Array.from({ length: 40 }, (_, index) => ({
    title: `Ø¨Ø®Ø´ ${index}`,
    paragraphs: Array.from({ length: 8 }, () => "Ù¾Ø§Ø±Ø§Ú¯Ø±Ø§Ù Ù†Ù…ÙˆÙ†Ù‡ Ø¨Ø±Ø§ÛŒ Ú©Ø±Ø§Ù† payload Ù…Ù‚Ø§Ù„Ù‡Ù” ØªÚ©ÛŒ Ø¨Ø¯ÙˆÙ† Ù…Ù‚Ø§Ù„Ù‡ ÛŒØ§ ØªØµÙˆÛŒØ± Ø¯ÛŒÚ¯Ø±."),
  })),
  relatedSlugs: [],
  relatedArticleIds: [],
  updatedAt: "2026-09-10T00:00:00.000Z",
};
const articleBytes = Buffer.byteLength(JSON.stringify(articleFixture), "utf8");
assert.ok(articleBytes <= 1024 * 1024, `Single-article fixture exceeds 1MiB: ${articleBytes}`);

assert.equal(
  packageJson.scripts?.["check:wiki-cache-boundaries"],
  "node scripts/check-wiki-cache-boundaries.mjs",
  "package.json is missing check:wiki-cache-boundaries",
);

const discoveryArea = impactRegistry.areas.find((area) => area.id === "public-discovery-architecture");
assert.ok(discoveryArea?.patterns.includes("lib/wiki/wiki-cache.ts"), "Wiki cache runtime is not mapped into public-discovery verification.");
assert.ok(discoveryArea?.guards.includes("check:wiki-cache-boundaries"), "Public-discovery changes do not select check:wiki-cache-boundaries.");
const monetizationArea = impactRegistry.areas.find((area) => area.id === "monetization-products");
assert.ok(monetizationArea?.guards.includes("check:wiki-cache-boundaries"), "Public policy cache changes do not select check:wiki-cache-boundaries.");
const cacheGuardArea = impactRegistry.areas.find((area) => area.id === "wiki-cache-boundaries-guard-tooling");
assert.ok(cacheGuardArea?.exclusive === true && cacheGuardArea?.patterns.includes("scripts/check-wiki-cache-boundaries.mjs") && cacheGuardArea?.guards.includes("check:wiki-cache-boundaries") && cacheGuardArea?.lint === false && cacheGuardArea?.build === false, "Wiki cache boundary guard is not registered as focused self-verifying tooling.");

for (const legacyGuard of [
  "check:wiki-storage-public-read",
  "check:full-wiki-cms",
  "check:public-discovery-architecture",
  "check:public-editorial-content",
]) {
  assert.equal(typeof packageJson.scripts?.[legacyGuard], "string", `${legacyGuard} was removed instead of updated.`);
}

console.log("Wiki cache boundary remediation check passed.");
console.log(`- baseline public index fixture: ${BASELINE_PUBLIC_ARTICLE_COUNT} articles / ${indexBytes} bytes`);
console.log(`- bounded single-article fixture: ${articleBytes} bytes`);
console.log("- global snapshot, root-layout invalidation, and Wiki wildcard invalidation are absent");
console.log("- index, per-slug article, footer, and public access-policy caches are isolated");
console.log("HALLEUS_WIKI_CACHE_BOUNDARIES_STAGE23_R1=PASS");