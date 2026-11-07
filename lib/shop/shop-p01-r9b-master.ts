import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/** Approved visual composition R9b, built from separate source sky, astronomical moon
 *  and native font text. No customer data is stored and the decorative sky is
 *  not claimed to reconstruct the sky on the selected date.
 */
export type ShopP01R9bInput = {
  width: number;
  height: number;
  safeInsetPx: number;
  moonBytes: Buffer;
  sourceKind: 'equirectangular-map' | 'disc';
  illuminatedFraction: number;
  waxing: boolean;
  name: string;
  dateLabel: string;
  city?: string;
  message: string;
};

const skyAsset = 'assets/shop-print/p01-r9b-approved-sky.webp';
const fontDir = 'assets/shop-print/fonts';
const approvedSkySha256 = 'aede59c9b2bf52a3755f9a788681e1a2a682f85347c51d5310c14b1e9ef565a2';
const exactMapSha256 = 'd1875bcec83588ca25e4802e576f6bb9f88b39e1e403cb41ff55867419c54796';

// Exposed so the review guard can verify source identity without retaining the map.
export const SHOP_P01_R9B_STYLE = {
  id: 'halleus.p01.r9b.approved-composition.v1',
  skyAsset,
  approvedSkySha256,
  preferredMapSha256: exactMapSha256,
  moonDiameterRatio: .70,
  moonCenterYRatio: .3515,
  narrative: 'decorative-stars-and-clouds-not-date-specific',
} as const;

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[ch]!);

