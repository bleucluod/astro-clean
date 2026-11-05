import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from './shop-print-handoff';
import { calculateShopStarAtlas } from './shop-sky-atlas';
import { calculateShopConstellationLines } from './shop-constellation-lines';
import { renderShopStarAtlasProofSvg } from './shop-sky-atlas-svg';

/** SVG/XML must not contain control codes or bidi override characters from customer text. */
function safePrintText(value: string, label: string, maxLength = 60): string {
  if (value.length > maxLength ||
      /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\ufeff\ufffe\uffff]/u.test(value) ||
      Array.from(value).some((character) => {
        const point = character.codePointAt(0)!;
        return point >= 0xd800 && point <= 0xdfff;
      })) {
    throw new ShopPrintHandoffError(`${label} برای نمایش روی طرح معتبر نیست.`, 422);
  }
  return value.trim();
}

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
  const names = safePrintText(print.personalization.names, 'نام');
  const message = safePrintText(print.personalization.message, 'پیام');
  const dateLabel = safePrintText(print.personalization.date, 'تاریخ');
  const timeLabel = safePrintText(print.personalization.time, 'زمان');
  const city = safePrintText(print.personalization.city, 'شهر', 100);
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
