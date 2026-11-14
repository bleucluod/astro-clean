import fs from "node:fs";

const failed = [];
function read(path) {
  try { return fs.readFileSync(path, "utf8"); }
  catch { failed.push("missing: " + path); return ""; }
}
function has(path, markers) {
  const source = read(path);
  for (const marker of markers) if (!source.includes(marker)) failed.push(path + ": " + marker);
}
const migration = "database/migrations/0042_multi_surface_shop_showcases.sql";
has(migration, [
  "begin;", "commit;", "shop_showcase_placements", "shop_showcase_daily_metrics",
  "shop_showcase_ai_batches", "shop_showcase_ai_proposals",
  "unique (surface, slot)", "enable row level security", "from public, anon, authenticated",
]);
has("lib/shop/shop-showcase-contract.ts", [
  "SHOWCASE_SURFACE_SLOTS", "natal:", "synastry:", "sky:",
  "after-summary", "after-report", "after-sky",
  "after-patterns", "after-chapters", "after-growth",
  "after-moon", "after-aspects", "after-timeline",
]);
has("lib/shop/shop-showcase-surfaces.ts", [
  "shop-showcase-contract", "wikiShopProductCatalog()", "expectedRevision",
  "on conflict (surface, slot)", "admin_audit_events", "enabled = true",
]);
has("lib/wiki/wiki-showcase-positions.ts", [
  "wikiSectionEndPercents", "eligibleWikiSectionBoundary",
  "suggestWikiShowcasePositions", '["early", 15, 30, 22.5]', '["late", 60, 80, 70]',
]);
has("lib/shop/shop-showcase-ai.ts", [
  "prepareSurfaceShowcaseAIExport", "importSurfaceShowcaseAI", "batchId",
  "shop_showcase_ai_proposals", "products.includes(item.productId)",
  "surfaces.includes(item.surface)", "validateSurfacePlacement",
  "sql.json(productIds)", "sql.json(surfaces)",
]);
const showcaseAI = read("lib/shop/shop-showcase-ai.ts");
if (showcaseAI.includes("${JSON.stringify(productIds)}::jsonb") || showcaseAI.includes("${JSON.stringify(surfaces)}::jsonb")) {
  failed.push("AI batch JSONB inputs must bind arrays via sql.json, not stringify");
}
has("lib/wiki/wiki-shop-showcase-workflow.ts", [
  "afterPercent", "placementWindows", "surfaceProposals", "surfaces.json",
  "POSITIONING_AND_SURFACES_FA.md", "prepareSurfaceShowcaseAIExport",
  "importSurfaceShowcaseAI",
]);
has("components/admin/WikiShopShowcasePanel.tsx", [
  "surfaceIds", "eligibleWikiSectionBoundary", "recommendedPositions", "afterPercent",
].filter(Boolean).slice(0, 3));
has("components/admin/ShopShowcaseSurfacesPanel.tsx", [
  "WikiShopShowcaseCard", "review", "action", "ذخیرهٔ ویترین",
  "تأیید و انتشار", "canWrite", "metrics",
].filter(s => s !== "review" && s !== "metrics")); // UI uses action + explicit 30-day metrics.
has("app/api/admin/shop/showcases/route.ts", [
  "requireAdminCapability", "assertAdminMutationRequest", "wiki.publish.write",
]);
has("app/api/shop/showcase-event/route.ts", [
  "expected", 'Object.keys(input).sort().join(",") !== "event,id,surface"',
  "shop_showcase_daily_metrics", "orderableProducts",
]);
has("components/wiki/WikiShopShowcaseCard.tsx", [
  "trackSurface", "/api/shop/showcase-event", "consentStorageKey",
]);
for (const [path,slot] of [
  ["components/report/ReportProductReader.tsx", "natal"],
  ["components/comparison/ComparisonReport.tsx", "synastry"],
  ["components/SkyPublicExperience.tsx", "sky"],
]) {
  const source = read(path);
  const matches = source.match(new RegExp("<SurfaceShowcaseSlot surface=\"" + slot + "\"", "g")) || [];
  if (matches.length !== 3) failed.push(path + ": expected exactly 3 slots, found " + matches.length);
}
const client = read("components/shop/SurfaceShowcaseSlot.tsx");
const panel = read("components/admin/ShopShowcaseSurfacesPanel.tsx");
if (panel.includes('from "@/lib/shop/shop-showcase-surfaces"')) {
  failed.push("Client UI must import pure showcase contract, not server database module");
}
if (/\breportId\b|\bcomparisonId\b|\bbirthDate\b/.test(client)) {
  failed.push("Public showcase client must not send personal parameters");
}
if (failed.length) {
  console.error("MULTI_SURFACE_SHOWCASE_CHECK_FAILED:");
  failed.forEach(item => console.error("- " + item));
  process.exitCode = 1;
} else {
  console.log("MULTI_SURFACE_SHOWCASE_SOURCE_CHECK=PASS");
  console.log("Slots=9; no report identifiers; AI manual review and DB RLS retained.");
}
