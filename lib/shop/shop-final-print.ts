import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
import { normalizePersianDigits } from '@/lib/date/jalali';
import { calculateShopStarAtlas } from './shop-sky-atlas';
import { calculateShopConstellationLines } from './shop-constellation-lines';
import { calculateShopMoonAtUtc, type ShopMoonEphemeris } from './shop-moon-ephemeris';
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

function makeSkySvg(width: number, height: number, atlas: ReturnType<typeof calculateShopStarAtlas>,
  figures: ReturnType<typeof calculateShopConstellationLines>, inset: number): Buffer {
  if (atlas.referenceUtc !== figures.referenceUtc || atlas.latitude !== figures.latitude ||
      atlas.longitude !== figures.longitude) throw new Error('Mismatched sky geometry.');
  const cx = width / 2;
  const cy = height * 0.425;
  const r = Math.min(width * 0.385, cx - inset - 4, cy - inset - 4);
  const stars = atlas.aboveHorizonStars.map((star) => {
    const x = (cx + star.x * r).toFixed(2);
    const y = (cy + star.y * r).toFixed(2);
    const dot = Math.min(3.5, Math.max(0.9, 1.65 * Math.pow(10, (2.3 - star.visualMagnitude) / 8)));
    return `<circle cx="${x}" cy="${y}" r="${dot.toFixed(2)}" fill="#e6eff6" opacity=".88"/>`;
  }).join('');
  const figuresSvg = figures.lines.map((line) => {
    const d = line.points.map((point, i) => `${i ? 'L' : 'M'} ${(cx + point.x * r).toFixed(2)} ${(cy + point.y * r).toFixed(2)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="#93b4c8" stroke-opacity="${line.rank === 1 ? '.62' : '.38'}" stroke-width="${Math.max(0.7, width / 1100).toFixed(2)}"/>`;
  }).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="night" cx="50%" cy="43%" r="85%"><stop stop-color="#27384b"/><stop offset="1" stop-color="#101c2a"/></radialGradient>
      <clipPath id="disc"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
    <rect width="${width}" height="${height}" fill="url(#night)"/>
    <g stroke="#acc8d7" fill="none" stroke-width="${Math.max(0.8, width / 1200).toFixed(2)}" opacity=".55"><circle cx="${cx}" cy="${cy}" r="${r}"/></g>
    <g clip-path="url(#disc)">${figuresSvg}${stars}</g>
  </svg>`, 'utf8');
}

function makePhotoFade(width: number, height: number): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#09131b" stop-opacity="0"/>
      <stop offset="1" stop-color="#09131b" stop-opacity=".94"/></linearGradient></defs>
    <rect y="${Math.floor(height * .68)}" width="${width}" height="${Math.ceil(height * .32)}" fill="url(#fade)"/>
  </svg>`, 'utf8');
}

/** Orthographic near-side projection of the source's 0°-centered lunar map. */
async function projectMoonMapToDisc(map: ShopSourceMaster, diameter: number): Promise<Buffer> {
  const metadata = await inspectOriginal(map, diameter * 2, diameter);
  if (Math.abs(metadata.width! / metadata.height! - 2) > .005 || metadata.depth !== 'uchar') {
    throw new ShopPrintHandoffError('نقشهٔ اصلی ماه باید RGB هشت‌بیتی با نسبت ۲ به ۱ باشد.', 422);
  }
  const { data, info } = await sharp(map.bytes, { limitInputPixels: 200_000_000 })
    .raw().toBuffer({ resolveWithObject: true });
  const result = Buffer.alloc(diameter * diameter * 3);
  const radius = diameter / 2;
  for (let py = 0; py < diameter; py += 1) {
    const north = (radius - py - .5) / radius;
    for (let px = 0; px < diameter; px += 1) {
      const east = (px + .5 - radius) / radius;
      const squared = east * east + north * north;
      if (squared >= 1) continue;
      const longitude = Math.atan2(east, Math.sqrt(1 - squared));
      const latitude = Math.asin(north);
      const sourceX = (longitude / (2 * Math.PI) + .5) * info.width - .5;
      const sourceY = (0.5 - latitude / Math.PI) * info.height - .5;
      const x0 = Math.max(0, Math.min(info.width - 2, Math.floor(sourceX)));
      const y0 = Math.max(0, Math.min(info.height - 2, Math.floor(sourceY)));
      const fx = Math.max(0, Math.min(1, sourceX - x0));
      const fy = Math.max(0, Math.min(1, sourceY - y0));
      const one = (y0 * info.width + x0) * 3;
      const out = (py * diameter + px) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        const upper = data[one + channel] * (1 - fx) + data[one + channel + 3] * fx;
        const lower = data[one + channel + info.width * 3] * (1 - fx) +
          data[one + channel + info.width * 3 + 3] * fx;
        result[out + channel] = Math.round(upper * (1 - fy) + lower * fy);
      }
    }
  }
  return sharp(result, { raw: { width: diameter, height: diameter, channels: 3 } }).png().toBuffer();
}

