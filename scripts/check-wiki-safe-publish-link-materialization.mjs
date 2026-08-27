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

requireText("package scripts", packageJson, '"check:wiki-safe-publish-link-materialization"');
requireText("impact registry", impact, "check:wiki-safe-publish-link-materialization");
requireText("impact registry", impact, "lib/wiki/wiki-link-materialization.ts");

console.log("Wiki safe publish link materialization contract OK");