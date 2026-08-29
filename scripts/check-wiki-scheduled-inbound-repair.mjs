import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("./repair-wiki-scheduled-inbound-links.mjs", import.meta.url), "utf8");
const rollbackSource = readFileSync(new URL("./rollback-wiki-scheduled-inbound-links.mjs", import.meta.url), "utf8");
const damagedContentRepairSource = readFileSync(new URL("./repair-wiki-damaged-public-content.mjs", import.meta.url), "utf8");
const publisherSource = readFileSync(new URL("../lib/wiki/wiki-publisher.ts", import.meta.url), "utf8");
const publishDueRoute = readFileSync(new URL("../app/api/internal/wiki/publish-due/route.ts", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const publicationReadiness = readFileSync(
  new URL("../lib/wiki/wiki-publication-link-readiness.ts", import.meta.url),
  "utf8",
);

function requireText(label, text, marker) {
  if (!text.includes(marker)) {
    throw new Error(`${label} must include ${marker}`);
  }
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) {
    throw new Error(`${label} must not include ${marker}`);
  }
}

requireText("scheduled repair script", source, "const MINIMUM_INBOUND_TARGET = 3");
requireText("scheduled repair script", source, "const SOURCE_MIN_AGE_DAYS = 10");
requireText("scheduled repair script", source, "isOldEnoughForScheduledTarget(source, target, nowMs)");
requireText("scheduled repair script", source, "!isCurrentPublic(article, nowMs)");
requireText("scheduled repair script", source, "scheduledAtMs > nowMs");
requireText("scheduled repair script", source, "halleus_private.wiki_publish_jobs");
requireText("scheduled repair script", source, "revision.snapshot as queued_snapshot");
requireText("scheduled repair script", source, "pending_publish_at");
requireText("scheduled repair script", source, "has_open_draft");
requireText("scheduled repair script", source, "!article.hasOpenDraft");
requireText("scheduled repair script", source, "useQueuedSnapshot ? snapshot.indexable === true");
requireText("scheduled repair script", source, "hasTargetLink(source.bodyMarkdown, target.stableId)");
requireText("scheduled repair script", source, "activationStatus === \"pending\"");
requireText("scheduled repair script", source, "BUILT_IN_MIZFA_QUERIES");
requireText("scheduled repair script", source, "sanitizeAnchorCandidate");
requireText("scheduled repair script", source, "anchorMatchesTarget");
requireText("scheduled repair script", source, "mizfaQueryMatchesTarget");
requireText("scheduled repair script", source, "targetIntentLabels");
requireText("scheduled repair script", source, "sourceIntentLabels");
requireText("scheduled repair script", source, "sourceSupportsTargetIntent");
requireText("scheduled repair script", source, "sourceSupportsAnchorIntent");
requireText("scheduled repair script", source, "CURATED_SCHEDULED_INBOUND_PLANS");
requireText("scheduled repair script", source, "curatedPlacementsForTarget");
requireText("scheduled repair script", source, "mizfaQueryIntentLabels");
requireText("scheduled repair script", source, "targetIdentityText");
requireText("scheduled repair script", source, "isRelatedSourceForTarget");
requireText("scheduled repair script", source, "isFallbackRelatedSourceForTarget");
requireText("scheduled repair script", source, "generatedAnchorCandidates");
requireText("scheduled repair script", source, "automaticPlacementsForTarget");
requireText("scheduled repair script", source, "generatedSentenceForPlacement");
requireText("scheduled repair script", source, "generatedOnlyAnchors");
requireText("scheduled repair script", source, "requireCuratedComplete: false");
requireText("scheduled repair script", source, "arg === \"--require-curated-complete\"");
requireText("scheduled repair script", source, "generated-plan-incomplete");
requireText("scheduled repair script", source, "Scheduled inbound plan is incomplete");
requireText("scheduled repair script", source, "insertAddedInlineLink");
requireText("scheduled repair script", source, "pg_try_advisory_xact_lock");
requireText("scheduled repair script", source, "set local statement_timeout = '0'");
forbidText("scheduled repair script", source, "delete from public.wiki_internal_links");
requireText("scheduled repair script", source, "Mizfa candidate planner must not invent anchors without Mizfa data");
requireText("scheduled repair script", source, "generated fallback anchors should come from target identity");
requireText("scheduled repair script", source, "PERSIAN_MONTH_LABELS");
requireText("scheduled repair script", source, "INDEXNOW_TIMEOUT_MS");
requireText("scheduled repair script", source, "controller.abort()");
requireText("scheduled repair script", source, "await sql.end();");
forbidText("scheduled repair script", source, "sql.end({ timeout");
requireText("scheduled repair script", source, "system.wiki.scheduled_inbound_link_repair");
requireText("scheduled repair script", source, "https://api.indexnow.org/indexnow");
requireText("scheduled repair script", source, "Add natural pending inbound links");
requireText("publication readiness", publicationReadiness, "WIKI_PUBLICATION_INBOUND_SOURCE_MIN_AGE_DAYS = 10");
requireText("publication readiness", publicationReadiness, "HALLEUS_WIKI_INBOUND_SOFT_TARGET_NON_GATING");
requireText("publication readiness", publicationReadiness, "readWikiPublicationLiveInboundReadiness");
requireText("publication readiness", publicationReadiness, "ready: incoming >= minimum");
requireText("publication readiness", publicationReadiness, "deficit: Math.max(0, minimum - incoming)");
forbidText("publication readiness", publicationReadiness, "Wiki publication blocked: incoming=");
requireText("damaged content repair script", damagedContentRepairSource, "what-is-sidereal-astrology");
requireText("damaged content repair script", damagedContentRepairSource, "Repair damaged public Wiki article body from canonical content");
requireText("damaged content repair script", damagedContentRepairSource, "SIDEREAL_SECTIONS");
requireText("publisher", publisherSource, "Recovered inbound-gated publish job after scheduled link repair.");
requireText("publisher", publisherSource, "last_error like 'Wiki publication blocked: incoming=%'");
requireText("publish-due route", publishDueRoute, "const ok = result.failed === 0");
requireText("publish-due route", publishDueRoute, "status: ok ? 200 : 500");
requireText("package scripts", packageJson, "\"repair:wiki-damaged-public-content\"");
requireText("package scripts", packageJson, "\"repair:wiki-scheduled-inbound\"");
requireText("package scripts", packageJson, "\"rollback:wiki-scheduled-inbound\"");
requireText("package scripts", packageJson, "\"check:wiki-scheduled-inbound-repair\"");
requireText("scheduled rollback script", rollbackSource, "ROLLBACK_NOTE");
requireText("scheduled rollback script", rollbackSource, "where current_revision.change_note = ${CHANGE_NOTE}");
requireText("scheduled rollback script", rollbackSource, "article.content_version = (current_revision.snapshot->>'contentVersion')::integer");
requireText("scheduled rollback script", rollbackSource, "deleteAddedInlineLinks(tx, lockedRow.article_id");

await new Promise((resolve, reject) => {
  execFile(
    process.execPath,
    [fileURLToPath(new URL("./repair-wiki-scheduled-inbound-links.mjs", import.meta.url)), "--self-check"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
    (error) => error ? reject(error) : resolve(),
  );
});

await new Promise((resolve, reject) => {
  execFile(
    process.execPath,
    [fileURLToPath(new URL("./rollback-wiki-scheduled-inbound-links.mjs", import.meta.url)), "--self-check"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
    (error) => error ? reject(error) : resolve(),
  );
});

await new Promise((resolve, reject) => {
  execFile(
    process.execPath,
    [fileURLToPath(new URL("./repair-wiki-damaged-public-content.mjs", import.meta.url)), "--self-check"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
    (error) => error ? reject(error) : resolve(),
  );
});

console.log("Wiki scheduled inbound repair contract OK");
