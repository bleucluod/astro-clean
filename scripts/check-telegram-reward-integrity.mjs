import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as ts from "typescript";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const migration = read("database/migrations/0012_telegram_join_reward.sql");
const contractSource = read("lib/telegram/telegram-reward-contract.ts");
const service = read("lib/telegram/telegram-reward-service.ts");
const accountRoute = read("app/api/account/telegram-reward/route.ts");
const callbackRoute = read("app/api/internal/telegram/reward-link/route.ts");
const reportRoute = read("app/api/reports/account/route.ts");
const profile = read("app/profile/page.tsx");
const card = read("components/TelegramJoinRewardCard.tsx");
const publisher = read("lib/telegram/telegram-publisher.ts");
const worker = read("ops/cloudflare/telegram-bridge/worker.mjs");
const wrangler = read("ops/cloudflare/telegram-bridge/wrangler.toml");
const env = read("lib/config/env.ts");
const envExample = read(".env.example");
const packageJson = JSON.parse(read("package.json"));
const registry = JSON.parse(read("config/halleus-check-impact.json"));

for (const marker of [
  "telegram_join_reward_user_once unique (halleus_user_id)",
  "telegram_join_reward_telegram_once unique (telegram_user_id)",
  "premium_ends_at = premium_starts_at + interval '24 hours'",
  "telegram_reward_redemptions is append-only",
  "enable row level security",
]) {
  assert(migration.includes(marker), `Reward migration missing invariant: ${marker}`);
}
for (const forbidden of ["telegram_username", "first_name", "last_name", "photo_url", "phone_number"]) {
  assert(!migration.includes(forbidden), `Reward ledger stores unnecessary Telegram profile data: ${forbidden}`);
}
assert(migration.includes("token_hash text not null unique"), "Challenge must store only a token hash.");
assert(!migration.includes("token text not null"), "Raw Telegram reward challenge token must not be persisted.");

for (const marker of [
  "randomBytes(24).toString(\"base64url\")",
  "hashToken(token)",
  "for update",
  "telegram_join_reward_user_once",
  "telegram_join_reward_telegram_once",
  "checkTelegramChannelMembership",
  "getEffectiveTelegramRewardAccessTier",
  'premium_ends_at > now()',
]) {
  assert(service.includes(marker), `Reward service missing integrity marker: ${marker}`);
}
assert(!service.includes("username") && !service.includes("first_name") && !service.includes("photo_url"), "Reward service must not persist Telegram profile fields.");

assert(accountRoute.includes("getSupabaseUserFromAuthorizationHeader"), "Reward account route must require verified Halleus auth.");
assert(accountRoute.includes('action === "start"') && accountRoute.includes('action === "redeem"'), "Reward account route lacks start/redeem flow.");
assert(callbackRoute.includes("timingSafeEqual"), "Worker callback route must use timing-safe secret verification.");
assert(callbackRoute.includes("x-halleus-telegram-publisher-secret"), "Worker callback route lacks private publisher authentication.");
assert(reportRoute.includes("getEffectiveTelegramRewardAccessTier"), "Active 24h reward is not connected to report access tier.");
assert(reportRoute.includes("tier: accessTier"), "Account report persistence ignores effective reward tier.");
assert(profile.includes("TelegramJoinRewardCard"), "Account profile does not expose Telegram join reward UI.");
for (const text of ["عضو کانال هالیوس شو و ۱ روز Premium هدیه بگیر", "فقط یک بار", "بررسی عضویت"]) {
  assert(card.includes(text), `Reward UI missing required copy: ${text}`);
}

