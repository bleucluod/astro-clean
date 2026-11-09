import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildShopP01R9bArtwork } from './shop-p01-r9b-master';
import { normalizePersianDigits } from '@/lib/date/jalali';
import { renderShopP02R9NativeJpeg } from './shop-p02-r9-native-print';
import { findHalleusCityById, getHalleusCityDisplayName } from '@/lib/locations/cities';
import { calculateShopMoonAtUtc } from './shop-moon-ephemeris';
import { safeShopArtworkText, xmlShopArtworkText } from './shop-artwork-text';
import { buildPrivateShopPrintHandoff, ShopPrintHandoffError } from './shop-print-handoff';
import { getShopPrintSpec } from './shop-print-spec';

export type ShopSourceMaster = {
  bytes: Buffer;
  sha256: string;
  creator: string;
  sourceUrl: string;
  license: string;
  attribution?: string;
  rightsConfirmed: boolean;
};

export type ShopFinalPrintSources = {
  moonDisc?: ShopSourceMaster;
  moonMap?: ShopSourceMaster;
  milkyWayPhoto?: ShopSourceMaster;
};

type TextLine = { text: string; top: number; height: number; fontPx: number; color?: string };
type RasterOverlay = { input: Buffer; left?: number; top?: number };

const fontfile = join(process.cwd(), 'app/fonts/vazirmatn/Vazirmatn-Variable.woff2');

/** Render personal text with bundled Vazirmatn, without a server-installed font dependency. */
async function renderTextLayers(
  width: number, height: number, inset: number, lines: TextLine[],
): Promise<RasterOverlay[]> {
  const layers: RasterOverlay[] = [];
  for (const line of lines) {
    if (!line.text) continue;
    const maxWidth = width - 2 * inset;
    const maxHeight = Math.floor(line.height);
    const textImage = await sharp({
      text: {
        text: `<span foreground="${line.color ?? '#edf3f7'}">${xmlShopArtworkText(line.text)}</span>`,
        font: `Vazirmatn ${Math.floor(line.fontPx)}`,
        fontfile,
        width: maxWidth,
        align: 'center',
        rgba: true,
      },
    }).png().toBuffer();
    const info = await sharp(textImage).metadata();
    if (!info.width || !info.height || info.width > maxWidth || info.height > maxHeight) {
      throw new ShopPrintHandoffError('نوشتهٔ شخصی برای حاشیهٔ امن چاپ مناسب نیست.', 422);
    }
    const top = Math.floor(line.top + (maxHeight - info.height) / 2);
    if (top < inset || top + info.height > height - inset) {
      throw new ShopPrintHandoffError('نوشته در حاشیهٔ امن چاپ قرار نمی‌گیرد.', 422);
    }
    layers.push({ input: textImage, left: Math.floor((width - info.width) / 2), top });
  }
  return layers;
}

async function inspectOriginal(master: ShopSourceMaster | undefined, neededWidth: number, neededHeight: number) {
  if (!master || !Buffer.isBuffer(master.bytes) || master.bytes.length > 300_000_000 ||
      !/^[a-f0-9]{64}$/i.test(master.sha256) || !master.rightsConfirmed ||
      !master.creator.trim() || !/^https:\/\//.test(master.sourceUrl) || !master.license.trim()) {
    throw new ShopPrintHandoffError('منبع اصلی و مجوز استفادهٔ تصویر چاپی هنوز تأیید نشده است.', 409);
  }
  const actualHash = createHash('sha256').update(master.bytes).digest('hex');
  if (actualHash !== master.sha256.toLowerCase()) {
    throw new ShopPrintHandoffError('اثر انگشت منبع اصلی تصویر چاپی معتبر نیست.', 422);
  }
  const metadata = await sharp(master.bytes, { limitInputPixels: 200_000_000 }).metadata();
  if (!metadata.width || !metadata.height || metadata.width < neededWidth ||
      metadata.height < neededHeight || metadata.channels !== 3 ||
      metadata.space !== 'srgb' || !['jpeg', 'png', 'tiff', 'webp'].includes(metadata.format ?? '')) {
    throw new ShopPrintHandoffError('تصویر اصلی برای ابعاد واقعی و رنگ RGB چاپ کافی نیست.', 422);
  }
  return metadata;
}

