import { buildShopMoonPhaseArtworkProof } from './shop-moon-artwork';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from './shop-print-handoff';
import { getShopPrintSpec } from './shop-print-spec';

/** An ephemeral, owner-only P01 proof. Its site texture is not a print master. */
export async function buildPrivateShopMoonArtworkProof(rawOrder: unknown, lineNumber: number) {
  const handoff = buildPrivateShopPrintHandoff(rawOrder);
  if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > handoff.prints.length) {
    throw new ShopPrintHandoffError('ردیف محصول چاپی معتبر نیست.', 422);
  }
  const print = handoff.prints[lineNumber - 1];
  if (print.productId !== 'p01' || !print.moonReference) {
    throw new ShopPrintHandoffError('این پیش‌نمایش فقط برای ماه آن روز است.', 422);
  }
  if (print.moonReference.source !== 'local-noon-asia-tehran') {
    throw new ShopPrintHandoffError('مرجع زمانی ماه آن روز معتبر نیست.', 422);
  }
  const proof = await buildShopMoonPhaseArtworkProof({
    referenceUtc: print.moonReference.referenceUtc,
    names: print.personalization.names,
    message: print.personalization.message,
    dateLabel: print.personalization.date,
  });
  return {
    format: 'halleus.private.p01-moon-proof.v1' as const,
    productId: 'p01' as const,
    orderNumber: handoff.orderNumber,
    lineNumber,
    quantity: print.quantity,
    sizeCm: print.sizeCm,
    referenceUtc: proof.referenceUtc,
    illuminatedFraction: proof.illuminatedFraction,
    phase: proof.phase,
    nativePixels: proof.nativePixels,
    minimumNativePixels: getShopPrintSpec(print.sizeCm).minimumNativePixels,
    source: 'existing-site-texture-not-cleared-native-master' as const,
    documentKind: 'ephemeral-private-personalized-proof-not-print-ready' as const,
    printArtworkReady: false as const,
    retainedOnServer: false as const,
    bytes: proof.bytes,
  };
}
