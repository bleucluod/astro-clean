// PostgreSQL BIGINT identifiers must never pass through JavaScript Number:
// its safe integer range is smaller than the database's signed 64-bit range.
const MAX_POSTGRES_BIGINT = BigInt('9223372036854775807');
const decimalInteger = /^(0|[1-9]\d*)$/;
const positiveInteger = /^[1-9]\d{0,18}$/;
const persianInteger = new Intl.NumberFormat('fa-IR');

export function isValidShopOrderNumber(value: unknown): value is string {
  return typeof value === 'string'
    && positiveInteger.test(value)
    && BigInt(value) <= MAX_POSTGRES_BIGINT;
}

export function formatShopInteger(value: string | number): string {
  if (typeof value === 'string') {
    return decimalInteger.test(value) ? persianInteger.format(BigInt(value)) : value;
  }
  return Number.isSafeInteger(value) ? persianInteger.format(value) : String(value);
}

/** Order identifiers are strings, with Persian digits and no thousands separators. */
export function formatShopOrderNumber(value: string): string {
  if (!isValidShopOrderNumber(value)) return value;
  return '#' + value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}
