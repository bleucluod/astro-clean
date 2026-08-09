import { createHash, randomBytes } from "node:crypto";

import { asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import { checkTelegramChannelMembership } from "@/lib/telegram/telegram-publisher";
import {
  TELEGRAM_JOIN_REWARD_CHALLENGE_TTL_MS,
  TELEGRAM_JOIN_REWARD_START_PREFIX,
  buildTelegramRewardEndsAt,
  normalizeTelegramUserId,
} from "@/lib/telegram/telegram-reward-contract";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/u;
const BOT_USERNAME_PATTERN = /^[A-Za-z0-9_]{5,32}$/u;

export type TelegramRewardPublicStatus = {
  state: "eligible" | "awaiting_telegram" | "linked" | "redeemed";
  rewardUsed: boolean;
  premiumActive: boolean;
  premiumEndsAt: string | null;
  channelUrl: string;
};

export type TelegramRewardStartResult =
  | { ok: true; deepLink: string; expiresAt: string; status: TelegramRewardPublicStatus }
  | { ok: false; code: "account-already-redeemed"; status: TelegramRewardPublicStatus };

export type TelegramRewardLinkResult =
  | { ok: true; linked: true }
  | { ok: true; linked: false; code: "invalid-or-expired" };

export type TelegramRewardRedeemResult =
  | { ok: true; premiumEndsAt: string; status: TelegramRewardPublicStatus }
  | {
      ok: false;
      code:
        | "account-already-redeemed"
        | "telegram-already-redeemed"
        | "telegram-not-linked"
        | "not-a-channel-member";
      status: TelegramRewardPublicStatus;
    };

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function readRewardConfig() {
  const env = getHalleusRuntimeEnv();
  const botUsername = env.telegramBotUsername?.replace(/^@/u, "") ?? "";
  const channelUrl = env.telegramChannelUrl ?? "";
  if (!BOT_USERNAME_PATTERN.test(botUsername)) {
    throw new Error("HALLEUS_TELEGRAM_BOT_USERNAME is not configured.");
  }
  let parsedChannelUrl: URL;
  try {
    parsedChannelUrl = new URL(channelUrl);
  } catch {
    throw new Error("HALLEUS_TELEGRAM_CHANNEL_URL is not configured.");
  }
  if (parsedChannelUrl.protocol !== "https:" || parsedChannelUrl.hostname !== "t.me") {
    throw new Error("HALLEUS_TELEGRAM_CHANNEL_URL must be an https://t.me URL.");
  }
  return { botUsername, channelUrl: parsedChannelUrl.toString() };
}

function isUniqueViolation(error: unknown, constraint: string) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  return record.code === "23505" && record.constraint_name === constraint;
}

async function readRedemptionByUser(userId: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select premium_starts_at::text, premium_ends_at::text
    from halleus_private.telegram_reward_redemptions
    where halleus_user_id = ${userId}::uuid
    limit 1
  `;
  return asRecord(rows[0]);
}

export async function getTelegramJoinRewardStatus(
  userId: string,
): Promise<TelegramRewardPublicStatus> {
  const { channelUrl } = readRewardConfig();
  const redemption = await readRedemptionByUser(userId);
  if (redemption.premium_ends_at) {
    const premiumEndsAt = asString(redemption.premium_ends_at);
    return {
      state: "redeemed",
      rewardUsed: true,
      premiumActive: Date.parse(premiumEndsAt) > Date.now(),
      premiumEndsAt,
      channelUrl,
    };
  }

  const sql = getAdminDatabase();
  const challenges = await sql`
    select (telegram_user_id is not null) as linked, expires_at::text
    from halleus_private.telegram_reward_challenges
    where halleus_user_id = ${userId}::uuid
      and expires_at > now()
    order by created_at desc
    limit 1
  `;
  const challenge = asRecord(challenges[0]);
  return {
    state: challenge.linked === true ? "linked" : challenge.expires_at ? "awaiting_telegram" : "eligible",
    rewardUsed: false,
    premiumActive: false,
    premiumEndsAt: null,
    channelUrl,
  };
}

export async function createTelegramJoinRewardChallenge(
  userId: string,
): Promise<TelegramRewardStartResult> {
  const current = await getTelegramJoinRewardStatus(userId);
  if (current.rewardUsed) {
    return { ok: false, code: "account-already-redeemed", status: current };
  }

  const { botUsername } = readRewardConfig();
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TELEGRAM_JOIN_REWARD_CHALLENGE_TTL_MS);
  const sql = getAdminDatabase();

  await sql.begin(async (tx) => {
    const alreadyRedeemed = await tx`
      select 1
      from halleus_private.telegram_reward_redemptions
      where halleus_user_id = ${userId}::uuid
      limit 1
    `;
    if (alreadyRedeemed.length > 0) return;

    await tx`
      delete from halleus_private.telegram_reward_challenges
      where halleus_user_id = ${userId}::uuid
    `;
    await tx`
      insert into halleus_private.telegram_reward_challenges (
        halleus_user_id, token_hash, expires_at
      ) values (
        ${userId}::uuid, ${tokenHash}, ${expiresAt.toISOString()}::timestamptz
      )
    `;
  });

  const status = await getTelegramJoinRewardStatus(userId);
  if (status.rewardUsed) {
    return { ok: false, code: "account-already-redeemed", status };
  }
  return {
    ok: true,
    deepLink: `https://t.me/${botUsername}?start=${TELEGRAM_JOIN_REWARD_START_PREFIX}${token}`,
    expiresAt: expiresAt.toISOString(),
    status,
  };
}

