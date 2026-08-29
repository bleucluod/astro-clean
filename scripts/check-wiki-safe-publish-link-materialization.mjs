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

const cms = read("lib/wiki/wiki-cms-service.ts");
const publisher = read("lib/wiki/wiki-publisher.ts");
const readiness = read("lib/wiki/wiki-publication-link-readiness.ts");
const materialization = read("lib/wiki/wiki-link-materialization.ts");
const packageJson = read("package.json");
const impact = read("config/halleus-check-impact.json");

forbidText("admin publish transaction", cms, "delete from public.wiki_internal_links");
forbidText("admin publish transaction", cms, "insert into public.wiki_internal_links");
forbidText("scheduled publish transaction", publisher, "delete from public.wiki_internal_links");
forbidText("scheduled publish transaction", publisher, "insert into public.wiki_internal_links");

requireText("admin publish service", cms, "syncPublishedWikiInternalLinksBestEffort");
requireText("admin publish service", cms, "syncPublishedWikiInternalLinks({");
requireText("scheduled publisher", publisher, "syncPublishedWikiInternalLinksBestEffort");
requireText("link materialization helper", materialization, "delete from public.wiki_internal_links");
requireText("link materialization helper", materialization, "insert into public.wiki_internal_links");
requireText("link materialization helper", materialization, "on conflict do nothing");
requireText("link materialization helper", materialization, "WikiLinkMaterializationResult");

requireText("Wiki inbound readiness", readiness, "export const WIKI_PUBLICATION_LIVE_INBOUND_MINIMUM = 3;");
requireText("Wiki inbound readiness", readiness, "HALLEUS_WIKI_INBOUND_SOFT_TARGET_NON_GATING");
requireText("Wiki inbound readiness", readiness, "export async function readWikiPublicationLiveInboundReadiness");
requireText("Wiki inbound readiness", readiness, "ready: incoming >= minimum");
requireText("Wiki inbound readiness", readiness, "deficit: Math.max(0, minimum - incoming)");
forbidText("Wiki inbound readiness", readiness, "Wiki publication blocked: incoming=");
forbidText("Wiki inbound readiness", readiness, "assertWikiPublicationLiveInboundReady");
requireText("scheduled publisher", publisher, "readWikiPublicationLiveInboundReadiness");
forbidText("scheduled publisher", publisher, "assertWikiPublicationLiveInboundReady");
requireText("scheduled publisher", publisher, "HALLEUS_WIKI_INBOUND_SOFT_TARGET_NON_GATING");
requireText("scheduled publisher", publisher, "activatePublishedWikiTargetInboundLinksBestEffort");
requireText("scheduled publisher legacy recovery", publisher, "last_error like 'Wiki publication blocked: incoming=%'");
requireText("admin publish service", cms, "readWikiPublicationLiveInboundReadiness");
forbidText("admin publish service", cms, "assertWikiPublicationLiveInboundReady");
requireText("package scripts", packageJson, '"check:wiki-safe-publish-link-materialization"');
requireText("impact registry", impact, "check:wiki-safe-publish-link-materialization");
requireText("impact registry", impact, "lib/wiki/wiki-link-materialization.ts");

console.log("Wiki safe publish link materialization contract OK");