/** HALLEUS_P01_NATURAL_MOON_MASTER_V1 */
export function formatShopP01DisplayDate(value: string, calendar: string): string {
  if (calendar !== 'jalali') return value;
  const normalized = normalizePersianDigits(value).replaceAll('/', '-');
  const parts = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (!parts) return value;
  const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const month = Number(parts[2]);
  if (month < 1 || month > 12) return value;
  const localDigits = (v: string) => v.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  return `${localDigits(String(Number(parts[3])))} ${months[month - 1]} ${localDigits(parts[1])}`;
}

/** Orthographic sphere lighting from the illuminated fraction. North-up phase
 * presentation, not a reconstruction of observer tilt, libration or earthshine.
 */
async function shadeShopMoonDisc(texture: Buffer, diameter: number, phase: ShopMoonEphemeris): Promise<Buffer> {
  const { data, info } = await sharp(texture).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== diameter || info.height !== diameter || info.channels !== 4) {
    throw new Error('Unexpected projected moon texture dimensions.');
  }
  const output = Buffer.alloc(diameter * diameter * 4);
  const radius = diameter / 2;
  const cosPhase = Math.max(-1, Math.min(1, 2 * phase.illuminatedFraction - 1));
  const sunX = (phase.phaseAngleDegrees <= 180 ? 1 : -1) *
    Math.sqrt(Math.max(0, 1 - cosPhase * cosPhase));
  for (let y = 0; y < diameter; y += 1) {
    const north = (radius - y - .5) / radius;
    for (let x = 0; x < diameter; x += 1) {
      const east = (x + .5 - radius) / radius;
      const squared = east * east + north * north;
      if (squared >= 1) continue;
      const normalZ = Math.sqrt(1 - squared);
      const incidence = Math.max(0, east * sunX + normalZ * cosPhase);
      const exposure = .003 + .92 * Math.pow(incidence, .62);
      const edge = Math.max(0, Math.min(1, (1 - Math.sqrt(squared)) * radius + .15));
      const index = (y * diameter + x) * 4;
      output[index] = Math.round(data[index] * exposure);
      output[index + 1] = Math.round(data[index + 1] * exposure);
      output[index + 2] = Math.round(data[index + 2] * exposure);
      output[index + 3] = Math.round(edge * 255);
    }
  }
  return sharp(output, { raw: { width: diameter, height: diameter, channels: 4 } })
    .png().toBuffer();
}

