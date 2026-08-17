// HALLEUS_BATCH4_R6_AUTHORITY_AND_GLOBAL_QUOTA_GUARD
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");
const requireText = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
};
const forbidText = (label, source, marker) => {
  if (source.includes(marker)) failures.push(`${label} contains forbidden: ${marker}`);
};

const migration = read("database/migrations/0019_wiki_internal_link_admin.sql");
const quotaRepairMigration = read("database/migrations/0021_wiki_global_contextual_link_quota_repair.sql");
const ruleMigration = read("database/migrations/0022_wiki_link_rule_min3_unbounded.sql");
const optionalOutgoingRuleMigration = read("database/migrations/0023_wiki_link_rule_outgoing_optional.sql");
const shahrivarSeoMigration = read("database/migrations/0024_wiki_shahrivar_1405_seo_refresh.sql");
const shahrivarEncodingRepairMigration = read("database/migrations/0025_wiki_shahrivar_1405_encoding_repair.sql");
const optionalIncomingRuleMigration = read("database/migrations/0026_wiki_link_rule_incoming_optional.sql");
const publisherSource = read("lib/wiki/wiki-publisher.ts");
// HALLEUS_BATCH4_R20B13E_0021_JSON_ALIAS_GUARD
for (const marker of [
  "as key_point(key_point_value)",
  "key_point.key_point_value #>> '{}'",
  "as section_item(section_value)",
  "section_item.section_value -> 'paragraphs'",
  "section_item.section_value -> 'bullets'",
  "as visible_item(visible_value)",
  "visible_item.visible_value #>> '{}'",
]) {
  requireText("R20B13E 0021 qualified JSON aliases", quotaRepairMigration, marker);
}
forbidText(
  "R20B13E 0021 ambiguous section value alias",
  quotaRepairMigration,
  "from jsonb_array_elements(target.corrected_sections) section_item",
);
const service = read("lib/wiki/wiki-link-admin-service.ts");
const engineSource = read("lib/wiki/wiki-link-admin-engine.ts");
const trigger = read("lib/wiki/wiki-link-admin-trigger.ts");
const route = read("app/api/admin/wiki/link-maintenance/route.ts");
const panel = read("components/admin/WikiLinkAdminPanel.tsx");
const consoleSource = read("components/admin/AdminConsole.tsx");
const wikiPanel = read("components/admin/WikiAdminPanel.tsx");
const cms = read("lib/wiki/wiki-cms-service.ts");
const publisherRoute = read("app/api/internal/wiki/publish-due/route.ts");
const packageJson = JSON.parse(read("package.json"));

for (const table of [
  "wiki_link_scan_runs",
  "wiki_link_graph_snapshots",
  "wiki_link_findings",
  "wiki_link_suggestions",
  "wiki_link_decisions",
  "wiki_link_apply_results",
]) {
  requireText("migration", migration, table);
}
for (const marker of [
  "wiki_link_rule_versions",
  "wiki_link_scan_triggers",
  "HALLEUS_BATCH4_R20B9_CURRENT_ANCHOR_BASELINE",
  "HALLEUS_BATCH4_R20B13_UNBOUNDED_CORE_LINKS",
  "count(distinct article.stable_id)",
  "at least one approved contextual core link",
  "'coreMax', 0",
  "batch4-current-292-v2",
  "baseline_edge_count <> 292",
  "baseline_article_count <> 92",
  "baseline_core_count <> 92",
  "'excludedStableIds', '[]'::jsonb",
  "halleus_link_authority_edges",
  "$halleus_authority_edges$",
  "halleus_link_authority_occurrences",
  "halleus_link_current_authority_edges",
  "current_authority_edge_count <> 292",
  "current_authority_source_count <> 92",
  "current_anchor_drift_count <> 31",
  "duplicate_pair_count <> 2",
  "mehr-woman-traits",
  "mehr-man-traits",
  "ordibehesht-woman-traits",
  "ordibehesht-man-traits",
  "pg_temp.halleus_r20b9_replace_json_text",
  "Batch 4 R20B9 duplicate contextual pair normalization before link-admin baseline",
  "baseline_graph_sha256",
  "suggested','edited','approved','rejected','conflict','applied','verified','rolled_back",
  "enable row level security",
  "revoke all on halleus_private.wiki_link_",
]) {
  requireText("migration", migration, marker);
}
forbidText(
  "migration stale exact-frozen-anchor production gate",
  migration,
  "authority_present_count <> 292",
);
forbidText(
  "migration stale baseline identity",
  migration,
  "batch2-final-292-v1",
);

for (const marker of [
  "scanWikiInternalLinks",
  "buildNaturalWikiLinkSuggestions",
  "source_content_version",
  "source_body_sha256",
  "saveAdminWikiDraft",
  "parseWikiMarkdown",
  "applyWikiLinkParagraphChange",
  "rollbackWikiLinkParagraphChange",
  "Article already has an open draft",
  "draftOnly: true",
  "autoPublished: false",
  "processPendingWikiLinkScanTriggers",
]) {
  requireText("link service", service, marker);
}
forbidText("link service", service, "publishAdminWikiDraft");
requireText("link service no-hard-max outgoing parser", service, 'outgoingMax: integer("outgoingMax", 0, 20),');
requireText("link service no-hard-max incoming parser", service, 'incomingMax: integer("incomingMax", 0, 100),');
requireText("link service no-hard-max core parser", service, 'coreMax: integer("coreMax", 0, 5),');
requireText("link engine unbounded core default", engineSource, "coreMax: 0,");
requireText("link engine optional outgoing default", engineSource, "outgoingMin: 0,");
requireText("link engine optional incoming default", engineSource, "incomingMin: 0,");
requireText("link engine incoming advisory target", engineSource, "incomingTarget: 3,");
requireText("link engine incoming target warning", engineSource, "incomingCount < rules.incomingTarget");
requireText("link engine explicit positive core max only", engineSource, "rules.coreMax > 0 && core.length > rules.coreMax");
requireText("link engine zero-max suggestion gate", engineSource, "rules.outgoingMax > 0 && summary.outgoing >= rules.outgoingMax");
requireText("link engine multi-core representative destination", engineSource, "core.map((edge) => edge.href).sort()[0]");
requireText("link service no-hard-max outgoing ordering", service, "rules.outgoingMax > 0 && rules.outgoingMin > rules.outgoingMax");
requireText("link service no-hard-max incoming ordering", service, "rules.incomingMax > 0 && rules.incomingTarget > rules.incomingMax");

for (const marker of [
  'requireAdminCapability(request, "wiki.read")',
  'requireAdminCapability(request, "wiki.settings.write")',
  'requireAdminCapability(request, "wiki.draft.write")',
  'requireAdminCapability(request, "wiki.publish.write")',
  "assertAdminMutationRequest(request)",
  'action === "apply_suggestion"',
  'action === "rollback_suggestion"',
]) {
  requireText("link admin route", route, marker);
}

for (const marker of [
  "WikiLinkAdminPanel",
  'id: "links"',
  'wikiSection === "links"',
]) {
  requireText("AdminConsole", consoleSource, marker);
}
requireText("WikiAdminPanel section union", wikiPanel, '| "links"');
for (const marker of [
  "incoming",
  "outgoing",
  "coreDestination",
  "approve_suggestion",
  "reject_suggestion",
  "apply_suggestion",
  "rollback_suggestion",
  "save_rules",
]) {
  requireText("WikiLinkAdminPanel", panel, marker);
}

for (const marker of [
  "outgoingMin: 0",
  "outgoingMax: 0",
  "incomingMin: 0",
  "incomingTarget: 3",
  "incomingMax: 0",
  "coreMax: 0",
]) {
  requireText("WikiLinkAdminPanel current rule fallback", panel, marker);
}
for (const marker of [
  "HALLEUS_BATCH4_R20B13_UNBOUNDED_CORE_LINKS",
  "'coreMax', 0",
  "R20B13 forward rule version",
]) {
  requireText("0022 unbounded-core rule migration", ruleMigration, marker);
}

for (const marker of [
  "HALLEUS_WIKI_OUTGOING_MIN_OPTIONAL",
  "jsonb_set(current_config, '{outgoingMin}', '0'::jsonb, true)",
  "preserve all other active Wiki link rules",
]) {
  requireText("0023 optional outgoing migration", optionalOutgoingRuleMigration, marker);
}
for (const marker of [
  "HALLEUS_WIKI_INCOMING_MIN_OPTIONAL_TARGET3",
  "jsonb_set(current_config, '{incomingMin}', '0'::jsonb, true)",
  "incomingTarget=3",
  "Incoming backlinks are advisory for publication",
]) {
  requireText("0026 optional incoming migration", optionalIncomingRuleMigration, marker);
}
for (const marker of [
  "HALLEUS_WIKI_INCOMING_MIN_RULE_DRIVEN",
  "const incomingMinimum = asNumber(activeLinkRuleConfig.incomingMin);",
  "incomingMinimum > 0",
  "validIncomingSourceIds.size < incomingMinimum",
  "Scheduled Wiki incoming rule blocked publication",
]) {
  requireText("publisher rule-driven incoming minimum", publisherSource, marker);
}
for (const marker of [
  "validIncomingSourceIds.size < 3",
  "Scheduled Wiki min3 gate blocked publication: incoming=",
]) {
  forbidText("publisher stale hardcoded incoming min3", publisherSource, marker);
}

for (const marker of [
  "HALLEUS_WIKI_SHAHRIVAR_1405_SEO_REFRESH",
  "shahrivar-1405-transit-guide",
  "ØªØ±Ù†Ø²ÛŒØª Ø´Ù‡Ø±ÛŒÙˆØ± Û±Û´Û°ÛµØ› Ù…Ø§Ù‡â€ŒÚ¯Ø±ÙØªÚ¯ÛŒØŒ Ø·Ø§Ù„Ø¹â€ŒØ¨ÛŒÙ†ÛŒ Ùˆ Ù¾ÛŒØ´â€ŒØ¨ÛŒÙ†ÛŒ Û±Û² Ù†Ø´Ø§Ù†",
  "wiki_article_revisions",
  "wiki_internal_links",
  "corrected_version",
  "p_sources",
]) {
  requireText("0024 Shahrivar SEO refresh migration", shahrivarSeoMigration, marker);
}