function makePhotoFade(width: number, height: number): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#09131b" stop-opacity="0"/>
      <stop offset="1" stop-color="#09131b" stop-opacity=".94"/></linearGradient></defs>
    <rect y="${Math.floor(height * .68)}" width="${width}" height="${Math.ceil(height * .32)}" fill="url(#fade)"/>
  </svg>`, 'utf8');
}

/** Render P01 dates in explicit year/month/day order without affecting astronomy. */
export function formatShopP01DisplayDate(value: string, calendar: string): string {
  if (calendar !== 'jalali' && calendar !== 'gregorian') return value;
  const normalized = normalizePersianDigits(value).replaceAll('/', '-');
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (!match) return value;
  return `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
}

/**
 * Owner-only ephemeral 300-PPI JPEG *candidate*, not a printer-approved master.
 * The caller must provide separately vetted native P01/P03 source bytes; gallery
 * previews, P01 1152px site texture and P03 1024px proof are never substituted.
 */
export async function buildPrivateShopFinalPrintCandidate(
  rawOrder: unknown, lineNumber: number, sources: ShopFinalPrintSources = {},
) {
  const handoff = buildPrivateShopPrintHandoff(rawOrder);
  if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > handoff.prints.length) {
    throw new ShopPrintHandoffError('ردیف محصول چاپی معتبر نیست.', 422);
  }
  const item = handoff.prints[lineNumber - 1];
  const spec = getShopPrintSpec(item.sizeCm);
  const width = spec.minimumNativePixels.width;
  const height = spec.minimumNativePixels.height;
  const inset = spec.minimumSafeInsetPixels;
  const personal = item.personalization;
  const names = safeShopArtworkText(personal.names, 'نام');
  const message = safeShopArtworkText(personal.message, 'پیام');
  const date = safeShopArtworkText(personal.date, 'تاریخ');
  const printDate = item.productId === 'p01' ? formatShopP01DisplayDate(date, personal.calendar) : date;
  const dateTimeCity = item.productId === 'p02'
    ? [date, safeShopArtworkText(personal.time, 'زمان'), safeShopArtworkText(personal.city, 'شهر', 100)]
      .filter(Boolean).join(' · ')
    : date;
  let background: Buffer;
  let sourceManifest: {
    creator: string; sourceUrl: string; license: string; sha256: string; attribution: string;
  } | null = null;

  if (item.productId === 'p02') {
    const reference = item.birthSkyReference;
    if (!reference) throw new ShopPrintHandoffError('مرجع آسمان تولد ناقص است.', 422);
    const input = { referenceUtc: reference.referenceUtc, latitude: reference.latitude, longitude: reference.longitude };
    const city = findHalleusCityById(reference.cityId);
    if (!city) throw new ShopPrintHandoffError('شهر سفارش برای فایل چاپ معتبر نیست.', 422);
    background = await renderShopP02R9NativeJpeg({
      reference: input, width, height, numerals: personal.calendar === 'jalali' ? 'fa' : 'en',
      details: { names, message, date, time: safeShopArtworkText(personal.time, 'زمان'),
        city: getHalleusCityDisplayName(city) },
    });
  } else if (item.productId === 'p01') {
    const reference = item.moonReference;
    if (!reference) throw new ShopPrintHandoffError('مرجع ماه آن روز ناقص است.', 422);
    if (sources.moonDisc && sources.moonMap) {
      throw new ShopPrintHandoffError('فقط یک نوع منبع تصویری ماه مجاز است.', 422);
    }
    const master = sources.moonMap ?? sources.moonDisc;
    if (!master) throw new ShopPrintHandoffError('تصویر اصلی ماه برای چاپ تأمین نشده است.', 409);
    const phase = calculateShopMoonAtUtc(reference.referenceUtc);
    const moonDiameter = Math.floor(width * .70);
    await inspectOriginal(master, sources.moonMap ? moonDiameter * 2 : moonDiameter, moonDiameter);
    // HALLEUS_P01_R9B_ACTIVE: renderer is offline-only; V1 manual ZIP workflow remains unchanged.
    background = await buildShopP01R9bArtwork({
      width, height, safeInsetPx: inset, moonBytes: master.bytes,
      sourceKind: sources.moonMap ? 'equirectangular-map' : 'disc',
      illuminatedFraction: phase.illuminatedFraction,
      waxing: phase.phaseAngleDegrees <= 180,
      name: names, dateLabel: printDate,
      city: safeShopArtworkText(personal.city, 'شهر', 100), message,
    });
    sourceManifest = { creator: master.creator, sourceUrl: master.sourceUrl, license: master.license,
      sha256: master.sha256, attribution: master.attribution ?? master.creator };
  } else {
    const master = sources.milkyWayPhoto;
    if (!master) throw new ShopPrintHandoffError('عکس اصلی راه شیری برای چاپ تأمین نشده است.', 409);
    await inspectOriginal(master, width, height);
    background = await sharp(master.bytes).resize(width, height, { fit: 'cover', position: 'centre', withoutEnlargement: true })
      .toColourspace('srgb').png().toBuffer();
    sourceManifest = { creator: master.creator, sourceUrl: master.sourceUrl, license: master.license,
      sha256: master.sha256, attribution: master.attribution ?? master.creator };
  }

  const isPhoto = item.productId === 'p03';
  // The approved P01 master already includes its own typography. Do not overlay it twice.
  const textLayers = item.productId === 'p01' || item.productId === 'p02' ? [] : await renderTextLayers(width, height, inset, [
    { text: names, top: height * .79, height: height * .06, fontPx: width * .04 },
    { text: message, top: height * .857, height: height * .05, fontPx: width * .029 },
    { text: dateTimeCity, top: height * .915, height: height * .043, fontPx: width * .023, color: '#c4d4df' },
  ]);
  const compositing = isPhoto
    ? [{ input: makePhotoFade(width, height) }, ...textLayers]
    : textLayers;
  // P02 native R9 already produced the final 300ppi sRGB JPEG. Re-encoding
  // its full-size pixels again doubled peak memory and introduced generation
  // loss on larger posters. P01/P03 keep their existing compositing contract.
  const jpeg = item.productId === 'p02' ? background : await sharp(background).composite(compositing)
    .flatten({ background: '#101821' }).toColourspace('srgb')
    .jpeg({ quality: item.productId === 'p01' ? 96 : 94, chromaSubsampling: '4:4:4' })
    .withMetadata({ density: 300, icc: 'srgb' }).toBuffer();
  const output = await sharp(jpeg).metadata();
  if (output.format !== 'jpeg' || output.width !== width || output.height !== height ||
      output.channels !== 3 || output.space !== 'srgb' ||
      output.density !== 300 || !output.hasProfile) {
    throw new ShopPrintHandoffError('اعتبارسنجی خروجی JPG/RGB/300ppi ناموفق بود.', 422);
  }
  return {
    orderNumber: handoff.orderNumber, lineNumber, productId: item.productId,
    sizeCm: spec.sizeCm, quantity: item.quantity, targetPpi: 300 as const,
    finalFormat: 'JPEG' as const, colorMode: 'RGB' as const,
    nativePixels: { width, height }, safeAreaMm: 5 as const,
    sourceManifest,
    documentKind: 'private-native-jpeg-prepress-candidate-awaits-owner-lab-approval' as const,
    printArtworkReady: false as const, retainedOnServer: false as const,
    bytes: jpeg,
  };
}
