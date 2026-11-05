import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from './shop-print-handoff';
import { safeShopArtworkText, xmlShopArtworkText } from './shop-artwork-text';
import { getShopPrintSpec } from './shop-print-spec';

// This exact image was derived from the already-present P03 gallery composition.
// Its 1024×1536 pixels are not sufficient for any approved 300-PPI size.
const proofAsset = 'assets/shop-print/p03-milky-way-proof-v1.webp';
const proofWidth = 1024;
const proofHeight = 1536;

function makeNightTextLayer(input: { names: string; message: string; date: string }) {
  const { names, message, date } = input;
  const nameSize = names.length > 35 ? 23 : names.length > 23 ? 29 : 36;
  const messageSize = message.length > 42 ? 17 : 23;
  const dateFont = 19;
  const text = (y: number, size: number, value: string) => value ?
    `<text x="512" y="${y}" font-family="Vazirmatn, 'Noto Naskh Arabic', sans-serif" font-size="${size}" direction="rtl" text-anchor="middle" fill="#f2f6fa" stroke="#09131b" stroke-opacity=".68" stroke-width="2.3" paint-order="stroke">${xmlShopArtworkText(value)}</text>` : '';
  const dateCaption = date ? `تاریخ ${date}` : '';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${proofWidth}" height="${proofHeight}" viewBox="0 0 ${proofWidth} ${proofHeight}">
  <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#09131b" stop-opacity="0"/><stop offset="1" stop-color="#09131b" stop-opacity=".9"/></linearGradient></defs>
  <rect x="0" y="1180" width="1024" height="356" fill="url(#fade)"/>
  ${text(1395, nameSize, names)}
  ${text(1440, messageSize, message)}
  ${text(1480, dateFont, dateCaption)}
  <text x="512" y="1521" font-family="sans-serif" font-size="10" text-anchor="middle" letter-spacing="1.1" fill="#b1c4d1" opacity=".85">ARTISTIC NIGHT-SKY PROOF · NOT APPROVED FOR PRINT</text>
</svg>`, 'utf8');
}

/**
 * Returns an ephemeral *low-resolution* PNG retaining the existing Milky Way
 * photo. It is artistic, not a historical astronomical reconstruction.
 * Nothing is written to a server archive or public filesystem.
 */
export async function buildPrivateShopNightArtworkProof(rawOrder: unknown, lineNumber: number) {
  const handoff = buildPrivateShopPrintHandoff(rawOrder);
  if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > handoff.prints.length) {
    throw new ShopPrintHandoffError('ردیف محصول چاپی معتبر نیست.', 422);
  }
  const print = handoff.prints[lineNumber - 1];
  if (print.productId !== 'p03') {
    throw new ShopPrintHandoffError('این پیش‌نمایش فقط برای تابلوی شبِ ما است.', 422);
  }
  const names = safeShopArtworkText(print.personalization.names, 'نام');
  const message = safeShopArtworkText(print.personalization.message, 'پیام');
  const date = safeShopArtworkText(print.personalization.date, 'تاریخ');

  const original = await readFile(join(process.cwd(), proofAsset));
  const metadata = await sharp(original).metadata();
  if (metadata.width !== proofWidth || metadata.height !== proofHeight || metadata.format !== 'webp' ||
      metadata.channels !== 3 || (metadata.space !== 'srgb' && metadata.space !== 'rgb')) {
    throw new ShopPrintHandoffError('منبع تصویری شبِ ما نیازمند بازبینی کیفیت است.', 422);
  }
  const composited = await sharp(original)
    .composite([{ input: makeNightTextLayer({ names, message, date }) }])
    .png().toBuffer();
  // Compositing adds an alpha channel even when the source has none. Flatten
  // that intermediate in-memory result for a predictable 3-channel RGB proof.
  const bytes = await sharp(composited).flatten({ background: '#09131b' })
    .toColourspace('srgb').png().toBuffer();

  return {
    format: 'halleus.private.p03-night-proof.v1' as const,
    productId: 'p03' as const,
    orderNumber: handoff.orderNumber,
    lineNumber,
    quantity: print.quantity,
    sizeCm: print.sizeCm,
    nativePixels: { width: proofWidth, height: proofHeight },
    minimumNativePixels: getShopPrintSpec(print.sizeCm).minimumNativePixels,
    claim: 'artistic-milky-way-scene-not-time-location-reconstruction' as const,
    documentKind: 'ephemeral-private-personalized-proof-not-print-ready' as const,
    printArtworkReady: false as const,
    retainedOnServer: false as const,
    bytes,
  };
}
