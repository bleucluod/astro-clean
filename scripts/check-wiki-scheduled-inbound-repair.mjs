import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";

const source = readFileSync(new URL("./repair-wiki-scheduled-inbound-links.mjs", import.meta.url), "utf8");
const rollbackSource = readFileSync(new URL("./rollback-wiki-scheduled-inbound-links.mjs", import.meta.url), "utf8");
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

requireText("scheduled repair script", source, "const MINIMUM_INBOUND_TARGET = 3");
requireText("scheduled repair script", source, "const SOURCE_MIN_AGE_DAYS = 10");
requireText("scheduled repair script", source, "isOldEnoughSource(article, nowMs)");
requireText("scheduled repair script", source, "!isCurrentPublic(article, nowMs)");
requireText("scheduled repair script", source, "scheduledAtMs > nowMs");
requireText("scheduled repair script", source, "halleus_private.wiki_publish_jobs");
requireText("scheduled repair script", source, "revision.snapshot as queued_snapshot");
requireText("scheduled repair script", source, "pending_publish_at");
requireText("scheduled repair script", source, "useQueuedSnapshot ? snapshot.indexable === true");
requireText("scheduled repair script", source, "hasTargetLink(source.bodyMarkdown, target.stableId)");
requireText("scheduled repair script", source, "activationStatus === \"pending\"");
requireText("scheduled repair script", source, "BUILT_IN_MIZFA_QUERIES");
requireText("scheduled repair script", source, "sanitizeAnchorCandidate");
requireText("scheduled repair script", source, "anchorMatchesTarget");
requireText("scheduled repair script", source, "mizfaQueryMatchesTarget");
requireText("scheduled repair script", source, "isRelatedSourceForTarget");
requireText("scheduled repair script", source, "PERSIAN_MONTH_LABELS");
requireText("scheduled repair script", source, "INDEXNOW_TIMEOUT_MS");
requireText("scheduled repair script", source, "controller.abort()");
requireText("scheduled repair script", source, "system.wiki.scheduled_inbound_link_repair");
requireText("scheduled repair script", source, "https://api.indexnow.org/indexnow");
requireText("scheduled repair script", source, "Add natural pending inbound links");
requireText("publication readiness", publicationReadiness, "WIKI_PUBLICATION_INBOUND_SOURCE_MIN_AGE_DAYS = 10");
requireText("publication readiness", publicationReadiness, "published at least");
requireText("package scripts", packageJson, "\"repair:wiki-scheduled-inbound\"");
requireText("package scripts", packageJson, "\"rollback:wiki-scheduled-inbound\"");
requireText("package scripts", packageJson, "\"check:wiki-scheduled-inbound-repair\"");
requireText("scheduled rollback script", rollbackSource, "ROLLBACK_NOTE");
requireText("scheduled rollback script", rollbackSource, "where current_revision.change_note = ${CHANGE_NOTE}");
requireText("scheduled rollback script", rollbackSource, "article.content_version = (current_revision.snapshot->>'contentVersion')::integer");
requireText("scheduled rollback script", rollbackSource, "syncInlineLinks(tx, row.article_id");

await new Promise((resolve, reject) => {
  execFile(
    process.execPath,
    [new URL("./repair-wiki-scheduled-inbound-links.mjs", import.meta.url).pathname, "--self-check"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
    (error) => error ? reject(error) : resolve(),
  );
});

await new Promise((resolve, reject) => {
  execFile(
    process.execPath,
    [new URL("./rollback-wiki-scheduled-inbound-links.mjs", import.meta.url).pathname, "--self-check"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
    (error) => error ? reject(error) : resolve(),
  );
});

console.log("Wiki scheduled inbound repair contract OK");