export async function linkTelegramRewardChallenge(input: {
  token: string;
  telegramUserId: unknown;
}): Promise<TelegramRewardLinkResult> {
  if (!TOKEN_PATTERN.test(input.token)) {
    return { ok: true, linked: false, code: "invalid-or-expired" };
  }
  const telegramUserId = normalizeTelegramUserId(input.telegramUserId);
  if (!telegramUserId) {
    return { ok: true, linked: false, code: "invalid-or-expired" };
  }
  const tokenHash = hashToken(input.token);
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const rows = await tx`
      select id::text, telegram_user_id::text
      from halleus_private.telegram_reward_challenges
      where token_hash = ${tokenHash}
        and expires_at > now()
      for update
      limit 1
    `;
    const challenge = asRecord(rows[0]);
    if (!challenge.id) {
      return { ok: true, linked: false, code: "invalid-or-expired" } as const;
    }
    const existingTelegramId = challenge.telegram_user_id
      ? asString(challenge.telegram_user_id)
      : null;
    if (existingTelegramId && existingTelegramId !== telegramUserId) {
      return { ok: true, linked: false, code: "invalid-or-expired" } as const;
    }
    await tx`
      update halleus_private.telegram_reward_challenges
      set telegram_user_id = ${telegramUserId}::bigint,
          linked_at = coalesce(linked_at, now())
      where id = ${asString(challenge.id)}::uuid
    `;
    return { ok: true, linked: true } as const;
  });
}

async function readLinkedTelegramUserId(userId: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select telegram_user_id::text
    from halleus_private.telegram_reward_challenges
    where halleus_user_id = ${userId}::uuid
      and telegram_user_id is not null
      and expires_at > now()
    order by linked_at desc nulls last, created_at desc
    limit 1
  `;
  const row = asRecord(rows[0]);
  return row.telegram_user_id ? asString(row.telegram_user_id) : null;
}

export async function redeemTelegramJoinReward(
  userId: string,
): Promise<TelegramRewardRedeemResult> {
  const before = await getTelegramJoinRewardStatus(userId);
  if (before.rewardUsed) {
    return { ok: false, code: "account-already-redeemed", status: before };
  }

  const telegramUserId = await readLinkedTelegramUserId(userId);
  if (!telegramUserId) {
    return { ok: false, code: "telegram-not-linked", status: before };
  }

  const membership = await checkTelegramChannelMembership(telegramUserId);
  if (!membership.isMember) {
    return {
      ok: false,
      code: "not-a-channel-member",
      status: await getTelegramJoinRewardStatus(userId),
    };
  }

  const premiumStartsAt = new Date();
  const premiumEndsAt = buildTelegramRewardEndsAt(premiumStartsAt);
  const sql = getAdminDatabase();

  try {
    const result = await sql.begin(async (tx) => {
      const existingUser = await tx`
        select premium_ends_at::text
        from halleus_private.telegram_reward_redemptions
        where halleus_user_id = ${userId}::uuid
        for update
        limit 1
      `;
      if (existingUser.length > 0) return "account-already-redeemed" as const;

      const existingTelegram = await tx`
        select 1
        from halleus_private.telegram_reward_redemptions
        where telegram_user_id = ${telegramUserId}::bigint
        for update
        limit 1
      `;
      if (existingTelegram.length > 0) return "telegram-already-redeemed" as const;

      await tx`
        insert into halleus_private.telegram_reward_redemptions (
          halleus_user_id, telegram_user_id,
          premium_starts_at, premium_ends_at
        ) values (
          ${userId}::uuid, ${telegramUserId}::bigint,
          ${premiumStartsAt.toISOString()}::timestamptz,
          ${premiumEndsAt.toISOString()}::timestamptz
        )
      `;
      await tx`
        delete from halleus_private.telegram_reward_challenges
        where halleus_user_id = ${userId}::uuid
      `;
      return "redeemed" as const;
    });

    if (result === "account-already-redeemed" || result === "telegram-already-redeemed") {
      return {
        ok: false,
        code: result,
        status: await getTelegramJoinRewardStatus(userId),
      };
    }
  } catch (error) {
    if (isUniqueViolation(error, "telegram_join_reward_user_once")) {
      return {
        ok: false,
        code: "account-already-redeemed",
        status: await getTelegramJoinRewardStatus(userId),
      };
    }
    if (isUniqueViolation(error, "telegram_join_reward_telegram_once")) {
      return {
        ok: false,
        code: "telegram-already-redeemed",
        status: await getTelegramJoinRewardStatus(userId),
      };
    }
    throw error;
  }

  const status = await getTelegramJoinRewardStatus(userId);
  return { ok: true, premiumEndsAt: premiumEndsAt.toISOString(), status };
}

export async function getEffectiveTelegramRewardAccessTier(
  userId: string,
): Promise<"free" | "premium"> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select 1
    from halleus_private.telegram_reward_redemptions
    where halleus_user_id = ${userId}::uuid
      and premium_ends_at > now()
    limit 1
  `;
  return rows.length > 0 ? "premium" : "free";
}