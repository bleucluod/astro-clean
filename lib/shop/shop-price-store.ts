import { getAdminDatabase } from '@/lib/admin/admin-database';
import { getShopProductPrice, SHOP_SIZES, SHOP_P02_SIZES } from '@/components/shop/product-detail-data';

const productIds = ['p01', 'p02'] as const;
const sizes = ['10x15', '20x30', '30x45'] as const;
export type ShopPricedProduct = typeof productIds[number];
export type ShopPricedSize = typeof sizes[number];
export type ShopPriceMap = Record<string, number>;

export type ShopPriceRow = {
  productId: ShopPricedProduct;
  size: ShopPricedSize;
  label: string;
  basePriceToman: number;
  priceToman: number;
  overridePriceToman: number | null;
  expiresAt: string | null;
  revision: number;
};

export class ShopPriceInputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function isProduct(value: unknown): value is ShopPricedProduct {
  return value === 'p01' || value === 'p02';
}
function isSize(value: unknown): value is ShopPricedSize {
  return value === '10x15' || value === '20x30' || value === '30x45';
}
export function shopPriceKey(productId: string, size: string) {
  return productId + ':' + size;
}
function basePrice(productId: ShopPricedProduct, size: ShopPricedSize): number {
  const value = getShopProductPrice(productId, size);
  if (value === null) throw new Error('Shop catalog price unavailable.');
  return value;
}
export function listBaseShopPrices(): ShopPriceRow[] {
  return productIds.flatMap(productId => sizes.map(size => ({
    productId, size,
    label: (productId === 'p01' ? SHOP_SIZES : SHOP_P02_SIZES)
      .find(row => row.dimension === size)?.label ?? size,
    basePriceToman: basePrice(productId, size),
    priceToman: basePrice(productId, size),
    overridePriceToman: null, expiresAt: null, revision: 0,
  })));
}

/** The clock lives in PostgreSQL; expiry takes effect with no cron or redeploy. */
export async function readShopPriceCatalog(): Promise<{ rows: ShopPriceRow[]; prices: ShopPriceMap }> {
  const sql = getAdminDatabase();
  const records = await sql`
    select product_id, size, price_toman, revision,
      expires_at::text as expires_at,
      (expires_at is null or expires_at > clock_timestamp()) as active
    from halleus_private.shop_price_overrides
  `;
  const stored = new Map(records.map(row => [shopPriceKey(String(row.product_id), String(row.size)), row]));
  const rows = listBaseShopPrices().map(base => {
    const storedRow = stored.get(shopPriceKey(base.productId, base.size));
    if (!storedRow) return base;
    const active = storedRow.active === true;
    const price = Number(storedRow.price_toman);
    const revision = Number(storedRow.revision);
    if (!Number.isSafeInteger(price) || price < 1000 || price > 10_000_000
      || !Number.isSafeInteger(revision) || revision < 1) {
      throw new Error('Private shop pricing ledger is invalid.');
    }
    return {
      ...base, priceToman: active ? price : base.basePriceToman,
      overridePriceToman: active ? price : null,
      expiresAt: active && storedRow.expires_at ? new Date(storedRow.expires_at).toISOString() : null,
      revision,
    };
  });
  const prices = Object.fromEntries(rows.map(row => [shopPriceKey(row.productId, row.size), row.priceToman]));
  return { rows, prices };
}

/** Prices must come from this same DB-backed snapshot for quotes AND order creation. */
export function assertShopPriceMap(prices: ShopPriceMap): void {
  for (const row of listBaseShopPrices()) {
    const value = prices[shopPriceKey(row.productId, row.size)];
    if (!Number.isSafeInteger(value) || value < 1000 || value > 10_000_000) {
      throw new Error('Shop pricing snapshot incomplete.');
    }
  }
}

export async function editShopPrice(input: {
  actorUserId: string;
  productId: unknown;
  size: unknown;
  expectedRevision: unknown;
  action: unknown;
  priceToman?: unknown;
  expiresInMinutes?: unknown;
}): Promise<void> {
  if (!isProduct(input.productId) || !isSize(input.size)
    || !Number.isInteger(input.expectedRevision) || Number(input.expectedRevision) < 0
    || input.action !== 'set' && input.action !== 'reset'
    || typeof input.actorUserId !== 'string'
    || !/^[0-9a-f-]{36}$/i.test(input.actorUserId)) {
    throw new ShopPriceInputError('مشخصات تغییر قیمت معتبر نیست.');
  }
  const expectedRevision = Number(input.expectedRevision);
  const productId = input.productId;
  const size = input.size;
  const action = input.action;
  if (input.action === 'set'
    && (!Number.isSafeInteger(input.priceToman) || Number(input.priceToman) < 1000
      || Number(input.priceToman) > 10_000_000
      || ![0, 15, 30, 60, 120, 240].includes(Number(input.expiresInMinutes)))) {
    throw new ShopPriceInputError('قیمت یا مدت اعتبار معتبر نیست.');
  }

  const sql = getAdminDatabase();
  try {
    await sql.begin(async tx => {
      const existing = await tx`
        select price_toman, revision from halleus_private.shop_price_overrides
        where product_id = ${productId} and size = ${size} for update
      `;
      const actualRevision = existing[0] ? Number(existing[0].revision) : 0;
      if (actualRevision !== expectedRevision) {
        throw new ShopPriceInputError('قیمت هم‌زمان تغییر کرده؛ صفحه را تازه‌سازی کن.', 409);
      }
      const oldPrice = existing[0] ? Number(existing[0].price_toman) : null;
      if (input.action === 'reset') {
        if (existing.length) {
          await tx`delete from halleus_private.shop_price_overrides
            where product_id = ${productId} and size = ${size}`;
        }
      } else {
        const price = Number(input.priceToman);
        const minutes = Number(input.expiresInMinutes);
        if (existing.length) {
          await tx`
            update halleus_private.shop_price_overrides
            set price_toman = ${price},
                expires_at = case when ${minutes}::integer = 0 then null
                  else clock_timestamp() + ${minutes}::integer * interval '1 minute' end,
                revision = revision + 1, updated_by = ${input.actorUserId}::uuid,
                updated_at = clock_timestamp()
            where product_id = ${productId} and size = ${size}
          `;
        } else {
          await tx`
            insert into halleus_private.shop_price_overrides
              (product_id, size, price_toman, expires_at, updated_by)
            values (${productId}, ${size}, ${price},
              case when ${minutes}::integer = 0 then null
                else clock_timestamp() + ${minutes}::integer * interval '1 minute' end,
              ${input.actorUserId}::uuid)
          `;
        }
      }
      await tx`
        insert into halleus_private.shop_price_change_events
          (product_id, size, actor_user_id, action, before_price_toman, after_price_toman, expires_at)
        values (${productId}, ${size}, ${input.actorUserId}::uuid,
          ${action}, ${oldPrice}, ${input.action === 'set' ? Number(input.priceToman) : null},
          case when ${action} = 'set' and ${Number(input.expiresInMinutes ?? 0)}::integer > 0
            then clock_timestamp() + ${Number(input.expiresInMinutes ?? 0)}::integer * interval '1 minute'
            else null end)
      `;
    });
  } catch (error) {
    if (error instanceof ShopPriceInputError) throw error;
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === '23505') {
      throw new ShopPriceInputError('قیمت هم‌زمان تغییر کرده؛ صفحه را تازه‌سازی کن.', 409);
    }
    throw error;
  }
}