// HALLEUS_WIKI_SHAHRIVAR_1405_ENCODING_REPAIR_GUARD
for (const marker of [
  "HALLEUS_WIKI_SHAHRIVAR_1405_ENCODING_REPAIR",
  "pg_temp.halleus_decode_windows1252_mojibake",
  "ترنزیت شهریور ۱۴۰۵؛ ماه‌گرفتگی، طالع‌بینی و پیش‌بینی ۱۲ نشان",
  "طالع‌بینی شهریور ۱۴۰۵؛ ماه‌گرفتگی و پیش‌بینی ۱۲ نشان | هالیوس",
  "Repair Shahrivar 1405 UTF-8 mojibake from 0024",
  "content_version = 3",
  "article.content_version + 1 as repaired_content_version",
]) {
  requireText("0025 Shahrivar encoding repair migration", shahrivarEncodingRepairMigration, marker);
}
for (const marker of ["Ø", "Ù", "Û", "Ú", "Â", "â€"]) {
  forbidText("0025 Persian mojibake guard", shahrivarEncodingRepairMigration, marker);
}
if (!/[ء-ی]/u.test(shahrivarEncodingRepairMigration)) {
  failures.push("0025 encoding repair migration does not contain real Persian text");
}

requireText(
  "package.json",
  packageJson.scripts?.["check:wiki-internal-link-admin"] ?? "",
  "node scripts/check-wiki-internal-link-admin.mjs",
);
requireText("CMS post-publish trigger", cms, "enqueueWikiLinkScanTriggerBestEffort");
requireText("CMS post-publish trigger", cms, 'triggerKind: "post_publish"');
requireText("publisher maintenance", publisherRoute, "processPendingWikiLinkScanTriggers");
requireText("publisher maintenance", publisherRoute, "ensurePeriodicWikiLinkScanTriggerBestEffort");
requireText("publisher maintenance", publisherRoute, "linkMaintenance");
requireText("trigger isolation", trigger, "BestEffort");

