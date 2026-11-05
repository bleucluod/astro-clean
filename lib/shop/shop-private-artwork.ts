import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from './shop-print-handoff';
import { calculateShopStarAtlas } from './shop-sky-atlas';
import { calculateShopConstellationLines } from './shop-constellation-lines';
import { renderShopStarAtlasProofSvg } from './shop-sky-atlas-svg';
import { safeShopArtworkText } from './shop-artwork-text';

/**
 * Deterministic, ephemeral and owner-only *proof* generation from verified order data.
 * Never put the resulting SVG (which contains private names/messages) in Git,
 * a public/static folder, or an automatically retained server archive.
 * Fonts, bleed, embedded color profile, layout and lab approval are still pending.
 */
export function buildPrivateShopSkyArtworkProof(rawOrder: unknown, lineNumber: number) {
  const handoff = buildPrivateShopPrintHandoff(rawOrder);
  if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > handoff.prints.length) {
    throw new ShopPrintHandoffError('ردیف محصول چاپی معتبر نیست.', 422);
  }
  const print = handoff.prints[lineNumber - 1];
  if (print.productId !== 'p02' || !print.birthSkyReference) {
    throw new ShopPrintHandoffError('پیش‌نمایش اختصاصی فعلاً فقط برای آسمان تولد آماده است.', 422);
  }
  const reference = print.birthSkyReference;
  const input = {
    referenceUtc: reference.referenceUtc,
    latitude: reference.latitude,
    longitude: reference.longitude,
  };
  const names = safeShopArtworkText(print.personalization.names, 'نام');
  const message = safeShopArtworkText(print.personalization.message, 'پیام');
  const dateLabel = safeShopArtworkText(print.personalization.date, 'تاریخ');
  const timeLabel = safeShopArtworkText(print.personalization.time, 'زمان');
  const city = safeShopArtworkText(print.personalization.city, 'شهر', 100);
  const atlas = calculateShopStarAtlas(input);
  const figures = calculateShopConstellationLines(input);
  const svg = renderShopStarAtlasProofSvg(atlas, city, figures, {
    names, message, dateLabel, timeLabel,
  });
  return {
    orderNumber: handoff.orderNumber,
    lineNumber,
    productId: 'p02' as const,
    sizeCm: print.sizeCm,
    quantity: print.quantity,
    referenceUtc: reference.referenceUtc,
    format: 'halleus.private.p02-sky-proof.v1' as const,
    documentKind: 'ephemeral-private-personalized-proof-not-print-ready' as const,
    printArtworkReady: false as const,
    retainedOnServer: false as const,
    svg,
  };
}