const digitToPersian = (value: string) => value.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
/** Display Gregorian or Jalali dates as YEAR/MONTH/DAY, independent of surrounding RTL text. */
export function shopP01R9bPrintDate(rawDate: string, calendar: string): string {
  if (calendar !== 'jalali' && calendar !== 'gregorian') return rawDate;
  const normalized = rawDate.replace(/[۰-۹٠-٩]/g, (d) => {
    const fa = '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);
    return String(fa >= 0 ? fa : '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  }).replaceAll('/', '-');
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (!match) return rawDate;
  return `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
}

async function projectText(text: string, width: number, height: number,
  safeInsetPx: number, topFrac: number, sizeAt20cm: number, minSize: number,
  color: string, fontFile: string,
): Promise<{ input: Buffer; left: number; top: number } | null> {
  if (!text) return null;
  const maxWidth = width - safeInsetPx * 2;
  const fontSize = Math.min(sizeAt20cm * width / 2363, sizeAt20cm * height / 3544);
  let rendered: Buffer | undefined;
  let measured: { width?: number; height?: number } = {};
  const maxHeight = height * .056;
  for (let target = fontSize; target >= minSize * width / 2363; target *= .92) {
    const image = await sharp({
      text: {
        text: `<span foreground="${color}">${escapeXml(text)}</span>`,
        font: `Estedad ${Math.max(8, Math.round(target))}`,
        fontfile: join(process.cwd(), fontDir, fontFile),
        width: maxWidth, align: 'center', rgba: true,
      },
    }).png().toBuffer();
    const meta = await sharp(image).metadata();
    if (meta.width && meta.height && meta.width <= maxWidth && meta.height <= maxHeight && meta.height <= Math.ceil(target * 1.5)) {
      rendered = image;
      measured = meta;
      break;
    }
  }
  if (!rendered || !measured.width || !measured.height) {
    throw new Error('P01 personalized text cannot fit the approved visual safe area.');
  }
  const top = Math.round(height * topFrac - measured.height / 2);
  if (top < safeInsetPx || top + measured.height > height - safeInsetPx) {
    throw new Error('P01 typography violates the print safe area.');
  }
  return { input: rendered, left: Math.floor((width - measured.width) / 2), top };
}

/** Render a real projected Moon; view is illustrative north-up with phase on correct side.
 * The equirectangular texture is real, but local libration is not reconstructed.
 */
async function projectMoon(input: ShopP01R9bInput, diameter: number): Promise<Buffer> {
  const raw = input.sourceKind === 'disc'
    ? await sharp(input.moonBytes).resize(diameter, diameter, { fit: 'cover' })
      .removeAlpha().raw().toBuffer({ resolveWithObject: true })
    : await sharp(input.moonBytes, { limitInputPixels: 200_000_000 })
      .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  if (info.channels !== 3 || (input.sourceKind === 'equirectangular-map' &&
      Math.abs(info.width / info.height - 2) > .005)) {
    throw new Error('P01 source has unexpected RGB or aspect-ratio geometry.');
  }
  const result = Buffer.alloc(diameter * diameter * 4);
  const radius = diameter / 2;
  const cosPhase = Math.max(-1, Math.min(1, 2 * input.illuminatedFraction - 1));
  const sunX = (input.waxing ? 1 : -1) * Math.sqrt(Math.max(0, 1 - cosPhase ** 2));
  for (let py = 0; py < diameter; py++) {
    const north = (radius - py - .5) / radius;
    for (let px = 0; px < diameter; px++) {
      const east = (px + .5 - radius) / radius;
      const rho2 = east * east + north * north;
      if (rho2 >= 1) continue;
      const z = Math.sqrt(1 - rho2);
      const incidence = Math.max(0, east * sunX + z * cosPhase);
      const limb = .84 + .16 * Math.sqrt(z);
      // Calibrated from the approved R9b master, without a pasted-on shadow mask.
      const light = .080 + .68 * Math.pow(incidence, .43) * limb;
      const lightSide = (input.waxing ? east : -east);
      const grade = Math.min(1.15, Math.max(.55, .1815 + 1.613 * lightSide -
        .687 * lightSide * lightSide + .319 * north * north));
      const out = (py * diameter + px) * 4;
      let luminosity = 0;
      let tone: number;
      if (input.sourceKind === 'equirectangular-map') {
        const longitude = Math.atan2(east, z);
        const latitude = Math.asin(north);
        const sourceX = (longitude / (Math.PI * 2) + .5) * info.width - .5;
        const sourceY = (.5 - latitude / Math.PI) * info.height - .5;
        const sx = Math.max(0, Math.min(info.width - 2, Math.floor(sourceX)));
        const sy = Math.max(0, Math.min(info.height - 2, Math.floor(sourceY)));
        const dx = Math.max(0, Math.min(1, sourceX - sx));
        const dy = Math.max(0, Math.min(1, sourceY - sy));
        const k = (sy * info.width + sx) * 3;
        luminosity = 0;
        for (let c = 0; c < 3; c++) {
          const top = data[k + c] * (1 - dx) + data[k + c + 3] * dx;
          const bottom = data[k + info.width * 3 + c] * (1 - dx) +
            data[k + info.width * 3 + c + 3] * dx;
          luminosity += (top * (1 - dy) + bottom * dy) * [.30, .59, .11][c];
        }
        tone = (.75 * luminosity + .25 * 185) * light;
      } else {
        const k = (py * diameter + px) * 3;
        luminosity = (.30 * data[k] + .59 * data[k + 1] + .11 * data[k + 2]);
        tone = luminosity * light;
      }
      // Earthshine-style near-black lunar hemisphere. Keep the actual sphere opaque
      // so decorative stars cannot shine through the dark side of the moon.
      // These subtle surface tones are an artistic grade, not a historic Earthshine measurement.
      const earthshine = 8.6 + 3.6 * z + 2.0 * east + .014 * (luminosity - 150);
      // Owner-approved B grade: lift the illuminated lunar surface only.
      // Dark-side earthshine, phase and decorative sky remain unchanged.
      const gradedTone = tone * grade * 1.14;
      const clamped = Math.max(0, Math.min(255, Math.max(gradedTone, earthshine)));
      result[out] = Math.round(clamped * 1.02);
      result[out + 1] = Math.round(clamped * 1.00);
      result[out + 2] = Math.round(clamped * .99);
      const limbCoverage = Math.min(1, Math.max(0, (1 - Math.sqrt(rho2)) * radius + .5));
      result[out + 3] = Math.round(255 * limbCoverage);
    }
  }
  return sharp(result, { raw: { width: diameter, height: diameter, channels: 4 } }).png().toBuffer();
}

export async function buildShopP01R9bArtwork(input: ShopP01R9bInput): Promise<Buffer> {
  if (input.width < 800 || input.height < 1000 ||
      !Number.isFinite(input.illuminatedFraction) || input.illuminatedFraction < 0 ||
      input.illuminatedFraction > 1 || !Buffer.isBuffer(input.moonBytes)) {
    throw new Error('Invalid P01 R9b print input.');
  }
  const sky = await readFile(join(process.cwd(), skyAsset));
  if (createHash('sha256').update(sky).digest('hex') !== approvedSkySha256) {
    throw new Error('P01 approved R9b sky artwork has changed unexpectedly.');
  }
  const diameter = Math.floor(input.width * SHOP_P01_R9B_STYLE.moonDiameterRatio);
  const moon = await projectMoon(input, diameter);
  const canvas = await sharp(sky).resize(input.width, input.height, { fit: 'fill' }).png().toBuffer();
  const canonical = input.dateLabel.replace(/[۰-۹٠-٩]/g, d => {
    const fa = '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);
    return String(fa >= 0 ? fa : '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  }).replaceAll('-', '/');
  const parsed = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(canonical);
  const datePrinted = parsed ? `\u2066${digitToPersian([parsed[1], parsed[2].padStart(2, '0'), parsed[3].padStart(2, '0')].join('/'))}\u2069` : input.dateLabel;
  // Independent centered lines: name above date, optional message below.
  // Empty fields do not leave blank placeholders; the stack recenters itself.
  const hasName = Boolean(input.name.trim());
  const hasMessage = Boolean(input.message.trim());
  const dateLine = [datePrinted, input.city?.trim()].filter(Boolean).join('  ·  ');
  // Each adjacent visible text line has an equal 0.044 canvas-height center spacing.
  // When a field is blank, the remaining content stays vertically balanced.
  const nameY = hasMessage ? .742 : .754;
  const dateY = hasName ? (hasMessage ? .786 : .798) : (hasMessage ? .764 : .782);
  const messageY = hasName ? .830 : .808;
  const text = (await Promise.all([
    projectText(input.name, input.width, input.height, input.safeInsetPx,
      nameY, 66, 28, '#CDD3D9', 'Estedad-Medium.ttf'),
    projectText(dateLine, input.width, input.height, input.safeInsetPx,
      dateY, 52, 25, '#9499A0', 'Estedad-Regular.ttf'),
    projectText(input.message, input.width, input.height, input.safeInsetPx,
      messageY, 60, 26, '#9499A0', 'Estedad-Light.ttf'),
    projectText('H  A  L  L  E  U  S', input.width, input.height, input.safeInsetPx,
      .950, 44, 24, '#8A96A1', 'Estedad-Regular.ttf'),
  ])).filter((layer): layer is { input: Buffer; left: number; top: number } => layer !== null);
  const moonCenterY = Math.floor(input.height * SHOP_P01_R9B_STYLE.moonCenterYRatio);
  const moonLeft = Math.floor((input.width - diameter) / 2);
  const moonTop = moonCenterY - Math.floor(diameter / 2);
  return sharp(canvas).composite([{ input: moon, left: moonLeft, top: moonTop }, ...text])
    .flatten({ background: '#070808' }).toColourspace('srgb').png().toBuffer();
}
