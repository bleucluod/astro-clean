import { readFileSync } from "node:fs";

const failures = [];
const migration = readFileSync("database/migrations/0018_wiki_external_source_404_correction.sql", "utf8");
const oldUrl = "https://www.iau.org/IAU/Iau/Science/What-we-do/The-Constellations.aspx";
const newUrl = "https://www.iau.org/IAU/IAU/Astronomy-FAQs/FAQs.aspx";
const slugs = ["what-is-astrology","what-is-sidereal-astrology","what-is-tropical-astrology"];

for (const marker of [
  oldUrl, newUrl,
  "matched_count not in (0, 3)",
  "Unexpected old IAU source slugs",
  "lock table public.wiki_articles in share row exclusive mode",
  "Target Wiki article has an active draft",
  "Target Wiki article has an active publish job",
  "insert into public.wiki_article_revisions",
  "content_version = target.corrected_version",
  "Old IAU source URL remains after correction.",
  "HALLEUS_BATCH3_WIKI_EXTERNAL_SOURCE_404_CORRECTION=SUCCESS",
]) {
  if (!migration.includes(marker)) failures.push("migration missing: " + marker);
}
for (const slug of slugs) if (!migration.includes(slug)) failures.push("migration missing slug: " + slug);
for (const forbidden of ["delete from public.wiki_articles", "drop table public.wiki_articles", "truncate"]) {
  if (migration.toLowerCase().includes(forbidden)) failures.push("destructive SQL forbidden: " + forbidden);
}
if (failures.length) {
  console.error("Wiki external-source 404 correction check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Wiki external-source 404 correction check passed.");
console.log("- exact old/new IAU source URLs pinned");
console.log("- idempotent 0-or-3 precondition and exact target slugs pinned");
console.log("- append-only revision history and content-version increment pinned");
console.log("HALLEUS_BATCH3_EXTERNAL_SOURCE_404_GUARD=PASS");
