import { SHOP_ONLINE_GATEWAY_ENABLED } from './shop-payment-gateway';

/**
 * Independent operator gate. This remains false by default until the
 * merchant contract, isolated DB E2E and production release are approved.
 * Never import this server-only module from a client component.
 */
export function isShopBitPayAvailable(): boolean {
  const secret = process.env.HALLEUS_BITPAY_CALLBACK_SECRET;
  return SHOP_ONLINE_GATEWAY_ENABLED
    && process.env.HALLEUS_BITPAY_LEDGER_READY === 'true'
    && process.env.HALLEUS_BITPAY_PAYMENTS_ENABLED === 'true'
    && typeof process.env.HALLEUS_BITPAY_API_KEY === 'string'
    && process.env.HALLEUS_BITPAY_API_KEY.length >= 8
    && typeof secret === 'string'
    && Buffer.byteLength(secret, 'utf8') >= 32;
}
