/**
 * The first public shop release is intentionally a single-product launch.
 * A future deploy cannot open orders merely because NODE_ENV is production:
 * the operator must opt in with the reviewed private-storage/ingress contract.
 */
export function isShopMvpActive() {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.HALLEUS_SHOP_RATE_SECRET;
  return process.env.HALLEUS_SHOP_MVP_ENABLED === 'true' &&
    process.env.HALLEUS_SHOP_SHARED_RATE_ENABLED === 'true' &&
    process.env.HALLEUS_SHOP_TRUSTED_CLIENT_IP === 'nginx-overwrite-v1' &&
    typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32 &&
    Boolean(process.env.HALLEUS_SHOP_PRINT_ORIGINALS_DIR) &&
    Boolean(process.env.HALLEUS_SHOP_PRINT_ARCHIVE_ROOT);
}
