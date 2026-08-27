import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function requireText(label, source, marker) {
  if (!source.includes(marker)) {
    throw new Error(`${label} must include ${marker}`);
  }
}

const migration = read("database/migrations/0027_wiki_link_lifecycle_status.sql");
const cms = read("lib/wiki/wiki-cms-service.ts");
const actions = read("app/api/admin/wiki/articles/[articleId]/actions/route.ts");
const materialization = read("lib/wiki/wiki-link-materialization.ts");
const packageJson = read("package.json");
const impact = read("config/halleus-check-impact.json");

for (const marker of [
  "activation_status",
  "activated_at",
  "last_verified_at",
  "activation_error",
  "disabled_at",
  "wiki_internal_links_activation_status_check",
  "'pending', 'active', 'failed', 'disabled'",
  "wiki_internal_links_active_target_idx",
]) {
  requireText("link lifecycle migration", migration, marker);
}

requireText("link materialization", materialization, "activation_status, activated_at, last_verified_at");
requireText("link materialization", materialization, "'active', now(), now()");

for (const marker of [
  "inboundSourceSlugs",
  "link.activation_status = 'active'",
  "set activation_status = 'disabled'",
  "disabled_at = now()",
  "disabledInboundLinks",
]) {
  requireText("unpublish service", cms, marker);
}

requireText("admin unpublish route", actions, "[result.slug, ...result.inboundSourceSlugs]");
requireText("admin unpublish route", actions, "admin-wiki-unpublish");
requireText("package scripts", packageJson, '"check:wiki-link-lifecycle-status"');
requireText("impact registry", impact, "check:wiki-link-lifecycle-status");
requireText("impact registry", impact, "database/migrations/*wiki*.sql");

console.log("Wiki link lifecycle status contract OK");