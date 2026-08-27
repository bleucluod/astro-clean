import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function requireText(label, source, marker) {
  if (!source.includes(marker)) {
    throw new Error(`${label} must include ${marker}`);
  }
}

function forbidText(label, source, marker) {
  if (source.includes(marker)) {
    throw new Error(`${label} must not include ${marker}`);
  }
}

const service = read("lib/wiki/wiki-indexability-observability.ts");
const types = read("lib/wiki/wiki-indexability-observability-types.ts");
const route = read("app/api/admin/wiki/indexability/route.ts");
const panel = read("components/admin/WikiLinkAdminPanel.tsx");
const packageJson = read("package.json");
const impact = read("config/halleus-check-impact.json");

for (const marker of [
  "WikiIndexabilityObservabilityState",
  "publicReady",
  "sitemapEligible",
  "unresolvedInlineTargets",
  "failedLinks",
]) {
  requireText("observability types", types, marker);
}

for (const marker of [
  "getWikiIndexabilityObservabilityState",
  "findWikiInternalArticleIds",
  "public.wiki_articles",
  "public.wiki_internal_links",
  "activation_status",
  "expectedPath: `/wiki/${article.slug}`",
  "sitemapEligible: ready",
  "Public article has no active inbound Wiki links yet.",
]) {
  requireText("observability service", service, marker);
}

for (const forbidden of [
  "indexing.googleapis.com",
  "searchconsole.googleapis.com",
  "site:",
  "fetch(",
]) {
  forbidText("observability service", service, forbidden);
}

requireText("observability route", route, 'requireAdminCapability(request, "wiki.read")');
requireText("observability route", route, "getWikiIndexabilityObservabilityState");
requireText("observability route", route, "noStoreJsonResponse");

requireText("admin panel", panel, "/api/admin/wiki/indexability");
requireText("admin panel", panel, "آمادگی ایندکس");
requireText("admin panel", panel, "ادعای ایندکس گوگل نیست");
requireText("admin panel", panel, "مقصد نامعتبر");

requireText("package scripts", packageJson, '"check:wiki-indexability-observability"');
requireText("impact registry", impact, "check:wiki-indexability-observability");
requireText("impact registry", impact, "lib/wiki/wiki-indexability-observability.ts");
requireText("impact registry", impact, "app/api/admin/wiki/indexability/route.ts");

console.log("Wiki indexability observability contract OK");