assert(publisher.includes('"/telegram/check-member"'), "Halleus server does not verify membership through bridge.");
assert(worker.includes('"getChatMember"'), "Cloudflare bridge does not call Telegram getChatMember.");
assert(worker.includes("env.TELEGRAM_CHANNEL_ID"), "Membership verification must use the fixed channel target.");
assert(worker.includes('"x-telegram-bot-api-secret-token"'), "Telegram webhook secret-token header is not verified.");
assert(worker.includes('"/telegram/configure-webhook"'), "Reward webhook cannot be configured through the private bridge operation.");
assert(worker.includes("HALLEUS_REWARD_LINK_URL"), "Worker does not forward verified Telegram identity to Halleus.");
assert(worker.includes("REWARD_START_PREFIX"), "Worker does not constrain reward deep-link payloads.");
assert(wrangler.includes('"TELEGRAM_WEBHOOK_SECRET"'), "Worker secret manifest lacks TELEGRAM_WEBHOOK_SECRET.");
assert(wrangler.includes('HALLEUS_REWARD_LINK_URL = "https://halleus.ir/api/internal/telegram/reward-link"'), "Worker reward callback URL is not fixed to Halleus.");
assert(env.includes("telegramBotUsername") && env.includes("telegramChannelUrl"), "Runtime env lacks reward public routing config.");
assert(envExample.includes("HALLEUS_TELEGRAM_BOT_USERNAME=h4ll3usbot"), "Env example lacks Telegram bot username.");
assert(envExample.includes("HALLEUS_TELEGRAM_CHANNEL_URL=https://t.me/Halleus_astro"), "Env example lacks Telegram channel URL.");
assert(packageJson.scripts?.["check:telegram-reward-integrity"] === "node scripts/check-telegram-reward-integrity.mjs", "package.json is missing reward guard script.");
const rewardArea = registry.areas?.find((area) => area.id === "telegram-join-reward");
assert(rewardArea?.guards?.includes("check:telegram-reward-integrity"), "Impact registry does not enforce Telegram reward integrity.");

const tempRoot = mkdtempSync(path.join(tmpdir(), "halleus-telegram-reward-contract-"));
try {
  const transpiled = ts.transpileModule(contractSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulePath = path.join(tempRoot, "reward-contract.mjs");
  writeFileSync(modulePath, transpiled, "utf8");
  const contract = await import(pathToFileURL(modulePath).href);

  assert(contract.normalizeTelegramUserId("123456789") === "123456789", "Valid Telegram user id normalization failed.");
  assert(contract.normalizeTelegramUserId("0") === null, "Zero Telegram user id must be rejected.");
  assert(contract.normalizeTelegramUserId("12x") === null, "Non-numeric Telegram user id must be rejected.");
  assert(contract.isTelegramMembershipActive("member") === true, "Member must qualify.");
  assert(contract.isTelegramMembershipActive("administrator") === true, "Administrator must qualify.");
  assert(contract.isTelegramMembershipActive("creator") === true, "Creator must qualify.");
  assert(contract.isTelegramMembershipActive("restricted", true) === true, "Restricted active member must qualify.");
  assert(contract.isTelegramMembershipActive("restricted", false) === false, "Restricted non-member must not qualify.");
  assert(contract.isTelegramMembershipActive("left") === false, "Left user must not qualify.");
  assert(contract.isTelegramMembershipActive("kicked") === false, "Banned user must not qualify.");
  const start = new Date("2026-08-09T00:00:00.000Z");
  assert(contract.buildTelegramRewardEndsAt(start).toISOString() === "2026-08-10T00:00:00.000Z", "Reward duration must be exactly 24 hours.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Telegram reward integrity check passed.");
console.log("- Telegram identity is linked by bot deep-link challenge and private webhook callback");
console.log("- membership is verified server-side through fixed-channel getChatMember");
console.log("- unique DB constraints enforce one lifetime reward per Halleus account and Telegram user ID");
console.log("- reward entitlement lasts exactly 24 hours while the redemption ledger remains permanent");
console.log("- stored Telegram identity is minimal: numeric user ID only, no profile fields");
console.log("HALLEUS_TELEGRAM_JOIN_REWARD_SLICE3_20260809");