// HALLEUS_BATCH4_R9_ADDITIVE_QUOTA_GUARD
const r9AdditiveQuotaMigration = read("database/migrations/0021_wiki_global_contextual_link_quota_repair.sql");
// HALLEUS_BATCH4_R10_VISIBLE_PROJECTION_SYNC_GUARD
const r10VisibleProjectionMigration = read("database/migrations/0021_wiki_global_contextual_link_quota_repair.sql");
const transpiled = ts.transpileModule(engineSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "wiki-link-admin-engine.ts",
  reportDiagnostics: true,
});
for (const diagnostic of transpiled.diagnostics ?? []) {
  if (diagnostic.category === ts.DiagnosticCategory.Error) {
    failures.push(`engine transpile error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
}
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "halleus-link-admin-guard-"));
const enginePath = path.join(tempDir, "engine.mjs");
fs.writeFileSync(enginePath, transpiled.outputText, "utf8");
const engine = await import(pathToFileURL(enginePath).href);
fs.rmSync(tempDir, { recursive: true, force: true });

if (engine.DEFAULT_WIKI_LINK_SCAN_RULES.excludedStableIds.length !== 0) {
  failures.push("default link-admin rules still exclude public articles from global quota");
}
if (engine.DEFAULT_WIKI_LINK_SCAN_RULES.incomingMin !== 0) {
  failures.push("default link-admin incoming minimum must remain optional");
}
if (engine.DEFAULT_WIKI_LINK_SCAN_RULES.incomingTarget !== 3) {
  failures.push("default link-admin incoming advisory target must remain 3");
}

const authoritySlugs = ["birth-chart-basics","sun-moon-rising","astrology-houses","major-aspects","why-birth-time-matters","why-birth-city-matters","birth-chart-without-birth-time","how-to-read-birth-chart","what-is-birth-chart-interpretation","planet-sign-house-difference","why-sun-sign-is-not-enough","planets-in-birth-chart","what-is-moon-sign","what-is-rising-sign","tehran-birth-chart-difference","what-is-astrology","what-is-tropical-astrology","what-is-sidereal-astrology","what-is-vedic-astrology","important-transits-tir-1405","astrology-transits-explained","first-house-in-natal-chart","sixth-house-in-natal-chart","seventh-house-in-natal-chart","eighth-house-in-natal-chart","ninth-house-in-natal-chart","tenth-house-in-natal-chart","four-elements-in-natal-chart","lunar-nodes-in-natal-chart","fourth-house-in-natal-chart","eleventh-house-in-natal-chart","twelfth-house-in-natal-chart","empty-houses-in-natal-chart","zodiac-modalities-in-natal-chart","degrees-in-natal-chart","north-node-vs-south-node","mordad-1405-transit-guide","transits-to-ascendant-and-midheaven","jupiter-in-natal-chart","retrograde-planets-explained","stellium-in-natal-chart","new-moon-vs-full-moon-astrology","saturn-return-explained","mercury-retrograde-guide","natal-chart-vs-transit-chart","astrology-aspect-orbs-explained","conjunction-aspect-explained","opposition-aspect-explained","square-aspect-explained","trine-aspect-explained","sextile-aspect-explained","mercury-in-natal-chart","venus-in-natal-chart","saturn-in-natal-chart","why-transits-differ-by-person","fast-vs-slow-astrology-transits","second-house-in-natal-chart","hard-aspects-explained","mars-in-natal-chart","uranus-in-natal-chart","third-house-in-natal-chart","fifth-house-in-natal-chart","reading-multiple-aspects-together","neptune-in-natal-chart","combine-planet-sign-house-and-aspect","pluto-in-natal-chart","sun-moon-aspects-in-natal-chart","venus-mars-aspects-in-natal-chart","jupiter-saturn-aspects-in-natal-chart","transits-to-natal-sun-and-moon","natal-chart-uses-and-limits","overall-chart-signature","chart-ruler-in-natal-chart","persian-birth-months-astrology-guide","shahrivar-birth-month-compatibility","mehr-born-traits","mordad-woman-traits","mordad-man-traits","mordad-birth-month-compatibility","ordibehesht-born-traits","shahrivar-born-traits","aban-born-traits","khordad-born-traits","mehr-woman-traits","mehr-man-traits","mehr-birth-month-compatibility","esfand-born-traits","farvardin-born-traits","mordad-born-traits","dey-born-traits","ordibehesht-woman-traits","ordibehesht-man-traits"];
const authorityEdges = [["birth-chart-basics","astrology-houses","\u0645\u0639\u0646\u06cc \u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["birth-chart-basics","stellium-in-natal-chart","\u0631\u0648\u0634 \u062e\u0648\u0627\u0646\u062f\u0646 \u0627\u0633\u062a\u0644\u06cc\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a"],["birth-chart-basics","overall-chart-signature","\u0631\u0648\u0634 \u062a\u0634\u062e\u06cc\u0635 \u0627\u0645\u0636\u0627\u06cc \u06a9\u0644\u06cc \u0686\u0627\u0631\u062a"],["sun-moon-rising","jupiter-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0634\u062a\u0631\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sun-moon-rising","mercury-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0637\u0627\u0631\u062f \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sun-moon-rising","saturn-in-natal-chart","\u0645\u0639\u0646\u06cc \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["astrology-houses","eighth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0647\u0634\u062a\u0645"],["astrology-houses","ninth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0646\u0647\u0645"],["astrology-houses","empty-houses-in-natal-chart","\u062e\u0627\u0644\u06cc\u200c\u0628\u0648\u062f\u0646 \u06cc\u06a9 \u062e\u0627\u0646\u0647"],["astrology-houses","second-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u062f\u0648\u0645"],["astrology-houses","third-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0633\u0648\u0645"],["major-aspects","conjunction-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0647\u0645\u200c\u0646\u0634\u06cc\u0646\u06cc \u06cc\u0627 Conjunction"],["major-aspects","opposition-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0642\u0627\u0628\u0644\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["major-aspects","square-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0631\u0628\u0639 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["major-aspects","trine-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u062a\u062b\u0644\u06cc\u062b \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["major-aspects","sextile-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0633\u06a9\u0633\u062a\u0627\u06cc\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["why-birth-time-matters","why-birth-city-matters","\u062a\u0623\u062b\u06cc\u0631 \u0634\u0647\u0631 \u062a\u0648\u0644\u062f \u0628\u0631 \u0645\u062d\u0627\u0633\u0628\u0647\u0654 \u0686\u0627\u0631\u062a"],["why-birth-time-matters","birth-chart-without-birth-time","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u0628\u062f\u0648\u0646 \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["why-birth-time-matters","what-is-birth-chart-interpretation","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["why-birth-city-matters","birth-chart-without-birth-time","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u0628\u062f\u0648\u0646 \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["why-birth-city-matters","how-to-read-birth-chart","\u0631\u0648\u0634 \u062e\u0648\u0627\u0646\u062f\u0646 \u0686\u0627\u0631\u062a \u0628\u0627 \u062f\u0627\u062f\u0647\u0654 \u0645\u06a9\u0627\u0646\u06cc \u062f\u0642\u06cc\u0642"],["why-birth-city-matters","tehran-birth-chart-difference","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u062a\u0647\u0631\u0627\u0646 \u0628\u0627 \u0634\u0647\u0631\u0647\u0627\u06cc \u062f\u06cc\u06af\u0631"],["birth-chart-without-birth-time","why-birth-city-matters","\u062a\u0623\u062b\u06cc\u0631 \u0634\u0647\u0631 \u062a\u0648\u0644\u062f \u0628\u0631 \u0645\u062d\u0627\u0633\u0628\u0647 \u0686\u0627\u0631\u062a"],["birth-chart-without-birth-time","what-is-birth-chart-interpretation","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["birth-chart-without-birth-time","tehran-birth-chart-difference","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u062a\u0647\u0631\u0627\u0646 \u0628\u0627 \u0634\u0647\u0631\u0647\u0627\u06cc \u062f\u06cc\u06af\u0631"],["how-to-read-birth-chart","birth-chart-basics","\u0627\u062c\u0632\u0627\u06cc \u067e\u0627\u06cc\u0647\u0654 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["how-to-read-birth-chart","empty-houses-in-natal-chart","\u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u062e\u0627\u0644\u06cc"],["how-to-read-birth-chart","degrees-in-natal-chart","\u0645\u0639\u0646\u06cc \u062f\u0631\u062c\u0647\u200c\u0647\u0627\u06cc \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["what-is-birth-chart-interpretation","how-to-read-birth-chart","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a"],["what-is-birth-chart-interpretation","what-is-moon-sign","\u0645\u0627\u0647 \u062f\u0631 \u062b\u0648\u0631"],["what-is-birth-chart-interpretation","overall-chart-signature","\u0631\u0648\u0634 \u062a\u0634\u062e\u06cc\u0635 \u0627\u0645\u0636\u0627\u06cc \u06a9\u0644\u06cc \u0686\u0627\u0631\u062a"],["planet-sign-house-difference","what-is-moon-sign","\u0646\u0634\u0627\u0646 \u0645\u0627\u0647 \u0686\u06cc\u0633\u062a \u0648 \u0686\u06af\u0648\u0646\u0647 \u0645\u062d\u0627\u0633\u0628\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f"],["planet-sign-house-difference","lunar-nodes-in-natal-chart","\u0645\u0639\u0646\u06cc \u06af\u0631\u0647\u200c\u0647\u0627\u06cc \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planet-sign-house-difference","combine-planet-sign-house-and-aspect","\u062a\u0631\u06a9\u06cc\u0628 \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646\u060c \u062e\u0627\u0646\u0647 \u0648 \u062c\u0646\u0628\u0647"],["why-sun-sign-is-not-enough","lunar-nodes-in-natal-chart","\u0645\u0639\u0646\u06cc \u06af\u0631\u0647\u200c\u0647\u0627\u06cc \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["why-sun-sign-is-not-enough","degrees-in-natal-chart","\u0645\u0639\u0646\u06cc \u062f\u0631\u062c\u0647\u200c\u0647\u0627\u06cc \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["why-sun-sign-is-not-enough","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","venus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0648\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","uranus-in-natal-chart","\u0627\u0648\u0631\u0627\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","neptune-in-natal-chart","\u0646\u067e\u062a\u0648\u0646 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["planets-in-birth-chart","pluto-in-natal-chart","\u067e\u0644\u0648\u062a\u0648 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-moon-sign","jupiter-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0634\u062a\u0631\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-moon-sign","saturn-in-natal-chart","\u0645\u0639\u0646\u06cc \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-moon-sign","mars-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["what-is-rising-sign","tehran-birth-chart-difference","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u062a\u0647\u0631\u0627\u0646 \u0628\u0627 \u0634\u0647\u0631\u0647\u0627\u06cc \u062f\u06cc\u06af\u0631"],["what-is-rising-sign","first-house-in-natal-chart","\u062e\u0627\u0646\u0647\u200c\u06cc \u0627\u0648\u0644"],["what-is-rising-sign","chart-ruler-in-natal-chart","\u0645\u0639\u0646\u06cc \u062d\u0627\u06a9\u0645 \u0686\u0627\u0631\u062a \u0648 \u0631\u0648\u0634 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0646 \u0622\u0646"],["tehran-birth-chart-difference","why-birth-time-matters","\u0627\u0647\u0645\u06cc\u062a \u0633\u0627\u0639\u062a \u062f\u0642\u06cc\u0642 \u062a\u0648\u0644\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["tehran-birth-chart-difference","why-birth-city-matters","\u0645\u062e\u062a\u0635\u0627\u062a \u062c\u063a\u0631\u0627\u0641\u06cc\u0627\u06cc\u06cc"],["tehran-birth-chart-difference","birth-chart-without-birth-time","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u0628\u062f\u0648\u0646 \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["what-is-astrology","what-is-tropical-astrology","\u062a\u0641\u0627\u0648\u062a \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644 \u0648 \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-astrology","what-is-sidereal-astrology","\u0645\u0628\u0646\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-astrology","what-is-vedic-astrology","\u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0648\u062f\u06cc\u06a9"],["what-is-tropical-astrology","what-is-astrology","\u0645\u0628\u0627\u0646\u06cc \u0648 \u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc"],["what-is-tropical-astrology","what-is-sidereal-astrology","\u0645\u0628\u0646\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-tropical-astrology","what-is-vedic-astrology","\u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0648\u062f\u06cc\u06a9 \u0648 \u062a\u0641\u0627\u0648\u062a \u0622\u0646 \u0628\u0627 \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644"],["what-is-sidereal-astrology","what-is-astrology","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc"],["what-is-sidereal-astrology","what-is-tropical-astrology","\u062a\u0641\u0627\u0648\u062a \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644 \u0648 \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-sidereal-astrology","what-is-vedic-astrology","\u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0648\u062f\u06cc\u06a9"],["what-is-vedic-astrology","what-is-astrology","\u0686\u0627\u0631\u0686\u0648\u0628 \u06a9\u0644\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc"],["what-is-vedic-astrology","what-is-tropical-astrology","\u062a\u0641\u0627\u0648\u062a \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u062a\u0631\u0648\u067e\u06cc\u06a9\u0627\u0644 \u0648 \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["what-is-vedic-astrology","what-is-sidereal-astrology","\u0645\u0628\u0646\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0633\u0627\u06cc\u062f\u0631\u06cc\u0627\u0644"],["important-transits-tir-1405","astrology-transits-explained","\u062a\u0631\u0646\u0632\u06cc\u062a \u062f\u0631 \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0686\u06cc\u0633\u062a \u0648 \u0686\u06af\u0648\u0646\u0647 \u062e\u0648\u0627\u0646\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f"],["important-transits-tir-1405","mordad-1405-transit-guide","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0631\u062f\u0627\u062f \u06f1\u06f4\u06f0\u06f5"],["important-transits-tir-1405","mercury-retrograde-guide","\u0639\u0637\u0627\u0631\u062f \u0631\u062a\u0631\u0648 \u0686\u06cc\u0633\u062a \u0648 \u0686\u0647 \u0645\u0639\u0646\u0627\u06cc\u06cc \u062f\u0627\u0631\u062f"],["astrology-transits-explained","important-transits-tir-1405","\u062a\u0642\u0648\u06cc\u0645 \u062a\u0631\u0646\u0632\u06cc\u062a \u062a\u06cc\u0631 \u06f1\u06f4\u06f0\u06f5"],["astrology-transits-explained","why-transits-differ-by-person","\u062a\u0631\u0646\u0632\u06cc\u062a \u0639\u0645\u0648\u0645\u06cc"],["astrology-transits-explained","fast-vs-slow-astrology-transits","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0633\u0631\u06cc\u0639 \u0648 \u06a9\u0646\u062f"],["first-house-in-natal-chart","seventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0641\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["first-house-in-natal-chart","tenth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["first-house-in-natal-chart","fourth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0686\u0647\u0627\u0631\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sixth-house-in-natal-chart","tenth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sixth-house-in-natal-chart","twelfth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u062f\u0648\u0627\u0632\u062f\u0647\u0645"],["sixth-house-in-natal-chart","second-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["seventh-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["seventh-house-in-natal-chart","fifth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u067e\u0646\u062c\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["seventh-house-in-natal-chart","chart-ruler-in-natal-chart","\u0645\u0639\u0646\u06cc \u062d\u0627\u06a9\u0645 \u0686\u0627\u0631\u062a \u0648 \u0631\u0648\u0634 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0646 \u0622\u0646"],["eighth-house-in-natal-chart","seventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0641\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eighth-house-in-natal-chart","fourth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0686\u0647\u0627\u0631\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eighth-house-in-natal-chart","twelfth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["ninth-house-in-natal-chart","tenth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["ninth-house-in-natal-chart","eleventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u06cc\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["ninth-house-in-natal-chart","third-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0633\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["tenth-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["tenth-house-in-natal-chart","ninth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0646\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["tenth-house-in-natal-chart","fourth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0686\u0647\u0627\u0631\u0645"],["four-elements-in-natal-chart","zodiac-modalities-in-natal-chart","\u06a9\u06cc\u0641\u06cc\u062a\u200c\u0647\u0627\u06cc \u0633\u0647\u200c\u06af\u0627\u0646\u0647"],["four-elements-in-natal-chart","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["four-elements-in-natal-chart","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["four-elements-in-natal-chart","ordibehesht-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["lunar-nodes-in-natal-chart","planet-sign-house-difference","\u062a\u0641\u0627\u0648\u062a \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646 \u0648 \u062e\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["lunar-nodes-in-natal-chart","north-node-vs-south-node","\u06af\u0631\u0647\u0654 \u0634\u0645\u0627\u0644\u06cc \u0648 \u062c\u0646\u0648\u0628\u06cc"],["lunar-nodes-in-natal-chart","new-moon-vs-full-moon-astrology","\u0645\u0627\u0647 \u0646\u0648 \u06cc\u0627 \u0645\u0627\u0647 \u06a9\u0627\u0645\u0644"],["fourth-house-in-natal-chart","first-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0627\u0648\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fourth-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fourth-house-in-natal-chart","twelfth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eleventh-house-in-natal-chart","empty-houses-in-natal-chart","\u0631\u0648\u0634 \u062a\u0641\u0633\u06cc\u0631 \u062e\u0627\u0646\u0647 \u062e\u0627\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a"],["eleventh-house-in-natal-chart","third-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0633\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["eleventh-house-in-natal-chart","fifth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u067e\u0646\u062c\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["twelfth-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["twelfth-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["twelfth-house-in-natal-chart","fourth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0686\u0647\u0627\u0631\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["empty-houses-in-natal-chart","astrology-houses","\u0645\u0639\u0646\u06cc \u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["empty-houses-in-natal-chart","what-is-rising-sign","\u0645\u0639\u0646\u06cc \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0631\u0648\u0634 \u0645\u062d\u0627\u0633\u0628\u0647 \u0622\u0646"],["empty-houses-in-natal-chart","chart-ruler-in-natal-chart","\u0645\u0639\u0646\u06cc \u062d\u0627\u06a9\u0645 \u0686\u0627\u0631\u062a \u0648 \u0631\u0648\u0634 \u067e\u06cc\u062f\u0627 \u06a9\u0631\u062f\u0646 \u0622\u0646"],["zodiac-modalities-in-natal-chart","planet-sign-house-difference","\u062a\u0641\u0627\u0648\u062a \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646 \u0648 \u062e\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["zodiac-modalities-in-natal-chart","four-elements-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["zodiac-modalities-in-natal-chart","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["degrees-in-natal-chart","north-node-vs-south-node","\u06af\u0631\u0647\u0654 \u0634\u0645\u0627\u0644\u06cc \u0648 \u062c\u0646\u0648\u0628\u06cc"],["degrees-in-natal-chart","retrograde-planets-explained","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0647 \u0631\u062a\u0631\u0648\u06af\u0631\u0627\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["degrees-in-natal-chart","natal-chart-uses-and-limits","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["north-node-vs-south-node","lunar-nodes-in-natal-chart","\u0645\u0639\u0646\u06cc \u06af\u0631\u0647\u200c\u0647\u0627\u06cc \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["north-node-vs-south-node","retrograde-planets-explained","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0647 \u0631\u062a\u0631\u0648\u06af\u0631\u0627\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["north-node-vs-south-node","natal-chart-uses-and-limits","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mordad-1405-transit-guide","important-transits-tir-1405","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u062a\u06cc\u0631 \u06f1\u06f4\u06f0\u06f5"],["mordad-1405-transit-guide","new-moon-vs-full-moon-astrology","\u062a\u0641\u0627\u0648\u062a \u0645\u0627\u0647 \u0646\u0648 \u0648 \u0645\u0627\u0647 \u06a9\u0627\u0645\u0644"],["mordad-1405-transit-guide","natal-chart-vs-transit-chart","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0648 \u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["transits-to-ascendant-and-midheaven","why-birth-time-matters","\u0627\u0647\u0645\u06cc\u062a \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["transits-to-ascendant-and-midheaven","what-is-rising-sign","\u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u06cc\u0627 \u0637\u0627\u0644\u0639"],["transits-to-ascendant-and-midheaven","transits-to-natal-sun-and-moon","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f\u06cc"],["jupiter-in-natal-chart","sun-moon-rising","\u062a\u0641\u0627\u0648\u062a \u062e\u0648\u0631\u0634\u06cc\u062f\u060c \u0645\u0627\u0647 \u0648 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af"],["jupiter-in-natal-chart","ninth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0646\u0647\u0645"],["jupiter-in-natal-chart","saturn-in-natal-chart","\u0645\u0639\u0646\u06cc \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["retrograde-planets-explained","degrees-in-natal-chart","\u0645\u0639\u0646\u06cc \u062f\u0631\u062c\u0647\u200c\u0647\u0627\u06cc \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["retrograde-planets-explained","north-node-vs-south-node","\u062a\u0641\u0627\u0648\u062a \u0646\u0648\u062f \u0634\u0645\u0627\u0644\u06cc \u0648 \u062c\u0646\u0648\u0628\u06cc"],["retrograde-planets-explained","natal-chart-uses-and-limits","\u06a9\u0627\u0631\u0628\u0631\u062f\u0647\u0627 \u0648 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["stellium-in-natal-chart","retrograde-planets-explained","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0647 \u0631\u062a\u0631\u0648\u06af\u0631\u0627\u062f \u062f\u0631 \u0686\u0627\u0631\u062a"],["stellium-in-natal-chart","combine-planet-sign-house-and-aspect","\u062a\u0631\u06a9\u06cc\u0628 \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646\u060c \u062e\u0627\u0646\u0647 \u0648 \u062c\u0646\u0628\u0647"],["stellium-in-natal-chart","overall-chart-signature","\u0631\u0648\u0634 \u062a\u0634\u062e\u06cc\u0635 \u0627\u0645\u0636\u0627\u06cc \u06a9\u0644\u06cc \u0686\u0627\u0631\u062a"],["new-moon-vs-full-moon-astrology","mordad-1405-transit-guide","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u0645\u0631\u062f\u0627\u062f \u06f1\u06f4\u06f0\u06f5"],["new-moon-vs-full-moon-astrology","saturn-return-explained","\u0645\u0639\u0646\u06cc \u0628\u0627\u0632\u06af\u0634\u062a \u0632\u062d\u0644 \u0648 \u0633\u0646 \u0648\u0642\u0648\u0639 \u0622\u0646"],["new-moon-vs-full-moon-astrology","mercury-retrograde-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u0639\u0637\u0627\u0631\u062f \u0631\u062a\u0631\u0648 \u0648 \u0627\u0634\u062a\u0628\u0627\u0647\u200c\u0647\u0627\u06cc \u0631\u0627\u06cc\u062c"],["saturn-return-explained","important-transits-tir-1405","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u062a\u06cc\u0631 \u06f1\u06f4\u06f0\u06f5"],["saturn-return-explained","mercury-retrograde-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u0639\u0637\u0627\u0631\u062f \u0631\u062a\u0631\u0648 \u0648 \u0627\u0634\u062a\u0628\u0627\u0647\u200c\u0647\u0627\u06cc \u0631\u0627\u06cc\u062c"],["saturn-return-explained","why-transits-differ-by-person","\u0639\u0644\u062a \u062a\u0641\u0627\u0648\u062a \u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0631\u0627\u06cc \u0647\u0631 \u0641\u0631\u062f"],["mercury-retrograde-guide","mordad-1405-transit-guide","\u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u0645\u0631\u062f\u0627\u062f \u06f1\u06f4\u06f0\u06f5"],["mercury-retrograde-guide","saturn-return-explained","\u0645\u0639\u0646\u06cc \u0628\u0627\u0632\u06af\u0634\u062a \u0632\u062d\u0644 \u0648 \u0633\u0646 \u0648\u0642\u0648\u0639 \u0622\u0646"],["mercury-retrograde-guide","natal-chart-vs-transit-chart","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0648 \u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["natal-chart-vs-transit-chart","astrology-transits-explained","\u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["natal-chart-vs-transit-chart","why-transits-differ-by-person","\u062a\u0631\u0646\u0632\u06cc\u062a \u0639\u0645\u0648\u0645\u06cc"],["natal-chart-vs-transit-chart","transits-to-natal-sun-and-moon","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f\u06cc"],["astrology-aspect-orbs-explained","sextile-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0633\u06a9\u0633\u062a\u0627\u06cc\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["astrology-aspect-orbs-explained","venus-mars-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0648\u0646\u0648\u0633 \u0648 \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a"],["astrology-aspect-orbs-explained","jupiter-saturn-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0645\u0634\u062a\u0631\u06cc \u0648 \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a"],["conjunction-aspect-explained","astrology-aspect-orbs-explained","\u0645\u062d\u0627\u0633\u0628\u0647 \u0627\u0648\u0631\u0628 \u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["conjunction-aspect-explained","trine-aspect-explained","\u062c\u0646\u0628\u0647 \u062a\u062b\u0644\u06cc\u062b \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["conjunction-aspect-explained","sextile-aspect-explained","\u062c\u0646\u0628\u0647 \u062a\u0633\u062f\u06cc\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["opposition-aspect-explained","astrology-aspect-orbs-explained","\u0645\u062d\u0627\u0633\u0628\u0647 \u0627\u0648\u0631\u0628 \u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u062f\u0631 \u0686\u0627\u0631\u062a"],["opposition-aspect-explained","square-aspect-explained","\u062c\u0646\u0628\u0647 \u0645\u0631\u0628\u0639 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["opposition-aspect-explained","trine-aspect-explained","\u062c\u0646\u0628\u0647 \u062a\u062b\u0644\u06cc\u062b \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["square-aspect-explained","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["square-aspect-explained","opposition-aspect-explained","\u062c\u0646\u0628\u0647 \u0645\u0642\u0627\u0628\u0644\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["square-aspect-explained","hard-aspects-explained","\u0641\u0634\u0627\u0631 \u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0633\u062e\u062a"],["trine-aspect-explained","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["trine-aspect-explained","sun-moon-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["trine-aspect-explained","venus-mars-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0648\u0646\u0648\u0633 \u0648 \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a"],["sextile-aspect-explained","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sextile-aspect-explained","hard-aspects-explained","\u0631\u0648\u0634 \u062e\u0648\u0627\u0646\u062f\u0646 \u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0633\u062e\u062a \u062f\u0631 \u0686\u0627\u0631\u062a"],["sextile-aspect-explained","jupiter-saturn-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0645\u0634\u062a\u0631\u06cc \u0648 \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a"],["mercury-in-natal-chart","what-is-moon-sign","\u0645\u0639\u0646\u06cc \u0646\u0634\u0627\u0646 \u0645\u0627\u0647 \u0648 \u0631\u0648\u0634 \u0645\u062d\u0627\u0633\u0628\u0647 \u0622\u0646"],["mercury-in-natal-chart","venus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0648\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mercury-in-natal-chart","mars-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["venus-in-natal-chart","mercury-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0637\u0627\u0631\u062f \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["venus-in-natal-chart","mars-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["venus-in-natal-chart","fifth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u067e\u0646\u062c\u0645"],["saturn-in-natal-chart","sun-moon-rising","\u062a\u0641\u0627\u0648\u062a \u062e\u0648\u0631\u0634\u06cc\u062f\u060c \u0645\u0627\u0647 \u0648 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af"],["saturn-in-natal-chart","jupiter-in-natal-chart","\u0645\u0639\u0646\u06cc \u0645\u0634\u062a\u0631\u06cc \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["saturn-in-natal-chart","saturn-return-explained","\u0628\u0627\u0632\u06af\u0634\u062a \u0632\u062d\u0644"],["why-transits-differ-by-person","astrology-transits-explained","\u062a\u0631\u0646\u0632\u06cc\u062a \u062f\u0631 \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0686\u06cc\u0633\u062a \u0648 \u0686\u06af\u0648\u0646\u0647 \u062e\u0648\u0627\u0646\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u062f"],["why-transits-differ-by-person","transits-to-ascendant-and-midheaven","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0645\u06cc\u0627\u0646\u0647 \u0622\u0633\u0645\u0627\u0646"],["why-transits-differ-by-person","fast-vs-slow-astrology-transits","\u0633\u0631\u0639\u062a \u062a\u0631\u0646\u0632\u06cc\u062a\u200c\u0647\u0627"],["fast-vs-slow-astrology-transits","transits-to-ascendant-and-midheaven","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0645\u06cc\u0627\u0646\u0647 \u0622\u0633\u0645\u0627\u0646"],["fast-vs-slow-astrology-transits","natal-chart-vs-transit-chart","\u062a\u0641\u0627\u0648\u062a \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0648 \u0686\u0627\u0631\u062a \u062a\u0631\u0646\u0632\u06cc\u062a"],["fast-vs-slow-astrology-transits","transits-to-natal-sun-and-moon","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f\u06cc"],["second-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["second-house-in-natal-chart","eighth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0634\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["second-house-in-natal-chart","fifth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u067e\u0646\u062c\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["hard-aspects-explained","sun-moon-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["hard-aspects-explained","venus-mars-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0648\u0646\u0648\u0633 \u0648 \u0645\u0631\u06cc\u062e \u062f\u0631 \u0686\u0627\u0631\u062a"],["hard-aspects-explained","jupiter-saturn-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0645\u0634\u062a\u0631\u06cc \u0648 \u0632\u062d\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a"],["mars-in-natal-chart","planets-in-birth-chart","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0627\u062a \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mars-in-natal-chart","mercury-in-natal-chart","\u0645\u0639\u0646\u06cc \u0639\u0637\u0627\u0631\u062f \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["mars-in-natal-chart","venus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0648\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["uranus-in-natal-chart","planets-in-birth-chart","\u0645\u0639\u0646\u06cc \u0633\u06cc\u0627\u0631\u0627\u062a \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["uranus-in-natal-chart","neptune-in-natal-chart","\u0645\u0639\u0646\u06cc \u0646\u067e\u062a\u0648\u0646 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["uranus-in-natal-chart","pluto-in-natal-chart","\u0645\u0639\u0646\u06cc \u067e\u0644\u0648\u062a\u0648 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["third-house-in-natal-chart","sixth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0634\u0634\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["third-house-in-natal-chart","ninth-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0646\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["third-house-in-natal-chart","eleventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u06cc\u0627\u0632\u062f\u0647\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fifth-house-in-natal-chart","seventh-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u0647\u0641\u062a\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["fifth-house-in-natal-chart","eleventh-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u06cc\u0627\u0632\u062f\u0647\u0645"],["fifth-house-in-natal-chart","second-house-in-natal-chart","\u0645\u0639\u0646\u0627\u06cc \u062e\u0627\u0646\u0647 \u062f\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["reading-multiple-aspects-together","stellium-in-natal-chart","\u0627\u0633\u062a\u0644\u06cc\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["reading-multiple-aspects-together","astrology-aspect-orbs-explained","\u0627\u0648\u0631\u0628 \u062f\u0631 \u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u0686\u06cc\u0633\u062a\u061f"],["reading-multiple-aspects-together","hard-aspects-explained","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0633\u062e\u062a \u0686\u0647 \u0645\u0639\u0646\u0627\u06cc\u06cc \u062f\u0627\u0631\u0646\u062f\u061f"],["neptune-in-natal-chart","sun-moon-rising","\u062a\u0641\u0627\u0648\u062a \u062e\u0648\u0631\u0634\u06cc\u062f\u060c \u0645\u0627\u0647 \u0648 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af"],["neptune-in-natal-chart","uranus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0627\u0648\u0631\u0627\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["neptune-in-natal-chart","pluto-in-natal-chart","\u0645\u0639\u0646\u06cc \u067e\u0644\u0648\u062a\u0648 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["combine-planet-sign-house-and-aspect","astrology-houses","\u062e\u0627\u0646\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["combine-planet-sign-house-and-aspect","planets-in-birth-chart","\u0633\u06cc\u0627\u0631\u0627\u062a \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["combine-planet-sign-house-and-aspect","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["pluto-in-natal-chart","eighth-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0647\u0634\u062a\u0645"],["pluto-in-natal-chart","uranus-in-natal-chart","\u0645\u0639\u0646\u06cc \u0627\u0648\u0631\u0627\u0646\u0648\u0633 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["pluto-in-natal-chart","neptune-in-natal-chart","\u0645\u0639\u0646\u06cc \u0646\u067e\u062a\u0648\u0646 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["sun-moon-aspects-in-natal-chart","major-aspects","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u0627\u0635\u0644\u06cc \u0686\u0627\u0631\u062a"],["sun-moon-aspects-in-natal-chart","new-moon-vs-full-moon-astrology","\u062a\u0641\u0627\u0648\u062a \u0645\u0627\u0647 \u0646\u0648 \u0648 \u0645\u0627\u0647 \u06a9\u0627\u0645\u0644"],["sun-moon-aspects-in-natal-chart","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["venus-mars-aspects-in-natal-chart","conjunction-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0627\u062a\u0635\u0627\u0644 \u0686\u06cc\u0633\u062a\u061f"],["venus-mars-aspects-in-natal-chart","opposition-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0642\u0627\u0628\u0644\u0647 \u0686\u06cc\u0633\u062a\u061f"],["venus-mars-aspects-in-natal-chart","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["jupiter-saturn-aspects-in-natal-chart","conjunction-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0627\u062a\u0635\u0627\u0644 \u0686\u06cc\u0633\u062a\u061f"],["jupiter-saturn-aspects-in-natal-chart","square-aspect-explained","\u062c\u0646\u0628\u0647\u0654 \u0645\u0631\u0628\u0639 \u0686\u06cc\u0633\u062a\u061f"],["jupiter-saturn-aspects-in-natal-chart","reading-multiple-aspects-together","\u062e\u0648\u0627\u0646\u062f\u0646 \u0647\u0645\u200c\u0632\u0645\u0627\u0646 \u0686\u0646\u062f \u062c\u0646\u0628\u0647"],["transits-to-natal-sun-and-moon","transits-to-ascendant-and-midheaven","\u062a\u0631\u0646\u0632\u06cc\u062a \u0628\u0647 \u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u0648 \u0645\u06cc\u0627\u0646\u0647 \u0622\u0633\u0645\u0627\u0646"],["transits-to-natal-sun-and-moon","fast-vs-slow-astrology-transits","\u062a\u0631\u0646\u0632\u06cc\u062a \u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627\u06cc \u0633\u0631\u06cc\u0639 \u0648 \u06a9\u0646\u062f"],["transits-to-natal-sun-and-moon","sun-moon-aspects-in-natal-chart","\u062c\u0646\u0628\u0647\u200c\u0647\u0627\u06cc \u062e\u0648\u0631\u0634\u06cc\u062f \u0648 \u0645\u0627\u0647"],["natal-chart-uses-and-limits","birth-chart-basics","\u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0686\u06cc\u0633\u062a\u061f"],["natal-chart-uses-and-limits","why-birth-time-matters","\u0627\u0647\u0645\u06cc\u062a \u0633\u0627\u0639\u062a \u062a\u0648\u0644\u062f"],["natal-chart-uses-and-limits","how-to-read-birth-chart","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u062e\u0648\u0627\u0646\u062f\u0646 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["natal-chart-uses-and-limits","what-is-birth-chart-interpretation","\u062a\u0641\u0633\u06cc\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["overall-chart-signature","birth-chart-basics","\u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f \u0686\u06cc\u0633\u062a\u061f"],["overall-chart-signature","four-elements-in-natal-chart","\u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["overall-chart-signature","zodiac-modalities-in-natal-chart","\u06a9\u06cc\u0641\u06cc\u062a\u200c\u0647\u0627\u06cc \u0633\u0647\u200c\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a"],["overall-chart-signature","stellium-in-natal-chart","\u0627\u0633\u062a\u0644\u06cc\u0648\u0645 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["chart-ruler-in-natal-chart","planet-sign-house-difference","\u062a\u0641\u0627\u0648\u062a \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646 \u0648 \u062e\u0627\u0646\u0647"],["chart-ruler-in-natal-chart","what-is-rising-sign","\u0631\u0627\u06cc\u0632\u06cc\u0646\u06af \u06cc\u0627 \u0637\u0627\u0644\u0639"],["chart-ruler-in-natal-chart","first-house-in-natal-chart","\u062e\u0627\u0646\u0647\u0654 \u0627\u0648\u0644 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["chart-ruler-in-natal-chart","combine-planet-sign-house-and-aspect","\u062a\u0631\u06a9\u06cc\u0628 \u0633\u06cc\u0627\u0631\u0647\u060c \u0646\u0634\u0627\u0646\u060c \u062e\u0627\u0646\u0647 \u0648 \u062c\u0646\u0628\u0647"],["persian-birth-months-astrology-guide","shahrivar-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0634\u0647\u0631\u06cc\u0648\u0631"],["persian-birth-months-astrology-guide","aban-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0622\u0628\u0627\u0646"],["persian-birth-months-astrology-guide","khordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062e\u0631\u062f\u0627\u062f"],["persian-birth-months-astrology-guide","esfand-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0633\u0641\u0646\u062f"],["persian-birth-months-astrology-guide","farvardin-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0641\u0631\u0648\u0631\u062f\u06cc\u0646"],["shahrivar-birth-month-compatibility","shahrivar-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0634\u0647\u0631\u06cc\u0648\u0631 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["shahrivar-birth-month-compatibility","khordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062e\u0631\u062f\u0627\u062f"],["shahrivar-birth-month-compatibility","esfand-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0633\u0641\u0646\u062f"],["shahrivar-birth-month-compatibility","farvardin-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0641\u0631\u0648\u0631\u062f\u06cc\u0646 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["shahrivar-birth-month-compatibility","dey-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062f\u06cc \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["mehr-born-traits","mehr-woman-traits","\u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-born-traits","mehr-man-traits","\u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-born-traits","mehr-birth-month-compatibility","\u0631\u0627\u0628\u0637\u0647 \u0628\u0627 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mordad-woman-traits","mordad-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-woman-traits","mordad-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["mordad-woman-traits","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f"],["mordad-man-traits","mordad-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-man-traits","mordad-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-man-traits","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f"],["mordad-birth-month-compatibility","mordad-woman-traits","\u0632\u0646 \u0645\u0631\u062f\u0627\u062f\u06cc"],["mordad-birth-month-compatibility","mordad-man-traits","\u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-birth-month-compatibility","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["ordibehesht-born-traits","zodiac-modalities-in-natal-chart","\u0645\u062f\u0627\u0644\u06cc\u062a\u0647\u200c\u0647\u0627\u06cc \u06a9\u0627\u0631\u062f\u06cc\u0646\u0627\u0644\u060c \u062b\u0627\u0628\u062a \u0648 \u0645\u062a\u063a\u06cc\u0631"],["ordibehesht-born-traits","ordibehesht-woman-traits","\u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-born-traits","ordibehesht-man-traits","\u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["shahrivar-born-traits","shahrivar-birth-month-compatibility","\u0631\u0627\u0628\u0637\u0647 \u0628\u0627 \u0645\u062a\u0648\u0644\u062f \u0634\u0647\u0631\u06cc\u0648\u0631"],["shahrivar-born-traits","dey-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062f\u06cc"],["shahrivar-born-traits","ordibehesht-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["aban-born-traits","why-sun-sign-is-not-enough","\u0686\u0631\u0627 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f \u0628\u0631\u0627\u06cc \u0634\u0646\u0627\u062e\u062a \u0634\u062e\u0635\u06cc\u062a \u06a9\u0627\u0641\u06cc \u0646\u06cc\u0633\u062a"],["aban-born-traits","persian-birth-months-astrology-guide","\u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["aban-born-traits","esfand-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0633\u0641\u0646\u062f"],["khordad-born-traits","four-elements-in-natal-chart","\u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["khordad-born-traits","persian-birth-months-astrology-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u06a9\u0627\u0645\u0644 \u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u06f1\u06f2 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["mehr-woman-traits","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["mehr-woman-traits","mehr-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-woman-traits","mehr-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["mehr-man-traits","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["mehr-man-traits","mehr-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-man-traits","mehr-birth-month-compatibility","\u0631\u0627\u0628\u0637\u0647 \u0628\u0627 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-birth-month-compatibility","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["mehr-birth-month-compatibility","mehr-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["mehr-birth-month-compatibility","mehr-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0647\u0631"],["esfand-born-traits","why-sun-sign-is-not-enough","\u0686\u0631\u0627 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f \u0628\u0631\u0627\u06cc \u0634\u0646\u0627\u062e\u062a \u0634\u062e\u0635\u06cc\u062a \u06a9\u0627\u0641\u06cc \u0646\u06cc\u0633\u062a"],["esfand-born-traits","aban-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0622\u0628\u0627\u0646"],["farvardin-born-traits","why-sun-sign-is-not-enough","\u0686\u0631\u0627 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f \u0628\u0631\u0627\u06cc \u0634\u0646\u0627\u062e\u062a \u0634\u062e\u0635\u06cc\u062a \u06a9\u0627\u0641\u06cc \u0646\u06cc\u0633\u062a"],["farvardin-born-traits","persian-birth-months-astrology-guide","\u0631\u0627\u0647\u0646\u0645\u0627\u06cc \u06a9\u0627\u0645\u0644 \u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u06f1\u06f2 \u0645\u0627\u0647 \u062a\u0648\u0644\u062f"],["mordad-born-traits","mordad-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-born-traits","mordad-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f"],["mordad-born-traits","mordad-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0645\u0631\u062f\u0627\u062f \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["dey-born-traits","shahrivar-birth-month-compatibility","\u0633\u0627\u0632\u06af\u0627\u0631\u06cc \u0645\u062a\u0648\u0644\u062f \u0634\u0647\u0631\u06cc\u0648\u0631 \u062f\u0631 \u0631\u0627\u0628\u0637\u0647"],["dey-born-traits","shahrivar-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0634\u0647\u0631\u06cc\u0648\u0631"],["dey-born-traits","ordibehesht-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-woman-traits","ordibehesht-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-woman-traits","dey-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062f\u06cc"],["ordibehesht-woman-traits","ordibehesht-man-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u0631\u062f \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-man-traits","ordibehesht-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["ordibehesht-man-traits","shahrivar-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0634\u0647\u0631\u06cc\u0648\u0631"],["ordibehesht-man-traits","ordibehesht-woman-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0632\u0646 \u0645\u062a\u0648\u0644\u062f \u0627\u0631\u062f\u06cc\u0628\u0647\u0634\u062a"],["khordad-born-traits","mehr-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0647\u0631"],["esfand-born-traits","four-elements-in-natal-chart","\u0639\u0646\u0627\u0635\u0631 \u0686\u0647\u0627\u0631\u06af\u0627\u0646\u0647 \u062f\u0631 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f"],["farvardin-born-traits","mordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0645\u0631\u062f\u0627\u062f"],["mordad-born-traits","farvardin-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0641\u0631\u0648\u0631\u062f\u06cc\u0646"],["mehr-born-traits","khordad-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u062e\u0631\u062f\u0627\u062f"],["four-elements-in-natal-chart","aban-born-traits","\u062e\u0635\u0648\u0635\u06cc\u0627\u062a \u0645\u062a\u0648\u0644\u062f\u06cc\u0646 \u0622\u0628\u0627\u0646"]];
const migrationAuthorityPayload = migration.match(
  /\$halleus_authority_edges\$([\s\S]*?)\$halleus_authority_edges\$/,
);
if (!migrationAuthorityPayload) {
  failures.push("0019 exact authority JSON payload is missing");
} else {
  try {
    const migrationAuthorityEdges = JSON.parse(migrationAuthorityPayload[1]);
    if (JSON.stringify(migrationAuthorityEdges) !== JSON.stringify(authorityEdges)) {
      failures.push("0019 authority payload differs from the exact 292 Batch 2 authority edges");
    }
  } catch (error) {
    failures.push(`0019 authority payload JSON is invalid: ${error?.message ?? error}`);
  }
}
if (authoritySlugs.length !== 92 || new Set(authoritySlugs).size !== 92) {
  failures.push("authority slug fixture must contain 92 unique articles");
}
if (authorityEdges.length !== 292) {
  failures.push("authority graph fixture must contain exactly 292 edges");
}
for (const slug of authoritySlugs) {
  if (!migration.includes(`('${slug}')`)) {
    failures.push(`migration baseline is missing authority stable ID: ${slug}`);
  }
}

const outgoing = new Map();
const incoming = new Map();
for (const [source, target] of authorityEdges) {
  outgoing.set(source, (outgoing.get(source) ?? 0) + 1);
  incoming.set(target, (incoming.get(target) ?? 0) + 1);
}
const distribution = (map) => {
  const result = new Map();
  for (const slug of authoritySlugs) {
    const count = map.get(slug) ?? 0;
    result.set(count, (result.get(count) ?? 0) + 1);
  }
  return [...result.entries()].sort((a, b) => a[0] - b[0])
    .map(([count, articles]) => `${count}:${articles}`).join(",");
};
if (distribution(outgoing) !== "3:81,4:6,5:5") {
  failures.push(`authority outgoing distribution mismatch: ${distribution(outgoing)}`);
}
if (distribution(incoming) !== "3:81,4:8,5:1,6:2") {
  failures.push(`authority incoming distribution mismatch: ${distribution(incoming)}`);
}

const edgesBySource = new Map();
for (const edge of authorityEdges) {
  const list = edgesBySource.get(edge[0]) ?? [];
  list.push(edge);
  edgesBySource.set(edge[0], list);
}
const authorityArticles = authoritySlugs.map((slug) => {
  const linkLines = (edgesBySource.get(slug) ?? []).map(
    ([, target, anchor]) => `Context ${anchor}: [[article:${target}|${anchor}]].`,
  );
  return {
    id: `id-${slug}`,
    stableId: slug,
    slug,
    title: slug.replaceAll("-", " "),
    shortTitle: slug.replaceAll("-", " "),
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 1,
    bodyMarkdown: [
      "Baseline paragraph.",
      "## Links",
      ...linkLines,
      `Core route: [[page:/wiki|Halleus core path]].`,
    ].join("\n\n"),
    relatedArticleIds: [],
    contextLinks: [],
    callToAction: null,
  };
});
const baselineRules = {
  ...engine.DEFAULT_WIKI_LINK_SCAN_RULES,
  excludedStableIds: [],
};
const baselineScan = engine.scanWikiInternalLinks(authorityArticles, baselineRules);
if (baselineScan.contextualArticleEdges.length !== 292) {
  failures.push(`engine baseline edge count mismatch: ${baselineScan.contextualArticleEdges.length}`);
}
if (baselineScan.findings.length !== 0) {
  failures.push(`verified authority graph produced ${baselineScan.findings.length} unexpected findings`);
}
if (baselineScan.articles.length !== 92 || baselineScan.kpis.fullyCompliant !== 92) {
  failures.push("verified authority graph did not produce 92 compliant article summaries");
}

// R20B13 multi-core default fixture
const r20b13MultiCoreRules = {
  ...engine.DEFAULT_WIKI_LINK_SCAN_RULES,
  outgoingMin: 0,
  outgoingMax: 0,
  incomingMin: 0,
  incomingTarget: 0,
  incomingMax: 0,
  coreMax: 0,
};
const r20b13MultiCoreArticle = {
  id: "r20b13-multi-core",
  stableId: "r20b13-multi-core",
  slug: "r20b13-multi-core",
  title: "Multi Core",
  shortTitle: "Multi Core",
  categoryId: "foundations",
  status: "published",
  indexable: true,
  publishedAt: "2026-08-15T00:00:00.000Z",
  deletedAt: null,
  contentVersion: 1,
  bodyMarkdown: [
    "[[page:/chart|Birth Chart Guide]]",
    "[[page:/compare|Relationship Comparison]]",
  ].join("\n\n"),
  relatedArticleIds: [],
  contextLinks: [],
  callToAction: null,
};
const r20b13MultiCoreScan = engine.scanWikiInternalLinks(
  [r20b13MultiCoreArticle],
  r20b13MultiCoreRules,
);
const r20b13MultiCoreCodes = new Set(
  r20b13MultiCoreScan.findings.map((item) => item.code),
);
if (
  r20b13MultiCoreCodes.has("MULTIPLE_CORE_LINKS") ||
  r20b13MultiCoreCodes.has("MISSING_CORE_LINK")
) {
  failures.push("R20B13 multi-core default fixture rejected valid contextual core multiplicity");
}
const r20b13MultiCoreSummary = r20b13MultiCoreScan.articles[0];
if (!r20b13MultiCoreSummary || r20b13MultiCoreSummary.coreDestination !== "/chart") {
  failures.push("R20B13 multi-core representative coreDestination is not deterministic");
}
const r20b13ExplicitCoreLimitScan = engine.scanWikiInternalLinks(
  [r20b13MultiCoreArticle],
  { ...r20b13MultiCoreRules, coreMax: 1 },
);
if (
  !r20b13ExplicitCoreLimitScan.findings.some(
    (item) => item.code === "MULTIPLE_CORE_LINKS",
  )
) {
  failures.push("R20B13 explicit positive coreMax fixture did not enforce the configured maximum");
}
const r20b13MissingCoreScan = engine.scanWikiInternalLinks(
  [{ ...r20b13MultiCoreArticle, bodyMarkdown: "No core marker." }],
  r20b13MultiCoreRules,
);
if (
  !r20b13MissingCoreScan.findings.some(
    (item) => item.code === "MISSING_CORE_LINK",
  )
) {
  failures.push("R20B13 missing-core minimum fixture did not remain enforced");
}

function independentArticleEdges(articles) {
  const result = [];
  for (const article of articles) {
    const chunks = article.bodyMarkdown.split("[[article:");
    for (let index = 1; index < chunks.length; index += 1) {
      const token = chunks[index].split("]]", 1)[0];
      if (!token) continue;
      const separator = token.indexOf("|");
      const target = (separator >= 0 ? token.slice(0, separator) : token).trim();
      if (target) result.push(`${article.stableId}->${target}`);
    }
  }
  return result.sort();
}
const enginePairs = baselineScan.contextualArticleEdges
  .map((edge) => `${edge.sourceStableId}->${edge.targetStableId}`)
  .sort();
const independentPairs = independentArticleEdges(authorityArticles);
if (JSON.stringify(enginePairs) !== JSON.stringify(independentPairs)) {
  failures.push("engine graph differs from independent body crawler");
}

const contextualQuotaArticles = [
  {
    id: "cq-a",
    stableId: "quota-source",
    slug: "quota-source",
    title: "Quota Source",
    shortTitle: "Quota Source",
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 1,
    bodyMarkdown: [
      "[[article:quota-beta|Beta Target]]",
      "[[article:quota-gamma|Gamma Target]]",
      "[[article:quota-beta|Beta Target Duplicate]]",
      "[[article:quota-future|Future Target]]",
      "[[article:quota-ghost|Ghost Target]]",
      "[[page:/wiki|Valid Core Anchor]]",
    ].join("\n\n"),
    relatedArticleIds: ["quota-related"],
    contextLinks: [],
    callToAction: null,
  },
  ...["quota-beta", "quota-gamma", "quota-related"].map((stableId) => ({
    id: `cq-${stableId}`,
    stableId,
    slug: stableId,
    title: `${stableId} target`,
    shortTitle: `${stableId} target`,
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 1,
    bodyMarkdown: "[[page:/wiki|Valid Core Anchor]]",
    relatedArticleIds: [],
    contextLinks: [],
    callToAction: null,
  })),
  {
    id: "cq-future",
    stableId: "quota-future",
    slug: "quota-future",
    title: "Future Target",
    shortTitle: "Future Target",
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2099-01-01T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 1,
    bodyMarkdown: "[[page:/wiki|Valid Core Anchor]]",
    relatedArticleIds: [],
    contextLinks: [],
    callToAction: null,
  },
];
const contextualQuotaRules = {
  ...engine.DEFAULT_WIKI_LINK_SCAN_RULES,
  outgoingMin: 3,
  incomingMin: 0,
  incomingTarget: 0,
  incomingMax: 20,
  outgoingMax: 20,
};
const contextualQuotaScan = engine.scanWikiInternalLinks(
  contextualQuotaArticles,
  contextualQuotaRules,
);
const quotaSourceEdges = contextualQuotaScan.contextualArticleEdges.filter(
  (edge) => edge.sourceStableId === "quota-source",
);
const quotaTargets = new Set(quotaSourceEdges.map((edge) => edge.targetStableId));
if (
  quotaSourceEdges.length !== 5 ||
  quotaTargets.size !== 4 ||
  !quotaTargets.has("quota-future") ||
  !quotaTargets.has("quota-ghost")
) {
  failures.push("full body article markers were not classified as contextual edges");
}
const quotaSourceCodes = new Set(
  contextualQuotaScan.findings
    .filter((item) => item.sourceStableId === "quota-source")
    .map((item) => item.code),
);
if (!quotaSourceCodes.has("OUTGOING_UNDER_MIN")) {
  failures.push("invalid/future/duplicate targets incorrectly satisfied the three-outgoing minimum");
}
if (!quotaSourceCodes.has("DUPLICATE_EDGE")) {
  failures.push("duplicate target fixture did not surface DUPLICATE_EDGE");
}
if (!quotaSourceCodes.has("MISSING_TARGET")) {
  failures.push("missing contextual target fixture did not surface MISSING_TARGET");
}
if (!quotaSourceCodes.has("UNPUBLISHED_TARGET")) {
  failures.push("future published_at target did not surface UNPUBLISHED_TARGET");
}
const quotaSummary = contextualQuotaScan.articles.find(
  (article) => article.stableId === "quota-source",
);
if (!quotaSummary || quotaSummary.outgoing !== 2) {
  failures.push(`valid distinct outgoing summary mismatch: ${quotaSummary?.outgoing ?? "missing"}`);
}

const violationRules = {
  ...engine.DEFAULT_WIKI_LINK_SCAN_RULES,
  outgoingMin: 0,
  outgoingMax: 20,
  incomingMin: 0,
  incomingTarget: 0,
  incomingMax: 20,
  excludedStableIds: [],
};
const violationArticles = [
  {
    id: "a",
    stableId: "alpha",
    slug: "alpha",
    title: "Alpha Source",
    shortTitle: "Alpha Source",
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 1,
    bodyMarkdown: [
      "## Links",
      "[[article:alpha|Self Link]]",
      "[[article:beta|Beta]]",
      "[[article:beta|Beta second]]",
      "[[article:ghost|Missing Target]]",
      "[[article:draft-target|Draft Target]]",
      "[[page:/wiki|Beta]]",
    ].join("\n\n"),
    relatedArticleIds: [],
    contextLinks: [
      { label: "One", href: "/wiki/category/foundations" },
      { label: "Two", href: "/wiki/category/houses" },
    ],
    callToAction: null,
  },
  {
    id: "b",
    stableId: "beta",
    slug: "beta",
    title: "Beta Target",
    shortTitle: "Beta Target",
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 1,
    bodyMarkdown: "## Links\n\n[[page:/wiki|Valid Core Anchor]]",
    relatedArticleIds: [],
    contextLinks: [],
    callToAction: null,
  },
  {
    id: "c",
    stableId: "draft-target",
    slug: "draft-target",
    title: "Draft Target",
    shortTitle: "Draft Target",
    categoryId: "foundations",
    status: "draft",
    indexable: false,
    publishedAt: null,
    deletedAt: null,
    contentVersion: 1,
    bodyMarkdown: "## Draft\n\nDraft body.",
    relatedArticleIds: [],
    contextLinks: [],
    callToAction: null,
  },
];
const violationScan = engine.scanWikiInternalLinks(violationArticles, violationRules);
const violationCodes = new Set(violationScan.findings.map((item) => item.code));
for (const code of [
  "SELF_LINK",
  "DUPLICATE_EDGE",
  "MISSING_TARGET",
  "UNPUBLISHED_TARGET",
  "ONE_WORD_ARTICLE_ANCHOR",
  "ONE_WORD_CORE_ANCHOR",
  "ARTICLE_CORE_ANCHOR_COLLISION",
  "CATEGORY_LINK_OVER_MAX",
]) {
  if (!violationCodes.has(code)) failures.push(`violation fixture missed ${code}`);
}

const suggestionArticles = [
  {
    id: "sa",
    stableId: "source-article",
    slug: "source-article",
    title: "Source Article",
    shortTitle: "Source Article",
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 7,
    bodyMarkdown: "Intro.\n\n## Section\n\nThis real paragraph mentions Beta Target naturally.\n\n[[page:/wiki|Valid Core Anchor]]",
    relatedArticleIds: [],
    contextLinks: [],
    callToAction: null,
  },
  {
    id: "sb",
    stableId: "beta-target",
    slug: "beta-target",
    title: "Beta Target",
    shortTitle: "Beta Target",
    categoryId: "foundations",
    status: "published",
    indexable: true,
    publishedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    contentVersion: 2,
    bodyMarkdown: "Intro.\n\n## Section\n\nNo reciprocal mention.\n\n[[page:/wiki|Valid Core Anchor]]",
    relatedArticleIds: [],
    contextLinks: [],
    callToAction: null,
  },
];
const suggestionRules = {
  ...engine.DEFAULT_WIKI_LINK_SCAN_RULES,
  outgoingMin: 1,
  outgoingMax: 5,
  incomingMin: 0,
  incomingTarget: 1,
  incomingMax: 6,
  excludedStableIds: [],
};
const suggestionScan = engine.scanWikiInternalLinks(suggestionArticles, suggestionRules);
const natural = engine.buildNaturalWikiLinkSuggestions(
  suggestionArticles,
  suggestionScan,
  suggestionRules,
);
const expectedSuggestion = natural.suggestions.find(
  (item) =>
    item.sourceStableId === "source-article" &&
    item.targetStableId === "beta-target",
);
// R20B13 zero-sentinel suggestion fixture
const r20b13UnboundedSuggestionRules = {
  ...suggestionRules,
  outgoingMax: 0,
};
const r20b13UnboundedSuggestionScan = engine.scanWikiInternalLinks(
  suggestionArticles,
  r20b13UnboundedSuggestionRules,
);
const r20b13UnboundedSuggestions = engine.buildNaturalWikiLinkSuggestions(
  suggestionArticles,
  r20b13UnboundedSuggestionScan,
  r20b13UnboundedSuggestionRules,
);
if (
  !r20b13UnboundedSuggestions.suggestions.some(
    (item) =>
      item.sourceStableId === "source-article" &&
      item.targetStableId === "beta-target",
  )
) {
  failures.push("R20B13 zero-sentinel suggestion fixture produced no natural suggestion");
}

if (!expectedSuggestion) {
  failures.push("natural paragraph fixture did not generate a suggestion");
} else {
  if (!expectedSuggestion.currentParagraph.includes("Beta Target")) {
    failures.push("suggestion is not grounded in the real current paragraph");
  }
  if (!expectedSuggestion.proposedParagraph.includes("[[article:beta-target|Beta Target]]")) {
    failures.push("suggestion did not wrap the existing natural anchor");
  }
  const applied = engine.applyWikiLinkParagraphChange(
    suggestionArticles[0].bodyMarkdown,
    expectedSuggestion.currentParagraph,
    expectedSuggestion.proposedParagraph,
  );
  const rolledBack = engine.rollbackWikiLinkParagraphChange(
    applied,
    expectedSuggestion.proposedParagraph,
    expectedSuggestion.currentParagraph,
  );
  if (rolledBack !== suggestionArticles[0].bodyMarkdown) {
    failures.push("apply/rollback helper is not reversible");
  }
  try {
    engine.applyWikiLinkParagraphChange(
      `${expectedSuggestion.currentParagraph}\n\n${expectedSuggestion.currentParagraph}`,
      expectedSuggestion.currentParagraph,
      expectedSuggestion.proposedParagraph,
    );
    failures.push("duplicate paragraph concurrency fixture did not conflict");
  } catch (error) {
    if (!String(error).includes("AMBIGUOUS")) {
      failures.push("duplicate paragraph fixture returned the wrong conflict");
    }
  }
}
const noPlacementArticles = suggestionArticles.map((article) =>
  article.stableId === "source-article"
    ? { ...article, bodyMarkdown: "Intro.\n\n## Section\n\nNo target wording here.\n\n[[page:/wiki|Valid Core Anchor]]" }
    : article,
);
const noPlacementScan = engine.scanWikiInternalLinks(noPlacementArticles, suggestionRules);
const noPlacement = engine.buildNaturalWikiLinkSuggestions(
  noPlacementArticles,
  noPlacementScan,
  suggestionRules,
);
if (!noPlacement.noNaturalPlacementStableIds.includes("source-article")) {
  failures.push("NO_NATURAL_PLACEMENT fixture was not surfaced");
}// HALLEUS_BATCH4_R20B3_PERMANENT_MIN3_GUARD
const r20b3Migration = read("database/migrations/0021_wiki_global_contextual_link_quota_repair.sql");
const r20b3Publisher = read("lib/wiki/wiki-publisher.ts");

for (const marker of [
  "HALLEUS_BATCH4_R20B_PERMANENT_MIN3_GRAPH_REPAIR",
  "repair_count <> 29",
  "source_count <> 21",
  "GLOBAL_PUBLIC_OUTGOING_MIN3",
  "GLOBAL_PUBLIC_INCOMING_MIN3",
  "shahrivar-1405-transit-guide",
  "wiki_internal_links",
  "wiki_article_revisions",
  "corrected_sections",
]) requireText("R20B3 migration", r20b3Migration, marker);

for (const marker of [
  "HALLEUS_BATCH4_R19_PUBLISH_MIN3_GATE",
  "HALLEUS_WIKI_OUTGOING_MIN_RULE_DRIVEN",
  "HALLEUS_WIKI_INCOMING_MIN_RULE_DRIVEN",
  "outgoingMinimum > 0 && validOutgoingIds.size < outgoingMinimum",
  "incomingMinimum > 0",
  "validIncomingSourceIds.size < incomingMinimum",
  "findWikiInternalArticleIds(snapshot.bodyMarkdown)",
  "status = 'published'",
  "is_indexable = true",
  "published_at <= now()",
  "scheduled_for is null",
  "deleted_at is null",
]) requireText("R20B3 publisher rule-driven quota gate", r20b3Publisher, marker);
forbidText("R20B3 publisher hardcoded outgoing min3", r20b3Publisher, "validOutgoingIds.size < 3");
forbidText("R20B3 publisher hardcoded incoming min3", r20b3Publisher, "validIncomingSourceIds.size < 3");

if (
  engine.DEFAULT_WIKI_LINK_SCAN_RULES.outgoingMin !== 0 ||
  engine.DEFAULT_WIKI_LINK_SCAN_RULES.incomingMin !== 0 ||
  engine.DEFAULT_WIKI_LINK_SCAN_RULES.incomingTarget !== 3 ||
  engine.DEFAULT_WIKI_LINK_SCAN_RULES.outgoingMax !== 0 ||
  engine.DEFAULT_WIKI_LINK_SCAN_RULES.incomingMax !== 0 ||
  engine.DEFAULT_WIKI_LINK_SCAN_RULES.coreMax !== 0 ||
  engine.DEFAULT_WIKI_LINK_SCAN_RULES.excludedStableIds.length !== 0
) failures.push("R20B3 default optional publication minima/no-hard-max rule contract mismatch");

// HALLEUS_WIKI_OPTIONAL_INCOMING_FIXTURE
const optionalIncomingFixtureScan = engine.scanWikiInternalLinks([
  {
    id: "optional-incoming", stableId: "optional-incoming", slug: "optional-incoming",
    title: "Optional Incoming", shortTitle: "Optional Incoming", categoryId: "foundations",
    status: "published", indexable: true, publishedAt: "2026-08-16T00:00:00.000Z",
    deletedAt: null, contentVersion: 1,
    bodyMarkdown: "[[page:/wiki|Valid Wiki Guide]]",
    relatedArticleIds: [], contextLinks: [], callToAction: null,
  },
]);
const optionalIncomingFixtureCodes = new Set(
  optionalIncomingFixtureScan.findings.map((item) => item.code),
);
if (optionalIncomingFixtureCodes.has("INCOMING_UNDER_MIN")) {
  failures.push("default incomingMin=0 still emitted INCOMING_UNDER_MIN");
}
if (!optionalIncomingFixtureCodes.has("INCOMING_UNDER_TARGET")) {
  failures.push("incomingTarget=3 advisory warning was not preserved");
}

// HALLEUS_WIKI_OPTIONAL_OUTGOING_FIXTURE
const optionalOutgoingFixtureRules = {
  ...engine.DEFAULT_WIKI_LINK_SCAN_RULES,
  incomingMin: 0,
  incomingTarget: 0,
  incomingMax: 0,
};
const optionalOutgoingFixtureScan = engine.scanWikiInternalLinks([
  {
    id: "optional-outgoing", stableId: "optional-outgoing", slug: "optional-outgoing",
    title: "Optional Outgoing", shortTitle: "Optional Outgoing", categoryId: "foundations",
    status: "published", indexable: true, publishedAt: "2026-08-16T00:00:00.000Z",
    deletedAt: null, contentVersion: 1,
    bodyMarkdown: "[[page:/wiki|Valid Wiki Guide]]",
    relatedArticleIds: [], contextLinks: [], callToAction: null,
  },
], optionalOutgoingFixtureRules);
if (optionalOutgoingFixtureScan.findings.some((item) => item.code === "OUTGOING_UNDER_MIN")) {
  failures.push("default outgoingMin=0 still emitted OUTGOING_UNDER_MIN");
}

const r20b3Now = "2026-08-16T00:00:00.000Z";
const r20b3Targets = Array.from({ length: 8 }, (_, index) => `r20b3-target-${index + 1}`);
const r20b3Articles = [
  {
    id:"r20b3-hub",stableId:"r20b3-hub",slug:"r20b3-hub",title:"hub",shortTitle:"hub",
    categoryId:"foundations",status:"published",indexable:true,publishedAt:r20b3Now,deletedAt:null,
    contentVersion:1,
    bodyMarkdown:[
      ...r20b3Targets.map((id)=>`[[article:${id}|Target ${id}]]`),
      "[[article:r20b3-missing|Missing Target]]",
    ].join("\n\n"),
    relatedArticleIds:[],contextLinks:[],callToAction:null,
  },
  ...r20b3Targets.map((id)=>({
    id,stableId:id,slug:id,title:id,shortTitle:id,categoryId:"foundations",
    status:"published",indexable:true,publishedAt:r20b3Now,deletedAt:null,contentVersion:1,
    bodyMarkdown:"[[page:/wiki|Valid Wiki Guide]]",
    relatedArticleIds:[],contextLinks:[],callToAction:null,
  })),
  ...["a","b","c"].map((suffix)=>({
    id:`r20b3-source-${suffix}`,stableId:`r20b3-source-${suffix}`,slug:`r20b3-source-${suffix}`,
    title:suffix,shortTitle:suffix,categoryId:"foundations",status:"published",indexable:true,
    publishedAt:r20b3Now,deletedAt:null,contentVersion:1,
    bodyMarkdown:[
      `[[article:r20b3-hub|Hub Link ${suffix} A]]`,
      `[[article:r20b3-hub|Hub Link ${suffix} B]]`,
      `[[article:r20b3-target-1|One ${suffix}]]`,
      `[[article:r20b3-target-2|Two ${suffix}]]`,
    ].join("\n\n"),
    relatedArticleIds:[],contextLinks:[],callToAction:null,
  })),
];

const r20b3Scan = engine.scanWikiInternalLinks(r20b3Articles);
const r20b3Hub = r20b3Scan.articles.find((item)=>item.stableId==="r20b3-hub");
const r20b3HubCodes = new Set(
  r20b3Scan.findings.filter((item)=>item.sourceStableId==="r20b3-hub").map((item)=>item.code)
);

if (!r20b3Hub || r20b3Hub.outgoing !== 8 || r20b3Hub.incoming !== 3) {
  failures.push(`R20B3 distinct-valid summary fixture mismatch: ${JSON.stringify(r20b3Hub)}`);
}
if (
  r20b3HubCodes.has("OUTGOING_OVER_MAX") ||
  r20b3HubCodes.has("INCOMING_OVER_MAX") ||
  r20b3HubCodes.has("INCOMING_UNDER_MIN")
) {
  failures.push(`R20B3 min3/no-hard-max fixture invalid: ${[...r20b3HubCodes].join(",")}`);
}
if (!r20b3HubCodes.has("MISSING_TARGET")) {
  failures.push("R20B3 fixture must keep MISSING_TARGET while excluding it from outgoing quota");
}



if (failures.length) {
  console.error("Wiki internal-link admin guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Wiki internal-link admin guard passed.");
console.log("- six maintenance concepts are persisted separately with versioned rules");
console.log("- verified 92-article authority graph is exactly 292 contextual edges");
console.log("- every authority article requires at least one core link; contextual core multiplicity has no hard max by default");
console.log("- zero-sentinel outgoing/core maxima remain operational in scans and suggestions");
console.log("- engine graph equals an independent body crawler");
console.log("- full body article markers are contextual; quota counts only distinct valid current-public targets, while CTA/structured Related/breadcrumb stay separate");
console.log("- suggestions require a real paragraph and expose NO_NATURAL_PLACEMENT otherwise");
console.log("- apply/rollback helpers enforce exact paragraph concurrency and are reversible");
console.log("- apply creates a Wiki draft only; publication remains an explicit existing Wiki action");
console.log("HALLEUS_BATCH4_SLICE_A_INTERNAL_LINK_ADMIN=PASS");
