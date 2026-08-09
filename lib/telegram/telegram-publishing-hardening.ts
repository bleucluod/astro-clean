export const TELEGRAM_PUBLISH_MAX_ATTEMPTS = 3;
export const TELEGRAM_STALE_PUBLISHING_MS = 5 * 60 * 1000;
export const TELEGRAM_SAFE_RETRY_DELAYS_MS = [2 * 60 * 1000, 10 * 60 * 1000] as const;

export type TelegramDeliveryFailure = {
  message: string;
  retryableSafe: boolean;
  deliveryUncertain: boolean;
};

export function getTelegramSafeRetryDelayMs(attemptCount: number) {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    return null;
  }
  const index = attemptCount - 1;
  return index < TELEGRAM_SAFE_RETRY_DELAYS_MS.length
    ? TELEGRAM_SAFE_RETRY_DELAYS_MS[index]
    : null;
}

export function shouldAutoRetryTelegramFailure(input: {
  attemptCount: number;
  failure: TelegramDeliveryFailure;
}) {
  return (
    !input.failure.deliveryUncertain &&
    input.failure.retryableSafe &&
    input.attemptCount < TELEGRAM_PUBLISH_MAX_ATTEMPTS &&
    getTelegramSafeRetryDelayMs(input.attemptCount) !== null
  );
}

export function telegramFailureTag(failure: TelegramDeliveryFailure) {
  if (failure.deliveryUncertain) return "delivery_uncertain";
  if (failure.retryableSafe) return "safe_retry";
  return "terminal";
}