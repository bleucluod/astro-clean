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

function requireText(label, source, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function forbidText(label, source, marker) {
  if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`);
}

const migration = read("database/migrations/0004_full_wiki_cms.sql");
const dailyCapacityMigration = read("database/migrations/0005_wiki_schedule_daily_capacity.sql");
const recoverySeed = read("database/seeds/0002_wiki_content_cms_recovery.sql");
const types = read("lib/admin/admin-types.ts");
const capabilities = read("lib/admin/admin-capabilities.ts");
const auth = read("lib/admin/admin-auth.ts");
const cms = read("lib/wiki/wiki-cms-service.ts");
const importer = read("lib/wiki/wiki-import-service.ts");
const packageParser = read("lib/wiki/wiki-package.ts");
const markdownParser = read("lib/wiki/wiki-markdown.ts");
const publisher = read("lib/wiki/wiki-publisher.ts");
const repository = read("lib/wiki/wiki-repository.ts");
const articlePage = read("app/wiki/[slug]/page.tsx");
const articleRenderer = read("components/wiki/WikiArticleRender.tsx");
const adminClient = read("components/admin/WikiAdminPanel.tsx");
const adminConsole = read("components/admin/AdminConsole.tsx");
const categoryRoute = read("app/api/admin/wiki/categories/route.ts");
const contentGuideRoute = read("app/api/admin/wiki/content-guide/route.ts");
const contentGuide = read("lib/wiki/wiki-content-guide.ts");
const scheduling = read("lib/wiki/wiki-scheduling.ts");
const packageGuide = read("public/halleus-wiki-package-guide-v1.md");
const internalRoute = read("app/api/internal/wiki/publish-due/route.ts");
const timer = read("ops/vps/halleus-wiki-publisher.timer");
const publisherRunner = read("ops/vps/halleus-wiki-publisher.sh");
const packageJson = JSON.parse(read("package.json"));

for (const table of [
  "wiki_article_drafts",
  "wiki_assets",
  "wiki_internal_links",
  "wiki_import_packages",
  "wiki_import_items",
  "wiki_publish_jobs",
  "wiki_schedule_settings",
  "admin_capability_grants",
]) {
  requireText("CMS migration", migration, table);
}
for (const table of ["wiki_article_drafts", "wiki_assets", "wiki_internal_links"]) {
  requireText("CMS public table RLS", migration, `alter table public.${table} enable row level security`);
  requireText("CMS public table grants", migration, `revoke all on public.${table} from public, anon, authenticated`);
}
requireText("CMS migration", migration, "HALLEUS_V01328_FULL_WIKI_CMS_MIGRATION=SUCCESS");
requireText("CMS migration", migration, "wiki-media");
requireText("CMS migration", migration, "publisher");
requireText("CMS recovery seed", recoverySeed, "stable_id");
requireText("CMS recovery seed", recoverySeed, "HALLEUS_V01328B_WIKI_UTF8_CONTENT_RECOVERY_SEED=SUCCESS");
requireText("daily capacity migration", dailyCapacityMigration, "max_articles_per_day");
requireText("daily capacity migration", dailyCapacityMigration, "HALLEUS_V01328C_WIKI_DAILY_CAPACITY_MIGRATION=SUCCESS");

for (const capability of [
  "wiki.read",
  "wiki.draft.write",
  "wiki.import.write",
  "wiki.publish.write",
  "wiki.settings.write",
  "wiki.media.write",
]) {
  requireText("admin capability types", types, capability);
  requireText("admin role matrix", capabilities, capability);
}
requireText("admin auth", auth, "admin_capability_grants");
forbidText("admin auth", auth, "user_metadata");

requireText("draft service", cms, "public.wiki_article_drafts");
requireText("draft service", cms, "admin.wiki.draft_saved");
requireText("revision service", cms, "wiki_article_revisions");
requireText("rollback service", cms, "admin.wiki.revision_rolled_back");
requireText("legacy revision compatibility", cms, "storedSnapshot.stableId");
requireText("legacy revision compatibility", cms, "currentSnapshot");
requireText("slug redirect", cms, "public.wiki_redirects");
requireText("soft delete", cms, "admin.wiki.article_soft_deleted");
requireText("category service", cms, "admin.wiki.category_created");
forbidText("CMS service", cms, "delete from public.wiki_articles");

requireText("package parser", packageParser, "MAX_ARCHIVE_BYTES");
requireText("package parser", packageParser, "MAX_TOTAL_UNCOMPRESSED_BYTES");
requireText("package parser", packageParser, "MAX_COMPRESSION_RATIO");
requireText("package parser", packageParser, "Multi-disk ZIP archives are not supported");
requireText("package parser", packageParser, "Encrypted ZIP entries are not accepted");
requireText("package parser", packageParser, "ZIP64 archives are not supported");
requireText("Markdown parser", markdownParser, "Raw HTML and unsafe URL protocols");
forbidText("package parser", packageParser, "extract-zip");
forbidText("package parser", packageParser, "adm-zip");

requireText("import service", importer, "quarantinedArticles");
requireText("import service", importer, "partially_imported");
requireText("import service", importer, "computeWikiScheduleSlots");
requireText("import service", importer, "contentVersion <=");
requireText("import service", importer, "different stable article ID");
requireText("multi-publication scheduler", scheduling, "maxArticlesPerDay");

requireText("publisher", publisher, "for update skip locked");
requireText("publisher", publisher, "attempt_count >= 3");
requireText("publisher", publisher, "Post-publish database health check failed");
requireText("publisher", publisher, "system.wiki.scheduled_article_published");
requireText("publisher route", internalRoute, "timingSafeEqual");
requireText("publisher route", internalRoute, "wikiPublisherSecret");
requireText("publisher timer", timer, "OnUnitActiveSec=5min");
requireText("publisher readiness retry", publisherRunner, "max_attempts=12");
requireText("publisher readiness retry", publisherRunner, "exit_code != 7");
requireText("publisher readiness retry", publisherRunner, '/bin/sleep "$retry_delay_seconds"');

requireText("public repository", repository, "deleted_at is null");
requireText("public article route", articlePage, "dynamicParams = true");
requireText("public article route", articlePage, "revalidate = 300");
requireText("public article route", articlePage, "internalLinkTargets");
requireText("public article renderer", articleRenderer, "articleMedia");

for (const marker of [
  "ذخیرهٔ پیش‌نویس",
  "انتشار اکنون",
  "زمان‌بندی",
  "حذف نرم",
  "نسخه‌ها، مقایسه و بازگشت",
  "زمان‌بندی خودکار",
  "آپلود امن",
]) {
  requireText("Wiki admin UI", adminClient, marker);
}
requireText("Wiki admin UI", adminClient, "saveDraft(true)");
for (const marker of [
  "activeSection",
  "مقاله‌ها",
  "مقالهٔ تازه",
  "ورود بستهٔ استاندارد ویکی",
  "تنظیمات انتشار خودکار",
  "دسته‌های ویکی",
  "رسانه‌ها",
  "weekdayOptions",
  "maxArticlesPerDay",
  "/api/admin/wiki/content-guide",
  "formElement.reset()",
  "importResult.items.map",
  "formatImportError",
]) {
  requireText("Wiki admin workspace", adminClient, marker);
}
requireText("Wiki nested navigation", adminConsole, "wikiSections");
requireText("Wiki nested navigation", adminConsole, "activeSubnav");
forbidText("Wiki scheduling UI", adminClient, "روزهای هفته ۰ تا ۶");
forbidText("Wiki scheduling UI", adminClient, "settings.onePerDay");
requireText("Wiki category route", categoryRoute, "wiki.settings.write");
requireText("Wiki content guide route", contentGuideRoute, 'requireAdminCapability(request, "wiki.read")');
requireText("Wiki content guide route", contentGuideRoute, '"cache-control": "private, no-store"');
requireText("Wiki content guide route", contentGuideRoute, "listWikiContentGuideInventory");
requireText("Wiki content guide route", contentGuideRoute, "listWikiContentGuideQueue");
forbidText("Wiki content guide route", contentGuideRoute, "listAdminWikiArticles");
requireText("Wiki content guide inventory", cms, "export async function listWikiContentGuideInventory");
const contentGuideInventory = cms.slice(
  cms.indexOf("export async function listWikiContentGuideInventory"),
  cms.indexOf("export async function listWikiContentGuideQueue"),
);
forbidText("Wiki content guide inventory", contentGuideInventory, "join ");
forbidText("Wiki content guide inventory", contentGuideInventory, "limit ");
forbidText("Wiki content guide inventory", contentGuideInventory, "body_markdown");
requireText("Wiki content guide", contentGuide, "مقاله‌های منتشرشده و قابل لینک");
requireText("Wiki content guide", contentGuide, "صف زندهٔ انتشار");
requireText("Wiki content guide", contentGuide, "همهٔ شناسه‌ها و slugهای رزروشده");
requireText("Wiki content guide", contentGuide, "deleted-reserved");
requireText("Wiki package guide", packageGuide, "manifest.json");
requireText("Wiki package guide", packageGuide, "article_id");
requireText("Wiki package guide", packageGuide, "چت محتوانویسی");
requireText("Wiki package guide", packageGuide, "related_article_ids");
requireText("Wiki package guide", packageGuide, "sources");
requireText("Wiki package guide", packageGuide, "call_to_action");
requireText("Wiki package guide", packageGuide, "۲ تا ۴ لینک");
requireText("Wiki package guide", packageGuide, "نقل‌قول با `>`");
requireText("Wiki package guide", packageGuide, "bold/italic");

if (packageJson.scripts?.["check:full-wiki-cms"] !== "node scripts/check-full-wiki-cms.mjs") {
  failures.push("package.json is missing check:full-wiki-cms");
}

if (failures.length) {
  console.error("Full Wiki CMS check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Full Wiki CMS check passed.");
console.log("- server-authorized editor, publisher, and optional capability grants are present");
console.log("- published rows are isolated from autosave drafts and append-only revisions");
console.log("- package import, quarantine, stable links, media, redirects, and deterministic scheduling are wired");
console.log("- the Wiki workspace separates articles, imports, scheduling, categories, and media with a downloadable package guide");
console.log("- Persian weekday controls and bounded multi-publication daily capacity replace raw scheduler inputs");
console.log("- the protected live guide separates linkable articles from every reserved ID and category without loading article bodies");
console.log("- package quarantine reasons remain visible and async form reset no longer dereferences a released React event");
console.log("- a secret-protected systemd publisher performs bounded retries and public revalidation");
