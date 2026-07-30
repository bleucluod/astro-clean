import { readFileSync } from "node:fs";

const migrationPath =
  "database/migrations/0008_wiki_true_inline_contextual_graph.sql";
const source = readFileSync(migrationPath, "utf8");
const match = source.match(
  /from jsonb_array_elements\('([\s\S]+)'::jsonb\)\n  loop/,
);

if (!match) {
  throw new Error("The contextual Wiki migration payload is missing.");
}

const items = JSON.parse(match[1].replaceAll("''", "'"));
if (items.length !== 38) {
  throw new Error(`Expected 38 updated Wiki articles, found ${items.length}.`);
}

const stableIds = new Set(items.map((item) => item.stableId));
const unchangedPublishedIds = new Set([
  "birth-chart-without-birth-time",
  "tehran-birth-chart-difference",
  "what-is-sidereal-astrology",
  "what-is-vedic-astrology",
]);
const publishedIds = new Set([...stableIds, ...unchangedPublishedIds]);
const tokenPattern = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)\]\]/g;

for (const item of items) {
  if (!Number.isInteger(item.expectedVersion) || item.expectedVersion < 1) {
    throw new Error(`${item.stableId} has an invalid version boundary.`);
  }
  if (!Array.isArray(item.contextualIds) || item.contextualIds.length !== 2) {
    throw new Error(`${item.stableId} does not declare exactly two contextual targets.`);
  }
  if (new Set(item.contextualIds).size !== 2) {
    throw new Error(`${item.stableId} repeats a contextual target.`);
  }
  const boundary = item.bodyMarkdown.search(/^## مسیرهای مرتبط/m);
  const prose =
    boundary >= 0 ? item.bodyMarkdown.slice(0, boundary) : item.bodyMarkdown;
  for (const target of item.contextualIds) {
    if (target === item.stableId) {
      throw new Error(`${item.stableId} contains a self-link.`);
    }
    if (!publishedIds.has(target)) {
      throw new Error(`${item.stableId} links contextually to unpublished ${target}.`);
    }
    if (!prose.includes(`[[article:${target}]]`)) {
      throw new Error(`${item.stableId} keeps ${target} outside article prose.`);
    }
  }
  const derivedInlineIds = [
    ...new Set(
      [...item.bodyMarkdown.matchAll(tokenPattern)].map((token) => token[1]),
    ),
  ];
  if (derivedInlineIds.join("\n") !== item.inlineIds.join("\n")) {
    throw new Error(`${item.stableId} has a stale inline-link registry.`);
  }
}

for (const marker of [
  "for update;",
  "Wiki version mismatch",
  "wiki_article_revisions",
  "system.wiki.contextual_links_applied",
  "delete from public.wiki_internal_links",
  "changed_count not in (0, expected_count)",
  "HALLEUS_WIKI_TRUE_INLINE_CONTEXTUAL_GRAPH=SUCCESS",
]) {
  if (!source.includes(marker)) {
    throw new Error(`The contextual Wiki migration is missing: ${marker}`);
  }
}

console.log("Wiki true inline contextual graph check passed.");
console.log("- 38 content-bearing published articles receive two prose links");
console.log("- targets are published, distinct, non-self, and revisioned");
console.log("- migration is version-bounded, transactional, and idempotent");