/** Sparse decorative stars; this is not a reconstructed birth sky. */
function makeShopMoonSky(width: number, height: number): Buffer {
  const points = [
    [.09, .11, .48], [.24, .08, .28], [.46, .13, .34], [.74, .06, .32], [.89, .16, .50],
    [.12, .29, .34], [.82, .25, .43], [.94, .36, .26], [.07, .48, .45], [.89, .55, .25],
    [.13, .64, .25], [.30, .59, .24], [.79, .64, .29], [.92, .73, .29], [.08, .80, .22],
    [.21, .89, .20], [.78, .86, .23], [.90, .94, .16], [.46, .05, .17], [.61, .71, .22],
  ];
  const stars = points.map(([x, y, opacity], index) =>
    `<circle cx="${(x * width).toFixed(1)}" cy="${(y * height).toFixed(1)}" r="${(width * (index % 5 === 0 ? .00048 : .00032)).toFixed(2)}" fill="#dbe7f1" opacity="${opacity}"/>`
  ).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="night" cx="50%" cy="38%" r="86%">
      <stop stop-color="#202e3c"/><stop offset=".68" stop-color="#14212f"/>
      <stop offset="1" stop-color="#0d1823"/>
    </radialGradient></defs><rect width="${width}" height="${height}" fill="url(#night)"/>
    ${stars}
  </svg>`, 'utf8');
}

async function makeMoonBackground(
  width: number, height: number, moon: ShopSourceMaster, phase: ShopMoonEphemeris,
  originalKind: 'disc' | 'equirectangular-map',
) {
  const disc = Math.floor(width * .69);
  let moonDisc: Buffer;
  if (originalKind === 'equirectangular-map') {
    moonDisc = await projectMoonMapToDisc(moon, disc);
  } else {
    const metadata = await inspectOriginal(moon, disc, disc);
    const side = Math.min(metadata.width!, metadata.height!);
    const left = Math.floor((metadata.width! - side) / 2);
    const top = Math.floor((metadata.height! - side) / 2);
    moonDisc = await sharp(moon.bytes).extract({ left, top, width: side, height: side })
      .resize(disc, disc).png().toBuffer();
  }
  const shaded = await shadeShopMoonDisc(moonDisc, disc, phase);
  const xy = { left: Math.floor((width - disc) / 2), top: Math.floor(height * .42 - disc / 2) };
  return sharp(makeShopMoonSky(width, height)).composite([{ input: shaded, ...xy }]).png().toBuffer();
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
    background = makeSkySvg(width, height, calculateShopStarAtlas(input), calculateShopConstellationLines(input), inset);
  } else if (item.productId === 'p01') {
    const reference = item.moonReference;
    if (!reference) throw new ShopPrintHandoffError('مرجع ماه آن روز ناقص است.', 422);
    if (sources.moonDisc && sources.moonMap) {
      throw new ShopPrintHandoffError('فقط یک نوع منبع تصویری ماه مجاز است.', 422);
    }
    const master = sources.moonMap ?? sources.moonDisc;
    if (!master) throw new ShopPrintHandoffError('تصویر اصلی ماه برای چاپ تأمین نشده است.', 409);
    const phase = calculateShopMoonAtUtc(reference.referenceUtc);
    background = await makeMoonBackground(width, height, master, phase,
      sources.moonMap ? 'equirectangular-map' : 'disc');
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
  // P01 visual contract: name, Persian date, optional message and HALLEUS.
  // 20x30cm is the design anchor; smaller sizes retain minimum type size.
  const p01Scale = width / Math.ceil(20 / 2.54 * 300);
  const p01PointSize = (targetPt: number, minimumPt: number) =>
    Math.round(Math.max(targetPt * p01Scale, minimumPt) * 300 / 72);
  const brandBoxHeight = Math.floor(height * .031);
  const p01TextLines: TextLine[] = [
    { text: names, top: height * .704, height: height * .140,
      fontPx: p01PointSize(72, 24), color: '#E7EDF4' },
    { text: printDate, top: height * (message ? .824 : .842), height: height * .060,
      fontPx: p01PointSize(18, 11), color: '#AAB9C9' },
    { text: message, top: height * (p01Scale < .8 ? .882 : .892), height: height * .050,
      fontPx: p01PointSize(14, 9), color: '#B7C6D5' },
    { text: 'H A L L E U S', top: height - inset - brandBoxHeight,
      height: brandBoxHeight, fontPx: p01PointSize(9, 7), color: '#8196AA' },
  ];
  const genericTextLines: TextLine[] = [
    { text: names, top: height * .79, height: height * .06, fontPx: width * .04 },
    { text: message, top: height * .857, height: height * .05, fontPx: width * .029 },
    { text: dateTimeCity, top: height * .915, height: height * .043, fontPx: width * .023, color: '#c4d4df' },
  ];
  const textLayers = await renderTextLayers(width, height, inset,
    item.productId === 'p01' ? p01TextLines : genericTextLines);
  const compositing = isPhoto
    ? [{ input: makePhotoFade(width, height) }, ...textLayers]
    : textLayers;
  const jpeg = await sharp(background).composite(compositing)
    .flatten({ background: '#101821' }).toColourspace('srgb')
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
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
