import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const source = readFileSync(new URL("./repair-wiki-under3-live-inbound-links.mjs", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");

function requireText(label, text, marker) {
  if (!text.includes(marker)) {
    throw new Error(`${label} must include ${marker}`);
  }
}

requireText("repair script", source, "const LIVE_INBOUND_TARGET = 3");
requireText("repair script", source, "const RUN_ID = \"wiki-under3-live-inbound-links-20260828\"");
requireText("repair script", source, "reason: \"target-already-complete\"");
requireText("repair script", source, "hasTargetLink(bodyMarkdown, placement.target)");
requireText("repair script", source, "related_article_ids =");
requireText("repair script", source, "system.wiki.under3_live_inbound_link_repair");
requireText("repair script", source, "https://api.indexnow.org/indexnow");
requireText("package scripts", packageJson, "\"repair:wiki-under3-live-inbound\"");

const plan = JSON.parse(
  await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [fileURLToPath(new URL("./repair-wiki-under3-live-inbound-links.mjs", import.meta.url)), "--print-plan"],
      { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
      (error, stdout) => error ? reject(error) : resolve(stdout),
    );
  }),
);

if (plan.liveInboundTarget !== 3) {
  throw new Error("Repair plan must target three live inbound links.");
}
if (!Array.isArray(plan.placements) || plan.placements.length !== 67) {
  throw new Error(`Repair plan must contain exactly 67 placements; found ${plan.placements?.length}.`);
}

const pairs = new Set();
for (const item of plan.placements) {
  if (!item.source || !item.target || !item.anchor || !item.sentence || !Array.isArray(item.hints)) {
    throw new Error("Every placement must include source, target, anchor, sentence and hints.");
  }
  if (item.source === item.target) {
    throw new Error(`Self-link placement is not allowed: ${item.source}.`);
  }
  const pair = `${item.source}->${item.target}`;
  if (pairs.has(pair)) {
    throw new Error(`Duplicate source-target placement: ${pair}.`);
  }
  pairs.add(pair);
}

console.log("Wiki under-3 live inbound repair contract OK");
