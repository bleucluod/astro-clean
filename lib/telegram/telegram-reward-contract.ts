export const TELEGRAM_JOIN_REWARD_DURATION_MS = 24 * 60 * 60 * 1000;
export const TELEGRAM_JOIN_REWARD_CHALLENGE_TTL_MS = 15 * 60 * 1000;
export const TELEGRAM_JOIN_REWARD_START_PREFIX = "reward_" as const;

export type TelegramMemberStatus =
  | "creator"
  | "administrator"
  | "member"
  | "restricted"
  | "left"
  | "kicked"
  | "unknown";

export function normalizeTelegramUserId(value: unknown): string | null {
  const text = typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
  if (!/^\d{1,19}$/u.test(text)) return null;
  const normalized = text.replace(/^0+(?=\d)/u, "");
  if (normalized === "0") return null;
  const maxSignedBigint = "9223372036854775807";
  if (normalized.length > maxSignedBigint.length) return null;
  if (
    normalized.length === maxSignedBigint.length &&
    normalized.localeCompare(maxSignedBigint) > 0
  ) {
    return null;
  }
  return normalized;
}

export function isTelegramMembershipActive(
  status: TelegramMemberStatus,
  restrictedIsMember = false,
) {
  return (
    status === "creator" ||
    status === "administrator" ||
    status === "member" ||
    (status === "restricted" && restrictedIsMember)
  );
}

export function buildTelegramRewardEndsAt(startedAt: Date) {
  const startMs = startedAt.getTime();
  if (!Number.isFinite(startMs)) {
    throw new Error("Telegram reward start time is invalid.");
  }
  return new Date(startMs + TELEGRAM_JOIN_REWARD_DURATION_MS);
}